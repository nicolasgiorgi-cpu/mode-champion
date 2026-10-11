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

    db.insert('educs', { id: id(), nom: 'Coach Nico', codeHash: Core._hashAdulte(sec, CODES.educ), codeV: 1, admin: true, actif: true, cree: nowIso });
    var famTom = { id: id(), nom: 'Famille de Tom et Lou', codeHash: Core._hashAdulte(sec, CODES.parent), codeV: 1, cree: nowIso };
    db.insert('familles', famTom);

    var kids = [
      ['Tom', '#38E8FF', 0.95, famTom.id], ['Lou', '#7CFF6B', 0.55, famTom.id], ['Inès', '#FF8A3D', 0.9], ['Léo', '#4D9BFF', 0.85],
      ['Nina', '#3DFFB0', 0.8], ['Sacha', '#FF4FA3', 0.7], ['Enzo', '#FF4F6D', 0.65], ['Jade', '#B48CFF', 0.6],
      ['Maël', '#FFC23D', 0.35], ['Chloé', '#F5F7FF', 0.75], ['Hugo', '#38E8FF', 0.5], ['Rose', '#FF4FA3', 0, null, true]
    ];
    var today = L.today();
    var cyc = L.cycleAt(today);
    var start = cyc.debut;
    var bilan0 = MC.CONFIG.BILANS[0].date;

    kids.forEach(function (k, idx) {
      var famId = k[3];
      if (!famId) {
        famId = id();
        db.insert('familles', { id: famId, nom: 'Famille de ' + k[0], codeHash: Core._hashAdulte(sec, String(200000 + idx * 7919)), codeV: 1, cree: nowIso });
      }
      var pid = id(), isNew = !!k[4];
      // bilan 0 fictif : force selon l'assiduité
      var f = 0.4 + k[2] * 0.6 + (rnd() - 0.5) * 0.3;
      var vals = isNew ? [] : [
        { test: 'flamant', valeur: Math.round(8 + f * 30), extra: null },
        { test: 'saut', valeur: Math.round(110 + f * 45) },
        { test: 'navette', valeur: Math.round((18.5 - f * 4.5) * 10) / 10 },
        { test: 'susp', valeur: Math.round(15 + f * 45) },
        { test: 'tract', valeur: Math.max(0, Math.round(f * 5) - 1), extra: { elastique: f > 0.8 ? 'moyen' : 'fort', nbElastique: Math.round(3 + f * 4) } },
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
  }

  return { seed: seed, CODES: CODES };
})();
