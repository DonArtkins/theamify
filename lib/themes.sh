#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# lib/themes.sh — Theme Registry CRUD & Download Logic
# ─────────────────────────────────────────────────────────────────────────────

# ── Parse registry, yield data lines (skip blanks + comments) ────────────────
parse_conf() {
    grep -v '^[[:space:]]*$' "${THEMES_CONF}" 2>/dev/null \
        | grep -v '^#' \
        || true
}

# ── Return the registry line for a given name ─────────────────────────────────
theme_get_entry() {
    local name="${1}"
    local line
    line="$(parse_conf | grep "^${name}|" | head -1 || true)"
    [[ -z "${line}" ]] && return 1
    echo "${line}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Download / cache a theme
#  Usage: theme_download <name> [--force]
# ══════════════════════════════════════════════════════════════════════════════
theme_download() {
    local name="${1}"
    local force="${2:-}"

    local line
    line="$(theme_get_entry "${name}")" || {
        print_error "Theme '${name}' not found in registry."
        print_info  "Run 'theamify list' to see all themes."
        return 1
    }

    IFS='|' read -r t_name t_url t_sub t_desc t_source t_tags <<< "${line}"
    local dest="${THEMES_CACHE_DIR}/${t_name}"

    # ── Already cached? ───────────────────────────────────────────────────────
    if [[ -d "${dest}" && "${force}" != "--force" ]]; then
        print_info "Theme '${t_name}' is already cached."
        print_step "Re-download with: theamify update ${t_name}"
        return 0
    fi

    print_section "Downloading: ${t_name}"
    echo -e "  ${C_DIM}${t_desc}${RESET}"
    echo -e "  ${C_LINK}${t_url}${RESET}"
    echo

    check_deps_required

    # ── Step 1: Clone or reuse repo ───────────────────────────────────────────
    print_step "[1/4] Fetching repository..."
    local force_clone="false"
    [[ "${force}" == "--force" ]] && force_clone="true"

    local repo_path
    repo_path="$(get_repo "${t_url}" "${force_clone}")" || return 1
    print_success "Repository ready."

    # ── Step 2: Locate theme subdir ───────────────────────────────────────────
    print_step "[2/4] Locating theme files..."

    local src_path
    if [[ "${t_sub}" == "." ]]; then
        src_path="${repo_path}"
    else
        src_path="${repo_path}/${t_sub}"
        if [[ ! -d "${src_path}" ]]; then
            # Case-insensitive fallback search
            local found_dir
            found_dir="$(find "${repo_path}" -maxdepth 4 -type d \
                         -iname "$(basename "${t_sub}")" 2>/dev/null | head -1 || true)"
            if [[ -n "${found_dir}" ]]; then
                print_warning "Subdir '${t_sub}' not found exactly; using: ${found_dir}"
                src_path="${found_dir}"
            else
                print_error "Theme subdir '${t_sub}' not found in repo."
                echo
                print_dim "  Repo contents:"
                ls "${repo_path}" 2>/dev/null | head -20 | while read -r f; do
                    print_dim "    ${f}"
                done
                return 1
            fi
        fi
    fi
    print_success "Source path: ${src_path}"

    # ── Step 3: Copy to theme cache ───────────────────────────────────────────
    print_step "[3/4] Caching theme..."
    [[ -d "${dest}" ]] && rm -rf "${dest}"
    mkdir -p "${dest}"
    cp -r "${src_path}/." "${dest}/"

    # Strip git artifacts
    rm -rf "${dest}/.git" "${dest}/.github" 2>/dev/null || true

    # Save a preview image reference (first PNG/JPG found)
    local preview_img
    preview_img="$(find "${dest}" -maxdepth 3 \
                   \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) \
                   -not -path "*/.git/*" 2>/dev/null | sort | head -1 || true)"
    if [[ -n "${preview_img}" ]]; then
        mkdir -p "${dest}/.preview"
        cp "${preview_img}" "${dest}/.preview/" 2>/dev/null || true
    fi

    print_success "Cached: ${dest}"

    # ── Step 4: Validate theme.txt ────────────────────────────────────────────
    print_step "[4/4] Validating..."
    local theme_txt
    theme_txt="$(find_theme_txt "${dest}")" || {
        print_warning "No theme.txt found in '${t_name}'."
        print_dim "  This may be a multi-variant repo (e.g., Elegant series)."
        print_dim "  Check the repo README for instructions:"
        print_dim "  ${t_url}"
        print_dim "  Cache is saved at: ${dest}"
        echo
        return 0
    }

    print_success "Valid theme — theme.txt: ${theme_txt}"
    echo
    echo -e "  ${C_DIM}Apply with:${RESET}  ${C_CMD}sudo theamify use ${t_name}${RESET}"
    echo -e "  ${C_DIM}Preview at:${RESET}  ${C_CMD}theamify info ${t_name}${RESET}"
    echo
}

# ── Remove theme from local cache (registry entry kept) ───────────────────────
theme_remove_cache() {
    local name="${1}"

    theme_get_entry "${name}" &>/dev/null || {
        print_error "Theme '${name}' not found in registry."
        return 1
    }

    local dest="${THEMES_CACHE_DIR}/${name}"
    if [[ ! -d "${dest}" ]]; then
        print_info "Theme '${name}' is not currently cached."
        return 0
    fi

    local active
    active="$(grub_get_active_theme)"
    if [[ "${name}" == "${active}" ]]; then
        print_warning "Theme '${name}' is currently active in GRUB."
        confirm "Remove cache anyway?" || { print_info "Cancelled."; return 0; }
    else
        confirm "Remove local cache for '${name}'?" || { print_info "Cancelled."; return 0; }
    fi

    rm -rf "${dest}"
    print_success "Cache removed for '${name}'."
    print_dim "  Registry entry kept. Re-download: theamify get ${name}"
}

# ── Add a new theme to registry (interactive wizard) ─────────────────────────
theme_add_to_registry() {
    local url="${1}"

    print_section "Add New Theme"
    echo -e "  ${C_DIM}URL: ${url}${RESET}"

    # Validate URL
    if ! echo "${url}" | grep -qE '^https?://(github|gitlab)\.com/'; then
        print_error "URL must be a GitHub or GitLab repository URL."
        return 1
    fi

    local default_name
    default_name="$(basename "${url%.git}")"

    echo
    echo -ne "  ${C_PROMPT}Theme name${RESET} ${C_DIM}[${default_name}]${RESET}: "
    read -r name
    name="${name:-${default_name}}"

    # Duplicate check
    if parse_conf | grep -q "^${name}|"; then
        print_error "A theme named '${name}' already exists."
        return 1
    fi

    echo -ne "  ${C_PROMPT}Subdir within repo${RESET} ${C_DIM}[.]${RESET}: "
    read -r subdir
    subdir="${subdir:-.}"

    echo -ne "  ${C_PROMPT}Description${RESET}: "
    read -r desc
    desc="${desc:-Custom GRUB theme}"

    echo -ne "  ${C_PROMPT}Source page URL${RESET} ${C_DIM}[${url}]${RESET}: "
    read -r source
    source="${source:-${url}}"

    echo -ne "  ${C_PROMPT}Tags${RESET} ${C_DIM}(comma-separated)${RESET}: "
    read -r tags
    tags="${tags:-custom}"

    local entry="${name}|${url}|${subdir}|${desc}|${source}|${tags}"

    echo
    print_section "Preview Entry"
    echo -e "  ${C_DIM}${entry}${RESET}"
    echo

    if confirm "Add '${name}' to registry?"; then
        echo "${entry}" >> "${THEMES_CONF}"
        print_success "Theme '${name}' added to registry!"
        echo -e "  ${C_DIM}Download:${RESET} ${C_CMD}theamify get ${name}${RESET}"
        echo -e "  ${C_DIM}Apply:${RESET}    ${C_CMD}sudo theamify use ${name}${RESET}"
    else
        print_info "Cancelled."
    fi
    echo
}

# ── Delete theme from registry (and its cache) ───────────────────────────────
theme_delete_from_registry() {
    local name="${1}"

    local line
    line="$(theme_get_entry "${name}")" || {
        print_error "Theme '${name}' not found in registry."
        return 1
    }

    local active
    active="$(grub_get_active_theme)"
    if [[ "${name}" == "${active}" ]]; then
        print_error "Cannot delete the currently active GRUB theme '${name}'."
        print_step "Switch to another theme first: sudo theamify use <other>"
        return 1
    fi

    echo -e "  ${C_WARNING}Entry to delete:${RESET}"
    echo -e "  ${C_DIM}${line}${RESET}"
    echo

    confirm "Permanently delete '${name}' from registry?" || {
        print_info "Cancelled."
        return 0
    }

    # Remove cache if present
    local dest="${THEMES_CACHE_DIR}/${name}"
    [[ -d "${dest}" ]] && rm -rf "${dest}" && print_dim "  Cache removed: ${dest}"

    # Remove from conf file
    local tmp
    tmp="$(mktemp)"
    grep -v "^${name}|" "${THEMES_CONF}" > "${tmp}"
    mv "${tmp}" "${THEMES_CONF}"

    print_success "Theme '${name}' deleted from registry."
    echo
}