/* =========================================================
   Mode champion · M12 — COMPOS D'ÉQUIPES (les règles, sans affichage)
   Fiche terrain (niveau A/B/C, passerelle, plaquage, postes), historique des plateaux,
   proposition automatique, indicateurs, alertes et différences entre deux compos.
   Tout se calcule dans le navigateur ; testable avec node (tests/test_compos.js).
   ========================================================= */
window.MC = window.MC || {};

MC.compos = (function () {
  var NIV = ['A', 'B', 'C'];
  var NOM_NIV = { A: 'Confirmés', B: 'Débrouillés', C: 'Débutants' };
  var COUL_NIV = { A: '#FFC23D', B: '#38E8FF', C: '#3DFFB0' };
  // Jeu à 10 (règlement FFR M12) : mêlée 3 + 2 (les avants), puis 5 arrières (dans l'appli, « arrières » = les lignes arrières : 9, 10, centres, ailiers).
  // Derrière la charnière (9 et 10) : 2 centres et 1 ailier (à ajuster ici si le club joue autrement).
  var POSTES10 = [['pilier', 2], ['talonneur', 1], ['troisieme-ligne', 2], ['demi-de-melee', 1], ['ouvreur', 1], ['centre', 2], ['ailier', 1]];
  var SLOTS10 = [];
  POSTES10.forEach(function (p) { for (var i = 0; i < p[1]; i++) SLOTS10.push(p[0]); });
  // Étoiles de plaquage attendues pour jouer dans un niveau (proposition, à valider par les éducs) :
  // l'appli prévient, elle n'interdit rien.
  var SEUIL = { A: 4, B: 3, C: 0 };
  var BON = 3;                                            // « bon plaqueur » : 3 étoiles ou plus
  var TAILLE = { 5: { min: 5, ideal: 7 }, 10: { min: 10, ideal: 12 } };
  var FORMATS = [5, 10];

  function voisin(a, b) { return NIV.indexOf(a) >= 0 && NIV.indexOf(b) >= 0 && Math.abs(NIV.indexOf(a) - NIV.indexOf(b)) === 1; }
  function fmt(r) { return Number(r && r.format) === 10 ? 10 : 5; }
  function nbOf(r) {
    var nb = (r && r.nb) || {}, o = {};
    NIV.forEach(function (n) { var v = Math.floor(Number(nb[n]) || 0); o[n] = v < 0 ? 0 : v > 6 ? 6 : v; });
    return o;
  }
  function teamIds(nb) {
    var out = [];
    NIV.forEach(function (n) { for (var i = 1; i <= (nb[n] || 0); i++) out.push(n + i); });
    return out;
  }
  function niveauDe(f) { return f && NIV.indexOf(f.niveau) >= 0 ? f.niveau : ''; }
  // Les postes d'un joueur, dans l'ordre : ceux de sa fiche (le 1er = son poste principal, réglé par les éducs),
  // sinon les vœux de l'enfant (mission « jeu à 10 »).
  function postesDe(f) {
    var l = (f && f.postesOk && f.postesOk.length) ? f.postesOk : ((f && f.voeux) || []), o = [];
    l.forEach(function (p) { if (p && o.indexOf(p) < 0) o.push(p); });
    return o;
  }
  function posteDefaut(f) { return postesDe(f)[0] || ''; }
  // rang d'un poste pour un joueur : 0 = poste principal, 1, 2… = ses autres postes ; sinon 9
  function rang(f, poste) {
    var i = postesDe(f).indexOf(poste);
    return i >= 0 ? i : 9;
  }
  // avant (piliers, talonneur, 3es lignes) ou arrière (9, 10, centres, ailiers)
  var AVANTS = ['pilier', 'talonneur', 'troisieme-ligne'];
  // l'ordre d'affichage dans une équipe : piliers, talonneur, 3es lignes, puis 9, 10, centres, ailiers
  var ORDRE = POSTES10.map(function (p) { return p[0]; });
  function typePoste(p) { return !p ? '' : AVANTS.indexOf(p) >= 0 ? 'av' : 'ar'; }
  // 'av', 'ar', 'les2' (peut jouer avant et arrière) ou '' (pas encore de poste)
  function typeDe(f) {
    var av = false, ar = false;
    postesDe(f).forEach(function (p) { if (typePoste(p) === 'av') av = true; else ar = true; });
    return av && ar ? 'les2' : av ? 'av' : ar ? 'ar' : '';
  }
  function rangOrdre(p) { var i = ORDRE.indexOf(p); return i >= 0 ? i : 99; }

  // ---------- Fiches des joueurs : terrain + mission « jeu à 10 » ----------
  // g : réponse de l'action « group » (éducs) ; renvoie { id: fiche }
  function fiches(g) {
    var out = {};
    ((g && g.joueurs) || []).forEach(function (p) {
      var t = p.terrain || {}, m = null;
      (p.missions || []).forEach(function (x) { if (x.mission === 'jeu10') m = x; });
      var r = (m && m.reponses) || {};
      out[p.joueur.id] = {
        id: p.joueur.id, prenom: p.joueur.prenom, couleur: p.joueur.couleur, actif: p.joueur.actif !== false,
        niveau: NIV.indexOf(t.niveau) >= 0 ? t.niveau : '', passerelle: NIV.indexOf(t.passerelle) >= 0 ? t.passerelle : '',
        plaquage: Math.max(0, Math.min(5, Number(t.plaquage) || 0)),
        voeux: Array.isArray(r.postes) ? r.postes.slice(0, 3) : [], postesOk: Array.isArray(t.postesOk) ? t.postesOk.slice() : [],
        copains: Array.isArray(r.copains) ? r.copains.slice() : [], spondId: t.spondId || ''
      };
    });
    return out;
  }

  // ---------- Historique : plateaux et entraînements (compos publiées des événements passés) ----------
  // compos : lignes du serveur ; evts : { id: événement } ; F : fiches (pour les copains d'aujourd'hui)
  // Les entraînements comptent aussi pour les passerelles (un groupe de niveau au-dessus du sien) et pour les copains ;
  // chaque ligne de la liste dit d'où elle vient (sorte : 'plateau', 'ateliers' ou 'matchs') pour les afficher à part.
  // plateaux / entrainements : nombre de plateaux joués et de séances (ateliers ou matchs) ; postes : au plateau seulement.
  var ORDRE_PARTIE = { '': 0, ateliers: 1, matchs: 2 };
  function historique(compos, evts, F, today) {
    var H = {};
    function h(id) { return H[id] || (H[id] = { plateaux: 0, entrainements: 0, autre: 0, dernierAutre: '', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [] }); }
    var past = (compos || []).filter(function (c) {
      var e = evts[c.evenementId];
      return c.statut === 'publiee' && e && String(e.debut).slice(0, 10) < today;
    }).map(function (c) { return { c: c, e: evts[c.evenementId] }; });
    past.sort(function (a, b) {
      if (a.e.debut !== b.e.debut) return a.e.debut < b.e.debut ? -1 : 1;
      return (ORDRE_PARTIE[a.c.partie || ''] || 0) - (ORDRE_PARTIE[b.c.partie || ''] || 0);
    });
    past.forEach(function (x) {
      var date = String(x.e.debut).slice(0, 10), sorte = x.c.partie || 'plateau';
      (x.c.equipes || []).forEach(function (t) {
        var ids = (t.joueurs || []).map(function (j) { return j.id; });
        (t.joueurs || []).forEach(function (j) {
          var o = h(j.id), f = F[j.id] || {}, cps = (f.copains || []).filter(function (c) { return c !== j.id && ids.indexOf(c) >= 0; });
          if (sorte === 'plateau') o.plateaux++; else o.entrainements++;
          // hors de son niveau : seulement dans une équipe ou un groupe qui a un niveau (pas dans des groupes mélangés)
          var autre = !!(j.n && t.niveau && t.niveau !== j.n);
          if (autre) { o.autre++; o.dernierAutre = date; }
          if ((f.copains || []).length) {
            if (cps.length) { o.avecCopain++; o.sansCopainSerie = 0; } else o.sansCopainSerie++;
          }
          ids.forEach(function (c) { if (c !== j.id) o.vus[c] = (o.vus[c] || 0) + 1; });
          if (sorte === 'plateau') {
            o.niveaux[t.niveau] = (o.niveaux[t.niveau] || 0) + 1;
            if (j.poste) o.postes[j.poste] = (o.postes[j.poste] || 0) + 1;
          }
          o.liste.push({ date: date, titre: x.e.titre, evenementId: x.e.id, sorte: sorte, equipe: t.id, nom: t.nom || t.id, niveau: t.niveau || '', poste: j.poste || '',
            autre: autre, copains: cps, avec: ids.filter(function (c) { return c !== j.id; }) });
        });
      });
    });
    return H;
  }
  function hOf(H, id) { return (H && H[id]) || { plateaux: 0, entrainements: 0, autre: 0, dernierAutre: '', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [] }; }

  // ---------- Nombre d'équipes conseillé par niveau ----------
  function suggestNb(ids, F, format) {
    var T = TAILLE[format === 10 ? 10 : 5], c = { A: 0, B: 0, C: 0 }, nb = {};
    ids.forEach(function (id) { c[niveauDe(F[id]) || 'B']++; });
    NIV.forEach(function (n) { nb[n] = c[n] < T.min ? 0 : Math.max(1, Math.round(c[n] / T.ideal)); });
    // un niveau trop petit pour une équipe rejoint son voisin
    if (!nb.A && !nb.B && !nb.C) nb.B = ids.length ? 1 : 0;
    if (c.A && !nb.A && !nb.B) nb.B = 1;
    if (c.C && !nb.C && !nb.B) nb.B = 1;
    return nb;
  }

  // ---------- Couverture des postes (jeu à 10) : appariement postes ↔ joueurs ----------
  // Les 10 places du jeu à 10, chaque joueur au plus une, en préférant les vœux (rang le plus bas).
  // renvoie { poste par joueur ('' = remplaçant ou pas de place), manquants: [places non tenues] }
  function apparier(ids, F) {
    var slots = SLOTS10, slotOf = {}, playerOf = {};
    var rk = {};
    ids.forEach(function (pid) { var o = {}; slots.forEach(function (p) { if (o[p] === undefined) o[p] = rang(F[pid], p); }); rk[pid] = o; });
    function tryAssign(pid, maxR, seen) {
      for (var s = 0; s < slots.length; s++) {
        if (seen[s] || rk[pid][slots[s]] > maxR) continue;
        seen[s] = true;
        if (playerOf[s] === undefined || tryAssign(playerOf[s], maxR, seen)) { playerOf[s] = pid; slotOf[pid] = s; return true; }
      }
      return false;
    }
    [0, 1, 2, 3, 4, 5, 6].forEach(function (maxR) {
      ids.forEach(function (pid) { if (slotOf[pid] === undefined) tryAssign(pid, maxR, {}); });
    });
    var poste = {}, manquants = [];
    ids.forEach(function (pid) { poste[pid] = slotOf[pid] !== undefined ? slots[slotOf[pid]] : ''; });
    slots.forEach(function (p, s) { if (playerOf[s] === undefined) manquants.push(p); });
    return { poste: poste, manquants: manquants };
  }

  // ---------- Score d'une répartition dans un niveau (plus petit = mieux) ----------
  // somme des scores des équipes ; les moyennes du niveau ne changent pas pendant les échanges
  var W = { taille: 5, plaq: 4, bons: 1.5, copain: 1, seul: 0.75, poste: 1.5 };
  // styles de proposition : « equilibre » (par défaut), « copains » (copains d'abord), « strict » (sans passerelles)
  var STYLES = {
    equilibre: { nom: 'Équilibrée', texte: 'Plaquage équilibré, passerelles à tour de rôle, un copain pour chacun quand c\'est possible.', w: W },
    copains: { nom: 'Copains d\'abord', texte: 'Chacun avec ses copains en priorité, le plaquage reste équilibré.', w: { taille: 5, plaq: 2, bons: 1, copain: 3, seul: 1.5, poste: 1.5 } },
    strict: { nom: 'Niveaux stricts', texte: 'Chacun dans son niveau (pas de passerelle), plaquage équilibré.', w: W, sansPasserelles: true }
  };
  function niveauCtx(teams, F, w) {
    var tot = 0, totP = 0, totB = 0, k = teams.length || 1, cn = { A: 0, B: 0, C: 0 }, av = 0;
    teams.forEach(function (t) { t.forEach(function (id) {
      var f = F[id] || {}, p = f.plaquage || 0; tot++; totP += p; if (p >= BON) totB++;
      cn[niveauDe(f) || 'B']++; if (typePoste(posteDefaut(f)) === 'av') av++;
    }); });
    return { avgN: tot / k, mean: tot ? totP / tot : 0, avgB: totB / k, w: w || W, avgNiv: { A: cn.A / k, B: cn.B / k, C: cn.C / k }, avgAv: av / k };
  }
  function scoreEquipe(t, cx, F, H, format) {
    var sp = 0, sb = 0, s = 0, W = cx.w;
    t.forEach(function (id) { var p = (F[id] || {}).plaquage || 0; sp += p; if (p >= BON) sb++; });
    s += W.taille * Math.abs(t.length - cx.avgN);
    if (t.length) s += W.plaq * Math.abs(sp / t.length - cx.mean);
    s += W.bons * Math.abs(sb - cx.avgB);
    if (format === 10) s += W.poste * apparier(t, F).manquants.length;
    // entraînement : mélanger les niveaux (W.niv) et équilibrer avants / arrières (W.avar)
    if (W.niv || W.avar) {
      var cn = { A: 0, B: 0, C: 0 }, av = 0;
      t.forEach(function (id) { var f = F[id] || {}; cn[niveauDe(f) || 'B']++; if (typePoste(posteDefaut(f)) === 'av') av++; });
      if (W.niv) NIV.forEach(function (n) { s += W.niv * Math.abs(cn[n] - cx.avgNiv[n]); });
      if (W.avar) s += W.avar * Math.abs(av - cx.avgAv);
    }
    t.forEach(function (id) {
      var cps = (F[id] || {}).copains || [];
      if (!cps.length) return;
      for (var i = 0; i < cps.length; i++) if (cps[i] !== id && t.indexOf(cps[i]) >= 0) return;
      s += W.copain + W.seul * Math.min(3, hOf(H, id).sansCopainSerie);
    });
    return s;
  }
  function scoreNiveau(teams, F, H, format, w) {
    var cx = niveauCtx(teams, F, w), s = 0;
    teams.forEach(function (t) { s += scoreEquipe(t, cx, F, H, format); });
    return s;
  }
  // améliore la répartition par échanges deux à deux (et déplacements si les effectifs s'écartent) ;
  // seules les deux équipes touchées sont recalculées
  function ameliorer(teams, F, H, format, w) {
    var cx = niveauCtx(teams, F, w), ts = teams.map(function (t) { return scoreEquipe(t, cx, F, H, format); });
    var guard = 0, improved = true;
    function sc(i) { return scoreEquipe(teams[i], cx, F, H, format); }
    while (improved && guard++ < 120) {
      improved = false;
      var cand = null, bestD = -1e-9;
      for (var a = 0; a < teams.length; a++) for (var b = a + 1; b < teams.length; b++) {
        var base = ts[a] + ts[b];
        for (var i = 0; i < teams[a].length; i++) for (var j = 0; j < teams[b].length; j++) {
          var x = teams[a][i], y = teams[b][j];
          teams[a][i] = y; teams[b][j] = x;
          var na = sc(a), nb = sc(b), d = na + nb - base;
          teams[a][i] = x; teams[b][j] = y;
          if (d < bestD) { bestD = d; cand = { t: 'swap', a: a, b: b, i: i, j: j, na: na, nb: nb }; }
        }
        // déplacement d'un joueur de l'équipe la plus nombreuse vers l'autre
        [[a, b], [b, a]].forEach(function (ab) {
          var from = teams[ab[0]], to = teams[ab[1]];
          if (from.length - to.length < 2) return;
          for (var m = 0; m < from.length; m++) {
            var id = from.splice(m, 1)[0]; to.push(id);
            var nf = sc(ab[0]), nt = sc(ab[1]), d2 = nf + nt - ts[ab[0]] - ts[ab[1]];
            to.pop(); from.splice(m, 0, id);
            if (d2 < bestD) { bestD = d2; cand = { t: 'move', from: ab[0], to: ab[1], m: m, nf: nf, nt: nt }; }
          }
        });
      }
      if (cand) {
        improved = true;
        if (cand.t === 'swap') {
          var tmp = teams[cand.a][cand.i]; teams[cand.a][cand.i] = teams[cand.b][cand.j]; teams[cand.b][cand.j] = tmp;
          ts[cand.a] = cand.na; ts[cand.b] = cand.nb;
        } else { teams[cand.to].push(teams[cand.from].splice(cand.m, 1)[0]); ts[cand.from] = cand.nf; ts[cand.to] = cand.nt; }
      }
    }
    return teams;
  }

  // ---------- Proposition automatique ----------
  // ids : présents ; F : fiches ; H : historique ; reglages : { format: 5|10, nb: { A, B, C } }
  // renvoie { equipes: [{ id, niveau, joueurs: [{ id, poste, n }] }], banc: [], raisons: { id: texte } }
  function proposer(ids, F, H, reglages, today, style) {
    var format = fmt(reglages), nb = nbOf(reglages), raisons = {}, S = STYLES[style] || STYLES.equilibre;
    var tids = teamIds(nb);
    if (!tids.length) return { equipes: [], banc: ids.slice(), raisons: {} };
    function ok(n) { return nb[n] > 0; }
    // 1. chacun dans son niveau principal (s'il n'y a pas d'équipe de ce niveau : le niveau voisin)
    var lv = {}, princ = {};
    ids.forEach(function (id) {
      var f = F[id] || {}, n = niveauDe(f);
      princ[id] = n;
      if (!n) { n = ok('B') ? 'B' : ok('C') ? 'C' : 'A'; raisons[id] = 'Niveau à renseigner : placé en ' + n + '.'; }
      else if (!ok(n)) {
        var alt = f.passerelle && ok(f.passerelle) ? f.passerelle : n === 'B' ? (ok('C') ? 'C' : 'A') : (ok('B') ? 'B' : n === 'A' ? 'C' : 'A');
        raisons[id] = 'Pas d\'équipe ' + n + ' : joue en ' + alt + '.';
        n = alt;
      }
      lv[id] = n;
    });
    // 2. les passerelles comblent les écarts d'effectif entre niveaux voisins (d'abord ceux qui attendent leur tour)
    var total = ids.length, per = total / tids.length;
    function count(n) { var c = 0; ids.forEach(function (id) { if (lv[id] === n) c++; }); return c; }
    function ecart(n) { return count(n) - nb[n] * per; }
    var guard = S.sansPasserelles ? 60 : 0;
    while (guard++ < 60) {
      var move = null;
      NIV.forEach(function (from) {
        NIV.forEach(function (to) {
          if (move || !voisin(from, to) || !ok(to)) return;
          var ef = ecart(from), et = ecart(to);
          if (!(ef > 0.5 && et < -0.5)) return;
          var c = ids.filter(function (id) { var f = F[id] || {}; return lv[id] === from && princ[id] === from && f.passerelle === to; });
          if (!c.length) return;
          c.sort(function (a, b) {
            var ha = hOf(H, a), hb = hOf(H, b);
            if (ha.dernierAutre !== hb.dernierAutre) return ha.dernierAutre < hb.dernierAutre ? -1 : 1;   // jamais / le plus ancien d'abord
            if (ha.autre !== hb.autre) return ha.autre - hb.autre;
            var pa = (F[a] || {}).plaquage || 0, pb = (F[b] || {}).plaquage || 0;
            if (pa !== pb) return NIV.indexOf(to) < NIV.indexOf(from) ? pb - pa : pa - pb;          // vers le haut : les meilleurs plaqueurs
            return a < b ? -1 : 1;
          });
          // déplacer seulement si l'écart total diminue
          if (Math.abs(ef - 1) + Math.abs(et + 1) < Math.abs(ef) + Math.abs(et)) move = { id: c[0], to: to };
        });
      });
      if (!move) break;
      lv[move.id] = move.to;
      var hh = hOf(H, move.id);
      raisons[move.id] = 'Joue en ' + move.to + ' grâce à sa passerelle : ' + (hh.dernierAutre ? 'son tour (dernière fois le ' + frDate(hh.dernierAutre) + ').' : 'son tour, il n\'y a pas encore joué.');
    }
    // 3. dans chaque niveau : serpentin par étoiles de plaquage, puis échanges
    var equipes = [];
    NIV.forEach(function (n) {
      if (!ok(n)) return;
      var list = ids.filter(function (id) { return lv[id] === n; });
      list.sort(function (a, b) { var d = ((F[b] || {}).plaquage || 0) - ((F[a] || {}).plaquage || 0); return d || (a < b ? -1 : 1); });
      var k = nb[n], teams = [];
      for (var i = 0; i < k; i++) teams.push([]);
      list.forEach(function (id, i) { var r = Math.floor(i / k), c = i % k; teams[r % 2 ? k - 1 - c : c].push(id); });
      ameliorer(teams, F, H, format, S.w);
      teams.forEach(function (t, i) {
        var po = format === 10 ? apparier(t, F).poste : {};
        equipes.push({ id: n + (i + 1), niveau: n, joueurs: t.map(function (id) { return { id: id, poste: po[id] || '', n: princ[id] || '' }; }) });
      });
    });
    // 4. raisons utiles : un enfant resté seul la dernière fois et qui retrouve un copain
    equipes.forEach(function (t) {
      var tid = t.joueurs.map(function (j) { return j.id; });
      t.joueurs.forEach(function (j) {
        if (raisons[j.id]) return;
        var f = F[j.id] || {}, cps = (f.copains || []).filter(function (c) { return tid.indexOf(c) >= 0; });
        if (cps.length && hOf(H, j.id).sansCopainSerie) raisons[j.id] = 'Avec ' + cps.map(function (c) { return (F[c] || {}).prenom || '?'; }).join(', ') + ' : sans copain la dernière fois.';
      });
    });
    return { equipes: equipes, banc: [], raisons: raisons };
  }
  function frDate(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '/' + p[1] : d; }

  // ---------- Les joueurs d'une équipe, rangés : avants puis arrières ----------
  // Jeu à 10 : d'après le poste du plateau (sans poste = remplaçant) ; jeu à 5 : d'après le poste principal de la fiche.
  // Dans chaque section : piliers, talonneur, 3es lignes / 9, 10, centres, ailiers ; à poste égal, l'ordre de l'équipe.
  // renvoie { av: [joueurs], ar: [], rempl: [], sans: [] } (joueurs = les entrées de t.joueurs)
  function sections(t, F, format) {
    var o = { av: [], ar: [], rempl: [], sans: [] }, k = {};
    (t.joueurs || []).forEach(function (j, i) {
      var p = format === 10 ? j.poste : posteDefaut(F[j.id]), ty = typePoste(p);
      k[j.id] = rangOrdre(p || posteDefaut(F[j.id])) * 1000 + i;
      if (ty) o[ty].push(j); else if (format === 10) o.rempl.push(j); else o.sans.push(j);
    });
    function tri(a, b) { return k[a.id] - k[b.id]; }
    o.av.sort(tri); o.ar.sort(tri); o.rempl.sort(tri); o.sans.sort(tri);
    return o;
  }

  // ---------- Indicateurs d'une équipe ----------
  function stats(t, F, format) {
    var ids = (t.joueurs || []).map(function (j) { return j.id; });
    var n = ids.length, sp = 0, bons = 0, avec = 0, avecCps = 0, pass = 0, sousSeuil = [];
    ids.forEach(function (id) {
      var f = F[id] || {}, p = f.plaquage || 0;
      sp += p; if (p >= BON) bons++;
      if ((f.copains || []).length) { avecCps++; if (f.copains.some(function (c) { return ids.indexOf(c) >= 0; })) avec++; }
      if (t.niveau && f.niveau && f.niveau !== t.niveau) pass++;
      if (p < (SEUIL[t.niveau] || 0)) sousSeuil.push(id);
    });
    var o = { n: n, plaq: n ? Math.round(sp / n * 10) / 10 : 0, bons: bons, avecCopain: avec, ontCopains: avecCps, passerelles: pass, sousSeuil: sousSeuil, manquants: [] };
    // avants / arrières, comme les sections de l'équipe (voir sections) : au jeu à 10, d'après le poste du plateau,
    // les remplaçants à part (o.remplTypes : le type de leur fiche) ; au jeu à 5, d'après le poste principal de la fiche
    // (« les2 » = combien peuvent jouer avant et arrière, « inconnus » = pas encore de poste)
    var sc = sections(t, F, format);
    o.av = sc.av.length; o.ar = sc.ar.length; o.rempl = sc.rempl.length; o.inconnus = sc.sans.length; o.les2 = 0;
    o.remplTypes = { av: 0, ar: 0, les2: 0, inconnus: 0 };
    (t.joueurs || []).forEach(function (j) { if (typeDe(F[j.id]) === 'les2') o.les2++; });
    sc.rempl.forEach(function (j) { o.remplTypes[typeDe(F[j.id]) || 'inconnus']++; });
    if (format === 10) {
      var cover = {};
      (t.joueurs || []).forEach(function (j) { if (j.poste) cover[j.poste] = (cover[j.poste] || 0) + 1; });
      POSTES10.forEach(function (p) { for (var i = (cover[p[0]] || 0); i < p[1]; i++) o.manquants.push(p[0]); });
    }
    return o;
  }

  // ---------- Alertes (et la correction proposée quand il y en a une) ----------
  // c : { reglages, equipes, banc } ; presents : ids attendus ; renvoie [{ k, niveau: 'warn'|'info', texte, fix }]
  function alertes(c, F, H, presents) {
    var out = [], format = fmt(c.reglages), T = TAILLE[format], eqs = c.equipes || [];
    var placed = {};
    eqs.forEach(function (t) { (t.joueurs || []).forEach(function (j) { placed[j.id] = t.id; }); });
    (c.banc || []).forEach(function (id) { placed[id] = 'banc'; });
    var oublis = (presents || []).filter(function (id) { return !placed[id]; });
    if (oublis.length) out.push({ k: 'oubli', niveau: 'warn', texte: oublis.length + ' présent' + (oublis.length > 1 ? 's' : '') + ' pas encore placé' + (oublis.length > 1 ? 's' : '') + ' : ' + noms(oublis, F) + ' (colonne « Pas placés »).', ids: oublis });
    var sansNiv = Object.keys(placed).filter(function (id) { return placed[id] !== 'banc' && F[id] && !F[id].niveau; });
    if (sansNiv.length) out.push({ k: 'niveau', niveau: 'info', texte: 'Niveau à renseigner : ' + noms(sansNiv, F) + '.', ids: sansNiv });
    NIV.forEach(function (n) {
      var ts = eqs.filter(function (t) { return t.niveau === n; });
      var st = ts.map(function (t) { return stats(t, F, format); });
      ts.forEach(function (t, i) {
        if (st[i].n && st[i].n < T.min) out.push({ k: 'effectif', niveau: 'warn', texte: t.id + ' : ' + st[i].n + ' joueurs, il en faut au moins ' + T.min + '.', equipe: t.id });
      });
      if (ts.length > 1) {
        var mx = 0, mn = 99, iMx = 0, iMn = 0;
        st.forEach(function (s, i) { if (s.n > mx) { mx = s.n; iMx = i; } if (s.n < mn) { mn = s.n; iMn = i; } });
        if (mx - mn >= 2) out.push({ k: 'taille', niveau: 'warn', texte: 'Effectifs déséquilibrés : ' + ts[iMx].id + ' (' + mx + ') et ' + ts[iMn].id + ' (' + mn + ').', fix: bestMove(c, F, H, ts[iMx].id, ts[iMn].id) });
        var hi = 0, lo = 0;
        st.forEach(function (s, i) { if (s.plaq > st[hi].plaq) hi = i; if (s.plaq < st[lo].plaq) lo = i; });
        if (st[hi].plaq - st[lo].plaq >= 0.6) {
          out.push({ k: 'plaquage', niveau: 'warn', texte: 'Écart de plaquage en ' + n + ' : ' + ts[hi].id + ' ' + virg(st[hi].plaq) + ' ★, ' + ts[lo].id + ' ' + virg(st[lo].plaq) + ' ★.', fix: bestSwap(c, F, H, ts[hi].id, ts[lo].id) });
        }
      }
      ts.forEach(function (t, i) {
        if (st[i].sousSeuil.length && SEUIL[n]) out.push({ k: 'seuil', niveau: 'info', texte: t.id + ' : ' + noms(st[i].sousSeuil, F) + ' sous ' + SEUIL[n] + ' ★ de plaquage (repère pour le niveau ' + n + ').', ids: st[i].sousSeuil });
        if (format === 10 && st[i].manquants.length) out.push({ k: 'poste', niveau: 'warn', texte: t.id + ' : poste' + (st[i].manquants.length > 1 ? 's' : '') + ' à couvrir (' + st[i].manquants.map(nomPoste).join(', ') + ').', equipe: t.id });
      });
    });
    // enfant sans copain dans son équipe pour la 2e fois de suite
    eqs.forEach(function (t) {
      var ids = t.joueurs.map(function (j) { return j.id; });
      t.joueurs.forEach(function (j) {
        var f = F[j.id] || {};
        if (!(f.copains || []).length || f.copains.some(function (x) { return ids.indexOf(x) >= 0; })) return;
        var serie = hOf(H, j.id).sansCopainSerie;
        if (serie >= 1) out.push({ k: 'copain', niveau: 'warn', texte: (f.prenom || '?') + ' sans copain dans son équipe pour la ' + (serie + 1) + 'e fois de suite.', ids: [j.id], fix: copainFix(c, F, H, j.id) });
      });
    });
    // passerelles qui n'ont pas encore joué dans l'autre niveau (rotation)
    var attente = Object.keys(placed).filter(function (id) {
      var f = F[id]; if (!f || !f.passerelle || placed[id] === 'banc') return false;
      var t = eqs.filter(function (x) { return x.id === placed[id]; })[0];
      return t && t.niveau === f.niveau && !hOf(H, id).autre;
    });
    if (attente.length) out.push({ k: 'rotation', niveau: 'info', texte: 'Passerelles qui n\'ont pas encore joué dans l\'autre niveau : ' + attente.map(function (id) { return F[id].prenom + ' (' + F[id].niveau + '→' + F[id].passerelle + ')'; }).join(', ') + '.', ids: attente });
    return out;
  }
  function virg(x) { return String(x).replace('.', ','); }
  function noms(ids, F) { return ids.map(function (id) { return (F[id] || {}).prenom || '?'; }).join(', '); }
  var NOMS_POSTES = { pilier: 'pilier', talonneur: 'talonneur', 'troisieme-ligne': '3e ligne', 'demi-de-melee': 'demi de mêlée', ouvreur: 'ouvreur', centre: 'centre', ailier: 'ailier' };
  function nomPoste(p) { return NOMS_POSTES[p] || p; }

  // ---------- Modifications d'une compo ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function where(c, id) {
    var eqs = c.equipes || [];
    for (var i = 0; i < eqs.length; i++) for (var j = 0; j < eqs[i].joueurs.length; j++) if (eqs[i].joueurs[j].id === id) return { t: i, j: j };
    var b = (c.banc || []).indexOf(id);
    return b >= 0 ? { t: -1, j: b } : null;
  }
  // déplacer un joueur vers une équipe (id) ou 'banc' ; n = son niveau principal (gardé pour l'historique)
  function moveTo(c, id, dest, F) {
    var o = clone(c), w = where(o, id), entry = { id: id, poste: '', n: (F && F[id] && F[id].niveau) || '' };
    if (w) {
      if (w.t >= 0) { entry = o.equipes[w.t].joueurs.splice(w.j, 1)[0]; entry.poste = ''; }
      else o.banc.splice(w.j, 1);
    }
    o.banc = o.banc || [];
    if (dest === 'banc') o.banc.push(id);
    else { var t = o.equipes.filter(function (x) { return x.id === dest; })[0]; if (!t) return c; t.joueurs.push(entry); }
    return o;
  }
  // échanger les places de deux joueurs ; un présent pas encore placé compte comme « Pas placé »
  function swap(c, a, b, F) {
    var o = clone(c);
    o.banc = o.banc || [];
    if (!where(o, a)) o.banc.push(a);
    if (!where(o, b)) o.banc.push(b);
    var wa = where(o, a), wb = where(o, b);
    if (!wa || !wb) return c;
    function get(w) { var id = o.banc[w.j]; return w.t >= 0 ? o.equipes[w.t].joueurs[w.j] : { id: id, poste: '', n: (F && F[id] && F[id].niveau) || '' }; }
    function put(w, e) { if (w.t >= 0) o.equipes[w.t].joueurs[w.j] = e; else o.banc[w.j] = e.id; }
    var ea = get(wa), eb = get(wb), pa = ea.poste, pb = eb.poste;
    // chacun prend le poste de l'autre (on échange les places)
    ea.poste = pb; eb.poste = pa;
    put(wa, eb); put(wb, ea);
    return o;
  }
  function setPoste(c, id, poste) {
    var o = clone(c), w = where(o, id);
    if (w && w.t >= 0) o.equipes[w.t].joueurs[w.j].poste = poste || '';
    return o;
  }
  // le meilleur échange entre deux équipes d'un même niveau (écart de plaquage)
  function bestSwap(c, F, H, ta, tb) {
    var A = c.equipes.filter(function (t) { return t.id === ta; })[0], B = c.equipes.filter(function (t) { return t.id === tb; })[0];
    if (!A || !B) return null;
    var memes = c.equipes.filter(function (t) { return blocDe(t) === blocDe(A); });
    var lvTeams = memes.map(function (t) { return t.joueurs.map(function (j) { return j.id; }); });
    var ia = memes.indexOf(A), ib = memes.indexOf(B);
    var format = fmt(c.reglages), base = scoreNiveau(lvTeams, F, H, format), best = null;
    lvTeams[ia].forEach(function (x, i) {
      lvTeams[ib].forEach(function (y, j) {
        lvTeams[ia][i] = y; lvTeams[ib][j] = x;
        var sc = scoreNiveau(lvTeams, F, H, format);
        lvTeams[ia][i] = x; lvTeams[ib][j] = y;
        if (sc < base - 0.2 && (!best || sc < best.sc)) best = { sc: sc, a: x, b: y };
      });
    });
    return best ? { t: 'swap', a: best.a, b: best.b, texte: 'Échanger ' + (F[best.a] || {}).prenom + ' (' + nomEq(A) + ') et ' + (F[best.b] || {}).prenom + ' (' + nomEq(B) + ')' } : null;
  }
  function bestMove(c, F, H, from, to) {
    var A = c.equipes.filter(function (t) { return t.id === from; })[0];
    if (!A) return null;
    var best = null, format = fmt(c.reglages);
    A.joueurs.forEach(function (j) {
      var o = moveTo(c, j.id, to, F);
      var lvTeams = o.equipes.filter(function (t) { return blocDe(t) === blocDe(A); }).map(function (t) { return t.joueurs.map(function (x) { return x.id; }); });
      var sc = scoreNiveau(lvTeams, F, H, format);
      if (!best || sc < best.sc) best = { sc: sc, id: j.id };
    });
    var T = c.equipes.filter(function (t) { return t.id === to; })[0];
    return best ? { t: 'move', id: best.id, vers: to, texte: 'Passer ' + (F[best.id] || {}).prenom + ' en ' + (T ? nomEq(T) : to) } : null;
  }
  // mettre un enfant seul avec un copain : échange dans le même niveau qui coûte le moins
  function copainFix(c, F, H, id) {
    var f = F[id] || {}, w = where(c, id);
    if (!w || w.t < 0) return null;
    var me = c.equipes[w.t], format = fmt(c.reglages), best = null;
    c.equipes.forEach(function (t) {
      if (t === me || blocDe(t) !== blocDe(me)) return;
      if (!t.joueurs.some(function (j) { return f.copains.indexOf(j.id) >= 0; })) return;
      t.joueurs.forEach(function (j) {
        if (f.copains.indexOf(j.id) >= 0) return;
        var o = swap(c, id, j.id, F);
        var lvTeams = o.equipes.filter(function (x) { return blocDe(x) === blocDe(me); }).map(function (x) { return x.joueurs.map(function (y) { return y.id; }); });
        var sc = scoreNiveau(lvTeams, F, H, format);
        if (!best || sc < best.sc) best = { sc: sc, b: j.id, t: t.id };
      });
    });
    return best ? { t: 'swap', a: id, b: best.b, texte: 'Échanger ' + f.prenom + ' et ' + (F[best.b] || {}).prenom + ' (' + best.t + ')' } : null;
  }

  // ======================================================================
  // Entraînements : d'abord les groupes d'ateliers, ensuite les matchs
  // ======================================================================
  // Chaque équipe d'entraînement a un « bloc » (ce qui s'affiche ensemble) : A / B / C (groupes de niveau),
  // 'g' (groupes mélangés), 'av' / 'ar' (avants et arrières à part), 'm1', 'm2'… (match 1, match 2 : Chasubles contre Maillots).
  function blocDe(t) { return (t && (t.bloc || t.niveau)) || ''; }
  function nomEq(t) { return (t && (t.nom || t.id)) || ''; }
  var BLOCS = ['A', 'B', 'C', 'g', 'av', 'ar', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  function blocsDe(d) {
    var seen = {};
    ((d && d.equipes) || []).forEach(function (t) { seen[blocDe(t)] = true; });
    return BLOCS.filter(function (k) { return seen[k]; });
  }
  var NOMS_BLOCS = { A: 'Confirmés', B: 'Débrouillés', C: 'Débutants', g: 'Groupes', av: 'Avants', ar: 'Arrières' };
  function nomBloc(k) { return NOMS_BLOCS[k] || (/^m\d$/.test(k) ? 'Match ' + k.slice(1) : k); }
  var PARTIES = ['ateliers', 'matchs'];
  // réglages d'un entraînement, complétés et bornés (nombres conseillés d'après les présents : groupes de 8 environ)
  function regEnt(r, ids, F) {
    r = r || {};
    var n = (ids || []).length, nAv = 0, nAr = 0;
    (ids || []).forEach(function (id) { var t = typePoste(posteDefaut(F && F[id])); if (t === 'av') nAv++; else if (t === 'ar') nAr++; });
    function borne(v, a, b, d) { v = Math.floor(Number(v)); return isNaN(v) ? d : v < a ? a : v > b ? b : v; }
    var parGroupe = 8;
    return {
      partie: r.partie === 'matchs' ? 'matchs' : 'ateliers', format: 5, nb: { A: 0, B: 0, C: 0 },
      mode: r.mode === 'equilibre' ? 'equilibre' : 'niveau', separer: r.partie !== 'matchs' && !!r.separer,
      n: borne(r.n, 1, 8, Math.max(2, Math.min(6, Math.round(n / parGroupe) || 1))),
      nAv: borne(r.nAv, 1, 4, Math.max(1, Math.round(nAv / parGroupe))), nAr: borne(r.nAr, 1, 4, Math.max(1, Math.round(nAr / parGroupe))),
      nbMatchs: borne(r.nbMatchs, 1, 4, n >= 20 ? 2 : 1)
    };
  }
  // du plus avancé au moins avancé : niveau (A, B, C ; sans niveau = B), passerelle, puis étoiles de plaquage
  function triForce(F) {
    return function (a, b) {
      var fa = F[a] || {}, fb = F[b] || {}, d = NIV.indexOf(niveauDe(fa) || 'B') - NIV.indexOf(niveauDe(fb) || 'B');
      if (d) return d;
      // dans un niveau : d'abord ceux qui ont une passerelle vers le niveau au-dessus, en dernier ceux vers le niveau en dessous
      d = biais(fa) - biais(fb);
      if (d) return d;
      d = (fb.plaquage || 0) - (fa.plaquage || 0);
      return d || (a < b ? -1 : 1);
    };
  }
  function biais(f) { var n = NIV.indexOf(niveauDe(f) || 'B'), p = NIV.indexOf(f.passerelle || ''); return p < 0 ? 1 : p < n ? 0 : 2; }
  function serpentin(list, k) {
    var teams = [];
    for (var i = 0; i < k; i++) teams.push([]);
    list.forEach(function (id, i) { var r = Math.floor(i / k), c = i % k; teams[r % 2 ? k - 1 - c : c].push(id); });
    return teams;
  }
  // poids pour des groupes mélangés (ateliers « équilibrés ») et pour les deux équipes d'un match
  var WMIX = { taille: 5, plaq: 3, bons: 1, copain: 1, seul: 0.5, poste: 0, niv: 1.5, avar: 1 };
  var WMATCH = { taille: 5, plaq: 4, bons: 1.5, copain: 0.75, seul: 0.4, poste: 0, niv: 1.5, avar: 1.2 };
  // des tranches successives (du plus avancé au moins avancé), coupées à la limite entre deux niveaux quand elle est proche
  // (à un quart de groupe près) : des groupes de niveau d'effectifs voisins
  function tranches(sorted, k, F) {
    var n = sorted.length, bounds = [], out = [], prev = 0;
    for (var i = 1; i < n; i++) if ((niveauDe(F[sorted[i]]) || 'B') !== (niveauDe(F[sorted[i - 1]]) || 'B')) bounds.push(i);
    for (var g = 1; g < k; g++) {
      var ideal = prev + (n - prev) / (k - g + 1), tol = Math.max(1, n / k * 0.25);
      var near = bounds.filter(function (b) { return b > prev && Math.abs(b - ideal) <= tol; }).sort(function (a, b) { return Math.abs(a - ideal) - Math.abs(b - ideal); })[0];
      var cut = near !== undefined ? near : Math.round(ideal);
      cut = Math.max(prev + 1, Math.min(cut, n - (k - g)));
      out.push(sorted.slice(prev, cut)); prev = cut;
    }
    out.push(sorted.slice(prev));
    return out;
  }
  function entree(id, F) { return { id: id, poste: '', n: niveauDe(F[id]) }; }
  // k groupes parmi ids ; side : '' (tout le monde), 'av' ou 'ar'
  function groupesDe(ids, F, H, mode, k, side, today) {
    if (!ids.length) return { equipes: [], raisons: {} };
    k = Math.max(1, Math.min(k, ids.length));
    var pre = side === 'av' ? 'Av' : side === 'ar' ? 'Ar' : '';
    if (mode === 'niveau') {
      // groupes de niveau : A1, B1, B2, C1… (« A+B » quand un groupe réunit deux niveaux)
      var parts = tranches(ids.slice().sort(triForce(F)), k, F), vu = {}, noms = parts.map(function (part) {
        var c = { A: 0, B: 0, C: 0 };
        part.forEach(function (id) { c[niveauDe(F[id]) || 'B']++; });
        // le niveau du groupe : le plus haut présent (dans « A+B », les B jouent au-dessus de leur niveau)
        var lv = NIV.filter(function (x) { return c[x]; });
        return { base: lv.join('+') || 'B', pur: lv.length < 2, maj: lv[0] || 'B' };
      });
      noms.forEach(function (x) { vu[x.base] = (vu[x.base] || 0) + 1; });
      var rang = {};
      return { equipes: parts.map(function (part, i) {
        var x = noms[i]; rang[x.base] = (rang[x.base] || 0) + 1;
        var nom = x.pur ? x.base + rang[x.base] : x.base + (vu[x.base] > 1 ? ' ' + rang[x.base] : '');
        return { id: (pre || 'N') + (i + 1), nom: nom, niveau: x.maj, bloc: side || x.maj, joueurs: part.map(function (id) { return entree(id, F); }) };
      }), raisons: {} };
    }
    var teams = serpentin(ids.slice().sort(triForce(F)), k);
    ameliorer(teams, F, H, 5, WMIX);
    return { equipes: teams.map(function (t, i) {
      return { id: (pre || 'G') + (i + 1), nom: (pre || 'G') + (i + 1), niveau: '', bloc: side || 'g', joueurs: t.map(function (id) { return entree(id, F); }) };
    }), raisons: {} };
  }
  // les matchs : chacun à 2 équipes, Chasubles contre Maillots, équilibrées (plaquage, niveaux, avants / arrières, copains)
  // « niveau » : le match 1 réunit les plus avancés (les Confirmés et les meilleurs Débrouillés), le dernier les Débutants ;
  // « equilibre » : chaque match mélange tous les niveaux
  function matchsDe(ids, F, H, mode, m) {
    m = Math.max(1, Math.min(m, Math.floor(ids.length / 2) || 1));
    var sorted = ids.slice().sort(triForce(F)), paires = [];
    if (mode === 'niveau') {
      var base = Math.floor(sorted.length / m), extra = sorted.length % m, pos = 0;
      for (var i = 0; i < m; i++) {
        var sz = base + (i < extra ? 1 : 0), part = sorted.slice(pos, pos + sz), t2 = serpentin(part, 2);
        pos += sz;
        ameliorer(t2, F, H, 5, WMATCH);
        paires.push(t2);
      }
    } else {
      var all = serpentin(sorted, 2 * m);
      ameliorer(all, F, H, 5, WMATCH);
      for (var j = 0; j < m; j++) paires.push([all[2 * j], all[2 * j + 1]]);
    }
    var equipes = [];
    paires.forEach(function (pr, i) {
      // matchs par niveau : le niveau du match est le plus haut présent (ceux du niveau en dessous y jouent « au-dessus ») ;
      // matchs équilibrés : pas de niveau
      var niv = '';
      if (mode === 'niveau') NIV.slice().reverse().forEach(function (n) { if (pr[0].concat(pr[1]).some(function (id) { return (niveauDe(F[id]) || 'B') === n; })) niv = n; });
      equipes.push({ id: 'M' + (i + 1) + 'c', nom: 'Chasubles', cote: 'c', niveau: niv, bloc: 'm' + (i + 1), joueurs: pr[0].map(function (id) { return entree(id, F); }) });
      equipes.push({ id: 'M' + (i + 1) + 'm', nom: 'Maillots', cote: 'm', niveau: niv, bloc: 'm' + (i + 1), joueurs: pr[1].map(function (id) { return entree(id, F); }) });
    });
    return { equipes: equipes, raisons: {} };
  }
  // proposition pour un entraînement ; renvoie { equipes, banc, raisons, reglages }
  function proposerEnt(ids, F, H, reg, today) {
    var r = regEnt(reg, ids, F), out;
    if (r.partie === 'matchs') out = matchsDe(ids, F, H, r.mode, r.nbMatchs);
    else if (!r.separer) out = groupesDe(ids, F, H, r.mode, r.n, '', today);
    else {
      var av = [], ar = [], sans = [], raisons = {};
      ids.forEach(function (id) { var t = typePoste(posteDefaut(F[id])); (t === 'av' ? av : t === 'ar' ? ar : sans).push(id); });
      // pas encore de poste : avec le côté le moins fourni (par groupe), pour équilibrer
      sans.sort(triForce(F)).forEach(function (id) {
        var cote = av.length / r.nAv <= ar.length / r.nAr ? 'av' : 'ar';
        (cote === 'av' ? av : ar).push(id);
        raisons[id] = 'Pas encore de poste dans sa fiche : avec les ' + (cote === 'av' ? 'avants' : 'arrières') + ' pour équilibrer.';
      });
      var A = groupesDe(av, F, H, r.mode, r.nAv, 'av', today), R = groupesDe(ar, F, H, r.mode, r.nAr, 'ar', today);
      [A.raisons, R.raisons].forEach(function (x) { for (var k in x) if (!raisons[k]) raisons[k] = x[k]; });
      out = { equipes: A.equipes.concat(R.equipes), raisons: raisons };
    }
    return { equipes: out.equipes, banc: [], raisons: out.raisons || {}, reglages: r };
  }
  // la même organisation, vide : tout le monde en « Pas placés »
  function videEnt(ids, F, reg, today) {
    var p = proposerEnt(ids, F, {}, reg, today);
    p.equipes.forEach(function (t) { t.joueurs = []; });
    p.banc = ids.slice(); p.raisons = {};
    return p;
  }
  // reprendre les groupes d'un entraînement précédent : les absents sortent, les nouveaux attendent dans « Pas placés »
  function reprendre(c, ids, F) {
    var o = clone({ reglages: c.reglages, equipes: c.equipes, banc: [] }), dans = {};
    o.equipes.forEach(function (t) {
      t.joueurs = t.joueurs.filter(function (j) { return ids.indexOf(j.id) >= 0; });
      t.joueurs.forEach(function (j) { dans[j.id] = true; j.n = niveauDe(F[j.id]); });
    });
    o.banc = ids.filter(function (id) { return !dans[id]; });
    o.raisons = {};
    return o;
  }
  // ce qu'il faut regarder dans des groupes d'entraînement
  function alertesEnt(c, F, presents) {
    var out = [], eqs = c.equipes || [], placed = {}, match = c.reglages && c.reglages.partie === 'matchs', equi = match || (c.reglages && c.reglages.mode === 'equilibre');
    eqs.forEach(function (t) { (t.joueurs || []).forEach(function (j) { placed[j.id] = t.id; }); });
    (c.banc || []).forEach(function (id) { placed[id] = 'banc'; });
    var oublis = (presents || []).filter(function (id) { return !placed[id]; });
    if (oublis.length) out.push({ k: 'oubli', niveau: 'warn', texte: oublis.length + ' présent' + (oublis.length > 1 ? 's' : '') + ' pas encore placé' + (oublis.length > 1 ? 's' : '') + ' : ' + noms(oublis, F) + ' (« Pas placés »).', ids: oublis });
    var sansNiv = Object.keys(placed).filter(function (id) { return placed[id] !== 'banc' && F[id] && !F[id].niveau; });
    if (sansNiv.length) out.push({ k: 'niveau', niveau: 'info', texte: 'Niveau à renseigner : ' + noms(sansNiv, F) + '.', ids: sansNiv });
    blocsDe(c).forEach(function (k) {
      var ts = eqs.filter(function (t) { return blocDe(t) === k; }), st = ts.map(function (t) { return stats(t, F, 5); });
      var ou = match ? nomBloc(k) + ' : ' : '';
      ts.forEach(function (t, i) { if (!st[i].n) out.push({ k: 'vide', niveau: 'warn', texte: ou + nomEq(t) + ', personne pour l\'instant.' }); });
      if (ts.length < 2) return;
      var mx = 0, mn = 99, iMx = 0, iMn = 0;
      st.forEach(function (s, i) { if (s.n > mx) { mx = s.n; iMx = i; } if (s.n < mn) { mn = s.n; iMn = i; } });
      // groupes de niveau : les effectifs suivent les niveaux (simple info) et l'écart de plaquage est voulu
      if (equi ? mx - mn >= 2 : mx - mn >= 3) out.push({ k: 'taille', niveau: equi ? 'warn' : 'info', texte: ou + 'effectifs déséquilibrés, ' + nomEq(ts[iMx]) + ' ' + mx + ' et ' + nomEq(ts[iMn]) + ' ' + mn + '.', fix: equi ? bestMove(c, F, {}, ts[iMx].id, ts[iMn].id) : null });
      var hi = 0, lo = 0;
      st.forEach(function (s, i) { if (s.plaq > st[hi].plaq) hi = i; if (s.plaq < st[lo].plaq) lo = i; });
      if (equi && st[hi].n && st[lo].n && st[hi].plaq - st[lo].plaq >= 0.6) out.push({ k: 'plaquage', niveau: 'warn', texte: ou + 'écart de plaquage, ' + nomEq(ts[hi]) + ' ' + virg(st[hi].plaq) + ' ★, ' + nomEq(ts[lo]) + ' ' + virg(st[lo].plaq) + ' ★.', fix: bestSwap(c, F, {}, ts[hi].id, ts[lo].id) });
      if (match && ts.length === 2 && Math.abs(st[0].av - st[1].av) >= 3) out.push({ k: 'avar', niveau: 'info', texte: ou + st[0].av + ' avants chez les ' + nomEq(ts[0]) + ', ' + st[1].av + ' chez les ' + nomEq(ts[1]) + '.' });
    });
    return out;
  }

  // ---------- Différences entre deux compos (contre-proposition) ----------
  function diff(a, b) {
    var pa = {}, pb = {}, out = [];
    function idx(c, p) {
      (c.equipes || []).forEach(function (t) { t.joueurs.forEach(function (j) { p[j.id] = { eq: t.id, poste: j.poste || '' }; }); });
      (c.banc || []).forEach(function (id) { p[id] = { eq: 'banc', poste: '' }; });
    }
    idx(a, pa); idx(b, pb);
    Object.keys(pa).concat(Object.keys(pb).filter(function (k) { return !pa[k]; })).forEach(function (id) {
      var x = pa[id] || { eq: '', poste: '' }, y = pb[id] || { eq: '', poste: '' };
      if (x.eq !== y.eq) out.push({ id: id, de: x.eq, vers: y.eq, poste: y.poste });
      else if (x.poste !== y.poste) out.push({ id: id, de: x.eq, vers: y.eq, posteDe: x.poste, poste: y.poste });
    });
    return out;
  }

  // ---------- Compo vide (départ de zéro) ----------
  function vide(ids, reglages) {
    return { equipes: teamIds(nbOf(reglages)).map(function (id) { return { id: id, niveau: id.charAt(0), joueurs: [] }; }), banc: ids.slice(), raisons: {} };
  }
  // les présents d'un événement : réponses Spond + ajouts à la main − retraits
  function presents(e) {
    var out = [], ret = e.retraits || [];
    (e.presents || []).concat(e.ajouts || []).forEach(function (id) { if (ret.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  // nature d'un événement d'après son titre (et le jour)
  function sorteDuTitre(titre) {
    var t = String(titre || '').toLowerCase();
    if (/plateau|tournoi|festival|rassemblement/.test(t)) return 'plateau';
    if (/entra[iî]nement|entrainement|s[ée]ance/.test(t)) return 'entrainement';
    return 'autre';
  }

  return {
    NIV: NIV, NOM_NIV: NOM_NIV, COUL_NIV: COUL_NIV, POSTES10: POSTES10, SEUIL: SEUIL, BON: BON, TAILLE: TAILLE, FORMATS: FORMATS,
    fiches: fiches, historique: historique, hOf: hOf, suggestNb: suggestNb, teamIds: teamIds, nbOf: nbOf, fmt: fmt,
    proposer: proposer, vide: vide, stats: stats, alertes: alertes, apparier: apparier, scoreNiveau: scoreNiveau,
    moveTo: moveTo, swap: swap, setPoste: setPoste, where: where, diff: diff, presents: presents, sorteDuTitre: sorteDuTitre,
    nomPoste: nomPoste, frDate: frDate,
    STYLES: STYLES, AVANTS: AVANTS, postesDe: postesDe, posteDefaut: posteDefaut, typePoste: typePoste, typeDe: typeDe, sections: sections, ORDRE: ORDRE,
    PARTIES: PARTIES, regEnt: regEnt, proposerEnt: proposerEnt, videEnt: videEnt, reprendre: reprendre, alertesEnt: alertesEnt,
    blocDe: blocDe, blocsDe: blocsDe, nomBloc: nomBloc, nomEq: nomEq
  };
})();
