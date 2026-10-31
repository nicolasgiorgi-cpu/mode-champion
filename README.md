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
| `js/accueil.js` | L'accueil des nouveaux : visites (joueur, parent, éduc), listes « premiers pas », astuces |
| `js/nouveautes.js` | **Les nouveautés** : une entrée par nouvelle fonction (voir plus bas) |
| `js/notifs.js` | **La cloche** (notifications) : les événements de chaque profil, lu / non lu, réglages ; tout est calculé sur l'appareil |
| `js/v-notifs.js` | La cloche dans la barre du haut, la liste des notifications et ses réglages (dont « Alertes sur ce téléphone ») |
| `js/alertes.js` | **Les alertes sur l'écran du téléphone** (v34) : permission, jeton Firebase, abonnement au serveur (voir plus bas) |
| `js/missions.js` | **Les missions spéciales** (dates, textes) et le test « Aide-moi à choisir » |
| `js/postes-data.js` | Les 7 cartes postes de la mission « Prépare le jeu à 10 » (reprises du site « Choisis ton poste ») |
| `js/v-mission.js` | Les écrans de la mission « Prépare le jeu à 10 » (joueur), sa vue éduc et parent |
| `js/competences.js` | **Les Skills** : 4 domaines × 5 étoiles (noms, phrases pour l'enfant, conseils), grades des cartes, +1 |
| `js/v-missions.js` | Les onglets **Missions** et **Skills** de l'enfant et du parent (missions du groupe, mission perso, +1 et mots, cartes Skills) |
| `js/v-educ.js` | Côté éduc : **+1** et mots, **valider des étoiles** (pendant une séance ou journée d'évaluation), **missions** (vidéo, QCM, mission perso) |
| `js/compos.js` | **Les règles des compos** : fiche terrain, historique, proposition automatique, indicateurs, alertes |
| `js/v-compos.js` | Les onglets éduc **Entraîn.** et **Plateaux** : événements et présents, tableau de compo, 2 versions et vote, contre-propositions, fiche terrain et historique |
| `sw.js` | La copie de l'appli gardée sur l'appareil (elle s'ouvre même quand le réseau traîne) ; affiche les alertes du téléphone |
| `apps-script/serveur-mode-champion.gs` | **Le serveur à coller dans Google Apps Script** |
| `apps-script/spond.gs` | La synchro Spond : 2e fichier du projet Apps Script, à ajouter seulement pour brancher Spond (voir plus bas) |

## 1. Brancher la Google Sheet (10 minutes, une seule fois)

1. Dans Google Drive : **Nouveau › Google Sheets**, nommez-la par exemple « Mode champion M12 — données ».
2. Dans la feuille : menu **Extensions › Apps Script**.
3. Dans l'éditeur : effacez tout le contenu de `Code.gs`, puis collez **tout** le contenu du fichier `apps-script/serveur-mode-champion.gs`. Cliquez sur l'icône disquette (Enregistrer).
4. En haut, choisissez la fonction **`installer`** puis **▶ Exécuter**. Google demande l'autorisation : **Examiner les autorisations**, choisissez votre compte, puis **Paramètres avancés › Accéder au projet (non sécurisé)** (c'est votre propre script) et **Autoriser**.
5. En bas, dans le **Journal d'exécution**, notez le **code provisoire administrateur** (4 chiffres). Dans l'appli : Adultes › Je suis éduc › votre nom, puis ce code ; vous choisissez ensuite votre propre code.
6. En haut à droite : **Déployer › Nouveau déploiement**. Icône roue dentée › **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - **Déployer**, puis copiez l'**URL de l'application Web** (elle finit par `/exec`).
7. Collez cette URL dans `js/config.js` : `API_URL: 'https://script.google.com/macros/s/…/exec',` (ou envoyez-la à Claude).

La feuille contient ensuite un onglet par table (`joueurs`, `familles`, `educs`, `seances`, `records`, `journal`, `missions`, `terrain`, `evenements`, `compos`, `avis`, `etoiles`, `encouragements`, `defmissions`). Un onglet ajouté par une nouvelle version (comme `missions` ou `compos`) se crée tout seul à la première écriture. Ne renommez pas les onglets ni les colonnes. Les codes y sont stockés chiffrés (empreintes), jamais en clair.

Pour aller plus vite, le serveur garde une copie de la feuille en mémoire (20 minutes). Si vous modifiez la feuille **à la main** (renommer un éduc, corriger un résultat…), lancez ensuite la fonction `viderCache` dans l'éditeur Apps Script (menu des fonctions › `viderCache` › Exécuter) pour que l'appli voie le changement tout de suite.

**Code admin perdu ?** Dans l'éditeur Apps Script, exécutez la fonction `nouveauCodeAdmin` : un code provisoire (4 chiffres) s'affiche dans le journal.

**Mettre à jour le serveur** (si `js/core.js` change) : relancez `outils/fabriquer-serveur.sh`, recollez `apps-script/serveur-mode-champion.gs` dans l'éditeur, puis **Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer** (l'URL ne change pas).

**Alertes sur l'écran du téléphone** (v34, facultatif : sans elles, la cloche marche quand même). Elles passent par **Firebase Cloud Messaging** (gratuit), qui sait joindre iPhone (iOS 16.4 ou plus, appli sur l'écran d'accueil), Android et ordinateurs. Une seule fois, **le propriétaire du script** :
1. Sur console.firebase.google.com : un projet, une **appli Web** (sans Hosting) ; Paramètres du projet › Cloud Messaging › **Certificats Web push › Générer** (la clé « VAPID »).
2. Paramètres du projet › Comptes de service › **Générer une nouvelle clé privée** (fichier .json).
3. Éditeur Apps Script › Paramètres du projet › **Propriétés du script** : `FCM_CLE` = tout le contenu du fichier .json (puis supprimez le fichier) ; `FCM_WEB` = `{"apiKey":"…","authDomain":"…","projectId":"…","messagingSenderId":"…","appId":"…","vapidKey":"…"}` (la configuration de l'appli Web et la clé VAPID). Rien de tout ça dans ce dépôt public : l'appli lit `FCM_WEB` par l'action `pushConfig`.
4. Fonction **`verifierAlertes`** › Exécuter : « ✅ Firebase accepte la clé » (rien n'est envoyé). Google peut demander l'autorisation « se connecter à un service externe ».

Ensuite, chacun allume **Alertes sur ce téléphone** en haut des réglages de la cloche, sur son appareil. Le serveur garde l'appareil (onglet `push` : rôle, profil, jeton, sortes) et, après une action qui intéresse quelqu'un, envoie une alerte courte (`ALERTES` dans `js/core.js` : le prénom de l'enfant, jamais un résultat chiffré, ni le mot d'un enfant, ni ses copains) ; au plus une par appareil et par sorte toutes les 10 minutes ; un appareil qui ne répond plus est désactivé. Les sortes sont celles de la cloche : en éteindre une l'éteint aussi sur le téléphone. **Pastille** (v35) : un chiffre sur l'icône de l'appli (`navigator.setAppBadge`) = les nouveautés de la cloche du profil affiché ; `sw.js` ajoute 1 à chaque alerte (petit cache `pastille`), l'appli remet le vrai nombre en s'ouvrant. Se déconnecter (parent, éduc) éteint les alertes de ce profil sur l'appareil.

**Brancher Spond** (facultatif : sans Spond, les éducs ajoutent les événements à la main) — le mode d'emploi complet est en tête de `apps-script/spond.gs`.
Une seule fois, **le propriétaire du script** :
1. Dans l'éditeur Apps Script : **+** à côté de Fichiers › **Script**, nommez-le `spond`, collez `apps-script/spond.gs`, enregistrez.
2. Fonction **`autoriserSpond`** › Exécuter : Google demande deux autorisations de plus (se connecter à un service externe, gérer les déclencheurs) : Autoriser.
3. **Déployer › Gérer les déploiements › crayon › Nouvelle version › Déployer** (sinon l'appli ne voit ni le fichier ni les autorisations).

Ensuite, **dans l'appli** : l'engrenage (Réglages) › **Spond**. Un éduc **administrateur** tape lui-même l'e-mail et le mot de passe de **son** compte Spond (actions `spondConnexion`, `spondCategories`, `spondDeconnexion`). Spond vérifie le mot de passe ; il est alors gardé seulement dans les propriétés du script (`SPOND_EMAIL`, `SPOND_MDP`) : jamais dans la feuille, jamais renvoyé au navigateur, jamais dans un message ; l'appli n'affiche que l'e-mail masqué (`spondCompte`). La synchro tourne tout de suite puis toutes les heures (déclencheur `synchroSpond`). « Débrancher » efface l'e-mail, le mot de passe, les catégories et le déclencheur.

**Catégories** : l'appli suit les sous-groupes Spond dont ce compte est **coach** (son propre membre Spond, pas comme parent, en fait partie ; ou un champ du genre « admins » le cite) ; s'il n'en coache aucun, celui qui s'appelle « M12 ». L'admin change ce choix dans l'engrenage › Spond (propriété `SPOND_SOUS_GROUPES`). Les **adultes** des groupes (rôle, propre profil sans parent rattaché, ou soi-même) ne sont ni reliés à des joueurs, ni listés comme « inscrits sans joueur ». Chaque événement garde sa catégorie (colonne `categorie`), affichée quand plusieurs catégories sont suivies. Les enfants Spond pas encore dans l'appli apparaissent dans **Ajouter un joueur › Depuis Spond** : un geste crée le joueur (famille « Famille Nom », reprise si elle existe déjà), ses codes, et le relie à Spond.
Lecture seule : événements de J-30 à J+60 et réponses (oui, non, sans réponse). Les enfants sont reliés aux joueurs par le prénom (et l'initiale du nom pour les homonymes) ; un lien se corrige sur la fiche du joueur (Sur le terrain › Spond). Sans l'appli : remplir `SPOND_EMAIL` / `SPOND_MDP` dans Paramètres du projet › Propriétés du script et lancer `brancherSpond` ; `debrancherSpond` arrête la synchro. API non officielle (celle du site spond.com) : elle peut changer.

## 2. Mettre le site en ligne (GitHub Pages)

1. GitHub Desktop : **File › Add Local Repository…**, choisissez ce dossier. S'il propose « create a repository », acceptez (**Create Repository**).
2. **Publish repository** : décochez **Keep this code private** (GitHub Pages gratuit demande un dépôt public), puis **Publish**.
3. Sur github.com, dans le dépôt : **Settings › Pages** › Source *Deploy from a branch*, Branch `main`, dossier `/ (root)`, **Save**.
4. Après 1 à 2 minutes : `https://<compte>.github.io/mode-champion/`.

Le site n'est pas référencé par les moteurs de recherche (`noindex`). Pour les mises à jour : modifiez les fichiers, **Commit** puis **Push** dans GitHub Desktop.

Sur iPad et téléphone : **Partager › Sur l'écran d'accueil** pour l'ouvrir en plein écran comme une appli (iOS 26 : laisser **Ouvrir comme web app** activé, sinon l'icône ouvre Safari avec sa barre en bas). Sur ces écrans tactiles, les champs chiffrés ouvrent le pavé numérique du site (pas le clavier du système).

**Réseau capricieux.** L'appli garde une copie d'elle-même sur l'appareil (`sw.js`) : elle s'ouvre même hors ligne ou quand le réseau traîne (après 3,5 s on prend la copie). Le serveur Google a 15 s pour répondre (une relance automatique pour les lectures et les connexions), sinon un message « Le serveur ne répond pas » et un bouton Réessayer. À l'ouverture, si rien ne démarre au bout de 9 s, l'écran le dit (au lieu d'un écran noir) avec **Réessayer** et **Réparer l'appli**.

**Réparer l'appli** sur un appareil : ouvrir l'adresse du site suivie de `?reset=1` (vide la copie gardée, on reste connecté) ou `?reset=2` (repart de zéro sur cet appareil : il faudra retaper les codes). Si l'icône de l'écran d'accueil reste noire : forcer la fermeture, rouvrir ; sinon supprimer l'icône et la remettre depuis Safari. Une nouvelle icône d'appli n'arrive sur iPhone qu'en retirant l'appli de l'écran d'accueil pour la remettre (iOS fige l'icône à l'ajout) ; depuis la v39, la nouvelle icône arrive dès le premier ajout (elle suit le `?v=` du site).

**À chaque mise à jour du site**, augmenter le numéro `?v=` dans `index.html` (tous les fichiers) : c'est lui qui dit aux appareils de prendre la nouvelle version.

**Navigation.** Partout la même : en haut, le bouton Retour et l'aide « ? » ; en bas, 4 onglets de couleur (joueur : **Prépa · Missions · Skills · Moi** ; parent : **Prépa · Missions · Skills · Plus** ; éduc : **Entraîn. · Plateaux · Progrès · Enfants**, et l'engrenage en haut pour les réglages). Prépa regroupe la semaine, les bilans, les niveaux et le classement (sous-onglets) ; chaque onglet se souvient de son dernier sous-onglet. Sur iPad en paysage, les onglets passent sur le côté.
**Retour (depuis le 29/10, v32)** : sur tous les écrans, un vrai « précédent » (`MC.app.back`, `js/app.js`) : chaque entrée de l'historique du navigateur porte un identifiant (`history.state.mc`), la liste des écrans est gardée le temps de l'onglet (`sessionStorage` `mc-hist`) avec, pour chacun, le défilement et les volets ouverts, rétablis au retour. Retour saute les écrans de passage (connexion, codes, bravo, séance et bilan guidés, visite), ne revient jamais dans l'espace d'un autre profil ni d'un autre joueur, et sinon remplace l'écran par son écran parent (option `back` de `ui.topbar`) ou l'accueil de l'espace ; il est grisé quand on y est déjà. Un lien vers le même écran (onglet de la fiche, filtre, partie) remplace l'écran au lieu d'en empiler un. **Tirer pour actualiser** : tout en haut d'un écran de données, tirer vers le bas puis lâcher redemande tout au serveur (`MC.app.onRefresh` pour brancher d'autres données ; pas sur les formulaires, la connexion, les séances et bilans guidés : `NOPULL`). Plus aucune bande qui défile de côté (fiche d'un enfant, épreuves du classement, passeport Skills).

**Annoncer une nouveauté.** Ajouter une entrée en haut de `MC.NEWS` dans `js/nouveautes.js` : `id` (unique), `date`, `pour` (`k` joueur, `f` parent, `e` éduc), `titre`, `texte` (une phrase) et, si utile, `lien` (l'écran à ouvrir). À l'ouverture suivante, chacun voit « Quoi de neuf ? » (3 au plus, une seule fois) ; l'historique est dans Réglages (joueur), Plus (parent), l'engrenage (éduc). Les nouveaux inscrits ne voient pas les anciennes nouveautés : ils ont la visite.

## 3. Démarrer avec le groupe

1. Espace adultes › **Je suis éduc** › code administrateur.
2. **Ajouter un joueur** pour chaque enfant : le site donne un **code provisoire** à l'enfant (valable 45 jours) et, pour une nouvelle famille, un **code parent provisoire** (4 chiffres, 30 jours). Bouton **Copier / partager** pour l'envoyer par WhatsApp. Frères et sœurs : choisissez la famille existante.
3. À la 1re connexion, l'enfant choisit sa couleur et son propre code à 4 chiffres. Les adultes aussi : **tous les codes font 4 chiffres**, sans règle « code trop simple ». Un adulte se connecte en touchant son nom (éduc) ou le prénom de son enfant (parent), puis son code ; après 5 codes faux, l'accès se bloque 10 minutes. Nouveaux codes provisoires pour tous les adultes : fonction `nouveauxCodesAdultes` de l'éditeur Apps Script (liste dans le journal).
4. L'enfant fait son **bilan 0** (profil › Saisir mon bilan › **Lancer le bilan guidé** : échauffement puis les 12 tests un par un, avec démo, chrono, compteur et 2 min de repos ; ou le formulaire pour noter directement). Ses niveaux N1-N3 se règlent tout seuls. Un parent ou un éduc confirme les résultats pour qu'ils comptent au classement.
5. Autres éducs : **Les éducs (admin)** › Ajouter un éduc.

**Téléphone partagé** (l'enfant utilise le téléphone ou l'iPad d'un parent) : chaque enfant touche son avatar et tape son code, il reste connecté. « Pas Tom ? Changer de joueur » en bas de la semaine et « J'ai fini » en fin de séance pour passer la main. Si plusieurs enfants utilisent l'appareil, le site demande « C'est bien toi ? » après 30 min sans utilisation. Dès qu'un enfant a utilisé l'appareil, l'espace parent ou éduc se reverrouille quand on revient de l'espace joueur (code redemandé) : un enfant ne peut pas confirmer ses propres résultats. En rouvrant l'appli, on retrouve le dernier profil utilisé (enfant, parent ou éduc), sans code (v33). Réglage « Appareil partagé avec un enfant » dans l'espace adulte.

Un éduc qui est aussi parent : l'engrenage › **Mon enfant**. Son enfant apparaît en premier dans Enfants (et ses résultats à confirmer dans Progrès), avec tout le suivi (séances, progression, niveaux, code), sans changer de code. Progrès › **Progrès du groupe aux bilans** classe les joueurs test par test selon leur progrès.

Code oublié : le parent (espace parent) ou l'éduc (fiche du joueur) crée un **code provisoire** valable 48 h ; l'enfant choisit ensuite un nouveau code. Ses séances et ses étoiles sont gardées. Après 5 codes faux, le profil se bloque 10 minutes.

Le guide **« Comment ça marche ? »** (bouton **Aide** sur l'écran d'accueil, dans le profil, les réglages et les espaces parent et éduc) explique tout cela aux enfants, aux parents et aux éducs. Ses chiffres (XP, grades, badges, dates) viennent de `js/content.js` et `js/config.js` : il reste juste si on les modifie.

## Les règles du jeu (modifiables dans `js/content.js`)

- **Étoiles** : 1 par jour de la semaine (Cros, Capuozzo, Dupont, Meafou, club du samedi, récup du dimanche), le vendredi est repos. Les 6 étoiles = +1 étoile bonus. Jauge de 56 étoiles par cycle de 8 semaines (14 Espoir · 28 Titulaire · 42 Capitaine · 56 Légende), comme le tableau du mur.
- **XP et grades** : séance à la maison +150, club +50, récup +30, semaine parfaite +200, badge ou palier +100, record battu +50, niveau monté +100, mission spéciale +200. Grades : Recrue, Espoir (1 500), Titulaire (4 000), Capitaine (8 000), International (14 000), Légende (22 000).
- **Niveaux** : réglés par le bilan (seuils de la page 4 du carnet). Le site propose de monter quand c'est « facile » 2 séances de suite, de redescendre quand c'est « dur » 2 fois. Le N4 ne vient jamais du bilan. Les parents (espace parent) et les éducs (fiche du joueur) peuvent les ajuster : bouton **Modifier les niveaux**, puis **Enregistrer** (le changement est noté dans le journal, sans XP).
- **Chronos** : un bip 10 s avant la fin, puis 5-4-3-2-1 et le son de fin. Sur iPhone, les bips passent même en mode silencieux (iOS 17 et plus).
- **Retour** : dans la séance et le bilan guidés, le bouton **Retour** en haut annule le dernier clic (série validée, exo passé, test validé par erreur).
- **Missions spéciales** (`js/missions.js`) : une chose à faire une seule fois, dans l'onglet **Missions** (pastille sur l'onglet, bandeau « Nouveau dans Missions » une fois sur Prépa) tant qu'elle n'est pas faite. Récompense : +200 XP et un badge (famille **missions**). 1re mission, **« Prépare le jeu à 10 »** : choisir 1 à 3 postes (les 7 cartes et le test « Aide-moi à choisir » du site « Choisis ton poste »), puis ses copains, sans limite. **Les copains sont secrets** : seuls l'enfant et les éducs les voient (jamais les parents ni les autres enfants). Les éducs ont tout dans Progrès › Missions › « Prépare le jeu à 10 » et dans la fiche de chaque joueur (onglet Terrain).
- **Reprise de l'ancien site « Choisis ton poste »** : dans Google Forms (formulaire « M12 - 26/27 - Choix de postes ») › Réponses › Associer à Sheets › **feuille existante** = la feuille de l'appli. Les réponses arrivent alors dans un onglet de cette feuille ; le bouton **Reprendre les réponses du formulaire** (Progrès › Missions › « Prépare le jeu à 10 ») ou la fonction `reprendreChoixDePostes` de l'éditeur les reprend (prénom + initiale du nom pour les homonymes ; la dernière réponse compte ; un enfant qui a déjà choisi dans l'appli garde ses choix).
- **Compos des plateaux** (éducs, onglets **Plateaux** et **Entraîn.** ; la page d'un événement résume les présents et la compo, les présents se corrigent sur leur propre page) : la **fiche terrain** de chaque joueur (niveau A Confirmés / B Débrouillés / C Débutants, passerelle vers le niveau voisin, plaquage sur 5 étoiles, poste principal + autres postes ; sans poste réglé, les vœux de la mission), réglée par les éducs ; les **événements** (Spond ou à la main) et leurs présents ; **Préparer la compo** : format (jeu à 5 ou à 10), nombre d'équipes par niveau, puis une **proposition automatique** (`js/compos.js` : les passerelles comblent les écarts d'effectif, d'abord celles qui attendent leur tour ; serpentin par étoiles de plaquage puis échanges qui équilibrent plaquage, effectifs, copains et, au jeu à 10, postes). Trois styles : Équilibrée, Copains d'abord, Niveaux stricts (`STYLES`). On ajuste en touchant un joueur puis son équipe. Chaque équipe est rangée en **avants** (piliers, talonneur, 3es lignes) puis **arrières** (9, 10, centres, ailiers) — « Av » / « Ar » (`sections`) ; au jeu à 10, chacun a un poste pour le plateau (son poste principal d'abord). **Composer à la main** : toucher une équipe ou une place vide (+) ouvre la liste des joueurs, les mieux adaptés d'abord ; au jeu à 10, place par place dans l'ordre des postes. **Deux versions côte à côte** (V1 | V2, niveaux empilés) : on publie celle qu'on préfère ou on les soumet **au vote des éducs** (`voteCompo` : la majorité des éducs actifs l'emporte ; `cloreVote` : l'auteur, un admin ou le jour J départage). **Un éduc suffit** : la compo publiée est celle du plateau ; un autre éduc peut faire une **contre-proposition** (déplacements + pourquoi), que l'auteur accepte ou refuse ; le jour J, tout éduc corrige directement. **Entraînements** (`proposerEnt`) : une compo par partie (`partie` = `ateliers` puis `matchs`, colonne `partie` de l'onglet `compos`) ; ateliers par niveau (tranches successives coupées aux limites de niveau, `tranches`) ou équilibrés (niveaux mélangés, plaquage et avants / arrières équilibrés), avants et arrières ensemble ou séparés ; matchs par niveau (le match 1 réunit les plus avancés) ou équilibrés, 1 ou 2 matchs (Équipe 1 contre Équipe 2, Équipe 3 contre Équipe 4 ; tout le monde en chasubles) ; depuis la v35, **les matchs se jouent avec des postes** comme les plateaux à 10 (`reglages.format` = 10 pour la partie `matchs` ; chacun reçoit le poste de sa fiche d'abord, les places vides vont à ceux qui restent, `apparier(…, remplir)` ; un éduc donne à un enfant n'importe quel poste pour ce match ; un enfant sans aucun poste — ni fiche, ni vœux — n'est jamais placé d'office : « Sans poste » en orange, partie à part de l'équipe et alerte `sansposte`, décision de Nicolas le 31/10) ; « Reprendre » repart du dernier entraînement (`reprendre`). Les groupes d'entraînement comptent aussi dans l'historique (passerelles : un groupe ou un match de niveau au-dessus ; copains), chaque ligne garde son origine (`sorte` : plateau, ateliers, matchs) et la fiche du joueur l'affiche par plateaux, par entraînements ou en tout. Toutes les fenêtres ont une croix en haut et leurs boutons toujours visibles ; elles se ferment au bouton Retour. `tests/e2e_barre.py` vérifie la barre du haut sur tous les écrans. Après le plateau, la compo devient l'historique sur la fiche du joueur (niveaux et postes joués, copains avec le nombre de fois, ceux avec qui il n'a pas encore joué, passages dans l'autre niveau). Repères de plaquage (proposés, l'appli prévient sans interdire) : 3 étoiles pour B, 4 pour A (`SEUIL` dans `js/compos.js`). Jeu à 10 : 2 piliers, 1 talonneur, 2 troisièmes lignes, 9, 10, 1 centre, 2 ailiers (`POSTES10`, décidé le 20/10). **Répartition des postes** (v35, `K.repartition` + `graphePostes` dans `js/v-compos.js`) : un graphique replié (barre pleine = poste principal réglé sur la fiche, pâle = peut aussi jouer ; les vœux ne comptent pas) dans Enfants › Niveaux et postes (il suit le filtre Tous / Sans niveau / A / B / C, sur une ligne ; « Sans niveau » disparaît quand tout le monde a son niveau), et pour les présents avant un plateau et avant les matchs (Tous / A / B / C).
- **Missions des éducs, +1 et Skills** (onglets **Missions** et **Skills** ; côté éduc : Progrès › Missions et Progrès › Skills, et sur la fiche de chaque enfant). **Skills** (`js/competences.js`) : 4 cartes (Plaquage, Passe, Ruck, Jeu au pied) de 5 étoiles indépendantes ; chaque étoile gagnée fait monter la carte d'un grade (À débloquer, Bronze, Argent, Or, Diamant, Légende) et rapporte +100 XP. Seuls les éducs valident une étoile (`validerEtoiles`) : pendant une séance (les présents du jour) ou en **journée d'évaluation** (3 essais par critère, l'étoile à 2 réussis sur 3) ; une étoile validée par erreur se retire (`retirerEtoile`). **Mission perso** : une étoile à aller chercher, donnée par un éduc à un enfant (une à la fois, `defMission` sorte `etoile`). **+1** (`plusUn`) : un éduc encourage un enfant sur sa mission perso, avec ou sans mot (5 au plus par mission) ; au 3e, l'appli propose de valider l'étoile, sans rien faire toute seule. Un éduc peut aussi laisser un **mot** sans mission. **Missions du groupe** : une vidéo (YouTube) suivie de questions, ou un QCM (`repondreMission` : les premières réponses comptent, XP au score). Les parents suivent tout, sans donner de +1. Pas de classement des Skills entre enfants : le classement reste par épreuve du bilan.
- **Badges** (19, en 4 familles) : **exploit** (les 7 défis du tableau du mur, au bilan ou en « défi » avec un adulte qui confirme, + Champion : un exo réussi en N4) ; **séances** (Bras d'acier, Turbo, Infatigable, Jambes de fer : 10 / 25 / 40 séances du même jour = bronze / argent / or) ; **régularité** (Première étoile, Semaine parfaite, Série de 7, Fidèle, Légende) ; **missions** (Prêt pour le jeu à 10 = mission « Choisis ton poste », Esprit d'équipe = mission « Avec qui tu aimes jouer »). Chaque badge ou palier rapporte +100 XP.
- **Classement** : par épreuve du bilan, entre joueurs du même niveau sur cette épreuve (ligue élargie aux niveaux voisins s'il y a moins de 5 joueurs), en « meilleur score » ou « plus gros progrès ». Seuls les résultats confirmés par un adulte comptent. Les parents peuvent masquer leur enfant du classement.

## Données

Uniquement des prénoms et des résultats sportifs, dans votre Google Sheet. Pas d'adresse e-mail, pas de nom de famille obligatoire. Les vidéos viennent de YouTube (mode sans cookie) et restent la propriété de leurs auteurs ; pour en changer une, remplacez son identifiant (`video:` dans `js/content.js`).

## Tests (pour la maintenance)

Le dossier `tests/` contient les tests automatiques (aucun vrai code dedans : ils tournent en mode démo ou sur un faux serveur).
Les chemins supposent le site dans `/home/claude/mode-champion` et les tests dans `/home/claude/tests` :

```sh
git clone https://github.com/nicolasgiorgi-cpu/mode-champion /home/claude/mode-champion
cp -r /home/claude/mode-champion/tests /home/claude/tests
cd /home/claude/mode-champion && sh outils/fabriquer-serveur.sh   # le faux serveur charge le .gs fabriqué
node /home/claude/tests/test_logic.js && node /home/claude/tests/test_core.js && node /home/claude/tests/test_mission.js
node /home/claude/tests/test_compos.js && node /home/claude/tests/test_compos_core.js   # compos (règles, serveur, Spond simulé)
node /home/claude/tests/test_skills_core.js                         # Skills, +1, missions des éducs (serveur)
node /home/claude/tests/test_codes_adultes.js                       # codes adultes : nom puis 4 chiffres, provisoires, blocage
python3 /home/claude/tests/e2e_spond.py 390 844                    # Réglages › Spond et « Depuis Spond » (mode démo)
python3 /home/claude/tests/e2e_barre.py 390 844                    # la barre du haut sur tous les écrans
python3 /home/claude/tests/e2e_v14.py 390 844                      # Playwright, site servi en local (voir mkdemo.sh)
python3 /home/claude/tests/e2e_mission.py 390 844                  # la mission « Prépare le jeu à 10 » (joueur, parent, éduc)
python3 /home/claude/tests/e2e_compos.py 390 844                   # les compos (aussi en 1180 820 et 820 1180 pour l'iPad)
python3 /home/claude/tests/e2e_nav16.py 390 844                    # les 4 onglets (joueur, parent, éduc), Missions, Skills, +1
python3 /home/claude/tests/e2e_retour.py 390 844                   # Retour = vrai précédent, tirer pour actualiser, mission éduc, arène, pas de défilement de côté
node /home/claude/tests/test_notifs.js                              # la cloche : événements, lu / non lu, réglages, V1
python3 /home/claude/tests/e2e_notifs.py 390 844                   # la cloche : éduc, parent, enfant, réglages, liens
python3 /home/claude/tests/e2e_reouvrir.py 390 844                 # rouvrir l'appli : le dernier profil, sans code
python3 /home/claude/tests/e2e_rebond.py 390 844                   # le rebond en fin de défilement
node /home/claude/tests/test_push.js                               # les alertes côté serveur : abonnements, textes, envoi Firebase simulé
node /home/claude/tests/test_sw_alertes.js                         # sw.js : afficher l'alerte, la toucher
python3 /home/claude/tests/e2e_alertes.py 390 844                  # « Alertes sur ce téléphone » (faux jeton, sans Firebase)
python3 /home/claude/tests/e2e_postes.py 390 844                   # répartition des postes, filtres sur une ligne, matchs avec postes (aussi 360 780)
```
