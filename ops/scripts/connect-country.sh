#!/usr/bin/env bash
# Connect VPN/proxy for a target country. Outputs PROXY=url on success.
# Usage: connect-country.sh BD [provider_id]
set -euo pipefail
source "$(dirname "$0")/lib.sh"

COUNTRY="$(normalize_country "${1:-${VPN_COUNTRY:-BD}}")"
PROVIDER="${2:-${VPN_PROVIDER:-auto}}"
PROXY_PORT="${VPN_LOCAL_PROXY_PORT:-1080}"
PROXY_URL="${VPN_LOCAL_PROXY_URL:-socks5://127.0.0.1:${PROXY_PORT}}"

connect_tailscale() {
  command_exists tailscale || return 1
  local exit_node="${TAILSCALE_EXIT_NODE:-}"
  local country_node_var="TAILSCALE_EXIT_NODE_${COUNTRY}"
  if [[ -n "${!country_node_var:-}" ]]; then
    exit_node="${!country_node_var}"
  fi
  [[ -n "${exit_node}" ]] || return 1
  sudo tailscale up --exit-node="${exit_node}" --exit-node-allow-lan-access=true 2>/dev/null || return 1
  echo "PROXY=${PROXY_URL}"
  write_state "${COUNTRY}" "tailscale" "${PROXY_URL}"
  return 0
}

connect_wireguard() {
  local conf="${CUSTOM_WG_BD_CONFIG:-}"
  [[ "${COUNTRY}" != "BD" ]] && conf="${CUSTOM_WG_CONFIG:-${WG_CONFIG_PATH:-}}"
  [[ "${COUNTRY}" == "BD" ]] && conf="${CUSTOM_WG_BD_CONFIG:-${CUSTOM_WG_CONFIG:-${WG_CONFIG_PATH:-}}}"
  [[ -f "${conf}" ]] || return 1
  local iface="${WG_INTERFACE:-wg0}"
  sudo ip link del "${iface}" 2>/dev/null || true
  sudo wg-quick up "${conf}"
  echo "PROXY=${PROXY_URL}"
  write_state "${COUNTRY}" "wireguard" "${PROXY_URL}"
}

connect_openvpn() {
  local conf="${CUSTOM_OVPN_BD_CONFIG:-}"
  [[ "${COUNTRY}" == "BD" ]] && conf="${CUSTOM_OVPN_BD_CONFIG:-${CUSTOM_OVPN_CONFIG:-}}"
  [[ "${COUNTRY}" != "BD" ]] && conf="${CUSTOM_OVPN_CONFIG:-}"
  if [[ -f "${conf}" ]]; then
    sudo openvpn --config "${conf}" --daemon
  elif [[ -d "${OPENVPN_CONFIG_DIR:-}" ]]; then
    local ovpn
    ovpn=$(find "${OPENVPN_CONFIG_DIR}" -name "*${COUNTRY}*.ovpn" | head -1)
    [[ -n "${ovpn}" ]] || return 1
    sudo openvpn --config "${ovpn}" --daemon
  else
    return 1
  fi
  echo "PROXY=${PROXY_URL}"
  write_state "${COUNTRY}" "openvpn" "${PROXY_URL}"
}

connect_commercial() {
  local id="$1"
  case "${id}" in
    surfshark)
      command_exists surfshark-vpn || return 1
      surfshark-vpn connect "${COUNTRY}" || return 1
      ;;
    nordvpn)
      command_exists nordvpn || return 1
      nordvpn connect "${COUNTRY}" || return 1
      ;;
    mullvad)
      command_exists mullvad || return 1
      mullvad relay set location "${COUNTRY}" && mullvad connect || return 1
      ;;
    *)
      return 1
      ;;
  esac
  echo "PROXY=${PROXY_URL}"
  write_state "${COUNTRY}" "${id}" "${PROXY_URL}"
}

try_provider() {
  local id="$1"
  case "${id}" in
    tailscale) connect_tailscale && return 0 ;;
    custom-wireguard|wireguard) connect_wireguard && return 0 ;;
    custom-openvpn|openvpn) connect_openvpn && return 0 ;;
    http-proxy|socks5-proxy)
      if [[ -n "${YTDLP_PROXY:-}" ]]; then
        echo "PROXY=${YTDLP_PROXY}"
        write_state "${COUNTRY}" "${id}" "${YTDLP_PROXY}"
        return 0
      fi
      ;;
    surfshark|nordvpn|mullvad|protonvpn|pia|expressvpn)
      connect_commercial "${id}" && return 0
      ;;
  esac
  return 1
}

# Bangladesh priority order
PROVIDERS=()
if [[ "${COUNTRY}" == "BD" ]]; then
  PROVIDERS=(tailscale custom-wireguard custom-openvpn socks5-proxy http-proxy surfshark nordvpn protonvpn mullvad pia expressvpn wireguard openvpn)
else
  PROVIDERS=(surfshark nordvpn protonvpn mullvad pia expressvpn http-proxy socks5-proxy wireguard openvpn tailscale)
fi

if [[ "${PROVIDER}" != "auto" ]]; then
  try_provider "${PROVIDER}" && exit 0
  die "Provider ${PROVIDER} failed for ${COUNTRY}"
fi

for p in "${PROVIDERS[@]}"; do
  log info "Trying provider ${p} for ${COUNTRY}"
  if try_provider "${p}"; then
    log info "Connected via ${p}"
    exit 0
  fi
done

die "No provider available for country ${COUNTRY}"
