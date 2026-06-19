#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# lib/grub.sh — GRUB Detection & Management
# ─────────────────────────────────────────────────────────────────────────────

# ── Detect GRUB themes directory ─────────────────────────────────────────────
grub_detect_dir() {
    local candidates=(
        "/boot/grub/themes"
        "/boot/grub2/themes"
        "/usr/share/grub/themes"
    )
    for d in "${candidates[@]}"; do
        [[ -d "${d}" ]] && echo "${d}" && return 0
    done
    echo "/boot/grub/themes"   # default fallback — will be created on apply
}

# ── Detect GRUB update command ────────────────────────────────────────────────
grub_detect_update_cmd() {
    if command -v update-grub &>/dev/null; then
        echo "update-grub"
    elif command -v grub-mkconfig &>/dev/null; then
        echo "grub-mkconfig -o /boot/grub/grub.cfg"
    elif command -v grub2-mkconfig &>/dev/null; then
        if command -v zypper &>/dev/null; then
            echo "grub2-mkconfig -o /boot/grub2/grub.cfg"
        elif command -v dnf &>/dev/null; then
            echo "grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg"
        else
            echo "grub2-mkconfig -o /boot/grub2/grub.cfg"
        fi
    else
        return 1
    fi
}

# ── Get name of currently active GRUB theme ──────────────────────────────────
grub_get_active_theme() {
    local cfg="${GRUB_CFG:-/etc/default/grub}"
    [[ ! -f "${cfg}" ]] && echo "" && return 0

    local line
    line="$(grep '^GRUB_THEME=' "${cfg}" 2>/dev/null | tail -1 || true)"
    [[ -z "${line}" ]] && echo "" && return 0

    local path
    path="$(echo "${line}" | cut -d= -f2- | tr -d '"' | tr -d "'")"
    # The theme folder is the parent dir of theme.txt
    dirname "${path}" 2>/dev/null | xargs basename 2>/dev/null || echo ""
}

# ── Backup GRUB config ────────────────────────────────────────────────────────
grub_backup() {
    local cfg="${GRUB_CFG:-/etc/default/grub}"
    local bak="${cfg}.bak.$(date +%Y%m%d_%H%M%S)"
    cp -a "${cfg}" "${bak}"
    print_dim "  Backed up: ${bak}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Apply theme to GRUB  (4-stage process)
# ══════════════════════════════════════════════════════════════════════════════
grub_apply_theme() {
    local theme_name="${1}"
    local cached="${THEMES_CACHE_DIR}/${theme_name}"
    local grub_dir
    grub_dir="$(grub_detect_dir)"
    local cfg="${GRUB_CFG:-/etc/default/grub}"

    echo
    print_box_title " 🚀  Applying Theme: ${theme_name} "

    # ── Stage 1 : Verify cached theme ─────────────────────────────────────────
    print_section "Stage 1 of 4 — Verify"

    if [[ ! -d "${cached}" ]]; then
        print_error "Theme '${theme_name}' is not cached."
        print_step "Run: theamify get ${theme_name}"
        exit 1
    fi

    local theme_txt
    theme_txt="$(find_theme_txt "${cached}")" || {
        print_error "No theme.txt found in cache for '${theme_name}'."
        print_warning "This theme may require its own install script."
        print_step "Check the repo: theamify open ${theme_name}"
        exit 1
    }
    print_success "theme.txt found: ${theme_txt}"

    # ── Stage 2 : Install theme files ─────────────────────────────────────────
    print_section "Stage 2 of 4 — Install Files"

    local dest="${grub_dir}/${theme_name}"
    mkdir -p "${grub_dir}"
    [[ -d "${dest}" ]] && rm -rf "${dest}"

    print_step "Copying to: ${dest}"
    cp -r "${cached}" "${dest}"

    local dest_txt
    dest_txt="$(find_theme_txt "${dest}")" || {
        print_error "theme.txt not found after copying. Something went wrong."
        exit 1
    }
    print_success "Theme files installed."

    # ── Stage 3 : Configure /etc/default/grub ────────────────────────────────
    print_section "Stage 3 of 4 — Configure GRUB"

    grub_backup

    # Remove any old conflicting options
    sed -i '/^GRUB_THEME=/d'          "${cfg}"
    sed -i '/^GRUB_TERMINAL_OUTPUT=/d' "${cfg}"
    sed -i '/^GRUB_TIMEOUT_STYLE=/d'  "${cfg}"
    sed -i '/^GRUB_GFXMODE=/d'        "${cfg}"

    # Set timeout style to show menu
    echo 'GRUB_TIMEOUT_STYLE="menu"'   >> "${cfg}"
    echo 'GRUB_GFXMODE="auto"'         >> "${cfg}"
    # Set timeout if not already defined
    grep -q '^GRUB_TIMEOUT=' "${cfg}" || echo 'GRUB_TIMEOUT="30"' >> "${cfg}"
    # Point GRUB at theme
    echo "GRUB_THEME=\"${dest_txt}\""  >> "${cfg}"

    print_success "GRUB config updated."
    print_kv "GRUB_THEME" "${dest_txt}"

    # ── Stage 4 : Rebuild GRUB config ────────────────────────────────────────
    print_section "Stage 4 of 4 — Rebuild GRUB"

    local update_cmd
    update_cmd="$(grub_detect_update_cmd)" || {
        print_error "No GRUB update command found."
        print_step "Run manually: update-grub  OR  grub-mkconfig -o /boot/grub/grub.cfg"
        exit 1
    }

    print_step "Running: ${update_cmd}"
    if eval "${update_cmd}"; then
        print_success "GRUB rebuilt successfully."
    else
        print_error "GRUB rebuild failed. Check your GRUB setup."
        exit 1
    fi

    # ── Done ──────────────────────────────────────────────────────────────────
    echo
    print_rule "═"
    echo -e "\n  ${C_SUCCESS}${BOLD}🎨  Theme '${theme_name}' is now active!${RESET}"
    echo
    print_step "Next steps:"
    echo -e "  ${C_DIM}1.${RESET}  Reboot → ${C_CMD}sudo reboot${RESET}"
    echo -e "  ${C_DIM}2.${RESET}  Switch  → ${C_CMD}sudo theamify use <name>${RESET}"
    echo -e "  ${C_DIM}3.${RESET}  Browse  → ${C_CMD}theamify list${RESET}"
    echo
}

# ── Remove theme from GRUB (does NOT remove cache) ───────────────────────────
grub_remove_theme() {
    local theme_name="${1}"
    local grub_dir
    grub_dir="$(grub_detect_dir)"
    local dest="${grub_dir}/${theme_name}"
    local cfg="${GRUB_CFG:-/etc/default/grub}"

    [[ -d "${dest}" ]] && rm -rf "${dest}" && \
        print_success "Removed GRUB theme dir: ${dest}"

    if grep -q "${theme_name}" "${cfg}" 2>/dev/null; then
        sed -i "/GRUB_THEME=.*${theme_name}.*/d" "${cfg}"
        print_success "Removed theme from GRUB config."
        local update_cmd
        update_cmd="$(grub_detect_update_cmd)" && eval "${update_cmd}" || \
            print_warning "GRUB rebuild had issues. Run update-grub manually."
    fi
}