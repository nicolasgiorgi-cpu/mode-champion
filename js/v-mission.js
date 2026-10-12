/* =========================================================
   Mode champion · M12 — la mission « Prépare le jeu à 10 »
   Côté joueur : la carte sur Ma semaine, les 7 cartes postes, la fiche d'un poste,
   le test « Aide-moi à choisir », les copains (secret), la récompense.
   Côté éduc : la vue du groupe (postes demandés, copains, reprise de l'ancien formulaire)
   et la partie « Jeu à 10 » de la fiche d'un joueur. Côté parent : où en est son enfant.
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon, M = MC.missions;
  var MID = 'jeu10';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- dessins (repris de « Choisis ton poste ») ----------
  var CREST = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4L90 18V48C90 72 72 88 50 97C28 88 10 72 10 48V18Z" fill="#0A0F1F" stroke="currentColor" stroke-width="3.2"/><path d="M50 12L82 23V48C82 67 68 80 50 88C32 80 18 67 18 48V23Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/><path d="M24 26C36 20 46 18 50 18" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round"/></svg>';
  var SYM = {
    colonne: '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M30 32h40"/><path d="M34 32l4-6h24l4 6"/><path d="M38 36v28M50 36v28M62 36v28"/><path d="M30 68h40M27 75h46"/></g>',
    cible: '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="50" r="19"/><circle cx="50" cy="50" r="6" fill="currentColor"/><path d="M50 22v10M50 68v10M22 50h10M68 50h10"/></g>',
    griffe: '<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M38 28L30 72"/><path d="M52 26L46 76"/><path d="M66 28L60 72"/></g>',
    eclair: '<path d="M56 20L32 54h16l-6 28 26-38H52z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>',
    oeil: '<g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 52C32 40 40 34 50 34S68 40 76 52C68 64 60 70 50 70S32 64 24 52z"/><circle cx="50" cy="52" r="9" fill="currentColor" fill-opacity="0.35"/><path d="M50 22v6M36 26l3 5M64 26l-3 5"/></g>',
    perce: '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M60 26v14M60 60v14"/><path d="M54 44l-4 6 4 6"/><path d="M26 50h44M60 38l12 12-12 12"/></g>',
    aile: '<g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M30 64C42 60 52 50 58 32C63 44 60 56 52 64"/><path d="M36 70C48 70 60 64 68 52"/><path d="M44 76C54 77 64 73 72 66"/></g>'
  };
  var Q_SYM = '<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M38 38c0-8 5.5-13 12-13s12 4.5 12 11c0 9-12 9.5-12 19"/></g><circle cx="50" cy="68" r="4.5" fill="currentColor"/>';
  function emblem(p) { return CREST + '<svg viewBox="0 0 100 100" aria-hidden="true">' + (SYM[p.emblem] || '') + '</svg>'; }
  var QI = {
    feinte: '<path d="M3 18l5-6 4 4 8-10"/><path d="M15 6h5v5"/>',
    colonne: '<path d="M5 7h14M6 7l1.5-2.5h9L18 7M8 9v8M12 9v8M16 9v8M5 19h14M4 21.5h16"/>',
    belier: '<path d="M19 4v16"/><path d="M3 12h11M10 8l4 4-4 4"/>',
    cible: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    eclair: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-5"/>',
    griffe: '<path d="M8 4L6 20M12.5 3.5L11 20.5M17 4l-2 16"/>',
    aimant: '<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 8h3M15 8h3"/>',
    oeil: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pied: '<ellipse cx="14" cy="9" rx="6.5" ry="4" transform="rotate(-30 14 9)"/><path d="M3 20l5-4M3 15l4-1.5M7 21l2-4"/>',
    perce: '<path d="M15 3v6M15 15v6"/><path d="M3 12h17M16 8l4 4-4 4"/>',
    bouclier: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    turbo: '<path d="M3 6l6 6-6 6M10 6l6 6-6 6M17 6l4 6-4 6"/>',
    essai: '<ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-35 12 12)"/><path d="M9 15l6-6M10.5 10.5l1.5 1.5M12 9l1.5 1.5M9 12l1.5 1.5"/>'
  };
  function qicon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (QI[n] || '') + '</svg>'; }
  var STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
  function nbStars(v) { return v >= 90 ? 5 : v >= 75 ? 4 : v >= 60 ? 3 : v >= 45 ? 2 : 1; }
  function stars(v, color) {
    var n = nbStars(v), out = '<span class="cp-stars" role="img" aria-label="' + n + ' étoiles sur 5">';
    for (var k = 0; k < 5; k++) out += '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '" fill="' + (k < n ? color : 'none') + '" stroke="' + (k < n ? color : '#34405F') + '" stroke-width="2" stroke-linejoin="round"/></svg>';
    return out + '</span>';
  }
  var SILHOUETTE = '<svg viewBox="0 0 110 130" aria-hidden="true"><circle cx="55" cy="42" r="24" fill="currentColor"/><path d="M8 130c4-34 24-52 47-52s43 18 47 52z" fill="currentColor"/></svg>';
  function hexA(hex, a) {
    var h = String(hex || '#888888').replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  function vars(p) { return '--c:' + p.color + ';--d:' + p.dark + ';--glow2:' + hexA(p.color, 0.28); }
  function ptags(ids, numbered) {
    return '<span class="ptags">' + (ids || []).map(function (id, i) {
      var p = M.poste(id);
      return p ? '<span class="ptag" style="--c:' + p.color + '">' + (numbered ? (i + 1) + ' · ' : '') + esc(p.nom) + '</span>' : '';
    }).join('') + '</span>';
  }
  MC.ptags = ptags;
  function fmtJour(iso) { return iso ? ui.fmtDate(iso) : ''; }

  // ---------- effet carte brillante : souris ET doigt ----------
  function shineAt(card, x0, y0, tilt) {
    var r = card.getBoundingClientRect();
    var x = Math.min(1, Math.max(0, (x0 - r.left) / r.width)), y = Math.min(1, Math.max(0, (y0 - r.top) / r.height));
    card.classList.add('is-shiny');
    card.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    card.style.setProperty('--px', (25 + x * 50).toFixed(1) + '%'); card.style.setProperty('--py', (25 + y * 50).toFixed(1) + '%');
    card.style.setProperty('--hyp', Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 1.6).toFixed(2));
    if (!reduceMotion) { card.style.setProperty('--ry', ((x - 0.5) * tilt).toFixed(1) + 'deg'); card.style.setProperty('--rx', ((0.5 - y) * tilt * 0.8).toFixed(1) + 'deg'); }
  }
  function shineOff(card) { card.classList.remove('is-shiny'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
  function bindTilt(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.cp-card'), function (card) {
      var offT;
      card.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') shineAt(card, e.clientX, e.clientY, 22); });
      card.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') shineOff(card); });
      function onT(e) { var t = e.touches && e.touches[0]; if (!t) return; clearTimeout(offT); shineAt(card, t.clientX, t.clientY, 12); }
      card.addEventListener('touchstart', onT, { passive: true });
      card.addEventListener('touchmove', onT, { passive: true });
      card.addEventListener('touchend', function () { offT = setTimeout(function () { shineOff(card); }, 450); }, { passive: true });
      card.addEventListener('touchcancel', function () { offT = setTimeout(function () { shineOff(card); }, 450); }, { passive: true });
    });
  }

  // ---------- les choix en cours (gardés sur l'appareil tant qu'ils ne sont pas envoyés) ----------
  var DKEY = 'mc-mission-' + MID;
  function brouillon(me) {
    var d = app.lsGet(DKEY), e = M.etat(me, MID);
    if (!d || typeof d !== 'object' || d.kid !== me.joueur.id) d = { kid: me.joueur.id };
    if (!d.dirtyP || !Array.isArray(d.postes)) { d.postes = e.postes.slice(0, 3); d.dirtyP = false; }
    if (!d.dirtyC || !Array.isArray(d.copains)) { d.copains = e.copains.slice(); d.dirtyC = false; }
    if (!d.quiz || !Array.isArray(d.quiz.ans)) {
      var a = e.quiz && Array.isArray(e.quiz.ans) ? e.quiz.ans : [];
      d.quiz = { ans: a, step: a.length === M.QUIZ.length ? M.QUIZ.length : 0 };
    }
    return d;
  }
  function garder(d) { app.lsSet(DKEY, d); }
  function quizFini(d) { return d.quiz.ans.length === M.QUIZ.length && d.quiz.ans.every(function (a) { return a && a.length; }); }

  // ======================================================================
  // CÔTÉ JOUEUR
  // ======================================================================
  // la carte « Mission spéciale » en haut de Ma semaine (rien si aucune mission en cours)
  MC.missionCard = function (me) {
    var list = M.pending(me);
    if (!list.length) return '';
    var D = list[0], e = M.etat(me, D.id), t = L.today();
    var started = e.postes.length > 0;
    return '<a class="mspec" href="#/mission" style="text-decoration:none;color:inherit">' +
      '<div class="between"><span class="hud" style="color:var(--gold)">' + icon('star', 14) + ' Mission spéciale</span>' + (t <= D.fin ? '<span class="small">jusqu\'au ' + esc(fmtJour(D.fin)) + '</span>' : '') + '</div>' +
      '<span class="big sm">' + esc(D.titre) + '</span>' +
      '<p class="lead" style="font-size:14px">' + esc(D.texte) + '</p>' +
      '<ul class="msteps"><li class="mstep' + (started ? ' done' : '') + '"><span class="bx">' + (started ? icon('check', 16) : '1') + '</span><span class="lb">Choisis ton poste' + (started ? '<small>' + e.postes.map(function (id) { return M.poste(id).nom; }).join(' · ') + '</small>' : '') + '</span></li>' +
      '<li class="mstep"><span class="bx">2</span><span class="lb">Avec qui tu aimes jouer<small>c\'est secret</small></span></li></ul>' +
      '<span class="mreward">' + icon('trophy', 16) + ' +' + C.XP.mission + ' XP et le badge « ' + esc((C.BADGES.filter(function (b) { return b.mission === D.id; })[0] || {}).nom || '') + ' »</span>' +
      '<span class="btn gold">' + (started ? 'Continuer la mission' : 'Commencer la mission') + '</span></a>';
  };

  // ----- la mission : où j'en suis -----
  app.route('/mission', function () {
    return app.loadMe().then(function (me) { return paintMission(me); });
  }, { kid: true, nav: 'semaine', live: true, bg: '#2E2612' });

  function paintMission(me) {
    var D = M.def(MID), e = M.etat(me, MID), t = L.today();
    var bd = C.BADGES.filter(function (b) { return b.mission === MID; })[0] || {};
    var s1 = e.postes.length > 0, s2 = e.copainsFait;
    var steps = '<ul class="msteps">' +
      '<li><a class="mstep' + (s1 ? ' done' : '') + '" href="#/mission/postes"><span class="bx">' + (s1 ? icon('check', 16) : '1') + '</span><span class="lb">Choisis ton poste' +
      '<small>' + (s1 ? 'Ton top : ' + e.postes.map(function (id, i) { return (i + 1) + '. ' + M.poste(id).nom; }).join(' · ') : 'Découvre les 7 postes, ou fais le test « Aide-moi à choisir »') + '</small></span>' + icon('right', 16) + '</a></li>' +
      '<li><a class="mstep' + (s2 ? ' done' : '') + '" href="#/mission/copains"><span class="bx">' + (s2 ? icon('check', 16) : '2') + '</span><span class="lb">Avec qui tu aimes jouer' +
      '<small>' + (s2 ? e.copains.length + ' copain' + (e.copains.length > 1 ? 's' : '') + ' choisi' + (e.copains.length > 1 ? 's' : '') + ' · c\'est secret' : 'Autant que tu veux, c\'est secret') + '</small></span>' + icon('right', 16) + '</a></li></ul>';
    var cta = !s1 ? '<a class="btn gold glow" href="#/mission/postes">Choisir mon poste</a>' :
      !s2 ? '<a class="btn gold glow" href="#/mission/copains">Choisir mes copains</a>' :
        '<div class="note green">' + icon('check', 22) + '<span><b>Mission accomplie !</b> Tu as gagné +' + C.XP.mission + ' XP et le badge « ' + esc(bd.nom) + ' ». Tu peux changer tes choix quand tu veux.</span></div>';
    var from = e.source === 'formulaire' && !s2 ? '<div class="note cyan">' + icon('info', 20) + '<span>Tes postes viennent du site « Choisis ton poste » : vérifie-les, puis choisis tes copains.</span></div>' : '';
    return '<main class="screen">' + MC.kidSubBar('#/semaine', 'Ma semaine', 'Mission spéciale') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale' + (t <= D.fin && !e.faite ? ' · jusqu\'au ' + esc(fmtJour(D.fin)) : '') + '</span>' +
      '<h1 class="big md" style="text-shadow:3px 3px 0 var(--pink),-2px -2px 0 var(--gold)">' + esc(D.titre) + '</h1>' +
      '<p class="lead">Après les vacances, on passe au jeu à 10 : chacun aura un poste. Aide les éducs à préparer les équipes !</p></div>' +
      from + steps +
      '<div class="grid2"><div class="tile" style="border-color:var(--gold)"><span class="v" style="color:var(--gold)">+' + C.XP.mission + '</span><span class="l">' + (e.faite ? 'XP gagnés' : 'XP à gagner') + '</span></div>' +
      '<div class="tile" style="align-items:center;flex-direction:row;gap:10px">' + MC.badgeIcon({ icon: bd.icon, color: bd.color }, e.faite, 44) + '<span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:13px;color:var(--soft)">Badge « ' + esc(bd.nom) + ' »</span></div></div>' +
      cta + '</main>';
  }

  // ----- les 7 cartes -----
  function cardHtml(p, rank) {
    var rows = p.stats.map(function (v, j) { return '<span class="cp-srow"><span>' + M.LABELS[j] + '</span>' + stars(v, p.color) + '</span>'; }).join('');
    return '<div class="cp-tilt" style="' + vars(p) + '"><a class="cp-card" href="#/mission/poste/' + esc(p.id) + '" aria-label="' + esc(p.nom + ' : ' + p.surnom + (rank >= 0 ? ', ton choix n°' + (rank + 1) : '')) + '"><span class="cp-in">' +
      '<span class="cp-art"><span class="cp-num">' + esc(p.n) + '</span>' + (rank >= 0 ? '<span class="cp-pick">CHOIX ' + (rank + 1) + '</span>' : '') + '<span class="cp-emblem">' + emblem(p) + '</span></span>' +
      '<span class="cp-body"><span><span class="cp-name">' + esc(p.nom) + '</span><span class="cp-role">' + esc(p.surnom) + ' · ' + esc(p.cls) + '</span></span>' +
      '<span class="cp-srows">' + rows + '</span></span><span class="cp-holo"></span><span class="cp-shine"></span></span></a></div>';
  }
  function barHtml(d) {
    var slots = '';
    for (var i = 0; i < 3; i++) {
      var p = M.poste(d.postes[i]);
      slots += p ? '<span class="cp-slot on" style="--c:' + p.color + '">' + (i + 1) + ' · ' + esc(p.code) + '</span>' : '<span class="cp-slot' + (i ? ' opt' : '') + '" aria-label="Choix ' + (i + 1) + (i ? ', facultatif' : '') + ' : vide">' + (i + 1) + '</span>';
    }
    return '<div class="cp-bar"><span class="lbl">Ton top<br>1 à 3</span><div class="cp-slots">' + slots + '</div>' +
      '<button type="button" class="btn" data-act="msnSavePostes"' + (d.postes.length ? '' : ' disabled') + '>Valider</button></div>';
  }
  app.route('/mission/postes', function (p, q, cur) {
    return app.loadMe().then(function (me) {
      cur.after = function (root) { bindTilt(root); };
      return paintPostes(me);
    });
  }, { kid: true, nav: 'semaine', bg: '#1B2552' });
  function paintPostes(me) {
    var d = brouillon(me), qr = quizFini(d) ? M.quizResults(d.quiz.ans) : null;
    var quiz = '<div class="cp-tilt cp-wide" style="--c:#38E8FF;--d:#FF4FA3;--glow2:rgba(56,232,255,.22)"><a class="cp-card cp-q" href="#/mission/quiz"><span class="cp-in">' +
      '<span class="cp-qem">' + CREST + '<svg viewBox="0 0 100 100" aria-hidden="true">' + Q_SYM + '</svg></span>' +
      '<span class="cp-qtxt"><span class="cp-qk">PAS SÛR ? · 5 QUESTIONS</span><span class="cp-qt">Aide-moi à choisir</span><span class="cp-qs">Dis ce que tu aimes faire, on te propose 3 postes.</span>' +
      (qr ? '<span class="cp-qlast">Ton résultat : ' + qr.map(function (x) { return esc(x.p.nom); }).join(' · ') + '</span>' : '') + '</span>' +
      icon('right', 20, 'style="flex:none;color:var(--cyan)"') + '<span class="cp-holo"></span><span class="cp-shine"></span></span></a></div>';
    return '<main class="screen">' + MC.kidSubBar('#/mission', 'La mission', 'Choisis ton poste') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Étape 1 sur 2</span><h1 class="big md">Choisis<br>ton poste</h1>' +
      '<p class="lead">Touche une carte pour découvrir le poste, puis mets-le dans ton top. 1 à 3 choix, dans l\'ordre : un seul, c\'est déjà très bien.</p></div>' +
      '<div class="cp-grid">' + quiz + M.POSTES.map(function (p) { return cardHtml(p, d.postes.indexOf(p.id)); }).join('') + '</div>' +
      barHtml(d) + '</main>';
  }
  MC.act.msnSavePostes = function (b) {
    var me = app.S.me; if (!me) return;
    var d = brouillon(me);
    if (!d.postes.length) { ui.toast('Choisis au moins un poste.', true); return; }
    var p = { mission: MID, postes: d.postes };
    if (quizFini(d)) { p.quiz = { ans: d.quiz.ans }; p.quizTop = M.quizResults(d.quiz.ans).map(function (x) { return { id: x.p.id, pct: x.pct }; }); }
    b.disabled = true;
    app.kidCall('mission', p).then(function (res) {
      app.setMe(res);
      d.dirtyP = false; garder(d);
      var e = M.etat(res, MID);
      ui.toast('Ton top est enregistré !');
      app.go(e.copainsFait ? '#/mission' : '#/mission/copains');
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ----- la fiche d'un poste -----
  app.route('/mission/poste/:id', function (p) {
    return app.loadMe().then(function (me) { return paintPoste(me, p.id); });
  }, { kid: true, nav: 'semaine', bg: '#1B2552' });
  function paintPoste(me, id) {
    var p = M.poste(id);
    if (!p) { setTimeout(function () { app.go('#/mission/postes', true); }, 0); return null; }
    var d = brouillon(me), r = d.postes.indexOf(id);
    var li = function (a) { return a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); };
    var heros = p.heros.map(function (h) {
      var src = h.commons ? 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(h.commons) + '?width=480' : '';
      return '<div class="cp-hero"><div class="cp-hph">' + SILHOUETTE + (src ? '<img src="' + esc(src) + '" alt="' + esc(h.nom) + '" loading="lazy" onerror="this.remove()">' : '') +
        (h.commons && h.credit ? '<a class="cp-hcr" href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(h.commons) + '" target="_blank" rel="noopener">Photo : ' + esc(h.credit) + '</a>' : '') +
        '</div><div class="cp-htxt"><b>' + esc(h.nom) + '</b><small>' + esc(h.info) + '</small></div></div>';
    }).join('');
    var vids = p.videos.map(function (v) {
      return '<div class="cp-vid"><div class="cp-vframe"><button type="button" class="cp-vplay" data-act="msnVid" data-vid="' + esc(v.id) + '" aria-label="Lire la vidéo : ' + esc(v.titre) + '"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" loading="lazy">' +
        '<span class="pb">' + icon('play', 26, 'style="color:#0A0F1F"') + '</span></button></div><div class="cp-vtxt"><b>' + esc(v.titre) + '</b><small>' + esc(v.source) + '</small></div></div>';
    }).join('');
    var hl = p.highlight ? '<a class="cp-hl" href="https://www.youtube.com/watch?v=' + esc(p.highlight.id) + '" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/' + esc(p.highlight.id) + '/mqdefault.jpg" alt="" loading="lazy">' +
      '<span><span class="k">LES MEILLEURES ACTIONS</span><b>' + esc(p.highlight.titre) + '</b><small>' + esc(p.highlight.source) + '</small></span></a>' : '';
    var ranks = '';
    for (var k = 0; k < 3; k++) {
      var q = M.poste(d.postes[k]), me2 = d.postes[k] === id;
      ranks += '<button type="button" class="cp-rk' + (me2 ? ' me' : q ? ' taken' : '') + '" style="' + vars(q || p) + '" data-act="msnRank" data-id="' + esc(id) + '" data-k="' + k + '" aria-label="Mettre en choix ' + (k + 1) + (q && !me2 ? ' (à la place de ' + esc(q.nom) + ')' : '') + '"' + (me2 ? ' aria-current="true"' : '') + '><b>' + (k + 1) + '</b><small>' + (me2 ? 'CE POSTE' : q ? esc(q.code) : 'LIBRE') + '</small></button>';
    }
    if (r >= 0) ranks += '<button type="button" class="cp-rk x" data-act="msnRemove" data-id="' + esc(id) + '" aria-label="Retirer de mon top"><b>×</b><small>RETIRER</small></button>';
    return '<main class="screen" style="' + vars(p) + '">' + MC.kidSubBar('#/mission/postes', 'Les postes', p.nom) +
      '<div class="cp-dart"><span class="cp-dnum">' + esc(p.n) + '</span><span class="cp-dem">' + emblem(p) + '</span></div>' +
      '<div><h1 class="cp-dtitle">' + esc(p.nom) + '</h1><div class="cp-dsub">' + esc(p.numeros) + ' · « ' + esc(p.surnom) + ' »</div><p class="cp-dintro">' + esc(p.intro) + '</p></div>' +
      '<section class="cp-dstats" aria-label="Caractéristiques">' + p.stats.map(function (v, j) { return '<div><span class="l">' + M.LABELS[j] + '</span>' + stars(v, p.color) + '</div>'; }).join('') + '</section>' +
      '<section class="sec"><h2 class="h2">Ses pouvoirs</h2><div class="cp-powers">' + p.pouvoirs.map(function (w) { return '<div class="cp-power">' + qicon(w.icon) + '<b>' + esc(w.titre) + '</b><p>' + esc(w.texte) + '</p></div>'; }).join('') + '</div></section>' +
      '<section class="sec"><h2 class="h2">Ta mission</h2><div class="cp-ad"><div><b>EN ATTAQUE</b><ul>' + li(p.attaque) + '</ul></div><div class="def"><b>EN DÉFENSE</b><ul>' + li(p.defense) + '</ul></div></div></section>' +
      '<section class="cp-j10"><span>JEU À 10</span><span>' + esc(p.jeu10) + '</span></section>' +
      '<section class="sec"><h2 class="h2">Fait pour toi si…</h2><div class="cp-fit">' + p.pourToi.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></section>' +
      '<section class="sec"><h2 class="h2">Ils jouent à ce poste au Stade Toulousain</h2><div class="cp-heroes">' + heros + '</div></section>' +
      '<section class="sec"><h2 class="h2">Regarde-le en action</h2><div class="cp-vids">' + hl + vids + '</div></section>' +
      '<div class="cp-act"><span class="lbl">' + (r >= 0 ? 'Choix n°' + (r + 1) + ' · change de numéro si tu veux' : 'Mets ce poste dans ton top (jusqu\'à 3) :') + '</span><div class="cp-ranks">' + ranks + '</div>' +
      (d.postes.length ? '<a class="btn2" href="#/mission/postes">' + icon('left', 16) + ' Revenir aux postes</a>' : '') + '</div></main>';
  }
  MC.act.msnRank = function (b) {
    var me = app.S.me; if (!me) return;
    var d = brouillon(me), id = b.getAttribute('data-id'), k = Number(b.getAttribute('data-k'));
    var i = d.postes.indexOf(id);
    if (i === k) return;
    if (i >= 0) d.postes.splice(i, 1);
    d.postes.splice(Math.min(k, d.postes.length), 0, id);
    var out = d.postes.length > 3 ? d.postes.pop() : null;
    d.dirtyP = true; garder(d);
    ui.toast(M.poste(id).nom + ' en choix n°' + (d.postes.indexOf(id) + 1) + (out ? ' · ' + M.poste(out).nom + ' sort de ton top' : ''));
    app.rerender();
  };
  MC.act.msnRemove = function (b) {
    var me = app.S.me; if (!me) return;
    var d = brouillon(me), id = b.getAttribute('data-id'), i = d.postes.indexOf(id);
    if (i < 0) return;
    d.postes.splice(i, 1); d.dirtyP = true; garder(d);
    ui.toast('Retiré de ton top'); app.rerender();
  };
  MC.act.msnVid = function (b) {
    var fr = b.parentNode;
    fr.innerHTML = ui.videoIframe(b.getAttribute('data-vid'));
  };

  // ----- le test « Aide-moi à choisir » -----
  app.route('/mission/quiz', function () {
    return app.loadMe().then(function (me) { return paintQuiz(me); });
  }, { kid: true, nav: 'semaine', bg: '#1B2552' });
  function paintQuiz(me) {
    var d = brouillon(me), k = Math.min(d.quiz.step || 0, M.QUIZ.length), bar = MC.kidSubBar('#/mission/postes', 'Les postes', 'Aide-moi à choisir');
    if (k >= M.QUIZ.length && quizFini(d)) {
      var res = M.quizResults(d.quiz.ans), ids = res.map(function (x) { return x.p.id; }), kept = d.postes.join() === ids.join();
      return '<main class="screen">' + bar +
        '<div class="head"><span class="kicker">Ton résultat</span><h1 class="big md">Faits<br>pour toi</h1>' +
        '<p class="lead">Les 3 postes qui collent le mieux à tes réponses, du plus au moins compatible. C\'est une piste : touche une carte pour la découvrir, et choisis toi-même.</p></div>' +
        '<div class="cp-qres">' + res.map(function (x, i) {
          return '<div class="' + (i === 0 ? 'first' : '') + '" style="' + vars(x.p) + '"><div class="cp-qlbl"><b>N°' + (i + 1) + '</b><span>' + x.pct + ' % compatible</span></div>' +
            '<div class="cp-qmeter" aria-hidden="true"><i style="width:' + Math.max(4, x.pct) + '%"></i></div>' + cardHtml(x.p, d.postes.indexOf(x.p.id)) +
            (x.whys.length ? '<p class="cp-qwhy"><b>Ça colle avec :</b> ' + x.whys.map(esc).join(' · ') + '</p>' : '') + '</div>';
        }).join('') + '</div>' +
        (kept ? '<div class="note green">' + icon('check', 20) + '<span>Ces 3 postes sont dans ton top. Tu peux changer l\'ordre ou en retirer.</span></div><a class="btn" href="#/mission/postes">Voir mon top</a>' :
          '<button type="button" class="btn gold" data-act="msnQkeep">Garder ces 3 postes</button><p class="small" style="margin:0;text-align:center">Ils vont dans ton top' + (d.postes.length ? ' (à la place de tes choix)' : '') + '. Tu pourras changer l\'ordre ou en retirer.</p>') +
        '<div class="grid2"><button type="button" class="btn2 grey" data-act="msnQreset">Refaire le test</button><a class="btn2 grey" href="#/mission/postes">Tous les postes</a></div></main>';
    }
    var Q = M.QUIZ[k], sel = d.quiz.ans[k] || [], last = k === M.QUIZ.length - 1;
    var bars = M.QUIZ.map(function (x, i) { return '<i class="' + (i < k ? 'done' : i === k ? 'on' : '') + '"></i>'; }).join('');
    return '<main class="screen">' + bar +
      (k === 0 ? '<p class="lead">5 petites questions sur ce que tu aimes faire. À la fin, on te propose les 3 postes qui te vont le mieux.</p>' : '') +
      '<div class="between"><span class="kicker">Question ' + (k + 1) + ' / ' + M.QUIZ.length + '</span><span class="cp-qbars" aria-hidden="true">' + bars + '</span></div>' +
      '<div class="head"><h1 class="big sm" id="qtitle">' + esc(Q.q) + '</h1><span class="hud" style="color:var(--dim)">Choisis 1 ou 2 réponses</span></div>' +
      '<div class="cp-qopts" role="group" aria-labelledby="qtitle">' + Q.opts.map(function (o, j) {
        var on = sel.indexOf(j) >= 0;
        return '<button type="button" class="cp-qopt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="msnQopt" data-j="' + j + '"><span class="ic">' + qicon(o.i) + '</span><span class="t">' + esc(o.t) + '</span><span class="ck" aria-hidden="true"></span></button>';
      }).join('') + '</div>' +
      '<div class="row" style="gap:10px">' + (k > 0 ? '<button type="button" class="btn2 grey" style="width:64px;flex:none" data-act="msnQprev" aria-label="Question d\'avant">' + icon('left', 20) + '</button>' : '') +
      '<button type="button" class="btn" style="flex:1" data-act="msnQnext"' + (sel.length ? '' : ' disabled') + '>' + (last ? 'Voir mes postes' : 'Suivant') + '</button></div></main>';
  }
  MC.act.msnQopt = function (b) {
    var d = brouillon(app.S.me), k = d.quiz.step || 0, j = Number(b.getAttribute('data-j'));
    var sel = (d.quiz.ans[k] || []).slice(), i = sel.indexOf(j);
    if (i >= 0) sel.splice(i, 1); else { sel.push(j); if (sel.length > M.QMAX) sel.shift(); }
    d.quiz.ans[k] = sel; garder(d); app.rerender();
  };
  MC.act.msnQnext = function () {
    var d = brouillon(app.S.me), k = d.quiz.step || 0;
    if (!(d.quiz.ans[k] || []).length) return;
    d.quiz.step = k + 1; d.quiz.ans = d.quiz.ans.slice(0, M.QUIZ.length); garder(d); app.rerender(); window.scrollTo(0, 0);
  };
  MC.act.msnQprev = function () { var d = brouillon(app.S.me); d.quiz.step = Math.max(0, (d.quiz.step || 0) - 1); garder(d); app.rerender(); window.scrollTo(0, 0); };
  MC.act.msnQreset = function () { var d = brouillon(app.S.me); d.quiz = { ans: [], step: 0 }; garder(d); app.rerender(); window.scrollTo(0, 0); };
  MC.act.msnQkeep = function () {
    var d = brouillon(app.S.me);
    d.postes = M.quizResults(d.quiz.ans).map(function (x) { return x.p.id; });
    d.dirtyP = true; garder(d);
    ui.toast('C\'est noté ! Vérifie l\'ordre, puis valide ton top.');
    app.go('#/mission/postes');
  };

  // ----- les copains (secret) -----
  var copQ = '';
  function roster() {
    if (!app.S.roster) { var cr = app.lsGet('mc-roster'); app.S.roster = Array.isArray(cr) ? cr : null; }
    var fresh = MC.api.call('roster', {}, { silent: !!app.S.roster }).then(function (res) { app.S.roster = res.joueurs; app.lsSet('mc-roster', res.joueurs); return res.joueurs; });
    if (app.S.roster) { fresh.catch(function () { }); return Promise.resolve(app.S.roster); }
    return fresh;
  }
  app.route('/mission/copains', function () {
    return app.loadMe().then(function (me) { return roster().then(function (list) { return paintCopains(me, list); }); });
  }, { kid: true, nav: 'semaine', bg: '#12333A' });
  function copainsDispo(me, list) {
    return (list || []).filter(function (k) { return k.id !== me.joueur.id && !/^test$/i.test(k.prenom); });
  }
  function paintCopains(me, list) {
    var d = brouillon(me), e = M.etat(me, MID), dispo = copainsDispo(me, list), byId = {};
    dispo.forEach(function (k) { byId[k.id] = k; });
    d.copains = d.copains.filter(function (id) { return byId[id]; });
    var chosen = d.copains.map(function (id) { var k = byId[id]; return '<button type="button" class="cop-chip" data-act="msnCop" data-id="' + esc(id) + '" aria-label="Retirer ' + esc(k.prenom) + '">' + ui.avatar(k.prenom, k.couleur, 34) + esc(k.prenom) + '<span class="x">' + icon('x', 14) + '</span></button>'; }).join('');
    var label = e.faite ? 'Enregistrer mes copains' : 'Terminer la mission · +' + C.XP.mission + ' XP';
    return '<main class="screen">' + MC.kidSubBar('#/mission', 'La mission', 'Tes copains') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Étape 2 sur 2</span><h1 class="big md">Avec qui tu<br>aimes jouer</h1></div>' +
      '<div class="note cyan">' + icon('lock', 20) + '<span><b>C\'est secret.</b> Seuls les éducs voient tes choix. Aux plateaux, on essaie de te mettre avec au moins un copain, pas à chaque fois.</span></div>' +
      '<section class="sec"><div class="between"><h2 class="h2">Mes copains</h2><span class="hud" style="color:var(--cyan)">' + d.copains.length + '</span></div>' +
      (chosen ? '<div class="cop-sel">' + chosen + '</div>' : '<p class="small" style="margin:0">Touche les prénoms de tes copains, autant que tu veux.</p>') + '</section>' +
      '<label class="sr-only" for="copq">Chercher un prénom</label><input id="copq" class="search" type="search" placeholder="Chercher un prénom…" value="' + esc(copQ) + '" autocomplete="off">' +
      '<div class="cop-list" id="coplist">' + copList(d, dispo) + '</div>' +
      '<div class="cp-bar"><button type="button" class="btn gold" style="flex:1;width:100%" data-act="msnCopSave"' + (d.copains.length ? '' : ' disabled') + '>' + label + '</button></div>' +
      (d.copains.length ? '' : '<p class="small" style="margin:0;text-align:center">Choisis au moins un copain pour terminer.</p>') + '</main>';
  }
  function copList(d, dispo) {
    var q = copQ.trim().toLowerCase();
    var l = dispo.filter(function (k) { return !q || k.prenom.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.prenom.localeCompare(b.prenom, 'fr'); });
    if (!l.length) return '<p class="empty" style="grid-column:1/-1">Personne avec ce prénom.</p>';
    return l.map(function (k) {
      var on = d.copains.indexOf(k.id) >= 0;
      return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="msnCop" data-id="' + esc(k.id) + '">' + ui.avatar(k.prenom, k.couleur, 34) + '<span class="nm">' + esc(k.prenom) + '</span><span class="ck">' + icon('check', 16) + '</span></button>';
    }).join('');
  }
  MC.act.msnCop = function (b) {
    var d = brouillon(app.S.me), id = b.getAttribute('data-id'), i = d.copains.indexOf(id);
    if (i >= 0) d.copains.splice(i, 1); else d.copains.push(id);
    d.dirtyC = true; garder(d); app.rerender();
  };
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'copq') return;
    copQ = e.target.value;
    var me = app.S.me, box = document.getElementById('coplist');
    if (me && box) box.innerHTML = copList(brouillon(me), copainsDispo(me, app.S.roster));
  });
  document.addEventListener('hashchange', function () { if (location.hash.indexOf('#/mission/copains') !== 0) copQ = ''; });
  MC.act.msnCopSave = function (b) {
    var me = app.S.me; if (!me) return;
    var d = brouillon(me), was = M.etat(me, MID).faite;
    if (!d.copains.length) return;
    var p = { mission: MID, copains: d.copains, fin: true };
    if (d.dirtyP && d.postes.length) p.postes = d.postes;
    b.disabled = true;
    app.kidCall('mission', p).then(function (res) {
      app.setMe(res);
      d.dirtyC = false; if (p.postes) d.dirtyP = false; garder(d);
      if (was) { ui.toast('Tes copains sont enregistrés'); app.go('#/mission'); }
      else app.go('#/mission/bravo');
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); if (/poste/.test(e.message)) app.go('#/mission/postes'); });
  };

  // ----- mission accomplie -----
  app.route('/mission/bravo', function () {
    return app.loadMe().then(function (me) {
      var e = M.etat(me, MID), bd = C.BADGES.filter(function (b) { return b.mission === MID; })[0] || {};
      if (!e.faite) { setTimeout(function () { app.go('#/mission', true); }, 0); return null; }
      return '<main class="screen nonav center" style="text-align:center;align-items:center">' +
        '<span class="kicker" style="color:var(--gold);margin-top:24px">Mission accomplie</span>' +
        '<h1 class="big md" style="text-shadow:3px 3px 0 var(--pink),-2px -2px 0 var(--gold)">Prêt pour<br>le jeu à 10 !</h1>' +
        '<section class="newbadge" style="--bc:' + bd.color + ';width:100%"><div>' + MC.badgeIcon({ icon: bd.icon, color: bd.color }, true, 64) +
        '<div style="display:flex;flex-direction:column;gap:4px;text-align:left"><span class="hud" style="color:' + bd.color + '">Nouveau badge</span><span style="font:italic 900 26px/.95 var(--f-title);text-transform:uppercase">' + esc(bd.nom) + '</span><span class="small" style="color:var(--muted)">+' + C.XP.mission + ' XP et +' + C.XP.badge + ' XP pour le badge</span></div></div></section>' +
        '<div class="sec" style="width:100%;text-align:left"><span class="hud" style="color:var(--dim)">Ton top</span>' + ptags(e.postes, true) +
        '<span class="small">' + e.copains.length + ' copain' + (e.copains.length > 1 ? 's' : '') + ' choisi' + (e.copains.length > 1 ? 's' : '') + ', en secret. Tu peux tout changer quand tu veux (Profil › Mes choix pour le jeu à 10).</span></div>' +
        '<a class="btn gold glow" href="#/semaine" style="width:100%">Retour à ma semaine</a></main>';
    });
  }, { kid: true, bg: '#2E2612' });

  // ======================================================================
  // CÔTÉ PARENT : où en est son enfant (pas les copains : c'est secret)
  // ======================================================================
  MC.missionParent = function (d) {
    var D = M.def(MID);
    if (!D || L.today() < D.debut) return '';
    var e = M.etat(d, MID), k = d.joueur;
    if (e.faite) return '<div class="note green">' + icon('check', 20) + '<span><b>Mission « ' + esc(D.titre) + ' » accomplie.</b> Ses postes : ' + e.postes.map(function (id, i) { return (i + 1) + '. ' + esc(M.poste(id).nom); }).join(' · ') + '.</span></div>';
    return '<div class="note gold">' + icon('star', 20) + '<span><b>Mission spéciale à faire : « ' + esc(D.titre) + ' ».</b> ' + esc(k.prenom) + ' choisit son poste et ses copains pour le jeu à 10. Elle est en haut de sa page « Ma semaine »' + (L.today() <= D.fin ? ', jusqu\'au ' + esc(fmtJour(D.fin)) : '') + '.' +
      (e.postes.length ? ' Postes déjà choisis : ' + e.postes.map(function (id) { return esc(M.poste(id).nom); }).join(', ') + '.' : '') + '</span></div>';
  };

  // ======================================================================
  // CÔTÉ ÉDUC
  // ======================================================================
  function prenoms(g) { var o = {}; g.joueurs.forEach(function (p) { o[p.joueur.id] = p.joueur.prenom; }); return o; }
  function etatDe(p) { return M.etat({ missions: p.missions || [] }, MID); }
  // qui a choisi ce joueur comme copain
  function choisiPar(g, id) {
    return g.joueurs.filter(function (p) { return p.joueur.actif && etatDe(p).copains.indexOf(id) >= 0; }).map(function (p) { return p.joueur; });
  }
  function resumeTest(e) {
    if (e.quiz && e.quiz.ans && e.quiz.ans.length) {
      var top = (e.quizTop || []).map(function (x) { var p = M.poste(x.id); return p ? p.nom + ' (' + x.pct + ' %)' : ''; }).filter(Boolean);
      return (top.length ? ['Postes proposés : ' + top.join(' · ')] : []).concat(M.quizLines(e.quiz.ans));
    }
    if (e.quizResume && !/^pas fait$/i.test(e.quizResume.trim())) return e.quizResume.split('\n');
    return [];
  }
  // la partie « Jeu à 10 » de la fiche d'un joueur
  MC.missionKid = function (d, g) {
    var D = M.def(MID); if (!D) return '';
    var e = M.etat(d, MID), names = prenoms(g), mutual = {};
    choisiPar(g, d.joueur.id).forEach(function (j) { mutual[j.id] = true; });
    var cop = e.copains.map(function (id) { return names[id] ? (mutual[id] ? '<b style="color:var(--green)">' + esc(names[id]) + ' ⇄</b>' : esc(names[id])) : ''; }).filter(Boolean);
    var par = choisiPar(g, d.joueur.id).map(function (j) { return esc(j.prenom); });
    var test = resumeTest(e);
    var statut = e.faite ? '<span class="pill" style="background:var(--green)">Faite</span>' : e.postes.length ? '<span class="pill gold" style="background:var(--gold)">Commencée</span>' : '<span class="pill" style="background:var(--orange)">À faire</span>';
    return '<section class="sec"><div class="between"><h2 class="h2">Jeu à 10</h2>' + statut + '</div>' +
      '<div class="box" style="display:flex;flex-direction:column;gap:10px">' +
      '<div><span class="mlab">Postes souhaités' + (e.source === 'formulaire' ? ' (site « Choisis ton poste »)' : '') + '</span>' + (e.postes.length ? ptags(e.postes, true) : '<span class="small">Pas encore choisis.</span>') + '</div>' +
      (test.length ? '<details><summary class="small" style="cursor:pointer;color:var(--cyan)">Son test « Aide-moi à choisir »</summary><ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.5">' + test.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>' : '') +
      '<div><span class="mlab">Ses copains (secret)</span><span class="small" style="color:var(--soft)">' + (cop.length ? cop.join(', ') : (e.copainsFait ? 'Aucun' : 'Pas encore choisis')) + '</span></div>' +
      '<div><span class="mlab">L\'ont choisi comme copain</span><span class="small" style="color:var(--soft)">' + (par.length ? par.join(', ') : 'Personne pour l\'instant') + '</span></div>' +
      (cop.length && Object.keys(mutual).length ? '<span class="small">⇄ en vert : ils se sont choisis l\'un l\'autre.</span>' : '') +
      '</div></section>';
  };

  var edMsn = { filtre: 'all' };
  app.route('/educ/mission', function () {
    return MC.loadGroup().then(function (g) { app.refreshNav(); return paintEducMission(g); });
  }, { adult: 'e', nav: 'e:outils', bg: '#2A1640' });
  function paintEducMission(g) {
    var D = M.def(MID), names = prenoms(g);
    var players = g.joueurs.filter(function (p) { return p.joueur.actif && !/^test$/i.test(p.joueur.prenom); }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
    var faites = 0, commencees = 0, rien = 0, choix1 = {}, autres = {};
    M.POSTES.forEach(function (p) { choix1[p.id] = []; autres[p.id] = []; });
    players.forEach(function (p) {
      var e = etatDe(p);
      if (e.faite) faites++; else if (e.postes.length) commencees++; else rien++;
      e.postes.forEach(function (id, i) { (i === 0 ? choix1 : autres)[id].push(p.joueur.prenom + (i ? ' (' + (i + 1) + ')' : '')); });
    });
    var max = 1;
    M.POSTES.forEach(function (p) { max = Math.max(max, choix1[p.id].length + autres[p.id].length); });
    var bars = M.POSTES.map(function (p) {
      var a = choix1[p.id].length, b = autres[p.id].length;
      return '<details class="pbarw"><summary class="pbar" style="cursor:pointer"><span style="color:' + p.color + ';font-weight:600">' + esc(p.nom) + '</span>' +
        '<span class="tr"><i style="width:' + (a / max * 100) + '%;background:' + p.color + '"></i><i style="width:' + (b / max * 100) + '%;background:' + hexA(p.color, 0.35) + '"></i></span><span class="n" style="color:' + p.color + '">' + a + (b ? '+' + b : '') + '</span></summary>' +
        '<p class="small" style="margin:6px 0 4px">' + (a || b ? (a ? '<b style="color:var(--ink)">Choix 1 :</b> ' + choix1[p.id].map(esc).join(', ') : '') + (b ? (a ? '<br>' : '') + '<b style="color:var(--ink)">Choix 2 ou 3 :</b> ' + autres[p.id].map(esc).join(', ') : '') : 'Personne pour l\'instant.') + '</p></details>';
    }).join('');
    var list = players.filter(function (p) { var e = etatDe(p); return edMsn.filtre === 'all' || (edMsn.filtre === 'todo' && !e.faite); });
    var rows = list.map(function (p) {
      var e = etatDe(p), cop = e.copains.map(function (id) { return names[id]; }).filter(Boolean);
      var tag = e.faite ? '<span class="pill" style="background:var(--green)">Faite</span>' : e.postes.length ? '<span class="pill" style="background:var(--gold)">Commencée</span>' : '<span class="pill" style="background:var(--orange)">À faire</span>';
      return '<li><a class="li" href="#/educ/joueur/' + esc(p.joueur.id) + '" style="align-items:flex-start">' + ui.hexa(p.joueur.prenom, p.joueur.couleur) +
        '<span class="grow" style="display:flex;flex-direction:column;gap:6px"><span class="between"><span class="t1">' + esc(p.joueur.prenom.toUpperCase()) + '</span>' + tag + '</span>' +
        (e.postes.length ? ptags(e.postes, true) : '') +
        (cop.length ? '<span class="t2">Copains : ' + cop.map(esc).join(', ') + '</span>' : '') + '</span></a></li>';
    }).join('');
    var imp = g.importPostes;
    var impTxt = imp ? 'Dernière reprise le ' + esc(ui.fmtDate(String(imp.quand).slice(0, 10))) + ' : ' + imp.reponses + ' réponse' + (imp.reponses > 1 ? 's' : '') + ', ' + imp.importes + ' reprise' + (imp.importes > 1 ? 's' : '') + '.' +
      (imp.inconnus && imp.inconnus.length ? ' Pas reconnus : ' + imp.inconnus.map(esc).join(', ') + '.' : '') + (imp.ambigus && imp.ambigus.length ? ' Homonymes à vérifier : ' + imp.ambigus.map(esc).join(', ') + '.' : '') : 'Pas encore de reprise.';
    return '<main class="screen">' + MC.educBar(g, D.titre, '#/educ/outils', 'Outils') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale · ' + players.length + ' joueurs</span><h1 class="big md">' + esc(D.titre) + '</h1>' +
      '<p class="lead">Les postes (1 à 3, dans l\'ordre) et les copains choisis par les enfants. Les copains sont secrets : seuls les éducs les voient.</p></div>' +
      '<div class="grid3"><div class="tile"><span class="v" style="color:var(--green)">' + faites + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">mission faite</span></div>' +
      '<div class="tile"><span class="v" style="color:var(--gold)">' + commencees + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">postes choisis, copains à faire</span></div>' +
      '<div class="tile"><span class="v" style="color:var(--orange)">' + rien + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">pas commencée</span></div></div>' +
      '<div class="cols2"><section class="sec"><h2 class="h2">Postes demandés</h2><p class="small" style="margin:0">Barre pleine = choix n°1, barre pâle = choix 2 ou 3. Touchez un poste pour voir les prénoms.</p><div class="pbars">' + bars + '</div>' +
      '<h2 class="h2" style="margin-top:12px">Ancien site « Choisis ton poste »</h2>' +
      '<p class="small" style="margin:0">Les réponses envoyées avec l\'ancien site sont reprises dans l\'appli (un enfant qui a déjà choisi dans l\'appli garde ses choix). Il faut que le formulaire range ses réponses dans la feuille de l\'appli : Google Forms › Réponses › Associer à Sheets › feuille existante.</p>' +
      '<p class="small" style="margin:0;color:var(--soft)">' + impTxt + '</p>' +
      '<button type="button" class="btn2" data-act="msnImport">' + icon('refresh', 16) + ' Reprendre les réponses du formulaire</button></section>' +
      '<section class="sec"><h2 class="h2">Les joueurs</h2>' +
      '<div class="grid2"><button type="button" class="opt' + (edMsn.filtre === 'all' ? ' on' : '') + '" aria-pressed="' + (edMsn.filtre === 'all') + '" data-act="msnFiltre" data-v="all">Tous · ' + players.length + '</button>' +
      '<button type="button" class="opt' + (edMsn.filtre === 'todo' ? ' on' : '') + '" style="--oc:var(--orange)" aria-pressed="' + (edMsn.filtre === 'todo') + '" data-act="msnFiltre" data-v="todo">Pas finie · ' + (players.length - faites) + '</button></div>' +
      '<ul class="list">' + (rows || '<li class="empty">Personne.</li>') + '</ul></section></div></main>';
  }
  MC.act.msnFiltre = function (b) { edMsn.filtre = b.getAttribute('data-v'); app.rerender(); };
  MC.act.msnImport = function (b) {
    b.disabled = true;
    app.adultCall('importPostes', {}).then(function (r) {
      var i = r.info;
      ui.toast(i.importes ? i.importes + ' joueur' + (i.importes > 1 ? 's' : '') + ' repris du formulaire' : 'Rien de nouveau dans le formulaire');
      return MC.loadGroup(true);
    }).then(function () { app.rerender(); })
      .catch(function (e) { b.disabled = false; ui.toast(e.code === 'invalide' ? 'Le serveur doit d\'abord être mis à jour.' : e.message, true); });
  };
})();
