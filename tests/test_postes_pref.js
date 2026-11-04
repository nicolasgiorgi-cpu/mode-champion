// (v43) Plusieurs postes préférés ★ par enfant : le serveur (colonne postesPref de l'onglet terrain) et les règles des compos.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_postes_pref.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const { makeEnv } = require('./gas_mock.js');

// ---------- serveur ----------
const g = makeEnv();
g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
const P = {};
['Tom', 'Léa', 'Hugo'].forEach(function (p) { r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p }); P[p] = r.joueur.id; });
function terr(id) { return g.call({ action: 'group', token: nico }).joueurs.filter(function (x) { return x.joueur.id === id; })[0].terrain; }

// une fiche d'avant la v43 (sans postesPref) : null = le 1er poste est le préféré
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, postesOk: ['centre', 'ailier', 'troisieme-ligne'] }] });
assert.ok(r.terrain[P.Tom], JSON.stringify(r));
assert.strictEqual(terr(P.Tom).postesPref, null, 'pas encore réglé : null');
// plusieurs préférés, seulement parmi ses postes, sans doublon
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, postesOk: ['ailier', 'centre', 'troisieme-ligne'], postesPref: ['ailier', 'centre', 'pilier', 'ailier', 'pirate'] }] });
assert.deepStrictEqual(r.terrain[P.Tom].postesPref, ['ailier', 'centre'], 'les préférés : parmi ses postes');
assert.deepStrictEqual(terr(P.Tom).postesPref, ['ailier', 'centre'], 'gardés dans la feuille');
// un poste retiré n'est plus préféré (même sans renvoyer postesPref)
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, postesOk: ['centre', 'troisieme-ligne'] }] });
assert.deepStrictEqual(r.terrain[P.Tom].postesPref, ['centre']);
// aucun préféré : une liste vide (pas null)
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, postesPref: [] }] });
assert.deepStrictEqual(r.terrain[P.Tom].postesPref, []);
// des postes préférés invalides
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, postesPref: 'centre' }] });
assert.strictEqual(r.error, 'invalide');
// le niveau seul ne touche pas aux postes
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P['Léa'], postesOk: ['pilier', 'talonneur'], postesPref: ['talonneur', 'pilier'] }] });
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P['Léa'], niveau: 'A' }] });
assert.deepStrictEqual(r.terrain[P['Léa']].postesPref, ['talonneur', 'pilier']);
assert.strictEqual(r.terrain[P['Léa']].niveau, 'A');
// seuls les éducs
r = g.call({ action: 'setTerrain', token: 'x', lignes: [{ joueurId: P.Hugo, postesPref: [] }] });
assert.ok(r.error);
// (v44) le plaquage de 0 à 3 (colonne plaquage3) ; l'ancienne note sur 5 (colonne plaquage) n'est plus lue : tout le monde repart de 0
const dbp = new g.SheetDB_();
dbp.insert('terrain', { id: P.Hugo, niveau: 'B', passerelle: '', plaquage: 5, postesOk: [], spondId: '', note: '', parQui: '', maj: '' }); dbp.flush_();
assert.strictEqual(terr(P.Hugo).plaquage, 0, 'ancienne note sur 5 : repart de 0');
assert.strictEqual(terr(P.Hugo).niveau, 'B', 'le reste de la fiche est gardé');
[[2, 2], [3, 3], [0, 0], [5, 3], [4, 3], [9, 0], [-1, 0], ['x', 0]].forEach(function (c) {
  r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Hugo, plaquage: c[0] }] });
  assert.strictEqual(r.terrain[P.Hugo].plaquage, c[1], 'plaquage ' + c[0] + ' → ' + c[1]);
});
assert.strictEqual(new g.SheetDB_().rows('terrain').find(t => t.id === P.Hugo).plaquage, 5, 'l\'ancienne colonne n\'est pas touchée');

// ---------- règles des compos (js/compos.js) ----------
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = path.join(__dirname, '..', 'js');
vm.runInContext(fs.readFileSync(path.join(ROOT, 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
function joueur(id, terrain, voeux) { return { joueur: { id, prenom: id, actif: true }, terrain, missions: voeux ? [{ mission: 'jeu10', reponses: { postes: voeux } }] : [] }; }
const F = K.fiches({ joueurs: [
  joueur('ancien', { niveau: 'B', postesOk: ['centre', 'ailier'], postesPref: null }),
  joueur('deux', { niveau: 'A', postesOk: ['troisieme-ligne', 'pilier', 'talonneur'], postesPref: ['talonneur', 'pilier'] }),
  joueur('aucun', { niveau: 'C', postesOk: ['ouvreur', 'centre'], postesPref: [] }),
  joueur('voeux', { niveau: 'C', postesOk: [] }, ['ailier', 'centre']),
] });
assert.deepStrictEqual(Array.from(K.prefDe(F.ancien)), ['centre'], 'avant la v43 : le 1er poste');
assert.deepStrictEqual(Array.from(F.deux.postesOk), ['talonneur', 'pilier', 'troisieme-ligne'], 'les préférés en tête');
assert.deepStrictEqual(Array.from(K.prefDe(F.deux)), ['talonneur', 'pilier']);
assert.strictEqual(K.posteDefaut(F.deux), 'talonneur', 'poste par défaut : son 1er préféré');
assert.strictEqual(K.lienPoste(F.deux, 'pilier'), 'pref');
assert.strictEqual(K.lienPoste(F.deux, 'troisieme-ligne'), 'sec');
assert.strictEqual(K.lienPoste(F.deux, 'ailier'), '');
assert.strictEqual(K.lienPoste(F.voeux, 'ailier'), 'pref', 'sans postes réglés : son 1er vœu');
assert.strictEqual(K.lienPoste(F.voeux, 'centre'), 'sec');
// rang : 0 pour tous les préférés, puis 1, 2… pour les autres
assert.strictEqual(K.rang(F.deux, 'pilier'), 0); assert.strictEqual(K.rang(F.deux, 'talonneur'), 0);
assert.strictEqual(K.rang(F.deux, 'troisieme-ligne'), 1); assert.strictEqual(K.rang(F.deux, 'ailier'), 9);
const R = K.repartition(['ancien', 'deux', 'aucun', 'voeux'], F);
function ligne(p) { return R.postes.filter(function (x) { return x.id === p; })[0]; }
assert.deepStrictEqual(Array.from(ligne('pilier').princ), ['deux'], 'deux préférés comptés en principal');
assert.deepStrictEqual(Array.from(ligne('talonneur').princ), ['deux']);
assert.deepStrictEqual(Array.from(ligne('troisieme-ligne').autres), ['deux']);
assert.deepStrictEqual(Array.from(ligne('centre').princ), ['ancien']);
assert.deepStrictEqual(Array.from(ligne('ouvreur').autres), ['aucun'], 'aucun préféré : tout en « peut aussi jouer »');
assert.deepStrictEqual(Array.from(R.sans), ['voeux'], 'vœux seulement : pas encore de poste réglé');
// (relecture v43) un enfant avec ses 7 postes et aucun préféré : son 7e poste (rang 7) est encore donné
const POS7 = ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier'];
// (les 9 autres places sont prises par des préférés : il ne reste qu'une place d'ailier, son 7e poste)
const AUTRES = ['pilier', 'pilier', 'talonneur', 'troisieme-ligne', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier'];
const F7 = K.fiches({ joueurs: [joueur('sept', { niveau: 'B', postesOk: POS7, postesPref: [] })].concat(AUTRES.map(function (p, i) { return joueur('a' + i, { niveau: 'B', postesOk: [p], postesPref: [p] }); })) });
assert.strictEqual(K.rang(F7.sept, 'ailier'), 7);
const A7 = K.apparier(['sept'].concat(AUTRES.map(function (p, i) { return 'a' + i; })), F7);
assert.strictEqual(A7.poste.sept, 'ailier', 'son 7e poste : ' + JSON.stringify(A7.poste));
assert.strictEqual(A7.manquants.length, 0);
// (v44) plaquage de 0 à 3 : repères A 3, B 2 ; « bon plaqueur » à 2 ; fiches bornées à 3
assert.deepStrictEqual([K.SEUIL.A, K.SEUIL.B, K.BON], [3, 2, 2]);
const FP = K.fiches({ joueurs: [joueur('a2', { niveau: 'A', plaquage: 2, postesOk: [] }), joueur('a3', { niveau: 'A', plaquage: 3, postesOk: [] }), joueur('b2', { niveau: 'B', plaquage: 2, postesOk: [] }), joueur('b1', { niveau: 'B', plaquage: 1, postesOk: [] }), joueur('x5', { niveau: 'B', plaquage: 5, postesOk: [] })] });
assert.strictEqual(FP.x5.plaquage, 3, 'une fiche ne dépasse pas 3');
const SA = K.stats({ niveau: 'A', joueurs: [{ id: 'a2' }, { id: 'a3' }] }, FP, 5), SB = K.stats({ niveau: 'B', joueurs: [{ id: 'b2' }, { id: 'b1' }] }, FP, 5);
assert.deepStrictEqual(Array.from(SA.sousSeuil), ['a2'], 'en A : sous 3');
assert.deepStrictEqual(Array.from(SB.sousSeuil), ['b1'], 'en B : sous 2');
assert.strictEqual(SA.bons, 2, 'bons plaqueurs : 2 ou plus'); assert.strictEqual(SB.bons, 1);
console.log('test_postes_pref : OK');
