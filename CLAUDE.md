# CLAUDE.md — Mode champion · M12

Appli web de préparation physique et de suivi pour un groupe d'enfants de rugby (M12), utilisée par les enfants, leurs parents et les éducateurs. Site statique (HTML/CSS/JS vanilla, sans build) hébergé sur GitHub Pages, avec une Google Sheet comme base de données via un serveur Google Apps Script. Le README décrit le détail fonctionnel et la mise en route ; ce fichier dit comment travailler dans le dépôt.

Langue de travail : français (code, commentaires, textes de l'appli, messages de commit).

## Règles pour un dépôt PUBLIC

Ce dépôt est public et le site tourne en production auprès de vraies familles.

- Jamais de code d'accès (enfants, parents, éducs), de mot de passe, de nom ou de prénom d'enfant ou de famille, de numéro de téléphone, ni d'identifiant de feuille ou de projet Google dans un fichier, un commit ou un message de commit. Les données de démo (`js/demo.js`) sont fictives : les garder fictives.
- Le serveur ne garde que des empreintes de codes. Ne jamais écrire de code en clair dans la feuille, le journal ou les logs.
- Les tests tournent en mode démo ou sur un faux serveur : aucun vrai code dedans.

## Architecture

- Pas de bundler ni de framework : scripts chargés par `index.html`, espace de noms global `MC`. Tous les fichiers sont référencés avec `?v=N`.
- `js/app.js` : routeur `app.route(motif, fn, {kid, adult:'f'|'e', nav, bg})` (`nav` peut être une fonction), historique et Retour (`MC.app.back`), tirer pour actualiser, onglets du bas (`paintNav`, clés d'onglet, anciennes clés dans `NAV_ALIAS`).
- `js/ui.js` : briques d'interface (`ui.topbar({...})`, `back:false` pour retirer la flèche ; `ui.subtabs`, `ui.seg`, icônes). Les clics passent par des attributs `data-act="nom"` → `MC.act.nom` (délégation globale dans `app.js`).
- Écrans : `js/v-*.js` (enfant `v-kid`, `v-profil`, `v-missions` ; adultes `v-adult`, `v-educ` ; séance `v-seance` ; bilan `v-bilan` ; mission `v-mission` ; compos `v-compos` ; connexion `v-login` ; aide `v-guide`).
- Règles et contenu : `js/content.js` (programme, doses, badges, grades, XP), `js/logic.js` (étoiles, XP, niveaux, ligues), `js/competences.js` (Skills), `js/missions.js`, `js/postes-data.js`, `js/compos.js`, `js/fiches.js`, `js/routine.js`, `js/suivi.js`.
- `js/config.js` : réglages (adresse du serveur, cycles, bilans, ouverture des parties de l'appli). `API_URL` vide = mode démo.
- Serveur : `js/core.js` (logique serveur, partagée avec le mode démo) + `outils/code-google.gs` (partie Google) → fabriqués ensemble dans `apps-script/serveur-mode-champion.gs`. Spond : `outils/spond-google.gs` → `apps-script/spond.gs`. Ne jamais éditer les `.gs` générés à la main : modifier `js/core.js` ou `outils/*.gs`, puis `sh outils/fabriquer-serveur.sh`.
- `sw.js` : service worker (copie de l'appli gardée sur l'appareil, ne touche jamais au serveur Google). `guide-parents/` : page du guide pour les parents (pages statiques).

## Ouverture des parties de l'appli (réglages V1)

`MC.CONFIG.ENFANTS = { skills, copains, missionsEducs }` dans `js/config.js` : ce que voient les enfants et les parents. Côté éducs, tout reste ouvert. Toujours passer par `MC.ouvert('skills' | 'copains' | 'missionsEducs')`, jamais lire le réglage directement. Tant qu'une partie est fermée, elle ne rapporte pas d'XP aux enfants. Pour ouvrir une partie : la passer à `true`, ajouter une entrée en haut de `MC.NEWS` (`js/nouveautes.js`, champ `si` pour la cibler), augmenter `?v=`, pousser `main`. L'état courant de ces réglages fait foi dans `js/config.js`.

## Commandes et tests

Depuis la racine du dépôt (les chemins des tests supposent le dépôt dans `/home/claude/mode-champion`) :

```sh
sh outils/fabriquer-serveur.sh          # à lancer avant test_core.js et avant tout déploiement serveur
for t in tests/test_*.js; do node "$t" || echo "ÉCHEC $t"; done   # tests unitaires, à lancer à chaque modif
sh tests/mkdemo.sh                      # copie de démo (API_URL vide) servie sur :8899 ; « sh tests/mkdemo.sh tout » ouvre tout aux enfants
python3 tests/e2e_retour.py 390 844     # parcours navigateur (Playwright) ; 3 tailles : 390 844 · 1180 820 · 820 1180
```

Scénarios navigateur utiles : `e2e_nav16` (navigation), `e2e_retour` (Retour, actualiser), `e2e_barre` (barre du haut sur tous les écrans), `e2e_mission`, `e2e_compos`, `e2e_visuels`, `e2e_eval`, `e2e_codes`, `e2e_passer`, `e2e_install`, `e2e_attente`, `e2e_confirm`, `e2e_v14`, et `e2e_v1` (réglages V1, site de démo sur :8898). Après une modif d'écran, lancer au moins `e2e_barre` et `e2e_nav16`, et vérifier aux 3 tailles : téléphone d'abord, iPad ensuite.

Toute nouvelle fonction ou tout nouveau bug corrigé doit venir avec un test (unitaire pour la logique, navigateur pour l'écran). Si un test échoue, le dire clairement : ne pas l'assouplir pour le faire passer.

## Mise en ligne

Le site est servi par GitHub Pages depuis `main`, racine du dépôt. Le serveur (Apps Script) se déploie à part.

1. Tests au vert, `sh outils/fabriquer-serveur.sh` si `js/core.js` ou `outils/*.gs` ont changé.
2. **Serveur d'abord** quand une nouvelle action serveur arrive : coller le `.gs` fabriqué dans l'éditeur Apps Script, enregistrer, Déployer › Gérer les déploiements › Modifier › Nouvelle version › Déployer (l'adresse `/exec` ne change pas). Vérifier avec `ping`, et qu'une action inconnue répond « Action inconnue ».
3. **Puis le site** : augmenter `?v=N` dans `index.html` (tous les fichiers, sans en oublier), commit, push sur `main`. Le service worker redemande la page au réseau, mais garde les fichiers `?v=N` : sans nouveau `?v=`, les appareils gardent l'ancienne version.
4. Après une modification manuelle de la feuille : lancer `viderCache` dans l'éditeur Apps Script (le serveur garde la feuille 20 min en mémoire).
5. Un onglet de la feuille manquant est recréé tout seul à la première écriture. Ne jamais renommer les onglets ni les colonnes.
6. Toute modif de l'appli en production se fait sur une branche, relue, puis fusionnée dans `main`. Pas de push direct sur `main` pour une modif de l'appli sans accord du propriétaire. Commits au nom de `nicolasgiorgi-cpu`.

## Limites de l'environnement cloud

- Le conteneur d'une session cloud n'atteint ni `github.io` ni `script.google.com`. Les vérifications en ligne et la mise à jour du serveur Apps Script passent par le navigateur intégré de l'appli Claude (bureau), quand la session est liée à l'ordinateur du propriétaire. Une session Code purement cloud ne peut donc **pas** déployer le serveur : préparer le `.gs`, l'écrire dans le compte rendu, et demander une session liée à l'ordinateur pour le déploiement.
- Méthode de déploiement depuis le navigateur : lire le `.gs` sur `raw.githubusercontent.com` depuis la page de l'éditeur, le mettre dans `monaco.editor.getModels()[0].setValue(…)`, vérifier la longueur, cliquer le bouton d'enregistrement (ne pas envoyer cmd+s, ça tape un « s » dans le code), puis déployer. Le code doit d'abord être poussé sur une branche pour être lisible sur `raw.githubusercontent.com`.
- Pour pousser sur GitHub depuis une nouvelle session : attacher d'abord le dépôt à la session avec l'accès en écriture. Le proxy ne permet pas de supprimer une branche.

## Règles d'interface (décisions du propriétaire)

- Aucun effet stylisé (ombres de couleur, texte doublé) sur les éléments d'interface (boutons, étiquettes, éléments très clairs). Seuls les grands titres gardent le style. Pas de dégradé ni de flou en haut de l'écran qui gêne la lecture.
- Téléphone d'abord, tablette bien traitée : la navigation iPad (rail à gauche en paysage, barre en bas en portrait) ne change pas.
- Ne pas complexifier l'interface : elle porte déjà beaucoup de concepts. Passer le téléphone d'un adulte à l'enfant doit rester simple.
- Les éducateurs sont bénévoles et débordés : toute saisie ou validation doit très peu les solliciter, se faire après la séance, en 15 minutes maximum. Les enfants ne voient pas les étoiles Skills avant la fin de l'entraînement.
- Textes pour les enfants : courts, simples, valorisants ; jamais de formulation qui prête à erreur (ex. hors-jeu au ruck : ne jamais parler du pied).
- Une nouveauté annoncée : une entrée en haut de `MC.NEWS`, et mettre à jour l'aide « ? » (`js/v-guide.js`) si le comportement change.

## Contexte produit et suivi (hors dépôt)

Les décisions produit, l'historique des versions et le suivi vivent dans le Projet « Rugby » de claude.ai (docs `claude/mode-champion-*`, dont `claude/mode-champion-mise-en-ligne.md` comme point d'entrée) et dans la mémoire de l'utilisateur. Si ta session y a accès (`project_read`), les lire avant de toucher au produit. Sinon, ce fichier et le README suffisent pour la technique : ne pas inventer de décision produit, la demander.

## En fin de session

- Dire quelle version du site (`?v=`) est en ligne, si le serveur a changé (et sa version de déploiement), et ce qui reste en attente.
- Si la session a accès au Projet : mettre à jour `claude/mode-champion-mise-en-ligne.md` (version du site, version du serveur, décisions prises, points en attente) et, pour une nouvelle version, ajouter un doc court `claude/mode-champion-vNN-….md`. Écrire le doc complet avec `project_write`, sans rien supprimer d'autre.
