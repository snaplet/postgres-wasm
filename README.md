
# pg-browser

Run [PostgreSQL](https://www.postgresql.org/) in the browser:
![Screenshot 2022-08-24 at 10 01 15](https://user-images.githubusercontent.com/20510494/186364240-47d25099-c4d2-473b-9f92-7a211a878fc6.png)



## Requirements

1. Clone [v86](https://github.com/copy/v86) repo, preferably in folder next to this repo(If you have it cloned somewhere else, update paths in build-contianer.js and build-state.js):
```bash
git clone git@github.com:copy/v86.git ../v86
```

Folder structure:

    ..
    ├── pg-browser        # This repo
    │   ├── images        # Linux images
    │   ├── build         
    │   └── ...           # Other files
    └── v86
2. Install docker

## Build linux image
1. In debian folder run `./build-container.sh` to build the Docker container and v86 images (requires docker)
3. Run `./build-state.js` to build a state image in order to skip the boot process
4. You should see a debian-state-base.bin file in images folder

5. (Optional) Compress the state image to roughly one third, use (zstd)[https://github.com/facebook/zstd].
* Install:
    ```bash
    brew install zstd (mac)
    apt install zstd (linux)
    ```
* Compress `/images/debian-state-base.bin`:
    ```bash
    zstd images/debian-state-base.bin 
    ```
* This will produce a `debian-state-base.bin.zst` file. Now update `index.html` accordingly:
    ```js
    ...
    initial_state: { url: "../images/debian-state-base.bin.zst" }
    ...
    ```

## Run - Serve the static files in this folder

1. Install http-server:
```bash
npm install http-server -g
```
2. Host static files:
```bash
http-server ./ 
```
3. Access in browser at `http://127.0.0.1:8081/`
4. The /ect/hosts file gets overwritten somewhere in the boot process. I built the image with a working hosts file at /etc/hosts.extra, lets copy that over in the browser terminal:
```bash
cp /etc/hosts.extra /etc/hosts
```
5. Restart postgres now that hosts file is working: 

```bash
service postgresql restart
```
6. Switch to postgres unix user:
```bash
su - postgres
```
7. Run psql:
```bash
psql
```
7. Tada! You should see a working psql terminal

 **_NOTE:_** This is obviously very hacky right now. We should be able to solve the hosts issue and also emulate the first few commansds. Also this is a huge debian image we need to build a small linux build with only the required packages.
