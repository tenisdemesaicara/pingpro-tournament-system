#!/bin/sh

# Production startup script with migrations
echo "🚀 Starting PingPro in production mode..."

# Apply database migrations at startup (when DATABASE_URL is available)
echo "📦 Applying database migrations..."
if command -v npm >/dev/null 2>&1; then
  npm run db:push --force
else
  echo "⚠️ npm not available, skipping migrations (expecting PostgreSQL session table auto-creation)"
fi

echo "🌟 Starting server..."
exec node dist/prod.js