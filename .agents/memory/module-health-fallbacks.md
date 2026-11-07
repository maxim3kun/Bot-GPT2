---
name: Module health and fallbacks
description: Product requirement for bot module diagnostics and failure handling.
---

Track both module runtime failures/timeouts and unavailable dependencies. Fallbacks should fit the failed module: use a cache or alternate provider only when that path is actually available; otherwise return a clear degraded response and do not imply the requested operation succeeded.

**Why:** The user explicitly requested a technician module that identifies failed modules and an adaptive fallback.

**How to apply:** Keep health reporting available when other modules fail, make degraded behavior explicit, and distinguish a genuine alternate implementation from an error message.
