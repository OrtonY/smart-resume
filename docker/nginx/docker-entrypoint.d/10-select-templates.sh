#!/bin/sh
set -eu

template_dir="${NGINX_ENVSUBST_TEMPLATE_DIR:-/tmp/nginx-templates}"
https_enabled="$(printf '%s' "${ENABLE_HTTPS:-false}" | tr '[:upper:]' '[:lower:]')"

mkdir -p "$template_dir"
cp /etc/nginx/base-templates/*.template "$template_dir"/

case "$https_enabled" in
  true|1|yes|on)
    if [ ! -r /etc/nginx/ssl/cert.pem ] || [ ! -r /etc/nginx/ssl/key.pem ]; then
      echo "ENABLE_HTTPS=true requires /etc/nginx/ssl/cert.pem and /etc/nginx/ssl/key.pem" >&2
      exit 1
    fi
    cp /etc/nginx/optional-templates/https.conf.template "$template_dir"/
    ;;
  false|0|no|off|"")
    ;;
  *)
    echo "ENABLE_HTTPS must be true or false, got: ${ENABLE_HTTPS:-}" >&2
    exit 1
    ;;
esac
