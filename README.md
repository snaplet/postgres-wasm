#pg-browser

## How to build the image:

Todo
## To run you have to just serve the static files in this folder:

1. Install http-server:
`npm install http-server -g`
2. Host static files:
`http-server ./ `
3. Access in browser: `http://127.0.0.1:8081/`
4. The /ect/hosts file gets overwritten somewhere in the boot process. I built the image with a working hosts file at /etc/hosts.extra, lets copy that over:
`cp /etc/hosts.extra /etc/hosts`
5. Restart postgres now that hosts file is working: 
`service postgresql restart`
6. Switch to postgres unix user:
`su - postgres`
7. Run psql:
`psql`

Tada!

 **_NOTE:_** This is obviously very hacky right now. We should be able to solve the hosts issue and also emulate the first few commansds. Also this is a huge debian image we need to build a small linux build with only the required packages.