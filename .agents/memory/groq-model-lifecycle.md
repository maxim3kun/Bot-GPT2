---
name: Groq model lifecycle
description: Avoid provider model deprecations breaking Discord AI features.
---

Groq model IDs can be deprecated independently across features. Check the official production-model and deprecation pages before choosing or retaining an ID, then update all call sites that use the retired model.

**Why:** A retired model caused chat replies to fall back to a generic error while moderation logged a separate model-not-found failure.

**How to apply:** When Groq reports a model error, inspect the exact provider error and verify replacement IDs against current official docs before changing code.
