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
// (v49) hors de son niveau : par sa passerelle, ou pour équilibrer les effectifs (dit dans les raisons)
ids.forEach(id => assert.ok(ou[id] === F[id].niveau || K.pasDe(F[id]).indexOf(ou[id]) >= 0 || /équilibrer/.test(p.raisons[id] || ''), id + ' en ' + ou[id]));
const tl = p.equipes.map(t => t.joueurs.length); assert.ok(Math.max(...tl) - Math.min(...tl) <= 1, '(v49) effectifs équilibrés : ' + tl);

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

// ----- pas d'équipe de son niveau : le niveau le plus proche (une passerelle ne fait pas sauter un niveau) -----
const P1 = {};
function addP(id, niveau, pas) { P1[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage: 2, voeux: [], postesOk: [], copains: [] }; }
['a1', 'a2'].forEach(id => addP(id, 'A')); P1.a3 = null; delete P1.a3; addP('a3', 'A', 'C');
['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].forEach(id => addP(id, 'B'));
['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].forEach(id => addP(id, 'C'));
let r1 = K.proposer(Object.keys(P1), P1, {}, { format: 5, nb: { A: 0, B: 1, C: 1 } });
let o1 = {}; r1.equipes.forEach(t => t.joueurs.forEach(j => { o1[j.id] = t.niveau; }));
assert.strictEqual(o1.a3, 'B', 'pas d\'équipe A : un A avec ⇅C joue en B comme les autres A');
const P2 = JSON.parse(JSON.stringify(P1)); P2.b1.passerelle = 'A'; P2.b2.passerelle = '';
r1 = K.proposer(Object.keys(P2), P2, {}, { format: 5, nb: { A: 1, B: 0, C: 1 } });
o1 = {}; r1.equipes.forEach(t => t.joueurs.forEach(j => { o1[j.id] = t.niveau; }));
// (v49) pas d'équipe B, 3 Confirmés seulement : l'équipe A est complétée pour équilibrer, d'abord par des B (plus proches que les C)
const enA = r1.equipes.find(t => t.niveau === 'A').joueurs.map(j => j.id), enC = r1.equipes.find(t => t.niveau === 'C').joueurs.map(j => j.id);
assert.ok(Math.abs(enA.length - enC.length) <= 1, 'effectifs équilibrés : ' + enA.length + '/' + enC.length);
assert.ok(enA.every(id => !/^c/.test(id)), 'pas de Débutant monté en A tant qu\'il y a des B : ' + enA);
assert.strictEqual(o1.b1, 'A', 'pas d\'équipe B : un B avec ⇅A joue en A');

// ----- les passerelles vers le niveau voisin d'abord : un Débrouillé monte en A avant un Débutant -----
const P3 = {};
function add3(id, niveau, pas) { P3[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage: 2, voeux: [], postesOk: [], copains: [] }; }
['a1', 'a2', 'a3', 'a4', 'a5'].forEach(id => add3(id, 'A'));
['b1', 'b2', 'b3', 'b4', 'b5'].forEach(id => add3(id, 'B')); P3.b1.passerelle = 'A';
['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'].forEach(id => add3(id, 'C')); ['c1', 'c2', 'c3', 'c4'].forEach(id => { P3[id].passerelle = 'AB'; });
const r3 = K.proposer(Object.keys(P3), P3, {}, { format: 5, nb: { A: 1, B: 1, C: 1 } });
const o3 = {}; r3.equipes.forEach(t => t.joueurs.forEach(j => { o3[j.id] = t.niveau; }));
assert.strictEqual(o3.b1, 'A', 'le B avec ⇅A monte en A : ' + JSON.stringify(o3));
assert.ok(['c1', 'c2', 'c3', 'c4'].filter(id => o3[id] === 'A').length <= 1, 'les C ne passent pas devant : ' + JSON.stringify(o3));

// ----- la rotation se compte par niveau : un B avec ⇅A et ⇅C qui a déjà joué en C attend encore son tour en A -----
const R = {};
['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach(id => { R[id] = { id, prenom: id, niveau: 'A', passerelle: '', plaquage: 2, voeux: [], postesOk: [], copains: [] }; });
['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].forEach(id => { R[id] = { id, prenom: id, niveau: 'B', passerelle: '', plaquage: 2, voeux: [], postesOk: [], copains: [] }; });
R.b1.passerelle = 'AC';
const HR = { b1: { plateaux: 1, autre: 1, dernierAutre: '2026-10-10', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [{ date: '2026-10-10', niveau: 'C', autre: true }] } };
const rr = K.proposer(Object.keys(R), R, HR, { format: 5, nb: { A: 1, B: 1, C: 0 }, opts: { passerelles: 'niveau' } });   // (v56) par niveau : l'équipe A pleine, personne ne monte
const al = K.alertes(rr, R, HR).filter(a => a.k === 'rotation');
assert.ok(al.length && /b1 \(B→A\)/.test(al[0].texte), 'alerte : ' + JSON.stringify(al));

console.log('test_passerelles : OK');
