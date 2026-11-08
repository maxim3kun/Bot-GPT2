---
name: Transport in the Discord bot
description: Product scope for on-demand public-transport answers in the bot.
---

Transport questions should be handled through the Discord bot. The first-release goal is to query public-transport networks across France and return real-time passage information when the operator publishes it.

**Why:** The user said the feature should run through the bot and the AI should access transport-network times on demand, then chose all of France as the first-release scope.

**How to apply:** Implement a Discord-side data lookup, not a separate transport website. Distinguish verified real-time estimates from scheduled times and state when live data is unavailable.
