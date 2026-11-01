---
name: Discord language precedence
description: User preference for how server and personal language settings determine Discord bot replies.
---

In this Discord bot, use the configured server language by default; if none is saved, default to English. If a user has explicitly selected a personal language, use that language instead. In DMs, use the user's personal language, defaulting to English when unset.

**Why:** The user confirmed English is the preferred base language; explicit server and personal language choices should continue to take precedence.

**How to apply:** Follow this precedence for command responses, help, generated AI replies, and other output that supports localization. Let users reset their personal choice to inherit the server language.
