// (v49) Des équipes de plateau aux effectifs équilibrés, réglables équipe par équipe (demande de Nicolas, 05/11 :
// « j'ai demandé A B C et ça me donne des équipes de 10, 13 et 6 enfants, il faut que le nombre d'enfants soit équilibré »).
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_effectifs.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
function groupe(spec) {
  const F = {};
  spec.forEach(([id, niveau, plaquage, pas]) => { F[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage, voeux: [], postesOk: [], copains: [] }; });
  return F;
}
const tailles = (p) => J(p.equipes.map(t => t.id + ':' + t.joueurs.length));
const ou = (p) => { const o = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { o[j.id] = t.id; })); return o; };

// le cas de Nicolas : 10 Confirmés, 13 Débrouillés, 6 Débutants, une équipe par niveau, aucune passerelle
const spec = [];
for (let i = 0; i < 10; i++) spec.push(['a' + i, 'A', [3, 2, 3][i % 3]]);
for (let i = 0; i < 13; i++) spec.push(['b' + (i < 10 ? '0' : '') + i, 'B', i < 3 ? 1 : 2]);   // b00, b01, b02 : les moins bons plaqueurs B
for (let i = 0; i < 6; i++) spec.push(['c' + i, 'C', 1]);
const F = groupe(spec), ids = Object.keys(F), reg = { format: 5, nb: { A: 1, B: 1, C: 1 } };
assert.deepStrictEqual(J(K.taillesDefaut(ids, F, reg)), { A1: 10, B1: 10, C1: 9 }, 'par défaut : 29 en 3 équipes, la place en trop aux niveaux les plus nombreux');
let p = K.proposer(ids, F, {}, reg, '2026-11-05', 'equilibre');
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9'], 'équilibré (avant : 10, 13, 6)');
['b00', 'b01', 'b02'].forEach(id => { assert.strictEqual(ou(p)[id], 'C1', id + ' : les moins avancés des B descendent'); assert.ok(/équilibrer/.test(p.raisons[id]), p.raisons[id]); });
p = K.proposer(ids, F, {}, reg, '2026-11-05', 'copains');
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9'], 'Copains d\'abord : équilibré aussi');
p = K.proposer(ids, F, {}, reg, '2026-11-05', 'strict');
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:13', 'C1:6'], 'Niveaux stricts : les effectifs suivent les niveaux');

// des tailles réglées à la main
p = K.proposer(ids, F, {}, Object.assign({}, reg, { tailles: { A1: 10, B1: 12, C1: 7 } }), '2026-11-05', 'equilibre');
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:12', 'C1:7'], 'les tailles demandées');
p = K.proposer(ids, F, {}, Object.assign({}, reg, { tailles: { A1: 12, B1: 12, C1: 12 } }), '2026-11-05', 'equilibre');
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9'], 'un total faux (36 pour 29) : les tailles par défaut');
assert.deepStrictEqual(J(K.tailles(ids, F, Object.assign({}, reg, { tailles: { A1: 10, B1: 12 } }))), { A1: 10, B1: 10, C1: 9 }, 'une équipe oubliée : par défaut');
// deux équipes dans un niveau, de tailles différentes
const r2 = { format: 5, nb: { A: 1, B: 2, C: 0 }, tailles: { A1: 9, B1: 12, B2: 8 } };
p = K.proposer(ids, F, {}, r2, '2026-11-05', 'equilibre');
assert.deepStrictEqual(tailles(p), ['A1:9', 'B1:12', 'B2:8']);
// la rotation : à plaquage égal, celui qui est déjà descendu en C la dernière fois reste en B
const G = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['b1', 'B', 2], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 2], ['b5', 'B', 2], ['c1', 'C', 1]]);
const HG = { b1: { plateaux: 1, autre: 1, dernierAutre: '2026-10-25', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [{ date: '2026-10-25', niveau: 'C', autre: true }] } };
p = K.proposer(Object.keys(G), G, HG, { format: 5, nb: { A: 1, B: 1, C: 1 } }, '2026-11-05', 'equilibre');
assert.deepStrictEqual(tailles(p), ['A1:3', 'B1:3', 'C1:3']);
assert.strictEqual(ou(p).b1, 'B1', 'b1 est descendu la dernière fois : il reste en B');
// « A forte » avec des tailles
p = K.proposer(ids, F, {}, { format: 5, nb: { A: 1, B: 1, C: 1 }, style: 'aforte', tailles: { A1: 8, B1: 11, B2: 10 } }, '2026-11-05', 'aforte');
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:11', 'B2:10']);

// ----- serveur : les tailles sont gardées avec la compo du plateau -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const P = {};
['Tom', 'Léa', 'Hugo'].forEach(n => { r = g.call({ action: 'addPlayer', token: tok, prenom: n, familleNom: 'Famille ' + n }); P[n] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-11-21', sorte: 'plateau', presents: [P.Tom, P['Léa'], P.Hugo] });
r = g.call({ action: 'saveCompo', token: tok, evenementId: r.evenement.id, reglages: { format: 5, nb: { A: 1, B: 1 }, style: 'equilibre', tailles: { A1: 1, B1: 2, Z9: 3, C1: 99 } },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P['Léa'] }, { id: P.Hugo }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.reglages.tailles, { A1: 1, B1: 2 }, 'gardées (les équipes inconnues et les valeurs hors bornes sont écartées)');

console.log('test_effectifs : OK');
