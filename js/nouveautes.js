/* =========================================================
   Mode champion · M12 — NOUVEAUTÉS
   À chaque nouvelle fonction : ajouter UNE entrée en haut de MC.NEWS (date, pour qui, titre, une phrase, lien).
   L'appli fait le reste : fenêtre « Quoi de neuf ? » à l'ouverture (3 au plus, une seule fois, selon le profil)
   et historique (joueur : Moi › Aide et nouveautés ; parent : Plus ; éduc : l'engrenage).
   pour : 'k' joueur, 'f' parent, 'e' éduc. titre / texte / lien : un texte, ou { k:…, f:…, e:… } selon le profil.
   si : 'skills', 'copains' ou 'missionsEducs' = pas montrée aux enfants ni aux parents tant que cette partie
   n'est pas ouverte (MC.CONFIG.ENFANTS, V1 du 28/10) ; les éducs la voient toujours.
   ========================================================= */
window.MC = window.MC || {};

MC.NEWS = [
  // (31/10, v35) la répartition des postes et les postes aux matchs d'entraînement (éducs)
  { id: '2026-10-31-postes', date: '2026-10-31', pour: ['e'],
    titre: 'Les postes du groupe, et aux matchs',
    texte: 'Enfants › Niveaux et postes : « Répartition des postes » montre combien d\'enfants ont chaque poste, pour tous ou pour les A, les B, les C. Les matchs d\'entraînement se jouent maintenant avec des postes, comme les plateaux à 10 : touchez un joueur pour lui donner un autre poste, juste pour ce match. Un enfant sans poste apparaît « Sans poste » en orange.',
    lien: '#/educ/terrain' },
  // (31/10, v34) les alertes sur l'écran du téléphone, même appli fermée (iPhone : l'appli sur l'écran d'accueil)
  { id: '2026-10-31-alertes', date: '2026-10-31', pour: ['k', 'f', 'e'],
    titre: { k: 'Les alertes sur ton téléphone', f: 'Les alertes sur votre téléphone', e: 'Les alertes sur votre téléphone' },
    texte: {
      k: 'L\'appli peut te prévenir sur l\'écran du téléphone, même fermée : un résultat confirmé, un niveau changé. Allume-les dans Moi › Réglages › Mes notifications.',
      f: 'L\'appli peut vous prévenir sur l\'écran du téléphone, même fermée : une séance faite, un résultat à confirmer, une mission. Allumez-les dans Plus › Mes notifications. Sur iPhone, l\'appli doit être sur l\'écran d\'accueil.',
      e: 'L\'appli peut vous prévenir sur l\'écran du téléphone, même fermée : séances, bilans, réponses aux missions, demandes d\'étoiles, niveaux, compos. Allumez-les dans l\'engrenage › Mes notifications. Sur iPhone, l\'appli doit être sur l\'écran d\'accueil.'
    },
    lien: { k: '#/notifs/reglages', f: '#/parent/notifs/reglages', e: '#/educ/notifs/reglages' } },
  // (31/10, v33) la cloche des notifications, et l'appli qui rouvre son espace sans code
  { id: '2026-10-31-cloche', date: '2026-10-31', pour: ['k', 'f', 'e'],
    titre: { k: 'La cloche', f: 'La cloche : vos notifications', e: 'La cloche : vos notifications' },
    texte: {
      k: 'En haut de l\'écran, la cloche te dit ce qui s\'est passé pour toi : un résultat confirmé, une nouvelle mission, un niveau changé. Tu choisis ce que tu reçois dans Moi › Réglages.',
      f: 'En haut des écrans, la cloche dit ce qui s\'est passé : ses séances, ses résultats à confirmer, ses missions. Une pastille rose compte les nouveautés. Vous choisissez ce que vous recevez dans Plus › Mes notifications.',
      e: 'En haut des écrans, la cloche dit ce qui s\'est passé : séances, bilans, réponses aux missions et mots des enfants, demandes d\'étoiles, niveaux, votes et contre-propositions sur les compos. Réglez ce que vous recevez dans l\'engrenage › Mes notifications.'
    },
    lien: { k: '#/notifs', f: '#/parent/notifs', e: '#/educ/notifs' } },
  { id: '2026-10-31-reouvrir', date: '2026-10-31', pour: ['f', 'e'],
    titre: 'Votre espace, sans retaper votre code',
    texte: 'En rouvrant l\'appli, vous retrouvez votre espace directement. Le code n\'est redemandé que si un enfant a utilisé l\'appareil entre-temps (en revenant de son espace).' },
  // (29/10) le Retour = un vrai « précédent », tirer pour actualiser, l'arène en entier, la mission côté éduc, le mot pour les éducs
  { id: '2026-10-29-retour', date: '2026-10-29', pour: ['k', 'f', 'e'],
    titre: { k: 'Retour et actualiser', f: 'Retour et actualiser', e: 'Retour et actualiser' },
    texte: {
      k: 'La flèche en haut à gauche te ramène à l\'écran d\'avant, là où tu étais. Pour voir les dernières nouvelles : tire l\'écran vers le bas, puis lâche.',
      f: 'La flèche en haut à gauche, sur tous les écrans, ramène à l\'écran d\'avant, là où vous étiez. Pour actualiser : tirez l\'écran vers le bas depuis le haut, puis relâchez.',
      e: 'La flèche en haut à gauche, sur tous les écrans, ramène à l\'écran d\'avant, là où vous étiez. Pour actualiser : tirez l\'écran vers le bas depuis le haut, puis relâchez.'
    } },
  { id: '2026-10-29-mot', date: '2026-10-29', pour: ['k'],
    titre: 'Un mot pour les éducs',
    texte: 'Dans « Choisis ton poste », tu peux écrire un mot aux éducs : pourquoi ces postes, un poste que tu ne veux pas… Il part quand tu touches « Valider ».',
    lien: '#/mission/postes' },
  { id: '2026-10-29-arene', date: '2026-10-29', pour: ['k', 'f'],
    titre: 'L\'arène : toutes les épreuves',
    texte: { k: 'Le classement montre toutes les épreuves d\'un coup. Touche celles que tu veux garder, « Toutes » pour tout revoir.', f: 'Le classement montre toutes les épreuves d\'un coup. Touchez celles à garder, « Toutes » pour tout revoir.' },
    lien: { k: '#/classement', f: '#/parent/classement' } },
  { id: '2026-10-29-mission-educ', date: '2026-10-29', pour: ['e'],
    titre: 'Choisis ton poste : tout le groupe d\'un coup d\'œil',
    texte: 'Une ligne par enfant : son prénom, une coche verte quand c\'est fait, ses 3 choix. Touchez-le pour lire son mot (💬) et son test. Les postes ont maintenant un dégradé de couleurs, du pilier à l\'ailier.',
    lien: '#/educ/mission/poste' },
  { id: '2026-10-25-sans-code', date: '2026-10-25', pour: ['f', 'e'],
    titre: 'Son espace, sans son code',
    texte: { f: 'Touchez ▶ son prénom en haut à droite : l\'espace de votre enfant s\'ouvre directement, sans son code. Pour revenir : « Rendre le téléphone », puis votre code.', e: 'Votre enfant (engrenage › Mon enfant) : touchez ▶ son prénom en haut à droite, son espace s\'ouvre sans son code.' } },
  // (visuels v2, 25/10) la mission principale, puis les nouvelles cartes et le booster
  { id: '2026-11-mission-principale', date: '2026-10-25', pour: ['k', 'f', 'e'], si: 'skills',
    titre: { k: 'Ta mission principale', f: 'La mission principale', e: 'La mission principale, à plusieurs enfants d\'un coup' },
    texte: {
      k: 'Tes éducs te donnent 1 à 3 étoiles à décrocher, jusqu\'aux prochaines vacances. Elle est en haut de tes Missions, avec tes encouragements.',
      f: 'Les éducs donnent à votre enfant 1 à 3 étoiles Skills à décrocher, jusqu\'à une date. Elle est en haut de ses Missions, avec ses encouragements.',
      e: 'Progrès › Missions › + Mission principale : plusieurs enfants, une carte, 1 à 3 étoiles, une date de fin, un récapitulatif par enfant.'
    },
    lien: { k: '#/missions', f: '#/parent/missions', e: '#/educ/missions/nouvelle?type=perso' } },
  { id: '2026-11-skills-v2', date: '2026-10-25', pour: ['k', 'f', 'e'], si: 'skills',
    titre: { k: '8 cartes Skills et le booster', f: 'Skills : 8 cartes et des étoiles qui brillent', e: 'Skills v2 : 8 cartes, un seul écran Évaluer' },
    texte: {
      k: 'Nouvelles cartes : Maul, Défense, Porteur et Soutien. Quand une étoile arrive, l\'onglet Skills s\'allume en doré : ouvre ton booster ! Une étoile vue au plateau brille (+' + 50 + ' XP).',
      f: '4 nouvelles cartes (Maul, Défense, Porteur, Soutien). Une étoile vue au plateau brille ; votre enfant peut demander une étoile aux éducs.',
      e: 'Évaluer : une étoile ou un atelier (grille), les groupes d\'ateliers de la séance, gardé sur le téléphone puis envoyé à la fin ; après un plateau, les étoiles brillent ; les demandes des enfants en haut.'
    },
    lien: { k: '#/skills', f: '#/parent/skills', e: '#/educ/skills' } },
  { id: '2026-10-retour-adulte', date: '2026-10-24', pour: ['f', 'e'],
    titre: 'Revenir à votre espace en un geste',
    texte: 'Côté enfant, le bouton 🔒 Parent (ou Éduc) est en haut à droite, à la place du ▶ : votre code est redemandé.' },
  { id: '2026-10-2missions', date: '2026-10-24', pour: ['k', 'f', 'e'], si: 'copains',
    titre: { k: 'Le jeu à 10 : 2 missions pour toi', f: 'Le jeu à 10 : 2 missions', e: 'Le jeu à 10 : 2 missions séparées' },
    texte: {
      k: '« Choisis ton poste » puis « Avec qui tu aimes jouer » : chacune rapporte +200 XP et son badge.',
      f: 'Votre enfant choisit son poste, puis ses copains (secrets) : deux missions, chacune avec ses XP et son badge.',
      e: '« Choisis ton poste » et « Avec qui tu aimes jouer » sont séparées. Le suivi des deux : Progrès › Missions.'
    },
    lien: { k: '#/missions', f: '#/parent/missions', e: '#/educ/mission/poste' } },
  { id: '2026-10-passer', date: '2026-10-24', pour: ['f', 'e'],
    titre: 'Passer le téléphone à votre enfant',
    texte: { f: 'Touchez ▶ son prénom, en haut à droite : il arrive sur sa séance. Pour revenir : « Rendre le téléphone », puis votre code.', e: 'Votre enfant (engrenage › Mon enfant) a son bouton ▶ en haut à droite. Pour revenir : « Rendre le téléphone », puis votre code.' } },
  { id: '2026-10-codes4', date: '2026-10-24', pour: ['f', 'e'],
    titre: 'Votre code à 4 chiffres',
    texte: { f: 'Pour vous connecter : Adultes › Je suis parent › le prénom de votre enfant, puis votre code. Vous pouvez le changer dans Plus.', e: 'Pour vous connecter : Adultes › Je suis éduc › votre nom, puis votre code. Vous pouvez le changer dans l\'engrenage.' },
    lien: { f: '#/adultes/code', e: '#/adultes/code' } },
  { id: '2026-10-nav4', date: '2026-10-24', pour: ['k', 'f', 'e'], si: 'skills',
    titre: { k: 'Ton appli en 4 onglets', f: 'Votre espace en 4 onglets', e: 'Votre espace en 4 onglets' },
    texte: {
      k: 'Prépa (ta séance, tes bilans, l\'arène), Missions (ce que demandent tes éducs), Skills (ton carnet rugby) et Moi.',
      f: 'Prépa (les résultats à confirmer en premier, sa semaine, ses bilans, son classement), Missions, Skills et Plus. Changer d\'enfant : son prénom, en haut à gauche.',
      e: 'Entraîn., Plateaux, Progrès et Enfants : un onglet par usage. La gestion (mon enfant, codes, Spond) est derrière l\'engrenage, en haut à droite.'
    } },
  { id: '2026-10-skills-plus1', date: '2026-10-24', pour: ['k', 'f', 'e'], si: 'skills',
    titre: { k: 'Tes Skills et tes +1', f: 'Ses Skills, ses missions et les +1 des éducs', e: 'Skills, missions et +1' },
    texte: {
      k: 'Ton carnet : 4 cartes de 5 étoiles validées par tes éducs (+100 XP chacune). Ta mission perso : une étoile à décrocher, et des +1 quand tu es sur la bonne voie.',
      f: 'Les éducs valident ses étoiles Skills et lui donnent des missions : une étoile à décrocher, une vidéo, un QCM. Vous voyez ses +1 et leurs mots dans Missions.',
      e: 'Évaluer les Skills avec les présents, la journée d\'évaluation (2 essais sur 3), des missions pour le groupe ou pour un enfant, et le +1 d\'un seul toucher. Au 3e +1, l\'appli propose de valider l\'étoile.'
    },
    lien: { k: '#/skills', f: '#/parent/missions', e: '#/educ/skills' } },
  { id: '2026-10-compos', date: '2026-10-24', pour: ['e'],
    titre: 'Les compos des plateaux et des entraînements, dans l\'appli',
    texte: 'Onglets Entraîn. et Plateaux : les présents, les groupes d\'ateliers puis les matchs, la compo d\'un plateau proposée en un geste ou composée à la main (avants puis arrières), 2 versions côte à côte à soumettre au vote des éducs, les postes du plateau ; la fiche terrain et l\'historique de chaque enfant.',
    lien: '#/educ/plateaux' },
  { id: '2026-10-13-mission-jeu10', date: '2026-10-13', pour: ['k', 'f', 'e'], si: 'copains',
    titre: { k: 'Mission spéciale : prépare le jeu à 10', f: 'Mission spéciale : le jeu à 10', e: 'Les postes et les copains, dans l\'appli' },
    texte: {
      k: 'Choisis ton poste avec les cartes et le test, puis dis-nous avec qui tu aimes jouer (c\'est secret). +200 XP et un badge !',
      f: 'Votre enfant choisit son poste et ses copains pour le jeu à 10 (les copains restent entre lui et les éducs). C\'est dans son onglet Missions.',
      e: '« Choisis ton poste » est maintenant une mission dans l\'appli, avec les copains en plus. Tout est dans Progrès › Missions, et dans la fiche de chaque enfant.'
    },
    lien: { k: '#/mission', e: '#/educ/mission/poste' } },
  { id: '2026-10-12-nav', date: '2026-10-12', pour: ['k', 'f', 'e'],
    titre: { k: 'Une navigation plus simple', f: 'Votre espace en 4 onglets', e: 'Votre espace en 4 onglets' },
    texte: {
      k: 'En bas : Semaine, Profil, Classement. En haut à gauche, sur chaque écran : le bouton Retour.',
      f: 'Suivi, Progrès, Classement et Plus, en bas de l\'écran. Plusieurs enfants ? Changez d\'enfant en haut à gauche.',
      e: 'Vestiaire, Joueurs, Classement et Outils, en bas de l\'écran. Votre enfant : son bouclier en haut à droite.'
    } },
  { id: '2026-10-12-niveaux', date: '2026-10-12', pour: ['k', 'f'],
    titre: { k: 'Change de niveau après ta séance', f: 'Les niveaux bougent plus facilement' },
    texte: {
      k: 'Un exercice était trop facile ? À la fin de la séance, passe au niveau d\'après en un geste. Trop dur ? Reviens au niveau d\'avant.',
      f: 'Après une séance, votre enfant peut passer au niveau d\'après si un exercice était trop facile. Vous gardez la main dans Prépa › Bilans.'
    },
    lien: { f: '#/parent/bilans' } },
  { id: '2026-10-12-premiers-pas', date: '2026-10-12', pour: ['k'],
    titre: 'Tes premiers pas : +100 XP', texte: '4 petites missions pour bien démarrer, sur Ma semaine. Le bilan peut attendre : tu t\'entraînes déjà au niveau 1.' },
  { id: '2026-10-12-activite', date: '2026-10-12', pour: ['e'],
    titre: 'Ça bouge', texte: 'Le vestiaire montre les dernières séances et les bilans envoyés. Les joueurs ont leur onglet, avec « À relancer ».', lien: '#/educ/progres' },
  { id: '2026-10-12-reseau', date: '2026-10-12', pour: ['f', 'e'],
    titre: 'L\'appli s\'ouvre même quand le réseau traîne', texte: 'Et si quelque chose coince au démarrage : un bouton « Réparer l\'appli ».' },
  { id: '2026-10-12-partage', date: '2026-10-12', pour: ['f', 'e'],
    titre: 'Il s\'entraîne sur votre téléphone ?', texte: 'Votre espace se verrouille quand un enfant s\'en sert : votre code est redemandé.', lien: { f: '#/parent/plus', e: '#/educ/reglages' } },
  { id: '2026-10-12-classement', date: '2026-10-12', pour: ['f', 'e'],
    titre: { f: 'Le classement de votre enfant', e: 'Le classement de tout le groupe' },
    texte: { f: 'La ligue de votre enfant, comme il la voit.', e: 'Tout le groupe ou une ligue, avec ceux qui ne sont pas encore classés.' },
    lien: { f: '#/parent/classement', e: '#/educ/classement' } },
  { id: '2026-10-11-progression', date: '2026-10-11', pour: ['k', 'f', 'e'],
    titre: { k: 'Ta progression entre les bilans', f: 'Sa progression d\'un bilan à l\'autre', e: 'Les progrès du groupe aux bilans' },
    texte: { k: 'Regarde tout ce que tu as gagné depuis ton bilan d\'avant.', f: 'Chaque test, bilan après bilan, et le détail de chaque séance.', e: 'Test par test, ceux qui ont le plus progressé en haut.' },
    lien: { k: '#/progression', f: '#/parent/bilans', e: '#/educ/progres/bilans' } },
  { id: '2026-10-11-retour', date: '2026-10-11', pour: ['k'],
    titre: 'Un bouton Retour pendant la séance', texte: 'Touché « Suivant » trop vite ? Reviens à l\'exercice d\'avant.' },
  { id: '2026-10-11-details', date: '2026-10-11', pour: ['k'],
    titre: 'Détails et sécurité', texte: 'Sur chaque exercice : comment bien faire, les erreurs à éviter et comment ne pas se blesser.' },
  { id: '2026-10-11-mon-enfant', date: '2026-10-11', pour: ['e'],
    titre: 'Mon enfant', texte: 'Vous êtes aussi parent d\'un joueur ? Choisissez-le dans l\'engrenage : tout son suivi parent, sans changer de code.', lien: '#/educ/reglages' }
];

MC.news = (function () {
  var app = MC.app, ui = MC.ui, esc = ui.esc, icon = ui.icon;
  var KEY = 'mc-news';
  function all() { var o = app.lsGet(KEY); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function seen(role, id) { var l = all()[role + ':' + id]; return Array.isArray(l) ? l : []; }
  function pick(v, role) { return v && typeof v === 'object' ? v[role] : v; }
  function forRole(role) {
    return MC.NEWS.filter(function (n) { return n.pour.indexOf(role) >= 0 && pick(n.titre, role) && (role === 'e' || !n.si || MC.ouvert(n.si)); })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  // jamais ouvert sur cet appareil (aucune nouveauté vue ni écartée)
  function jamaisVu(role, id) { return !Object.prototype.hasOwnProperty.call(all(), role + ':' + id); }
  function unseen(role, id) { var s = seen(role, id); return forRole(role).filter(function (n) { return s.indexOf(n.id) < 0; }); }
  function markAll(role, id) { if (!id) return; var o = all(); o[role + ':' + id] = forRole(role).map(function (n) { return n.id; }); app.lsSet(KEY, o); }

  function item(n, role, fresh) {
    var lien = pick(n.lien, role);
    return '<li class="li newsit"><span class="grow">' + (fresh ? '<span class="pill" style="--pc:var(--pink);align-self:flex-start;margin-bottom:4px">Nouveau</span>' : '') + '<span class="t1">' + esc(pick(n.titre, role)) + '</span><span class="t2">' + esc(pick(n.texte, role) || '') + '</span>' +
      (lien ? '<a class="lnk" href="' + esc(lien) + '" style="margin-top:6px">Voir ' + icon('right', 12) + '</a>' : '') + '</span></li>';
  }
  // à l'ouverture de l'écran d'accueil du profil : une seule fois par nouveauté
  var showing = false;
  function maybeShow(role, id) {
    if (!id || showing || window.__MC_QUIET || document.querySelector('.modal')) return;
    // 1re ouverture : un message simple sur l'appli, pas la liste des mises à jour (des notions qu'on ne connaît pas encore)
    if (MC.accueil && MC.accueil.premiereFois && MC.accueil.premiereFois(role, id)) { showing = true; MC.accueil.bienvenue(role, id).then(function () { showing = false; }); return; }
    // 2e et 4e ouverture : comment mettre l'appli sur l'écran d'accueil (les nouveautés attendent l'ouverture suivante)
    var ri = MC.accueil && MC.accueil.rappelInstall ? MC.accueil.rappelInstall(role) : null;
    if (ri) { showing = true; ri.then(function () { showing = false; }); return; }
    var list = unseen(role, id);
    if (!list.length) return;
    showing = true;
    var kid = role === 'k', more = list.length - 3;
    ui.modal({
      title: 'Quoi de neuf ?',
      body: '<p class="kicker" style="margin:0">' + (kid ? 'Depuis ta dernière visite' : 'Depuis votre dernière visite') + '</p><ul class="list">' + list.slice(0, 3).map(function (n) { return item(n, role, true); }).join('') + '</ul>' +
        (more > 0 ? '<a class="lnk" href="' + page(role) + '">Et ' + more + ' autre' + (more > 1 ? 's' : '') + ' : toutes les nouveautés ' + icon('right', 12) + '</a>' : ''),
      actions: [{ label: kid ? 'OK, j\'ai compris' : 'Compris', value: 'ok', cls: 'btn' }],
      onOpen: function (host, close) {
        host.classList.add('sheet-news');
        host.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]')) { markAll(role, id); close('lien'); } });
      }
    }).then(function () { markAll(role, id); showing = false; });
  }
  function page(role) { return role === 'k' ? '#/nouveautes' : role === 'f' ? '#/parent/nouveautes' : '#/educ/nouveautes'; }
  function pageHtml(role, id, bar) {
    var before = seen(role, id), groups = [], cur = null;
    forRole(role).forEach(function (n) {
      if (!cur || cur.date !== n.date) { cur = { date: n.date, items: [] }; groups.push(cur); }
      cur.items.push(n);
    });
    var html = groups.map(function (g) {
      return '<section class="sec" style="gap:8px"><span class="kicker" style="color:var(--dim)">' + esc(ui.fmtDate(g.date)) + '</span><ul class="list">' +
        g.items.map(function (n) { return item(n, role, before.indexOf(n.id) < 0); }).join('') + '</ul></section>';
    }).join('');
    markAll(role, id);
    return '<main class="screen">' + bar + '<div class="head"><span class="kicker">Ce qui a changé</span><h1 class="big md">Les nouveautés</h1></div>' + html + '</main>';
  }
  app.route('/nouveautes', function () {
    return app.loadMe().then(function (me) { return pageHtml('k', me.joueur.id, MC.kidSubBar('#/aide', 'Aide', 'Les nouveautés')); });
  }, { kid: true, nav: 'moi' });
  app.route('/parent/nouveautes', function () {
    return MC.loadFamily().then(function (fam) { return pageHtml('f', fam.famille.id, ui.topbar({ back: '#/parent/plus', backLabel: 'Plus', title: 'Les nouveautés', help: ui.helpLink('parent') })); });
  }, { adult: 'f', nav: 'p:plus', bg: '#12333A' });
  app.route('/educ/nouveautes', function () {
    return MC.loadGroup().then(function (g) { return pageHtml('e', g.moi.id, ui.topbar({ back: '#/educ/reglages', backLabel: 'Réglages', title: 'Les nouveautés', help: ui.helpLink('educ') })); });
  }, { adult: 'e', nav: 'e:gear', bg: '#2A1640' });

  return { unseen: unseen, markAll: markAll, maybeShow: maybeShow, forRole: forRole, jamaisVu: jamaisVu };
})();
