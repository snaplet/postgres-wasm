<div align="center">
  <h1 align="center">Postgres WASM</h1>
  <p align="center">A PostgreSQL server instance running in a virtual machine running in the browser<br />
  <i>by Supabase &amp; Snaplet</i></p>
  <img align="center" src="https://user-images.githubusercontent.com/90199159/192729860-730e89a9-2489-4a95-a814-25eaaebebb7d.png" alt="Snaplet, Supabase and friends" width="480">
  <br /><br />
  <a href="https://postgres-wasm.netlify.com">Demo</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://app.snaplet.dev/chat">Discord</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.snaplet.dev/">Snaplet</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.supabase.com">Supabase</a>
</div>
<br />

## Quickstart

```terminal
cd packages/runtime && npx serve
```

Go to http://localhost:3000 and have fun!

## Packages

This repo is split into three packages that build up the environment for running PostgreSQL in the browser.

- [runtime](/packages/runtime): The v86 emulator that starts the `buildroot` image
- [Buildroot](/packages/buildroot): Scripts to build the CPU and memory snapshot run by v86.
- [Websockproxy](/packages/websockproxy): Networking

## Acknowledgements

- [v86](https://github.com/copy/v86) which is **the** emulator for running x86 operating systems in the browser, without it none of the following projects would be possible
- [crunchydata playground](https://www.crunchydata.com/developers/playground) for leading the way and showing the world that it was possible to run PostgreSQL in the browser
- [browser-shell](https://github.com/humphd/browser-shell) which was already way ahead of its time, especially on the filesystem part
- [browser-linux](https://github.com/Darin755/browser-linux) for showing us how we can make the pieces fit together
- [Websockets Proxy](https://github.com/benjamincburns/websockproxy) the ingenious workaround that opened up the world for **v86** emulators everywhere
