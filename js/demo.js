/* =========================================================
   Mode champion · M12 — données fictives du MODE DÉMO
   (utilisées seulement quand API_URL est vide dans config.js)
   Codes de démo : enfants 2580 · Rose (1re connexion) 4827
   parent de Tom et Lou 123456 · éduc admin 654321
   ========================================================= */
window.MC = window.MC || {};

MC.demo = (function () {
  var CODES = { enfant: '2580', nouveau: '4827', parent: '1357', educ: '2468' };   // adultes : nom puis code à 4 chiffres

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

    var nico = { id: id(), nom: 'Coach Nico', codeHash: '', codeV: 1, admin: true, actif: true, cree: nowIso };
    nico.pinHash = Core._hashPinA(sec, 'e', nico.id, CODES.educ);
    db.insert('educs', nico);
    var famTom = { id: id(), nom: 'Famille de Tom et Lou', codeHash: '', codeV: 1, cree: nowIso };
    famTom.pinHash = Core._hashPinA(sec, 'f', famTom.id, CODES.parent);
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
        db.insert('familles', { id: famId, nom: 'Famille de ' + k[0], codeHash: '', pinHash: Core._hashPinA(sec, 'f', famId, String(2000 + idx)), codeV: 1, cree: nowIso });
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
        reponses: { postes: m[1], copains: m[2].map(function (n) { return ids[n]; }), copainsFait: m[3], quiz: null, quizTop: null, quizResume: m[4] === 'formulaire' ? 'Postes proposés : 1. 3e ligne (82 %) · 2. Pilier (74 %) · 3. Talonneur (61 %)\nPréfère : Plaquer et récupérer le ballon' : '',
          message: m[0] === 'Léo' ? 'J\'aime trop plaquer ! Mais pas talonneur, je n\'aime pas lancer en touche.' : m[0] === 'Enzo' ? 'Pilier comme mon grand frère.' : '' } });
    });
    seedCompos(db, ids, autres, COULS, id, ri, today, nowIso, sec);
  }

  // ---------- le reste du groupe, la fiche terrain, les événements et les compos (éducs) ----------
  function seedCompos(db, ids, autres, COULS, id, ri, today, nowIso, sec) {
    var L = MC.logic, K = MC.compos;
    autres.forEach(function (p, i) {
      var famId = id();
      db.insert('familles', { id: famId, nom: 'Famille de ' + p, codeHash: '', pinHash: Core._hashPinA(sec, 'f', famId, String(3000 + i)), codeV: 1, cree: nowIso });
      var pid = id(); ids[p] = pid;
      db.insert('joueurs', { id: pid, prenom: p, couleur: COULS[i % COULS.length], familleId: famId, pinHash: '', pinV: 1, tempHash: '', tempExp: 0, mustChange: true, fails: 0, lockUntil: 0,
        niveaux: {}, materiel: 'complet', visible: true, actif: true, cree: nowIso });
    });
    var cyril = { id: id(), nom: 'Cyril', codeHash: '', codeV: 1, admin: false, actif: true, cree: nowIso };
    cyril.pinHash = Core._hashPinA(sec, 'e', cyril.id, '7001');
    db.insert('educs', cyril);
    var julien = { id: id(), nom: 'Julien', codeHash: '', codeV: 1, admin: false, actif: true, cree: nowIso };
    julien.pinHash = Core._hashPinA(sec, 'e', julien.id, '7002');
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
    seedSkills(db, ids, id, today, nowIso, { nico: nico, julien: julien, cyril: cyril, p1: p1, p2: p2, e0: e0, merAv: merAv });
  }

  // ---------- Skills, +1 et missions des éducs ----------
  // Tom (l'enfant de démo, fils de Coach Nico) : la mission principale Plaquage « Épaule et Des deux côtés » et 3 +1, 6 étoiles ;
  // une mission vidéo et un QCM pour le groupe, déjà faits par quelques enfants.
  function seedSkills(db, ids, id, today, nowIso, x) {
    var L = MC.logic, ui = MC.ui;
    function occ(e) { return (e.sorte === 'entrainement' ? 'Entraînement du ' : 'Plateau du ') + ui.fmtDate(String(e.debut).slice(0, 10)); }
    function iso(d, h) { return d + 'T' + (h || '18:00') + ':00.000Z'; }
    var E = {
      plaquage: [['Arthur', 5], ['Inès', 4], ['Léo', 3], ['Sacha', 3], ['Nina', 2], ['Enzo', 2], ['Chloé', 1], ['Gabin', 2], ['Louise', 2]],
      passe: [['Nina', 4], ['Inès', 3], ['Louise', 3], ['Chloé', 2], ['Jules', 2], ['Léo', 1], ['Arthur', 2]],
      ruck: [['Léo', 3], ['Enzo', 2], ['Adam', 2], ['Gabin', 3], ['Noah', 1]],
      pied: [['Louise', 2], ['Chloé', 1], ['Nina', 1]],
      // (Skills v2) les nouvelles cartes
      maul: [['Léo', 2], ['Enzo', 1], ['Gabin', 1]],
      defense: [['Arthur', 2], ['Inès', 3], ['Sacha', 1]],
      porteur: [['Gabin', 2], ['Nina', 1], ['Jules', 1]],
      soutien: [['Louise', 2], ['Jules', 1], ['Chloé', 1]]
    };
    var edus = [x.nico, x.julien, x.cyril];
    Object.keys(E).forEach(function (d) {
      var stars = MC.SK.dom(d).etoiles;
      E[d].forEach(function (t, k) {
        for (var i = 0; i < t[1]; i++) {
          var e = edus[(k + i) % 3], ev = i % 2 ? x.p1 : x.p2, dt = String(ev.debut).slice(0, 10);
          // (Skills v2) la 1re étoile des enfants qui en ont 3 ou plus brille : vue au plateau
          var br = i === 0 && t[1] >= 3 && ev.sorte !== 'entrainement';
          db.insert('etoiles', { id: id(), joueurId: ids[t[0]], domaine: d, etoile: stars[(i + k) % stars.length].id, parQui: e.id, parNom: e.nom, date: dt, occasion: occ(ev), evenementId: ev.id, essais: null, retiree: false, cree: iso(dt, '11:00'), maj: iso(dt, '11:00'),
            brille: br ? dt : '', brilleParQui: br ? e.id : '', brilleParNom: br ? e.nom : '', brilleOccasion: br ? occ(ev) : '', brilleEvenementId: br ? ev.id : '' });
        }
      });
    });
    // Tom : Plaquage 2 (joue contre le dos, cercle de fer), Passe 3, Ruck 1
    var tom = ids['Tom'], d1 = String(x.p1.debut).slice(0, 10), d2 = String(x.p2.debut).slice(0, 10);
    [['plaquage', 'joue', x.nico, x.merAv, occ(x.e0)], ['plaquage', 'cercle', x.julien, d1, occ(x.p1)], ['passe', 'mains', x.nico, d1, occ(x.p1)], ['passe', 'en-courant', x.julien, d2, occ(x.p2)],
      ['passe', 'droite', x.cyril, d2, occ(x.p2)], ['ruck', 'dos-plat', x.nico, d1, occ(x.p1)]].forEach(function (t) {
      // (Skills v2) Mains en cible brille : vue au plateau
      var br = t[0] === 'passe' && t[1] === 'mains';
      db.insert('etoiles', { id: id(), joueurId: tom, domaine: t[0], etoile: t[1], parQui: t[2].id, parNom: t[2].nom, date: t[3], occasion: t[4], evenementId: '', essais: null, retiree: false, cree: iso(t[3], '12:00'), maj: iso(t[3], br ? '13:00' : '12:00'),
        brille: br ? t[3] : '', brilleParQui: br ? x.julien.id : '', brilleParNom: br ? x.julien.nom : '', brilleOccasion: br ? t[4] : '', brilleEvenementId: '' });
    });
    // (Skills v2) les demandes des enfants : Tom a eu un « pas vu » ; Inès et Léo attendent une réponse
    function demande(nom, d, e, sorte, statut, par, ev, quand) {
      db.insert('demandes', { id: id(), joueurId: ids[nom], domaine: d, etoile: e, sorte: sorte, evenementId: ev ? ev.id : '', occasion: ev ? occ(ev) : '', statut: statut,
        parQui: par ? par.id : '', parNom: par ? par.nom : '', reponseLe: par ? iso(quand, '21:00') : '', cree: iso(quand, '19:30'), maj: iso(quand, par ? '21:00' : '19:30') });
    }
    demande('Tom', 'ruck', 'appuis', 'gagner', 'pasvu', x.julien, x.e0, x.merAv);
    demande('Inès', 'defense', 'parle', 'briller', 'attente', null, x.p2, d2);     // Inès a l'étoile Je parle (pas encore brillante)
    demande('Léo', 'maul', 'arrache', 'gagner', 'attente', null, x.e0, x.merAv);   // Léo n'a pas encore J'arrache
    // (visuels v2) la mission principale : 1 à 3 étoiles d'une même carte, une date de fin (les prochaines vacances), un mot
    var vac = MC.SK.prochainesVacances(today).date;
    function perso(nom, d, e, par, depuis, titre, fin, texte) {
      var l = Array.isArray(e) ? e : [e];
      var m = { id: id(), sorte: 'etoile', titre: titre, texte: texte || '', video: '', questions: [], joueurId: ids[nom], domaine: d, etoile: l[0], etoiles: l, xp: 0, debut: depuis, fin: fin || vac, statut: 'active', parQui: par.id, parNom: par.nom, faiteLe: '', cree: iso(depuis, '20:00'), maj: iso(depuis, '20:00') };
      db.insert('defmissions', m); return m;
    }
    function plus1(nom, m, par, ev, dt, mot) {
      db.insert('encouragements', { id: id(), joueurId: ids[nom], missionId: m ? m.id : '', domaine: m ? m.domaine : '', etoile: m ? m.etoile : '', mot: mot || '', parQui: par.id, parNom: par.nom, date: dt, occasion: ev ? occ(ev) : '', evenementId: ev ? ev.id : '', retire: false, cree: iso(dt, '19:' + (10 + Math.floor(Math.random() * 40))) });
    }
    var mTom = perso('Tom', 'plaquage', ['epaule', 'deux-cotes'], x.nico, L.addDays(today, -18), 'Épaule et Des deux côtés', vac, 'On vise l\'épaule, des deux côtés, avant les vacances !');
    plus1('Tom', mTom, x.julien, x.p1, d1, 'Bien mieux à droite');
    plus1('Tom', mTom, x.nico, null, L.addDays(today, -10), '');
    plus1('Tom', mTom, x.nico, x.e0, x.merAv, 'Je l\'ai vu ! L\'épaule était bien engagée sur le plaquage de Jules.');
    plus1('Tom', null, x.cyril, x.p1, d1, 'Quelle envie au plateau, continue comme ça !');
    // (v36) des bravos des éducs sur une séance récente (Tom avec un mot, Inès sans)
    function bravo(nom, par, mot) {
      var l = db.rows('seances').filter(function (s) { return s.joueurId === ids[nom]; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; });
      if (!l.length) return;
      var t = new Date(Math.min(Date.now() - 60000, Date.parse(l[0].cree) + 3600000)).toISOString();
      db.insert('bravos', { id: id(), joueurId: ids[nom], seanceId: l[0].id, mot: mot || '', parQui: par.id, parNom: par.nom, retire: false, cree: t, maj: t });
    }
    bravo('Tom', x.cyril, 'Super régularité, continue !');
    bravo('Inès', x.julien, '');
    var mInes = perso('Inès', 'passe', ['gauche', 'vrillee'], x.nico, L.addDays(today, -6), 'Passe à gauche et Passe vrillée');
    plus1('Inès', mInes, x.nico, x.e0, x.merAv, '');
    perso('Jules', 'ruck', ['tete', 'porte'], x.julien, L.addDays(today, -9), 'Tête bien placée et Par la porte');
    perso('Maël', 'plaquage', 'cercle', x.cyril, L.addDays(today, -4), 'Serrer fort sans lâcher');
    perso('Lou', 'passe', 'mains', x.nico, L.addDays(today, -35), 'Réceptionner mains en cible', L.addDays(today, -3));   // terminée : la date est passée
    // missions du groupe
    var debV = L.addDays(today, -2), debQ = L.addDays(today, -8);
    var vid = { id: id(), sorte: 'video', titre: 'Le ruck en vidéo', texte: 'Regarde comment Grégory Alldritt gratte le ballon : où est sa tête ?', video: 'Dbp38-ANm5A', joueurId: '', domaine: '', etoile: '',
      questions: [{ q: 'Au ruck, où doit être ta tête ?', opts: ['Plus bas que tes hanches', 'Au-dessus des hanches, dos plat, tête levée', 'Tournée vers le sol'], ok: 1 },
        { q: 'Tu rentres dans le ruck…', opts: ['Par le côté', 'En sautant', 'Par derrière, dans l\'axe'], ok: 2 },
        { q: 'Pour gagner le ballon, tu pousses avec…', opts: ['Les jambes, à petits pas', 'Les bras', 'La tête'], ok: 0 }],
      xp: 50, debut: debV, fin: L.addDays(today, 12), statut: 'active', parQui: x.nico.id, parNom: x.nico.nom, faiteLe: '', cree: iso(debV, '20:30'), maj: iso(debV, '20:30') };
    var qcm = { id: id(), sorte: 'qcm', titre: 'Le hors-jeu', texte: 'Petites questions pour bien défendre sans être hors-jeu.', video: '', joueurId: '', domaine: '', etoile: '',
      questions: [{ q: 'Quand tu es devant le porteur du ballon de ton équipe, tu es…', opts: ['En jeu', 'Hors-jeu', 'Remplaçant'], ok: 1 },
        { q: 'Pour défendre autour d\'un ruck, tu restes…', opts: ['Derrière le dernier pied du ruck, de ton côté', 'Devant le ballon', 'Où tu veux'], ok: 0 },
        { q: 'Tu étais hors-jeu : avant de jouer, tu dois…', opts: ['Plaquer quand même', 'Revenir derrière la ligne du ballon', 'Attendre la fin du match'], ok: 1 },
        { q: 'Au ruck, tu rentres…', opts: ['Par derrière, dans l\'axe', 'Par le côté', 'En plongeant'], ok: 0 }],
      xp: 50, debut: debQ, fin: L.addDays(today, 9), statut: 'active', parQui: x.julien.id, parNom: x.julien.nom, faiteLe: '', cree: iso(debQ, '21:00'), maj: iso(debQ, '21:00') };
    db.insert('defmissions', vid); db.insert('defmissions', qcm);
    [['Inès', vid, [1, 2, 0]], ['Nina', vid, [1, 2, 1]], ['Léo', vid, null], ['Sacha', vid, [0, 2, 0]], ['Arthur', vid, [1, 2, 0]],
      ['Inès', qcm, [1, 0, 1, 0]], ['Nina', qcm, [1, 0, 1, 1]], ['Chloé', qcm, [1, 1, 1, 0]], ['Enzo', qcm, [0, 0, 1, 0]], ['Louise', qcm, [1, 0, 1, 0]], ['Jules', qcm, [1, 0, 0, 0]]
    ].forEach(function (t) {
      var m = t[1], ans = t[2], dt = L.addDays(today, -1), r = { vu: m.sorte === 'video' ? true : undefined };
      if (ans) { r.ans = ans; r.total = m.questions.length; r.score = ans.filter(function (a, i) { return a === m.questions[i].ok; }).length; r.xp = m.xp; }
      var faite = !!ans;
      db.insert('missions', { id: id(), joueurId: ids[t[0]], mission: m.id, reponses: r, faite: faite, date: faite ? dt : '', source: 'appli', cree: iso(dt), maj: iso(dt) });
    });
  }

  return { seed: seed, CODES: CODES };
})();
