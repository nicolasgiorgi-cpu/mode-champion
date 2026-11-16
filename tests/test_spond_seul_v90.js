// (v90) Décision de Nicolas du 16/11/2026 : « avec la prise en compte des réponses au fur et à mesure dans Spond et la création des
// équipes avant d'avoir les réponses dans Spond, on n'a plus besoin du mécanisme d'ajout des présents à la main dans l'appli ».
// Un événement Spond : les présences viennent de Spond seulement ; d'anciennes corrections à la main (ajouts, retraits) ne comptent
// plus. Un événement ajouté à la main garde ses cochés.
// Lancer : node tests/test_spond_seul_v90.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions', 'competences', 'compos', 'notifs']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const K = ctx.MC.compos, N = ctx.MC.notifs, J = x => JSON.parse(JSON.stringify(x));
ctx.MC.logic._setToday('2026-11-16');
// Spond : les ajouts et retraits faits à la main avant la v90 sont ignorés
const sp = { id: 'e1', source: 'spond', debut: '2026-11-18T16:30:00Z', presents: ['a', 'b'], absents: ['c'], sansReponse: ['d', 'e'], ajouts: ['d'], retraits: ['b'] };
assert.deepStrictEqual(J(K.presents(sp)), ['a', 'b'], 'Spond : ses « oui » seulement');
assert.deepStrictEqual(J(K.attente(sp)), ['d', 'e'], 'Spond : ses « pas répondu »');
// à la main : les cochés et les corrections comptent toujours
const mn = { id: 'e2', source: 'manuel', presents: ['a', 'b'], absents: [], sansReponse: [], ajouts: ['d'], retraits: ['b'] };
assert.deepStrictEqual(J(K.presents(mn)), ['a', 'd']);
// la cloche : un enfant « retiré à la main » d'un événement Spond n'est pas signalé absent ; un vrai « non » Spond, si
const joueur = (id, prenom) => ({ joueur: { id, prenom, actif: true }, seances: [], records: [], journal: [], missions: [], etoiles: [], encouragements: [], demandes: [] });
const g = { moi: { id: 'ed1', nom: 'Nico' }, defmissions: [], joueurs: [joueur('a', 'Léo'), joueur('b', 'Tom'), joueur('c', 'Sacha')] };
const cd = { educs: [{ id: 'ed1', nom: 'Nico' }], avis: [], evenements: [Object.assign({ titre: 'Entraînement - Lézat', sorte: 'entrainement' }, sp)],
  compos: [{ id: 'c1', evenementId: 'e1', partie: 'ateliers', statut: 'publiee', auteur: 'ed1', equipes: [{ id: 'A1', joueurs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }], cree: '2026-11-15T10:00:00Z', maj: '2026-11-15T10:00:00Z' }] };
const L = N.events('e', { group: g, compos: cd }).filter(x => /^ca:/.test(x.id));
assert.ok(L.length === 1 && /^<b>Sacha<\/b> ne vient plus/.test(L[0].txt), JSON.stringify(L));
// (relecture v90) une séance d'avant le 16/11 garde ses corrections à la main (l'historique des compos s'en sert)
const vieux = Object.assign({}, sp, { id: 'e0', debut: '2026-11-11T16:30:00Z' });
assert.deepStrictEqual(J(K.presents(vieux)), ['a', 'd'], 'avant le 16/11 : ajouts et retraits comptent toujours');
// l'historique (aJoue, via K.historique) suit K.presents : un retiré à la main d'une séance Spond depuis le 16/11 a joué
const F = { a: { id: 'a', niveau: 'B' }, b: { id: 'b', niveau: 'B' }, d: { id: 'd', niveau: 'B' } };
const comp = (ev) => ({ id: 'c-' + ev.id, evenementId: ev.id, partie: 'ateliers', statut: 'publiee', reglages: {}, equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'a' }, { id: 'b' }, { id: 'd' }] }] });
const evs = {}; evs.e1 = Object.assign({ sorte: 'entrainement' }, sp, { debut: '2026-11-18T16:30:00Z' }); evs.e0 = Object.assign({ sorte: 'entrainement' }, vieux);
const H1 = K.historique([comp(evs.e1)], evs, F, '2026-11-20'), H0 = K.historique([comp(evs.e0)], evs, F, '2026-11-20');
const nb = (H, id) => (H[id] || {}).entrainements || 0;
assert.strictEqual(nb(H1, 'b'), 1, 'depuis le 16/11 : Tom (retiré à la main avant, « oui » sur Spond) a joué');
assert.strictEqual(nb(H0, 'b'), 0, 'avant le 16/11 : le retiré à la main n\'a pas joué');
assert.strictEqual(nb(H0, 'd'), 1, 'avant le 16/11 : l\'ajouté à la main a joué');
console.log('test_spond_seul_v90 : OK');
