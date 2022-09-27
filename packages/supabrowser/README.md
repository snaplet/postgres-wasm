# Supabrowser 
This is a demo app for `postgres-wasm`, showing how to consume a PostgreSQL instance inside a browser.

## Executing Scripts in the Background
By default, the only way for the host application running in the browser to communicate with the V86 Emulator is to send keystrokes to terminal.  This is not always ideal, however, since the user may currently be sitting a `psql` prompt, or the user may be at an operating system prompt.  Or inside another command-line application.

In order to solve this issue, we've implemented the following workaround:

1. A process inside the emulator watches a folder named `/inbox`.
2. When a file appears in the `/inbox` folder AND it has a `.sh` extension, the watcher process makes the file executable `chmod +x <filename>`, then executes the file, then deletes it.

So to execute a command in the emulator, we just need to compose a script file and upload it to `/inbox`.

## Virtual Keyboard
The purpose of the virtual keyboard is to provide keystrokes on a mobile device that doesn't have a set of cursor keys or a control key for sending control-key sequences such as CTRL+C.

This feature is just a set of buttons that send a character string to the terminal using the X86 Emulator function `serial0_send`.

For example, to send an up-arrow keystroke to the terminal, we just call:

```js
emulator.serial0_send('\x1b[A');
```

## Network Start & Stop
Nework calls require a connection to a websock proxy server, which are limited and have a bandwidth cost, so by default we don't start the network until a user requests it. 

To start the nework we send a script with the following commands:

Find the address of the ne2k-pci virtual network adapter:
`lspci -nk | grep ne2k-pci`

Unbind the network card:
`echo 0000:00:05.0 > /sys/bus/pci/drivers/ne2k-pci/unbind`

Re-bind the network card:
`echo 0000:00:05.0 > /sys/bus/pci/drivers/ne2k-pci/bind`

Restart the network:
`/etc/init.d/S40network restart`

Why is this necessary?  Because when you start the emulator by restoring a state file, the NIC's MAC address is saved in the state.  Simply restarting the network will result in every user receiving the same private IP address.  Unbinding and re-binding the network card results in a fresh MAC address and a new private IP for each emulator instance.

## Transfer Files
The V86 Emulator provides functions to upload files from the host system to the emulator, and to download files from the emulator to the host system.

### Upload 
To upload a file to the emulator, we just all the function:
`emulator.create_file(path_to_file, byte_array)`

So we just need to convert each file to a byte array first, then call this function to upload it to the emulator.

### Download
To download a file from the emulator, we just need to supply a full path and filename to:
`emulator.read_file(path_to_file)`

## Saving & Restoring State
The V86 Emulator state can be saved and restored to a file on the host system, or to the internal IndexedDB database inside the browser.

### Save to a file
We can save the current state of the emulator by calling
`emulator.save_state()`
The size of the state file will be approximately the same size as the current memory configuration.  State files compress quite well, but to get the best compression, try running this from a command prompt in the emulator to drop the cache before saving the state:
`echo 3 > /proc/sys/vm/drop_caches`

### Restore from a file
To restore the state of the emulator, we just load the contents of the saved state file, then call:
`emulator.restore_state(state_file)`

NOTE: be careful to only restore state a state file with the same memory configuration as the currently running emulator.  You can't restore a 128mb state file to an emulator with a 512mb memory configuration.

### Save state to IndexedDB
Saving the state to IndexedDB is similar to saving it to a file.  First we get the state into a variable using:
`emulator.save_state()`
Then we save the contents of the variable to IndexedDB using the idbStorage library `set` function:
`storage.set("state-128",state,{optional-meta-data});`

Again, we're careful to save each state file with the appropriate memory size, such as `state-128` so we don't accidently try to restore states with mis-matched memroy configurations.

### Restore state from IndexedDB
To restore the state from IndexedDB, we just reverse the process.  First, get the saved state from IndexedDB using the idbStorage library `get` function:
`storage.get("state-128")`
Then, send it to the emulator:
`emulator.restore_state(state)`

## VM Config
The emulator can be configured with various options, 3 of which we allow the user to set before booting:
1. memory size
2. font size
3. network proxy url

### Memory
This is simply the amount of memory allocated to the emulator.  Our tests indicate that the minimum amount of memory required to run PostgreSQL with our Buildroot Linux configuration is 128mb.  The largest amount of memory we can use and still be able to save the state is 1024mb.

Memory Size is sent to the `V86Starter` function as a startup option: `memory_size`.

### Font Size
Font size is set in the xtermjs terminal using:
`emulator.serial_adapter.term.options.fontSize`

### Network Proxy
The location of the network websock proxy used by the emulator is set via `V86Starter` in the `network_relay_url` option.  The network websock proxy accepts raw ethernet packets sent via an open websocket and turns them into regular TCP/IP packets, relaying data between the emulator and the outside Internet.

## Restarting the Emulator
There are two options for restarting the emulator to apply the currently selected VM Configuration Options:  quick boot and full boot.

### Quick Boot
Quick boot uses the `initial_state` option of `V86Starter` to quickly load a compressed state file:
```json
initial_state: {
    url: "./state/state-128.bin.zst"
}
```

### Full Boot
A full boot of the emulator does not use a state file, but instead sets the location of the kernel `bzimage` stored in the virtual filesystem, a set of kernel `cmdline` parameters, a `bios` file, and a `vga_bios` file used to boot the virtual machine:

```json
bzimage: {
    url: "./filesystem/12345678.bin",
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
}
```
