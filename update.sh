#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# update.sh — Self-update theamify tool files from git
# Run from the cloned repo dir as: sudo ./update.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

readonly TOOL="theamify"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

R="\033[0m"; G="\033[0;32m"; C="\033[0;36m"; E="\033[0;31m"; B="\033[1;34m"
info()    { echo -e "${C}ℹ  ${*}${R}"; }
success() { echo -e "${G}✓  ${*}${R}"; }
error()   { echo -e "${E}✗  ${*}${R}" >&2; }
step()    { echo -e "${B}→  ${*}${R}"; }

echo -e "\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}"
echo -e "  Self-updating theamify"
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}\n"

if [[ "${EUID}" -ne 0 ]]; then
    error "Root required."
    echo "Run: sudo ./update.sh"
    exit 1
fi

if [[ ! -d "${SRC_DIR}/.git" ]]; then
    error "No .git directory found in: ${SRC_DIR}"
    info  "Update manually: git pull then sudo ./install.sh"
    exit 1
fi

step "Pulling latest changes from git..."
cd "${SRC_DIR}"
git pull --rebase
success "Git pull complete."

step "Re-running installer..."
bash "${SRC_DIR}/install.sh"
success "theamify updated to: $(${TOOL} version 2>/dev/null || echo 'unknown')"
echo