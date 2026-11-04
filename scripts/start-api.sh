#!/bin/bash
# Serialize startup so the artifact workflow and the run-button workflow
# cannot both decide that port 8080 is free while the server is building.
set -euo pipefail

PORT="${PORT:-8080}"
LOCK_FILE="/tmp/start-api-${PORT}.lock"
exec 9>"$LOCK_FILE"
flock 9

if (echo >"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
  echo "✅ API server already running on :8080 (started by artifact workflow). Deferring."
  flock -u 9
  exec 9>&-
  exec tail -f /dev/null
fi

pnpm --filter @workspace/api-server run dev &
API_PID=$!

cleanup() {
  if kill -0 "$API_PID" 2>/dev/null; then
    kill -TERM "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Keep the startup lock until the server is reachable, then let the other
# workflow observe the open port and defer to this process.
for ((attempt = 0; attempt < 600; attempt++)); do
  if (echo >"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
    flock -u 9
    exec 9>&-
    wait "$API_PID"
    exit $?
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID"
  fi
  sleep 0.2
done

echo "❌ API server did not listen on port ${PORT} within 120 seconds." >&2
exit 1
