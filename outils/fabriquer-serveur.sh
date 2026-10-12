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
# Spond : un 2e fichier, à ajouter au projet Apps Script seulement quand Nicolas branche Spond (autorisation en plus)
{
  echo "/* ====== Mode champion · M12 — SPOND (2e fichier du projet Apps Script : « spond ») ====== */"
  echo "/* Généré automatiquement : ne pas modifier ici, voir outils/spond-google.gs */"
  echo
  cat outils/spond-google.gs
} > apps-script/spond.gs
echo "OK : apps-script/serveur-mode-champion.gs et apps-script/spond.gs"
