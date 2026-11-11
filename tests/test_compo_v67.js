// (v67) Demandes de Nicolas du 11/11/2026 :
// - jeu à 10 : les postes ★ s'équilibrent entre les équipes d'un même niveau (il avait eu 2 piliers d'un côté, 4 de l'autre,
//   des ailiers d'un seul côté) ; une option « Équilibrer d'abord : les postes | le plaquage » ;
// - les matchs d'un entraînement se préparent comme un plateau (réglages vue: 'plateau'), les anciens restent lisibles.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_compo_v67.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
function fiche(id, niveau, plaquage, postes, pref) {
  return { id, prenom: id, niveau, plaquage, postesOk: postes, pref: pref || postes.slice(0, 1), voeux: [], copains: [], passerelle: '', passerelles: [] };
}
const OPTS = (pr) => ({ orga: 'niveau', effectifs: 'equilibre', passerelles: 'niveau', copains: 'sans', priorite: pr });
const ids = (t) => t.joueurs.map(j => j.id);
const P = ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', ''];

// ----- l'option -----
assert.strictEqual(K.optsDe({}).priorite, 'postes', 'par défaut : les postes d\'abord');
assert.strictEqual(K.optsDe({ opts: { priorite: 'plaquage' } }).priorite, 'plaquage');
assert.strictEqual(K.optsDe({ opts: { priorite: 'pirate' } }).priorite, 'postes', 'une valeur inconnue : les postes');
assert.deepStrictEqual(J(K.OPTS.priorite), ['postes', 'plaquage']);

// ----- le poste ★ d'un enfant, pour l'équilibre -----
assert.deepStrictEqual(J(K.partsPoste(fiche('x', 'B', 1, ['pilier', 'talonneur']))), { pilier: 1 }, 'son ★');
assert.deepStrictEqual(J(K.partsPoste(fiche('x', 'B', 1, ['centre', 'ailier'], ['centre', 'ailier']))), { centre: 0.5, ailier: 0.5 }, 'deux ★ : une part chacun');
assert.deepStrictEqual(J(K.partsPoste(fiche('x', 'B', 1, []))), { '': 1 }, 'sans poste');
assert.deepStrictEqual(J(K.partsPoste({ id: 'v', postesOk: [], voeux: ['ouvreur', 'centre'] })), { ouvreur: 1 }, 'sans fiche : son 1er vœu');

// ----- le cas de Nicolas : 2 équipes B au jeu à 10 avec tout le monde -----
// 26 enfants ; les meilleurs plaqueurs sont tous piliers ou ailiers : le serpentin du plaquage les mettait du même côté
const F = {};
let n = 0;
[['pilier', 6, 3], ['talonneur', 2, 2], ['troisieme-ligne', 4, 2], ['demi-de-melee', 2, 1], ['ouvreur', 2, 1], ['centre', 2, 1], ['ailier', 6, 3], ['', 2, 0]].forEach(([p, k, q]) => {
  for (let i = 0; i < k; i++) { const id = 'k' + (n++); F[id] = fiche(id, ['A', 'B', 'C'][i % 3], (q + i) % 4, p ? [p] : []); }
});
const tous = Object.keys(F);
let pl = K.proposer(tous, F, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS('postes') }, '2026-11-11');
assert.deepStrictEqual(J(pl.equipes.map(t => t.id)), ['B1', 'B2']);
const cp = pl.equipes.map(t => K.comptePostes(ids(t), F));
P.forEach(p => assert.strictEqual(cp[0][p] || 0, cp[1][p] || 0, 'autant de « ' + (p || 'sans poste') + ' » de chaque côté : ' + JSON.stringify(cp)));
pl.equipes.forEach(t => assert.strictEqual(t.joueurs.length, 13));
// et chacun joue à son poste ★ (sauf les deux enfants sans poste, à régler par les éducs)
pl.equipes.forEach(t => t.joueurs.forEach(j => { if (K.postesDe(F[j.id]).length) assert.strictEqual(K.lienPoste(F[j.id], j.poste), 'pref', j.id + ' à son poste ★'); }));
// même avec « le plaquage d'abord », ici les deux s'équilibrent ensemble
pl = K.proposer(tous, F, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS('plaquage') }, '2026-11-11');
const cq = pl.equipes.map(t => K.comptePostes(ids(t), F));
P.forEach(p => assert.ok(Math.abs((cq[0][p] || 0) - (cq[1][p] || 0)) <= 1, 'le plaquage d\'abord : les postes restent proches'));

// ----- quand les deux ne vont pas ensemble, l'option décide -----
const G = {};
['talonneur:0', 'demi-de-melee:3', 'troisieme-ligne:2', 'pilier:1', 'demi-de-melee:0', 'pilier:3', 'talonneur:0', 'talonneur:0', 'pilier:3', 'troisieme-ligne:2', 'talonneur:3', 'pilier:3']
  .forEach((x, i) => { const [p, q] = x.split(':'); G['g' + i] = fiche('g' + i, 'B', Number(q), [p]); });
function bilan(pr) {
  const r = K.proposer(Object.keys(G), G, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS(pr) }, '2026-11-11');
  const c = r.equipes.map(t => K.comptePostes(ids(t), G)), q = r.equipes.map(t => t.joueurs.reduce((s, j) => s + G[j.id].plaquage, 0) / t.joueurs.length);
  let e = 0; P.forEach(p => { e += Math.abs((c[0][p] || 0) - (c[1][p] || 0)); });
  return { postes: e, plaquage: Math.abs(q[0] - q[1]) };
}
const bp = bilan('postes'), bq = bilan('plaquage');
assert.ok(bp.postes < bq.postes, 'les postes d\'abord : moins d\'écart de postes ' + JSON.stringify([bp, bq]));
assert.ok(bq.plaquage < bp.plaquage, 'le plaquage d\'abord : moins d\'écart de plaquage ' + JSON.stringify([bp, bq]));
// au jeu à 5, l'option ne change rien (pas de postes)
const r5 = ['postes', 'plaquage'].map(pr => J(K.proposer(Object.keys(G), G, {}, { format: 5, nb: { A: 0, B: 2, C: 0 }, opts: OPTS(pr) }, '2026-11-11').equipes.map(ids)));
assert.deepStrictEqual(r5[0], r5[1], 'jeu à 5 : la même compo');

// ----- l'alerte : des postes déséquilibrés entre deux équipes du même niveau -----
const H = {};
['pilier', 'pilier', 'pilier', 'pilier', 'ailier', 'ailier', 'pilier', 'pilier', 'ailier', 'ailier', 'ailier', 'ailier'].forEach((p, i) => { H['h' + i] = fiche('h' + i, 'B', 2, [p]); });
const deseq = { reglages: { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS('postes') }, banc: [],
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['h0', 'h1', 'h2', 'h3', 'h4', 'h5'].map(id => ({ id, poste: H[id].postesOk[0] })) },
    { id: 'B2', niveau: 'B', joueurs: ['h6', 'h7', 'h8', 'h9', 'h10', 'h11'].map(id => ({ id, poste: H[id].postesOk[0] })) }] };
let al = K.alertes(deseq, H, {}, []).filter(a => a.k === 'postes');
assert.strictEqual(al.length, 1, 'une alerte « postes »');
assert.ok(/B1 a 4 piliers ★, B2 2/.test(al[0].texte), al[0].texte);
assert.ok(al[0].fix && al[0].fix.t === 'swap' && H[al[0].fix.a].postesOk[0] === 'pilier' && H[al[0].fix.b].postesOk[0] === 'ailier', 'avec un échange proposé : un pilier contre un ailier ' + JSON.stringify(al[0].fix));
const fixe = K.swap(deseq, al[0].fix.a, al[0].fix.b, H);
assert.strictEqual(K.alertes(fixe, H, {}, []).filter(a => a.k === 'postes').length, 0, 'après l\'échange : 3 et 3, plus d\'alerte');

// ----- les matchs faits comme un plateau -----
const M = {};
for (let i = 0; i < 6; i++) M['m' + i] = fiche('m' + i, i < 2 ? 'C' : 'B', 1, ['ailier']);
const cm = { reglages: { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS('postes'), partie: 'matchs', vue: 'plateau' }, banc: [],
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['m0', 'm2', 'm3'].map(id => ({ id, poste: 'ailier' })) }, { id: 'B2', niveau: 'B', joueurs: ['m1', 'm4', 'm5'].map(id => ({ id, poste: 'ailier' })) }] };
M.m0.plaquage = 0; M.m1.plaquage = 0;
assert.strictEqual(K.alertes(cm, M, {}, []).filter(a => a.k === 'seuil').length, 0, 'matchs : pas de « sous le repère » du niveau');
const cpl = J(cm); delete cpl.reglages.partie; delete cpl.reglages.vue;
assert.ok(K.alertes(cpl, M, {}, []).filter(a => a.k === 'seuil').length > 0, 'au plateau, si');
// reprendre des matchs « comme un plateau » : les équipes restent, pas de passage à « Équipe 1 contre Équipe 2 »
let o = K.reprendre(cm, ['m0', 'm1', 'm2', 'm3', 'm4'], M);
assert.deepStrictEqual(J(o.equipes.map(t => t.id)), ['B1', 'B2']);
assert.strictEqual(o.reglages.vue, 'plateau'); assert.strictEqual(o.reglages.partie, 'matchs');
assert.ok(!('mode' in o.reglages), 'pas de réglage d\'entraînement');
const c5 = J(cm); c5.reglages.format = 5; c5.equipes.forEach(t => t.joueurs.forEach(j => { j.poste = ''; }));
o = K.reprendre(c5, ['m0', 'm1'], M);
assert.strictEqual(o.reglages.format, 5, 'jeu à 5 : reste au jeu à 5');
// les anciens matchs : comme avant (deux équipes, réglages d'entraînement)
o = K.reprendre({ reglages: { partie: 'matchs', mode: 'equilibre', format: 10 }, equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: 'm0', poste: 'ailier' }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: 'm1', poste: 'ailier' }] }] }, ['m0', 'm1'], M);
assert.deepStrictEqual(J(o.equipes.map(t => t.id)), ['E1', 'E2']); assert.strictEqual(o.reglages.mode, 'equilibre');

// l'historique : dans des matchs sans équipe de son niveau, un Confirmé ou un Débutant n'a pas « joué hors de son niveau »
const evts = { e1: { id: 'e1', debut: '2026-11-04T16:30:00Z', titre: 'Entraînement' }, e2: { id: 'e2', debut: '2026-11-05T16:30:00Z', titre: 'Entraînement 2' } };
const passe = [{ evenementId: 'e1', partie: 'matchs', statut: 'publiee', reglages: cm.reglages, equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'm0', n: 'C' }, { id: 'm2', n: 'B' }] }, { id: 'B2', niveau: 'B', joueurs: [{ id: 'm1', n: 'C' }] }] },
  { evenementId: 'e2', partie: 'matchs', statut: 'publiee', reglages: cm.reglages, equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: 'm0', n: 'C' }] }, { id: 'C1', niveau: 'C', joueurs: [{ id: 'm1', n: 'C' }] }] }];
const Hm = K.historique(passe, evts, M, '2026-11-11');
assert.strictEqual(Hm.m1.autre, 0, 'm1 (C) en B1 sans équipe C, puis en C1 : jamais hors niveau');
assert.strictEqual(Hm.m0.autre, 1, 'm0 (C) en B1 alors qu\'il y avait une équipe C : hors niveau une fois');
assert.strictEqual(Hm.m0.entrainements, 2);

// (relecture) d'anciens matchs (sans vue: 'plateau') : l'historique ne change pas
const ancien = [{ evenementId: 'e1', partie: 'matchs', statut: 'publiee', reglages: { partie: 'matchs', mode: 'niveau', format: 10 }, equipes: [{ id: 'E1', niveau: 'B', bloc: 'm1', joueurs: [{ id: 'm1', n: 'C' }] }] }];
assert.strictEqual(K.historique(ancien, evts, M, '2026-11-11').m1.autre, 1, 'anciens matchs par niveau : joué au-dessus, comme avant');

// ----- (relecture) des matchs : les niveaux se mélangent, même quand les copains sont du même niveau -----
const N = {};
for (let i = 0; i < 24; i++) {
  const niv = i < 8 ? 'A' : i < 16 ? 'B' : 'C', f = fiche('n' + i, niv, niv === 'A' ? 3 : niv === 'B' ? 2 : 1, [['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'ailier'][i % 8]]);
  const base = Math.floor(i / 8) * 8; f.copains = [0, 1, 2].map(k => 'n' + (base + (i - base + 1 + k) % 8));   // 3 copains, tous de son niveau
  N['n' + i] = f;
}
// des groupes tirés au sort (plaquage lié au niveau sans le suivre, 2 copains du même niveau) : sans le poids des niveaux,
// ces deux tirages donnaient 5 Confirmés d'écart entre B1 et B2
let graine = 0; const rnd = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const PO = ['pilier', 'pilier', 'talonneur', 'troisieme-ligne', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'ailier'];
[162, 1216].forEach(g => {
  graine = g; const T = {};
  for (let i = 0; i < 24; i++) { const niv = ['A', 'B', 'B', 'C'][Math.floor(rnd() * 4)], pq = Math.max(0, Math.min(3, (niv === 'A' ? 2 : niv === 'B' ? 1.5 : 0.7) + (rnd() - 0.5) * 2)), p1 = PO[Math.floor(rnd() * PO.length)];
    T['t' + i] = fiche('t' + i, niv, Math.round(pq), [p1]); }
  Object.keys(T).forEach(id => { T[id].copains = Object.keys(T).filter(x => x !== id && T[x].niveau === T[id].niveau).slice(0, 2); });
  ['postes', 'plaquage'].forEach(pr => {
    const r = K.proposer(Object.keys(T), T, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: Object.assign(OPTS(pr), { copains: 'un' }), partie: 'matchs' }, '2026-11-11');
    const c = r.equipes.map(t => t.joueurs.filter(j => T[j.id].niveau === 'A').length), d = r.equipes.map(t => t.joueurs.filter(j => T[j.id].niveau === 'C').length);
    assert.ok(Math.abs(c[0] - c[1]) <= 1 && Math.abs(d[0] - d[1]) <= 1, 'matchs (tirage ' + g + ', ' + pr + ') : Confirmés ' + c + ', Débutants ' + d);
  });
});
// au plateau, rien ne change : pas de poids des niveaux (ce sont des équipes de niveau)
const rp = K.proposer(Object.keys(N), N, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: Object.assign(OPTS('postes'), { copains: 'un' }) }, '2026-11-11');
const rm = K.proposer(Object.keys(N), N, {}, { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: Object.assign(OPTS('postes'), { copains: 'un' }), partie: 'matchs' }, '2026-11-11');
assert.ok(rp.equipes.length === 2 && rm.equipes.length === 2);

// ----- (relecture) petits matchs : pas d'alerte « il en faut au moins 10 » ni « postes à couvrir » -----
const petits = { reglages: { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: OPTS('postes'), partie: 'matchs', vue: 'plateau' }, banc: [],
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['n0', 'n1', 'n2', 'n3', 'n8', 'n9', 'n10', 'n11'].map(id => ({ id, poste: N[id].postesOk[0] })) },
    { id: 'B2', niveau: 'B', joueurs: ['n4', 'n5', 'n6', 'n7', 'n12', 'n13', 'n14', 'n15'].map(id => ({ id, poste: N[id].postesOk[0] })) }] };
let ks = K.alertes(petits, N, {}, []).map(a => a.k);
assert.ok(ks.indexOf('effectif') < 0 && ks.indexOf('poste') < 0, 'matchs à 8 contre 8 : ' + ks);
const plat8 = J(petits); delete plat8.reglages.partie; delete plat8.reglages.vue;
ks = K.alertes(plat8, N, {}, []).map(a => a.k);
assert.ok(ks.indexOf('effectif') >= 0 && ks.indexOf('poste') >= 0, 'au plateau, si : ' + ks);
// « hors niveau » : dans des matchs sans équipe A ni C, personne ; au plateau, les A et les C
assert.deepStrictEqual(J(K.niveauxMatch(petits)), ['B']);
assert.strictEqual(K.stats(petits.equipes[0], N, 10, K.niveauxMatch(petits)).passerelles, 0, 'matchs : pas hors niveau');
assert.strictEqual(K.stats(plat8.equipes[0], N, 10, K.niveauxMatch(plat8)).passerelles, 4, 'plateau : 4 Confirmés hors niveau en B1');

// ----- serveur : les réglages des matchs « comme un plateau » sont gardés -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const pj = {};
['Tom', 'Léa', 'Zoé'].forEach(x => { r = g.call({ action: 'addPlayer', token: tok, prenom: x, familleNom: 'Famille ' + x }); pj[x] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: tok, titre: 'Entraînement - Essai', debut: '2026-11-18', sorte: 'entrainement', presents: Object.values(pj) });
const evId = r.evenement.id;
const eqs = [{ id: 'B1', niveau: 'B', joueurs: [{ id: pj.Tom, poste: 'pilier' }, { id: pj['Léa'], poste: 'ailier' }] }, { id: 'B2', niveau: 'B', joueurs: [{ id: pj['Zoé'], poste: 'pilier' }] }];
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, partie: 'matchs', version: 0, equipes: eqs, banc: [],
  reglages: { format: 10, nb: { A: 0, B: 2, C: 0 }, style: 'equilibre', opts: { orga: 'niveau', effectifs: 'equilibre', passerelles: 'roulant', copains: 'un', priorite: 'plaquage', pirate: 1 }, tailles: { B1: 2, B2: 1 }, partie: 'matchs', vue: 'plateau', base: 'tous' } });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(J(r.compo.reglages), { format: 10, nb: { A: 0, B: 2, C: 0 }, style: 'equilibre', opts: { orga: 'niveau', effectifs: 'equilibre', passerelles: 'roulant', copains: 'un', priorite: 'plaquage' }, tailles: { B1: 2, B2: 1 }, partie: 'matchs', vue: 'plateau', base: 'tous' });
assert.deepStrictEqual(J(r.compo.equipes.map(t => [t.id, t.niveau, t.bloc])), [['B1', 'B', 'B'], ['B2', 'B', 'B']]);
// les ateliers et les anciens matchs : comme avant
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, partie: 'ateliers', version: 0, equipes: [{ id: 'G1', nom: 'G1', bloc: 'g', joueurs: [{ id: pj.Tom }] }], banc: [], reglages: { partie: 'ateliers', mode: 'niveau', vue: 'plateau', opts: { copains: 'un' } } });
assert.ok(r.ok, JSON.stringify(r));
assert.ok(!r.compo.reglages.vue && !r.compo.reglages.opts && r.compo.reglages.mode === 'niveau', 'ateliers : jamais « comme un plateau » ' + JSON.stringify(r.compo.reglages));
// un plateau : la priorité est gardée aussi
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-12-05', sorte: 'plateau', presents: Object.values(pj) });
r = g.call({ action: 'saveCompo', token: tok, evenementId: r.evenement.id, version: 0, equipes: eqs, banc: [], reglages: { format: 10, nb: { A: 0, B: 2, C: 0 }, opts: { priorite: 'postes' } } });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.reglages.opts.priorite, 'postes');
assert.ok(!r.compo.reglages.vue && !r.compo.reglages.partie, 'un plateau reste un plateau');

console.log('test_compo_v67 : OK');
