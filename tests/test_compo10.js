// (v57) Jeu à 10 « poste par poste » (demande de Nicolas du 07/11/2026) : chacun a un poste, remplaçants compris ;
// le vivier d'un poste (principal, peut aussi jouer, les autres ; niveau puis plaquage) ; qui peut jouer dans quelle équipe ;
// un plateau à 10 = deux équipes A et B ; les matchs = deux équipes équilibrées ; partir de tout le groupe (serveur).
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_compo10.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = '/home/claude/mode-champion/js';
vm.runInContext(fs.readFileSync(path.join(ROOT, 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
function fiche(id, niveau, plaquage, postesOk, pref, passerelle) {
  return { id, prenom: id, niveau, plaquage, postesOk: postesOk || [], pref: pref || (postesOk || []).slice(0, 1), voeux: [], copains: [], passerelle: passerelle || '', passerelles: passerelle ? passerelle.split('') : [] };
}

// ----- les places du jeu à 10 -----
assert.deepStrictEqual(J(K.BESOIN), { pilier: 2, talonneur: 1, 'troisieme-ligne': 2, 'demi-de-melee': 1, ouvreur: 1, centre: 1, ailier: 2 });

// ----- le vivier d'un poste : principal, puis peut aussi jouer, puis les autres ; niveau A → C, puis plaquage -----
const F = {
  a3: fiche('a3', 'A', 3, ['pilier']), a1: fiche('a1', 'A', 1, ['pilier']), b3: fiche('b3', 'B', 3, ['pilier']), c2: fiche('c2', 'C', 2, ['pilier']),
  bn: fiche('bn', 'B', null, ['pilier']), xx: fiche('xx', '', 3, ['pilier']),
  s1: fiche('s1', 'B', 2, ['troisieme-ligne', 'pilier'], ['troisieme-ligne']), s2: fiche('s2', 'A', 0, ['talonneur', 'pilier'], ['talonneur']),
  o1: fiche('o1', 'A', 3, ['ailier']), o2: fiche('o2', 'C', 1, [])
};
let v = K.vivier(Object.keys(F), F, 'pilier');
assert.deepStrictEqual(J(v.princ), ['a3', 'a1', 'b3', 'bn', 'c2', 'xx'], 'niveau A, B, C, sans niveau ; dans un niveau, le plaquage du plus fort au plus faible (pas encore évalué en dernier)');
assert.deepStrictEqual(J(v.peut), ['s2', 's1'], 'peut aussi jouer : A avant B, même à plaquage plus faible');
assert.deepStrictEqual(J(v.autres), ['o1', 'o2']);
// ceux qui ne viennent pas : en bas de leur groupe
v = K.vivier(Object.keys(F), F, 'pilier', { a3: true });
assert.deepStrictEqual(J(v.princ), ['a1', 'b3', 'bn', 'c2', 'xx', 'a3'], 'absent : en bas de son groupe');
// avec plusieurs préférés ★
F.d2 = fiche('d2', 'B', 2, ['centre', 'ailier'], ['centre', 'ailier']);
assert.ok(K.vivier(['d2'], F, 'ailier').princ.indexOf('d2') === 0, 'deux préférés : principal pour les deux');
// (v58, demande de Nicolas) le niveau, puis le niveau + passerelle, puis le plaquage :
// A, B avec passerelle vers A, B, C avec passerelle vers le haut (B ou A), C, sans niveau
{
  const G = {
    a1: fiche('a1', 'A', 1, ['pilier']), a0p: fiche('a0p', 'A', 0, ['pilier'], null, 'B'),
    b3: fiche('b3', 'B', 3, ['pilier']), b1p: fiche('b1p', 'B', 1, ['pilier'], null, 'A'), b2p: fiche('b2p', 'B', 2, ['pilier'], null, 'A'), bdn: fiche('bdn', 'B', 3, ['pilier'], null, 'C'),
    c3: fiche('c3', 'C', 3, ['pilier']), c1p: fiche('c1p', 'C', 1, ['pilier'], null, 'B'), c0a: fiche('c0a', 'C', 0, ['pilier'], null, 'A'), x: fiche('x', '', 3, ['pilier'])
  };
  assert.deepStrictEqual(J(K.vivier(Object.keys(G), G, 'pilier').princ), ['a1', 'a0p', 'b2p', 'b1p', 'b3', 'bdn', 'c1p', 'c0a', 'c3', 'x'],
    'A (une passerelle vers le bas ne change rien), B avec ⇅A, B, C avec passerelle vers le haut, C, sans niveau ; chaque fois le plaquage');
  assert.strictEqual(K.rangVivier(G.b2p), 1); assert.strictEqual(K.rangVivier(G.bdn), 2); assert.strictEqual(K.rangVivier(G.x), 9);
  assert.deepStrictEqual(J(K.vivier(['b3', 'b2p', 'a1'], G, 'pilier', { b2p: true }).princ), ['a1', 'b3', 'b2p'], 'absent : toujours en bas');
}

// ----- qui peut jouer dans quelle équipe (plateau A et B) -----
const tA = { id: 'A1', niveau: 'A' }, tB = { id: 'B1', niveau: 'B' }, tC = { id: 'C1', niveau: 'C' }, tM = { id: 'E1', niveau: '' };
assert.ok(K.eligible(F.a3, tA, ['A', 'B']) && !K.eligible(F.a3, tB, ['A', 'B']), 'un A : en A');
assert.ok(K.eligible(F.c2, tB, ['A', 'B']) && !K.eligible(F.c2, tA, ['A', 'B']), 'un C sans équipe C : en B');
assert.ok(!K.eligible(F.c2, tB, ['A', 'B', 'C']) && K.eligible(F.c2, tC, ['A', 'B', 'C']), 'une équipe C : il y joue');
F.bp = fiche('bp', 'B', 2, ['centre'], null, 'A');
assert.ok(K.eligible(F.bp, tA, ['A', 'B']) && K.eligible(F.bp, tB, ['A', 'B']), 'une passerelle vers A : les deux');
assert.ok(K.eligible(F.xx, tA, ['A', 'B']) && K.eligible(F.xx, tB, ['A', 'B']), 'sans niveau : partout');
assert.ok(K.eligible(F.a3, tM, []) && K.eligible(F.c2, tM, []), 'match d\'entraînement (équipe sans niveau) : tout le monde');

// ----- un poste pour chacun, remplaçants compris -----
const G = {};
[['p', 'pilier', 5], ['t', 'talonneur', 2], ['l', 'troisieme-ligne', 3], ['m', 'demi-de-melee', 1], ['o', 'ouvreur', 1], ['c', 'centre', 1], ['a', 'ailier', 2]].forEach(([k, p, n]) => { for (let i = 0; i < n; i++) G[k + i] = fiche(k + i, 'B', 2, [p]); });
G.z = fiche('z', 'B', 1, []);   // sans aucun poste
G.y = fiche('y', 'B', 1, ['pilier', 'troisieme-ligne']);   // pilier ★, peut jouer 3e ligne
let ids = Object.keys(G), po = K.postesEquipe(ids, G);
assert.strictEqual(po.z, '', 'sans aucun poste : toujours « Sans poste »');
assert.strictEqual(ids.filter(id => id !== 'z').every(id => !!po[id]), true, 'tous les autres ont un poste');
assert.strictEqual(ids.filter(id => po[id] === 'pilier').length, 5, '5 piliers de fiche → 5 piliers');
assert.strictEqual(po.y, 'troisieme-ligne', 'y : là où il y a le moins de monde par rapport aux places (3 3es lignes pour 2 places, 5 piliers pour 2)');
let st = K.stats({ joueurs: ids.map(id => ({ id, poste: po[id] })) }, G, 10);
assert.strictEqual(st.av, 5); assert.strictEqual(st.ar, 5); assert.strictEqual(st.manquants.length, 0);
assert.strictEqual(st.avTous, 11); assert.strictEqual(st.arTous, 5);
assert.strictEqual(st.rempl, 6, '16 joueurs avec un poste : 10 sur le terrain, 6 remplaçants');
assert.deepStrictEqual(J(st.parPoste), { pilier: 5, talonneur: 2, 'troisieme-ligne': 4, 'demi-de-melee': 1, ouvreur: 1, centre: 1, ailier: 2 });
// il manque un talonneur : les places tenues le disent, même avec 5 piliers
st = K.stats({ joueurs: ['p0', 'p1', 'p2', 'l0', 'l1', 'm0', 'o0', 'c0', 'a0', 'a1'].map(id => ({ id, poste: G[id].postesOk[0] })) }, G, 10);
assert.strictEqual(st.av, 4); assert.deepStrictEqual(J(st.manquants), ['talonneur']); assert.strictEqual(st.rempl, 1);
// arriver dans une équipe aux places prises : un de ses postes en plus
const eq = { joueurs: ['p0', 'p1', 't0', 'l0', 'l1'].map(id => ({ id, poste: G[id].postesOk[0] })) };
assert.strictEqual(K.placeLibre(eq, 'p2', G, false), 'pilier');
assert.strictEqual(K.placeLibre(eq, 'z', G, false), '', 'sans poste : rien');
assert.strictEqual(K.posteEnPlus(G.y, { pilier: 2, 'troisieme-ligne': 4 }), 'pilier', 'à égalité de manque, son préféré');

// ----- plateau à 10 : deux équipes, A et B -----
const H = {};
for (let i = 0; i < 7; i++) H['A' + i] = fiche('A' + i, 'A', 3, ['pilier']);
for (let i = 0; i < 10; i++) H['B' + i] = fiche('B' + i, 'B', 2, ['centre']);
for (let i = 0; i < 6; i++) H['C' + i] = fiche('C' + i, 'C', 1, ['ailier']);
assert.deepStrictEqual(J(K.suggestNb(Object.keys(H), H, 10)), { A: 1, B: 1, C: 0 }, 'jeu à 10 : une équipe A, une équipe B');
assert.deepStrictEqual(J(K.suggestNb(Object.keys(H).filter(id => id[0] !== 'A'), H, 10)), { A: 0, B: 1, C: 0 }, 'pas de Confirmé : une seule équipe');
assert.deepStrictEqual(J(K.suggestNb(Object.keys(H), H, 5)), { A: 1, B: 1, C: 1 }, 'jeu à 5 : comme avant');
const pl = K.proposer(Object.keys(H), H, {}, { format: 10, nb: { A: 1, B: 1, C: 0 }, opts: { orga: 'niveau', effectifs: 'equilibre', passerelles: 'niveau', copains: 'sans' } }, '2026-12-09');
assert.deepStrictEqual(J(pl.equipes.map(t => t.id)), ['A1', 'B1']);
pl.equipes.forEach(t => assert.ok(t.joueurs.every(j => !!j.poste), t.id + ' : tout le monde a un poste (remplaçants compris)'));

// ----- l'historique : un absent laissé dans une compo « tout le groupe » n'a pas joué (relecture v57, B1) -----
{
  const HF = { pb: fiche('pb', 'B', 2, ['centre'], null, 'A'), pa: fiche('pa', 'A', 3, ['pilier']), pc: fiche('pc', 'B', 2, ['ailier'], null, 'A'), pn: fiche('pn', 'B', 1, ['ailier']) };
  const evts = { e1: { id: 'e1', titre: 'Plateau 3', debut: '2026-12-05T09:00:00.000Z', presents: ['pa', 'pc'], absents: ['pb'], sansReponse: ['pn'], ajouts: [], retraits: [] } };
  const compo = { statut: 'publiee', evenementId: 'e1', reglages: { format: 10, nb: { A: 1, B: 1, C: 0 }, base: 'tous' },
    equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'pa', n: 'A', poste: 'pilier' }, { id: 'pb', n: 'B', poste: 'centre' }, { id: 'pc', n: 'B', poste: 'ailier' }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: 'pn', n: 'B', poste: 'ailier' }] }] };
  let Hh = K.historique([compo], evts, HF, '2026-12-10');
  assert.ok(!Hh.pb, 'absent sur Spond : ni plateau, ni passerelle comptés');
  assert.ok(!Hh.pn, 'tout le groupe : sans réponse, pas compté');
  assert.strictEqual(Hh.pc.plateaux, 1); assert.strictEqual(Hh.pc.autre, 1, 'le présent en passerelle : son tour compte');
  assert.deepStrictEqual(J(Hh.pa.liste[0].avec), ['pc'], 'les coéquipiers : seulement ceux qui ont joué');
  // ajouté à la main malgré son « non » sur Spond : il a joué
  evts.e1.ajouts = ['pb'];
  assert.strictEqual(K.historique([compo], evts, HF, '2026-12-10').pb.autre, 1);
  // une compo des présents : un absent placé (il a répondu « non » après) ne compte pas non plus ; sans réponse placé, si
  evts.e1.ajouts = []; delete compo.reglages.base;
  Hh = K.historique([compo], evts, HF, '2026-12-10');
  assert.ok(!Hh.pb, 'absent : pas compté'); assert.strictEqual(Hh.pn.plateaux, 1, 'placé en attendant sa réponse : compté comme avant');
  // un événement sans réponse Spond du tout (ajouté à la main, rien de coché) : on compte la compo
  const e2 = { e2: { id: 'e2', titre: 'Plateau 4', debut: '2026-12-06T09:00:00.000Z', presents: [], absents: [], sansReponse: [], ajouts: [], retraits: [] } };
  Hh = K.historique([Object.assign(J(compo), { evenementId: 'e2', reglages: { format: 10, nb: { A: 1, B: 1, C: 0 }, base: 'tous' } })], e2, HF, '2026-12-10');
  assert.strictEqual(Hh.pb.plateaux, 1, 'pas de réponses Spond : tout le monde compte');
  // (2e relecture) un retiré des présents ; un enfant décoché (ni présent, ni absent, ni sans réponse) ; des ajouts à la main seulement
  const base = { titre: 'Plateau 5', debut: '2026-12-07T09:00:00.000Z', absents: [], sansReponse: [], ajouts: [], retraits: [] };
  const cl = (ev) => Object.assign(J(compo), { evenementId: ev.id, reglages: { format: 10, nb: { A: 1, B: 1, C: 0 } } });
  let e3 = Object.assign({}, base, { id: 'e3', presents: ['pa', 'pb', 'pc', 'pn'], retraits: ['pc'] });
  Hh = K.historique([cl(e3)], { e3 }, HF, '2026-12-10');
  assert.ok(!Hh.pc, 'retiré des présents : pas compté'); assert.strictEqual(Hh.pb.plateaux, 1);
  e3 = Object.assign({}, base, { id: 'e3', source: 'manuel', presents: ['pa', 'pc'] });
  Hh = K.historique([cl(e3)], { e3 }, HF, '2026-12-10');
  assert.ok(!Hh.pb && !Hh.pn, 'compo des présents, enfant décoché ensuite : pas compté'); assert.strictEqual(Hh.pc.plateaux, 1);
  e3 = Object.assign({}, base, { id: 'e3', presents: [], ajouts: ['pa', 'pb'], sansReponse: ['pn'] });
  Hh = K.historique([Object.assign(cl(e3), { reglages: { format: 10, nb: { A: 1, B: 1, C: 0 }, base: 'tous' } })], { e3 }, HF, '2026-12-10');
  assert.ok(Hh.pa && Hh.pb && !Hh.pn && !Hh.pc, 'tout le groupe, seulement des ajouts à la main : seuls eux comptent');
}

// ----- matchs : reprendre d'anciens matchs à 4 équipes donne 2 équipes (relecture v57, I3) -----
{
  const MF = {}; ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'].forEach((id, i) => { MF[id] = fiche(id, i < 4 ? 'A' : 'C', 2, [i % 2 ? 'ailier' : 'pilier']); });
  const old = { reglages: { partie: 'matchs', format: 10, mode: 'niveau', nbMatchs: 2, nb: { A: 0, B: 0, C: 0 } }, equipes: [
    { id: 'E1', nom: 'Équipe 1', niveau: 'A', bloc: 'm1', joueurs: [{ id: 'm1', poste: 'pilier' }, { id: 'm2', poste: 'ailier' }] },
    { id: 'E2', nom: 'Équipe 2', niveau: 'A', bloc: 'm1', joueurs: [{ id: 'm3', poste: 'pilier' }, { id: 'm4', poste: 'ailier' }] },
    { id: 'E3', nom: 'Équipe 3', niveau: 'C', bloc: 'm2', joueurs: [{ id: 'm5', poste: 'pilier' }, { id: 'm6', poste: 'ailier' }] },
    { id: 'E4', nom: 'Équipe 4', niveau: 'C', bloc: 'm2', joueurs: [{ id: 'm7', poste: 'pilier' }, { id: 'm8', poste: 'ailier' }] }] };
  const rp = K.reprendre(old, Object.keys(MF).filter(id => id !== 'm8'), MF);
  assert.deepStrictEqual(J(rp.equipes.map(t => t.id)), ['E1', 'E2'], 'deux équipes');
  assert.deepStrictEqual(J(rp.equipes.map(t => t.joueurs.map(j => j.id))), [['m1', 'm2', 'm5', 'm6'], ['m3', 'm4', 'm7']], 'la 3 avec la 1, la 4 avec la 2 ; l\'absent sort');
  rp.equipes.forEach(t => { assert.strictEqual(t.niveau, ''); assert.strictEqual(t.bloc, 'm1'); });
  assert.strictEqual(rp.reglages.mode, 'equilibre'); assert.strictEqual(rp.reglages.nbMatchs, 1); assert.strictEqual(rp.reglages.format, 10);
  assert.ok(rp.equipes.every(t => t.joueurs.every(j => !!j.poste)), 'chacun garde un poste');
}

// ----- matchs : réglages -----
assert.strictEqual(K.regEnt({ partie: 'matchs', base: 'tous' }, [], {}).base, 'tous');
assert.ok(!('base' in K.regEnt({ partie: 'matchs' }, [], {})), 'par défaut : les présents (rien d\'écrit)');
assert.ok(!('base' in K.regEnt({ partie: 'ateliers', base: 'tous' }, [], {})), 'les ateliers : toujours les présents');

// ----- serveur : le choix « tout le groupe » est gardé (plateau et matchs), pas pour les ateliers -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
const P = {};
['Tom', 'Léa', 'Hugo'].forEach(p => { r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p }); P[p] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau 3 - Muret', debut: '2026-12-09', presents: [P.Tom] });
const ep = r.evenement;
r = g.call({ action: 'saveCompo', token: nico, evenementId: ep.id, reglages: { format: 10, nb: { A: 1, B: 1 }, base: 'tous' },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom, poste: 'pilier' }, { id: P['Léa'], poste: 'pilier' }, { id: P.Hugo, poste: 'pilier' }] }, { id: 'B1', niveau: 'B', joueurs: [] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.reglages.base, 'tous', 'plateau : tout le groupe, gardé');
assert.deepStrictEqual(r.compo.equipes[0].joueurs.map(j => j.poste), ['pilier', 'pilier', 'pilier'], 'trois piliers dans une équipe : gardés');
r = g.call({ action: 'setEvenement', token: nico, titre: 'Entraînement - Lézat', debut: '2026-12-02', presents: [P.Tom, P['Léa']] });
const ee = r.evenement;
r = g.call({ action: 'saveCompo', token: nico, evenementId: ee.id, partie: 'matchs', reglages: { partie: 'matchs', format: 10, mode: 'equilibre', nbMatchs: 1, base: 'tous' },
  equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom, poste: 'pilier' }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: P.Hugo, poste: 'ailier' }] }], banc: [P['Léa']] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.reglages.base, 'tous', 'matchs : tout le groupe, gardé');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ee.id, partie: 'ateliers', reglages: { partie: 'ateliers', base: 'tous' }, equipes: [{ id: 'G1', nom: 'G1', bloc: 'g', joueurs: [{ id: P.Tom }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.ok(!('base' in r.compo.reglages), 'ateliers : jamais');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ep.id, compoId: g.call({ action: 'compos', token: nico }).compos.filter(c => c.evenementId === ep.id)[0].id, version: 1,
  reglages: { format: 10, nb: { A: 1, B: 1 }, base: 'pirate' }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom, poste: 'pilier' }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.ok(!('base' in r.compo.reglages), 'une autre valeur : ignorée (les présents)');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ep.id, compoId: r.compo.id, version: r.compo.version,
  reglages: { format: 5, nb: { A: 1, B: 1 }, base: 'tous' }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.ok(!('base' in r.compo.reglages), 'jeu à 5 : toujours les présents');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ee.id, compoId: g.call({ action: 'compos', token: nico }).compos.filter(c => c.evenementId === ee.id && c.partie === 'matchs')[0].id, version: 1, partie: 'matchs',
  reglages: { partie: 'matchs', format: 10, mode: 'equilibre' }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom, poste: 'pilier' }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.reglages.nbMatchs, 1, 'matchs : un seul match par défaut');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ee.id, compoId: r.compo.id, version: r.compo.version, partie: 'matchs',
  reglages: { partie: 'matchs', format: 10 }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom, poste: 'pilier' }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.reglages.mode, 'equilibre', 'matchs : équilibrés par défaut');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ee.id, compoId: r.compo.id, version: r.compo.version, partie: 'matchs',
  reglages: { partie: 'matchs', format: 10, mode: 'niveau', nbMatchs: 2 }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom, poste: 'pilier' }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.reglages.mode, 'niveau', 'un site plus ancien (2 matchs par niveau) : gardé');
console.log('test_compo10 : OK');
