---
name: IGN geocoding and road snapping
description: External geocoding ambiguities and road snapping that can silently change a requested location
---

Keep municipality, precise-address and station/POI searches distinct. A high geocoding score is not confirmation of the requested street.

**Why:** Real IGN searches for a town without a municipality filter returned streets bearing that town's name in distant communes. A house-number address search also substituted an avenue for the requested rue. Train-station POIs have a different result schema from addresses.

**How to apply:** Do not silently accept a corrected street type or replace a requested station with a street named after a station. Present non-exact alternatives for selection and retain the selected point rather than substituting a town centre.

The legacy `api-adresse.data.gouv.fr/search` endpoint now redirects to an unavailable page. Use `geo.api.gouv.fr/communes` for municipality-name searches, then retain exact-name matches and their department/region context; this is not a replacement for precise address or stop geocoding.

**Why:** A live request to the legacy endpoint returned HTTP 302 with an empty body, while the official commune endpoint returned Paris and Fréjus successfully.

**How to apply:** Keep municipality lookups separate from address and stop lookups. Verify the real endpoint when a place unexpectedly disappears; normalize accents without silently selecting among homonyms.

Road services normally snap the requested coordinates to the road network.

**Why:** Verified IGN route responses returned nearby but non-identical start/end coordinates. Exact coordinate equality would reject legitimate routes.

**How to apply:** Preserve the original selected address point and check that the returned road endpoints are nearby; do not “fix” snapping by overwriting the user's selected location or accepting a route from a distant road.
