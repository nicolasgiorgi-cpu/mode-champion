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
| `js/fiches.js` | Les fiches **Détails et sécurité** (comment faire, erreurs, sécurité) de chaque exo, test et étape |
| `js/routine.js` | L'échauffement et le retour au calme guidés (GO, chrono par étape) |
| `js/suivi.js` | Le suivi : progression d'un bilan à l'autre, détail des séances, progrès du groupe |
| `js/v-*.js` | Les écrans |
| `js/v-bilan.js` | Le bilan guidé (test par test) |
| `js/v-guide.js` | Le guide « Comment ça marche ? » (joueur, parents, éducs) |
| `sw.js` | La copie de l'appli gardée sur l'appareil (elle s'ouvre même quand le réseau traîne) |
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

Pour aller plus vite, le serveur garde une copie de la feuille en mémoire (20 minutes). Si vous modifiez la feuille **à la main** (renommer un éduc, corriger un résultat…), lancez ensuite la fonction `viderCache` dans l'éditeur Apps Script (menu des fonctions › `viderCache` › Exécuter) pour que l'appli voie le changement tout de suite.

**Code admin perdu ?** Dans l'éditeur Apps Script, exécutez la fonction `nouveauCodeAdmin` : le nouveau code s'affiche dans le journal.

**Mettre à jour le serveur** (si `js/core.js` change) : relancez `outils/fabriquer-serveur.sh`, recollez `apps-script/serveur-mode-champion.gs` dans l'éditeur, puis **Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer** (l'URL ne change pas).

## 2. Mettre le site en ligne (GitHub Pages)

1. GitHub Desktop : **File › Add Local Repository…**, choisissez ce dossier. S'il propose « create a repository », acceptez (**Create Repository**).
2. **Publish repository** : décochez **Keep this code private** (GitHub Pages gratuit demande un dépôt public), puis **Publish**.
3. Sur github.com, dans le dépôt : **Settings › Pages** › Source *Deploy from a branch*, Branch `main`, dossier `/ (root)`, **Save**.
4. Après 1 à 2 minutes : `https://<compte>.github.io/mode-champion/`.

Le site n'est pas référencé par les moteurs de recherche (`noindex`). Pour les mises à jour : modifiez les fichiers, **Commit** puis **Push** dans GitHub Desktop.

Sur iPad et téléphone : **Partager › Sur l'écran d'accueil** pour l'ouvrir en plein écran comme une appli. Sur ces écrans tactiles, les champs chiffrés ouvrent le pavé numérique du site (pas le clavier du système).

**Réseau capricieux.** L'appli garde une copie d'elle-même sur l'appareil (`sw.js`) : elle s'ouvre même hors ligne ou quand le réseau traîne (après 3,5 s on prend la copie). Le serveur Google a 15 s pour répondre (une relance automatique pour les lectures et les connexions), sinon un message « Le serveur ne répond pas » et un bouton Réessayer. À l'ouverture, si rien ne démarre au bout de 9 s, l'écran le dit (au lieu d'un écran noir) avec **Réessayer** et **Réparer l'appli**.

**Réparer l'appli** sur un appareil : ouvrir l'adresse du site suivie de `?reset=1` (vide la copie gardée, on reste connecté) ou `?reset=2` (repart de zéro sur cet appareil : il faudra retaper les codes). Si l'icône de l'écran d'accueil reste noire : forcer la fermeture, rouvrir ; sinon supprimer l'icône et la remettre depuis Safari.

**À chaque mise à jour du site**, augmenter le numéro `?v=` dans `index.html` (tous les fichiers) : c'est lui qui dit aux appareils de prendre la nouvelle version.

## 3. Démarrer avec le groupe

1. Espace adultes › **Je suis éduc** › code administrateur.
2. **Ajouter un joueur** pour chaque enfant : le site donne un **code provisoire** à l'enfant (valable 45 jours) et, pour une nouvelle famille, un **code parent** (6 chiffres). Bouton **Copier / partager** pour l'envoyer par WhatsApp. Frères et sœurs : choisissez la famille existante.
3. À la 1re connexion, l'enfant choisit sa couleur et son propre code à 4 chiffres (les codes trop faciles comme 1234 sont refusés).
4. L'enfant fait son **bilan 0** (profil › Saisir mon bilan › **Lancer le bilan guidé** : échauffement puis les 12 tests un par un, avec démo, chrono, compteur et 2 min de repos ; ou le formulaire pour noter directement). Ses niveaux N1-N3 se règlent tout seuls. Un parent ou un éduc confirme les résultats pour qu'ils comptent au classement.
5. Autres éducs : **Les éducs (admin)** › Ajouter un éduc.

**Téléphone partagé** (l'enfant utilise le téléphone ou l'iPad d'un parent) : chaque enfant touche son avatar et tape son code, il reste connecté. « Pas Tom ? Changer de joueur » en haut de la semaine et « J'ai fini » en fin de séance pour passer la main. Si plusieurs enfants utilisent l'appareil, le site demande « C'est bien toi ? » après 30 min sans utilisation. Dès qu'un enfant a utilisé l'appareil, l'espace parent ou éduc se reverrouille (code redemandé après 10 min, ou dès qu'on repasse côté joueur) : un enfant ne peut pas confirmer ses propres résultats. Réglage « Appareil partagé avec un enfant » dans l'espace adulte.

Un éduc qui est aussi parent : dans le vestiaire, **Mon enfant › Choisir**. Son enfant apparaît en haut du vestiaire avec tout le suivi (séances, progression, niveaux, code), sans changer de code. Outils › **Progrès du groupe aux bilans** classe les joueurs test par test selon leur progrès.

Code oublié : le parent (espace parent) ou l'éduc (fiche du joueur) crée un **code provisoire** valable 48 h ; l'enfant choisit ensuite un nouveau code. Ses séances et ses étoiles sont gardées. Après 5 codes faux, le profil se bloque 10 minutes.

Le guide **« Comment ça marche ? »** (bouton **Aide** sur l'écran d'accueil, dans le profil, les réglages et les espaces parent et éduc) explique tout cela aux enfants, aux parents et aux éducs. Ses chiffres (XP, grades, badges, dates) viennent de `js/content.js` et `js/config.js` : il reste juste si on les modifie.

## Les règles du jeu (modifiables dans `js/content.js`)

- **Étoiles** : 1 par jour de la semaine (Cros, Capuozzo, Dupont, Meafou, club du samedi, récup du dimanche), le vendredi est repos. Les 6 étoiles = +1 étoile bonus. Jauge de 56 étoiles par cycle de 8 semaines (14 Espoir · 28 Titulaire · 42 Capitaine · 56 Légende), comme le tableau du mur.
- **XP et grades** : séance à la maison +150, club +50, récup +30, semaine parfaite +200, badge ou palier +100, record battu +50, niveau monté +100. Grades : Recrue, Espoir (1 500), Titulaire (4 000), Capitaine (8 000), International (14 000), Légende (22 000).
- **Niveaux** : réglés par le bilan (seuils de la page 4 du carnet). Le site propose de monter quand c'est « facile » 2 séances de suite, de redescendre quand c'est « dur » 2 fois. Le N4 ne vient jamais du bilan. Les parents (espace parent) et les éducs (fiche du joueur) peuvent les ajuster : bouton **Modifier les niveaux**, puis **Enregistrer** (le changement est noté dans le journal, sans XP).
- **Chronos** : un bip 10 s avant la fin, puis 5-4-3-2-1 et le son de fin. Sur iPhone, les bips passent même en mode silencieux (iOS 17 et plus).
- **Retour** : dans la séance et le bilan guidés, le bouton **Retour** en haut annule le dernier clic (série validée, exo passé, test validé par erreur).
- **Badges** (17, en 3 familles) : **exploit** (les 7 défis du tableau du mur, au bilan ou en « défi » avec un adulte qui confirme, + Champion : un exo réussi en N4) ; **séances** (Bras d'acier, Turbo, Infatigable, Jambes de fer : 10 / 25 / 40 séances du même jour = bronze / argent / or) ; **régularité** (Première étoile, Semaine parfaite, Série de 7, Fidèle, Légende). Chaque badge ou palier rapporte +100 XP.
- **Classement** : par épreuve du bilan, entre joueurs du même niveau sur cette épreuve (ligue élargie aux niveaux voisins s'il y a moins de 5 joueurs), en « meilleur score » ou « plus gros progrès ». Seuls les résultats confirmés par un adulte comptent. Les parents peuvent masquer leur enfant du classement.

## Données

Uniquement des prénoms et des résultats sportifs, dans votre Google Sheet. Pas d'adresse e-mail, pas de nom de famille obligatoire. Les vidéos viennent de YouTube (mode sans cookie) et restent la propriété de leurs auteurs ; pour en changer une, remplacez son identifiant (`video:` dans `js/content.js`).
