#!/usr/bin/env bash
# Deploy this repo to an AWS server over SSH.
#
# Put the server credentials in the environment, then run:
#   set -a && source .env.aws && set +a
#   ./scripts/deploy-aws.sh
#
# Required:
#   DEPLOY_HOST      public IP or DNS of the EC2 instance
#   DEPLOY_USER      SSH user (ubuntu on Ubuntu AMIs, ec2-user on Amazon Linux)
#   DEPLOY_SSH_KEY   path to the private key, or the PEM text itself
#
# Optional:
#   DEPLOY_PORT=22
#   DEPLOY_PATH=/opt/lead-management
#   DEPLOY_PUBLIC_URL=http://your-host     (defaults to http://DEPLOY_HOST)
#   DEPLOY_SETUP_POSTGRES=1                install Postgres on that server
#   DATABASE_URL                           skip local Postgres when this is set
#   AUTH_SECRET AUTH_URL FIELD_ENCRYPTION_KEY
#   BLOB_READ_WRITE_TOKEN
#
# The SSH user must be able to sudo without a password.
# Open ports 22 and 80 on the instance security group.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${DEPLOY_HOST:?Set DEPLOY_HOST to the server IP or DNS name}"
: "${DEPLOY_USER:?Set DEPLOY_USER (ubuntu or ec2-user)}"
: "${DEPLOY_SSH_KEY:?Set DEPLOY_SSH_KEY to the private key path or PEM text}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/lead-management}"
DEPLOY_PUBLIC_URL="${DEPLOY_PUBLIC_URL:-http://${DEPLOY_HOST}}"
DEPLOY_SETUP_POSTGRES="${DEPLOY_SETUP_POSTGRES:-1}"

cleanup() {
  if [[ -n "${KEY_FILE:-}" && "${KEY_FILE_TEMP:-}" == "1" ]]; then
    rm -f "$KEY_FILE"
  fi
  if [[ -n "${SETTINGS_FILE:-}" ]]; then
    rm -f "$SETTINGS_FILE"
  fi
}
trap cleanup EXIT

if [[ "$DEPLOY_SSH_KEY" == -----BEGIN* ]]; then
  KEY_FILE="$(mktemp)"
  KEY_FILE_TEMP=1
  printf '%s\n' "$DEPLOY_SSH_KEY" >"$KEY_FILE"
  chmod 600 "$KEY_FILE"
else
  KEY_FILE="$DEPLOY_SSH_KEY"
  if [[ ! -f "$KEY_FILE" ]]; then
    echo "SSH key file not found: $KEY_FILE" >&2
    exit 1
  fi
fi

SSH=(ssh -i "$KEY_FILE" -p "$DEPLOY_PORT" -o StrictHostKeyChecking=accept-new)
RSYNC_SSH="ssh -i ${KEY_FILE} -p ${DEPLOY_PORT} -o StrictHostKeyChecking=accept-new"
TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "Connecting to ${TARGET}"
"${SSH[@]}" "$TARGET" "sudo mkdir -p ${DEPLOY_PATH} && sudo chown ${DEPLOY_USER}:\$(id -gn) ${DEPLOY_PATH}"

rsync -az --delete \
  -e "$RSYNC_SSH" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude .env.aws \
  --exclude .data \
  --exclude test-results \
  --exclude coverage \
  --exclude ECR_Sept2026.txt \
  "$ROOT/" "${TARGET}:${DEPLOY_PATH}/"

SETTINGS_FILE="$(mktemp)"
chmod 600 "$SETTINGS_FILE"
{
  printf 'DEPLOY_PATH=%s\n' "$DEPLOY_PATH"
  printf 'DEPLOY_PUBLIC_URL=%s\n' "$DEPLOY_PUBLIC_URL"
  printf 'DEPLOY_SETUP_POSTGRES=%s\n' "$DEPLOY_SETUP_POSTGRES"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    printf 'DATABASE_URL=%s\n' "$DATABASE_URL"
  fi
  if [[ -n "${AUTH_SECRET:-}" ]]; then
    printf 'AUTH_SECRET=%s\n' "$AUTH_SECRET"
  fi
  if [[ -n "${AUTH_URL:-}" ]]; then
    printf 'AUTH_URL=%s\n' "$AUTH_URL"
  fi
  if [[ -n "${FIELD_ENCRYPTION_KEY:-}" ]]; then
    printf 'FIELD_ENCRYPTION_KEY=%s\n' "$FIELD_ENCRYPTION_KEY"
  fi
  if [[ -n "${BLOB_READ_WRITE_TOKEN:-}" ]]; then
    printf 'BLOB_READ_WRITE_TOKEN=%s\n' "$BLOB_READ_WRITE_TOKEN"
  fi
} >"$SETTINGS_FILE"

scp -i "$KEY_FILE" -P "$DEPLOY_PORT" -o StrictHostKeyChecking=accept-new \
  "$SETTINGS_FILE" "${TARGET}:/tmp/lead-management-deploy.env"
"${SSH[@]}" "$TARGET" "chmod 600 /tmp/lead-management-deploy.env && bash ${DEPLOY_PATH}/scripts/aws-remote-setup.sh /tmp/lead-management-deploy.env"

echo "Finished. Site: ${DEPLOY_PUBLIC_URL}"
