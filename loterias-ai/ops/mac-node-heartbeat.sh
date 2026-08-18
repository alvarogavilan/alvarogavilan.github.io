#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE="$REPO/.loterias-mac-node"
RUNTIME="$REPO/loterias-ai/ops/lab-runtime.mjs"
BUDGET_TICK="$REPO/loterias-ai/ops/actions-budget-tick.mjs"
ENV_FILE="$HOME/.loterias-ai-runtime/env"
mkdir -p "$STATE"
cd "$REPO" || exit 1

# Local-only secrets/config. This file is outside Git and never persisted by the runtime.
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

find_bin() {
  NAME="$1"
  for CANDIDATE in "$(command -v "$NAME" 2>/dev/null || true)" "/usr/local/bin/$NAME" "/opt/homebrew/bin/$NAME" "/usr/bin/$NAME"; do
    if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then
      echo "$CANDIDATE"
      return 0
    fi
  done
  return 1
}

git fetch origin main >/dev/null 2>&1 || true
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
HEAD=$(git rev-parse HEAD 2>/dev/null || echo unavailable)
ORIGIN=$(git rev-parse origin/main 2>/dev/null || echo unavailable)
SYNC="none"
if [ "$DIRTY" = "0" ] && [ "$HEAD" != "$ORIGIN" ] && [ "$ORIGIN" != "unavailable" ]; then
  git merge --ff-only origin/main >/dev/null 2>&1 && SYNC="fast-forward" || SYNC="blocked"
fi

NODE_BIN=$(find_bin node || true)
NPM_BIN=$(find_bin npm || true)
NODE=$([ -n "$NODE_BIN" ] && "$NODE_BIN" --version 2>/dev/null || echo unavailable)
NPM=$([ -n "$NPM_BIN" ] && "$NPM_BIN" --version 2>/dev/null || echo unavailable)
RUNTIME_EXIT=127
RUNTIME_HEALTH="unavailable"
BUDGET_EXIT=127

if [ -n "$NODE_BIN" ] && [ -f "$RUNTIME" ]; then
  LOTERIAS_REPO="$REPO" "$NODE_BIN" "$RUNTIME" >> "$STATE/runtime-launch.log" 2>&1
  RUNTIME_EXIT=$?
  if [ -f "$STATE/runtime-status.json" ]; then
    RUNTIME_HEALTH=$("$NODE_BIN" -e "try{const x=require(process.argv[1]);process.stdout.write(String(x.health||'unknown'))}catch{process.stdout.write('invalid')}" "$STATE/runtime-status.json" 2>/dev/null || echo invalid)
  fi
fi

if [ -n "$NODE_BIN" ] && [ -f "$BUDGET_TICK" ]; then
  LOTERIAS_REPO="$REPO" "$NODE_BIN" "$BUDGET_TICK" >> "$STATE/actions-budget-launch.log" 2>&1
  BUDGET_EXIT=$?
fi

{
  echo "LOTERIAS_MAC_NODE=1"
  echo "timestamp=$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "health=ok"
  echo "host=$(hostname)"
  echo "macos=$(sw_vers -productVersion 2>/dev/null || echo unavailable)"
  echo "arch=$(uname -m)"
  echo "node=$NODE"
  echo "npm=$NPM"
  echo "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unavailable)"
  echo "head=$(git rev-parse HEAD 2>/dev/null || echo unavailable)"
  echo "origin_main=$(git rev-parse origin/main 2>/dev/null || echo unavailable)"
  echo "dirty_files=$DIRTY"
  echo "sync_action=$SYNC"
  echo "runtime_health=$RUNTIME_HEALTH"
  echo "runtime_exit=$RUNTIME_EXIT"
  echo "actions_budget_exit=$BUDGET_EXIT"
  echo "runtime_env_file_present=$([ -f "$ENV_FILE" ] && echo yes || echo no)"
  echo "disk_free_kb=$(df -k . | tail -1 | awk '{print $4}')"
  echo "load=$(uptime | sed 's/.*load averages*: //')"
} > "$STATE/status.txt"
