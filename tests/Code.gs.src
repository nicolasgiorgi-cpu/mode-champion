/* =========================================================
   Mode champion · M12 — SERVEUR GOOGLE APPS SCRIPT
   À coller dans le projet Apps Script lié à la Google Sheet,
   avec le fichier Core.gs (copie de js/core.js).
   Voir README.md, partie « Google Sheets ».
   ========================================================= */

var TABLES = ['joueurs', 'familles', 'educs', 'seances', 'records', 'journal'];

/** Petit adaptateur : les onglets de la feuille servent de tables. Tout est stocké en texte. */
function SheetDB_() {
  this.ss = SpreadsheetApp.getActiveSpreadsheet();
  this.cache = {};
  this.props = PropertiesService.getScriptProperties();
}
SheetDB_.prototype.sheet = function (table) {
  var sh = this.ss.getSheetByName(table);
  if (!sh) throw new Error('Onglet « ' + table + ' » introuvable : lance la fonction installer.');
  return sh;
};
SheetDB_.prototype.rows = function (table) {
  if (this.cache[table]) return this.cache[table];
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
  this.cache[table] = out;
  return out;
};
SheetDB_.prototype.writeRow_ = function (table, rowIndex, obj) {
  var sh = this.sheet(table);
  var cells = Core.cellsFromRow(table, obj);
  var rg = sh.getRange(rowIndex, 1, 1, cells.length);
  rg.setNumberFormat('@');
  rg.setValues([cells]);
};
SheetDB_.prototype.insert = function (table, obj) {
  var sh = this.sheet(table);
  var rowIndex = Math.max(sh.getLastRow(), 1) + 1;
  this.writeRow_(table, rowIndex, obj);
  var copy = JSON.parse(JSON.stringify(obj));
  copy._row = rowIndex;
  if (this.cache[table]) this.cache[table].push(copy);
};
SheetDB_.prototype.update = function (table, id, patch) {
  var rows = this.rows(table);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      for (var k in patch) rows[i][k] = patch[k];
      this.writeRow_(table, rows[i]._row, rows[i]);
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
  try {
    return json_(Core.handle(req, new SheetDB_(), env_()));
  } finally {
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
  var res = Core.install(new SheetDB_(), env_(), 'Admin');
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
  Logger.log('👉 Nouveau code administrateur pour « ' + admins[0].nom + ' » : ' + code);
}
