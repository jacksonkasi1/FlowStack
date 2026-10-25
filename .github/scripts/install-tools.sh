#!/bin/bash
# Installs pinned, checksum-verified CLI tools for CI (Linux x86_64).
# Usage: install-tools.sh gitleaks [infisical]
# Any download or checksum failure fails the job: a missing scanner must never
# look like a passing scan.
set -euo pipefail

GITLEAKS_VERSION="8.30.1"
GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
INFISICAL_VERSION="0.44.9"
INFISICAL_SHA256="4005a430258df60401ae5288ab0412371f2e56f224ed461758dd2ec83887d556"

BIN_DIR="${RUNNER_TEMP:-/tmp}/flowstack-tools"
mkdir -p "$BIN_DIR"

install() {
  local name="$1" url="$2" sha="$3" archive
  archive="$BIN_DIR/$name.tar.gz"
  curl -fsSL --retry 3 -o "$archive" "$url"
  echo "$sha  $archive" | sha256sum --check --strict
  tar -xzf "$archive" -C "$BIN_DIR" "$name"
  chmod +x "$BIN_DIR/$name"
  rm -f "$archive"
}

for tool in "$@"; do
  case "$tool" in
    gitleaks)
      install gitleaks "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" "$GITLEAKS_SHA256"
      "$BIN_DIR/gitleaks" version ;;
    infisical)
      install infisical "https://github.com/Infisical/cli/releases/download/v${INFISICAL_VERSION}/cli_${INFISICAL_VERSION}_linux_amd64.tar.gz" "$INFISICAL_SHA256"
      "$BIN_DIR/infisical" --version ;;
    *) echo "Unknown tool: $tool" >&2; exit 1 ;;
  esac
done

if [ -n "${GITHUB_PATH:-}" ]; then echo "$BIN_DIR" >> "$GITHUB_PATH"; fi
