/* =========================================================
   Mode champion · M12 — ACCUEIL DES NOUVEAUX
   - une visite de quelques écrans à la 1re ouverture (joueur 5, parent 3, éduc 3), à revoir depuis l'aide
   - une liste « premiers pas » tant qu'elle n'est pas finie (joueur : +100 XP à la fin)
   - quelques astuces, une seule fois
   Tout est retenu sur l'appareil, par personne (deux enfants sur le même téléphone ont chacun leur visite).
   ========================================================= */
window.MC = window.MC || {};

MC.accueil = (function () {
  var app = MC.app, ui = MC.ui, C = MC.CONTENT, L = MC.logic, esc = ui.esc, icon = ui.icon;
  var KEY = 'mc-ob';
  function all() { var o = app.lsGet(KEY); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function get(k) { return all()[k]; }
  function set(k, v) { var o = all(); if (v === null) delete o[k]; else o[k] = v; app.lsSet(KEY, o); }

  // ---------- visites ----------
  function needTour(role, id) {
    if (window.__MC_QUIET) return false;   // tests automatiques des anciens écrans
    if (!id || get('tour:' + role + ':' + id)) return false;
    if (role === 'k') {
      var me = app.S.me;
      return !!(me && me.joueur && me.joueur.id === id && !(me.seances || []).length);   // un joueur qui s'entraîne déjà n'a pas besoin de la visite
    }
    return true;
  }
  function markTour(role, id) {
    set('tour:' + role + ':' + id, Date.now());
    if (MC.news) MC.news.markAll(role, id);    // les nouveautés d'avant son arrivée ne le concernent pas
  }
  function tourLink(pour) {
    var S = app.S;
    if (pour === 'joueur') return S.kid ? '#/bienvenue?revoir=1' : '';
    if (pour === 'parent') return S.adult && S.adult.role === 'f' ? '#/parent/bienvenue?revoir=1' : '';
    if (pour === 'educ') return S.adult && S.adult.role === 'e' ? '#/educ/bienvenue?revoir=1' : '';
    return '';
  }
  var step = { k: 0, f: 0, e: 0 };
  function dots(n, i) { var o = '<div class="obdots" aria-label="Écran ' + (i + 1) + ' sur ' + n + '">'; for (var k = 0; k < n; k++) o += '<i class="' + (k <= i ? 'on' : '') + '"></i>'; return o + '</div>'; }
  function frame(role, n, i, art, kicker, title, body, next, opts) {
    opts = opts || {};
    // la barre du haut, comme partout : Retour (l'écran d'avant de la présentation, ou la quitter) et Passer
    var left = i > 0 ? '<button type="button" class="cbtn" data-act="obPrev" data-r="' + role + '" data-back aria-label="Retour : écran d\'avant">' + icon('left', 20) + '</button>'
      : '<button type="button" class="cbtn" data-act="obSkip" data-r="' + role + '" data-back aria-label="Quitter la présentation">' + icon('x', 20) + '</button>';
    var bar = ui.topbar({ left: left, kicker: 'Présentation · ' + (i + 1) + ' / ' + n, title: 'Bienvenue', help: false,
      right: i < n - 1 ? '<button type="button" class="lnk" data-act="obSkip" data-r="' + role + '" style="color:var(--soft);min-height:44px;padding:0 6px">Passer</button>' : '' });
    return '<main class="screen nonav obscreen">' + bar +
      '<div class="between" style="align-items:center">' + dots(n, i) + '<span></span></div>' +
      '<div class="obart">' + art + '</div>' +
      '<div class="head"><span class="kicker"' + (opts.kc ? ' style="color:' + opts.kc + '"' : '') + '>' + (i + 1) + ' / ' + n + ' · ' + esc(kicker) + '</span><h1 class="big md">' + title + '</h1></div>' +
      body + '<div class="sec obbtns">' + next + (i > 0 ? '<button type="button" class="btn2 grey" data-act="obPrev" data-r="' + role + '">' + icon('left', 16) + ' Écran d\'avant</button>' : '') + '</div></main>';
  }
  MC.act.obNext = function (b) { var r = b.getAttribute('data-r'); step[r]++; app.rerender(); window.scrollTo(0, 0); };
  MC.act.obPrev = function (b) { var r = b.getAttribute('data-r'); step[r] = Math.max(0, step[r] - 1); app.rerender(); window.scrollTo(0, 0); };
  MC.act.obSkip = function (b) { finish(b.getAttribute('data-r')); };
  function finish(role) {
    var S = app.S, home = role === 'k' ? '#/semaine' : role === 'f' ? '#/parent' : '#/educ/entrainements';
    var id = role === 'k' ? S.kid && S.kid.joueur.id : role === 'f' ? S.cache.family && S.cache.family.famille.id : S.cache.group && S.cache.group.moi.id;
    if (id) markTour(role, id);
    step[role] = 0;
    app.go(home, true);
  }

  // ----- joueur : 5 écrans -----
  app.route('/bienvenue', function () {
    return app.loadMe().then(function (me) { return kidTour(me); });
  }, { kid: true, busy: true, bg: '#1B2552' });
  function kidTour(me) {
    var k = me.joueur, i = Math.min(step.k, 4), n = 5;
    var nextBtn = '<button type="button" class="btn" data-act="obNext" data-r="k">' + (i === 0 ? 'C\'est parti' : 'Suivant') + ' ' + icon('right', 18) + '</button>';
    var noBilan = !(me.records || []).some(function (r) { return /^\d+$/.test(String(r.bilan)); });
    if (i === 0) return frame('k', n, i, '<span class="obshield">' + ui.avatar(k.prenom, k.couleur, 170) + '</span>', 'bienvenue',
      'Bienvenue dans l\'arène, ' + esc(k.prenom) + ' !', '<p class="lead">Ici, tu deviens plus fort, plus rapide et plus solide, comme les joueurs du XV de France. 5 choses à savoir, et c\'est parti.</p>', nextBtn);
    if (i === 1) {
      var wk = C.SEMAINE.map(function (tp, d) { var j = C.JOURS[tp]; return '<span style="--gc:' + j.color + '"><b>' + esc(j.court.charAt(0)) + '</b>' + (j.slot < 0 ? '<i class="zz">—</i>' : ui.starSvg(20, d < 3 || d === 5 ? '#FFC23D' : 'none', d < 3 || d === 5 ? '#FFC23D' : '#34405F')) + '</span>'; }).join('');
      return frame('k', n, i, '<div class="gweek obweek">' + wk + '</div><div class="note gold" style="margin-top:12px">' + icon('gift', 30) + '<span>6 étoiles dans la semaine : le coffre s\'ouvre, <b>+1 étoile bonus</b>.</span></div>', 'tes étoiles',
        '1 séance =<br>1 étoile', '<p class="lead">Chaque jour, ta mission t\'attend dans <b>Ma semaine</b> : 15 à 20 minutes. Un jour raté ? Tu le rattrapes un autre jour de la même semaine.</p>', nextBtn);
    }
    if (i === 2) return frame('k', n, i, '<svg class="obring" viewBox="0 0 200 200" role="img" aria-label="Le chrono de la séance"><circle cx="100" cy="100" r="82" fill="none" stroke="#1E2740" stroke-width="14"/><circle cx="100" cy="100" r="82" fill="none" stroke="#3DFFB0" stroke-width="14" stroke-dasharray="515" stroke-dashoffset="190" transform="rotate(-90 100 100)" style="filter:drop-shadow(0 0 8px #3DFFB0)"/><text x="100" y="108" text-anchor="middle" font-family="Chakra Petch,monospace" font-weight="700" font-size="56" fill="#E8ECF7">30</text><text x="100" y="134" text-anchor="middle" font-family="Chakra Petch,monospace" font-weight="600" font-size="12" letter-spacing="2" fill="#8A93AD">IL RESTE</text></svg>', 'la séance guidée',
      'Le site<br>te guide', '<p class="lead">Touche <b>GO</b> : le chrono, les bips et le bonhomme animé te montrent quoi faire. <b>Détails</b> explique comment bien faire sans te blesser, et <b>Retour</b> annule un clic de trop.</p>', nextBtn, { kc: 'var(--green)' });
    if (i === 3) return frame('k', n, i, '<div class="obtests">' + C.TESTS.map(function (t) { return '<span>' + esc(t.court) + '</span>'; }).join('') + '</div>', 'le bilan',
      'Le bilan, c\'est quoi ?', '<ul class="obul"><li><b>12 petits tests</b> (sauts, gainage, navette…), toutes les 8 semaines environ, <b>avec un adulte</b> qui regarde et compte.</li>' +
      '<li>Il <b>règle tes niveaux</b> exercice par exercice, et tes résultats deviennent tes <b>records</b>.</li>' +
      '<li>' + (noBilan ? '<b>Pas encore fait ? Pas grave :</b> tu peux t\'entraîner tout de suite, au niveau 1. Tu feras ton bilan quand un adulte sera là.' : 'Tu l\'as déjà fait : tes niveaux sont réglés. Le prochain arrive dans quelques semaines.') + '</li></ul>', nextBtn, { kc: 'var(--cyan)' });
    var last = '<button type="button" class="btn green" data-act="obDoneKid">' + icon('play', 18) + ' Je commence' + (noBilan ? ' au niveau 1' : '') + ' !</button>' +
      (noBilan ? '<a class="btn2 gold" href="#/bilan" data-act="obBilan">' + icon('trophy', 16) + ' D\'abord mon bilan, avec un adulte</a>' : '');
    return frame('k', n, i, '<div class="obgrades">' + C.GRADES.slice(0, 4).reverse().map(function (g, j) { return '<span class="' + (j === 3 ? 'me' : '') + '"><b>' + esc(g.nom) + '</b><small>' + ui.fmtNum(g.xp) + ' XP</small></span>'; }).join('') + '</div>', 'monte en grade',
      'Deviens une légende', '<p class="lead">Chaque séance rapporte des <b>XP</b> : tu montes de grade, tu débloques des <b>badges</b> et tu entres dans <b>l\'arène</b> face aux joueurs de ton niveau. Et dans <b>Missions</b> et <b>Skills</b>, tes éducs te lancent des défis rugby et valident tes étoiles.</p>' +
      '<div class="note cyan">' + icon('star', 20) + '<span>Pour bien démarrer : <b>tes premiers pas</b>, 4 petites missions sur Prépa › Ma semaine, <b>+' + C.XP.premiersPas + ' XP</b> à la fin.</span></div>', last, { kc: 'var(--violet)' });
  }
  MC.act.obDoneKid = function () { finish('k'); };
  MC.act.obBilan = function () { var id = app.S.kid && app.S.kid.joueur.id; if (id) markTour('k', id); step.k = 0; app.go('#/bilan', true); };

  // ----- parent : 3 écrans -----
  app.route('/parent/bienvenue', function () {
    return MC.loadFamily().then(function (fam) { return parentTour(fam); });
  }, { adult: 'f', bg: '#12333A' });
  function famName(fam) { var n = fam.famille.nom || 'famille'; return /^famille/i.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n; }
  function prenoms(fam) { var l = fam.enfants.map(function (e) { return e.joueur.prenom; }); return l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : (l[0] || 'votre enfant'); }
  function parentTour(fam) {
    var i = Math.min(step.f, 2), n = 3, P = prenoms(fam), one = fam.enfants.length === 1 ? fam.enfants[0].joueur : null;
    var nextBtn = '<button type="button" class="btn" data-act="obNext" data-r="f">Suivant ' + icon('right', 18) + '</button>';
    function li(t) { return '<li class="row" style="align-items:flex-start">' + icon('check', 18, 'style="color:var(--green);flex:none;margin-top:2px"') + '<span>' + t + '</span></li>'; }
    if (i === 0) return frame('f', n, i, '<span class="obshield">' + (one ? ui.avatar(one.prenom, one.couleur, 150) : ui.avatar('M', '#3DFFB0', 150).replace('>M<', '>M12<')) + '</span>', 'espace parent',
      'Bienvenue, ' + esc(famName(fam)), '<p class="lead">Mode champion, c\'est le carnet de prépa physique des M12, en version jeu vidéo. ' + esc(P) + ' s\'entraîne' + (fam.enfants.length > 1 ? 'nt' : '') + ' à la maison, vous suivez ses progrès.</p>' +
      '<ul class="obul plain">' + li('Préparé par les éducateurs M12, adapté aux 9-11 ans : poids du corps, aucune charge.') + li('15 à 20 minutes, 4 jours par semaine, guidé exercice par exercice.') + li('Ni publicité, ni compte à créer. Les codes sont gardés chiffrés.') + '</ul>', nextBtn, { kc: 'var(--green)' });
    if (i === 1) return frame('f', n, i, '', 'votre rôle · 2 minutes par semaine', 'Vous gardez la main',
      '<div class="sec">' +
      '<div class="note">' + icon('pulse', 24, 'style="color:var(--cyan)"') + '<span><b>Suivre</b> : chaque séance, la progression d\'un bilan à l\'autre (onglet Prépa), les missions et les +1 de ses éducs, et ses Skills.</span></div>' +
      '<div class="note pink">' + icon('check', 24) + '<span><b>Confirmer ses résultats</b> : bilans et défis. Votre OK les fait entrer dans son classement. Une pastille rose vous prévient.</span></div>' +
      '<div class="note gold">' + icon('up', 24) + '<span><b>Ajuster ses niveaux</b> : trop facile, trop dur ? Vous pouvez changer le niveau de chaque exercice.</span></div></div>', nextBtn, { kc: 'var(--green)' });
    var shared = app.sharedDevice();
    return frame('f', n, i, '', 'une question pour bien régler l\'appli', esc(one ? one.prenom : 'Vos enfants') + ' s\'entraîne' + (one ? '' : 'nt') + ' sur quel appareil ?',
      '<div class="sec">' +
      '<button type="button" class="choice' + (shared ? ' on' : '') + '" data-act="obShared" data-v="1" aria-pressed="' + shared + '"><span class="lb">Mon téléphone ou ma tablette<small>Votre espace se verrouille quand ' + esc(one ? one.prenom : 'votre enfant') + ' s\'en sert : votre code est redemandé.</small></span><span class="rd"></span></button>' +
      '<button type="button" class="choice' + (!shared ? ' on' : '') + '" data-act="obShared" data-v="0" aria-pressed="' + !shared + '"><span class="lb">' + (one ? 'Son' : 'Leur') + ' propre appareil<small>Vous restez connecté sur le vôtre.</small></span><span class="rd"></span></button>' +
      '<p class="small" style="margin:0">Modifiable à tout moment dans Plus.</p></div>',
      '<button type="button" class="btn" data-act="obDone" data-r="f">Entrer dans mon espace ' + icon('right', 18) + '</button>', { kc: 'var(--green)' });
  }
  MC.act.obShared = function (b) { app.setShared(b.getAttribute('data-v') === '1'); app.rerender(); };
  MC.act.obDone = function (b) { finish(b.getAttribute('data-r')); };

  // ----- éduc : 3 écrans -----
  var pick = null;
  app.route('/educ/bienvenue', function () {
    return MC.loadGroup().then(function (g) { return educTour(g); });
  }, { adult: 'e', bg: '#2A1640' });
  function educTour(g) {
    var i = Math.min(step.e, 2), n = 3;
    var nextBtn = '<button type="button" class="btn" data-act="obNext" data-r="e">Suivant ' + icon('right', 18) + '</button>';
    var players = g.joueurs.filter(function (p) { return p.joueur.actif; });
    if (i === 0) {
      var pend = 0; players.forEach(function (p) { p.records.forEach(function (r) { if (r.statut === 'attente') pend++; }); });
      return frame('e', n, i, '<div class="grid3" style="width:100%"><div class="tile"><span class="v">' + players.length + '</span><span class="l">joueurs</span></div><div class="tile"><span class="v" style="color:var(--green)">' + players.filter(function (p) { return p.joueur.aUnCode; }).length + '</span><span class="l">connectés</span></div><div class="tile"><span class="v" style="color:var(--pink)">' + pend + '</span><span class="l">à valider</span></div></div>', 'espace éduc',
        'Bienvenue, ' + esc(g.moi.nom), '<p class="lead">4 onglets, un par usage : <b>Entraîn.</b> (présents, ateliers, matchs), <b>Plateaux</b> (compos), <b>Progrès</b> (prépa physique, Skills, missions) et <b>Enfants</b>. La gestion est derrière l\'engrenage, en haut.</p>', nextBtn, { kc: 'var(--violet)' });
    }
    if (i === 1) return frame('e', n, i, '', 'votre semaine type · 5 minutes', 'Trois réflexes',
      '<div class="sec">' +
      '<div class="note pink"><span class="pill" style="--pc:var(--pink)">1</span><span><b>Confirmer les résultats de votre enfant</b> (s\'il est dans le groupe) : une pastille rose sur Progrès vous prévient. Ceux des autres enfants, c\'est leur famille.</span></div>' +
      '<div class="note gold"><span class="pill" style="--pc:var(--gold)">2</span><span><b>Encourager</b> : à l\'entraînement, un <b>+1</b> d\'un seul toucher sur la mission d\'un enfant présent ; au 3e, l\'appli propose de valider son étoile Skills.</span></div>' +
      '<div class="note"><span class="pill" style="--pc:var(--cyan)">3</span><span><b>Relancer ceux qui décrochent</b> : Enfants › « À relancer » (rien depuis 7 jours, ou jamais connecté).</span></div></div>', nextBtn, { kc: 'var(--violet)' });
    if (!pick) pick = (g.moi.enfants || []).slice();
    var list = players.slice().sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
    return frame('e', n, i, '', 'éduc et parent', 'Votre enfant est dans le groupe ?',
      '<p class="small" style="margin:0">Choisissez-le : vous aurez son suivi parent depuis votre espace éduc, sans changer de code.</p>' +
      '<div class="kidpick">' + list.map(function (p) { var on = pick.indexOf(p.joueur.id) >= 0; return '<button type="button" class="opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="obPick" data-id="' + esc(p.joueur.id) + '">' + esc(p.joueur.prenom) + '</button>'; }).join('') + '</div>',
      '<button type="button" class="btn" data-act="obEducDone">' + (pick.length ? 'C\'est noté, entrer au vestiaire' : 'Pas d\'enfant dans le groupe') + ' ' + icon('right', 18) + '</button>', { kc: 'var(--violet)' });
  }
  MC.act.obPick = function (b) { var id = b.getAttribute('data-id'), k = pick.indexOf(id); if (k >= 0) pick.splice(k, 1); else pick.push(id); app.rerender(); };
  MC.act.obEducDone = function (b) {
    var g = app.S.cache.group, before = (g && g.moi.enfants || []).slice().sort().join(','), now = (pick || []).slice().sort().join(',');
    if (!g || before === now) { pick = null; finish('e'); return; }
    b.disabled = true;
    app.adultCall('mesEnfants', { ids: pick }).then(function (r) {
      g.moi.enfants = r.enfants; app.lsSet('mc-group', { tok: app.S.adult.token, data: g });
      pick = null; finish('e');
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- listes « premiers pas » ----------
  function chk(done, label, sub, act, attrs) {
    var inner = '<span class="bx">' + icon('check', 16) + '</span><span class="lb">' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span>';
    if (done) return '<div class="chk done">' + inner + '</div>';
    return '<' + (act.charAt(0) === '#' ? 'a href="' + act + '"' : 'button type="button" data-act="' + act + '"') + ' class="chk"' + (attrs || '') + '>' + inner + icon('right', 16, 'style="color:var(--dim);flex:none"') + '</' + (act.charAt(0) === '#' ? 'a' : 'button') + '>';
  }
  function box(title, list, hideKey, pill) {
    var done = list.filter(function (x) { return x.done; }).length, n = list.length;
    return '<section class="card cyan obchk"><div class="between"><span class="hud" style="color:var(--cyan)">' + esc(title) + ' · ' + done + ' / ' + n + '</span>' + (pill || '') +
      '<button type="button" class="lnk" data-act="obHide" data-k="' + esc(hideKey) + '" style="color:var(--dim)">Masquer</button></div>' +
      '<div class="xpbar" style="height:6px"><i style="width:' + Math.round(done / n * 100) + '%"></i></div>' + list.map(function (x) { return x.html; }).join('') + '</section>';
  }
  MC.act.obHide = function (b) { set('hide:' + b.getAttribute('data-k'), Date.now()); app.rerender(); };

  // joueur
  var MAISON = ['cros', 'capuozzo', 'dupont', 'meafou'];
  function kidSteps(me) {
    var id = me.joueur.id, t = L.dayType(L.today());
    var seance = (me.seances || []).some(function (s) { return MAISON.indexOf(s.type) >= 0; });
    var bilan = (me.records || []).some(function (r) { return /^\d+$/.test(String(r.bilan)); });
    var arene = !!get('arene:' + id);
    var go = C.JOURS[t] && C.JOURS[t].maison ? '#/jour/' + t : '#/jour/cros';
    return [
      { done: true, html: chk(true, 'Choisir mon code secret') },
      { done: seance, html: chk(seance, 'Faire ma 1re séance', 'Avec le guidage, c\'est plus facile : 15 à 20 min', go) },
      { done: bilan, html: chk(bilan, 'Passer mon bilan 0', 'Avec un adulte. Tu peux t\'entraîner avant !', '#/bilan') },
      { done: arene, html: chk(arene, 'Visiter l\'arène', 'Le classement des joueurs de ton niveau', '#/classement') }
    ];
  }
  function hasPP(me) { return (me.journal || []).some(function (j) { return j.type === 'premiers_pas'; }); }
  function kidChecklistShown(me) {
    var id = me.joueur.id;
    if (get('hide:k:' + id) || hasPP(me) || get('pp:' + id)) return false;
    return true;
  }
  var claiming = {};
  function kidChecklist(me) {
    if (!kidChecklistShown(me)) return '';
    var id = me.joueur.id, list = kidSteps(me);
    if (list.every(function (x) { return x.done; })) {
      if (!claiming[id]) {
        claiming[id] = 1;
        setTimeout(function () {
          app.kidCall('updateMe', { journal: [{ type: 'premiers_pas', data: { at: L.today() } }] }).then(function (res) {
            app.setMe(res);
            if (!hasPP(res)) return;            // serveur pas encore à jour : on réessaiera à la prochaine ouverture
            set('pp:' + id, Date.now());
            ui.toast('Premiers pas réussis : +' + C.XP.premiersPas + ' XP !');
            if (location.hash.indexOf('#/semaine') === 0) app.rerender();
          }).catch(function () { claiming[id] = 0; });
        }, 400);
      }
      return '<section class="note green">' + icon('star', 24) + '<span><b>Premiers pas réussis !</b> Tes +' + C.XP.premiersPas + ' XP arrivent. Tu es prêt pour la suite.</span></section>';
    }
    return box('Mes premiers pas', list, 'k:' + id, '<span class="pill" style="--pc:var(--gold)">+' + C.XP.premiersPas + ' XP</span>');
  }
  function markArene(id) { if (id && !get('arene:' + id)) set('arene:' + id, Date.now()); }

  // parent
  function standalone() { try { return !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; } }
  function parentChecklist(fam) {
    var fid = fam.famille.id;
    if (get('hide:f:' + fid)) return '';
    var kids = fam.enfants.map(function (e) { return e.joueur; });
    var install = standalone() || !!get('done:install');
    var notCo = kids.filter(function (k) { return !k.aUnCode; });
    var bilanOk = fam.enfants.some(function (e) { return (e.records || []).some(function (r) { return /^\d+$/.test(String(r.bilan)) && r.statut === 'ok'; }); });
    var P = prenoms(fam);
    var list = [
      { done: true, html: chk(true, 'Entrer mon code famille') },
      { done: install, html: chk(install, 'Mettre l\'appli sur l\'écran d\'accueil', 'Elle s\'ouvre alors comme une vraie appli', 'howInstall') },
      { done: !notCo.length, html: chk(!notCo.length, 'Première connexion de ' + esc(P), 'Avec le code provisoire donné par l\'éducateur', 'obFirstCo') },
      { done: bilanOk, html: chk(bilanOk, 'Confirmer son bilan 0', 'Dès qu\'il l\'a envoyé : une pastille rose vous prévient', 'obBilanHow') }
    ];
    if (list.every(function (x) { return x.done; })) return '';
    return box('Premiers pas', list, 'f:' + fid);
  }
  MC.act.obFirstCo = function () {
    var fam = app.S.cache.family;
    if (!fam) return;
    var notCo = fam.enfants.map(function (e) { return e.joueur; }).filter(function (k) { return !k.aUnCode; });
    ui.modal({
      title: 'Première connexion',
      body: '<ol class="steps"><li><span class="num" style="--sc:var(--cyan)">1</span><span class="tx">Touchez <b>▶ son prénom</b>, en haut à droite de votre espace : le téléphone passe à votre enfant.</span></li>' +
        '<li><span class="num" style="--sc:var(--cyan)">2</span><span class="tx">Il tape son <b>code provisoire</b> (4 chiffres, donné par l\'éducateur), puis choisit sa couleur et son propre code secret.</span></li>' +
        '<li><span class="num" style="--sc:var(--cyan)">3</span><span class="tx">Une petite visite lui explique le jeu. Il peut s\'entraîner tout de suite.</span></li></ol>' +
        '<p class="small">Code provisoire perdu ? Créez-en un nouveau :</p>' +
        notCo.map(function (k) { return '<button type="button" class="btn2" data-act="kidCode" data-id="' + esc(k.id) + '" data-p="' + esc(k.prenom) + '">' + icon('key', 16) + ' Nouveau code provisoire pour ' + esc(k.prenom) + '</button>'; }).join(''),
      actions: [{ label: 'Compris', value: null, cls: 'btn' }]
    });
  };
  MC.act.obBilanHow = function () {
    ui.modal({
      title: 'Le bilan 0',
      body: '<p class="lead">12 petits tests (sauts, gainage, navette…) pour régler les niveaux de votre enfant. Il le lance depuis <b>Prépa › Bilans</b> : le bilan guidé enchaîne les tests avec la démo et le chrono. Comptez 45 minutes, avec vous à côté pour regarder et compter.</p>' +
        '<p class="small">Ensuite, ses résultats arrivent en haut de l\'onglet <b>Prépa</b> : touchez Confirmer (ou Refuser) pour chacun, puis « Valider mes choix ». Pas de bilan encore ? Il peut s\'entraîner au niveau 1 en attendant.</p>',
      actions: [{ label: 'Compris', value: null, cls: 'btn' }]
    });
  };

  // éduc
  function educChecklist(g) {
    var id = g.moi.id;
    if (get('hide:e:' + id)) return '';
    var players = g.joueurs.filter(function (p) { return p.joueur.actif; });
    var codes = !!get('done:e-codes:' + id);
    var tried = !!get('done:e-joueur:' + id) || app.recents().length > 0;
    var valid = players.some(function (p) { return p.records.some(function (r) { return r.statut === 'ok' && r.parQui; }); });
    var list = [
      { done: true, html: chk(true, 'Entrer mon code éduc') },
      { done: codes, html: chk(codes, 'Donner les codes aux familles', 'Code parent + code provisoire de chaque enfant', 'obCodes') },
      { done: tried, html: chk(tried, 'Essayer côté joueur', 'Pour voir ce que voient les enfants', 'obTry') },
      { done: valid, html: chk(valid, 'Valider les premiers résultats', 'Une pastille rose sur Progrès vous prévient', 'obValid') }
    ];
    if (list.every(function (x) { return x.done; })) return '';
    return box('Premiers pas', list, 'e:' + id);
  }
  MC.act.obCodes = function () {
    var id = app.S.cache.group && app.S.cache.group.moi.id;
    ui.modal({
      title: 'Les codes des familles',
      body: '<p class="lead">Chaque famille a un <b>code parent</b> et chaque enfant un code, tous à 4 chiffres : un code provisoire pour la 1re connexion, puis chacun choisit le sien.</p><p class="small">Les codes ne sont jamais réaffichés (ils sont chiffrés). L\'admin a la liste de départ. Une famille a perdu le sien ? Engrenage › Familles et codes en crée un provisoire.</p>',
      actions: [{ label: 'C\'est fait', value: 'ok', cls: 'btn' }, { label: 'Ouvrir Familles', value: 'fam', cls: 'btn2' }, { label: 'Plus tard', value: null, cls: 'btn2 grey' }]
    }).then(function (v) {
      if (v === 'ok' && id) { set('done:e-codes:' + id, Date.now()); app.rerender(); }
      if (v === 'fam') app.go('#/educ/familles');
    });
  };
  MC.act.obTry = function () {
    var id = app.S.cache.group && app.S.cache.group.moi.id;
    ui.modal({
      title: 'Côté joueur',
      body: '<p class="lead">L\'engrenage › <b>Côté joueur</b> : touchez un prénom (un joueur de test ou votre enfant), tapez son code, et lancez une séance pour voir ce que voient les enfants.</p><p class="small">Votre enfant s\'entraîne sur votre téléphone ? Choisissez-le dans l\'engrenage › Mon enfant : un bouton <b>▶ son prénom</b> apparaît en haut à droite et lui passe le téléphone. Vous revenez à votre espace par « Rendre le téléphone » (côté joueur) et votre code.</p>',
      actions: [{ label: 'Y aller', value: 'go', cls: 'btn' }, { label: 'C\'est fait', value: 'ok', cls: 'btn2' }, { label: 'Plus tard', value: null, cls: 'btn2 grey' }]
    }).then(function (v) {
      if (v === 'ok' && id) { set('done:e-joueur:' + id, Date.now()); app.rerender(); }
      if (v === 'go') { if (id) set('done:e-joueur:' + id, Date.now()); app.go(app.S.kid ? '#/semaine' : '#/connexion'); }
    });
  };
  MC.act.obValid = function () { var el = document.querySelector('[data-act="decAll"], .decis'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); else ui.toast('Rien à valider pour l\'instant : la pastille rose vous préviendra.'); };

  // ---------- astuces (une fois) ----------
  function tip(key, id, text) {
    if (get('tip:' + key + ':' + id)) return '';
    return '<div class="obtip" role="note"><span><b>Astuce</b>' + esc(text) + '</span><button type="button" class="obtipok" data-act="tipOk" data-k="' + esc(key + ':' + id) + '" aria-label="J\'ai compris">OK</button></div>';
  }
  MC.act.tipOk = function (b) { set('tip:' + b.getAttribute('data-k'), Date.now()); var t = b.closest('.obtip'); if (t) t.remove(); };
  function markDone(k) { set('done:' + k, Date.now()); }

  return { needTour: needTour, markTour: markTour, tourLink: tourLink, kidChecklist: kidChecklist, kidChecklistShown: kidChecklistShown, markArene: markArene,
    parentChecklist: parentChecklist, educChecklist: educChecklist, tip: tip, markDone: markDone };
})();
