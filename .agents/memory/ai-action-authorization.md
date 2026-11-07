---
name: Controlled AI actions
description: Authorization boundaries for natural-language bot actions approved by the user.
---

AI command access must use explicitly allowlisted typed actions, not arbitrary command strings. Preserve the invoking user's permissions, blocks, consent and server feature settings. Shared-state actions require an explicit, owner-bound confirmation, with authorization checked again at execution.

**Why:** The user approved letting the AI use selected bot functions with these safeguards, not granting unrestricted administrator authority.

**How to apply:** Fail closed if server settings cannot be verified. Do not restore expired or pre-restart confirmations. Do not treat a handler accepting a request as proof of asynchronous completion; playback success must come from the audio subsystem.
