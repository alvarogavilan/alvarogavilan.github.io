#!/bin/bash
set -u

REPO="/Users/alvaro/alvarogavilan.github.io"
PLIST="$HOME/Library/LaunchAgents/com.loterias.macnode.plist"
SCRIPT="$REPO/loterias-ai/ops/mac-node-heartbeat.sh"

mkdir -p "$HOME/Library/LaunchAgents" "$REPO/.loterias-mac-node"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.loterias.macnode</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>$SCRIPT</string></array>
<key>RunAtLoad</key><true/>
<key>StartInterval</key><integer>300</integer>
<key>StandardOutPath</key><string>$REPO/.loterias-mac-node/launchd.out.log</string>
<key>StandardErrorPath</key><string>$REPO/.loterias-mac-node/launchd.err.log</string>
</dict></plist>
EOF
launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"
/bin/bash "$SCRIPT"
echo "LOTERIAS_MAC_NODE_INSTALLED"
cat "$REPO/.loterias-mac-node/status.txt"
