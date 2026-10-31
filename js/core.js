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
    familles: [['id', 's'], ['nom', 's'], ['codeHash', 's'], ['codeV', 'n'], ['cree', 's'], ['pinHash', 's'], ['tempHash', 's'], ['tempExp', 'n'], ['mustChange', 'b'], ['fails', 'n'], ['lockUntil', 'n']],
    educs: [['id', 's'], ['nom', 's'], ['codeHash', 's'], ['codeV', 'n'], ['admin', 'b'], ['actif', 'b'], ['cree', 's'], ['enfants', 'j'], ['pinHash', 's'], ['tempHash', 's'], ['tempExp', 'n'], ['mustChange', 'b'], ['fails', 'n'], ['lockUntil', 'n']],
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
      ['sansReponse', 'j'], ['ajouts', 'j'], ['retraits', 'j'], ['inconnus', 'j'], ['annule', 'b'], ['parQui', 's'], ['maj', 's'],
      // catégorie Spond (nom du sous-groupe), quand l'appli suit plusieurs catégories
      ['categorie', 's']],
    // la compo d'un événement (une seule active par partie) ; historique = les versions successives
    // partie : '' = la compo d'un plateau ; 'ateliers' ou 'matchs' = les groupes d'un entraînement (d'abord les ateliers, puis les matchs)
    compos: [['id', 's'], ['evenementId', 's'], ['sorte', 's'], ['version', 'n'], ['auteur', 's'], ['auteurNom', 's'], ['statut', 's'], ['reglages', 'j'],
      ['equipes', 'j'], ['banc', 'j'], ['raisons', 'j'], ['justification', 's'], ['historique', 'j'], ['cree', 's'], ['maj', 's'],
      // compo proposée en 2 versions au vote des éducs : statut « vote », versions, votes { idÉduc: 0 | 1 }, choix = la version retenue
      ['versions', 'j'], ['votes', 'j'], ['choix', 'n'], ['partie', 's']],
    // contre-propositions d'un autre éduc sur une compo publiée
    avis: [['id', 's'], ['compoId', 's'], ['version', 'n'], ['auteur', 's'], ['auteurNom', 's'], ['equipes', 'j'], ['banc', 'j'], ['changements', 'j'],
      ['justification', 's'], ['statut', 's'], ['reponse', 's'], ['parQui', 's'], ['cree', 's'], ['maj', 's']],
    // ---- Skills, encouragements et missions des éducs ----
    // une étoile Skills validée par un éduc (domaine + étoile) ; retiree = validée par erreur (gardée pour l'historique)
    etoiles: [['id', 's'], ['joueurId', 's'], ['domaine', 's'], ['etoile', 's'], ['parQui', 's'], ['parNom', 's'], ['date', 's'], ['occasion', 's'],
      ['evenementId', 's'], ['essais', 'j'], ['retiree', 'b'], ['cree', 's'], ['maj', 's'],
      // (25/10, Skills v2) l'étoile « brille » : vue au plateau (date, par qui, où) ; vide = gagnée à l'entraînement seulement
      ['brille', 's'], ['brilleParQui', 's'], ['brilleParNom', 's'], ['brilleOccasion', 's'], ['brilleEvenementId', 's']],
    // (25/10, Skills v2) la demande d'un enfant : « valide-moi cette étoile » (sorte gagner) ou « je l'ai fait au plateau » (briller)
    // statut : attente, oui (étoile donnée ou allumée), pasvu (message neutre), retiree (l'enfant l'a annulée) ; une seule en attente par enfant
    demandes: [['id', 's'], ['joueurId', 's'], ['domaine', 's'], ['etoile', 's'], ['sorte', 's'], ['evenementId', 's'], ['occasion', 's'], ['statut', 's'],
      ['parQui', 's'], ['parNom', 's'], ['reponseLe', 's'], ['cree', 's'], ['maj', 's']],
    // un « +1 » (ou un mot) d'un éduc à un enfant : sur sa mission perso (missionId) ou sur autre chose (mot obligatoire)
    encouragements: [['id', 's'], ['joueurId', 's'], ['missionId', 's'], ['domaine', 's'], ['etoile', 's'], ['mot', 's'], ['parQui', 's'], ['parNom', 's'],
      ['date', 's'], ['occasion', 's'], ['evenementId', 's'], ['retire', 'b'], ['cree', 's']],
    // (v36) un « bravo » d'un éduc à un enfant pour une séance de prépa faite : un par éduc et par séance, un mot facultatif
    // (ajouté après coup) ; retire = donné par erreur. Pas d'XP : c'est un encouragement, pas une récompense.
    bravos: [['id', 's'], ['joueurId', 's'], ['seanceId', 's'], ['mot', 's'], ['parQui', 's'], ['parNom', 's'], ['retire', 'b'], ['cree', 's'], ['maj', 's']],
    // les missions créées par les éducs : pour le groupe (video : une vidéo + des questions ; qcm) ou individuelles
    // (etoile : décrocher une étoile précise, pour un enfant). statut : active, faite (étoile validée), retiree
    defmissions: [['id', 's'], ['sorte', 's'], ['titre', 's'], ['texte', 's'], ['video', 's'], ['questions', 'j'], ['joueurId', 's'], ['domaine', 's'],
      ['etoile', 's'], ['xp', 'n'], ['debut', 's'], ['fin', 's'], ['statut', 's'], ['parQui', 's'], ['parNom', 's'], ['faiteLe', 's'], ['cree', 's'], ['maj', 's'],
      // (25/10, mission principale) 1 à 3 étoiles d'une même carte ; vide = l'ancienne mission d'une étoile (colonne etoile)
      ['etoiles', 'j']],
    // (v34) alertes sur le téléphone : un appareil abonné pour un profil (role p, f ou e ; qui = son id), les sortes qu'il veut recevoir.
    // jeton = l'adresse Firebase Cloud Messaging de l'appareil (jamais renvoyée au site)
    push: [['id', 's'], ['role', 's'], ['qui', 's'], ['jeton', 's'], ['cats', 'j'], ['appareil', 's'], ['cree', 's'], ['vu', 's'], ['actif', 'b'], ['v', 's']]
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
  function validDate(s) { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var d = new Date(s + 'T12:00:00Z'); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }
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
  function hashAdulte(sec, code) { return sha256(sec + '|adulte|' + code); }   // anciens codes à 6 chiffres (plus utilisés pour se connecter)
  // codes adultes à 4 chiffres : liés au compte (famille ou éduc), comme les codes des enfants
  function hashPinA(sec, role, id, pin) { return sha256(sec + '|apin|' + role + '|' + id + '|' + pin); }
  function hashTempA(sec, role, id, code) { return sha256(sec + '|atmp|' + role + '|' + id + '|' + code); }

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
    // « Un mot pour les éducs » (Choisis ton poste) : pour l'enfant et les éducs
    if (!sansCopains && r.message) out.message = String(r.message);
    // missions des éducs (vidéo, QCM) : vidéo vue, réponses, score
    if (r.vu) out.vu = true;
    if (Array.isArray(r.ans)) { out.ans = r.ans; out.score = Number(r.score) || 0; out.total = Number(r.total) || 0; }
    if (r.xp !== undefined) out.xp = Number(r.xp) || 0;
    return { id: m.id, joueurId: m.joueurId, mission: m.mission, reponses: out, faite: !!m.faite, date: m.date || '', source: m.source || '', maj: m.maj || m.cree || '' };
  }
  function pubEtoile(e, full) {
    var o = { id: e.id, joueurId: e.joueurId, domaine: e.domaine, etoile: e.etoile, parNom: e.parNom || '', date: e.date || '', occasion: e.occasion || '', cree: e.cree || '',
      brille: e.brille || '', brilleParNom: e.brilleParNom || '', brilleOccasion: e.brilleOccasion || '', maj: e.maj || e.cree || '' };
    if (full) { o.parQui = e.parQui || ''; o.essais = Array.isArray(e.essais) ? e.essais : null; o.brilleParQui = e.brilleParQui || ''; o.evenementId = e.evenementId || ''; }
    return o;
  }
  function pubDemande(x) {
    return { id: x.id, joueurId: x.joueurId, domaine: x.domaine || '', etoile: x.etoile || '', sorte: x.sorte || 'gagner', evenementId: x.evenementId || '', occasion: x.occasion || '',
      statut: x.statut || 'attente', parNom: x.parNom || '', reponseLe: x.reponseLe || '', cree: x.cree || '', maj: x.maj || x.cree || '' };
  }
  function pubEnc(x) {
    return { id: x.id, joueurId: x.joueurId, missionId: x.missionId || '', domaine: x.domaine || '', etoile: x.etoile || '', mot: x.mot || '', parQui: x.parQui || '', parNom: x.parNom || '',
      date: x.date || '', occasion: x.occasion || '', evenementId: x.evenementId || '', cree: x.cree || '' };
  }
  // (v36) un bravo : l'éduc qui l'a donné (parQui) seulement pour les éducs
  function pubBravo(x, full) {
    var o = { id: x.id, joueurId: x.joueurId, seanceId: x.seanceId || '', mot: x.mot || '', parNom: x.parNom || '', cree: x.cree || '', maj: x.maj || x.cree || '' };
    if (full) o.parQui = x.parQui || '';
    return o;
  }
  function bravosDe(db, joueurId, full) { return where(db.rows('bravos'), 'joueurId', joueurId).filter(function (x) { return !x.retire; }).map(function (x) { return pubBravo(x, full); }); }
  function pubDef(m) {
    return { id: m.id, sorte: m.sorte, titre: m.titre || '', texte: m.texte || '', video: m.video || '', questions: Array.isArray(m.questions) ? m.questions : [],
      joueurId: m.joueurId || '', domaine: m.domaine || '', etoile: m.etoile || '', xp: Number(m.xp) || 0, debut: m.debut || '', fin: m.fin || '',
      statut: m.statut || 'active', parQui: m.parQui || '', parNom: m.parNom || '', faiteLe: m.faiteLe || '', cree: m.cree || '',
      etoiles: m.sorte === 'etoile' ? etoilesDe(m) : [] };
  }
  // les étoiles visées par une mission principale (les anciennes n'en ont qu'une, dans la colonne etoile)
  function etoilesDe(m) { return Array.isArray(m.etoiles) && m.etoiles.length ? m.etoiles.filter(function (e) { return typeof e === 'string'; }) : (m.etoile ? [m.etoile] : []); }
  // les missions des éducs qu'un enfant voit : celles du groupe, et sa mission perso
  function defsDe(db, joueurId) {
    return db.rows('defmissions').filter(function (m) {
      if (m.statut === 'retiree') return false;
      return m.sorte === 'etoile' ? m.joueurId === joueurId : true;
    }).map(pubDef);
  }

  // Les résultats en attente de confirmation : l'enfant, sa famille, et l'éduc qui est son parent (enfant relié à son profil).
  // Les autres éducs ne voient que les résultats confirmés (et combien attendent la famille).
  function mesEnfantsEduc(ctx) { if (!ctx.auth || ctx.auth.r !== 'e') return null; return Array.isArray(ctx.auth.row.enfants) ? ctx.auth.row.enfants : []; }
  function voitAttente(ctx, joueurId) { var m = mesEnfantsEduc(ctx); return !m || m.indexOf(joueurId) >= 0; }
  function recordsVus(ctx, joueurId, recs) { return voitAttente(ctx, joueurId) ? recs : recs.filter(function (r) { return r.statut !== 'attente'; }); }
  function nbAttente(ctx, joueurId, recs) { return voitAttente(ctx, joueurId) ? 0 : recs.filter(function (r) { return r.statut === 'attente'; }).length; }
  function dossier(ctx, joueur, full) {
    var db = ctx.db, parent = !!(ctx.auth && ctx.auth.r === 'f'), recs = where(db.rows('records'), 'joueurId', joueur.id);
    return {
      joueur: pubJoueur(joueur),
      seances: where(db.rows('seances'), 'joueurId', joueur.id).map(function (s) { return pubSeance(s, full); }),
      records: recordsVus(ctx, joueur.id, recs).map(pubRecord), enAttente: nbAttente(ctx, joueur.id, recs),
      journal: where(db.rows('journal'), 'joueurId', joueur.id).map(pubJournal),
      missions: where(db.rows('missions'), 'joueurId', joueur.id).map(function (m) { return pubMission(m, parent); }),
      etoiles: where(db.rows('etoiles'), 'joueurId', joueur.id).filter(function (e) { return !e.retiree; }).map(function (e) { return pubEtoile(e, ctx.auth && ctx.auth.r === 'e'); }),
      encouragements: where(db.rows('encouragements'), 'joueurId', joueur.id).filter(function (x) { return !x.retire; }).map(pubEnc),
      bravos: bravosDe(db, joueur.id, !!(ctx.auth && ctx.auth.r === 'e')),
      defmissions: defsDe(db, joueur.id),
      demandes: where(db.rows('demandes'), 'joueurId', joueur.id).filter(function (x) { return x.statut !== 'retiree'; }).map(pubDemande)
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
  // Code provisoire d'un adulte (4 chiffres, valable 30 jours) : à la 1re connexion, il choisit le sien.
  var TEMP_ADULTE = 30 * DAY;
  function adultTemp(ctx, role, id) {
    var code = genDigits(ctx.env, 4);
    return { code: code, patch: { tempHash: hashTempA(ctx.secret, role, id, code), tempExp: ctx.now + TEMP_ADULTE, mustChange: true, fails: 0, lockUntil: 0 } };
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

  // (25/10) un parent ouvre l'espace de son enfant sans le code de l'enfant (il est déjà entré avec le code de la famille) ;
  // un éduc aussi, pour son propre enfant (engrenage › Mon enfant). L'enfant arrive sur sa semaine, ou choisit son code
  // s'il n'en a pas encore.
  A.ouvrirEnfant = {
    auth: ['f', 'e'],
    run: function (req, ctx) {
      var j = find(ctx.db.rows('joueurs'), String(req.joueurId || ''));
      if (!j || !j.actif) fail('introuvable', 'Joueur introuvable.');
      var ok = ctx.auth.r === 'f' ? j.familleId === ctx.auth.id : (mesEnfantsEduc(ctx) || []).indexOf(j.id) >= 0;
      if (!ok) fail('interdit', ctx.auth.r === 'f' ? 'Ce joueur n\'est pas dans votre famille.' : 'Ce n\'est pas votre enfant (engrenage › Mon enfant).');
      // (29/10) le dossier tel que l'enfant le voit (son mot pour les éducs, ses copains) : sinon, en enregistrant, il les effacerait
      var kctx = {}; for (var k in ctx) kctx[k] = ctx[k];
      kctx.auth = { r: 'p', id: j.id, row: j };
      return { token: makeToken(ctx.secret, 'p', j.id, Number(j.pinV || 0), ctx.now + TOKEN_JOUEUR), joueur: pubJoueur(j), me: j.mustChange ? null : dossier(kctx, j, true) };
    }
  };
  A.setPin = {
    auth: ['p'],
    run: function (req, ctx) {
      var pin = String(req.pin || '');
      checkPinFormat(pin);
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
      copains: Array.isArray(c.copains) ? c.copains.slice() : [], copainsFait: !!c.copainsFait,
      message: typeof c.message === 'string' ? c.message : undefined   // undefined : jamais écrit (pas enregistré)
    };
  }
  // un mot libre de l'enfant : une ou plusieurs lignes, sans balises, 600 caractères au plus
  function cleanMot(s) {
    return String(s === undefined || s === null ? '' : s).replace(/\r\n?/g, '\n').replace(/</g, '‹').replace(/>/g, '›').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ')
      .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 600);
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
      if (req.message !== undefined) rep.message = cleanMot(req.message);
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
  // rows : [{ prenom, nom, choix: [3 textes], test, message }] dans l'ordre d'arrivée ; la dernière réponse d'un enfant compte.
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
    var importes = 0, gardes = [], mots = 0;
    Object.keys(dernier).forEach(function (jid) {
      var r = dernier[jid], ps = [];
      (r.choix || []).forEach(function (t) { var p = posteDuTexte(t); if (p && ps.indexOf(p) < 0) ps.push(p); });
      if (!ps.length) return;
      var row = missionRow(ctx, jid, 'jeu10'), rep = missionRep(row), mot = cleanMot(r.message);
      if (row && row.source === 'appli' && rep.postes.length) {
        // il a refait son choix dans l'appli : on garde ses postes, mais son mot du formulaire est repris s'il n'a jamais
        // écrit (ni effacé) de mot dans l'appli
        if (mot && rep.message === undefined) { rep.message = mot; saveMission(ctx, jid, 'jeu10', rep, 'appli'); mots++; }
        gardes.push(find(ctx.db.rows('joueurs'), jid).prenom); return;
      }
      var resume = String(r.test || '').replace(/[<>\u0000-\u0009\u000b-\u001f]/g, ' ').slice(0, 1500);
      if (row && rep.postes.join() === ps.slice(0, 3).join() && rep.quizResume === resume && (!mot || rep.message === mot)) return;   // rien de neuf
      rep.postes = ps.slice(0, 3);
      rep.quizResume = resume;
      if (mot) { rep.message = mot; mots++; }
      saveMission(ctx, jid, 'jeu10', rep, 'formulaire');
      importes++;
    });
    var info = { quand: isoNow(ctx.now), reponses: (rows || []).length, enfants: Object.keys(dernier).length, importes: importes, mots: mots, gardes: gardes, inconnus: inconnus, ambigus: ambigus };
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
          ctx.nAttente = (ctx.nAttente || 0) + 1;   // (v34) un résultat nouveau à confirmer : il mérite une alerte
        } else {
          var row = { id: genId(ctx.env), joueurId: ctx.auth.id, bilan: bilan, test: String(v.test), valeur: n, extra: extra, statut: 'attente', parQui: '', date: date, cree: isoNow(ctx.now) };
          ctx.db.insert('records', row);
          saved.push(pubRecord(row));
          ctx.nAttente = (ctx.nAttente || 0) + 1;
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
  // les éducs (prénom seulement) : on touche son nom avant de taper son code
  A.educsListe = {
    run: function (req, ctx) {
      var l = ctx.db.rows('educs').filter(function (e) { return e.actif; }).map(function (e) { return { id: e.id, nom: e.nom }; });
      l.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      return { educs: l };
    }
  };
  // Connexion d'un adulte : qui (l'éduc, ou l'enfant pour sa famille) puis son code à 4 chiffres.
  // 5 codes faux : le compte se bloque 10 minutes (comme pour les enfants).
  A.adultLogin = {
    run: function (req, ctx) {
      adultThrottle(ctx);
      var role = req.role === 'e' ? 'e' : req.role === 'f' ? 'f' : '', code = String(req.code || ''), table, row, nomEnfant = '';
      if (!role) fail('invalide', 'Choisissez d\'abord : parent ou éduc.');
      if (!/^\d{4}$/.test(code)) fail('invalide', 'Le code fait 4 chiffres.');
      if (role === 'e') {
        table = 'educs'; row = find(ctx.db.rows('educs'), String(req.educId || ''));
        if (!row || !row.actif) fail('introuvable', 'Éduc introuvable.');
      } else {
        var j = find(ctx.db.rows('joueurs'), String(req.joueurId || ''));
        if (!j || !j.actif) fail('introuvable', 'Enfant introuvable.');
        table = 'familles'; row = find(ctx.db.rows('familles'), j.familleId); nomEnfant = j.prenom;
        if (!row) fail('introuvable', 'Famille introuvable.');
      }
      if (Number(row.lockUntil) > ctx.now) fail('bloque', 'Trop d\'essais. Réessayez dans ' + Math.ceil((row.lockUntil - ctx.now) / 60000) + ' min.', { minutes: Math.ceil((row.lockUntil - ctx.now) / 60000) });
      var ok = false, temp = false;
      if (row.pinHash && row.pinHash === hashPinA(ctx.secret, role, row.id, code)) ok = true;
      else if (row.tempHash && Number(row.tempExp) > ctx.now && row.tempHash === hashTempA(ctx.secret, role, row.id, code)) { ok = true; temp = true; }
      if (!ok) {
        adultThrottle(ctx, true);
        var fails = Number(row.fails || 0) + 1, patch = { fails: fails };
        if (fails >= 5) { patch.fails = 0; patch.lockUntil = ctx.now + 10 * 60000; }
        ctx.db.update(table, row.id, patch);
        if (patch.lockUntil) fail('bloque', 'Trop d\'essais : ce compte est bloqué 10 minutes.', { minutes: 10 });
        fail('code', 'Code incorrect.', { reste: 5 - fails });
      }
      var p = { fails: 0, lockUntil: 0 };
      // code provisoire : il choisit son code… sauf si l'autre parent l'a déjà fait (un seul code par famille)
      if (temp && !row.pinHash) p.mustChange = true;
      ctx.db.update(table, row.id, p);
      row = find(ctx.db.rows(table), row.id);
      return { token: makeToken(ctx.secret, role, row.id, Number(row.codeV || 0), ctx.now + TOKEN_ADULTE), role: role, nom: row.nom, admin: role === 'e' && !!row.admin, mustChange: !!row.mustChange, enfant: nomEnfant, provisoire: temp };
    }
  };
  // L'adulte choisit son code à 4 chiffres (1re connexion, ou pour en changer). Pas de règle « code trop simple ».
  A.setAdultPin = {
    auth: ['e', 'f'],
    run: function (req, ctx) {
      var pin = String(req.pin || '');
      if (!/^\d{4}$/.test(pin)) fail('invalide', 'Le code doit faire 4 chiffres.');
      var role = ctx.auth.r, table = role === 'e' ? 'educs' : 'familles', row = ctx.auth.row;
      // 1er choix : les autres appareils restent connectés (l'autre parent) ; un changement ensuite les déconnecte.
      // Famille : le code provisoire reste valable jusqu'à sa date, pour que l'autre parent puisse entrer avec.
      var patch = { pinHash: hashPinA(ctx.secret, role, row.id, pin), codeHash: '', mustChange: false, fails: 0, lockUntil: 0 };
      if (row.pinHash) patch.codeV = Number(row.codeV || 0) + 1;
      if (role === 'e' || row.pinHash) { patch.tempHash = ''; patch.tempExp = 0; }
      ctx.db.update(table, row.id, patch);
      row = find(ctx.db.rows(table), row.id);
      return { token: makeToken(ctx.secret, role, row.id, Number(row.codeV), ctx.now + TOKEN_ADULTE), role: role, nom: row.nom, admin: role === 'e' && !!row.admin, mustChange: false };
    }
  };

  A.family = {
    auth: ['f'],
    run: function (req, ctx) {
      var f = ctx.auth.row;
      var kids = ctx.db.rows('joueurs').filter(function (j) { return j.familleId === f.id && j.actif; });
      // les prochains rendez-vous du groupe (titre, date, lieu seulement : les présents et les compos restent aux éducs)
      var auj = isoDate(ctx.now), ids = {};
      kids.forEach(function (k) { ids[k.id] = true; });
      // seulement les événements où l'un de ses enfants est invité (Spond) ou coché présent
      function invite(e) { return [].concat(e.presents || [], e.absents || [], e.sansReponse || [], e.ajouts || []).some(function (id) { return ids[id]; }); }
      var prochains = ctx.db.rows('evenements').filter(function (e) { return !e.annule && String(e.debut).slice(0, 10) >= auj && invite(e); })
        .sort(function (a, b) { return String(a.debut) < String(b.debut) ? -1 : 1; }).slice(0, 3)
        .map(function (e) { return { titre: e.titre, debut: e.debut, lieu: e.lieu || '', sorte: e.sorte || '', source: e.source || '' }; });
      return { famille: { id: f.id, nom: f.nom }, enfants: kids.map(function (k) { return dossier(ctx, k, true); }), prochains: prochains };
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
        // un éduc ne confirme que les résultats de son enfant ; ceux des autres, c'est leur famille
        if (!voitAttente(ctx, r.joueurId)) fail('interdit', 'Ce sont ses parents qui confirment les résultats de cet enfant.');
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
      var etoiles = db.rows('etoiles').filter(function (e) { return !e.retiree; }), encs = db.rows('encouragements').filter(function (x) { return !x.retire; });
      var dems = db.rows('demandes').filter(function (x) { return x.statut !== 'retiree'; });
      var bravos = db.rows('bravos').filter(function (x) { return !x.retire; });
      var joueurs = db.rows('joueurs').map(function (j) {
        return {
          joueur: pubJoueur(j),
          famille: (find(fams, j.familleId) || {}).nom || '',
          seances: where(seances, 'joueurId', j.id).map(function (s) { return pubSeance(s, false); }),
          records: recordsVus(ctx, j.id, where(records, 'joueurId', j.id)).map(pubRecord), enAttente: nbAttente(ctx, j.id, where(records, 'joueurId', j.id)),
          journal: where(journal, 'joueurId', j.id).map(pubJournal),
          missions: where(missions, 'joueurId', j.id).map(function (m) { return pubMission(m, false); }),
          terrain: pubTerrain(find(terrain, j.id)),
          etoiles: where(etoiles, 'joueurId', j.id).map(function (e) { return pubEtoile(e, true); }),
          encouragements: where(encs, 'joueurId', j.id).map(pubEnc),
          bravos: where(bravos, 'joueurId', j.id).map(function (x) { return pubBravo(x, true); }),
          demandes: where(dems, 'joueurId', j.id).map(pubDemande)
        };
      });
      var imp = null;
      try { imp = JSON.parse(db.getProp('importPostes') || 'null'); } catch (e) { imp = null; }
      return {
        moi: { id: ctx.auth.row.id, nom: ctx.auth.row.nom, admin: !!ctx.auth.row.admin, enfants: Array.isArray(ctx.auth.row.enfants) ? ctx.auth.row.enfants : [] },
        joueurs: joueurs,
        familles: fams.map(function (f) { return { id: f.id, nom: f.nom }; }),
        importPostes: imp,
        defmissions: db.rows('defmissions').filter(function (m) { return m.statut !== 'retiree'; }).map(pubDef)
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
      ctx.nChg = Object.keys(chg).length;   // (v34) pas d'alerte quand rien n'a changé
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
      // ajouté depuis Spond : relié tout de suite à son membre Spond (une seule fois)
      var spondId = req.spondId ? cleanText(String(req.spondId), 64) : '';
      if (spondId && ctx.db.rows('terrain').some(function (t) { return t.spondId === spondId; })) fail('deja', 'Cet enfant Spond est déjà dans l\'appli.');
      var fam = null, famCode = null;
      if (req.familleId) {
        fam = find(ctx.db.rows('familles'), String(req.familleId));
        if (!fam) fail('introuvable', 'Famille introuvable.');
      } else {
        var nom = cleanText(req.familleNom, 40) || ('Famille de ' + prenom);
        fam = { id: genId(ctx.env), nom: nom, codeHash: '', codeV: 1, cree: isoNow(ctx.now), pinHash: '' };
        var tf = adultTemp(ctx, 'f', fam.id);
        for (var kf in tf.patch) fam[kf] = tf.patch[kf];
        ctx.db.insert('familles', fam);
        famCode = tf.code;
      }
      var couleurs = ['#38E8FF', '#FF4FA3', '#3DFFB0', '#FFC23D', '#B48CFF', '#FF8A3D', '#4D9BFF', '#FF4F6D', '#7CFF6B'];
      var id = genId(ctx.env), code = newKidTemp(ctx.env);
      var row = {
        id: id, prenom: prenom, couleur: couleurs[ctx.env.rand(couleurs.length)], familleId: fam.id,
        pinHash: '', pinV: 1, tempHash: hashTemp(ctx.secret, id, code), tempExp: ctx.now + 45 * DAY, mustChange: true,
        fails: 0, lockUntil: 0, niveaux: {}, materiel: 'complet', visible: true, actif: true, cree: isoNow(ctx.now)
      };
      ctx.db.insert('joueurs', row);
      if (spondId) terrainRow(ctx, id, { spondId: spondId, parQui: ctx.auth.row.nom, maj: isoNow(ctx.now) });
      return { joueur: pubJoueur(row), code: code, expire: row.tempExp, famille: { id: fam.id, nom: fam.nom }, familleCode: famCode, spondId: spondId };
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
      var row = { id: genId(ctx.env), nom: nom, codeHash: '', codeV: 1, cree: isoNow(ctx.now), pinHash: '' };
      var t = adultTemp(ctx, 'f', row.id);
      for (var k in t.patch) row[k] = t.patch[k];
      ctx.db.insert('familles', row);
      return { famille: { id: row.id, nom: row.nom }, code: t.code, expire: row.tempExp };
    }
  };

  A.resetFamilyCode = {
    auth: ['e'],
    run: function (req, ctx) {
      var f = find(ctx.db.rows('familles'), String(req.familleId || ''));
      if (!f) fail('introuvable', 'Famille introuvable.');
      var t = adultTemp(ctx, 'f', f.id);
      t.patch.pinHash = ''; t.patch.codeHash = ''; t.patch.codeV = Number(f.codeV || 0) + 1;
      ctx.db.update('familles', f.id, t.patch);
      return { code: t.code, expire: t.patch.tempExp, famille: { id: f.id, nom: f.nom } };
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
      var row = { id: genId(ctx.env), nom: nom, codeHash: '', codeV: 1, admin: !!req.admin, actif: true, cree: isoNow(ctx.now), pinHash: '' };
      var t = adultTemp(ctx, 'e', row.id);
      for (var k in t.patch) row[k] = t.patch[k];
      ctx.db.insert('educs', row);
      return { educ: { id: row.id, nom: row.nom, admin: row.admin, actif: true }, code: t.code, expire: row.tempExp };
    }
  };

  A.resetEducCode = {
    auth: ['e'],
    run: function (req, ctx) {
      var id = String(req.educId || ctx.auth.id);
      if (id !== ctx.auth.id) requireAdmin(ctx);
      var e = find(ctx.db.rows('educs'), id);
      if (!e) fail('introuvable', 'Éduc introuvable.');
      var t = adultTemp(ctx, 'e', e.id);
      t.patch.pinHash = ''; t.patch.codeHash = ''; t.patch.codeV = Number(e.codeV || 0) + 1;
      ctx.db.update('educs', e.id, t.patch);
      return { code: t.code, expire: t.patch.tempExp, nom: e.nom };
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
  // Skills, encouragements (+1) et missions des éducs
  // - Une étoile Skills ne se gagne que si un éduc la valide (un seul éduc suffit).
  // - Un +1 dit « tu es sur la bonne voie » sur la mission perso d'un enfant (jusqu'à 5 par mission) ;
  //   il ne donne jamais l'étoile : au 3e, l'appli propose aux éducs de la valider, rien d'automatique.
  // - Un parent ne donne jamais de +1 ; l'enfant et sa famille voient les +1 et les mots.
  // ---------------------------------------------------------
  // (25/10, Skills v2) 8 cartes ; les identifiants déjà en ligne ne changent jamais (une étoile validée garde son id)
  var SKILLS = {
    plaquage: ['epaule', 'joue', 'deux-cotes', 'cercle', 'tomber'],
    ruck: ['dos-plat', 'appuis', 'tete', 'gagne', 'roulade', 'hors-jeu', 'porte'],
    maul: ['debout', 'tourne', 'lie', 'arrache', 'avance', 'arrete'],
    defense: ['ligne', 'jeu', 'parle', 'cadre', 'retour'],
    porteur: ['droit', 'avance', 'cherche', 'raffut', 'tombe', 'ballon-camp'],
    passe: ['mains', 'en-courant', 'droite', 'gauche', 'vrillee', 'piston'],
    pied: ['decolle', 'chandelle', 'rasant', 'ramasse', 'vise', 'deux-pieds'],
    soutien: ['axe', 'montre', 'plus', 'premier', 'replace', 'hors-jeu-pied']
  };
  var MAX_PLUS1 = 5;
  // les vacances scolaires (zone C, académie de Toulouse) : le 1er jour. La date de fin par défaut d'une mission principale.
  var VACANCES = ['2026-10-17', '2026-12-19', '2027-02-06', '2027-04-03', '2027-07-03', '2027-10-23', '2027-12-18'];
  function prochainesVacances(today) {
    var p = today.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 7)), t = d.toISOString().slice(0, 10);
    for (var i = 0; i < VACANCES.length; i++) if (VACANCES[i] >= t) return VACANCES[i];
    d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 42)); return d.toISOString().slice(0, 10);
  }
  function skillOk(d, e) { return typeof d === 'string' && typeof e === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, d) && SKILLS[d].indexOf(e) >= 0; }
  function educNom(ctx) { return ctx.auth.row.nom || 'Un éduc'; }
  function joueurActif(ctx, id) {
    var j = find(ctx.db.rows('joueurs'), String(id || ''));
    if (!j || !j.actif) fail('introuvable', 'Joueur introuvable.');
    return j;
  }
  function etoileActive(ctx, joueurId, d, e) {
    var l = ctx.db.rows('etoiles');
    for (var i = 0; i < l.length; i++) if (l[i].joueurId === joueurId && l[i].domaine === d && l[i].etoile === e && !l[i].retiree) return l[i];
    return null;
  }
  function plus1De(ctx, missionId) { return ctx.db.rows('encouragements').filter(function (x) { return x.missionId === missionId && !x.retire; }).length; }
  // le texte de l'occasion : donné par l'appli, sinon déduit de l'événement
  function occasionDe(ctx, req) {
    var occ = cleanText(req.occasion, 60), evId = String(req.evenementId || ''), ev = evId ? find(ctx.db.rows('evenements'), evId) : null;
    return { occasion: occ || (ev ? cleanText(ev.titre, 60) : ''), evenementId: ev ? ev.id : '' };
  }

  A.plusUn = {
    auth: ['e'],
    run: function (req, ctx) {
      var j = joueurActif(ctx, req.joueurId), mid = String(req.missionId || ''), def = null;
      var mot = cleanText(req.mot, 140);
      var et = '';
      if (mid) {
        def = find(ctx.db.rows('defmissions'), mid);
        if (!def || def.sorte !== 'etoile' || def.joueurId !== j.id || def.statut !== 'active') fail('invalide', 'Cette mission n\'est plus en cours.');
        if (def.fin && def.fin < isoDate(ctx.now)) fail('finie', 'Cette mission est terminée (le ' + def.fin + ') : donnez-lui une nouvelle mission.');
        var lst = etoilesDe(def), max = MAX_PLUS1 * Math.max(1, lst.length);
        if (plus1De(ctx, mid) >= max) fail('limite', 'Déjà ' + max + ' encouragements sur cette mission : c\'est le moment de valider ' + (lst.length > 1 ? 'les étoiles.' : 'l\'étoile.'));
        // l'étoile précise (si l'éduc la choisit), sinon la 1re pas encore gagnée
        et = typeof req.etoile === 'string' && lst.indexOf(req.etoile) >= 0 ? req.etoile : (lst.filter(function (e) { return !etoileActive(ctx, j.id, def.domaine, e); })[0] || lst[0] || '');
      } else if (!mot) fail('invalide', 'Écrivez un mot, ou choisissez sa mission.');
      var o = occasionDe(ctx, req), now = isoNow(ctx.now);
      var row = { id: genId(ctx.env), joueurId: j.id, missionId: mid, domaine: def ? def.domaine : '', etoile: et, mot: mot, parQui: ctx.auth.row.id, parNom: educNom(ctx),
        date: isoDate(ctx.now), occasion: o.occasion, evenementId: o.evenementId, retire: false, cree: now };
      ctx.db.insert('encouragements', row);
      return { encouragement: pubEnc(row), nb: mid ? plus1De(ctx, mid) : 0, max: def ? MAX_PLUS1 * Math.max(1, etoilesDe(def).length) : MAX_PLUS1 };
    }
  };
  // retirer un +1 donné par erreur : son auteur, ou l'admin
  A.retirerEncouragement = {
    auth: ['e'],
    run: function (req, ctx) {
      var x = find(ctx.db.rows('encouragements'), String(req.id || ''));
      if (!x || x.retire) fail('introuvable', 'Introuvable.');
      if (x.parQui !== ctx.auth.row.id && !ctx.auth.row.admin) fail('interdit', 'Seul l\'éduc qui l\'a donné peut le retirer.');
      ctx.db.update('encouragements', x.id, { retire: true });
      return { id: x.id };
    }
  };
  // (v36) « Bravo » pour une séance de prépa faite : un toucher. Un seul bravo par éduc et par séance (le 2e geste
  // ne fait que changer le mot) ; mot facultatif (140 caractères). L'enfant et sa famille le voient ; pas d'XP.
  A.bravo = {
    auth: ['e'],
    run: function (req, ctx) {
      var s = find(ctx.db.rows('seances'), String(req.seanceId || ''));
      if (!s) fail('introuvable', 'Séance introuvable.');
      var j = joueurActif(ctx, s.joueurId), me = ctx.auth.row, now = isoNow(ctx.now), mot = req.mot === undefined ? null : cleanText(req.mot, 140), ex = null;
      ctx.db.rows('bravos').forEach(function (x) { if (x.seanceId === s.id && x.parQui === me.id && !x.retire) ex = x; });
      if (ex) {
        if (mot !== null && mot !== (ex.mot || '')) { ctx.db.update('bravos', ex.id, { mot: mot, maj: now }); ctx.bravoMot = !!mot; }
        return { bravo: pubBravo(find(ctx.db.rows('bravos'), ex.id), true), nouveau: false };
      }
      var row = { id: genId(ctx.env), joueurId: j.id, seanceId: s.id, mot: mot || '', parQui: me.id, parNom: educNom(ctx), retire: false, cree: now, maj: now };
      ctx.db.insert('bravos', row);
      return { bravo: pubBravo(row, true), nouveau: true };
    }
  };
  // retirer un bravo donné par erreur : son auteur, ou l'admin
  A.retirerBravo = {
    auth: ['e'],
    run: function (req, ctx) {
      var x = find(ctx.db.rows('bravos'), String(req.id || ''));
      if (!x || x.retire) fail('introuvable', 'Introuvable.');
      if (x.parQui !== ctx.auth.row.id && !ctx.auth.row.admin) fail('interdit', 'Seul l\'éduc qui l\'a donné peut le retirer.');
      ctx.db.update('bravos', x.id, { retire: true, maj: isoNow(ctx.now) });
      return { id: x.id };
    }
  };
  // donner une étoile (ou la faire briller) à un enfant : utilisé par validerEtoiles et repondreDemande
  // renvoie { row, statut: 'nouvelle' | 'brille' | 'deja' } ; la mission perso qui visait l'étoile est faite ;
  // une demande en attente de l'enfant sur cette étoile est close (oui)
  function allumerEtoile(ctx, j, d, e, o, brille, essais, now, faites) {
    var ex = etoileActive(ctx, j.id, d, e), row = null, statut = 'deja', me = ctx.auth.row;
    var b = brille ? { brille: isoDate(ctx.now), brilleParQui: me.id, brilleParNom: educNom(ctx), brilleOccasion: o.occasion, brilleEvenementId: o.evenementId } : null;
    if (ex) {
      if (b && !ex.brille) { b.maj = now; ctx.db.update('etoiles', ex.id, b); statut = 'brille'; }
      row = find(ctx.db.rows('etoiles'), ex.id);
    } else {
      row = { id: genId(ctx.env), joueurId: j.id, domaine: d, etoile: e, parQui: me.id, parNom: educNom(ctx),
        date: isoDate(ctx.now), occasion: o.occasion, evenementId: o.evenementId, essais: essais || null, retiree: false, cree: now, maj: now,
        brille: '', brilleParQui: '', brilleParNom: '', brilleOccasion: '', brilleEvenementId: '' };
      if (b) Object.keys(b).forEach(function (k) { row[k] = b[k]; });
      ctx.db.insert('etoiles', row);
      statut = 'nouvelle';
      ctx.db.rows('defmissions').forEach(function (m) {
        if (m.sorte === 'etoile' && m.statut === 'active' && m.joueurId === j.id && m.domaine === d && etoilesDe(m).indexOf(e) >= 0) {
          // (mission principale) faite quand toutes ses étoiles sont gagnées
          var toutes = etoilesDe(m).every(function (x) { return x === e || !!etoileActive(ctx, j.id, d, x); });
          if (!toutes) return;
          ctx.db.update('defmissions', m.id, { statut: 'faite', faiteLe: isoDate(ctx.now), maj: now });
          if (faites) faites.push(m.id);
        }
      });
    }
    // la demande de l'enfant sur cette étoile est satisfaite (pour « briller », seulement si l'étoile brille maintenant)
    ctx.db.rows('demandes').forEach(function (x) {
      if (x.statut === 'attente' && x.joueurId === j.id && x.domaine === d && x.etoile === e && (x.sorte !== 'briller' || (row && row.brille))) {
        ctx.db.update('demandes', x.id, { statut: 'oui', parQui: me.id, parNom: educNom(ctx), reponseLe: now, maj: now });
      }
    });
    return { row: row, statut: statut };
  }
  // valider des étoiles : une ou plusieurs (après la séance, atelier ou journée d'évaluation, après un plateau)
  // brille : true (pour toute la liste) ou x.brille (par étoile) = l'étoile a été vue au plateau
  A.validerEtoiles = {
    auth: ['e'],
    run: function (req, ctx) {
      var list = Array.isArray(req.etoiles) ? req.etoiles : [];
      if (!list.length) fail('invalide', 'Aucune étoile à valider.');
      if (list.length > 300) fail('limite', 'Trop d\'étoiles d\'un coup (300 au plus).');
      var o = occasionDe(ctx, req), now = isoNow(ctx.now), out = [], deja = 0, brillees = 0, faites = [];
      // tout est vérifié avant d'écrire quoi que ce soit
      var js = list.map(function (x) {
        if (!x || !skillOk(String(x.domaine), String(x.etoile))) fail('invalide', 'Étoile inconnue.');
        return joueurActif(ctx, x.joueurId);
      });
      list.forEach(function (x, i) {
        var essais = Array.isArray(x.essais) ? x.essais.slice(0, 3).map(function (v) { return v ? 1 : 0; }) : null;
        var r = allumerEtoile(ctx, js[i], String(x.domaine), String(x.etoile), o, req.brille === true || x.brille === true, essais, now, faites);
        if (r.statut === 'deja') { deja++; return; }
        if (r.row && r.row.brille && (r.statut === 'brille' || req.brille === true || x.brille === true)) brillees++;
        out.push(pubEtoile(r.row, true));
      });
      return { etoiles: out, deja: deja, brillees: brillees, missionsFaites: faites };
    }
  };
  // ----- les demandes des enfants -----
  // l'enfant demande une étoile pas encore gagnée (gagner) ou de faire briller une étoile qu'il a (briller) ;
  // une seule demande en attente à la fois ; les éducs répondent Oui ou Pas vu, quand ils veulent
  A.demanderEtoile = {
    auth: ['p'],
    run: function (req, ctx) {
      var me = ctx.auth.row, d = String(req.domaine || ''), e = String(req.etoile || '');
      if (!skillOk(d, e)) fail('invalide', 'Étoile inconnue.');
      var enCours = ctx.db.rows('demandes').filter(function (x) { return x.joueurId === me.id && x.statut === 'attente'; })[0];
      if (enCours) fail('deja', 'Tu as déjà une demande en attente : les éducs vont y répondre.');
      var ex = etoileActive(ctx, me.id, d, e);
      if (ex && ex.brille) fail('invalide', 'Cette étoile brille déjà.');
      var auj = isoDate(ctx.now);
      if (ctx.db.rows('demandes').filter(function (x) { return x.joueurId === me.id && String(x.cree || '').slice(0, 10) === auj; }).length >= 10) fail('limite', 'Assez de demandes pour aujourd\'hui : réessaie demain.');
      // l'occasion vient seulement de l'événement choisi (jamais d'un texte tapé par l'enfant)
      var evId = String(req.evenementId || ''), ev = evId ? find(ctx.db.rows('evenements'), evId) : null;
      var o = { occasion: ev ? cleanText(ev.titre, 60) : '', evenementId: ev ? ev.id : '' }, now = isoNow(ctx.now);
      var row = { id: genId(ctx.env), joueurId: me.id, domaine: d, etoile: e, sorte: ex ? 'briller' : 'gagner', evenementId: o.evenementId, occasion: o.occasion,
        statut: 'attente', parQui: '', parNom: '', reponseLe: '', cree: now, maj: now };
      ctx.db.insert('demandes', row);
      return { demande: pubDemande(row) };
    }
  };
  // l'enfant annule sa demande en attente
  A.retirerDemande = {
    auth: ['p'],
    run: function (req, ctx) {
      var x = find(ctx.db.rows('demandes'), String(req.id || ''));
      if (!x || x.joueurId !== ctx.auth.row.id || x.statut !== 'attente') fail('introuvable', 'Introuvable.');
      ctx.db.update('demandes', x.id, { statut: 'retiree', maj: isoNow(ctx.now) });
      return { id: x.id };
    }
  };
  // un éduc répond : oui (l'étoile est donnée, ou elle brille) ou pas vu (message neutre, l'enfant peut redemander)
  A.repondreDemande = {
    auth: ['e'],
    run: function (req, ctx) {
      var x = find(ctx.db.rows('demandes'), String(req.id || ''));
      if (!x || x.statut !== 'attente') fail('introuvable', 'Cette demande n\'est plus en attente.');
      var j = joueurActif(ctx, x.joueurId), now = isoNow(ctx.now), etoile = null;
      var faites = [];
      if (req.oui === true) {
        var o = { occasion: x.occasion, evenementId: x.evenementId };
        if (req.occasion !== undefined || req.evenementId !== undefined) o = occasionDe(ctx, req);
        // « la faire briller » sur une étoile retirée entre-temps : on la redonne, sans la faire briller
        var briller = x.sorte === 'briller' && !!etoileActive(ctx, j.id, x.domaine, x.etoile);
        var r = allumerEtoile(ctx, j, x.domaine, x.etoile, o, briller, null, now, faites);
        etoile = r.row ? pubEtoile(r.row, true) : null;
        // demande close par allumerEtoile ; si l'étoile était déjà là (validée entre-temps), on la clôt quand même
        var y = find(ctx.db.rows('demandes'), x.id);
        if (y.statut === 'attente') ctx.db.update('demandes', x.id, { statut: 'oui', parQui: ctx.auth.row.id, parNom: educNom(ctx), reponseLe: now, maj: now });
      } else {
        ctx.db.update('demandes', x.id, { statut: 'pasvu', parQui: ctx.auth.row.id, parNom: educNom(ctx), reponseLe: now, maj: now });
      }
      return { demande: pubDemande(find(ctx.db.rows('demandes'), x.id)), etoile: etoile, missionsFaites: faites };
    }
  };
  // une étoile validée par erreur : elle disparaît pour l'enfant (gardée dans la feuille) ; sa mission perso redevient en cours
  A.retirerEtoile = {
    auth: ['e'],
    run: function (req, ctx) {
      var e = find(ctx.db.rows('etoiles'), String(req.id || ''));
      if (!e || e.retiree) fail('introuvable', 'Introuvable.');
      var now = isoNow(ctx.now);
      if (req.eteindre === true) {
        if (!e.brille) fail('invalide', 'Cette étoile ne brille pas.');
        ctx.db.update('etoiles', e.id, { brille: '', brilleParQui: '', brilleParNom: '', brilleOccasion: '', brilleEvenementId: '', maj: now });
        return { id: e.id, eteinte: true, missionsRouvertes: [] };
      }
      ctx.db.update('etoiles', e.id, { retiree: true, maj: now });
      ctx.db.rows('demandes').forEach(function (x) {
        if (x.statut === 'attente' && x.sorte === 'briller' && x.joueurId === e.joueurId && x.domaine === e.domaine && x.etoile === e.etoile) ctx.db.update('demandes', x.id, { sorte: 'gagner', maj: now });
      });
      var rouvertes = [];
      // une seule mission perso à la fois : si l'enfant en a déjà une autre en cours, l'ancienne reste « faite »
      var autre = ctx.db.rows('defmissions').some(function (m) { return m.sorte === 'etoile' && m.statut === 'active' && m.joueurId === e.joueurId; });
      if (!autre) ctx.db.rows('defmissions').forEach(function (m) {
        if (!rouvertes.length && m.sorte === 'etoile' && m.statut === 'faite' && m.joueurId === e.joueurId && m.domaine === e.domaine && etoilesDe(m).indexOf(e.etoile) >= 0) {
          ctx.db.update('defmissions', m.id, { statut: 'active', faiteLe: '', maj: now });
          rouvertes.push(m.id);
        }
      });
      return { id: e.id, missionsRouvertes: rouvertes };
    }
  };
  // les questions d'une mission : 1 à 10, chacune 2 à 4 réponses et l'indice de la bonne
  function cleanQuestions(qs, min) {
    if (!Array.isArray(qs)) qs = [];
    var out = qs.slice(0, 10).map(function (q) {
      if (!q || typeof q !== 'object') fail('invalide', 'Question invalide.');
      if (typeof q.q !== 'string' || !Array.isArray(q.opts) || q.opts.some(function (o) { return typeof o !== 'string'; }) || typeof q.ok !== 'number') fail('invalide', 'Question invalide.');
      var t = cleanText(q.q, 160), opts = q.opts.slice(0, 4).map(function (o) { return cleanText(o, 90); }).filter(Boolean), ok = q.ok;
      if (!t) fail('invalide', 'Une question est vide.');
      if (opts.length < 2) fail('invalide', 'Chaque question a besoin d\'au moins 2 réponses.');
      if (!(ok >= 0 && ok < opts.length && Math.floor(ok) === ok)) fail('invalide', 'Choisissez la bonne réponse de chaque question.');
      return { q: t, opts: opts, ok: ok };
    });
    if (out.length < (min || 0)) fail('invalide', 'Il faut au moins ' + min + ' question' + (min > 1 ? 's' : '') + '.');
    return out;
  }
  // l'identifiant d'une vidéo YouTube (adresse complète ou identifiant seul)
  function youtubeId(s) {
    s = String(s || '').trim();
    var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/) || s.match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : '';
  }
  A.defMission = {
    auth: ['e'],
    run: function (req, ctx) {
      var now = isoNow(ctx.now), me = ctx.auth.row, m, patch;
      if (req.id) {
        m = find(ctx.db.rows('defmissions'), String(req.id));
        if (!m || m.statut === 'retiree') fail('introuvable', 'Mission introuvable.');
        if (m.parQui !== me.id && !me.admin) fail('interdit', 'Seul l\'éduc qui l\'a créée (ou l\'admin) peut la modifier.');
        if (req.retirer) { ctx.db.update('defmissions', m.id, { statut: 'retiree', maj: now }); return { mission: pubDef(find(ctx.db.rows('defmissions'), m.id)) }; }
        patch = { maj: now };
        if (req.titre !== undefined) { patch.titre = cleanText(req.titre, 80); if (!patch.titre) fail('invalide', 'Il faut un titre.'); }
        if (req.texte !== undefined) patch.texte = cleanText(req.texte, 240);
        if (req.fin !== undefined) {
          patch.fin = validDate(req.fin) ? req.fin : '';
          // (une date passée reste permise ici : c'est la façon de terminer une mission tout de suite)
          if (!patch.fin && m.sorte === 'etoile') fail('invalide', 'Une mission principale a toujours une date de fin.');
        }
        if (m.sorte !== 'etoile' && req.questions !== undefined) patch.questions = cleanQuestions(req.questions, m.sorte === 'qcm' ? 1 : 0);
        if (m.sorte === 'video' && req.video !== undefined) { patch.video = youtubeId(req.video); if (!patch.video) fail('invalide', 'Adresse de vidéo YouTube non reconnue.'); }
        ctx.db.update('defmissions', m.id, patch);
        return { mission: pubDef(find(ctx.db.rows('defmissions'), m.id)) };
      }
      var sorte = String(req.sorte || '');
      if (['video', 'qcm', 'etoile'].indexOf(sorte) < 0) fail('invalide', 'Type de mission inconnu.');
      var xp = Math.round(Number(req.xp));
      m = { id: genId(ctx.env), sorte: sorte, titre: cleanText(req.titre, 80), texte: cleanText(req.texte, 240), video: '', questions: [], joueurId: '', domaine: '', etoile: '',
        xp: xp >= 0 && xp <= 300 ? xp : (sorte === 'etoile' ? 0 : 50), debut: isoDate(ctx.now), fin: validDate(req.fin) ? req.fin : '', statut: 'active',
        parQui: me.id, parNom: educNom(ctx), faiteLe: '', cree: now, maj: now };
      if (sorte === 'etoile') {
        // (25/10) la mission principale : 1 à 3 étoiles d'une même carte, une date de fin (par défaut les prochaines
        // vacances), pour un enfant (joueurId) ou plusieurs d'un coup (joueurIds). Une seule à la fois par enfant :
        // la nouvelle remplace celle en cours (remplacer), ses +1 restent dans l'historique.
        var dom = String(req.domaine || ''), lst = Array.isArray(req.etoiles) ? req.etoiles.map(String) : [String(req.etoile || '')];
        lst = lst.filter(function (e, i) { return e && lst.indexOf(e) === i; });
        if (!lst.length || lst.length > 3) fail('invalide', 'Choisissez 1 à 3 étoiles.');
        lst.forEach(function (e) { if (!skillOk(dom, e)) fail('invalide', 'Étoile inconnue.'); });
        lst = SKILLS[dom].filter(function (e) { return lst.indexOf(e) >= 0; });
        var batch = Array.isArray(req.joueurIds), ids = batch ? req.joueurIds.map(String) : [String(req.joueurId || '')];
        ids = ids.filter(function (x, i) { return ids.indexOf(x) === i; });
        if (!ids.length || ids.length > 60) fail('invalide', 'Choisissez 1 à 60 enfants.');
        var jsx = ids.map(function (x) { return joueurActif(ctx, x); });   // tout est vérifié avant d'écrire
        var auj = isoDate(ctx.now), fin = validDate(req.fin) ? req.fin : prochainesVacances(auj), ignores = [], remplacees = [], out = [];
        if (fin < auj) fail('invalide', 'La date de fin est déjà passée.');
        var plan = jsx.map(function (j) {
          var reste = lst.filter(function (e) { return !etoileActive(ctx, j.id, dom, e); });
          if (!reste.length) {
            if (!batch) fail('invalide', j.prenom + (lst.length > 1 ? ' a déjà ces étoiles.' : ' a déjà cette étoile.'));
            ignores.push({ joueurId: j.id, raison: 'deja' }); return null;
          }
          // une mission dont la date est passée est finie : elle ne bloque personne, et elle est rangée quand la nouvelle arrive
          var actives = ctx.db.rows('defmissions').filter(function (x) { return x.sorte === 'etoile' && x.statut === 'active' && x.joueurId === j.id; });
          var encours = actives.filter(function (x) { return !x.fin || x.fin >= auj; });
          if (encours.length && !req.remplacer) {
            if (!batch) fail('deja', j.prenom + ' a déjà une mission principale en cours.', { missionId: encours[0].id });
            ignores.push({ joueurId: j.id, raison: 'encours' }); return null;
          }
          var autreEduc = encours.filter(function (x) { return x.parQui !== me.id; })[0];
          if (autreEduc && !me.admin) {
            if (!batch) fail('interdit', 'Sa mission en cours vient de ' + (autreEduc.parNom || 'un autre éduc') + ' : seul cet éduc (ou l\'admin) peut la remplacer.');
            ignores.push({ joueurId: j.id, raison: 'autre', parNom: autreEduc.parNom || '' }); return null;
          }
          return { j: j, reste: reste, encours: actives };
        }).filter(Boolean);
        plan.forEach(function (x) {
          x.encours.forEach(function (y) { ctx.db.update('defmissions', y.id, { statut: 'retiree', maj: now }); remplacees.push(y.id); });
          var mm = clone(m);
          mm.id = genId(ctx.env); mm.joueurId = x.j.id; mm.domaine = dom; mm.etoile = x.reste[0]; mm.etoiles = x.reste; mm.xp = 0; mm.fin = fin;
          if (!mm.titre) mm.titre = dom + ' · ' + x.reste.join(', ');
          ctx.db.insert('defmissions', mm);
          out.push(pubDef(mm));
        });
        return { mission: out[0] || null, missions: out, ignores: ignores, remplacees: remplacees };
      } else {
        if (!m.titre) fail('invalide', 'Il faut un titre.');
        if (sorte === 'video') { m.video = youtubeId(req.video); if (!m.video) fail('invalide', 'Adresse de vidéo YouTube non reconnue.'); }
        m.questions = cleanQuestions(req.questions, sorte === 'qcm' ? 1 : 0);
      }
      ctx.db.insert('defmissions', m);
      return { mission: pubDef(m) };
    }
  };
  // l'enfant fait une mission du groupe : vidéo vue, puis ses réponses (la 1re fois compte pour le score)
  A.repondreMission = {
    auth: ['p'],
    run: function (req, ctx) {
      var me = ctx.auth.row, def = find(ctx.db.rows('defmissions'), String(req.missionId || ''));
      if (!def || def.statut === 'retiree' || (def.sorte !== 'video' && def.sorte !== 'qcm')) fail('introuvable', 'Mission introuvable.');
      if (def.fin && def.fin < isoDate(ctx.now)) fail('finie', 'Cette mission est terminée.');
      var row = missionRow(ctx, me.id, def.id), r = row && row.reponses ? clone(row.reponses) : {}, qs = Array.isArray(def.questions) ? def.questions : [];
      if (req.vu) r.vu = true;
      if (req.reponses !== undefined && !Array.isArray(r.ans)) {
        if (!Array.isArray(req.reponses) || req.reponses.length !== qs.length) fail('invalide', 'Réponds à toutes les questions.');
        var ans = req.reponses.map(function (a, i) { if (typeof a !== 'number') fail('invalide', 'Réponse invalide.'); if (!(a >= 0 && a < qs[i].opts.length && Math.floor(a) === a)) fail('invalide', 'Réponse invalide.'); return a; });
        r.ans = ans; r.total = qs.length; r.score = ans.filter(function (a, i) { return a === qs[i].ok; }).length;
      }
      var faite = def.sorte === 'video' ? !!r.vu && (!qs.length || Array.isArray(r.ans)) : Array.isArray(r.ans);
      if (faite && r.xp === undefined) r.xp = Number(def.xp) || 0;   // les XP gagnés restent, même si la mission est retirée ensuite
      ctx.missionFaite = faite && !(row && row.faite);   // (v34) l'alerte part quand la mission devient faite (pas en lançant la vidéo)
      var now = isoNow(ctx.now);
      if (row) {
        var patch = { reponses: r, faite: faite || !!row.faite, maj: now };
        if (patch.faite && !row.date) patch.date = isoDate(ctx.now);
        ctx.db.update('missions', row.id, patch);
      } else ctx.db.insert('missions', { id: genId(ctx.env), joueurId: me.id, mission: def.id, reponses: r, faite: faite, date: faite ? isoDate(ctx.now) : '', source: 'appli', cree: now, maj: now });
      return dossier(ctx, find(ctx.db.rows('joueurs'), me.id), true);
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
      sansReponse: e.sansReponse || [], ajouts: e.ajouts || [], retraits: e.retraits || [], inconnus: e.inconnus || [], annule: !!e.annule, parQui: e.parQui || '', maj: e.maj, categorie: e.categorie || '' };
  }
  function pubCompo(c) {
    return { id: c.id, evenementId: c.evenementId, sorte: c.sorte, partie: c.partie || '', version: Number(c.version) || 1, auteur: c.auteur, auteurNom: c.auteurNom, statut: c.statut, reglages: c.reglages || {},
      equipes: c.equipes || [], banc: c.banc || [], raisons: c.raisons || {}, justification: c.justification || '', historique: c.historique || [], cree: c.cree, maj: c.maj,
      versions: Array.isArray(c.versions) ? c.versions : [], votes: c.votes && typeof c.votes === 'object' ? c.votes : {}, choix: c.choix === '' || c.choix === undefined ? -1 : Number(c.choix) };
  }
  function pubAvis(a) {
    return { id: a.id, compoId: a.compoId, version: Number(a.version) || 1, auteur: a.auteur, auteurNom: a.auteurNom, equipes: a.equipes || [], banc: a.banc || [],
      changements: a.changements || [], justification: a.justification || '', statut: a.statut, reponse: a.reponse || '', parQui: a.parQui || '', cree: a.cree, maj: a.maj };
  }
  function propJson(ctx, k, d) { try { var v = JSON.parse(ctx.db.getProp(k) || 'null'); return v === null || v === undefined || v === '' ? d : v; } catch (e) { return d; } }
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
      var sp = propJson(ctx, 'spondSync', null), mb = propJson(ctx, 'spondMembres', []);
      // chaque membre Spond dit s'il est déjà relié à un joueur de l'appli (pour « Ajouter depuis Spond »)
      var lieA = {}; ctx.db.rows('terrain').forEach(function (t) { if (t.spondId) lieA[t.spondId] = t.id; });
      mb = (Array.isArray(mb) ? mb : []).map(function (m) { var o = {}; for (var k in m) o[k] = m[k]; o.lie = lieA[m.id] || ''; return o; });
      return {
        evenements: evts, compos: compos, avis: avis,
        spond: { branche: !!(ctx.env.spondInfo && ctx.env.spondInfo().branche), derniere: sp, membres: mb, compte: propJson(ctx, 'spondCompte', null),
          categories: propJson(ctx, 'spondCategories', []), possible: !!ctx.env.spondConnecter },
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

  var PARTIES = ['', 'ateliers', 'matchs'];
  function partieOf(x) { x = String(x || ''); return PARTIES.indexOf(x) >= 0 ? x : ''; }
  var BLOCS = ['A', 'B', 'C', 'g', 'av', 'ar', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  // une compo envoyée par le navigateur, nettoyée : équipes A1…C6 (plateau) ou groupes / équipes de match (entraînement),
  // chaque joueur actif une seule fois
  function cleanCompo(ctx, req, partie) {
    var actifs = {}; ctx.db.rows('joueurs').forEach(function (j) { if (j.actif) actifs[j.id] = true; });
    var seen = {}, tids = {}, equipes = [];
    (Array.isArray(req.equipes) ? req.equipes : []).slice(0, 18).forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      var niv, id = String(t.id || ''), extra = {};
      if (partie) {
        niv = NIVS.indexOf(t.niveau) >= 0 ? t.niveau : '';
        if (!/^[A-Za-z0-9]{1,6}$/.test(id) || tids[id]) { var k = 1; while (tids['T' + k]) k++; id = 'T' + k; }
        extra.bloc = BLOCS.indexOf(t.bloc) >= 0 ? t.bloc : (niv || 'g');
        extra.nom = cleanText(t.nom, 12) || id;
      } else {
        niv = NIVS.indexOf(t.niveau) >= 0 ? t.niveau : 'B';
        if (!/^[ABC][1-9]$/.test(id) || tids[id] || id.charAt(0) !== niv) { var n = 1; while (tids[niv + n]) n++; id = niv + n; }
      }
      tids[id] = true;
      var js = [];
      (Array.isArray(t.joueurs) ? t.joueurs : []).slice(0, 40).forEach(function (x) {
        var jid = String(x && x.id || '');
        if (!actifs[jid] || seen[jid]) return;
        seen[jid] = true;
        js.push({ id: jid, poste: POSTES_ID.indexOf(x.poste) >= 0 ? x.poste : '', n: NIVS.indexOf(x.n) >= 0 ? x.n : '' });
      });
      var eq = { id: id, niveau: niv, joueurs: js };
      for (var x in extra) eq[x] = extra[x];
      equipes.push(eq);
    });
    var banc = [];
    (Array.isArray(req.banc) ? req.banc : []).slice(0, 80).forEach(function (x) { x = String(x); if (actifs[x] && !seen[x]) { seen[x] = true; banc.push(x); } });
    var r = req.reglages || {}, nb = {};
    NIVS.forEach(function (n) { var v = Math.floor(Number(r.nb && r.nb[n]) || 0); nb[n] = v < 0 ? 0 : v > 6 ? 6 : v; });
    var raisons = {};
    if (req.raisons && typeof req.raisons === 'object') for (var k in req.raisons) if (seen[k]) raisons[k] = cleanText(req.raisons[k], 200);
    var reglages = { format: Number(r.format) === 10 ? 10 : 5, nb: nb };
    if (partie) {
      var borne = function (v, a, b, d) { v = Math.floor(Number(v)); return isNaN(v) ? d : v < a ? a : v > b ? b : v; };
      // (v35) les matchs d'entraînement peuvent se jouer avec des postes (jeu à 10, comme les plateaux)
      reglages = { format: partie === 'matchs' && Number(r.format) === 10 ? 10 : 5, nb: nb, partie: partie, mode: r.mode === 'equilibre' ? 'equilibre' : 'niveau', separer: partie === 'ateliers' && !!r.separer,
        n: borne(r.n, 1, 8, 3), nAv: borne(r.nAv, 1, 4, 1), nAr: borne(r.nAr, 1, 4, 1), nbMatchs: borne(r.nbMatchs, 1, 2, 2) };
    }
    return { equipes: equipes, banc: banc, reglages: reglages, raisons: raisons };
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
  function compoActive(ctx, evenementId, partie) {
    var l = ctx.db.rows('compos').filter(function (c) { return c.evenementId === evenementId && (c.partie || '') === (partie || '') && (c.statut === 'publiee' || c.statut === 'vote'); });
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
      var partie = partieOf(req.partie);
      var cur = compoActive(ctx, e.id, partie), note = cleanText(req.note || req.justification || '', 600);
      // 2 versions proposées au vote des éducs : la majorité l'emporte, l'auteur départage
      if (Array.isArray(req.versions)) {
        if (cur) fail('conflit', cur.auteurNom + ' a publié une compo entre-temps : la voici.');
        var vs = req.versions.slice(0, 2).map(function (v) { return cleanCompo(ctx, v || {}, partie); });
        if (vs.length !== 2 || !vs[0].equipes.length || !vs[1].equipes.length) fail('invalide', 'Il faut deux versions, chacune avec au moins une équipe.');
        var votes = {};
        if (req.monVote === 0 || req.monVote === 1) votes[me.id] = req.monVote;
        var vrow = { id: genId(ctx.env), evenementId: e.id, sorte: e.sorte || 'plateau', partie: partie, version: 1, auteur: me.id, auteurNom: me.nom, statut: 'vote', reglages: vs[0].reglages,
          equipes: vs[0].equipes, banc: vs[0].banc, raisons: vs[0].raisons, justification: cleanText(req.justification, 600),
          historique: [{ v: 1, par: me.nom, quand: now, note: '2 versions proposées au vote' }], cree: now, maj: now, versions: vs, votes: votes, choix: -1 };
        ctx.db.insert('compos', vrow);
        return { compo: pubCompo(vrow) };
      }
      var c = cleanCompo(ctx, req, partie);
      if (!c.equipes.length) fail('invalide', 'Il faut au moins une équipe.');
      if (!cur) {
        var row = { id: genId(ctx.env), evenementId: e.id, sorte: e.sorte || 'plateau', partie: partie, version: 1, auteur: me.id, auteurNom: me.nom, statut: 'publiee', reglages: c.reglages,
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
      var c = cleanCompo(ctx, { equipes: req.equipes, banc: req.banc, reglages: cur.reglages }, cur.partie || '');
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
      liste.push({ id: mid, nom: cleanText(String(m.prenom || '').replace(/\s+([A-Za-z])\.?$/, ' $1.') + (iniNom ? ' ' + iniNom.toUpperCase() + '.' : ''), 40),
        prenom: cleanText(m.prenom, 24), nomFamille: cleanText(m.nom, 40), categorie: cleanText(m.categorie, 40) });
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
        presents: map(ev.acceptes, inc), absents: map(ev.refuses), sansReponse: map((ev.sansReponse || []).concat(ev.attente || [])), inconnus: inc.slice(0, 40), annule: !!ev.annule,
        categorie: cleanText(ev.categorie, 40), maj: now };
      vus[id] = true;
      var cur = find(ctx.db.rows('evenements'), id);
      if (cur) ctx.db.update('evenements', id, row);
      else { row.id = id; row.source = 'spond'; row.sorte = sorteEvt(row.titre); row.ajouts = []; row.retraits = []; row.parQui = 'Spond'; ctx.db.insert('evenements', row); }
      evts++;
    });
    // un événement Spond de la période lue qui n'y est plus a été supprimé dans Spond ;
    // celui d'une catégorie que l'appli ne suit plus disparaît (sauf s'il a déjà des groupes : on le garde tel quel)
    if (Array.isArray(data.evenements)) {
      var dmin = isoDate(ctx.now - 29 * DAY), dmax = isoDate(ctx.now + 59 * DAY);
      var suivies = Array.isArray(data.categories) ? data.categories.filter(function (c) { return c.suivie; }).map(function (c) { return cleanText(c.nom, 40); }) : null;
      var avecCompo = {}; ctx.db.rows('compos').forEach(function (c) { avecCompo[c.evenementId] = true; });
      ctx.db.rows('evenements').filter(function (e) { var d = String(e.debut).slice(0, 10); return e.source === 'spond' && !vus[e.id] && !e.annule && d >= dmin && d <= dmax; })
        .forEach(function (e) {
          var cats = String(e.categorie || '').split(/\s*,\s*/).filter(Boolean);
          if (suivies && cats.length && !cats.some(function (n) { return suivies.indexOf(n) >= 0; })) { if (!avecCompo[e.id]) ctx.db.remove('evenements', e.id); return; }
          ctx.db.update('evenements', e.id, { annule: true, maj: now });
        });
    }
    // les catégories (sous-groupes Spond) vues par le compte, et celles que l'appli suit
    if (Array.isArray(data.categories)) ctx.db.setProp('spondCategories', JSON.stringify(data.categories.slice(0, 40).map(function (c) {
      return { id: cleanText(String(c.id || ''), 64), nom: cleanText(c.nom, 40), groupe: cleanText(c.groupe, 60), coach: !!c.coach, suivie: !!c.suivie };
    })));
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
      try { data = ctx.env.spondFetch(); } catch (e) { fail('spond', 'Spond ne répond pas : ' + msgSpond(e)); }
      return { info: syncSpond(ctx, data) };
    }
  };

  // ---------- Spond branché depuis l'appli, par un éduc administrateur ----------
  // L'e-mail et le mot de passe du compte Spond vont seulement dans les propriétés du script Google (fichier spond.gs) :
  // jamais dans la feuille, jamais renvoyés au navigateur, jamais dans un message d'erreur.
  var SPOND_INDISPO = 'Spond se branche sur le vrai site (serveur Google du club), pas en mode démo. Le propriétaire du script doit avoir ajouté le fichier « spond » au projet Apps Script et l\'avoir autorisé une fois (fonction autoriserSpond).';
  function msgSpond(e, secret) {
    var m = String(e && e.message ? e.message : e || '');
    if (secret) m = m.split(secret).join('•••');
    if (/permission|autoris|authoriz|not allowed/i.test(m)) return 'le propriétaire du script doit d\'abord autoriser Spond : dans l\'éditeur Apps Script, choisir la fonction « autoriserSpond » puis ▶ Exécuter, et accepter. Ensuite Déployer › Nouvelle version.';
    return m.slice(0, 300);
  }
  function admin(ctx) { if (!ctx.auth.row.admin) fail('interdit', 'Seul un éduc administrateur peut brancher ou régler Spond.'); }
  function masqueEmail(email) {
    var e = String(email || ''), at = e.indexOf('@');
    return at < 1 ? '•••' : e.charAt(0) + '•••' + e.slice(at);
  }
  function syncApres(ctx, secret) {
    var data;
    try { data = ctx.env.spondFetch(); } catch (e) { fail('spond', 'Spond ne répond pas : ' + msgSpond(e, secret)); }
    return syncSpond(ctx, data);
  }
  A.spondConnexion = {
    auth: ['e'],
    run: function (req, ctx) {
      admin(ctx);
      if (!ctx.env.spondConnecter || !ctx.env.spondFetch) fail('indispo', SPOND_INDISPO);
      var email = String(req.email || '').trim().slice(0, 120), mdp = String(req.mdp || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('invalide', 'L\'e-mail du compte Spond n\'a pas l\'air juste.');
      if (!mdp || mdp.length > 200) fail('invalide', 'Il faut le mot de passe du compte Spond.');
      var r;
      try { r = ctx.env.spondConnecter(email, mdp) || {}; } catch (e) { fail('spond', 'Spond : ' + msgSpond(e, mdp)); }
      var compte = { email: masqueEmail(email), parQui: ctx.auth.row.nom, quand: isoNow(ctx.now), declencheur: !!r.declencheur };
      ctx.db.setProp('spondCompte', JSON.stringify(compte));
      var info = syncApres(ctx, mdp);
      return { info: info, compte: compte, categories: propJson(ctx, 'spondCategories', []), avertissement: r.declencheur ? '' : msgSpond(r.erreurDeclencheur || 'permission') };
    }
  };
  // les catégories (sous-groupes Spond) que l'appli suit : par défaut celles dont le compte est coach
  A.spondCategories = {
    auth: ['e'],
    run: function (req, ctx) {
      admin(ctx);
      if (!ctx.env.spondChoisir || !ctx.env.spondFetch) fail('indispo', SPOND_INDISPO);
      var ids = (Array.isArray(req.ids) ? req.ids : []).slice(0, 20).map(function (x) { return cleanText(String(x), 64); }).filter(Boolean);
      if (!ids.length) fail('invalide', 'Choisissez au moins une catégorie.');
      try { ctx.env.spondChoisir(ids); } catch (e) { fail('spond', 'Spond : ' + msgSpond(e)); }
      return { info: syncApres(ctx), categories: propJson(ctx, 'spondCategories', []) };
    }
  };
  A.spondDeconnexion = {
    auth: ['e'],
    run: function (req, ctx) {
      admin(ctx);
      if (!ctx.env.spondDebrancher) fail('indispo', SPOND_INDISPO);
      try { ctx.env.spondDebrancher(); } catch (e) { fail('spond', 'Spond : ' + msgSpond(e)); }
      ctx.db.setProp('spondCompte', ''); ctx.db.setProp('spondCategories', '');
      return { debranche: true };
    }
  };

  // ---------------------------------------------------------
  // Alertes sur le téléphone (v34, 31/10/2026)
  // L'appli abonne l'appareil (pushAbonner) avec les sortes choisies dans ses réglages (les mêmes que la cloche).
  // Après une action qui intéresse quelqu'un (séance, bilan, mission, niveau, résultat confirmé, compo…), Core prépare
  // les alertes (ALERTES ci-dessous) et la partie Google les envoie par Firebase Cloud Messaging (env.envoyerPush).
  // Le texte s'affiche sur l'écran verrouillé : le prénom de l'enfant (choix de Nicolas, 31/10), jamais un résultat chiffré,
  // ni le mot d'un enfant, ni ses copains. En mode démo (pas d'env.envoyerPush), rien n'est envoyé.
  // ---------------------------------------------------------
  var PUSH_CATS = { p: ['resultat', 'bravo', 'nouvelle', 'niveau', 'etoile', 'mots', 'demande'], f: ['seance', 'bravo', 'confirmer', 'mission', 'niveau', 'skills', 'mots', 'nouvelle'],
    e: ['seance', 'bilan', 'mission', 'etoile', 'niveau', 'compo'] };
  var PUSH_LIENS = { p: '#/notifs', f: '#/parent/notifs', e: '#/educ/notifs' };
  var SEANCES_NOMS = { cros: 'la séance de Cros', capuozzo: 'la séance de Capuozzo', dupont: 'la séance de Dupont', meafou: 'la séance de Meafou', club: 'l\'entraînement au club', recup: 'la récup' };
  // (v36) « pour ta séance de Cros », « pour son entraînement au club »
  function pourSeance(type, ta) {
    var n = SEANCES_NOMS[type] || 'une séance';
    return 'pour ' + (n.indexOf('la ') === 0 ? (ta ? 'ta ' : 'sa ') + n.slice(3) : n.indexOf('l\'') === 0 ? (ta ? 'ton ' : 'son ') + n.slice(2) : (ta ? 'ta séance' : 'sa séance'));
  }
  function cleanCats(role, l) {
    var ok = PUSH_CATS[role] || [], out = [];
    (Array.isArray(l) ? l : []).slice(0, 20).forEach(function (c) { c = String(c); if (ok.indexOf(c) >= 0 && out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function jetonPush(req) {
    var j = String(req.jeton || '');
    if (!/^[A-Za-z0-9_:.\-]{20,4096}$/.test(j)) fail('invalide', 'Appareil invalide.');
    return j;
  }
  // la configuration publique de Firebase (propriété du script FCM_WEB) : null tant qu'elle n'est pas là (ou en mode démo)
  A.pushConfig = {
    auth: ['p', 'f', 'e'],
    run: function (req, ctx) {
      var w = null;
      try { w = JSON.parse(ctx.db.getProp('FCM_WEB') || 'null'); } catch (e) { w = null; }
      if (!w || typeof w !== 'object' || !w.apiKey || !w.vapidKey || !w.projectId || !w.messagingSenderId || !w.appId) return { web: null };
      var o = {};
      ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId', 'vapidKey'].forEach(function (k) { if (w[k]) o[k] = String(w[k]); });
      return { web: o };
    }
  };
  // la version du profil (code changé, éduc désactivé…) : gardée avec l'abonnement ; si elle change, les alertes s'arrêtent
  function versionProfil(role, row) { return String(role === 'p' ? row.pinV : row.codeV); }
  function profilOk(ctx, role, id, v, memo) {
    var k = role + ':' + id;
    if (memo[k] === undefined) {
      var row = find(ctx.db.rows(role === 'p' ? 'joueurs' : role === 'f' ? 'familles' : 'educs'), id);
      memo[k] = row && (role === 'f' || row.actif) ? versionProfil(role, row) : null;
    }
    return memo[k] !== null && v !== undefined && v !== null && String(v) === memo[k];
  }
  function abonner(req, ctx) {
    var jeton = jetonPush(req), r = ctx.auth.r, qui = ctx.auth.id, cats = cleanCats(r, req.cats), now = isoNow(ctx.now), app = cleanText(req.appareil || '', 60);
    var rows = ctx.db.rows('push'), row = null, v = versionProfil(r, ctx.auth.row);
    rows.forEach(function (x) { if (x.jeton === jeton && x.role === r && x.qui === qui) row = x; });
    if (row) ctx.db.update('push', row.id, { cats: cats, appareil: app || row.appareil || '', vu: now, actif: true, v: v });
    else {
      // 10 appareils au plus par profil : le plus ancien laisse sa place
      var miens = rows.filter(function (x) { return x.role === r && x.qui === qui && x.actif; }).sort(function (a, b) { return String(a.vu) < String(b.vu) ? -1 : 1; });
      while (miens.length >= 10) ctx.db.update('push', miens.shift().id, { actif: false });
      ctx.db.insert('push', { id: genId(ctx.env), role: r, qui: qui, jeton: jeton, cats: cats, appareil: app, cree: now, vu: now, actif: true, v: v });
    }
    return { jeton: jeton, cats: cats };
  }
  A.pushAbonner = {
    auth: ['p', 'f', 'e'],
    run: function (req, ctx) { return { abonne: true, cats: abonner(req, ctx).cats }; }
  };
  A.pushDesabonner = {
    auth: ['p', 'f', 'e'],
    run: function (req, ctx) {
      var jeton = jetonPush(req);
      ctx.db.rows('push').forEach(function (x) { if (x.jeton === jeton && x.role === ctx.auth.r && x.qui === ctx.auth.id && x.actif) ctx.db.update('push', x.id, { actif: false, vu: isoNow(ctx.now) }); });
      return { abonne: false };
    }
  };
  // une alerte d'essai, sur CET appareil seulement (pas sur le téléphone de l'autre parent) ; il est réabonné au passage
  A.pushEssai = {
    auth: ['p', 'f', 'e'],
    run: function (req, ctx) {
      var a = abonner(req, ctx);
      alerter(ctx, { r: ctx.auth.r, qui: ctx.auth.id, soi: true, jeton: a.jeton }, '_essai', ctx.auth.r === 'p' ? 'Les alertes marchent sur ce téléphone 👍' : 'Les alertes Mode champion marchent sur cet appareil 👍');
      return { appareils: 1, envoi: !!ctx.env.envoyerPush };
    }
  };
  // dest : { r: 'p' | 'f' | 'e', qui: l'id du profil (tous les éducs si vide ; obligatoire pour un enfant ou une famille),
  //   sauf: un id à ne pas prévenir, soi: aussi l'auteur, jeton: un seul appareil, sujet: l'enfant concerné (une alerte par enfant) }
  function alerter(ctx, dest, cat, texte) {
    if (dest.r !== 'e' && !dest.qui) return;   // jamais « toutes les familles » par erreur (enfant sans famille…)
    (ctx.alertes = ctx.alertes || []).push({ r: dest.r, qui: dest.qui || '', sauf: dest.sauf || '', soi: !!dest.soi, jeton: dest.jeton || '', sujet: dest.sujet || '',
      cat: cat, texte: String(texte).slice(0, 180), lien: PUSH_LIENS[dest.r] || '' });
  }
  function titreEvt(ctx, compo) {
    var e = compo ? find(ctx.db.rows('evenements'), compo.evenementId) : null;
    return e && e.titre ? ' (« ' + cleanText(e.titre, 40) + ' »)' : '';
  }
  // ce qui part après chaque action (le résultat res de l'action est déjà là)
  var ALERTES = {
    logSession: function (req, ctx, res) {
      var j = ctx.auth.row, s = res.seance;
      if (!s) return;
      var t = j.prenom + ' a fait ' + (SEANCES_NOMS[s.type] || 'une séance') + '.';
      alerter(ctx, { r: 'e', sujet: j.id }, 'seance', t);
      alerter(ctx, { r: 'f', qui: j.familleId, sujet: j.id }, 'seance', t);
    },
    // (v36) le bravo d'un éduc : l'enfant et sa famille (le prénom de l'éduc ; jamais le mot lui-même sur l'écran verrouillé)
    bravo: function (req, ctx, res) {
      var b = res.bravo, s = b ? find(ctx.db.rows('seances'), b.seanceId) : null, j = s ? find(ctx.db.rows('joueurs'), s.joueurId) : null, nom = ctx.auth.row.nom;
      if (!s || !j) return;
      if (res.nouveau) {
        // une alerte par séance (sujet) : deux séances félicitées coup sur coup arrivent toutes les deux
        alerter(ctx, { r: 'p', qui: j.id, sujet: s.id }, 'bravo', '👏 ' + nom + ' te dit bravo ' + pourSeance(s.type, true) + ' !' + (b.mot ? ' Avec un petit mot.' : ''));
        alerter(ctx, { r: 'f', qui: j.familleId, sujet: s.id }, 'bravo', '👏 ' + nom + ' a dit bravo à ' + j.prenom + ' ' + pourSeance(s.type, false) + '.');
      } else if (ctx.bravoMot) {
        alerter(ctx, { r: 'p', qui: j.id, sujet: s.id }, 'bravo', '💬 ' + nom + ' t\'a laissé un mot ' + pourSeance(s.type, true) + '.');
      }
    },
    submitRecords: function (req, ctx, res) {
      var j = ctx.auth.row, n = ctx.nAttente || 0;   // seulement les résultats nouveaux ou changés (pas un bilan renvoyé tel quel)
      if (!n) return;
      var b = String(req.bilan), t = b === 'defi' ? j.prenom + ' a relevé un défi.' : j.prenom + ' a noté son Bilan ' + b + ' (' + n + ' résultat' + (n > 1 ? 's' : '') + ').';
      alerter(ctx, { r: 'f', qui: j.familleId, sujet: j.id }, 'confirmer', t + ' À confirmer.');
      alerter(ctx, { r: 'e', sujet: j.id }, 'bilan', t);
    },
    mission: function (req, ctx) {
      var j = ctx.auth.row, t = req.fin ? ' a répondu à « Avec qui tu aimes jouer ».' : req.postes !== undefined ? ' a répondu à « Choisis ton poste ».' : req.message !== undefined ? ' a écrit un mot pour les éducs.' : '';
      if (!t) return;
      alerter(ctx, { r: 'e', sujet: j.id }, 'mission', j.prenom + t);
      if (req.postes !== undefined) alerter(ctx, { r: 'f', qui: j.familleId, sujet: j.id }, 'mission', j.prenom + ' a fait la mission « Choisis ton poste ».');
    },
    repondreMission: function (req, ctx) {
      if (!ctx.missionFaite) return;
      var def = find(ctx.db.rows('defmissions'), String(req.missionId || ''));
      alerter(ctx, { r: 'e', sujet: ctx.auth.id }, 'mission', ctx.auth.row.prenom + ' a répondu à la mission « ' + cleanText(def && def.titre || 'Mission', 50) + ' ».');
    },
    demanderEtoile: function (req, ctx) { alerter(ctx, { r: 'e', sujet: ctx.auth.id }, 'etoile', ctx.auth.row.prenom + ' demande une étoile Skills.'); },
    updateMe: function (req, ctx) {
      var j = ctx.auth.row, n = (Array.isArray(req.journal) ? req.journal : []).filter(function (e) { return e && e.type === 'niveau'; }).length;
      if (n) alerter(ctx, { r: 'e', sujet: j.id }, 'niveau', j.prenom + ' a changé ' + (n > 1 ? 'des niveaux' : 'un niveau') + ' de sa prépa.');
    },
    setNiveaux: function (req, ctx, res) {
      var j = res.joueur, educ = ctx.auth.r === 'e', qui = educ ? ctx.auth.row.nom : 'sa famille';
      if (!j || !ctx.nChg) return;
      alerter(ctx, { r: 'p', qui: j.id }, 'niveau', 'Tes niveaux de prépa ont changé (' + (educ ? ctx.auth.row.nom : 'ta famille') + ').');
      if (educ) alerter(ctx, { r: 'f', qui: j.familleId, sujet: j.id }, 'niveau', 'Niveaux de ' + j.prenom + ' changés par ' + qui + '.');
      alerter(ctx, { r: 'e', sauf: educ ? ctx.auth.id : '', sujet: j.id }, 'niveau', 'Niveaux de ' + j.prenom + ' changés par ' + qui + '.');
    },
    confirm: function (req, ctx, res) {
      var par = {}, qui = ctx.auth.r === 'e' ? ctx.auth.row.nom : 'ta famille';
      (res.records || []).forEach(function (r) { var o = par[r.joueurId] = par[r.joueurId] || { ok: 0, no: 0 }; if (r.statut === 'ok') o.ok++; else o.no++; });
      Object.keys(par).forEach(function (id) {
        var o = par[id], t = (o.ok ? o.ok + ' résultat' + (o.ok > 1 ? 's' : '') + ' confirmé' + (o.ok > 1 ? 's' : '') : '') + (o.ok && o.no ? ', ' : '') + (o.no ? o.no + ' refusé' + (o.no > 1 ? 's' : '') : '');
        alerter(ctx, { r: 'p', qui: id }, 'resultat', 'Tes résultats : ' + t + ' par ' + qui + '.');
      });
    },
    saveCompo: function (req, ctx, res) {
      var c = res.compo;
      if (!c || c.statut !== 'vote' || !Array.isArray(req.versions)) return;
      alerter(ctx, { r: 'e', sauf: ctx.auth.id }, 'compo', ctx.auth.row.nom + ' demande votre vote sur une compo' + titreEvt(ctx, c) + '.');
    },
    voteCompo: function (req, ctx, res) {
      var c = res.compo;
      if (!c || c.auteur === ctx.auth.id) return;
      alerter(ctx, { r: 'e', qui: c.auteur }, 'compo', ctx.auth.row.nom + ' a voté sur votre compo' + titreEvt(ctx, c) + '.');
    },
    contreProposition: function (req, ctx, res) {
      var a = res.avis, c = a ? find(ctx.db.rows('compos'), a.compoId) : null;
      if (!c || c.auteur === ctx.auth.id) return;
      alerter(ctx, { r: 'e', qui: c.auteur }, 'compo', ctx.auth.row.nom + ' propose de modifier votre compo' + titreEvt(ctx, c) + '.');
    },
    repondreAvis: function (req, ctx, res) {
      var a = res.avis;
      if (!a || (a.statut !== 'acceptee' && a.statut !== 'refusee') || a.auteur === ctx.auth.id) return;
      alerter(ctx, { r: 'e', qui: a.auteur }, 'compo', ctx.auth.row.nom + (a.statut === 'acceptee' ? ' a accepté' : ' a refusé') + ' votre contre-proposition' + titreEvt(ctx, find(ctx.db.rows('compos'), a.compoId)) + '.');
    }
  };
  // les destinataires : les appareils abonnés au bon profil, encore valide (éduc actif, code pas changé), qui veulent cette
  // sorte ; jamais l'auteur lui-même, ni l'appareil d'où vient l'action (req.pj : l'enfant sur le téléphone du parent), sauf l'essai.
  function envoyerAlertes(ctx, req) {
    if (!ctx.alertes || !ctx.alertes.length || !ctx.env.envoyerPush) return;
    var memo = {}, rows = ctx.db.rows('push').filter(function (x) { return x.actif && x.jeton && profilOk(ctx, x.role, x.qui, x.v, memo); });
    if (!rows.length) return;
    var auteur = ctx.auth ? ctx.auth.r + ':' + ctx.auth.id : '', ici = String(req && req.pj || ''), vus = {}, msgs = [];
    ctx.alertes.forEach(function (a) {
      rows.forEach(function (x) {
        if (x.role !== a.r || (a.qui && x.qui !== a.qui) || (a.sauf && x.qui === a.sauf) || (a.jeton && x.jeton !== a.jeton)) return;
        if (!a.soi && (x.role + ':' + x.qui === auteur || (ici && x.jeton === ici))) return;
        if (a.cat.charAt(0) !== '_' && (!Array.isArray(x.cats) || x.cats.indexOf(a.cat) < 0)) return;
        var k = x.jeton + '|' + a.texte;
        if (vus[k]) return;
        vus[k] = 1;
        // tag : une alerte affichée par profil, sorte et enfant (la suivante remplace la précédente, pas celle d'un autre enfant)
        msgs.push({ id: x.id, jeton: x.jeton, cat: a.cat, tag: x.role + '-' + a.cat + (a.sujet ? '-' + a.sujet : ''), titre: 'Mode champion', texte: a.texte, lien: a.lien });
      });
    });
    if (!msgs.length) return;
    var morts = ctx.env.envoyerPush(msgs) || [];
    pushMorts(ctx.db, morts);
  }
  // les appareils qui n'existent plus (Firebase l'a dit) : désabonnés
  function pushMorts(db, ids) {
    (ids || []).forEach(function (id) { try { db.update('push', id, { actif: false }); } catch (e) { /* tant pis */ } });
  }

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
      // (v34) les alertes sur le téléphone : une erreur ici ne fait jamais échouer l'action
      try { if (ALERTES[req.action]) ALERTES[req.action](req, ctx, res); envoyerAlertes(ctx, req); } catch (e) { /* l'alerte est perdue, pas l'action */ }
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
    var row = { id: genId(env), nom: cleanText(nom || 'Admin', 30), codeHash: '', codeV: 1, admin: true, actif: true, cree: isoNow(ctx.now), pinHash: '' };
    var t = adultTemp(ctx, 'e', row.id);
    for (var k in t.patch) row[k] = t.patch[k];
    db.insert('educs', row);
    return { code: t.code, nom: row.nom };
  }
  // Nouveaux codes provisoires (4 chiffres, 30 jours) pour l'admin ou pour tous les adultes : fonctions de l'éditeur Apps Script.
  // Les sessions ouvertes restent ouvertes (codeV inchangé) ; les anciens codes à 6 chiffres ne servent plus.
  function codesProvisoires(db, env, quoi) {
    var ctx = { db: db, env: env, now: env.now(), secret: db.getProp('secret') }, out = [];
    var kids = db.rows('joueurs').filter(function (j) { return j.actif; });
    db.rows('educs').forEach(function (e) {
      if (!e.actif || (quoi !== 'tous' && (!e.admin || out.length))) return;   // 'admin' : le 1er admin seulement
      var t = adultTemp(ctx, 'e', e.id); t.patch.pinHash = ''; t.patch.codeHash = '';
      db.update('educs', e.id, t.patch);
      out.push({ role: 'e', id: e.id, nom: e.nom, admin: !!e.admin, code: t.code });
    });
    if (quoi === 'tous') db.rows('familles').forEach(function (f) {
      var enf = kids.filter(function (j) { return j.familleId === f.id; }).map(function (j) { return j.prenom; });
      if (!enf.length) return;
      var t = adultTemp(ctx, 'f', f.id); t.patch.pinHash = ''; t.patch.codeHash = '';
      db.update('familles', f.id, t.patch);
      // et ses enfants : un code provisoire chacun (même ceux qui avaient choisi le leur)
      var codesEnf = kids.filter(function (j) { return j.familleId === f.id; }).map(function (j) {
        var c = newKidTemp(env);
        db.update('joueurs', j.id, { tempHash: hashTemp(ctx.secret, j.id, c), tempExp: ctx.now + TEMP_ADULTE, mustChange: true, pinHash: '', fails: 0, lockUntil: 0 });
        return { id: j.id, prenom: j.prenom, code: c };
      });
      out.push({ role: 'f', id: f.id, nom: f.nom, enfants: enf, code: t.code, codesEnfants: codesEnf });
    });
    return { codes: out, expire: ctx.now + TEMP_ADULTE };
  }

  return {
    VERSION: '1.0',
    SCHEMA: SCHEMA,
    SKILLS: SKILLS, MAX_PLUS1: MAX_PLUS1,
    handle: handle,
    pushMorts: pushMorts,   // (v34) la partie Google désabonne les appareils morts, après l'envoi
    install: install,
    codesProvisoires: codesProvisoires,
    rowFromCells: rowFromCells,
    cellsFromRow: cellsFromRow,
    // outils exposés pour le mode démo et les tests
    _sha256: sha256, _hmac: hmac, _hashPin: hashPin, _hashTemp: hashTemp, _hashAdulte: hashAdulte, _hashPinA: hashPinA, _hashTempA: hashTempA, _pinFaible: pinFaible, _clone: clone,
    _posteDuTexte: posteDuTexte, _sansAccents: sansAccents,
    importPostesDepuis: function (db, env, rows) { return importPostes({ db: db, env: env, now: env.now() }, rows); },
    syncSpondDepuis: function (db, env, data) { return syncSpond({ db: db, env: env, now: env.now() }, data || {}); },
    _diffCompo: diffCompo
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Core;
