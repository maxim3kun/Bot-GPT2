#!/bin/bash
# Port-guard wrapper — prevents two instances competing on port 8080.
# Uses /dev/tcp (bash built-in) — no ss/nc/netstat required.
sleep 2
if (echo > /dev/tcp/127.0.0.1/8080) 2>/dev/null; then
  echo "✅ API server already running on :8080 (started by artifact workflow). Deferring."
  exec tail -f /dev/null
else
  exec pnpm --filter @workspace/api-server run dev
fi
