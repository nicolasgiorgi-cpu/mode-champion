/* =========================================================
   Mode champion · M12 — BILAN GUIDÉ, test par test
   échauffement → 12 tests (démo, chrono, comptage, saisie) → récap → envoi
   Les résultats vont dans le même état que le formulaire du bilan (MC.bilan, v-profil.js).
   (v74, lot E3) « Je tente » : le même écran pour une seule épreuve (G.solo), gardé à part (mc-tente) ;
   le résultat part tout de suite comme une tentative (bilan « defi »), puis la fête (record battu ou pas).
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var G = null, timer = null, KEY = 'mc-bilrun', KEY_SOLO = 'mc-tente', REPOS = 120, COL = '#FFC23D';
  var NB = C.TESTS.length;
  var H = [];   // historique pour le bouton « Retour »
  var ELAS = [['10', '10 kg'], ['20', '20 kg'], ['30', '30 kg']];   // élastiques Decathlon (30 kg = celui qui aide le plus)
  function elasNom(e) { var m = { fin: '10 kg', moyen: '20 kg', fort: '30 kg', '10': '10 kg', '20': '20 kg', '30': '30 kg' }; return m[e] || e; }
  var RING = 2 * Math.PI * 210;

  // animation de chaque test (et de sa version « mini matériel »)
  var ANIM = { flamant: 'flamant', saut: 'saut_longueur', navette: 'navette', susp: 'suspension', tract: 'tractions', pompes: 'pompes', planche: 'planche', squats: 'squat', chaise: 'chaise_mur', corde: 'corde', corde1: 'corde', burpees: 'burpees' };
  var ANIM_SM = { susp: 'superman', tract: 'tirage_elastique', corde: 'sauts_lateraux', corde1: 'sauts_lateraux' };
  // quand toucher STOP
  var STOP_QUAND = {
    flamant: 'dès que le pied se pose ou que les yeux s\'ouvrent', susp: 'dès que les mains lâchent', planche: 'dès que les fesses montent ou descendent sans se corriger',
    chaise: 'dès que les fesses remontent ou que les mains touchent les cuisses', navette: 'quand le pied touche la ligne d\'arrivée'
  };
  var STOP_QUAND_SM = { susp: 'dès qu\'un pied ou une main touche le sol' };

  // façon de mesurer chaque test : hold (chrono qui monte), course (chrono au dixième), minute (1 min), reps (on compte), dist (3 sauts)
  function cfg(t) {
    switch (t.id) {
      case 'flamant': return { mode: 'hold', essais: ['Pied gauche · 1er essai', 'Pied gauche · 2e essai', 'Pied droit · 1er essai', 'Pied droit · 2e essai'], opt: [false, true, false, true] };
      case 'saut': return { mode: 'dist', essais: [''] };
      case 'navette': return { mode: 'course', essais: ['Un seul essai'] };
      case 'susp': case 'planche': case 'chaise': return { mode: 'hold', essais: [''] };
      case 'corde': return { mode: 'reps', essais: ['1er essai', '2e essai'], opt: [false, true] };
      case 'squats': case 'corde1': case 'burpees': return { mode: 'minute', essais: [''] };
      default: return { mode: 'reps', essais: [''] };
    }
  }

  function me() { return app.S.me; }
  function isSm(t) { return !!(t.sm && me().joueur.materiel === 'mini'); }
  // (v82) le mode mini matériel bien visible : sur un test qui a une version mini (barre ou corde), une ligne dit laquelle est
  // proposée et change de mode d'un toucher, avant le test (pendant le repos qui le précède aussi), jamais une fois commencé
  function quoiManque(t) { return /^corde/.test(t.id) ? 'corde' : 'barre'; }
  function commence(t) {
    if (G.phase !== 'ready' && G.phase !== 'rest') return true;
    if (G.e > 0 || (G.tr[t.id] || []).length) return true;
    var f = G.f || {};
    return Object.keys(f).some(function (k) { return f[k] && f[k] !== '0'; });   // (relecture) un compteur déjà lancé
  }
  function cacherMatos() { var n = document.querySelector('.note.matos'); if (n && n.parentNode) n.parentNode.removeChild(n); }
  function matosLigne(t, choix) {
    if (!t.sm || (!choix && commence(t))) return '';
    var q = quoiManque(t);
    return isSm(t)
      ? '<div class="note matos"><span class="small grow"><b>Mode mini matériel</b> : la version sans ' + q + '.</span><button type="button" class="btn2 sm" data-act="brMatos" data-m="complet">J\'ai une ' + q + '</button></div>'
      : '<div class="note matos"><span class="small grow">Pas de ' + q + ' ?</span><button type="button" class="btn2 sm grey" data-act="brMatos" data-m="mini">Version mini</button></div>';
  }
  // (relecture) le changement se voit tout de suite (pas d'attente du serveur pendant laquelle « GO » partirait dans l'ancienne
  // version) ; s'il n'est pas enregistré, on revient au mode d'avant, sauf si le test a déjà commencé dans le nouveau
  MC.act.brMatos = function (b) {
    var m = b.getAttribute('data-m') === 'mini' ? 'mini' : 'complet', avant = me().joueur.materiel === 'mini' ? 'mini' : 'complet';
    if (G.i > 0 && commence(test())) { cacherMatos(); ui.toast('Le test a commencé : finis-le d\'abord.', true); return; }
    if (m === avant) return;
    me().joueur.materiel = m;
    repaint();
    ui.toast(m === 'mini' ? 'Mode mini matériel' : 'Matériel complet');
    app.kidCall('updateMe', { materiel: m }).then(function (res) {
      if (me().joueur.materiel === m) app.setMe(res);   // un autre changement entre-temps : c'est lui qui compte
    }).catch(function (e) {
      if (me().joueur.materiel === m && !(G.i > 0 && commence(test()))) { me().joueur.materiel = avant; repaint(); }
      ui.toast(e.message, true);
    });
  };
  function nomT(t) { return isSm(t) ? t.sm.nom : t.nom; }
  function commentT(t) { return isSm(t) ? t.sm.comment : t.comment; }
  function videoFor(a) { for (var k in C.EXOS) { var e = C.EXOS[k]; if (e.anim === a && e.video) return e.video; } return ''; }
  function test() { return G.solo ? L.testDef(G.solo) : C.TESTS[G.i - 1]; }
  function num(s) { var x = parseFloat(String(s === undefined || s === null ? '' : s).replace(',', '.')); return isFinite(x) ? x : null; }

  // ---------- état (gardé sur l'appareil : on peut fermer et reprendre) ----------
  function fresh(B, kid, reste) { return { n: B.n, kid: kid, i: 0, e: 0, phase: 'warm', tr: {}, f: {}, back: false, startedAt: Date.now(), reste: reste || null }; }
  // (v75, lot E4) « Finir mon bilan » : seulement les épreuves pas encore faites dans le cycle (G.reste : leurs numéros 1..12)
  function suivant(i) { if (!G.reste) return i + 1 <= NB ? i + 1 : 0; var l = G.reste.filter(function (k) { return k > i; }); return l.length ? l[0] : 0; }
  // « Faire » ou « Refaire » une épreuve hors de la liste (depuis le récap) : on revient au numéro sur 12
  function nbTests() { return G.reste && (G.i > NB || G.i === 0 || G.reste.indexOf(G.i) >= 0) ? G.reste.length : NB; }
  function rang(i) { return G.reste && G.reste.indexOf(i) >= 0 ? G.reste.indexOf(i) + 1 : i; }
  function persist() {
    if (!G) { app.lsSet(KEY, null); return; }
    var c = {};
    for (var k in G) if (k !== 't' && k !== 'rt') c[k] = G[k];
    if (c.phase === 'count3' || c.phase === 'run' || c.phase === 'rest') { c.phase = 'ready'; c.f = {}; }
    if (c.phase === 'send') c.phase = 'coupe';   // (v74) l'envoi a été coupé : on le dira en revenant
    app.lsSet(G.solo ? KEY_SOLO : KEY, c);
  }
  function restore(B, kid) {
    var s = app.lsGet(KEY);
    if (!s || s.n !== B.n || s.kid !== kid) return null;
    s.f = s.f || {}; s.tr = s.tr || {};
    return s;
  }
  MC.bilanGuide = {
    progress: function () {
      var s = app.lsGet(KEY), B = L.currentBilan();
      if (!s || !app.S.kid || s.kid !== app.S.kid.joueur.id || s.n !== B.n || s.i < 1) return '';
      return s.i > NB ? 'récap' : s.reste && s.reste.indexOf(s.i) >= 0 ? 'test ' + (s.reste.indexOf(s.i) + 1) + '/' + s.reste.length : 'test ' + s.i + '/' + NB;
    },
    started: function () { return !!MC.bilanGuide.progress(); }
  };

  // ---------- chrono ----------
  function startT(kind, dur, onEnd) { G.t = { kind: kind, dur: dur || 0, start: Date.now(), acc: 0, paused: false, onEnd: onEnd, last: null }; }
  function elapsed() { var t = G && G.t; return t ? (t.acc + (t.paused ? 0 : Date.now() - t.start)) / 1000 : 0; }
  function remaining() { return G && G.t ? Math.max(0, G.t.dur - elapsed()) : 0; }
  function countsDown(kind) { return kind === 'count3' || kind === 'minute' || kind === 'rest' || kind === 'warm'; }
  function togglePause() {
    var t = G.t;
    if (!t) return;
    if (t.paused) { t.paused = false; t.start = Date.now(); } else { t.acc += Date.now() - t.start; t.paused = true; }
    repaint();
  }
  function startTick() { stopTick(); timer = setInterval(onTick, 100); }
  function stopTick() { if (timer) clearInterval(timer); timer = null; }
  function clock(s, up) { s = up ? Math.floor(s) : Math.ceil(s - 0.001); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function tenths(s) { return (Math.floor(s * 10) / 10).toFixed(1).replace('.', ','); }
  function onTick() {
    if (!G || !G.t) return;
    var t = G.t, tl = document.querySelector('[data-tl]'), ring = document.querySelector('[data-ring]');
    if (countsDown(t.kind)) {
      var rem = remaining(), sec = Math.ceil(rem - 0.001);
      if (t.last !== sec) {
        if (!t.paused && t.last !== null) {
          if (t.kind === 'count3') { if (sec >= 1 && sec <= 3) ui.beep(660, 0.1); }
          else ui.countBeep(sec, t.dur);
        }
        t.last = sec;
      }
      if (tl) tl.textContent = t.kind === 'count3' ? String(sec) : clock(rem);
      if (ring) ring.setAttribute('stroke-dashoffset', String(RING * (1 - rem / t.dur)));
      if (rem <= 0 && !t.ended) {
        t.ended = true;
        if (t.kind === 'count3') ui.beep(1040, 0.25, 0.22); else ui.endBeep();
        var fn = t.onEnd;
        G.t = null;
        if (fn) fn();
      }
    } else {
      var e = elapsed();
      if (tl) tl.textContent = t.kind === 'course' ? tenths(e) : clock(e, true);
      if (ring) ring.setAttribute('stroke-dashoffset', String(RING * (1 - (e % 60) / 60)));
    }
  }

  // ---------- valeurs ----------
  function readVal(t, c) {
    var f = G.f;
    if (c.mode === 'dist') { var a = [num(f.a), num(f.b), num(f.c)]; return a.some(function (x) { return x !== null; }) ? a.map(function (x) { return x === null ? null : Math.round(x); }) : null; }
    if (t.mmss) { if (!f.m && !f.s) return null; return (num(f.m) || 0) * 60 + (num(f.s) || 0); }
    var v = num(f.v);
    if (v === null) return null;
    return c.mode === 'course' ? Math.round(v * 10) / 10 : Math.round(v);
  }
  function best(t, arr) {
    var m = null;
    (arr || []).forEach(function (x) { if (x === null || x === undefined) return; if (m === null || (t.moinsMieux ? x < m : x > m)) m = x; });
    return m;
  }
  // texte du résultat noté pour un test (ou '' si rien)
  function valText(t) {
    var v = MC.bilan.values(me()).filter(function (x) { return x.test === t.id; })[0];
    if (!v) return '';
    if (v.extra && v.extra.g !== undefined) return 'gauche ' + ui.fmtVal(v.extra.g, 's') + ' · droit ' + ui.fmtVal(v.extra.d, 's');
    var s = ui.fmtVal(v.valeur, t.unite, t.decimales);
    if (v.extra && v.extra.elastique) s += ' · ' + v.extra.nbElastique + ' avec l\'élastique ' + elasNom(v.extra.elastique);
    return s;
  }

  // ---------- retour en arrière ----------
  function snap() {
    var c = {};
    for (var k in G) if (k !== 't' && k !== 'rt') c[k] = G[k];
    H.push(JSON.stringify({ g: c, v: MC.bilan.ensure(me()).v }));
    if (H.length > 40) H.shift();
  }
  MC.act.brBack = function () {
    if (!G || !H.length) return;
    var o = JSON.parse(H.pop());
    if (G.rt) { MC.routine.stop(G.rt); G.rt = null; }
    G = o.g; G.t = null;
    var b = MC.bilan.ensure(me());
    b.v = o.v || {};
    MC.bilan.save();
    if (G.phase === 'count3' || G.phase === 'run') { G.phase = 'ready'; G.f = {}; }
    if (G.phase === 'rest') startT('rest', REPOS, function () { G.phase = 'ready'; persist(); repaint(); });
    persist(); repaint(); window.scrollTo(0, 0);
    ui.toast('Retour en arrière');
  };

  // ---------- transitions ----------
  function enterTest(i) {
    G.i = i; G.e = 0; G.f = {}; G.phase = 'ready'; G.t = null;
    if (G.solo) { if (i === 1) G.tr[G.solo] = []; }
    else if (i >= 1 && i <= NB) G.tr[C.TESTS[i - 1].id] = [];
  }
  function toFin() { G.t = null; G.i = NB + 1; G.phase = 'fin'; G.back = false; G.f = {}; persist(); repaint(); window.scrollTo(0, 0); }
  function nextEssai() { G.e++; G.f = {}; G.phase = 'ready'; G.t = null; persist(); repaint(); }
  function endTest() {
    if (G.solo) { soloEnd(); return; }
    var t = test(), b = MC.bilan.ensure(me()), tr = G.tr[t.id] || [];
    if (t.id === 'flamant') {
      var g = best(t, tr.slice(0, 2)), d = best(t, tr.slice(2, 4));
      if (g !== null) b.v.flamant_g = String(g);
      if (d !== null) b.v.flamant_d = String(d);
    } else {
      var v = best(t, tr);
      if (v !== null) {
        if (t.mmss) { b.v[t.id + '_m'] = String(Math.floor(v / 60)); b.v[t.id + '_s'] = String(Math.round(v % 60)); }
        else b.v[t.id] = t.decimales ? String(v).replace('.', ',') : String(v);
        MC.bilan.marquerVersion(b.v, t.id, isSm(t));   // (v79) la version faite (mini matériel ou complète) reste avec sa valeur
      }
      if (t.special === 'tract' && !isSm(t)) {
        if (v !== null && v < 5) {
          MC.bilan.save();
          G.phase = 'elas'; G.f = { el: b.v.tract_el || '', v: '' };
          persist(); repaint();
          return;
        }
        delete b.v.tract_el; delete b.v.tract_nb;
      }
    }
    MC.bilan.save();
    afterTest();
  }
  function afterTest() {
    if (G.back || !suivant(G.i)) { toFin(); return; }
    var avant = G.i;
    enterTest(suivant(G.i));
    G.prevI = avant;   // (v75) le test d'avant (avec « Finir mon bilan », ce n'est pas forcément le numéro d'avant)
    G.phase = 'rest';
    startT('rest', REPOS, function () { G.phase = 'ready'; persist(); repaint(); });
    persist(); repaint(); window.scrollTo(0, 0);
  }
  function setCount(n) {
    G.f.v = String(Math.max(0, n));
    var inp = document.getElementById('br_v'), cnt = document.querySelector('[data-cnt]');
    if (inp) { inp.value = G.f.v; inp.classList.add('has'); }
    if (cnt) cnt.textContent = G.f.v;
    if (!inp && !cnt) repaint();
    if (G.f.v !== '0') cacherMatos();   // (v82) le test a commencé
    persist();
  }

  // ---------- actions ----------
  MC.act.brMute = function () { ui.setMuted(!ui.isMuted()); if (!ui.isMuted()) { ui.unlockAudio(); ui.beep(880, 0.08); } repaint(); };
  MC.act.brPause = function () { togglePause(); };
  MC.act.brWarmDone = function () { snap(); if (G.rt) { MC.routine.stop(G.rt); G.rt = null; } enterTest(G.solo ? 1 : suivant(0) || 1); persist(); repaint(); window.scrollTo(0, 0); };
  MC.act.brGo = function () {
    var c = cfg(test());
    ui.unlockAudio();
    ui.beep(660, 0.1);
    if (c.mode === 'minute') G.f = { v: '0' };
    G.phase = 'count3';
    startT('count3', 3, function () {
      G.phase = 'run';
      if (c.mode === 'minute') startT('minute', 60, function () { G.phase = 'res'; persist(); repaint(); });
      else startT(c.mode === 'course' ? 'course' : 'hold', 0, null);
      repaint();
    });
    repaint();
  };
  MC.act.brStop = function () {
    var t = test(), e = elapsed(), kind = G.t && G.t.kind;
    snap();
    G.t = null;
    if (kind === 'course') G.f = { v: tenths(e) };
    else { var s = Math.floor(e); G.f = t.mmss ? { m: String(Math.floor(s / 60)), s: String(s % 60) } : { v: String(s) }; }
    ui.beep(880, 0.15);
    G.phase = 'res'; persist(); repaint();
  };
  MC.act.brStopMin = function () { snap(); G.t = null; G.phase = 'res'; persist(); repaint(); };
  MC.act.brPlus = function () { setCount((parseInt(G.f.v, 10) || 0) + 1); };
  MC.act.brMinus = function () { setCount((parseInt(G.f.v, 10) || 0) - 1); };
  MC.act.brRedo = function () { G.t = null; G.f = {}; G.phase = 'ready'; persist(); repaint(); };
  MC.act.brOk = function () {
    var t = test(), c = cfg(t);
    snap();
    if (G.phase === 'elas') {
      var b = MC.bilan.ensure(me()), nb = num(G.f.v);
      if (!G.f.el) { H.pop(); return ui.toast('Choisis l\'élastique.', true); }
      if (nb === null) { H.pop(); return ui.toast('Note combien avec l\'élastique.', true); }
      b.v.tract_el = G.f.el; b.v.tract_nb = String(Math.round(nb));
      MC.bilan.save();
      afterTest();
      return;
    }
    var v = readVal(t, c);
    if (v === null) { H.pop(); return ui.toast('Note le résultat, ou passe ce test.', true); }
    if (c.mode === 'dist') G.tr[t.id] = v;
    else (G.tr[t.id] = G.tr[t.id] || [])[G.e] = v;
    if (c.mode !== 'dist' && G.e + 1 < c.essais.length) { nextEssai(); return; }
    endTest();
  };
  MC.act.brSkipEssai = function () {
    var t = test(), c = cfg(t);
    snap();
    (G.tr[t.id] = G.tr[t.id] || [])[G.e] = null;
    if (G.e + 1 < c.essais.length) nextEssai(); else endTest();
  };
  MC.act.brSkip = function () {
    if (G.solo) { soloQuit(); return; }
    snap();
    G.t = null;
    if (G.back || !suivant(G.i)) { toFin(); return; }
    enterTest(suivant(G.i)); persist(); repaint(); window.scrollTo(0, 0);
  };
  MC.act.brRestSkip = function () { snap(); G.t = null; G.phase = 'ready'; persist(); repaint(); };
  MC.act.brEl = function (btn) { G.f.el = btn.getAttribute('data-v'); persist(); repaint(); };
  MC.act.brGoto = function (btn) { snap(); enterTest(Number(btn.getAttribute('data-i'))); G.back = true; persist(); repaint(); window.scrollTo(0, 0); };
  MC.act.brSend = function (btn) {
    MC.bilan.submit(btn).then(function (ok) { if (ok) { G = null; H = []; persist(); } });
  };
  MC.act.brQuit = function () {
    if (G && G.solo) { soloAsk(); return; }
    var wasPaused = G.t && G.t.paused, rtWas = G.rt && G.rt.t && !G.rt.t.paused;
    if (G.t && !G.t.paused) togglePause();
    if (rtWas) MC.routine.pause(G.rt, true);
    var any = MC.bilan.values(me()).length > 0;
    ui.modal({
      title: 'Tu fais une pause ?',
      body: '<p class="lead">' + (any ? 'Tes résultats déjà notés sont gardés sur cet appareil. Tu reprendras le bilan là où tu en es (ou tu les envoies depuis la page du bilan).' : 'Tu pourras reprendre le bilan plus tard.') + '</p>',
      actions: [{ label: 'Continuer le bilan', value: 'go', cls: 'btn gold' }, { label: 'Pause, je reviendrai', value: 'pause', cls: 'btn2' }],
      cancelValue: 'go'
    }).then(function (v) {
      if (v === 'pause') { G.t = null; persist(); ui.keepAwake(false); app.go('#/bilan'); }
      else {
        if (G && G.t && G.t.paused && !wasPaused) togglePause();
        if (G && G.rt && rtWas) MC.routine.pause(G.rt, false);
      }
    });
  };
  document.addEventListener('input', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-brun');
    if (!k || !G) return;
    var clean = e.target.value.replace(e.target.getAttribute('data-num') === 'int' ? /[^0-9]/g : /[^0-9.,]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
    G.f[k] = clean;
    e.target.classList.toggle('has', !!clean);
    var cnt = document.querySelector('[data-cnt]');
    if (k === 'v' && cnt) cnt.textContent = clean || '0';
    if (clean && clean !== '0') cacherMatos();   // (v82) le test a commencé
    persist();
  });

  // ---------- écran ----------
  app.route('/bilan/go', function (p, q, cur) {
    return app.loadMe().then(function (m) {
      var B = L.currentBilan(), kid = m.joueur.id;
      MC.bilan.ensure(m);
      if (!G || G.n !== B.n || G.kid !== kid) {
        // (v75) « Finir mon bilan » : les épreuves pas encore faites dans le cycle ; un bilan déjà commencé reprend où il en était
        var bc = L.bilanCycle(m.records, B.n), reste = q.reste === '1' && B.n >= L.GRILLE_DEPUIS ? C.TESTS.filter(function (t) { return !bc.cases[t.id]; }).map(function (t) { return t.n; }) : null;
        G = restore(B, kid) || fresh(B, kid, reste && reste.length ? reste : null); H = [];
      }
      ui.keepAwake(true);
      cur.cleanup = function () { stopTick(); if (G && G.rt) MC.routine.detach(G.rt); setTimeout(function () { if (location.hash.indexOf('#/bilan/go') !== 0) ui.keepAwake(false); }, 0); };
      cur.after = function () { startTick(); };
      return view();
    });
  }, { kid: true, busy: true, bg: '#3A2C10' });

  function repaint() {
    if (!G) return;
    var host = document.getElementById('app');
    if (!host || !document.querySelector('.run.bilrun')) return;
    host.innerHTML = view();
    ui.mountAnims(host);
  }
  function view() {
    var html = '<main class="run bilrun' + (G.solo ? ' tente' : '') + '" style="--rc:' + COL + '">' + topBar();
    if (G.solo) html += soloBody();
    else if (G.i === 0) html += warmView();
    else if (G.i > NB) html += finView();
    else html += testView();
    return html + '</main>';
  }
  function topBar() {
    var segs = '', nb = G.solo ? 1 : nbTests(), pos = G.solo || !G.reste ? G.i : G.i > NB ? nb + 1 : G.i === 0 ? 0 : rang(G.i);   // (v75) la barre suit les épreuves à faire
    for (var i = 0; i <= nb + 1; i++) segs += '<i><b style="width:' + (i < pos ? 100 : 0) + '%"></b></i>';
    var label = G.solo ? (G.i === 0 && G.phase === 'warm' ? 'ÉCHAUFFEMENT' : G.duJour ? 'RECORD DU JOUR' : 'JE TENTE') : G.i === 0 ? 'ÉCHAUFFEMENT' : G.i > NB ? 'RÉCAP' : 'TEST ' + rang(G.i) + '/' + nbTests();
    if (G.solo && G.i === 2) return '';   // (v74) l'envoi et la fête : sans barre de progression
    return '<div class="top"><button type="button" class="cbtn grey" data-act="brQuit" aria-label="Faire une pause">' + icon('x', 20) + '</button>' +
      (H.length ? '<button type="button" class="cbtn wide" data-act="brBack" aria-label="Revenir en arrière (annuler le dernier clic)">' + icon('undo', 18) + '<span>Retour</span></button>' : '') +
      '<div class="prog" style="--n:' + (nb + 2) + '">' + segs + '</div><span class="hud" style="color:var(--rc)">' + label + '</span>' +
      '<button type="button" class="cbtn grey" data-act="brMute" aria-label="' + (ui.isMuted() ? 'Activer le son' : 'Couper le son') + '">' + icon(ui.isMuted() ? 'mute' : 'sound', 20) + '</button></div>';
  }
  function ringHtml(value, label, mode, frac, cls) {
    var col = mode === 'rest' ? '#38E8FF' : 'var(--rc)';
    return '<div class="ring ' + (mode || '') + ' ' + (cls || '') + '"><svg viewBox="0 0 500 500" aria-hidden="true"><circle cx="250" cy="250" r="210" fill="none" stroke="#1E2740" stroke-width="26"/>' +
      '<circle data-ring cx="250" cy="250" r="210" fill="none" stroke-width="26" stroke-dasharray="' + RING + '" stroke-dashoffset="' + (RING * (1 - (frac === undefined ? 1 : frac))) + '" style="stroke:' + col + ';filter:drop-shadow(0 0 10px ' + col + ')"/></svg>' +
      '<div class="in" role="timer"><span class="sec" data-tl>' + value + '</span><span class="lab">' + esc(label) + '</span></div></div>';
  }
  function pauseBtn() { var p = G.t && G.t.paused; return '<button type="button" class="btn2 grey" data-act="brPause">' + icon(p ? 'play' : 'pause', 16) + (p ? ' Reprendre' : ' Pause') + '</button>'; }
  function okBtn(label) { return '<button type="button" class="btn xl green glow" data-act="brOk">' + icon('check', 22) + ' ' + label + '</button>'; }
  function links(c, redo) {
    return '<div class="lnks">' + (redo ? '<button type="button" class="lnk" data-act="brRedo">Refaire l\'essai</button>' : '') +
      (c.opt && c.opt[G.e] ? '<button type="button" class="lnk" data-act="brSkipEssai">Passer cet essai</button>' : '') +
      (G.solo ? '' : '<button type="button" class="lnk" data-act="brSkip">Passer ce test</button>') + '</div>';
  }
  function counterHtml(label) {
    return '<div class="counter"><span class="hud" style="color:var(--dim)">' + esc(label) + '</span><div class="row">' +
      '<button type="button" class="pm" data-act="brMinus" aria-label="Un de moins">' + icon('minus', 34) + '</button>' +
      ui.numInput({ id: 'br_v', kind: 'int', max: 3, cls: 'bignum', value: G.f.v || '0', placeholder: '0', label: label, attrs: 'data-brun="v"' }) +
      '<button type="button" class="pm" data-act="brPlus" aria-label="Un de plus">' + icon('plus', 34) + '</button></div><span class="cap">Touche le nombre pour le taper</span></div>';
  }
  function field(id, key, lab, o) {
    return '<div class="sec" style="gap:4px"><label class="lab" for="' + id + '">' + esc(lab) + '</label>' +
      ui.numInput(Object.assign({ id: id, kind: 'int', cls: 'txt bnum', value: G.f[key], placeholder: '', attrs: 'data-brun="' + key + '"' }, o)) + '</div>';
  }

  function warmView() {
    var B = L.currentBilan();
    if (!G.rt) G.rt = MC.routine.create('warmup', me(), me().joueur.materiel === 'mini', repaint);
    if (G.solo) return MC.routine.html(G.rt, { kicker: C.REVEIL.nom, color: COL, doneAct: 'brWarmDone', doneLabel: 'Échauffement fait', after: 'Ensuite : ' + nomT(test()).toLowerCase() });
    var mini = me().joueur.materiel === 'mini';
    return MC.routine.html(G.rt, {
      kicker: B.nom + ' · ' + C.REVEIL.nom + (mini ? ' · mini matériel' : ''), color: COL,
      doneAct: 'brWarmDone', doneLabel: 'Échauffement fait',
      after: G.reste ? 'Ensuite : ' + nomT(C.TESTS[(G.reste[0] || 1) - 1]).toLowerCase() + ' (' + G.reste.length + ' test' + (G.reste.length > 1 ? 's' : '') + ' à faire, 2 min de repos entre deux)'
        : 'Ensuite : test 1, ' + nomT(C.TESTS[0]).toLowerCase() + ' (puis les 12 tests, 2 min de repos entre deux)'
    });
  }

  function restView(t) {
    var prev = C.TESTS[(G.prevI || G.i - 1) - 1], val = prev ? valText(prev) : '';
    var rem = G.t ? remaining() : REPOS, ml = matosLigne(t);
    return '<div class="main single' + (ml ? ' avecmatos' : '') + '"><div class="hd"><span class="kicker" style="color:var(--rc)">Repos</span><h1>Récupère</h1><p class="lead" style="margin:0">Respire, bois un peu, marche.</p>' +
      (val ? '<div class="note gold">' + icon('check', 20) + '<span>' + esc(nomT(prev)) + ' : <b>' + esc(val) + '</b></span></div>' : '') + '</div>' +
      '<div class="right">' + ringHtml(clock(rem), 'Repos', 'rest', rem / REPOS, 'clock') +
      '<div class="grid2">' + pauseBtn() + '<button type="button" class="btn2" data-act="brRestSkip">Je suis prêt ' + icon('right', 16) + '</button></div>' +
      '<p class="next">Prochain test : ' + (G.reste ? '' : t.n + '. ') + esc(nomT(t)) + '</p>' + ml + '</div></div>';
  }

  function testView() {
    var t = test(), c = cfg(t), ph = G.phase;
    if (ph === 'rest') return restView(t);
    var an = (isSm(t) && ANIM_SM[t.id]) || ANIM[t.id];
    var focus = ph === 'count3' || ph === 'run';
    var essai = ph !== 'elas' && c.essais[G.e] ? c.essais[G.e] : '';
    var hd = '<div class="hd"><span class="kicker" style="color:var(--rc)">' + (G.solo ? (G.duJour ? 'Record du jour' : 'Je tente mon record') : 'Test ' + rang(t.n) + ' / ' + nbTests()) + (isSm(t) ? ' · mini matériel' : '') + '</span><h1>' + esc(nomT(t)) + '</h1>' +
      (essai ? '<span class="hud" style="color:var(--ink)">' + esc(essai) + '</span>' : '') +
      (G.solo && !focus && recordDe(t) ? '<span class="hud" style="color:var(--gold)">Ton record : ' + esc(fmt(t, recordDe(t).valeur)) + '</span>' : '') + (focus ? '' : ui.infoBtn(MC.fiche.key.test(t.id, isSm(t)), nomT(t), commentT(t))) + '</div>';
    var left = focus ? '' : matosLigne(t) + ui.demoHtml({ anim: an, video: videoFor(an), color: COL, label: nomT(t) }) + '<p class="small" style="margin:0">' + esc(commentT(t)) + '</p>';
    var right = '', stopQ = (isSm(t) && STOP_QUAND_SM[t.id]) || STOP_QUAND[t.id] || '';

    if (ph === 'elas') {
      right = '<p class="lead" style="color:var(--ink)">Moins de 5 tractions : avec quel élastique en fais-tu 5 ou plus ? Commence par le 10 kg (celui qui aide le moins).</p><div class="grid3">' + ELAS.map(function (e) {
        return '<button type="button" class="opt' + (elasNom(G.f.el) === e[1] ? ' on' : '') + '" data-act="brEl" data-v="' + e[0] + '">' + e[1] + '</button>';
      }).join('') + '</div>' + (G.f.el ? counterHtml('Combien avec l\'élastique ' + elasNom(G.f.el) + ' ?') + okBtn('Valider') : '');
    } else if (ph === 'count3') {
      right = ringHtml(Math.max(1, Math.ceil(remaining() - 0.001)), 'Prêt ?', 'work', remaining() / 3);
    } else if (ph === 'run' && c.mode === 'minute') {
      var rm = remaining();
      right = ringHtml(clock(rm), 'Plus que', 'work', rm / 60, 'clock') +
        '<div class="tapcount"><span class="hud">Compté</span><b data-cnt>' + esc(G.f.v || '0') + '</b></div>' +
        '<button type="button" class="btn tap1" data-act="brPlus">+1</button>' +
        '<div class="grid2">' + pauseBtn() + '<button type="button" class="btn2 grey" data-act="brStopMin">Arrêter</button></div>';
    } else if (ph === 'run') {
      var e = elapsed(), course = c.mode === 'course';
      right = ringHtml(course ? tenths(e) : clock(e, true), course ? 'secondes' : 'min : s', 'work', (e % 60) / 60, 'clock') +
        '<button type="button" class="btn stop" data-act="brStop">' + icon('pause', 26) + (course ? ' Arrivé · STOP' : ' STOP') + '</button>' +
        (stopQ ? '<p class="next">Touche STOP ' + esc(stopQ) + '</p>' : '');
    } else if (ph === 'res') {
      if (c.mode === 'minute' || c.mode === 'reps') right = counterHtml(c.mode === 'minute' ? 'Résultat sur 1 minute' : 'Combien en as-tu fait ?');
      else if (t.mmss) right = '<span class="hud" style="color:var(--dim)">Ton temps (tu peux corriger)</span><div class="grid2">' + field('br_m', 'm', 'Minutes', { max: 1, auto: true, placeholder: '0' }) + field('br_s', 's', 'Secondes', { max: 2, placeholder: '0' }) + '</div>';
      else if (c.mode === 'course') right = field('br_c', 'v', 'Ton temps en secondes (tu peux corriger)', { kind: 'dec', max: 4 });
      else right = field('br_c', 'v', 'Ton temps en secondes (tu peux corriger)', { max: 3 });
      right += okBtn(G.e + 1 < c.essais.length ? 'Valider · essai suivant' : G.solo ? 'Valider mon résultat' : 'Valider ce test') + links(c, true);
    } else {
      // prêt
      if (c.mode === 'hold') {
        right = ringHtml('0:00', 'min : s', 'work', 0, 'clock') +
          '<button type="button" class="btn xl green glow" data-act="brGo">' + icon('play', 22) + ' GO</button>' +
          '<p class="next">Mets-toi en position : 3, 2, 1 et le chrono démarre</p>' + links(c);
      } else if (c.mode === 'course') {
        right = ringHtml('0,0', 'secondes', 'work', 0, 'clock') +
          '<button type="button" class="btn xl green glow" data-act="brGo">' + icon('play', 22) + ' GO</button>' +
          '<p class="next">Debout derrière la ligne : 3, 2, 1, au bip tu pars</p>' + links(c);
      } else if (c.mode === 'minute') {
        right = ringHtml('1:00', '1 minute', 'work', 1, 'clock') +
          '<button type="button" class="btn xl green glow" data-act="brGo">' + icon('play', 22) + ' GO</button>' +
          '<p class="next">Pendant la minute, l\'adulte touche +1 à chaque fois</p>' + links(c);
      } else if (c.mode === 'dist') {
        right = '<span class="hud" style="color:var(--dim)">Tes 3 sauts en cm : on garde le meilleur</span><div class="grid3">' +
          field('br_a', 'a', 'Saut 1', { max: 3, placeholder: 'cm' }) + field('br_b', 'b', 'Saut 2', { max: 3, placeholder: 'cm' }) + field('br_c3', 'c', 'Saut 3', { max: 3, placeholder: 'cm' }) + '</div>' +
          okBtn(G.solo ? 'Valider mon résultat' : 'Valider ce test') + links(c);
      } else {
        right = counterHtml(t.id === 'corde' ? 'Sauts jusqu\'à la 1re faute' : 'Combien d\'affilée ?') +
          okBtn(G.e + 1 < c.essais.length ? 'Valider · essai suivant' : G.solo ? 'Valider mon résultat' : 'Valider ce test') + links(c);
      }
    }
    return '<div class="main' + (focus ? ' single' : '') + '">' + hd + (left ? '<div class="left">' + left + '</div>' : '') + '<div class="right">' + right + '</div></div>';
  }

  // ---------- (v74, lot E3) « Je tente » : une seule épreuve, puis la fête ----------
  var MSG = { fait: 'Tu as déjà tenté cette épreuve aujourd\'hui. Reviens demain !', plein: 'Deux épreuves par jour, c\'est le maximum. Reviens demain !' };
  MC.tenteMsg = MSG;
  function cle(t) { return t.id + (isSm(t) ? ':sm' : ''); }
  function recordDe(t) { var st = app.S.stats; return st && st.bestsOk ? st.bestsOk[cle(t)] || null : null; }
  function fmt(t, v) { return ui.fmtVal(v, t.unite, t.decimales); }
  function aDeux(t) { return isSm(t) ? '' : (C.A_DEUX || {})[t.id] || ''; }
  function freshSolo(id, kid, q) {
    var dj = L.recordDuJour(me().records), chaud = q.chaud === '1', tr = {};
    if (chaud) tr[id] = [];
    return { solo: id, kid: kid, jour: L.today(), i: chaud ? 1 : 0, e: 0, phase: chaud ? 'ready' : 'choix', tr: tr, f: {}, back: false, startedAt: Date.now(),
      retour: /^go\/[a-z]+$/.test(q.retour || '') ? '#/' + q.retour : '', duJour: !!(dj && dj.test === id) };
  }
  function restoreSolo(id, kid) {
    var s = app.lsGet(KEY_SOLO);
    if (!s || s.solo !== id || s.kid !== kid || s.jour !== L.today()) return null;
    s.f = s.f || {}; s.tr = s.tr || {};
    return s;
  }
  function soloBody() {
    if (G.i === 0) return G.phase === 'warm' ? warmView() : choixView();
    if (G.i === 1) return testView();
    if (G.phase === 'fete') return feteView();
    if (G.phase === 'err' || G.phase === 'coupe') return errView();
    return '<div class="main single"><div class="loading" role="status"><i></i><i></i><i></i><span class="sr-only">Envoi</span></div><p class="next">Envoi de ton résultat…</p></div>';
  }
  function choixView() {
    var t = test(), an = (isSm(t) && ANIM_SM[t.id]) || ANIM[t.id], rec = recordDe(t), ad = aDeux(t);
    return '<div class="main"><div class="hd"><span class="kicker" style="color:var(--rc)">' + (G.duJour ? 'Record du jour' : 'Je tente mon record') + '</span><h1>' + esc(nomT(t)) + '</h1>' +
      '<span class="hud" style="color:var(--ink)">' + (rec ? 'Ton record : ' + esc(fmt(t, rec.valeur)) : 'Ton 1er résultat sera ton record') + '</span>' + ui.infoBtn(MC.fiche.key.test(t.id, isSm(t)), nomT(t), commentT(t)) + '</div>' +
      '<div class="left">' + ui.demoHtml({ anim: an, video: videoFor(an), color: COL, label: nomT(t) }) + '<p class="small" style="margin:0">' + esc(commentT(t)) + '</p></div>' +
      '<div class="right">' + matosLigne(t, true) + '<p class="lead" style="margin:0;color:var(--ink)">Pour battre ton record, il faut être chaud.</p>' +
      (ad ? '<div class="note yellow">' + icon('group', 20) + '<span>' + esc(ad) + '</span></div>' : '') +
      '<button type="button" class="btn xl gold" data-act="tnWarm">' + icon('play', 20) + ' Je m\'échauffe (4 min)</button>' +
      '<button type="button" class="btn2" data-act="tnChaud">Je suis déjà chaud ' + icon('right', 16) + '</button></div></div>';
  }
  MC.act.tnWarm = function () { snap(); G.phase = 'warm'; persist(); repaint(); window.scrollTo(0, 0); };
  MC.act.tnChaud = function () { snap(); enterTest(1); persist(); repaint(); window.scrollTo(0, 0); };
  function soloEnd() {
    var t = test(), tr = G.tr[t.id] || [], v, extra = isSm(t) ? { sm: true } : null;
    if (t.parPied) {
      var g = best(t, tr.slice(0, 2)), d = best(t, tr.slice(2, 4));
      v = g === null || d === null ? null : Math.min(g, d);
      if (v !== null) extra = { g: g, d: d };
    } else v = best(t, tr);
    if (v === null) { ui.toast(t.parPied ? 'Il faut un temps pour chaque pied.' : 'Note ton résultat.', true); enterTest(1); persist(); repaint(); return; }
    G.res = { valeur: v, extra: extra }; G.i = 2; G.t = null; H = [];
    soloSend();
    window.scrollTo(0, 0);
  }
  function soloSend() {
    var t = test(), st0 = app.S.stats, av = recordDe(t), g = G;
    g.avant = av ? av.valeur : null; g.xp0 = st0 ? st0.xp : 0; g.bc0 = st0 ? st0.bilansComplets || 0 : 0; g.phase = 'send'; g.err = ''; g.limite = false;
    persist(); repaint();
    app.kidCall('submitRecords', { bilan: 'defi', tentative: true, valeurs: [{ test: t.id, valeur: g.res.valeur, extra: g.res.extra }], avecDossier: true }).then(function (r) {
      var rec = (r.records || [])[0] || {};
      g.rec = { statut: rec.statut, exploit: rec.exploit || '' };
      if (r.me) { app.setMe(r.me); return r.me; }
      return app.loadMe(true);
    }).then(function () {
      g.xp = Math.max(0, ((app.S.stats && app.S.stats.xp) || 0) - g.xp0); g.phase = 'fete';
      g.complet = ((app.S.stats && app.S.stats.bilansComplets) || 0) > g.bc0;   // (v75) la 12e épreuve du cycle
      if (G === g) { persist(); repaint(); window.scrollTo(0, 0); }
      return chargerPlace(g);
    }).catch(function (e) {
      if (g.phase === 'fete') return;   // le classement n'a pas répondu : la fête reste
      g.phase = 'err'; g.err = (e && e.message) || 'Le serveur n\'a pas répondu.'; g.limite = !!(e && e.code === 'limite');
      if (G === g) { persist(); repaint(); }
      // (relecture) « déjà tenté » après un envoi raté : peut-être le même essai, arrivé sans réponse ; on relit le serveur
      if (g.limite) app.loadMe(true).then(function (m2) { if (G === g && retrouve(m2)) { persist(); repaint(); chargerPlace(g); } }).catch(function () { });
    });
  }
  // sa place dans sa ligue, après coup (la fête s'affiche d'abord)
  function chargerPlace(g) {
    var t = L.testDef(g.solo);
    return app.kidCall('league').then(function (lg) { app.S.league = lg; g.place = place(lg, t); if (G === g) { persist(); repaint(); } });
  }
  MC.act.tnRenvoi = function () { if (G && G.solo && G.res && G.phase !== 'send') soloSend(); };
  // sa place dans sa ligue après la tentative, et celui qu'il peut rattraper
  function place(lg, t) {
    var id = me().joueur.id, P = L.league(lg, id, t.id, 'best'), mine = null, devant = null;
    P.rows.forEach(function (r) { if (r.p.id === id) mine = r; });
    if (!mine) return null;
    for (var k = P.rows.indexOf(mine) - 1; k >= 0; k--) if (P.rows[k].rank < mine.rank) { devant = P.rows[k]; break; }
    return { rang: mine.rank, n: P.rows.length, devant: devant ? { prenom: devant.p.prenom, ecart: Math.abs(devant.best - mine.best) } : null };
  }
  function feteView() {
    var t = test(), v = G.res.valeur, r = G.rec || {}, av = G.avant, exploit = r.statut === 'attente';
    var bat = !exploit && av !== null && L.better(t, v, av), premier = !exploit && av === null;
    var conf = '', cols = ['#FF4FA3', '#38E8FF', '#3DFFB0', '#FFC23D'];
    if (bat || premier || exploit) for (var i = 0; i < 10; i++) conf += '<span class="confetti" style="left:' + (8 + i * 9) + '%;top:' + (10 + (i * 37) % 60) + '%;background:' + cols[i % 4] + ';animation-delay:' + (i * 0.07) + 's;transform:rotate(' + (i * 30) + 'deg)"></span>';
    var titre = exploit ? 'Exploit !' : bat ? 'Nouveau<br>record !' : premier ? 'Ton 1er<br>record !' : 'Bien<br>essayé !';
    var gain = bat ? (t.moinsMieux ? fmt(t, Math.abs(av - v)) + ' plus rapide' : '+' + fmt(t, v - av)) : '';
    var txt = exploit ? 'Un parent ou ton éduc doit le confirmer : ensuite, c\'est ton nouveau record.'
      : bat ? 'Ton ancien record : ' + fmt(t, av) + '. ' + gain + ' !'
      : premier ? 'C\'est ton record. Retente-le un autre jour pour le battre !'
      : 'Ton record reste ' + fmt(t, av) + '. Tu le battras une prochaine fois !';
    var pl = G.place && !exploit ? '<p class="lead" style="margin:0;text-align:center">Tu es ' + G.place.rang + (G.place.rang === 1 ? 'er' : 'e') + ' de ta ligue' +
      (G.place.devant ? '. Encore ' + esc(fmt(t, G.place.devant.ecart)) + (t.moinsMieux ? ' plus vite' : '') + ' et tu rattrapes ' + esc(G.place.devant.prenom) + ' !' : ' !') + '</p>' : '';
    var fin = G.retour ? '<button type="button" class="btn xl green" data-act="tnFin" data-h="' + esc(G.retour) + '">' + icon('play', 20) + ' Continuer ma séance</button>'
      : '<button type="button" class="btn" data-act="tnFin" data-h="#/epreuve/' + esc(t.id) + '">Voir mon épreuve</button><button type="button" class="btn2 grey" data-act="tnFin" data-h="#/semaine">Retour à l\'accueil</button>';
    return '<div class="main single tn-fete">' + (conf || bat || premier || exploit ? '<div class="burst">' + conf + '<span class="tn-tro">' + icon('trophy', 96) + '</span></div>' : '') +
      '<div class="head" style="text-align:center;align-items:center"><span class="kicker" style="color:var(--gold)">' + esc(nomT(t)) + '</span><h1 class="big md">' + titre + '</h1></div>' +
      '<div class="tn-val" data-res>' + ui.valHtml(v, t.unite, t.decimales) + '</div>' +
      '<p class="lead" style="margin:0;text-align:center">' + esc(txt) + '</p>' + pl +
      (G.complet ? '<div class="note gold" data-complet>' + icon('trophy', 20) + '<span><b>Bilan complet !</b> Les 12 épreuves de ce cycle sont faites : +' + C.XP.bilanComplet + ' XP.</span></div>' : '') +
      (G.xp ? '<div class="reward" style="align-self:center;min-width:140px"><span class="v">+' + G.xp + '</span><span class="l">XP</span></div>' : '') +
      '<div class="sec">' + fin + '</div></div>';
  }
  function errView() {
    var t = test(), lim = G.limite, msg = G.phase === 'coupe' ? 'L\'envoi a été coupé.' : G.err;
    return '<div class="main single"><div class="hd"><span class="kicker" style="color:var(--rc)">' + esc(nomT(t)) + '</span><h1>' + (lim ? 'Pas aujourd\'hui' : 'Pas encore envoyé') + '</h1>' +
      '<p class="lead">' + esc(msg) + (lim ? '' : ' Ton résultat (' + esc(fmt(t, G.res.valeur)) + ') est gardé sur cet appareil : vérifie la connexion.') + '</p></div>' +
      '<div class="right">' + (lim ? '' : '<button type="button" class="btn xl green" data-act="tnRenvoi">' + icon('send', 20) + ' Réessayer l\'envoi</button>') +
      '<button type="button" class="btn2 grey" data-act="tnFin" data-h="' + esc(G.retour || '#/epreuve/' + t.id) + '"' + (lim ? '' : ' data-garde="1"') + '>' + (lim ? 'D\'accord' : 'Plus tard') + '</button></div></div>';
  }
  // quitter : la fête vue (ou un envoi refusé) efface la tentative ; « Plus tard » garde le résultat à envoyer
  MC.act.tnFin = function (b) {
    var h = b.getAttribute('data-h') || '#/semaine';
    if (!b.hasAttribute('data-garde')) { if (G && G.rt) MC.routine.stop(G.rt); G = null; H = []; app.lsSet(KEY_SOLO, null); }
    stopTick(); ui.keepAwake(false); app.go(h, true);
  };
  function soloQuit() {
    var h = G.retour || '#/epreuve/' + G.solo;
    if (G.rt) MC.routine.stop(G.rt);
    G = null; H = []; app.lsSet(KEY_SOLO, null); stopTick(); ui.keepAwake(false); app.go(h, true);
  }
  function soloAsk() {
    var wasPaused = G.t && G.t.paused, rtWas = G.rt && G.rt.t && !G.rt.t.paused;
    if (G.t && !G.t.paused) togglePause();
    if (rtWas) MC.routine.pause(G.rt, true);
    ui.modal({
      title: 'Tu arrêtes ?',
      body: '<p class="lead">Rien n\'est envoyé : tu pourras tenter ' + esc(nomT(test()).toLowerCase()) + ' plus tard.</p>',
      actions: [{ label: 'Continuer', value: 'go', cls: 'btn gold' }, { label: 'Arrêter', value: 'stop', cls: 'btn2' }],
      cancelValue: 'go'
    }).then(function (v) {
      if (!G || !G.solo) return;
      if (v === 'stop') soloQuit();
      else {
        if (G.t && G.t.paused && !wasPaused) togglePause();
        if (G.rt && rtWas) MC.routine.pause(G.rt, false);
      }
    });
  }
  app.route('/tente/:id', function (p, q, cur) {
    var t = C.TESTS.filter(function (x) { return x.id === p.id; })[0];   // les 12 épreuves du bilan seulement
    if (!t) return app.go('#/bilans', true);
    return app.loadMe().then(function (m) {
      var kid = m.joueur.id;
      if (!G || G.solo !== p.id || G.kid !== kid) { G = restoreSolo(p.id, kid); H = []; }
      if (G && G.phase === 'fete') { G = null; app.lsSet(KEY_SOLO, null); }   // la fête est passée
      if (G) {
        // (relecture) une tentative reprise suit d'où l'on vient : depuis la séance, retour à la séance, et l'enfant est chaud
        if (/^go\/[a-z]+$/.test(q.retour || '')) G.retour = '#/' + q.retour;
        if (q.chaud === '1' && G.i === 0) { if (G.rt) { MC.routine.stop(G.rt); G.rt = null; } enterTest(1); }
        persist();
      }
      if (G && G.phase === 'coupe') {   // l'envoi a été coupé : peut-être qu'il est arrivé (on relit le serveur, pas la copie de l'appareil)
        return app.loadMe(true).then(function (m2) { if (retrouve(m2)) { persist(); chargerPlace(G).catch(function () { }); } return ecran(cur); }, function () { return ecran(cur); });
      }
      if (!G) {
        var e = L.peutTenter(m.records, p.id);
        if (e) { ui.toast(MSG[e], true); setTimeout(function () { app.go('#/epreuve/' + p.id, true); }, 0); return null; }
        G = freshSolo(p.id, kid, q); H = [];
        persist();
      }
      return ecran(cur);
    });
  }, { kid: true, busy: true });
  // l'essai est-il déjà au serveur (réponse perdue) ? alors la fête, sans redemander
  function retrouve(m) {
    var r0 = (m && m.records || []).filter(function (r) { return r.bilan === 'defi' && r.test === G.solo && r.date === G.jour && Number(r.valeur) === G.res.valeur && r.statut !== 'refuse'; })[0];
    if (!r0) return false;
    G.rec = { statut: r0.statut, exploit: r0.exploit || '' }; G.xp = G.xp0 === undefined ? 0 : Math.max(0, ((app.S.stats && app.S.stats.xp) || 0) - G.xp0); G.phase = 'fete'; G.err = ''; G.limite = false;
    return true;
  }
  function ecran(cur) {
      ui.keepAwake(true);
      cur.cleanup = function () { stopTick(); if (G && G.rt) MC.routine.detach(G.rt); setTimeout(function () { if (location.hash.indexOf('#/tente/') !== 0) ui.keepAwake(false); }, 0); };
      cur.after = function () { startTick(); };
      return view();
  }

  function finView() {
    var vals = MC.bilan.values(me()), bc = L.bilanCycle(me().records, G.n);
    var list = C.TESTS.map(function (t, k) {
      var vv = vals.filter(function (x) { return x.test === t.id; })[0], nomV = vv ? (vv.extra && vv.extra.sm ? t.sm.nom : t.nom) : nomT(t);   // (v79)
      var tx = valText(t), cs = bc.cases[t.id], dc = !tx && cs ? 'fait ce cycle : ' + fmt(t, (cs.ok || cs.att).valeur) : '';
      return '<li class="li"><span class="grow"><span class="t1">' + t.n + '. ' + esc(nomV) + '</span><span class="t2" style="color:' + (tx || dc ? 'var(--soft)' : 'var(--dim)') + '">' + esc(tx || dc || 'pas fait') + '</span></span>' +
        '<button type="button" class="btn2 sm grey" data-act="brGoto" data-i="' + (k + 1) + '">' + (tx ? 'Refaire' : 'Faire') + '</button></li>';
    }).join('');
    return '<div class="main single"><div class="hd"><span class="kicker" style="color:var(--rc)">Bilan terminé</span><h1>Bravo !</h1>' +
      '<p class="lead">' + vals.length + ' test' + (vals.length > 1 ? 's' : '') + ' noté' + (vals.length > 1 ? 's' : '') + ' sur ' + NB + '. Vérifie, puis envoie : tes résultats comptent tout de suite.</p></div>' +
      '<ul class="list">' + list + '</ul>' + MC.bilan.dateField('br_date') +
      '<button type="button" class="btn xl gold" data-act="brSend"' + (vals.length ? '' : ' disabled') + '>' + icon('send', 20) + ' Envoyer mon bilan</button>' +
      '<a class="btn2 grey" href="#/bilan">Voir le formulaire du bilan</a></div>';
  }
})();
