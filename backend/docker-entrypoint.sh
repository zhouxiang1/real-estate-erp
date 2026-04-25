#!/bin/sh
set -e

npx prisma db push
node dist/prisma/seed.js

exec "$@"
