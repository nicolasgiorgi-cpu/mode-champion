/* =========================================================
   Mode champion · M12 — BILAN GUIDÉ, test par test
   échauffement → 12 tests (démo, chrono, comptage, saisie) → récap → envoi
   Les résultats vont dans le même état que le formulaire du bilan (MC.bilan, v-profil.js).
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var G = null, timer = null, KEY = 'mc-bilrun', REPOS = 120, COL = '#FFC23D';
  var NB = C.TESTS.length;
  var RING = 2 * Math.PI * 210;

  // animation de chaque test (et de sa version « mini matériel »)
  var ANIM = { flamant: 'flamant', saut: 'saut_longueur', navette: 'departs', susp: 'suspension', tract: 'tractions', pompes: 'pompes', planche: 'planche', squats: 'squat', chaise: 'chaise_mur', corde: 'corde', corde1: 'corde', burpees: 'burpees' };
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
  function nomT(t) { return isSm(t) ? t.sm.nom : t.nom; }
  function commentT(t) { return isSm(t) ? t.sm.comment : t.comment; }
  function videoFor(a) { for (var k in C.EXOS) { var e = C.EXOS[k]; if (e.anim === a && e.video) return e.video; } return ''; }
  function test() { return C.TESTS[G.i - 1]; }
  function num(s) { var x = parseFloat(String(s === undefined || s === null ? '' : s).replace(',', '.')); return isFinite(x) ? x : null; }

  // ---------- état (gardé sur l'appareil : on peut fermer et reprendre) ----------
  function fresh(B, kid) { return { n: B.n, kid: kid, i: 0, e: 0, phase: 'warm', tr: {}, f: {}, back: false, startedAt: Date.now() }; }
  function persist() {
    if (!G) { app.lsSet(KEY, null); return; }
    var c = {};
    for (var k in G) if (k !== 't') c[k] = G[k];
    if (c.phase === 'count3' || c.phase === 'run' || c.phase === 'rest') { c.phase = 'ready'; c.f = {}; }
    app.lsSet(KEY, c);
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
      return s.i > NB ? 'récap' : 'test ' + s.i + '/' + NB;
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
        if (!t.paused && sec <= 3 && sec >= 1 && t.last !== null && t.kind !== 'warm') ui.beep(t.kind === 'count3' ? 660 : 720, 0.1);
        t.last = sec;
      }
      if (tl) tl.textContent = t.kind === 'count3' ? String(sec) : clock(rem);
      if (ring) ring.setAttribute('stroke-dashoffset', String(RING * (1 - rem / t.dur)));
      if (rem <= 0 && !t.ended) {
        t.ended = true;
        ui.beep(t.kind === 'count3' ? 1040 : 990, t.kind === 'count3' ? 0.25 : 0.5, 0.22);
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
    if (v.extra && v.extra.elastique) s += ' · ' + v.extra.nbElastique + ' avec l\'élastique ' + v.extra.elastique;
    return s;
  }

  // ---------- transitions ----------
  function enterTest(i) {
    G.i = i; G.e = 0; G.f = {}; G.phase = 'ready'; G.t = null;
    if (i >= 1 && i <= NB) G.tr[C.TESTS[i - 1].id] = [];
  }
  function toFin() { G.t = null; G.i = NB + 1; G.phase = 'fin'; G.back = false; G.f = {}; persist(); repaint(); window.scrollTo(0, 0); }
  function nextEssai() { G.e++; G.f = {}; G.phase = 'ready'; G.t = null; persist(); repaint(); }
  function endTest() {
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
    if (G.back || G.i >= NB) { toFin(); return; }
    enterTest(G.i + 1);
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
    persist();
  }

  // ---------- actions ----------
  MC.act.brMute = function () { ui.setMuted(!ui.isMuted()); if (!ui.isMuted()) { ui.unlockAudio(); ui.beep(880, 0.08); } repaint(); };
  MC.act.brPause = function () { togglePause(); };
  MC.act.brWarm = function () {
    if (G.t) { togglePause(); return; }
    ui.unlockAudio();
    startT('warm', C.REVEIL.duree, function () { repaint(); });
    repaint();
  };
  MC.act.brWarmDone = function () { enterTest(1); persist(); repaint(); window.scrollTo(0, 0); };
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
    G.t = null;
    if (kind === 'course') G.f = { v: tenths(e) };
    else { var s = Math.floor(e); G.f = t.mmss ? { m: String(Math.floor(s / 60)), s: String(s % 60) } : { v: String(s) }; }
    ui.beep(880, 0.15);
    G.phase = 'res'; persist(); repaint();
  };
  MC.act.brStopMin = function () { G.t = null; G.phase = 'res'; persist(); repaint(); };
  MC.act.brPlus = function () { setCount((parseInt(G.f.v, 10) || 0) + 1); };
  MC.act.brMinus = function () { setCount((parseInt(G.f.v, 10) || 0) - 1); };
  MC.act.brRedo = function () { G.t = null; G.f = {}; G.phase = 'ready'; persist(); repaint(); };
  MC.act.brOk = function () {
    var t = test(), c = cfg(t);
    if (G.phase === 'elas') {
      var b = MC.bilan.ensure(me()), nb = num(G.f.v);
      if (!G.f.el) return ui.toast('Choisis l\'élastique.', true);
      if (nb === null) return ui.toast('Note combien avec l\'élastique.', true);
      b.v.tract_el = G.f.el; b.v.tract_nb = String(Math.round(nb));
      MC.bilan.save();
      afterTest();
      return;
    }
    var v = readVal(t, c);
    if (v === null) return ui.toast('Note le résultat, ou passe ce test.', true);
    if (c.mode === 'dist') G.tr[t.id] = v;
    else (G.tr[t.id] = G.tr[t.id] || [])[G.e] = v;
    if (c.mode !== 'dist' && G.e + 1 < c.essais.length) { nextEssai(); return; }
    endTest();
  };
  MC.act.brSkipEssai = function () {
    var t = test(), c = cfg(t);
    (G.tr[t.id] = G.tr[t.id] || [])[G.e] = null;
    if (G.e + 1 < c.essais.length) nextEssai(); else endTest();
  };
  MC.act.brSkip = function () {
    G.t = null;
    if (G.back || G.i >= NB) { toFin(); return; }
    enterTest(G.i + 1); persist(); repaint(); window.scrollTo(0, 0);
  };
  MC.act.brRestSkip = function () { G.t = null; G.phase = 'ready'; persist(); repaint(); };
  MC.act.brEl = function (btn) { G.f.el = btn.getAttribute('data-v'); persist(); repaint(); };
  MC.act.brGoto = function (btn) { enterTest(Number(btn.getAttribute('data-i'))); G.back = true; persist(); repaint(); window.scrollTo(0, 0); };
  MC.act.brSend = function (btn) {
    MC.bilan.submit(btn).then(function (ok) { if (ok) { G = null; persist(); } });
  };
  MC.act.brQuit = function () {
    var wasPaused = G.t && G.t.paused;
    if (G.t && !G.t.paused) togglePause();
    var any = MC.bilan.values(me()).length > 0;
    ui.modal({
      title: 'Tu fais une pause ?',
      body: '<p class="lead">' + (any ? 'Tes résultats déjà notés sont gardés sur cet appareil. Tu reprendras le bilan là où tu en es (ou tu les envoies depuis la page du bilan).' : 'Tu pourras reprendre le bilan plus tard.') + '</p>',
      actions: [{ label: 'Continuer le bilan', value: 'go', cls: 'btn gold' }, { label: 'Pause, je reviendrai', value: 'pause', cls: 'btn2' }],
      cancelValue: 'go'
    }).then(function (v) {
      if (v === 'pause') { G.t = null; persist(); ui.keepAwake(false); app.go('#/bilan'); }
      else if (G && G.t && G.t.paused && !wasPaused) togglePause();
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
    persist();
  });

  // ---------- écran ----------
  app.route('/bilan/go', function (p, q, cur) {
    return app.loadMe().then(function (m) {
      var B = L.currentBilan(), kid = m.joueur.id;
      MC.bilan.ensure(m);
      if (!G || G.n !== B.n || G.kid !== kid) G = restore(B, kid) || fresh(B, kid);
      ui.keepAwake(true);
      cur.cleanup = function () { stopTick(); setTimeout(function () { if (location.hash.indexOf('#/bilan/go') !== 0) ui.keepAwake(false); }, 0); };
      cur.after = function () { startTick(); };
      return view();
    });
  }, { kid: true, bg: '#3A2C10' });

  function repaint() {
    if (!G) return;
    var host = document.getElementById('app');
    if (!host || !document.querySelector('.run.bilrun')) return;
    host.innerHTML = view();
    ui.mountAnims(host);
  }
  function view() {
    var html = '<main class="run bilrun" style="--rc:' + COL + '">' + topBar();
    if (G.i === 0) html += warmView();
    else if (G.i > NB) html += finView();
    else html += testView();
    return html + '</main>';
  }
  function topBar() {
    var segs = '';
    for (var i = 0; i <= NB + 1; i++) segs += '<i><b style="width:' + (i < G.i ? 100 : 0) + '%"></b></i>';
    var label = G.i === 0 ? 'ÉCHAUFFEMENT' : G.i > NB ? 'RÉCAP' : 'TEST ' + G.i + '/' + NB;
    return '<div class="top"><button type="button" class="ibtn" data-act="brQuit" aria-label="Faire une pause">' + icon('x', 20) + '</button>' +
      '<div class="prog" style="--n:' + (NB + 2) + '">' + segs + '</div><span class="hud" style="color:var(--rc)">' + label + '</span>' +
      '<button type="button" class="ibtn" data-act="brMute" aria-label="' + (ui.isMuted() ? 'Activer le son' : 'Couper le son') + '">' + icon(ui.isMuted() ? 'mute' : 'sound', 20) + '</button></div>';
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
      '<button type="button" class="lnk" data-act="brSkip">Passer ce test</button></div>';
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
    var Rt = C.REVEIL, mini = me().joueur.materiel === 'mini', B = L.currentBilan();
    var items = Rt.items.map(function (it) {
      return '<li><span class="ds">' + esc(it.dose) + '</span><span><b>' + esc(it.nom) + '</b><small>' + esc(it.mini && mini ? it.mini : it.detail) + '</small></span></li>';
    }).join('');
    var running = !!(G.t && G.t.kind === 'warm'), rem = running ? remaining() : Rt.duree;
    return '<div class="main routine"><div class="left"><span class="kicker" style="color:var(--rc)">' + esc(B.nom) + ' · bilan guidé</span><h1>' + esc(Rt.nom) + '</h1><p class="lead">' + esc(Rt.intro) + '</p><ul class="wulist">' + items + '</ul></div>' +
      '<div class="right"><div class="note">' + icon('group', 22) + '<span>Ensuite les 12 tests, toujours dans le même ordre, avec 2 min de repos entre deux tests. Un adulte reste à côté pour regarder et compter.</span></div>' +
      '<div class="minitimer"><span class="hud" style="color:var(--muted)">Minuteur</span><span class="t" data-tl>' + clock(rem) + '</span>' +
      '<button type="button" class="btn2 sm" data-act="brWarm">' + icon(running && !G.t.paused ? 'pause' : 'play', 16) + (running ? (G.t.paused ? ' Reprendre' : ' Pause') : ' Lancer') + '</button></div>' +
      '<button type="button" class="btn xl green glow" data-act="brWarmDone">' + icon('check', 22) + ' Échauffement fait</button>' +
      '<p class="next">Ensuite : test 1, ' + esc(nomT(C.TESTS[0]).toLowerCase()) + '</p></div></div>';
  }

  function restView(t) {
    var prev = C.TESTS[G.i - 2], val = prev ? valText(prev) : '';
    var rem = G.t ? remaining() : REPOS;
    return '<div class="main single"><div class="hd"><span class="kicker" style="color:var(--rc)">Repos</span><h1>Récupère</h1><p class="lead" style="margin:0">Respire, bois un peu, marche.</p>' +
      (val ? '<div class="note gold">' + icon('check', 20) + '<span>' + esc(nomT(prev)) + ' : <b>' + esc(val) + '</b></span></div>' : '') + '</div>' +
      '<div class="right">' + ringHtml(clock(rem), 'Repos', 'rest', rem / REPOS, 'clock') +
      '<div class="grid2">' + pauseBtn() + '<button type="button" class="btn2" data-act="brRestSkip">Je suis prêt ' + icon('right', 16) + '</button></div>' +
      '<p class="next">Prochain test : ' + t.n + '. ' + esc(nomT(t)) + '</p></div></div>';
  }

  function testView() {
    var t = test(), c = cfg(t), ph = G.phase;
    if (ph === 'rest') return restView(t);
    var an = (isSm(t) && ANIM_SM[t.id]) || ANIM[t.id];
    var focus = ph === 'count3' || ph === 'run';
    var essai = ph !== 'elas' && c.essais[G.e] ? c.essais[G.e] : '';
    var hd = '<div class="hd"><span class="kicker" style="color:var(--rc)">Test ' + t.n + ' / ' + NB + (isSm(t) ? ' · version SM' : '') + '</span><h1>' + esc(nomT(t)) + '</h1>' +
      (essai ? '<span class="hud" style="color:var(--ink)">' + esc(essai) + '</span>' : '') + '</div>';
    var left = focus ? '' : ui.demoHtml({ anim: an, video: videoFor(an), color: COL, label: nomT(t) }) + '<p class="small" style="margin:0">' + esc(commentT(t)) + '</p>';
    var right = '', stopQ = (isSm(t) && STOP_QUAND_SM[t.id]) || STOP_QUAND[t.id] || '';

    if (ph === 'elas') {
      right = '<p class="lead" style="color:var(--ink)">Moins de 5 tractions : avec quel élastique en fais-tu 5 ou plus ?</p><div class="grid3">' + ['fin', 'moyen', 'fort'].map(function (e) {
        return '<button type="button" class="opt' + (G.f.el === e ? ' on' : '') + '" data-act="brEl" data-v="' + e + '">' + e + '</button>';
      }).join('') + '</div>' + (G.f.el ? counterHtml('Combien avec l\'élastique ' + G.f.el + ' ?') + okBtn('Valider') : '');
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
      right += okBtn(G.e + 1 < c.essais.length ? 'Valider · essai suivant' : 'Valider ce test') + links(c, true);
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
          okBtn('Valider ce test') + links(c);
      } else {
        right = counterHtml(t.id === 'corde' ? 'Sauts jusqu\'à la 1re faute' : 'Combien d\'affilée ?') +
          okBtn(G.e + 1 < c.essais.length ? 'Valider · essai suivant' : 'Valider ce test') + links(c);
      }
    }
    return '<div class="main' + (focus ? ' single' : '') + '">' + hd + (left ? '<div class="left">' + left + '</div>' : '') + '<div class="right">' + right + '</div></div>';
  }

  function finView() {
    var vals = MC.bilan.values(me());
    var list = C.TESTS.map(function (t, k) {
      var tx = valText(t);
      return '<li class="li"><span class="grow"><span class="t1">' + t.n + '. ' + esc(nomT(t)) + '</span><span class="t2" style="color:' + (tx ? 'var(--soft)' : 'var(--dim)') + '">' + esc(tx || 'pas fait') + '</span></span>' +
        '<button type="button" class="btn2 sm grey" data-act="brGoto" data-i="' + (k + 1) + '">' + (tx ? 'Refaire' : 'Faire') + '</button></li>';
    }).join('');
    return '<div class="main single"><div class="hd"><span class="kicker" style="color:var(--rc)">Bilan terminé</span><h1>Bravo !</h1>' +
      '<p class="lead">' + vals.length + ' test' + (vals.length > 1 ? 's' : '') + ' noté' + (vals.length > 1 ? 's' : '') + ' sur ' + NB + '. Vérifie, puis envoie : un parent ou ton éduc confirmera tes résultats.</p></div>' +
      '<ul class="list">' + list + '</ul>' +
      '<button type="button" class="btn xl gold" data-act="brSend"' + (vals.length ? '' : ' disabled') + '>' + icon('send', 20) + ' Envoyer mon bilan</button>' +
      '<a class="btn2 grey" href="#/bilan">Voir le formulaire du bilan</a></div>';
  }
})();
