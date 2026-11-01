---
name: Discord language precedence
description: User preference for how server and personal language settings determine Discord bot replies.
---

For command responses, use the explicitly selected personal language first, then the configured server language, then English. For AI conversation responses, an explicit personal language still wins; otherwise detect the current message language when confidence is high, then fall back to the server language or English. In DMs, use the personal preference or detected message language, then English.

**Why:** The user reported that AI replies sometimes switched to English despite French input and asked for more natural, context-aware replies.

**How to apply:** Keep command localization stable, but let conversational AI follow the user's language unless they saved a personal override. Let users reset that override to inherit the server setting.
