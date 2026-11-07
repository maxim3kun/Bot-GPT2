---
name: Image provider contracts
description: Cloudflare documentation discrepancies and verification of persona-specific image requests.
---

Prefer the live model's strict input schema over a usage example when they disagree. Do not assume image providers support the same generation parameters.

**Why:** Cloudflare's FLUX.1 schnell usage example advertised a seed, but its published schema excluded it with `additionalProperties: false`. Generic image generation succeeded while seeded persona requests returned HTTP 400.

**How to apply:** Validate each provider's supported fields independently. For image-provider changes, exercise the full persona selfie/visual-reference path as well as a short generic prompt; a successful generic smoke test does not validate persona-specific parameters.
