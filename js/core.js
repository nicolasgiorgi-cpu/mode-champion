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
    journal: [['id', 's'], ['joueurId', 's'], ['type', 's'], ['data', 'j'], ['date', 's'], ['cree', 's']],
    // missions ponctuelles (ex. « Prépare le jeu à 10 ») : une ligne par joueur et par mission
    missions: [['id', 's'], ['joueurId', 's'], ['mission', 's'], ['reponses', 'j'], ['faite', 'b'], ['date', 's'], ['source', 's'], ['cree', 's'], ['maj', 's']],
    // ---- compos d'équipes (éducs seulement) ----
    // fiche terrain d'un joueur (id = id du joueur) : niveau A/B/C, passerelle vers le niveau voisin, plaquage 0-5, postes compatibles
    terrain: [['id', 's'], ['niveau', 's'], ['passerelle', 's'], ['plaquage', 'n'], ['postesOk', 'j'], ['spondId', 's'], ['note', 's'], ['parQui', 's'], ['maj', 's']],
    // événements (Spond ou ajoutés à la main) et leurs présents (ids des joueurs de l'appli)
    evenements: [['id', 's'], ['source', 's'], ['titre', 's'], ['sorte', 's'], ['debut', 's'], ['fin', 's'], ['lieu', 's'], ['presents', 'j'], ['absents', 'j'],
      ['sansReponse', 'j'], ['ajouts', 'j'], ['retraits', 'j'], ['inconnus', 'j'], ['annule', 'b'], ['parQui', 's'], ['maj', 's']],
    // la compo d'un événement (une seule active) ; historique = les versions successives
    compos: [['id', 's'], ['evenementId', 's'], ['sorte', 's'], ['version', 'n'], ['auteur', 's'], ['auteurNom', 's'], ['statut', 's'], ['reglages', 'j'],
      ['equipes', 'j'], ['banc', 'j'], ['raisons', 'j'], ['justification', 's'], ['historique', 'j'], ['cree', 's'], ['maj', 's'],
      // compo proposée en 2 versions au vote des éducs : statut « vote », versions, votes { idÉduc: 0 | 1 }, choix = la version retenue
      ['versions', 'j'], ['votes', 'j'], ['choix', 'n']],
    // contre-propositions d'un autre éduc sur une compo publiée
    avis: [['id', 's'], ['compoId', 's'], ['version', 'n'], ['auteur', 's'], ['auteurNom', 's'], ['equipes', 'j'], ['banc', 'j'], ['changements', 'j'],
      ['justification', 's'], ['statut', 's'], ['reponse', 's'], ['parQui', 's'], ['cree', 's'], ['maj', 's']]
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
  // Les copains choisis restent secrets : seuls l'enfant lui-même et les éducs les voient (jamais les parents).
  function pubMission(m, sansCopains) {
    var r = m.reponses || {}, out = {
      postes: Array.isArray(r.postes) ? r.postes : [], quiz: r.quiz || null, quizTop: r.quizTop || null, quizResume: r.quizResume || '',
      copainsFait: !!r.copainsFait
    };
    if (!sansCopains) out.copains = Array.isArray(r.copains) ? r.copains : [];
    return { id: m.id, joueurId: m.joueurId, mission: m.mission, reponses: out, faite: !!m.faite, date: m.date || '', source: m.source || '', maj: m.maj || m.cree || '' };
  }

  function dossier(ctx, joueur, full) {
    var db = ctx.db, parent = !!(ctx.auth && ctx.auth.r === 'f');
    return {
      joueur: pubJoueur(joueur),
      seances: where(db.rows('seances'), 'joueurId', joueur.id).map(function (s) { return pubSeance(s, full); }),
      records: where(db.rows('records'), 'joueurId', joueur.id).map(pubRecord),
      journal: where(db.rows('journal'), 'joueurId', joueur.id).map(pubJournal),
      missions: where(db.rows('missions'), 'joueurId', joueur.id).map(function (m) { return pubMission(m, parent); })
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
        if (!e || ['niveau', 'niveau_refus', 'bilan_niveaux', 'premiers_pas'].indexOf(e.type) < 0) continue;
        if (e.type === 'premiers_pas' && ctx.db.rows('journal').some(function (x) { return x.joueurId === j.id && x.type === 'premiers_pas'; })) continue;   // une seule fois
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

  // ---------------------------------------------------------
  // Missions ponctuelles
  // « jeu10 » : choisir ses postes (1 à 3, dans l'ordre) puis ses copains (secret, sans limite)
  // ---------------------------------------------------------
  var MISSIONS = {
    jeu10: { postes: ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier'], maxPostes: 3 }
  };
  function missionRow(ctx, joueurId, mission) {
    var rows = ctx.db.rows('missions');
    for (var i = 0; i < rows.length; i++) if (rows[i].joueurId === joueurId && rows[i].mission === mission) return rows[i];
    return null;
  }
  function missionRep(row) {
    var c = row && row.reponses ? row.reponses : {};
    return {
      postes: Array.isArray(c.postes) ? c.postes.slice() : [], quiz: c.quiz || null, quizTop: c.quizTop || null, quizResume: c.quizResume || '',
      copains: Array.isArray(c.copains) ? c.copains.slice() : [], copainsFait: !!c.copainsFait
    };
  }
  function saveMission(ctx, joueurId, mission, rep, source) {
    var row = missionRow(ctx, joueurId, mission), now = isoNow(ctx.now);
    var faite = rep.postes.length > 0 && !!rep.copainsFait;
    if (row) {
      var patch = { reponses: rep, faite: faite || !!row.faite, maj: now, source: source || row.source };
      if (patch.faite && !row.date) patch.date = isoDate(ctx.now);
      ctx.db.update('missions', row.id, patch);
    } else {
      ctx.db.insert('missions', { id: genId(ctx.env), joueurId: joueurId, mission: mission, reponses: rep, faite: faite, date: faite ? isoDate(ctx.now) : '', source: source || 'appli', cree: now, maj: now });
    }
  }
  function cleanQuiz(q) {
    if (!q || typeof q !== 'object' || !Array.isArray(q.ans)) return null;
    return {
      ans: q.ans.slice(0, 8).map(function (a) {
        return Array.isArray(a) ? a.slice(0, 3).map(Number).filter(function (n) { return n >= 0 && n < 12 && Math.floor(n) === n; }) : [];
      })
    };
  }

  A.mission = {
    auth: ['p'],
    run: function (req, ctx) {
      var mid = String(req.mission || ''), M = MISSIONS[mid];
      if (!M) fail('invalide', 'Mission inconnue.');
      var me = ctx.auth.row, rep = missionRep(missionRow(ctx, me.id, mid));
      if (req.postes !== undefined) {
        if (!Array.isArray(req.postes)) fail('invalide', 'Postes invalides.');
        var ps = [];
        req.postes.slice(0, 10).forEach(function (p) { p = String(p); if (M.postes.indexOf(p) >= 0 && ps.indexOf(p) < 0) ps.push(p); });
        if (!ps.length) fail('invalide', 'Choisis au moins un poste.');
        rep.postes = ps.slice(0, M.maxPostes);
      }
      if (req.quiz !== undefined) {
        rep.quiz = cleanQuiz(req.quiz);
        rep.quizTop = Array.isArray(req.quizTop) ? req.quizTop.slice(0, 3).filter(function (x) { return x && M.postes.indexOf(String(x.id)) >= 0; }).map(function (x) {
          var pct = Math.round(Number(x.pct)); return { id: String(x.id), pct: pct >= 0 && pct <= 100 ? pct : 0 };
        }) : null;
      }
      if (req.copains !== undefined) {
        if (!Array.isArray(req.copains)) fail('invalide', 'Copains invalides.');
        var all = ctx.db.rows('joueurs'), cs = [];
        req.copains.slice(0, 80).forEach(function (c) { c = String(c); var j = find(all, c); if (j && j.actif && j.id !== me.id && cs.indexOf(c) < 0) cs.push(c); });
        rep.copains = cs;
      }
      if (req.fin) {
        if (!rep.postes.length) fail('invalide', 'Choisis d\'abord ton poste.');
        if (!rep.copains.length) fail('invalide', 'Choisis au moins un copain.');
        rep.copainsFait = true;
      }
      saveMission(ctx, me.id, mid, rep, 'appli');
      return dossier(ctx, find(ctx.db.rows('joueurs'), me.id), true);
    }
  };

  // Reprise des réponses de l'ancien site « Choisis ton poste » (Google Form, réponses rangées dans un onglet de la feuille).
  // rows : [{ prenom, nom, choix: [3 textes], test }] dans l'ordre d'arrivée ; la dernière réponse d'un enfant compte.
  // Un enfant qui a déjà choisi ses postes dans l'appli garde ses choix de l'appli.
  function sansAccents(s) {
    s = String(s === undefined || s === null ? '' : s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* vieux moteur : on garde les accents */ }
    return s.replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim();
  }
  var NOMS_POSTES = {
    pilier: 'pilier', talonneur: 'talonneur', '3eligne': 'troisieme-ligne', '3emeligne': 'troisieme-ligne', troisiemeligne: 'troisieme-ligne', '3l': 'troisieme-ligne',
    demidemelee: 'demi-de-melee', '9': 'demi-de-melee', demidouverture: 'ouvreur', ouvreur: 'ouvreur', '10': 'ouvreur', centre: 'centre', ailier: 'ailier'
  };
  function posteDuTexte(t) { return NOMS_POSTES[sansAccents(t).replace(/[^a-z0-9]/g, '')] || null; }
  function cleJoueur(prenom) {
    var s = sansAccents(prenom), ini = '';
    var m = /^(.*\S)\s+([a-z])\.?$/.exec(s);           // « Baptiste A. » : homonymes distingués par l'initiale du nom
    if (m) { s = m[1]; ini = m[2]; }
    return { cle: s.replace(/[^a-z]/g, ''), ini: ini };
  }
  function importPostes(ctx, rows) {
    var joueurs = ctx.db.rows('joueurs').filter(function (j) { return j.actif; }).map(function (j) { var k = cleJoueur(j.prenom); return { j: j, cle: k.cle, ini: k.ini }; });
    var dernier = {}, inconnus = [], ambigus = [];
    (rows || []).forEach(function (r) {
      var cle = cleJoueur(r.prenom).cle, ini = sansAccents(r.nom).replace(/[^a-z]/g, '').charAt(0);
      if (!cle) return;
      var c = joueurs.filter(function (x) { return x.cle === cle; });
      if (c.length > 1) c = c.filter(function (x) { return x.ini && x.ini === ini; });
      var nom = cleanText((r.prenom || '') + ' ' + (r.nom || ''), 60);
      if (!c.length) { if (inconnus.indexOf(nom) < 0) inconnus.push(nom); return; }
      if (c.length > 1) { if (ambigus.indexOf(nom) < 0) ambigus.push(nom); return; }
      dernier[c[0].j.id] = r;
    });
    var importes = 0, gardes = [];
    Object.keys(dernier).forEach(function (jid) {
      var r = dernier[jid], ps = [];
      (r.choix || []).forEach(function (t) { var p = posteDuTexte(t); if (p && ps.indexOf(p) < 0) ps.push(p); });
      if (!ps.length) return;
      var row = missionRow(ctx, jid, 'jeu10'), rep = missionRep(row);
      if (row && row.source === 'appli' && rep.postes.length) { gardes.push(find(ctx.db.rows('joueurs'), jid).prenom); return; }
      var resume = String(r.test || '').replace(/[<>\u0000-\u0009\u000b-\u001f]/g, ' ').slice(0, 1500);
      if (row && rep.postes.join() === ps.slice(0, 3).join() && rep.quizResume === resume) return;   // rien de neuf
      rep.postes = ps.slice(0, 3);
      rep.quizResume = resume;
      saveMission(ctx, jid, 'jeu10', rep, 'formulaire');
      importes++;
    });
    var info = { quand: isoNow(ctx.now), reponses: (rows || []).length, enfants: Object.keys(dernier).length, importes: importes, gardes: gardes, inconnus: inconnus, ambigus: ambigus };
    ctx.db.setProp('importPostes', JSON.stringify(info));
    return info;
  }
  A.importPostes = {
    auth: ['e'],
    run: function (req, ctx) {
      if (!ctx.env.formulairePostes) fail('indispo', 'La reprise du formulaire ne marche que sur le serveur Google.');
      var rows = ctx.env.formulairePostes();
      if (!rows) fail('introuvable', 'Les réponses du formulaire « Choix de postes » ne sont pas dans la feuille de l\'appli.');
      return { info: importPostes(ctx, rows) };
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

  // Classement : le joueur, ses parents et les éducs voient les joueurs affichés (+ le joueur lui-même / les enfants de la famille)
  A.league = {
    auth: ['p', 'f', 'e'],
    run: function (req, ctx) {
      var mine = {}, all = ctx.db.rows('joueurs').filter(function (j) { return j.actif; });
      if (ctx.auth.r === 'p') mine[ctx.auth.id] = true;
      if (ctx.auth.r === 'f') all.forEach(function (j) { if (j.familleId === ctx.auth.id) mine[j.id] = true; });
      var players = all.filter(function (j) { return j.visible || mine[j.id]; });
      var ids = {};
      players.forEach(function (j) { ids[j.id] = true; });
      var recs = ctx.db.rows('records').filter(function (r) { return ids[r.joueurId] && (r.statut === 'ok' || mine[r.joueurId]); });
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
      var seances = db.rows('seances'), records = db.rows('records'), journal = db.rows('journal'), missions = db.rows('missions');
      var fams = db.rows('familles'), terrain = db.rows('terrain');
      var joueurs = db.rows('joueurs').map(function (j) {
        return {
          joueur: pubJoueur(j),
          famille: (find(fams, j.familleId) || {}).nom || '',
          seances: where(seances, 'joueurId', j.id).map(function (s) { return pubSeance(s, false); }),
          records: where(records, 'joueurId', j.id).map(pubRecord),
          journal: where(journal, 'joueurId', j.id).map(pubJournal),
          missions: where(missions, 'joueurId', j.id).map(function (m) { return pubMission(m, false); }),
          terrain: pubTerrain(find(terrain, j.id))
        };
      });
      var imp = null;
      try { imp = JSON.parse(db.getProp('importPostes') || 'null'); } catch (e) { imp = null; }
      return {
        moi: { id: ctx.auth.row.id, nom: ctx.auth.row.nom, admin: !!ctx.auth.row.admin, enfants: Array.isArray(ctx.auth.row.enfants) ? ctx.auth.row.enfants : [] },
        joueurs: joueurs,
        familles: fams.map(function (f) { return { id: f.id, nom: f.nom }; }),
        importPostes: imp
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
  // Compos d'équipes (éducs seulement) : fiche terrain, événements, compos, contre-propositions
  // Règle du groupe : un éduc suffit. La compo publiée est celle du plateau, sauf si un autre éduc
  // fait une contre-proposition et que l'auteur l'accepte. Le jour J, tout éduc peut corriger.
  // ---------------------------------------------------------
  var NIVS = ['A', 'B', 'C'];
  var POSTES_ID = MISSIONS.jeu10.postes;
  function pubTerrain(t) {
    if (!t) return null;
    return { niveau: t.niveau || '', passerelle: t.passerelle || '', plaquage: Number(t.plaquage) || 0, postesOk: Array.isArray(t.postesOk) ? t.postesOk : [], spondId: t.spondId || '', note: t.note || '', parQui: t.parQui || '', maj: t.maj || '' };
  }
  function voisins(a, b) { return NIVS.indexOf(a) >= 0 && NIVS.indexOf(b) >= 0 && Math.abs(NIVS.indexOf(a) - NIVS.indexOf(b)) === 1; }
  function terrainRow(ctx, joueurId, patch) {
    var row = find(ctx.db.rows('terrain'), joueurId);
    if (row) ctx.db.update('terrain', joueurId, patch);
    else {
      var o = { id: joueurId, niveau: '', passerelle: '', plaquage: 0, postesOk: [], spondId: '', note: '', parQui: '', maj: '' };
      for (var k in patch) o[k] = patch[k];
      ctx.db.insert('terrain', o);
    }
  }
  A.setTerrain = {
    auth: ['e'],
    run: function (req, ctx) {
      var lignes = Array.isArray(req.lignes) ? req.lignes.slice(0, 120) : [];
      var joueurs = ctx.db.rows('joueurs'), out = {}, qui = ctx.auth.row.nom, now = isoNow(ctx.now);
      lignes.forEach(function (l) {
        if (!l || typeof l !== 'object') return;
        var j = find(joueurs, String(l.joueurId || ''));
        if (!j) return;
        var cur = pubTerrain(find(ctx.db.rows('terrain'), j.id)) || { niveau: '', passerelle: '', plaquage: 0, postesOk: [], spondId: '', note: '' };
        var patch = {};
        if (l.niveau !== undefined) patch.niveau = NIVS.indexOf(String(l.niveau)) >= 0 ? String(l.niveau) : '';
        if (l.passerelle !== undefined) patch.passerelle = NIVS.indexOf(String(l.passerelle)) >= 0 ? String(l.passerelle) : '';
        var niv = patch.niveau !== undefined ? patch.niveau : cur.niveau, pas = patch.passerelle !== undefined ? patch.passerelle : cur.passerelle;
        if (pas && !voisins(niv, pas)) patch.passerelle = '';                         // une passerelle va vers le niveau voisin
        if (l.plaquage !== undefined) { var p = Math.round(Number(l.plaquage)); patch.plaquage = p >= 0 && p <= 5 ? p : 0; }
        if (l.postesOk !== undefined) {
          if (!Array.isArray(l.postesOk)) fail('invalide', 'Postes invalides.');
          var ps = []; l.postesOk.forEach(function (x) { x = String(x); if (POSTES_ID.indexOf(x) >= 0 && ps.indexOf(x) < 0) ps.push(x); });
          patch.postesOk = ps;
        }
        if (l.note !== undefined) patch.note = cleanText(l.note, 200);
        if (l.spondId !== undefined) patch.spondId = cleanText(l.spondId, 64);
        if (!Object.keys(patch).length) return;
        patch.parQui = qui; patch.maj = now;
        terrainRow(ctx, j.id, patch);
        out[j.id] = pubTerrain(find(ctx.db.rows('terrain'), j.id));
      });
      return { terrain: out };
    }
  };

  function pubEvt(e) {
    return { id: e.id, source: e.source, titre: e.titre, sorte: e.sorte, debut: e.debut, fin: e.fin, lieu: e.lieu, presents: e.presents || [], absents: e.absents || [],
      sansReponse: e.sansReponse || [], ajouts: e.ajouts || [], retraits: e.retraits || [], inconnus: e.inconnus || [], annule: !!e.annule, parQui: e.parQui || '', maj: e.maj };
  }
  function pubCompo(c) {
    return { id: c.id, evenementId: c.evenementId, sorte: c.sorte, version: Number(c.version) || 1, auteur: c.auteur, auteurNom: c.auteurNom, statut: c.statut, reglages: c.reglages || {},
      equipes: c.equipes || [], banc: c.banc || [], raisons: c.raisons || {}, justification: c.justification || '', historique: c.historique || [], cree: c.cree, maj: c.maj,
      versions: Array.isArray(c.versions) ? c.versions : [], votes: c.votes && typeof c.votes === 'object' ? c.votes : {}, choix: c.choix === '' || c.choix === undefined ? -1 : Number(c.choix) };
  }
  function pubAvis(a) {
    return { id: a.id, compoId: a.compoId, version: Number(a.version) || 1, auteur: a.auteur, auteurNom: a.auteurNom, equipes: a.equipes || [], banc: a.banc || [],
      changements: a.changements || [], justification: a.justification || '', statut: a.statut, reponse: a.reponse || '', parQui: a.parQui || '', cree: a.cree, maj: a.maj };
  }
  function sorteEvt(titre) {
    var t = sansAccents(titre);
    if (/plateau|tournoi|festival|rassemblement/.test(t)) return 'plateau';
    if (/entrainement|seance/.test(t)) return 'entrainement';
    return 'autre';
  }
  A.compos = {
    auth: ['e'],
    run: function (req, ctx) {
      var depuis = isoDate(ctx.now - 240 * DAY);
      var evts = ctx.db.rows('evenements').filter(function (e) { return String(e.debut).slice(0, 10) >= depuis; }).map(pubEvt);
      evts.sort(function (a, b) { return a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0; });
      var ids = {}; evts.forEach(function (e) { ids[e.id] = true; });
      var compos = ctx.db.rows('compos').filter(function (c) { return ids[c.evenementId] && c.statut !== 'retiree'; }).map(pubCompo);
      var cids = {}; compos.forEach(function (c) { cids[c.id] = true; });
      var avis = ctx.db.rows('avis').filter(function (a) { return cids[a.compoId]; }).map(pubAvis);
      var sp = null, mb = []; try { sp = JSON.parse(ctx.db.getProp('spondSync') || 'null'); mb = JSON.parse(ctx.db.getProp('spondMembres') || '[]'); } catch (e) { sp = null; mb = []; }
      return {
        evenements: evts, compos: compos, avis: avis,
        spond: { branche: !!(ctx.env.spondInfo && ctx.env.spondInfo().branche), derniere: sp, membres: Array.isArray(mb) ? mb : [] },
        educs: ctx.db.rows('educs').filter(function (x) { return x.actif; }).map(function (x) { return { id: x.id, nom: x.nom }; }),
        moi: { id: ctx.auth.row.id, nom: ctx.auth.row.nom, admin: !!ctx.auth.row.admin }
      };
    }
  };
  function idList(ctx, l, max) {
    var joueurs = ctx.db.rows('joueurs'), out = [];
    (Array.isArray(l) ? l : []).slice(0, max || 80).forEach(function (id) { id = String(id); if (find(joueurs, id) && out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  function dateEvt(s) {
    s = String(s || '');
    if (validDate(s.slice(0, 10)) && (s.length === 10 || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))) return s.length === 10 ? s + 'T09:00:00.000Z' : s.slice(0, 16) + ':00.000Z';
    return null;
  }
  // ajouter un événement à la main, corriger les présents (ajouts / retraits), supprimer un événement ajouté à la main
  A.setEvenement = {
    auth: ['e'],
    run: function (req, ctx) {
      var now = isoNow(ctx.now), qui = ctx.auth.row.nom;
      if (!req.id) {
        var titre = cleanText(req.titre, 80), debut = dateEvt(req.debut);
        if (!titre) fail('invalide', 'Il faut un titre.');
        if (!debut) fail('invalide', 'Date invalide.');
        var row = { id: genId(ctx.env), source: 'manuel', titre: titre, sorte: ['plateau', 'entrainement', 'autre'].indexOf(req.sorte) >= 0 ? req.sorte : sorteEvt(titre), debut: debut, fin: '',
          lieu: cleanText(req.lieu, 80), presents: idList(ctx, req.presents), absents: [], sansReponse: [], ajouts: [], retraits: [], inconnus: [], annule: false, parQui: qui, maj: now };
        ctx.db.insert('evenements', row);
        return { evenement: pubEvt(row) };
      }
      var e = find(ctx.db.rows('evenements'), String(req.id));
      if (!e) fail('introuvable', 'Événement introuvable.');
      if (req.supprimer) {
        if (e.source !== 'manuel') fail('interdit', 'Un événement Spond se supprime dans Spond.');
        if (ctx.db.rows('compos').some(function (c) { return c.evenementId === e.id && (c.statut === 'publiee' || c.statut === 'vote'); })) fail('interdit', 'Il y a déjà une compo pour cet événement.');
        ctx.db.remove('evenements', e.id);
        return { supprime: true };
      }
      var patch = { parQui: qui, maj: now };
      // marques = { idJoueur: true (présent) | false (absent) } : appliquées sur l'état actuel (deux éducs peuvent corriger en même temps)
      if (req.marques && typeof req.marques === 'object') {
        var aj = (e.ajouts || []).slice(), re = (e.retraits || []).slice(), pr = (e.presents || []).slice(), ok = idList(ctx, Object.keys(req.marques), 120);
        ok.forEach(function (id) {
          var on = !!req.marques[id];
          aj = aj.filter(function (x) { return x !== id; }); re = re.filter(function (x) { return x !== id; });
          if (e.source === 'manuel') { pr = pr.filter(function (x) { return x !== id; }); if (on) pr.push(id); }
          else if (on && pr.indexOf(id) < 0) aj.push(id);
          else if (!on && pr.indexOf(id) >= 0) re.push(id);
        });
        if (e.source === 'manuel') patch.presents = pr; else { patch.ajouts = aj; patch.retraits = re; }
      }
      if (req.ajouts !== undefined) patch.ajouts = idList(ctx, req.ajouts);
      if (req.retraits !== undefined) patch.retraits = idList(ctx, req.retraits);
      if (req.sorte !== undefined && ['plateau', 'entrainement', 'autre'].indexOf(req.sorte) >= 0) patch.sorte = req.sorte;
      if (e.source === 'manuel') {
        if (req.titre !== undefined) { var t = cleanText(req.titre, 80); if (t) patch.titre = t; }
        if (req.debut !== undefined) { var d = dateEvt(req.debut); if (!d) fail('invalide', 'Date invalide.'); patch.debut = d; }
        if (req.lieu !== undefined) patch.lieu = cleanText(req.lieu, 80);
        if (req.presents !== undefined) patch.presents = idList(ctx, req.presents);
      }
      ctx.db.update('evenements', e.id, patch);
      return { evenement: pubEvt(find(ctx.db.rows('evenements'), e.id)) };
    }
  };

  // une compo envoyée par le navigateur, nettoyée : équipes A1…C6, chaque joueur actif une seule fois
  function cleanCompo(ctx, req) {
    var actifs = {}; ctx.db.rows('joueurs').forEach(function (j) { if (j.actif) actifs[j.id] = true; });
    var seen = {}, tids = {}, equipes = [];
    (Array.isArray(req.equipes) ? req.equipes : []).slice(0, 18).forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      var niv = NIVS.indexOf(t.niveau) >= 0 ? t.niveau : 'B', id = String(t.id || '');
      if (!/^[ABC][1-9]$/.test(id) || tids[id] || id.charAt(0) !== niv) { var n = 1; while (tids[niv + n]) n++; id = niv + n; }
      tids[id] = true;
      var js = [];
      (Array.isArray(t.joueurs) ? t.joueurs : []).slice(0, 40).forEach(function (x) {
        var jid = String(x && x.id || '');
        if (!actifs[jid] || seen[jid]) return;
        seen[jid] = true;
        js.push({ id: jid, poste: POSTES_ID.indexOf(x.poste) >= 0 ? x.poste : '', n: NIVS.indexOf(x.n) >= 0 ? x.n : '' });
      });
      equipes.push({ id: id, niveau: niv, joueurs: js });
    });
    var banc = [];
    (Array.isArray(req.banc) ? req.banc : []).slice(0, 80).forEach(function (x) { x = String(x); if (actifs[x] && !seen[x]) { seen[x] = true; banc.push(x); } });
    var r = req.reglages || {}, nb = {};
    NIVS.forEach(function (n) { var v = Math.floor(Number(r.nb && r.nb[n]) || 0); nb[n] = v < 0 ? 0 : v > 6 ? 6 : v; });
    var raisons = {};
    if (req.raisons && typeof req.raisons === 'object') for (var k in req.raisons) if (seen[k]) raisons[k] = cleanText(req.raisons[k], 200);
    return { equipes: equipes, banc: banc, reglages: { format: Number(r.format) === 10 ? 10 : 5, nb: nb }, raisons: raisons };
  }
  function placeOf(c) {
    var p = {};
    (c.equipes || []).forEach(function (t) { (t.joueurs || []).forEach(function (j) { p[j.id] = { eq: t.id, poste: j.poste || '' }; }); });
    (c.banc || []).forEach(function (id) { p[id] = { eq: 'banc', poste: '' }; });
    return p;
  }
  function diffCompo(a, b) {
    var pa = placeOf(a), pb = placeOf(b), out = [], seen = {};
    Object.keys(pa).concat(Object.keys(pb)).forEach(function (id) {
      if (seen[id]) return; seen[id] = true;
      var x = pa[id] || { eq: '', poste: '' }, y = pb[id] || { eq: '', poste: '' };
      if (x.eq !== y.eq || x.poste !== y.poste) out.push({ id: id, de: x.eq, vers: y.eq, posteDe: x.poste, poste: y.poste });
    });
    return out;
  }
  function jourJ(ctx, e) { return String(e.debut).slice(0, 10) === isoDate(ctx.now); }
  function compoActive(ctx, evenementId) {
    var l = ctx.db.rows('compos').filter(function (c) { return c.evenementId === evenementId && (c.statut === 'publiee' || c.statut === 'vote'); });
    return l[0] || null;
  }
  function nbEducs(ctx) { return ctx.db.rows('educs').filter(function (x) { return x.actif; }).length || 1; }
  function compteVotes(c) {
    var n = [0, 0], v = c.votes || {};
    Object.keys(v).forEach(function (k) { if (v[k] === 0 || v[k] === 1) n[v[k]]++; });
    return n;
  }
  // la version choisie devient la compo du plateau
  function adopter(ctx, c, i, note) {
    var V = c.versions[i], now = isoNow(ctx.now), v = (Number(c.version) || 1) + 1;
    var hist = (c.historique || []).concat([{ v: v, par: ctx.auth.row.nom, quand: now, note: note }]).slice(-30);
    ctx.db.update('compos', c.id, { statut: 'publiee', choix: i, equipes: V.equipes, banc: V.banc, raisons: V.raisons, reglages: V.reglages, version: v, historique: hist, maj: now });
    return find(ctx.db.rows('compos'), c.id);
  }
  // publier une compo (1re fois) ou la modifier (son auteur ; tout éduc le jour J, « dernière minute »)
  A.saveCompo = {
    auth: ['e'],
    run: function (req, ctx) {
      var e = find(ctx.db.rows('evenements'), String(req.evenementId || ''));
      if (!e) fail('introuvable', 'Événement introuvable.');
      var me = ctx.auth.row, now = isoNow(ctx.now);
      var cur = compoActive(ctx, e.id), note = cleanText(req.note || req.justification || '', 600);
      // 2 versions proposées au vote des éducs : la majorité l'emporte, l'auteur départage
      if (Array.isArray(req.versions)) {
        if (cur) fail('conflit', cur.auteurNom + ' a publié une compo entre-temps : la voici.');
        var vs = req.versions.slice(0, 2).map(function (v) { return cleanCompo(ctx, v || {}); });
        if (vs.length !== 2 || !vs[0].equipes.length || !vs[1].equipes.length) fail('invalide', 'Il faut deux versions, chacune avec au moins une équipe.');
        var votes = {};
        if (req.monVote === 0 || req.monVote === 1) votes[me.id] = req.monVote;
        var vrow = { id: genId(ctx.env), evenementId: e.id, sorte: e.sorte || 'plateau', version: 1, auteur: me.id, auteurNom: me.nom, statut: 'vote', reglages: vs[0].reglages,
          equipes: vs[0].equipes, banc: vs[0].banc, raisons: vs[0].raisons, justification: cleanText(req.justification, 600),
          historique: [{ v: 1, par: me.nom, quand: now, note: '2 versions proposées au vote' }], cree: now, maj: now, versions: vs, votes: votes, choix: -1 };
        ctx.db.insert('compos', vrow);
        return { compo: pubCompo(vrow) };
      }
      var c = cleanCompo(ctx, req);
      if (!c.equipes.length) fail('invalide', 'Il faut au moins une équipe.');
      if (!cur) {
        var row = { id: genId(ctx.env), evenementId: e.id, sorte: e.sorte || 'plateau', version: 1, auteur: me.id, auteurNom: me.nom, statut: 'publiee', reglages: c.reglages,
          equipes: c.equipes, banc: c.banc, raisons: c.raisons, justification: cleanText(req.justification, 600), historique: [{ v: 1, par: me.nom, quand: now, note: 'Compo publiée' }], cree: now, maj: now };
        ctx.db.insert('compos', row);
        return { compo: pubCompo(row) };
      }
      // on modifie toujours une version précise : sinon on écraserait le travail d'un autre éduc
      if (req.compoId !== cur.id) fail('conflit', cur.auteurNom + ' a publié une compo entre-temps : la voici. Faites une contre-proposition si vous n\'êtes pas d\'accord.');
      if (Number(req.version) !== Number(cur.version)) fail('conflit', 'La compo a changé entre-temps (version ' + cur.version + ') : la voici à jour.');
      if (cur.statut === 'vote') fail('interdit', 'Le vote des éducs est en cours : votez, ou attendez le résultat.');
      var auteur = cur.auteur === me.id, dm = jourJ(ctx, e);
      if (!auteur && !dm) fail('interdit', 'C\'est la compo de ' + cur.auteurNom + ' : faites plutôt une contre-proposition.');
      var ch = diffCompo(actifsSeuls(ctx, cur), c);
      if (!ch.length && JSON.stringify(cur.reglages) === JSON.stringify(c.reglages)) return { compo: pubCompo(cur) };
      var v = (Number(cur.version) || 1) + 1;
      var hist = (cur.historique || []).concat([{ v: v, par: me.nom, quand: now, note: note || (auteur ? 'Modifiée' : 'Dernière minute'), n: ch.length, dm: !auteur }]).slice(-30);
      var patch = { equipes: c.equipes, banc: c.banc, reglages: c.reglages, raisons: c.raisons, version: v, historique: hist, maj: now };
      if (auteur && req.justification !== undefined) patch.justification = cleanText(req.justification, 600);
      ctx.db.update('compos', cur.id, patch);
      return { compo: pubCompo(find(ctx.db.rows('compos'), cur.id)) };
    }
  };
  // retirer sa compo (l'auteur, ou l'admin) : on repart de zéro
  A.retirerCompo = {
    auth: ['e'],
    run: function (req, ctx) {
      var c = find(ctx.db.rows('compos'), String(req.compoId || ''));
      if (!c || (c.statut !== 'publiee' && c.statut !== 'vote')) fail('introuvable', 'Compo introuvable.');
      if (c.auteur !== ctx.auth.id && !ctx.auth.row.admin) fail('interdit', 'Seul son auteur peut retirer cette compo.');
      ctx.db.update('compos', c.id, { statut: 'retiree', maj: isoNow(ctx.now) });
      ctx.db.rows('avis').filter(function (a) { return a.compoId === c.id && a.statut === 'attente'; }).forEach(function (a) { ctx.db.update('avis', a.id, { statut: 'retiree', maj: isoNow(ctx.now) }); });
      return {};
    }
  };
  // voter pour une des 2 versions (on peut changer d'avis) ; la majorité des éducs actifs l'emporte tout de suite
  A.voteCompo = {
    auth: ['e'],
    run: function (req, ctx) {
      var c = find(ctx.db.rows('compos'), String(req.compoId || ''));
      if (!c || c.statut !== 'vote') fail('introuvable', 'Ce vote est terminé.');
      var i = Number(req.choix);
      if (i !== 0 && i !== 1) fail('invalide', 'Choisissez la version 1 ou la version 2.');
      var votes = c.votes && typeof c.votes === 'object' ? clone(c.votes) : {};
      votes[ctx.auth.id] = i;
      ctx.db.update('compos', c.id, { votes: votes, maj: isoNow(ctx.now) });
      c = find(ctx.db.rows('compos'), c.id);
      var n = compteVotes(c), total = nbEducs(ctx);
      if (n[i] > total / 2) c = adopter(ctx, c, i, 'Version ' + (i + 1) + ' choisie par le vote (' + n[i] + ' voix sur ' + total + ' éducs)');
      return { compo: pubCompo(c) };
    }
  };
  // clore le vote (l'auteur, l'admin, ou tout éduc le jour J) : la version qui a le plus de voix ; à égalité, celle que choisit l'auteur
  A.cloreVote = {
    auth: ['e'],
    run: function (req, ctx) {
      var c = find(ctx.db.rows('compos'), String(req.compoId || ''));
      if (!c || c.statut !== 'vote') fail('introuvable', 'Ce vote est terminé.');
      var e = find(ctx.db.rows('evenements'), c.evenementId);
      if (c.auteur !== ctx.auth.id && !ctx.auth.row.admin && !(e && jourJ(ctx, e))) fail('interdit', 'C\'est à ' + c.auteurNom + ' de clore le vote.');
      var n = compteVotes(c), i;
      if (n[0] !== n[1]) i = n[0] > n[1] ? 0 : 1;
      else {
        i = Number(req.choix);
        if (i !== 0 && i !== 1) fail('egalite', 'Égalité (' + n[0] + ' voix partout) : choisissez la version à garder.');
      }
      c = adopter(ctx, c, i, 'Vote clos : version ' + (i + 1) + ' (' + n[0] + ' voix pour la 1, ' + n[1] + ' pour la 2)' + (n[0] === n[1] ? ', départagée par ' + ctx.auth.row.nom : ''));
      return { compo: pubCompo(c) };
    }
  };
  // contre-proposition d'un autre éduc : déplacements + justification (obligatoire)
  A.contreProposition = {
    auth: ['e'],
    run: function (req, ctx) {
      var cur = find(ctx.db.rows('compos'), String(req.compoId || ''));
      if (!cur || cur.statut !== 'publiee') fail('introuvable', 'Compo introuvable.');
      if (req.version !== undefined && Number(req.version) !== Number(cur.version)) fail('conflit', 'La compo a changé entre-temps (version ' + cur.version + ') : la voici à jour, refaites vos changements dessus.');
      var just = cleanText(req.justification, 600);
      if (just.length < 3) fail('invalide', 'Expliquez en quelques mots pourquoi.');
      var c = cleanCompo(ctx, { equipes: req.equipes, banc: req.banc, reglages: cur.reglages });
      var ch = diffCompo(actifsSeuls(ctx, cur), c);
      if (!ch.length) fail('invalide', 'Aucun changement par rapport à la compo.');
      var me = ctx.auth.row, now = isoNow(ctx.now);
      var row = { id: genId(ctx.env), compoId: cur.id, version: Number(cur.version) || 1, auteur: me.id, auteurNom: me.nom, equipes: c.equipes, banc: c.banc, changements: ch,
        justification: just, statut: 'attente', reponse: '', parQui: '', cree: now, maj: now };
      ctx.db.insert('avis', row);
      return { avis: pubAvis(row) };
    }
  };
  // l'auteur de la compo (ou l'admin) accepte ou refuse ; l'auteur de la contre-proposition peut la retirer
  A.repondreAvis = {
    auth: ['e'],
    run: function (req, ctx) {
      var a = find(ctx.db.rows('avis'), String(req.avisId || ''));
      if (!a || a.statut !== 'attente') fail('introuvable', 'Contre-proposition introuvable ou déjà traitée.');
      var cur = find(ctx.db.rows('compos'), a.compoId), me = ctx.auth.row, now = isoNow(ctx.now);
      if (req.retirer) {
        if (a.auteur !== me.id) fail('interdit', 'Seul son auteur peut la retirer.');
        ctx.db.update('avis', a.id, { statut: 'retiree', maj: now });
        return { avis: pubAvis(find(ctx.db.rows('avis'), a.id)) };
      }
      if (!cur || cur.statut !== 'publiee') fail('introuvable', 'Compo introuvable.');
      if (cur.auteur !== me.id && !me.admin) fail('interdit', 'C\'est à ' + cur.auteurNom + ' de répondre.');
      var rep = cleanText(req.reponse, 300);
      if (req.accepte) {
        var proposee = { equipes: a.equipes, banc: a.banc };
        // la compo a changé depuis : on rejoue seulement les déplacements de la contre-proposition
        if (Number(a.version) !== Number(cur.version)) proposee = rejouer(ctx, cur, a.changements);
        var v = (Number(cur.version) || 1) + 1;
        var hist = (cur.historique || []).concat([{ v: v, par: me.nom, quand: now, note: 'Contre-proposition de ' + a.auteurNom + ' acceptée', n: (a.changements || []).length }]).slice(-30);
        ctx.db.update('compos', cur.id, { equipes: proposee.equipes, banc: proposee.banc, version: v, historique: hist, maj: now });
        ctx.db.update('avis', a.id, { statut: 'acceptee', reponse: rep, parQui: me.nom, maj: now });
      } else {
        ctx.db.update('avis', a.id, { statut: 'refusee', reponse: rep, parQui: me.nom, maj: now });
      }
      return { avis: pubAvis(find(ctx.db.rows('avis'), a.id)), compo: pubCompo(find(ctx.db.rows('compos'), cur.id)) };
    }
  };
  // les joueurs encore actifs d'une compo (un joueur désactivé depuis ne compte pas comme un changement)
  function actifsSeuls(ctx, c) {
    var actifs = {}; ctx.db.rows('joueurs').forEach(function (j) { if (j.actif) actifs[j.id] = true; });
    return { equipes: (c.equipes || []).map(function (t) { return { id: t.id, niveau: t.niveau, joueurs: (t.joueurs || []).filter(function (j) { return actifs[j.id]; }) }; }),
      banc: (c.banc || []).filter(function (id) { return actifs[id]; }) };
  }
  function rejouer(ctx, cur, changements) {
    var o = clone({ equipes: cur.equipes || [], banc: cur.banc || [] });
    (changements || []).forEach(function (m) {
      var entry = null;
      o.equipes.forEach(function (t) { t.joueurs = t.joueurs.filter(function (j) { if (j.id === m.id) { entry = j; return false; } return true; }); });
      o.banc = o.banc.filter(function (id) { return id !== m.id; });
      if (!m.vers) return;                                         // retiré de la compo
      var tr = find(ctx.db.rows('terrain'), m.id);
      entry = entry || { id: m.id, poste: '', n: (tr && tr.niveau) || '' };
      entry.poste = m.poste || '';
      if (m.vers === 'banc') o.banc.push(m.id);
      else { var t = o.equipes.filter(function (x) { return x.id === m.vers; })[0]; if (t) t.joueurs.push(entry); else o.banc.push(m.id); }
    });
    return o;
  }

  // ---------- Spond : événements du groupe M12 et réponses (lecture seule) ----------
  // data = { membres: [{ id, prenom, nom }], evenements: [{ id, titre, debut, fin, lieu, annule, acceptes, refuses, sansReponse, attente }] }
  // Les membres sont reliés aux joueurs par le prénom (et l'initiale du nom pour les homonymes) ;
  // un lien posé à la main dans la fiche terrain (spondId) l'emporte.
  function syncSpond(ctx, data) {
    var joueurs = ctx.db.rows('joueurs').filter(function (j) { return j.actif; });
    var terrain = ctx.db.rows('terrain'), now = isoNow(ctx.now);
    var parSpond = {}, lies = {};
    terrain.forEach(function (t) { if (t.spondId) { parSpond[t.spondId] = t.id; lies[t.id] = t.spondId; } });
    var cles = joueurs.map(function (j) { var k = cleJoueur(j.prenom); return { j: j, cle: k.cle, ini: k.ini }; });
    var nouveaux = 0, membres = {}, liste = [];
    function cleM(m) { var k = cleJoueur(m.prenom); return { cle: k.cle, ini: sansAccents(m.nom).replace(/[^a-z]/g, '').charAt(0) || k.ini }; }
    var parCle = {};
    (data.membres || []).forEach(function (m) { var k = cleM(m); (parCle[k.cle] = parCle[k.cle] || []).push(k.ini); });
    (data.membres || []).forEach(function (m) {
      var mid = String(m.id || ''); if (!mid) return;
      membres[mid] = m;
      var k = cleM(m);
      var iniNom = sansAccents(m.nom).replace(/[^a-z]/g, '').charAt(0);
      liste.push({ id: mid, nom: cleanText(String(m.prenom || '').replace(/\s+([A-Za-z])\.?$/, ' $1.') + (iniNom ? ' ' + iniNom.toUpperCase() + '.' : ''), 40) });
      if (parSpond[mid]) return;
      var cle = k.cle, ini = k.ini;
      var c = cles.filter(function (x) { return x.cle === cle; });
      if (c.length > 1) c = c.filter(function (x) { return x.ini && x.ini === ini; });
      if (c.length !== 1 || lies[c[0].j.id]) return;
      // plusieurs membres Spond avec ce prénom : il faut que l'initiale du nom les départage
      var memes = parCle[cle] || [];
      if (memes.length > 1 && (!c[0].ini || memes.filter(function (x) { return x === c[0].ini; }).length !== 1)) return;
      parSpond[mid] = c[0].j.id; lies[c[0].j.id] = mid; nouveaux++;
      terrainRow(ctx, c[0].j.id, { spondId: mid, maj: now });
    });
    function map(l, inconnus) {
      var out = [];
      (l || []).forEach(function (mid) {
        var jid = parSpond[String(mid)];
        if (jid) { if (out.indexOf(jid) < 0) out.push(jid); }
        else if (inconnus) { var m = membres[String(mid)]; if (m) inconnus.push(cleanText((m.prenom || '') + ' ' + String(m.nom || '').charAt(0) + '.', 40)); }
      });
      return out;
    }
    liste.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    ctx.db.setProp('spondMembres', JSON.stringify(liste.slice(0, 120)));
    var evts = 0, vus = {};
    (data.evenements || []).forEach(function (ev) {
      var id = 'sp-' + String(ev.id || '').slice(0, 60);
      if (id === 'sp-') return;
      var inc = [];
      var row = { titre: cleanText(ev.titre, 80) || 'Événement', debut: dateEvt(ev.debut) || String(ev.debut || ''), fin: String(ev.fin || ''), lieu: cleanText(ev.lieu, 80),
        presents: map(ev.acceptes, inc), absents: map(ev.refuses), sansReponse: map((ev.sansReponse || []).concat(ev.attente || [])), inconnus: inc.slice(0, 40), annule: !!ev.annule, maj: now };
      vus[id] = true;
      var cur = find(ctx.db.rows('evenements'), id);
      if (cur) ctx.db.update('evenements', id, row);
      else { row.id = id; row.source = 'spond'; row.sorte = sorteEvt(row.titre); row.ajouts = []; row.retraits = []; row.parQui = 'Spond'; ctx.db.insert('evenements', row); }
      evts++;
    });
    // un événement Spond de la période lue qui n'y est plus a été supprimé dans Spond
    if (Array.isArray(data.evenements)) {
      var dmin = isoDate(ctx.now - 29 * DAY), dmax = isoDate(ctx.now + 59 * DAY);
      ctx.db.rows('evenements').filter(function (e) { var d = String(e.debut).slice(0, 10); return e.source === 'spond' && !vus[e.id] && !e.annule && d >= dmin && d <= dmax; })
        .forEach(function (e) { ctx.db.update('evenements', e.id, { annule: true, maj: now }); });
    }
    var nonLies = joueurs.filter(function (j) { return !lies[j.id]; }).map(function (j) { return j.prenom; });
    var info = { quand: now, evenements: evts, membres: Object.keys(membres).length, nouveauxLiens: nouveaux, joueursSansLien: nonLies };
    ctx.db.setProp('spondSync', JSON.stringify(info));
    return info;
  }
  A.syncSpond = {
    auth: ['e'],
    run: function (req, ctx) {
      if (!ctx.env.spondFetch) fail('indispo', 'La synchro Spond ne marche que sur le serveur Google.');
      var data;
      try { data = ctx.env.spondFetch(); } catch (e) { fail('spond', 'Spond ne répond pas : ' + (e && e.message ? e.message : e)); }
      return { info: syncSpond(ctx, data) };
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
    _sha256: sha256, _hmac: hmac, _hashPin: hashPin, _hashTemp: hashTemp, _hashAdulte: hashAdulte, _pinFaible: pinFaible, _clone: clone,
    _posteDuTexte: posteDuTexte, _sansAccents: sansAccents,
    importPostesDepuis: function (db, env, rows) { return importPostes({ db: db, env: env, now: env.now() }, rows); },
    syncSpondDepuis: function (db, env, data) { return syncSpond({ db: db, env: env, now: env.now() }, data || {}); },
    _diffCompo: diffCompo
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Core;
