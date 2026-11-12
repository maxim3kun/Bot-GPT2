---
name: National GTFS geography and timezones
description: Verified national GTFS geocoding, timezone normalization, and selected source quirks.
---

Nominatim can return a city's result as `category: "boundary"` and `type: "administrative"` rather than `class: "place"`. City lookup should accept an administrative result only when its normalized name exactly matches the requested city, and should keep the country boundary filter.

**Why:** Dublin and Luxembourg were returned this way by the live geocoder; relying only on `class` would incorrectly report those cities as missing.

**How to apply:** When adding national city geocoding, support the current `category` field and retain strict country/name checks rather than accepting unrelated administrative areas.

The national feeds may publish a valid IANA zone name different from the country's canonical display zone: Ireland uses `Europe/London` and Luxembourg uses `Europe/Berlin`. Normalize to `Europe/Dublin` or `Europe/Luxembourg` only after verifying their UTC-offset rules match across the checked horizon; reject other zones instead of silently relabeling them.

**Why:** The source GTFS timezone names are authoritative for interpreting schedules, while the transport UI needs the requested country-specific zone.

**How to apply:** Keep the source zone for schedule calculations and only use the canonical country zone when the IANA rules have been verified equivalent.

The Latvian ATD GTFS uses padded CSV columns and has unescaped quote characters inside some stop names. Its range endpoint also returns HTTP 406 for `Accept: application/zip`; use a wildcard Accept header and a CSV parser that trims leading whitespace while relaxing embedded quotes.

**Why:** The official feed otherwise fails during stop lookup even though the ZIP and schedule are current. Trailing trim settings also made its malformed quote rows fail again.

**How to apply:** Keep these relaxations localized to CSV parsing and never skip malformed records silently; verify stops and selected schedules against the live feed.

The current Lisbon Metro GTFS archive is small, but its host intermittently returns HTTP 500 on concurrent byte ranges. Serialize its range reads and use only a size-bounded, request-local full archive fallback; do not persist schedule data.

**Why:** Parallel range failures made timetable requests unreliable despite the same source returning a valid current GTFS.

**How to apply:** Re-check the catalog size when it changes; raise the strict full-download limit only after verifying the source remains small.

Nominatim may return Lviv's administrative city in Cyrillic (`Львів`) with no `class` field even when the query uses Latin `Lviv`.

**Why:** Exact Latin-name matching otherwise hides Lviv, the only covered Ukrainian city.

**How to apply:** Localize only known Lviv aliases and require exact localized name, Ukrainian country code, and covered coordinates for administrative results.
