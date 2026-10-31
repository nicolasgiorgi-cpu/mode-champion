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
['ailier', 'ailier', 'centre', 'pilier', 'pilier', 'talonneur', 'demi-de-melee', 'ouvreur'].forEach((ps, i) => { E8['e' + i] = { id: 'e' + i, prenom: 'E' + i, niveau: 'A', plaquage: 2, voeux: [ps], postesOk: [], copains: [] }; });
ap = K.apparier(Object.keys(E8), E8);
assert.strictEqual(Object.values(ap.poste).filter(Boolean).length, 8, JSON.stringify(ap));
assert.deepStrictEqual(J(ap.manquants).sort(), ['troisieme-ligne', 'troisieme-ligne']);

// ----- postes de la fiche : le 1er est le poste principal, sinon les vœux de l'enfant -----
assert.deepStrictEqual(J(K.postesDe({ postesOk: ['ailier', 'centre'], voeux: ['pilier'] })), ['ailier', 'centre']);
assert.deepStrictEqual(J(K.postesDe({ postesOk: [], voeux: ['pilier', 'pilier', 'talonneur'] })), ['pilier', 'talonneur']);
assert.strictEqual(K.posteDefaut({ postesOk: ['ouvreur', 'centre'] }), 'ouvreur');
assert.strictEqual(K.posteDefaut({}), '');
assert.strictEqual(K.typePoste('troisieme-ligne'), 'av');
assert.strictEqual(K.typePoste('demi-de-melee'), 'ar');
assert.strictEqual(K.typeDe({ postesOk: ['pilier', 'talonneur'] }), 'av');
assert.strictEqual(K.typeDe({ postesOk: ['centre', 'troisieme-ligne'] }), 'les2');
assert.strictEqual(K.typeDe({ voeux: ['ailier'] }), 'ar');
assert.strictEqual(K.typeDe({}), '');
// au jeu à 10, chacun prend en priorité son poste principal
const G10 = {};
[['pilier'], ['pilier'], ['talonneur'], ['troisieme-ligne', 'centre'], ['troisieme-ligne'], ['demi-de-melee'], ['ouvreur'], ['ailier', 'centre'], ['centre'], ['ailier', 'pilier'], ['demi-de-melee'], ['centre', 'troisieme-ligne']]
  .forEach((ps, i) => { G10['g' + i] = { id: 'g' + i, prenom: 'G' + i, niveau: 'A', plaquage: 3, voeux: ['ouvreur'], postesOk: ps, copains: [] }; });
let ap10 = K.apparier(Object.keys(G10), G10);
assert.deepStrictEqual(J(ap10.manquants), [], JSON.stringify(ap10));
['g0', 'g1', 'g2', 'g3', 'g4', 'g6', 'g7', 'g9'].forEach(id => assert.strictEqual(ap10.poste[id], G10[id].postesOk[0], id + ' à son poste principal'));
assert.ok(ap10.poste.g6 === 'ouvreur' && Object.values(ap10.poste).filter(p => p === 'ouvreur').length === 1, 'les vœux ne remplacent pas la fiche');
// avants / trois-quarts : au jeu à 10 d'après le poste du plateau, les remplaçants à part
let t10 = { id: 'A1', niveau: 'A', joueurs: Object.keys(G10).map(id => ({ id, poste: ap10.poste[id] || '', n: 'A' })) };
let s10 = K.stats(t10, G10, 10);
assert.strictEqual(s10.av, 5); assert.strictEqual(s10.ar, 5); assert.strictEqual(s10.rempl, 2);
assert.strictEqual(s10.remplTypes.av + s10.remplTypes.ar + s10.remplTypes.les2 + s10.remplTypes.inconnus, 2);
// sections : avants (piliers, talonneur, 3es lignes) puis arrières (9, 10, centres, ailiers), remplaçants à part
let sc10 = K.sections(t10, G10, 10);
assert.deepStrictEqual(J(sc10.av.map(j => j.poste)), ['pilier', 'pilier', 'talonneur', 'troisieme-ligne', 'troisieme-ligne']);
assert.deepStrictEqual(J(sc10.ar.map(j => j.poste)), ['demi-de-melee', 'ouvreur', 'centre', 'ailier', 'ailier']);
assert.strictEqual(sc10.rempl.length, 2); assert.strictEqual(sc10.sans.length, 0);
// l'ordre de l'équipe ne compte pas : même rangement si les joueurs arrivent mélangés
assert.deepStrictEqual(J(K.sections({ joueurs: t10.joueurs.slice().reverse() }, G10, 10).av.map(j => j.poste)), J(sc10.av.map(j => j.poste)));
assert.deepStrictEqual(J(s10.manquants), []);
// un changement de poste au plateau change le décompte
t10 = K.setPoste({ reglages: { format: 10 }, equipes: [t10], banc: [] }, 'g3', 'centre').equipes[0];
s10 = K.stats(t10, G10, 10);
assert.ok(s10.av <= 5 && s10.av + s10.ar + s10.rempl === 12, JSON.stringify(s10));
// au jeu à 5 : d'après la fiche (polyvalents et sans poste à part)
const s5 = K.stats({ id: 'A1', niveau: 'A', joueurs: [{ id: 'g0' }, { id: 'g3' }, { id: 'g7' }, { id: 'zz' }] }, Object.assign({ zz: { id: 'zz', voeux: [], postesOk: [] } }, G10), 5);
// g0 pilier, g3 3e ligne (joue aussi centre), g7 ailier (joue aussi centre), zz sans poste
assert.deepStrictEqual([s5.av, s5.ar, s5.les2, s5.inconnus, s5.rempl], [2, 1, 1, 1, 0]);
const sc5 = K.sections({ joueurs: [{ id: 'g7' }, { id: 'zz' }, { id: 'g3' }, { id: 'g0' }] }, Object.assign({ zz: { id: 'zz', voeux: [], postesOk: [] } }, G10), 5);
assert.deepStrictEqual(J([sc5.av.map(j => j.id), sc5.ar.map(j => j.id), sc5.sans.map(j => j.id)]), [['g0', 'g3'], ['g7'], ['zz']]);

// ----- styles de proposition -----
assert.deepStrictEqual(Object.keys(K.STYLES), ['equilibre', 'copains', 'strict']);
const pStrict = K.proposer(ids, F, {}, { format: 5, nb }, '2026-10-19', 'strict');
pStrict.equipes.forEach(t => t.joueurs.forEach(j => assert.strictEqual(t.niveau, F[j.id].niveau, 'strict : ' + j.id + ' reste en ' + F[j.id].niveau)));
const pCop = K.proposer(ids, F, {}, { format: 5, nb }, '2026-10-19', 'copains');
function nbAvec(pp) { let n = 0; pp.equipes.forEach(t => { const st = K.stats(t, F, 5); n += st.avecCopain; }); return n; }
assert.ok(nbAvec(pCop) >= nbAvec(K.proposer(ids, F, {}, { format: 5, nb }, '2026-10-19', 'equilibre')), 'copains d\'abord : au moins autant d\'enfants avec un copain');
pCop.equipes.forEach(t => t.joueurs.forEach(j => assert.ok(t.niveau === F[j.id].niveau || t.niveau === F[j.id].passerelle)));

// ----- historique : niveaux et postes joués, copains -----
const evH = { e1: { id: 'e1', titre: 'Plateau 1', debut: '2026-09-20T10:00' }, e2: { id: 'e2', titre: 'Plateau 2', debut: '2026-10-04T10:00' }, e3: { id: 'e3', titre: 'Plateau 3', debut: '2026-11-04T10:00' } };
const FH = { x: { id: 'x', copains: ['y'] }, y: { id: 'y', copains: [] }, z: { id: 'z', copains: [] } };
const cH = [
  { evenementId: 'e1', statut: 'publiee', equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'x', poste: 'centre', n: 'B' }, { id: 'y', poste: 'pilier', n: 'A' }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: 'z', n: 'B' }] }] },
  { evenementId: 'e2', statut: 'publiee', equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'x', poste: 'centre', n: 'B' }, { id: 'z', poste: 'ailier', n: 'B' }] }] },
  { evenementId: 'e3', statut: 'publiee', equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'x', poste: 'ouvreur', n: 'B' }] }] },   // à venir : pas compté
  { evenementId: 'e2', statut: 'vote', equipes: [{ id: 'C1', niveau: 'C', joueurs: [{ id: 'x', n: 'B' }] }] }                          // pas publiée : pas comptée
];
const HX = K.historique(cH, evH, FH, '2026-10-19');
assert.strictEqual(HX.x.plateaux, 2);
assert.deepStrictEqual(J(HX.x.niveaux), { A: 1, B: 1 });
assert.deepStrictEqual(J(HX.x.postes), { centre: 2 });
assert.deepStrictEqual(J(HX.x.vus), { y: 1, z: 1 });
assert.strictEqual(HX.x.autre, 1); assert.strictEqual(HX.x.dernierAutre, '2026-09-20');
assert.strictEqual(HX.x.avecCopain, 1); assert.strictEqual(HX.x.sansCopainSerie, 1);
assert.deepStrictEqual(J(HX.x.liste.map(l => [l.titre, l.niveau, l.poste, l.copains.length])), [['Plateau 1', 'A', 'centre', 1], ['Plateau 2', 'B', 'centre', 0]]);
assert.deepStrictEqual(J(K.hOf(HX, 'inconnu').niveaux), {});
// ======================================================================
// Entraînements : groupes d'ateliers puis matchs
// ======================================================================
const FE = {};
const POE = [['pilier'], ['talonneur', 'pilier'], ['troisieme-ligne'], ['demi-de-melee'], ['ouvreur'], ['centre'], ['ailier'], ['centre', 'troisieme-ligne'], []];
let ie = 0;
[['A', 7], ['B', 15], ['C', 8]].forEach(([n, c]) => { for (let k = 0; k < c; k++) { const id = n + k; FE[id] = { id, prenom: id, niveau: n, passerelle: '', plaquage: n === 'A' ? 4 + (k % 2) : n === 'B' ? 2 + (k % 3) : k % 3, voeux: [], postesOk: POE[ie++ % POE.length], copains: [] }; } });
FE.B0.passerelle = 'A'; FE.B14.passerelle = 'C';
FE.A0.copains = ['A1']; FE.B3.copains = ['B4'];
const idsE = Object.keys(FE);
const lvE = (p) => p.equipes.map(t => t.joueurs.map(j => FE[j.id].niveau).join(''));
const tous = (p) => { const s = []; p.equipes.forEach(t => t.joueurs.forEach(j => s.push(j.id))); return s.sort(); };
// réglages conseillés : groupes de 8 environ, 2 matchs à partir de 20
let RE = K.regEnt({ partie: 'ateliers' }, idsE, FE);
assert.strictEqual(RE.n, 4); assert.strictEqual(RE.mode, 'niveau'); assert.strictEqual(RE.separer, false); assert.strictEqual(RE.nbMatchs, 2);
assert.strictEqual(K.regEnt({ partie: 'matchs', separer: true }, idsE, FE).separer, false);
// ateliers par niveau : des groupes homogènes, coupés à la limite des niveaux ; tout le monde placé une fois
let pe = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'niveau', n: 4 }, '2026-10-21');
assert.deepStrictEqual(J(lvE(pe)), ['AAAAAAA', 'BBBBBBBB', 'BBBBBBB', 'CCCCCCCC']);
assert.deepStrictEqual(J(pe.equipes.map(t => [t.nom, t.bloc])), [['A1', 'A'], ['B1', 'B'], ['B2', 'B'], ['C1', 'C']]);
assert.deepStrictEqual(tous(pe), idsE.slice().sort());
assert.strictEqual(pe.equipes[1].joueurs[0].id, 'B0', 'la passerelle vers A en tête des B');
assert.ok(pe.equipes[2].joueurs.some(j => j.id === 'B14'), 'la passerelle vers C avec les derniers B');
// 3 groupes : un groupe réunit deux niveaux voisins (« A+B ») plutôt qu'un groupe de 15
pe = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'niveau', n: 3 }, '2026-10-21');
assert.deepStrictEqual(J(pe.equipes.map(t => t.nom)), ['A+B', 'B1', 'C1']);
assert.ok(Math.max(...pe.equipes.map(t => t.joueurs.length)) - Math.min(...pe.equipes.map(t => t.joueurs.length)) <= 4);
// ateliers équilibrés : chaque groupe mélange les niveaux, effectifs et plaquage proches
pe = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'equilibre', n: 4 }, '2026-10-21');
assert.deepStrictEqual(J(pe.equipes.map(t => t.bloc)), ['g', 'g', 'g', 'g']);
pe.equipes.forEach(t => { const c = lvE({ equipes: [t] })[0]; assert.ok(/A/.test(c) && /B/.test(c) && /C/.test(c), 'mélangé : ' + c); });
let ste = pe.equipes.map(t => K.stats(t, FE, 5));
assert.ok(Math.max(...ste.map(x => x.n)) - Math.min(...ste.map(x => x.n)) <= 1);
assert.ok(Math.max(...ste.map(x => x.plaq)) - Math.min(...ste.map(x => x.plaq)) < 0.6, JSON.stringify(ste.map(x => x.plaq)));
assert.deepStrictEqual(J(K.alertesEnt(pe, FE, idsE)), []);
// avants et arrières séparés : les avants d'un côté, les arrières de l'autre, les sans-poste pour équilibrer
pe = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'equilibre', separer: true, nAv: 2, nAr: 2 }, '2026-10-21');
assert.deepStrictEqual(J(pe.equipes.map(t => t.bloc)), ['av', 'av', 'ar', 'ar']);
pe.equipes.forEach(t => t.joueurs.forEach(j => { const ty = K.typePoste(K.posteDefaut(FE[j.id])); assert.ok(!ty || ty === t.bloc, j.id + ' ' + ty + ' en ' + t.bloc); }));
assert.deepStrictEqual(tous(pe), idsE.slice().sort());
const sansP = idsE.filter(id => !K.posteDefaut(FE[id]));
assert.ok(sansP.every(id => pe.raisons[id]), 'les sans-poste ont leur raison');
pe = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'niveau', separer: true, nAv: 2, nAr: 2 }, '2026-10-21');
assert.deepStrictEqual(J(K.blocsDe(pe)), ['av', 'ar']);
pe.equipes.forEach(t => { const c = lvE({ equipes: [t] })[0]; assert.ok(!(/A/.test(c) && /C/.test(c)), 'groupe de niveau sans A et C ensemble : ' + c); });
// matchs par niveau : le match 1 réunit les plus avancés ; deux équipes équilibrées par match
pe = K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'niveau', nbMatchs: 2 }, '2026-10-21');
assert.deepStrictEqual(J(pe.equipes.map(t => [t.id, t.nom, t.bloc, 'cote' in t])), [['E1', 'Équipe 1', 'm1', false], ['E2', 'Équipe 2', 'm1', false], ['E3', 'Équipe 3', 'm2', false], ['E4', 'Équipe 4', 'm2', false]]);
const m1 = lvE({ equipes: pe.equipes.slice(0, 2) }).join(''), m2 = lvE({ equipes: pe.equipes.slice(2) }).join('');
assert.ok(!/C/.test(m1) && !/A/.test(m2), 'match 1 : A + B ; match 2 : B + C (' + m1 + ' / ' + m2 + ')');
ste = pe.equipes.map(t => K.stats(t, FE, 5));
assert.ok(Math.abs(ste[0].plaq - ste[1].plaq) < 0.6 && Math.abs(ste[2].plaq - ste[3].plaq) < 0.6);
assert.ok(Math.abs(ste[0].n - ste[1].n) <= 1 && Math.abs(ste[2].av - ste[3].av) <= 2);
// matchs équilibrés : chaque match mélange tout le monde
pe = K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'equilibre', nbMatchs: 2 }, '2026-10-21');
[pe.equipes.slice(0, 2), pe.equipes.slice(2)].forEach(m => { const c = lvE({ equipes: m }).join(''); assert.ok(/A/.test(c) && /C/.test(c), c); });
assert.deepStrictEqual(J(K.alertesEnt(pe, FE, idsE)), []);
// un seul match avec tout le monde
assert.strictEqual(K.proposerEnt(idsE, FE, {}, { partie: 'matchs', nbMatchs: 1 }, '2026-10-21').equipes.length, 2);
// (v35) les matchs se jouent avec des postes, comme les plateaux à 10 ; les ateliers, non
assert.strictEqual(K.regEnt({ partie: 'matchs' }, idsE, FE).format, 10);
assert.strictEqual(K.regEnt({ partie: 'ateliers' }, idsE, FE).format, 5);
pe = K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'equilibre', nbMatchs: 1 }, '2026-10-21');
assert.strictEqual(pe.reglages.format, 10);
pe.equipes.forEach(t => {
  const postes = t.joueurs.map(j => j.poste).filter(Boolean);
  assert.strictEqual(postes.length, 10, 'équipe de 15 : les 10 places du match, les autres remplaçants (' + postes.length + ')');
  K.POSTES10.forEach(([p, n]) => assert.strictEqual(postes.filter(x => x === p).length, n, 'une fois chaque place : ' + p));
  // un joueur dont c'est le poste principal le garde, si sa place n'est pas déjà prise par un autre « principal »
  t.joueurs.forEach(j => { if (j.poste && FE[j.id].postesOk.length && FE[j.id].postesOk.indexOf(j.poste) < 0) assert.ok(FE[j.id].postesOk.every(p => t.joueurs.some(x => x.poste === p && x.id !== j.id)), j.id + ' : ' + j.poste); });
});
// les deux équipes couvrent autant de postes (le poste compte dans l'équilibre)
const manq = pe.equipes.map(t => K.apparier(t.joueurs.map(j => j.id), FE).manquants.length);
assert.ok(Math.abs(manq[0] - manq[1]) <= 1, JSON.stringify(manq));
// 2 matchs (équipes de 7 ou 8) : tout le monde joue, avec un poste (les places vides vont à ceux qui restent)
pe = K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'niveau', nbMatchs: 2 }, '2026-10-21');
pe.equipes.forEach(t => assert.ok(t.joueurs.every(j => j.poste), 'moins de 10 joueurs : chacun a un poste (' + t.id + ')'));
pe.equipes.forEach(t => { const l = t.joueurs.map(j => j.poste); assert.strictEqual(new Set(l).size + l.filter((p, i) => l.indexOf(p) !== i && K.POSTES10.find(x => x[0] === p)[1] === 2).length, l.length, 'pas plus de joueurs que de places à un poste'); });
// sans poste sur la fiche : une place vide, du bon côté s'il en a un
const FV = { x1: { id: 'x1', prenom: 'X1', niveau: 'B', plaquage: 2, voeux: [], postesOk: ['pilier'], copains: [] }, x2: { id: 'x2', prenom: 'X2', niveau: 'B', plaquage: 2, voeux: [], postesOk: ['pilier'], copains: [] },
  x3: { id: 'x3', prenom: 'X3', niveau: 'B', plaquage: 2, voeux: [], postesOk: ['pilier'], copains: [] }, x4: { id: 'x4', prenom: 'X4', niveau: 'B', plaquage: 2, voeux: [], postesOk: [], copains: [] } };
let apv = K.apparier(['x1', 'x2', 'x3', 'x4'], FV, true).poste;
assert.ok(['talonneur', 'troisieme-ligne'].indexOf(apv.x3) >= 0, '3e pilier : une place d\'avant libre (' + apv.x3 + ')');
assert.strictEqual(apv.x4, 'ailier', 'sans poste : une place libre, d\'abord à l\'aile (pas d\'office en première ligne)');
// arriver dans une équipe au jeu à 10 : son poste de fiche s'il est libre ; match : sinon une place de son côté ; plateau : remplaçant
const tq = { joueurs: [{ id: 'x1', poste: 'pilier' }, { id: 'x2', poste: 'pilier' }, { id: 'x3', poste: '' }] };
assert.strictEqual(K.placeLibre(tq, 'x3', FV, false), '', 'plateau : piliers pris → remplaçant (comme avant)');
assert.ok(['talonneur', 'troisieme-ligne'].indexOf(K.placeLibre(tq, 'x3', FV, true)) >= 0, 'match : une place d\'avant libre');
assert.strictEqual(K.placeLibre({ joueurs: [{ id: 'x1', poste: 'pilier' }] }, 'x2', FV, false), 'pilier', 'son poste de fiche, encore libre');
assert.strictEqual(K.placeLibre({ joueurs: [] }, 'x4', FV, true), 'ailier', 'sans poste : l\'aile');
assert.strictEqual(K.apparier(['x1', 'x2', 'x3'], FV).poste.x3, '', 'aux plateaux, sans « remplir » : rien ne change (remplaçant)');
// reprendre des matchs d'avant la v35 (sans postes) : ils passent avec postes
const vieux = { reglages: { partie: 'matchs', mode: 'niveau', nbMatchs: 1, format: 5 }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: ['A0', 'B1', 'C2'].map(id => ({ id, poste: '', n: '' })) }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: ['A2', 'B3'].map(id => ({ id, poste: '', n: '' })) }], banc: [] };
const rv = K.reprendre(vieux, ['A0', 'B1', 'C2', 'A2', 'B3'], FE);
assert.strictEqual(rv.reglages.format, 10);
assert.ok(rv.equipes.every(t => t.joueurs.every(j => j.poste)), JSON.stringify(rv.equipes));
// reprendre des matchs déjà avec postes : chacun garde le sien, les remplaçants prennent les places des absents
const v10 = { reglages: { partie: 'matchs', mode: 'niveau', nbMatchs: 1, format: 10 }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: 'A0', poste: 'pilier', n: 'A' }, { id: 'B1', poste: 'ailier', n: 'B' }, { id: 'C2', poste: '', n: 'C' }] }], banc: [] };
const r10 = K.reprendre(v10, ['A0', 'C2'], FE);
assert.strictEqual(r10.equipes[0].joueurs.find(j => j.id === 'A0').poste, 'pilier', 'son poste gardé');
assert.ok(r10.equipes[0].joueurs.find(j => j.id === 'C2').poste, 'le remplaçant prend une place libre');
// la répartition des postes RÉGLÉS sur les fiches (pas les vœux) : principal, peut aussi jouer, sans poste
const FR = { r1: { prenom: 'R1', postesOk: ['pilier', 'talonneur'], voeux: [] }, r2: { prenom: 'R2', postesOk: ['talonneur'], voeux: [] }, r3: { prenom: 'R3', postesOk: [], voeux: ['ailier'] }, r4: { prenom: 'R4', postesOk: ['inconnu', 'centre', 'centre'], voeux: [] } };
const rep = K.repartition(['r1', 'r2', 'r3', 'r4'], FR), byP = {};
rep.postes.forEach(x => { byP[x.id] = x; });
assert.deepStrictEqual(rep.postes.map(x => x.id), K.ORDRE, 'les 7 postes, dans l\'ordre du jeu à 10');
assert.deepStrictEqual(J([byP.pilier.princ, byP.pilier.autres, byP.talonneur.princ, byP.talonneur.autres]), [['r1'], [], ['r2'], ['r1']]);
assert.deepStrictEqual(J(byP.ailier), { id: 'ailier', princ: [], autres: [] }, 'les vœux ne comptent pas');
assert.deepStrictEqual(J(rep.sans), ['r3']);
assert.deepStrictEqual(J(byP.centre.princ), ['r4'], 'un poste inconnu est ignoré, un doublon compte une fois');
// alertes : présents oubliés, effectifs déséquilibrés (avec la correction), groupe vide
let ce = K.moveTo(K.moveTo(pe, pe.equipes[0].joueurs[0].id, 'E2', FE), pe.equipes[0].joueurs[1].id, 'E2', FE);
let ale = K.alertesEnt(ce, FE, idsE.concat(['nouveau']));
assert.ok(ale.some(a => a.k === 'oubli' && /nouveau|\?/.test(a.texte)));
const tai = ale.filter(a => a.k === 'taille')[0];
assert.ok(tai && /Match 1/.test(tai.texte) && tai.fix && tai.fix.vers === 'E1', JSON.stringify(tai));
const vz = K.videEnt(idsE, FE, { partie: 'ateliers', mode: 'niveau', n: 4 }, '2026-10-21');
assert.strictEqual(vz.equipes.length, 4); assert.ok(vz.equipes.every(t => !t.joueurs.length)); assert.strictEqual(vz.banc.length, idsE.length);
assert.ok(K.alertesEnt(vz, FE, idsE).some(a => a.k === 'vide'));
// les groupes de niveau ne signalent pas l'écart de plaquage (il est voulu)
assert.ok(!K.alertesEnt(K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'niveau', n: 4 }, '2026-10-21'), FE, idsE).some(a => a.k === 'plaquage'));
// reprendre les groupes de la dernière fois : les absents sortent, les nouveaux attendent
const prec = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'equilibre', n: 3 }, '2026-10-14');
const auj = idsE.filter(id => id !== 'A0' && id !== 'C7').concat(['Z9']);
FE.Z9 = { id: 'Z9', prenom: 'Z9', niveau: 'B', plaquage: 2, voeux: [], postesOk: [], copains: [] };
const rp = K.reprendre(prec, auj, FE);
assert.deepStrictEqual(J(rp.banc), ['Z9']);
assert.ok(!K.where(rp, 'A0') && K.where(rp, 'B1').t >= 0);
assert.deepStrictEqual(J(rp.equipes.map(t => t.id)), J(prec.equipes.map(t => t.id)));
// l'historique compte aussi les entraînements (passerelles, copains), chaque ligne dit d'où elle vient
const parNiv = K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'niveau', n: 3 }, '2026-10-14');   // A+B, B1, C1
const mParNiv = K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'niveau', nbMatchs: 2 }, '2026-10-14');
assert.strictEqual(parNiv.equipes[0].niveau, 'A', 'le groupe « A+B » est un groupe de niveau A');
assert.deepStrictEqual(J(mParNiv.equipes.map(t => t.niveau)), ['A', 'A', 'B', 'B']);
const evH2 = { x: { id: 'x', titre: 'Entraînement', debut: '2026-10-14T16:30' }, p: { id: 'p', titre: 'Plateau 2', debut: '2026-10-10T08:00' } };
const cH2 = [
  { evenementId: 'x', statut: 'publiee', partie: 'matchs', equipes: mParNiv.equipes },
  { evenementId: 'x', statut: 'publiee', partie: 'ateliers', equipes: parNiv.equipes },
  { evenementId: 'p', statut: 'publiee', equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'B0', n: 'B', poste: 'centre' }, { id: 'B3', n: 'B' }, { id: 'B4', n: 'B' }] }] }
];
const hEnt = K.historique(cH2, evH2, FE, '2026-10-21');
const b0 = hEnt.B0;
assert.strictEqual(b0.plateaux, 1); assert.strictEqual(b0.entrainements, 2);
assert.deepStrictEqual(J(b0.liste.map(l => l.sorte)), ['plateau', 'ateliers', 'matchs'], 'dans l\'ordre : le plateau, puis les ateliers avant les matchs');
assert.ok(b0.liste[1].autre && b0.liste[1].nom === 'A+B', 'B0 (passerelle vers A) dans « A+B » : il a joué au-dessus');
assert.strictEqual(b0.dernierAutre, '2026-10-14', 'la passerelle de l\'entraînement compte pour la rotation');
assert.deepStrictEqual(J(b0.postes), { centre: 1 }, 'les postes : au plateau seulement');
assert.deepStrictEqual(J(b0.niveaux), { B: 1 }, 'les niveaux du résumé plateaux : au plateau seulement');
// groupes mélangés : pas de « hors niveau »
const hMix = K.historique([{ evenementId: 'x', statut: 'publiee', partie: 'ateliers', equipes: prec.equipes }], { x: { id: 'x', debut: '2026-10-14T16:30' } }, FE, '2026-10-21');
assert.ok(Object.keys(hMix).every(id => hMix[id].autre === 0 && hMix[id].entrainements === 1 && hMix[id].plateaux === 0));
// les copains : B3 a choisi B4 ; s'il n'est pas avec lui à l'entraînement, ça compte pour « sans copain la dernière fois »
const seul = JSON.parse(JSON.stringify(prec.equipes)); seul.forEach(t => { t.joueurs = t.joueurs.filter(j => j.id !== 'B4'); }); seul[seul.length - 1].joueurs.push({ id: 'B4', n: 'B' });
const w3 = seul.findIndex(t => t.joueurs.some(j => j.id === 'B3'));
if (w3 === seul.length - 1) { seul[w3].joueurs = seul[w3].joueurs.filter(j => j.id !== 'B4'); seul[0].joueurs.push({ id: 'B4', n: 'B' }); }
const hSeul = K.historique([{ evenementId: 'x', statut: 'publiee', partie: 'matchs', equipes: seul }], { x: { id: 'x', debut: '2026-10-14T16:30' } }, FE, '2026-10-21');
assert.strictEqual(hSeul.B3.sansCopainSerie, 1);
// performance : 31 joueurs, ateliers équilibrés et matchs
let t2 = Date.now();
K.proposerEnt(idsE, FE, {}, { partie: 'ateliers', mode: 'equilibre', n: 6 }, '2026-10-21');
// 1 ou 2 matchs seulement : au-delà, on reste à 2
assert.strictEqual(K.proposerEnt(idsE, FE, {}, { partie: 'matchs', mode: 'equilibre', nbMatchs: 3 }, '2026-10-21').equipes.length, 4);
assert.strictEqual(K.regEnt({ partie: 'matchs', nbMatchs: 4 }, idsE, FE).nbMatchs, 2);
assert.ok(Date.now() - t2 < 1500, 'entraînement en ' + (Date.now() - t2) + ' ms');

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
