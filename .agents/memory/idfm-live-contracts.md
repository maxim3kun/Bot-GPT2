---
name: IDFM live-data identity and closure scope
description: Non-obvious IDFM identifier and prediction constraints verified with live République and Bonne Nouvelle data.
---

Keep closures scoped to the requested line report and the actual impacted point/area IDs. Do not expand an impacted point to all the station's codes or to platforms with the same name.

**Why:** PRIM's République point records included a bundle of quay codes spanning multiple platforms, while the line-8 closure identified only its specific impacted points. Expanding that bundle would falsely close unrelated platforms or other lines.

**How to apply:** Follow the disruption links belonging to the selected line report, then match exact impacted IDs or an explicit impacted parent station. Check the application interval at boarding/alighting time. A skipped intermediate station alone does not prohibit travelling through it.

SIRI's dated vehicle references must not be equated to GTFS trip IDs or to the nearest scheduled departure. Match actual live records using the dated vehicle, data frame, line and verified direction.

**Why:** Live Bonne Nouvelle data used a separate SIRI vehicle-reference system; not every predicted origin departure had a corresponding arrival prediction available at Concorde. Applying a timetable duration or another vehicle's arrival as a measured prediction would manufacture a real-time journey.

**How to apply:** Keep an unmatched operator arrival unknown, reject stale/unmonitored/cancelled records, and distinguish actual estimates from timetable fallback. Treat unsupported blocking restrictions conservatively and disclose unavailable alert coverage.

An unmatched operator arrival may have a separate, display-only approximation from a compatible official duration, explicitly marked `≈`. Do not turn it into a measured arrival or use it to guarantee a transfer.

**Why:** The user explicitly requested readable arrivals even when live arrival predictions are missing, while retaining an honest distinction between official predictions and locally calculated approximations.

**How to apply:** Require compatible stops, direction, service calendar and an unambiguous published pattern; otherwise display “arrival unavailable”. Keep raw arrivals separate, retain closure checks across the compatible duration range, and label departures and approximate arrivals separately.

For Navitia route calculations, requesting `data_freshness=realtime` does not guarantee live predictions in the response.

**Why:** Actual PRIM calculations returned public-transport sections explicitly marked `base_schedule` despite accepting the realtime request parameter.

**How to apply:** Label the returned sections using their own freshness metadata. Never promote scheduled or mixed results to fully live, and check access to the journey endpoint separately from permission to use stop monitoring or traffic reports.
