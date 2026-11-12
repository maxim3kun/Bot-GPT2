---
name: Entur Norway timetable format
description: Verified formats and coverage on Entur's national open-data pages.
---

The Entur open-data page lists the nationwide `Current_latest-gtfs.zip` under “Stops and Quays”; its archive contains only `feed_info.txt` and `stops.txt`, not routes, trips, calendars, or stop times. The official timetable-data page says timetable exports are published daily as NeTEx under NLOD and identifies NeTEx as the preferred format.

**Why:** A stop registry is not a timetable. The user explicitly approved using Entur's official NeTEx exports for Norwegian schedules.

**How to apply:** Use the official operator NeTEx timetable exports rather than the stops-only GTFS file. Do not claim real-time service or modes and operators absent from the current published feeds.
