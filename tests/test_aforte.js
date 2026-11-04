// (v48) « A forte » : une équipe A forte, des équipes B équilibrées (plateaux et ateliers) — décision de Nicolas, 04/11 :
// l'équipe A = les Confirmés, complétée d'abord par les B avec une passerelle vers A (à leur tour), puis par les meilleurs
// plaqueurs ; les A en trop jouent en B ; les équipes B mélangent Débrouillés et Débutants, équilibrées.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_aforte.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));   // tableaux venus du contexte vm

function groupe(spec) {
  const F = {};
  spec.forEach(([id, niveau, plaquage, pas]) => { F[id] = { id, prenom: id, niveau, passerelle: pas || '', plaquage, voeux: [], postesOk: [], copains: [] }; });
  return F;
}
function ou(p) { const o = {}; p.equipes.forEach(t => t.joueurs.forEach(j => { o[j.id] = t.id; })); return o; }
function ids(t) { return t.joueurs.map(j => j.id); }

// ----- plateau : 4 A, 8 B (dont b8 avec ⇅A), 6 C, 1 sans niveau ; 1 équipe A, 3 équipes B (2 B + 1 C) -----
const F = groupe([
  ['a1', 'A', 3], ['a2', 'A', 2], ['a3', 'A', 3], ['a4', 'A', 2],
  ['b1', 'B', 3], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 1], ['b5', 'B', 2], ['b6', 'B', 1], ['b7', 'B', 0], ['b8', 'B', 1, 'A'],
  ['c1', 'C', 0], ['c2', 'C', 1], ['c3', 'C', 2], ['c4', 'C', 0], ['c5', 'C', 1], ['c6', 'C', 2], ['z', '', null]]);
const tous = Object.keys(F);
assert.ok(K.STYLES.aforte && K.STYLES.aforte.nom === 'A forte', 'le style existe');
let p = K.proposer(tous, F, {}, { format: 5, nb: { A: 1, B: 2, C: 1 } }, '2026-11-04', 'aforte');
assert.deepStrictEqual(J(p.equipes.map(t => t.id)), ['A1', 'B1', 'B2', 'B3'], 'une équipe A, les équipes C comptent comme des B');
const A1 = p.equipes[0];
assert.strictEqual(A1.joueurs.length, 5, 'équipe A pleine : 19 / 4 équipes ≈ 5');
['a1', 'a2', 'a3', 'a4'].forEach(id => assert.strictEqual(ou(p)[id], 'A1', id + ' (A) en A'));
assert.strictEqual(ou(p).b8, 'A1', 'la place qui reste : d\'abord le B avec ⇅A (pas le meilleur plaqueur b1)');
assert.ok(/passerelle/.test(p.raisons.b8), p.raisons.b8);
assert.ok(/Niveau à renseigner/.test(p.raisons.z) && ou(p).z[0] === 'B', 'sans niveau : en B');
// les équipes B mélangent B et C de façon équilibrée
const Bs = p.equipes.slice(1);
const nC = Bs.map(t => ids(t).filter(id => F[id].niveau === 'C').length);
assert.ok(Math.max(...nC) - Math.min(...nC) <= 1, 'Débutants répartis : ' + nC);
const tailles = Bs.map(t => t.joueurs.length);
assert.ok(Math.max(...tailles) - Math.min(...tailles) <= 1, 'effectifs B voisins : ' + tailles);
// les Débutants des équipes B ne sont pas signalés sous le repère B ; les B, si
const al = K.alertes({ reglages: { format: 5, nb: { A: 1, B: 2, C: 1 }, style: 'aforte' }, equipes: p.equipes, banc: [] }, F, {}, tous);
al.filter(a => a.k === 'seuil' && /^B/.test(a.texte)).forEach(a => a.ids.forEach(id => assert.strictEqual(F[id].niveau, 'B', 'seuil : ' + a.texte)));
assert.ok(al.some(a => a.k === 'seuil' && a.ids.indexOf('b7') >= 0), 'un B sous le repère reste signalé');
// sans le style « A forte », les C sous le repère d'une équipe B le sont (comme avant)
const al2 = K.alertes({ reglages: { format: 5, nb: { A: 1, B: 2, C: 1 } }, equipes: p.equipes, banc: [] }, F, {}, tous);
assert.ok(al2.some(a => a.k === 'seuil' && a.ids.some(id => F[id].niveau === 'C')));

// trop de Confirmés : les A en trop jouent en B (d'abord ceux qui ont une passerelle vers un autre niveau, puis les moins bons plaqueurs)
const G = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['a4', 'A', 2], ['a5', 'A', 3, 'B'], ['a6', 'A', 1], ['a7', 'A', 3],
  ['b1', 'B', 2], ['b2', 'B', 2], ['b3', 'B', 1], ['b4', 'B', 1], ['c1', 'C', 1], ['c2', 'C', 0], ['c3', 'C', 1]]);
p = K.proposer(Object.keys(G), G, {}, { format: 5, nb: { A: 1, B: 2, C: 0 } }, '2026-11-04', 'aforte');
assert.strictEqual(p.equipes[0].joueurs.length, 5, '14 / 3 équipes ≈ 5 : 2 Confirmés de trop');
assert.strictEqual(ou(p).a5[0], 'B', 'l\'A avec une passerelle vers B joue en B');
assert.strictEqual(ou(p).a6[0], 'B', 'puis le moins bon plaqueur');
assert.ok(['a1', 'a2', 'a3', 'a4', 'a7'].every(id => ou(p)[id] === 'A1'));
assert.ok(/au complet/.test(p.raisons.a6), p.raisons.a6);

// la passerelle à son tour : celui qui n'a jamais joué en A passe avant celui qui y a joué
const R = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['b1', 'B', 2, 'A'], ['b2', 'B', 2, 'A'], ['b3', 'B', 3], ['b4', 'B', 2], ['c1', 'C', 1], ['c2', 'C', 1]]);
const HR = { b1: { plateaux: 1, autre: 1, dernierAutre: '2026-10-10', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [{ date: '2026-10-10', niveau: 'A', autre: true }] } };
p = K.proposer(Object.keys(R), R, HR, { format: 5, nb: { A: 1, B: 1, C: 0 } }, '2026-11-04', 'aforte');
assert.deepStrictEqual(J(ids(p.equipes[0]).sort()), ['a1', 'a2', 'b1', 'b2'], 'les deux passerelles complètent l\'équipe A (4 = 8 / 2)');
p = K.proposer(Object.keys(R), R, HR, { format: 5, nb: { A: 1, B: 2, C: 0 } }, '2026-11-04', 'aforte');
assert.strictEqual(ou(p).b2, 'A1', 'une seule place (8 / 3 ≈ 3) : b2, qui n\'a jamais joué en A');
assert.strictEqual(ou(p).b1[0], 'B');
// jeu à 10 : des postes dans chaque équipe ; « 2 versions » : A forte ↔ Équilibrée
const PO = ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier'];
const F10 = JSON.parse(JSON.stringify(F)); tous.forEach((id, i) => { F10[id].postesOk = [PO[i % PO.length]]; F10[id].postesPref = [PO[i % PO.length]]; });
p = K.proposer(tous, F10, {}, { format: 10, nb: { A: 1, B: 1, C: 0 } }, '2026-11-04', 'aforte');
assert.deepStrictEqual(J(p.equipes.map(t => t.id)), ['A1', 'B1']);
assert.strictEqual(p.equipes[0].joueurs.length + p.equipes[1].joueurs.length, tous.length, 'tout le monde est placé');
assert.ok(p.equipes.every(t => t.joueurs.some(j => j.poste)), 'jeu à 10 : des postes dans chaque équipe');

// ----- (relecture) cas limites -----
// pas d'équipe A demandée : une équipe A quand même ; les équipes C comptent comme des B, 9 au plus
p = K.proposer(tous, F, {}, { format: 5, nb: { A: 0, B: 2, C: 1 } }, '2026-11-04', 'aforte');
assert.deepStrictEqual(J(p.equipes.map(t => t.id)), ['A1', 'B1', 'B2', 'B3']);
assert.deepStrictEqual(J(K.idsEquipes({ nb: { A: 0, B: 2, C: 1 }, style: 'aforte' })), ['A1', 'B1', 'B2', 'B3'], 'les équipes d\'un plateau « A forte »');
assert.deepStrictEqual(J(K.idsEquipes({ nb: { A: 0, B: 2, C: 1 } })), ['B1', 'B2', 'C1'], 'sans « A forte » : comme avant');
assert.strictEqual(K.idsEquipes({ nb: { A: 1, B: 6, C: 6 }, style: 'aforte' }).length, 10, 'B1…B9 au plus');
p = K.proposer(tous, F, {}, { format: 5, nb: { A: 1, B: 6, C: 6 } }, '2026-11-04', 'aforte');
assert.ok(p.equipes.every(t => /^[AB][1-9]$/.test(t.id)), J(p.equipes.map(t => t.id)));
// « Partir de zéro » et « 2e version › Vide » : les mêmes équipes (le style suit)
assert.deepStrictEqual(J(K.vide(tous, { nb: { A: 0, B: 1, C: 1 }, style: 'aforte' }).equipes.map(t => t.id)), ['A1', 'B1', 'B2']);
// aucune équipe B : tout le monde dans l'équipe A, sans raison « meilleurs plaqueurs »
p = K.proposer(tous, F, {}, { format: 5, nb: { A: 1, B: 0, C: 0 } }, '2026-11-04', 'aforte');
assert.strictEqual(p.equipes.length, 1); assert.strictEqual(p.equipes[0].joueurs.length, tous.length);
assert.ok(!Object.keys(p.raisons).some(id => /plaqueurs/.test(p.raisons[id])), J(p.raisons));
// aucun Confirmé : l'équipe A = les B avec ⇅A, puis les meilleurs plaqueurs
const N = groupe([['b1', 'B', 3], ['b2', 'B', 1, 'A'], ['b3', 'B', 2], ['b4', 'B', 1], ['c1', 'C', 3], ['c2', 'C', 0]]);
p = K.proposer(Object.keys(N), N, {}, { format: 5, nb: { A: 1, B: 1, C: 0 } }, '2026-11-04', 'aforte');
assert.deepStrictEqual(J(ids(p.equipes[0]).sort()), ['b1', 'b2', 'b3'], 'b2 (⇅A), puis les meilleurs plaqueurs B (b1, b3), pas c1');
// Confirmés en trop, à plaquage égal : chacun son tour (celui qui est descendu en B la dernière fois reste en A)
const T = groupe([['a1', 'A', 2], ['a2', 'A', 2], ['a3', 'A', 2], ['b1', 'B', 2], ['b2', 'B', 2], ['b3', 'B', 2]]);
const HT = { a1: { plateaux: 1, autre: 1, dernierAutre: '2026-10-25', avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [{ date: '2026-10-25', niveau: 'B', autre: true }] } };
p = K.proposer(Object.keys(T), T, HT, { format: 5, nb: { A: 1, B: 2, C: 0 } }, '2026-11-04', 'aforte');
assert.strictEqual(ou(p).a1, 'A1', 'a1 est descendu la dernière fois : il reste en A');

// ----- ateliers : un groupe A fort, les autres groupes mélangés et équilibrés -----
let q = K.proposerEnt(tous, F, {}, { partie: 'ateliers', mode: 'aforte', n: 4 }, '2026-11-04');
assert.strictEqual(q.reglages.mode, 'aforte');
assert.deepStrictEqual(J(q.equipes.map(t => [t.nom, t.bloc, t.niveau])), [['A', 'A', 'A'], ['B1', 'B', ''], ['B2', 'B', ''], ['B3', 'B', '']], 'les groupes B mélangés n\'ont pas de niveau');
// l'historique : un Débutant dans un groupe B mélangé n'a pas joué « hors de son niveau » ; un B dans le groupe A, si
const Hq = K.historique([{ statut: 'publiee', evenementId: 'e1', partie: 'ateliers', equipes: q.equipes }], { e1: { id: 'e1', debut: '2026-11-01', titre: 'Entraînement' } }, F, '2026-11-04');
assert.strictEqual(Hq.c1.autre, 0, 'c1 : pas « hors niveau »'); assert.strictEqual(Hq.b8.autre, 1, 'b8 a joué en A');
assert.ok(['a1', 'a2', 'a3', 'a4', 'b8'].every(id => ids(q.equipes[0]).indexOf(id) >= 0), 'le groupe A : les A et le B avec ⇅A');
assert.ok(/groupe A/.test(q.raisons.b8), q.raisons.b8);
assert.ok(q.equipes.every(t => /^[A-Za-z0-9]{1,6}$/.test(t.id)), 'des identifiants que le serveur garde');
// les alertes comparent les groupes B entre eux, pas le groupe fort
const ae = K.alertesEnt({ reglages: q.reglages, equipes: q.equipes, banc: [] }, F, tous);
assert.ok(!ae.some(a => /\bA\b/.test(a.texte) && (a.k === 'plaquage' || a.k === 'taille')), JSON.stringify(ae));
// (relecture) le tour des Confirmés en trop compte aussi aux ateliers : un A placé dans un groupe B mélangé « a joué en B »
const T5 = groupe([['a1', 'A', 2], ['a2', 'A', 2], ['a3', 'A', 2], ['a4', 'A', 2], ['a5', 'A', 2], ['b1', 'B', 2], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 2], ['b5', 'B', 2], ['c1', 'C', 1], ['c2', 'C', 1]]);
const pub = [], evts = {}, descendus = [];
for (let s = 0; s < 3; s++) {
  const eid = 'e' + s, date = '2026-10-0' + (s + 1);
  const Hs = K.historique(pub, evts, T5, '2026-11-04');
  const qs = K.proposerEnt(Object.keys(T5), T5, Hs, { partie: 'ateliers', mode: 'aforte', n: 3 }, '2026-11-04');
  evts[eid] = { id: eid, debut: date, titre: 'Entraînement' };
  pub.push({ statut: 'publiee', evenementId: eid, partie: 'ateliers', equipes: J(qs.equipes) });
  descendus.push(qs.equipes.slice(1).flatMap(t => t.joueurs.map(j => j.id)).filter(id => T5[id].niveau === 'A').join(','));
}
assert.ok(new Set(descendus).size > 1, 'pas toujours le même Confirmé en B : ' + descendus.join(' | '));
// avants et arrières séparés : un groupe fort de chaque côté
q = K.proposerEnt(tous, F, {}, { partie: 'ateliers', mode: 'aforte', separer: true, nAv: 2, nAr: 2 }, '2026-11-04');
assert.deepStrictEqual(J(q.equipes.map(t => t.nom)), ['Av A', 'Av B1', 'Ar A', 'Ar B1']);
assert.deepStrictEqual(J(q.equipes.map(t => t.bloc)), ['av', 'av', 'ar', 'ar']);
assert.ok(q.equipes.every(t => /^[A-Za-z0-9]{1,6}$/.test(t.id)), q.equipes.map(t => t.id).join());
// un seul groupe : pas de groupe fort (tout le monde ensemble)
q = K.proposerEnt(tous, F, {}, { partie: 'ateliers', mode: 'aforte', n: 1 }, '2026-11-04');
assert.strictEqual(q.equipes.length, 1);
assert.strictEqual(q.reglages.mode, 'equilibre', 'un seul groupe : des groupes équilibrés (pas « 1 groupe avec un groupe A fort »)');
// les matchs n'ont pas ce mode
assert.strictEqual(K.regEnt({ partie: 'matchs', mode: 'aforte' }, tous, F).mode, 'niveau');

// ----- serveur : le style du plateau et le mode des ateliers sont gardés -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const P = {};
['Tom', 'Léa', 'Hugo'].forEach(n => { r = g.call({ action: 'addPlayer', token: tok, prenom: n, familleNom: 'Famille ' + n }); P[n] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-11-21', sorte: 'plateau', presents: [P.Tom, P['Léa'], P.Hugo] });
const ep = r.evenement;
r = g.call({ action: 'saveCompo', token: tok, evenementId: ep.id, reglages: { format: 5, nb: { A: 1, B: 1, C: 0 }, style: 'aforte' },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P['Léa'] }, { id: P.Hugo }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.reglages.style, 'aforte', 'le style « A forte » est gardé');
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai 2', debut: '2026-11-28', sorte: 'plateau', presents: [P.Tom] });
r = g.call({ action: 'saveCompo', token: tok, evenementId: r.evenement.id, reglages: { format: 5, nb: { A: 1 }, style: 'pirate' }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }], banc: [] });
assert.ok(!('style' in r.compo.reglages), 'un style inconnu n\'est pas gardé');
r = g.call({ action: 'setEvenement', token: tok, titre: 'Entraînement - Essai', debut: '2026-11-18', presents: [P.Tom, P['Léa'], P.Hugo] });
const ee = r.evenement;
r = g.call({ action: 'saveCompo', token: tok, evenementId: ee.id, partie: 'ateliers', version: 0, reglages: { partie: 'ateliers', mode: 'aforte', n: 2 },
  equipes: [{ id: 'FA', nom: 'A', niveau: 'A', bloc: 'A', joueurs: [{ id: P.Tom }] }, { id: 'FB1', nom: 'B1', niveau: 'B', bloc: 'B', joueurs: [{ id: P['Léa'] }, { id: P.Hugo }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.reglages.mode, 'aforte', 'ateliers « A forte » gardés');
assert.deepStrictEqual(r.compo.equipes.map(t => [t.id, t.nom, t.bloc]), [['FA', 'A', 'A'], ['FB1', 'B1', 'B']]);
r = g.call({ action: 'saveCompo', token: tok, evenementId: ee.id, partie: 'matchs', version: 0, reglages: { partie: 'matchs', mode: 'aforte', nbMatchs: 1 },
  equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: P.Hugo }] }], banc: [] });
assert.strictEqual(r.compo.reglages.mode, 'niveau', 'les matchs n\'ont pas ce mode');

console.log('test_aforte : OK');
