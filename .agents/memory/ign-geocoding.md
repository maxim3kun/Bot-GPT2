---
name: IGN geocoding and road snapping
description: External geocoding ambiguities and road snapping that can silently change a requested location
---

Keep municipality, precise-address and station/POI searches distinct. A high geocoding score is not confirmation of the requested street.

**Why:** Real IGN searches for a town without a municipality filter returned streets bearing that town's name in distant communes. A house-number address search also substituted an avenue for the requested rue. Train-station POIs have a different result schema from addresses.

**How to apply:** Do not silently accept a corrected street type or replace a requested station with a street named after a station. Present non-exact alternatives for selection and retain the selected point rather than substituting a town centre.

Road services normally snap the requested coordinates to the road network.

**Why:** Verified IGN route responses returned nearby but non-identical start/end coordinates. Exact coordinate equality would reject legitimate routes.

**How to apply:** Preserve the original selected address point and check that the returned road endpoints are nearby; do not “fix” snapping by overwriting the user's selected location or accepting a route from a distant road.
