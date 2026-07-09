#!/usr/bin/env bash
# Idempotent dependency installer for Ubuntu 24.04 LTS host.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

log info "Starting dependency installation check"

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq

PACKAGES=(
  curl wget git jq unzip zip
  python3 python3-pip python3-venv
  ffmpeg ca-certificates software-properties-common
  dnsutils net-tools iproute2 lsof screen tmux cron
  openvpn wireguard wireguard-tools
)

for pkg in "${PACKAGES[@]}"; do
  install_if_missing "${pkg}"
done

# yt-dlp via pip if missing or outdated
if ! command_exists yt-dlp; then
  log info "Installing yt-dlp via pip"
  sudo pip3 install --break-system-packages -U yt-dlp
else
  log info "yt-dlp already installed: $(yt-dlp --version)"
fi

# Docker
if ! command_exists docker; then
  log info "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "${USER}" 2>/dev/null || true
else
  log info "Docker already installed"
fi

if ! docker compose version >/dev/null 2>&1; then
  log info "Installing docker compose plugin"
  sudo apt-get install -y docker-compose-plugin
fi

# Tailscale (optional — only if TAILSCALE_INSTALL=true)
if [[ "${TAILSCALE_INSTALL:-false}" == "true" ]] && ! command_exists tailscale; then
  curl -fsSL https://tailscale.com/install.sh | sudo sh
fi

log info "Verifying installations"
for cmd in curl wget git jq python3 ffmpeg yt-dlp docker; do
  command_exists "${cmd}" || die "Verification failed: ${cmd}"
done

docker compose version >/dev/null || die "docker compose not available"
systemctl is-system-running >/dev/null 2>&1 || log warn "systemd status check skipped"

log info "All dependencies verified successfully"
