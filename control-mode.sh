#!/bin/bash
set -euo pipefail

[[ "$(id -u)" -eq 0 ]] || { echo "This helper must run through pkexec." >&2; exit 1; }
[[ $# -eq 1 && ( "$1" == quiet || "$1" == boost ) ]] || { echo "Usage: control-mode.sh quiet|boost" >&2; exit 2; }
mode=$1
printf '%s\n' "$mode" > /run/smart-fan-mode
if ! systemctl is-active --quiet smart-fan.service; then
    systemctl start smart-fan.service
fi
for _ in {1..20}; do
    if systemctl is-active --quiet smart-fan.service && [[ "$(cat /run/smart-fan-mode 2>/dev/null || true)" == "$mode" ]]; then
        exit 0
    fi
    sleep .25
done
echo "smart-fan.service did not confirm the selected mode." >&2
exit 1
