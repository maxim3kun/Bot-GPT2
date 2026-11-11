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

Prefer bounded local recognition for ordinary executable requests; a free-form model reply must remain unable to execute actions.

**Why:** This avoids an extra provider round-trip and prevents the selector from inventing parameters or substituting another function. The tradeoff is narrower phrasing support, not weaker authorization.

**How to apply:** Extend supported phrasing with deterministic tests. Keep actual domain AI usage, such as generating trivia questions, separate from choosing permission-bearing actions. A missing parameter belongs to its original request and persona, not to ambient chat.

A media search is not consent to automatic playback. Recheck authority immediately before using a newly opened audio stream, not only when interpreting the request.

**Why:** Network setup and delayed result selection can outlive a member's voice context, consent or enabled features.

**How to apply:** Bind delayed selection to its requester and lock its authorized voice context when playback is selected. Close unplayed streams when authorization is denied or unavailable.

AI-sourced queued music requires the original requester's authority when its turn arrives, rather than permanently inheriting the server's shared jukebox access.

**Why:** Enqueue-time permission must not survive later consent or voice-context revocation. This is deliberately stricter than ordinary manually queued music.

**How to apply:** Preserve the existing rules for manual commands, but do not discard an AI request's bound checks just because other members remain in voice or requested the same song separately.
