#!/bin/sh
set -e

HTML="/usr/share/nginx/html/index.html"
GSC_MARKER="<!-- gsc-verification -->"
HEAD_MARKER="<!-- custom-head-tags -->"

fetch_backend() {
  wget -qO- "http://backend:4000$1" 2>/dev/null | tr -d '\n' || true
}

if [ -f "$HTML" ]; then
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    CODE=$(fetch_backend "/api/public/gsc-verification")
    CUSTOM=$(fetch_backend "/api/public/custom-head-html")

    if [ -n "$CODE" ] && [ "$CODE" != "null" ] && [ "$CODE" != '""' ]; then
      CODE=$(printf '%s' "$CODE" | sed 's/^"//;s/"$//')
      if grep -q "$GSC_MARKER" "$HTML"; then
        sed -i "s|${GSC_MARKER}|<meta name=\"google-site-verification\" content=\"${CODE}\" />|" "$HTML"
      fi
    fi

    if [ -n "$CUSTOM" ] && [ "$CUSTOM" != "null" ]; then
      if grep -q "$HEAD_MARKER" "$HTML"; then
        # Escape sed replacement chars in custom HTML
        ESCAPED=$(printf '%s' "$CUSTOM" | sed 's/[\\&|]/\\&/g')
        sed -i "s|${HEAD_MARKER}|${ESCAPED}|" "$HTML"
      fi
    fi

    if [ -n "$CODE" ] || [ -n "$CUSTOM" ]; then
      break
    fi
    sleep 2
  done
fi

exec nginx -g 'daemon off;'
