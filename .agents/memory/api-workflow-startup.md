---
name: API workflow startup order
description: Avoid duplicate API processes when restarting the artifact and root workflow together.
---

Start `artifacts/api-server: API Server` first and wait until it is listening before starting the root wrapper, if needed. Keep one owner for the API and Discord connection; do not launch an extra server from the post-merge setup script.

**Why:** Simultaneous startup has produced port collisions. After workflow reconciliation, a workflow can also report failure while a previous child still owns the port; “failed” does not prove that no server or Discord session is running.

**How to apply:** Check real process/port ownership when startup reports `EADDRINUSE`; use the managed workflow stop to clear its children before retrying. Let post-merge reconciliation handle service restarts. Verify listening and Discord connection, and leave the wrapper stopped when the API artifact already serves the app.
