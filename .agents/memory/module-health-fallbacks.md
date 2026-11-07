---
name: Module health and fallbacks
description: Product requirement for bot module diagnostics and failure handling.
---

Track both module runtime failures/timeouts and unavailable dependencies. Fallbacks should fit the failed module: use a cache or alternate provider only when that path is actually available; otherwise return a clear degraded response and do not imply the requested operation succeeded.

**Why:** The user explicitly requested a technician module that identifies failed modules and an adaptive fallback.

**How to apply:** Keep health reporting available when other modules fail, make degraded behavior explicit, and distinguish a genuine alternate implementation from an error message.

Keep help failures distinct from unrelated command failures, and name the failed command rather than implying that every other command is down.

**Why:** The user received an “Autres commandes” degraded-mode warning from `/help`, which hid a local response-handling bug and made the scope of the failure unclear.

**How to apply:** Help and diagnostics must remain useful during unrelated outages. Documentation should distinguish registered slash commands from implemented prefix commands, and show short command lists with detailed instructions available separately.

For image generation, do not blindly retry the same paid provider after a timeout; use a configured alternate provider at most once per request.

**Why:** A timeout does not prove the remote generation was cancelled. Repeated requests can multiply provider usage even when the user receives no image.

**How to apply:** Keep provider attempts bounded and distinguish the bot's delivery-based daily quota from provider billing, which can include unsuccessful or timed-out attempts.
