---
name: yt-dlp YouTube player client for Replit/Railway
description: Which yt-dlp player_client arg actually streams audio from datacenter IPs, and the critical syntax gotcha
---

The client arg is set in `artifacts/api-server/src/lib/ytdlp.ts` in the `YT_CLIENTS` array and `clientArgs()` function.

**Rule:** Use `--extractor-args=youtube:player_client=android;formats=missing_pot`

**Why:** Replit/Railway run on datacenter IPs. YouTube blocks most player clients from these IPs:
- `ios` / `web` — SABR streaming enforced; format URLs missing; 0 bytes streamed
- `mweb` — also returns 0 bytes from datacenter IPs
- `tv_embedded` — was the previous working client; blocked ~2025-06
- `android` — works, but HTTPS formats require a GVS PO Token; `formats=missing_pot` tells yt-dlp to use the non-HTTPS formats that don't need the token → audio streams fine (confirmed itag=251 audio/webm, 2025-06-19)

**CRITICAL SYNTAX GOTCHA:** yt-dlp extractor args use **semicolons** to separate multiple args for the same extractor. Commas separate multiple client names.
- ✅ CORRECT: `youtube:player_client=android;formats=missing_pot` — android client + enable missing_pot formats
- ❌ WRONG:   `youtube:player_client=android,formats=missing_pot` — treats `formats=missing_pot` as a second client name (invalid, silently skipped) → no audio on Railway

**How to apply:** If YouTube stops working again (0 bytes, "Requested format is not available", "no longer supported"), test with:
```sh
yt-dlp --extractor-args="youtube:player_client=android;formats=missing_pot" \
  -f "bestaudio[ext=webm]/bestaudio/best" --get-url --no-playlist --quiet <URL> 2>&1 | head -2
```
A URL starting with `https://rr` (not a warning line) means the client is working.

**Cookie tab issue:** Replit's secret store strips tabs from multi-line secrets. The cookie reconstruction code in ytdlp.ts handles this — it re-inserts tabs into tabless cookie lines using a regex. If cookies still look malformed, ask the user to base64-encode the cookies.txt before pasting as secret (the code already supports base64 decoding).
