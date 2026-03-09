#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

pass() {
  echo "[OK] $1"
}

[[ -f index.html ]] || fail "Missing index.html"
[[ -f README.md ]] || fail "Missing README.md"

APP_SOURCE="index.html"
if [[ -f src/main.ts ]]; then
  APP_SOURCE="src/main.ts"
elif [[ -f assets/app.js ]]; then
  APP_SOURCE="assets/app.js"
fi

if [[ "$APP_SOURCE" == "src/main.ts" ]]; then
  rg -Fq 'src="/src/main.ts"' index.html || fail 'index.html missing Vite module entry: /src/main.ts'
  rg -Fq "import './styles.css';" src/main.ts || fail "src/main.ts missing styles import"
  [[ -f src/styles.css ]] || fail "Missing src/styles.css"
  pass "Vite entry and stylesheet wiring look correct"
elif [[ "$APP_SOURCE" == "assets/app.js" ]]; then
  rg -Fq 'href="assets/styles.css"' index.html || fail 'index.html missing stylesheet reference: assets/styles.css'
  rg -Fq 'src="assets/app.js"' index.html || fail 'index.html missing script reference: assets/app.js'
  pass "index.html references split assets correctly"
fi

required_tokens=(
  "const BIN_ID"
  "const API_KEY"
  "function render()"
  "function renderReport()"
  "async function pull()"
  "async function push()"
  "function save()"
  "function normalizeDayData"
  "function migrateAppDataToV2"
)

for token in "${required_tokens[@]}"; do
  if ! rg -Fq "$token" "$APP_SOURCE"; then
    fail "$APP_SOURCE missing required token: $token"
  fi
done
pass "Core functions and sync tokens detected in $APP_SOURCE"

if ! rg -q -e "支持[[:space:]]*16[[:space:]]*位|最多[[:space:]]*16[[:space:]]*位|16[[:space:]]*位成员" README.md; then
  fail "README.md does not mention current 16-member support"
fi
pass "README member-capacity text looks current"

if rg -Fq "yourname/drink-calendar-2026" README.md; then
  fail "README still contains placeholder repository clone URL"
fi
pass "README clone URL placeholder removed"

echo "All project checks passed."
