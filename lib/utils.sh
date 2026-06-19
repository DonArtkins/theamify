#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# lib/utils.sh — Utility Functions
# ─────────────────────────────────────────────────────────────────────────────

# ── Root guard ────────────────────────────────────────────────────────────────
require_root() {
    local cmd="${1:-this command}"
    if [[ "${EUID}" -ne 0 ]]; then
        print_error "Root privileges required."
        print_step "Try: sudo ${cmd}"
        exit 1
    fi
}

# ── Confirmation prompt ───────────────────────────────────────────────────────
confirm() {
    local msg="${1:-Are you sure?}"
    [[ "${OPT_YES:-false}" == "true" ]] && return 0
    echo -ne "  ${C_PROMPT}${msg} [y/N]${RESET} "
    read -r ans
    [[ "${ans}" =~ ^[Yy]$ ]]
}

# ── Check required runtime dependencies ──────────────────────────────────────
check_deps_required() {
    local ok=true

    command -v git &>/dev/null || {
        print_error "Missing required dependency: git"
        print_step "Install: sudo apt install git"
        ok=false
    }

    if ! command -v wget &>/dev/null && ! command -v curl &>/dev/null; then
        print_error "Need wget or curl for downloading."
        print_step "Install: sudo apt install wget"
        ok=false
    fi

    [[ "${ok}" == "true" ]] || exit 1
}

# ── Git clone (shallow) ───────────────────────────────────────────────────────
git_clone() {
    local url="${1}" dest="${2}"
    local args=("--depth=1" "--recurse-submodules" "--quiet")

    if [[ "${OPT_VERBOSE:-false}" == "true" ]]; then
        # remove --quiet for verbose
        args=("--depth=1" "--recurse-submodules")
    fi

    if ! git clone "${args[@]}" "${url}" "${dest}" 2>&1; then
        print_error "git clone failed for: ${url}"
        return 1
    fi
}

# ── Convert GitHub URL to a safe filesystem ID ───────────────────────────────
repo_url_to_id() {
    local url="${1}"
    echo "${url}" \
      | sed 's|https://github\.com/||;s|https://gitlab\.com/||' \
      | sed 's|/|__|g' \
      | sed 's|\.git$||' \
      | sed 's|[^a-zA-Z0-9_-]|_|g'
}

# ── Clone or return path to cached repo ──────────────────────────────────────
# Usage: repo_path="$(get_repo <url> [force:true])"
get_repo() {
    local url="${1}"
    local force="${2:-false}"

    local repo_id
    repo_id="$(repo_url_to_id "${url}")"
    local repo_path="${REPO_CACHE_DIR}/${repo_id}"

    mkdir -p "${REPO_CACHE_DIR}"

    if [[ -d "${repo_path}" && "${force}" != "true" ]]; then
        log_verbose "Using cached repo: ${repo_id}"
        echo "${repo_path}"
        return 0
    fi

    [[ -d "${repo_path}" ]] && rm -rf "${repo_path}"

    print_step "Cloning: ${url}"
    spinner_start "Downloading"
    if git_clone "${url}" "${repo_path}"; then
        spinner_stop
        print_success "Repository cloned."
    else
        spinner_stop
        print_error "Clone failed: ${url}"
        return 1
    fi

    echo "${repo_path}"
}

# ── Search for theme.txt within a directory (up to 3 levels deep) ────────────
find_theme_txt() {
    local dir="${1}"
    [[ -f "${dir}/theme.txt" ]] && echo "${dir}/theme.txt" && return 0
    local found
    found="$(find "${dir}" -maxdepth 3 -name "theme.txt" -type f 2>/dev/null | sort | head -1 || true)"
    [[ -n "${found}" ]] && echo "${found}" && return 0
    return 1
}

# ── Open URL in default browser ──────────────────────────────────────────────
open_url() {
    local url="${1}"
    if command -v xdg-open &>/dev/null; then
        xdg-open "${url}" &>/dev/null & disown
    elif command -v sensible-browser &>/dev/null; then
        sensible-browser "${url}" &>/dev/null & disown
    elif command -v firefox &>/dev/null; then
        firefox "${url}" &>/dev/null & disown
    elif command -v chromium-browser &>/dev/null; then
        chromium-browser "${url}" &>/dev/null & disown
    else
        print_warning "No browser found. Open manually: ${url}"
        return 1
    fi
    print_info "Opened in browser."
}

# ── Verbose log (only prints when -v flag is set) ────────────────────────────
log_verbose() {
    [[ "${OPT_VERBOSE:-false}" == "true" ]] && print_dim "  [verbose] ${*}" || true
}

# ── Safe arithmetic increment (compatible with set -e) ───────────────────────
inc() { eval "${1}=$(( ${!1} + 1 ))"; }