---
name: IDFM live-data identity and closure scope
description: Non-obvious IDFM identifier and prediction constraints verified with live République and Bonne Nouvelle data.
---

Keep closures scoped to the requested line report and the actual impacted point/area IDs. Do not expand an impacted point to all the station's codes or to platforms with the same name.

**Why:** PRIM's République point records included a bundle of quay codes spanning multiple platforms, while the line-8 closure identified only its specific impacted points. Expanding that bundle would falsely close unrelated platforms or other lines.

**How to apply:** Follow the disruption links belonging to the selected line report, then match exact impacted IDs or an explicit impacted parent station. Check the application interval at boarding/alighting time. A skipped intermediate station alone does not prohibit travelling through it.

SIRI's dated vehicle references must not be equated to GTFS trip IDs or to the nearest scheduled departure. Match actual live records using the dated vehicle, data frame, line and verified direction.

**Why:** Live Bonne Nouvelle data used a separate SIRI vehicle-reference system; not every predicted origin departure had a corresponding arrival prediction available at Concorde. Applying a timetable duration or another vehicle's arrival would manufacture a real-time journey.

**How to apply:** Keep an unmatched arrival unknown, reject stale/unmonitored/cancelled records, and distinguish actual estimates from timetable fallback. Treat unsupported blocking restrictions conservatively and disclose unavailable alert coverage.
