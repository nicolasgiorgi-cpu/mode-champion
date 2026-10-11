# Mode champion · M12

Le site de préparation physique des M12 : les exercices du carnet de champion en ligne, la séance guidée exo par exo (chrono, compteur, bips), les étoiles, les grades, les badges, le classement par ligue, le bilan, et les espaces parents et éducs.

Site statique (HTML/CSS/JS, rien à installer) + une Google Sheet qui sert de base de données (via Google Apps Script).

- Téléphone d'abord, et adapté à l'iPad (portrait pour naviguer, paysage pour la séance guidée).
- Tant que `js/config.js` n'a pas d'adresse de serveur, le site tourne en **MODE DÉMO** : joueurs fictifs, rien n'est envoyé.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page |
| `css/style.css` | Le style |
| `js/content.js` | **Le programme** : exercices, doses N1 à N4, vidéos, tests du bilan, badges, grades, XP |
| `js/config.js` | **Les réglages** : adresse du serveur, dates des cycles et des bilans |
| `js/core.js` | Le cœur du serveur (codes, séances, records), utilisé aussi par le mode démo |
| `js/logic.js` | Les règles du jeu (étoiles, série, XP, badges, niveaux, ligues) |
| `js/anims.js` | Les animations des exercices |
| `js/v-*.js` | Les écrans |
| `apps-script/serveur-mode-champion.gs` | **Le serveur à coller dans Google Apps Script** (un seul fichier) |

## 1. Brancher la Google Sheet (10 minutes, une seule fois)

1. Dans Google Drive : **Nouveau › Google Sheets**, nommez-la par exemple « Mode champion M12 — données ».
2. Dans la feuille : menu **Extensions › Apps Script**.
3. Dans l'éditeur : effacez tout le contenu de `Code.gs`, puis collez **tout** le contenu du fichier `apps-script/serveur-mode-champion.gs`. Cliquez sur l'icône disquette (Enregistrer).
4. En haut, choisissez la fonction **`installer`** puis **▶ Exécuter**. Google demande l'autorisation : **Examiner les autorisations**, choisissez votre compte, puis **Paramètres avancés › Accéder au projet (non sécurisé)** (c'est votre propre script) et **Autoriser**.
5. En bas, dans le **Journal d'exécution**, notez le **code administrateur** (6 chiffres). C'est votre code éduc.
6. En haut à droite : **Déployer › Nouveau déploiement**. Icône roue dentée › **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - **Déployer**, puis copiez l'**URL de l'application Web** (elle finit par `/exec`).
7. Collez cette URL dans `js/config.js` : `API_URL: 'https://script.google.com/macros/s/…/exec',` (ou envoyez-la à Claude).

La feuille contient ensuite un onglet par table (`joueurs`, `familles`, `educs`, `seances`, `records`, `journal`). Ne renommez pas les onglets ni les colonnes. Les codes y sont stockés chiffrés (empreintes), jamais en clair.

**Code admin perdu ?** Dans l'éditeur Apps Script, exécutez la fonction `nouveauCodeAdmin` : le nouveau code s'affiche dans le journal.

**Mettre à jour le serveur** (si `js/core.js` change) : relancez `outils/fabriquer-serveur.sh`, recollez `apps-script/serveur-mode-champion.gs` dans l'éditeur, puis **Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer** (l'URL ne change pas).

## 2. Mettre le site en ligne (GitHub Pages)

1. GitHub Desktop : **File › Add Local Repository…**, choisissez ce dossier. S'il propose « create a repository », acceptez (**Create Repository**).
2. **Publish repository** : décochez **Keep this code private** (GitHub Pages gratuit demande un dépôt public), puis **Publish**.
3. Sur github.com, dans le dépôt : **Settings › Pages** › Source *Deploy from a branch*, Branch `main`, dossier `/ (root)`, **Save**.
4. Après 1 à 2 minutes : `https://<compte>.github.io/mode-champion/`.

Le site n'est pas référencé par les moteurs de recherche (`noindex`). Pour les mises à jour : modifiez les fichiers, **Commit** puis **Push** dans GitHub Desktop.

Sur iPad et téléphone : **Partager › Sur l'écran d'accueil** pour l'ouvrir en plein écran comme une appli.

## 3. Démarrer avec le groupe

1. Espace adultes › **Je suis éduc** › code administrateur.
2. **Ajouter un joueur** pour chaque enfant : le site donne un **code provisoire** à l'enfant (valable 45 jours) et, pour une nouvelle famille, un **code parent** (6 chiffres). Bouton **Copier / partager** pour l'envoyer par WhatsApp. Frères et sœurs : choisissez la famille existante.
3. À la 1re connexion, l'enfant choisit sa couleur et son propre code à 4 chiffres (les codes trop faciles comme 1234 sont refusés).
4. L'enfant saisit son **bilan 0** (profil › Saisir mon bilan) : ses niveaux N1-N3 se règlent tout seuls. Un parent ou un éduc confirme les résultats pour qu'ils comptent au classement.
5. Autres éducs : **Les éducs (admin)** › Ajouter un éduc.

Code oublié : le parent (espace parent) ou l'éduc (fiche du joueur) crée un **code provisoire** valable 48 h ; l'enfant choisit ensuite un nouveau code. Ses séances et ses étoiles sont gardées. Après 5 codes faux, le profil se bloque 10 minutes.

## Les règles du jeu (modifiables dans `js/content.js`)

- **Étoiles** : 1 par jour de la semaine (Cros, Capuozzo, Dupont, Meafou, club du samedi, récup du dimanche), le vendredi est repos. Les 6 étoiles = +1 étoile bonus. Jauge de 56 étoiles par cycle de 8 semaines (14 Espoir · 28 Titulaire · 42 Capitaine · 56 Légende), comme le tableau du mur.
- **XP et grades** : séance à la maison +150, club +50, récup +30, semaine parfaite +200, badge ou palier +100, record battu +50, niveau monté +100. Grades : Recrue, Espoir (1 500), Titulaire (4 000), Capitaine (8 000), International (14 000), Légende (22 000).
- **Niveaux** : réglés par le bilan (seuils de la page 4 du carnet). Le site propose de monter quand c'est « facile » 2 séances de suite, de redescendre quand c'est « dur » 2 fois. Le N4 ne vient jamais du bilan. Les éducs peuvent ajuster un niveau dans la fiche du joueur.
- **Badges** (17, en 3 familles) : **exploit** (les 7 défis du tableau du mur, au bilan ou en « défi » avec un adulte qui confirme, + Champion : un exo réussi en N4) ; **séances** (Bras d'acier, Turbo, Infatigable, Jambes de fer : 10 / 25 / 40 séances du même jour = bronze / argent / or) ; **régularité** (Première étoile, Semaine parfaite, Série de 7, Fidèle, Légende). Chaque badge ou palier rapporte +100 XP.
- **Classement** : par épreuve du bilan, entre joueurs du même niveau sur cette épreuve (ligue élargie aux niveaux voisins s'il y a moins de 5 joueurs), en « meilleur score » ou « plus gros progrès ». Seuls les résultats confirmés par un adulte comptent. Les parents peuvent masquer leur enfant du classement.

## Données

Uniquement des prénoms et des résultats sportifs, dans votre Google Sheet. Pas d'adresse e-mail, pas de nom de famille obligatoire. Les vidéos viennent de YouTube (mode sans cookie) et restent la propriété de leurs auteurs ; pour en changer une, remplacez son identifiant (`video:` dans `js/content.js`).
