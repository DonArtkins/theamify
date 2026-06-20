#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# install.sh - Install theamify system-wide
# Run as: sudo ./install.sh [--sync-conf]
# -----------------------------------------------------------------------------

set -euo pipefail

readonly TOOL="theamify"
readonly INSTALL_DIR="/usr/local/share/${TOOL}"
readonly BIN_LINK="/usr/local/bin/${TOOL}"
readonly SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# -- Flags ----------------------------------------------------------------
# --sync-conf / -c : also overwrite the installed config/themes.conf with
# the one in this checkout. Off by default so a normal user's registry
# edits (theamify add/del) are never clobbered by a reinstall - but during
# active development this is usually exactly what you want, since
# themes.conf changes (like removing a broken entry) otherwise silently
# never reach the system install.
SYNC_CONF=false
for arg in "$@"; do
    case "${arg}" in
        --sync-conf|-c) SYNC_CONF=true ;;
    esac
done

# Inline colors (libs not loaded yet). ANSI-C quoting ($'...') stores the
# real ESC byte at assignment time so every print path below works
# regardless of how the variable is later interpolated.
R=$'\033[0m'; G=$'\033[0;32m'; C=$'\033[0;36m'
Y=$'\033[0;33m'; B=$'\033[1;34m'; E=$'\033[0;31m'
info()    { echo -e "${C}[INFO]${R} ${*}"; }
success() { echo -e "${G}[OK]${R} ${*}"; }
warning() { echo -e "${Y}[WARN]${R} ${*}"; }
error()   { echo -e "${E}[ERR]${R} ${*}" >&2; }
step()    { echo -e "${B}->${R} ${*}"; }
rule()    { printf "${B}%80s${R}\n" '' | tr ' ' '-'; }

echo -e "\n${B}"
rule
echo -e "  Installing theamify - GRUB Theme Manager by Don Artkins${R}"
rule
echo

# -- Root check ----------------------------------------------------------------
if [[ "${EUID}" -ne 0 ]]; then
    error "Root privileges required."
    step  "Run: sudo ./install.sh"
    exit 1
fi

# -- Validate source directory -------------------------------------------------
for required_file in "${TOOL}" lib/colors.sh lib/utils.sh lib/grub.sh lib/themes.sh config/themes.conf; do
    if [[ ! -f "${SRC_DIR}/${required_file}" ]]; then
        error "Missing required file: ${required_file}"
        error "Run install.sh from the theamify project root."
        exit 1
    fi
done

# -- Dependency check ---------------------------------------------------------
step "Checking dependencies..."
for dep in git bash; do
    if command -v "${dep}" &>/dev/null; then
        info "  ${dep}: $(command -v "${dep}")"
    else
        error "Missing required dependency: ${dep}"
        exit 1
    fi
done
if ! command -v wget &>/dev/null && ! command -v curl &>/dev/null; then
    warning "Neither wget nor curl found - needed for theme downloads."
    warning "Install with: sudo apt install wget"
fi
if ! command -v chafa &>/dev/null; then
    info "  chafa: not found (optional - enables image preview in terminal)"
    info "  Install: sudo apt install chafa"
fi

# -- Create directory structure ------------------------------------------------
step "Creating directories..."
mkdir -p "${INSTALL_DIR}"/{lib,config,themes,.repo_cache}
success "Directory: ${INSTALL_DIR}"

# -- Copy files ----------------------------------------------------------------
step "Copying tool files..."
cp "${SRC_DIR}/${TOOL}" "${INSTALL_DIR}/${TOOL}"
cp "${SRC_DIR}/lib/colors.sh"  "${INSTALL_DIR}/lib/"
cp "${SRC_DIR}/lib/utils.sh"   "${INSTALL_DIR}/lib/"
cp "${SRC_DIR}/lib/grub.sh"    "${INSTALL_DIR}/lib/"
cp "${SRC_DIR}/lib/themes.sh"  "${INSTALL_DIR}/lib/"

# Only copy themes.conf if not already present (preserve user edits),
# unless --sync-conf was passed to force it.
if [[ ! -f "${INSTALL_DIR}/config/themes.conf" ]]; then
    cp "${SRC_DIR}/config/themes.conf" "${INSTALL_DIR}/config/themes.conf"
    success "Installed fresh themes.conf"
elif [[ "${SYNC_CONF}" == "true" ]]; then
    cp "${SRC_DIR}/config/themes.conf" "${INSTALL_DIR}/config/themes.conf"
    success "themes.conf overwritten (--sync-conf)."
else
    warning "Existing themes.conf preserved (user data protected)."
    warning "To sync registry changes from this checkout: sudo ./install.sh --sync-conf"
    warning "To reset manually: cp ${SRC_DIR}/config/themes.conf ${INSTALL_DIR}/config/themes.conf"
fi

success "Files copied."

# -- Set permissions -----------------------------------------------------------
step "Setting permissions..."
chmod 755  "${INSTALL_DIR}/${TOOL}"
chmod 644  "${INSTALL_DIR}/lib/"*.sh
# themes/ and .repo_cache/ are world-writable so non-root users can download
chmod 777  "${INSTALL_DIR}/themes"
chmod 777  "${INSTALL_DIR}/.repo_cache"
# themes.conf world-writable so non-root users can add themes
chmod 666  "${INSTALL_DIR}/config/themes.conf"
success "Permissions set."

# -- Create symlink ------------------------------------------------------------
step "Creating symlink: ${BIN_LINK}"
[[ -L "${BIN_LINK}" ]] && rm "${BIN_LINK}"
ln -sf "${INSTALL_DIR}/${TOOL}" "${BIN_LINK}"
success "Symlink created."

# -- Final verification --------------------------------------------------------
step "Verifying installation..."
if command -v "${TOOL}" &>/dev/null; then
    echo
    echo -e "${G}"
    rule
    echo -e "  [OK] theamify installed successfully!${R}"
    rule
    echo
    info "  Version : $(${TOOL} version)"
    info "  Binary  : ${BIN_LINK}"
    info "  Install : ${INSTALL_DIR}"
    echo
    echo -e "${C}  Quick Start:${R}"
    echo -e "    ${G}theamify${R}                   # Interactive menu"
    echo -e "    ${G}theamify list${R}              # List all themes"
    echo -e "    ${G}theamify get <name>${R}        # Download a theme (no sudo)"
    echo -e "    ${G}theamify info <name>${R}       # Show theme details"
    echo -e "    ${G}sudo theamify use <name>${R}   # Apply theme to GRUB"
    echo -e "    ${G}theamify open <name>${R}       # Open source in browser"
    echo
    echo -e "${B}  Note:${R} Only ${G}use${R} requires sudo. All other commands run as normal user."
    echo
else
    error "Verification failed. Check ${BIN_LINK}"
    exit 1
fi
