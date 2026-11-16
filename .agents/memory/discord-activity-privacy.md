---
name: Discord Activity privacy model
description: Requirements for shared Discord Activity sessions and member-specific story state.
---

The user wants any server member to be able to join one active Activity per server, while each member sees their own distinct story. Treat the Activity URL and rendered page as shared; isolate private content by the Discord identity verified by the backend. The user chose to retain stories only with explicit consent.

**Why:** One server-wide Activity should support shared participation without exposing one member's private story or profile to the rest of the server. The user also wants stories kept only when a member agrees to it.

**How to apply:** Enforce the one-active-session-per-server rule in persistent server-side storage. Authenticate members with Discord on the backend; do not trust user or server IDs supplied by the browser. Broadcast only explicitly shared state and keep personal story state private. Ask each member before saving their story, provide a way to revoke consent and delete it, and avoid retaining it without that consent.
