#!/bin/bash

read_max_temp_from_text() {
    printf '%s\n' "$1" |
        sed -n '/°C/ { s/°C.*//; p; }' |
        grep -oE '[+-][0-9]+([.][0-9]+)?' |
        sed -E 's/^\+//; s/\..*$//' |
        sort -n |
        tail -1
}

read_max_temp() {
    read_max_temp_from_text "$(sensors 2>/dev/null)"
}

fan_status_line() {
    local base=${FAN_SYSFS_BASE:-/sys/devices/platform/applesmc.768}
    local temp
    temp=$(read_max_temp)
    printf '%s°C | ODD:%s HDD:%s CPU:%s RPM' \
        "${temp:-?}" \
        "$(cat "$base/fan1_input" 2>/dev/null)" \
        "$(cat "$base/fan2_input" 2>/dev/null)" \
        "$(cat "$base/fan3_input" 2>/dev/null)"
}
