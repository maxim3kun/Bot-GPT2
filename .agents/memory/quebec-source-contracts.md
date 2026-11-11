---
name: Québec transport source verification
description: Why catalogue labels, seasonal trips and operator route numbers need validation against real Québec feeds.
---

Treat the provincial catalogue as discovery, not proof of current timetable coverage or realtime availability. Verify the actual response and operator page.

**Why:** Trois-Rivières published a static timetable under a title mentioning realtime; Sherbrooke's catalogue URL was a directory containing the current ZIP and live feeds, alongside an obsolete archive. A catalogue modification date can also be much older than the current RTC file.

**How to apply:** Inspect published resources, follow only verified HTTPS operator domains, reject HTML as timetable data, preserve explicit unavailable states and distinguish catalogue dates from feed dates. Do not silently discard a valid static resource just because its dataset title mentions realtime.

Filter applicable service calendars before building an index for a large Québec line; do not solve oversized indexes by raising memory limits blindly.

**Why:** RTC's single route 800 initially exceeded the journey budget because the feed retained seasonal service versions. Retaining applicable services produced a complete usable near-term route index without loosening the budget.

**How to apply:** Preserve the source timezone, calendar exceptions, the previous service day for post-midnight trips and the supported future search horizon. Keep discovery summaries separate from full per-line journeys.

Use operator-published identifiers to resolve public route numbers, not guessed aliases or assumed vehicle identities.

**Why:** Exo publishes train 11 as short name VH and includes “11 - Vaudreuil/Hudson” in its long name. Matching only the short name made an official numbered-line request appear empty.

**How to apply:** Recognize exact route short names and the explicit numbered prefix of the official long name; preserve the actual route/trip IDs for timetable and realtime matching.
