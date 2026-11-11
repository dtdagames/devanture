#!/usr/bin/env bash
# Intégration continue : vérifie et compile les exemples. Toute erreur est remontée en annotation GitHub (::error),
# lisible sans ouvrir le journal, avec les dernières lignes de la sortie.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
run() {
  local label="$1"; shift
  local out
  if out=$("$@" 2>&1); then
    printf '%s\n' "$out" | tail -n 3
  else
    local code=$?
    printf '%s\n' "$out" | tail -n 40
    local msg; msg=$(printf '%s' "$out" | tail -c 1500 | tr '\r' ' ')
    msg=${msg//'%'/%25}; msg=${msg//$'\n'/%0A}
    echo "::error title=${label} (code ${code})::${msg}"
    fail=1
  fi
}

for d in examples/plomberie-martin examples/savonnerie examples/garnier-associes examples/garnier-document examples/le-fournil; do
  echo "== $d"
  run "check $d" node bin/sitec.js check "$d"
  run "build $d" node bin/sitec.js build "$d" --draft
done
run "host examples/hote" node bin/sitec.js host examples/hote

exit $fail
