#!/bin/sh
set -u
URL=http://127.0.0.1:8765/
CURRENT_SESSION=${XDG_SESSION_ID-}
if [ -z "$CURRENT_SESSION" ]; then
    CURRENT_SESSION=$(/usr/bin/sed -n 's#.*session-\([^/]*\)\.scope.*#\1#p' "/proc/$$/cgroup" | /usr/bin/head -n 1)
fi

find_dashboard_pid() {
    for pid in $(/usr/bin/pgrep -u "$(/usr/bin/id -u)" -f '^python3 app.py$' 2>/dev/null); do
        if [ "$(/usr/bin/readlink -f "/proc/$pid/cwd" 2>/dev/null || true)" = /opt/fan-dashboard ]; then
            printf '%s\n' "$pid"
            return 0
        fi
    done
    return 1
}

if ! /usr/bin/systemctl is-active --quiet smart-fan.service; then
    if ! /usr/bin/pkexec /usr/bin/systemctl start smart-fan.service; then
        /usr/bin/notify-send 'iMac Fan Dashboard' 'Could not start the fan service.' -i dialog-error
        exit 1
    fi
fi

if /usr/bin/python3 -c 'from urllib.request import urlopen; urlopen("http://127.0.0.1:8765/api/status", timeout=2).close()' 2>/dev/null; then
    pid=$(find_dashboard_pid || true)
    if [ -n "$pid" ] && [ -n "$CURRENT_SESSION" ]; then
        server_session=$(/usr/bin/tr '\0' '\n' < "/proc/$pid/environ" | /usr/bin/sed -n 's/^XDG_SESSION_ID=//p' | /usr/bin/head -n 1)
        if [ -z "$server_session" ]; then
            server_session=$(/usr/bin/sed -n 's#.*session-\([^/]*\)\.scope.*#\1#p' "/proc/$pid/cgroup" | /usr/bin/head -n 1)
        fi
        if [ -n "$server_session" ] && [ "$server_session" != "$CURRENT_SESSION" ]; then
            /bin/kill -INT "$pid"
            for _ in $(/usr/bin/seq 1 30); do
                if ! /usr/bin/python3 -c 'from urllib.request import urlopen; urlopen("http://127.0.0.1:8765/api/status", timeout=1).close()' 2>/dev/null; then
                    break
                fi
                /usr/bin/sleep 0.1
            done
            if /usr/bin/python3 -c 'from urllib.request import urlopen; urlopen("http://127.0.0.1:8765/api/status", timeout=1).close()' 2>/dev/null; then
                /usr/bin/notify-send 'iMac Fan Dashboard' 'Could not reconnect the dashboard to this desktop session.' -i dialog-error
                exit 1
            fi
        else
            /usr/bin/xdg-open "$URL" >/dev/null 2>&1 &
            exit 0
        fi
    else
        /usr/bin/xdg-open "$URL" >/dev/null 2>&1 &
        exit 0
    fi
fi

/usr/local/bin/fan-dashboard
result=$?
if [ "$result" -ne 0 ]; then
    /usr/bin/notify-send 'iMac Fan Dashboard' 'Could not start the dashboard. Check the installation and try again.' -i dialog-error
fi
exit "$result"
