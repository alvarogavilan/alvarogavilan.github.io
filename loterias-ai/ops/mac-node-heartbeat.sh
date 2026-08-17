#!/bin/bash
set -u

REPO="/Users/alvaro/alvarogavilan.github.io"
STATE="$REPO/.loterias-mac-node"
mkdir -p "$STATE"
cd "$REPO" || exit 1

git fetch origin main >/dev/null 2>&1 || true
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
HEAD=$(git rev-parse HEAD 2>/dev/null || echo unavailable)
ORIGIN=$(git rev-parse origin/main 2>/dev/null || echo unavailable)
SYNC="none"
if [ "$DIRTY" = "0" ] && [ "$HEAD" != "$ORIGIN" ] && [ "$ORIGIN" != "unavailable" ]; then
  git merge --ff-only origin/main >/dev/null 2>&1 && SYNC="fast-forward" || SYNC="blocked"
fi
NODE=$(/usr/local/bin/node --version 2>/dev/null || echo unavailable)
NPM=$(/usr/local/bin/npm --version 2>/dev/null || echo unavailable)
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
  echo "disk_free_kb=$(df -k . | tail -1 | awk '{print $4}')"
  echo "load=$(uptime | sed 's/.*load averages*: //')"
} > "$STATE/status.txt"
