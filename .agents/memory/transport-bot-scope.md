---
name: Transport in the Discord bot
description: Product scope for on-demand public-transport answers in the bot.
---

Transport questions should be handled through the Discord bot. Query public-transport networks across France, specifically including Oise Mobilité bus data. Use real-time passage information when published and clearly label GTFS timetable fallback as theoretical.

**Why:** The user said the feature should run through the bot and the AI should access transport-network times on demand, chose all of France, and specifically requested Oise Mobilité bus timetables.

**How to apply:** Implement a Discord-side data lookup, not a separate transport website. Include any usable public network feed, distinguish verified real-time estimates from scheduled times, and state when live data is unavailable.

## Québec coverage

The requested geographic coverage also includes the whole province of Québec, not only Montréal, Laval and Longueuil, for buses, metro and trains, while retaining French coverage.

**Why:** The user explicitly chose “Tout le Québec” when asked to select coverage.

**How to apply:** Plan province-wide discovery using real official feeds and disclose missing or inaccessible data per network. Do not reinterpret this as a timezone-only change or silently restrict Québec to the Montréal metropolitan area.

## England extension

L’Angleterre est le premier territoire supplémentaire demandé après France et Québec.

**Why:** À la question sur les pays à ajouter en priorité, l’utilisateur a répondu « Angleterre ».

**How to apply:** Garder cette portée distincte de l’ensemble du Royaume-Uni et annoncer la couverture réellement intégrée, sans présenter Londres comme la couverture complète de l’Angleterre. Conserver la contrainte de sources publiques et d’API gratuites.

## Persistent transport cache

Le cache MongoDB des transports doit conserver les informations stables des réseaux, lignes et arrêts, pas les horaires ni les estimations de passage.

**Why:** L’utilisateur a demandé de mettre les informations en cache dans MongoDB, « mais pas les horraires mais les infos si possible ».

**How to apply:** Garder cette séparation lors des optimisations et des ajouts de pays. Un catalogue, une ligne ou un arrêt en cache ne prouve pas qu’un départ existe ; consulter les sources de passages pour répondre sur les horaires.

## Regional discovery and return journeys

Une région suffit pour découvrir les sources/réseaux et leurs lignes. Les arrêts précis ne sont nécessaires qu'ensuite pour consulter les passages. Le résultat doit proposer le chemin retour et garder une modification claire des extrémités.

**Why:** L'utilisateur a donné « Dis moi les bus en Normandie » comme demande suffisante et préféré le chemin retour à l'accès redondant « Arrivée ».

**How to apply:** Ne pas réduire une région à une ville ou à un point central. Conserver les identités des sources et avertir du recouvrement des agrégats. Vérifier le retour dans son vrai sens, sans renverser les horaires aller.

## Verified conversational journeys

For the new journey features and associated API integrations, select public sources and free APIs.

**Why:** When choosing providers, the user explicitly answered “Source publique et API gratuite”.

**How to apply:** Check actual usage terms and quotas before selecting a new provider. Do not enable Google Maps billing or another paid service for this extension.

Use an official journey calculator as the authority for routes and connections, not model memory or a faster database. If it cannot verify a journey, report the limitation instead of generating directions.

**Why:** An invented route reversed a user's departure and destination and assigned a station to a line that did not serve it. Faster storage alone cannot correct that failure.

**How to apply:** Keep departure and destination roles explicit across turns, isolate temporary context by server/channel/member/persona, and recheck criticism with the provider without automatically agreeing. Keep timetable coverage separate from the narrower geographic coverage of an available route calculator.

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

The global Île-de-France Mobilités GTFS also exceeds an 80 MiB download budget: a public HEAD request returned a roughly 111 MiB ZIP, with the catalogue describing over 400,000 trips.

**Why:** Investigation of the Paris metro failure verified that the catalogue redirects to the public operator file on `eu.ftp.opendatasoft.com`; a domain correction alone would still leave the oversized-file failure.

**How to apply:** Validate the complete real-provider path, including download size and parsing cost, when supporting large metropolitan networks. Do not treat adding a host or raising a byte cap as sufficient proof that a metro line lookup works within the bot's memory and latency bounds.

A metro-only extract of the whole IDFM network can itself exceed a modest memory budget. Keep city-level route discovery separate from complete per-line journey data; never calculate departures from a discovery summary.

**Why:** A live network-wide extraction still exceeded the bounded retained-table budget even after excluding buses and shapes. A route-stop discovery summary plus a complete selected-line extract worked with the real line 8 feed.

**How to apply:** Distinguish discovery and complete-line cache entries. Use the official file's version validator across HTTP ranges, preserve service calendars and parent stations, and disclose that the large-network extract does not calculate transfers.

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

## Mobile presentation

Transport results should remain compact and readable on Discord mobile, without repeating the full date and boarding-point name on every departure.

**Why:** After confirming that the platform fix worked, the user supplied a mobile screenshot and said the presentation was ugly and the search still felt slow.

**How to apply:** Preserve dates, actual platforms and timetable reliability while grouping repeated information. Offer additional departures without repeating the data lookup. Keep any text fallback equally readable.

Offer France/Québec only at the beginning of each search. Remove its separate control after selection; users change territory through “Nouvelle recherche”.

**Why:** The user explicitly confirmed “Oui, puis seulement Nouvelle recherche”.

**How to apply:** Restart the territory selection for a new search without adding a France/Québec button back to results or intermediate choices.

Municipality geocoding can return an area centroid rather than its inhabited centre. For local network discovery, prefer the official town-hall point; preserve exact station coordinates when a station was selected.

**Why:** Orléans' BAN municipality point is roughly three kilometres south of its centre and missed tram B despite the TAO feed being available.

**How to apply:** Use a verified municipal identity for the official town-centre lookup. If unavailable, keep the real geographic point and disclose that discovery may be incomplete; do not substitute a similarly named place.

Use the same transport-card presentation for conversational journeys as for the explicit metro command.

**Why:** After approving the verified journey, the user specifically asked for the visual presentation of `!metro`, rather than a plain AI message.

**How to apply:** Reuse the transport presentation conventions regardless of whether the request came from a command, a mention, a DM or a persona. Preserve verified connections and reliability labels; visual consistency is not permission to substitute a direct timetable lookup for a journey calculation.

## Catalogue download reliability

Prefer an allowlisted operator URL published in the catalogue, with the catalogue URL as fallback. Check smaller operator feeds before national/European bundles for a specific numbered-line request.

**Why:** Live reproduction found catalogue redirect timeouts and HTTP 502 errors while the official Oise operator file remained available. Unrelated large feeds substantially delayed a local 601 lookup.

**How to apply:** Keep URL validation and resource bounds on both paths. Verify the real operator path, not only fixture tests, after changing download selection. A targeted result must not claim to enumerate every network using that number.
