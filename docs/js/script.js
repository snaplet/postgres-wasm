var emulator;
const fitAddon = new FitAddon.FitAddon();

let config = {
  font_size: 15,
  memory_size: 128,
  save_filename: "state.bin",
  proxy_url: '' || "wss://proxy.wasm.supabase.com/",
  // vga_memory_size: 2,
};
const storage = idbStorage.createIDBStorage({
  name: "state-storage",
  conflicAction: "replace",
});

window.onload = () => {
  const saved_config = localStorage.getItem("config");
  try {
    if (saved_config) {
      config = JSON.parse(saved_config);
      if (!config.proxy_url) {
        config.proxy_url = "wss://proxy.wasm.supabase.com/";
      }
      // console.log("config loaded from localStorage", config);
    }
  } catch (err) {
    console.error("error restoring config from localStorage", err);
  }
  let memorysizeElement = document.getElementById("memorysize");
  memorysizeElement.value = config.memory_size;
  document.getElementById("fontsize").value = config.font_size;
  document.getElementById("proxy_url").value = config.proxy_url;
  document.getElementById("save_filename").value =
    config.save_filename || "state.bin";
  const baseOptions = {
    wasm_path: "./js/v86.wasm",
    memory_size: config.memory_size * 1024 * 1024,
    filesystem: {
      basefs: "filesystem/filesystem.json",
      baseurl: "filesystem/",
    },
    screen_container: document.getElementById("screen_container"),
    serial_container_xtermjs: document.getElementById("terminal"),
    // network_relay_url: "wss://relay.widgetry.org/", // For non localhost: wss://relay.widgetry.org/
    network_relay_url: config.proxy_url || "wss://proxy.wasm.supabase.com/",
    preserve_mac_from_state_image: false,
    mac_address_translation: false,
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
    acpi: true,
    // uart1: true,
    //uart2: true,
    //uart3: true,
  };

  const params = new URL(document.location).searchParams;
  const boot = params.get("boot") === "true";

  if (boot) {
    document.getElementById("screen_container").style = "display:block";
    // document.getElementById("terminal").style = '';
  }

  const options = {
    ...baseOptions,
    ...(boot
      ? {
          bzimage: {
            url: "./filesystem/0f8b7fb4.bin",
          },
          cmdline: [
            "rw",
            "root=host9p rootfstype=9p",
            "rootflags=version=9p2000.L,trans=virtio,cache=loose",
            "quiet acpi=off console=ttyS0",
            "tsc=reliable mitigations=off random.trust_cpu=on",
            "nowatchdog page_poison=on",
          ].join(" "),
          bios: {
            url: "./system/seabios.bin",
          },
          vga_bios: {
            url: "./system/vgabios.bin",
          },
        }
      : {
          initial_state: {
            url: "./state/state-" + config.memory_size + ".bin.zst",
          },
        }),
  };

  emulator = new V86Starter(options);

  if (boot) {
    // let the user watch the boot process
    document.getElementById("terminal").style = "filter: none;";

    function handleBoot(line) {
      console.log("handleBoot =>", line);
      if (line.startsWith("server started")) {
        console.log("**** server started ****");
        emulator.remove_listener(handleBoot);
        setTimeout(() => {
          emulator.serial_adapter.term.options.fontSize = config.font_size;
          emulator.serial_adapter.term.loadAddon(fitAddon);
          document
            .getElementById("terminal")
            .style.setProperty("height", "calc(100vh - 50px)");
          fitAddon.fit();
          window.addEventListener("resize", () => {
            document
              .getElementById("terminal")
              .style.setProperty("height", "calc(100vh - 50px)");
            fitAddon.fit();
          });

          emulator.serial0_send("psql -U postgres\n");
          emulator.serial0_send(
            `\\! stty rows ${emulator.serial_adapter.term.rows} cols ${emulator.serial_adapter.term.cols}\n`
          );
          emulator.serial0_send('\\! echo "boot_completed"; reset\n');
          setTimeout(() => {
            document.getElementById("terminal").style = "filter: none;";
            document.getElementById("screen_container").style =
              "display: none;";

            emulator.serial_adapter.term.focus();
          }, 2000);
        }, 1000);
      }
    }
    emulator.add_listener("serial0-output-line", handleBoot);
  } else {
    emulator.add_listener("emulator-ready", function () {
      emulator.serial_adapter.term.options.fontSize = config.font_size;

      initTerm();

      setTimeout(() => {
        //emulator.serial0_send("psql -U postgres\n");
        emulator.serial0_send(
          `\\! stty rows ${emulator.serial_adapter.term.rows} cols ${emulator.serial_adapter.term.cols} && echo "boot_completed" && reset\n`
        );
        emulator.serial_adapter.term.focus();
      }, 0);
      setTimeout(() => {
        document.getElementById("terminal").style = "filter: none;";
      }, 2000);
    });
  }

  preloader(); // run a command to preload postgres command cache

  emulator.clearState = async function () {
    await storage.delete("state-" + config.memory_size);
  };

  emulator.save = async function () {
    await emulator.clearState();
    const state = await emulator.save_state();
    const meta = {};
    const result = await storage.set(
      "state-" + config.memory_size,
      state,
      meta
    );
    console.log("save result", result);
  };
  emulator.restore = async function () {
    console.log("restoring from indexedDB", "state-" + config.memory_size);
    storage
      .get("state-" + config.memory_size)
      .then(function (state) {
        if (state) {
          const byteLength = state.byteLength;
          // format byteLength with commas
          var size = byteLength
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          console.log("state is", size, "bytes");
          emulator.stop();
          emulator
            .restore_state(state)
            .then(function (result) {
              console.log("restore result", result);
              emulator.run();
              emulator.serial_adapter.term.focus();
            })
            .catch(function (err) {
              console.log(err);
            });
        } else {
          console.log("no state to restore");
        }
      })
      .catch(function (err) {
        console.log("restore error", err);
      });
  };
  emulator.add_listener("download-progress", function (e) {
    const el = document.getElementById("progress");
    if (e.loaded >= e.total || !e.total) {
      el.innerHTML = "";
    } else {
      const percent = (e.loaded / Math.max(e.total, 1)) * 100;
      el.innerHTML =
        "<h3>Loading: " +
        e.file_name.replace("../images/", "") +
        " " +
        percent.toFixed(2) +
        "%</h3>";
    }
  });

  var state;
  document.getElementById("proxy_url").onchange = function (e) {
    const url = e.target.value;
    console.log("url", url);
    config.network_relay_url = url;
  };

  document.getElementById("upload_files").onchange = function (e) {
    console.log("upload_files", e.target.files);
    async function getAsByteArray(file) {
      return new Uint8Array(await readFile(file));
    }

    function readFile(file) {
      return new Promise((resolve, reject) => {
        // Create file reader
        let reader = new FileReader();
        // Register event listeners
        reader.addEventListener("loadend", (e) => resolve(e.target.result));
        reader.addEventListener("error", reject);
        // Read file
        reader.readAsArrayBuffer(file);
      });
    }
    var files = e.target.files;
    for (var i = 0; i < files.length; i++) {
      var reader = new FileReader();
      reader.onload = (function (file) {
        return async function (e) {
          const byteFile = await getAsByteArray(file);
          emulator.create_file("/mnt/" + file.name, byteFile);
          console.log("uploaded " + file.name);
        };
      })(files[i]);
      //reader.readAsText(files[i]);
      reader.readAsArrayBuffer(files[i]);
    }
  };

  emulator.download_file = () => {
    console.log("** emulator.download_file");
    const path = document.getElementById("read_file_name").value;
    console.log("read_file_name", document.getElementById("read_file_name"));
    console.log("trying to download path", path);
    downloadFile(path);
  };

  document.getElementById("restore_file").onchange = function () {
    if (this.files.length) {
      var filereader = new FileReader();
      emulator.stop();

      filereader.onload = async function (e) {
        await emulator.restore_state(e.target.result);
        emulator.run();
      };

      filereader.readAsArrayBuffer(this.files[0]);

      this.value = "";
    }

    this.blur();
  };
  loadModal();
  let hide_getting_started =
    localStorage.getItem("hide_getting_started") || "false";
  document.getElementById("hide_getting_started").checked =
    hide_getting_started === "true";

  if (hide_getting_started === "false") {
    document.getElementById("getting_started").click();
  }
};

function initTerm() {
  emulator.serial_adapter.term.loadAddon(fitAddon);
  fitAddon.fit();
  window.addEventListener("resize", () => {
    document
      .getElementById("terminal")
      .style.setProperty("height", "calc(100vh - 50px)");
    fitAddon.fit();
  });
}

async function downloadFile(path) {
  const contents = await emulator.read_file(path);
  const filename = ("/" + path).split("/").pop();
  var a = document.createElement("a");
  a.download = filename;
  a.href = window.URL.createObjectURL(new Blob([contents]));
  // image/png
  // application/octet-stream
  a.dataset.downloadurl =
    "application/octet-stream:" + a.download + ":" + a.href;
  a.click();
  a.remove();
}

function saveFontSize() {
  try {
    config.font_size =
      parseInt(document.getElementById("fontsize").value, 10) || 14;
    if (config.font_size < 4 || config.font_size > 90) {
      config.font_size = 16;
    }
  } catch (err) {
    console.log("error parsing font size", err);
    config.font_size = 16;
  }
  localStorage.setItem("config", JSON.stringify(config));
}

function updateMemorySize(bootOperation) {
  const fullboot = bootOperation == "full";
  const newMemorySize = document.getElementById("memorysize").value;
  try {
    config.memory_size = parseInt(newMemorySize, 10) || 96;
    config.proxy_url = document.getElementById("proxy_url").value;
    if (!config.memory_size || config.memory_size < 96) {
      config.memory_size = 96;
      document.getElementById("memorysize").value = config.memory_size;
    }
    localStorage.setItem("config", JSON.stringify(config));
    // get current url of window
    let url = window.location.origin;
    if (fullboot) {
      url += "?boot=true";
    }
    window.location = url;
  } catch (e) {
    console.log("updateMemorySize error", e);
  }
}

function sendText() {
  const text = "this is a test";
  emulator.serial0_send(text);
}

function send_script(name, text) {
  const script = new TextEncoder().encode(text);
  emulator.create_file("/inbox/" + name + ".sh", script);
}

function restart_network() {
  send_script("restart_network", "/etc/init.d/S40network restart &> /dev/null");
  setTimeout(get_address, 2000);
}

function stop_network() {
  send_script("stop_network", "/etc/init.d/S40network stop &> /dev/null");
  document.getElementById("progress").innerHTML = "";
  document.getElementById("IP").innerHTML = "";
}

let get_new_ip_counter = 0;

function get_new_ip() {
  send_script(
    "get_new_ip",
    `
        echo 0000:00:05.0 > /sys/bus/pci/drivers/ne2k-pci/unbind &&
        echo 0000:00:05.0 > /sys/bus/pci/drivers/ne2k-pci/bind &&
        sleep 1 &&
        /etc/init.d/S40network restart`
  );
  setTimeout(get_address, 2000);
}
function preloader() {
  send_script("preloader", `psql -U postgres -c "\dt"`);
}

let get_address_counter = 0;
async function get_address() {
  const progress_el = document.getElementById("progress");
  progress_el.innerHTML = "Connecting network...";
  let result = "";
  try {
    const contents = await emulator.read_file("/addr.txt");
    result = new TextDecoder().decode(contents).replace(/\n/g, "");
  } catch (err) {
    console.log("error", err);
    document.getElementById("progress").innerHTML = "";
    if (err && err.message && err.message === "File not found") {
      progress_el.innerHTML = "Connecting network...ready";
    }
  } finally {
    if (result && result.length > 0) {
      const arr = result.split(".");
      // pad arr[3] with leading zeros
      arr[3] = arr[3].padStart(3, "0");
      let proxy_domain = config.proxy_url.split("//")[1] || "NO_PROXY";
      if (proxy_domain.endsWith("/")) proxy_domain = proxy_domain.slice(0, -1);
      document.getElementById("IP").innerHTML =
        `host:${proxy_domain} port:${arr[2]}${arr[3]}` +
        // result + // this is the private ip address
        `<br/>psql postgres://postgres@${proxy_domain}:${arr[2]}${arr[3]}`;

      get_address_counter = 0;
      progress_el.innerHTML = "";
    } else {
      progress_el.innerHTML =
        "Connecting network..." + (get_address_counter + 1);
      if (get_address_counter < 20) {
        get_address_counter++;
        setTimeout(() => {
          send_script(
            "script_name",
            `ip route get 1 | awk '{print $7}' &> /addr.txt\n
            sync\n`
          );
        }, 2000);
        setTimeout(get_address, 1000);
      } else {
        get_address_counter = 0;
        progress_el.innerHTML = "Connecting network...FAILED";
        setTimeout(() => {
          progress_el.innerHTML = "";
        }, 3000);
      }
    }
  }
}

async function save_file() {
  console.log("save_file button pressed");
  config.save_filename =
    document.getElementById("save_filename").value || "state.bin";
  console.log("config.save_filename", config.save_filename);
  const new_state = await emulator.save_state();
  var a = document.createElement("a");
  a.download = config.save_filename; //"v86state.bin";
  a.href = window.URL.createObjectURL(new Blob([new_state]));
  a.dataset.downloadurl =
    "application/octet-stream:" + a.download + ":" + a.href;
  a.click();

  this.blur();
  localStorage.setItem("config", JSON.stringify(config));
}
function sendCharCode(charString) {
  emulator.serial0_send(charString);
}

function toggle_virtual_keyboard() {
  const el = document.getElementById("virtual_keyboard");
  if (el.style.display === "none") {
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}
// *** modal ***
const loadModal = () => {
  // Functions to open and close a modal
  function openModal($el) {
    $el.classList.add("is-active");
  }

  function closeModal($el) {
    $el.classList.remove("is-active");
  }

  function closeAllModals() {
    (document.querySelectorAll(".modal") || []).forEach(($modal) => {
      closeModal($modal);
    });
  }

  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll(".js-modal-trigger") || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener("click", () => {
      openModal($target);
    });
  });

  // Add a click event on various child elements to close the parent modal
  (
    document.querySelectorAll(
      ".modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button"
    ) || []
  ).forEach(($close) => {
    const $target = $close.closest(".modal");

    $close.addEventListener("click", () => {
      closeModal($target);
    });
  });

  // Add a keyboard event to close all modals
  document.addEventListener("keydown", (event) => {
    const e = event || window.event;

    if (e.keyCode === 27) {
      // Escape key
      closeAllModals();
    }
  });
};
function hide_getting_started(e) {
  localStorage.setItem("hide_getting_started", e.checked);
}
// *** end modal ***