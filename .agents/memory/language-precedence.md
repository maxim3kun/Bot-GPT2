---
name: Discord language precedence
description: User preference for how server and personal language settings determine Discord bot replies.
---

For command responses, use the explicitly selected personal language first, then the configured server language, then English. For conversational AI, detect the current message language first; use a personal preference only when the message is ambiguous, then the server language. If no preference is set and the server fallback is English, use French as this bot's default. In DMs, use detected language, then personal preference, then French.

**Why:** The user said their community speaks French and English replies are not understandable; the language of the current message must take priority over a saved preference.

**How to apply:** Keep command localization stable, but let conversational AI follow each message's language. Use saved preferences and server settings only when the message language is unclear.
