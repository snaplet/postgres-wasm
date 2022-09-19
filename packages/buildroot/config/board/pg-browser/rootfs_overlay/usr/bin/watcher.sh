mkdir -p /inbox
while true; do
  find /inbox -type f -name "*.sh" -exec chmod +x "{}" \; -exec /bin/sh -c "{}" \; -exec rm "{}" \;
  sleep 2
done
