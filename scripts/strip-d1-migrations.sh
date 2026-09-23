#!/usr/bin/env bash
# Strips the d1_migrations table (schema + rows) and its sqlite_sequence entry
# from a `wrangler d1 export` dump, so it can be replayed onto a local D1
# database that already tracks its own migration history via
# `wrangler d1 migrations apply --local`.
set -euo pipefail

in="$1"
out="$2"

awk '
  /^CREATE TABLE IF NOT EXISTS "d1_migrations"/ { skip=1; next }
  skip && /^\);/ { skip=0; next }
  skip { next }
  /^INSERT INTO "d1_migrations"/ { next }
  /^INSERT INTO "sqlite_sequence".*'"'"'d1_migrations'"'"'/ { next }
  { print }
' "$in" > "$out"
