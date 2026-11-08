#!/usr/bin/env bash
# Intégration continue : exécute une commande et, si elle échoue, remonte les dernières lignes de sa sortie
# en annotation GitHub (::error), lisible depuis l'API publique sans ouvrir le journal.
# Usage : scripts/ci-run.sh "libellé" commande args…
set -uo pipefail
label="$1"; shift
out=$("$@" 2>&1); code=$?
if [ $code -eq 0 ]; then
  printf '%s\n' "$out" | tail -n 5
  exit 0
fi
printf '%s\n' "$out" | tail -n 60
msg=$(printf '%s' "$out" | grep -v '^OK ' | tail -c 1500 | tr '\r' ' ')
msg=${msg//'%'/%25}; msg=${msg//$'\n'/%0A}
echo "::error title=${label} (code ${code})::${msg}"
exit $code
