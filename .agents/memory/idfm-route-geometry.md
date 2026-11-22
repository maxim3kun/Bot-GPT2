---
name: IDFM route geometry
description: Navitia section GeoJSON, its payload cost, and safe map-preview constraints.
---

Navitia journey responses may include `geojson` on sections by default. Its official documentation warns that these shapes can be large (1 MB is not unusual) and documents `disable_geojson` as the opt-out.

**Why:** The public Navitia reference confirms that GeoJSON is supplied by default and that geometry can materially increase response size; omitting it from itinerary parsing would hide useful route shapes.

**How to apply:** Use only checked GeoJSON from actual routed sections, match line endpoints to the section's published coordinates, cap retained geometry, and omit `crow_fly` connectors because they are straight-line estimates rather than routed paths. Mark a map partial when a segment has no usable geometry.
