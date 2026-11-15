// (v85) Demandes de Nicolas du 15/11/2026 :
// - un nouveau poste : l'arrière (le 15) ; au jeu à 10, derrière : 9, 10, centre, ailier, arrière (avant : 2 ailiers) ;
// - dans chaque poste d'une équipe, par défaut : les A en haut, puis le plaquage du plus fort au plus faible ;
// - glisser-déposer : un joueur se range à une place précise dans un poste, l'équipe garde alors l'ordre posé à la main.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_compo_v85.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
['postes-data.js', 'compos.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f }));
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
function fiche(id, niveau, plaquage, postes, passerelle) {
  return { id, prenom: id, niveau, plaquage, postesOk: postes, pref: postes.slice(0, 1), voeux: [], copains: [], passerelle: passerelle || '', passerelles: passerelle ? passerelle.split('') : [] };
}
const ids = (l) => Array.from(l, j => j.id);

// ----- l'arrière : un 8e poste, une place au jeu à 10 -----
assert.deepStrictEqual(J(K.POSTES10), [['pilier', 2], ['talonneur', 1], ['troisieme-ligne', 2], ['demi-de-melee', 1], ['ouvreur', 1], ['centre', 1], ['ailier', 1], ['arriere', 1]]);
assert.strictEqual(K.POSTES10.reduce((n, p) => n + p[1], 0), 10, 'toujours 10 places');
assert.strictEqual(K.ORDRE[K.ORDRE.length - 1], 'arriere', 'l\'arrière en dernier');
assert.strictEqual(K.typePoste('arriere'), 'ar', 'dans les lignes arrières');
assert.strictEqual(K.typeDe({ postesOk: ['arriere', 'pilier'] }), 'les2');
const carte = ctx.MC.POSTES.filter(p => p.id === 'arriere')[0];
assert.ok(carte && carte.n === '15' && carte.stats.length === 6 && carte.pouvoirs.length === 2 && carte.videos.length === 2, 'la carte de l\'arrière');
assert.strictEqual(ctx.MC.POSTES.length, 8); assert.deepStrictEqual(J(ctx.MC.POSTES.map(p => p.id)), J(K.ORDRE), 'les cartes dans l\'ordre des postes');
assert.strictEqual(new Set(ctx.MC.POSTES.map(p => p.color)).size, 8, 'une couleur par poste');
// un arrière de fiche prend la place d'arrière ; sans arrière, la place manque (elle n'est donnée à personne d'office au plateau)
const E = {};
['pilier', 'pilier', 'talonneur', 'troisieme-ligne', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'arriere', 'ailier'].forEach((p, i) => { E['e' + i] = fiche('e' + i, 'B', 2, [p]); });
let ap = K.apparier(Object.keys(E), E);
assert.deepStrictEqual(J(ap.manquants), []); assert.strictEqual(ap.poste.e9, 'arriere'); assert.strictEqual(ap.poste.e10, '', 'le 2e ailier : plus de place sur le terrain');
assert.strictEqual(K.postesEquipe(Object.keys(E), E).e10, 'ailier', 'il reste ailier, en plus');
delete E.e9;
ap = K.apparier(Object.keys(E), E);
assert.deepStrictEqual(J(ap.manquants), ['arriere'], 'sans arrière sur les fiches : la place reste à couvrir');
assert.strictEqual(K.apparier(Object.keys(E), E, true).poste.e10, 'arriere', 'dans un match d\'entraînement (tout le monde joue) : le 2e ailier passe arrière');
let st = K.stats({ joueurs: Object.keys(E).map(id => ({ id, poste: E[id].postesOk[0] })) }, E, 10);
assert.strictEqual(st.ar, 4); assert.deepStrictEqual(J(st.manquants), ['arriere']); assert.strictEqual(st.rempl, 1, 'le 2e ailier est en plus');
// le texte partagé
const FT = { a: { prenom: 'Ana' }, b: { prenom: 'Bob' } };
assert.ok(K.texteCompo({ reglages: { format: 10 }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'a', poste: 'arriere' }, { id: 'b', poste: 'ailier' }] }] }, FT).indexOf('Ailier : Bob\nArrière : Ana') > 0);

// ----- le tri par défaut dans un poste : les A en haut, puis le plaquage -----
const F = {
  b3: fiche('b3', 'B', 3, ['pilier']), a1: fiche('a1', 'A', 1, ['pilier']), a3: fiche('a3', 'A', 3, ['pilier']), c2: fiche('c2', 'C', 2, ['pilier']),
  bx: fiche('bx', 'B', null, ['pilier']), b1p: fiche('b1p', 'B', 1, ['pilier'], 'A'), sn: fiche('sn', '', 3, ['pilier']), t1: fiche('t1', 'C', 3, ['talonneur']), n9: fiche('n9', 'A', 0, ['demi-de-melee'])
};
const eq = () => ({ id: 'B1', niveau: 'B', joueurs: ['c2', 'n9', 'bx', 'b3', 'sn', 't1', 'a1', 'b1p', 'a3'].map(id => ({ id, poste: F[id].postesOk[0], n: F[id].niveau })) });
let sc = K.sections(eq(), F, 10);
assert.deepStrictEqual(ids(sc.av), ['a3', 'a1', 'b1p', 'b3', 'bx', 'c2', 'sn', 't1'],
  'piliers : A (3 puis 1), B avec passerelle vers A, B (3, puis pas encore évalué), C, sans niveau ; puis le talonneur');
assert.deepStrictEqual(ids(sc.ar), ['n9']);
assert.deepStrictEqual(ids(K.ordonnes(eq(), F, 10)), ['a3', 'a1', 'b1p', 'b3', 'bx', 'c2', 'sn', 't1', 'n9']);
// à égalité : l'ordre de l'équipe
const F2 = { x: fiche('x', 'B', 2, ['centre']), y: fiche('y', 'B', 2, ['centre']) };
assert.deepStrictEqual(ids(K.sections({ joueurs: [{ id: 'y', poste: 'centre' }, { id: 'x', poste: 'centre' }] }, F2, 10).ar), ['y', 'x']);
// jeu à 5 : par poste de fiche, puis le même tri
assert.deepStrictEqual(ids(K.sections(eq(), F, 5).av), ['a3', 'a1', 'b1p', 'b3', 'bx', 'c2', 'sn', 't1']);
// le texte partagé suit l'ordre affiché
assert.ok(K.texteCompo({ reglages: { format: 10 }, equipes: [eq()] }, Object.fromEntries(Object.keys(F).map(k => [k, { ...F[k], prenom: k.toUpperCase() }]))).indexOf('Piliers : A3, A1 · remplaçants : B1P, B3, BX, C2, SN') > 0)   // (v87) les 2 titulaires, puis les remplaçants, dans l'ordre affiché;

// ----- rangé à la main : l'ordre posé est gardé -----
const c0 = { reglages: { format: 10, nb: { A: 0, B: 2, C: 0 } }, banc: ['z'], equipes: [eq(), { id: 'B2', niveau: 'B', joueurs: [{ id: 'q', poste: 'pilier', n: 'B' }] }] };
F.z = fiche('z', 'B', 2, ['ailier']); F.q = fiche('q', 'B', 2, ['pilier']);
// c2 remonte devant a3 (tout en haut des piliers)
let c1 = K.ranger(c0, 'c2', 'B1', 'pilier', 'a3', F);
assert.strictEqual(c1.equipes[0].tri, 'main'); assert.ok(!c0.equipes[0].tri, 'la compo de départ n\'est pas touchée');
assert.deepStrictEqual(ids(K.sections(c1.equipes[0], F, 10).av), ['c2', 'a3', 'a1', 'b1p', 'b3', 'bx', 'sn', 't1'], 'les autres gardent l\'ordre qu\'ils avaient à l\'écran');
// à la fin du poste (pas de joueur visé)
c1 = K.ranger(c1, 'a3', 'B1', 'pilier', null, F);
assert.deepStrictEqual(ids(K.sections(c1.equipes[0], F, 10).av), ['c2', 'a1', 'b1p', 'b3', 'bx', 'sn', 'a3', 't1']);
// changer de poste à une place précise : t1 devient pilier, juste avant b3 ; n9 passe talonneur
c1 = K.ranger(c1, 't1', 'B1', 'pilier', 'b3', F);
c1 = K.ranger(c1, 'n9', 'B1', 'talonneur', null, F);
sc = K.sections(c1.equipes[0], F, 10);
assert.deepStrictEqual(ids(sc.av), ['c2', 'a1', 'b1p', 't1', 'b3', 'bx', 'sn', 'a3', 'n9']); assert.deepStrictEqual(ids(sc.ar), []);
assert.strictEqual(c1.equipes[0].joueurs.filter(j => j.id === 't1')[0].poste, 'pilier');
// depuis « Pas placés », et depuis une autre équipe (il quitte la sienne, qui ne change pas de mode)
c1 = K.ranger(c1, 'z', 'B1', 'arriere', null, F);
assert.deepStrictEqual(J(c1.banc), []); assert.deepStrictEqual(ids(K.sections(c1.equipes[0], F, 10).ar), ['z']);
assert.deepStrictEqual(J(c1.equipes[0].joueurs.filter(j => j.id === 'z')[0]), { id: 'z', poste: 'arriere', n: 'B' });
c1 = K.ranger(c1, 'q', 'B1', 'pilier', 'c2', F);
assert.deepStrictEqual(ids(c1.equipes[1].joueurs), []); assert.ok(!c1.equipes[1].tri);
assert.deepStrictEqual(ids(K.sections(c1.equipes[0], F, 10).av).slice(0, 2), ['q', 'c2']);
// un joueur ajouté ensuite par un toucher (moveTo + setPoste) dans une équipe rangée à la main : à la fin de son poste, rien d'autre ne bouge
let c2 = K.setPoste(K.moveTo(c1, 'q', 'B2', F), 'q', 'pilier');
c2 = K.setPoste(K.moveTo(c2, 'q', 'B1', F), 'q', 'pilier');
assert.deepStrictEqual(ids(K.sections(c2.equipes[0], F, 10).av), ['c2', 'a1', 'b1p', 't1', 'b3', 'bx', 'sn', 'a3', 'q', 'n9']);
// revenir au tri par défaut
let c3 = K.triAuto(c1, 'B1');
assert.ok(!c3.equipes[0].tri); assert.strictEqual(c1.equipes[0].tri, 'main');
assert.deepStrictEqual(ids(K.sections(c3.equipes[0], F, 10).av).slice(0, 3), ['a3', 'a1', 'b1p']);
// posé là où le tri par défaut l'aurait mis : l'équipe reste en tri par défaut
let c4 = K.ranger(c0, 'z', 'B1', 'pilier', 'c2', F);   // z (B, 2) : après les B à 3 et pas évalués ? non : B à 2 passe avant « pas encore évalué »
assert.strictEqual(c4.equipes[0].tri, 'main', 'devant c2 mais après bx : ce n\'est pas l\'ordre par défaut');
c4 = K.ranger(c0, 'z', 'B1', 'pilier', 'bx', F);
assert.ok(!c4.equipes[0].tri, 'juste avant bx : c\'est sa place par défaut, l\'équipe reste triée');
assert.deepStrictEqual(ids(K.sections(c4.equipes[0], F, 10).av), ['a3', 'a1', 'b1p', 'b3', 'z', 'bx', 'c2', 'sn', 't1']);
// sur lui-même, ou vers une équipe inconnue : rien
assert.strictEqual(K.ranger(c0, 'a3', 'B1', 'pilier', 'a3', F), c0); assert.strictEqual(K.ranger(c0, 'a3', 'ZZ', 'pilier', null, F), c0);
// jeu à 5 : pas de poste dans la compo
let c5 = K.ranger({ reglages: { format: 5 }, banc: [], equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: 'a3', poste: '' }, { id: 'a1', poste: '' }] }] }, 'a1', 'A1', 'pilier', 'a3', F);
assert.deepStrictEqual(J(c5.equipes[0].joueurs.map(j => [j.id, j.poste])), [['a1', ''], ['a3', '']]); assert.strictEqual(c5.equipes[0].tri, 'main');
// les changements de place d'une contre-proposition : un ordre seul n'est pas un changement d'équipe ni de poste
assert.deepStrictEqual(J(K.diff(c0, K.ranger(c0, 'c2', 'B1', 'pilier', 'a3', F))), []);

// ----- le test « Aide-moi à choisir » peut répondre « Arrière » -----
vm.runInContext('MC.logic = { today: function () { return "2026-11-15"; } };', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'missions.js'), 'utf8'), ctx, { filename: 'missions.js' });
const M = ctx.MC.missions;
// taper au pied · très rapide + mains adroites · rattraper celui qui s'échappe · chercher l'espace · organiser
const top = M.quizResults([[4], [1, 4], [3], [1], [0]]);
assert.strictEqual(top[0].p.id, 'arriere', 'le profil d\'un arrière : ' + top.map(x => x.p.id + ' ' + x.pct).join(', '));
// un profil de pilier ne change pas
assert.strictEqual(M.quizResults([[0], [0], [2], [0], [1]])[0].p.id, 'pilier');

// ----- serveur : le poste d'arrière et l'ordre à la main sont gardés -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const pj = {};
const temp = {};
['Tom', 'Léa', 'Zoé'].forEach(x => { r = g.call({ action: 'addPlayer', token: tok, prenom: x, familleNom: 'Famille ' + x }); pj[x] = r.joueur.id; temp[x] = r.code; });
r = g.call({ action: 'setTerrain', token: tok, lignes: [{ joueurId: pj.Tom, postesOk: ['arriere', 'ailier', 'gardien'], postesPref: ['arriere'] }] });
assert.deepStrictEqual(J(r.terrain[pj.Tom].postesOk), ['arriere', 'ailier'], 'la fiche garde « arrière »'); assert.deepStrictEqual(J(r.terrain[pj.Tom].postesPref), ['arriere']);
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-12-05', sorte: 'plateau', presents: Object.values(pj) });
const evId = r.evenement.id;
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, version: 0, banc: [], reglages: { format: 10, nb: { A: 0, B: 2, C: 0 } },
  equipes: [{ id: 'B1', niveau: 'B', tri: 'main', joueurs: [{ id: pj['Zoé'], poste: 'arriere' }, { id: pj.Tom, poste: 'arriere' }] }, { id: 'B2', niveau: 'B', tri: 'pirate', joueurs: [{ id: pj['Léa'], poste: 'ailier' }] }] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(J(r.compo.equipes.map(t => [t.id, t.tri || '', t.joueurs.map(j => j.poste).join()])), [['B1', 'main', 'arriere,arriere'], ['B2', '', 'ailier']]);
assert.deepStrictEqual(J(r.compo.equipes[0].joueurs.map(j => j.id)), [pj['Zoé'], pj.Tom], 'l\'ordre des joueurs est gardé');
// (relecture) modifier une compo publiée en ne changeant QUE l'ordre (équipe rangée à la main) : c'est un changement, version 2
const pub = r.compo, eqs = (tri, ids) => [{ id: 'B1', niveau: 'B', tri: tri, joueurs: ids.map(id => ({ id: id, poste: 'arriere' })) }, { id: 'B2', niveau: 'B', joueurs: [{ id: pj['Léa'], poste: 'ailier' }] }];
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, compoId: pub.id, version: pub.version, banc: [], reglages: pub.reglages, equipes: eqs('main', [pj.Tom, pj['Zoé']]) });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.version, 2, 'un changement d\'ordre seul crée une nouvelle version');
assert.deepStrictEqual(J(r.compo.equipes[0].joueurs.map(j => j.id)), [pj.Tom, pj['Zoé']], 'le nouvel ordre est enregistré');
// « remettre le tri » seul : aussi un changement
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, compoId: r.compo.id, version: 2, banc: [], reglages: pub.reglages, equipes: eqs(undefined, [pj.Tom, pj['Zoé']]) });
assert.strictEqual(r.compo.version, 3, '« remettre le tri » seul crée une nouvelle version'); assert.strictEqual(r.compo.equipes[0].tri, undefined);
// rien de changé (équipes triées, ordre différent mais pas « à la main ») : pas de nouvelle version
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, compoId: r.compo.id, version: 3, banc: [], reglages: pub.reglages, equipes: eqs(undefined, [pj['Zoé'], pj.Tom]) });
assert.strictEqual(r.compo.version, 3, 'une équipe triée : l\'ordre envoyé ne compte pas');
// les vœux d'un enfant : l'arrière se choisit
r = g.call({ action: 'login', joueurId: pj.Tom, pin: temp.Tom }); assert.ok(r.token, JSON.stringify(r));
r = g.call({ action: 'setPin', token: r.token, pin: '7391' }); assert.ok(r.token, JSON.stringify(r));
r = g.call({ action: 'mission', token: r.token, mission: 'jeu10', postes: ['arriere', 'pirate'] });
assert.ok(r.ok, JSON.stringify(r)); assert.deepStrictEqual(J(r.missions[0].reponses.postes), ['arriere'], 'l\'arrière dans les vœux, un poste inconnu retiré');
// l'ancien formulaire : « Arrière » et « 15 » sont reconnus
assert.strictEqual(g.Core._posteDuTexte('Arrière'), 'arriere'); assert.strictEqual(g.Core._posteDuTexte('15'), 'arriere'); assert.strictEqual(g.Core._posteDuTexte('arriere'), 'arriere');
assert.strictEqual(g.Core._posteDuTexte('Ailier'), 'ailier');
console.log('test_compo_v85 : OK');
