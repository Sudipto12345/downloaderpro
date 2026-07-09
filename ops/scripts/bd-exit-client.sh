#!/usr/bin/env bash
# Run on a machine physically in Bangladesh (or with a Bangladesh IP).
# Forwards a local SOCKS5 proxy to the TinyDown VPS so geo-blocked videos work.
set -euo pipefail

VPS_HOST="${VPS_HOST:-194.233.77.7}"
VPS_USER="${VPS_USER:-root}"
LOCAL_SOCKS_PORT="${LOCAL_SOCKS_PORT:-1080}"
REMOTE_BIND_PORT="${REMOTE_BIND_PORT:-1080}"

echo "=== TinyDown Bangladesh Exit Client ==="
echo "VPS: ${VPS_USER}@${VPS_HOST}"
echo ""

if ! command -v ssh >/dev/null 2>&1; then
  echo "ERROR: ssh client required." >&2
  exit 1
fi

# Start local SOCKS5 if not already running
start_local_socks() {
  if ss -tln 2>/dev/null | grep -q ":${LOCAL_SOCKS_PORT} "; then
    echo "Local SOCKS already listening on port ${LOCAL_SOCKS_PORT}"
    return 0
  fi

  if command -v microsocks >/dev/null 2>&1; then
    echo "Starting microsocks on 127.0.0.1:${LOCAL_SOCKS_PORT}..."
    microsocks -i 127.0.0.1 -p "${LOCAL_SOCKS_PORT}" &
    sleep 1
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    echo "Starting Python SOCKS proxy on 127.0.0.1:${LOCAL_SOCKS_PORT}..."
    LOCAL_SOCKS_PORT="${LOCAL_SOCKS_PORT}" python3 - <<'PY' &
import os, socket, struct, select, threading

HOST, PORT = "127.0.0.1", int(os.environ["LOCAL_SOCKS_PORT"])

def handle(client):
    try:
        client.recv(2)
        ver, nmethods = struct.unpack("!BB", client.recv(2))
        client.sendall(struct.pack("!BB", 5, 0))
        ver, cmd, _, atyp = struct.unpack("!BBBB", client.recv(4))
        if atyp == 1:
            addr = socket.inet_ntoa(client.recv(4))
        elif atyp == 3:
            ln = client.recv(1)[0]
            addr = client.recv(ln).decode()
        else:
            client.close(); return
        port = struct.unpack("!H", client.recv(2))[0]
        remote = socket.create_connection((addr, port))
        client.sendall(struct.pack("!BBBBIH", 5, 0, 0, 1, 0, 0))
        while True:
            r, _, _ = select.select([client, remote], [], [], 60)
            if not r: break
            for s in r:
                data = s.recv(8192)
                if not data: return
                (remote if s is client else client).sendall(data)
    except Exception:
        pass
    finally:
        client.close()

s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind((HOST, PORT))
s.listen(64)
print(f"SOCKS5 on {HOST}:{PORT}")
while True:
    c, _ = s.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
PY
    sleep 2
    return 0
  fi

  echo "ERROR: Install microsocks (apt install microsocks) or python3." >&2
  exit 1
}

start_local_socks

echo ""
echo "Opening reverse SSH tunnel (keep this terminal open)..."
echo "When connected, TinyDown VPS will route BD-only videos through this machine."
echo ""

exec ssh -N \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -R "127.0.0.1:${REMOTE_BIND_PORT}:127.0.0.1:${LOCAL_SOCKS_PORT}" \
  "${VPS_USER}@${VPS_HOST}"
