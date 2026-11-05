// (v50) Les options d'une compo de plateau (liste validée par Nicolas, 05/11) : organisation, joueurs par équipe, passerelles
// (dont combien montent en A par équipe A), qui change de niveau pour équilibrer, copains ; les anciens « styles » s'y ramènent.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_options.js
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
const dans = (p, id) => J(p.equipes.find(t => t.id === id).joueurs.map(j => j.id));
const H1 = (d, n) => ({ plateaux: 1, autre: 1, dernierAutre: d, avecCopain: 0, sansCopainSerie: 0, vus: {}, niveaux: {}, postes: {}, liste: [{ date: d, niveau: n, autre: true }] });
const O = (o) => Object.assign({ orga: 'niveau', effectifs: 'equilibre', passerelles: 'tour', change: 'plaquage', copains: 'un', montees: 0 }, o);

// ----- les anciens styles -----
assert.deepStrictEqual(J(K.optsDe({ style: 'strict' })), O({ effectifs: 'niveaux', passerelles: 'aucune' }));
assert.deepStrictEqual(J(K.optsDe({}, 'copains')), O({ copains: 'dabord' }));
assert.deepStrictEqual(J(K.optsDe({ style: 'aforte' })), O({ orga: 'aforte' }));
assert.strictEqual(K.optsDe({ opts: { passerelles: 'aucune', montees: 2 } }).montees, 0, 'sans passerelle : personne ne monte');
assert.strictEqual(K.optsDe({ opts: { montees: 9 } }).montees, 3, '3 au plus');
['equilibre', 'copains', 'strict', 'aforte'].forEach(s => assert.strictEqual(K.styleDe(K.optsDe({ style: s })), s));

// ----- les passerelles qui montent en A, même quand l'équipe A est pleine -----
const spec = [];
for (let i = 0; i < 10; i++) spec.push(['a' + i, 'A', 3]);
spec[9] = ['a9', 'A', 3, 'B'];                                                 // un Confirmé avec ⇅B
for (let i = 0; i < 10; i++) spec.push(['b' + i, 'B', i < 2 ? 1 : 2, i < 2 ? 'A' : '']);   // b0 et b1 : ⇅A, pas les meilleurs plaqueurs
for (let i = 0; i < 9; i++) spec.push(['c' + i, 'C', 1]);
const F = groupe(spec), ids = Object.keys(F), nb = { A: 1, B: 1, C: 1 };
const HM = { b0: H1('2026-10-20', 'A') };                                      // b0 a joué en A le 20/10 : b1 d'abord
let p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({}) });
assert.ok(!dans(p, 'A1').some(id => /^b/.test(id)), 'aucune montée demandée : l\'équipe A pleine de Confirmés');
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ montees: 1 }) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9'], 'les effectifs restent');
assert.ok(dans(p, 'A1').includes('b1') && !dans(p, 'A1').includes('b0'), 'b1 monte (son tour : jamais en A), sans être le meilleur plaqueur ' + dans(p, 'A1'));
assert.ok(dans(p, 'B1').includes('a9'), 'a9 (⇅B) laisse sa place');
assert.ok(/passerelle/.test(p.raisons.b1) && /Laisse sa place/.test(p.raisons.a9), J(p.raisons));
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ montees: 2 }) });
assert.ok(dans(p, 'A1').includes('b0') && dans(p, 'A1').includes('b1'), '2 montées');
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ montees: 1, passerelles: 'aucune' }) });
assert.ok(!dans(p, 'A1').some(id => /^b/.test(id)), 'passerelles : aucune');
// A forte : une place pour la passerelle dans l'équipe A pleine
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ orga: 'aforte', montees: 1 }) });
assert.ok(dans(p, 'A1').includes('b1'), 'A forte : b1 monte ' + dans(p, 'A1'));

// ----- (relecture v50) A forte : les montées aussi quand l'équipe A n'est pas pleine de Confirmés -----
const sp2 = [];
for (let i = 0; i < 7; i++) sp2.push(['a' + i, 'A', 3]);
for (let i = 0; i < 9; i++) sp2.push(['b' + i, 'B', i < 2 ? 1 : 3, i < 2 ? 'A' : '']);   // b0 et b1 : ⇅A, plaquage 1
const F2 = groupe(sp2), ids2 = Object.keys(F2), nb2 = { A: 1, B: 1, C: 0 };
p = K.proposer(ids2, F2, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', montees: 2 }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:8']);
assert.ok(dans(p, 'A1').includes('b0') && dans(p, 'A1').includes('b1'), 'A forte, 7 Confirmés pour 8 places : 2 montées ' + dans(p, 'A1'));
assert.strictEqual(dans(p, 'A1').filter(id => /^a/.test(id)).length, 6, 'un Confirmé laisse sa place');
assert.ok(Object.keys(p.raisons).some(id => /^a/.test(id) && /Laisse sa place/.test(p.raisons[id])), J(p.raisons));
p = K.proposer(ids2, F2, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', montees: 1 }) });
assert.strictEqual(dans(p, 'A1').filter(id => /^b[01]$/.test(id)).length, 1, '1 montée : la place libre');
// un Débutant avec ⇅A monte aussi quand l'équipe A a des places libres (A forte : les Débutants avec ⇅A comptent)
const sp4 = [];
for (let i = 0; i < 6; i++) sp4.push(['a' + i, 'A', 3]);
for (let i = 0; i < 6; i++) sp4.push(['b' + i, 'B', 3]);
for (let i = 0; i < 4; i++) sp4.push(['c' + i, 'C', 1, i === 0 ? 'A' : '']);
const F4 = groupe(sp4);
p = K.proposer(Object.keys(F4), F4, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', montees: 1 }) });
assert.ok(dans(p, 'A1').includes('c0'), 'A forte, places libres : le Débutant avec ⇅A monte ' + dans(p, 'A1'));
p = K.proposer(Object.keys(F4), F4, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', montees: 0 }) });
assert.ok(!dans(p, 'A1').includes('c0'), 'sans montée : les meilleurs plaqueurs B complètent ' + dans(p, 'A1'));

// ----- (relecture v50) « Passerelles : aucune » : avoir une passerelle ne fait pas passer devant -----
p = K.proposer(ids2, F2, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', passerelles: 'aucune' }) });
assert.ok(!dans(p, 'A1').includes('b0') && !dans(p, 'A1').includes('b1'), 'A forte sans passerelle : le meilleur plaqueur complète ' + dans(p, 'A1'));
assert.ok(!Object.values(p.raisons).some(r => /passerelle/.test(r)), J(p.raisons));
const sp3 = [];
for (let i = 0; i < 5; i++) sp3.push(['a' + i, 'A', 3]);
for (let i = 0; i < 12; i++) sp3.push(['b' + (i < 10 ? '0' : '') + i, 'B', i < 2 ? 1 : 3, i < 2 ? 'A' : '']);   // b00 et b01 : ⇅A, plaquage 1
const F3 = groupe(sp3), ids3 = Object.keys(F3);
p = K.proposer(ids3, F3, {}, { format: 5, nb: { A: 1, B: 1, C: 0 }, opts: O({ passerelles: 'aucune' }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:9']);
assert.ok(!dans(p, 'A1').includes('b00') && !dans(p, 'A1').includes('b01'), 'par niveau sans passerelle : les meilleurs plaqueurs montent ' + dans(p, 'A1'));
p = K.proposer(ids3, F3, {}, { format: 5, nb: { A: 1, B: 1, C: 0 }, opts: O({}) });
assert.ok(dans(p, 'A1').includes('b00') && dans(p, 'A1').includes('b01'), 'avec les passerelles : elles comblent d\'abord');

// ----- pour équilibrer, qui change de niveau : selon le plaquage, ou chacun son tour -----
const G = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['b1', 'B', 1], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 2], ['b5', 'B', 2], ['c1', 'C', 1]]);
const HG = { b1: H1('2026-10-25', 'C') };                                      // b1 (1★) est déjà descendu le 25/10
p = K.proposer(Object.keys(G), G, HG, { format: 5, nb, opts: O({}) });
assert.ok(dans(p, 'C1').includes('b1'), 'selon le plaquage : le moins avancé descend encore');
p = K.proposer(Object.keys(G), G, HG, { format: 5, nb, opts: O({ change: 'tour' }) });
assert.ok(!dans(p, 'C1').includes('b1') && dans(p, 'C1').length === 3, 'chacun son tour : un autre B descend ' + dans(p, 'C1'));

// ----- joueurs par équipe : suivre les niveaux -----
p = K.proposer(Object.keys(G), G, {}, { format: 5, nb, opts: O({ effectifs: 'niveaux' }) });
assert.deepStrictEqual(tailles(p), ['A1:3', 'B1:5', 'C1:1']);
assert.deepStrictEqual(J(K.idsEquipes({ nb, opts: O({ orga: 'aforte' }) })), ['A1', 'B1', 'B2'], 'A forte : les équipes d\'après les options');

// ----- serveur : les options sont gardées -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const P = {};
['Tom', 'Léa'].forEach(n => { r = g.call({ action: 'addPlayer', token: tok, prenom: n, familleNom: 'Famille ' + n }); P[n] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-11-21', sorte: 'plateau', presents: [P.Tom, P['Léa']] });
r = g.call({ action: 'saveCompo', token: tok, evenementId: r.evenement.id, reglages: { format: 5, nb: { A: 1, B: 1 }, style: 'equilibre', opts: { orga: 'niveau', effectifs: 'equilibre', passerelles: 'tour', change: 'tour', copains: 'pirate', montees: 2, autre: 'x' } },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P['Léa'] }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.reglages.opts, { orga: 'niveau', effectifs: 'equilibre', passerelles: 'tour', change: 'tour', montees: 2 }, 'gardées (les valeurs inconnues écartées)');

console.log('test_options : OK');
