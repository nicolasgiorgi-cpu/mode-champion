/* =========================================================
   Mode champion · M12 — règles du jeu (étoiles, XP, grades,
   badges, niveaux, ligues). Tout est recalculé à partir des
   séances et des records : rien n'est stocké en double.
   ========================================================= */
window.MC = window.MC || {};

MC.logic = (function () {
  var C = MC.CONTENT, CFG = MC.CONFIG;

  // ---------- Dates (jour local, format AAAA-MM-JJ) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  var fakeToday = null;
  function today() { return fakeToday || iso(new Date()); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function dow(s) { return (parse(s).getDay() + 6) % 7; } // 0 = lundi … 6 = dimanche
  function monday(s) { return addDays(s, -dow(s)); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function dayType(s) { return C.SEMAINE[dow(s)]; }

  // colonne du tableau (0..5) pour un jour de la semaine (vendredi = -1)
  var SLOT_OF_DOW = [0, 1, 2, 3, -1, 4, 5];
  function slotOf(seance) {
    if (seance.type === 'club') return dow(seance.date) === 2 ? 2 : 4;
    var j = C.JOURS[seance.type];
    return j ? j.slot : -1;
  }
  function isMaison(type) { return !!(C.JOURS[type] && C.JOURS[type].maison); }

  // ---------- Index par semaine ----------
  function weeks(seances) {
    var W = {};
    (seances || []).forEach(function (s) {
      var sl = slotOf(s);
      if (sl < 0) return;
      var m = monday(s.date);
      var w = W[m] || (W[m] = { mon: m, slots: [[], [], [], [], [], []] });
      w.slots[sl].push(s);
    });
    return W;
  }
  function weekInfo(W, mon) {
    var w = W[mon];
    var filled = [false, false, false, false, false, false], n = 0;
    if (w) for (var i = 0; i < 6; i++) if (w.slots[i].length) { filled[i] = true; n++; }
    return { mon: mon, filled: filled, stars: n, bonus: n === 6, slots: w ? w.slots : [[], [], [], [], [], []] };
  }

  // ---------- Série (étoiles d'affilée, le vendredi ne compte pas) ----------
  function streaks(W, seances) {
    var t = today();
    function filledOn(d) { var sl = SLOT_OF_DOW[dow(d)]; if (sl < 0) return null; var w = W[monday(d)]; return !!(w && w.slots[sl].length); }
    var cur = 0, d = t, first = true;
    for (var i = 0; i < 400; i++) {
      var f = filledOn(d);
      if (f === null) { d = addDays(d, -1); continue; }
      if (f) cur++;
      else if (!first) break;
      first = false;
      d = addDays(d, -1);
    }
    // meilleure série
    var best = 0, run = 0;
    var dates = (seances || []).map(function (s) { return s.date; }).sort();
    if (dates.length) {
      d = dates[0];
      var guard = 0;
      while (d <= t && guard++ < 800) {
        var f2 = filledOn(d);
        if (f2 === true) { run++; if (run > best) best = run; }
        else if (f2 === false && d !== t) run = 0;
        d = addDays(d, 1);
      }
    }
    return { cur: cur, best: Math.max(best, cur) };
  }

  // ---------- Cycles ----------
  function cycleAt(date) {
    var list = CFG.CYCLES, c = null;
    for (var i = 0; i < list.length; i++) if (list[i].debut <= date) c = { n: list[i].n, debut: list[i].debut, i: i };
    if (!c) c = { n: list[0].n, debut: list[0].debut, i: 0 };
    var next = list[c.i + 1];
    c.nbSemaines = next ? Math.max(8, Math.round(daysBetween(c.debut, next.debut) / 7)) : 8;
    c.fin = addDays(c.debut, c.nbSemaines * 7 - 1);
    c.semaine = Math.min(c.nbSemaines, Math.floor(daysBetween(c.debut, date) / 7) + 1);
    return c;
  }
  function board(W, cycle) {
    var t = today(), rows = [], total = 0;
    for (var w = 0; w < cycle.nbSemaines; w++) {
      var mon = addDays(cycle.debut, 7 * w), wi = weekInfo(W, mon), cells = [];
      for (var d = 0; d < 7; d++) {
        var date = addDays(mon, d), type = C.SEMAINE[d], sl = SLOT_OF_DOW[d], st;
        if (sl < 0) st = 'rest';
        else if (wi.filled[sl]) st = 'done';
        else if (date === t) st = 'today';
        else if (date < t) st = 'missed';
        else st = 'todo';
        cells.push({ date: date, type: type, st: st, color: C.JOURS[type].color });
      }
      var stars = wi.stars + (wi.bonus ? 1 : 0);
      total += stars;
      rows.push({ n: w + 1, mon: mon, cells: cells, stars: stars, bonus: wi.bonus, current: t >= mon && t <= addDays(mon, 6) });
    }
    return { rows: rows, total: total, max: cycle.nbSemaines * 7 };
  }

  // ---------- Records ----------
  function testDef(id) {
    for (var i = 0; i < C.TESTS.length; i++) if (C.TESTS[i].id === id) return C.TESTS[i];
    return C.DEFI_TESTS[id] || null;
  }
  function isSm(r) { return !!(r && r.extra && r.extra.sm); }
  function better(test, a, b) { // a meilleur que b ?
    if (b === null || b === undefined) return true;
    return test && test.moinsMieux ? a < b : a > b;
  }
  // meilleurs records par test (et par mode SM / normal)
  function bests(records, opts) {
    opts = opts || {};
    var out = {};
    (records || []).forEach(function (r) {
      if (opts.confirmed && r.statut !== 'ok') return;
      if (r.statut === 'refuse') return;
      var t = testDef(r.test), key = r.test + (isSm(r) ? ':sm' : '');
      if (!out[key] || better(t, r.valeur, out[key].valeur)) out[key] = r;
    });
    return out;
  }
  function bilanRecords(records, bilan) {
    var out = {};
    (records || []).forEach(function (r) { if (String(r.bilan) === String(bilan) && r.statut !== 'refuse') out[r.test] = r; });
    return out;
  }
  function currentBilan() {
    var t = today(), list = CFG.BILANS, cur = list[0];
    for (var i = 0; i < list.length; i++) if (addDays(list[i].date, -10) <= t) cur = list[i];
    return cur;
  }
  function nextBilan() {
    var t = today(), list = CFG.BILANS;
    for (var i = 0; i < list.length; i++) if (list[i].date >= t) return list[i];
    return null;
  }

  // ---------- Niveau à partir d'un résultat de test ----------
  function levelFromTest(testId, valeur, extra) {
    var t = testDef(testId);
    if (!t || t.cle === undefined) return null;
    var v = Number(valeur);
    if (!isFinite(v)) return null;
    if (t.special === 'tract') {
      if (extra && extra.sm) { var s = t.sm.seuils; return v <= s[0] ? 1 : v <= s[1] ? 2 : 3; }
      if (v >= 5) return 3;
      var el = extra && extra.elastique, nb = extra && Number(extra.nbElastique);
      if (el === 'fin' || el === 'moyen') return 3;
      if (el === 'fort' && nb >= 5) return 2;
      return 1;
    }
    if (!t.seuils) return null;
    if (t.moinsMieux) return v > t.seuils[0] ? 1 : v >= t.seuils[1] ? 2 : 3;
    return v <= t.seuils[0] ? 1 : v <= t.seuils[1] ? 2 : 3;
  }
  // niveaux proposés par un bilan : { cle: niveau }
  function levelsFromBilan(valeurs, current) {
    var out = {};
    valeurs.forEach(function (v) {
      var t = testDef(v.test);
      if (!t || !t.cle || !t.seuils && !t.special) return;
      var n = levelFromTest(v.test, v.valeur, v.extra);
      if (!n) return;
      var cur = (current && current[t.cle]) || 1;
      if (cur === 4 && n === 3) n = 4; // le N4 ne vient pas du bilan : on le garde
      out[t.cle] = n;
    });
    return out;
  }

  // ---------- Ressenti par clé de niveau dans une séance ----------
  function feelFor(seance, cle, niveau) {
    var d = seance.details || {};
    if (seance.mode === 'guidee' && d.exos) {
      var fs = [];
      d.exos.forEach(function (e) {
        var ex = C.EXOS[e.id];
        if (!ex || ex.cle !== cle || Number(e.niveau) !== niveau || !e.ressenti) return;
        fs.push(e.ressenti);
      });
      if (!fs.length) return null;
      if (fs.indexOf('dur') >= 0) return 'dur';
      if (fs.every(function (f) { return f === 'facile'; })) return 'facile';
      return 'bien';
    }
    if (seance.mode === 'rapide' && seance.ressenti) {
      var j = C.JOURS[seance.type];
      if (!j || !j.exos) return null;
      var has = j.exos.some(function (id) { return C.EXOS[id].cle === cle; });
      if (!has) return null;
      if (d.niveau && Number(d.niveau) !== niveau) return null;
      return seance.ressenti;
    }
    return null;
  }
  // propositions de changement de niveau
  function proposals(data) {
    var niv = (data.joueur && data.joueur.niveaux) || {};
    var out = [];
    Object.keys(C.CLES).forEach(function (cle) {
      if (cle === 'flamant') return;
      var cur = niv[cle] || 1, last = '';
      (data.journal || []).forEach(function (j) {
        if (!j.data) return;
        if ((j.type === 'niveau' || j.type === 'niveau_refus') && j.data.cle === cle && j.cree > last) last = j.cree;
        if (j.type === 'bilan_niveaux' && j.cree > last) last = j.cree;
      });
      var ses = (data.seances || []).filter(function (s) { return s.cree > last; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; });
      var feels = [];
      for (var i = 0; i < ses.length && feels.length < 2; i++) {
        var f = feelFor(ses[i], cle, cur);
        if (f) feels.push(f);
      }
      if (feels.length < 2) return;
      if (feels[0] === 'facile' && feels[1] === 'facile' && cur < 4) out.push({ cle: cle, de: cur, a: cur + 1, sens: 'up' });
      if (feels[0] === 'dur' && feels[1] === 'dur' && cur > 1) out.push({ cle: cle, de: cur, a: cur - 1, sens: 'down' });
    });
    return out;
  }

  // ---------- Badges ----------
  // Champion : la 1re séance où un exercice a été réussi en niveau 4 (version complète, pas la mini)
  function n4Exploit(data) {
    var hit = null;
    (data.seances || []).forEach(function (s) {
      var d = s.details || {}, ok = false;
      var enMini = !!(d.options && d.options.mini);
      if (s.mode === 'guidee' && d.exos) ok = d.exos.some(function (e) { return Number(e.niveau) === 4 && e.fait && !(enMini && e.mini); });
      else if (isMaison(s.type) && Number(d.niveau) === 4) ok = true;
      if (ok && (!hit || s.date < hit.date)) hit = s;
    });
    return hit;
  }
  function badgesOf(data, W, st) {
    var recs = (data.records || []).filter(function (r) { return r.statut === 'ok'; });
    var res = {};
    function anyRec(test, cond) {
      var hit = null;
      recs.forEach(function (r) { if (r.test === test && cond(r) && (!hit || r.date < hit.date)) hit = r; });
      return hit;
    }
    C.BADGES.forEach(function (b) {
      var ok = null;
      if (b.id === 'accroche') ok = anyRec('susp', function (r) { return r.valeur >= b.seuil; });
      else if (b.id === 'cros') ok = anyRec('tract', function (r) { return isSm(r) ? r.valeur >= b.seuilSm : r.valeur >= b.seuil; });
      else if (b.id === 'capuozzo') ok = anyRec('corde', function (r) { return r.valeur >= b.seuil; });
      else if (b.id === 'roc') ok = anyRec('planche', function (r) { return r.valeur >= b.seuil; });
      else if (b.id === 'flamant') ok = anyRec('flamant', function (r) { return r.valeur >= b.seuil; });
      else if (b.id === 'meafou') ok = anyRec('squats_affilee', function (r) { return r.valeur >= b.seuil; }) || anyRec('squats', function (r) { return r.valeur >= b.seuil; });
      else if (b.id === 'dupont') {
        var nav = recs.filter(function (r) { return r.test === 'navette'; }).sort(function (a, c) { return a.date < c.date ? -1 : a.date > c.date ? 1 : (a.cree < c.cree ? -1 : 1); });
        if (nav.length >= 2) { var f = nav[0].valeur; for (var i = 1; i < nav.length; i++) if (nav[i].valeur < f) { ok = nav[i]; break; } }
      } else if (b.id === 'champion') {
        ok = n4Exploit(data);
      } else if (b.paliers) {
        // nombre de jours différents avec une séance de ce type
        var jours = {}, dates = [];
        (data.seances || []).forEach(function (s) { if (s.type === b.jour && !jours[s.date]) { jours[s.date] = 1; dates.push(s.date); } });
        dates.sort();
        var n = dates.length, tier = 0;
        b.paliers.forEach(function (p, i) { if (n >= p) tier = i + 1; });
        var nxt = b.paliers[tier] || null;
        res[b.id] = {
          earned: tier > 0, tier: tier, count: n, date: tier ? dates[b.paliers[tier - 1] - 1] : '',
          next: nxt, prog: nxt ? Math.min(n, nxt) + ' / ' + nxt : n + ' séances'
        };
        return;
      } else if (b.id === 'legende') {
        CFG.CYCLES.forEach(function (c) { var cy = cycleAt(c.debut); if (board(W, cy).total >= 56) ok = { date: c.debut }; });
      } else if (b.id === 'premiere') { if (st.totalStars >= 1) ok = { date: st.firstDate }; }
      else if (b.id === 'parfaite') { if (st.perfectWeeks >= 1) ok = { date: st.firstPerfect }; }
      else if (b.id === 'serie7') { if (st.bestStreak >= 7) ok = { date: '' }; }
      else if (b.id === 'fidele') { if (st.maison >= 25) ok = { date: '' }; }
      res[b.id] = ok ? { earned: true, tier: 1, date: ok.date || '' } : { earned: false, tier: 0 };
    });
    // progression pour les badges de régularité
    res.serie7.prog = Math.min(st.bestStreak, 7) + ' / 7';
    res.fidele.prog = Math.min(st.maison, 25) + ' / 25';
    return res;
  }

  // ---------- XP et grades ----------
  function gradeOf(xp) {
    var g = 0;
    for (var i = 0; i < C.GRADES.length; i++) if (xp >= C.GRADES[i].xp) g = i;
    var cur = C.GRADES[g], nxt = C.GRADES[g + 1] || null;
    return { i: g, nom: cur.nom, xp: cur.xp, next: nxt, pct: nxt ? Math.min(100, Math.round((xp - cur.xp) / (nxt.xp - cur.xp) * 100)) : 100 };
  }

  // ---------- Tout le profil d'un joueur ----------
  function compute(data) {
    var X = C.XP, seances = data.seances || [], W = weeks(seances);
    var xp = 0, totalStars = 0, perfectWeeks = 0, maison = 0, firstDate = '', firstPerfect = '';
    Object.keys(W).sort().forEach(function (mon) {
      var wi = weekInfo(W, mon);
      for (var i = 0; i < 6; i++) {
        var list = wi.slots[i];
        if (!list.length) continue;
        var hasHome = list.some(function (s) { return isMaison(s.type); });
        var hasClub = list.some(function (s) { return s.type === 'club'; });
        if (i <= 3 && hasHome) { xp += X.seance; maison++; }
        if ((i === 2 || i === 4) && hasClub) xp += X.club;
        if (i === 5) xp += X.recup;
        var d0 = list.map(function (s) { return s.date; }).sort()[0];
        if (!firstDate || d0 < firstDate) firstDate = d0;
      }
      totalStars += wi.stars + (wi.bonus ? 1 : 0);
      if (wi.bonus) { xp += X.bonus; perfectWeeks++; if (!firstPerfect) firstPerfect = addDays(mon, 6); }
    });
    // niveaux montés
    var ups = {};
    (data.journal || []).forEach(function (j) { if (j.type === 'niveau' && j.data && j.data.a > j.data.de && !ups[j.data.cle + j.data.a]) { ups[j.data.cle + j.data.a] = 1; xp += X.niveau; } });
    // records battus (confirmés)
    var recOk = (data.records || []).filter(function (r) { return r.statut === 'ok'; }).sort(function (a, b) { return (a.date + a.cree) < (b.date + b.cree) ? -1 : 1; });
    var best = {}, recordsBattus = 0;
    recOk.forEach(function (r) {
      var k = r.test + (isSm(r) ? ':sm' : ''), t = testDef(r.test);
      if (best[k] !== undefined && better(t, r.valeur, best[k])) { xp += X.record; recordsBattus++; }
      if (best[k] === undefined || better(t, r.valeur, best[k])) best[k] = r.valeur;
    });
    var sk = streaks(W, seances);
    var st = { totalStars: totalStars, perfectWeeks: perfectWeeks, maison: maison, bestStreak: sk.best, firstDate: firstDate, firstPerfect: firstPerfect };
    var badges = badgesOf(data, W, st);
    var nbBadges = 0, nbPaliers = 0;
    Object.keys(badges).forEach(function (k) { if (badges[k].earned) { nbBadges++; nbPaliers += badges[k].tier || 1; } });
    xp += nbPaliers * X.badge; // chaque palier (bronze, argent, or) rapporte comme un badge
    var cy = cycleAt(today());
    var bd = board(W, cy);
    var thisWeek = weekInfo(W, monday(today()));
    return {
      W: W, xp: xp, grade: gradeOf(xp), stars: totalStars, streak: sk.cur, bestStreak: sk.best, maison: maison,
      perfectWeeks: perfectWeeks, badges: badges, nbBadges: nbBadges, recordsBattus: recordsBattus,
      cycle: cy, board: bd, week: thisWeek, niveaux: (data.joueur && data.joueur.niveaux) || {},
      bests: bests(data.records, {}), bestsOk: bests(data.records, { confirmed: true }),
      proposals: proposals(data), seancesCount: seances.length
    };
  }
  function niveau(data, cle) { return ((data.joueur && data.joueur.niveaux) || {})[cle] || 1; }
  // niveau « principal » d'une séance (le plus fréquent parmi ses exercices)
  function dayLevel(niveaux, type) {
    var j = C.JOURS[type];
    if (!j || !j.exos) return 1;
    var count = {}, bestN = 1, bestC = 0;
    j.exos.forEach(function (id) { var n = niveaux[C.EXOS[id].cle] || 1; count[n] = (count[n] || 0) + 1; if (count[n] > bestC || (count[n] === bestC && n > bestN)) { bestC = count[n]; bestN = n; } });
    return bestN;
  }

  // ---------- Classement par ligue ----------
  function league(L, meId, testId, mode) {
    var t = testDef(testId), cle = t.cle, me = null;
    L.joueurs.forEach(function (p) { if (p.id === meId) me = p; });
    var mySm = !!(t.sm && me && me.materiel === 'mini');
    var lv = function (p) { return (p.niveaux && p.niveaux[cle]) || 1; };
    var myLv = me ? lv(me) : 1;
    // valeurs par joueur
    var vals = {};
    L.records.forEach(function (r) {
      if (r.test !== testId || r.statut !== 'ok') return;
      if (t.sm && isSm(r) !== mySm) return;
      (vals[r.joueurId] = vals[r.joueurId] || []).push(r);
    });
    var rows = [];
    L.joueurs.forEach(function (p) {
      var rs = vals[p.id];
      if (!rs || !rs.length) return;
      rs.sort(function (a, b) { return (a.date + a.cree) < (b.date + b.cree) ? -1 : 1; });
      var first = rs[0].valeur, b = null;
      rs.forEach(function (r) { if (b === null || better(t, r.valeur, b)) b = r.valeur; });
      var prog = rs.length >= 2 ? (t.moinsMieux ? first - b : b - first) : null;
      rows.push({ p: p, lv: lv(p), best: b, prog: prog, n: rs.length });
    });
    // ligue : même niveau, élargie aux niveaux voisins si trop peu de joueurs
    var lo = myLv, hi = myLv, min = CFG.LIGUE_MIN || 5;
    function inLeague(r) { return r.lv >= lo && r.lv <= hi; }
    var guard = 0;
    while (rows.filter(inLeague).length < min && (lo > 1 || hi < 4) && guard++ < 6) {
      if (lo > 1 && (guard % 2 === 1 || hi >= 4)) lo--; else if (hi < 4) hi++; else lo--;
    }
    var list = rows.filter(inLeague);
    if (mode === 'prog') {
      list = list.filter(function (r) { return r.prog !== null; });
      list.sort(function (a, b) { return b.prog - a.prog; });
    } else {
      list.sort(function (a, b) { return t.moinsMieux ? a.best - b.best : b.best - a.best; });
    }
    var rank = 0, prev = null;
    list.forEach(function (r, i) { var v = mode === 'prog' ? r.prog : r.best; if (v !== prev) rank = i + 1; prev = v; r.rank = rank; });
    return { lo: lo, hi: hi, myLv: myLv, rows: list, sm: mySm, test: t };
  }

  return {
    today: today, addDays: addDays, dow: dow, monday: monday, daysBetween: daysBetween, dayType: dayType, iso: iso,
    slotOf: slotOf, weeks: weeks, weekInfo: weekInfo, cycleAt: cycleAt, board: board,
    testDef: testDef, isSm: isSm, better: better, bests: bests, bilanRecords: bilanRecords, currentBilan: currentBilan, nextBilan: nextBilan,
    levelFromTest: levelFromTest, levelsFromBilan: levelsFromBilan, proposals: proposals, compute: compute, gradeOf: gradeOf,
    niveau: niveau, dayLevel: dayLevel, league: league,
    _setToday: function (d) { fakeToday = d; }
  };
})();
