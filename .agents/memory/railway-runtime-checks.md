---
name: Railway runtime diagnosis
description: Distinguishing deployment health, process interruptions, resource evidence and deployed source.
---

A Railway service reported as online with no recent failed deployments can still have runtime logs showing a killed process followed by a bot reconnection within the same active deployment. Exit code 137 establishes forced termination, not its cause; low sampled memory does not rule out a brief peak.

**Why:** Investigation of the user's silent bus command found this discrepancy between healthy deployment status and runtime logs. The deployed revision also lacked the locally verified transport changes.

**How to apply:** Correlate deployment revision, scoped runtime logs and resource measurements. Separate confirmed interruptions from suspected memory exhaustion, and do not attribute an interruption to a particular Discord command without timing or event evidence. A local restart does not verify the independently hosted Railway bot.
