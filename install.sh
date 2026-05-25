#!/bin/sh
#
# VWRT Dashboard — One-shot installer for OpenWrt
#
# Usage (on the router via SSH):
#   wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh
#   wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh -s -- install
#   wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh -s -- upgrade
#
# Or interactively:
#   wget -O /tmp/install.sh https://.../install.sh && sh /tmp/install.sh
#
# Reference style: tuanlongsav/quectel-rgmii-toolkit (SDXLEMUR branch).
#

set -e

# ============================================================================
# Configuration
# ============================================================================
GITUSER="tuanlongsav"
REPONAME="vwrt-dashboard"
GITBRANCH="main"
TARBALL_URL="https://github.com/${GITUSER}/${REPONAME}/archive/refs/heads/${GITBRANCH}.tar.gz"

INSTALL_DIR="/www/vwrt"
WORK_DIR="/tmp/vwrt_install"
BACKUP_DIR="/root"
LOG="/tmp/vwrt_install.log"

# Paths the project expects to be writable (from lib/constants.lua)
SMS_ARCHIVE="/overlay/vwrt_sms_archive.json"
VWRT_UCI="/etc/config/vwrt"

# ============================================================================
# Colors (skip if not a TTY)
# ============================================================================
if [ -t 1 ]; then
    C_RED='\033[1;31m'
    C_GREEN='\033[1;32m'
    C_YELLOW='\033[1;33m'
    C_CYAN='\033[1;36m'
    C_RESET='\033[0m'
else
    C_RED=''; C_GREEN=''; C_YELLOW=''; C_CYAN=''; C_RESET=''
fi

log()   { printf "%b\n" "$*" | tee -a "$LOG"; }
info()  { log "${C_CYAN}[INFO]${C_RESET} $*"; }
ok()    { log "${C_GREEN}[ OK ]${C_RESET} $*"; }
warn()  { log "${C_YELLOW}[WARN]${C_RESET} $*"; }
err()   { log "${C_RED}[FAIL]${C_RESET} $*"; }
die()   { err "$*"; exit 1; }

# ============================================================================
# Environment guard — refuse to run on anything that is NOT OpenWrt
# ============================================================================
# VWRT is a router admin panel targeting OpenWrt (procd + uci + uhttpd).
# It MUST NOT be installed on:
#   - Quectel modem cards (Yocto + systemd + /usrdata + /dev/smd*)
#   - Generic Linux desktops / VPS
#   - LEDE/forks without uci/procd
# This guard prints what it detected so the user can sanity-check before continuing.
check_environment() {
    info "Verifying target is OpenWrt..."

    # 1. Must be Linux at all
    [ "$(uname -s)" = "Linux" ] || die "Not a Linux system: $(uname -s). Aborting."

    # 2. OpenWrt release file must exist
    if [ ! -f /etc/openwrt_release ]; then
        die "/etc/openwrt_release not found — this is not OpenWrt. Aborting."
    fi
    # Extract DISTRIB_ID for the log (should be 'OpenWrt' or a fork like 'ImmortalWrt')
    distrib_id=$(grep -E '^DISTRIB_ID=' /etc/openwrt_release | cut -d"'" -f2)
    distrib_release=$(grep -E '^DISTRIB_RELEASE=' /etc/openwrt_release | cut -d"'" -f2)
    info "Detected: ${distrib_id} ${distrib_release}"

    # 3. Init must be procd, NOT systemd
    if [ -d /run/systemd/system ] || [ -e /lib/systemd/system ]; then
        die "systemd detected — this looks like a Quectel modem or generic Linux, NOT OpenWrt. Aborting."
    fi
    init_comm=$(cat /proc/1/comm 2>/dev/null || echo unknown)
    case "$init_comm" in
        procd|init) ;;  # OpenWrt uses 'procd' (or 'init' symlink to procd)
        *) die "PID 1 is '$init_comm' — expected 'procd'. Wrong target OS. Aborting." ;;
    esac
    [ -x /sbin/procd ] || die "/sbin/procd missing — not an OpenWrt init system."

    # 4. Reject Quectel modem firmware explicitly
    if [ -d /usrdata ]; then
        die "/usrdata exists — this looks like a Quectel modem card (RMxxx/SDX). VWRT is for routers, NOT modems. Aborting."
    fi
    if [ -e /dev/smd7 ] || [ -e /dev/smd11 ]; then
        die "/dev/smd* present — this is a Quectel modem card. VWRT is for the ROUTER side. Aborting."
    fi
    if grep -qiE 'quectel|sdx[0-9]+|qualcomm.*modem' /etc/os-release 2>/dev/null; then
        die "os-release indicates a Quectel/Qualcomm modem firmware. Aborting."
    fi

    # 5. Reject Entware (means user followed Quectel-toolkit pattern by mistake)
    if [ -d /opt/bin ] && [ -x /opt/bin/opkg ] && [ ! -x /bin/opkg ] && [ ! -x /usr/bin/opkg ]; then
        die "Entware-only opkg detected at /opt/bin/opkg without native OpenWrt opkg. Wrong host. Aborting."
    fi

    # 6. OpenWrt essentials present
    command -v uci    >/dev/null 2>&1 || die "'uci' missing — broken or non-OpenWrt host."
    command -v ubus   >/dev/null 2>&1 || die "'ubus' missing — broken or non-OpenWrt host."
    command -v uhttpd >/dev/null 2>&1 || warn "'uhttpd' missing — will be installed by check_prereqs()."
    [ -d /etc/init.d ]         || die "/etc/init.d missing — broken init layout."
    [ -d /etc/uci-defaults ]   || die "/etc/uci-defaults missing — not standard OpenWrt."

    # 7. /overlay must exist (root-rw overlay filesystem)
    if [ ! -d /overlay ]; then
        die "/overlay missing — VWRT needs writable overlay for SMS archive."
    fi

    ok "Environment verified: OpenWrt host."
}

# ============================================================================
# Prerequisite checks
# ============================================================================
check_prereqs() {
    info "Checking prerequisites..."

    # Must run as root
    [ "$(id -u)" = "0" ] || die "Must run as root."

    # Free space on /overlay (need >= 2 MB)
    overlay_avail=$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')
    if [ -n "$overlay_avail" ] && [ "$overlay_avail" -lt 2048 ]; then
        die "/overlay has less than 2 MB free (got ${overlay_avail} KB). Free space first."
    fi

    # Test Lua modules by actually requiring them (works for static-linked builds too)
    lua_has() {
        # $1 = module name (e.g. "cjson", "luci.jsonc")
        lua -e "require '$1'" >/dev/null 2>&1
    }

    # Required runtime packages — install via opkg only what's actually missing
    need_pkgs=""
    if ! command -v lua >/dev/null 2>&1; then
        need_pkgs="$need_pkgs lua"
    else
        # Lua present — check Lua modules functionally, not by file path
        lua_has cjson      || need_pkgs="$need_pkgs lua-cjson"
        lua_has luci.jsonc || need_pkgs="$need_pkgs luci-lib-jsonc"
    fi
    [ -d /usr/lib/lua/luci ]  || need_pkgs="$need_pkgs luci-base"
    command -v uhttpd >/dev/null 2>&1 || need_pkgs="$need_pkgs uhttpd"
    command -v wget   >/dev/null 2>&1 || need_pkgs="$need_pkgs wget-ssl"

    # Download package .ipk directly from upstream OpenWrt repo via HTTPS,
    # then opkg install LOCAL file (no feed signature check on local install).
    # Args: $1 = package name (e.g. "lua-cjson")
    #       $2 = feed name  (e.g. "packages" / "luci" / "base" / "routing")
    # Returns 0 on success.
    fetch_and_install_ipk() {
        pkg="$1"
        feed="$2"

        # Architecture (e.g. aarch64_cortex-a53) — third line from opkg
        arch=$(opkg print-architecture 2>/dev/null | awk '$1=="arch" && $2!~/^(all|noarch)$/ {print $2; exit}')
        [ -z "$arch" ] && { warn "Could not detect arch."; return 1; }

        release=$(grep -E '^DISTRIB_RELEASE=' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2)
        [ -z "$release" ] && { warn "Could not detect release."; return 1; }

        base_url="https://downloads.openwrt.org/releases/${release}/packages/${arch}/${feed}"

        info "  Resolving $pkg in $base_url ..."
        # Parse Packages file for the .ipk filename for this exact package name
        filename=$(wget --no-check-certificate -q -O- "${base_url}/Packages" 2>/dev/null | \
                   awk -v p="$pkg" '
                       /^Package: / { found=($2==p) ? 1 : 0; next }
                       found && /^Filename: / { print $2; exit }
                   ')

        if [ -z "$filename" ]; then
            warn "  Package $pkg not found in feed $feed."
            return 1
        fi

        info "  Downloading $filename ..."
        if ! wget --no-check-certificate -q -O "/tmp/$filename" "${base_url}/$filename"; then
            warn "  Download failed: ${base_url}/$filename"
            return 1
        fi

        info "  Installing local /tmp/$filename ..."
        if opkg install "/tmp/$filename" >>"$LOG" 2>&1; then
            rm -f "/tmp/$filename"
            return 0
        fi
        return 1
    }

    # Map our package names → feed names (where to look on downloads.openwrt.org)
    feed_for_pkg() {
        case "$1" in
            lua|lua-cjson|wget*) echo "packages" ;;
            luci-lib-jsonc|luci-base) echo "luci" ;;
            uhttpd*) echo "base" ;;
            *) echo "packages" ;;
        esac
    }

    # Wrapper: try opkg install with three escalating strategies.
    # 1) Normal opkg install (works on stock OpenWrt with valid signing keys)
    # 2) DELETE 'option check_signature' from opkg.conf (the correct way to
    #    disable — opkg treats ANY value, including '0', as truthy). Retry.
    # 3) For each still-missing pkg, download .ipk via HTTPS and install local.
    opkg_install_with_sig_recovery() {
        # $1 = space-separated package list

        opkg update >>"$LOG" 2>&1 || warn "opkg update had issues (continuing)."
        # shellcheck disable=SC2086
        if opkg install $1 >>"$LOG" 2>&1; then
            return 0
        fi

        # Detect signature-trust failure pattern
        if grep -qE 'Signature check failed|Unknown package' "$LOG"; then
            warn "Detected opkg signature-trust failure."

            # Strategy 2: properly disable signature check by REMOVING the
            # option line entirely. opkg's 'check_signature' is presence-
            # based — setting it to "0" still keeps it enabled. Only
            # absence of the option disables it.
            if [ -f /etc/opkg.conf ] && grep -q '^option check_signature' /etc/opkg.conf; then
                [ -f /etc/opkg.conf.vwrtbak ] || cp /etc/opkg.conf /etc/opkg.conf.vwrtbak
                sed -i '/^option check_signature/d' /etc/opkg.conf
                warn "Removed 'option check_signature' from /etc/opkg.conf"
                warn "(backed up to /etc/opkg.conf.vwrtbak)"

                opkg update >>"$LOG" 2>&1
                # shellcheck disable=SC2086
                if opkg install $1 >>"$LOG" 2>&1; then
                    ok "Installed after removing signature option."
                    return 0
                fi
            fi

            # Strategy 3: direct .ipk download per package
            warn "Falling back to direct .ipk download via HTTPS..."
            failed=""
            for pkg in $1; do
                feed=$(feed_for_pkg "$pkg")
                if fetch_and_install_ipk "$pkg" "$feed"; then
                    ok "  $pkg installed via direct download."
                else
                    failed="$failed $pkg"
                fi
            done

            if [ -z "$failed" ]; then
                ok "All packages installed via direct .ipk download."
                return 0
            fi
            warn "Direct download still missed:$failed"
        fi
        return 1
    }

    if [ -n "$need_pkgs" ] && [ "${SKIP_DEPS:-0}" != "1" ]; then
        info "Installing missing packages:$need_pkgs"

        # shellcheck disable=SC2086
        if ! opkg_install_with_sig_recovery "$need_pkgs"; then
            # Show what failed and re-check whether the runtime is actually usable
            tail -25 "$LOG" >&2
            warn "opkg install failed. Re-checking if modules are usable anyway..."

            still_missing=""
            command -v lua >/dev/null 2>&1 || still_missing="$still_missing lua"
            if command -v lua >/dev/null 2>&1; then
                lua_has cjson      || still_missing="$still_missing lua-cjson"
                lua_has luci.jsonc || still_missing="$still_missing luci-lib-jsonc"
            fi
            command -v uhttpd >/dev/null 2>&1 || still_missing="$still_missing uhttpd"
            command -v wget   >/dev/null 2>&1 || still_missing="$still_missing wget"

            if [ -n "$still_missing" ]; then
                err "Required components still missing:$still_missing"
                err "Possible causes:"
                err "  • Firmware doesn't expose OpenWrt opkg repo (custom firmware Fudy/GL.iNet/etc.)"
                err "  • /etc/opkg/distfeeds.conf has invalid URLs"
                err "  • No internet on router right now"
                err "  • Signature-trust failure (auto-recover already tried above)"
                err ""
                err "Workarounds:"
                err "  1. Install manually with the firmware's own tool, then rerun:"
                err "       SKIP_DEPS=1 sh install.sh install"
                err "  2. Check sources:    cat /etc/opkg/distfeeds.conf"
                err "  3. Check sig config: cat /etc/opkg.conf"
                err "  4. Or download .ipk manually and: opkg install /tmp/<pkg>.ipk"
                die "Abort."
            else
                warn "Some opkg installs failed but all modules are usable. Continuing."
            fi
        else
            ok "Packages installed."
        fi
    elif [ -n "$need_pkgs" ] && [ "${SKIP_DEPS:-0}" = "1" ]; then
        warn "SKIP_DEPS=1 set — not installing:$need_pkgs (you said it's fine)"
    else
        ok "All required Lua modules and tools present."
    fi

    # Warn (don't fail) about modem driver
    if ! command -v mmcli >/dev/null 2>&1 && ! command -v sms_tool >/dev/null 2>&1; then
        warn "Neither 'mmcli' nor 'sms_tool' found — modem features will be limited."
        warn "Install one: 'opkg install modemmanager' OR 'opkg install sms-tool'"
    fi
}

# ============================================================================
# Backup any existing install
# ============================================================================
backup_existing() {
    if [ ! -d "$INSTALL_DIR" ]; then
        info "No existing install — skipping backup."
        return 0
    fi

    [ "${SKIP_BACKUP:-0}" = "1" ] && { warn "SKIP_BACKUP=1, skipping backup."; return 0; }

    ts=$(date +%Y%m%d_%H%M%S)
    backup_file="${BACKUP_DIR}/vwrt_backup_${ts}.tar.gz"
    info "Backing up existing install → ${backup_file}"

    # Include user data: install dir + uci config + sms archive
    paths_to_backup="$INSTALL_DIR"
    [ -f "$VWRT_UCI" ]     && paths_to_backup="$paths_to_backup $VWRT_UCI"
    [ -f "$SMS_ARCHIVE" ]  && paths_to_backup="$paths_to_backup $SMS_ARCHIVE"

    # shellcheck disable=SC2086
    tar -czf "$backup_file" $paths_to_backup 2>>"$LOG" \
        && ok "Backup saved." \
        || warn "Backup failed (continuing anyway)."
}

# ============================================================================
# Download release tarball
# ============================================================================
download_release() {
    info "Downloading from $TARBALL_URL ..."
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"

    if ! wget --no-check-certificate -q -O "$WORK_DIR/release.tar.gz" "$TARBALL_URL"; then
        die "Download failed. Check internet / repo URL."
    fi

    # Sanity check (should be > 1 KB)
    sz=$(wc -c <"$WORK_DIR/release.tar.gz")
    [ "$sz" -gt 1024 ] || die "Downloaded file too small (${sz} bytes) — likely 404."

    info "Extracting..."
    tar -xzf "$WORK_DIR/release.tar.gz" -C "$WORK_DIR" 2>>"$LOG" \
        || die "Extraction failed."

    # GitHub archives extract to <repo>-<branch>/
    SOURCE_DIR=$(find "$WORK_DIR" -maxdepth 1 -type d -name "${REPONAME}-*" | head -n 1)
    [ -d "$SOURCE_DIR" ] || die "Source dir not found in extracted tarball."
    ok "Source extracted at $SOURCE_DIR"
}

# ============================================================================
# Deploy files to /www/vwrt
# ============================================================================
deploy_files() {
    info "Deploying to $INSTALL_DIR ..."

    # Stop daemons before overwriting their script files
    /etc/init.d/mobile_poller stop 2>/dev/null || true
    /etc/init.d/sms_sync stop      2>/dev/null || true
    killall mobile_poller.lua sms_sync.lua 2>/dev/null || true

    # Clean & copy
    mkdir -p "$INSTALL_DIR"
    rm -rf "${INSTALL_DIR:?}"/*
    cp -rf "$SOURCE_DIR"/* "$INSTALL_DIR"/

    # Strip dev artifacts that may have come through
    rm -rf "$INSTALL_DIR"/.git* \
           "$INSTALL_DIR"/.editorconfig \
           "$INSTALL_DIR"/.vscode \
           "$INSTALL_DIR"/install.sh \
           "$INSTALL_DIR"/uninstall.sh \
           "$INSTALL_DIR"/INSTALL.md 2>/dev/null || true

    # Permissions
    chmod -R 755 "$INSTALL_DIR"
    # All CGI endpoints (files under cgi-bin/<group>/) must be executable
    find "$INSTALL_DIR/cgi-bin" -type f -exec chmod +x {} \;
    # Services directory
    [ -d "$INSTALL_DIR/services" ] && chmod -R +x "$INSTALL_DIR/services"

    ok "Files deployed."
}

# ============================================================================
# Re-create LuCI symlinks
# ============================================================================
fix_symlinks() {
    info "Creating LuCI integration symlinks..."

    # Static assets (CSS/JS/icons)
    if [ -d /www/luci-static ]; then
        ln -snf /www/luci-static "$INSTALL_DIR/luci-static"
        ok "luci-static symlinked."
    else
        warn "/www/luci-static missing — LuCI assets may not render."
    fi

    # LuCI dispatcher (ucode on 22.03+, lua on older — both expose /cgi-bin/luci)
    if [ -e /www/cgi-bin/luci ]; then
        ln -snf /www/cgi-bin/luci "$INSTALL_DIR/cgi-bin/luci"
        ok "cgi-bin/luci symlinked."
    else
        warn "/www/cgi-bin/luci missing — LuCI access via VWRT may not work."
        warn "Install luci-base or check your OpenWrt version."
    fi

    # LuCI helper CGIs — needed when uhttpd.home=/www/vwrt because LuCI's
    # JS hits /cgi-bin/cgi-exec for opkg-call (list-installed) and
    # rrdtool graph; cgi-upload / cgi-download / cgi-backup handle file
    # transfers and config backup. Without these, the browser sees 404 →
    # NotFoundError. Symlink each one if present; warn if absent so we
    # don't fail the install on minimal LuCI builds that omit them.
    mkdir -p "$INSTALL_DIR/cgi-bin"
    for helper in cgi-exec cgi-upload cgi-download cgi-backup; do
        if [ -e "/www/cgi-bin/$helper" ]; then
            ln -snf "/www/cgi-bin/$helper" "$INSTALL_DIR/cgi-bin/$helper"
            ok "cgi-bin/$helper symlinked."
        else
            warn "/www/cgi-bin/$helper missing — some LuCI features (opkg, rrdtool, backup) may 404."
        fi
    done
}

# ============================================================================
# Install init.d services + uci-defaults
# ============================================================================
install_services() {
    info "Installing init.d services..."

    for svc in mobile_poller sms_sync; do
        src="$INSTALL_DIR/services/init.d/$svc"
        dst="/etc/init.d/$svc"
        if [ -f "$src" ]; then
            cp "$src" "$dst"
            chmod +x "$dst"
            "$dst" enable >>"$LOG" 2>&1 || warn "$svc enable failed."
            ok "$svc installed & enabled."
        else
            warn "$src not found — skipping."
        fi
    done

    # uci-defaults runs once on next boot (idempotent — we also enabled above)
    if [ -f "$INSTALL_DIR/services/uci-defaults/99-vwrt-init" ]; then
        cp "$INSTALL_DIR/services/uci-defaults/99-vwrt-init" /etc/uci-defaults/
        chmod +x /etc/uci-defaults/99-vwrt-init
        ok "uci-defaults installed."
    fi
}

# ============================================================================
# Initialize storage
# ============================================================================
init_storage() {
    info "Initializing storage..."

    if [ ! -f "$SMS_ARCHIVE" ]; then
        echo '{"conversations":{},"synced_ids":{},"settings":{"max_messages":50,"auto_delete_days":7}}' > "$SMS_ARCHIVE"
        ok "SMS archive initialized: $SMS_ARCHIVE"
    else
        info "SMS archive already exists — preserved."
    fi

    if [ ! -f "$VWRT_UCI" ]; then
        touch "$VWRT_UCI"
        uci commit vwrt 2>/dev/null || true
        ok "UCI config initialized: $VWRT_UCI"
    fi
}

# ============================================================================
# Set VWRT as default UI on port 80
# ============================================================================
set_default_ui() {
    info "Setting VWRT as default UI (uhttpd.main.home=$INSTALL_DIR)..."
    uci set uhttpd.main.home="$INSTALL_DIR"
    uci commit uhttpd
    /etc/init.d/uhttpd restart >>"$LOG" 2>&1 || warn "uhttpd restart failed."
    ok "uhttpd reconfigured."
}

# ============================================================================
# Start services
# ============================================================================
start_services() {
    info "Starting services..."
    /etc/init.d/mobile_poller start 2>>"$LOG" || warn "mobile_poller failed to start."
    /etc/init.d/sms_sync start      2>>"$LOG" || warn "sms_sync failed to start."
    ok "Services started."
}

# ============================================================================
# Post-install message
# ============================================================================
post_install_msg() {
    lan_ip=$(uci -q get network.lan.ipaddr || echo "192.168.1.1")
    version=$(grep -oE '"version"[^,}]*' "$INSTALL_DIR/version.json" 2>/dev/null | head -1 || echo "?")

    log ""
    log "${C_GREEN}============================================================${C_RESET}"
    log "${C_GREEN}  VWRT Dashboard installed successfully${C_RESET}"
    log "${C_GREEN}============================================================${C_RESET}"
    log "  Version : $version"
    log "  URL     : http://$lan_ip/"
    log "  Login   : root password (your OpenWrt root password)"
    log ""
    log "  LuCI still accessible at: http://$lan_ip/cgi-bin/luci"
    log "  Install log: $LOG"
    log "${C_GREEN}============================================================${C_RESET}"
}

# ============================================================================
# Main install flow
# ============================================================================
do_install() {
    : > "$LOG"
    info "VWRT Dashboard installer started at $(date)"

    check_environment
    check_prereqs
    backup_existing
    download_release
    deploy_files
    fix_symlinks
    install_services
    init_storage
    set_default_ui
    start_services
    post_install_msg

    rm -rf "$WORK_DIR"
}

# ============================================================================
# Upgrade flow — same as install but emphasises backup
# ============================================================================
do_upgrade() {
    [ -d "$INSTALL_DIR" ] || die "VWRT not installed — use 'install' instead of 'upgrade'."
    do_install
}

# ============================================================================
# Interactive menu (only shown when running interactively)
# ============================================================================
show_menu() {
    while :; do
        printf "\n${C_CYAN}=== VWRT Dashboard ===${C_RESET}\n"
        printf "  1) Install / Reinstall\n"
        printf "  2) Upgrade (keep data)\n"
        printf "  3) Uninstall (run uninstall.sh)\n"
        printf "  4) Show install log\n"
        printf "  5) Exit\n"
        printf "Choice [1-5]: "
        read -r choice
        case "$choice" in
            1) do_install; break ;;
            2) do_upgrade; break ;;
            3) wget -O- "https://raw.githubusercontent.com/${GITUSER}/${REPONAME}/${GITBRANCH}/uninstall.sh" | sh; break ;;
            4) [ -f "$LOG" ] && cat "$LOG" || echo "(no log yet)" ;;
            5) exit 0 ;;
            *) echo "Invalid choice." ;;
        esac
    done
}

# ============================================================================
# Entry point
# ============================================================================
case "${1:-}" in
    install|"")
        # No arg → if stdin is a terminal show menu, else just install (piped via wget)
        if [ -t 0 ] && [ -z "${1:-}" ]; then
            show_menu
        else
            do_install
        fi
        ;;
    upgrade)
        do_upgrade
        ;;
    -h|--help|help)
        cat <<EOF
VWRT Dashboard installer

Usage:
  $0                  Interactive menu (TTY) or install (piped)
  $0 install          Install or reinstall
  $0 upgrade          Upgrade existing install
  $0 help             Show this help

Env vars:
  SKIP_BACKUP=1       Skip pre-install backup (save RAM on tiny routers)
  SKIP_DEPS=1         Skip 'opkg install' — use only if you already installed
                      lua / lua-cjson / luci-lib-jsonc manually (e.g. via the
                      firmware's own package manager on custom builds like
                      Fudy / GL.iNet that don't expose the OpenWrt repo).
EOF
        ;;
    *)
        die "Unknown command: $1 (try '$0 help')"
        ;;
esac
