/* =========================================================
   Mode champion · M12 — SERVEUR GOOGLE APPS SCRIPT
   À coller dans le projet Apps Script lié à la Google Sheet,
   avec le fichier Core.gs (copie de js/core.js).
   Voir README.md, partie « Google Sheets ».
   ========================================================= */

var TABLES = ['joueurs', 'familles', 'educs', 'seances', 'records', 'journal', 'missions', 'terrain', 'evenements', 'compos', 'avis', 'etoiles', 'encouragements', 'defmissions', 'demandes', 'push'];

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
  if (!sh && Core.SCHEMA[table]) sh = creerOnglet_(this.ss, table);   // nouvelle table ajoutée au programme : l'onglet se crée tout seul
  if (!sh) throw new Error('Onglet « ' + table + ' » introuvable : lance la fonction installer.');
  return sh;
};
function creerOnglet_(ss, table) {
  var sh = ss.insertSheet(table);
  var cols = Core.SCHEMA[table].map(function (c) { return c[0]; });
  var head = sh.getRange(1, 1, 1, cols.length);
  head.setNumberFormat('@');
  head.setValues([cols]);
  head.setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  return sh;
}
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
    rand: function (n) { return Math.floor(Math.random() * n); },
    formulairePostes: lireFormulairePostes_,
    // Spond : seulement si le fichier « spond.gs » a été ajouté au projet (il demande une autorisation de plus)
    spondFetch: typeof lireSpond_ === 'function' ? lireSpond_ : null,
    spondInfo: typeof spondInfo_ === 'function' ? spondInfo_ : null,
    // branché depuis l'appli par un éduc admin (e-mail et mot de passe gardés dans les propriétés du script)
    spondConnecter: typeof spondConnecter_ === 'function' ? spondConnecter_ : null,
    spondChoisir: typeof spondChoisir_ === 'function' ? spondChoisir_ : null,
    spondDebrancher: typeof spondDebrancher_ === 'function' ? spondDebrancher_ : null,
    // (v34) alertes sur le téléphone : seulement quand la clé Firebase (propriété FCM_CLE) est là
    envoyerPush: fcmCle_() ? envoyerPush_ : null
  };
}

/*
 * (v34) Alertes sur le téléphone, par Firebase Cloud Messaging (API HTTP v1).
 * Propriétés du script (Paramètres du projet › Propriétés du script), collées par Nicolas, jamais dans le dépôt :
 *   FCM_CLE : le fichier .json de la clé privée du compte de service Firebase (secret : ne le mettre nulle part ailleurs) ;
 *   FCM_WEB : la configuration Web de Firebase et la clé Web Push publique (pas secrète, l'appli l'envoie aux téléphones).
 * Le serveur signe un jeton (RS256) avec la clé, l'échange contre un jeton d'accès Google (gardé 50 min), puis envoie.
 * Une alerte de la même sorte au plus toutes les 10 minutes par appareil (le détail est dans la cloche de l'appli).
 * Un appareil qui n'existe plus (désinstallé, permission retirée) est désabonné tout seul.
 */
var FCM_PORTEE = 'https://www.googleapis.com/auth/firebase.messaging';
var FCM_PAUSE = 600;   // secondes entre deux alertes de la même sorte sur un appareil
function fcmCle_() {
  try {
    var c = JSON.parse(PropertiesService.getScriptProperties().getProperty('FCM_CLE') || 'null');
    return c && c.client_email && c.private_key && c.project_id ? c : null;
  } catch (e) { return null; }
}
function b64url_(x) { return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }
function fcmAcces_(cle) {
  var cs = CacheService.getScriptCache(), t = cs.get('fcm:acces');
  if (t) return t;
  var now = Math.floor(Date.now() / 1000);
  var tete = b64url_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var corps = b64url_(JSON.stringify({ iss: cle.client_email, scope: FCM_PORTEE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  var sig = b64url_(Utilities.computeRsaSha256Signature(tete + '.' + corps, cle.private_key));
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: tete + '.' + corps + '.' + sig }
  });
  if (r.getResponseCode() !== 200) throw new Error('Firebase : accès refusé (' + r.getResponseCode() + ')');
  t = JSON.parse(r.getContentText()).access_token;
  cs.put('fcm:acces', t, 3000);
  return t;
}
function cleFcm_(m) {
  return 'fcm:v:' + b64url_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, m.jeton + '|' + m.cat, Utilities.Charset.UTF_8)).slice(0, 43);
}
/** msgs : [{ id, jeton, cat, titre, texte, lien }] (préparés par Core). Renvoie les id des abonnements morts. */
function envoyerPush_(msgs) {
  var cle = fcmCle_();
  if (!cle || !msgs || !msgs.length) return [];
  var cs = CacheService.getScriptCache(), cles = msgs.map(cleFcm_), deja = cs.getAll(cles), garde = [];
  msgs.forEach(function (m, i) { if (m.cat.charAt(0) === '_' || !deja[cles[i]]) garde.push(i); });   // l'essai passe toujours
  if (!garde.length) return [];
  var acces = fcmAcces_(cle), url = 'https://fcm.googleapis.com/v1/projects/' + cle.project_id + '/messages:send';
  var reqs = garde.map(function (i) {
    var m = msgs[i];
    return {
      url: url, method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + acces },
      // uniquement des données : c'est sw.js qui affiche l'alerte (toujours, sinon iOS coupe l'abonnement)
      payload: JSON.stringify({ message: { token: m.jeton, data: { titre: m.titre, texte: m.texte, lien: m.lien, tag: m.cat }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } } })
    };
  });
  var reps = UrlFetchApp.fetchAll(reqs), morts = [], pose = {};
  reps.forEach(function (r, j) {
    var i = garde[j], code = r.getResponseCode();
    if (code === 200) { if (msgs[i].cat.charAt(0) !== '_') pose[cles[i]] = '1'; }
    else if (code === 404 || /UNREGISTERED/.test(r.getContentText())) morts.push(msgs[i].id);
    else if (code === 401) cs.remove('fcm:acces');
  });
  if (Object.keys(pose).length) cs.putAll(pose, FCM_PAUSE);
  return morts;
}

/** À lancer depuis l'éditeur après avoir collé FCM_CLE et FCM_WEB : vérifie que Firebase accepte la clé (rien n'est envoyé). */
function verifierAlertes() {
  var cle = fcmCle_();
  if (!cle) { Logger.log('❌ Propriété FCM_CLE absente ou illisible : collez tout le contenu du fichier .json de la clé privée.'); return; }
  var web = null;
  try { web = JSON.parse(PropertiesService.getScriptProperties().getProperty('FCM_WEB') || 'null'); } catch (e) { web = null; }
  if (!web || !web.vapidKey || !web.apiKey) Logger.log('❌ Propriété FCM_WEB absente ou incomplète.');
  CacheService.getScriptCache().remove('fcm:acces');
  try { fcmAcces_(cle); Logger.log('✅ Firebase accepte la clé du projet « ' + cle.project_id + ' ».' + (web && web.vapidKey ? ' FCM_WEB est là.' : '')); }
  catch (e) { Logger.log('❌ ' + e.message); }
}

/**
 * Réponses de l'ancien site « Choisis ton poste » : le Google Form « M12 - 26/27 - Choix de postes » range ses réponses
 * dans un onglet de CETTE feuille (Google Forms › Réponses › Associer à Sheets › feuille existante).
 * On reconnaît l'onglet à ses colonnes « Prénom » et « Choix 1 ». Renvoie null s'il n'y est pas.
 */
function lireFormulairePostes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  function n(s) { return Core._sansAccents(s); }
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (TABLES.indexOf(sh.getName()) >= 0) continue;
    var lc = sh.getLastColumn(), lr = sh.getLastRow();
    if (lc < 3) continue;
    var head = sh.getRange(1, 1, 1, lc).getDisplayValues()[0].map(n);
    var col = { prenom: -1, nom: -1, c1: -1, c2: -1, c3: -1, test: -1, message: -1 };
    head.forEach(function (h, j) {
      if (/^prenom/.test(h)) col.prenom = j;
      else if (/^nom\b/.test(h)) col.nom = j;
      else if (/^choix\s*1/.test(h)) col.c1 = j;
      else if (/^choix\s*2/.test(h)) col.c2 = j;
      else if (/^choix\s*3/.test(h)) col.c3 = j;
      else if (/^message|mot pour/.test(h)) col.message = j;   // « Un mot pour les éducs »
      else if (/aide-moi|test/.test(h)) col.test = j;
    });
    if (col.prenom < 0 || col.c1 < 0) continue;
    if (lr < 2) return [];
    var vals = sh.getRange(2, 1, lr - 1, lc).getDisplayValues();
    return vals.filter(function (r) { return r[col.prenom]; }).map(function (r) {
      return {
        prenom: r[col.prenom], nom: col.nom >= 0 ? r[col.nom] : '',
        choix: [r[col.c1], col.c2 >= 0 ? r[col.c2] : '', col.c3 >= 0 ? r[col.c3] : ''],
        test: col.test >= 0 ? r[col.test] : '',
        message: col.message >= 0 ? r[col.message] : ''
      };
    });
  }
  return null;
}

/** À lancer depuis l'éditeur pour reprendre les réponses du formulaire « Choix de postes » (les éducs ont aussi un bouton dans l'appli). */
function reprendreChoixDePostes() {
  var db = new SheetDB_();
  var rows = lireFormulairePostes_();
  if (!rows) { Logger.log('Onglet des réponses introuvable : dans Google Forms, Réponses › Associer à Sheets › cette feuille.'); return; }
  var info = Core.importPostesDepuis(db, env_(), rows);
  db.flush_();
  Logger.log('Réponses lues : ' + info.reponses + ' · enfants reconnus : ' + info.enfants + ' · repris : ' + info.importes + ' · mots pour les éducs : ' + (info.mots || 0) +
    (info.gardes.length ? ' · déjà choisi dans l\'appli : ' + info.gardes.join(', ') : '') +
    (info.inconnus.length ? ' · pas trouvés : ' + info.inconnus.join(', ') : '') +
    (info.ambigus.length ? ' · homonymes à vérifier : ' + info.ambigus.join(', ') : ''));
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
    Logger.log('👉 Code provisoire administrateur (Adultes › Je suis éduc › votre nom, puis ce code ; vous choisirez ensuite le vôtre) : ' + res.code);
    Logger.log('Note-le bien : il ne sera plus affiché. Pour en avoir un nouveau : fonction nouveauCodeAdmin.');
  } else {
    Logger.log('Déjà installé (admin : ' + res.nom + '). Pour un nouveau code : fonction nouveauCodeAdmin.');
  }
}

/** Si le code administrateur est perdu : lance cette fonction, un code provisoire (4 chiffres, 30 jours) s'affiche dans le journal.
    À la connexion (Adultes › Je suis éduc › son nom › ce code), l'admin choisit son propre code. */
function nouveauCodeAdmin() {
  var db = new SheetDB_();
  if (!db.rows('educs').some(function (x) { return x.admin && x.actif; })) { installer(); return; }
  var r = Core.codesProvisoires(db, env_(), 'admin');
  db.flush_();
  r.codes.forEach(function (c) { Logger.log('👉 Code provisoire administrateur pour « ' + c.nom + ' » : ' + c.code); });
}

/** Codes provisoires (4 chiffres, 30 jours) pour TOUS : chaque éduc, chaque famille qui a un enfant inscrit, et chaque enfant.
    Les anciens codes à 6 chiffres ne servent plus. À la 1re connexion, chacun choisit son propre code à 4 chiffres.
    La liste s'affiche dans le journal : à transmettre à chacun (ne pas la garder dans un fichier partagé). */
function nouveauxCodesAdultes() {
  var db = new SheetDB_();
  var r = Core.codesProvisoires(db, env_(), 'tous');
  db.flush_();
  var d = new Date(r.expire), z = function (n) { return (n < 10 ? '0' : '') + n; };
  Logger.log('Codes provisoires valables jusqu\'au ' + z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' :');
  r.codes.forEach(function (c) {
    Logger.log(c.role === 'e' ? 'ÉDUC ' + c.nom + (c.admin ? ' (admin)' : '') + ' : ' + c.code : 'FAMILLE ' + c.nom + ' (' + c.enfants.join(', ') + ') : ' + c.code + ' | ' + c.codesEnfants.map(function (k) { return k.prenom + ' ' + k.code; }).join(' | '));
  });
}

/** Après une modification faite à la main dans la feuille : lance cette fonction pour que le site la voie tout de suite. */
function viderCache() {
  var cs = CacheService.getScriptCache();
  TABLES.forEach(function (t) { cs.remove('t:' + t); });
  Logger.log('Cache vidé : le site relit la feuille.');
}
