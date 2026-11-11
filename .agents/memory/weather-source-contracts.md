---
name: Free weather source contracts
description: MET Norway legal/cache requirements and Québec timezone evidence that must survive future provider changes.
---

## MET Norway
Use the actual application's public contact, attribution and CC BY 4.0 license. A human with authority must accept the provider's terms; an AI must not accept them on the owner's behalf.

**Why:** MET's terms explicitly address automated agents. Choosing a free provider is not itself acceptance of its legal terms. The terms reviewed on 2026-11-11 were revised on 2026-11-05.

**How to apply:** Check the current [terms](https://api.met.no/doc/TermsOfService) before activating a new installation or materially changing its identification. Never invent contact details or silently enable a different paid provider.

Identical global forecasts outside the Nordic region must not be requested more often than every three hours, even if their HTTP `Expires` would permit an earlier refresh. Also respect a later `Expires`, conditional requests and provider throttling.

**Why:** A short ordinary HTTP cache alone does not meet MET's global-use policy. Separate bot instances and process restarts can otherwise repeat the same upstream request.

**How to apply:** Preserve the interval across processes and database cleanup; do not reset the model's update time on a `304` response. See [Getting Started](https://docs.api.met.no/doc/GettingStarted) and [license](https://docs.api.met.no/doc/License).

## Québec local time
Do not assume that every Québec municipality uses Eastern time, or that geographic precision guarantees legally correct timezone boundaries.

**Why:** A coarse lookup assigned the Blanc-Sablon area to Newfoundland time. Detailed polygons resolved that but still disagreed with Québec's legal exceptions around Minganie. The law explicitly gives all Minganie Eastern time and Listuguj Atlantic daylight time.

**How to apply:** Keep regression cases for mainland Québec, Blanc-Sablon, the Îles-de-la-Madeleine and legal exceptions. When sources disagree, consult the current [Québec Legal Time Act, sections 1–2](https://www.legisquebec.gouv.qc.ca/fr/document/lc/T-5.1?langCont=en), rather than changing expected clocks to match a library.
