---
name: Per-user conversation memory and reply discretion
description: User intent and privacy boundaries for MongoDB summaries, Discord speaker identity, clarification and silence.
---

The user wants the bot to retain more context per user through conversation summaries in MongoDB, distinguish authors and mentioned people, ask when it does not understand, and be allowed to send zero replies to insults.

**Why:** The user wants more relevant personal responses without the bot always feeling obliged to answer.

**How to apply:** Keep persistent context encrypted and isolated by author and server, with a separate DM scope. Never fetch another person's private memory merely because they are mentioned. Discord IDs identify participants; display names are not unique.

Keep Discord IDs as internal identity metadata, not normal forms of address.

**Why:** The user reported that a persona greeted them with their numeric Discord ID. Participant disambiguation should not make conversational replies expose technical metadata.

**How to apply:** Preserve reliable ID-based identity and memory isolation, but use display names in conversation. Only reproduce an identifier when the current request actually calls for it.

Persona help belongs directly in the conversation channel, not an unsolicited DM.

**Why:** The user explicitly asked for a better-presented persona help guide in the channel where they request it.

**How to apply:** Keep generic help public and readable. This does not authorize publishing private persona lists, profiles, memories or other personal results.

Earlier memory permission explicitly promised manual-only storage. Do not silently expand that permission to automatic summaries. An explicit automatic-memory activation is sufficient: no repeated general-AI consent popup. Withdrawal and deletion must take precedence over queued or in-flight summary writes.

Keep fictional persona events separate from a real user's general profile. General summaries may adapt communication preferences, but must not turn roleplay into real-world facts.

Silence is a deliberate outcome, not a model failure. Do not turn useful criticism, ambiguity, greetings, or a substantive request containing profanity into silence. Clarification is a valid reply.
