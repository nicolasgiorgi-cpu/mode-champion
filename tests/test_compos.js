// Règles des compos d'équipes (js/compos.js) : proposition automatique, passerelles, plaquage, copains, postes, alertes.
// Lancer : node tests/test_compos.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = '/home/claude/mode-champion/js';
vm.runInContext(fs.readFileSync(path.join(ROOT, 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));

// ----- un groupe fictif de 26 présents -----
const F = {};
function add(id, niveau, plaquage, o) { F[id] = Object.assign({ id, prenom: id, niveau, passerelle: '', plaquage, voeux: [], postesOk: [], copains: [] }, o || {}); }
['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach((id, i) => add(id, 'A', [5, 5, 4, 4, 4, 3, 3][i]));
['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'].forEach((id, i) => add(id, 'B', [4, 4, 3, 3, 3, 3, 2, 2, 2, 3, 1, 2][i]));
['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].forEach((id, i) => add(id, 'C', [2, 1, 1, 0, 0, 2, 1][i]));
F.b1.passerelle = 'A'; F.b2.passerelle = 'A'; F.a7.passerelle = 'B'; F.c1.passerelle = 'B';
// copains (secrets, choisis par les enfants)
F.b3.copains = ['b4']; F.b4.copains = ['b3', 'b5']; F.b5.copains = ['b6']; F.b7.copains = ['b8']; F.b9.copains = ['b10', 'a1'];
F.c2.copains = ['c3']; F.c4.copains = ['c5'];
const ids = Object.keys(F);
assert.strictEqual(ids.length, 26);

// ----- nombre d'équipes conseillé (jeu à 5 : équipes de 7 environ) -----
let nb = K.suggestNb(ids, F, 5);
assert.deepStrictEqual(J(nb), { A: 1, B: 2, C: 1 }, JSON.stringify(nb));
assert.deepStrictEqual(J(K.teamIds(nb)), ['A1', 'B1', 'B2', 'C1']);

// ----- proposition -----
let H = {};
let p = K.proposer(ids, F, H, { format: 5, nb });
const where = {};
p.equipes.forEach(t => t.joueurs.forEach(j => { assert.ok(!where[j.id], 'placé deux fois ' + j.id); where[j.id] = t; }));
assert.strictEqual(Object.keys(where).length, 26, 'tout le monde est placé');
// chacun dans son niveau ou dans celui de sa passerelle
ids.forEach(id => { const t = where[id]; assert.ok(t.niveau === F[id].niveau || t.niveau === F[id].passerelle, id + ' en ' + t.id); });
// effectifs : 26 joueurs / 4 équipes → 6 ou 7 partout
p.equipes.forEach(t => assert.ok(t.joueurs.length >= 6 && t.joueurs.length <= 7, t.id + ' ' + t.joueurs.length));
// plaquage équilibré entre B1 et B2
const sB = p.equipes.filter(t => t.niveau === 'B').map(t => K.stats(t, F, 5));
assert.ok(Math.abs(sB[0].plaq - sB[1].plaq) < 0.6, 'écart de plaquage B ' + sB[0].plaq + ' / ' + sB[1].plaq);
// copains : b3 et b4 ensemble, b7 avec b8
assert.strictEqual(where.b3.id, where.b4.id, 'b3 avec b4');
assert.strictEqual(where.b7.id, where.b8.id, 'b7 avec b8');
// le niveau principal est gardé pour l'historique
assert.strictEqual(p.equipes[0].joueurs.find(j => j.id === 'a1').n, 'A');
// même entrée → même résultat
assert.strictEqual(JSON.stringify(K.proposer(ids, F, H, { format: 5, nb }).equipes), JSON.stringify(p.equipes));

// ----- passerelles : elles comblent les écarts, à tour de rôle -----
// 2 équipes A, 1 équipe B : A a 7 joueurs pour 2 équipes, il en faut plus → les passerelles B→A montent
const ids2 = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'];
p = K.proposer(ids2, F, {}, { format: 5, nb: { A: 2, B: 1, C: 0 } });
let lv = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { lv[j.id] = t.niveau; }));
assert.strictEqual(lv.b1, 'A'); assert.strictEqual(lv.b2, 'A');
assert.ok(/passerelle/.test(p.raisons.b1), p.raisons.b1);
// b1 est déjà monté au dernier plateau, b2 jamais : avec une seule place, c'est le tour de b2
H = { b1: { plateaux: 1, autre: 1, dernierAutre: '2026-10-10', avecCopain: 0, sansCopainSerie: 0, vus: {}, liste: [] } };
const ids3 = ids2.filter(x => x !== 'b12' && x !== 'b11');   // 7 A + 10 B, 1 équipe A et 2 équipes B : A a besoin d'environ 1 joueur de moins → personne ne monte
p = K.proposer(ids2, F, H, { format: 5, nb: { A: 1, B: 1, C: 0 } });
lv = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { lv[j.id] = t.niveau; }));
// 19 joueurs, 2 équipes : 9,5 chacune ; A a 7 → 2 places, B en a 12 → b2 monte (jamais monté) et b1 aussi
assert.strictEqual(lv.b2, 'A');
// une seule place : seul b2 (b1 est monté la dernière fois)
const ids4 = ids2.filter(x => x !== 'b11' && x !== 'b12' && x !== 'b10');   // 7 A + 9 B = 16, 2 équipes : 8 chacune → 1 place en A
p = K.proposer(ids4, F, H, { format: 5, nb: { A: 1, B: 1, C: 0 } });
lv = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { lv[j.id] = t.niveau; }));
assert.strictEqual(lv.b2, 'A', 'b2 attend son tour'); assert.strictEqual(lv.b1, 'B', 'b1 est monté la dernière fois');
// pas d'équipe C : les C jouent en B
p = K.proposer(ids, F, {}, { format: 5, nb: { A: 1, B: 2, C: 0 } });
lv = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { lv[j.id] = t.niveau; }));
assert.strictEqual(lv.c3, 'B'); assert.ok(/Pas d'équipe C/.test(p.raisons.c3), p.raisons.c3);
// niveau inconnu : placé en B avec une raison
add('x1', '', 2);
p = K.proposer(ids.concat('x1'), F, {}, { format: 5, nb: { A: 1, B: 2, C: 1 } });
assert.ok(/Niveau à renseigner/.test(p.raisons.x1));
delete F.x1;

// ----- jeu à 10 : postes -----
const G = {};
const postes = ['pilier', 'pilier', 'talonneur', 'troisieme-ligne', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'centre', 'ailier', 'ailier', 'centre'];
postes.forEach((ps, i) => { G['p' + i] = { id: 'p' + i, prenom: 'P' + i, niveau: 'A', passerelle: '', plaquage: 3, voeux: [ps], postesOk: [], copains: [] }; });
let ap = K.apparier(Object.keys(G), G);
assert.deepStrictEqual(J(ap.manquants), [], 'tous les postes couverts');
assert.strictEqual(ap.poste.p0, 'pilier'); assert.strictEqual(ap.poste.p6, 'ouvreur');
assert.strictEqual(Object.values(ap.poste).filter(x => !x).length, 2, '2 remplaçants');
// sans talonneur : il manque le talonneur, sauf si un éduc coche « talonneur » en poste compatible
G.p2.voeux = ['pilier'];
ap = K.apparier(Object.keys(G), G);
assert.ok(ap.manquants.indexOf('talonneur') >= 0);
G.p0.postesOk = ['talonneur'];
ap = K.apparier(Object.keys(G), G);
assert.deepStrictEqual(J(ap.manquants), []);
p = K.proposer(Object.keys(G), G, {}, { format: 10, nb: { A: 1, B: 0, C: 0 } });
const st10 = K.stats(p.equipes[0], G, 10);
assert.deepStrictEqual(J(st10.manquants), []);
assert.strictEqual(p.equipes[0].joueurs.filter(j => j.poste === 'pilier').length, 2);

// ----- modifications : déplacer, échanger, différences -----
p = K.proposer(ids, F, {}, { format: 5, nb: { A: 1, B: 2, C: 1 } });
const c0 = { reglages: { format: 5, nb: { A: 1, B: 2, C: 1 } }, equipes: p.equipes, banc: [] };
const tb4 = K.where(c0, 'b4');
let c1 = K.moveTo(c0, 'b4', 'banc', F);
assert.deepStrictEqual(J(c1.banc), ['b4']); assert.strictEqual(K.where(c0, 'b4').t, tb4.t, 'la compo de départ ne bouge pas');
c1 = K.moveTo(c1, 'b4', 'C1', F);
let d = K.diff(c0, c1);
assert.strictEqual(d.length, 1); assert.strictEqual(d[0].id, 'b4'); assert.strictEqual(d[0].vers, 'C1');
const other = c0.equipes.find(t => t.id === 'A1').joueurs[0].id;
c1 = K.swap(c0, 'b4', other);
d = K.diff(c0, c1);
assert.strictEqual(d.length, 2);
assert.strictEqual(K.diff(c0, J(c0)).length, 0);

// ----- alertes -----
// tous les forts plaqueurs B dans la même équipe
const bad = J(c0);
const bTeams = bad.equipes.filter(t => t.niveau === 'B');
const allB = bTeams[0].joueurs.concat(bTeams[1].joueurs);
allB.sort((x, y) => F[y.id].plaquage - F[x.id].plaquage);
bTeams[0].joueurs = allB.slice(0, 6); bTeams[1].joueurs = allB.slice(6);
let al = K.alertes(bad, F, {}, ids);
const pl = al.find(a => a.k === 'plaquage');
assert.ok(pl && pl.fix && pl.fix.t === 'swap', JSON.stringify(al));
const fixed = K.swap(bad, pl.fix.a, pl.fix.b);
const s2 = fixed.equipes.filter(t => t.niveau === 'B').map(t => K.stats(t, F, 5).plaq);
const s1 = bTeams.map(t => K.stats(t, F, 5).plaq);
assert.ok(Math.abs(s2[0] - s2[1]) < Math.abs(s1[0] - s1[1]), 'la correction réduit l\'écart');
// un présent pas placé
al = K.alertes(K.moveTo(c0, 'b4', 'banc', F), F, {}, ids.concat('zz'));
assert.ok(al.find(a => a.k === 'oubli' && a.ids.indexOf('zz') >= 0));
// sans copain pour la 2e fois de suite
const lone = J(c0);
const t3 = lone.equipes.find(t => t.joueurs.some(j => j.id === 'c2'));
const t3b = K.where(lone, 'c3');
if (lone.equipes[t3b.t] === t3) { /* même équipe : on sépare */ }
const H2 = { c2: { plateaux: 1, autre: 0, dernierAutre: '', avecCopain: 0, sansCopainSerie: 1, vus: {}, liste: [] } };
// c2 et c3 sont en C1 (une seule équipe C) : on éloigne c3 en B pour tester
const lone2 = K.moveTo(lone, 'c3', 'B1', F);
al = K.alertes(lone2, F, H2, ids);
assert.ok(al.find(a => a.k === 'copain' && a.ids[0] === 'c2'), JSON.stringify(al.map(a => a.k)));
// effectif trop petit
al = K.alertes({ reglages: { format: 5, nb: { A: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'a1' }, { id: 'a2' }] }], banc: [] }, F, {}, ['a1', 'a2']);
assert.ok(al.find(a => a.k === 'effectif'));

// ----- historique des plateaux -----
const evts = { e1: { id: 'e1', titre: 'Plateau 1', debut: '2026-09-26T09:00:00Z' }, e2: { id: 'e2', titre: 'Plateau 2', debut: '2026-10-10T09:00:00Z' }, e3: { id: 'e3', titre: 'Plateau 3', debut: '2026-11-14T09:00:00Z' } };
const compos = [
  { id: 'k1', evenementId: 'e1', statut: 'publiee', equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'a1', n: 'A' }, { id: 'b1', n: 'B' }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: 'b3', n: 'B' }, { id: 'b4', n: 'B' }, { id: 'b9', n: 'B' }] }] },
  { id: 'k2', evenementId: 'e2', statut: 'publiee', equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'b1', n: 'B' }, { id: 'b9', n: 'B' }] }, { id: 'B2', niveau: 'B', joueurs: [{ id: 'b3', n: 'B' }, { id: 'b4', n: 'B' }] }] },
  { id: 'k3', evenementId: 'e3', statut: 'publiee', equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'b9', n: 'B' }] }] },   // pas encore joué
  { id: 'k4', evenementId: 'e2', statut: 'remplacee', equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'b3', n: 'B' }] }] }
];
const HH = K.historique(compos, evts, F, '2026-10-13');
assert.strictEqual(HH.b1.plateaux, 2); assert.strictEqual(HH.b1.autre, 1); assert.strictEqual(HH.b1.dernierAutre, '2026-09-26');
assert.strictEqual(HH.b3.avecCopain, 2); assert.strictEqual(HH.b3.vus.b4, 2);
assert.strictEqual(HH.b9.sansCopainSerie, 2, 'b9 sans copain aux 2 plateaux');
assert.strictEqual(HH.b9.plateaux, 2, 'le plateau 3 n\'est pas encore joué');
assert.strictEqual(HH.b3.liste.length, 2);

// ----- présents d'un événement -----
assert.deepStrictEqual(J(K.presents({ presents: ['a', 'b', 'c'], ajouts: ['d', 'a'], retraits: ['b'] })), ['a', 'c', 'd']);
assert.strictEqual(K.sorteDuTitre('Plateau 3 - Muret'), 'plateau');
assert.strictEqual(K.sorteDuTitre('Entraînement - Lézat'), 'entrainement');
assert.strictEqual(K.sorteDuTitre('Ateliers FFR - Journée 2'), 'autre');

// ----- fiches à partir de la réponse « group » -----
const g = { joueurs: [
  { joueur: { id: 'j1', prenom: 'Tom', couleur: '#fff', actif: true }, terrain: { niveau: 'B', passerelle: 'A', plaquage: 3, postesOk: ['centre'] }, missions: [{ mission: 'jeu10', reponses: { postes: ['ailier'], copains: ['j2'] } }] },
  { joueur: { id: 'j2', prenom: 'Léa', couleur: '#fff', actif: true }, terrain: null, missions: [] }
] };
const FF = K.fiches(g);
assert.strictEqual(FF.j1.niveau, 'B'); assert.deepStrictEqual(J(FF.j1.copains), ['j2']); assert.deepStrictEqual(J(FF.j1.voeux), ['ailier']);
assert.strictEqual(FF.j2.niveau, ''); assert.strictEqual(FF.j2.plaquage, 0);

// ----- échanges avec le banc et avec un présent pas encore placé : le niveau principal reste -----
let cb = K.moveTo(c0, 'b5', 'banc', F);
cb = K.swap(cb, 'b5', 'c1', F);
assert.strictEqual(K.where(cb, 'b5').t >= 0, true);
assert.strictEqual(cb.equipes[K.where(cb, 'b5').t].joueurs.find(j => j.id === 'b5').n, 'B', 'b5 garde son niveau principal');
assert.deepStrictEqual(J(cb.banc), ['c1']);
const tard = K.swap(c0, 'zz-nouveau', 'a1', F);
assert.ok(K.where(tard, 'zz-nouveau').t >= 0 && J(tard.banc).indexOf('a1') >= 0, 'un présent arrivé tard prend la place');
// ----- jeu à 10 avec une équipe de 8 : les 8 joueurs ont un poste s'ils peuvent en tenir un -----
const E8 = {};
['ailier', 'centre', 'centre', 'pilier', 'pilier', 'talonneur', 'demi-de-melee', 'ouvreur'].forEach((ps, i) => { E8['e' + i] = { id: 'e' + i, prenom: 'E' + i, niveau: 'A', plaquage: 2, voeux: [ps], postesOk: [], copains: [] }; });
ap = K.apparier(Object.keys(E8), E8);
assert.strictEqual(Object.values(ap.poste).filter(Boolean).length, 8, JSON.stringify(ap));
assert.deepStrictEqual(J(ap.manquants).sort(), ['troisieme-ligne', 'troisieme-ligne']);
// ----- performance : 44 joueurs, 4 équipes au jeu à 10 -----
const Q = {};
for (let i = 0; i < 44; i++) Q['r' + i] = { id: 'r' + i, prenom: 'R' + i, niveau: i < 22 ? 'A' : 'B', passerelle: '', plaquage: i % 6, voeux: [postes[i % 12], postes[(i + 5) % 12]], postesOk: [], copains: ['r' + ((i + 3) % 44), 'r' + ((i + 11) % 44)] };
let t1 = Date.now();
p = K.proposer(Object.keys(Q), Q, {}, { format: 10, nb: { A: 2, B: 2, C: 0 } });
const dt = Date.now() - t1;
assert.ok(dt < 1500, 'proposition 44 joueurs jeu à 10 en ' + dt + ' ms');
assert.strictEqual(p.equipes.reduce((n, t) => n + t.joueurs.length, 0), 44);
// ----- performance : 40 joueurs, 6 équipes, jeu à 10 -----
const P = {};
for (let i = 0; i < 40; i++) P['q' + i] = { id: 'q' + i, prenom: 'Q' + i, niveau: ['A', 'B', 'C'][i % 3], passerelle: i % 5 === 0 ? 'B' : '', plaquage: i % 6, voeux: [postes[i % 12]], postesOk: [], copains: ['q' + ((i + 7) % 40)] };
const t0 = Date.now();
p = K.proposer(Object.keys(P), P, {}, { format: 10, nb: { A: 1, B: 1, C: 1 } });
assert.ok(Date.now() - t0 < 4000, 'proposition en ' + (Date.now() - t0) + ' ms');
console.log('COMPOS OK (' + dt + ' ms pour 44 joueurs en 4 équipes au jeu à 10)');
