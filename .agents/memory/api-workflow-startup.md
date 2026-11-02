---
name: API workflow startup order
description: Avoid duplicate API processes when restarting the artifact and root workflow together.
---

Start `artifacts/api-server: API Server` first and wait until it is listening on port 8080 before restarting `Start application`. The wrapper checks the port after a short delay; if both workflows start together while the API is still building, the wrapper can also launch the API and fail with `EADDRINUSE`.

**Why:** Simultaneous restarts reproduced a port collision; restarting the wrapper after the artifact was ready made it detect the existing server and defer correctly.

**How to apply:** After backend changes, restart the API artifact, verify it reaches “Server listening” and connects to Discord, then restart the root wrapper only if it is failed or needs to be brought back up.
