#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

pnpm install --frozen-lockfile

# The bot persists data in MongoDB. The unused PostgreSQL template has no
# tables; do not push its empty schema, force a migration, or start a second bot.
# Workflows are reconciled by the platform after this script finishes.
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
