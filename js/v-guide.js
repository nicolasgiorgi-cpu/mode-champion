/* =========================================================
   Mode champion · M12 — GUIDE « Comment ça marche ? »
   3 onglets : joueur, parents, éducs. Les chiffres (XP, grades, badges, dates)
   viennent du contenu du site : le guide reste juste si on les change.
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var KEY_VU = 'mc-guide-vu';

  MC.guideVu = function () { return !!app.lsGet(KEY_VU); };

  function card(id, ic, color, titre, sous, corps, open) {
    return '<details class="gd" id="g-' + id + '" style="--gc:' + color + '"' + (open ? ' open' : '') + '><summary><span class="gi">' + icon(ic, 22) + '</span>' +
      '<span class="gt"><b>' + esc(titre) + '</b><small>' + esc(sous) + '</small></span><span class="chev">' + icon('right', 18) + '</span></summary>' +
      '<div class="gb">' + corps + '</div></details>';
  }
  function ul(items) { return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function prochainBilan() {
    var nb = L.nextBilan();
    return nb ? esc(nb.nom) + ', ' + esc(ui.fmtDate(nb.date)) + ' (' + esc(nb.quand) + ')' : 'à la fin de la saison';
  }

  // ---------- petits visuels ----------
  var COURT = { cros: 'Cros', capuozzo: 'Capuozzo', dupont: 'Dupont ou club', meafou: 'Meafou', repos: 'Repos', club: 'Club', recup: 'Récup' };
  function weekRow() {
    return '<div class="gweek">' + C.SEMAINE.map(function (k) {
      var j = C.JOURS[k];
      return '<span style="--gc:' + j.color + '"><b>' + esc(j.court) + '</b>' + (j.slot < 0 ? '<i class="zz">—</i>' : ui.starSvg(18, j.color, j.color)) + '<small>' + esc(COURT[k] || '') + '</small></span>';
    }).join('') + '</div>';
  }
  function levels() {
    return '<div class="row" style="flex-wrap:wrap;gap:6px">' + [1, 2, 3, 4].map(function (n) { return ui.lvl(n, C.NIVEAUX[n].code + ' · ' + C.NIVEAUX[n].nom); }).join('') + '</div>';
  }
  function xpTable() {
    var X = C.XP;
    var rows = [['Séance à la maison (lundi → jeudi)', X.seance], ['Club du mercredi ou du samedi', X.club], ['Récup du dimanche', X.recup], ['Semaine parfaite (les 6 étoiles)', X.bonus],
      ['Badge gagné, ou palier bronze / argent / or', X.badge], ['Record battu (confirmé par un adulte)', X.record], ['Niveau monté (la 1re fois)', X.niveau], ['Premiers pas réussis (une fois)', X.premiersPas], ['Mission spéciale accomplie', X.mission]];
    return '<div class="gxp">' + rows.map(function (r) { return '<span>' + esc(r[0]) + '</span><span>+' + r[1] + ' XP</span>'; }).join('') + '</div>';
  }
  function grades() {
    return '<div class="gxp">' + C.GRADES.map(function (g, i) { return '<span><b>' + (i + 1) + '. ' + esc(g.nom) + '</b></span><span>' + ui.fmtNum(g.xp) + ' XP</span>'; }).join('') + '</div>';
  }
  function badgeRow(fam) {
    return '<div class="gbadges">' + C.BADGES.filter(function (b) { return b.famille === fam; }).map(function (b) {
      var col = b.paliers ? C.PALIERS[2].color : b.color;
      return '<span class="gbd" title="' + esc(b.nom) + '">' + (MC.badgeIcon ? MC.badgeIcon({ icon: b.icon, color: col }, true, 40) : '') + '<small>' + esc(b.nom) + '</small></span>';
    }).join('') + '</div>';
  }

  // ---------- onglet joueur ----------
  function joueur() {
    var J = C.JOURS;
    return '<p class="lead">Mode champion, c\'est ton carnet de prépa physique… en mode jeu vidéo. Tu t\'entraînes à la maison, tu gagnes des <b>étoiles</b> et des <b>XP</b>, tu montes de <b>niveau</b>, tu débloques des <b>badges</b> et tu te compares aux joueurs de ton niveau.</p>' +
      card('semaine', 'star', '#FFC23D', 'Ta semaine et les étoiles', '1 étoile par jour, 6 par semaine, +1 bonus',
        weekRow() + ul([
          '<b>Lundi</b> : la séance de ' + esc(J.cros.joueur.split(' ')[1]) + ' (force du haut). <b>Mardi</b> : ' + esc(J.capuozzo.joueur.split(' ')[1]) + ' (explosivité). <b>Mercredi</b> : ' + esc(J.dupont.joueur.split(' ')[1]) + ' (cardio) ou le club. <b>Jeudi</b> : ' + esc(J.meafou.joueur.split(' ')[1]) + ' (jambes).',
          '<b>Vendredi</b> : repos. <b>Samedi</b> : le club. <b>Dimanche</b> : la récup.',
          'Chaque jour fait = <b>1 étoile</b>. Les 6 étoiles de la semaine = <b>+1 étoile bonus</b> (semaine parfaite).',
          'Tu as raté un jour ? Fais sa séance un autre jour de la même semaine : son étoile s\'allume quand même.',
          icon('flame', 14) + ' <b>Ta série</b> : les étoiles d\'affilée, sans en rater (le vendredi ne compte pas). Si tu rates un jour, elle repart à 0.'
        ]), true) +
      card('seance', 'play', '#3DFFB0', 'Faire une séance', 'Guidée exo par exo, ou notée en 10 secondes',
        ul([
          '<b>Séance guidée</b> : le site te montre chaque exercice (animation ou vidéo), lance le chrono, compte avec toi et bipe 10 s avant la fin puis à 5, 4, 3, 2, 1. Un clic de trop ? Le bouton <b>Retour</b> en haut annule le dernier choix, et <b>Détails et sécurité</b> explique chaque exercice. À la fin de chaque exo, tu dis si c\'était <b>facile</b>, <b>pile bien</b> ou <b>dur</b>.',
          '<b>« J\'ai fait ma séance »</b> : si tu l\'as faite sans le site (avec le carnet), tu notes juste le jour, ton niveau et comment c\'était.',
          'Toujours <b>l\'échauffement</b> avant (' + esc(C.REVEIL.nom) + ', ' + Math.round(C.REVEIL.duree / 60) + ' min) et <b>le retour au calme</b> après. Touche <b>GO</b> : chaque étape s\'affiche en grand avec le chrono, l\'animation et la vidéo.',
          'Peu de matériel ? Active le <b>mode mini matériel</b> dans Réglages : les exercices s\'adaptent (tapis + élastiques).',
          'Tu as mal (pas juste fatigué) ? Tu arrêtes l\'exercice et tu en parles à un adulte.'
        ])) +
      card('niveaux', 'up', '#B48CFF', 'Tes niveaux N1 → N4', 'Chaque exercice a son niveau',
        levels() + ul([
          'Chaque famille d\'exercices a son niveau. C\'est <b>ton bilan</b> qui les règle au départ (N1 à N3). Pas encore de bilan ? Tu commences au <b>niveau 1</b>.',
          'Un exercice <b>facile</b> ? À la fin de la séance, touche <b>Passer au niveau d\'après</b>. <b>Dur</b> ? <b>Reviens au niveau d\'avant</b>. Tu peux aussi le faire dans Profil › Mes niveaux (boutons + et −). Monte seulement si ta technique est parfaite.',
          '<b>N4 = niveau champion</b> : il s\'ouvre quand le N3 est « facile » 2 séances de suite, jamais directement par le bilan.'
        ])) +
      card('bilan', 'sheet', '#38E8FF', 'Le bilan', 'Les 12 tests, toutes les 8 semaines',
        ul([
          '12 tests, toujours dans le même ordre, avec un adulte qui regarde et compte. Prochain : <b>' + prochainBilan() + '</b>.',
          '<b>Pas d\'adulte dispo ?</b> Tu peux t\'entraîner sans bilan : tes exercices sont au niveau 1, et le bilan les réglera ensuite.',
          'Profil › <b>Saisir mon bilan</b> › <b>Lancer le bilan guidé</b> : échauffement, puis chaque test avec la démo, le chrono et le compteur, 2 min de repos entre deux tests. Tu peux aussi tout noter dans le formulaire.',
          'Le bilan <b>règle tes niveaux</b> tout seul et donne tes <b>records</b>.',
          'Un parent ou ton éduc <b>confirme</b> tes résultats. Sans confirmation, ils ne comptent pas au classement.'
        ])) +
      card('xp', 'trophy', '#FFC23D', 'XP et grades', 'Ta carrière, de Recrue à Légende',
        xpTable() + '<p style="margin:4px 0 0">Avec tes XP, tu montes de grade. <b>Ton grade ne redescend jamais.</b></p>' + grades()) +
      card('cycle', 'calendar', '#FF8A3D', 'La jauge du cycle', '56 étoiles en 8 semaines, comme le tableau du mur',
        ul([
          'Un <b>cycle</b> = les 8 semaines entre deux bilans. 7 étoiles par semaine × 8 = <b>56 étoiles</b>.',
          'Paliers de la jauge : <b>14</b> Espoir · <b>28</b> Titulaire · <b>42</b> Capitaine · <b>56</b> Légende (et le badge Légende !).',
          'La jauge repart de zéro à chaque nouveau cycle. Tes XP et ton grade, eux, restent.'
        ])) +
      card('mission', 'ball', '#FFC23D', 'Les missions spéciales', 'Une chose à faire une fois, une grosse récompense',
        ul([
          'Une <b>mission spéciale</b> s\'affiche en haut de <b>Ma semaine</b> tant qu\'elle n\'est pas faite (pastille sur l\'onglet Semaine).',
          '« <b>Prépare le jeu à 10</b> » : choisis ton poste (1 à 3, dans l\'ordre) avec les 7 cartes ou le test « Aide-moi à choisir », puis tes <b>copains</b>. Tes copains, c\'est <b>secret</b> : seuls les éducs les voient.',
          'Mission accomplie : <b>+' + C.XP.mission + ' XP</b> et un badge. Tu peux changer tes choix quand tu veux (Profil › Mes choix pour le jeu à 10).'
        ])) +
      card('badges', 'shield', '#FF4FA3', 'Les badges', C.BADGES.length + ' badges en ' + C.FAMILLES_BADGES.length + ' familles',
        '<p style="margin:0"><b>Exploit</b> : les défis du tableau du mur, gagnés au bilan ou en défi devant un adulte. Plus <b>Champion</b> : réussir un exercice en N4.</p>' + badgeRow('exploit') +
        '<p style="margin:0"><b>Séances</b> : 10, 25 puis 40 séances du même jour = <b>bronze</b>, <b>argent</b>, <b>or</b>.</p>' + badgeRow('seances') +
        '<p style="margin:0"><b>Régularité</b> : ils viennent tout seuls si tu t\'entraînes souvent.</p>' + badgeRow('regularite') +
        '<p style="margin:0"><b>Missions</b> : une mission spéciale accomplie.</p>' + badgeRow('missions') +
        '<p style="margin:0">Chaque badge et chaque palier : <b>+' + C.XP.badge + ' XP</b>. Tout est dans Profil › Mes trophées.</p>') +
      card('defi', 'gift', '#FF8A3D', 'Les défis', 'Tenter un badge un jour où tu te sens fort',
        ul([
          'Profil › <b>Mes trophées</b> › touche un badge d\'exploit pas encore gagné.',
          'Fais le défi <b>devant un adulte</b> qui compte, puis note ton résultat.',
          'Le parent ou l\'éduc confirme dans son espace : le badge s\'allume. Et si c\'est ton meilleur résultat, ça devient ton record.'
        ])) +
      card('classement', 'podium', '#4D9BFF', 'Le classement et les ligues', 'Tu te compares aux joueurs de ton niveau',
        ul([
          'Il y a un classement <b>par test du bilan</b> (planche, navette, pompes…).',
          'Tu es dans la <b>ligue</b> des joueurs qui ont <b>le même niveau</b> que toi sur ce test. S\'il y a moins de ' + MC.CONFIG.LIGUE_MIN + ' joueurs, la ligue s\'ouvre aux niveaux voisins.',
          '2 façons de classer : <b>meilleur score</b>, ou <b>plus gros progrès</b> depuis ton premier bilan. Même si tu n\'es pas le plus fort, tu peux être celui qui progresse le plus !',
          'Seuls les résultats <b>confirmés par un adulte</b> comptent. On n\'y voit que les prénoms. Tes parents peuvent choisir de ne pas t\'afficher.'
        ])) +
      card('code', 'key', '#7CFF6B', 'Ton code secret', '4 chiffres, rien qu\'à toi',
        ul([
          'Ton code, c\'est <b>ton</b> profil : ne le donne à personne.',
          'Sur ton iPad ou ton téléphone, <b>tu restes connecté</b> : pas besoin de le retaper à chaque fois.',
          'Oublié ? Demande à tes parents (espace parent) ou à ton éduc : ils te donnent un <b>code provisoire</b>, puis tu choisis un nouveau code. Tes étoiles et tes XP sont gardés.',
          'Après 5 codes faux, ton profil est bloqué 10 minutes.'
        ])) +
      card('astuces', 'info', '#C7CEDF', 'Astuces', 'Pour que ce soit encore plus pratique',
        ul([
          'Mets le site sur ton écran d\'accueil : menu <b>Partager › Sur l\'écran d\'accueil</b>. Il s\'ouvre alors comme une appli (il faudra te connecter une fois depuis l\'icône).',
          'Sur iPad, tourne l\'écran <b>en paysage</b> pendant une séance ou un bilan.',
          'Pour noter un chiffre, touche la case : un <b>pavé numérique</b> s\'ouvre en bas. <b>Suivant</b> passe à la case d\'après.',
          'Les bips se coupent avec le bouton haut-parleur pendant la séance, ou dans Réglages.'
        ]));
  }

  // ---------- onglet parents ----------
  function parents() {
    return '<p class="lead">Votre enfant suit sur ce site le programme de préparation physique des M12 (le « carnet de champion »). Votre rôle : l\'encourager, être là pour les tests, et confirmer ses résultats.</p>' +
      card('p-connexion', 'lock', '#38E8FF', 'Se connecter', 'Un code par famille',
        ul([
          'Bouton <b>Adultes</b> (en haut de l\'écran d\'accueil) › <b>Je suis parent</b> › votre <b>code famille</b> à 6 chiffres, donné par l\'éducateur.',
          'Votre espace a 4 onglets en bas : <b>Suivi</b> (sa semaine, ses séances, les résultats à confirmer), <b>Progrès</b> (bilans, records, niveaux), <b>Classement</b> et <b>Plus</b> (réglages, aide). Plusieurs enfants ? Changez d\'enfant en haut à gauche.',
          'Un seul code pour la famille : les deux parents peuvent l\'utiliser, et il donne accès à tous vos enfants inscrits.',
          'Vous restez connecté sur l\'appareil. Code perdu : l\'éducateur vous en crée un nouveau.'
        ]), true) +
      card('p-voir', 'eye', '#3DFFB0', 'Ce que vous voyez', 'Le suivi de votre enfant',
        ul([
          'Sa semaine : les étoiles gagnées et les séances faites. <b>Touchez une séance</b> pour le détail : exercices, niveau, séries, ressenti.',
          '<b>Sa progression aux bilans</b> : ses résultats à chaque bilan et ce qu\'il a gagné depuis le précédent.',
          'Son grade, ses niveaux exercice par exercice, ses records confirmés.',
          'Les résultats de bilan ou de défi <b>en attente de confirmation</b>.'
        ])) +
      card('p-confirmer', 'check', '#FFC23D', 'Confirmer les résultats', 'Le geste le plus important',
        ul([
          'Après un bilan ou un défi, les résultats arrivent dans votre espace. Pour chacun, touchez <b>Confirmer</b> ou <b>Refuser</b> : le bouton s\'allume, vous pouvez changer d\'avis. Rien n\'est envoyé tant que vous n\'avez pas touché <b>Valider mes choix</b>, juste sous la liste.',
          'Confirmez si vous avez vu le test (ou si le chiffre vous paraît juste). Un éduc peut aussi confirmer.',
          'Refusé par erreur ? Ouvrez « résultats refusés » et touchez <b>Rétablir</b>, puis Valider mes choix.',
          'Seuls les résultats confirmés comptent pour le classement, les badges et les records.'
        ])) +
      card('p-bilan', 'sheet', '#4D9BFF', 'Le bilan', 'Les 12 tests, toutes les 8 semaines environ',
        ul([
          'Prochain : <b>' + prochainBilan() + '</b>.',
          'Votre enfant le lance depuis son profil (bilan guidé, test par test). Il faut <b>un adulte à côté</b> pour regarder, compter et chronométrer.',
          'Ses niveaux se règlent tout seuls à partir des résultats.'
        ])) +
      card('p-niveaux', 'up', '#B48CFF', 'Ajuster ses niveaux', 'Trop facile, trop dur ?',
        ul([
          'Votre enfant peut monter d\'un niveau à la fin d\'une séance où un exercice était « facile » (ou redescendre s\'il était « dur »).',
          'Vous aussi : onglet <b>Progrès</b> › « Ses niveaux » › <b>Modifier les niveaux</b>, choisissez N1 à N4, puis <b>Enregistrer les niveaux</b>. Rien ne change tant que vous n\'avez pas enregistré.',
          'Monter si c\'est facile avec une technique parfaite ; redescendre si les mouvements se dégradent. Le changement est noté (qui et quand).'
        ])) +
      card('p-partage', 'phone', '#38E8FF', 'Il utilise votre téléphone', 'Pas de téléphone ou d\'iPad à lui ? Aucun problème',
        ul([
          'Ouvrez le site sur votre téléphone (Partager › « Sur l\'écran d\'accueil » pour l\'avoir comme une appli). Votre enfant touche son avatar et tape son code : il reste connecté pour les fois suivantes.',
          'Frères et sœurs sur le même téléphone : chacun a son profil. « Pas Tom ? Changer de joueur » en haut de la semaine, ou « J\'ai fini » à la fin de la séance. S\'il n\'a pas servi depuis 30 min, le site demande « C\'est bien toi ? » avant de commencer.',
          'Votre espace parent est protégé : sur un appareil partagé, votre code est redemandé après 10 min, ou dès qu\'on repasse côté joueur. Votre enfant ne peut donc pas confirmer lui-même ses résultats. Réglage « Appareil partagé avec un enfant » dans l\'onglet <b>Plus</b>.',
          'Une séance commencée est gardée sur le téléphone : si vous en avez besoin au milieu, votre enfant la reprendra là où il en était.'
        ])) +
      card('p-code', 'key', '#7CFF6B', 'Code oublié', 'Votre enfant ne se souvient plus de son code',
        ul([
          'Onglet <b>Plus</b> › <b>Nouveau code secret</b> pour votre enfant : un code provisoire valable 48 h.',
          'Votre enfant se connecte avec, puis choisit lui-même un nouveau code. Ses séances, étoiles et XP sont gardés.'
        ])) +
      card('p-classement', 'podium', '#B48CFF', 'Classement et données', 'Prénoms seulement',
        ul([
          'Le classement compare les enfants <b>de même niveau</b> sur chaque test, en meilleur score ou en progrès.',
          'Onglet <b>Classement</b> : la ligue de votre enfant, comme il la voit.',
          'Tous les enfants y apparaissent par défaut. Vous pouvez <b>masquer votre enfant</b> (onglet Plus) : il continue de voir sa propre place.',
          'Le site ne garde que des prénoms et des résultats sportifs, dans un fichier du club. Pas d\'adresse e-mail, pas de nom de famille. Les codes sont enregistrés chiffrés.'
        ])) +
      card('p-rythme', 'heart', '#FF4F6D', 'Rythme et sécurité', 'Court, régulier, sans forcer',
        ul([
          '4 séances courtes à la maison (environ ' + C.JOURS.dupont.duree + ' à ' + C.JOURS.cros.duree + ' min) du lundi au jeudi, le club en plus, le vendredi au repos.',
          'Toujours un échauffement avant et un retour au calme après.',
          'Une douleur (pas juste de la fatigue) : on arrête l\'exercice et on en parle à l\'éducateur.'
        ]));
  }

  // ---------- onglet éducs ----------
  function educs() {
    return '<p class="lead">L\'espace éduc sert à suivre le groupe, confirmer les résultats et gérer les joueurs, les familles et les codes.</p>' +
      card('e-connexion', 'lock', '#38E8FF', 'Se connecter', 'Un code personnel par éduc',
        ul([
          '<b>Adultes</b> › <b>Je suis éduc</b> › votre code à 6 chiffres.',
          'Outils › <b>Changer mon code éduc</b> pour en choisir un autre.',
          'L\'éduc <b>admin</b> crée les codes des autres éducs (Outils › Les éducs) et peut en régénérer un.'
        ]), true) +
      card('e-vestiaire', 'group', '#3DFFB0', 'Le vestiaire', 'Tout le groupe d\'un coup d\'œil',
        ul([
          '5 onglets en bas : <b>Vestiaire</b> (à valider, ce qui bouge), <b>Joueurs</b>, <b>Compos</b>, <b>Classement</b>, <b>Outils</b>. Une pastille rose sur Vestiaire = des résultats attendent ; sur Compos = une contre-proposition ou un vote attend.',
          'Onglet <b>Joueurs</b> : les étoiles de la semaine de chacun et sa dernière séance. Le filtre <b>À relancer</b> montre ceux qui n\'ont rien noté depuis 7 jours.',
          '<b>Mon enfant</b> : vous êtes aussi parent d\'un joueur ? Choisissez-le dans Outils : son bouclier apparaît en haut de votre espace, avec tout le suivi parent, sans changer de code.',
          'Onglet <b>Classement</b> : tout le groupe ou une ligue à la fois, avec la liste des joueurs pas encore classés.',
          'Outils › <b>Progrès du groupe aux bilans</b> : test par test, les joueurs classés selon leur progrès depuis le bilan d\'avant.',
          '<b>À valider</b> (Vestiaire) : les bilans et défis en attente. Confirmer / Refuser (ou Tout confirmer) s\'allument, puis <b>Valider mes choix</b> envoie le tout. Un résultat refusé par erreur se rétablit depuis la fiche du joueur.'
        ])) +
      card('e-fiche', 'user', '#FFC23D', 'La fiche d\'un joueur', 'Touchez un prénom',
        ul([
          'Ses séances (touchez-en une pour le détail), sa <b>progression d\'un bilan à l\'autre</b>, ses records confirmés, ses niveaux.',
          '<b>Modifier les niveaux</b> (N1 à N4) si le bilan ne reflète pas ce que vous voyez sur le terrain : bouton Modifier, puis Enregistrer. Les parents peuvent aussi les ajuster.',
          '<b>Nouveau code provisoire</b> si l\'enfant a oublié le sien.',
          '<b>Masquer du classement</b>, ou <b>désactiver</b> un joueur qui a quitté le groupe (ses données sont gardées).'
        ])) +
      card('e-mission', 'ball', '#FFC23D', 'Postes et copains (jeu à 10)', 'La mission « Prépare le jeu à 10 »',
        ul([
          'Chaque enfant choisit dans l\'appli 1 à 3 <b>postes</b> (dans l\'ordre) et ses <b>copains</b>, sans limite. Les copains sont secrets : ni les autres enfants ni les parents ne les voient.',
          'Outils › <b>Mission « Prépare le jeu à 10 »</b> : qui l\'a faite, les postes demandés (choix 1 et choix 2-3), les copains de chacun.',
          'La fiche d\'un joueur montre ses postes, son test « Aide-moi à choisir », ses copains et ceux qui l\'ont choisi (⇄ = ils se sont choisis l\'un l\'autre).',
          'Les réponses envoyées avec l\'ancien site « Choisis ton poste » se reprennent d\'un bouton, si le Google Form range ses réponses dans la feuille de l\'appli.'
        ])) +
      card('e-compos', 'board', '#38E8FF', 'Les compos des plateaux', 'Onglet Compos',
        ul([
          '<b>Fiche terrain</b> (réglée par les éducs) : niveau <b>A</b> Confirmés, <b>B</b> Débrouillés, <b>C</b> Débutants ; <b>passerelle</b> = peut jouer aussi dans le niveau voisin, à tour de rôle ; <b>plaquage</b> sur 5 étoiles ; <b>poste principal</b> et les autres postes qu\'il peut tenir (avant, trois-quarts ou les deux). Sans poste réglé, l\'appli prend ses vœux de la mission.',
          'Les événements arrivent de <b>Spond</b> avec les réponses des familles (ou s\'ajoutent à la main). Sur la page d\'un événement, touchez un prénom pour corriger les présents : la correction reste après chaque synchro.',
          '<b>Préparer la compo</b> : le format (jeu à 5 ou à 10), le nombre d\'équipes A, B et C, puis <b>Proposer une compo</b>. L\'appli équilibre le plaquage, fait tourner les passerelles (d\'abord celles qui attendent leur tour) et met chacun avec au moins un copain quand c\'est possible. Au jeu à 10, chacun reçoit un poste pour le plateau (son poste principal d\'abord) ; chaque équipe affiche ses avants et ses trois-quarts.',
          '<b>Deux versions côte à côte</b> : « Proposer 2 versions » (ou « Ajouter une 2e version ») met V1 et V2 l\'une à côté de l\'autre, niveau par niveau. Chaque version se modifie à part ; les joueurs placés autrement sont entourés. À la fin, publiez celle que vous préférez, ou soumettez-les <b>au vote des éducs</b> : la majorité l\'emporte, l\'auteur départage en cas d\'égalité.',
          'Ajuster : touchez un joueur, puis l\'équipe où il va, ou un joueur d\'une autre équipe pour les échanger. « À regarder » signale les écarts (plaquage, effectifs, copains, postes, passerelles) et propose souvent la correction en un geste.',
          '<b>Un éduc suffit</b> : la compo publiée est celle du plateau. Un autre éduc qui n\'est pas d\'accord fait une <b>contre-proposition</b> (ses déplacements + pourquoi) ; l\'auteur l\'accepte ou la refuse avec un mot. Le jour du plateau, tout éduc peut corriger directement (dernière minute).',
          'Après le plateau, la compo devient l\'historique, sur la fiche de chaque joueur : niveaux et postes joués, avec quels copains et combien de fois (et ceux avec qui il n\'a pas encore joué), passages dans l\'autre niveau. Les copains et les niveaux restent entre éducs.'
        ])) +
      card('e-ajout', 'plus', '#4D9BFF', 'Ajouter des joueurs et des familles', 'En début de saison ou en cours d\'année',
        ul([
          '<b>Ajouter un joueur</b> : prénom (ajoutez l\'initiale du nom si deux enfants ont le même prénom) et famille.',
          'Le site donne un <b>code provisoire</b> pour l\'enfant (45 jours) et, pour une nouvelle famille, le <b>code parent</b>. Bouton Copier / partager pour l\'envoyer par message.',
          'Frères et sœurs : choisissez la famille existante, ils partagent le même code parent.',
          'Outils › <b>Familles et codes parents</b> : régénérer le code d\'une famille.'
        ])) +
      card('e-regles', 'star', '#FF4FA3', 'Les règles du jeu', 'Ce que voient les enfants',
        '<p style="margin:0">Étoiles, séries, XP et grades, niveaux N1-N4, jauge du cycle, badges, défis, ligues : tout est expliqué dans l\'onglet <b>Joueur</b>, pour pouvoir en parler avec eux à l\'entraînement.</p>' +
        '<button type="button" class="btn2 sm" data-act="guideTab" data-v="joueur">' + icon('right', 16) + ' Voir l\'onglet Joueur</button>');
  }

  // ---------- écran ----------
  app.route('/guide', function (p, q) {
    app.lsSet(KEY_VU, 1);
    var S = app.S;
    var pour = q.pour || (S.adult ? (S.adult.role === 'e' ? 'educ' : 'parent') : 'joueur');
    if (['joueur', 'parent', 'educ'].indexOf(pour) < 0) pour = 'joueur';
    var back = S.adult && !S.kid ? (S.adult.role === 'e' ? '#/educ' : '#/parent') : S.kid ? '#/semaine' : '#/connexion';
    if (q.de) back = '#/' + String(q.de).replace(/^#?\/?/, '');
    var tabs = [['joueur', 'Joueur'], ['parent', 'Parents'], ['educ', 'Éducs']].map(function (t) {
      return '<button type="button" role="tab" aria-selected="' + (pour === t[0]) + '" class="opt' + (pour === t[0] ? ' on' : '') + '" data-act="guideTab" data-v="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var body = pour === 'parent' ? parents() : pour === 'educ' ? educs() : joueur();
    return '<main class="screen guide nonav">' + ui.topbar({ back: back, backLabel: 'Retour', title: 'Comment ça marche ?', help: false }) +
      '<div class="head"><span class="kicker">' + esc(MC.CONFIG.CLUB) + '</span><h1 class="big md">Comment<br>ça marche ?</h1></div>' +
      '<div class="gtabs" role="tablist" aria-label="Guide pour">' + tabs + '</div>' +
      '<div class="sec" style="gap:10px">' + body + '</div>' +
      (MC.accueil && MC.accueil.tourLink(pour) ? '<a class="btn2" href="' + MC.accueil.tourLink(pour) + '">' + icon('play', 16) + ' Revoir la visite du début</a>' : '') +
      '<a class="btn2 grey" href="' + back + '">' + icon('left', 16) + ' Retour</a></main>';
  }, { bg: '#16223F', neutral: true });

  MC.act.guideTab = function (b) {
    var q = app.current() && app.current().q || {};
    app.go('#/guide?pour=' + b.getAttribute('data-v') + (q.de ? '&de=' + encodeURIComponent(q.de) : ''), true);
    window.scrollTo(0, 0);
  };
})();
