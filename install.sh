#!/bin/bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
    echo "Run with sudo: sudo $0" >&2
    exit 1
fi
SRC=$(cd "$(dirname "$0")" && pwd)
DEST=/opt/fan-dashboard
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="/var/backups/fan-dashboard-$STAMP"
mkdir -p "$BACKUP"
for path in /usr/local/bin/smart-fan.sh /usr/local/bin/fan-toggle.sh /usr/local/libexec/smart-fan-common.sh /etc/systemd/system/smart-fan.service; do
    if [[ -e "$path" ]]; then
        mkdir -p "$BACKUP$(dirname "$path")"
        cp -a "$path" "$BACKUP$path"
    fi
done
if [[ -d "$DEST" ]]; then cp -a "$DEST" "$BACKUP/previous-opt-fan-dashboard"; fi

install -d -o root -g root -m 0755 "$DEST" "$DEST/static"
install -o root -g root -m 0644 "$SRC/app.py" "$DEST/app.py"
install -o root -g root -m 0644 "$SRC/smart-fan.sh" "$DEST/smart-fan.sh"
install -o root -g root -m 0644 "$SRC/smart-fan-common.sh" "$DEST/smart-fan-common.sh"
install -o root -g root -m 0644 "$SRC/control-mode.sh" "$DEST/control-mode.sh"
install -o root -g root -m 0644 "$SRC/run.sh" "$DEST/run.sh"
install -o root -g root -m 0644 "$SRC/fan-toggle.sh" "$DEST/fan-toggle.sh"
install -o root -g root -m 0644 "$SRC/README.md" "$DEST/README.md"
install -o root -g root -m 0644 "$SRC/static/index.html" "$DEST/static/index.html"
install -o root -g root -m 0644 "$SRC/static/app.css" "$DEST/static/app.css"
install -o root -g root -m 0644 "$SRC/static/app.js" "$DEST/static/app.js"
chmod 0755 "$DEST/smart-fan.sh" "$DEST/control-mode.sh" "$DEST/run.sh" "$DEST/fan-toggle.sh"
install -o root -g root -m 0644 "$SRC/smart-fan.service" /etc/systemd/system/smart-fan.service
cat > /usr/local/bin/fan-dashboard <<'WRAPPER'
#!/bin/sh
exec /opt/fan-dashboard/run.sh "$@"
WRAPPER
chmod 0755 /usr/local/bin/fan-dashboard
cat > /usr/local/bin/fan-toggle.sh <<'WRAPPER'
#!/bin/sh
exec /opt/fan-dashboard/fan-toggle.sh "$@"
WRAPPER
chmod 0755 /usr/local/bin/fan-toggle.sh
cat > /usr/local/bin/smart-fan.sh <<'WRAPPER'
#!/bin/sh
exec /opt/fan-dashboard/smart-fan.sh "$@"
WRAPPER
chmod 0755 /usr/local/bin/smart-fan.sh
systemctl daemon-reload
systemctl enable smart-fan.service >/dev/null
systemctl restart smart-fan.service
printf 'Installed fan dashboard. Backup: %s\nRun: fan-dashboard\n' "$BACKUP"
systemctl --no-pager --full status smart-fan.service | sed -n '1,12p'
