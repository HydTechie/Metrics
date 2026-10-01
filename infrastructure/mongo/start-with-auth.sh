#!/bin/sh
set -eu

keyfile=/data/db/replica-keyfile
if [ ! -f "$keyfile" ]; then
  umask 077
  openssl rand -base64 756 > "$keyfile"
  chown mongodb:mongodb "$keyfile"
  chmod 400 "$keyfile"
fi

exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0 --bind_ip_all --auth --keyFile "$keyfile"
