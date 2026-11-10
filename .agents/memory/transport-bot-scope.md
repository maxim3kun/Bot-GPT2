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

## Evidence for connections

Do not infer a transfer or walking duration from equal stop names, destinations, or geographic proximity. The conservative routing scope is one change within a single official feed, using published transfer minima; broader routing needs additional authoritative evidence.

**Why:** The user requires verifiable journeys and explicitly forbids invented connections and walking times. A deliberately incomplete search is preferable to a plausible but ungrounded itinerary.

**How to apply:** Keep routing limitations visible, preserve the selected municipality identity, and label each leg's timetable/realtime status independently. A known but incomplete live update must not silently confirm a connection from unchanged scheduled times.

## Short timetable windows and service exceptions

An empty 24-hour window is not evidence that a valid line has no timetable. For direct journeys, show later published service within seven days when the ordinary window is empty, retaining date exceptions and showing actual dates.

**Why:** A narrow Oise 601 stop query on the evening before 11 November had no departures within 24 hours, but this did not establish an absence of buses from the station: the user correctly reported later departures from another officially linked platform.

**How to apply:** Check all officially linked station platforms, the requested stops, local clock and actual service calendar before attributing missing results to a holiday or an incomplete feed. A destination hint should prioritize choices, not silently hide intermediate stops.

## Stations and their platforms

Offer a station-wide selection for boarding points linked by the official `parent_station`, including a sibling platform even when initial geographic discovery returned only another member. Display the actual departure point for each result.

**Why:** The user was on the 601 and correctly reported departures at 19:40 and 20:45. Both were in the same official file but attached to “Gare Quai E”, while the bot queried only “Gare routière”. Both belong to the same station. The previous holiday explanation was incorrect for the station as a whole.

**How to apply:** Use the official station name and identifiers, not name similarity or invented proximity relationships. Verify reported missing departures against all officially related platforms before concluding that the data or calendar excludes them.

## Catalogue download reliability

Prefer an allowlisted operator URL published in the catalogue, with the catalogue URL as fallback. Check smaller operator feeds before national/European bundles for a specific numbered-line request.

**Why:** Live reproduction found catalogue redirect timeouts and HTTP 502 errors while the official Oise operator file remained available. Unrelated large feeds substantially delayed a local 601 lookup.

**How to apply:** Keep URL validation and resource bounds on both paths. Verify the real operator path, not only fixture tests, after changing download selection. A targeted result must not claim to enumerate every network using that number.
