// Mock minimal de Google Apps Script pour tester Code.gs + core.js dans Node
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
function makeEnv(opts) {
  opts = opts || {};
  const sheets = {};
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.setNumberFormat = function () { return this; };
  Range.prototype.setFontWeight = function () { return this; };
  Range.prototype.setValues = function (v) {
    if (v.length !== this.nr || v[0].length !== this.nc) throw new Error('setValues dims ' + v.length + 'x' + v[0].length + ' vs ' + this.nr + 'x' + this.nc);
    for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i] || (this.sh.data[this.r - 1 + i] = []);
      for (let j = 0; j < this.nc; j++) { const val = v[i][j]; if (typeof val !== 'string') throw new Error('non-string cell ' + val); row[this.c - 1 + j] = val; } }
    return this;
  };
  Range.prototype.getDisplayValues = function () { const out = []; for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i] || []; const o = []; for (let j = 0; j < this.nc; j++) o.push(row[this.c - 1 + j] === undefined ? '' : String(row[this.c - 1 + j])); out.push(o);} return out; };
  Range.prototype.getDisplayValue = function () { return this.getDisplayValues()[0][0]; };
  function Sheet(name) { this.name = name; this.data = []; }
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getLastRow = function () { let n = 0; this.data.forEach((row, i) => { if (row && row.some(x => x !== undefined && x !== '')) n = i + 1; }); return n; };
  Sheet.prototype.getMaxRows = function () { return 1000; };
  Sheet.prototype.getLastColumn = function () { let n = 0; this.data.forEach(row => { if (row) row.forEach((x, j) => { if (x !== undefined && x !== '') n = Math.max(n, j + 1); }); }); return n; };
  Sheet.prototype.setFrozenRows = function () {};
  Sheet.prototype.deleteRow = function (r) { this.data.splice(r - 1, 1); };
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = new Sheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: s => { delete sheets[s.name]; }
  };
  sheets['Feuille 1'] = new Sheet('Feuille 1');
  const props = {};
  const cache = {}; const cstats = { gets: 0, puts: 0 };
  const cacheApi = {
    get: k => { cstats.gets++; return k in cache ? cache[k] : null; },
    getAll: ks => { const o = {}; ks.forEach(k => { if (k in cache) o[k] = cache[k]; }); return o; },
    put: (k, v) => { if (Buffer.byteLength(v) > 100000) throw new Error('cache value too big'); cache[k] = v; cstats.puts++; },
    putAll: (o) => { Object.keys(o).forEach(k => cacheApi.put(k, o[k])); },
    remove: k => { delete cache[k]; }
  };
  const logs = [];
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; }, getContent() { return s; } }) },
    Logger: { log: m => logs.push(String(m)) },
    CacheService: { getScriptCache: () => cacheApi },
    console, Date, Math, JSON
  };
  // Spond (fichier spond.gs) : appels HTTP simulés par opts.spond(url, params) → { code, body }
  const triggers = [];
  if (opts.spond) {
    ctx.UrlFetchApp = { fetch: (url, params) => { const r = opts.spond(url, params || {}); return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) }; } };
    // opts.sansDeclencheur : le propriétaire n'a pas encore autorisé les déclencheurs
    const pasAutorise = () => { if (opts.sansDeclencheur) throw new Error('You do not have permission to call ScriptApp.getProjectTriggers'); };
    ctx.ScriptApp = {
      getProjectTriggers: () => { pasAutorise(); return triggers.slice(); },
      deleteTrigger: t => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); },
      newTrigger: fn => ({ timeBased: () => ({ everyHours: h => ({ create: () => { const t = { fn, h, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) })
    };
  }
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('/home/claude/mode-champion/apps-script/serveur-mode-champion.gs', 'utf8'), ctx, { filename: 'serveur.gs' });
  if (opts.spond) vm.runInContext(fs.readFileSync('/home/claude/mode-champion/apps-script/spond.gs', 'utf8'), ctx, { filename: 'spond.gs' });
  ctx._triggers = triggers;
  ctx.call = (req) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(req) } }).getContent());
  ctx._sheets = sheets; ctx._logs = logs; ctx._props = props; ctx._cache = cache; ctx._cstats = cstats;
  return ctx;
}
module.exports = { makeEnv };
