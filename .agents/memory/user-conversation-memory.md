---
name: Per-user conversation memory and reply discretion
description: User intent and privacy boundaries for MongoDB summaries, Discord speaker identity, clarification and silence.
---

The user wants the bot to retain more context per user through conversation summaries in MongoDB, distinguish authors and mentioned people, ask when it does not understand, and be allowed to send zero replies to insults.

**Why:** The user wants more relevant personal responses without the bot always feeling obliged to answer.

**How to apply:** Keep persistent context encrypted and isolated by author and server, with a separate DM scope. Never fetch another person's private memory merely because they are mentioned. Discord IDs identify participants; display names are not unique.

Earlier memory permission explicitly promised manual-only storage. Do not silently expand that permission to automatic summaries. An explicit automatic-memory activation is sufficient: no repeated general-AI consent popup. Withdrawal and deletion must take precedence over queued or in-flight summary writes.

Keep fictional persona events separate from a real user's general profile. General summaries may adapt communication preferences, but must not turn roleplay into real-world facts.

Silence is a deliberate outcome, not a model failure. Do not turn useful criticism, ambiguity, greetings, or a substantive request containing profanity into silence. Clarification is a valid reply.
