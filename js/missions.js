/* =========================================================
   Mode champion · M12 — MISSIONS SPÉCIALES
   Une mission = une chose à faire une seule fois dans l'appli, avec une récompense
   (XP.mission + son badge, voir content.js). Elle s'affiche en haut de « Ma semaine »
   tant qu'elle n'est pas faite.
   Pour le jeu à 10, deux missions séparées, chacune avec ses XP et son badge :
   « Choisis ton poste » (cartes + test « Aide-moi à choisir », repris du site « Choisis ton poste »)
   puis « Avec qui tu aimes jouer » (les copains, secret : seuls les éducs les voient), débloquée une fois le poste choisi.
   Les deux réponses sont rangées sur la même ligne du serveur (ligne « jeu10 ») : rien à changer côté serveur.
   ========================================================= */
window.MC = window.MC || {};

MC.MISSIONS = [
  {
    id: 'poste', ligne: 'jeu10', titre: 'Choisis ton poste', debut: '2026-10-13', fin: '2026-11-02', badge: 'jeu10', lien: '#/mission/postes', icon: 'ball',
    texte: 'Découvre les 7 postes du jeu à 10 et choisis ton top : 1 à 3 postes.'
  },
  {
    id: 'copains', ligne: 'jeu10', titre: 'Avec qui tu aimes jouer', debut: '2026-10-13', fin: '2026-11-02', badge: 'copains', lien: '#/mission/copains', icon: 'group', apres: 'poste',
    texte: 'Dis aux éducs avec quels copains tu aimes jouer. C\'est secret.'
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
    return MC.MISSIONS.filter(function (M) { return t >= M.debut && !etat(me, M.id).faite; });
  }
  // l'état d'une mission : « poste » ou « copains » (sur la ligne « jeu10 »), ou la ligne « jeu10 » elle-même (les deux faites)
  function etat(me, id) {
    var D = def(id), m = of(me, D && D.ligne ? D.ligne : id), r = (m && m.reponses) || {};
    var o = {
      m: m, ligneFaite: !!(m && m.faite),
      postes: (r.postes || []).filter(poste), copains: r.copains || [], copainsFait: !!r.copainsFait,
      quiz: r.quiz || null, quizTop: r.quizTop || null, quizResume: r.quizResume || '', source: (m && m.source) || ''
    };
    o.posteFait = o.postes.length > 0;
    o.faite = id === 'poste' ? o.posteFait : id === 'copains' ? o.copainsFait : o.ligneFaite;
    o.bloquee = !!(D && D.apres && !etat(me, D.apres).faite);
    o.date = m ? String((o.ligneFaite && m.date) || m.maj || m.cree || '').slice(0, 10) : '';
    return o;
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

  // ---------- les missions créées par les éducs (vidéo + questions, QCM) ----------
  // groupe(data) : les missions du groupe, avec où en est l'enfant (faite, vidéo vue, score)
  function groupe(data) {
    var t = MC.logic.today();
    return ((data && data.defmissions) || []).filter(function (m) { return (m.sorte === 'video' || m.sorte === 'qcm') && m.statut !== 'retiree'; }).map(function (m) {
      var r = of(data, m.id), rep = (r && r.reponses) || {};
      return { def: m, faite: !!(r && r.faite), vu: !!rep.vu, ans: rep.ans || null, score: rep.score || 0, total: rep.total || (m.questions || []).length,
        date: (r && r.date) || '', finie: !!(m.fin && m.fin < t), xp: rep.xp !== undefined ? rep.xp : m.xp };
    }).sort(function (a, b) { return (a.def.cree || '') < (b.def.cree || '') ? 1 : -1; });
  }
  // tout ce qui attend l'enfant : la mission spéciale du moment et les missions du groupe pas encore faites (date limite pas passée)
  function aFaire(data) {
    // une mission encore bloquée (les copains avant d'avoir choisi son poste) ne compte pas dans la pastille
    var l = pending(data).filter(function (M) { return !etat(data, M.id).bloquee; }).map(function (M) { return { id: M.id, titre: M.titre, statique: true }; });
    groupe(data).forEach(function (x) { if (!x.faite && !x.finie) l.push({ id: x.def.id, titre: x.def.titre, statique: false }); });
    return l;
  }
  // missions faites (mission spéciale, missions du groupe, missions perso dont l'étoile est validée)
  function nbFaites(data) {
    var n = 0;
    MC.MISSIONS.forEach(function (M) { if (etat(data, M.id).faite) n++; });
    groupe(data).forEach(function (x) { if (x.faite) n++; });
    ((data && data.defmissions) || []).forEach(function (m) { if (m.sorte === 'etoile' && m.statut === 'faite') n++; });
    return n;
  }
  // ---------- ce qui est nouveau pour celui qui regarde (lu ou pas : gardé sur l'appareil) ----------
  // qui : 'k' (l'enfant) ou 'f' (sa famille) ; on retient l'heure de la dernière visite de l'onglet Missions
  function luKey(qui, joueurId) { return 'mc-lu:' + qui + ':' + joueurId; }
  function luAt(qui, joueurId) { try { return localStorage.getItem(luKey(qui, joueurId)) || ''; } catch (e) { return ''; } }
  function marquerLu(qui, joueurId, data) {
    var max = luAt(qui, joueurId);
    ((data && data.encouragements) || []).forEach(function (x) { if ((x.cree || '') > max) max = x.cree; });
    ((data && data.defmissions) || []).forEach(function (m) { if ((m.cree || '') > max) max = m.cree; });
    try { if (max) localStorage.setItem(luKey(qui, joueurId), max); } catch (e) { }
  }
  // les +1, mots et missions arrivés depuis la dernière visite
  function nouveaux(qui, data) {
    if (!data || !data.joueur) return { enc: [], missions: [], n: 0 };
    var lu = luAt(qui, data.joueur.id);
    var enc = ((data.encouragements) || []).filter(function (x) { return (x.cree || '') > lu; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; });
    var ms = ((data.defmissions) || []).filter(function (m) { return (m.cree || '') > lu && m.statut === 'active'; });
    return { enc: enc, missions: ms, n: enc.length + ms.length };
  }

  return {
    POSTES: POSTES, LABELS: LABELS, QUIZ: QUIZ, QMAX: QMAX,
    poste: poste, def: def, of: of, pending: pending, etat: etat,
    quizResults: quizResults, quizLines: quizLines,
    groupe: groupe, aFaire: aFaire, nbFaites: nbFaites, nouveaux: nouveaux, marquerLu: marquerLu, luAt: luAt
  };
})();
