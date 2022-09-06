# Clean up
rm -rf /build/*

# Copy all the artefacts produced by Buildroot
cp -r ${BINARIES_DIR}/* /build

cd /build

# Decompress the root filesystem archive
mkdir rootfs
tar -xf rootfs.tar -C rootfs

# Move the kernel image into the root filesystem
mv bzImage rootfs

# Remove .gitkeep files, they are only needed to save empty folders in the repository
find rootfs -type f -iname '\.gitkeep' -delete

# Change ownership to a non root user (the value doesn't matter as long as it's not root)
chown -R 1000:1000 rootfs

# Give the ownership to the postgresql user
chown -R 100:101 rootfs/var/lib/pgsql

# Make the folder executable for pg_ctl
chmod 700 rootfs/var/lib/pgsql

# Create a new archive
tar -cf filesystem.tar rootfs/*

# Produce the json file and the *.bin files to allow v86 to serve our filesystem
mkdir filesystem
echo "running copy-to-sha256"
/tools/copy-to-sha256.py filesystem.tar filesystem &> /dev/null
/tools/fs2json.py --out filesystem/filesystem.json filesystem.tar