#!/bin/sh
set -eu

mkdir -p /app/data 2>/dev/null || mkdir -p ./data || true

interval="${SCAN_INTERVAL_MINUTES:-0}"
case "$interval" in
  ""|0|false|FALSE|off|OFF) interval=0 ;;
esac

if [ "$interval" != "0" ]; then
  echo "[RivalSKU] Starting background scanner every ${interval} minute(s)"
  (
    # Brief delay so the web process can boot first.
    sleep 15
    while true; do
      npm run scan || echo "[RivalSKU] scan exited non-zero; will retry after interval"
      sleep $((interval * 60))
    done
  ) &
fi

port="${PORT:-3000}"
echo "[RivalSKU] Starting web server on 0.0.0.0:${port}"
exec npm start -- -H 0.0.0.0 -p "$port"
