/* =========================================================
   Mode champion · M12 — ÉCHAUFFEMENT ET RETOUR AU CALME GUIDÉS
   Utilisé par la séance guidée (v-seance.js) et le bilan guidé (v-bilan.js).
   GO → 3, 2, 1 → chaque étape s'affiche en grand avec son chrono, puis la suivante.
   Les bips : 10 s avant la fin, puis 5, 4, 3, 2, 1 et le son de fin.
   ========================================================= */
window.MC = window.MC || {};

MC.routine = (function () {
  var ui = MC.ui, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var RING = 2 * Math.PI * 210;
  var cur = null, timer = null, seq = 0;

  // ---------- étapes ----------
  function build(kind, me, mini) {
    var Rt = kind === 'calme' ? C.CALME : C.REVEIL, niv = (me && me.joueur && me.joueur.niveaux) || {}, out = [];
    Rt.items.forEach(function (it) {
      var b = { id: it.id, nom: it.nom, dose: it.dose, dur: it.dur, detail: it.detail, anim: it.anim, video: it.video, fiche: it.id };
      if (mini && it.mini) {
        for (var k in it.mini) b[k] = it.mini[k];
        if (MC.fiche && MC.fiche.get(it.mini.anim)) b.fiche = it.mini.anim;
      }
      if (it.exo === 'flamant') {
        var n = niv.flamant || 1, d = C.EXOS.flamant.doses[n], inf = ui.doseInfo(d);
        b.dur = d.t; b.dose = d.t + ' s par pied';
        b.detail += ' Ton niveau N' + n + (inf ? ' : ' + inf : '') + '.';
      }
      if (it.cotes) it.cotes.forEach(function (c) { var x = {}; for (var q in b) x[q] = b[q]; x.side = c; out.push(x); });
      else out.push(b);
    });
    return out;
  }

  function create(kind, me, mini, onChange) {
    return { id: ++seq, kind: kind, steps: build(kind, me, mini), i: 0, phase: 'ready', t: null, onChange: onChange || function () { } };
  }
  function total(rn) { return rn.steps.reduce(function (a, s) { return a + (s.dur || 0); }, 0); }

  // ---------- chrono ----------
  function T(dur) { return { dur: dur, start: Date.now(), acc: 0, paused: false, last: null }; }
  function elapsed(t) { return (t.acc + (t.paused ? 0 : Date.now() - t.start)) / 1000; }
  function remaining(rn) {
    if (rn.t) return Math.max(0, rn.t.dur - elapsed(rn.t));
    var s = rn.steps[rn.i];
    return s ? s.dur : 0;
  }
  function clock(sec) { sec = Math.ceil(sec - 0.001); if (sec < 60) return String(Math.max(0, sec)); var m = Math.floor(sec / 60), r = sec % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function ensureTick() { if (!timer) timer = setInterval(tick, 120); }
  function stopTick() { if (timer) clearInterval(timer); timer = null; }

  function tick() {
    var rn = cur;
    if (!rn || !rn.t) return;
    var t = rn.t, rem = Math.max(0, t.dur - elapsed(t)), sec = Math.ceil(rem - 0.001);
    if (t.last !== sec) {
      if (!t.paused && t.last !== null) {
        if (rn.phase === 'count3') { if (sec >= 1 && sec <= 2) ui.beep(660, 0.1); }
        else ui.countBeep(sec, t.dur);
      }
      t.last = sec;
    }
    var tl = document.querySelector('[data-rtl="' + rn.id + '"]'), ring = document.querySelector('[data-rring="' + rn.id + '"]');
    if (tl) tl.textContent = rn.phase === 'count3' ? String(Math.max(1, sec)) : clock(rem);
    if (ring) ring.setAttribute('stroke-dashoffset', String(RING * (1 - rem / t.dur)));
    if (rem <= 0 && !t.ended) {
      t.ended = true;
      if (rn.phase === 'count3') { ui.beep(1040, 0.18, 0.22); startStep(rn, rn.i); }
      else { ui.endBeep(); next(rn, true); }
    }
  }

  function startStep(rn, i) {
    rn.i = Math.max(0, Math.min(i, rn.steps.length - 1));
    rn.phase = 'run';
    rn.t = T(rn.steps[rn.i].dur);
    cur = rn; ensureTick();
    rn.onChange();
  }
  function next(rn, auto) {
    if (rn.phase === 'ready') { if (rn.i < rn.steps.length - 1) { rn.i++; rn.onChange(); } return; }
    if (rn.i + 1 >= rn.steps.length) { rn.phase = 'done'; rn.t = null; rn.onChange(); return; }
    var paused = !auto && rn.t && rn.t.paused;
    startStep(rn, rn.i + 1);
    if (paused) { rn.t.paused = true; rn.t.acc = 0; rn.onChange(); }
  }
  function prev(rn) {
    if (rn.phase === 'ready') { if (rn.i > 0) { rn.i--; rn.onChange(); } return; }
    if (rn.phase === 'done') { startStep(rn, rn.steps.length - 1); return; }
    startStep(rn, rn.i - 1);
  }
  function go(rn) {
    ui.unlockAudio();
    ui.beep(660, 0.1);
    rn.phase = 'count3';
    rn.t = T(3);
    cur = rn; ensureTick();
    rn.onChange();
  }
  function pause(rn, on) {
    var t = rn && rn.t;
    if (!t) return;
    var want = on === undefined ? !t.paused : !!on;
    if (want === t.paused) return;
    if (want) { t.acc += Date.now() - t.start; t.paused = true; } else { t.paused = false; t.start = Date.now(); }
    rn.onChange();
  }
  function stop(rn) { if (rn) { rn.t = null; if (rn.phase !== 'done') rn.phase = 'ready'; } if (!rn || cur === rn) { cur = null; stopTick(); } }
  // en quittant l'écran : on met en pause, sans perdre l'étape
  function detach(rn) { if (rn && rn.t && !rn.t.paused) { rn.t.acc += Date.now() - rn.t.start; rn.t.paused = true; } if (cur === rn) { cur = null; stopTick(); } }
  function attach(rn) { if (rn) { cur = rn; ensureTick(); } }

  // ---------- actions ----------
  MC.act.rtGo = function () { if (cur) { if (cur.phase === 'done') return; if (cur.t) pause(cur, false); else go(cur); } };
  MC.act.rtPause = function () { if (cur) pause(cur); };
  MC.act.rtNext = function () { if (cur) next(cur, false); };
  MC.act.rtPrev = function () { if (cur) prev(cur); };

  // ---------- affichage ----------
  // o : { kicker, doneAct, doneLabel, after (texte « Ensuite » après la dernière étape) }
  function html(rn, o) {
    cur = rn;
    if (rn.t) ensureTick();
    var s = rn.steps[rn.i], n = rn.steps.length, ph = rn.phase, done = ph === 'done';
    var nom = done ? (rn.kind === 'calme' ? 'Séance finie !' : 'Prêt !') : s.nom;
    var dots = '<span class="setdots" aria-hidden="true">' + rn.steps.map(function (x, k) { return '<i class="' + (done || k < rn.i ? 'done' : k === rn.i ? 'cur' : '') + '"></i>'; }).join('') + '</span>';
    var hd = '<div class="hd"><span class="kicker" style="color:var(--rc)">' + esc(o.kicker || '') + (done ? '' : ' · étape ' + (rn.i + 1) + ' / ' + n) + '</span>' +
      '<h1>' + esc(nom) + '</h1>' +
      (done ? '<p class="lead" style="margin:0">' + (rn.kind === 'calme' ? 'Bravo, tu as tout fini. Touche « Terminer la séance » pour gagner ton étoile.' : 'Tu es échauffé : place aux exercices !') + '</p>' :
        '<div class="row" style="flex-wrap:wrap;gap:10px;align-items:center"><span class="dosebig">' + esc(s.dose || '') + '</span>' + (s.side ? '<span class="sidetag">' + esc(s.side) + '</span>' : '') + dots + '</div>' +
        '<p class="small" style="margin:0">' + esc(s.detail || '') + '</p>' + ui.infoBtn(s.fiche, s.nom)) + '</div>';
    var left = done ? '' : ui.demoHtml({ anim: s.anim, video: s.video, color: o.color || '#3DFFB0', label: s.nom });
    var rem = remaining(rn), frac = rn.t ? rem / rn.t.dur : 1;
    var ring = done ? '' : '<div class="ring work' + (ph !== 'count3' && rem >= 59.5 ? ' clock' : '') + '"><svg viewBox="0 0 500 500" aria-hidden="true"><circle cx="250" cy="250" r="210" fill="none" stroke="#1E2740" stroke-width="26"/>' +
      '<circle data-rring="' + rn.id + '" cx="250" cy="250" r="210" fill="none" stroke-width="26" stroke-dasharray="' + RING + '" stroke-dashoffset="' + (RING * (1 - frac)) + '" style="stroke:var(--rc);filter:drop-shadow(0 0 10px var(--rc))"/></svg>' +
      '<div class="in" role="timer"><span class="sec" data-rtl="' + rn.id + '">' + (ph === 'count3' ? Math.max(1, Math.ceil(rem - 0.001)) : clock(rem)) + '</span><span class="lab">' + (ph === 'count3' ? 'Prêt ?' : ph === 'ready' ? (s.dur >= 60 ? 'minute' : 'secondes') : (rn.t && rn.t.paused ? 'en pause' : 'il reste')) + '</span></div></div>';
    var ctrl = '';
    if (ph === 'ready') {
      ctrl = '<button type="button" class="btn xl green glow" data-act="rtGo">' + icon('play', 22) + ' GO !</button>' +
        '<p class="next" style="margin:0">' + Math.round(total(rn) / 60) + ' min · le site enchaîne les ' + n + ' étapes avec le chrono et des bips</p>';
    } else if (ph === 'count3' || ph === 'run') {
      var p = rn.t && rn.t.paused;
      ctrl = '<div class="grid3 rtctl"><button type="button" class="btn2 grey" data-act="rtPrev"' + (rn.i === 0 ? ' disabled' : '') + '>' + icon('skipb', 16) + ' Précédent</button>' +
        '<button type="button" class="btn2 grey" data-act="rtPause">' + icon(p ? 'play' : 'pause', 16) + (p ? ' Reprendre' : ' Pause') + '</button>' +
        '<button type="button" class="btn2" data-act="rtNext">Suivant ' + icon('skipf', 16) + '</button></div>';
    } else {
      ctrl = '<button type="button" class="btn2 grey" data-act="rtPrev">' + icon('skipb', 16) + ' Revenir à la dernière étape</button>';
    }
    var doneBtn = '<button type="button" class="btn xl' + (done ? ' green glow' : ' ghostxl') + '" data-act="' + o.doneAct + '">' + icon('check', 22) + ' ' + esc(o.doneLabel) + '</button>';
    var nx = rn.steps[rn.i + 1];
    var nextTxt = done ? (o.after || '') : (nx ? 'Ensuite : ' + nx.nom.toLowerCase() + (nx.side ? ' (' + nx.side + ')' : '') : (o.after || ''));
    var right = ring + ctrl + doneBtn + (nextTxt ? '<p class="next">' + esc(nextTxt) + '</p>' : '');
    return '<div class="main rt' + (done ? ' single' : '') + '">' + hd + (left ? '<div class="left">' + left + '</div>' : '') + '<div class="right">' + right + '</div></div>';
  }

  return { create: create, html: html, stop: stop, detach: detach, attach: attach, pause: pause, build: build };
})();
