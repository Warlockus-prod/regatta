#!/usr/bin/env bash
# Manage the Apple App Store status -> Telegram alert (launchd job).
#
# Usage:
#   ops/notify/asc-alert.sh status   # is it loaded, last state, last log line
#   ops/notify/asc-alert.sh test     # send a one-off test Telegram message
#   ops/notify/asc-alert.sh run      # run the check once now (notify only on change)
#   ops/notify/asc-alert.sh logs     # tail the run log
#   ops/notify/asc-alert.sh start    # load the launchd job (auto-run every 15 min)
#   ops/notify/asc-alert.sh stop     # unload the launchd job
set -euo pipefail

PLIST="$HOME/Library/LaunchAgents/com.regatta.asc-notify.plist"
NODE="${NODE_BIN:-/opt/homebrew/bin/node}"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/asc-telegram-notify.mjs"
STATE_FILE="$HOME/.regatta-asc-state"
LOG=/tmp/regatta-asc-notify.log
ERR=/tmp/regatta-asc-notify.err

case "${1:-status}" in
  status)
    if launchctl list | grep -q com.regatta.asc-notify; then
      echo "launchd: LOADED ($(launchctl list | grep com.regatta.asc-notify))"
    else
      echo "launchd: NOT LOADED  (use: $0 start)"
    fi
    echo "last seen state: $(cat "$STATE_FILE" 2>/dev/null || echo '(none yet)')"
    echo "last log line:   $(tail -1 "$LOG" 2>/dev/null || echo '(no log)')"
    [ -s "$ERR" ] && echo "STDERR (last 3): $(tail -3 "$ERR")" || true
    ;;
  test)  "$NODE" "$SCRIPT" --test ;;
  run)   "$NODE" "$SCRIPT" ;;
  logs)  tail -n 30 "$LOG" 2>/dev/null; [ -s "$ERR" ] && echo --- ERR --- && tail -n 30 "$ERR" || true ;;
  start) launchctl load "$PLIST" && echo "started" ;;
  stop)  launchctl unload "$PLIST" && echo "stopped" ;;
  *) echo "usage: $0 {status|test|run|logs|start|stop}"; exit 1 ;;
esac
