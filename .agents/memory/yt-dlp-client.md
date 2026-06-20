---
name: yt-dlp YouTube player client for Replit/Railway
description: Which yt-dlp player_client arg actually streams audio from datacenter IPs, and the critical syntax gotcha
---

The client rotation logic is in `artifacts/api-server/src/lib/ytdlp.ts` — `YT_CLIENTS` array (per-client args), `clientArgs()`, `rotateClient()`.

**Current rotation order (2025-06-20):**
1. `android` + `formats=missing_pot` — primary; was working 2025-06-19 but started 403'ing on Replit IPs 2025-06-20
2. `mweb` (no extra args) — fallback 1
3. `ios` (no extra args) — fallback 2
4. `android_music` (no extra args) — fallback 3
5. `web` (no extra args) — fallback 4

**CRITICAL: per-client args matter.** `formats=missing_pot` only makes sense for `android`. Applying it to `mweb`/`ios`/`web` causes "Requested format is not available" — those clients don't expose the missing-PO-token formats. Each entry in `YT_CLIENTS` must have its own `extraArgs`.

**Why clients get blocked:** Replit/Railway run on datacenter IPs. YouTube enforces:
- `ios` / `web` — SABR streaming enforced; format URLs missing without PO token
- `mweb` — sometimes returns 0 bytes, sometimes works (no PO token needed)
- `tv_embedded` — was working, blocked ~2025-06
- `android` + `formats=missing_pot` — worked 2025-06-19, 403 Forbidden on segments 2025-06-20

**CRITICAL SYNTAX GOTCHA:** yt-dlp extractor args use **semicolons** to separate multiple args for the same extractor. Commas separate multiple client names.
- ✅ CORRECT: `youtube:player_client=android;formats=missing_pot`
- ❌ WRONG:   `youtube:player_client=android,formats=missing_pot` → treats `formats=missing_pot` as a second client name

**How to debug:** When YouTube stops working (0 bytes / 403 / "Requested format is not available"):
```sh
for client in android mweb ios android_music web; do
  echo "=== $client ===" && yt-dlp --extractor-args="youtube:player_client=$client" \
    -f "bestaudio/best" --get-url --no-playlist --quiet --cookies /tmp/yt-cookies.txt <URL> 2>&1 | head -2
done
```
A URL starting with `https://rr` means the client is working.

**Cookie handling:** Replit secret store strips tabs → reconstruction code re-inserts them. Railway may mangle further → use base64-encoded cookies.txt as secret value (code auto-detects and decodes). On Railway, run `base64 cookies.txt | tr -d '\n'` and paste as `YT_COOKIES`.
