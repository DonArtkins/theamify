#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# lib/colors.sh — ANSI Colors, Print Functions & UI Components
# ─────────────────────────────────────────────────────────────────────────────

# ── Raw ANSI ──────────────────────────────────────────────────────────────────
RESET="\033[0m";    BOLD="\033[1m";  DIM="\033[2m"
ITALIC="\033[3m";   UNDERLINE="\033[4m"

BLACK="\033[0;30m"; RED="\033[0;31m";     GREEN="\033[0;32m"
YELLOW="\033[0;33m";BLUE="\033[0;34m";    MAGENTA="\033[0;35m"
CYAN="\033[0;36m";  WHITE="\033[0;37m"

BOLD_BLACK="\033[1;30m";   BOLD_RED="\033[1;31m";     BOLD_GREEN="\033[1;32m"
BOLD_YELLOW="\033[1;33m";  BOLD_BLUE="\033[1;34m";    BOLD_MAGENTA="\033[1;35m"
BOLD_CYAN="\033[1;36m";    BOLD_WHITE="\033[1;37m"

BRIGHT_RED="\033[0;91m";   BRIGHT_GREEN="\033[0;92m"; BRIGHT_YELLOW="\033[0;93m"
BRIGHT_BLUE="\033[0;94m";  BRIGHT_MAGENTA="\033[0;95m";BRIGHT_CYAN="\033[0;96m"
BRIGHT_WHITE="\033[0;97m"

BG_BLACK="\033[40m";  BG_RED="\033[41m";  BG_GREEN="\033[42m"
BG_YELLOW="\033[43m"; BG_BLUE="\033[44m"; BG_MAGENTA="\033[45m"
BG_CYAN="\033[46m";   BG_WHITE="\033[47m"

# ── Semantic aliases ──────────────────────────────────────────────────────────
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

# ── Strip colors when NO_COLOR is set or stdout is not a terminal ─────────────
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

# ── Print helpers ─────────────────────────────────────────────────────────────
print_title()   { echo -e "${C_TITLE}${*}${RESET}"; }
print_section() { echo -e "\n${C_SECTION}▶ ${*}${RESET}"; }
print_success() { echo -e "${C_SUCCESS}✓ ${*}${RESET}"; }
print_error()   { echo -e "${C_ERROR}✗ ${*}${RESET}" >&2; }
print_warning() { echo -e "${C_WARNING}⚠ ${*}${RESET}"; }
print_info()    { echo -e "${C_INFO}ℹ ${*}${RESET}"; }
print_step()    { echo -e "${C_STEP}→ ${*}${RESET}"; }
print_dim()     { echo -e "${C_DIM}${*}${RESET}"; }
print_cmd()     { echo -e "${C_CMD}  \$ ${*}${RESET}"; }
print_link()    { echo -e "${C_LINK}${*}${RESET}"; }
print_bold()    { echo -e "${BOLD_WHITE}${*}${RESET}"; }

# ── UI components ─────────────────────────────────────────────────────────────
_term_width() { tput cols 2>/dev/null || echo 80; }

print_rule() {
    local char="${1:-─}"
    local w; w="$(_term_width)"
    printf "${C_BORDER}"
    printf "%${w}s" | tr ' ' "${char}"
    printf "${RESET}\n"
}

print_box_title() {
    local title="${1}"
    local w; w="$(_term_width)"
    local inner=$(( w - 4 ))
    local tlen="${#title}"
    local lpad=$(( (inner - tlen) / 2 ))
    local rpad=$(( inner - tlen - lpad ))
    print_rule "─"
    printf "${C_BORDER}│${RESET} ${C_TITLE}%*s%s%*s${RESET} ${C_BORDER}│${RESET}\n" \
        "${lpad}" "" "${title}" "${rpad}" ""
    print_rule "─"
}

print_kv() {
    local key="${1}" val="${2}"
    printf "  ${BOLD_WHITE}%-20s${RESET} %b\n" "${key}:" "${val}"
}

print_status() {
    case "${1:-}" in
        active)   printf "${C_ACTIVE}● ACTIVE${RESET}" ;;
        cached)   printf "${C_INFO}● CACHED${RESET}" ;;
        remote)   printf "${C_DIM}○ REMOTE${RESET}" ;;
        error)    printf "${C_ERROR}✗ ERROR${RESET}" ;;
        *)        printf "${C_DIM}? UNKNOWN${RESET}" ;;
    esac
}

print_banner() {
    echo -e "${BOLD_CYAN}"
    cat << 'BANNER'
  ████████╗██╗  ██╗███████╗ █████╗ ███╗   ███╗██╗███████╗██╗   ██╗
     ██╔══╝██║  ██║██╔════╝██╔══██╗████╗ ████║██║██╔════╝╚██╗ ██╔╝
     ██║   ███████║█████╗  ███████║██╔████╔██║██║█████╗   ╚████╔╝ 
     ██║   ██╔══██║██╔══╝  ██╔══██║██║╚██╔╝██║██║██╔══╝    ╚██╔╝  
     ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║██║██║        ██║   
     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝        ╚═╝   
BANNER
    echo -e "${RESET}"
    echo -e "  ${C_DIM}GRUB Theme Manager by Don Artkins  ·  v${VERSION:-1.0.0}${RESET}"
    echo
}

# ── Spinner ───────────────────────────────────────────────────────────────────
SPINNER_FRAMES=('⣾' '⣽' '⣻' '⢿' '⡿' '⣟' '⣯' '⣷')
SPINNER_PID=""

spinner_start() {
    local msg="${1:-Working}"
    (
        local i=0
        while true; do
            printf "\r  ${C_STEP}${SPINNER_FRAMES[$((i % 8))]}${RESET} ${msg}..."
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
        printf "\r\033[K"
    fi
}