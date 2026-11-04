// (v45) Deux passerelles possibles par enfant, vers n'importe quel autre niveau (décision de Nicolas, 04/11) :
// lecture de la fiche (lettres 'AC'…), « peut jouer en », proposition automatique, alerte de rotation, tri.
// Lancer : node tests/test_passerelles.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));

// ----- la fiche : lettres dans l'ordre, jamais son niveau, aucune sans niveau -----
function joueur(id, terrain) { return { joueur: { id, prenom: id, actif: true }, terrain, missions: [] }; }
const FF = K.fiches({ joueurs: [
  joueur('b2', { niveau: 'B', passerelle: 'CA' }),
  joueur('a1', { niveau: 'A', passerelle: 'C' }),
  joueur('c2', { niveau: 'C', passerelle: 'ABC' }),
  joueur('sans', { niveau: '', passerelle: 'A' }),
  joueur('ancien', { niveau: 'B', passerelle: 'A' }),
] });
assert.deepStrictEqual(J(FF.b2.passerelles), ['A', 'C'], 'un B : vers A et C');
assert.strictEqual(FF.b2.passerelle, 'AC');
assert.deepStrictEqual(J(FF.a1.passerelles), ['C'], 'un A : vers C (plus seulement le voisin)');
assert.deepStrictEqual(J(FF.c2.passerelles), ['A', 'B'], 'un C : jamais vers son niveau');
assert.deepStrictEqual(J(FF.sans.passerelles), [], 'sans niveau : pas de passerelle');
assert.deepStrictEqual(J(FF.ancien.passerelles), ['A'], 'une fiche d\'avant la v45 se lit pareil');
assert.ok(K.joueEn(FF.b2, 'A') && K.joueEn(FF.b2, 'B') && K.joueEn(FF.b2, 'C'));
assert.ok(K.joueEn(FF.a1, 'C') && !K.joueEn(FF.a1, 'B'));
// une fiche construite à la main (tests, démo) : la chaîne suffit
assert.deepStrictEqual(J(K.pasDe({ niveau: 'B', passerelle: 'AC' })), ['A', 'C']);

// ----- la proposition : un C avec une passerelle vers A comble le manque en A (n'importe quel niveau) -----
const F = {};
function add(id, niveau, plaquage, pas) { F[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage, voeux: [], postesOk: [], copains: [] }; }
['a1', 'a2', 'a3', 'a4'].forEach((id) => add(id, 'A', 3));
['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].forEach((id) => add(id, 'B', 2));
['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'].forEach((id) => add(id, 'C', 1));
F.c1.passerelle = 'A';                         // un C qui peut monter en A (pas le niveau voisin)
const ids = Object.keys(F);
const p = K.proposer(ids, F, {}, { format: 5, nb: { A: 1, B: 1, C: 1 } });
const ou = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { ou[j.id] = t.niveau; }));
assert.strictEqual(ou.c1, 'A', 'c1 joue en A grâce à sa passerelle : ' + JSON.stringify(p.raisons && p.raisons.c1));
ids.forEach(id => assert.ok(ou[id] === F[id].niveau || K.pasDe(F[id]).indexOf(ou[id]) >= 0, id + ' en ' + ou[id]));

// ----- deux passerelles : un B qui peut aller en A ou en C, selon le manque -----
const G = {};
function addG(id, niveau, pas) { G[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage: 2, voeux: [], postesOk: [], copains: [] }; }
['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach(id => addG(id, 'A'));
['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'].forEach(id => addG(id, 'B'));
['c1', 'c2', 'c3', 'c4'].forEach(id => addG(id, 'C'));
G.b1.passerelle = 'AC';
const q = K.proposer(Object.keys(G), G, {}, { format: 5, nb: { A: 1, B: 1, C: 1 } });
const ouG = {}; q.equipes.forEach(t => t.joueurs.forEach(j => { ouG[j.id] = t.niveau; }));
assert.strictEqual(ouG.b1, 'C', 'b1 (passerelles A et C) va combler le manque en C');

// ----- l'alerte de rotation cite ses deux passerelles -----
const al = K.alertes(q, G, {}).filter(a => a.k === 'rotation');
if (al.length) assert.ok(!/undefined/.test(al[0].texte), al[0].texte);

console.log('test_passerelles : OK');
