---
name: AI feedback and private diagnostics
description: User requirements and privacy/delivery decisions for ratings and scheduled owner summaries.
---

The user wants manual thumbs-up/down feedback on MaximeGPT replies, not reactions automatically added everywhere. The bot may seed ratings on long substantive answers, never basic replies or personas. Personas are excluded from the rating system.

The user wants a private diagnostic/error summary twice per day to the owner account they explicitly supplied. Resolve the recipient from application configuration, never from a matching display name.

**Why:** The user wants to identify recurring problems and improve answer reliability without adding consent prompts to ordinary actions.

**How to apply:** Ratings are feedback for reviewing quality, not permission to retrain a model or retain raw conversations. Keep summaries metadata-only, with no private message text or raw provider error payloads. Count one active opinion per voter and whole answer, not per chunk.

Prefer at-most-once scheduled delivery over repeated DMs after uncertain sends or restarts. Do not claim a report was delivered if Discord refused it. Scheduling requires the bot to be running; do not flood the owner with missed historical reports after an outage.
