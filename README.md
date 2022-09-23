# :elephant: PostgreSQL, in your browser :globe_with_meridians:

`postgres-browser` uses WASM to run a full Postgres database inside the browser. 

## :zap: Getting started

```bash
cd packages/pg-browser && npx serve
```

Go to http://localhost:3000 and have fun!

## :brain: Architecture

> TODO

## :eyes: Going further

- [pg-browser](/packages/pg-browser)
- [Buildroot](/packages/buildroot)
- [Websockproxy](/packages/websockproxy)

## :clap: Acknowledgements

- [v86](https://github.com/copy/v86) which is **the** emulator for running x86 operating systems in the browser, without it none of the following projects would be possible
- [crunchydata playground](https://www.crunchydata.com/developers/playground) for leading the way and showing the world that it was possible to run PostgreSQL in the browser
- [browser-shell](https://github.com/humphd/browser-shell) which was already way ahead of its time, especially on the filesystem part
- [browser-linux](https://github.com/Darin755/browser-linux) for showing us how we can make the pieces fit together
- [Websockets Proxy](https://github.com/benjamincburns/websockproxy) the ingenious workaround that opened up the world for **v86** emulators everywhere
