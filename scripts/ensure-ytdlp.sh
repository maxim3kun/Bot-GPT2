#!/bin/bash
# Ensures /home/runner/.local/bin/yt-dlp exists and is recent (< 30 days old).
# Railway uses pip which always installs the latest version at build time — this
# script is only needed on Replit where the Nix-pinned yt-dlp can be a year old.
LOCAL_BIN="/home/runner/.local/bin/yt-dlp"
DOWNLOAD_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"

needs_update() {
  [ ! -f "$LOCAL_BIN" ] && return 0
  # Check age — update if older than 30 days
  local age=$(( ($(date +%s) - $(date -r "$LOCAL_BIN" +%s 2>/dev/null || echo 0)) / 86400 ))
  [ "$age" -gt 30 ] && return 0
  return 1
}

if needs_update; then
  echo "⬇️  Updating yt-dlp…"
  mkdir -p "$(dirname "$LOCAL_BIN")"
  if curl -sSL "$DOWNLOAD_URL" -o "$LOCAL_BIN" && chmod +x "$LOCAL_BIN"; then
    echo "✅ yt-dlp $($LOCAL_BIN --version) ready"
  else
    echo "⚠️  yt-dlp update failed — using system yt-dlp ($(yt-dlp --version 2>/dev/null || echo 'not found'))"
    rm -f "$LOCAL_BIN"
  fi
else
  echo "✅ yt-dlp $($LOCAL_BIN --version) up-to-date"
fi
