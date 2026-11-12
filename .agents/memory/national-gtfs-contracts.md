---
name: National GTFS geography and timezones
description: Verified geocoder output shapes and country timezone normalization for Ireland and Luxembourg.
---

Nominatim can return a city's result as `category: "boundary"` and `type: "administrative"` rather than `class: "place"`. City lookup should accept an administrative result only when its normalized name exactly matches the requested city, and should keep the country boundary filter.

**Why:** Dublin and Luxembourg were returned this way by the live geocoder; relying only on `class` would incorrectly report those cities as missing.

**How to apply:** When adding national city geocoding, support the current `category` field and retain strict country/name checks rather than accepting unrelated administrative areas.

The national feeds may publish a valid IANA zone name different from the country's canonical display zone: Ireland uses `Europe/London` and Luxembourg uses `Europe/Berlin`. Normalize to `Europe/Dublin` or `Europe/Luxembourg` only after verifying their UTC-offset rules match across the checked horizon; reject other zones instead of silently relabeling them.

**Why:** The source GTFS timezone names are authoritative for interpreting schedules, while the transport UI needs the requested country-specific zone.

**How to apply:** Keep the source zone for schedule calculations and only use the canonical country zone when the IANA rules have been verified equivalent.
