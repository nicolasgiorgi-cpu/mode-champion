#!/bin/sh
# Recrée apps-script/serveur-mode-champion.gs = js/core.js + la partie Google (outils/code-google.gs)
cd "$(dirname "$0")/.."
{
  echo "/* ====== Mode champion · M12 — SERVEUR (fichier unique à coller dans Apps Script) ====== */"
  echo "/* Généré automatiquement : ne pas modifier ici, voir js/core.js et outils/code-google.gs */"
  echo
  cat js/core.js
  echo
  cat outils/code-google.gs
} > apps-script/serveur-mode-champion.gs
echo "OK : apps-script/serveur-mode-champion.gs"
