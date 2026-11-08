#!/bin/bash
# iMac Smart Fan V6: temperature-controlled quiet/boost modes and full-blast failsafe.
exec > >(stdbuf -oL cat) 2>&1
COMMON_LIB=${FAN_COMMON_LIB:-/opt/fan-dashboard/smart-fan-common.sh}
source "$COMMON_LIB" || exit 1
BASE=${FAN_SYSFS_BASE:-/sys/devices/platform/applesmc.768}
MODE_FILE=${FAN_MODE_FILE:-/run/smart-fan-mode}
STEP=250
LO=68 HI=80
CRIT=95
NS=23 NE=7 HARD=84

auto() { for i in 1 2 3; do echo 0 > "$BASE/fan${i}_manual" 2>/dev/null; done; }
trap auto EXIT
full() {
    for i in 1 2 3; do
        echo 1 > "$BASE/fan${i}_manual" 2>/dev/null
        cat "$BASE/fan${i}_max" > "$BASE/fan${i}_output" 2>/dev/null
    done
}
for i in 1 2 3; do echo 1 > "$BASE/fan${i}_manual" 2>/dev/null; done
MIN=(0 1400 1100 1200)
QDAY=(0 3200 2300 2700)
QNGT=(0 2600 1850 2200)
QBOOST=(0 "$(cat "$BASE/fan1_max" 2>/dev/null)" "$(cat "$BASE/fan2_max" 2>/dev/null)" "$(cat "$BASE/fan3_max" 2>/dev/null)")
CUR=(0 0 0 0)

while true; do
    TEMP=$(read_max_temp)
    if [[ -z "$TEMP" ]]; then
        logger -t smart-fan "sensors failed, FULL BLAST failsafe"
        full
        CUR=(0 0 0 0)
        sleep 30
        continue
    fi
    if (( TEMP >= CRIT )); then
        logger -t smart-fan "CRIT ${TEMP}C, FULL BLAST"
        full
        CUR=(0 0 0 0)
        sleep 30
        continue
    fi
    for i in 1 2 3; do echo 1 > "$BASE/fan${i}_manual" 2>/dev/null; done

    MODE=$(cat "$MODE_FILE" 2>/dev/null)
    QMAX=("${QDAY[@]}")
    NLO=$LO
    if [[ "$MODE" == boost ]]; then
        QMAX=("${QBOOST[@]}")
    else
        H=$(date +%-H)
        if { (( H >= NS || H < NE )) && (( TEMP < HARD )); }; then
            QMAX=("${QNGT[@]}")
            NLO=$((LO + 4))
        fi
    fi

    T=$TEMP
    (( T < NLO )) && T=$NLO
    (( T > HI )) && T=$HI
    F=$(( (T - LO) * 100 / (HI - LO) ))
    for i in 1 2 3; do
        TGT=$(( MIN[i] + (QMAX[i] - MIN[i]) * F / 100 ))
        if [[ "${CUR[$i]}" == 0 ]]; then
            CUR[$i]=$(cat "$BASE/fan${i}_input" 2>/dev/null || echo "$TGT")
            [[ -n "${CUR[$i]}" ]] || CUR[$i]=$TGT
        fi
        C=${CUR[$i]}
        D=$(( TGT - C ))
        (( D > STEP )) && D=$STEP
        (( D < -STEP )) && D=$((-STEP))
        CUR[$i]=$(( C + D ))
        echo "${CUR[$i]}" > "$BASE/fan${i}_output" 2>/dev/null
    done
    echo "$(date '+%H:%M:%S') ${TEMP}C ${MODE:-quiet} -> ${CUR[1]}/${CUR[2]}/${CUR[3]} RPM"
    sleep 5
done
