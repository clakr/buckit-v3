#!/usr/bin/env bash
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
