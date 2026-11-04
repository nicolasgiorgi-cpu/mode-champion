// (v48) La liste Enfants tient sur une ligne : un homonyme y a son nom court (« Baptiste Lem. »), comme sur l'écran de connexion.
// Lancer : node tests/test_noms_courts.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
const c = J(K.nomsCourts([
  { id: '1', prenom: 'Baptiste Lemaire' }, { id: '2', prenom: 'Baptiste Moreau' },      // homonymes : 3 lettres suffisent
  { id: '3', prenom: 'Hugo Dupont' }, { id: '4', prenom: 'Hugo Dupuis' },               // il faut aller jusqu'à la 5e lettre
  { id: '5', prenom: 'Léa' }, { id: '6', prenom: 'Marie Lou' },                         // pas d'homonyme : tel quel (même un prénom composé)
  { id: '7', prenom: 'Tom Martin' }, { id: '8', prenom: 'Tom' }                         // un « Tom » seul et un « Tom Martin »
]));
assert.strictEqual(c['1'], 'Baptiste Lem.'); assert.strictEqual(c['2'], 'Baptiste Mor.');
assert.strictEqual(c['3'], 'Hugo Dupo.'); assert.strictEqual(c['4'], 'Hugo Dupu.');
assert.ok(!c['5'] && !c['6'], 'pas d\'homonyme : pas de nom court ' + JSON.stringify(c));
assert.strictEqual(c['7'], 'Tom Mar.'); assert.ok(!c['8']);
assert.deepStrictEqual(J(K.nomsCourts([])), {});
console.log('test_noms_courts : OK');
