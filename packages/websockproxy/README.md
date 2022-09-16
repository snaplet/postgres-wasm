# WebSockets Proxy

A websocket ethernet switch built using Tornado in Python

Implements crude rate limiting on WebSocket connections to prevent abuse.

Could use some cleanup!

## How it works

It's quite simple. The program starts off by creating a TAP device and listening
for websocket connections on port 80. When clients connect, ethernet frames
received via the websocket are switched between connected clients and the TAP
device. All communication is done via raw ethernet frames.

To use this in support of a virtual network you must set up the host system as
a DHCP server and router.

SSL support is not included. To enable SSL, please use a reverse proxy with SSL
and websockets support, such as nginx.

## Getting Started

The easiest way to get up and running is via its public docker image. This
image will set up a fully contained router enviornment using IPTables for
basic NAT functionality and dnsmasq for DHCP support.

To set up the relay via docker simply run

```shell
docker rm -f relay && docker run --privileged --network host --name relay burggraf/pg_browser_websockproxy:1.0.4
```

and point jor1k, your VPN client, or your emulator of choice at
ws://YOUR_HOSTNAME/

Note that the container must be run in priviliged mode so that it can create
its TAP device and set up IPv4 masquerading.

For better security be sure to set up an Nginx reverse proxy with SSL support
along with a more isolated docker bridge and some host-side firewall rules
which prevent clients of your relay from attempting to connect to your host
machine.
