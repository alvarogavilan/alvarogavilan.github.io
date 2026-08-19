#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUNTIME_ROOT="$HOME/.loterias-ai-runtime"
WORKSPACE="$RUNTIME_ROOT/workspace"
ENV_FILE="$RUNTIME_ROOT/env"
STATE="$REPO/.loterias-mac-node"
CACHE="$STATE/evidence-cache"
LOCK="$RUNTIME_ROOT/megalab-swarm.lock"
LOG="$STATE/megalab-swarm.log"
SWARM_REL="loterias-ai/research/megalab/v291-incremental-local.mjs"

mkdir -p "$STATE" "$CACHE" "$RUNTIME_ROOT"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S %z')] SWARM_SKIP overlap" >> "$LOG"
  exit 0
fi
trap 'rmdir "$LOCK" >/dev/null 2>&1 || true' EXIT INT TERM

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

find_node() {
  for CANDIDATE in "$(command -v node 2>/dev/null || true)" /usr/local/bin/node /opt/homebrew/bin/node /usr/bin/node; do
    if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then echo "$CANDIDATE"; return 0; fi
  done
  return 1
}

NODE_BIN=$(find_node || true)
if [ -z "$NODE_BIN" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S %z')] SWARM_SKIP node_unavailable" >> "$LOG"
  exit 0
fi
if [ ! -f "$WORKSPACE/$SWARM_REL" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S %z')] SWARM_SKIP workspace_not_ready" >> "$LOG"
  exit 0
fi

BATCH=${MEGALAB_BATCH:-1024}
START=$(date +%s)
(
  cd "$WORKSPACE" || exit 1
  MEGALAB_BATCH="$BATCH" "$NODE_BIN" "$SWARM_REL"
) >> "$LOG" 2>&1
EXIT_CODE=$?
END=$(date +%s)
DURATION=$((END-START))

if [ "$EXIT_CODE" -eq 0 ]; then
  for REL in \
    loterias-ai/data/research/metapleno-v290-megalab.json \
    loterias-ai/data/research/metapleno-global-negative-memory.json \
    loterias-ai/data/research/metapleno-v291-local-swarm-state.json; do
      if [ -f "$WORKSPACE/$REL" ]; then
        mkdir -p "$CACHE/$(dirname "$REL")"
        cp "$WORKSPACE/$REL" "$CACHE/$REL"
      fi
  done
  if [ -f "$WORKSPACE/loterias-ai/data/research/metapleno-v291-local-swarm-state.json" ]; then
    cp "$WORKSPACE/loterias-ai/data/research/metapleno-v291-local-swarm-state.json" "$STATE/swarm-status.json"
  fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S %z')] SWARM_DONE exit=$EXIT_CODE batch=$BATCH duration_seconds=$DURATION" >> "$LOG"
exit "$EXIT_CODE"
