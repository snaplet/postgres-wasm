# INSTALLING
If you want to install the proxy server on your own server, here's the easiest way to get started:

1.  Start with an Ubuntu 20.04 server instance.  This is the only configuration that's currently tested.  Ubuntu 22.04 will not work, as it uses `OpenSSL 3.0` which is not compatible with the docker image's versons of `OpenSSL` and `nginx`.
2.  Make sure Docker is installed.  (see install_docker.sh for installing Docker on Ubuntu 20.04 amd64)
3.  Make sure the DNS for your domain points to this new server.  (Use an `A` record.)
4.  Copy the `install.sh` file to the server.
5.  Modify the first two lines of `install.sh` to set your `PROXY_DOMAIN` and `PROXY_DOMAIN_SUPPORT_EMAIL`.
6.  Execute the `install.sh` script on the server.


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
docker rm -f relay && docker run --privileged --network host --name relay burggraf/pg_browser_websockproxy:1.0.5
```

and point jor1k, your VPN client, or your emulator of choice at
ws://YOUR_HOSTNAME/

Note that the container must be run in priviliged mode so that it can create
its TAP device and set up IPv4 masquerading.

For better security be sure to set up an Nginx reverse proxy with SSL support
along with a more isolated docker bridge and some host-side firewall rules
which prevent clients of your relay from attempting to connect to your host
machine.
