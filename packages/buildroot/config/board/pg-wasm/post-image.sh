rm -rf /build/*
cp -r ${BINARIES_DIR}/* /build
cd /build
mkdir rootfs
tar -xf rootfs.tar -C rootfs
mv bzImage rootfs
find rootfs -type f -iname '\.gitkeep' -delete
rm rootfs/etc/init.d/S50postgresql
chown -R 1000:1000 rootfs
chown -R 100:101 rootfs/var/lib/pgsql
chmod 700 rootfs/var/lib/pgsql
tar -cf filesystem.tar rootfs/*
mkdir filesystem
echo "running copy-to-sha256"
/tools/copy-to-sha256.py filesystem.tar filesystem &> /dev/null
/tools/fs2json.py --out filesystem/filesystem.json filesystem.tar