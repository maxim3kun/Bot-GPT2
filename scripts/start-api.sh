#!/bin/bash
# Port-guard wrapper — prevents two instances competing on port 8080.
# If the artifact workflow already claimed port 8080, this script defers
# and stays alive (so the workflow doesn't show as "failed").
sleep 2
if ss -tlnp 2>/dev/null | grep -q ':8080 ' || nc -z 127.0.0.1 8080 2>/dev/null; then
  echo "✅ API server already running on :8080 (started by artifact workflow). Deferring."
  # Keep workflow alive so it doesn't show as failed
  exec tail -f /dev/null
else
  exec pnpm --filter @workspace/api-server run dev
fi
