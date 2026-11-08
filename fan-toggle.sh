#!/bin/bash
set -euo pipefail
SERVICE=smart-fan.service
MODE_FILE=/run/smart-fan-mode
if systemctl is-active --quiet "$SERVICE"; then
    current=$(cat "$MODE_FILE" 2>/dev/null || printf quiet)
    [[ "$current" == boost ]] && target=quiet || target=boost
else
    target=quiet
fi
if ! pkexec /opt/fan-dashboard/control-mode.sh "$target"; then
    notify-send "تبريد iMac" "فشل تغيير وضع المراوح" -i dialog-error
    exit 1
fi
message="وضع هادئ ذكي"
[[ "$target" == boost ]] && message="تبريد قوي ذكي"
notify-send "تبريد iMac" "$message" -i fan
