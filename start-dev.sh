#!/usr/bin/env bash
# start-dev.sh – start backend + Expo together

set -e

# work from repo root (adjust if you keep this elsewhere)
cd "$(dirname "$0")"

echo "Starting Cloudflare Worker (backend)..."
npx wrangler dev backend/worker.ts --ip 0.0.0.0 --port 8787 &
WORKER_PID=$!

# give the worker a few seconds to fire up
sleep 3

echo "Worker PID $WORKER_PID running; starting Expo..."
npx expo start -c

# when Expo exits, shut down the worker too
echo "Expo terminated, killing worker (PID $WORKER_PID)..."
kill $WORKER_PID
