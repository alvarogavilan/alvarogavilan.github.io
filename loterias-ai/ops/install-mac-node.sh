#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
MACNODE_PLIST="$HOME/Library/LaunchAgents/com.loterias.macnode.plist"
SWARM_PLIST="$HOME/Library/LaunchAgents/com.loterias.megaswarm.plist"
SCRIPT="$REPO/loterias-ai/ops/mac-node-heartbeat.sh"
SWARM_SCRIPT="$REPO/loterias-ai/ops/mac-swarm-runner.sh"
STATE="$REPO/.loterias-mac-node"
RUNTIME_ROOT="$HOME/.loterias-ai-runtime"
ENV_FILE="$RUNTIME_ROOT/env"

mkdir -p "$HOME/Library/LaunchAgents" "$STATE" "$RUNTIME_ROOT"
if [ ! -f "$ENV_FILE" ]; then
  : > "$ENV_FILE"
fi
chmod 600 "$ENV_FILE" 2>/dev/null || true
chmod +x "$SCRIPT" "$SWARM_SCRIPT" 2>/dev/null || true

cat > "$MACNODE_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.loterias.macnode</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>$SCRIPT</string></array>
<key>RunAtLoad</key><true/>
<key>StartInterval</key><integer>300</integer>
<key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>$STATE/launchd.out.log</string>
<key>StandardErrorPath</key><string>$STATE/launchd.err.log</string>
</dict></plist>
EOF

cat > "$SWARM_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.loterias.megaswarm</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>$SWARM_SCRIPT</string></array>
<key>RunAtLoad</key><true/>
<key>StartInterval</key><integer>3600</integer>
<key>ProcessType</key><string>Background</string>
<key>Nice</key><integer>10</integer>
<key>LowPriorityIO</key><true/>
<key>StandardOutPath</key><string>$STATE/megaswarm-launchd.out.log</string>
<key>StandardErrorPath</key><string>$STATE/megaswarm-launchd.err.log</string>
</dict></plist>
EOF

launchctl unload "$MACNODE_PLIST" >/dev/null 2>&1 || true
launchctl unload "$SWARM_PLIST" >/dev/null 2>&1 || true
launchctl load "$MACNODE_PLIST"
/bin/bash "$SCRIPT"
launchctl load "$SWARM_PLIST"

echo "LOTERIAS_MAC_NODE_INSTALLED"
echo "repo=$REPO"
echo "capture_cadence_seconds=300"
echo "swarm_cadence_seconds=3600"
echo "swarm_default_batch=${MEGALAB_BATCH:-1024}"
echo "runtime=local-primary"
echo "local_env=$ENV_FILE"
cat "$STATE/status.txt"
