#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

MSG="${1:-chore: update drink-analysis app}"

skills/drink-analysis-maintainer/scripts/verify_project.sh

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No changes to commit."
  exit 0
fi

git add -A
git commit -m "$MSG"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

push_with_proxy_retry() {
  if git push origin "$CURRENT_BRANCH"; then
    return 0
  fi

  echo "Initial push failed. Trying proxy from ~/.zshrc..." >&2
  if [[ -f "$HOME/.zshrc" ]]; then
    local proxy_addr
    proxy_addr="$(sed -n 's/^export PROXY_ADDR="\([^"]*\)"/\1/p' "$HOME/.zshrc" | head -n 1)"
    if [[ -n "$proxy_addr" ]]; then
      export http_proxy="$proxy_addr"
      export https_proxy="$proxy_addr"
      export HTTP_PROXY="$proxy_addr"
      export HTTPS_PROXY="$proxy_addr"
      export ALL_PROXY="$proxy_addr"
      echo "Proxy enabled: $proxy_addr" >&2
      git push origin "$CURRENT_BRANCH"
      return $?
    fi
  fi

  echo "Proxy config not found in ~/.zshrc" >&2
  return 1
}

push_with_proxy_retry
echo "Pushed branch $CURRENT_BRANCH to origin."
