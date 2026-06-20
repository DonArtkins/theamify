#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# lib/utils.sh - Utility Functions (ORIGINAL / BUGGY, for reproduction)
# -----------------------------------------------------------------------------

require_root() {
    local cmd="${1:-this command}"
    if [[ "${EUID}" -ne 0 ]]; then
        print_error "Root privileges required."
        print_step "Try: sudo ${cmd}"
        exit 1
    fi
}

confirm() {
    local msg="${1:-Are you sure?}"
    [[ "${OPT_YES:-false}" == "true" ]] && return 0
    echo -ne "  ${C_PROMPT}${msg} [y/N]${RESET} "
    read -r ans
    [[ "${ans}" =~ ^[Yy]$ ]]
}

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

git_clone() {
    local url="${1}" dest="${2}"
    local args=("--depth=1" "--recurse-submodules" "--quiet")
    if [[ "${OPT_VERBOSE:-false}" == "true" ]]; then
        args=("--depth=1" "--recurse-submodules")
    fi
    # GIT_TERMINAL_PROMPT=0: if the repo is missing/private/renamed, git
    # normally falls back to an interactive username/password prompt over
    # HTTPS instead of failing - which hangs a non-interactive batch run
    # (theamify get --all) forever waiting on stdin. With this set, git
    # fails fast instead.
    # >&2 (not 2>&1): git_clone() is called from inside get_repo(), whose
    # own stdout is captured via $(...) to obtain the repo path. Anything
    # git writes to fd1 here would silently become part of that captured
    # string, so we always send it to the terminal directly instead.
    if ! GIT_TERMINAL_PROMPT=0 git clone "${args[@]}" "${url}" "${dest}" >&2; then
        print_error "git clone failed for: ${url}"
        return 1
    fi
}

repo_url_to_id() {
    local url="${1}"
    echo "${url}" \
      | sed 's|https://github\.com/||;s|https://gitlab\.com/||' \
      | sed 's|/|__|g' \
      | sed 's|\.git$||' \
      | sed 's|[^a-zA-Z0-9_-]|_|g'
}

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

    # This function's stdout is captured by callers via $(...) to get
    # repo_path back - only the final `echo "${repo_path}"` below may ever
    # touch fd1. Every status message in between is sent to stderr (>&2)
    # explicitly so it prints to the terminal instead of getting silently
    # appended to the returned path.
    print_step "Cloning: ${url}" >&2
    spinner_start "Downloading"
    if git_clone "${url}" "${repo_path}"; then
        spinner_stop
        print_success "Repository cloned." >&2
    else
        spinner_stop
        print_error "Clone failed: ${url}"
        return 1
    fi

    echo "${repo_path}"
}

find_theme_txt() {
    local dir="${1}"
    [[ -f "${dir}/theme.txt" ]] && echo "${dir}/theme.txt" && return 0
    local found
    found="$(find "${dir}" -maxdepth 3 -name "theme.txt" -type f 2>/dev/null | sort | head -1 || true)"
    [[ -n "${found}" ]] && echo "${found}" && return 0
    return 1
}

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

log_verbose() {
    [[ "${OPT_VERBOSE:-false}" == "true" ]] && print_dim "  [verbose] ${*}" >&2 || true
}

inc() { eval "${1}=$(( ${!1} + 1 ))"; }
