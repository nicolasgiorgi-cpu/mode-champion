/* ====== Mode champion · M12 — SERVEUR (fichier unique à coller dans Apps Script) ====== */
/* Généré automatiquement : ne pas modifier ici, voir js/core.js et outils/code-google.gs */

/* =========================================================
   Mode champion · M12 — CŒUR DU SERVEUR
   Ce fichier est utilisé à deux endroits :
   - dans Google Apps Script (copie « Core.gs ») : le vrai serveur, branché sur la Google Sheet ;
   - dans le navigateur en MODE DÉMO : même logique, données gardées dans le navigateur.
   Pas de dépendance, JavaScript simple (compatible Apps Script V8).
   ========================================================= */
var Core = (function () {
  'use strict';

  // ---------------------------------------------------------
  // SHA-256 et HMAC (purs JS)
  // ---------------------------------------------------------
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8(str) {
    var out = [];
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function sha256Bytes(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length;
    var msg = bytes.slice();
    msg.push(0x80);
    while ((msg.length % 64) !== 56) msg.push(0);
    var bitLenHi = Math.floor(l / 0x20000000), bitLenLo = (l * 8) >>> 0;
    msg.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255);
    msg.push((bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);
    var W = new Array(64);
    for (var off = 0; off < msg.length; off += 64) {
      for (var t = 0; t < 16; t++) {
        W[t] = ((msg[off + 4 * t] << 24) | (msg[off + 4 * t + 1] << 16) | (msg[off + 4 * t + 2] << 8) | msg[off + 4 * t + 3]) | 0;
      }
      for (t = 16; t < 64; t++) {
        var w15 = W[t - 15], w2 = W[t - 2];
        var s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
        var s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = [];
    for (var i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255);
    return out;
  }
  function toHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }
  function sha256(str) { return toHex(sha256Bytes(utf8(str))); }
  function hmac(key, msg) {
    var k = utf8(key);
    if (k.length > 64) k = sha256Bytes(k);
    while (k.length < 64) k.push(0);
    var ipad = [], opad = [];
    for (var i = 0; i < 64; i++) { ipad.push(k[i] ^ 0x36); opad.push(k[i] ^ 0x5c); }
    var inner = sha256Bytes(ipad.concat(utf8(msg)));
    return toHex(sha256Bytes(opad.concat(inner)));
  }

  // ---------------------------------------------------------
  // Tables
  // ---------------------------------------------------------
  // s = texte, n = nombre, b = oui/non, j = JSON
  var SCHEMA = {
    joueurs: [['id', 's'], ['prenom', 's'], ['couleur', 's'], ['familleId', 's'], ['pinHash', 's'], ['pinV', 'n'],
      ['tempHash', 's'], ['tempExp', 'n'], ['mustChange', 'b'], ['fails', 'n'], ['lockUntil', 'n'], ['niveaux', 'j'],
      ['materiel', 's'], ['visible', 'b'], ['actif', 'b'], ['cree', 's']],
    familles: [['id', 's'], ['nom', 's'], ['codeHash', 's'], ['codeV', 'n'], ['cree', 's']],
    educs: [['id', 's'], ['nom', 's'], ['codeHash', 's'], ['codeV', 'n'], ['admin', 'b'], ['actif', 'b'], ['cree', 's'], ['enfants', 'j']],
    seances: [['id', 's'], ['joueurId', 's'], ['date', 's'], ['type', 's'], ['mode', 's'], ['ressenti', 's'], ['details', 'j'], ['cree', 's']],
    records: [['id', 's'], ['joueurId', 's'], ['bilan', 's'], ['test', 's'], ['valeur', 'n'], ['extra', 'j'], ['statut', 's'],
      ['parQui', 's'], ['date', 's'], ['cree', 's']],
    journal: [['id', 's'], ['joueurId', 's'], ['type', 's'], ['data', 'j'], ['date', 's'], ['cree', 's']]
  };

  // Valeur brute (texte de la feuille) -> valeur typée
  function fromCell(type, v) {
    if (type === 'n') { if (v === '' || v === null || v === undefined) return 0; var n = Number(v); return isFinite(n) ? n : 0; }
    if (type === 'b') return v === true || v === 1 || v === '1' || v === 'true' || v === 'TRUE' || v === 'VRAI' || v === 'oui';
    if (type === 'j') {
      if (v && typeof v === 'object') return v;
      if (v === '' || v === null || v === undefined) return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    }
    return v === null || v === undefined ? '' : String(v);
  }
  // Valeur typée -> texte pour la feuille
  function toCell(type, v) {
    if (type === 'b') return v ? '1' : '0';
    if (type === 'j') return v === null || v === undefined ? '' : JSON.stringify(v);
    if (type === 'n') return v === null || v === undefined || v === '' ? '' : String(Number(v));
    return v === null || v === undefined ? '' : String(v);
  }
  function rowFromCells(table, cells) {
    var cols = SCHEMA[table], o = {};
    for (var i = 0; i < cols.length; i++) o[cols[i][0]] = fromCell(cols[i][1], cells[i]);
    return o;
  }
  function cellsFromRow(table, row) {
    var cols = SCHEMA[table], out = [];
    for (var i = 0; i < cols.length; i++) out.push(toCell(cols[i][1], row[cols[i][0]]));
    return out;
  }

  // ---------------------------------------------------------
  // Outils
  // ---------------------------------------------------------
  function Err(code, message, extra) { this.code = code; this.message = message; this.extra = extra || null; }
  function fail(code, message, extra) { throw new Err(code, message, extra); }

  var DAY = 86400000;
  var TYPES_SEANCE = ['cros', 'capuozzo', 'dupont', 'meafou', 'club', 'recup'];
  var MODES = ['guidee', 'rapide'];
  var RESSENTIS = ['', 'facile', 'bien', 'dur'];
  var FAIBLES = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321', '0123', '3210', '1212', '6969', '2580', '1122', '1010', '2020', '0101'];

  function pinFaible(pin) {
    if (FAIBLES.indexOf(pin) >= 0) return true;
    if (pin.charAt(0) === pin.charAt(1) && pin.charAt(1) === pin.charAt(2)) return true;
    if (pin.slice(0, 2) === pin.slice(2)) return true;
    return false;
  }
  function isoDate(ms) {
    var d = new Date(ms);
    var m = d.getMonth() + 1, j = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (j < 10 ? '0' : '') + j;
  }
  function isoNow(ms) { return new Date(ms).toISOString(); }
  function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00')); }
  function cleanText(s, max) {
    s = String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.slice(0, max || 40);
  }
  function genId(env, n) {
    var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = '';
    for (var i = 0; i < (n || 10); i++) s += a.charAt(env.rand(a.length));
    return s;
  }
  function genDigits(env, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += String(env.rand(10));
    return s;
  }
  function find(rows, id) {
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }
  function where(rows, key, val) {
    var out = [];
    for (var i = 0; i < rows.length; i++) if (rows[i][key] === val) out.push(rows[i]);
    return out;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function secret(db) {
    var s = db.getProp('secret');
    if (!s) fail('installation', 'Le serveur n\'est pas installé (lance la fonction « installer »).');
    return s;
  }

  // Empreintes des codes
  function hashPin(sec, joueurId, pin) { return sha256(sec + '|pin|' + joueurId + '|' + pin); }
  function hashTemp(sec, joueurId, code) { return sha256(sec + '|tmp|' + joueurId + '|' + code); }
  function hashAdulte(sec, code) { return sha256(sec + '|adulte|' + code); }

  // ---------------------------------------------------------
  // Jetons de session (signés, sans stockage)
  // ---------------------------------------------------------
  function makeToken(sec, role, id, v, exp) {
    var payload = role + '~' + id + '~' + v + '~' + exp;
    return payload + '.' + hmac(sec, payload).slice(0, 40);
  }
  function readToken(ctx, token) {
    if (!token || typeof token !== 'string') return null;
    var dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    var payload = token.slice(0, dot), sig = token.slice(dot + 1);
    if (hmac(ctx.secret, payload).slice(0, 40) !== sig) return null;
    var p = payload.split('~');
    if (p.length !== 4) return null;
    var exp = Number(p[3]);
    if (!(exp > ctx.now)) return null;
    var role = p[0], id = p[1], v = Number(p[2]), row = null;
    if (role === 'p') {
      row = find(ctx.db.rows('joueurs'), id);
      if (!row || !row.actif || Number(row.pinV) !== v) return null;
    } else if (role === 'f') {
      row = find(ctx.db.rows('familles'), id);
      if (!row || Number(row.codeV) !== v) return null;
    } else if (role === 'e') {
      row = find(ctx.db.rows('educs'), id);
      if (!row || !row.actif || Number(row.codeV) !== v) return null;
    } else return null;
    return { r: role, id: id, row: row };
  }

  var TOKEN_JOUEUR = 150 * DAY;
  var TOKEN_ADULTE = 120 * DAY;

  // ---------------------------------------------------------
  // Vues publiques des lignes
  // ---------------------------------------------------------
  function pubJoueur(r) {
    return {
      id: r.id, prenom: r.prenom, couleur: r.couleur, familleId: r.familleId,
      niveaux: r.niveaux || {}, materiel: r.materiel || 'complet', visible: !!r.visible,
      mustChange: !!r.mustChange, actif: !!r.actif, aUnCode: !!r.pinHash
    };
  }
  function pubSeance(s, full) {
    var o = { id: s.id, joueurId: s.joueurId, date: s.date, type: s.type, mode: s.mode, ressenti: s.ressenti, cree: s.cree };
    if (full) o.details = s.details || null;
    return o;
  }
  function pubRecord(r) {
    return { id: r.id, joueurId: r.joueurId, bilan: r.bilan, test: r.test, valeur: r.valeur, extra: r.extra || null, statut: r.statut, parQui: r.parQui, date: r.date, cree: r.cree };
  }
  function pubJournal(j) { return { id: j.id, joueurId: j.joueurId, type: j.type, data: j.data || null, date: j.date, cree: j.cree }; }

  function dossier(ctx, joueur, full) {
    var db = ctx.db;
    return {
      joueur: pubJoueur(joueur),
      seances: where(db.rows('seances'), 'joueurId', joueur.id).map(function (s) { return pubSeance(s, full); }),
      records: where(db.rows('records'), 'joueurId', joueur.id).map(pubRecord),
      journal: where(db.rows('journal'), 'joueurId', joueur.id).map(pubJournal)
    };
  }

  // ---------------------------------------------------------
  // Codes
  // ---------------------------------------------------------
  function newKidTemp(env) {
    var c;
    do { c = genDigits(env, 4); } while (pinFaible(c));
    return c;
  }
  function newAdultCode(ctx) {
    var c, h, used;
    var fam = ctx.db.rows('familles'), edu = ctx.db.rows('educs');
    for (var tries = 0; tries < 50; tries++) {
      c = genDigits(ctx.env, 6);
      if (c.charAt(0) === '0') continue;
      h = hashAdulte(ctx.secret, c);
      used = false;
      for (var i = 0; i < fam.length; i++) if (fam[i].codeHash === h) used = true;
      for (i = 0; i < edu.length; i++) if (edu[i].codeHash === h) used = true;
      if (!used) return { code: c, hash: h };
    }
    fail('serveur', 'Impossible de créer un code, réessaie.');
  }

  function checkPinFormat(pin) {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) fail('invalide', 'Le code doit faire 4 chiffres.');
  }

  // Trop d'essais de connexion adulte (tous comptes confondus)
  function adultThrottle(ctx, isFail) {
    var raw = ctx.db.getProp('adultFails');
    var st = raw ? JSON.parse(raw) : { n: 0, t: 0 };
    if (ctx.now - st.t > 10 * 60000) st = { n: 0, t: ctx.now };
    if (isFail === undefined) {
      if (st.n >= 25) fail('bloque', 'Trop d\'essais. Réessaie dans quelques minutes.', { minutes: Math.ceil((st.t + 10 * 60000 - ctx.now) / 60000) });
      return;
    }
    if (isFail) { st.n++; ctx.db.setProp('adultFails', JSON.stringify(st)); }
  }

  // ---------------------------------------------------------
  // Contrôles d'accès
  // ---------------------------------------------------------
  function kidFor(ctx, joueurId) {
    var j = find(ctx.db.rows('joueurs'), joueurId);
    if (!j) fail('introuvable', 'Joueur introuvable.');
    if (ctx.auth.r === 'e') return j;
    if (ctx.auth.r === 'f' && j.familleId === ctx.auth.id) return j;
    if (ctx.auth.r === 'p' && j.id === ctx.auth.id) return j;
    fail('interdit', 'Ce joueur n\'est pas dans ta famille.');
  }
  function requireAdmin(ctx) { if (!(ctx.auth.r === 'e' && ctx.auth.row.admin)) fail('interdit', 'Réservé à l\'administrateur.'); }

  // ---------------------------------------------------------
  // Actions
  // ---------------------------------------------------------
  var A = {};

  A.ping = { run: function (req, ctx) { return { app: 'mode-champion', heure: ctx.now }; } };

  A.roster = {
    run: function (req, ctx) {
      var list = ctx.db.rows('joueurs').filter(function (j) { return j.actif; }).map(function (j) {
        return { id: j.id, prenom: j.prenom, couleur: j.couleur, nouveau: !j.pinHash };
      });
      list.sort(function (a, b) { return a.prenom.localeCompare(b.prenom, 'fr'); });
      return { joueurs: list };
    }
  };

  A.login = {
    run: function (req, ctx) {
      var j = find(ctx.db.rows('joueurs'), String(req.joueurId || ''));
      if (!j || !j.actif) fail('introuvable', 'Joueur introuvable.');
      var pin = String(req.pin || '');
      if (Number(j.lockUntil) > ctx.now) {
        fail('bloque', 'Trop d\'essais. Réessaie dans ' + Math.ceil((j.lockUntil - ctx.now) / 60000) + ' min.', { minutes: Math.ceil((j.lockUntil - ctx.now) / 60000) });
      }
      var ok = false, temp = false;
      if (j.pinHash && j.pinHash === hashPin(ctx.secret, j.id, pin)) ok = true;
      else if (j.tempHash && Number(j.tempExp) > ctx.now && j.tempHash === hashTemp(ctx.secret, j.id, pin)) { ok = true; temp = true; }
      if (!ok) {
        var fails = Number(j.fails || 0) + 1, patch = { fails: fails };
        if (fails >= 5) { patch.fails = 0; patch.lockUntil = ctx.now + 10 * 60000; }
        ctx.db.update('joueurs', j.id, patch);
        if (patch.lockUntil) fail('bloque', 'Trop d\'essais : ton profil est bloqué 10 minutes.', { minutes: 10 });
        fail('code', 'Code incorrect.', { reste: 5 - fails });
      }
      var p = { fails: 0, lockUntil: 0 };
      if (temp) p.mustChange = true;
      ctx.db.update('joueurs', j.id, p);
      j = find(ctx.db.rows('joueurs'), j.id);
      return {
        token: makeToken(ctx.secret, 'p', j.id, Number(j.pinV || 0), ctx.now + TOKEN_JOUEUR),
        joueur: pubJoueur(j),
        me: j.mustChange ? null : dossier(ctx, j, true)
      };
    }
  };

  A.setPin = {
    auth: ['p'],
    run: function (req, ctx) {
      var pin = String(req.pin || '');
      checkPinFormat(pin);
      if (pinFaible(pin)) fail('faible', 'Trop facile à deviner ! Évite 1234, 0000 ou 1212.');
      var j = ctx.auth.row;
      var patch = { pinHash: hashPin(ctx.secret, j.id, pin), pinV: Number(j.pinV || 0) + 1, tempHash: '', tempExp: 0, mustChange: false };
      if (req.couleur && /^#[0-9A-Fa-f]{6}$/.test(req.couleur)) patch.couleur = req.couleur;
      ctx.db.update('joueurs', j.id, patch);
      j = find(ctx.db.rows('joueurs'), j.id);
      return { token: makeToken(ctx.secret, 'p', j.id, Number(j.pinV), ctx.now + TOKEN_JOUEUR), joueur: pubJoueur(j), me: dossier(ctx, j, true) };
    }
  };

  A.me = {
    auth: ['p'],
    run: function (req, ctx) { return dossier(ctx, ctx.auth.row, true); }
  };

  A.logSession = {
    auth: ['p'],
    run: function (req, ctx) {
      var type = String(req.type || '');
      if (TYPES_SEANCE.indexOf(type) < 0) fail('invalide', 'Séance inconnue.');
      var date = String(req.date || '');
      if (!validDate(date)) fail('invalide', 'Date invalide.');
      var t = Date.parse(date + 'T12:00:00');
      if (t > ctx.now + 2 * DAY || t < ctx.now - 90 * DAY) fail('invalide', 'Date trop éloignée.');
      var mode = MODES.indexOf(req.mode) >= 0 ? req.mode : 'rapide';
      var ress = RESSENTIS.indexOf(req.ressenti || '') >= 0 ? (req.ressenti || '') : '';
      var details = req.details && typeof req.details === 'object' ? req.details : null;
      if (details && JSON.stringify(details).length > 20000) fail('invalide', 'Trop de données.');
      var row = { id: genId(ctx.env), joueurId: ctx.auth.id, date: date, type: type, mode: mode, ressenti: ress, details: details, cree: isoNow(ctx.now) };
      ctx.db.insert('seances', row);
      return { seance: pubSeance(row, true), me: req.avecDossier ? dossier(ctx, find(ctx.db.rows('joueurs'), ctx.auth.id), true) : null };
    }
  };

  A.deleteSession = {
    auth: ['p'],
    run: function (req, ctx) {
      var s = find(ctx.db.rows('seances'), String(req.id || ''));
      if (!s || s.joueurId !== ctx.auth.id) fail('introuvable', 'Séance introuvable.');
      if (ctx.now - Date.parse(s.cree) > 7 * DAY) fail('interdit', 'Trop ancienne pour être supprimée.');
      ctx.db.remove('seances', s.id);
      return {};
    }
  };

  function cleanNiveaux(n) {
    var out = {};
    if (!n || typeof n !== 'object') return out;
    for (var k in n) {
      if (!/^[a-z0-9_]{1,24}$/.test(k)) continue;
      var v = Math.round(Number(n[k]));
      if (v >= 1 && v <= 4) out[k] = v;
    }
    return out;
  }

  function majJoueur(req, ctx) {
      var j = ctx.auth.row, patch = {};
      if (req.niveaux) {
        var cur = j.niveaux || {}, nv = cleanNiveaux(req.niveaux);
        for (var k in nv) cur[k] = nv[k];
        patch.niveaux = cur;
      }
      if (req.materiel === 'complet' || req.materiel === 'mini') patch.materiel = req.materiel;
      ctx.db.update('joueurs', j.id, patch);
      var jr = Array.isArray(req.journal) ? req.journal.slice(0, 20) : [];
      for (var i = 0; i < jr.length; i++) {
        var e = jr[i];
        if (!e || ['niveau', 'niveau_refus', 'bilan_niveaux'].indexOf(e.type) < 0) continue;
        ctx.db.insert('journal', { id: genId(ctx.env), joueurId: j.id, type: e.type, data: e.data || null, date: isoDate(ctx.now), cree: isoNow(ctx.now) });
      }
  }
  A.updateMe = {
    auth: ['p'],
    run: function (req, ctx) {
      majJoueur(req, ctx);
      return dossier(ctx, find(ctx.db.rows('joueurs'), ctx.auth.id), true);
    }
  };

  A.submitRecords = {
    auth: ['p'],
    run: function (req, ctx) {
      var bilan = String(req.bilan === undefined ? '' : req.bilan);
      if (!/^(\d|defi)$/.test(bilan)) fail('invalide', 'Bilan inconnu.');
      // date de réalisation : aujourd'hui par défaut, sinon la date choisie (pas dans le futur, pas plus de 150 jours avant)
      var date = isoDate(ctx.now);
      if (req.date !== undefined && req.date !== null && req.date !== '') {
        if (!validDate(String(req.date))) fail('invalide', 'Date invalide.');
        var td = Date.parse(req.date + 'T12:00:00');
        if (td > ctx.now + 2 * DAY || td < ctx.now - 150 * DAY) fail('invalide', 'Date trop éloignée.');
        date = String(req.date);
      }
      var vals = Array.isArray(req.valeurs) ? req.valeurs.slice(0, 20) : [];
      var mine = where(ctx.db.rows('records'), 'joueurId', ctx.auth.id), saved = [];
      for (var i = 0; i < vals.length; i++) {
        var v = vals[i];
        if (!v || !/^[a-z0-9_]{1,24}$/.test(String(v.test))) continue;
        var n = Number(v.valeur);
        if (!isFinite(n) || n < 0 || n > 10000) continue;
        var extra = v.extra && typeof v.extra === 'object' ? v.extra : null;
        var existing = null;
        if (bilan !== 'defi') {
          for (var k = 0; k < mine.length; k++) if (mine[k].bilan === bilan && mine[k].test === v.test) existing = mine[k];
        }
        if (existing) {
          if (existing.valeur === n && JSON.stringify(existing.extra || null) === JSON.stringify(extra)) {
            // même résultat : seule la date peut changer, la confirmation est gardée
            if (existing.date !== date) ctx.db.update('records', existing.id, { date: date });
            saved.push(pubRecord(find(ctx.db.rows('records'), existing.id)));
            continue;
          }
          ctx.db.update('records', existing.id, { valeur: n, extra: extra, statut: 'attente', parQui: '', date: date });
          saved.push(pubRecord(find(ctx.db.rows('records'), existing.id)));
        } else {
          var row = { id: genId(ctx.env), joueurId: ctx.auth.id, bilan: bilan, test: String(v.test), valeur: n, extra: extra, statut: 'attente', parQui: '', date: date, cree: isoNow(ctx.now) };
          ctx.db.insert('records', row);
          saved.push(pubRecord(row));
        }
      }
      // la date vaut pour tout le bilan : les tests déjà envoyés de ce bilan prennent la nouvelle date
      if (bilan !== 'defi' && req.date) {
        mine.forEach(function (r) { if (r.bilan === bilan && r.date !== date) ctx.db.update('records', r.id, { date: date }); });
      }
      if (req.niveaux || req.journal) majJoueur(req, ctx);
      return { records: saved, me: req.avecDossier ? dossier(ctx, find(ctx.db.rows('joueurs'), ctx.auth.id), true) : null };
    }
  };

  A.league = {
    auth: ['p'],
    run: function (req, ctx) {
      var me = ctx.auth.id;
      var players = ctx.db.rows('joueurs').filter(function (j) { return j.actif && (j.visible || j.id === me); });
      var ids = {};
      players.forEach(function (j) { ids[j.id] = true; });
      var recs = ctx.db.rows('records').filter(function (r) { return ids[r.joueurId] && (r.statut === 'ok' || r.joueurId === me); });
      return {
        joueurs: players.map(function (j) { return { id: j.id, prenom: j.prenom, couleur: j.couleur, niveaux: j.niveaux || {}, materiel: j.materiel || 'complet' }; }),
        records: recs.map(pubRecord)
      };
    }
  };

  // ----- Adultes -----
  A.adultLogin = {
    run: function (req, ctx) {
      adultThrottle(ctx);
      var code = String(req.code || '');
      if (!/^\d{6}$/.test(code)) fail('invalide', 'Le code fait 6 chiffres.');
      var h = hashAdulte(ctx.secret, code);
      var fam = ctx.db.rows('familles'), i;
      for (i = 0; i < fam.length; i++) {
        if (fam[i].codeHash === h) {
          return { token: makeToken(ctx.secret, 'f', fam[i].id, Number(fam[i].codeV || 0), ctx.now + TOKEN_ADULTE), role: 'f', nom: fam[i].nom, admin: false };
        }
      }
      var edu = ctx.db.rows('educs');
      for (i = 0; i < edu.length; i++) {
        if (edu[i].actif && edu[i].codeHash === h) {
          return { token: makeToken(ctx.secret, 'e', edu[i].id, Number(edu[i].codeV || 0), ctx.now + TOKEN_ADULTE), role: 'e', nom: edu[i].nom, admin: !!edu[i].admin };
        }
      }
      adultThrottle(ctx, true);
      fail('code', 'Code incorrect.');
    }
  };

  A.family = {
    auth: ['f'],
    run: function (req, ctx) {
      var f = ctx.auth.row;
      var kids = ctx.db.rows('joueurs').filter(function (j) { return j.familleId === f.id && j.actif; });
      return { famille: { id: f.id, nom: f.nom }, enfants: kids.map(function (k) { return dossier(ctx, k, true); }) };
    }
  };

  A.confirm = {
    auth: ['f', 'e'],
    run: function (req, ctx) {
      var qui = ctx.auth.r === 'e' ? 'Éduc ' + ctx.auth.row.nom : 'Parent';
      var dec = Array.isArray(req.decisions) ? req.decisions.slice(0, 200) : (Array.isArray(req.ids) ? req.ids.map(function (id) { return { id: id, statut: req.statut }; }) : []);
      var done = 0, ok = 0, refus = 0, out = [];
      for (var i = 0; i < dec.length; i++) {
        if (!dec[i]) continue;
        var statut = dec[i].statut === 'refuse' ? 'refuse' : 'ok';
        var r = find(ctx.db.rows('records'), String(dec[i].id));
        if (!r) continue;
        kidFor(ctx, r.joueurId);
        ctx.db.update('records', r.id, { statut: statut, parQui: qui });
        done++; if (statut === 'ok') ok++; else refus++;
        out.push(pubRecord(find(ctx.db.rows('records'), r.id)));
      }
      return { faits: done, confirmes: ok, refuses: refus, records: out };
    }
  };

  A.resetKidPin = {
    auth: ['f', 'e'],
    run: function (req, ctx) {
      var j = kidFor(ctx, String(req.joueurId || ''));
      var code = newKidTemp(ctx.env);
      ctx.db.update('joueurs', j.id, {
        tempHash: hashTemp(ctx.secret, j.id, code), tempExp: ctx.now + 2 * DAY, mustChange: true,
        pinHash: '', pinV: Number(j.pinV || 0) + 1, fails: 0, lockUntil: 0
      });
      return { code: code, expire: ctx.now + 2 * DAY, prenom: j.prenom };
    }
  };

  A.setVisible = {
    auth: ['f', 'e'],
    run: function (req, ctx) {
      var j = kidFor(ctx, String(req.joueurId || ''));
      ctx.db.update('joueurs', j.id, { visible: !!req.visible });
      return { visible: !!req.visible };
    }
  };

  A.kid = {
    auth: ['f', 'e'],
    run: function (req, ctx) { return dossier(ctx, kidFor(ctx, String(req.joueurId || '')), true); }
  };

  // ----- Éducs -----
  A.group = {
    auth: ['e'],
    run: function (req, ctx) {
      var db = ctx.db;
      var seances = db.rows('seances'), records = db.rows('records'), journal = db.rows('journal');
      var fams = db.rows('familles');
      var joueurs = db.rows('joueurs').map(function (j) {
        return {
          joueur: pubJoueur(j),
          famille: (find(fams, j.familleId) || {}).nom || '',
          seances: where(seances, 'joueurId', j.id).map(function (s) { return pubSeance(s, false); }),
          records: where(records, 'joueurId', j.id).map(pubRecord),
          journal: where(journal, 'joueurId', j.id).map(pubJournal)
        };
      });
      return {
        moi: { id: ctx.auth.row.id, nom: ctx.auth.row.nom, admin: !!ctx.auth.row.admin, enfants: Array.isArray(ctx.auth.row.enfants) ? ctx.auth.row.enfants : [] },
        joueurs: joueurs,
        familles: fams.map(function (f) { return { id: f.id, nom: f.nom }; })
      };
    }
  };

  // Niveaux d'un joueur réglés par un parent (son enfant) ou un éduc. Pas d'XP pour ces réglages.
  A.setNiveaux = {
    auth: ['f', 'e'],
    run: function (req, ctx) {
      var j = kidFor(ctx, String(req.joueurId || ''));
      var nv = cleanNiveaux(req.niveaux), cur = j.niveaux || {}, chg = {};
      for (var k in nv) { if (cur[k] !== nv[k]) chg[k] = { de: cur[k] || 1, a: nv[k] }; cur[k] = nv[k]; }
      ctx.db.update('joueurs', j.id, { niveaux: cur });
      if (Object.keys(chg).length) {
        var qui = ctx.auth.r === 'e' ? 'Éduc ' + ctx.auth.row.nom : 'Parent';
        ctx.db.insert('journal', { id: genId(ctx.env), joueurId: j.id, type: 'niveau_adulte', data: { changes: chg, par: qui }, date: isoDate(ctx.now), cree: isoNow(ctx.now) });
      }
      return { joueur: pubJoueur(find(ctx.db.rows('joueurs'), j.id)) };
    }
  };

  // Un éduc qui est aussi parent : ses enfants, pour les retrouver tout de suite dans le vestiaire
  A.mesEnfants = {
    auth: ['e'],
    run: function (req, ctx) {
      var all = ctx.db.rows('joueurs'), ids = Array.isArray(req.ids) ? req.ids.slice(0, 6) : [];
      ids = ids.map(String).filter(function (id) { return !!find(all, id); });
      ctx.db.update('educs', ctx.auth.row.id, { enfants: ids });
      return { enfants: ids };
    }
  };

  A.addPlayer = {
    auth: ['e'],
    run: function (req, ctx) {
      var prenom = cleanText(req.prenom, 24);
      if (!prenom) fail('invalide', 'Il faut un prénom.');
      var fam = null, famCode = null;
      if (req.familleId) {
        fam = find(ctx.db.rows('familles'), String(req.familleId));
        if (!fam) fail('introuvable', 'Famille introuvable.');
      } else {
        var nom = cleanText(req.familleNom, 40) || ('Famille de ' + prenom);
        var c = newAdultCode(ctx);
        fam = { id: genId(ctx.env), nom: nom, codeHash: c.hash, codeV: 1, cree: isoNow(ctx.now) };
        ctx.db.insert('familles', fam);
        famCode = c.code;
      }
      var couleurs = ['#38E8FF', '#FF4FA3', '#3DFFB0', '#FFC23D', '#B48CFF', '#FF8A3D', '#4D9BFF', '#FF4F6D', '#7CFF6B'];
      var id = genId(ctx.env), code = newKidTemp(ctx.env);
      var row = {
        id: id, prenom: prenom, couleur: couleurs[ctx.env.rand(couleurs.length)], familleId: fam.id,
        pinHash: '', pinV: 1, tempHash: hashTemp(ctx.secret, id, code), tempExp: ctx.now + 45 * DAY, mustChange: true,
        fails: 0, lockUntil: 0, niveaux: {}, materiel: 'complet', visible: true, actif: true, cree: isoNow(ctx.now)
      };
      ctx.db.insert('joueurs', row);
      return { joueur: pubJoueur(row), code: code, expire: row.tempExp, famille: { id: fam.id, nom: fam.nom }, familleCode: famCode };
    }
  };

  A.updatePlayer = {
    auth: ['e'],
    run: function (req, ctx) {
      var j = find(ctx.db.rows('joueurs'), String(req.joueurId || ''));
      if (!j) fail('introuvable', 'Joueur introuvable.');
      var patch = {};
      if (req.prenom !== undefined) { var p = cleanText(req.prenom, 24); if (p) patch.prenom = p; }
      if (req.actif !== undefined) patch.actif = !!req.actif;
      if (req.familleId) { if (!find(ctx.db.rows('familles'), String(req.familleId))) fail('introuvable', 'Famille introuvable.'); patch.familleId = String(req.familleId); }
      if (req.niveaux) { var cur = j.niveaux || {}, nv = cleanNiveaux(req.niveaux); for (var k in nv) cur[k] = nv[k]; patch.niveaux = cur; }
      ctx.db.update('joueurs', j.id, patch);
      return { joueur: pubJoueur(find(ctx.db.rows('joueurs'), j.id)) };
    }
  };

  A.addFamily = {
    auth: ['e'],
    run: function (req, ctx) {
      var nom = cleanText(req.nom, 40);
      if (!nom) fail('invalide', 'Il faut un nom.');
      var c = newAdultCode(ctx);
      var row = { id: genId(ctx.env), nom: nom, codeHash: c.hash, codeV: 1, cree: isoNow(ctx.now) };
      ctx.db.insert('familles', row);
      return { famille: { id: row.id, nom: row.nom }, code: c.code };
    }
  };

  A.resetFamilyCode = {
    auth: ['e'],
    run: function (req, ctx) {
      var f = find(ctx.db.rows('familles'), String(req.familleId || ''));
      if (!f) fail('introuvable', 'Famille introuvable.');
      var c = newAdultCode(ctx);
      ctx.db.update('familles', f.id, { codeHash: c.hash, codeV: Number(f.codeV || 0) + 1 });
      return { code: c.code, famille: { id: f.id, nom: f.nom } };
    }
  };

  A.listEducs = {
    auth: ['e'],
    run: function (req, ctx) {
      requireAdmin(ctx);
      return { educs: ctx.db.rows('educs').map(function (e) { return { id: e.id, nom: e.nom, admin: !!e.admin, actif: !!e.actif }; }) };
    }
  };

  A.addEduc = {
    auth: ['e'],
    run: function (req, ctx) {
      requireAdmin(ctx);
      var nom = cleanText(req.nom, 30);
      if (!nom) fail('invalide', 'Il faut un nom.');
      var c = newAdultCode(ctx);
      var row = { id: genId(ctx.env), nom: nom, codeHash: c.hash, codeV: 1, admin: !!req.admin, actif: true, cree: isoNow(ctx.now) };
      ctx.db.insert('educs', row);
      return { educ: { id: row.id, nom: row.nom, admin: row.admin, actif: true }, code: c.code };
    }
  };

  A.resetEducCode = {
    auth: ['e'],
    run: function (req, ctx) {
      var id = String(req.educId || ctx.auth.id);
      if (id !== ctx.auth.id) requireAdmin(ctx);
      var e = find(ctx.db.rows('educs'), id);
      if (!e) fail('introuvable', 'Éduc introuvable.');
      var c = newAdultCode(ctx);
      ctx.db.update('educs', e.id, { codeHash: c.hash, codeV: Number(e.codeV || 0) + 1 });
      return { code: c.code, nom: e.nom };
    }
  };

  A.updateEduc = {
    auth: ['e'],
    run: function (req, ctx) {
      requireAdmin(ctx);
      var e = find(ctx.db.rows('educs'), String(req.educId || ''));
      if (!e) fail('introuvable', 'Éduc introuvable.');
      if (e.id === ctx.auth.id && req.actif === false) fail('interdit', 'Tu ne peux pas te désactiver toi-même.');
      var patch = {};
      if (req.actif !== undefined) patch.actif = !!req.actif;
      if (req.admin !== undefined && e.id !== ctx.auth.id) patch.admin = !!req.admin;
      ctx.db.update('educs', e.id, patch);
      return {};
    }
  };

  // ---------------------------------------------------------
  // Point d'entrée
  // ---------------------------------------------------------
  function handle(req, db, env) {
    try {
      if (!req || typeof req !== 'object') fail('invalide', 'Requête vide.');
      var action = A[req.action];
      if (!action) fail('invalide', 'Action inconnue.');
      var ctx = { db: db, env: env, now: env.now() };
      ctx.secret = secret(db);
      if (action.auth) {
        ctx.auth = readToken(ctx, req.token);
        if (!ctx.auth) fail('session', 'Ta session a expiré, reconnecte-toi.');
        if (action.auth.indexOf(ctx.auth.r) < 0) fail('interdit', 'Accès refusé.');
      }
      var res = action.run(req, ctx) || {};
      res.ok = true;
      return res;
    } catch (e) {
      if (e instanceof Err) {
        var out = { ok: false, error: e.code, message: e.message };
        if (e.extra) for (var k in e.extra) out[k] = e.extra[k];
        return out;
      }
      return { ok: false, error: 'serveur', message: 'Erreur du serveur : ' + (e && e.message ? e.message : String(e)) };
    }
  }

  // Installation : secret + premier éduc administrateur. Renvoie son code.
  function install(db, env, nom) {
    var created = false;
    if (!db.getProp('secret')) {
      var s = '';
      for (var i = 0; i < 48; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(env.rand(36));
      db.setProp('secret', s);
      created = true;
    }
    var ctx = { db: db, env: env, now: env.now(), secret: db.getProp('secret') };
    var admins = db.rows('educs').filter(function (e) { return e.admin && e.actif; });
    if (admins.length && !created) return { code: null, deja: true, nom: admins[0].nom };
    var c = newAdultCode(ctx);
    var row = { id: genId(env), nom: cleanText(nom || 'Admin', 30), codeHash: c.hash, codeV: 1, admin: true, actif: true, cree: isoNow(ctx.now) };
    db.insert('educs', row);
    return { code: c.code, nom: row.nom };
  }

  return {
    VERSION: '1.0',
    SCHEMA: SCHEMA,
    handle: handle,
    install: install,
    rowFromCells: rowFromCells,
    cellsFromRow: cellsFromRow,
    // outils exposés pour le mode démo et les tests
    _sha256: sha256, _hmac: hmac, _hashPin: hashPin, _hashTemp: hashTemp, _hashAdulte: hashAdulte, _pinFaible: pinFaible, _clone: clone
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Core;

/* =========================================================
   Mode champion · M12 — SERVEUR GOOGLE APPS SCRIPT
   À coller dans le projet Apps Script lié à la Google Sheet,
   avec le fichier Core.gs (copie de js/core.js).
   Voir README.md, partie « Google Sheets ».
   ========================================================= */

var TABLES = ['joueurs', 'familles', 'educs', 'seances', 'records', 'journal'];

/*
 * Cache des onglets (CacheService). Lire un onglet de la feuille coûte 0,2 à 0,5 s ;
 * le cache évite ces lectures d'une demande à l'autre. Toutes les demandes passent sous
 * le verrou, donc le cache reste juste : une écriture le met à jour à la fin de la demande.
 * Une modification faite À LA MAIN dans la feuille est vue au plus tard après CACHE_TTL
 * secondes, ou tout de suite en lançant la fonction viderCache dans l'éditeur.
 */
var CACHE_TTL = 1200;      // 20 min
var CACHE_PART = 24000;    // caractères par morceau (une valeur du cache est limitée à 100 Ko)
var CACHE_MAX_PARTS = 90;  // au-delà, l'onglet est lu dans la feuille à chaque fois

/** Petit adaptateur : les onglets de la feuille servent de tables. Tout est stocké en texte. */
function SheetDB_() {
  this.ss = null;           // la feuille n'est ouverte que si on en a besoin
  this.cache = {};          // onglets lus pendant cette demande
  this.dirty = {};          // onglets modifiés pendant cette demande
  this.props = PropertiesService.getScriptProperties();
  this.cs = CacheService.getScriptCache();
}
SheetDB_.prototype.sheet = function (table) {
  if (!this.ss) this.ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = this.ss.getSheetByName(table);
  if (!sh) throw new Error('Onglet « ' + table + ' » introuvable : lance la fonction installer.');
  return sh;
};
SheetDB_.prototype.rows = function (table) {
  if (this.cache[table]) return this.cache[table];
  var out = this.cacheGet_(table);
  if (!out) { out = this.readSheet_(table); this.cachePut_(table, out); }
  this.cache[table] = out;
  return out;
};
SheetDB_.prototype.readSheet_ = function (table) {
  var sh = this.sheet(table);
  var n = Core.SCHEMA[table].length;
  var last = sh.getLastRow();
  var out = [];
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, n).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      if (!vals[i][0]) continue;
      var o = Core.rowFromCells(table, vals[i]);
      o._row = i + 2;
      out.push(o);
    }
  }
  return out;
};
SheetDB_.prototype.cacheGet_ = function (table) {
  try {
    var meta = this.cs.get('t:' + table);
    if (!meta) return null;
    var n = Number(meta), keys = [], i;
    for (i = 0; i < n; i++) keys.push('t:' + table + ':' + i);
    var got = this.cs.getAll(keys), s = '';
    for (i = 0; i < n; i++) { if (typeof got[keys[i]] !== 'string') return null; s += got[keys[i]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
};
SheetDB_.prototype.cachePut_ = function (table, rows) {
  try {
    var s = JSON.stringify(rows), n = Math.ceil(s.length / CACHE_PART) || 1;
    if (n > CACHE_MAX_PARTS) { this.cs.remove('t:' + table); return; }
    var parts = {}, k = 0;
    for (var i = 0; i < n; i++) {
      parts['t:' + table + ':' + i] = s.slice(i * CACHE_PART, (i + 1) * CACHE_PART);
      if (++k === 30 || i === n - 1) { this.cs.putAll(parts, CACHE_TTL); parts = {}; k = 0; }
    }
    this.cs.put('t:' + table, String(n), CACHE_TTL);
  } catch (e) { try { this.cs.remove('t:' + table); } catch (e2) { /* rien */ } }
};
/** À la fin de chaque demande : le cache reprend l'état des onglets modifiés. */
SheetDB_.prototype.flush_ = function () {
  for (var t in this.dirty) {
    if (this.cache[t]) this.cachePut_(t, this.cache[t]);
    else { try { this.cs.remove('t:' + t); } catch (e) { /* rien */ } }
  }
  this.dirty = {};
};
SheetDB_.prototype.writeRow_ = function (table, rowIndex, obj) {
  var sh = this.sheet(table);
  var cells = Core.cellsFromRow(table, obj);
  // nouvelle colonne ajoutée au programme : on complète la ligne d'en-tête (une fois par demande)
  this.hdr = this.hdr || {};
  if (!this.hdr[table]) {
    this.hdr[table] = true;
    if (!sh.getRange(1, cells.length).getDisplayValue()) sh.getRange(1, 1, 1, cells.length).setValues([Core.SCHEMA[table].map(function (c) { return c[0]; })]);
  }
  var rg = sh.getRange(rowIndex, 1, 1, cells.length);
  rg.setNumberFormat('@');
  rg.setValues([cells]);
};
SheetDB_.prototype.insert = function (table, obj) {
  this.rows(table); // pour que le cache contienne aussi la nouvelle ligne
  var sh = this.sheet(table);
  var rowIndex = Math.max(sh.getLastRow(), 1) + 1;
  this.writeRow_(table, rowIndex, obj);
  var copy = JSON.parse(JSON.stringify(obj));
  copy._row = rowIndex;
  this.cache[table].push(copy);
  this.dirty[table] = true;
};
SheetDB_.prototype.update = function (table, id, patch) {
  var rows = this.rows(table);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      for (var k in patch) rows[i][k] = patch[k];
      // sécurité : si la feuille a été modifiée à la main (lignes ajoutées ou supprimées), la copie en mémoire
      // peut viser la mauvaise ligne. On vérifie l'identifiant avant d'écrire, sinon on relit l'onglet.
      if (String(this.sheet(table).getRange(rows[i]._row, 1).getDisplayValue()) !== String(id)) {
        var fresh = this.readSheet_(table), merged = null;
        for (var f = 0; f < fresh.length; f++) if (fresh[f].id === id) { merged = fresh[f]; break; }
        if (!merged) throw new Error('Ligne introuvable : ' + table + ' ' + id);
        for (var k2 in patch) merged[k2] = patch[k2];
        this.cache[table] = fresh;
        this.writeRow_(table, merged._row, merged);
        this.dirty[table] = true;
        return;
      }
      this.writeRow_(table, rows[i]._row, rows[i]);
      this.dirty[table] = true;
      return;
    }
  }
  throw new Error('Ligne introuvable : ' + table + ' ' + id);
};
SheetDB_.prototype.remove = function (table, id) {
  var rows = this.rows(table);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      this.sheet(table).deleteRow(rows[i]._row);
      delete this.cache[table];
      try { this.cs.remove('t:' + table); } catch (e) { /* la prochaine lecture relira la feuille */ }
      this.dirty[table] = true;
      return;
    }
  }
};
SheetDB_.prototype.getProp = function (k) { return this.props.getProperty(k); };
SheetDB_.prototype.setProp = function (k, v) { this.props.setProperty(k, v); };

function env_() {
  return {
    now: function () { return Date.now(); },
    rand: function (n) { return Math.floor(Math.random() * n); }
  };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Le site envoie toutes ses demandes ici (POST, texte JSON). */
function doPost(e) {
  var req;
  try {
    req = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
  } catch (err) {
    return json_({ ok: false, error: 'invalide', message: 'Requête illisible.' });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'occupe', message: 'Le serveur est occupé, réessaie dans un instant.' });
  }
  var db = new SheetDB_();
  try {
    return json_(Core.handle(req, db, env_()));
  } finally {
    try { db.flush_(); } catch (err) { /* le cache sera relu depuis la feuille */ }
    lock.releaseLock();
  }
}

/** Pour vérifier que le serveur répond (ouvre l'adresse du web app dans un navigateur). */
function doGet() {
  return json_({ ok: true, app: 'mode-champion', version: Core.VERSION });
}

/**
 * À LANCER UNE FOIS depuis l'éditeur (bouton ▶ Exécuter, fonction « installer »).
 * Crée les onglets et le premier compte éduc administrateur.
 * Le code de connexion de l'admin s'affiche dans le « Journal d'exécution » en bas.
 */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  TABLES.forEach(function (t) {
    var sh = ss.getSheetByName(t);
    if (!sh) sh = ss.insertSheet(t);
    var cols = Core.SCHEMA[t].map(function (c) { return c[0]; });
    var head = sh.getRange(1, 1, 1, cols.length);
    head.setNumberFormat('@');
    head.setValues([cols]);
    head.setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  });
  var first = ss.getSheets()[0];
  if (first && TABLES.indexOf(first.getName()) < 0 && first.getLastRow() === 0) {
    try { ss.deleteSheet(first); } catch (e) { /* on garde l'onglet s'il ne peut pas être supprimé */ }
  }
  viderCache();
  var idb = new SheetDB_();
  var res = Core.install(idb, env_(), 'Admin');
  idb.flush_();
  if (res.code) {
    Logger.log('✅ Installation terminée.');
    Logger.log('👉 Code administrateur (espace adultes › Je suis éduc) : ' + res.code);
    Logger.log('Note-le bien : il ne sera plus affiché. Pour en avoir un nouveau : fonction nouveauCodeAdmin.');
  } else {
    Logger.log('Déjà installé (admin : ' + res.nom + '). Pour un nouveau code : fonction nouveauCodeAdmin.');
  }
}

/** Si le code administrateur est perdu : lance cette fonction, le nouveau code s'affiche dans le journal. */
function nouveauCodeAdmin() {
  var db = new SheetDB_();
  var e = env_();
  var admins = db.rows('educs').filter(function (x) { return x.admin && x.actif; });
  if (!admins.length) { installer(); return; }
  var sec = db.getProp('secret');
  var code;
  for (;;) {
    code = String(100000 + e.rand(900000));
    var h = Core._hashAdulte(sec, code);
    var used = db.rows('familles').some(function (f) { return f.codeHash === h; }) || db.rows('educs').some(function (x) { return x.codeHash === h; });
    if (!used) break;
  }
  db.update('educs', admins[0].id, { codeHash: Core._hashAdulte(sec, code), codeV: Number(admins[0].codeV || 0) + 1 });
  db.flush_();
  Logger.log('👉 Nouveau code administrateur pour « ' + admins[0].nom + ' » : ' + code);
}

/** Après une modification faite à la main dans la feuille : lance cette fonction pour que le site la voie tout de suite. */
function viderCache() {
  var cs = CacheService.getScriptCache();
  TABLES.forEach(function (t) { cs.remove('t:' + t); });
  Logger.log('Cache vidé : le site relit la feuille.');
}
