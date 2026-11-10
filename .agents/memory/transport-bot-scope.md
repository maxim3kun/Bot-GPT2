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

## Homonymous municipalities

An exact name match is not necessarily unique: the address service ranks Breteuil in Eure and Breteuil in Oise with almost identical scores. Do not silently prefer the first result or privilege Oise just because it is an important network for this product.

**Why:** The user explicitly reported confusion between the two Breteuil municipalities and requested a better-organized choice.

**How to apply:** Show the department/region and preserve the chosen municipality throughout the journey; never turn the selected location back into an ambiguous bare-name search.

## Regional feed size

The official Normandy feeds serving Breteuil exceed 32 MiB compressed. A lower download cap removes both working sources even though their relevant routes are small.

**Why:** A live regression check failed after lowering the cap to 32 MiB; the same resources worked under the existing larger cap.

**How to apply:** Bound memory by serializing large-feed work and parsing needed CSV data incrementally, not by arbitrarily lowering the accepted size below verified official feeds. Recheck Breteuil in Eure when changing transport resource limits.
