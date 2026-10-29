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

  MC.bindTilt = bindTilt;

  // ---------- les choix en cours (gardés sur l'appareil tant qu'ils ne sont pas envoyés) ----------
  var DKEY = 'mc-mission-' + MID;
  function brouillon(me) {
    var d = app.lsGet(DKEY), e = M.etat(me, MID);
    if (!d || typeof d !== 'object' || d.kid !== me.joueur.id) d = { kid: me.joueur.id };
    if (!d.dirtyP || !Array.isArray(d.postes)) { d.postes = e.postes.slice(0, 3); d.dirtyP = false; }
    if (!d.dirtyC || !Array.isArray(d.copains)) { d.copains = e.copains.slice(); d.dirtyC = false; }
    if (!d.dirtyM || typeof d.message !== 'string') { d.message = e.message || ''; d.dirtyM = false; }
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
  // la carte « Mission spéciale » en haut de Ma semaine (rien si aucune mission en cours) :
  // la 1re mission à faire, avec sa récompense ; les suivantes attendent dans l'onglet Missions
  function badgeDe(D) { return C.BADGES.filter(function (b) { return b.mission === D.id; })[0] || {}; }
  function prochaine(me) { return M.pending(me).filter(function (D) { return !M.etat(me, D.id).bloquee; })[0] || null; }
  MC.missionCard = function (me) {
    var D = prochaine(me);
    if (!D) return '';
    var t = L.today(), autres = M.pending(me).length - 1, bd = badgeDe(D);
    return '<a class="mspec" href="' + D.lien + '" style="text-decoration:none;color:inherit">' +
      '<div class="between"><span class="hud" style="color:var(--gold)">' + icon('star', 14) + ' Mission spéciale</span>' + (t <= D.fin ? '<span class="small">jusqu\'au ' + esc(fmtJour(D.fin)) + '</span>' : '') + '</div>' +
      '<span class="big sm">' + esc(D.titre) + '</span>' +
      '<p class="lead" style="font-size:14px">' + esc(D.texte) + '</p>' +
      '<span class="mreward">' + icon('trophy', 16) + ' +' + C.XP.mission + ' XP et le badge « ' + esc(bd.nom || '') + ' »</span>' +
      (autres > 0 ? '<span class="small">Et encore ' + autres + ' mission' + (autres > 1 ? 's' : '') + ' dans l\'onglet Missions.</span>' : '') +
      '<span class="btn gold">Commencer la mission</span></a>';
  };

  // ----- ancienne adresse de la mission : la prochaine mission à faire, sinon l'onglet Missions -----
  app.route('/mission', function () {
    return app.loadMe().then(function (me) { var D = prochaine(me); setTimeout(function () { app.go(D ? D.lien : '#/missions', true); }, 0); return null; });
  }, { kid: true, nav: 'missions' });

  // en tête des 2 missions : récompense, et une note si la mission est déjà faite
  function enTete(me, id, titreHtml, lead) {
    var D = M.def(id), e = M.etat(me, id), bd = badgeDe(D), t = L.today();
    return '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale' + (t <= D.fin && !e.faite ? ' · jusqu\'au ' + esc(fmtJour(D.fin)) : '') + '</span><h1 class="big md">' + titreHtml + '</h1>' +
      '<p class="lead">' + lead + '</p></div>' +
      (e.faite ? '<div class="note green">' + icon('check', 20) + '<span><b>Mission accomplie</b> : +' + C.XP.mission + ' XP et le badge « ' + esc(bd.nom || '') + ' ». Tu peux changer tes choix quand tu veux.</span></div>' :
        '<span class="mreward">' + icon('trophy', 16) + ' +' + C.XP.mission + ' XP et le badge « ' + esc(bd.nom || '') + ' »</span>');
  }

  function cardHtml(p, rank) {
    var rows = p.stats.map(function (v, j) { return '<span class="cp-srow"><span>' + M.LABELS[j] + '</span>' + stars(v, p.color) + '</span>'; }).join('');
    return '<div class="cp-tilt" style="' + vars(p) + '"><a class="cp-card" href="#/mission/poste/' + esc(p.id) + '" aria-label="' + esc(p.nom + ' : ' + p.surnom + (rank >= 0 ? ', ton choix n°' + (rank + 1) : '')) + '"><span class="cp-in">' +
      '<span class="cp-art"><span class="cp-num">' + esc(p.n) + '</span>' + (rank >= 0 ? '<span class="cp-pick">CHOIX ' + (rank + 1) + '</span>' : '') + '<span class="cp-emblem" style="--dl:-' + ((M.POSTES.indexOf(p) * 0.9) % 6).toFixed(1) + 's">' + emblem(p) + '<span class="em-sheen"></span></span></span>' +
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
  }, { kid: true, nav: 'missions', bg: '#1B2552' });
  function paintPostes(me) {
    var d = brouillon(me), qr = quizFini(d) ? M.quizResults(d.quiz.ans) : null;
    var quiz = '<div class="cp-tilt cp-wide" style="--c:#38E8FF;--d:#FF4FA3;--glow2:rgba(56,232,255,.22)"><a class="cp-card cp-q" href="#/mission/quiz"><span class="cp-in">' +
      '<span class="cp-qem">' + CREST + '<svg viewBox="0 0 100 100" aria-hidden="true">' + Q_SYM + '</svg></span>' +
      '<span class="cp-qtxt"><span class="cp-qk">PAS SÛR ? · 5 QUESTIONS</span><span class="cp-qt">Aide-moi à choisir</span><span class="cp-qs">Dis ce que tu aimes faire, on te propose 3 postes.</span>' +
      (qr ? '<span class="cp-qlast">Ton résultat : ' + qr.map(function (x) { return esc(x.p.nom); }).join(' · ') + '</span>' : '') + '</span>' +
      icon('right', 20, 'style="flex:none;color:var(--cyan)"') + '<span class="cp-holo"></span><span class="cp-shine"></span></span></a></div>';
    var e = M.etat(me, 'poste');
    return '<main class="screen">' + MC.kidSubBar('#/missions', 'Missions', 'Choisis ton poste') +
      enTete(me, 'poste', 'Choisis<br>ton poste', 'Après les vacances, on passe au jeu à 10 : chacun aura un poste. Touche une carte pour découvrir le poste, puis mets-le dans ton top. 1 à 3 choix, dans l\'ordre : un seul, c\'est déjà très bien.') +
      (e.source === 'formulaire' ? '<div class="note cyan">' + icon('info', 20) + '<span>Tes postes viennent du site « Choisis ton poste » : vérifie-les et change-les si tu veux.</span></div>' : '') +
      '<div class="cp-grid">' + quiz + M.POSTES.map(function (p) { return cardHtml(p, d.postes.indexOf(p.id)); }).join('') + '</div>' +
      // comme sur l'ancien site : un mot libre pour les éducs (facultatif), envoyé avec le top (serveur version 12 et plus)
      (MC.CONFIG.MOT_EDUCS === false ? '' : '<section class="sec" style="gap:8px"><label class="h2" for="msn-mot" style="font-size:18px">Un mot pour les éducs <span class="small" style="text-transform:none;letter-spacing:0;font-family:var(--f-body)">(facultatif)</span></label>' +
      '<textarea id="msn-mot" class="txt" rows="3" maxlength="600" data-msnmot placeholder="Pourquoi ces postes ? Un poste que tu ne veux pas ?">' + esc(d.message || '') + '</textarea>' +
      '<span class="small">Il part avec ton top quand tu touches « Valider ». Seuls les éducs le lisent.</span></section>') +
      barHtml(d) + '</main>';
  }
  MC.act.msnSavePostes = function (b) {
    var me = app.S.me; if (!me) return;
    var d = brouillon(me);
    if (!d.postes.length) { ui.toast('Choisis au moins un poste.', true); return; }
    var mot = document.getElementById('msn-mot');
    if (mot) { d.message = mot.value; }
    var p = { mission: MID, postes: d.postes };
    if (mot && d.dirtyM) p.message = String(d.message || '').slice(0, 600);   // seulement s'il l'a touché : jamais d'effacement par erreur
    if (quizFini(d)) { p.quiz = { ans: d.quiz.ans }; p.quizTop = M.quizResults(d.quiz.ans).map(function (x) { return { id: x.p.id, pct: x.pct }; }); }
    var was = M.etat(me, 'poste').faite;
    b.disabled = true;
    app.kidCall('mission', p).then(function (res) {
      app.setMe(res);
      d.dirtyP = false; d.dirtyM = false; garder(d);
      if (was) { ui.toast('Ton top est enregistré !'); app.go('#/missions', true); }
      else app.go('#/mission/bravo?m=poste', true);
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.hasAttribute || !t.hasAttribute('data-msnmot') || !app.S.me) return;
    var d = brouillon(app.S.me); d.message = t.value; d.dirtyM = true; garder(d);
  });

  // ----- la fiche d'un poste -----
  app.route('/mission/poste/:id', function (p, q, cur) {
    cur.after = function (root) { bindEmblem(root); };
    return app.loadMe().then(function (me) { return paintPoste(me, p.id); });
  }, { kid: true, nav: 'missions', bg: '#1B2552' });
  // l'emblème de la fiche : il tourne en 3D sous le doigt (ou la souris) et brille
  function bindEmblem(root) {
    var zone = root.querySelector('.cp-dart'), em = root.querySelector('#cp-dem');
    if (!zone || !em) return;
    var offT;
    function at(cx, cy) {
      var r = em.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (cx - r.left) / r.width)), y = Math.min(1, Math.max(0, (cy - r.top) / r.height));
      em.classList.add('is-shiny');
      em.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); em.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      em.style.setProperty('--px', (20 + x * 60).toFixed(1) + '%'); em.style.setProperty('--py', (20 + y * 60).toFixed(1) + '%');
      if (!reduceMotion) { em.style.setProperty('--ery', ((x - 0.5) * 36).toFixed(1) + 'deg'); em.style.setProperty('--erx', ((0.5 - y) * 30).toFixed(1) + 'deg'); }
    }
    function off() { em.classList.remove('is-shiny'); em.style.setProperty('--erx', '0deg'); em.style.setProperty('--ery', '0deg'); }
    zone.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') at(e.clientX, e.clientY); });
    zone.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') off(); });
    function onT(e) { var t = e.touches && e.touches[0]; if (!t) return; clearTimeout(offT); at(t.clientX, t.clientY); }
    zone.addEventListener('touchstart', onT, { passive: true });
    zone.addEventListener('touchmove', onT, { passive: true });
    zone.addEventListener('touchend', function () { offT = setTimeout(off, 700); }, { passive: true });
    zone.addEventListener('touchcancel', function () { offT = setTimeout(off, 700); }, { passive: true });
  }
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
      '<div class="cp-dart"><span class="cp-dnum">' + esc(p.n) + '</span><span class="cp-dem" id="cp-dem">' + emblem(p) + '<span class="em-holo"></span><span class="em-sheen"></span><span class="em-shine"></span></span></div>' +
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
  }, { kid: true, nav: 'missions', bg: '#1B2552' });
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
    app.go('#/mission/postes', true);
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
    // V1 (28/10) : la mission des copains n'est pas ouverte aux enfants (MC.CONFIG.ENFANTS)
    if (!MC.ouvert('copains')) { setTimeout(function () { app.go('#/missions', true); }, 0); return null; }
    return app.loadMe().then(function (me) { return roster().then(function (list) { return paintCopains(me, list); }); });
  }, { kid: true, nav: 'missions', bg: '#12333A' });
  function copainsDispo(me, list) {
    return (list || []).filter(function (k) { return k.id !== me.joueur.id && !/^test$/i.test(k.prenom); });
  }
  function paintCopains(me, list) {
    var d = brouillon(me), e = M.etat(me, 'copains'), dispo = copainsDispo(me, list), byId = {};
    var bar = MC.kidSubBar('#/missions', 'Missions', 'Avec qui tu aimes jouer');
    if (e.bloquee) return '<main class="screen">' + bar + enTete(me, 'copains', 'Avec qui tu<br>aimes jouer', 'Dis aux éducs avec quels copains tu aimes jouer.') +
      '<div class="note gold">' + icon('lock', 20) + '<span><b>Cette mission se débloque quand tu as choisi ton poste.</b> Commence par la mission « Choisis ton poste ».</span></div>' +
      '<a class="btn gold glow" href="#/mission/postes">Choisir mon poste</a></main>';
    dispo.forEach(function (k) { byId[k.id] = k; });
    d.copains = d.copains.filter(function (id) { return byId[id]; });
    var chosen = d.copains.map(function (id) { var k = byId[id]; return '<button type="button" class="cop-chip" data-act="msnCop" data-id="' + esc(id) + '" aria-label="Retirer ' + esc(k.prenom) + '">' + ui.avatar(k.prenom, k.couleur, 34) + esc(k.prenom) + '<span class="x">' + icon('x', 14) + '</span></button>'; }).join('');
    var label = e.faite ? 'Enregistrer mes copains' : 'Terminer la mission · +' + C.XP.mission + ' XP';
    return '<main class="screen">' + bar +
      enTete(me, 'copains', 'Avec qui tu<br>aimes jouer', 'Choisis les copains avec qui tu aimes jouer, autant que tu veux.') +
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
    var d = brouillon(me), was = M.etat(me, 'copains').faite;
    if (!d.copains.length) return;
    var p = { mission: MID, copains: d.copains, fin: true };
    if (d.dirtyP && d.postes.length) p.postes = d.postes;
    b.disabled = true;
    app.kidCall('mission', p).then(function (res) {
      app.setMe(res);
      d.dirtyC = false; if (p.postes) d.dirtyP = false; garder(d);
      if (was) { ui.toast('Tes copains sont enregistrés'); app.go('#/missions', true); }
      else app.go('#/mission/bravo?m=copains', true);
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); if (/poste/.test(e.message)) app.go('#/mission/postes'); });
  };

  // ----- mission accomplie -----
  app.route('/mission/bravo', function (p, q) {
    return app.loadMe().then(function (me) {
      var id = q.m === 'copains' && MC.ouvert('copains') ? 'copains' : 'poste', D = M.def(id), e = M.etat(me, id), bd = badgeDe(D), suite = prochaine(me);
      if (!e.faite) { setTimeout(function () { app.go(D.lien, true); }, 0); return null; }
      var detail = id === 'poste' ? '<span class="hud" style="color:var(--dim)">Ton top</span>' + ptags(e.postes, true) + '<span class="small">Tu peux le changer quand tu veux (Moi › Mes postes).</span>' :
        '<span class="small">' + e.copains.length + ' copain' + (e.copains.length > 1 ? 's' : '') + ' choisi' + (e.copains.length > 1 ? 's' : '') + ', en secret. Tu peux les changer quand tu veux (Moi › Mes copains).</span>';
      return '<main class="screen nonav center" style="text-align:center;align-items:center">' +
        '<span class="kicker" style="color:var(--gold);margin-top:24px">Mission accomplie</span>' +
        '<h1 class="big md">' + (id === 'poste' ? 'Prêt pour<br>le jeu à 10 !' : 'Esprit<br>d\'équipe !') + '</h1>' +
        '<section class="newbadge" style="--bc:' + bd.color + ';width:100%"><div>' + MC.badgeIcon({ icon: bd.icon, color: bd.color }, true, 64) +
        '<div style="display:flex;flex-direction:column;gap:4px;text-align:left"><span class="hud" style="color:' + bd.color + '">Nouveau badge</span><span style="font:italic 900 26px/.95 var(--f-title);text-transform:uppercase">' + esc(bd.nom) + '</span><span class="small" style="color:var(--muted)">+' + C.XP.mission + ' XP et +' + C.XP.badge + ' XP pour le badge</span></div></div></section>' +
        '<div class="sec" style="width:100%;text-align:left">' + detail + '</div>' +
        (suite ? '<a class="btn gold glow" href="' + suite.lien + '" style="width:100%">Mission suivante : ' + esc(suite.titre) + '</a><a class="btn2 grey" href="#/missions" style="width:100%">Plus tard</a>' :
          '<a class="btn gold glow" href="#/missions" style="width:100%">Retour à mes missions</a>') + '</main>';
    });
  }, { kid: true, bg: '#2E2612' });

  // ======================================================================
  // CÔTÉ PARENT : où en est son enfant (pas les copains : c'est secret)
  // ======================================================================
  MC.missionParent = function (d) {
    var D1 = M.def('poste'), D2 = MC.ouvert('copains') ? M.def('copains') : null;   // V1 : sans les copains
    if (!D1 || L.today() < D1.debut) return '';
    var e1 = M.etat(d, 'poste'), e2 = M.etat(d, 'copains'), k = d.joueur;
    var l1 = e1.faite ? '<div class="note green">' + icon('check', 20) + '<span><b>Mission « ' + esc(D1.titre) + ' » accomplie.</b> Ses postes : ' + e1.postes.map(function (id, i) { return (i + 1) + '. ' + esc(M.poste(id).nom); }).join(' · ') + '.</span></div>' :
      '<div class="note gold">' + icon('star', 20) + '<span><b>Mission à faire : « ' + esc(D1.titre) + ' ».</b> ' + esc(k.prenom) + ' choisit son poste pour le jeu à 10, dans son onglet « Missions »' + (L.today() <= D1.fin ? ', jusqu\'au ' + esc(fmtJour(D1.fin)).replace(/\.$/, '') : '') + '.</span></div>';
    var l2 = !D2 ? '' : e2.faite ? '<div class="note green">' + icon('check', 20) + '<span><b>Mission « ' + esc(D2.titre) + ' » accomplie.</b> Ses copains restent secrets.</span></div>' :
      '<div class="note gold">' + icon(e2.bloquee ? 'lock' : 'star', 20) + '<span><b>Mission à faire : « ' + esc(D2.titre) + ' ».</b> ' + esc(k.prenom) + ' dit aux éducs avec qui il aime jouer (c\'est secret)' + (e2.bloquee ? ' ; elle se débloque une fois son poste choisi' : '') + '.</span></div>';
    return l1 + l2;
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
  // les 2 missions sur la fiche d'un joueur (onglet Terrain) : « Choisis ton poste », puis « Avec qui tu aimes jouer »
  MC.missionKid = function (d, g) {
    if (!M.def('poste')) return '';
    var e = M.etat(d, MID), names = prenoms(g), mutual = {};
    choisiPar(g, d.joueur.id).forEach(function (j) { mutual[j.id] = true; });
    var cop = e.copains.map(function (id) { return names[id] ? (mutual[id] ? '<b style="color:var(--green)">' + esc(names[id]) + ' ⇄</b>' : esc(names[id])) : ''; }).filter(Boolean);
    var par = choisiPar(g, d.joueur.id).map(function (j) { return esc(j.prenom); });
    var test = resumeTest(e);
    function pastille(ok) { return ok ? '<span class="pill" style="background:var(--green)">Faite</span>' : '<span class="pill" style="background:var(--orange)">À faire</span>'; }
    // deux missions séparées, chacune sous son titre (comme côté enfant)
    return '<section class="sec"><div class="between"><h2 class="h2">Choisis ton poste</h2>' + pastille(e.posteFait) + '</div>' +
      '<div class="box" style="display:flex;flex-direction:column;gap:10px">' +
      '<div><span class="mlab">Ses postes, dans l\'ordre</span>' + (e.postes.length ? ptags(e.postes, true) : '<span class="small">Pas encore choisis.</span>') + '</div>' +
      (e.message ? '<div><span class="mlab">Son mot pour les éducs</span><p class="mmot">' + esc(e.message) + '</p></div>' : '') +
      (test.length ? '<details><summary class="small" style="cursor:pointer;color:var(--cyan)">Son test « Aide-moi à choisir »</summary><ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.5">' + test.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>' : '') +
      '</div></section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Avec qui tu aimes jouer</h2>' + pastille(e.copainsFait) + '</div>' +
      // (retouche UI-13) les préférences de copains restent secrètes : repliées, marquées « éducs uniquement »
      '<div class="box"><details class="edonly" style="border-top:0;padding-top:0"><summary><span class="mlab">Ses copains et ceux qui l\'ont choisi</span><span class="edonly-k">' + icon('lock', 12) + ' Éducs uniquement</span></summary>' +
      '<div class="edonly-b"><div><span class="mlab">Ses copains (secret)</span><span class="small" style="color:var(--soft)">' + (cop.length ? cop.join(', ') : (e.copainsFait ? 'Aucun' : 'Pas encore choisis')) + '</span></div>' +
      '<div><span class="mlab">L\'ont choisi comme copain</span><span class="small" style="color:var(--soft)">' + (par.length ? par.join(', ') : 'Personne pour l\'instant') + '</span></div>' +
      (cop.length && Object.keys(mutual).length ? '<span class="small">⇄ en vert : ils se sont choisis l\'un l\'autre.</span>' : '') +
      '</div></details></div></section>';
  };

  // ---------- côté éduc : une page par mission (Progrès › Missions) ----------
  var edMsn = { filtre: 'all' };
  app.route('/educ/mission', function () { app.go('#/educ/mission/poste', true); return Promise.resolve('<main class="screen"></main>'); }, { adult: 'e', nav: 'e:progres', bg: '#2A1640' });
  app.route('/educ/mission/:id', function (p) {
    return MC.loadGroup().then(function (g) { app.refreshNav(); return p.id === 'copains' ? paintEducCopains(g) : paintEducPoste(g); });
  }, { adult: 'e', nav: 'e:progres', bg: '#2A1640' });
  function joueursMission(g) {
    return g.joueurs.filter(function (p) { return p.joueur.actif && !/^test$/i.test(p.joueur.prenom); }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
  }
  var LAB = 'style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px"';
  function tuilesMission(n, tot, quoi) {
    return '<div class="grid2"><div class="tile"><span class="v" style="color:var(--green)">' + n + '</span><span class="l" ' + LAB + '>' + quoi + '</span></div>' +
      '<div class="tile"><span class="v" style="color:var(--orange)">' + (tot - n) + '</span><span class="l" ' + LAB + '>pas encore</span></div></div>';
  }
  function filtresMission(tot, todo) {
    return '<div class="grid2"><button type="button" class="opt' + (edMsn.filtre === 'all' ? ' on' : '') + '" aria-pressed="' + (edMsn.filtre === 'all') + '" data-act="msnFiltre" data-v="all">Tous · ' + tot + '</button>' +
      '<button type="button" class="opt' + (edMsn.filtre === 'todo' ? ' on' : '') + '" style="--oc:var(--orange)" aria-pressed="' + (edMsn.filtre === 'todo') + '" data-act="msnFiltre" data-v="todo">Pas encore · ' + todo + '</button></div>';
  }
  // (29/10) une ligne par enfant, sans bouclier ni étiquette « Faite / À faire » : le prénom, une coche verte quand
  // c'est fait, puis ses réponses sur la même ligne. Toucher la ligne déplie le détail (son mot, son test, sa fiche).
  function coche(ok) { return ok ? '<span class="mok" role="img" aria-label="Mission faite">' + icon('check', 16) + '</span>' : ''; }
  function ligneMission(p, ok, cellules, detail, indice) {
    return '<li><details class="mrow"><summary><span class="mrow-n"><span class="nm">' + esc(p.joueur.prenom) + '</span>' + coche(ok) + '</span>' + cellules +
      '<span class="mrow-x' + (indice ? ' on' : '') + '" aria-hidden="true">' + icon(indice ? 'chat' : 'chevd', 16) + '</span></summary>' +
      '<div class="mrow-d">' + detail + '<a class="btn2 sm grey" href="#/educ/joueur/' + esc(p.joueur.id) + '?t=terrain">' + icon('user', 16) + ' Sa fiche</a></div></details></li>';
  }
  function motHtml(e) {
    return '<div><span class="mlab">Son mot pour les éducs</span>' + (e.message ? '<p class="mmot">' + esc(e.message) + '</p>' : '<span class="small">Pas de mot.</span>') + '</div>';
  }
  function testHtml(e) {
    var test = resumeTest(e);
    return test.length ? '<div><span class="mlab">Son test « Aide-moi à choisir »</span><ul class="small mtest">' + test.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '';
  }
  // les noms courts des postes, pour tenir à 3 sur une ligne (le nom complet est dans le détail et en info-bulle)
  var COURT = { 'demi-de-melee': 'Demi mêlée', ouvreur: 'Ouvreur', 'troisieme-ligne': '3e ligne' };
  function lignePoste(p) {
    var e = etatDe(p), cells = '';
    if (e.postes.length) {
      for (var i = 0; i < 3; i++) {
        var P = M.poste(e.postes[i]);
        cells += P ? '<span class="mpc" style="--c:' + P.color + '" title="' + esc((i + 1) + '. ' + P.nom) + '">' + esc(COURT[P.id] || P.nom) + '</span>' : '<span class="mpc vide" aria-hidden="true"></span>';
      }
      cells = '<span class="mrow-c" aria-label="Ses postes : ' + esc(e.postes.map(function (id, k) { return (k + 1) + '. ' + M.poste(id).nom; }).join(', ')) + '">' + cells + '</span>';
    } else cells = '<span class="mrow-c none">Pas encore choisi</span>';
    var detail = '<div><span class="mlab">Ses postes, dans l\'ordre</span>' + (e.postes.length ? ptags(e.postes, true) : '<span class="small">Pas encore choisis.</span>') + '</div>' + motHtml(e) + testHtml(e);
    return ligneMission(p, e.posteFait, cells, detail, !!e.message);
  }
  // « Choisis ton poste » : qui l'a faite, les postes demandés
  function paintEducPoste(g) {
    var players = joueursMission(g), n = 0, choix1 = {}, autres = {};
    M.POSTES.forEach(function (p) { choix1[p.id] = []; autres[p.id] = []; });
    players.forEach(function (p) {
      var e = etatDe(p);
      if (e.posteFait) n++;
      e.postes.forEach(function (id, i) { if (choix1[id]) (i === 0 ? choix1 : autres)[id].push(p.joueur.prenom + (i ? ' (' + (i + 1) + ')' : '')); });
    });
    var max = 1;
    M.POSTES.forEach(function (p) { max = Math.max(max, choix1[p.id].length + autres[p.id].length); });
    var bars = M.POSTES.map(function (p) {
      var a = choix1[p.id].length, b = autres[p.id].length;
      return '<details class="pbarw"><summary class="pbar" style="cursor:pointer"><span style="color:' + p.color + ';font-weight:600">' + esc(p.nom) + '</span>' +
        '<span class="tr"><i style="width:' + (a / max * 100) + '%;background:' + p.color + '"></i><i style="width:' + (b / max * 100) + '%;background:' + hexA(p.color, 0.35) + '"></i></span><span class="n" style="color:' + p.color + '">' + a + (b ? '+' + b : '') + '</span></summary>' +
        '<p class="small" style="margin:6px 0 4px">' + (a || b ? (a ? '<b style="color:var(--ink)">Choix 1 :</b> ' + choix1[p.id].map(esc).join(', ') : '') + (b ? (a ? '<br>' : '') + '<b style="color:var(--ink)">Choix 2 ou 3 :</b> ' + autres[p.id].map(esc).join(', ') : '') : 'Personne pour l\'instant.') + '</p></details>';
    }).join('');
    var list = players.filter(function (p) { return edMsn.filtre === 'all' || !etatDe(p).posteFait; });
    var rows = list.map(lignePoste).join('');
    var mots = players.filter(function (p) { return etatDe(p).message; }).length;
    return '<main class="screen">' + MC.educBar(g, 'Choisis ton poste', '#/educ/missions', 'Missions') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale · ' + players.length + ' joueurs</span><h1 class="big md">Choisis ton poste</h1>' +
      '<p class="lead">Chaque enfant choisit 1 à 3 postes, dans l\'ordre, avec les 7 cartes ou le test « Aide-moi à choisir ». Ensuite, il peut faire « <a href="#/educ/mission/copains">Avec qui tu aimes jouer</a> ».</p></div>' +
      tuilesMission(n, players.length, 'ont choisi leur poste') +
      '<div class="cols2"><section class="sec"><h2 class="h2">Postes demandés</h2><p class="small" style="margin:0">Barre pleine = choix n°1, barre pâle = choix 2 ou 3. Touchez un poste pour voir les prénoms.</p><div class="pbars">' + bars + '</div></section>' +
      '<section class="sec"><h2 class="h2">Les joueurs</h2>' + filtresMission(players.length, players.length - n) +
      '<p class="small" style="margin:0">Touchez un enfant pour voir ses choix en entier' + (mots ? ', son mot (' + icon('chat', 13, 'style="vertical-align:-2px;color:var(--cyan)"') + ' : ' + mots + ' enfant' + (mots > 1 ? 's ont' : ' a') + ' écrit un mot)' : ', son mot') + ' et son test.</p>' +
      (rows ? '<div class="mrow-h" aria-hidden="true"><span>Prénom</span><span class="mrow-c"><span>Choix 1</span><span>Choix 2</span><span>Choix 3</span></span><span></span></div><ul class="list mrows">' + rows + '</ul>' : '<ul class="list"><li class="empty">Personne.</li></ul>') + '</section></div></main>';
  }
  // « Avec qui tu aimes jouer » : les copains de chacun (secret : seuls les éducs les voient)
  function paintEducCopains(g) {
    var players = joueursMission(g), names = prenoms(g), n = 0;
    players.forEach(function (p) { if (etatDe(p).copainsFait) n++; });
    var list = players.filter(function (p) { return edMsn.filtre === 'all' || !etatDe(p).copainsFait; });
    var rows = list.map(function (p) {
      var e = etatDe(p), par = choisiPar(g, p.joueur.id), mutual = {};
      par.forEach(function (j) { mutual[j.id] = true; });
      var cop = e.copains.map(function (id) { return names[id] ? (mutual[id] ? '<b style="color:var(--green)">' + esc(names[id]) + ' ⇄</b>' : esc(names[id])) : ''; }).filter(Boolean);
      var resume = '<span class="mrow-c none">' + (cop.length ? cop.length + ' copain' + (cop.length > 1 ? 's' : '') : e.copainsFait ? 'Aucun copain' : 'Pas encore choisi') + ' · choisi par ' + par.length + '</span>';
      var detail = '<div><span class="mlab">Ses copains (secret)</span><span class="small" style="color:var(--soft)">' + (cop.length ? cop.join(', ') : e.copainsFait ? 'Aucun copain choisi' : (e.posteFait ? 'Pas encore choisi' : 'Pas encore choisi (son poste d\'abord)')) + '</span></div>' +
        '<div><span class="mlab">L\'ont choisi comme copain</span><span class="small" style="color:var(--soft)">' + (par.length ? par.map(function (j) { return esc(j.prenom); }).join(', ') : 'Personne pour l\'instant') + '</span></div>';
      return ligneMission(p, e.copainsFait, resume, detail, false);
    }).join('');
    return '<main class="screen">' + MC.educBar(g, 'Avec qui tu aimes jouer', '#/educ/missions', 'Missions') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale · ' + players.length + ' joueurs</span><h1 class="big md">Avec qui tu aimes jouer</h1>' +
      '<p class="lead">Chaque enfant choisit ses copains, sans limite. Elle s\'ouvre une fois « <a href="#/educ/mission/poste">Choisis ton poste</a> » faite.</p></div>' +
      '<div class="note">' + icon('lock', 20) + '<span><b>Secret :</b> seuls les éducs voient les copains, ni les autres enfants ni les parents. ⇄ en vert : ils se sont choisis l\'un l\'autre.</span></div>' +
      tuilesMission(n, players.length, 'ont choisi leurs copains') +
      '<section class="sec"><h2 class="h2">Les joueurs</h2>' + filtresMission(players.length, players.length - n) +
      '<ul class="list mrows">' + (rows || '<li class="empty">Personne.</li>') + '</ul></section></main>';
  }
  MC.act.msnFiltre = function (b) { edMsn.filtre = b.getAttribute('data-v'); app.rerender(); };
})();
