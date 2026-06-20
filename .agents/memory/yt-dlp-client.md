---
name: yt-dlp YouTube player client for Replit/Railway
description: Which yt-dlp player_client arg actually streams audio from datacenter IPs, version management, and the critical syntax gotcha
---

The client rotation logic is in `artifacts/api-server/src/lib/ytdlp.ts` — `YT_CLIENTS` array (per-client args), `clientArgs()`, `rotateClient()`.

**CRITICAL: Keep yt-dlp up-to-date.**
The Nix-installed yt-dlp (`/nix/store/.../yt-dlp`) is pinned to the NixOS channel version and can be a year+ out of date. An outdated yt-dlp produces "Signature extraction failed" errors and cannot decode YouTube player JS signatures — causing 403s and 0-byte streams even when clients and cookies are correct.
The code always prefers `/home/runner/.local/bin/yt-dlp` over the Nix binary. Keep that path updated:
```sh
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /home/runner/.local/bin/yt-dlp && chmod +x /home/runner/.local/bin/yt-dlp
```
**Last known good version:** `2026.06.09` (downloaded 2026-06-20).

**Current rotation order:**
1. `android` + `formats=missing_pot` — primary; requires updated yt-dlp to work
2. `mweb` (no extra args) — fallback 1 (HLS stream, works without PO token)
3. `ios` (no extra args) — fallback 2
4. `web` (no extra args) — fallback 3

**CRITICAL: per-client args matter.** `formats=missing_pot` only makes sense for `android`. Applying it to `mweb`/`ios`/`web` causes "Requested format is not available" — those clients don't expose the missing-PO-token formats. Each entry in `YT_CLIENTS` must have its own `extraArgs`.

**Why clients get blocked:** Replit/Railway run on datacenter IPs. YouTube enforces SABR streaming on most clients. With cookies + updated yt-dlp + `android;formats=missing_pot`, audio streams as itag=18 (360p mp4, audio included) when webm is unavailable — acceptable quality for voice channels.

**CRITICAL SYNTAX GOTCHA:** yt-dlp extractor args use **semicolons** to separate multiple args for the same extractor. Commas separate multiple client names.
- ✅ CORRECT: `youtube:player_client=android;formats=missing_pot`
- ❌ WRONG:   `youtube:player_client=android,formats=missing_pot` → treats `formats=missing_pot` as a second client name

**How to debug when YouTube breaks again:**
```sh
/home/runner/.local/bin/yt-dlp -U  # update first
for client in android mweb ios web; do
  echo "=== $client ===" && /home/runner/.local/bin/yt-dlp \
    --extractor-args="youtube:player_client=$client" \
    -f "bestaudio/best" --get-url --no-playlist --quiet \
    --cookies /tmp/yt-cookies.txt <URL> 2>&1 | head -3
done
```
A URL starting with `https://rr` means the client is working.

**Cookie handling:** Replit secret store strips tabs → reconstruction code re-inserts them (53 entries loaded as of 2026-06-20). Railway may mangle further → use base64-encoded cookies.txt as secret value (code auto-detects and decodes). On any terminal: `base64 cookies.txt | tr -d '\n'` then paste as `YT_COOKIES`.
