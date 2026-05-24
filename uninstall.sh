#!/bin/sh
#
# VWRT Dashboard — Uninstaller for OpenWrt
#
# Usage:
#   wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/uninstall.sh | sh
#   wget -O /tmp/uninstall.sh https://.../uninstall.sh && sh /tmp/uninstall.sh --purge
#
# Flags:
#   --purge   Also remove SMS archive and /etc/config/vwrt
#   -y        Skip confirmation prompt
#

set -e

INSTALL_DIR="/www/vwrt"
SMS_ARCHIVE="/overlay/vwrt_sms_archive.json"
VWRT_UCI="/etc/config/vwrt"
LOG="/tmp/vwrt_uninstall.log"

if [ -t 1 ]; then
    C_RED='\033[1;31m'; C_GREEN='\033[1;32m'; C_YELLOW='\033[1;33m'; C_CYAN='\033[1;36m'; C_RESET='\033[0m'
else
    C_RED=''; C_GREEN=''; C_YELLOW=''; C_CYAN=''; C_RESET=''
fi

log()  { printf "%b\n" "$*" | tee -a "$LOG"; }
info() { log "${C_CYAN}[INFO]${C_RESET} $*"; }
ok()   { log "${C_GREEN}[ OK ]${C_RESET} $*"; }
warn() { log "${C_YELLOW}[WARN]${C_RESET} $*"; }
die()  { log "${C_RED}[FAIL]${C_RESET} $*"; exit 1; }

PURGE=0
ASSUME_YES=0
for arg in "$@"; do
    case "$arg" in
        --purge) PURGE=1 ;;
        -y|--yes) ASSUME_YES=1 ;;
        *) die "Unknown flag: $arg" ;;
    esac
done

[ "$(id -u)" = "0" ] || die "Must run as root."

# ============================================================================
# Environment guard — refuse to run on anything that is NOT OpenWrt.
# Refuse early to avoid touching unrelated paths on a Quectel modem or generic
# Linux host. Mirrors install.sh check_environment().
# ============================================================================
if [ ! -f /etc/openwrt_release ]; then
    die "/etc/openwrt_release not found — this is not OpenWrt. Aborting."
fi
if [ -d /run/systemd/system ] || [ -e /lib/systemd/system ]; then
    die "systemd detected — wrong target OS (Quectel modem? generic Linux?). Aborting."
fi
if [ -d /usrdata ] || [ -e /dev/smd7 ] || [ -e /dev/smd11 ]; then
    die "Quectel modem environment detected — VWRT is for OpenWrt ROUTERS only. Aborting."
fi
command -v uci  >/dev/null 2>&1 || die "'uci' missing — not OpenWrt. Aborting."
command -v ubus >/dev/null 2>&1 || die "'ubus' missing — not OpenWrt. Aborting."

# Confirmation (skip if non-TTY or -y)
if [ -t 0 ] && [ "$ASSUME_YES" != "1" ]; then
    printf "${C_YELLOW}This will remove VWRT Dashboard and restore LuCI as the default UI.${C_RESET}\n"
    [ "$PURGE" = "1" ] && printf "${C_RED}--purge specified: SMS archive and UCI config WILL be deleted.${C_RESET}\n"
    printf "Continue? [y/N]: "
    read -r reply
    case "$reply" in
        y|Y|yes|YES) ;;
        *) info "Aborted."; exit 0 ;;
    esac
fi

: > "$LOG"
info "VWRT uninstaller started at $(date)"

# 1. Stop & disable services
for svc in mobile_poller sms_sync; do
    if [ -f "/etc/init.d/$svc" ]; then
        /etc/init.d/$svc stop    2>>"$LOG" || true
        /etc/init.d/$svc disable 2>>"$LOG" || true
        rm -f "/etc/init.d/$svc"
        ok "Removed /etc/init.d/$svc"
    fi
done

# Kill any leftover instances
killall mobile_poller.lua sms_sync.lua 2>/dev/null || true

# 2. Remove uci-defaults hook
if [ -f /etc/uci-defaults/99-vwrt-init ]; then
    rm -f /etc/uci-defaults/99-vwrt-init
    ok "Removed /etc/uci-defaults/99-vwrt-init"
fi

# 3. Restore uhttpd home to /www (LuCI default)
current_home=$(uci -q get uhttpd.main.home || echo "")
if [ "$current_home" = "$INSTALL_DIR" ]; then
    uci set uhttpd.main.home='/www'
    uci commit uhttpd
    /etc/init.d/uhttpd restart >>"$LOG" 2>&1 || warn "uhttpd restart failed."
    ok "Restored uhttpd.main.home → /www"
else
    info "uhttpd.main.home was '$current_home' — leaving unchanged."
fi

# 4. Remove install directory
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    ok "Removed $INSTALL_DIR"
fi

# 5. Optional purge of user data
if [ "$PURGE" = "1" ]; then
    [ -f "$SMS_ARCHIVE" ] && { rm -f "$SMS_ARCHIVE"; ok "Removed $SMS_ARCHIVE"; }
    [ -f "$VWRT_UCI" ]    && { rm -f "$VWRT_UCI";    ok "Removed $VWRT_UCI"; }
else
    info "User data preserved (use --purge to remove):"
    [ -f "$SMS_ARCHIVE" ] && info "  $SMS_ARCHIVE"
    [ -f "$VWRT_UCI" ]    && info "  $VWRT_UCI"
fi

# 6. Clean up runtime files (always)
rm -f /tmp/vwrt_mobile.json \
      /tmp/vwrt_mobile_temp.json \
      /tmp/vwrt_sms.json \
      /tmp/vwrt_csrf_token \
      /tmp/vwrt_rate_limits.json \
      /tmp/sysinfo_output.json \
      /tmp/cpu_last_stat \
      /tmp/sms_send.log \
      /tmp/sms_delete_request \
      /tmp/sms_web_activity \
      /tmp/sms_sync_trigger \
      /tmp/modem_at.lock 2>/dev/null || true

# 7. Remove iptables custom chain (best effort)
iptables  -D FORWARD -j VWRT_BLOCK 2>/dev/null || true
iptables  -F VWRT_BLOCK 2>/dev/null || true
iptables  -X VWRT_BLOCK 2>/dev/null || true
ip6tables -D FORWARD -j VWRT_BLOCK 2>/dev/null || true
ip6tables -F VWRT_BLOCK 2>/dev/null || true
ip6tables -X VWRT_BLOCK 2>/dev/null || true
iptables  -D FORWARD -j VWRT_ACCT  2>/dev/null || true
iptables  -F VWRT_ACCT 2>/dev/null || true
iptables  -X VWRT_ACCT 2>/dev/null || true

lan_ip=$(uci -q get network.lan.ipaddr || echo "192.168.1.1")
log ""
log "${C_GREEN}VWRT Dashboard uninstalled.${C_RESET}"
log "LuCI is now back at: http://$lan_ip/"
log "Uninstall log: $LOG"
