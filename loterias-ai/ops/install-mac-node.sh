#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.loterias.macnode.plist"
SCRIPT="$REPO/loterias-ai/ops/mac-node-heartbeat.sh"
STATE="$REPO/.loterias-mac-node"

mkdir -p "$HOME/Library/LaunchAgents" "$STATE" "$HOME/.loterias-ai-runtime"
cat > "$PLIST" <<EOF
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

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"
/bin/bash "$SCRIPT"

echo "LOTERIAS_MAC_NODE_INSTALLED"
echo "repo=$REPO"
echo "cadence_seconds=300"
echo "runtime=local-primary"
cat "$STATE/status.txt"
