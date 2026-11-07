---
name: Node test runner and cached bundles
description: Why cached external-package integration suites run as ordinary node:test modules.
---

The Node test CLI excludes test paths inside node_modules even when supplied explicitly in this environment; a compiled node:test module there runs normally with plain node.

**Why:** External-package bundles need project-local dependency resolution, while test output must remain ignored. An explicit cached file path with the test CLI produced “Could not find” despite the bundle existing; direct execution passed.

**How to apply:** Either execute the compiled node:test module directly, or choose an ignored output directory outside node_modules that still resolves project packages. Do not change production dependencies to fix test discovery.
