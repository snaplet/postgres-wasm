docker build -t buildroot .

docker run \
    --rm \
    -v $PWD/tools:/tools \
    -v $PWD/build:/build \
    -v $PWD/config:/config \
    -ti \
    --platform linux/amd64 \
    buildroot