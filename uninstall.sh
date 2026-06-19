#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# uninstall.sh — Remove theamify from system
# Run as: sudo ./uninstall.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

readonly TOOL="theamify"
readonly INSTALL_DIR="/usr/local/share/${TOOL}"
readonly BIN_LINK="/usr/local/bin/${TOOL}"

R="\033[0m"; G="\033[0;32m"; C="\033[0;36m"
Y="\033[0;33m"; E="\033[0;31m"
info()    { echo -e "${C}ℹ  ${*}${R}"; }
success() { echo -e "${G}✓  ${*}${R}"; }
warning() { echo -e "${Y}⚠  ${*}${R}"; }
error()   { echo -e "${E}✗  ${*}${R}" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
    error "Root required."
    echo "Run: sudo ./uninstall.sh"
    exit 1
fi

echo -e "\n${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}"
echo -e "  Removing theamify from system"
echo -e "${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}\n"

warning "The following will be removed:"
info "  • ${BIN_LINK}       (symlink)"
info "  • ${INSTALL_DIR}    (all tool files + theme cache)"
echo
info "  The following will NOT be touched:"
info "  • Any GRUB theme already applied in /boot/grub/themes/"
info "  • Your /etc/default/grub settings"
echo

read -r -p "  Continue? [y/N] " ans
echo
[[ "${ans}" =~ ^[Yy]$ ]] || { echo "  Cancelled."; exit 0; }

[[ -L "${BIN_LINK}" ]]    && rm "${BIN_LINK}"    && success "Removed: ${BIN_LINK}"
[[ -d "${INSTALL_DIR}" ]] && rm -rf "${INSTALL_DIR}" && success "Removed: ${INSTALL_DIR}"

echo
success "theamify uninstalled."
info "Active GRUB theme (if any) remains in place."
info "To fully reset GRUB: remove GRUB_THEME= from /etc/default/grub and run update-grub."
echo