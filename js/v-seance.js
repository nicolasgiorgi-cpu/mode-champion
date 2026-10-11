/* =========================================================
   Mode champion · M12 — SÉANCE GUIDÉE, exo par exo
   échauffement → exercices (séries, chrono, repos) → retour au calme
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var R = null, timer = null, KEY = 'mc-run';
  var H = [];   // historique pour le bouton « Retour » (annule le dernier clic)

  // ---------- construction ----------
  function build(type, me, saved) {
    var pr = MC.prefs(), mini = me.joueur.materiel === 'mini';
    var opts = saved ? saved.opts : { mini: mini, leger: type === 'meafou' && !!pr.leger, lourdes: type === 'meafou' && !!pr.lourdes };
    var items = MC.plan(type, me.joueur.niveaux || {}, opts);
    var steps = [{ kind: 'warmup' }];
    items.forEach(function (it) { steps.push({ kind: 'exo', it: it }); });
    steps.push({ kind: 'calme' });
    var r = { type: type, date: L.today(), opts: opts, steps: steps, i: 0, set: 0, phase: 'start', vals: {}, feels: {}, cur: null, round: 0, startedAt: Date.now(), t: null };
    if (saved) {
      r.i = Math.min(saved.i, steps.length - 1); r.set = saved.set || 0; r.vals = saved.vals || {}; r.feels = saved.feels || {}; r.startedAt = saved.startedAt || Date.now();
      r.phase = saved.phase === 'feel' ? 'feel' : 'start';
    }
    enterPhase(r, r.phase === 'feel' ? 'feel' : null);
    H = [];
    return r;
  }
  function persist() {
    if (!R) { app.lsSet(KEY, null); return; }
    app.lsSet(KEY, { type: R.type, date: R.date, opts: R.opts, i: R.i, set: R.set, phase: R.phase, vals: R.vals, feels: R.feels, startedAt: R.startedAt, kid: app.S.kid && app.S.kid.joueur.id });
  }
  function restore(type) {
    var s = app.lsGet(KEY);
    if (!s || s.type !== type || s.date !== L.today() || !app.S.kid || s.kid !== app.S.kid.joueur.id) return null;
    return s;
  }

  // ---------- infos sur l'étape ----------
  function step() { return R.steps[R.i]; }
  function perFoot(d) { return d.k === 'time' && /^par pied/.test(d.txt || ''); }
  function nSets(it) {
    var d = it.dose;
    if (d.k === 'count' || d.k === 'inter') return 1;
    if (d.k === 'circuit') return d.tours;
    if (perFoot(d)) return d.s * 2;
    return d.s;
  }
  function target(it) {
    var d = it.dose;
    if (d.k === 'reps' || d.k === 'count') return d.r;
    if (d.k === 'time') return d.t;
    if (d.k === 'dist') return d.m;
    return 1;
  }
  function restFor(it) {
    if (it.dose.k === 'circuit') return it.dose.p;
    if (perFoot(it.dose)) return 10;
    return it.ex.repos || C.JOURS[R.type].repos || 45;
  }
  function color() { return C.JOURS[R.type].color; }

  // phase de départ d'une série
  function enterPhase(r, forced) {
    var s = r.steps[r.i];
    r.t = null;
    if (forced) { r.phase = forced; return; }
    if (s.kind !== 'exo') { r.phase = 'list'; return; }

    var k = s.it.dose.k;
    if (k === 'time' || k === 'inter') r.phase = 'ready';
    else r.phase = 'work';
    r.cur = target(s.it);
    r.round = 0;
  }

  // ---------- chrono ----------
  function startTimer(kind, dur, onEnd) {
    R.t = { kind: kind, dur: dur, start: Date.now(), paused: false, acc: 0, onEnd: onEnd, lastSec: null };
  }
  function elapsed() {
    if (!R || !R.t) return 0;
    var t = R.t;
    return (t.acc + (t.paused ? 0 : Date.now() - t.start)) / 1000;
  }
  function remaining() { return R && R.t ? Math.max(0, R.t.dur - elapsed()) : 0; }
  function togglePause() {
    var t = R.t;
    if (!t) return;
    if (t.paused) { t.paused = false; t.start = Date.now(); }
    else { t.acc += Date.now() - t.start; t.paused = true; }
    repaint();
  }
  function startTick() {
    stopTick();
    timer = setInterval(onTick, 150);
  }
  function stopTick() { if (timer) clearInterval(timer); timer = null; }
  function onTick() {
    if (!R || !R.t) return;
    var rem = remaining(), sec = Math.ceil(rem - 0.001);
    var t = R.t;
    if (t.lastSec !== sec) {
      if (!t.paused && t.lastSec !== null) {
        if (t.kind === 'count3') { if (sec >= 1 && sec <= 3) ui.beep(660, 0.1); }
        else ui.countBeep(sec, t.dur);
      }
      t.lastSec = sec;
    }
    var el = document.querySelector('[data-tl]');
    if (el) el.textContent = t.kind === 'warm' ? fmtClock(rem) : String(sec);
    var ring = document.querySelector('[data-ring]');
    if (ring) ring.setAttribute('stroke-dashoffset', String(ringLen * (1 - rem / t.dur)));
    if (rem <= 0 && !t.ended) {
      t.ended = true;
      if (t.kind === 'count3') ui.beep(1040, 0.18, 0.22); else ui.endBeep();
      var fn = t.onEnd;
      R.t = null;
      if (fn) fn();
    }
  }
  function fmtClock(s) { s = Math.ceil(s); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  var ringLen = 2 * Math.PI * 210;

  // ---------- retour en arrière ----------
  function snap() {
    H.push(R._pre || JSON.stringify({ i: R.i, set: R.set, phase: R.phase, vals: R.vals, feels: R.feels, cur: R.cur, round: R.round }));
    R._pre = null;
    if (H.length > 40) H.shift();
  }
  MC.act.runBack = function () {
    if (!R || !H.length) return;
    var o = JSON.parse(H.pop());
    if (R.rt) { MC.routine.stop(R.rt); R.rt = null; }
    R.i = o.i; R.set = o.set; R.vals = o.vals || {}; R.feels = o.feels || {}; R.cur = o.cur; R.round = o.round || 0; R.t = null;
    var s = step(), ph = o.phase;
    if (s.kind !== 'exo') ph = 'list';
    else if (ph === 'count3' || ph === 'iwork' || ph === 'ipause' || (ph === 'work' && (s.it.dose.k === 'time'))) ph = 'ready';
    R.phase = ph;
    if (ph === 'rest') startTimer('rest', restFor(s.it), function () { startSetPhase(); repaint(); });
    persist();
    repaint();
    ui.toast('Retour en arrière');
  };

  // ---------- transitions ----------
  function nextSet() {
    var s = step(), it = s.it;
    snap();
    R.set++;
    if (R.set >= nSets(it)) { R.phase = 'feel'; R.t = null; }
    else {
      var rest = restFor(it);
      R.phase = 'rest';
      startTimer('rest', rest, function () { startSetPhase(); repaint(); });
    }
    persist();
    repaint();
  }
  function startSetPhase() {
    var it = step().it;
    R.cur = target(it);
    var k = it.dose.k;
    R.phase = (k === 'time') ? 'ready' : 'work';
    R.t = null;
  }
  function record(v) {
    if (R.phase !== 'feel') R._pre = JSON.stringify({ i: R.i, set: R.set, phase: R.phase, vals: R.vals, feels: R.feels, cur: R.cur, round: R.round });
    var key = String(R.i);
    (R.vals[key] = R.vals[key] || [])[R.set] = v;
  }
  function goNextStep() {
    if (R.i + 1 >= R.steps.length) { finish(); return; }
    snap();
    if (R.rt) { MC.routine.stop(R.rt); R.rt = null; }
    R.i++;
    R.set = 0;
    enterPhase(R);
    persist();
    repaint();
  }
  function go321(then) {
    R.phase = 'count3';
    ui.unlockAudio();
    ui.beep(660, 0.1);
    startTimer('count3', 3, then);
    repaint();
  }

  // ---------- actions ----------
  MC.act.runMinus = function () { R.cur = Math.max(0, (R.cur || 0) - 1); paintCounter(); };
  MC.act.runPlus = function () { R.cur = (R.cur || 0) + 1; paintCounter(); };
  MC.act.runSetDone = function () { record(R.cur); nextSet(); };
  MC.act.runGo = function () {
    var it = step().it, d = it.dose;
    if (d.k === 'inter') {
      go321(function () { R.round = 0; interWork(); repaint(); });
    } else {
      go321(function () { R.phase = 'work'; startTimer('work', d.t, function () { record(d.t); nextSet(); }); repaint(); });
    }
  };
  function interWork() {
    var d = step().it.dose;
    R.phase = 'iwork';
    startTimer('work', d.w, function () {
      R.round++;
      if (R.round >= d.n) { record(R.round); snap(); R.phase = 'feel'; persist(); repaint(); return; }
      R.phase = 'ipause';
      startTimer('rest', d.p, function () { interWork(); repaint(); });
      repaint();
    });
  }
  MC.act.runLetGo = function () {
    var e = Math.floor(elapsed());
    R.t = null;
    record(e);
    nextSet();
  };
  MC.act.runInterStop = function () { R.t = null; record(R.round); snap(); R.phase = 'feel'; persist(); repaint(); };
  MC.act.runPause = function () { togglePause(); };
  MC.act.runSkipRest = function () { snap(); R.t = null; startSetPhase(); repaint(); };
  MC.act.runTour = function () { record(1); nextSet(); };
  MC.act.runFeel = function (b) {
    R.feels[String(R.i)] = b.getAttribute('data-v');
    goNextStep();
  };
  MC.act.runNextStep = function () { R.t = null; goNextStep(); };

  MC.act.runMute = function () { ui.setMuted(!ui.isMuted()); if (!ui.isMuted()) { ui.unlockAudio(); ui.beep(880, 0.08); } repaint(); };
  MC.act.runQuit = function () {
    var anyDone = Object.keys(R.vals).length > 0;
    var actions = [{ label: 'Continuer la séance', value: 'continue', cls: 'btn green' }];
    if (anyDone) actions.push({ label: 'Enregistrer ce que j\'ai fait', value: 'save', cls: 'btn2' });
    actions.push({ label: 'Quitter sans enregistrer', value: 'quit', cls: 'btn2 grey' });
    var wasPaused = R.t && R.t.paused, rtWas = R.rt && R.rt.t && !R.rt.t.paused;
    if (R.t && !R.t.paused) togglePause();
    if (rtWas) MC.routine.pause(R.rt, true);
    ui.modal({ title: 'Tu arrêtes ?', body: '<p class="lead">' + (anyDone ? 'Tu peux enregistrer ce que tu as déjà fait.' : 'Rien n\'est encore enregistré pour cette séance.') + '</p>', actions: actions, cancelValue: 'continue' }).then(function (v) {
      if (v === 'save') finish(true);
      else if (v === 'quit') { if (R.rt) MC.routine.stop(R.rt); R = null; H = []; persist(); ui.keepAwake(false); app.go('#/semaine'); }
      else {
        if (R && R.t && R.t.paused && !wasPaused) togglePause();
        if (R && R.rt && rtWas) MC.routine.pause(R.rt, false);
      }
    });
  };

  // ---------- fin ----------
  function errText(e) {
    if (e && typeof e.message === 'string' && e.message) return e.message;
    if (typeof e === 'string' && e) return e;
    return 'Le serveur n\'a pas répondu.';
  }
  function finish(partial) {
    if (!R || R.sending) return;
    stopTick();
    if (R.rt) { MC.routine.stop(R.rt); R.rt = null; }
    var exos = [], recap = [], feels = [];
    R.steps.forEach(function (s, i) {
      if (s.kind !== 'exo') return;
      var v = (R.vals[String(i)] || []).filter(function (x) { return x !== undefined && x !== null; });
      var f = R.feels[String(i)] || '';
      if (f) feels.push(f);
      exos.push({ id: s.it.id, niveau: s.it.niveau, dose: ui.doseLabel(s.it.dose), series: v, ressenti: f, fait: v.length > 0, mini: s.it.mini });
      var u = s.it.dose.k === 'time' ? ' s' : (s.it.dose.k === 'dist' ? ' m' : '');
      var res = s.it.dose.k === 'inter' ? (v[0] || 0) + ' / ' + s.it.dose.n : s.it.dose.k === 'circuit' ? v.length + ' / ' + s.it.dose.tours + ' tours' : (v.length ? v.join(' · ') + u : '—');
      recap.push({ nom: s.it.nom, res: res, ressenti: f, fait: v.length > 0 });
    });
    var count = { facile: 0, bien: 0, dur: 0 };
    feels.forEach(function (f) { count[f]++; });
    var ress = count.dur > count.facile && count.dur >= count.bien ? 'dur' : (count.facile > count.bien && count.facile >= count.dur ? 'facile' : 'bien');
    var details = { exos: exos, options: R.opts, duree: Math.round((Date.now() - R.startedAt) / 1000), partiel: !!partial };
    R.sending = true; R.sendErr = '';
    R.payload = { type: R.type, date: R.date, mode: 'guidee', ressenti: feels.length ? ress : '', details: details };
    R.recap = recap;
    send();
  }
  function send() {
    var main = document.querySelector('.run .main');
    if (main) main.innerHTML = '<div class="loading" role="status"><i></i><i></i><i></i><span class="sr-only">Enregistrement</span></div><p class="next">Enregistrement de ta séance…</p>';
    var r = R;
    MC.saveSessions([r.payload], r.recap).then(function () {
      if (R === r) { R = null; H = []; persist(); }
      ui.keepAwake(false);
    }).catch(function (e) {
      try { console.error(e); } catch (x) { }
      r.sending = false;
      r.sendErr = errText(e);
      if (R === r) { persist(); repaint(); }
    });
  }
  MC.act.runResend = function () { if (R && R.payload && !R.sending) { R.sending = true; R.sendErr = ''; send(); } };

  // ---------- affichage ----------
  app.route('/go/:type', function (p, q, cur) {
    var j = C.JOURS[p.type];
    if (!j || !j.maison) return app.go('#/semaine', true);
    return app.loadMe().then(function (me) {
      if (!R || R.type !== p.type) R = build(p.type, me, restore(p.type));
      ui.keepAwake(true);
      cur.cleanup = function () { stopTick(); if (R && R.rt) MC.routine.detach(R.rt); setTimeout(function () { if (location.hash.indexOf('#/go/') !== 0) ui.keepAwake(false); }, 0); };
      cur.after = function () { startTick(); };
      return view();
    });
  }, { kid: true, bg: '#12352E' });

  function repaint() {
    if (!R) return;
    var host = document.getElementById('app');
    if (!host || !document.querySelector('.run')) return;
    host.innerHTML = view();
    ui.mountAnims(host);
  }
  function paintCounter() {
    var o = document.querySelector('[data-counter]');
    if (!o) return repaint();
    var tg = target(step().it), ok = R.cur >= tg;
    o.textContent = R.cur;
    var box = o.closest('.counter');
    box.style.setProperty('--nc', ok ? 'var(--green)' : 'var(--yellow)');
    box.style.setProperty('--ng', ok ? 'rgba(61,255,176,.5)' : 'rgba(255,210,61,.45)');
    var cap = box.querySelector('.cap');
    if (cap) cap.textContent = capText(tg);
  }
  function capText(tg) { return 'Objectif ' + tg + ' · ' + (R.cur > tg ? 'Bonus !' : R.cur === tg ? 'Pile' : 'Note ce que tu as fait'); }

  function topBar() {
    var exoSteps = R.steps.filter(function (s) { return s.kind === 'exo'; }).length;
    var segs = R.steps.map(function (s, i) {
      var w = i < R.i ? 100 : (i === R.i && s.kind === 'exo' ? Math.round(R.set / nSets(s.it) * 100) : 0);
      return '<i><b style="width:' + w + '%"></b></i>';
    }).join('');
    var s = step(), label = s.kind === 'warmup' ? 'ÉCHAUFFEMENT' : s.kind === 'calme' ? 'RETOUR AU CALME' : 'EXO ' + R.i + '/' + exoSteps;
    return '<div class="top"><button type="button" class="ibtn" data-act="runQuit" aria-label="Quitter la séance">' + icon('x', 20) + '</button>' +
      (H.length ? '<button type="button" class="ibtn backbtn" data-act="runBack" aria-label="Revenir en arrière (annuler le dernier clic)">' + icon('undo', 18) + '<span>Retour</span></button>' : '') +
      '<div class="prog" style="--n:' + R.steps.length + '">' + segs + '</div><span class="hud" style="color:var(--rc)">' + label + '</span>' +
      '<button type="button" class="ibtn" data-act="runMute" aria-label="' + (ui.isMuted() ? 'Activer le son' : 'Couper le son') + '">' + icon(ui.isMuted() ? 'mute' : 'sound', 20) + '</button></div>';
  }
  function ringHtml(value, label, mode, frac) {
    return '<div class="ring ' + (mode || '') + '"><svg viewBox="0 0 500 500" aria-hidden="true"><circle cx="250" cy="250" r="210" fill="none" stroke="#1E2740" stroke-width="26"/>' +
      '<circle data-ring cx="250" cy="250" r="210" fill="none" stroke-width="26" stroke-dasharray="' + ringLen + '" stroke-dashoffset="' + (ringLen * (1 - (frac === undefined ? 1 : frac))) + '" style="stroke:' + (mode === 'rest' ? '#38E8FF' : 'var(--rc)') + ';filter:drop-shadow(0 0 10px ' + (mode === 'rest' ? '#38E8FF' : 'var(--rc)') + ')"/></svg>' +
      '<div class="in" role="timer"><span class="sec" data-tl>' + value + '</span><span class="lab">' + label + '</span></div></div>';
  }
  function setDots(it) {
    var n = nSets(it), out = '<span class="setdots" aria-hidden="true">';
    for (var i = 0; i < n && n <= 10; i++) out += '<i class="' + (i < R.set ? 'done' : i === R.set ? 'cur' : '') + '"></i>';
    return out + '</span>';
  }
  function setLabel(it) {
    var d = it.dose, n = nSets(it);
    if (d.k === 'circuit') return 'TOUR ' + Math.min(R.set + 1, n) + ' / ' + n;
    if (d.k === 'inter') return d.n + ' INTERVALLES';
    if (d.k === 'count') return d.r + ' ' + (d.unite || '').toUpperCase();
    if (perFoot(d)) return (R.set % 2 === 0 ? 'PIED GAUCHE' : 'PIED DROIT') + ' · ' + (Math.floor(R.set / 2) + 1) + ' / ' + d.s;
    return 'SÉRIE ' + Math.min(R.set + 1, n) + ' / ' + n;
  }
  function nextText(it) {
    if (R.set + 1 >= nSets(it)) {
      var nx = R.steps[R.i + 1];
      return 'Ensuite : ' + (nx.kind === 'calme' ? 'retour au calme' : nx.it.nom.toLowerCase());
    }
    return 'Ensuite : repos ' + restFor(it) + ' s, puis ' + (it.dose.k === 'circuit' ? 'tour ' : perFoot(it.dose) ? 'l\'autre pied' : 'série ') + (perFoot(it.dose) ? '' : (R.set + 2));
  }

  function view() {
    var s = step(), col = color();
    var html = '<main class="run" style="--rc:' + col + '">' + topBar();
    if (R.sendErr) html += sendErrView();
    else if (s.kind === 'warmup' || s.kind === 'calme') html += routineStep(s);
    else html += exoStep(s.it);
    return html + '</main>';
  }

  function sendErrView() {
    return '<div class="main single"><div class="hd"><span class="kicker" style="color:var(--rc)">Séance terminée</span><h1>Pas encore envoyée</h1>' +
      '<p class="lead">L\'envoi n\'a pas marché (' + esc(R.sendErr) + '). Ta séance est gardée sur cet appareil : vérifie la connexion internet et réessaie.</p></div>' +
      '<div class="right"><button type="button" class="btn xl green glow" data-act="runResend">' + icon('send', 22) + ' Réessayer l\'envoi</button></div></div>';
  }
  function routineStep(s) {
    if (!R.rt || R.rt.kind !== s.kind) R.rt = MC.routine.create(s.kind === 'calme' ? 'calme' : 'warmup', app.S.me, R.opts.mini, repaint);
    var last = s.kind === 'calme', nx = R.steps[R.i + 1];
    return MC.routine.html(R.rt, {
      kicker: last ? C.CALME.nom : C.REVEIL.nom, color: color(),
      doneAct: 'runNextStep', doneLabel: last ? 'Terminer la séance' : 'Échauffement fait',
      after: last ? '' : 'Ensuite : ' + (nx && nx.it ? nx.it.nom.toLowerCase() : 'les exercices')
    });
  }

  function exoStep(it) {
    var col = color(), d = it.dose;
    var left = ui.demoHtml({ anim: it.anim, video: it.video, color: col, label: it.nom, vite: !!(it.ex && it.ex.vite && !it.mini) || (it.mini && it.id === 'montees_marche') });
    if (d.k === 'circuit') {
      left = '<ul class="circuitsteps">' + it.ex.tour.map(function (t) { return '<li><span class="mini" data-anim="' + esc(t.anim) + '" data-color="' + col + '"></span><span>' + esc(t.nom) + (t.detail ? ' <span class="small">(' + esc(t.detail) + ')</span>' : '') + '</span></li>'; }).join('') + '</ul>';
    }
    var vite = it.ex && it.ex.vite ? '<span class="vitetag">' + icon('bolt', 14) + ' ' + esc(it.ex.vite) + '</span>' : '';
    var hd = '<div class="hd"><h1>' + esc(it.nom) + '</h1><div class="row" style="flex-wrap:wrap">' + ui.lvl(it.niveau) + '<span class="hud">' + setLabel(it) + '</span>' + setDots(it) + '</div>' +
      (ui.doseInfo(d) ? '<span class="small">' + esc(ui.doseInfo(d)) + '</span>' : '') + vite + ui.infoBtn(MC.fiche.key.exo(it.id, it.mini), it.nom) + '</div>';
    var head = '';
    var right = '';
    var ph = R.phase;
    if (ph === 'feel') {
      var v = (R.vals[String(R.i)] || []).filter(function (x) { return x !== undefined; });
      right = '<div class="sec" style="gap:14px"><p class="lead">Bravo ! ' + (v.length ? 'Tu as fait : <b style="color:var(--ink)">' + esc(d.k === 'inter' ? v[0] + ' intervalles sur ' + d.n : d.k === 'circuit' ? v.length + ' tours' : v.join(' · ') + (d.k === 'time' ? ' s' : '')) + '</b>.' : '') + '</p>' +
        '<span class="hud" style="color:var(--muted)">C\'était comment ?</span><div class="feelpick">' +
        [['facile', 'Facile', 1], ['bien', 'Pile bien', 2], ['dur', 'Dur', 3]].map(function (f) {
          var bars = ''; for (var i = 1; i <= 3; i++) bars += '<i class="' + (i <= f[2] ? 'on' : '') + '"></i>';
          return '<button type="button" data-act="runFeel" data-v="' + f[0] + '"><span class="feel">' + bars + '</span>' + f[1] + '</button>';
        }).join('') + '</div><p class="small" style="margin:0">Facile 2 séances de suite = proposition de monter d\'un niveau.</p></div>';
      return '<div class="main"><div class="hd"><h1>' + esc(it.nom) + '</h1></div><div class="left">' + left + '</div><div class="right">' + right + '</div></div>';
    }
    if (ph === 'rest') {
      var rr = remaining(), tot = R.t ? R.t.dur : restFor(it);
      right = head + ringHtml(Math.ceil(rr), 'Repos · respire', 'rest', rr / tot) +
        '<div class="grid2"><button type="button" class="btn2 grey" data-act="runPause">' + icon(R.t && R.t.paused ? 'play' : 'pause', 16) + (R.t && R.t.paused ? ' Reprendre' : ' Pause') + '</button><button type="button" class="btn2" data-act="runSkipRest">Passer ' + icon('right', 16) + '</button></div>' +
        '<p class="next">Prochaine : ' + setLabel(it).toLowerCase() + '</p>';
    } else if (ph === 'count3') {
      right = head + ringHtml(Math.ceil(remaining()), 'Prêt ?', 'work', remaining() / 3);
    } else if (d.k === 'time') {
      if (ph === 'ready') {
        right = head + ringHtml(d.t, 'secondes', 'work', 1) +
          '<button type="button" class="btn xl green glow" data-act="runGo">' + icon('play', 22) + ' GO !</button><p class="next">' + esc(nextText(it)) + '</p>';
      } else {
        var r2 = remaining();
        right = head + ringHtml(Math.ceil(r2), 'secondes sur ' + d.t, 'work', r2 / d.t) +
          '<div class="grid2"><button type="button" class="btn2 grey" data-act="runPause">' + icon(R.t && R.t.paused ? 'play' : 'pause', 16) + (R.t && R.t.paused ? ' Reprendre' : ' Pause') + '</button>' +
          '<button type="button" class="btn2 yellow" data-act="runLetGo">J\'ai lâché avant</button></div><p class="next">' + esc(nextText(it)) + '</p>';
      }
    } else if (d.k === 'inter') {
      if (ph === 'ready') {
        right = head + '<p class="lead">' + d.n + ' fois : <b style="color:var(--ink)">' + d.w + ' s de corde</b> puis <b style="color:var(--ink)">' + d.p + ' s de marche</b>. Le site bipe à chaque changement.</p>' +
          ringHtml(d.w, 'secondes de corde', 'work', 1) + '<button type="button" class="btn xl green glow" data-act="runGo">' + icon('play', 22) + ' GO !</button>';
      } else {
        var work = ph === 'iwork', r3 = remaining(), tot3 = work ? d.w : d.p;
        right = head + '<div class="between"><span class="hud" style="font-size:16px;color:' + (work ? col : 'var(--cyan)') + '">' + (work ? 'CORDE !' : 'MARCHE') + '</span><span class="hud">Intervalle ' + Math.min(R.round + 1, d.n) + ' / ' + d.n + '</span></div>' +
          ringHtml(Math.ceil(r3), work ? 'corde' : 'marche sur place', work ? 'work' : 'rest', r3 / tot3) +
          '<div class="grid2"><button type="button" class="btn2 grey" data-act="runPause">' + icon(R.t && R.t.paused ? 'play' : 'pause', 16) + (R.t && R.t.paused ? ' Reprendre' : ' Pause') + '</button><button type="button" class="btn2 yellow" data-act="runInterStop">J\'arrête là</button></div>';
      }
    } else if (d.k === 'circuit') {
      right = head + '<p class="lead">Enchaîne les 5 ateliers sans t\'arrêter, puis touche « Tour fini ».</p>' +
        '<button type="button" class="btn xl green glow" data-act="runTour">' + icon('check', 22) + ' Tour fini</button><p class="next">' + esc(nextText(it)) + '</p>';
    } else if (d.k === 'dist') {
      right = head + '<div class="counter"><output style="font-size:clamp(70px,20vw,140px)">' + d.m + ' m</output><span class="cap">' + esc(d.txt || 'à faire') + '</span></div>' +
        '<button type="button" class="btn xl green glow" data-act="runSetDone">' + icon('check', 22) + ' C\'est fait</button><p class="next">' + esc(nextText(it)) + '</p>';
    } else {
      var tg = target(it), ok = R.cur >= tg;
      right = head + '<div class="counter" style="--nc:' + (ok ? 'var(--green)' : 'var(--yellow)') + ';--ng:' + (ok ? 'rgba(61,255,176,.5)' : 'rgba(255,210,61,.45)') + '"><span class="hud" style="color:var(--dim)">Combien en as-tu fait' + (d.cote ? ' (par ' + esc(d.cote) + ')' : '') + ' ?</span>' +
        '<div class="row"><button type="button" class="pm" data-act="runMinus" aria-label="Une de moins">' + icon('minus', 34) + '</button><output data-counter aria-live="polite">' + R.cur + '</output>' +
        '<button type="button" class="pm" data-act="runPlus" aria-label="Une de plus">' + icon('plus', 34) + '</button></div><span class="cap">' + capText(tg) + '</span></div>' +
        '<button type="button" class="btn xl green glow" data-act="runSetDone">' + icon('check', 22) + (d.k === 'count' ? ' C\'est fait' : ' Série faite') + '</button><p class="next">' + esc(nextText(it)) + '</p>';
    }
    return '<div class="main">' + hd + '<div class="left">' + left + '</div><div class="right">' + right + '</div></div>';
  }
})();
