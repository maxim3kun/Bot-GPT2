---
name: Transport in the Discord bot
description: Product scope for on-demand public-transport answers in the bot.
---

Transport questions should be handled through the Discord bot. Query public-transport networks across France, specifically including Oise Mobilité bus data. Use real-time passage information when published and clearly label GTFS timetable fallback as theoretical.

**Why:** The user said the feature should run through the bot and the AI should access transport-network times on demand, chose all of France, and specifically requested Oise Mobilité bus timetables.

**How to apply:** Implement a Discord-side data lookup, not a separate transport website. Include any usable public network feed, distinguish verified real-time estimates from scheduled times, and state when live data is unavailable.

## Address-search ranking

The national address search can rank a street named after a city above the municipality itself. A bare “Beauvais” lookup returned a street in Guichen, while “Beauvais Amiens” returned streets in Amiens.

**Why:** A live reproduction of the user's failing bus request exposed this even though all synthetic transport tests passed.

**How to apply:** Prefer an exact municipality match for city-level transport requests, but retain unrestricted address search for specific stops. Verify the real provider path when diagnosing missing lines; passing fixture tests alone cannot establish geographic correctness.
