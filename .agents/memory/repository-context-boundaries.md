---
name: Repository context boundaries
description: User instruction for handling prior conversation context after a GitHub repository or project change.
---

When the user says the GitHub repository or project changed and earlier conversation details are unrelated, do not apply those earlier requests to the current code. Follow only the requirements the user confirms for the current project.

**Why:** The user said the earlier comments were from a different, older project and corrected changes made based on that context.

**How to apply:** After a repository switch, inspect the current repository, but do not treat prior project feedback as an active requirement when the user has said it is unrelated.
