/* =========================================================
   Mode champion · M12 — MISSIONS SPÉCIALES
   Une mission = une chose à faire une seule fois dans l'appli, avec une récompense
   (XP.mission + son badge, voir content.js). Elle s'affiche en haut de « Ma semaine »
   tant qu'elle n'est pas faite.
   1re mission : « Prépare le jeu à 10 » = choisir ses postes (cartes + test « Aide-moi à choisir »,
   repris du site « Choisis ton poste »), puis ses copains (secret : seuls les éducs les voient).
   ========================================================= */
window.MC = window.MC || {};

MC.MISSIONS = [
  {
    id: 'jeu10', titre: 'Prépare le jeu à 10', debut: '2026-10-13', fin: '2026-11-02', badge: 'jeu10',
    texte: 'Choisis ton poste et dis aux éducs avec qui tu aimes jouer.'
  }
];

MC.missions = (function () {
  var POSTES = MC.POSTES || [];
  var LABELS = ['Puissance', 'Vitesse', 'Mains', 'Plaquage', 'Vision', 'Jeu au pied'];
  function poste(id) { for (var i = 0; i < POSTES.length; i++) if (POSTES[i].id === id) return POSTES[i]; return null; }
  function def(id) { for (var i = 0; i < MC.MISSIONS.length; i++) if (MC.MISSIONS[i].id === id) return MC.MISSIONS[i]; return null; }
  // la ligne de mission d'un joueur (données du serveur), ou null
  function of(me, id) {
    var l = (me && me.missions) || [];
    for (var i = 0; i < l.length; i++) if (l[i].mission === id) return l[i];
    return null;
  }
  // missions affichées : commencées (date de début passée) et pas encore faites
  function pending(me) {
    var t = MC.logic.today();
    return MC.MISSIONS.filter(function (M) { var m = of(me, M.id); return t >= M.debut && !(m && m.faite); });
  }
  function etat(me, id) {
    var m = of(me, id), r = (m && m.reponses) || {};
    return {
      m: m, faite: !!(m && m.faite),
      postes: (r.postes || []).filter(poste), copains: r.copains || [], copainsFait: !!r.copainsFait,
      quiz: r.quiz || null, quizTop: r.quizTop || null, quizResume: r.quizResume || '', source: (m && m.source) || ''
    };
  }

  // ---------- test « Aide-moi à choisir » (repris tel quel du site « Choisis ton poste ») ----------
  // chaque réponse donne des points aux postes (w) ; « why » s'affiche dans le résultat
  var P = 'pilier', T = 'talonneur', L = 'troisieme-ligne', N = 'demi-de-melee', O = 'ouvreur', C = 'centre', A = 'ailier';
  function W() { var o = {}; for (var i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1]; return o; }
  var QUIZ = [
    { q: 'Sur le terrain, ce que tu préfères…', k: 'Préfère', opts: [
      { t: 'Pousser et aller au contact', i: 'belier', w: W(P, 3, T, 2, L, 1), why: 'le contact' },
      { t: 'Plaquer et récupérer le ballon', i: 'griffe', w: W(L, 3, C, 2, T, 1), why: 'plaquer et récupérer' },
      { t: 'Courir vite et marquer des essais', i: 'turbo', w: W(A, 3, C, 1, T, 1), why: 'courir et marquer' },
      { t: 'Faire des passes, toucher plein de ballons', i: 'eclair', w: W(N, 3, O, 1, C, 1), why: 'les passes' },
      { t: 'Taper au pied', i: 'pied', w: W(O, 3, N, 1), why: 'le jeu au pied' },
      { t: 'Foncer pour percer la défense', i: 'perce', w: W(C, 3, L, 1, P, 1), why: 'percer la défense' }
    ] },
    { q: 'Ton point fort ?', k: 'Point fort', opts: [
      { t: 'Je suis costaud, dur à faire tomber', i: 'bouclier', w: W(P, 3, C, 1, T, 1, L, 1), why: 'ton côté costaud' },
      { t: 'Je suis très rapide', i: 'turbo', w: W(A, 3, N, 1, T, 1), why: 'ta vitesse' },
      { t: 'J\'ai de l\'énergie à revendre', i: 'radar', w: W(L, 3, N, 2, T, 1), why: 'ton énergie' },
      { t: 'J\'esquive et je feinte', i: 'feinte', w: W(A, 2, O, 2, N, 1, C, 1), why: 'tes feintes' },
      { t: 'J\'ai des mains très adroites', i: 'aimant', w: W(N, 2, T, 2, O, 1, C, 1), why: 'tes mains adroites' }
    ] },
    { q: 'En défense, ton truc c\'est…', k: 'En défense', opts: [
      { t: 'Plaquer fort, même les plus grands', i: 'bouclier', w: W(C, 3, L, 2, P, 1), why: 'les gros plaquages' },
      { t: 'Être le premier sur le ballon au sol', i: 'aimant', w: W(L, 3, T, 2, N, 1), why: 'gratter les ballons' },
      { t: 'Tenir le bloc avec les copains (mêlée, maul)', i: 'colonne', w: W(P, 3, T, 2, L, 1), why: 'tenir le bloc' },
      { t: 'Rattraper celui qui s\'échappe', i: 'turbo', w: W(A, 3, O, 1, N, 1), why: 'rattraper les échappés' }
    ] },
    { q: 'Ballon en main, tu…', k: 'Ballon en main, tu', opts: [
      { t: 'Fonces dans le tas', i: 'belier', w: W(P, 2, C, 2, L, 1, T, 1), why: 'foncer dans le tas' },
      { t: 'Cherches l\'espace et sprintes', i: 'turbo', w: W(A, 3, C, 1), why: 'sprinter dans l\'espace' },
      { t: 'Fais la passe au bon moment', i: 'eclair', w: W(N, 2, O, 2, C, 1), why: 'la passe au bon moment' },
      { t: 'Tapes au pied pour gagner du terrain', i: 'pied', w: W(O, 3, N, 1), why: 'gagner du terrain au pied' }
    ] },
    { q: 'Dans l\'équipe, tu…', k: 'Dans l\'équipe, tu', opts: [
      { t: 'Parles et organises le jeu', i: 'oeil', w: W(O, 3, N, 2), why: 'organiser le jeu' },
      { t: 'Ne lâches jamais rien', i: 'colonne', w: W(P, 2, L, 2, T, 1), why: 'ne rien lâcher' },
      { t: 'Finis les actions et marques', i: 'essai', w: W(A, 3, C, 1), why: 'finir les actions' },
      { t: 'Aimes les gestes précis (lancer en touche, tir au but)', i: 'cible', w: W(T, 3, O, 2), why: 'les gestes précis' },
      { t: 'Veux toujours être au cœur de l\'action', i: 'radar', w: W(T, 2, N, 2, L, 1), why: 'être au cœur de l\'action' }
    ] }
  ];
  var QMAX = 2; // réponses possibles par question

  function quizResults(ans) {
    var res = POSTES.map(function (p, idx) {
      var raw = 0, ideal = 0, whys = [];
      QUIZ.forEach(function (Q, k) {
        var best = 0, sel = (ans && ans[k]) || [];
        Q.opts.forEach(function (o, j) {
          var w = o.w[p.id] || 0;
          if (w > best) best = w;
          if (w && sel.indexOf(j) >= 0) { raw += w; whys.push({ t: o.why, w: w }); }
        });
        ideal += best;
      });
      whys.sort(function (a, b) { return b.w - a.w; });
      return { p: p, idx: idx, raw: raw, pct: ideal ? Math.min(100, Math.round(100 * raw / ideal)) : 0, whys: whys.slice(0, 3).map(function (x) { return x.t; }) };
    });
    res.sort(function (a, b) { return b.pct - a.pct || b.raw - a.raw || a.idx - b.idx; });
    return res.slice(0, 3);
  }
  // résumé lisible des réponses au test (pour les éducs)
  function quizLines(ans) {
    var out = [];
    QUIZ.forEach(function (Q, k) {
      var picked = ((ans && ans[k]) || []).map(function (j) { return Q.opts[j] && Q.opts[j].t; }).filter(Boolean);
      if (!picked.length) return;
      if (/ tu$/.test(Q.k)) out.push(Q.k + ' ' + picked.map(function (t) { return t.charAt(0).toLowerCase() + t.slice(1); }).join(' / '));
      else out.push(Q.k + ' : ' + picked.join(' / '));
    });
    return out;
  }

  return {
    POSTES: POSTES, LABELS: LABELS, QUIZ: QUIZ, QMAX: QMAX,
    poste: poste, def: def, of: of, pending: pending, etat: etat,
    quizResults: quizResults, quizLines: quizLines
  };
})();
