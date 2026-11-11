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
      ['Badge gagné, ou palier bronze / argent / or', X.badge], ['Record battu', X.record], ['Record tenté, pas battu (une fois par jour)', X.tentative], ['Bilan complet (les 12 épreuves d\'un cycle)', X.bilanComplet], ['Niveau monté (la 1re fois)', X.niveau], ['Premiers pas réussis (une fois)', X.premiersPas], ['Mission spéciale accomplie', X.mission]];
    if (MC.ouvert('skills')) rows.push(['Étoile Skills validée par un éduc', X.etoile], ['Étoile Skills qui brille (vue au plateau)', X.brille]);
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

  // (v33) la cloche : ce qu'elle signale (les sortes ouvertes pour ce profil) et où la régler
  function cloche(id, role, tu) {
    var sortes = MC.notifs ? MC.notifs.cats(role).map(function (c) { return esc(c.nom.charAt(0).toLowerCase() + c.nom.slice(1)); }) : [];
    var reg = role === 'k' ? 'Moi › Réglages › Mes notifications' : role === 'f' ? 'Plus › Mes notifications' : 'l\'engrenage › Mes notifications';
    return card(id, 'bell', '#FF7FBC', tu ? 'La cloche' : 'La cloche (notifications)', tu ? 'Ce qui s\'est passé pour toi' : 'Ce qui s\'est passé depuis votre dernière visite',
      ul([
        tu ? 'En haut de l\'écran, la <b>cloche</b> 🔔. Une pastille rose te dit combien de nouveautés t\'attendent.' : 'En haut des écrans, la <b>cloche</b> 🔔. Une pastille rose dit combien de nouveautés vous attendent.',
        (tu ? 'Touche-la : la liste, les nouvelles en haut. Touche une ligne : tu arrives pile au bon endroit, le détail ouvert.' : 'Touchez-la : la liste des 30 derniers jours, les nouvelles en haut. Une ligne (ou une alerte du téléphone) mène pile au bon endroit, le détail ouvert : la séance, la ligne de l\'enfant dans la mission, ses niveaux…') + (sortes.length ? ' Elle signale : ' + sortes.join(', ') + '.' : ''),
        (tu ? 'Tu choisis ce que tu reçois : ' : 'Vous choisissez ce que vous recevez : ') + '<b>' + reg + '</b> (ou la roue dentée de la liste). ' + (tu ? 'C\'est réglé sur cet appareil.' : 'C\'est réglé sur cet appareil : l\'autre parent règle le sien.'),
        // (v34) les alertes sur l'écran du téléphone
        (tu ? 'Pour être prévenu sur l\'écran du téléphone, même appli fermée : allume <b>Alertes sur ce téléphone</b>, en haut de ces réglages, puis touche « Autoriser ». ' :
          'Pour être prévenu sur l\'écran du téléphone, même appli fermée : allumez <b>Alertes sur ce téléphone</b>, en haut de ces réglages, puis touchez « Autoriser ». ') +
          'Sur iPhone, l\'appli doit être sur l\'écran d\'accueil (iOS 16.4 ou plus) ; sur Android, ça marche dans Chrome. ' +
          (tu ? 'Un chiffre rouge sur l\'icône de l\'appli dit combien de nouveautés t\'attendent ; il baisse quand tu touches une alerte, et disparaît quand tu ouvres la cloche.' : 'Un chiffre rouge sur l\'icône de l\'appli dit combien de nouveautés vous attendent ; il baisse quand vous touchez une alerte, et disparaît quand vous ouvrez la cloche.')
      ]));
  }

  // ---------- onglet joueur ----------
  // V1 (28/10) : ce qui est ouvert aux enfants et aux parents (MC.CONFIG.ENFANTS)
  var SKON, MEON, COPON;
  function flags() { SKON = MC.ouvert('skills'); MEON = MC.ouvert('missionsEducs'); COPON = MC.ouvert('copains'); }
  function joueur() {
    flags();
    var J = C.JOURS;
    return '<p class="lead">Mode champion, c\'est ton carnet de prépa physique… en mode jeu vidéo. Tu t\'entraînes à la maison, tu gagnes des <b>étoiles</b> et des <b>XP</b>, tu montes de <b>niveau</b>, tu débloques des <b>badges</b> et tu te compares aux joueurs de ton niveau. ' + (SKON ? 'Et tes éducs te donnent des <b>missions</b> et valident tes <b>Skills</b> de rugby.' : 'Et tes éducs te lancent des <b>missions</b>, comme choisir ton poste pour le jeu à 10.') + '</p>' +
      card('onglets', 'menu', '#38E8FF', 'L\'appli en 4 onglets', 'Accueil · Équipe · Progrès · Moi',
        ul([
          '<b>Accueil</b> : je fais quoi aujourd\'hui ? La séance du jour (le bouton pour la lancer), <b>mes missions</b> (ce que demandent tes éducs, comme choisir ton poste ; « Toutes » ouvre la liste), ta semaine en une ligne (tes étoiles, la <b>semaine parfaite</b>) et la dernière nouvelle de l\'équipe. Une pastille rose = une mission à faire.',
          '<b>Équipe</b> : <b>Ça bouge</b>, le <b>défi d\'équipe</b> (une jauge commune : tes répétitions des séances guidées la remplissent avec celles des autres ; pleine, un badge pour tous), les séances et les records battus de l\'équipe cette semaine (un 👏 pour encourager les autres : tu choisis un mot tout prêt), et les <b>podiums</b> : le progrès du mois et la régularité de toute l\'équipe, et les records de chaque épreuve avec les joueurs de ton niveau (ta ligue).',
          '<b>Progrès</b> : tes <b>records</b> (tes meilleurs résultats, ton bilan, tes <b>compteurs</b> : tout ce que tu as fait dans tes séances guidées depuis septembre), tes <b>niveaux</b>' + (SKON ? ' et tes <b>Skills</b> (ton carnet de compétences rugby, 8 cartes d\'étoiles validées par tes éducs)' : '') + '.',
          '<b>Moi</b> : ton grade, tes XP, ' + (COPON ? 'tes postes et tes copains' : 'tes postes') + ', tes trophées, l\'aide et les réglages.',
          'La <b>flèche en haut à gauche</b> te ramène à l\'écran d\'avant, là où tu étais. Tout en haut d\'un écran, <b>tire vers le bas</b> puis lâche pour l\'actualiser. Quand l\'appli a une nouvelle version, elle se met à jour toute seule.'
        ].filter(Boolean)), true) +
      card('semaine', 'star', '#FFC23D', 'Ta semaine et les étoiles', '1 étoile par jour, 6 par semaine, +1 bonus',
        weekRow() + ul([
          '<b>Lundi</b> : la séance de ' + esc(J.cros.joueur.split(' ')[1]) + ' (force du haut). <b>Mardi</b> : ' + esc(J.capuozzo.joueur.split(' ')[1]) + ' (explosivité). <b>Mercredi</b> : ' + esc(J.dupont.joueur.split(' ')[1]) + ' (cardio) ou le club. <b>Jeudi</b> : ' + esc(J.meafou.joueur.split(' ')[1]) + ' (jambes).',
          '<b>Vendredi</b> : repos. <b>Samedi</b> : le club. <b>Dimanche</b> : la récup.',
          'Chaque jour fait = <b>1 étoile</b>. Les 6 étoiles de la semaine = <b>+1 étoile bonus</b> (semaine parfaite).',
          'Tu as raté un jour ? Fais sa séance un autre jour de la même semaine : son étoile s\'allume quand même.',
          icon('flame', 14) + ' <b>Ta série</b> : les étoiles d\'affilée, sans en rater (le vendredi ne compte pas). Si tu rates un jour, elle repart à 0.',
          '👏 <b>Bravo !</b> Quand tes éducs ou les autres joueurs voient ta séance, ils peuvent te dire bravo (souvent avec un petit mot) : tu le vois en haut de l\'Accueil et dans la cloche.'
        ])) +
      card('seance', 'play', '#3DFFB0', 'Faire une séance', 'Guidée exo par exo, ou notée en 10 secondes',
        ul([
          '<b>Séance guidée</b> : le site te montre chaque exercice (animation ou vidéo), lance le chrono, compte avec toi et bipe 10 s avant la fin puis à 5, 4, 3, 2, 1. Un clic de trop ? Le bouton <b>Retour</b> en haut annule le dernier choix, et <b>Détails et sécurité</b> explique chaque exercice. À la fin de chaque exo, tu dis si c\'était <b>facile</b>, <b>pile bien</b> ou <b>dur</b>.',
          '<b>« J\'ai fait ma séance »</b> : si tu l\'as faite sans le site (avec le carnet), tu notes juste le jour, ton niveau et comment c\'était.',
          'Toujours <b>l\'échauffement</b> avant (' + esc(C.REVEIL.nom) + ', ' + Math.round(C.REVEIL.duree / 60) + ' min) et <b>le retour au calme</b> après. Touche <b>GO</b> : chaque étape s\'affiche en grand avec le chrono, l\'animation et la vidéo. Au retour au calme, tu as quelques secondes pour te mettre en position avant chaque étape (touche <b>GO</b> si tu es prêt avant).',
          'Peu de matériel ? Active le <b>mode mini matériel</b> dans Réglages : les exercices s\'adaptent (tapis + élastiques).',
          'Tu as mal (pas juste fatigué) ? Tu arrêtes l\'exercice et tu en parles à un adulte.'
        ])) +
      card('niveaux', 'up', '#B48CFF', 'Tes niveaux N1 → N4', 'Chaque exercice a son niveau',
        levels() + ul([
          'Chaque famille d\'exercices a son niveau. C\'est <b>ton bilan</b> qui les règle au départ (N1 à N3). Pas encore de bilan ? Tu commences au <b>niveau 1</b>.',
          'Un exercice <b>facile</b> ? À la fin de la séance, touche <b>Passer au niveau d\'après</b>. <b>Dur</b> ? <b>Reviens au niveau d\'avant</b>. Tu peux aussi le faire dans Progrès › Niveaux (boutons + et −). Monte seulement si ta technique est parfaite.',
          '<b>N4 = niveau champion</b> : il s\'ouvre quand le N3 est « facile » 2 séances de suite, jamais directement par le bilan.'
        ])) +
      card('bilan', 'sheet', '#38E8FF', 'Le bilan', 'Les 12 tests, quand tu veux',
        ul([
          '12 tests, toujours dans le même ordre, avec un adulte qui regarde et compte. <b>Tu le lances quand tu veux</b> : pas de date imposée.',
          '<b>Ton bilan se remplit</b> pendant le cycle (8 semaines) : chaque épreuve faite, au bilan ou en record du jour, coche sa case (en haut de Progrès › Records). <b>Finir mon bilan</b> ne te propose que les épreuves qui manquent. Les 12 : <b>bilan complet</b>, +' + C.XP.bilanComplet + ' XP.',
          '<b>Pas d\'adulte dispo ?</b> Tu peux t\'entraîner sans bilan : tes exercices sont au niveau 1, et le bilan les réglera ensuite.',
          'Progrès › Records › <b>Finir mon bilan</b> (ou <b>Tout le bilan</b>) : le bilan guidé, échauffement puis chaque test avec la démo, le chrono et le compteur, 2 min de repos entre deux tests. Tu peux aussi tout noter dans le formulaire.',
          'Le bilan guidé (ou le formulaire) <b>règle tes niveaux</b> tout seul et donne tes <b>records</b>. Un record du jour te <b>propose</b> un niveau (dans la fiche de l\'épreuve), il ne le change pas.',
          'Tes résultats comptent <b>tout de suite</b>. Un <b>exploit</b> (un très gros progrès, ou une place sur le podium) attend qu\'un parent ou ton éduc le confirme.'
        ])) +
      card('record', 'trophy', '#FFC23D', 'Le record du jour', 'Bats tes records, une épreuve à la fois',
        ul([
          'Du lundi au jeudi, une épreuve du bilan est le <b>record du jour</b> (liée au thème de la séance : le haut du corps le lundi, l\'explosivité le mardi, le cardio le mercredi, les jambes le jeudi). Les 12 épreuves tournent en 4 semaines.',
          'Il est proposé sur l\'<b>Accueil</b> et dans ta <b>séance</b>, juste après l\'échauffement (tu es chaud : c\'est le bon moment). « Pas aujourd\'hui » pour passer.',
          'Progrès › <b>Records</b> : tes 12 épreuves en cartes. Touche une épreuve : ton record, ta <b>courbe</b>, le niveau que ton record vaut, et <b>Je tente</b>.',
          '<b>Je tente</b> : l\'écran du bilan guidé (démo, chrono, compteur), puis ton résultat part tout seul. Pas chaud ? L\'échauffement de 4 min d\'abord.',
          '<b>Une tentative par épreuve et par jour, deux épreuves par jour au plus</b> (les défis des badges comptent aussi). Record battu : la fête et +' + C.XP.record + ' XP. Pas battu : +' + C.XP.tentative + ' XP (une fois par jour), et tu le battras une prochaine fois.',
          'Navette et saut se font à deux (quelqu\'un au chrono, un mètre pour mesurer) ; suspension et tractions demandent une barre.'
        ])) +
      card('xp', 'trophy', '#FFC23D', 'XP et grades', 'Ta carrière, de Recrue à Légende',
        xpTable() + '<p style="margin:4px 0 0">Avec tes XP, tu montes de grade. <b>Ton grade ne redescend jamais.</b></p>' + grades()) +
      card('cycle', 'calendar', '#FF8A3D', 'La jauge du cycle', '56 étoiles en 8 semaines, comme le tableau du mur',
        ul([
          'Un <b>cycle</b> = 8 semaines d\'entraînement. 7 étoiles par semaine × 8 = <b>56 étoiles</b>.',
          'Paliers de la jauge : <b>14</b> Espoir · <b>28</b> Titulaire · <b>42</b> Capitaine · <b>56</b> Légende (et le badge Légende !).',
          'La jauge repart de zéro à chaque nouveau cycle. Tes XP et ton grade, eux, restent.'
        ])) +
      (!SKON && !MEON && !COPON ? card('mission', 'target', '#FF4FA3', 'Les missions', 'Ce que demandent tes éducs',
        ul([
          'Sur l\'<b>Accueil</b>, <b>Mes missions</b> : ce que tes éducs te demandent. Une pastille rose sur l\'onglet Accueil te prévient quand une mission t\'attend.',
          'Pour le jeu à 10 : « <b>Choisis ton poste</b> ». Découvre les 7 postes avec leurs cartes, ou fais le test « Aide-moi à choisir », puis choisis ton top : 1 à 3 postes, dans l\'ordre. Mission accomplie : <b>+' + C.XP.mission + ' XP</b> et le badge « Prêt pour le jeu à 10 ».',
          'Tu peux changer ton choix quand tu veux : Moi › Mes postes.'
        ])) :
      card('mission', 'target', '#FF4FA3', 'Les missions et les +1', 'Ce que demandent tes éducs',
        ul([
          'Sur l\'<b>Accueil</b>, <b>Mes missions</b> : tout ce que tes éducs te demandent (« Toutes » pour la liste). Une pastille rose sur l\'onglet Accueil, et une fois un bandeau « Nouveau dans tes missions », te préviennent.',
          '<b>Pour toute l\'équipe</b> : regarder une vidéo puis répondre à quelques questions, ou un QCM. Mission faite = des XP (ils sont écrits sur la mission).',
          'Pour le jeu à 10, <b>2 missions</b>. « <b>Choisis ton poste</b> » : 1 à 3 postes, dans l\'ordre, avec les 7 cartes ou le test « Aide-moi à choisir ». Puis « <b>Avec qui tu aimes jouer</b> » : tes copains, autant que tu veux, c\'est <b>secret</b> (seuls les éducs les voient). Chaque mission accomplie : <b>+' + C.XP.mission + ' XP</b> et son badge. Tu peux changer tes choix quand tu veux (Moi › Mes postes, Mes copains).',
          '<b>Ta mission principale</b> : 1 à 3 étoiles Skills à décrocher, rien que pour toi, jusqu\'à une date (souvent les prochaines vacances). Elle a un cadre arc-en-ciel, ici et sur sa carte Skills. Quand un éduc voit que tu es sur la bonne voie, il t\'<b>encourage</b> (un +1, avec un petit mot parfois). Un encouragement ne donne pas l\'étoile : c\'est un éduc qui la valide.'
        ]))) +
      (!SKON ? '' : card('skills', 'star', '#FFC23D', 'Tes Skills', 'Ton carnet de compétences rugby',
        ul([
          '8 cartes : <b>Plaquage</b>, <b>Ruck</b>, <b>Maul</b>, <b>Défense</b>, <b>Porteur</b>, <b>Passe</b>, <b>Jeu au pied</b> et <b>Soutien</b>. Leurs étoiles se gagnent dans l\'ordre que tu veux.',
          'Une étoile s\'allume quand <b>un éduc la valide</b>, après l\'entraînement ou à un atelier d\'évaluation : <b>+' + C.XP.etoile + ' XP</b>. Elle <b>brille</b> quand un éduc la voit au plateau : <b>+' + C.XP.brille + ' XP</b>.',
          'Tu l\'as réussie ? Sur la carte, <b>Demander</b> (ou <b>Fait au plateau</b> pour la faire briller) : un éduc te répond. Une demande à la fois.',
          'Ta carte prend du grade : <b>Bronze</b> à la 1re étoile, <b>Argent</b> au tiers, <b>Or</b> aux deux tiers, <b>Diamant</b> quand toutes sont gagnées, et <b>Légende</b> quand toutes brillent.',
          'Touche une carte : ses étoiles, qui les a validées, et comment t\'entraîner pour les autres. Les Skills ne sont jamais classés : chacun avance à son rythme.'
        ]))) +
      card('badges', 'shield', '#FF4FA3', 'Les badges', C.BADGES.length + ' badges en ' + C.FAMILLES_BADGES.length + ' familles',
        '<p style="margin:0"><b>Exploit</b> : les défis du tableau du mur, gagnés au bilan ou en défi devant un adulte. Plus <b>Champion</b> : réussir un exercice en N4.</p>' + badgeRow('exploit') +
        '<p style="margin:0"><b>Séances</b> : 10, 25 puis 40 séances du même jour = <b>bronze</b>, <b>argent</b>, <b>or</b>.</p>' + badgeRow('seances') +
        '<p style="margin:0"><b>Régularité</b> : ils viennent tout seuls si tu t\'entraînes souvent.</p>' + badgeRow('regularite') +
        '<p style="margin:0"><b>Missions</b> : une mission spéciale accomplie.</p>' + badgeRow('missions') +
        '<p style="margin:0">Chaque badge et chaque palier : <b>+' + C.XP.badge + ' XP</b>. Tout est dans Moi › Trophées.</p>') +
      card('defi', 'gift', '#FF8A3D', 'Les défis', 'Tenter un badge un jour où tu te sens fort',
        ul([
          'Moi › <b>Trophées</b> › touche un badge d\'exploit pas encore gagné.',
          'Fais le défi <b>devant un adulte</b> qui compte, puis note ton résultat.',
          'Le badge s\'allume tout de suite, et si c\'est ton meilleur résultat, ça devient ton record. Un exploit attend qu\'un parent ou ton éduc le confirme.'
        ])) +
      card('classement', 'podium', '#4D9BFF', 'Le classement et les ligues', 'Tu te compares aux joueurs de ton niveau',
        ul([
          '<b>Équipe</b> › <b>Podiums</b>, 3 classements : <b>Progrès</b> (les records que tu as battus ces 30 derniers jours, dans toute l\'équipe : tout le monde peut gagner), <b>Régularité</b> (tes étoiles des 4 dernières semaines) et <b>Records</b>. Tu vois toujours le podium, puis toi et tes voisins.',
          '<b>Records</b> : il y a un podium <b>par test du bilan</b> (planche, navette, pompes…), tous affichés d\'un coup ; ouvre la ligne des filtres, puis touche les épreuves que tu veux garder, « Toutes » pour tout revoir. Seule la prépa physique compte : ' + (SKON ? 'tes missions et tes Skills ne sont jamais classés.' : 'tes missions ne sont jamais classées.') + '',
          'Tu es dans la <b>ligue</b> des joueurs qui ont <b>le même niveau</b> que toi sur ce test. S\'il y a moins de ' + MC.CONFIG.LIGUE_MIN + ' joueurs, la ligue s\'ouvre aux niveaux voisins.',
          '2 façons de classer : <b>meilleur score</b>, ou <b>plus gros progrès</b> depuis ton premier bilan. Même si tu n\'es pas le plus fort, tu peux être celui qui progresse le plus !',
          'Tes résultats y comptent tout de suite (un exploit, une fois confirmé). On n\'y voit que les prénoms. Tes parents peuvent choisir de ne pas t\'afficher.'
        ])) +
      card('code', 'key', '#7CFF6B', 'Ton code secret', '4 chiffres, rien qu\'à toi',
        ul([
          'Ton code, c\'est <b>ton</b> profil : ne le donne à personne.',
          'Sur ton iPad ou ton téléphone, <b>tu restes connecté</b> : pas besoin de le retaper à chaque fois.',
          'Oublié ? Demande à tes parents (espace parent) ou à ton éduc : ils te donnent un <b>code provisoire</b>, puis tu choisis un nouveau code. Tes étoiles et tes XP sont gardés.',
          'Après 5 codes faux, ton profil est bloqué 10 minutes.'
        ])) +
      cloche('notifs', 'k', true) +
      card('astuces', 'info', '#C7CEDF', 'Astuces', 'Pour que ce soit encore plus pratique',
        ul([
          'Mets le site sur ton écran d\'accueil : <b>Partager</b> (en bas de Safari, ou dans le menu <b>⋯</b>) › <b>Sur l\'écran d\'accueil</b>, en laissant <b>Ouvrir comme web app</b> activé s\'il est là. Il s\'ouvre alors comme une appli (il faudra te connecter une fois depuis l\'icône).',
          'Sur iPad, tourne l\'écran <b>en paysage</b> pendant une séance ou un bilan.',
          'Pour noter un chiffre, touche la case : un <b>pavé numérique</b> s\'ouvre en bas. <b>Suivant</b> passe à la case d\'après.',
          'Les bips se coupent avec le bouton haut-parleur pendant la séance, ou dans Réglages.'
        ]));
  }

  // ---------- onglet parents ----------
  function parents() {
    flags();
    return '<p class="lead">Votre enfant suit sur ce site le programme de préparation physique des M12 (le « carnet de champion »). Votre rôle : l\'encourager, être là pour les tests, et confirmer ses exploits.</p>' +
      card('p-connexion', 'lock', '#38E8FF', 'Se connecter', 'Un code par famille',
        ul([
          'Bouton <b>Adultes</b> (en haut de l\'écran d\'accueil) › <b>Je suis parent</b> › le <b>prénom de votre enfant</b> › votre <b>code famille</b> à 4 chiffres. La 1re fois, c\'est le code provisoire donné par l\'éducateur : vous choisissez ensuite le vôtre.',
          'Votre espace a ' + (SKON ? 4 : 3) + ' onglets en bas : <b>Prépa</b> (les exploits à confirmer en premier, sa semaine et ses séances, ses <b>Bilans</b> et son <b>Classement</b>), ' + (SKON ? '<b>Missions</b> (ce que demandent les éducs, ses +1 et leurs mots), <b>Skills</b> (son carnet de compétences)' : '<b>Missions</b> (ce que demandent les éducs, comme choisir son poste pour le jeu à 10)') + ' et <b>Plus</b> (codes, appareil, aide). Plusieurs enfants ? Touchez son prénom en haut à gauche : vous restez sur le même onglet.',
          'La <b>flèche en haut à gauche</b>, sur tous les écrans, ramène à l\'écran d\'avant, là où vous étiez. Tout en haut d\'un écran, <b>tirez vers le bas</b> puis relâchez pour l\'actualiser. Quand une nouvelle version de l\'appli sort, elle se met à jour toute seule, à l\'ouverture ou en y revenant.',
          'Un seul code pour la famille : les deux parents peuvent l\'utiliser, et il donne accès à tous vos enfants inscrits.',
          'Vous restez connecté sur l\'appareil. Pour changer de code : Plus › Changer mon code parent. Code perdu : l\'éducateur vous en crée un provisoire. Après 5 codes faux, l\'accès se bloque 10 minutes.'
        ]), true) +
      cloche('p-notifs', 'f', false) +
      card('p-voir', 'eye', '#3DFFB0', 'Ce que vous voyez', 'Le suivi de votre enfant',
        ul([
          'Sa semaine : les étoiles gagnées et les séances faites. <b>Touchez une séance</b> pour le détail : exercices, niveau, séries, ressenti.',
          '👏 Les <b>bravos</b> : quand un éduc (ou un autre joueur, avec un mot tout prêt) félicite votre enfant pour une séance, c\'est écrit sous la séance (avec le mot, s\'il y en a un), et la cloche vous prévient.',
          '<b>Sa progression aux bilans</b> : ses résultats à chaque bilan et ce qu\'il a gagné depuis le précédent.',
          'Son grade, ses niveaux exercice par exercice, ses records.',
          'Ses <b>exploits à confirmer</b>, et ses derniers scores, que vous pouvez corriger.',
          SKON && MEON ? '<b>Missions</b> : sa <b>mission principale</b> (1 à 3 étoiles Skills à décrocher, jusqu\'à une date), les <b>encouragements</b> et les mots des éducs (qui, quand, à quelle occasion), et les missions de l\'équipe (vidéo, QCM, choix de poste), faites ou pas. Vous suivez : les encouragements ne se donnent que par les éducs.'
            : '<b>Missions</b> : les missions de l\'équipe, comme « Choisis ton poste » pour le jeu à 10 : faites ou pas, et les postes qu\'il a choisis.',
          !SKON ? '' : '<b>Skills</b> : ses 8 cartes (Plaquage, Ruck, Maul, Défense, Porteur, Passe, Jeu au pied, Soutien), les étoiles validées par les éducs, celles qui <b>brillent</b> (vues au plateau), ses demandes et comment il peut s\'entraîner pour les autres. Vous suivez : seul votre enfant peut demander une étoile.'
        ].filter(Boolean))) +
      card('p-confirmer', 'check', '#FFC23D', 'Ses résultats et ses exploits', 'Ça compte tout de suite',
        ul([
          'Un résultat de bilan ou de défi <b>compte tout de suite</b> (classement, badges, records). Une erreur ? Dans « scores notés ces 14 jours », touchez <b>Ce n\'est pas ça</b> : il ne compte plus.',
          '<b>Le record du jour</b> (du lundi au jeudi) : votre enfant peut tenter de battre un record, une épreuve à la fois (une tentative par épreuve et par jour, deux épreuves par jour au plus). Vous recevez une alerte « a tenté un record » ; le score compte tout de suite, comme un défi.',
          'Seul un <b>exploit</b> attend votre confirmation : plus de 25 % de mieux que son record d\'un coup, ou une entrée sur le podium de sa ligue. Touchez <b>Confirmer</b> ou <b>Ce n\'est pas ça</b>, puis <b>Enregistrer mes choix</b>, juste sous la liste. Un éduc parent de l\'enfant peut aussi confirmer.',
          'Retiré par erreur ? Ouvrez « résultats pas retenus » et touchez <b>Rétablir</b>, puis Enregistrer mes choix.',
          'Un exploit compte pour le classement, les badges et les records une fois confirmé.'
        ])) +
      card('p-bilan', 'sheet', '#4D9BFF', 'Le bilan', 'Les 12 tests, sans date imposée',
        ul([
          '<b>Pas de date imposée</b> : il le fait quand un adulte est disponible.',
          '<b>Le bilan se remplit</b> pendant les 8 semaines du cycle : chaque épreuve faite (au bilan guidé ou en record du jour) coche sa case ; la valeur retenue est la meilleure du cycle. « Finir mon bilan » ne propose que les épreuves qui manquent. Les 12 faites : bilan complet.',
          'Votre enfant le lance depuis Progrès › Records (bilan guidé, test par test). Il faut <b>un adulte à côté</b> pour regarder, compter et chronométrer.',
          'Ses niveaux se règlent tout seuls à partir des résultats du bilan guidé ou du formulaire ; un record du jour propose un niveau sans le changer.'
        ])) +
      card('p-niveaux', 'up', '#B48CFF', 'Ajuster ses niveaux', 'Trop facile, trop dur ?',
        ul([
          'Votre enfant peut monter d\'un niveau à la fin d\'une séance où un exercice était « facile » (ou redescendre s\'il était « dur »).',
          'Vous aussi : Prépa › <b>Bilans</b> › « Ses niveaux » › <b>Modifier les niveaux</b>, choisissez N1 à N4, puis <b>Enregistrer les niveaux</b>. Rien ne change tant que vous n\'avez pas enregistré.',
          'Monter si c\'est facile avec une technique parfaite ; redescendre si les mouvements se dégradent. Le changement est noté (qui et quand).'
        ])) +
      card('p-partage', 'phone', '#38E8FF', 'Il utilise votre téléphone', 'Pas de téléphone ou d\'iPad à lui ? Aucun problème',
        ul([
          'Ouvrez le site sur votre téléphone (Partager › « Sur l\'écran d\'accueil », en laissant « Ouvrir comme web app » activé s\'il est proposé, pour l\'avoir comme une appli).',
          '<b>Lui passer le téléphone</b> : touchez <b>▶ son prénom</b>, en haut à droite de votre espace. Son espace s\'ouvre directement, sans son code (vous êtes déjà entré avec le code de la famille). Pour revenir dans votre espace : « Rendre le téléphone », puis votre code.',
          '<b>Le récupérer</b> : le bouton <b>🔒 Parent</b>, en haut à droite de son côté (à la place du ▶), ou « J\'ai fini : je rends le téléphone » à la fin de sa séance. Vous tapez votre code et vous voilà dans votre espace.',
          'Frères et sœurs sur le même téléphone : chacun a son profil. « Pas Tom ? Changer de joueur » en haut de la semaine, ou « J\'ai fini » à la fin de la séance. S\'il n\'a pas servi depuis 30 min, le site demande « C\'est bien toi ? » avant de commencer.',
          'Votre espace parent est protégé : sur un appareil partagé, votre code est redemandé dès qu\'on revient de l\'espace joueur (en rouvrant l\'appli, vous retrouvez votre espace sans code). Votre enfant ne peut donc pas confirmer lui-même ses exploits. Réglage « Appareil partagé avec un enfant » dans l\'onglet <b>Plus</b>.',
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
          'Prépa › <b>Classement</b> : la ligue de votre enfant sur chaque test. Seule la prépa physique y compte (jamais les missions' + (SKON ? ' ni les Skills' : '') + ').',
          'Le <b>défi d\'équipe</b> (Équipe › Ça bouge des enfants) : une jauge commune remplie par les répétitions des séances guidées de tous ; chaque enfant voit le total et sa part, jamais celle des autres. Jauge pleine : un badge pour tous, gardé même si un enfant quitte le groupe.',
          'Côté enfants, deux podiums de plus, pour toute l\'équipe : le <b>progrès du mois</b> (le nombre de records battus ces 30 jours) et la <b>régularité</b> (les étoiles des 4 dernières semaines). Chaque enfant voit le podium, puis sa place et ses voisins, jamais le bas du tableau.',
          'Tous les enfants y apparaissent par défaut. Vous pouvez <b>masquer votre enfant</b> (en bas du classement, ou dans Plus) : il continue de voir sa propre place.',
          'Dans l\'onglet <b>Équipe › Ça bouge</b> des enfants, les autres voient aussi ses séances (le jour et l\'heure) et ses records battus (l\'écart, jamais le score), et peuvent lui dire bravo avec un mot tout prêt. Masqué, il n\'y apparaît pas et n\'envoie pas de bravo.',
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
    return '<p class="lead">L\'espace éduc sert à suivre le groupe et gérer les joueurs, les familles et les codes.</p>' +
      card('e-connexion', 'lock', '#38E8FF', 'Se connecter', 'Un code personnel par éduc',
        ul([
          '<b>Adultes</b> › <b>Je suis éduc</b> › votre nom › votre code à 4 chiffres. La 1re fois, c\'est un code provisoire donné par l\'admin : vous choisissez ensuite le vôtre.',
          'L\'<b>engrenage</b> (en haut à droite de chaque onglet) › <b>Changer mon code</b> pour en choisir un autre.',
          'L\'éduc <b>admin</b> crée les codes provisoires des autres éducs (engrenage › Les éducs) et peut en refaire un s\'il est perdu. Après 5 codes faux, l\'accès se bloque 10 minutes.'
        ]), true) +
      cloche('e-notifs', 'e', false) +
      card('e-vestiaire', 'group', '#3DFFB0', 'Les 4 onglets et l\'engrenage', 'Un onglet par usage',
        ul([
          '<b>Entraîn.</b> (on arrive ici) : à venir et passés. Un entraînement : les présents de Spond (à corriger d\'un toucher), <b>1. les ateliers</b> puis <b>2. les matchs</b>, et après la séance : évaluer des Skills avec les présents (une étoile ou un atelier), et les missions des présents (un toucher = +1).',
          '<b>Plateaux</b> : à venir et joués. Un plateau : les présents, puis la compo (jeu à 5 ou à 10, 2 versions, vote, contre-propositions), et le +1 pendant et après. Pastille rose = un vote ou une contre-proposition attend.',
          '<b>Progrès</b> : <b>Missions</b> (pour le groupe, individuelles ; ouvert de base), <b>Skills</b> (le <b>Passeport de compétences</b> : les étoiles de chaque enfant, carte par carte ; le <b>Catalogue</b> : toutes les étoiles, cartes repliées, une étoile touchée se donne à des enfants <b>en mission</b> ou <b>acquise</b> ; le bouton <b>Évaluer</b> pour un atelier ou une journée d\'évaluation) et <b>Prépa physique</b> (les résultats de votre enfant à confirmer, ça bouge, <b>À relancer</b> (rien noté depuis 7 jours, à déplier), le classement, les progrès aux bilans).',
          '👏 <b>Bravo</b> : un enfant a fait sa séance ? Touchez « 👏 Bravo » sur sa ligne, dans <b>Progrès › Prépa physique › Ça bouge</b>, dans la <b>cloche</b> ou sur sa <b>fiche › Prépa</b> : c\'est envoyé, l\'enfant et sa famille le voient (une alerte sur le téléphone s\'ils l\'ont allumée). Retouchez « Envoyé » pour ajouter un petit mot ou retirer le bravo. Pas d\'XP : c\'est un encouragement. Les enfants peuvent aussi se dire bravo entre eux (un mot tout prêt, jamais de texte libre) : vous le voyez sous la séance.',
          '👏 <b>Bravos à donner</b> (Progrès › Prépa physique, au-dessus de Ça bouge) : chaque enfant qui a fait une séance depuis votre dernier bravo, avec 3 mots proposés (pas un mot qu\'il vient de recevoir ; le 1er est différent pour chaque enfant). Touchez un mot : le bravo part avec ce mot. Le crayon pour écrire le vôtre. <b>Bravo à tous</b> : chacun reçoit son premier mot proposé.',
          '<b>Enfants</b> : la fiche terrain du groupe, une ligne par enfant (plusieurs s\'il a plus de trois postes), avec ses postes abrégés dans une colonne à part, juste avant le niveau, alignés (Pil, Tal, 3eL, 9, 10, Ctr, Ail, toutes de la même largeur ; le préféré en pastille pleine et en premier, puis l\'ordre des postes ; deux enfants au même prénom : « Baptiste Lem. » sur téléphone), son niveau, ses passerelles (une ou deux) et son plaquage (le bouclier, de 0 à 3 ; vide = pas encore évalué). Toucher la ligne ouvre sa fiche, où tout se règle. Filtres : par niveau (en bas, ceux qui ont une passerelle vers ce niveau), puis par poste (ceux qui l\'ont en préféré, puis ceux qui peuvent aussi le jouer). Toucher un prénom ouvre sa fiche, partout dans l\'appli.',
          'La <b>flèche en haut à gauche</b>, sur tous les écrans, ramène à l\'écran d\'avant, là où vous étiez. Tout en haut d\'un écran, <b>tirez vers le bas</b> puis relâchez pour l\'actualiser (résultats, présents, compos). Quand une nouvelle version de l\'appli sort, elle se met à jour toute seule, à l\'ouverture ou en y revenant (ou en tirant pour actualiser) ; le numéro de version est en bas des réglages.',
          'L\'<b>engrenage</b>, en haut à droite : mon enfant, mon code, les éducs (admin), les familles et leurs codes, Spond (admin), cet appareil, l\'aide et les nouveautés.',
          '<b>Mon enfant</b> : vous êtes aussi parent d\'un joueur ? Choisissez-le dans l\'engrenage : ses exploits à confirmer arrivent dans Progrès › Prépa physique.',
          'Progrès › Prépa physique › <b>Le classement</b> : tout le groupe ou une ligue à la fois, avec la liste des joueurs pas encore classés. <b>Progrès aux bilans</b> : test par test, les joueurs classés selon leur progrès depuis le bilan d\'avant.',
          '<b>À confirmer</b> (Progrès › Prépa physique) : les exploits de <b>votre enfant</b> (relié à votre profil dans l\'engrenage › Mon enfant) ; les autres résultats comptent tout de suite. Confirmer / Ce n\'est pas ça s\'allument, puis <b>Enregistrer mes choix</b>. Les exploits des autres enfants sont confirmés par leur famille.'
        ])) +
      card('e-fiche', 'user', '#FFC23D', 'La fiche d\'un enfant', 'Touchez un prénom',
        ul([
          'En haut : son niveau, ses postes préférés, ses passerelles. Puis 6 onglets : <b>Terrain</b> (niveau, passerelle, plaquage, postes préférés ★ — un ou plusieurs — et ceux qu\'il peut aussi jouer, enregistrés dès qu\'on touche ; postes souhaités, copains), <b>Skills</b> (valider ou retirer une étoile), <b>Missions</b> (sa mission perso et ses +1, les missions du groupe, ses mots), <b>Prépa</b>, <b>Historique</b> (plateaux et entraînements) et <b>Réglages</b> (famille, codes, classement, désactiver, et en bas son lien avec Spond). Elle s\'ouvre toujours sur Terrain (un lien précis, comme une alerte, ouvre le bon onglet ; la flèche Retour ramène là où vous étiez).',
          'Prépa : ses séances (touchez-en une pour le détail ; « 👏 Bravo » à droite pour le féliciter), sa <b>progression d\'un bilan à l\'autre</b>, ses records, ses niveaux.',
          '<b>Modifier les niveaux</b> (N1 à N4) si le bilan ne reflète pas ce que vous voyez sur le terrain : bouton Modifier, puis Enregistrer. Les parents peuvent aussi les ajuster.',
          '<b>Nouveau code provisoire</b> si l\'enfant a oublié le sien.',
          '<b>Masquer du classement</b>, ou <b>désactiver</b> un joueur qui a quitté le groupe (ses données sont gardées).'
        ])) +
      card('e-mission', 'ball', '#FFC23D', 'Postes et copains (jeu à 10)', 'Les missions « Choisis ton poste » et « Avec qui tu aimes jouer »',
        ul([
          'Deux missions séparées, chacune avec ses XP et son badge : « Choisis ton poste » (1 à 3 <b>postes</b>, dans l\'ordre), puis « Avec qui tu aimes jouer » (ses <b>copains</b>, sans limite ; débloquée une fois le poste choisi). Les copains sont secrets : ni les autres enfants ni les parents ne les voient.',
          'Chaque mission a sa page dans Progrès › Missions : <b>Choisis ton poste</b> (qui l\'a faite, les postes demandés, choix 1 et choix 2-3), <b>Avec qui tu aimes jouer</b> (les copains de chacun).',
          'La fiche d\'un joueur (onglet Terrain) montre les 2 missions : ses postes et son test « Aide-moi à choisir », puis, repliés « éducs uniquement », ses copains et ceux qui l\'ont choisi (⇄ = ils se sont choisis l\'un l\'autre).'
        ])) +
      card('skills-e', 'star', '#FFC23D', 'Skills, missions et +1', 'Progrès › Skills et Missions',
        ul([
          '<b>Évaluer</b> (le bouton de Progrès › Skills, ou « Évaluer des Skills » sur la page d\'une séance, après la séance) : une étoile, ou un <b>atelier prêt</b> (2 à 5 étoiles). Une étoile : la liste des présents ; un atelier : une <b>grille</b> enfants × étoiles. Touchez ceux qui ont réussi (règle des 3 essais : 2 réussis sur 3). Tout reste sur le téléphone, même sans réseau, puis <b>Envoyer</b> à la fin : les enfants découvrent leurs étoiles après l\'entraînement. Un éduc suffit ; validée par erreur ? « Retirer » sur sa fiche.',
          '<b>Atelier ou journée d\'évaluation</b> : faites les groupes d\'ateliers de la séance (Entraîn. › Ateliers) ; sur Évaluer, touchez le groupe qui arrive (G1, G2…) pour n\'afficher que lui. <b>Après un plateau</b> (« Faire briller des étoiles » sur sa page) : les étoiles touchées brillent. <b>Demandes des enfants</b> (le bouton à côté d\'Évaluer) : Oui ou Pas vu. <b>Passeport de compétences</b> : toutes les cartes de tous les enfants. <b>Catalogue</b> : pour découvrir les étoiles et en donner une à quelques enfants sans passer par une évaluation.',
          '<b>Mission principale</b> (Progrès › Missions › + Mission principale, ou depuis sa fiche) : 1 à 3 étoiles d\'une même carte, à <b>plusieurs enfants d\'un coup</b> (Tous, Présents, Sans mission), jusqu\'à une date (les prochaines vacances par défaut), avec un mot si vous voulez. Un <b>récapitulatif par enfant</b> montre ce que chacun reçoit (les étoiles qu\'il a déjà sont retirées, la mission remplacée). Une à la fois par enfant ; l\'enfant la voit en haut de ses Missions et sur sa carte Skills (cadre arc-en-ciel).',
          '<b>Le +1</b> : d\'un seul toucher, sur la page de l\'entraînement ou du plateau, dans Progrès, ou sur sa fiche ; « +1 avec un mot » pour ajouter une phrase et l\'occasion. Il dit « tu es sur la bonne voie » : l\'enfant et sa famille le voient comme un <b>encouragement</b> (qui, quand, à quelle occasion), sans total. Jusqu\'à 5 par étoile visée. <b>Au 3e, l\'appli propose de valider</b> : rien d\'automatique, c\'est vous qui décidez. Un parent ne donne jamais de +1.',
          '<b>Pour le groupe</b> : une vidéo YouTube et quelques questions, ou un QCM, avec une date limite et des XP. Vous voyez qui l\'a faite et la moyenne ; l\'auteur (ou l\'admin) peut changer la date ou la retirer.'
        ])) +
      card('e-compos', 'board', '#38E8FF', 'Les compos : plateaux et entraînements', 'Onglets Entraîn. et Plateaux',
        ul([
          '<b>Fiche terrain</b> (réglée par les éducs) : niveau <b>A</b> Confirmés, <b>B</b> Débrouillés, <b>C</b> Débutants ; <b>passerelles</b> (une ou deux) = peut jouer aussi dans un autre niveau, à tour de rôle ; <b>plaquage</b> de 0 à 3 (le bouclier ; vide = pas encore évalué ; rouge rosé dans une compo de plateau = sous le repère de l\'équipe, quel que soit le niveau de l\'enfant : 3 en A, 2 en B ; tenez le doigt sur le « ? » de la fiche pour la description de chaque niveau) ; un ou plusieurs <b>postes préférés ★</b> et les autres postes qu\'il peut tenir (avant, arrière ou les deux). Sans poste réglé, l\'appli prend ses vœux de la mission. Dans l\'onglet <b>Enfants</b>, « Répartition des postes » (replié) montre combien d\'enfants ont chaque poste (barre pleine : poste préféré ★ ; pâle : peut aussi jouer), pour tous ou par niveau avec les filtres ; le filtre de poste montre qui l\'a en préféré, puis qui peut aussi le jouer.',
          'Les événements arrivent de <b>Spond</b> avec les réponses des familles (ou s\'ajoutent à la main). Un éduc admin branche Spond dans l\'engrenage › Spond avec son propre compte : l\'appli suit les catégories dont il est coach, et les enfants Spond pas encore dans l\'appli s\'ajoutent d\'un geste (Enfants › Ajouter des enfants). Sur la page d\'un événement, touchez « Les présents » pour les corriger : la correction reste après chaque synchro.',
          'Les <b>noms</b> des enfants suivent Spond : une faute corrigée dans Spond arrive dans l\'appli à la synchro suivante (toutes les heures, ou « Actualiser »). Deux enfants avec le même prénom sont affichés avec leur nom de famille. Si un enfant de Spond est « sans doute déjà dans l\'appli », touchez <b>Relier</b> plutôt qu\'Ajouter : pas de doublon. Sous les présents d\'un événement, « Sur Spond, pas dans l\'appli » liste les inscrits Spond sans joueur dans l\'appli : des adultes, ou des enfants à ajouter ou à relier (Enfants › « Ajouter des enfants », section « Depuis Spond »).',
          '<b>Préparer la compo</b> : le format (jeu à 5 ou à 10), le nombre d\'équipes A, B et C, le nombre de <b>joueurs par équipe</b> (équilibré par défaut, à un joueur près ; « Ajuster » pour le régler équipe par équipe, le total doit faire le nombre de présents ; aussi en haut d\'une compo, ou « Refaire » avec 2 versions, pour la redemander, mais pas avec « Garder mes placements »), puis, juste en dessous, <b>Créer manuellement</b> (des équipes vides à remplir ; au jeu à 10, poste par poste) ou <b>Créer automatiquement</b>, qui déplie les <b>options</b> (le « ? » au début de chaque ligne donne la règle) et <b>Générer la compo</b> (ou <b>Générer 2 versions côte à côte</b>). Les options : <b>Organisation</b> par niveau ou <b>A forte</b> (une équipe A avec les Confirmés, complétée par les meilleurs B ; les autres équipes mélangent Débrouillés et Débutants, équilibrées) ; <b>Effectifs</b> équilibrés ou suivre les niveaux ; avec « Suivre les niveaux », personne ne change de niveau ; <b>Passerelles</b> : <b>plaquage d\'abord</b> (parmi ceux qui ont une passerelle, les meilleurs montent, les moins avancés descendent) ou <b>roulant</b> (chacun son tour, quel que soit le plaquage : une par équipe monte, vers A comme vers B, même si l\'équipe est pleine, et quelqu\'un descend en échange) ; quand les passerelles ne suffisent pas, d\'autres enfants changent selon le plaquage (vers le haut les meilleurs plaqueurs, vers le bas les moins avancés) ; <b>Équilibrer d\'abord</b> (jeu à 10) : <b>les postes</b> (par défaut : chaque équipe d\'un niveau a autant de piliers, de talonneurs, d\'ailiers… d\'après les postes ★ des fiches, et autant d\'enfants sans poste) ou <b>le plaquage</b> ; <b>Copains</b> : un copain pour chacun, copains d\'abord ou sans (ils ne comptent pas du tout). L\'appli équilibre toujours le plaquage et, au jeu à 10, les postes ★ dans un niveau ; « À regarder » signale un poste bien plus fourni dans une équipe que dans l\'autre. Une fois la compo faite, les options choisies sont <b>en haut de la compo</b> : touchez-les pour les changer, puis « Générer une nouvelle compo » (ou « Garder mes placements ») ; les boutons Publier, Au vote ou Envoyer sont juste en dessous ; à côté de « Publier », <b>Effacer</b> (la corbeille) efface le brouillon, après confirmation. Le bouclier « ≈ » d\'une équipe montre son plaquage moyen, le bouclier coché ses bons plaqueurs. Au jeu à 10, un plateau se fait par défaut avec <b>une équipe A et une équipe B</b> (les Débutants jouent en B ; les compteurs restent réglables), et chacun reçoit un poste pour le plateau, <b>remplaçants compris</b> (son poste principal d\'abord) : en haut de l\'équipe, <b>les postes de l\'équipe</b>, comme « Répartition des postes » en serré : une ligne par poste, sa barre (pleine = poste principal, pâle = peut aussi jouer) et à droite le nombre (principal + peut jouer), d\'après les fiches des joueurs de l\'équipe (sans les absents). <b>Affichage</b> : les équipes l\'une sous l\'autre (par niveau) ou <b>côte à côte</b>, au choix (gardé sur l\'appareil ; sans choix, côte à côte sur un grand écran comme l\'iPad en paysage). <b>Une compo publiée</b> s\'affiche en lecture : « <b>Modifier la compo</b> » (en haut de la compo, ou sur la page du plateau) la rouvre pour ajuster les équipes et les postes, puis « Enregistrer » (nouvelle version) ; « Terminer » la referme sans changement. <b>Avec qui ?</b> Au jeu à 10, la compo part des <b>présents</b> (par défaut) ou de <b>tout le groupe</b> : les absents (barrés, « absent ») et ceux qui n\'ont pas répondu sur Spond (un <b>?</b> doré cerclé collé à droite du prénom, expliqué dans la légende ; on peut les placer quand même ; le petit <b>?</b> orange à côté du bouclier veut dire « niveau à renseigner ») ; sur la ligne du plaquage et des passerelles, à droite, <b>les postes de sa fiche</b> comme dans la liste Enfants (pleine = préféré ; ses vœux avec la marque « vœux » tant que rien n\'est réglé ; alignés à gauche, au même endroit d\'un enfant à l\'autre quand la place le permet ; s\'il en a plus de trois, d\'autres rangées ; pas aux ateliers) sont alors marqués dans la compo, sans que l\'appli change les équipes ; un absent ne compte pas dans les places tenues (« 1 absent » en haut de l\'équipe) ; un enfant qui n\'est pas dans l\'événement Spond (pas encore relié, autre catégorie) est marqué « hors Spond », sans plus ; pour un événement ajouté à la main, ceux qui ne sont pas cochés sont absents ; « Actualiser » relit Spond tout de suite. Moins de 2 présents (Spond pas encore rempli) : choisissez « Tout le groupe ». Chaque équipe est rangée en deux parties (au jeu à 5 aussi, d\'après le poste principal de la fiche, même si le jeu à 5 ne donne pas de poste à jouer) : les <b>avants</b> en haut (piliers, talonneur, 3es lignes), les <b>arrières</b> dessous (9, 10, centres, ailiers). Au jeu à 10, derrière la mêlée : demi de mêlée, ouvreur, 1 centre et 2 ailiers. Quand une équipe est seule dans son niveau, ses joueurs s\'affichent sur deux colonnes.',
          '<b>Poste par poste</b> (jeu à 10, plateaux et matchs) : « Créer manuellement », ou en haut d\'une compo, ou en touchant le nom d\'une équipe ou une place vide (+). Une fenêtre par poste : les piliers, puis le talonneur, les 3es lignes, le 9, le 10, le centre, les ailiers (les 7 postes en haut pour y aller d\'un toucher, avec combien chaque équipe en a). La liste montre ceux dont c\'est le poste principal, puis ceux qui peuvent le jouer, puis les autres (repliés) ; dans chaque groupe : les A, puis les B qui ont une passerelle vers A, les B, les C qui ont une passerelle vers le haut, les C, et dans chacun du meilleur plaqueur au moins bon, les absents en bas ; les passerelles (⇅) à côté du niveau. Sur chaque ligne, un bouton par équipe (<b>1</b> et <b>2</b> aux matchs, <b>A</b> et <b>B</b> au plateau ; en pointillés quand ce n\'est pas son équipe d\'habitude : ni son niveau, ni une passerelle, sachant qu\'un Débutant joue en B s\'il n\'y a pas d\'équipe C ; on peut quand même le toucher) : touchez pour le mettre dans l\'équipe à ce poste, encore pour l\'enlever. Prenez-en autant que vous voulez (5 piliers, par exemple), puis <b>OK</b> passe au poste suivant. Pas de titulaires : la liste du poste. Au jeu à 5 : « Créer manuellement », puis « Ajouter des joueurs ».',
          '<b>Deux versions côte à côte</b> : « Générer 2 versions côte à côte » (dans « Créer automatiquement ») (ou « Ajouter une 2e version ») met V1 et V2 l\'une à côté de l\'autre, niveau par niveau. Chaque version se modifie à part ; les joueurs placés autrement sont entourés. À la fin, publiez celle que vous préférez, ou soumettez-les <b>au vote des éducs</b> : la majorité l\'emporte, l\'auteur départage en cas d\'égalité.',
          'Ajuster : touchez un joueur, puis l\'équipe où il va, ou un joueur d\'une autre équipe pour les échanger. « À regarder » signale les écarts (plaquage, effectifs, copains, postes, passerelles) et propose souvent la correction en un geste ; en haut de la compo, la puce orange (⚠ et le nombre) y descend. Un enfant qui ne vient pas : touchez-le, puis <b>Absent</b> (il est retiré des présents de l\'événement et barré dans la compo ; « Présent » le remet).',
          '<b>Un éduc suffit</b> : la compo publiée est celle du plateau. Un autre éduc qui n\'est pas d\'accord fait une <b>contre-proposition</b> (ses déplacements + pourquoi) ; l\'auteur l\'accepte ou la refuse avec un mot. Le jour du plateau, tout éduc peut corriger directement (dernière minute).',
          '<b>Partager</b> (sur une compo publiée) : le texte des équipes, à envoyer par WhatsApp aux éducs qui n\'ouvrent pas l\'appli (prénoms et postes seulement). <b>Légende et gestes</b> : repliés sous une ligne, en haut de la compo.',
          '<b>Les entraînements</b> : sur la page de l\'entraînement, d\'abord <b>les ateliers</b>, ensuite <b>les matchs</b>. Ateliers : groupes <b>par niveau</b> (A, B, C ; deux niveaux voisins ensemble si les effectifs le demandent), <b>équilibrés</b> (niveaux mélangés) ou <b>A forte</b> (un groupe A avec les Confirmés, complété par les meilleurs B, et des groupes B mélangés et équilibrés), avants et arrières <b>ensemble</b> ou <b>séparés</b> pour des ateliers à part ; vous choisissez le nombre de groupes, puis <b>Créer manuellement</b> (des groupes vides, nommés selon le choix des groupes : A1, B1… par niveau, G1, G2… équilibrés ; à remplir en touchant un enfant puis son groupe) ou <b>Créer automatiquement</b> (par niveau, équilibrés ou A forte, puis « Générer les groupes »). Matchs : <b>la page d\'un plateau</b> : le format, avec qui (les présents ou tout le groupe), les équipes par niveau (par défaut <b>2 équipes B</b> : tout le monde mélangé, niveaux, plaquage et postes équilibrés), les joueurs par équipe, puis « Créer manuellement » (poste par poste) ou « Créer automatiquement » (les mêmes options qu\'un plateau, « Générer les équipes » ou 2 versions côte à côte). Les matchs faits avant (Équipe 1 contre Équipe 2) restent comme ils sont ; « Reprendre » les remet en B1 et B2. Les matchs se jouent <b>avec des postes</b>, comme les plateaux à 10 : chacun reçoit le poste de sa fiche d\'abord, remplaçants compris ; touchez un joueur pour lui en donner un autre, juste pour ce match (même un poste qui n\'est pas sur sa fiche). Un enfant qui n\'a encore aucun poste n\'est jamais placé d\'office : il apparaît « <b>Sans poste</b> » en orange (dans son équipe et dans « À regarder ») ; touchez-le pour lui en donner un. Avant de proposer les matchs (et les plateaux), « Répartition des postes » montre les postes des présents. « Reprendre » repart des groupes du dernier entraînement. Les entraînements comptent aussi pour les passerelles (un groupe ou un match de niveau au-dessus) et pour les copains.',
          'Après le plateau ou l\'entraînement, les groupes deviennent l\'historique, sur la fiche de chaque joueur, à voir par plateaux, par entraînements ou en tout : niveaux et postes joués, avec quels copains et combien de fois (et ceux avec qui il n\'a pas encore joué), passages hors de son niveau. Les copains et les niveaux restent entre éducs.'
        ])) +
      card('e-ajout', 'plus', '#4D9BFF', 'Ajouter des joueurs et des familles', 'En début de saison ou en cours d\'année',
        ul([
          '<b>Ajouter un joueur</b> : prénom (ajoutez l\'initiale du nom si deux enfants ont le même prénom) et famille.',
          'Le site donne un <b>code provisoire</b> pour l\'enfant (45 jours) et, pour une nouvelle famille, un <b>code parent provisoire</b> (30 jours). Chacun choisit ensuite le sien. Bouton Copier / partager pour l\'envoyer par message.',
          'Frères et sœurs : choisissez la famille existante, ils partagent le même code parent.',
          'Engrenage › <b>Familles et codes</b> : un nouveau code provisoire pour une famille qui a perdu le sien.'
        ])) +
      card('e-regles', 'star', '#FF4FA3', 'Les règles du jeu', 'Ce que voient les enfants',
        '<p style="margin:0">Étoiles, séries, XP et grades, niveaux N1-N4, jauge du cycle, badges, défis, ligues, missions et Skills : tout est expliqué dans l\'onglet <b>Joueur</b>, pour pouvoir en parler avec eux à l\'entraînement.</p>' +
        '<button type="button" class="btn2 sm" data-act="guideTab" data-v="joueur">' + icon('right', 16) + ' Voir l\'onglet Joueur</button>');
  }

  // ---------- écran ----------
  app.route('/guide', function (p, q) {
    app.lsSet(KEY_VU, 1);
    var S = app.S;
    var pour = q.pour || (S.adult ? (S.adult.role === 'e' ? 'educ' : 'parent') : 'joueur');
    if (['joueur', 'parent', 'educ'].indexOf(pour) < 0) pour = 'joueur';
    var back = S.adult && !S.kid ? (S.adult.role === 'e' ? '#/educ/entrainements' : '#/parent') : S.kid ? '#/semaine' : '#/connexion';
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
      '<a class="btn2 grey" href="' + esc(back) + '" data-act="navBack" data-fb="' + esc(back) + '">' + icon('left', 16) + ' Retour</a></main>';
  }, { bg: '#16223F', neutral: true });

  MC.act.guideTab = function (b) {
    var q = app.current() && app.current().q || {};
    app.go('#/guide?pour=' + b.getAttribute('data-v') + (q.de ? '&de=' + encodeURIComponent(q.de) : ''), true);
    window.scrollTo(0, 0);
  };
})();
