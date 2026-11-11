---
name: Controlled AI actions
description: Authorization boundaries for natural-language bot actions approved by the user.
---

AI command access must use explicitly allowlisted typed actions, not arbitrary command strings. Preserve the invoking user's permissions, blocks, existing general AI consent and server feature settings. Execute explicitly requested ordinary bot actions directly, without an additional consent or confirmation prompt.

**Why:** The user explicitly said there is already consent for AI use, that the user's action request is sufficient, and not to overwhelm users with consent requests. This does not grant unrestricted administrator authority.

**How to apply:** Check authorization at execution and fail closed if server settings cannot be verified. Reuse the existing general AI consent without introducing a new action-specific prompt. Do not treat a handler accepting a request as proof of asynchronous completion; playback success must come from the audio subsystem.

Decide the authorization policy separately before introducing future sensitive or costly tools; the direct-execution rule covers ordinary requested actions, not unrestricted administration.

Prefer existing bot functions to free-form model answers when a function can satisfy the user's request.

**Why:** The user confirmed that the officially calculated journey was better and explicitly requested that the AI make greater use of the bot's existing commands.

**How to apply:** Reuse the relevant command's underlying handler and presentation where appropriate, without bypassing the authorization boundaries above or claiming an action succeeded before it actually did.
