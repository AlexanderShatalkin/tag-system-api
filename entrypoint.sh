#!/bin/sh
set -e

echo "Waiting for DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

echo "Running prisma generate..."
bunx prisma generate
echo "Loh"


echo "Starting app..."
exec bun run dev

