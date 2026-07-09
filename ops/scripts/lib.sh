#!/usr/bin/env bash
# Shared helpers for VPN ops scripts. Source this file; do not execute directly.
set -euo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${OPS_DIR}/../.." && pwd)"
STATE_DIR="${VPN_STATE_DIR:-/run/vpn}"
LOG_DIR="${VPN_LOG_DIR:-/var/log/vpn-manager}"
CONFIG_DIR="${VPN_CONFIG_DIR:-${OPS_DIR}/../config}"

mkdir -p "${STATE_DIR}" "${LOG_DIR}" 2>/dev/null || true

log() {
  local level="$1"; shift
  echo "{\"level\":\"${level}\",\"ts\":\"$(date -Iseconds)\",\"message\":\"$*\"}" | tee -a "${LOG_DIR}/vpn.log" >&2
}

die() { log error "$*"; exit 1; }

normalize_country() {
  local c="${1^^}"
  case "${c}" in UK) echo GB ;; USA) echo US ;; *) echo "${c}" ;; esac
}

write_state() {
  local country="$1" provider="$2" proxy="$3"
  cat > "${STATE_DIR}/status.json" <<EOF
{"country":"${country}","provider":"${provider}","proxy":"${proxy}","connectedAt":"$(date -Iseconds)"}
EOF
}

clear_state() {
  rm -f "${STATE_DIR}/status.json"
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

install_if_missing() {
  local pkg="$1"
  if dpkg -s "${pkg}" >/dev/null 2>&1; then
    log info "Package already installed: ${pkg}"
    return 0
  fi
  log info "Installing package: ${pkg}"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkg}"
}
