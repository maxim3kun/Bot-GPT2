---
name: Discord Activity setup
description: Requirements for launching a web artifact as an actual Discord Activity rather than a browser preview.
---

An embedded-app page can be developed and previewed in Replit without being launchable in Discord. An actual Activity also needs the Discord application's public ID, Activity/URL mapping enabled in the Developer Portal, and a web origin reachable by Discord.

**Why:** A successful Vite preview only verifies the web page; without the Discord host context, the embedded-app SDK cannot confirm an Activity launch.

**How to apply:** Keep browser-preview status explicit. Do not claim Discord testing succeeded until the SDK reports readiness inside Discord; identify the missing application or URL configuration instead.
