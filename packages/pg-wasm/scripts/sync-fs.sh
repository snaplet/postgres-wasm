#!/usr/bin/env bash

# Clean up
rm -rf filesystem

# Copy the filesystem folder from the buildroot package
cp -R ../buildroot/build/filesystem .

# Replace the bzimage url in the index.html based on the filesystem/filesystem.json file
bzimage_bin_file=$(grep -oP '\"bzImage\"[,\d]+\"\K\w+\.bin' filesystem/filesystem.json)
sed -i -E "s/const[[:space:]]+bzimageUrl[[:space:]]*=[[:space:]]*\"\.\/filesystem\/(.*)\"/const bzimageUrl = \"\.\/filesystem\/$bzimage_bin_file\"/" index.html