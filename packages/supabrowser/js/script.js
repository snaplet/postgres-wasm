var emulator;
let config = {
  font_size: 15,
  memory_size: 128,
  save_filename: "state.bin",
  proxy_url: '',
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
        config.proxy_url = "wss://proxy.supabrowser.com/";
      }
      console.log("config loaded from localStorage", config);
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
    network_relay_url: config.proxy_url || "wss://proxy.supabrowser.com/",
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
            url: "./filesystem/d60050d7.bin",
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
        emulator.remove_listener(handleBoot);
        setTimeout(() => {
          emulator.serial0_send("\\!/etc/init.d/S40network restart\n");
          emulator.serial0_send("psql -U postgres\n");
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
      console.log("emulator ready!");
      updateFontSize();

      setTimeout(() => {
        emulator.serial0_send("\\!/etc/init.d/S40network restart\n");
        emulator.serial0_send("psql -U postgres\n");
        emulator.serial0_send('\\! echo "boot_completed"; reset\n');
      }, 0);
      setTimeout(() => {
        document.getElementById("terminal").style = "filter: none;";
      }, 2000);
    });
  }
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
              // console.log('emulator.restore calling restart_network');
              // restart_network();
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
  }

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
    console.log('** emulator.download_file');
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
};

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

function updateFontSize() {
  console.log("FONT SIZE WAS", emulator.serial_adapter.term.options.fontSize);
  //emulator.screen_adapter.set_size_text(document.getElementById("font_size").value, document.getElementById("font_size").value);
  console.log("new font size", document.getElementById("fontsize").value);
  try {
    config.font_size =
      parseInt(document.getElementById("fontsize").value, 10) || 14;
    if (config.font_size < 4 || config.font_size > 90) {
      config.font_size = 15;
    }
  } catch (err) {
    console.log("error parsing font size", err);
    config.font_size = 15;
  }
  emulator.serial_adapter.term.options.fontSize = config.font_size;
  if (
    emulator.serial_adapter.term.element &&
    emulator.serial_adapter.term.element.children[0]
  ) {
    //emulator.serial_adapter.term.element.children[0].style.width = 0;
    emulator.serial_adapter.term.element.children[0].style.backgroundColor =
      "white";
    localStorage.setItem("config", JSON.stringify(config));
  } else {
    console.log("terminal not initialized, cannot update find size yet");
  }
}

function updateMemorySize(bootOperation) {
  const fullboot = bootOperation == "full";
  const newMemorySize = document.getElementById("memorysize").value;
  try {
    config.memory_size = parseInt(newMemorySize, 10) || 96;
    config.proxy_url = document.getElementById('proxy_url').value;
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

let get_address_counter = 0;
async function get_address() {
  const progress_el = document.getElementById("progress");
  progress_el.innerHTML = "Getting IP address...";
  let result = "";
  try {
    const contents = await emulator.read_file("/addr.txt");
    result = new TextDecoder().decode(contents).replace(/\n/g, "");
  } catch (err) {
    console.log("error", err);
    document.getElementById("IP").innerHTML = "";
    if (err && err.message && err.message === "File not found") {
      progress_el.innerHTML = "Getting IP address...ready";
    }
  } finally {
    if (result && result.length > 0) {
      const arr = result.split(".");
      // pad arr[3] with leading zeros
      arr[3] = arr[3].padStart(3, "0");
      let proxy_domain = config.proxy_url.split("//")[1] || "NO_PROXY";

      document.getElementById("IP").innerHTML =
        "IP: " +
        result +
        `<br/>psql postgres://postgres@${proxy_domain}:${arr[2]}${arr[3]}`;

      console.log("got address", result);
      get_address_counter = 0;
      progress_el.innerHTML = "";
      // console.log('result =' + result + '=');
      // console.log('a get_address_counter', get_address_counter);
    } else {
      // console.log('no result');
      document.getElementById("IP").innerHTML = "";
      progress_el.innerHTML = "Getting IP address..." + get_address_counter;
      // console.log('b get_address_counter', get_address_counter);
      if (get_address_counter < 10) {
        get_address_counter++;
        setTimeout(get_address, 1000);
      } else {
        // console.log('get_address timed out');
        get_address_counter = 0;
        progress_el.innerHTML = "Getting IP address...FAILED";
        setTimeout(() => {
          progress_el.innerHTML = "";
        }, 2000);
      }
    }
  }
}

function openNav() {
  document.getElementById("main").style.marginLeft = "250px";
  document.getElementById("topbar").style.paddingLeft = "210px";
  document.getElementById("statusbar").style.paddingLeft = "250px";
  document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
  document.getElementById("main").style.marginLeft = "0px";
  document.getElementById("topbar").style.paddingLeft = "20px";
  document.getElementById("statusbar").style.paddingLeft = "0px";
  document.getElementById("mySidenav").style.width = "0";
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
