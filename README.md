
# pg-wasm

Run [PostgreSQL](https://www.postgresql.org/) in the browser:

![Screenshot 2022-08-29 at 14 58 13](https://user-images.githubusercontent.com/20510494/187206593-81811973-f2b2-45be-a5a2-d6c9cc57d973.png)

# Getting started

```bash
npx serve
   ┌────────────────────────────────────────────────────┐
   │                                                    │
   │   Serving!                                         │
   │                                                    │
   │   - Local:            http://localhost:3000        │
   │   - On Your Network:  http://172.17.184.115:3000   │
   │                                                    │
   │   Copied local address to clipboard!               │
   │                                                    │
   └────────────────────────────────────────────────────┘
```

Tada! You should see a working psql terminal

# Boot a new image and save a new snapshot

1. Place the new `linux.iso` image in the `images/` folder

2. Go the `http://localhost:3000?boot=true`

3. Once the boot is completed, click the "Save state to file" button

4. Put the state file into the `state/` folder and compress it:

```bash
zstd --ultra -22 state/state.bin && rm state/state.bin
```

5. Go to `http://localhost:3000`, the boot should be instant :rocket: