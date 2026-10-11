/*
 * Mode Champion - animations "bonhomme baton" neon pour les fiches d'exercices.
 * Script classique (pas de module, pas de dependance).
 *
 *   MC.anim.has(key)                 -> true si une animation existe
 *   MC.anim.mount(container, key, o) -> { stop: function(){} }
 *        o.color : couleur neon (defaut #3DFFB0)
 *        o.label : texte aria-label du <svg role="img">
 *   MC.anim.keys()                   -> liste des cles
 *   MC.anim._renderAt(container, key, t)  (debug) dessine la pose a t dans [0,1]
 *   MC.anim._pose(key, t)                 (debug) articulations calculees
 *
 * Moteur : squelette a longueurs fixes, poses cles en angles (cinematique
 * directe) ou en cibles de mains / pieds (cinematique inverse a 2 segments),
 * interpolation avec easing, rendu SVG pilote par requestAnimationFrame.
 * Angles en degres : 0 = vers le bas, 90 = vers la droite (devant),
 * 180 = vers le haut, -90 = vers la gauche (derriere).
 */
(function () {
  'use strict';

  var MC = window.MC = window.MC || {};
  var NS = 'http://www.w3.org/2000/svg';
  var GY = 142;          // ligne de sol
  var CY = 139;          // axe d'un segment pose au sol (trait de 6 px)
  var L = { torso: 29, neck: 4, head: 15, hr: 8, thigh: 23, shin: 23, up: 16, fo: 15, foot: 7, ffoot: 5 };
  var DIM = '#4A5578', LITE = '#8A93AD', BG = '#070A12', FILL = '#0D1324';
  var D2R = Math.PI / 180;
  var uid = 0;

  /* ------------------------------------------------------------------ */
  /* Maths                                                               */
  /* ------------------------------------------------------------------ */
  function dir(a) { a *= D2R; return [Math.sin(a), Math.cos(a)]; }
  function along(p, a, l) { var d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; }
  function angTo(p, q) { return Math.atan2(q[0] - p[0], q[1] - p[1]) / D2R; }
  function lerp(a, b, s) { return a + (b - a) * s; }
  function lerp2(p, q, s) { return [lerp(p[0], q[0], s), lerp(p[1], q[1], s)]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function unwrap(a, ref) { while (a - ref > 180) { a -= 360; } while (a - ref < -180) { a += 360; } return a; }
  function cross(u, v) { return u[0] * v[1] - u[1] * v[0]; }
  function frac(x) { return x - Math.floor(x); }
  function io(s) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(s, 0, 1)); }

  var EASE = {
    io: io,
    lin: function (s) { return s; },
    out: function (s) { var r = 1 - s; return 1 - r * r * r; },      // depart explosif
    so: function (s) { return Math.sin(Math.PI * s / 2); },           // depart vif, fin douce
    si: function (s) { return 1 - Math.cos(Math.PI * s / 2); },       // depart doux, fin vive
    hold: function () { return 0; }
  };

  /* Cinematique inverse 2 segments. b = +1 : genou "devant" (jambe),
     b = -1 : coude "derriere" (bras), en vue de profil vers la droite. */
  function ik(root, tg, l1, l2, b) {
    var dx = tg[0] - root[0], dy = tg[1] - root[1];
    var d = Math.sqrt(dx * dx + dy * dy), miss = 0;
    var base = Math.atan2(dx, dy) / D2R;
    var mx = l1 + l2 - 0.001, mn = Math.abs(l1 - l2) + 0.001;
    if (d > mx) { miss = d - mx; d = mx; } else if (d < mn) { miss = mn - d; d = mn; }
    var al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / D2R;
    var end = along(root, base, d), first = null, best = null;
    for (var k = 0; k < 2; k++) {
      var a1 = base + (k ? -al : al);
      var j = along(root, a1, l1);
      var a2 = unwrap(angTo(j, end), a1);
      var c = [a1, a2];
      if (!first) { first = c; }
      if (cross(dir(a1), dir(a2)) * b > 0) { best = c; break; }
    }
    return { a: best || first, miss: miss };
  }

  /* ------------------------------------------------------------------ */
  /* Poses                                                               */
  /* ------------------------------------------------------------------ */
  function floor0() { return CY; }

  function normLimb(s) {
    if (!s) { return { fk: [0, 0] }; }
    if (s.length) { return { fk: [s[0], s[1]], f: s[2] }; }
    return s;
  }

  function limbSolve(root, s, l1, l2, defB) {
    var a, miss = 0;
    if (s.ik) {
      var r = ik(root, s.ik, l1, l2, s.b != null ? s.b : defB);
      a = r.a; miss = r.miss;
    } else {
      a = s.fk;
    }
    var j = along(root, a[0], l1);
    return { r: root, a: a, j: j, e: along(j, a[1], l2), miss: miss };
  }

  function placeFoot(lg, f, side, def) {
    var fl = def.floor || floor0;
    var len = side ? L.ffoot : (def.foot || L.foot);
    if (f == null) { f = side < 0 ? lg.a[1] - 90 : lg.a[1] + 90; }
    var ank = lg.e, toe = along(ank, f, len), fy = fl(toe[0]);
    if (toe[1] > fy + 0.01) {
      var sg = Math.sin(f * D2R) >= 0 ? 1 : -1;
      var c = (fy - ank[1]) / len;
      f = c <= 0 ? sg * 90 : sg * Math.acos(Math.min(1, c)) / D2R;
      toe = along(ank, f, len);
    }
    lg.f = f; lg.t = toe;
    lg.h = side ? null : along(ank, f + 180, 2.5);   // petit talon (profil)
    if (lg.h && lg.h[1] > fl(lg.h[0])) { lg.h = [lg.h[0], fl(lg.h[0])]; }
  }

  function solve(spec, def) {
    var front = def.view === 'front';
    var t = spec.t == null ? 180 : spec.t;
    var hip = [spec.x, spec.y];
    var sh = along(hip, t, L.torso);
    var ha = t + (spec.h || 0), head = along(sh, ha, L.head);
    var lim = GY - L.hr - 2.4, i, sg;
    if (head[1] > lim) {               // la tete ne traverse jamais le sol
      sg = Math.sin(ha * D2R) >= 0 ? 1 : -1;
      for (i = 0; i < 45 && head[1] > lim; i++) { ha += sg * 2; head = along(sh, ha, L.head); }
    }
    var nk = along(sh, ha, L.neck);
    var pp = dir(t - 90);
    function off(p, k) { return front ? [p[0] + pp[0] * k, p[1] + pp[1] * k] : p; }
    var J = {
      front: front, hip: hip, sh: sh, nk: nk, head: head, ha: ha,
      o: spec.o == null ? 1 : spec.o,
      hipN: off(hip, 3.5), hipF: off(hip, -3.5), shN: off(sh, 5), shF: off(sh, -5)
    };
    var lN = normLimb(spec.lN), lF = normLimb(spec.lF);
    J.aN = limbSolve(J.shN, normLimb(spec.aN), L.up, L.fo, -1);
    J.aF = limbSolve(J.shF, normLimb(spec.aF), L.up, L.fo, front ? 1 : -1);
    J.lN = limbSolve(J.hipN, lN, L.thigh, L.shin, 1);
    J.lF = limbSolve(J.hipF, lF, L.thigh, L.shin, front ? -1 : 1);
    placeFoot(J.lN, lN.f, front ? 1 : 0, def);
    placeFoot(J.lF, lF.f, front ? -1 : 0, def);
    // filet de securite : aucun point ne s'enfonce dans le sol (on souleve tout le corps)
    var fl = def.floor || floor0, pts = [], pen = 0, q, d;
    var cand = [hip, sh, nk, head, J.hipN, J.hipF, J.shN, J.shF, J.aN.j, J.aN.e, J.aF.j, J.aF.e,
      J.lN.j, J.lN.e, J.lN.t, J.lF.j, J.lF.e, J.lF.t];
    if (J.lN.h) { cand.push(J.lN.h); }
    if (J.lF.h) { cand.push(J.lF.h); }
    for (i = 0; i < cand.length; i++) {
      q = cand[i];
      if (pts.indexOf(q) < 0) {
        pts.push(q);
        d = q === head ? q[1] + L.hr + 2.4 - GY : q[1] - fl(q[0]);
        if (d > pen) { pen = d; }
      }
    }
    if (pen > 0.05) { for (i = 0; i < pts.length; i++) { pts[i][1] -= pen; } }
    J.pen = pen;
    return J;
  }

  var LIMBS = ['aN', 'aF', 'lN', 'lF'];

  function lerpSpec(A, B, s, def) {
    var SA = A.__s || (A.__s = solve(A, def));
    var SB = B.__s || (B.__s = solve(B, def));
    var o = {
      x: lerp(A.x, B.x, s), y: lerp(A.y, B.y, s),
      t: lerp(A.t == null ? 180 : A.t, B.t == null ? 180 : B.t, s),
      h: lerp(A.h || 0, B.h || 0, s),
      o: lerp(A.o == null ? 1 : A.o, B.o == null ? 1 : B.o, s)
    };
    for (var i = 0; i < 4; i++) {
      var k = LIMBS[i], la = normLimb(A[k]), lb = normLimb(B[k]), r;
      if (la.ik && lb.ik) {
        r = { ik: lerp2(la.ik, lb.ik, s), b: la.b != null ? la.b : lb.b };
      } else {
        var a0 = SA[k].a[0], a1 = SA[k].a[1], c0 = SB[k].a[0], c1 = SB[k].a[1];
        if (la.ik || lb.ik) {
          // segment proximal + angle relatif du coude / genou : jamais de pliage a l'envers
          var ra = unwrap(a1 - a0, 0), rc = unwrap(c1 - c0, 0);
          if (la.ik) { a0 = unwrap(a0, c0); } else { c0 = unwrap(c0, a0); }
          var u0 = lerp(a0, c0, s);
          r = { fk: [u0, u0 + lerp(ra, rc, s)] };
        } else {
          r = { fk: [lerp(a0, c0, s), lerp(a1, c1, s)] };
        }
      }
      if (k.charAt(0) === 'l') {
        if (la.f != null && lb.f != null) { r.f = lerp(la.f, lb.f, s); }
        else if (la.f != null || lb.f != null) { r.f = lerp(SA[k].f, unwrap(SB[k].f, SA[k].f), s); }
      }
      o[k] = r;
    }
    return o;
  }

  function seg(keys, t) {
    var n = keys.length, t0 = keys[0][0], tt = t < t0 ? t + 1 : t;
    for (var i = 0; i < n; i++) {
      var a = keys[i][0], b = i + 1 < n ? keys[i + 1][0] : t0 + 1;
      if (tt >= a && tt <= b) {
        var s = b > a ? (tt - a) / (b - a) : 0;
        return { a: keys[i], b: keys[(i + 1) % n], s: EASE[keys[i][2] || 'io'](s) };
      }
    }
    return { a: keys[n - 1], b: keys[0], s: 0 };
  }
  /* valeur scalaire par images cles : [[t, v, ease], ...] */
  function kv(keys, t) { var g = seg(keys, t); return lerp(g.a[1], g.b[1], g.s); }
  /* poses par images cles : [[t, spec, ease], ...] */
  function kf(keys) {
    return function (t, def) {
      var g = seg(keys, t);
      if (g.s <= 0) { return g.a[1]; }
      if (g.s >= 1) { return g.b[1]; }
      return lerpSpec(g.a[1], g.b[1], g.s, def);
    };
  }
  function ext(o, e) {
    var r = {}, k;
    for (k in o) { if (k !== '__s' && Object.prototype.hasOwnProperty.call(o, k)) { r[k] = o[k]; } }
    for (k in e) { if (Object.prototype.hasOwnProperty.call(e, k)) { r[k] = e[k]; } }
    return r;
  }
  /* hanche a partir de la position voulue des epaules */
  function fromSh(sx, sy, t) { var d = dir(t); return [sx - d[0] * L.torso, sy - d[1] * L.torso]; }
  /* miroir gauche/droite d'une pose de face autour de x = cx */
  function mirrorF(s, cx) {
    function mx(p) { return [2 * cx - p[0], p[1]]; }
    function ml(l) {
      if (!l) { return l; }
      if (l.length) { return l.length > 2 ? [-l[0], -l[1], -l[2]] : [-l[0], -l[1]]; }
      var r = { ik: mx(l.ik) };
      if (l.b != null) { r.b = -l.b; }
      if (l.f != null) { r.f = -l.f; }
      return r;
    }
    return { x: 2 * cx - s.x, y: s.y, t: 360 - (s.t == null ? 180 : s.t), h: -(s.h || 0), o: s.o,
      aN: ml(s.aF), aF: ml(s.aN), lN: ml(s.lF), lF: ml(s.lN) };
  }

  /* ------------------------------------------------------------------ */
  /* Accessoires                                                         */
  /* ------------------------------------------------------------------ */
  function pullBar(P, y) {
    P.line(68, 0, 68, y, { c: DIM, w: 3 });
    P.line(172, 0, 172, y, { c: DIM, w: 3 });
    P.line(62, y, 178, y, { c: LITE, w: 3.5, layer: 'front' });
  }
  function stepBox(P, x1, x2, top) {
    P.path('M' + x1 + ' ' + GY + 'V' + top + 'H' + x2 + 'V' + GY, { c: DIM, w: 2.5, fill: FILL });
    P.line(x1, top, x2, top, { c: LITE, w: 2.5 });
  }
  function mat(P, x1, x2) {
    P.path('M' + x1 + ' ' + GY + 'H' + x2 + 'L' + (x2 + 5) + ' ' + (GY + 5) + 'H' + (x1 - 5) + 'Z',
      { c: DIM, w: 1.5, fill: FILL });
  }
  function wall(P, x) {
    P.line(x, 8, x, GY, { c: LITE, w: 3 });
    for (var y = 16; y < GY; y += 14) { P.line(x - 1.5, y, x - 7, y + 6, { c: DIM, w: 1.5 }); }
  }
  function chronoFactory(g, color) {
    var cx = 219, cy = 25, r = 9;
    var cg = mk('g', { fill: 'none', 'stroke-linecap': 'round' }, g);
    mk('circle', { cx: cx, cy: cy, r: r, stroke: LITE, 'stroke-width': 2 }, cg);
    mk('line', { x1: cx, y1: cy - r - 1.5, x2: cx, y2: cy - r - 4, stroke: LITE, 'stroke-width': 2.6 }, cg);
    mk('line', { x1: cx + 6.6, y1: cy - 9.2, x2: cx + 8.6, y2: cy - 11.2, stroke: LITE, 'stroke-width': 2 }, cg);
    var arc = mk('path', { stroke: color, 'stroke-width': 2.2, opacity: 0.75 }, cg);
    var hand = mk('line', { x1: cx, y1: cy, x2: cx, y2: cy - 6, stroke: color, 'stroke-width': 2 }, cg);
    mk('circle', { cx: cx, cy: cy, r: 1.3, fill: LITE }, cg);
    return function (t) {
      var a = frac(t) * 360, ex = cx + r * Math.sin(a * D2R), ey = cy - r * Math.cos(a * D2R);
      hand.setAttribute('x2', f1(cx + 6 * Math.sin(a * D2R)));
      hand.setAttribute('y2', f1(cy - 6 * Math.cos(a * D2R)));
      arc.setAttribute('d', a < 2 ? '' : 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 ' + (a > 180 ? 1 : 0) + ' 1 ' + f1(ex) + ' ' + f1(ey));
    };
  }

  /* ------------------------------------------------------------------ */
  /* Briques de mouvement                                                */
  /* ------------------------------------------------------------------ */
  var RUNLEG = [[0, 14, -4], [0.25, -32, -55], [0.5, -4, -110], [0.75, 68, -14], [1, 14, -4]];
  function runLeg(p) {
    p = frac(p);
    for (var i = 0; i < RUNLEG.length - 1; i++) {
      var a = RUNLEG[i], b = RUNLEG[i + 1];
      if (p >= a[0] && p <= b[0]) {
        var s = io((p - a[0]) / (b[0] - a[0]));
        return [lerp(a[1], b[1], s), lerp(a[2], b[2], s)];
      }
    }
    return [RUNLEG[0][1], RUNLEG[0][2]];
  }
  function runArm(p) { var f = Math.cos(2 * Math.PI * (p - 0.75)); var u = 12 - 52 * f; return [u, u + 88]; }
  function runSpec(x, p, lean, base) {
    return { x: x, y: (base || 91.4) + 2 * Math.cos(4 * Math.PI * p), t: lean, h: 180 - lean > 10 ? 10 : 180 - lean,
      lN: runLeg(p), lF: runLeg(p + 0.5), aN: runArm(p), aF: runArm(p + 0.5) };
  }
  function stand(x, e) {
    var s = { x: x, y: 93, t: 180, h: 0, aN: [6, 14], aF: [-6, 2], lN: [1.5, 0], lF: [-2, -2] };
    return e ? ext(s, e) : s;
  }

  /* ------------------------------------------------------------------ */
  /* Animations                                                          */
  /* ------------------------------------------------------------------ */
  var A = {};

  /* --- suspension (de face) ---------------------------------------- */
  var BS = 20;
  A.suspension = {
    dur: 3, still: 0.25, chrono: true, view: 'front',
    props: function (P) { pullBar(P, BS); },
    pose: function (t) {
      var sw = 1.8 * Math.sin(2 * Math.PI * t) + 0.25 * Math.sin(14 * Math.PI * t);
      var c = along([120, BS], sw, 29), hip = along(c, sw, L.torso);
      return { x: hip[0], y: hip[1], t: 180 + sw, h: 0,
        aN: { ik: [135, BS] }, aF: { ik: [105, BS] },
        lN: [sw + 4, sw - 1, 40], lF: [sw - 4, sw + 1, -40] };
    }
  };

  /* --- tractions avec elastique sous un genou (de face) -------------- */
  var BT = 30;
  function tracSpec(cy, h) {
    var hip = [120, cy + L.torso];
    return { x: hip[0], y: hip[1], t: 180, h: h || 0,
      aN: { ik: [135, BT] }, aF: { ik: [105, BT] },
      lN: [14, -10, 40], lF: [-3, 2, -40] };
  }
  var trHang = tracSpec(59.3), trTop = tracSpec(33);
  A.tractions = {
    dur: 3, still: 0.42, view: 'front',
    props: function (P) {
      pullBar(P, BT);
      var band = P.path('', { layer: 'ffront', c: LITE, w: 2.2 });
      return function (J) {
        var k = J.lN.j, y = k[1] + 4;
        P.attr(band, { d: 'M' + 121 + ' ' + (BT + 1.5) + 'L' + f1(k[0] - 4) + ' ' + f1(y) + 'Q' + f1(k[0]) + ' ' + f1(y + 5) + ' ' + f1(k[0] + 4) + ' ' + f1(y) + 'L' + 127 + ' ' + (BT + 1.5) });
      };
    },
    pose: kf([[0, trHang], [0.08, trHang, 'so'], [0.38, trTop], [0.48, trTop], [0.92, trHang]])
  };

  /* --- tirage elastique a genoux face a une porte -------------------- */
  var ANCH = [194, 38];
  var teBase = { x: 118, y: 116, t: 181, h: 4, lN: [0, -90, -95], lF: [-3, -93, -97], aN: { ik: [143.4, 70.6] }, aF: { ik: [140.5, 72] } };
  var tePull = ext(teBase, { t: 186, h: 0, aN: { ik: [126, 93] }, aF: { ik: [123, 94] } });
  A.tirage_elastique = {
    dur: 2.8, still: 0.45,
    props: function (P) {
      P.path('M194 ' + GY + 'V12H234V' + GY, { c: DIM, w: 3 });
      P.circle(ANCH[0], ANCH[1], 2.6, { c: LITE, w: 2, fill: LITE });
      mat(P, 78, 150);
      var eN = P.line(0, 0, 0, 0, { layer: 'ffront', c: LITE, w: 2 });
      var eF = P.line(0, 0, 0, 0, { layer: 'fback', c: DIM, w: 2 });
      return function (J) {
        P.attr(eN, { x1: f1(J.aN.e[0]), y1: f1(J.aN.e[1]), x2: ANCH[0], y2: ANCH[1] });
        P.attr(eF, { x1: f1(J.aF.e[0]), y1: f1(J.aF.e[1]), x2: ANCH[0], y2: ANCH[1] });
      };
    },
    pose: kf([[0, teBase], [0.1, teBase], [0.42, tePull], [0.52, tePull], [0.92, teBase]])
  };

  /* --- pompes -------------------------------------------------------- */
  function plankFrom(anchor, len, shY) {
    var phi = Math.acos(clamp((shY - anchor[1]) / len, -1, 1)) / D2R;
    return phi;
  }
  A.pompes = {
    dur: 2.4, still: 0.3,
    props: function (P) { mat(P, 40, 160); },
    pose: function (t) {
      var k = kv([[0, 0], [0.08, 0], [0.48, 1], [0.56, 1], [0.86, 0]], t);
      var an = [58, 134], phi = plankFrom(an, 75, lerp(108.6, 127.5, k));
      var hip = along(an, phi, 46);
      return { x: hip[0], y: hip[1], t: phi, h: 10, lN: [phi - 180, phi - 180], lF: [phi - 180, phi - 180],
        aN: { ik: [129, CY] }, aF: { ik: [125, CY] } };
    }
  };

  /* --- pompes sur les genoux ----------------------------------------- */
  A.pompes_genoux = {
    dur: 2.4, still: 0.3,
    props: function (P) { mat(P, 50, 160); },
    pose: function (t) {
      var k = kv([[0, 0], [0.08, 0], [0.48, 1], [0.56, 1], [0.86, 0]], t);
      var kn = [84, CY], phi = plankFrom(kn, 52, lerp(110.5, 128, k));
      var hip = along(kn, phi, L.thigh);
      return { x: hip[0], y: hip[1], t: phi, h: 10, lN: [phi - 180, -112, -60], lF: [phi - 180, -124, -70],
        aN: { ik: [129, CY] }, aF: { ik: [125, CY] } };
    }
  };

  /* --- rowing assis avec elastique ----------------------------------- */
  var rwA = { x: 84, y: 138, t: 166, h: 8, lN: [90, 90, 180], lF: [91, 91, 178], aN: { ik: [120, 115] }, aF: { ik: [118, 116] } };
  var rwB = ext(rwA, { t: 192, h: -2, aN: { ik: [88, 121] }, aF: { ik: [85, 122] } });
  A.rowing = {
    dur: 2.6, still: 0.45,
    props: function (P) {
      mat(P, 60, 150);
      var eN = P.path('', { layer: 'ffront', c: LITE, w: 2 });
      var eF = P.path('', { layer: 'fback', c: DIM, w: 2 });
      return function (J) {
        var a = J.lN.e, so = [a[0] + 4.5, a[1] - 3];
        P.attr(eN, { d: 'M' + f1(J.aN.e[0]) + ' ' + f1(J.aN.e[1]) + 'L' + f1(so[0]) + ' ' + f1(so[1] - 2) });
        P.attr(eF, { d: 'M' + f1(J.aF.e[0]) + ' ' + f1(J.aF.e[1]) + 'L' + f1(so[0]) + ' ' + f1(so[1] + 1) });
      };
    },
    pose: kf([[0, rwA], [0.1, rwA], [0.42, rwB], [0.52, rwB], [0.92, rwA]])
  };

  /* --- planche (gainage avant-bras) ---------------------------------- */
  A.planche = {
    dur: 3, still: 0.3, chrono: true,
    props: function (P) { mat(P, 40, 170); },
    pose: function (t) {
      var an = [55, 134];
      var shY = 122.4 + 0.45 * Math.sin(4 * Math.PI * t) + 0.15 * Math.sin(46 * Math.PI * t);
      var phi = plankFrom(an, 75, shY), hip = along(an, phi, 46);
      return { x: hip[0], y: hip[1], t: phi, h: 6, lN: [phi - 180, phi - 180], lF: [phi - 180, phi - 180],
        aN: { ik: [144.4, 138.8] }, aF: { ik: [141, 138.8] } };
    }
  };

  /* --- superman ------------------------------------------------------ */
  var smDown = { x: 104, y: CY, t: 90, h: 12, aN: [93, 93], aF: [90, 90], lN: [-90, -90, -92], lF: [-91, -91, -93] };
  var smUp = { x: 104, y: CY, t: 103, h: 10, aN: [114, 114], aF: [110, 110], lN: [-108, -108, -110], lF: [-104, -104, -106] };
  A.superman = {
    dur: 3, still: 0.5, chrono: true,
    props: function (P) { mat(P, 50, 185); },
    pose: kf([[0, smDown], [0.1, smDown], [0.3, smUp], [0.72, smUp], [0.92, smDown]])
  };

  /* --- corde a sauter (de face) -------------------------------------- */
  function cordeState(t, rr) {
    var u = frac(t * 2);
    var air = u >= 0.3 && u <= 0.7;
    var h = air ? 6 * Math.sin(Math.PI * (u - 0.3) / 0.4) : 0;
    var g = u > 0.7 ? u - 0.7 : u + 0.3;
    var dip = air ? 0 : 1.5 * Math.sin(Math.PI * g / 0.6);
    var hy = 93 - h + dip, phi = 2 * Math.PI * (u - 0.5);
    var cx = Math.sin(phi) * 1.2, cy = -Math.cos(phi) * rr;
    var spec = { x: 120, y: hy, t: 180,
      aN: { ik: [142 + cx, hy - 8 + cy] }, aF: { ik: [98 - cx, hy - 8 + cy] },
      lN: { ik: [123.5, CY - h], f: 90 - 45 * h / 6 }, lF: { ik: [116.5, CY - h], f: -(90 - 45 * h / 6) } };
    return { spec: spec, phi: phi };
  }
  A.corde = {
    dur: 1.2, still: 0.25, view: 'front',
    props: function (P) {
      var back = P.path('', { layer: 'fback', c: LITE, w: 2.2 });
      var front = P.path('', { layer: 'ffront', c: LITE, w: 2.2 });
      return function (J, t) {
        var phi = cordeState(t, 2.5).phi, c = Math.cos(phi);
        var a = J.aF.e, b = J.aN.e, hy = (a[1] + b[1]) / 2;
        var ay = c >= 0 ? hy + c * (141 - hy) : hy + c * 62;
        var cy = (8 * ay - a[1] - b[1]) / 6, w = 4 + 8 * Math.abs(c);
        var d = 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'C' + f1(a[0] - w) + ' ' + f1(cy) + ' ' + f1(b[0] + w) + ' ' + f1(cy) + ' ' + f1(b[0]) + ' ' + f1(b[1]);
        var inFront = Math.sin(phi) < 0;
        P.attr(front, { d: inFront ? d : '' });
        P.attr(back, { d: inFront ? '' : d });
      };
    },
    pose: function (t) { return cordeState(t, 2.5).spec; }
  };
  A.corde_imaginaire = {
    dur: 1.2, still: 0.25, view: 'front',
    pose: function (t) { return cordeState(t, 3.5).spec; }
  };

  /* --- saut en longueur sans elan ------------------------------------ */
  var slStand = { x: 46, y: 93.1, t: 180, h: 0, aN: [8, 16], aF: [-4, 6], lN: { ik: [48, CY] }, lF: { ik: [45, CY] } };
  var slUp = ext(slStand, { y: 91.5, t: 182, aN: [136, 156], aF: [128, 150], lN: { ik: [48, 136] }, lF: { ik: [45, 136] } });
  var slCrouch = { x: 42, y: 112, t: 132, h: 16, aN: [-112, -98], aF: [-118, -104], lN: { ik: [48, CY] }, lF: { ik: [45, CY] } };
  var slPush = { x: 70, y: 95, t: 128, h: 12, aN: [135, 150], aF: [128, 145], lN: { ik: [50, 135] }, lF: { ik: [47, 135] } };
  var slFly = { x: 97, y: 84, t: 152, h: 6, aN: [108, 125], aF: [100, 118], lN: [75, -15], lF: [70, -20] };
  var slReach = { x: 124, y: 98, t: 148, h: 8, aN: [92, 100], aF: [86, 95], lN: [72, 30], lF: [68, 24] };
  var slLand = { x: 132, y: 113, t: 138, h: 14, aN: [84, 92], aF: [78, 88], lN: { ik: [152, CY] }, lF: { ik: [149, CY] } };
  var slStab = { x: 140, y: 103, t: 160, h: 6, aN: [66, 84], aF: [60, 78], lN: { ik: [152, CY] }, lF: { ik: [149, CY] } };
  var slKF = kf([[0, ext(slStand, { o: 0 })], [0.05, slStand], [0.14, slUp], [0.3, slCrouch], [0.42, slPush, 'lin'],
    [0.53, slFly, 'lin'], [0.64, slReach, 'so'], [0.7, slLand], [0.8, slStab], [0.9, slStab, 'lin'], [0.999, ext(slStab, { o: 0 })]]);
  A.saut_longueur = {
    dur: 2.8, still: 0.53,
    props: function (P) { P.line(57, 137, 57, 147, { c: LITE, w: 2.5 }); },
    pose: function (t, def) {
      var s = slKF(t, def);
      if (t > 0.42 && t < 0.64) {          // trajectoire parabolique de la hanche
        var u = (t - 0.42) / 0.22;
        s = ext(s, { x: lerp(70, 124, u), y: lerp(95, 98, u) - 58 * u * (1 - u) });
      }
      return s;
    }
  };

  /* --- sauts lateraux (de face) -------------------------------------- */
  var lxStand = { x: 98, y: 93, t: 180, aN: [14, 4], aF: [-14, -4], lN: { ik: [101.5, CY] }, lF: { ik: [94.5, CY] } };
  var lxCrouch = { x: 99, y: 103, t: 178, aN: [30, 10], aF: [-24, -6], lN: { ik: [101.5, CY] }, lF: { ik: [94.5, CY] } };
  var lxPush = { x: 108, y: 90, t: 174, aN: [100, 130], aF: [-80, -110], lN: { ik: [111, 135] }, lF: { ik: [104, 135] } };
  var lxApex = { x: 120, y: 80, t: 176, aN: [110, 140], aF: [-100, -130], lN: { ik: [123.5, 118] }, lF: { ik: [116.5, 118] } };
  var lxLand = { x: 139, y: 94.5, t: 182, aN: [70, 90], aF: [-60, -80], lN: { ik: [145.5, CY] }, lF: { ik: [138.5, CY] } };
  var lxAbs = { x: 142, y: 104, t: 182, aN: [40, 60], aF: [-36, -50], lN: { ik: [145.5, CY] }, lF: { ik: [138.5, CY] } };
  var lxEnd = { x: 142, y: 93, t: 180, aN: [14, 4], aF: [-14, -4], lN: { ik: [145.5, CY] }, lF: { ik: [138.5, CY] } };
  var lxR = [[0, lxStand], [0.08, lxCrouch, 'so'], [0.15, lxPush, 'lin'], [0.21, lxApex, 'lin'], [0.27, lxLand, 'so'], [0.34, lxAbs], [0.43, lxEnd], [0.5, lxEnd]];
  var lxKeys = [];
  (function () {
    var i;
    for (i = 0; i < lxR.length - 1; i++) { lxKeys.push(lxR[i]); }
    for (i = 0; i < lxR.length - 1; i++) { lxKeys.push([lxR[i][0] + 0.5, mirrorF(lxR[i][1], 120), lxR[i][2]]); }
  })();
  A.sauts_lateraux = {
    dur: 1.8, still: 0.21, view: 'front',
    props: function (P) { P.line(120, 137, 120, 158, { c: LITE, w: 2.5 }); },
    pose: kf(lxKeys)
  };

  /* --- skipping ------------------------------------------------------ */
  function skipLeg(q) {
    var s = Math.sin(2 * Math.PI * q), l = s > 0 ? Math.pow(s, 0.75) : 0;
    return [95 * l, -14 * Math.sin(Math.PI * l), 90 - 45 * l];
  }
  A.skipping = {
    dur: 1.6, still: 0.125,
    pose: function (t) {
      var q = 2 * t, s = Math.sin(2 * Math.PI * q);   // 2 cycles par boucle
      var un = 10 - 50 * s, uf = 10 + 50 * s;
      return { x: 118, y: 90.8 - 1.6 * Math.abs(s), t: 181, h: 0,
        lN: skipLeg(q), lF: skipLeg(q + 0.5), aN: [un, un + 92], aF: [uf, uf + 92] };
    }
  };

  /* --- departs (allonge -> sprint) ----------------------------------- */
  var dpProne = { x: 64, y: CY, t: 90, h: 14, aN: { ik: [86, CY] }, aF: { ik: [84, CY] }, lN: [-90, -90, -90], lF: [-91, -91, -92] };
  var dpPlank = (function () {
    var an = [20, 134.5], phi = plankFrom(an, 75, 108.6), hip = along(an, phi, 46);
    return { x: hip[0], y: hip[1], t: phi, h: 10, aN: { ik: [90, CY] }, aF: { ik: [87, CY] }, lN: [phi - 180, phi - 180], lF: [phi - 180, phi - 180] };
  })();
  var dpFly = { x: 66, y: 114, t: 100, h: 10, aN: { ik: [90, CY] }, aF: { ik: [87, CY] }, lN: { ik: [52, 127] }, lF: { ik: [44, 128] } };
  var dpCrouch = { x: 68, y: 118, t: 100, h: 12, aN: { ik: [90, CY] }, aF: { ik: [87, CY] }, lN: { ik: [80, CY] }, lF: { ik: [60, 138] } };
  var dpDrive = { x: 88, y: 102, t: 132, h: 10, aN: [70, 150], aF: [-50, 20], lN: { ik: [80, CY] }, lF: [62, -30] };
  var dpRun0 = runSpec(104, 0.25, 135);
  var dpKF = kf([[0, ext(dpProne, { o: 0 })], [0.05, dpProne], [0.12, dpProne, 'so'], [0.18, dpPlank, 'lin'], [0.215, dpFly, 'lin'],
    [0.25, dpCrouch], [0.3, dpDrive, 'lin'], [0.345, dpRun0], [0.35, dpRun0]]);
  A.departs = {
    dur: 2.8, still: 0.27, exits: true,
    pose: function (t, def) {
      if (t < 0.345) { return dpKF(t, def); }
      var s = clamp((t - 0.345) / 0.555, 0, 1);
      var x = 104 + 180 * (0.35 * s + 0.65 * s * s);
      var lean = lerp(135, 166, io(Math.min(1, s / 0.45)));
      var r = runSpec(x, 0.25 + 3.1 * s, lean);
      if (t > 0.9) { r.o = 0; }
      return r;
    }
  };

  /* --- montees sur une marche ---------------------------------------- */
  var MK = { x1: 112, x2: 172, top: 118 };
  function stepFloor(x) { return x >= MK.x1 - 1 && x <= MK.x2 ? MK.top - 3 : CY; }
  var mmBase = { x: 96, y: 93, t: 177, h: 2, aN: [4, 20], aF: [-6, 10], lN: { ik: [120, MK.top - 3] }, lF: { ik: [94, CY] } };
  var mmPush = { x: 107, y: 82, t: 172, h: 6, aN: [30, 100], aF: [-30, 30], lN: { ik: [120, MK.top - 3] }, lF: [-14, -64] };
  var mmTop = { x: 120, y: 69, t: 180, h: 0, aN: [55, 140], aF: [-35, 40], lN: { ik: [120, MK.top - 3] }, lF: [92, 0, 60] };
  var mmDown = { x: 108, y: 79, t: 176, h: 2, aN: [20, 60], aF: [-10, 20], lN: { ik: [120, MK.top - 3] }, lF: [-16, -72] };
  A.montees_marche = {
    dur: 2.6, still: 0.42, floor: stepFloor,
    props: function (P) { stepBox(P, MK.x1, MK.x2, MK.top); },
    pose: kf([[0, mmBase], [0.06, mmBase, 'si'], [0.18, mmPush, 'so'], [0.36, mmTop], [0.5, mmTop], [0.66, mmDown], [0.8, mmBase]])
  };

  /* --- montees de genou explosives ----------------------------------- */
  var mgN = { x: 118, y: 97, t: 173, h: 4, aN: [20, 100], aF: [-12, 78], lN: { ik: [121, CY] }, lF: { ik: [115, CY] } };
  var mgUpN = { x: 121, y: 89.4, t: 179, h: 0, aN: [-48, 40], aF: [72, 162], lN: [100, 4, 60], lF: { ik: [117, 135] } };
  var mgUpF = { x: 121, y: 89.4, t: 179, h: 0, aN: [72, 162], aF: [-48, 40], lN: { ik: [123, 135] }, lF: [100, 4, 60] };
  A.montees_genoux = {
    dur: 2.4, still: 0.18,
    pose: kf([[0, mgN], [0.06, mgN, 'out'], [0.16, mgUpN], [0.3, mgUpN], [0.44, mgN], [0.56, mgN, 'out'], [0.66, mgUpF], [0.8, mgUpF], [0.94, mgN]])
  };

  /* --- burpees ------------------------------------------------------- */
  var bpStand = stand(100, { lN: { ik: [102, CY] }, lF: { ik: [99, CY] }, y: 93.1 });
  var bpSquat = { x: 95, y: 118, t: 100, h: 10, aN: { ik: [125, CY] }, aF: { ik: [122, CY] }, lN: { ik: [102, CY] }, lF: { ik: [99, CY] } };
  var bpPlank = (function () {
    var sh = [125, 108.4], an = [55, 134.5], phi = angTo(an, sh), hip = along(an, phi, 46);
    return { x: hip[0], y: hip[1], t: phi, h: 10, aN: { ik: [125, CY] }, aF: { ik: [122, CY] }, lN: [phi - 180, phi - 180], lF: [phi - 180, phi - 180] };
  })();
  var bpFlyBack = { x: 92, y: 114, t: 100, h: 10, aN: { ik: [125, CY] }, aF: { ik: [122, CY] }, lN: { ik: [76, 124] }, lF: { ik: [73, 125] } };
  var bpJump = { x: 100, y: 80, t: 180, h: -4, aN: [135, 156], aF: [128, 150], lN: [2, -4], lF: [-2, -8] };
  var bpLand = { x: 100, y: 100, t: 168, h: 4, aN: [95, 110], aF: [85, 100], lN: { ik: [102, CY] }, lF: { ik: [99, CY] } };
  var bpRise = { x: 99, y: 101, t: 160, h: 6, aN: [105, 125], aF: [98, 118], lN: { ik: [102, CY] }, lF: { ik: [99, CY] } };
  A.burpees = {
    dur: 3, still: 0.69,
    pose: kf([[0, bpStand], [0.05, bpStand], [0.16, bpSquat, 'so'], [0.22, bpFlyBack, 'lin'], [0.28, bpPlank], [0.4, bpPlank],
      [0.46, bpFlyBack, 'lin'], [0.52, bpSquat], [0.555, bpSquat, 'si'], [0.625, bpRise, 'so'], [0.69, bpJump], [0.8, bpLand], [0.92, bpStand]])
  };

  /* --- jumping jacks (de face) --------------------------------------- */
  var jjC = { x: 120, y: 93, t: 180, aN: [9, 4], aF: [-9, -4], lN: [0, 0], lF: [0, 0] };
  var jjO = { x: 120, y: 95.8, t: 180, aN: [160, 192], aF: [-160, -192], lN: [20, 20], lF: [-20, -20] };
  A.jumping_jacks = {
    dur: 1.2, still: 0.5, view: 'front',
    pose: function (t, def) {
      var u = t < 0.5 ? io(t / 0.5) : io((1 - t) / 0.5);
      var s = lerpSpec(jjC, jjO, u, def);
      s.y -= 7 * Math.sin(Math.PI * u);
      return s;
    }
  };

  /* --- mountain climbers --------------------------------------------- */
  A.mountain_climbers = {
    dur: 1.8, still: 0.125,
    props: function (P) { mat(P, 40, 160); },
    pose: function (t) {
      var q = 2 * t;                                    // 2 cycles par boucle
      var sh = [127, 108.5], tt = 98, hip = fromSh(sh[0], sh[1], tt);
      hip[1] += 0.8 * Math.cos(4 * Math.PI * q);
      var back = [59, 135], fwd = [104, 131];
      var sN = 0.5 - 0.5 * Math.cos(2 * Math.PI * q), sF = 1 - sN;
      var pN = lerp2(back, fwd, sN), pF = lerp2(back, fwd, sF);
      pN[1] -= 5 * Math.sin(Math.PI * sN); pF[1] -= 5 * Math.sin(Math.PI * sF);
      return { x: hip[0], y: hip[1], t: angTo(hip, sh), h: 12,
        aN: { ik: [129, CY] }, aF: { ik: [125, CY] }, lN: { ik: pN }, lF: { ik: pF } };
    }
  };

  /* --- navette avec passage au sol --------------------------------- */
  var nvRunEnd = runSpec(96, 2.25, 162);
  var nvBrake = { x: 100, y: 99, t: 150, h: 10, aN: [60, 95], aF: [40, 80], lN: { ik: [108, CY] }, lF: [-20, -85] };
  var nvCrouch1 = { x: 104, y: 118, t: 100, h: 12, aN: { ik: [132, CY] }, aF: { ik: [129, CY] }, lN: { ik: [110, CY] }, lF: { ik: [106, CY] } };
  var nvFlyB = { x: 96, y: 116, t: 100, h: 10, aN: { ik: [132, CY] }, aF: { ik: [129, CY] }, lN: { ik: [86, 126] }, lF: { ik: [82, 127] } };
  var nvPlank = (function () {
    var an = [62, 134.5], phi = plankFrom(an, 75, 108.6), hip = along(an, phi, 46);
    return { x: hip[0], y: hip[1], t: phi, h: 10, aN: { ik: [132, CY] }, aF: { ik: [129, CY] }, lN: [phi - 180, phi - 180], lF: [phi - 180, phi - 180] };
  })();
  var nvProne = { x: 103, y: CY, t: 90, h: 14, aN: { ik: [125, CY] }, aF: { ik: [123, CY] }, lN: [-90, -90, -90], lF: [-91, -91, -92] };
  var nvCrouch2 = { x: 108, y: 118, t: 100, h: 12, aN: { ik: [132, CY] }, aF: { ik: [129, CY] }, lN: { ik: [114, CY] }, lF: { ik: [110, CY] } };
  var nvFlyF = { x: 100, y: 116, t: 100, h: 10, aN: { ik: [132, CY] }, aF: { ik: [129, CY] }, lN: { ik: [92, 126] }, lF: { ik: [88, 127] } };
  var nvStand = { x: 112, y: 93.1, t: 178, h: 0, aN: [20, 70], aF: [-10, 50], lN: { ik: [114, CY] }, lF: { ik: [110, CY] } };
  var nvKF = kf([[0.3, nvRunEnd], [0.33, nvBrake], [0.37, nvCrouch1, 'so'], [0.4, nvFlyB, 'lin'], [0.435, nvPlank], [0.48, nvProne], [0.55, nvProne],
    [0.6, nvPlank], [0.635, nvFlyF, 'lin'], [0.67, nvCrouch2, 'so'], [0.76, nvStand], [0.9, nvStand, 'lin'], [0.999, ext(nvStand, { o: 0 })]]);
  A.navette_plaquage = {
    dur: 3, still: 0.37,
    pose: function (t, def) {
      if (t < 0.3) {
        var s = t / 0.3;
        var r = runSpec(lerp(34, 96, s), 2.25 * s, 162);
        r.o = clamp(t / 0.04, 0, 1);
        return r;
      }
      return nvKF(t, def);
    }
  };

  /* --- se relever depuis le dos -------------------------------------- */
  var dbLie = { x: 110, y: CY, t: -90, h: 0, aN: [90, 90], aF: [92, 92], lN: [90, 90, 180], lF: [91, 91, 178] };
  var dbSit = { x: 110, y: CY, t: -160, h: 10, aN: [98, 112], aF: [92, 106], lN: { ik: [134, CY] }, lF: { ik: [131, CY] } };
  var dbCrouch = { x: 124, y: 117, t: -220, h: 14, aN: [60, 100], aF: [40, 90], lN: { ik: [136, CY] }, lF: { ik: [131, CY] } };
  var dbStand = { x: 134, y: 93.2, t: -180, h: 0, aN: [6, 14], aF: [-6, 2], lN: { ik: [136, CY] }, lF: { ik: [131, CY] } };
  A.debout = {
    dur: 3, still: 0.2,
    pose: kf([[0, dbLie], [0.06, dbLie, 'so'], [0.14, dbSit, 'lin'], [0.22, dbCrouch, 'so'], [0.32, dbStand], [0.5, dbStand], [0.64, dbCrouch], [0.76, dbSit], [0.9, dbLie]])
  };

  /* --- squat sur chaise ---------------------------------------------- */
  var sqTop = { x: 97.5, y: 93.5, t: 176, h: 0, aN: [82, 88], aF: [78, 84], lN: { ik: [100, CY] }, lF: { ik: [97, CY] } };
  var sqBot = { x: 80, y: 107.5, t: 140, h: 12, aN: [88, 92], aF: [84, 88], lN: { ik: [100, CY] }, lF: { ik: [97, CY] } };
  A.squat = {
    dur: 2.6, still: 0.5,
    props: function (P) {
      P.line(58, 112, 58, 76, { c: DIM, w: 3 });
      P.line(60, GY, 60, 112, { c: DIM, w: 3 });
      P.line(84, GY, 84, 112, { c: DIM, w: 3 });
      P.line(55, 112, 88, 112, { c: LITE, w: 3.5 });
    },
    pose: kf([[0, sqTop], [0.06, sqTop], [0.46, sqBot], [0.54, sqBot], [0.92, sqTop]])
  };

  /* --- fentes avant -------------------------------------------------- */
  var fnTop = { x: 86, y: 93.1, t: 180, h: 0, aN: { ik: [90, 92] }, aF: { ik: [87, 93] }, lN: { ik: [88, CY] }, lF: { ik: [85, CY] } };
  var fnLift = { x: 92, y: 95, t: 180, h: 0, aN: { ik: [96, 94] }, aF: { ik: [93, 95] }, lN: { ik: [110, 126] }, lF: { ik: [85, CY] } };
  var fnBot = { x: 104, y: 111, t: 180, h: 0, aN: { ik: [108, 110] }, aF: { ik: [105, 111] }, lN: { ik: [126, CY] }, lF: { ik: [85, 135] } };
  A.fentes = {
    dur: 2.8, still: 0.5,
    pose: kf([[0, fnTop], [0.06, fnTop], [0.2, fnLift, 'lin'], [0.42, fnBot], [0.56, fnBot], [0.74, fnLift, 'lin'], [0.88, fnTop]])
  };

  /* --- pont fessier -------------------------------------------------- */
  function bridge(t, oneLeg) {
    var k = kv([[0, 0], [0.08, 0], [0.32, 1], [0.66, 1], [0.9, 0]], t);
    var sh = [70, CY], al = lerp(90, 133, k) + 0.9 * k * Math.sin(6 * Math.PI * t), hip = along(sh, al, L.torso);
    var s = { x: hip[0], y: hip[1], t: al - 180, h: 0, aN: [90, 90], aF: [92, 92],
      lN: { ik: [126, CY] }, lF: { ik: [123, CY] } };
    if (oneLeg) { var la = lerp(150, al, k); s.lN = [la, la, la + 90]; }
    return s;
  }
  A.pont = { dur: 3, still: 0.5, props: function (P) { mat(P, 45, 150); }, pose: function (t) { return bridge(t, false); } };
  A.pont_une_jambe = { dur: 3, still: 0.5, props: function (P) { mat(P, 45, 150); }, pose: function (t) { return bridge(t, true); } };

  /* --- pas de crabe (de face, mini-elastique) ------------------------ */
  function stepTrack(c, ph) {          // pied qui avance par pas : position (en pas) + levee
    var q = c - ph, k = Math.floor(q), u = q - k;
    var e = u < 0.5 ? io(u / 0.5) : 1;
    return { x: k + e, lift: u < 0.5 ? Math.sin(Math.PI * u / 0.5) : 0 };
  }
  A.pas_crabe = {
    dur: 3, still: 0.0625, view: 'front',
    props: function (P) {
      var band = P.path('', { layer: 'ffront', c: LITE, w: 2.6 });
      return function (J) {
        var a = lerp2(J.hipF, J.lF.j, 0.74), b = lerp2(J.hipN, J.lN.j, 0.74);
        P.attr(band, { d: 'M' + f1(a[0]) + ' ' + f1(a[1] - 2.2) + 'L' + f1(b[0]) + ' ' + f1(b[1] - 2.2) +
          'M' + f1(a[0]) + ' ' + f1(a[1] + 2.2) + 'L' + f1(b[0]) + ' ' + f1(b[1] + 2.2) });
      };
    },
    pose: function (t) {
      // 2 pas vers la droite puis 2 pas vers la gauche ; le pied "meneur" s'ecarte, l'autre se rapproche
      var S = 22, W = 24, x0 = 86, c, lead, trail, nx, fx, nl, fl;
      if (t < 0.5) {
        c = 4 * t; lead = stepTrack(c, 0); trail = stepTrack(c, 0.5);
        nx = x0 + W + S * lead.x; nl = lead.lift; fx = x0 + S * trail.x; fl = trail.lift;
      } else {
        c = 4 * (t - 0.5); lead = stepTrack(c, 0); trail = stepTrack(c, 0.5);
        fx = x0 + 2 * S - S * lead.x; fl = lead.lift; nx = x0 + W + 2 * S - S * trail.x; nl = trail.lift;
      }
      var hx = (nx + fx) / 2, hy = 107 - 1.5 * Math.max(nl, fl);
      return { x: hx, y: hy, t: 180, h: 0,
        aN: { ik: [hx + 6.5, hy - 3], b: 1 }, aF: { ik: [hx - 6.5, hy - 3], b: -1 },
        lN: { ik: [nx, CY - 7 * nl] }, lF: { ik: [fx, CY - 7 * fl] } };
    }
  };

  /* --- mollets sur une marche ---------------------------------------- */
  var MO = { x1: 108, x2: 170, top: 112 };
  function moFloor(x) { return x >= MO.x1 && x <= MO.x2 ? MO.top - 3 : CY; }
  A.mollets = {
    dur: 2.2, still: 0.45, floor: moFloor, foot: 10,
    props: function (P) { stepBox(P, MO.x1, MO.x2, MO.top); },
    pose: function (t) {
      var k = kv([[0, 0], [0.08, 0], [0.42, 1], [0.54, 1], [0.92, 0]], t);
      var f = lerp(130, 44, k), toe = [114.5, MO.top - 3];
      var an = along(toe, f + 180, 10), la = -7, hip = along(an, la + 180, 46);
      return { x: hip[0], y: hip[1], t: 180, h: 0, aN: [6, 16], aF: [-4, 6],
        lN: [la, la, f], lF: [la - 1, la - 1, f] };
    }
  };

  /* --- dead bug ------------------------------------------------------ */
  var dbBase = { x: 116, y: CY, t: -90, h: 0, aN: [180, 180], aF: [178, 178], lN: [180, 90, 180], lF: [178, 88, 178] };
  var dbA = ext(dbBase, { aN: [262, 262], lF: [100, 100, 180] });
  var dbB = ext(dbBase, { aF: [262, 262], lN: [100, 100, 180] });
  A.dead_bug = {
    dur: 3, still: 0.3,
    props: function (P) { mat(P, 40, 185); },
    pose: kf([[0, dbBase], [0.06, dbBase], [0.24, dbA], [0.32, dbA], [0.48, dbBase], [0.56, dbBase], [0.74, dbB], [0.82, dbB], [0.98, dbBase]])
  };

  /* --- marche de l'ours ---------------------------------------------- */
  function gait(c, ph) {
    var q = c - ph, u = frac(q);
    var e = u < 0.5 ? io(u / 0.5) : 1;
    return { rel: e - u - 0.25, lift: u < 0.5 ? Math.sin(Math.PI * u / 0.5) : 0 };
  }
  A.marche_ours = {
    dur: 2.8, still: 0.12,
    pose: function (t) {
      var c = 2 * t, S = 28, x = 68 + S * c;
      var hip = [x, 111.4 + 0.8 * Math.cos(4 * Math.PI * c)], tt = 95;
      var gA = gait(c, 0), gB = gait(c, 0.5);
      var o = t < 0.05 ? t / 0.05 : (t > 0.93 ? (1 - t) / 0.07 : 1);
      var sh = along(hip, tt, L.torso);
      return { x: hip[0], y: hip[1], t: tt, h: 14, o: o,
        aN: { ik: [sh[0] + 1 + S * gA.rel, CY - 5 * gA.lift] },
        aF: { ik: [sh[0] - 2 + S * gB.rel, CY - 5 * gB.lift] },
        lN: { ik: [x - 22 + S * gB.rel, 133.5 - 5 * gB.lift] },
        lF: { ik: [x - 25 + S * gA.rel, 133.5 - 5 * gA.lift] } };
    }
  };

  /* --- flamant (equilibre sur un pied) ------------------------------- */
  A.flamant = {
    dur: 3, still: 0.1, chrono: true,
    pose: function (t) {
      var th = 2.6 * Math.sin(2 * Math.PI * t) + 1.2 * Math.sin(2 * Math.PI * 3 * t + 1);
      var an = [118, CY], hip = along(an, th + 180, 46);
      return { x: hip[0], y: hip[1], t: 180 + th * 0.6, h: -th * 0.5,
        lF: [th, th], lN: [92 + th, 2 + th, 55],
        aN: [100 - 4 * th, 104 - 4 * th], aF: [-100 - 4 * th, -96 - 4 * th] };
    }
  };

  /* --- chaise contre le mur ------------------------------------------ */
  A.chaise_mur = {
    dur: 3, still: 0.3, chrono: true,
    props: function (P) { wall(P, 58); },
    pose: function (t) {
      var b = 0.6 * Math.sin(4 * Math.PI * t), tr = 0.25 * Math.sin(50 * Math.PI * t);
      return { x: 64, y: 116, t: 176 + b * 0.5, h: -8, lN: [90 + tr, tr], lF: [89, -1],
        aN: [90 + b, 90 + b], aF: [87 + b, 87 + b] };
    }
  };

  /* --- alias --------------------------------------------------------- */
  A.circuit = A.burpees;
  A.intervalles_corde = A.corde;

  var LABELS = {
    suspension: 'Suspension à la barre', tractions: 'Tractions avec élastique',
    tirage_elastique: 'Tirage élastique à genoux', pompes: 'Pompes', pompes_genoux: 'Pompes sur les genoux',
    rowing: 'Rowing assis avec élastique', planche: 'Planche sur les avant-bras', superman: 'Superman',
    corde: 'Corde à sauter', corde_imaginaire: 'Corde à sauter imaginaire',
    saut_longueur: 'Saut en longueur sans élan', sauts_lateraux: 'Sauts latéraux par-dessus une ligne',
    skipping: 'Skipping', departs: 'Départ allongé puis sprint', montees_marche: 'Montées sur une marche',
    montees_genoux: 'Montées de genou explosives', burpees: 'Burpees', jumping_jacks: 'Jumping jacks',
    mountain_climbers: 'Mountain climbers', navette_plaquage: 'Navette avec passage au sol',
    debout: 'Se relever vite depuis le dos', squat: 'Squat jusqu’à la chaise', fentes: 'Fentes avant',
    pont: 'Pont fessier', pont_une_jambe: 'Pont fessier sur une jambe', pas_crabe: 'Pas de crabe avec élastique',
    mollets: 'Mollets sur une marche', dead_bug: 'Dead bug', marche_ours: 'Marche de l’ours',
    flamant: 'Équilibre du flamant', chaise_mur: 'Chaise contre le mur', circuit: 'Circuit',
    intervalles_corde: 'Intervalles à la corde'
  };

  /* ------------------------------------------------------------------ */
  /* Rendu SVG                                                           */
  /* ------------------------------------------------------------------ */
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function mk(tag, at, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) { if (Object.prototype.hasOwnProperty.call(at, k)) { e.setAttribute(k, at[k]); } }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function pd(pts) {
    var s = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (var i = 1; i < pts.length; i++) { s += 'L' + f1(pts[i][0]) + ' ' + f1(pts[i][1]); }
    return s;
  }
  function legD(root, lg) {
    var d = pd([root, lg.j, lg.e, lg.t]);
    return lg.h ? d + pd([lg.e, lg.h]) : d;
  }
  function hex(c) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim());
    if (!m) { return null; }
    var h = m[1];
    if (h.length === 3) { h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); }
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(a, b, k) {
    var x = hex(a), y = hex(b);
    if (!x || !y) { return null; }
    var r = [];
    for (var i = 0; i < 3; i++) { r.push(('0' + Math.round(lerp(x[i], y[i], k)).toString(16)).slice(-2)); }
    return '#' + r.join('');
  }

  function propsAPI(layers) {
    function st(o) {
      o = o || {};
      return { stroke: o.c || DIM, 'stroke-width': o.w || 2, fill: o.fill || 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    }
    function lay(o) { return layers[(o && o.layer) || 'back']; }
    return {
      line: function (x1, y1, x2, y2, o) { var a = st(o); a.x1 = x1; a.y1 = y1; a.x2 = x2; a.y2 = y2; return mk('line', a, lay(o)); },
      path: function (d, o) { var a = st(o); a.d = d; return mk('path', a, lay(o)); },
      circle: function (cx, cy, r, o) { var a = st(o); a.cx = cx; a.cy = cy; a.r = r; return mk('circle', a, lay(o)); },
      attr: function (el, at) { for (var k in at) { if (Object.prototype.hasOwnProperty.call(at, k)) { el.setAttribute(k, at[k]); } } }
    };
  }

  function build(def, key, opts) {
    var color = opts.color || '#3DFFB0';
    var farC = def.view === 'front' ? color : (mix(color, BG, 0.45) || color);
    var farOp = def.view !== 'front' && !hex(color) ? 0.55 : 1;
    var id = 'mcglow-' + (++uid) + '-' + Math.random().toString(36).slice(2, 7);
    var svg = mk('svg', { xmlns: NS, viewBox: '0 0 240 160', width: '100%', height: '100%',
      preserveAspectRatio: 'xMidYMid meet', role: 'img', focusable: 'false',
      'aria-label': opts.label || LABELS[key] || key });
    svg.style.display = 'block';
    var defs = mk('defs', {}, svg);
    var fl = mk('filter', { id: id, x: -20, y: -20, width: 280, height: 200, filterUnits: 'userSpaceOnUse' }, defs);
    mk('feGaussianBlur', { 'in': 'SourceGraphic', stdDeviation: 2.3, result: 'b' }, fl);
    var mg = mk('feMerge', {}, fl);
    mk('feMergeNode', { 'in': 'b' }, mg);
    mk('feMergeNode', { 'in': 'SourceGraphic' }, mg);

    var gBack = mk('g', {}, svg);
    var gMov = mk('g', {}, svg);
    var gFB = mk('g', {}, gMov);
    var gFig = mk('g', { filter: 'url(#' + id + ')', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gMov);
    var gFF = mk('g', {}, gMov);
    var gFront = mk('g', {}, svg);
    if (def.ground !== false) {
      mk('line', { x1: 6, y1: GY, x2: 234, y2: GY, stroke: DIM, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, gBack);
    }
    var parts = {
      aF: mk('path', { stroke: farC, 'stroke-width': 5.5, opacity: farOp }, gFig),
      lF: mk('path', { stroke: farC, 'stroke-width': 6, opacity: farOp }, gFig),
      torso: mk('path', { stroke: color, 'stroke-width': 6.5 }, gFig),
      head: mk('circle', { r: L.hr, stroke: color, 'stroke-width': 4.5, fill: color, 'fill-opacity': 0.18 }, gFig),
      lN: mk('path', { stroke: color, 'stroke-width': 6 }, gFig),
      aN: mk('path', { stroke: color, 'stroke-width': 5.5 }, gFig)
    };
    var P = propsAPI({ back: gBack, front: gFront, fback: gFB, ffront: gFF });
    var upd = def.props ? def.props(P, color) : null;
    var chrono = def.chrono ? chronoFactory(gFront, color) : null;

    function draw(J) {
      parts.aF.setAttribute('d', pd([J.shF, J.aF.j, J.aF.e]));
      parts.lF.setAttribute('d', legD(J.hipF, J.lF));
      parts.lN.setAttribute('d', legD(J.hipN, J.lN));
      parts.aN.setAttribute('d', pd([J.shN, J.aN.j, J.aN.e]));
      parts.torso.setAttribute('d', J.front ?
        pd([J.hip, J.nk]) + pd([J.hipF, J.hipN]) + pd([J.shF, J.shN]) : pd([J.hip, J.nk]));
      parts.head.setAttribute('cx', f1(J.head[0]));
      parts.head.setAttribute('cy', f1(J.head[1]));
      gMov.setAttribute('opacity', f1(clamp(J.o, 0, 1)));
    }
    function render(t) {
      t = frac(t);
      var J = solve(def.pose(t, def), def);
      draw(J);
      if (upd) { upd(J, t); }
      if (chrono) { chrono(t); }
      return J;
    }
    return { svg: svg, key: key, render: render };
  }

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  function noop() {}
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function isConnected(n) {
    if (typeof n.isConnected === 'boolean') { return n.isConnected; }
    return !!(n.ownerDocument && n.ownerDocument.documentElement.contains(n));
  }
  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function mount(container, key, opts) {
    opts = opts || {};
    if (!container) { return { stop: noop }; }
    if (container.__mcStop) { container.__mcStop(); }
    container.__mcInst = null;
    while (container.firstChild) { container.removeChild(container.firstChild); }
    var def = A[key];
    if (!def) { return { stop: noop }; }
    var inst = build(def, key, opts);
    container.appendChild(inst.svg);
    container.__mcInst = inst;

    var raf = 0, stopped = false, t0 = now(), born = t0, seen = false, vis = true, io = null;
    function stop() {
      stopped = true;
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      if (io) { io.disconnect(); io = null; }
      if (container.__mcStop === stop) { container.__mcStop = null; }
    }
    container.__mcStop = stop;
    var still = opts.paused || reducedMotion() || !window.requestAnimationFrame;
    inst.render(still ? (opts.t != null ? opts.t : def.still) : 0);
    if (still) { return { stop: stop }; }

    if (window.IntersectionObserver) {
      try {
        io = new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; });
        io.observe(inst.svg);
      } catch (e) { io = null; }
    }
    function frame(ts) {
      raf = 0;
      if (stopped) { return; }
      if (!isConnected(inst.svg)) {
        // retire du DOM : on s'arrete (petite tolerance si le conteneur n'a pas encore ete insere)
        if (seen || ts - born > 2000) { stop(); return; }
      } else {
        seen = true;
        if (vis) { inst.render((ts - t0) / 1000 / def.dur); }
      }
      raf = window.requestAnimationFrame(frame);
    }
    raf = window.requestAnimationFrame(frame);
    return { stop: stop };
  }

  function exportJ(J) {
    function p(v) { return [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100]; }
    function lm(l) { return { root: p(l.r), mid: p(l.j), end: p(l.e), a: [l.a[0], l.a[1]], miss: l.miss, toe: l.t ? p(l.t) : null, f: l.f }; }
    return { front: J.front, o: J.o, pen: J.pen, hip: p(J.hip), sh: p(J.sh), nk: p(J.nk), head: p(J.head),
      aN: lm(J.aN), aF: lm(J.aF), lN: lm(J.lN), lF: lm(J.lF) };
  }

  MC.anim = {
    has: function (key) { return Object.prototype.hasOwnProperty.call(A, key); },
    mount: mount,
    keys: function () { var r = [], k; for (k in A) { if (Object.prototype.hasOwnProperty.call(A, k)) { r.push(k); } } return r; },
    _renderAt: function (container, key, t) {
      if (!container || !A[key]) { return null; }
      if (container.__mcStop) { container.__mcStop(); }
      var inst = container.__mcInst;
      if (!inst || inst.key !== key || inst.svg.parentNode !== container) {
        mount(container, key, { paused: true, t: t });
        inst = container.__mcInst;
      }
      return exportJ(inst.render(t));
    },
    _pose: function (key, t) {
      var def = A[key];
      if (!def) { return null; }
      var J = exportJ(solve(def.pose(frac(t), def), def));
      J.floorAt = function (x) { return (def.floor || floor0)(x); };
      return J;
    },
    _meta: function (key) {
      var d = A[key];
      return d ? { dur: d.dur, still: d.still, view: d.view || 'side', chrono: !!d.chrono, hasFloor: !!d.floor, exits: !!d.exits } : null;
    },
    _floor: function (key, x) { var d = A[key]; return d ? (d.floor || floor0)(x) : CY; }
  };
})();
