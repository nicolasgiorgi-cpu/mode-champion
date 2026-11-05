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
  // (v46) les niveaux en dégradé de violet, repris partout ; (v47) plus contrastés : A violet vif, B violet pâle, C presque blanc,
  // lettre toujours en noir (palette « B au milieu » choisie par Nicolas le 04/11)
  var COUL_NIV = { A: '#9A4BFF', B: '#BFA6FF', C: '#F6F3FF' };
  // Jeu à 10 (règlement FFR M12) : mêlée 3 + 2 (les avants), puis 5 arrières (dans l'appli, « arrières » = les lignes arrières : 9, 10, centres, ailiers).
  // Derrière la charnière (9 et 10) : 1 centre et 2 ailiers (décidé par Nicolas le 20/10 ; à ajuster ici si le club joue autrement).
  var POSTES10 = [['pilier', 2], ['talonneur', 1], ['troisieme-ligne', 2], ['demi-de-melee', 1], ['ouvreur', 1], ['centre', 1], ['ailier', 2]];
  var SLOTS10 = [];
  POSTES10.forEach(function (p) { for (var i = 0; i < p[1]; i++) SLOTS10.push(p[0]); });
  // Étoiles de plaquage attendues pour jouer dans un niveau (proposition, à valider par les éducs) :
  // l'appli prévient, elle n'interdit rien.
  // (v44) le plaquage est noté de 0 à 3 (avant : de 0 à 5, avec 4 pour A et 3 pour B)
  var SEUIL = { A: 3, B: 2, C: 0 };
  var BON = 2;                                            // « bon plaqueur » : 2 ou plus
  var ECART = 0.4;                                        // écart de plaquage moyen signalé entre deux équipes (0,6 sur 5 avant la v44)
  var TAILLE = { 5: { min: 5, ideal: 7 }, 10: { min: 10, ideal: 12 } };
  var FORMATS = [5, 10];

  function dist(a, b) { return Math.abs(NIV.indexOf(a) - NIV.indexOf(b)); }
  // (v45) les passerelles d'un enfant : un ou deux autres niveaux (lettres de la fiche, ex. 'AC') ; aucune sans niveau
  function lettresPas(s, niv) { if (NIV.indexOf(niv) < 0) return []; return NIV.filter(function (n) { return n !== niv && String(s || '').indexOf(n) >= 0; }); }
  function pasDe(f) { return f ? (Array.isArray(f.passerelles) ? f.passerelles : lettresPas(f.passerelle, f.niveau)) : []; }
  // peut-il jouer dans ce niveau ? (le sien, ou une de ses passerelles)
  function joueEn(f, n) { return !!f && (f.niveau === n || pasDe(f).indexOf(n) >= 0); }
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
  // (v48) « A forte » : au moins une équipe A ; les équipes C comptent comme des B (9 au plus : B1…B9)
  function nbAForte(nb) { return { A: Math.max(1, nb.A || 0), B: Math.min(9, (nb.B || 0) + (nb.C || 0)), C: 0 }; }
  // les équipes d'un plateau d'après ses réglages (organisation comprise)
  function idsEquipes(reglages) { var nb = nbOf(reglages); return teamIds(optsDe(reglages).orga === 'aforte' ? nbAForte(nb) : nb); }
  // (v50) les options d'une compo de plateau (liste validée par Nicolas, 05/11) ; les anciens « styles » s'y ramènent :
  // orga : par niveau | A forte ; effectifs : équilibrés (tailles réglables) | suivre les niveaux (personne ne change de niveau) ;
  // passerelles (v56, décision de Nicolas) : parmi ceux qui ont une passerelle, qui change de niveau — par niveau (le plaquage d'abord) |
  //   roulant (chacun son tour, et une par équipe au-dessus même si elle est pleine : sinon, quand les Confirmés remplissent l'équipe A, personne ne monte) ;
  // quand les passerelles ne suffisent pas, les enfants sans passerelle changent selon le plaquage (v56 : plus d'option « qui change de niveau », un doublon) ;
  // copains : un pour chacun | d'abord | sans
  var OPTS = { orga: ['niveau', 'aforte'], effectifs: ['equilibre', 'niveaux'], passerelles: ['niveau', 'roulant'], copains: ['un', 'dabord', 'sans'] };
  var PAS_ANC = { tour: 'roulant', aucune: 'niveau' };   // (v56) les valeurs d'avant : compos déjà faites, site plus ancien encore ouvert
  function optsDe(reglages, style) {
    var r = reglages || {}, o = r.opts && typeof r.opts === 'object' ? r.opts : null, st = style || r.style || 'equilibre', out = {};
    var leg = { orga: st === 'aforte' ? 'aforte' : 'niveau', effectifs: st === 'strict' ? 'niveaux' : 'equilibre', passerelles: 'roulant', copains: st === 'copains' ? 'dabord' : 'un' };
    Object.keys(OPTS).forEach(function (k) {
      var v = o ? o[k] : undefined;
      if (k === 'passerelles' && PAS_ANC[v]) v = PAS_ANC[v];
      out[k] = OPTS[k].indexOf(v) >= 0 ? v : leg[k];
    });
    // (v56) plus de compteur « Montent en A » : c'est « Roulant », une par équipe, vers A et vers B
    out.montees = out.passerelles === 'roulant' && out.effectifs !== 'niveaux' ? 1 : 0;
    return out;
  }
  // le style d'avant la v50 qui s'en rapproche le plus (pour un site plus ancien encore ouvert)
  function styleDe(o) { return o.orga === 'aforte' ? 'aforte' : o.effectifs === 'niveaux' ? 'strict' : o.copains === 'dabord' ? 'copains' : 'equilibre'; }
  function niveauDe(f) { return f && NIV.indexOf(f.niveau) >= 0 ? f.niveau : ''; }
  // (v48) les noms courts de la liste Enfants : un homonyme (« Baptiste Lemaire », même premier mot qu'un autre enfant)
  // devient « Baptiste Lem. » (les premières lettres de son nom qui le distinguent, 3 au moins), comme sur l'écran de connexion
  function cleNom(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function nomsCourts(joueurs) {
    var grp = {}, out = {};
    joueurs.forEach(function (j) {
      var m = /^(\S+)\s+(.+)$/.exec(String(j.prenom || '').trim().replace(/\s+/g, ' '));
      if (!m) return;
      var n = m[2].replace(/^((de|du|des|la|le|d'|di|da|van|von)\s+)+/i, '') || m[2];   // « Hugo de la Tour » → Tou.
      (grp[cleNom(m[1])] = grp[cleNom(m[1])] || []).push({ id: j.id, p: m[1], n: n });
    });
    Object.keys(grp).forEach(function (k) {
      var g = grp[k];
      if (g.length < 2) return;   // pas d'homonyme (ex. un prénom composé « Jean Pierre ») : le nom tel quel
      g.forEach(function (x) {
        var autres = g.filter(function (y) { return y !== x; }).map(function (y) { return cleNom(y.n); });
        for (var L = 3; L < x.n.length; L++) {
          var pre = cleNom(x.n.slice(0, L));
          if (!autres.some(function (a) { return a.indexOf(pre) === 0; })) { out[x.id] = x.p + ' ' + x.n.slice(0, L).trim() + '.'; return; }
        }
      });
    });
    return out;
  }
  // Les postes d'un joueur, dans l'ordre : ceux de sa fiche (ses postes préférés ★ d'abord, réglés par les éducs),
  // sinon les vœux de l'enfant (mission « jeu à 10 »).
  function postesDe(f) {
    var l = (f && f.postesOk && f.postesOk.length) ? f.postesOk : ((f && f.voeux) || []), o = [];
    l.forEach(function (p) { if (p && o.indexOf(p) < 0) o.push(p); });
    return o;
  }
  function posteDefaut(f) { return postesDe(f)[0] || ''; }
  // (v43) ses postes préférés ★ (un ou plusieurs) ; sans postes réglés : son 1er vœu
  // (pref = liste réglée par les éducs, même vide ; sinon le 1er poste connu de sa fiche, ou son 1er vœu)
  function prefDe(f) {
    if (f && f.postesOk && f.postesOk.length) {
      if (Array.isArray(f.pref)) return f.pref.filter(function (p) { return f.postesOk.indexOf(p) >= 0; });
      var p0 = f.postesOk.filter(function (p) { return ORDRE.indexOf(p) >= 0; })[0];
      return p0 ? [p0] : [];
    }
    var v0 = ((f && f.voeux) || []).filter(function (p) { return ORDRE.indexOf(p) >= 0; })[0];
    return v0 ? [v0] : [];
  }
  // (v43) son lien avec un poste : 'pref' (★), 'sec' (peut aussi jouer) ou '' (pas ce poste)
  function lienPoste(f, poste) { return prefDe(f).indexOf(poste) >= 0 ? 'pref' : postesDe(f).indexOf(poste) >= 0 ? 'sec' : ''; }
  // (v35) la répartition des postes RÉGLÉS sur les fiches (pas les vœux) : pour chaque poste, ceux qui l'ont en poste
  // principal et ceux qui peuvent le jouer ; « sans » = pas encore de poste réglé. ids : les enfants à compter.
  function repartition(ids, F) {
    var o = { postes: ORDRE.map(function (p) { return { id: p, princ: [], autres: [] }; }), sans: [] }, ix = {};
    o.postes.forEach(function (x) { ix[x.id] = x; });
    (ids || []).forEach(function (id) {
      var f = F[id] || {}, l = (f.postesOk || []).filter(function (p, i, a) { return ix[p] && a.indexOf(p) === i; }), pf = prefDe(f);
      if (!l.length) { o.sans.push(id); return; }
      l.forEach(function (p) { ix[p][pf.indexOf(p) >= 0 ? 'princ' : 'autres'].push(id); });
    });
    return o;
  }
  // rang d'un poste pour un joueur : 0 = un de ses postes préférés (v43 : il peut y en avoir plusieurs),
  // 1, 2… = ses autres postes ; sinon 9
  function rang(f, poste) {
    if (prefDe(f).indexOf(poste) >= 0) return 0;
    var l = postesDe(f).filter(function (p) { return prefDe(f).indexOf(p) < 0; }), i = l.indexOf(poste);
    return i >= 0 ? i + 1 : 9;
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
      var t = p.terrain || {}, m = null, ok = Array.isArray(t.postesOk) ? t.postesOk.filter(function (x, i, a) { return a.indexOf(x) === i; }) : [];
      // (v43) les préférés ★ : la liste du serveur, sinon (fiche d'avant la v43) le 1er poste ; postesOk les met en tête
      var pref = Array.isArray(t.postesPref) ? t.postesPref.filter(function (x) { return ok.indexOf(x) >= 0; }) : ok.slice(0, 1);
      (p.missions || []).forEach(function (x) { if (x.mission === 'jeu10') m = x; });
      var r = (m && m.reponses) || {};
      out[p.joueur.id] = {
        id: p.joueur.id, prenom: p.joueur.prenom, couleur: p.joueur.couleur, actif: p.joueur.actif !== false,
        niveau: NIV.indexOf(t.niveau) >= 0 ? t.niveau : '', passerelle: NIV.indexOf(t.niveau) >= 0 ? lettresPas(t.passerelle, t.niveau).join('') : '',
        passerelles: NIV.indexOf(t.niveau) >= 0 ? lettresPas(t.passerelle, t.niveau) : [],
        // (v46) null = pas encore évalué (0 est un niveau) ; les calculs le comptent comme 0, mais il n'est pas signalé « sous le repère »
        plaquage: t.plaquage === null || t.plaquage === undefined || t.plaquage === '' ? null : Math.max(0, Math.min(3, Number(t.plaquage) || 0)),
        voeux: Array.isArray(r.postes) ? r.postes.slice(0, 3) : [], postesOk: pref.concat(ok.filter(function (x) { return pref.indexOf(x) < 0; })), pref: pref,
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
          // (v48) ateliers « A forte » : un Confirmé dans un groupe B mélangé (sans niveau) a joué en B (tour de rôle des A en trop)
          var tn = t.niveau || (j.n === 'A' && /FB\d+$/.test(t.id || '') ? 'B' : '');
          var autre = !!(j.n && tn && tn !== j.n);
          if (autre) { o.autre++; o.dernierAutre = date; }
          if ((f.copains || []).length) {
            if (cps.length) { o.avecCopain++; o.sansCopainSerie = 0; } else o.sansCopainSerie++;
          }
          ids.forEach(function (c) { if (c !== j.id) o.vus[c] = (o.vus[c] || 0) + 1; });
          if (sorte === 'plateau') {
            o.niveaux[t.niveau] = (o.niveaux[t.niveau] || 0) + 1;
            if (j.poste) o.postes[j.poste] = (o.postes[j.poste] || 0) + 1;
          }
          o.liste.push({ date: date, titre: x.e.titre, evenementId: x.e.id, sorte: sorte, equipe: t.id, nom: t.nom || t.id, niveau: tn, poste: j.poste || '',
            autre: autre, copains: cps, avec: ids.filter(function (c) { return c !== j.id; }) });
        });
      });
    });
    return H;
  }
  function hOf(H, id) { return (H && H[id]) || { plateaux: 0, entrainements: 0, autre: 0, dernierAutre: '', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [] }; }
  // (v45) la rotation se compte par niveau de passerelle : la dernière fois (et combien de fois) qu'il a joué en n hors de son niveau
  function dernierEn(H, id, n) { var d = ''; hOf(H, id).liste.forEach(function (x) { if (x.autre && x.niveau === n && x.date > d) d = x.date; }); return d; }
  function nbEn(H, id, n) { return hOf(H, id).liste.filter(function (x) { return x.autre && x.niveau === n; }).length; }

  // ---------- Nombre d'équipes conseillé par niveau ----------
  // (v49) le nombre de joueurs voulu dans chaque équipe d'un plateau : équilibré par défaut (écart d'un joueur au plus) ;
  // les places en plus vont aux équipes des niveaux les plus nombreux (le moins d'enfants à changer de niveau).
  // Demande de Nicolas (05/11) : « il faut que le nombre d'enfants soit équilibré », réglable équipe par équipe.
  function taillesDefaut(ids, F, reglages) {
    var tids = idsEquipes(reglages), k = tids.length, out = {};
    if (!k) return out;
    var n = ids.length, base = Math.floor(n / k), extra = n - base * k, af = optsDe(reglages).orga === 'aforte';
    var aEq = {}; tids.forEach(function (id) { aEq[id.charAt(0)] = (aEq[id.charAt(0)] || 0) + 1; });
    var cnt = { A: 0, B: 0, C: 0 };
    ids.forEach(function (id) {
      var l = niveauDe(F[id]) || 'B';
      if (af) l = l === 'A' ? 'A' : 'B';
      else if (!aEq[l]) l = NIV.filter(function (x) { return aEq[x]; }).sort(function (a, b) { return dist(a, l) - dist(b, l) || (a === 'C' ? -1 : 1); })[0];
      cnt[l]++;
    });
    // « A forte » : la place en plus va d'abord à l'équipe A (une équipe A pleine, comme en v48)
    function nat(id) { return (af && id.charAt(0) === 'A' ? 1e6 : 0) + cnt[id.charAt(0)] / aEq[id.charAt(0)]; }
    tids.forEach(function (id) { out[id] = base; });
    tids.slice().sort(function (a, b) { return nat(b) - nat(a) || (a < b ? -1 : 1); }).slice(0, extra).forEach(function (id) { out[id]++; });
    return out;
  }
  // les tailles réglées si elles vont (les mêmes équipes, le bon total), sinon celles par défaut
  function tailles(ids, F, reglages) {
    var t = reglages && reglages.tailles, tids = idsEquipes(reglages), s = 0;
    if (t && typeof t === 'object' && tids.length && tids.every(function (id) { var v = t[id]; if (!(v >= 0) || Math.floor(v) !== v) return false; s += v; return true; }) && s === ids.length) {
      var o = {}; tids.forEach(function (id) { o[id] = t[id]; }); return o;
    }
    return taillesDefaut(ids, F, reglages);
  }
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
  // remplir (v35, matchs d'entraînement) : les places encore vides sont données à ceux qui restent (tout le monde joue),
  // d'abord du même côté (avant / arrière) que leur poste principal. Un enfant SANS AUCUN poste (ni fiche, ni vœux) n'est
  // jamais placé d'office (décision de Nicolas, 31/10) : il reste « sans poste », pour qu'on voie qu'il faut lui en donner un.
  function apparier(ids, F, remplir) {
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
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(function (maxR) {   // 7 : le 7e poste d'un enfant sans préféré ★
      ids.forEach(function (pid) { if (slotOf[pid] === undefined) tryAssign(pid, maxR, {}); });
    });
    if (remplir) ids.forEach(function (pid) {
      if (slotOf[pid] !== undefined || !postesDe(F[pid]).length) return;
      var libres = [];
      slots.forEach(function (p, s) { if (playerOf[s] === undefined) libres.push(p); });
      var p = choixLibre(libres, F[pid]);
      if (!p) return;
      for (var s = 0; s < slots.length; s++) if (playerOf[s] === undefined && slots[s] === p) { playerOf[s] = pid; slotOf[pid] = s; return; }
    });
    var poste = {}, manquants = [];
    ids.forEach(function (pid) { poste[pid] = slotOf[pid] !== undefined ? slots[slotOf[pid]] : ''; });
    slots.forEach(function (p, s) { if (playerOf[s] === undefined) manquants.push(p); });
    return { poste: poste, manquants: manquants };
  }

  // (v35) une place libre pour quelqu'un dont les postes de fiche sont pris : de son côté (avant / arrière) ;
  // sans poste du tout : aucune (il reste « sans poste », à régler par les éducs)
  function choixLibre(libres, f) {
    var ty = typePoste(posteDefaut(f));
    if (!libres.length || !ty) return '';
    var meme = libres.filter(function (p) { return typePoste(p) === ty; });
    return meme[0] || libres[0];
  }
  // la place d'un joueur qui arrive dans une équipe au jeu à 10 : son poste de fiche s'il est libre ; dans un match
  // d'entraînement (remplir : tout le monde joue), sinon une place libre de son côté ; sinon '' (remplaçant)
  function placeLibre(t, id, F, remplir) {
    var pris = {}, libres = [];
    (t.joueurs || []).forEach(function (j) { if (j.id !== id && j.poste) pris[j.poste] = (pris[j.poste] || 0) + 1; });
    SLOTS10.forEach(function (p) { if (pris[p]) pris[p]--; else libres.push(p); });
    var p = postesDe(F[id]).filter(function (x) { return libres.indexOf(x) >= 0; })[0];
    return p || (remplir ? choixLibre(libres, F[id]) : '');
  }

  // ---------- Score d'une répartition dans un niveau (plus petit = mieux) ----------
  // somme des scores des équipes ; les moyennes du niveau ne changent pas pendant les échanges
  // (v44) plaquage noté de 0 à 3 : ses poids sont ceux de la note sur 5 × 5/3 (mêmes équilibres qu'avant)
  var W = { taille: 5, plaq: 4 * 5 / 3, bons: 1.5, copain: 1, seul: 0.75, poste: 1.5 };
  // styles de proposition : « equilibre » (par défaut), « copains » (copains d'abord), « strict » (sans passerelles)
  var STYLES = {
    equilibre: { nom: 'Équilibrée', texte: 'Plaquage équilibré, passerelles à tour de rôle, un copain pour chacun quand c\'est possible.', w: W },
    copains: { nom: 'Copains d\'abord', texte: 'Chacun avec ses copains en priorité, le plaquage reste équilibré.', w: { taille: 5, plaq: 2 * 5 / 3, bons: 1, copain: 3, seul: 1.5, poste: 1.5 } },
    strict: { nom: 'Niveaux stricts', texte: 'Chacun dans son niveau (pas de passerelle), plaquage équilibré.', w: W, sansPasserelles: true },
    // (v48) une équipe A forte, des équipes B équilibrées (décision de Nicolas, 04/11) : voir proposerAForte
    aforte: { nom: 'A forte', texte: 'Une équipe A avec les Confirmés (complétée par les meilleurs B), les autres mélangent B et C, équilibrées.', w: W, aforte: true }
  };
  // (v56) le poids des copains selon l'option : « sans » = ils ne comptent pas du tout
  function poidsCop(O, base, dabord) { return O.copains === 'dabord' ? dabord : O.copains === 'sans' ? Object.assign({}, base, { copain: 0, seul: 0 }) : base; }
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
    s += W.taille * Math.abs(t.length - (t.cible !== undefined ? t.cible : cx.avgN));   // (v49) la taille voulue de l'équipe
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
          // (v49) aussi vers une équipe sous sa taille voulue, depuis une équipe au-dessus de la sienne
          if (from.length - to.length < 2 && !(from.cible !== undefined && from.length > from.cible && to.length < to.cible)) return;
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
    var format = fmt(reglages), nb = nbOf(reglages), raisons = {}, O = optsDe(reglages, style);
    var S = { w: poidsCop(O, W, STYLES.copains.w), sansPasserelles: O.effectifs === 'niveaux' };   // (v56) « Suivre les niveaux » : personne ne change de niveau
    if (O.orga === 'aforte') return proposerAForte(ids, F, H, reglages, O);   // (v48) toujours au moins une équipe A
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
        // (v45) le niveau le plus proche qui a une équipe ; à égalité (un B), une de ses passerelles, sinon C
        var proches = NIV.filter(ok).sort(function (a, b) { return dist(a, n) - dist(b, n) || (a === 'C' ? -1 : 1); });
        var egaux = proches.filter(function (x) { return dist(x, n) === dist(proches[0], n); });
        var alt = egaux.filter(function (x) { return !S.sansPasserelles && pasDe(f).indexOf(x) >= 0; })[0] || egaux[0];
        raisons[id] = 'Pas d\'équipe ' + n + ' : joue en ' + alt + '.';
        n = alt;
      }
      lv[id] = n;
    });
    // 2. les passerelles comblent les écarts d'effectif entre niveaux (d'abord ceux qui attendent leur tour) ; v45 : vers n'importe quel niveau de sa fiche
    var total = ids.length, per = total / tids.length;
    // (v49) les tailles voulues des équipes (Niveaux stricts : les effectifs suivent les niveaux)
    var cible = O.effectifs === 'niveaux' ? null : tailles(ids, F, Object.assign({}, reglages, { opts: O }));
    function voulu(n) { if (!cible) return nb[n] * per; var s = 0; tids.forEach(function (id) { if (id.charAt(0) === n) s += cible[id]; }); return s; }
    function count(n) { var c = 0; ids.forEach(function (id) { if (lv[id] === n) c++; }); return c; }
    function ecart(n) { return count(n) - voulu(n); }
    var guard = S.sansPasserelles ? 60 : 0;
    // ceux qui jouent dans leur niveau et ont une passerelle vers « to » (par niveau visé, v45) :
    // (v56) « Roulant » : dans l'ordre de leur tour, puis le plaquage ; « Par niveau » : le plaquage (vers le haut les meilleurs plaqueurs), puis leur tour
    function candidats(from, to) {
      var monte = NIV.indexOf(to) < NIV.indexOf(from);
      return ids.filter(function (id) { var f = F[id] || {}; return lv[id] === from && princ[id] === from && pasDe(f).indexOf(to) >= 0; }).sort(function (a, b) {
        var da = dernierEn(H, a, to), db = dernierEn(H, b, to), na = nbEn(H, a, to), nb2 = nbEn(H, b, to);
        var t = da !== db ? (da < db ? -1 : 1) : na - nb2;   // jamais en « to » / le plus ancien d'abord
        var pa = plqN(F, a), pb = plqN(F, b), p = pa !== pb ? (monte ? pb - pa : pa - pb) : 0;
        return (O.passerelles === 'niveau' ? p || t : t || p) || (a < b ? -1 : 1);
      });
    }
    while (guard++ < 60) {
      var move = null;
      // (v45) d'abord vers un niveau voisin ; à deux niveaux (C ↔ A), d'abord en chaîne par le niveau du milieu
      // (un B monte en A, un C prend sa place en B), puis directement
      [1, 2].forEach(function (d) { NIV.forEach(function (from) {
        NIV.forEach(function (to) {
          if (move || dist(from, to) !== d || !ok(to)) return;
          var ef = ecart(from), et = ecart(to);
          if (!(ef > 0.5 && et < -0.5)) return;
          // déplacer seulement si l'écart total diminue
          if (!(Math.abs(ef - 1) + Math.abs(et + 1) < Math.abs(ef) + Math.abs(et))) return;
          if (d === 2) {
            var mid = NIV[(NIV.indexOf(from) + NIV.indexOf(to)) / 2];
            if (ok(mid)) { var cm = candidats(mid, to), cf = candidats(from, mid); if (cm.length && cf.length) { move = { id: cm[0], to: to, puis: { id: cf[0], to: mid } }; return; } }
          }
          var c = candidats(from, to);
          if (c.length) move = { id: c[0], to: to };
        });
      }); });
      if (!move) break;
      [move, move.puis].forEach(function (m) {
        if (!m) return;
        lv[m.id] = m.to;
        var der = dernierEn(H, m.id, m.to);
        raisons[m.id] = 'Joue en ' + m.to + ' grâce à sa passerelle : ' + (O.passerelles === 'niveau' ? 'le plaquage d\'abord.' : der ? 'son tour (dernière fois le ' + frDate(der) + ').' : 'son tour, il n\'y a pas encore joué.');
      });
    }
    // 2 ter. (v50, v56) « Roulant » : une passerelle par équipe monte à son tour, même si cette équipe est pleine (B vers A, puis C vers B),
    // sans regarder le plaquage ; quelqu'un descend en échange (d'abord ceux qui ont une passerelle vers le bas), pour garder les effectifs
    var fixe = {};
    function tourB(a, b, to) { var da = dernierEn(H, a, to), db = dernierEn(H, b, to); if (da !== db) return da < db ? -1 : 1; return nbEn(H, a, to) - nbEn(H, b, to); }
    if (O.montees) [['B', 'A'], ['C', 'B']].forEach(function (x) {
      var de = x[0], vers = x[1];
      if (!ok(de) || !ok(vers)) return;
      var deja = ids.filter(function (id) { return lv[id] === vers && princ[id] === de; });
      deja.forEach(function (id) { fixe[id] = true; });
      var nUp = deja.length, veut = O.montees * nb[vers];
      var cs = ids.filter(function (id) { return lv[id] === de && princ[id] === de && !fixe[id] && pasDe(F[id]).indexOf(vers) >= 0; }).sort(function (a, b) { return tourB(a, b, vers) || (a < b ? -1 : 1); });
      while (nUp < veut && cs.length) {
        var up = cs.shift(), der = dernierEn(H, up, vers);
        lv[up] = vers; fixe[up] = true; nUp++;
        raisons[up] = 'Monte en ' + vers + ' grâce à sa passerelle : ' + (der ? 'son tour (dernière fois le ' + frDate(der) + ').' : 'son tour, il n\'y a pas encore joué.');
        if (cible && ecart(vers) < 1) continue;   // cette équipe manquait de monde : personne ne descend
        var ds = ids.filter(function (id) { return lv[id] === vers && princ[id] === vers && !fixe[id]; }).sort(function (a, b) {
          var xa = pasDe(F[a]).indexOf(de) >= 0 ? 0 : 1, xb = pasDe(F[b]).indexOf(de) >= 0 ? 0 : 1;
          if (xa !== xb) return xa - xb;
          var t = tourB(a, b, de), p = plqN(F, a) - plqN(F, b);
          // ceux qui ont une passerelle vers le bas : à leur tour ; les autres : le moins avancé, et à plaquage égal à leur tour
          return (xa === 0 ? t || p : p || t) || (a < b ? -1 : 1);
        });
        if (ds.length) { lv[ds[0]] = de; fixe[ds[0]] = true; raisons[ds[0]] = 'Laisse sa place à une passerelle : joue en ' + de + '.'; }
      }
    });
    // 2 bis. (v49) les effectifs restent déséquilibrés (pas assez de passerelles) : des enfants changent de niveau voisin,
    // d'abord ceux qui reviennent dans leur niveau, puis vers le haut les meilleurs plaqueurs, vers le bas les moins avancés,
    // et à plaquage égal chacun son tour (celui qui a changé de niveau le moins récemment)
    if (cible) {
      for (var g2 = 0; g2 < 80; g2++) {
        var pr = null;
        NIV.forEach(function (from) { NIV.forEach(function (to) {
          if (from === to || !ok(to)) return;
          if (ecart(from) >= 1 && ecart(to) <= -1 && (!pr || dist(from, to) < dist(pr[0], pr[1]))) pr = [from, to];
        }); });
        if (!pr) break;
        var dir = NIV.indexOf(pr[1]) > NIV.indexOf(pr[0]) ? 1 : -1, nx = NIV[NIV.indexOf(pr[0]) + dir];
        if (!ok(nx)) nx = pr[1];
        var monte = NIV.indexOf(nx) < NIV.indexOf(pr[0]), dep = pr[0];
        var cand = ids.filter(function (id) { return lv[id] === dep && !fixe[id]; }).sort(function (a, b) {
          var ra = dist(princ[a] || 'B', nx), rb = dist(princ[b] || 'B', nx);
          if (ra !== rb) return ra - rb;   // ceux qui reviennent dans leur niveau, puis les plus proches du niveau visé
          var xa = pasDe(F[a]).indexOf(nx) >= 0 ? 0 : 1, xb = pasDe(F[b]).indexOf(nx) >= 0 ? 0 : 1;
          if (xa !== xb) return xa - xb;
          var pa = plqN(F, a), pb = plqN(F, b);   // pas encore évalué : au milieu (ni le premier à descendre, ni à monter)
          var p = pa !== pb ? (monte ? pb - pa : pa - pb) : 0, t = tourB(a, b, nx);
          // (v56) « Roulant » : ceux qui ont une passerelle à leur tour ; sans passerelle : le plaquage d'abord, quelle que soit l'option
          return (xa === 0 && O.passerelles === 'roulant' ? t || p : p || t) || (a < b ? -1 : 1);
        });
        if (!cand.length) break;
        lv[cand[0]] = nx;
        if (princ[cand[0]] === nx) delete raisons[cand[0]];
        else if (!princ[cand[0]]) raisons[cand[0]] = 'Niveau à renseigner : placé en ' + nx + '.';
        else raisons[cand[0]] = 'Pour équilibrer les équipes : joue en ' + nx + '.';
      }
    }
    // 3. dans chaque niveau : serpentin par étoiles de plaquage, puis échanges
    var equipes = [];
    NIV.forEach(function (n) {
      if (!ok(n)) return;
      var list = ids.filter(function (id) { return lv[id] === n; });
      list.sort(function (a, b) { var d = ((F[b] || {}).plaquage || 0) - ((F[a] || {}).plaquage || 0); return d || (a < b ? -1 : 1); });
      var k = nb[n], teams = [];
      for (var i = 0; i < k; i++) { teams.push([]); if (cible) teams[i].cible = cible[n + (i + 1)]; }
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
        if (raisons[j.id] || O.copains === 'sans') return;
        var f = F[j.id] || {}, cps = (f.copains || []).filter(function (c) { return tid.indexOf(c) >= 0; });
        if (cps.length && hOf(H, j.id).sansCopainSerie) raisons[j.id] = 'Avec ' + cps.map(function (c) { return (F[c] || {}).prenom || '?'; }).join(', ') + ' : sans copain la dernière fois.';
      });
    });
    return { equipes: equipes, banc: [], raisons: raisons };
  }
  function frDate(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '/' + p[1] : d; }

  // ---------- (v48) « A forte » : une équipe A forte, les autres mélangées et équilibrées (plateaux et ateliers) ----------
  // Décision de Nicolas (04/11) : l'équipe forte = les Confirmés ; s'il en manque pour une équipe pleine, d'abord les B avec une
  // passerelle vers A (à leur tour), puis les meilleurs plaqueurs B (puis les C, même ordre) ; les A en trop jouent avec les autres
  // (d'abord ceux qui ont une passerelle vers un autre niveau, puis les moins bons plaqueurs). Les autres équipes mélangent
  // Débrouillés et Débutants, équilibrées (plaquage, niveaux, avants / arrières, postes au jeu à 10, copains).
  var WAF = { taille: 5, plaq: 4 * 5 / 3, bons: 1.5, copain: 1, seul: 0.75, poste: 1.5, niv: 1.5, avar: 1 };
  function plq(F, id) { return (F[id] || {}).plaquage || 0; }
  function plqN(F, id) { var p = (F[id] || {}).plaquage; return p === null || p === undefined ? 1.5 : p; }   // (v49) pas encore évalué : au milieu
  function forte(ids, F, H, taille, raisons, quoi, O) {
    O = O || {};
    var sansPas = O.effectifs === 'niveaux', parPlaq = O.passerelles === 'niveau', As = ids.filter(function (id) { return niveauDe(F[id]) === 'A'; }), As0 = As.slice(), fort;
    // les Confirmés, dans l'ordre où ils restent dans l'équipe forte
    As.sort(function (a, b) {
      var pa = pasDe(F[a]).length ? 1 : 0, pb = pasDe(F[b]).length ? 1 : 0, da = dernierEn(H, a, 'B'), db = dernierEn(H, b, 'B');
      // à plaquage égal, chacun son tour : celui qui a joué en B le plus récemment reste en A ; (v56) « Roulant » : le tour d'abord pour ceux qui ont une passerelle
      var p = plq(F, b) - plq(F, a), t = da !== db ? (da > db ? -1 : 1) : 0;
      return pa - pb || (pa && O.passerelles === 'roulant' ? t || p : p || t) || (a < b ? -1 : 1);
    });
    // (v50, v56) « Roulant » : les passerelles qui montent, à leur tour, sans regarder le plaquage
    var pas = sansPas ? [] : ids.filter(function (id) { var n = niveauDe(F[id]); return n && n !== 'A' && pasDe(F[id]).indexOf('A') >= 0; }).sort(function (a, b) {
      var na = NIV.indexOf(niveauDe(F[a])) - NIV.indexOf(niveauDe(F[b])); if (na) return na;
      var da = dernierEn(H, a, 'A'), db = dernierEn(H, b, 'A'); if (da !== db) return da < db ? -1 : 1;
      return nbEn(H, a, 'A') - nbEn(H, b, 'A') || (a < b ? -1 : 1);
    }).slice(0, Math.min(O.montees ? O.montees * (O.kA || 1) : 0, taille));
    // l'équipe forte est pleine de Confirmés, ou les places libres ne suffisent pas aux montées : des Confirmés laissent leur place
    if (As.length >= taille || pas.length > taille - As.length) {
      fort = As.slice(0, taille - pas.length).concat(pas);
      pas.forEach(function (id) { var der = dernierEn(H, id, 'A'); raisons[id] = 'Monte en A grâce à sa passerelle : ' + (der ? 'son tour (dernière fois le ' + frDate(der) + ').' : 'son tour, il n\'y a pas encore joué.'); });
      As.slice(taille - pas.length).forEach(function (id) { raisons[id] = pas.length && As.indexOf(id) < taille ? 'Laisse sa place à une passerelle : joue avec les autres.' : quoi[0].toUpperCase() + quoi.slice(1) + ' au complet : joue avec les autres.'; });
    } else {
      // (v50) les places libres : d'abord les passerelles qui montent (Débrouillés puis Débutants), puis comme en v48
      fort = As0.concat(pas);
      pas.forEach(function (id) { var der = dernierEn(H, id, 'A'); raisons[id] = 'Complète ' + quoi + ' grâce à sa passerelle : ' + (der ? 'son tour (dernière fois le ' + frDate(der) + ').' : 'son tour, il n\'y a pas encore joué.'); });
      var autres = [];
      ['B', 'C', ''].forEach(function (n) {
        ids.filter(function (id) { return niveauDe(F[id]) === n; }).sort(function (a, b) {
          var xa = !sansPas && pasDe(F[a]).indexOf('A') >= 0, xb = !sansPas && pasDe(F[b]).indexOf('A') >= 0;
          if (xa !== xb) return xa ? -1 : 1;
          if (xa && !parPlaq) {   // les passerelles : à leur tour (jamais en A / le plus ancien d'abord) ; (v56) « Par niveau » : le plaquage
            var da = dernierEn(H, a, 'A'), db = dernierEn(H, b, 'A');
            if (da !== db) return da < db ? -1 : 1;
            var na = nbEn(H, a, 'A'), nb2 = nbEn(H, b, 'A');
            if (na !== nb2) return na - nb2;
          }
          return plq(F, b) - plq(F, a) || (a < b ? -1 : 1);
        }).forEach(function (id) { if (pas.indexOf(id) < 0) autres.push(id); });
      });
      autres.slice(0, Math.max(0, taille - fort.length)).forEach(function (id) {
        var der = dernierEn(H, id, 'A');
        raisons[id] = !sansPas && pasDe(F[id]).indexOf('A') >= 0 ? 'Complète ' + quoi + ' grâce à sa passerelle : ' + (parPlaq ? 'le plaquage d\'abord.' : der ? 'son tour (dernière fois le ' + frDate(der) + ').' : 'son tour, il n\'y a pas encore joué.')
          : 'Complète ' + quoi + ' : parmi les meilleurs plaqueurs.';
        fort.push(id);
      });
    }
    var dans = {}; fort.forEach(function (id) { dans[id] = true; });
    return { fort: fort, reste: ids.filter(function (id) { return !dans[id]; }) };
  }
  // plateau : nb.A équipes fortes (au moins 1), nb.B + nb.C équipes « B » mélangées
  function proposerAForte(ids, F, H, reglages, O) {
    O = O || optsDe(reglages, 'aforte');
    var format = fmt(reglages), k = nbAForte(nbOf(reglages)), raisons = {}, equipes = [];
    var kA = k.A, kB = k.B, cible = tailles(ids, F, Object.assign({}, reglages, { opts: O })), tA = 0;
    if (O.effectifs === 'niveaux') {   // (v50) suivre les niveaux : l'équipe A = les Confirmés, les autres se partagent le reste
      var nA = ids.filter(function (id) { return niveauDe(F[id]) === 'A'; }).length;
      [['A', kA, nA], ['B', kB, ids.length - nA]].forEach(function (x) { for (var i = 1; i <= x[1]; i++) cible[x[0] + i] = Math.floor(x[2] / x[1]) + (i <= x[2] % x[1] ? 1 : 0); });
    }
    for (var a = 1; a <= kA; a++) tA += cible['A' + a];
    // sans équipe B : tout le monde dans les équipes A (pas d'équipe « forte » à part)
    var x = kB ? forte(ids, F, H, tA, raisons, 'l\'équipe A', Object.assign({ kA: kA }, O)) : { fort: ids.slice(), reste: [] };
    x.reste.forEach(function (id) { if (!niveauDe(F[id])) raisons[id] = 'Niveau à renseigner : placé en B.'; });
    function pose(list, k, n, w, tri) {
      if (!k) return;
      var teams = serpentin(list.slice().sort(tri), k);
      teams.forEach(function (t, i) { t.cible = cible[n + (i + 1)]; });
      ameliorer(teams, F, H, format, w);
      teams.forEach(function (t, i) {
        var po = format === 10 ? apparier(t, F).poste : {};
        equipes.push({ id: n + (i + 1), niveau: n, joueurs: t.map(function (id) { return { id: id, poste: po[id] || '', n: niveauDe(F[id]) }; }) });
      });
    }
    pose(x.fort, kA, 'A', poidsCop(O, W, STYLES.copains.w), function (a, b) { return plq(F, b) - plq(F, a) || (a < b ? -1 : 1); });
    pose(x.reste, kB, 'B', poidsCop(O, WAF, Object.assign({}, WAF, { plaq: 2 * 5 / 3, copain: 3, seul: 1.5 })), triForce(F));
    return { equipes: equipes, banc: [], raisons: raisons };
  }

  // ---------- Les joueurs d'une équipe, rangés : avants puis arrières ----------
  // Jeu à 10 : d'après le poste du plateau (sans poste = remplaçant) ; jeu à 5 : d'après le poste principal de la fiche.
  // Dans chaque section : piliers, talonneur, 3es lignes / 9, 10, centres, ailiers ; à poste égal, l'ordre de l'équipe.
  // renvoie { av: [joueurs], ar: [], rempl: [], sans: [] } (joueurs = les entrées de t.joueurs)
  function sections(t, F, format) {
    var o = { av: [], ar: [], rempl: [], sans: [] }, k = {};
    (t.joueurs || []).forEach(function (j, i) {
      var p = format === 10 ? j.poste : posteDefaut(F[j.id]), ty = typePoste(p);
      k[j.id] = rangOrdre(p || posteDefaut(F[j.id])) * 1000 + i;
      // (v35) au jeu à 10, sans poste du match : remplaçant s'il a des postes sur sa fiche, sinon « sans poste » (à régler)
      if (ty) o[ty].push(j); else if (format === 10 && postesDe(F[j.id]).length) o.rempl.push(j); else o.sans.push(j);
    });
    function tri(a, b) { return k[a.id] - k[b.id]; }
    o.av.sort(tri); o.ar.sort(tri); o.rempl.sort(tri); o.sans.sort(tri);
    return o;
  }

  // ---------- Indicateurs d'une équipe ----------
  function stats(t, F, format) {
    var ids = (t.joueurs || []).map(function (j) { return j.id; });
    var n = ids.length, sp = 0, ne = 0, bons = 0, avec = 0, avecCps = 0, pass = 0, sousSeuil = [];
    ids.forEach(function (id) {
      var f = F[id] || {}, ev = f.plaquage !== null && f.plaquage !== undefined, p = f.plaquage || 0;
      if (ev) { sp += p; ne++; } if (p >= BON) bons++;
      if ((f.copains || []).length) { avecCps++; if (f.copains.some(function (c) { return ids.indexOf(c) >= 0; })) avec++; }
      if (t.niveau && f.niveau && f.niveau !== t.niveau) pass++;
      if (ev && p < (SEUIL[t.niveau] || 0)) sousSeuil.push(id);   // (v46) pas encore évalué : pas signalé
    });
    // (v46) le plaquage moyen : sur ceux qui sont évalués (null : personne n'est évalué dans l'équipe)
    var o = { n: n, plaq: ne ? Math.round(sp / ne * 10) / 10 : null, bons: bons, avecCopain: avec, ontCopains: avecCps, passerelles: pass, sousSeuil: sousSeuil, manquants: [] };
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

  // (v35) jeu à 10 : les enfants placés qui n'ont aucun poste (ni fiche, ni vœux), sans poste du match
  function sansPosteAlerte(c, F, placed, out) {
    if (fmt(c.reglages) !== 10) return;
    var l = [];
    (c.equipes || []).forEach(function (t) { (t.joueurs || []).forEach(function (j) { if (!j.poste && F[j.id] && !postesDe(F[j.id]).length) l.push(j.id); }); });
    if (l.length) out.push({ k: 'sansposte', niveau: 'warn', texte: 'Sans poste : ' + noms(l, F) + '. Touchez un enfant pour lui donner un poste pour ce match, et réglez ses postes sur sa fiche.', ids: l });
  }

  // ---------- Alertes (et la correction proposée quand il y en a une) ----------
  // c : { reglages, equipes, banc } ; presents : ids attendus ; renvoie [{ k, niveau: 'warn'|'info', texte, fix }]
  function alertes(c, F, H, presents) {
    var out = [], format = fmt(c.reglages), T = TAILLE[format], eqs = c.equipes || [], af = optsDe(c.reglages).orga === 'aforte';
    var placed = {};
    eqs.forEach(function (t) { (t.joueurs || []).forEach(function (j) { placed[j.id] = t.id; }); });
    (c.banc || []).forEach(function (id) { placed[id] = 'banc'; });
    var oublis = (presents || []).filter(function (id) { return !placed[id]; });
    if (oublis.length) out.push({ k: 'oubli', niveau: 'warn', texte: oublis.length + ' présent' + (oublis.length > 1 ? 's' : '') + ' pas encore placé' + (oublis.length > 1 ? 's' : '') + ' : ' + noms(oublis, F) + ' (colonne « Pas placés »).', ids: oublis });
    var sansNiv = Object.keys(placed).filter(function (id) { return placed[id] !== 'banc' && F[id] && !F[id].niveau; });
    if (sansNiv.length) out.push({ k: 'niveau', niveau: 'info', texte: 'Niveau à renseigner : ' + noms(sansNiv, F) + '.', ids: sansNiv });
    sansPosteAlerte(c, F, placed, out);
    NIV.forEach(function (n) {
      var ts = eqs.filter(function (t) { return t.niveau === n; });
      var st = ts.map(function (t) { return stats(t, F, format); });
      ts.forEach(function (t, i) {
        if (st[i].n && st[i].n < T.min) out.push({ k: 'effectif', niveau: 'warn', texte: t.id + ' : ' + st[i].n + ' joueurs, il en faut au moins ' + T.min + '.', equipe: t.id });
      });
      if (ts.length > 1) {
        var mx = 0, mn = 99, iMx = 0, iMn = 0;
        st.forEach(function (s, i) { if (s.n > mx) { mx = s.n; iMx = i; } if (s.n < mn) { mn = s.n; iMn = i; } });
        // (v49) des tailles réglées : l'écart se mesure à la taille voulue de chaque équipe
        var tv = c.reglages && c.reglages.tailles, avecT = tv && ts.every(function (t) { return tv[t.id] >= 0; });
        if (avecT) {
          var dx = -99, dn = 99, jx = 0, jn = 0;
          st.forEach(function (s, i) { var e = s.n - tv[ts[i].id]; if (e > dx) { dx = e; jx = i; } if (e < dn) { dn = e; jn = i; } });
          if (dx >= 1 && dn <= -1 && dx - dn >= 2) out.push({ k: 'taille', niveau: 'warn', texte: 'Effectifs : ' + ts[jx].id + ' ' + st[jx].n + ' (' + tv[ts[jx].id] + ' voulus), ' + ts[jn].id + ' ' + st[jn].n + ' (' + tv[ts[jn].id] + ' voulus).', fix: bestMove(c, F, H, ts[jx].id, ts[jn].id) });
        } else if (mx - mn >= 2) out.push({ k: 'taille', niveau: 'warn', texte: 'Effectifs déséquilibrés : ' + ts[iMx].id + ' (' + mx + ') et ' + ts[iMn].id + ' (' + mn + ').', fix: bestMove(c, F, H, ts[iMx].id, ts[iMn].id) });
        // (v46) l'écart de plaquage : seulement entre équipes qui ont des enfants évalués
        var hi = -1, lo = -1;
        st.forEach(function (s, i) { if (s.plaq === null) return; if (hi < 0 || s.plaq > st[hi].plaq) hi = i; if (lo < 0 || s.plaq < st[lo].plaq) lo = i; });
        if (hi >= 0 && lo >= 0 && st[hi].plaq - st[lo].plaq >= ECART) {
          out.push({ k: 'plaquage', niveau: 'warn', texte: 'Écart de plaquage moyen en ' + n + ' : ' + ts[hi].id + ' ' + virg(st[hi].plaq) + ', ' + ts[lo].id + ' ' + virg(st[lo].plaq) + '.', fix: bestSwap(c, F, H, ts[hi].id, ts[lo].id) });
        }
      }
      ts.forEach(function (t, i) {
        // (v48) « A forte » : les équipes B mélangent B et C, les Débutants n'y sont pas signalés sous le repère B
        var ss = af && n === 'B' ? st[i].sousSeuil.filter(function (id) { return niveauDe(F[id]) === 'B'; }) : st[i].sousSeuil;
        if (ss.length && SEUIL[n]) out.push({ k: 'seuil', niveau: 'info', texte: t.id + ' : ' + noms(ss, F) + ' sous ' + SEUIL[n] + ' au plaquage (repère pour le niveau ' + n + ').', ids: ss });
        if (format === 10 && st[i].manquants.length) out.push({ k: 'poste', niveau: 'warn', texte: t.id + ' : poste' + (st[i].manquants.length > 1 ? 's' : '') + ' à couvrir (' + st[i].manquants.map(nomPoste).join(', ') + ').', equipe: t.id });
      });
    });
    // enfant sans copain dans son équipe pour la 2e fois de suite ; (v56) sauf option « Sans » : les copains ne comptent pas
    if (optsDe(c.reglages).copains !== 'sans') eqs.forEach(function (t) {
      var ids = t.joueurs.map(function (j) { return j.id; });
      t.joueurs.forEach(function (j) {
        var f = F[j.id] || {};
        if (!(f.copains || []).length || f.copains.some(function (x) { return ids.indexOf(x) >= 0; })) return;
        var serie = hOf(H, j.id).sansCopainSerie;
        if (serie >= 1) out.push({ k: 'copain', niveau: 'warn', texte: (f.prenom || '?') + ' sans copain dans son équipe pour la ' + (serie + 1) + 'e fois de suite.', ids: [j.id], fix: copainFix(c, F, H, j.id) });
      });
    });
    // passerelles qui n'ont pas encore joué dans l'autre niveau (rotation)
    function jamais(id) { return pasDe(F[id]).filter(function (n) { return !nbEn(H, id, n); }); }   // (v45) par niveau de passerelle
    var attente = Object.keys(placed).filter(function (id) {
      var f = F[id]; if (!f || !pasDe(f).length || placed[id] === 'banc') return false;
      var t = eqs.filter(function (x) { return x.id === placed[id]; })[0];
      return t && t.niveau === f.niveau && jamais(id).length > 0;
    });
    if (attente.length) out.push({ k: 'rotation', niveau: 'info', texte: 'Passerelles qui n\'ont pas encore joué dans l\'autre niveau : ' + attente.map(function (id) { return F[id].prenom + ' (' + F[id].niveau + '→' + jamais(id).join('/') + ')'; }).join(', ') + '.', ids: attente });
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
  // 'g' (groupes mélangés), 'av' / 'ar' (avants et arrières à part), 'm1', 'm2' (match 1 : Équipe 1 contre Équipe 2 ; match 2 : Équipe 3 contre Équipe 4).
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
      // (v35) les matchs se jouent avec des postes, comme les plateaux à 10 (les ateliers, non)
      partie: r.partie === 'matchs' ? 'matchs' : 'ateliers', format: r.partie === 'matchs' ? 10 : 5, nb: { A: 0, B: 0, C: 0 },
      mode: r.mode === 'equilibre' ? 'equilibre' : r.mode === 'aforte' && r.partie !== 'matchs' ? 'aforte' : 'niveau', separer: r.partie !== 'matchs' && !!r.separer,   // (v48) « A forte » : ateliers seulement
      n: borne(r.n, 1, 8, Math.max(2, Math.min(6, Math.round(n / parGroupe) || 1))),
      nAv: borne(r.nAv, 1, 4, Math.max(1, Math.round(nAv / parGroupe))), nAr: borne(r.nAr, 1, 4, Math.max(1, Math.round(nAr / parGroupe))),
      nbMatchs: borne(r.nbMatchs, 1, 2, n >= 20 ? 2 : 1)
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
  // (v45) une passerelle vers le haut d'abord ; vers le bas seulement : en dernier
  function biais(f) { var n = NIV.indexOf(niveauDe(f) || 'B'), ps = pasDe(f).map(function (x) { return NIV.indexOf(x); }); return ps.some(function (p) { return p < n; }) ? 0 : ps.length ? 2 : 1; }
  function serpentin(list, k) {
    var teams = [];
    for (var i = 0; i < k; i++) teams.push([]);
    list.forEach(function (id, i) { var r = Math.floor(i / k), c = i % k; teams[r % 2 ? k - 1 - c : c].push(id); });
    return teams;
  }
  // poids pour des groupes mélangés (ateliers « équilibrés ») et pour les deux équipes d'un match
  var WMIX = { taille: 5, plaq: 3 * 5 / 3, bons: 1, copain: 1, seul: 0.5, poste: 0, niv: 1.5, avar: 1 };
  var WMATCH = { taille: 5, plaq: 4 * 5 / 3, bons: 1.5, copain: 0.75, seul: 0.4, poste: 1.2, niv: 1.5, avar: 1.2 };   // (v35) postes : les deux équipes en ont autant de couverts
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
    if (mode === 'aforte' && k > 1) {
      // (v48) un groupe A fort (les Confirmés, complétés par les meilleurs B), les autres groupes mélangés et équilibrés
      var rs = {}, x = forte(ids, F, H, Math.round(ids.length / k), rs, 'le groupe A'), pn = pre ? pre + ' ' : '';
      var rest = serpentin(x.reste.slice().sort(triForce(F)), k - 1);
      ameliorer(rest, F, H, 5, WMIX);
      return { equipes: [{ id: pre + 'FA', nom: pn + 'A', niveau: 'A', bloc: side || 'A', joueurs: x.fort.map(function (id) { return entree(id, F); }) }].concat(rest.map(function (t, i) {
        // pas de niveau (comme les groupes équilibrés) : l'historique ne compte pas les Débutants « hors de leur niveau »
        return { id: pre + 'FB' + (i + 1), nom: pn + 'B' + (i + 1), niveau: '', bloc: side || 'B', joueurs: t.map(function (id) { return entree(id, F); }) };
      })), raisons: rs };
    }
    var teams = serpentin(ids.slice().sort(triForce(F)), k);
    ameliorer(teams, F, H, 5, WMIX);
    return { equipes: teams.map(function (t, i) {
      return { id: (pre || 'G') + (i + 1), nom: (pre || 'G') + (i + 1), niveau: '', bloc: side || 'g', joueurs: t.map(function (id) { return entree(id, F); }) };
    }), raisons: {} };
  }
  // les matchs : 1 ou 2, chacun à 2 équipes (tout le monde en chasubles : Équipe 1 contre Équipe 2, Équipe 3 contre Équipe 4),
  // équilibrées (plaquage, niveaux, avants / arrières, copains)
  // « niveau » : le match 1 réunit les plus avancés (les Confirmés et les meilleurs Débrouillés), le dernier les Débutants ;
  // « equilibre » : chaque match mélange tous les niveaux
  function matchsDe(ids, F, H, mode, m) {
    m = Math.max(1, Math.min(m, 2, Math.floor(ids.length / 2) || 1));
    var sorted = ids.slice().sort(triForce(F)), paires = [];
    if (mode === 'niveau') {
      var base = Math.floor(sorted.length / m), extra = sorted.length % m, pos = 0;
      for (var i = 0; i < m; i++) {
        var sz = base + (i < extra ? 1 : 0), part = sorted.slice(pos, pos + sz), t2 = serpentin(part, 2);
        pos += sz;
        ameliorer(t2, F, H, 10, WMATCH);
        paires.push(t2);
      }
    } else {
      var all = serpentin(sorted, 2 * m);
      ameliorer(all, F, H, 10, WMATCH);
      for (var j = 0; j < m; j++) paires.push([all[2 * j], all[2 * j + 1]]);
    }
    var equipes = [];
    paires.forEach(function (pr, i) {
      // matchs par niveau : le niveau du match est le plus haut présent (ceux du niveau en dessous y jouent « au-dessus ») ;
      // matchs équilibrés : pas de niveau
      var niv = '';
      if (mode === 'niveau') NIV.slice().reverse().forEach(function (n) { if (pr[0].concat(pr[1]).some(function (id) { return (niveauDe(F[id]) || 'B') === n; })) niv = n; });
      [0, 1].forEach(function (s) {
        var k = 2 * i + s + 1, po = apparier(pr[s], F, true).poste;   // (v35) chacun son poste du match : celui de sa fiche d'abord
        equipes.push({ id: 'E' + k, nom: 'Équipe ' + k, niveau: niv, bloc: 'm' + (i + 1), joueurs: pr[s].map(function (id) { var x = entree(id, F); x.poste = po[id] || ''; return x; }) });
      });
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
    // (v48) « A forte » sans groupe fort (un seul groupe) : ce sont des groupes équilibrés
    if (r.mode === 'aforte' && !out.equipes.some(function (t) { return /FA$/.test(t.id); })) r.mode = 'equilibre';
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
    // (v35) des matchs d'avant la v35 (sans postes) : ils passent avec postes, ceux des fiches
    if (o.reglages && o.reglages.partie === 'matchs' && o.reglages.format !== 10) {
      o.reglages.format = 10;
      o.equipes.forEach(function (t) { var po = apparier(t.joueurs.map(function (j) { return j.id; }), F, true).poste; t.joueurs.forEach(function (j) { j.poste = po[j.id] || ''; }); });
    } else if (o.reglages && o.reglages.partie === 'matchs') {
      // déjà avec postes : chacun garde le sien, les places laissées par les absents vont aux remplaçants
      o.equipes.forEach(function (t) { t.joueurs.forEach(function (j) { if (!j.poste) j.poste = placeLibre(t, j.id, F, true); }); });
    }
    return o;
  }
  // ce qu'il faut regarder dans des groupes d'entraînement
  function alertesEnt(c, F, presents) {
    var out = [], eqs = c.equipes || [], placed = {}, match = c.reglages && c.reglages.partie === 'matchs', af = !match && c.reglages && c.reglages.mode === 'aforte';
    var equi = match || af || (c.reglages && c.reglages.mode === 'equilibre');   // (v48) « A forte » : les groupes B se comparent entre eux
    eqs.forEach(function (t) { (t.joueurs || []).forEach(function (j) { placed[j.id] = t.id; }); });
    (c.banc || []).forEach(function (id) { placed[id] = 'banc'; });
    var oublis = (presents || []).filter(function (id) { return !placed[id]; });
    if (oublis.length) out.push({ k: 'oubli', niveau: 'warn', texte: oublis.length + ' présent' + (oublis.length > 1 ? 's' : '') + ' pas encore placé' + (oublis.length > 1 ? 's' : '') + ' : ' + noms(oublis, F) + ' (« Pas placés »).', ids: oublis });
    var sansNiv = Object.keys(placed).filter(function (id) { return placed[id] !== 'banc' && F[id] && !F[id].niveau; });
    if (sansNiv.length) out.push({ k: 'niveau', niveau: 'info', texte: 'Niveau à renseigner : ' + noms(sansNiv, F) + '.', ids: sansNiv });
    sansPosteAlerte(c, F, placed, out);
    blocsDe(c).forEach(function (k) {
      var ts = eqs.filter(function (t) { return blocDe(t) === k; }), st = ts.map(function (t) { return stats(t, F, fmt(c.reglages)); });   // (v35) comme l'en-tête de l'équipe
      var ou = match ? nomBloc(k) + ' : ' : '';
      ts.forEach(function (t, i) { if (!st[i].n) out.push({ k: 'vide', niveau: 'warn', texte: ou + nomEq(t) + ', personne pour l\'instant.' }); });
      if (af) { st = st.filter(function (s, i) { return ts[i].niveau !== 'A'; }); ts = ts.filter(function (t) { return t.niveau !== 'A'; }); }   // le groupe fort est à part
      if (ts.length < 2) return;
      var mx = 0, mn = 99, iMx = 0, iMn = 0;
      st.forEach(function (s, i) { if (s.n > mx) { mx = s.n; iMx = i; } if (s.n < mn) { mn = s.n; iMn = i; } });
      // groupes de niveau : les effectifs suivent les niveaux (simple info) et l'écart de plaquage est voulu
      if (equi ? mx - mn >= 2 : mx - mn >= 3) out.push({ k: 'taille', niveau: equi ? 'warn' : 'info', texte: ou + 'effectifs déséquilibrés, ' + nomEq(ts[iMx]) + ' ' + mx + ' et ' + nomEq(ts[iMn]) + ' ' + mn + '.', fix: equi ? bestMove(c, F, {}, ts[iMx].id, ts[iMn].id) : null });
      var hi = -1, lo = -1;
      st.forEach(function (s, i) { if (s.plaq === null) return; if (hi < 0 || s.plaq > st[hi].plaq) hi = i; if (lo < 0 || s.plaq < st[lo].plaq) lo = i; });
      if (equi && hi >= 0 && lo >= 0 && st[hi].n && st[lo].n && st[hi].plaq - st[lo].plaq >= ECART) out.push({ k: 'plaquage', niveau: 'warn', texte: ou + 'écart de plaquage moyen, ' + nomEq(ts[hi]) + ' ' + virg(st[hi].plaq) + ', ' + nomEq(ts[lo]) + ' ' + virg(st[lo].plaq) + '.', fix: bestSwap(c, F, {}, ts[hi].id, ts[lo].id) });
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
    return { equipes: idsEquipes(reglages).map(function (id) { return { id: id, niveau: id.charAt(0), joueurs: [] }; }), banc: ids.slice(), raisons: {} };
  }
  // les présents d'un événement : réponses Spond + ajouts à la main − retraits
  function presents(e) {
    var out = [], ret = e.retraits || [];
    (e.presents || []).concat(e.ajouts || []).forEach(function (id) { if (ret.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  // les enfants qui n'ont pas encore répondu sur Spond (ni présents, ni absents, ni retirés à la main) :
  // on peut les placer en attendant ; s'ils répondent « non », la compo le signale
  function attente(e) {
    var p = presents(e), non = (e.absents || []).concat(e.retraits || []), out = [];
    (e.sansReponse || []).forEach(function (id) { if (p.indexOf(id) < 0 && non.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  // retirer des joueurs d'une compo (ni équipe, ni « Pas placés ») : ceux qui ont répondu absent
  function retirer(c, ids) {
    var o = clone(c);
    (o.equipes || []).forEach(function (t) { t.joueurs = t.joueurs.filter(function (j) { return ids.indexOf(j.id) < 0; }); });
    o.banc = (o.banc || []).filter(function (id) { return ids.indexOf(id) < 0; });
    return o;
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
    fiches: fiches, historique: historique, hOf: hOf, suggestNb: suggestNb, teamIds: teamIds, nomsCourts: nomsCourts, idsEquipes: idsEquipes, OPTS: OPTS, optsDe: optsDe, styleDe: styleDe, tailles: tailles, taillesDefaut: taillesDefaut, nbAForte: nbAForte, nbOf: nbOf, fmt: fmt,
    pasDe: pasDe, lettresPas: lettresPas, joueEn: joueEn,
    proposer: proposer, vide: vide, stats: stats, alertes: alertes, apparier: apparier, scoreNiveau: scoreNiveau,
    moveTo: moveTo, swap: swap, setPoste: setPoste, where: where, diff: diff, presents: presents, attente: attente, retirer: retirer, sorteDuTitre: sorteDuTitre,
    nomPoste: nomPoste, frDate: frDate,
    STYLES: STYLES, AVANTS: AVANTS, postesDe: postesDe, posteDefaut: posteDefaut, prefDe: prefDe, lienPoste: lienPoste, rang: rang, repartition: repartition, placeLibre: placeLibre, typePoste: typePoste, typeDe: typeDe, sections: sections, ORDRE: ORDRE,
    PARTIES: PARTIES, regEnt: regEnt, proposerEnt: proposerEnt, videEnt: videEnt, reprendre: reprendre, alertesEnt: alertesEnt,
    blocDe: blocDe, blocsDe: blocsDe, nomBloc: nomBloc, nomEq: nomEq
  };
})();
