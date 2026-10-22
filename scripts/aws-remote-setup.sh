#!/usr/bin/env bash
# Runs on the AWS server after scripts/deploy-aws.sh copies the repo.
# Reads /tmp/lead-management-deploy.env (uploaded by the local script).
set -euo pipefail

ENV_SRC="${1:-/tmp/lead-management-deploy.env}"
APP_DIR="${APP_DIR:-/opt/lead-management}"
ENV_FILE="$APP_DIR/.env"

if [[ ! -f "$ENV_SRC" ]]; then
  echo "Missing deploy settings: $ENV_SRC" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_SRC"
set +a
rm -f "$ENV_SRC"

APP_DIR="${DEPLOY_PATH:-$APP_DIR}"
ENV_FILE="$APP_DIR/.env"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

install_packages() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
  fi
  case "${ID:-}" in
    ubuntu|debian)
      sudo apt-get update -y
      sudo apt-get install -y ca-certificates curl gnupg nginx
      if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v20\.'; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        sudo apt-get install -y nodejs
      fi
      if [[ "${DEPLOY_SETUP_POSTGRES:-1}" == "1" ]]; then
        sudo apt-get install -y postgresql postgresql-contrib
      fi
      ;;
    amzn|rhel|fedora|centos)
      sudo dnf install -y ca-certificates curl nginx
      if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v20\.'; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
      fi
      if [[ "${DEPLOY_SETUP_POSTGRES:-1}" == "1" ]]; then
        sudo dnf install -y postgresql-server postgresql
        if [[ ! -d /var/lib/pgsql/data/base ]]; then
          sudo postgresql-setup --initdb || sudo postgresql-setup initdb || true
        fi
        sudo systemctl enable --now postgresql
      fi
      ;;
    *)
      echo "Unsupported OS: ${ID:-unknown}. Use Ubuntu or Amazon Linux." >&2
      exit 1
      ;;
  esac
  sudo corepack enable
  sudo corepack prepare pnpm@10.28.1 --activate
}

setup_postgres() {
  [[ "${DEPLOY_SETUP_POSTGRES:-1}" == "1" ]] || return 0
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return 0
  fi

  local existing=""
  if [[ -f "$ENV_FILE" ]]; then
    existing="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
  fi
  if [[ -n "$existing" ]]; then
    DATABASE_URL="$existing"
    return 0
  fi

  local pass db_user db_name
  pass="$(openssl rand -hex 24)"
  db_user="leadapp"
  db_name="leadmanagement"
  sudo systemctl enable --now postgresql
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${db_user}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE ROLE ${db_user} LOGIN PASSWORD '${pass}'"
  else
    sudo -u postgres psql -c "ALTER ROLE ${db_user} WITH LOGIN PASSWORD '${pass}'"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1; then
    sudo -u postgres createdb -O "$db_user" "$db_name"
  fi
  DATABASE_URL="postgresql://${db_user}:${pass}@127.0.0.1:5432/${db_name}?schema=public"
}

write_env() {
  local prev_auth prev_key prev_url prev_blob
  prev_auth=""
  prev_key=""
  prev_url=""
  prev_blob=""
  if [[ -f "$ENV_FILE" ]]; then
    prev_auth="$(grep -E '^AUTH_SECRET=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
    prev_key="$(grep -E '^FIELD_ENCRYPTION_KEY=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
    prev_url="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
    prev_blob="$(grep -E '^BLOB_READ_WRITE_TOKEN=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
  fi

  DATABASE_URL="${DATABASE_URL:-$prev_url}"
  AUTH_SECRET="${AUTH_SECRET:-$prev_auth}"
  FIELD_ENCRYPTION_KEY="${FIELD_ENCRYPTION_KEY:-$prev_key}"
  AUTH_URL="${AUTH_URL:-${DEPLOY_PUBLIC_URL:-}}"
  BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN:-$prev_blob}"

  if [[ -z "$AUTH_SECRET" ]]; then
    AUTH_SECRET="$(openssl rand -base64 32)"
  fi
  if [[ -z "$FIELD_ENCRYPTION_KEY" ]]; then
    FIELD_ENCRYPTION_KEY="$(openssl rand -base64 32)"
  fi
  if [[ -z "$DATABASE_URL" ]]; then
    echo "DATABASE_URL is missing. Set it, or leave DEPLOY_SETUP_POSTGRES=1." >&2
    exit 1
  fi
  if [[ -z "$AUTH_URL" ]]; then
    echo "Set AUTH_URL or DEPLOY_PUBLIC_URL." >&2
    exit 1
  fi

  local tmp
  tmp="$(mktemp)"
  {
    printf 'NODE_ENV=production\n'
    printf 'DATABASE_URL=%s\n' "$DATABASE_URL"
    printf 'AUTH_SECRET=%s\n' "$AUTH_SECRET"
    printf 'AUTH_URL=%s\n' "$AUTH_URL"
    printf 'FIELD_ENCRYPTION_KEY=%s\n' "$FIELD_ENCRYPTION_KEY"
    if [[ -n "$BLOB_READ_WRITE_TOKEN" ]]; then
      printf 'BLOB_READ_WRITE_TOKEN=%s\n' "$BLOB_READ_WRITE_TOKEN"
    fi
  } >"$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$ENV_FILE"
}

install_nginx() {
  local public_host
  public_host="${DEPLOY_PUBLIC_URL#http://}"
  public_host="${public_host#https://}"
  public_host="${public_host%%/*}"
  sudo tee /etc/nginx/conf.d/lead-management.conf >/dev/null <<NGINX
server {
  listen 80;
  server_name ${public_host} _;
  client_max_body_size 8m;
  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx
}

install_service() {
  local pnpm_bin
  pnpm_bin="$(command -v pnpm)"
  sudo tee /etc/systemd/system/lead-management.service >/dev/null <<UNIT
[Unit]
Description=EVerified lead management
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${pnpm_bin} start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable lead-management.service
  sudo systemctl restart lead-management.service
}

install_packages
setup_postgres
write_env
export DATABASE_URL
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm build
install_nginx
install_service
echo "Deployed. Open ${AUTH_URL}"
