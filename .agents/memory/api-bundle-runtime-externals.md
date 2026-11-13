---
name: API bundle runtime externals
description: Build and startup behavior for dependencies externalized by the API's esbuild bundle.
---

Any dependency added to the API bundle's esbuild `external` list must also be declared as a direct runtime dependency; pnpm may not expose a transitive dependency to the app's resolver. Keep `jsdom` external because bundling it makes its CSS helper look for a browser stylesheet at the workspace root, where it is absent.

**Why:** The API's production bundle built successfully but failed at runtime when it could not resolve an external helper and when bundled `jsdom` could not find its package asset.

**How to apply:** When adding a runtime package, check its imports in the final bundle and test both the build and workflow startup. Add required external packages directly to runtime dependencies and preserve package assets by externalizing modules that read files relative to their installed package.
