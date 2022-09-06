# Buildroot

> Buildroot configuration to build a v86 compatible minimal Linux system containing PostgreSQL

## Getting started

The goal of this build process is to produce a `filesystem` folder containing a full Linux filesystem that will be mounted and served by v86

1. Build and run the container to execute Buildroot

```bash
build.sh
```

  1.1. If you need to refresh the Buildroot configuration files from the host, execute this command [OPTIONAL]:

  ```bash
  cp -r /pg-wasm/* /pg-wasm/.config .
  ```

  1.2. Tweak the configuration and save it back to the host [OPTIONAL]:

  ```bash
  # Linux system config
  # Launch menuconfig
  make menuconfig
  # Save the changes back to the host
  cp .config /pg-wasm/.config

  # Linux kernel config
  # IMPORTANT: If it's the first time you run this command,
  # exit the linux-menuconfig and copy the host file by running
  # cp /pg-wasm/board/pg-wasm/linux.conf ./output/build/linux-5.17.15/.config
  # then you can go back to "make linux-menuconfig" to edit this configuration
  # Launch menuconfig
  make linux-menuconfig
  # Save the changes back to the host
  cp output/build/linux-5.17.15/.config /pg-wasm/board/pg-wasm/linux.conf
  ```

2. Build the `filesystem` folder (available in the `build` folder at the end of process):

```bash
make
```