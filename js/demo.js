/* =========================================================
   Mode champion · M12 — données fictives du MODE DÉMO
   (utilisées seulement quand API_URL est vide dans config.js)
   Codes de démo : enfants 2580 · Rose (1re connexion) 4827
   parent de Tom et Lou 123456 · éduc admin 654321
   ========================================================= */
window.MC = window.MC || {};

MC.demo = (function () {
  var CODES = { enfant: '2580', nouveau: '4827', parent: '123456', educ: '654321' };

  function seed(db, env) {
    var L = MC.logic, C = MC.CONTENT;
    var sec = 'demo-' + Math.random().toString(36).slice(2);
    db.setProp('secret', sec);
    var now = Date.now(), nowIso = new Date(now).toISOString();
    // générateur pseudo-aléatoire stable
    var s = 42;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function id() { var a = 'abcdefghijkmnpqrstuvwxyz23456789', o = ''; for (var i = 0; i < 10; i++) o += a.charAt(Math.floor(rnd() * a.length)); return o; }

    var nico = { id: id(), nom: 'Coach Nico', codeHash: Core._hashAdulte(sec, CODES.educ), codeV: 1, admin: true, actif: true, cree: nowIso };
    db.insert('educs', nico);
    var famTom = { id: id(), nom: 'Famille de Tom et Lou', codeHash: Core._hashAdulte(sec, CODES.parent), codeV: 1, cree: nowIso };
    db.insert('familles', famTom);

    var kids = [
      ['Tom', '#38E8FF', 0.95, famTom.id], ['Lou', '#7CFF6B', 0.55, famTom.id], ['Inès', '#FF8A3D', 0.9], ['Léo', '#4D9BFF', 0.85],
      ['Nina', '#3DFFB0', 0.8], ['Sacha', '#FF4FA3', 0.7], ['Enzo', '#FF4F6D', 0.65], ['Jade', '#B48CFF', 0.6],
      ['Maël', '#FFC23D', 0.35], ['Chloé', '#F5F7FF', 0.75], ['Hugo', '#38E8FF', 0.5], ['Rose', '#FF4FA3', 0, null, true]
    ];
    // le reste du groupe (pour les compos) : pas encore venus sur l'appli
    var autres = ['Arthur', 'Gabin', 'Louise', 'Jules', 'Adam', 'Lina', 'Noah', 'Timéo', 'Zoé', 'Raphaël', 'Malo', 'Elio', 'Mila', 'Nathan', 'Côme', 'Lucas'];
    var COULS = ['#38E8FF', '#FF4FA3', '#3DFFB0', '#FFC23D', '#B48CFF', '#FF8A3D', '#4D9BFF', '#FF4F6D'];
    var today = L.today();
    var cyc = L.cycleAt(today);
    var start = cyc.debut;
    var bilan0 = MC.CONFIG.BILANS[0].date;

    var ids = {};
    kids.forEach(function (k, idx) {
      var famId = k[3];
      if (!famId) {
        famId = id();
        db.insert('familles', { id: famId, nom: 'Famille de ' + k[0], codeHash: Core._hashAdulte(sec, String(200000 + idx * 7919)), codeV: 1, cree: nowIso });
      }
      var pid = id(), isNew = !!k[4];
      ids[k[0]] = pid;
      // bilan 0 fictif : force selon l'assiduité
      var f = 0.4 + k[2] * 0.6 + (rnd() - 0.5) * 0.3;
      var vals = isNew ? [] : [
        { test: 'flamant', valeur: Math.round(8 + f * 30), extra: null },
        { test: 'saut', valeur: Math.round(110 + f * 45) },
        { test: 'navette', valeur: Math.round((18.5 - f * 4.5) * 10) / 10 },
        { test: 'susp', valeur: Math.round(15 + f * 45) },
        { test: 'tract', valeur: Math.max(0, Math.round(f * 5) - 1), extra: { elastique: f > 0.8 ? '20' : '30', nbElastique: Math.round(3 + f * 4) } },
        { test: 'pompes', valeur: Math.round(2 + f * 13) },
        { test: 'planche', valeur: Math.round(30 + f * 60) },
        { test: 'squats', valeur: Math.round(18 + f * 22) },
        { test: 'chaise', valeur: Math.round(25 + f * 50) },
        { test: 'corde', valeur: Math.round(10 + f * 90) },
        { test: 'corde1', valeur: Math.round(45 + f * 60) },
        { test: 'burpees', valeur: Math.round(7 + f * 10) }
      ];
      vals.forEach(function (v) {
        if (v.test === 'flamant') v.extra = { g: v.valeur + ri(0, 6), d: v.valeur };
      });
      var niveaux = L.levelsFromBilan(vals, {});
      db.insert('joueurs', {
        id: pid, prenom: k[0], couleur: k[1], familleId: famId,
        pinHash: isNew ? '' : Core._hashPin(sec, pid, CODES.enfant), pinV: 1,
        tempHash: isNew ? Core._hashTemp(sec, pid, CODES.nouveau) : '', tempExp: isNew ? now + 40 * 86400000 : 0,
        mustChange: isNew, fails: 0, lockUntil: 0, niveaux: niveaux, materiel: idx === 7 ? 'mini' : 'complet',
        visible: true, actif: true, cree: nowIso
      });
      vals.forEach(function (v) {
        db.insert('records', { id: id(), joueurId: pid, bilan: '0', test: v.test, valeur: v.valeur, extra: v.extra || null, statut: 'ok', parQui: 'Parent', date: bilan0, cree: bilan0 + 'T10:00:00.000Z' });
      });
      if (isNew) return;
      // quelques défis réussis depuis (pour le classement « progrès »)
      ['planche', 'pompes', 'corde', 'susp'].forEach(function (t) {
        if (rnd() < k[2] * 0.8) {
          var base = vals.filter(function (v) { return v.test === t; })[0].valeur;
          var d = L.addDays(today, -ri(2, 12));
          db.insert('records', { id: id(), joueurId: pid, bilan: 'defi', test: t, valeur: Math.round(base * (1.08 + rnd() * 0.3)), extra: null, statut: 'ok', parQui: 'Parent', date: d, cree: d + 'T18:00:00.000Z' });
        }
      });
      // séances depuis le début du cycle
      var d = start;
      while (d < today) {
        var type = C.SEMAINE[L.dow(d)];
        if (type !== 'repos' && rnd() < k[2]) {
          var info = C.JOURS[type], mode = info.maison && rnd() < 0.6 ? 'guidee' : 'rapide';
          var ress = ['facile', 'bien', 'bien', 'dur'][ri(0, 3)];
          var det = null;
          if (info.maison) {
            if (mode === 'guidee') {
              det = { exos: info.exos.map(function (eid) { var ex = C.EXOS[eid]; return { id: eid, niveau: niveaux[ex.cle] || 1, ressenti: ['facile', 'bien', 'bien', 'dur'][ri(0, 3)], fait: true }; }), duree: ri(14, 22) * 60 };
            } else det = { niveau: L.dayLevel(niveaux, type) };
          }
          db.insert('seances', { id: id(), joueurId: pid, date: d, type: type, mode: info.maison ? mode : 'rapide', ressenti: info.maison ? ress : '', details: det, cree: d + 'T17:' + (10 + ri(0, 49)) + ':00.000Z' });
          if (type === 'dupont' && rnd() < 0.85) {
            db.insert('seances', { id: id(), joueurId: pid, date: d, type: 'club', mode: 'rapide', ressenti: '', details: null, cree: d + 'T20:00:00.000Z' });
          }
        }
        d = L.addDays(d, 1);
      }
      if (k[0] === 'Tom') {
        var dd = L.addDays(today, -1);
        db.insert('records', { id: id(), joueurId: pid, bilan: 'defi', test: 'planche', valeur: 104, extra: null, statut: 'attente', parQui: '', date: dd, cree: dd + 'T19:00:00.000Z' });
      }
    });
    // mission « Prépare le jeu à 10 » : quelques enfants l'ont déjà faite ou commencée (Tom, le joueur de démo, pas encore)
    [
      ['Inès', ['ailier', 'centre'], ['Nina', 'Chloé'], true, 'appli'],
      ['Nina', ['demi-de-melee', 'ouvreur', 'ailier'], ['Inès', 'Léo'], true, 'appli'],
      ['Léo', ['troisieme-ligne', 'pilier'], [], false, 'formulaire'],
      ['Sacha', ['centre'], ['Tom', 'Enzo', 'Léo'], true, 'appli'],
      ['Enzo', ['pilier', 'talonneur', 'troisieme-ligne'], ['Sacha'], true, 'appli'],
      ['Chloé', ['ouvreur'], [], false, 'appli']
    ].forEach(function (m) {
      var d = L.addDays(today, -ri(1, 6));
      db.insert('missions', { id: id(), joueurId: ids[m[0]], mission: 'jeu10', faite: m[3], date: m[3] ? d : '', source: m[4], cree: d + 'T18:30:00.000Z', maj: d + 'T18:30:00.000Z',
        reponses: { postes: m[1], copains: m[2].map(function (n) { return ids[n]; }), copainsFait: m[3], quiz: null, quizTop: null, quizResume: m[4] === 'formulaire' ? 'Postes proposés : 1. 3e ligne (82 %) · 2. Pilier (74 %) · 3. Talonneur (61 %)\nPréfère : Plaquer et récupérer le ballon' : '' } });
    });
    seedCompos(db, ids, autres, COULS, id, ri, today, nowIso, sec);
  }

  // ---------- le reste du groupe, la fiche terrain, les événements et les compos (éducs) ----------
  function seedCompos(db, ids, autres, COULS, id, ri, today, nowIso, sec) {
    var L = MC.logic, K = MC.compos;
    autres.forEach(function (p, i) {
      var famId = id();
      db.insert('familles', { id: famId, nom: 'Famille de ' + p, codeHash: Core._hashAdulte(sec, String(300000 + i * 7121)), codeV: 1, cree: nowIso });
      var pid = id(); ids[p] = pid;
      db.insert('joueurs', { id: pid, prenom: p, couleur: COULS[i % COULS.length], familleId: famId, pinHash: '', pinV: 1, tempHash: '', tempExp: 0, mustChange: true, fails: 0, lockUntil: 0,
        niveaux: {}, materiel: 'complet', visible: true, actif: true, cree: nowIso });
    });
    var cyril = { id: id(), nom: 'Cyril', codeHash: Core._hashAdulte(sec, '700001'), codeV: 1, admin: false, actif: true, cree: nowIso };
    db.insert('educs', cyril);
    var julien = { id: id(), nom: 'Julien', codeHash: Core._hashAdulte(sec, '700002'), codeV: 1, admin: false, actif: true, cree: nowIso };
    db.insert('educs', julien);
    var nico = db.rows('educs')[0];
    // postes réglés par les éducs (le 1er = poste principal) ; les autres joueurs ont seulement leurs vœux
    var POSTES = { Inès: ['ailier', 'centre'], Léo: ['troisieme-ligne', 'pilier'], Nina: ['demi-de-melee', 'ouvreur'], Sacha: ['centre'], Arthur: ['ailier', 'centre'],
      Gabin: ['pilier', 'troisieme-ligne'], Louise: ['ouvreur', 'centre'], Tom: ['centre', 'ailier', 'troisieme-ligne'], Enzo: ['pilier', 'talonneur'], Chloé: ['ouvreur'],
      Jules: ['demi-de-melee'], Adam: ['talonneur', 'pilier'], Noah: ['troisieme-ligne', 'centre'], Zoé: ['centre', 'ailier'], Malo: ['pilier'], Raphaël: ['talonneur'] };
    // fiche terrain : [prénom, niveau, passerelle, plaquage] (Nathan, Côme et Rose : niveau pas encore renseigné)
    [['Inès', 'A', '', 5], ['Léo', 'A', '', 4], ['Nina', 'A', '', 4], ['Sacha', 'A', '', 4], ['Arthur', 'A', '', 5], ['Gabin', 'A', 'B', 3], ['Louise', 'A', '', 4],
      ['Tom', 'B', 'A', 3], ['Enzo', 'B', '', 3], ['Chloé', 'B', 'A', 3], ['Jules', 'B', '', 2], ['Adam', 'B', '', 3], ['Lina', 'B', '', 2], ['Noah', 'B', '', 3], ['Timéo', 'B', 'C', 2],
      ['Zoé', 'B', '', 3], ['Hugo', 'B', '', 2], ['Lucas', 'B', '', 2],
      ['Lou', 'C', 'B', 1], ['Jade', 'C', '', 1], ['Maël', 'C', '', 0], ['Raphaël', 'C', '', 1], ['Malo', 'C', 'B', 2], ['Elio', 'C', '', 0], ['Mila', 'C', '', 1]
    ].forEach(function (t) {
      db.insert('terrain', { id: ids[t[0]], niveau: t[1], passerelle: t[2], plaquage: t[3], postesOk: POSTES[t[0]] || [], spondId: '', note: '', parQui: 'Coach Nico', maj: nowIso });
    });
    // copains et postes du reste du groupe (mission « jeu à 10 » faite)
    [['Arthur', ['ailier', 'centre'], ['Gabin', 'Louise']], ['Gabin', ['pilier'], ['Arthur']], ['Jules', ['demi-de-melee'], ['Adam', 'Noah']], ['Adam', ['talonneur', 'pilier'], ['Jules']],
      ['Lina', ['ailier'], ['Zoé', 'Chloé']], ['Zoé', ['centre', 'ailier'], ['Lina']], ['Noah', ['troisieme-ligne'], ['Jules', 'Timéo']], ['Malo', ['pilier'], ['Raphaël']],
      ['Raphaël', ['talonneur'], ['Malo']], ['Mila', ['ailier'], ['Jade']], ['Elio', ['ouvreur'], ['Mila']], ['Louise', ['ouvreur', 'centre'], ['Arthur', 'Inès']]
    ].forEach(function (m) {
      var d = L.addDays(today, -ri(1, 6));
      db.insert('missions', { id: id(), joueurId: ids[m[0]], mission: 'jeu10', faite: true, date: d, source: 'appli', cree: d + 'T18:30:00.000Z', maj: d + 'T18:30:00.000Z',
        reponses: { postes: m[1], copains: m[2].map(function (n) { return ids[n]; }), copainsFait: true, quiz: null, quizTop: null, quizResume: '' } });
    });
    // les fiches, comme les verra l'appli
    var F = {};
    db.rows('joueurs').forEach(function (j) {
      var t = db.rows('terrain').filter(function (x) { return x.id === j.id; })[0] || {};
      var m = db.rows('missions').filter(function (x) { return x.joueurId === j.id; })[0];
      var r = (m && m.reponses) || {};
      F[j.id] = { id: j.id, prenom: j.prenom, niveau: t.niveau || '', passerelle: t.passerelle || '', plaquage: t.plaquage || 0, voeux: r.postes || [], postesOk: [], copains: r.copains || [] };
    });
    function sauf(noms) { var out = []; Object.keys(ids).forEach(function (n) { if (noms.indexOf(n) < 0) out.push(ids[n]); }); return out; }
    function evt(o) {
      var row = { id: o.id, source: o.source || 'spond', titre: o.titre, sorte: o.sorte || K.sorteDuTitre(o.titre), debut: o.debut, fin: '', lieu: o.lieu || '', presents: o.presents || [], absents: o.absents || [],
        sansReponse: o.sansReponse || [], ajouts: [], retraits: [], inconnus: o.inconnus || [], annule: false, parQui: o.parQui || 'Spond', maj: nowIso };
      db.insert('evenements', row); return row;
    }
    // Coach Nico est aussi le papa de Tom : il confirme les résultats de Tom depuis son espace éduc
    db.update('educs', nico.id, { enfants: [ids['Tom']] });
    var evts = {}, compos = [];
    function compo(e, auteur, nb, extra) {
      var H = K.historique(compos, evts, F, today);
      var p = K.proposer(e.presents, F, H, { format: 5, nb: nb }, today);
      var row = { id: id(), evenementId: e.id, sorte: 'plateau', version: 1, auteur: auteur.id, auteurNom: auteur.nom, statut: 'publiee', reglages: { format: 5, nb: nb },
        equipes: p.equipes, banc: [], raisons: p.raisons, justification: (extra && extra.justification) || '', historique: [{ v: 1, par: auteur.nom, quand: e.debut, note: 'Compo publiée' }], cree: e.debut, maj: e.debut };
      db.insert('compos', row); compos.push(row); return row;
    }
    var p1 = evt({ id: 'sp-demo-p1', titre: 'Plateau 1 - Carbonne', debut: L.addDays(today, -17) + 'T08:00:00.000Z', lieu: 'Carbonne', presents: sauf(['Rose', 'Nathan', 'Côme', 'Lucas', 'Elio', 'Timéo']) });
    evts[p1.id] = p1;
    compo(p1, cyril, { A: 1, B: 2, C: 1 }, { justification: 'Premier plateau : chacun dans son niveau.' });
    var p2 = evt({ id: 'sp-demo-p2', titre: 'Plateau 2 - Montréjeau', debut: L.addDays(today, -3) + 'T08:00:00.000Z', lieu: 'Montréjeau', presents: sauf(['Rose', 'Côme', 'Mila', 'Hugo']) });
    evts[p2.id] = p2;
    var c2 = compo(p2, nico, { A: 1, B: 2, C: 1 }, { justification: 'Les passerelles qui n\'étaient pas montées au plateau 1 montent.' });
    c2.version = 2;
    c2.historique.push({ v: 2, par: 'Coach Nico', quand: L.addDays(today, -5) + 'T20:00:00.000Z', note: 'Contre-proposition de Cyril acceptée', n: 2 });
    db.update('compos', c2.id, { version: 2, historique: c2.historique });
    db.insert('avis', { id: id(), compoId: c2.id, version: 1, auteur: cyril.id, auteurNom: 'Cyril', equipes: c2.equipes, banc: [], changements: [{ id: ids['Jules'], de: 'B2', vers: 'B1', posteDe: '', poste: '' }, { id: ids['Noah'], de: 'B1', vers: 'B2', posteDe: '', poste: '' }],
      justification: 'Jules et Noah ne doivent pas être ensemble au plaquage, ils se déconcentrent.', statut: 'acceptee', reponse: 'Bien vu.', parQui: 'Coach Nico', cree: L.addDays(today, -6) + 'T19:00:00.000Z', maj: L.addDays(today, -5) + 'T20:00:00.000Z' });
    // à venir : un rassemblement (compo publiée + contre-proposition en attente), le plateau 3 (compo à faire), l'entraînement de mercredi
    var r1 = evt({ id: 'demo-r1', source: 'manuel', parQui: 'Coach Nico', titre: 'Rassemblement - Lézat', sorte: 'plateau', debut: L.addDays(today, 11) + 'T09:00:00.000Z', lieu: 'Lézat',
      presents: ['Inès', 'Léo', 'Nina', 'Sacha', 'Arthur', 'Gabin', 'Louise', 'Tom', 'Enzo', 'Chloé', 'Jules', 'Adam', 'Lina', 'Noah', 'Zoé', 'Hugo'].map(function (n) { return ids[n]; }) });
    evts[r1.id] = r1;
    var cr = compo(r1, nico, { A: 1, B: 1, C: 0 }, { justification: 'Seulement A et B à ce rassemblement.' });
    // la contre-proposition de Cyril : les deux passerelles B→A (Tom et Chloé) échangent leur place
    var aTeam = cr.equipes.filter(function (t) { return t.niveau === 'A'; })[0];
    var tomIn = aTeam.joueurs.some(function (j) { return j.id === ids['Tom']; });
    var prop = K.swap({ equipes: cr.equipes, banc: [] }, ids['Tom'], ids['Chloé']);
    var mv = K.diff(cr, prop);
    db.insert('avis', { id: id(), compoId: cr.id, version: 1, auteur: cyril.id, auteurNom: 'Cyril', equipes: prop.equipes, banc: [], changements: mv,
      justification: tomIn ? 'Chloé n\'est pas encore montée en A cette saison : son tour avant Tom.' : 'Tom n\'est pas encore monté en A : c\'est son tour.', statut: 'attente', reponse: '', parQui: '', cree: nowIso, maj: nowIso });
    evt({ id: 'sp-demo-p3', titre: 'Plateau 3 - Muret', debut: L.addDays(today, 32) + 'T08:00:00.000Z', lieu: 'Muret', presents: sauf(['Rose', 'Nathan', 'Côme', 'Maël', 'Lucas']),
      absents: [ids['Maël']], sansReponse: [ids['Nathan'], ids['Côme'], ids['Lucas']], inconnus: ['Julien C.'] });
    // plateau 4 : Cyril a proposé 2 versions au vote des éducs (il a voté pour la 2)
    var p4 = evt({ id: 'sp-demo-p4', titre: 'Plateau 4 - Saint-Gaudens', debut: L.addDays(today, 46) + 'T08:00:00.000Z', lieu: 'Saint-Gaudens', presents: sauf(['Rose', 'Côme', 'Lucas', 'Hugo']) });
    evts[p4.id] = p4;
    var H4 = K.historique(compos, evts, F, today), nb4 = { A: 1, B: 2, C: 1 };
    // V1 : 4 équipes de 6 ; V2 : 3 équipes de 8, copains d'abord
    var nb4b = { A: 1, B: 1, C: 1 };
    var vA = K.proposer(p4.presents, F, H4, { format: 5, nb: nb4 }, today, 'equilibre'), vB = K.proposer(p4.presents, F, H4, { format: 5, nb: nb4b }, today, 'copains');
    var vers = [{ reglages: { format: 5, nb: nb4, style: 'equilibre' }, equipes: vA.equipes, banc: [], raisons: vA.raisons }, { reglages: { format: 5, nb: nb4b, style: 'copains' }, equipes: vB.equipes, banc: [], raisons: vB.raisons }];
    var votes = {}; votes[cyril.id] = 1;
    db.insert('compos', { id: id(), evenementId: p4.id, sorte: 'plateau', version: 1, auteur: cyril.id, auteurNom: 'Cyril', statut: 'vote', reglages: vers[0].reglages, equipes: vers[0].equipes, banc: [], raisons: vers[0].raisons,
      justification: 'V1 : 4 équipes de 6, plus de temps de jeu. V2 : 3 équipes de 8, les copains ensemble. Votre avis ?', historique: [{ v: 1, par: 'Cyril', quand: nowIso, note: '2 versions proposées au vote' }], cree: nowIso, maj: nowIso, versions: vers, votes: votes, choix: -1 });
    // l'entraînement de mercredi dernier : groupes d'ateliers par niveau, puis 2 matchs par niveau (publiés par Julien)
    var merAv = L.addDays(today, -(((L.dow(today) - 2) + 7) % 7 || 7));
    var e0 = evt({ id: 'sp-demo-e0', titre: 'Entraînement - Saint-Sulpice', debut: merAv + 'T16:30:00.000Z', lieu: 'Saint-Sulpice', presents: sauf(['Rose', 'Côme', 'Lucas', 'Hugo', 'Maël', 'Mila']) });
    evts[e0.id] = e0;
    [['ateliers', { partie: 'ateliers', mode: 'niveau', n: 4 }], ['matchs', { partie: 'matchs', mode: 'niveau', nbMatchs: 2 }]].forEach(function (x) {
      var q = K.proposerEnt(e0.presents, F, {}, x[1], today);
      db.insert('compos', { id: id(), evenementId: e0.id, sorte: 'entrainement', partie: x[0], version: 1, auteur: julien.id, auteurNom: 'Julien', statut: 'publiee', reglages: q.reglages, equipes: q.equipes, banc: [], raisons: q.raisons,
        justification: '', historique: [{ v: 1, par: 'Julien', quand: nowIso, note: 'Compo publiée' }], cree: nowIso, maj: nowIso, versions: [], votes: {}, choix: -1 });
    });
    var mer = L.addDays(today, ((2 - L.dow(today)) + 7) % 7 || 7);
    evt({ id: 'sp-demo-e1', titre: 'Entraînement - Lézat', debut: mer + 'T16:30:00.000Z', lieu: 'Lézat', presents: sauf(['Rose', 'Côme', 'Elio', 'Mila', 'Lucas', 'Gabin', 'Hugo', 'Maël']), sansReponse: [ids['Côme'], ids['Lucas']] });
  }

  return { seed: seed, CODES: CODES };
})();
