---
name: yt-dlp YouTube player client for Replit
description: Which yt-dlp player_client arg actually streams audio from Replit datacenter IPs
---

The client arg is set in `artifacts/api-server/src/lib/ytdlp.ts` in the `YT_CLIENTS` array and `clientArgs()` function.

**Rule:** Use `--extractor-args=youtube:player_client=android,formats=missing_pot`

**Why:** Replit runs on datacenter IPs. YouTube blocks most player clients from these IPs:
- `ios` / `web` — SABR streaming enforced; format URLs missing; 0 bytes streamed
- `mweb` — also returns 0 bytes with missing_pot
- `tv_embedded` — was the previous working client; now returns 0 bytes (blocked ~2025-06)
- `android` — works, but HTTPS formats require a GVS PO Token; adding `formats=missing_pot` tells yt-dlp to use the non-HTTPS formats that don't need the token → audio streams fine (confirmed 11.8 MB streamed in test, 2025-06-19)

**How to apply:** If YouTube stops working again (0 bytes or "not supported" errors), test clients with:
```sh
yt-dlp --extractor-args="youtube:player_client=<CLIENT>,formats=missing_pot" -f "bestaudio/best" --quiet -o - <URL> 2>/dev/null | wc -c
```
A non-zero result means the client streams audio. Re-test when yt-dlp is updated or YouTube changes its policies.

**Cookie tab issue:** Replit's secret store strips tabs from multi-line secrets. The cookie reconstruction code in ytdlp.ts now handles this — it re-inserts tabs into tabless cookie lines using a regex. If cookies still look malformed, ask the user to base64-encode the cookies.txt file before pasting as secret (the code already supports base64 decoding).
