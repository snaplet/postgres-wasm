
# pg-wasm

> Run [PostgreSQL](https://www.postgresql.org/) in the browser

## Getting started

1. Run `npx serve` and go to `http://localhost:3000`
2. There is no step 2

## Cold boot and saving a new snapshot

1. Run the build pipeline from [Buildroot](/packages/buildroot/README.md#getting-started) to produce a new `filesystem` folder

2. Go the `http://localhost:3000?boot=true`

3. Once the boot is completed, clear the cache running `echo 3 > /proc/sys/vm/drop_caches && reset`

4. Save the state to a file clicking the `Save state to file` button

4. Put the state file into the `state` folder and compress it:

```bash
zstd --ultra -22 state/state.bin && rm state/state.bin
```

5. Go to `http://localhost:3000`, instant boot!