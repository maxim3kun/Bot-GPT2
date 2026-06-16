---
name: yt-dlp YouTube player client for Replit
description: Which yt-dlp player_client arg actually streams audio from Replit datacenter IPs
---

The client arg is set in `artifacts/api-server/src/lib/ytdlp.ts` as `YT_CLIENT_ARGS`.

**Rule:** Use `--extractor-args=youtube:player_client=android,formats=missing_pot`

**Why:** Replit runs on datacenter IPs. YouTube blocks most player clients from these IPs:
- `tv_embedded` — was the previous working client; now returns 0 bytes (blocked ~2025-06)
- `ios` / `mweb` — return only image formats (no audio), not suitable
- `web_creator` — requires sign-in
- `android` — works, but HTTPS formats require a GVS PO Token; adding `formats=missing_pot` tells yt-dlp to use the non-HTTPS formats that don't need the token → audio streams fine

**How to apply:** If YouTube stops working again (0 bytes or "not supported" errors), test clients with:
```sh
yt-dlp --extractor-args="youtube:player_client=<CLIENT>" -f "bestaudio/best" --quiet -o - <URL> 2>/dev/null | head -c 4096 | wc -c
```
A non-zero result means the client streams audio. Re-test when yt-dlp is updated or YouTube changes its policies.
