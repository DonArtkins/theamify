#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# lib/colors.sh - ANSI Colors, Print Functions & UI Components
# -----------------------------------------------------------------------------
# Color codes are defined with ANSI-C quoting ($'...'), which stores the real
# ESC byte in each variable at assignment time. Earlier versions stored the
# literal text "\033[...]" instead, which only became a real escape sequence
# when passed through a format string that printf itself escape-processes.
# printf does NOT escape-process %s arguments - only %b does - so any color
# variable substituted into a %s slot printed as the literal four characters
# \033 instead of color. Storing the real byte up front removes the failure
# mode entirely: printf, echo -e, and plain echo all emit it correctly.

# shellcheck disable=SC2034  # full palette kept for completeness; not every entry is consumed here
RESET=$'\033[0m';    BOLD=$'\033[1m';  DIM=$'\033[2m'
ITALIC=$'\033[3m';   UNDERLINE=$'\033[4m'

BLACK=$'\033[0;30m'; RED=$'\033[0;31m';     GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m';BLUE=$'\033[0;34m';    MAGENTA=$'\033[0;35m'
CYAN=$'\033[0;36m';  WHITE=$'\033[0;37m'

BOLD_BLACK=$'\033[1;30m';   BOLD_RED=$'\033[1;31m';     BOLD_GREEN=$'\033[1;32m'
BOLD_YELLOW=$'\033[1;33m';  BOLD_BLUE=$'\033[1;34m';    BOLD_MAGENTA=$'\033[1;35m'
BOLD_CYAN=$'\033[1;36m';    BOLD_WHITE=$'\033[1;37m'

BRIGHT_RED=$'\033[0;91m';   BRIGHT_GREEN=$'\033[0;92m'; BRIGHT_YELLOW=$'\033[0;93m'
BRIGHT_BLUE=$'\033[0;94m';  BRIGHT_MAGENTA=$'\033[0;95m';BRIGHT_CYAN=$'\033[0;96m'
BRIGHT_WHITE=$'\033[0;97m'

BG_BLACK=$'\033[40m';  BG_RED=$'\033[41m';  BG_GREEN=$'\033[42m'
BG_YELLOW=$'\033[43m'; BG_BLUE=$'\033[44m'; BG_MAGENTA=$'\033[45m'
BG_CYAN=$'\033[46m';   BG_WHITE=$'\033[47m'

# -- Semantic aliases ----------------------------------------------------------
C_TITLE="${BOLD_CYAN}"
C_SUBTITLE="${BOLD_MAGENTA}"
C_SECTION="${BOLD_YELLOW}"
C_SUCCESS="${BOLD_GREEN}"
C_ERROR="${BOLD_RED}"
C_WARNING="${YELLOW}"
C_INFO="${CYAN}"
C_DIM="${DIM}${WHITE}"
C_HIGHLIGHT="${BOLD_WHITE}"
C_PROMPT="${BOLD_BLUE}"
C_ACTIVE="${BOLD_GREEN}"
C_INACTIVE="${DIM}${WHITE}"
C_STEP="${BRIGHT_CYAN}"
C_CMD="${DIM}${GREEN}"
C_LINK="${UNDERLINE}${BRIGHT_BLUE}"
C_TAG="${BRIGHT_MAGENTA}"
C_NUM="${BOLD_YELLOW}"
C_BORDER="${BOLD_BLUE}"

# -- Strip colors when NO_COLOR is set or stdout is not a terminal -------------
if [[ -n "${NO_COLOR:-}" ]] || [[ ! -t 1 ]]; then
    RESET="" BOLD="" DIM="" ITALIC="" UNDERLINE=""
    BLACK="" RED="" GREEN="" YELLOW="" BLUE="" MAGENTA="" CYAN="" WHITE=""
    BOLD_BLACK="" BOLD_RED="" BOLD_GREEN="" BOLD_YELLOW="" BOLD_BLUE=""
    BOLD_MAGENTA="" BOLD_CYAN="" BOLD_WHITE=""
    BRIGHT_RED="" BRIGHT_GREEN="" BRIGHT_YELLOW="" BRIGHT_BLUE=""
    BRIGHT_MAGENTA="" BRIGHT_CYAN="" BRIGHT_WHITE=""
    BG_BLACK="" BG_RED="" BG_GREEN="" BG_YELLOW="" BG_BLUE=""
    BG_MAGENTA="" BG_CYAN="" BG_WHITE=""
    C_TITLE="" C_SUBTITLE="" C_SECTION="" C_SUCCESS="" C_ERROR=""
    C_WARNING="" C_INFO="" C_DIM="" C_HIGHLIGHT="" C_PROMPT=""
    C_ACTIVE="" C_INACTIVE="" C_STEP="" C_CMD="" C_LINK=""
    C_TAG="" C_NUM="" C_BORDER=""
fi

# -- Print helpers -------------------------------------------------------------
# Plain bracket tags instead of glyph icons - identical output across every
# locale, font, and non-UTF-8 terminal, no fallback "tofu" boxes possible.
print_title()   { echo -e "${C_TITLE}${*}${RESET}"; }
print_section() { echo -e "\n${C_SECTION}== ${*}${RESET}"; }
print_success() { echo -e "${C_SUCCESS}[OK]${RESET} ${*}"; }
print_error()   { echo -e "${C_ERROR}[ERR]${RESET} ${*}" >&2; }
print_warning() { echo -e "${C_WARNING}[WARN]${RESET} ${*}"; }
print_info()    { echo -e "${C_INFO}[INFO]${RESET} ${*}"; }
print_step()    { echo -e "${C_STEP}->${RESET} ${*}"; }
print_dim()     { echo -e "${C_DIM}${*}${RESET}"; }
print_cmd()     { echo -e "${C_CMD}  \$ ${*}${RESET}"; }
print_link()    { echo -e "${C_LINK}${*}${RESET}"; }
print_bold()    { echo -e "${BOLD_WHITE}${*}${RESET}"; }

# -- UI components -------------------------------------------------------------
_term_width() {
    local w; w="$(tput cols 2>/dev/null || echo 80)"
    (( w > 100 )) && w=100
    echo "${w}"
}

# ASCII rule. Default char is '-' so it always renders, regardless of locale
# or font - box-drawing characters (- = =) fall back to "tofu" glyphs on
# terminals/fonts without full Unicode coverage.
print_rule() {
    local char="${1:--}"
    local w; w="$(_term_width)"
    printf '%s' "${C_BORDER}"
    printf '%*s' "${w}" '' | tr ' ' "${char}"
    printf '%s\n' "${RESET}"
}

print_box_title() {
    local title="${1}"
    local w; w="$(_term_width)"
    local inner=$(( w - 4 ))
    local tlen="${#title}"
    local lpad=$(( (inner - tlen) / 2 ))
    (( lpad < 0 )) && lpad=0
    local rpad=$(( inner - tlen - lpad ))
    (( rpad < 0 )) && rpad=0

    print_rule "-"
    printf '%s|%s %s%*s%s%*s %s|%s\n' \
        "${C_BORDER}" "${RESET}" "${C_TITLE}" \
        "${lpad}" "" "${title}" "${rpad}" "" "${C_BORDER}" "${RESET}"
    print_rule "-"
}

print_kv() {
    local key="${1}" val="${2}"
    printf "  ${BOLD_WHITE}%-20s${RESET} %b\n" "${key}:" "${val}"
}

print_status() {
    case "${1:-}" in
        active)   printf '%s[ACTIVE]%s'  "${C_ACTIVE}" "${RESET}" ;;
        cached)   printf '%s[CACHED]%s'  "${C_INFO}"   "${RESET}" ;;
        remote)   printf '%s[REMOTE]%s'  "${C_DIM}"    "${RESET}" ;;
        error)    printf '%s[ERROR]%s'   "${C_ERROR}"  "${RESET}" ;;
        *)        printf '%s[UNKNOWN]%s' "${C_DIM}"    "${RESET}" ;;
    esac
}

# Compact, non-decorative header - no block-letter logo. A large multi-line
# ASCII-art wordmark is the kind of padding the project's style guide bans
# under "no decorative ASCII art"; this still reads as a clear product banner.
print_banner() {
    print_rule "="
    echo -e "  ${C_TITLE}${BOLD}theamify${RESET} ${C_DIM}v${VERSION:-1.0.0}${RESET} ${C_DIM}- GRUB Theme Manager${RESET}"
    echo -e "  ${C_DIM}by Don Artkins${RESET}"
    print_rule "="
    echo
}

# -- Spinner -------------------------------------------------------------------
# Classic 4-frame ASCII spinner - renders identically everywhere; the braille
# block glyphs it replaces require a Unicode-complete monospace font.
# shellcheck disable=SC1003
SPINNER_FRAMES=('|' '/' '-' '\')
SPINNER_PID=""

spinner_start() {
    local msg="${1:-Working}"
    (
        local i=0
        while true; do
            printf '\r  %s%s%s %s...' "${C_STEP}" "${SPINNER_FRAMES[$((i % 4))]}" "${RESET}" "${msg}"
            sleep 0.1
            i=$(( i + 1 ))
        done
    ) &
    SPINNER_PID=$!
    disown "${SPINNER_PID}" 2>/dev/null || true
}

spinner_stop() {
    if [[ -n "${SPINNER_PID:-}" ]]; then
        kill "${SPINNER_PID}" 2>/dev/null || true
        SPINNER_PID=""
        printf '\r\033[K'
    fi
}
