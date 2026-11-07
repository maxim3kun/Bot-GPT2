---
name: Image provider contracts
description: Cloudflare documentation discrepancies and verification of persona-specific image requests.
---

Prefer the live model's strict input schema over a usage example when they disagree. Do not assume image providers support the same generation parameters.

**Why:** Cloudflare's FLUX.1 schnell usage example advertised a seed, but its published schema excluded it with `additionalProperties: false`. Generic image generation succeeded while seeded persona requests returned HTTP 400.

**How to apply:** Validate each provider's supported fields independently. For image-provider changes, exercise the full persona selfie/visual-reference path as well as a short generic prompt; a successful generic smoke test does not validate persona-specific parameters.

Hugging Face model availability must be checked per inference provider, not inferred from the model's presence on the Hub. A configured token does not guarantee billing availability.

**Why:** FLUX.1 schnell's old hf-inference route returned HTTP 410 while the live fal-ai mapping accepted the account but returned HTTP 402 for unavailable credits.

**How to apply:** Check the public model inferenceProviderMapping and current provider contract when repairing this integration. Keep queue polling tied to one submitted generation; never resubmit to work around billing failures or timeouts. Treat mocked fallback tests separately from a successful live generation.
