// (v50, v56) Les options d'une compo de plateau : organisation, joueurs par équipe, passerelles (par niveau | roulant),
// qui change de niveau quand les passerelles ne suffisent pas, copains (un pour chacun | d'abord | sans) ; les anciens « styles » s'y ramènent.
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
// (v67) priorite : ce qui s'équilibre d'abord au jeu à 10, les postes par défaut
const O = (o) => Object.assign({ orga: 'niveau', effectifs: 'equilibre', passerelles: 'roulant', copains: 'un', priorite: 'postes' }, o);
const OM = (o, m) => Object.assign(O(o), { montees: m });

// ----- les anciens styles et les anciennes valeurs -----
assert.deepStrictEqual(J(K.optsDe({ style: 'strict' })), OM({ effectifs: 'niveaux' }, 0));
assert.deepStrictEqual(J(K.optsDe({}, 'copains')), OM({ copains: 'dabord' }, 1));
assert.deepStrictEqual(J(K.optsDe({ style: 'aforte' })), OM({ orga: 'aforte' }, 1));
assert.strictEqual(K.optsDe({ opts: { passerelles: 'tour' } }).passerelles, 'roulant', '« À leur tour » devient « Roulant »');
assert.strictEqual(K.optsDe({ opts: { passerelles: 'aucune' } }).passerelles, 'niveau', '« Aucune » devient « Par niveau »');
assert.strictEqual(K.optsDe({ opts: { montees: 3 } }).montees, 1, 'plus de compteur : une par équipe');
assert.strictEqual(K.optsDe({ opts: { passerelles: 'niveau' } }).montees, 0, 'par niveau : pas de montée forcée');
assert.strictEqual(K.optsDe({ opts: { effectifs: 'niveaux' } }).montees, 0, 'suivre les niveaux : personne ne bouge');
assert.strictEqual(K.optsDe({ opts: { copains: 'sans' } }).copains, 'sans');
assert.ok(!('change' in K.optsDe({ opts: { change: 'tour' } })), 'plus d\'option « qui change de niveau »');
['equilibre', 'copains', 'strict', 'aforte'].forEach(s => assert.strictEqual(K.styleDe(K.optsDe({ style: s })), s));

// ----- Roulant : une passerelle par équipe monte, même si l'équipe A est pleine ; Par niveau : seulement si les effectifs le demandent -----
const spec = [];
for (let i = 0; i < 10; i++) spec.push(['a' + i, 'A', 3]);
spec[9] = ['a9', 'A', 3, 'B'];                                                 // un Confirmé avec ⇅B
for (let i = 0; i < 10; i++) spec.push(['b' + i, 'B', i < 2 ? 1 : 2, i < 2 ? 'A' : '']);   // b0 et b1 : ⇅A, pas les meilleurs plaqueurs
for (let i = 0; i < 9; i++) spec.push(['c' + i, 'C', 1]);
const F = groupe(spec), ids = Object.keys(F), nb = { A: 1, B: 1, C: 1 };
const HM = { b0: H1('2026-10-20', 'A') };                                      // b0 a joué en A le 20/10 : b1 d'abord
let p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ passerelles: 'niveau' }) });
assert.ok(!dans(p, 'A1').some(id => /^b/.test(id)), 'par niveau : l\'équipe A reste pleine de Confirmés ' + dans(p, 'A1'));
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9'], 'les effectifs restent');
assert.ok(dans(p, 'A1').includes('b1') && !dans(p, 'A1').includes('b0'), 'roulant : b1 monte (son tour : jamais en A), sans être le meilleur plaqueur ' + dans(p, 'A1'));
assert.strictEqual(dans(p, 'A1').filter(id => /^b/.test(id)).length, 1, 'une seule par équipe A');
assert.ok(dans(p, 'B1').includes('a9'), 'a9 (⇅B) laisse sa place');
assert.ok(/passerelle/.test(p.raisons.b1) && /Laisse sa place/.test(p.raisons.a9), J(p.raisons));
// le cas de Nicolas : 10 Confirmés, 13 Débrouillés, 6 Débutants, 3 équipes : 10 / 10 / 9, l'équipe A est juste pleine
const spN = [];
for (let i = 0; i < 10; i++) spN.push(['a' + i, 'A', 3]);
for (let i = 0; i < 13; i++) spN.push(['b' + (i < 10 ? '0' : '') + i, 'B', 2, i < 2 ? 'A' : '']);
for (let i = 0; i < 6; i++) spN.push(['c' + i, 'C', 1]);
const FN = groupe(spN);
p = K.proposer(Object.keys(FN), FN, {}, { format: 5, nb, opts: O({ passerelles: 'niveau' }) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9']);
assert.strictEqual(dans(p, 'A1').filter(id => /^b/.test(id)).length, 0, 'par niveau, 10 Confirmés pour 10 places : personne ne monte');
p = K.proposer(Object.keys(FN), FN, {}, { format: 5, nb, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9']);
assert.strictEqual(dans(p, 'A1').filter(id => /^b/.test(id)).length, 1, 'roulant, 10 Confirmés pour 10 places : une passerelle monte quand même');

// ----- Roulant : aussi de C vers B -----
const spC = [];
for (let i = 0; i < 8; i++) spC.push(['a' + i, 'A', 3]);
for (let i = 0; i < 8; i++) spC.push(['b' + i, 'B', 2, i === 7 ? 'C' : '']);   // b7 : ⇅C
for (let i = 0; i < 8; i++) spC.push(['c' + i, 'C', 1, i < 2 ? 'B' : '']);     // c0 et c1 : ⇅B
const FC = groupe(spC), HC = { c0: H1('2026-10-20', 'B') };
p = K.proposer(Object.keys(FC), FC, HC, { format: 5, nb, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:8', 'C1:8']);
assert.ok(dans(p, 'B1').includes('c1') && !dans(p, 'B1').includes('c0'), 'c1 monte en B, à son tour ' + dans(p, 'B1'));
assert.ok(dans(p, 'C1').includes('b7') && /Laisse sa place/.test(p.raisons.b7), 'b7 (⇅C) laisse sa place ' + J(p.raisons));
assert.ok(/Monte en B/.test(p.raisons.c1), J(p.raisons));
p = K.proposer(Object.keys(FC), FC, HC, { format: 5, nb, opts: O({ passerelles: 'niveau' }) });
assert.ok(!dans(p, 'B1').some(id => /^c/.test(id)), 'par niveau : l\'équipe B pleine, personne ne monte ' + dans(p, 'B1'));

// ----- quand l'équipe A manque de monde : par niveau le plaquage d'abord, roulant le tour d'abord -----
const spT = [];
for (let i = 0; i < 7; i++) spT.push(['a' + i, 'A', 3]);
spT.push(['b0', 'B', 3, 'A'], ['b1', 'B', 1, 'A']);                            // b0 : bon plaqueur, déjà monté ; b1 : moins avancé, jamais monté
for (let i = 2; i < 9; i++) spT.push(['b' + i, 'B', 2]);
const FT = groupe(spT), HT = { b0: H1('2026-10-20', 'A') }, nbT = { A: 1, B: 1, C: 0 };
p = K.proposer(Object.keys(FT), FT, HT, { format: 5, nb: nbT, opts: O({ passerelles: 'niveau' }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:8']);
assert.ok(dans(p, 'A1').includes('b0') && !dans(p, 'A1').includes('b1'), 'par niveau : le meilleur plaqueur monte ' + dans(p, 'A1'));
assert.ok(/plaquage/.test(p.raisons.b0), J(p.raisons));
p = K.proposer(Object.keys(FT), FT, HT, { format: 5, nb: nbT, opts: O({}) });
assert.ok(dans(p, 'A1').includes('b1') && !dans(p, 'A1').includes('b0'), 'roulant : celui qui n\'y a pas encore joué monte ' + dans(p, 'A1'));

// ----- A forte -----
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ orga: 'aforte' }) });
assert.ok(dans(p, 'A1').includes('b1'), 'A forte, roulant : b1 monte ' + dans(p, 'A1'));
p = K.proposer(ids, F, HM, { format: 5, nb, opts: O({ orga: 'aforte', passerelles: 'niveau' }) });
assert.ok(!dans(p, 'A1').some(id => /^b/.test(id)), 'A forte, par niveau : l\'équipe A pleine de Confirmés ' + dans(p, 'A1'));
const sp2 = [];
for (let i = 0; i < 7; i++) sp2.push(['a' + i, 'A', 3]);
for (let i = 0; i < 9; i++) sp2.push(['b' + i, 'B', i < 2 ? 1 : 3, i < 2 ? 'A' : '']);   // b0 et b1 : ⇅A, plaquage 1
const F2 = groupe(sp2), ids2 = Object.keys(F2), nb2 = { A: 1, B: 1, C: 0 };
p = K.proposer(ids2, F2, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte' }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:8']);
assert.strictEqual(dans(p, 'A1').filter(id => /^b[01]$/.test(id)).length, 1, 'A forte, 7 Confirmés pour 8 places : 1 passerelle monte ' + dans(p, 'A1'));
assert.strictEqual(dans(p, 'A1').filter(id => /^a/.test(id)).length, 7, 'les Confirmés restent');
// un Débutant avec ⇅A monte aussi quand l'équipe A a des places libres
const sp4 = [];
for (let i = 0; i < 6; i++) sp4.push(['a' + i, 'A', 3]);
for (let i = 0; i < 6; i++) sp4.push(['b' + i, 'B', 3]);
for (let i = 0; i < 4; i++) sp4.push(['c' + i, 'C', 1, i === 0 ? 'A' : '']);
const F4 = groupe(sp4);
p = K.proposer(Object.keys(F4), F4, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte' }) });
assert.ok(dans(p, 'A1').includes('c0'), 'A forte, places libres : le Débutant avec ⇅A monte ' + dans(p, 'A1'));
// A forte, par niveau : parmi les passerelles, le meilleur plaqueur
const sp5 = [];
for (let i = 0; i < 7; i++) sp5.push(['a' + i, 'A', 3]);
sp5.push(['b0', 'B', 3, 'A'], ['b1', 'B', 1, 'A']);
for (let i = 2; i < 9; i++) sp5.push(['b' + i, 'B', 3]);
const F5 = groupe(sp5), H5 = { b0: H1('2026-10-20', 'A') };
p = K.proposer(Object.keys(F5), F5, H5, { format: 5, nb: nb2, opts: O({ orga: 'aforte', passerelles: 'niveau' }) });
assert.ok(dans(p, 'A1').includes('b0') && !dans(p, 'A1').includes('b1'), 'A forte, par niveau : le meilleur plaqueur des passerelles ' + dans(p, 'A1'));
assert.ok(/plaquage/.test(p.raisons.b0), J(p.raisons));
p = K.proposer(Object.keys(F5), F5, H5, { format: 5, nb: nb2, opts: O({ orga: 'aforte' }) });
assert.ok(dans(p, 'A1').includes('b1') && !dans(p, 'A1').includes('b0'), 'A forte, roulant : celui qui n\'y a pas joué ' + dans(p, 'A1'));

// ----- quand les passerelles ne suffisent pas : avoir une passerelle passe devant, puis selon le plaquage ou chacun son tour -----
const sp3 = [];
for (let i = 0; i < 5; i++) sp3.push(['a' + i, 'A', 3]);
for (let i = 0; i < 12; i++) sp3.push(['b' + (i < 10 ? '0' : '') + i, 'B', i < 2 ? 1 : 3, i < 2 ? 'A' : '']);   // b00 et b01 : ⇅A, plaquage 1
const F3 = groupe(sp3), ids3 = Object.keys(F3);
p = K.proposer(ids3, F3, {}, { format: 5, nb: { A: 1, B: 1, C: 0 }, opts: O({ passerelles: 'niveau' }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:9']);
assert.ok(dans(p, 'A1').includes('b00') && dans(p, 'A1').includes('b01'), 'les passerelles comblent d\'abord ' + dans(p, 'A1'));
assert.strictEqual(dans(p, 'A1').length, 8);
const G = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['b1', 'B', 1], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 2], ['b5', 'B', 2], ['c1', 'C', 1]]);
const HG = { b1: H1('2026-10-25', 'C') };                                      // b1 (1★) est déjà descendu le 25/10
p = K.proposer(Object.keys(G), G, HG, { format: 5, nb, opts: O({}) });
assert.ok(dans(p, 'C1').includes('b1'), 'sans passerelle, roulant : le plaquage d\'abord, le moins avancé descend encore');
p = K.proposer(Object.keys(G), G, HG, { format: 5, nb, opts: O({ passerelles: 'niveau' }) });
assert.ok(dans(p, 'C1').includes('b1'), 'sans passerelle, par niveau : le plaquage d\'abord');
// à plaquage égal, chacun son tour
const G3 = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['b1', 'B', 2], ['b2', 'B', 2], ['b3', 'B', 2], ['b4', 'B', 2], ['b5', 'B', 2], ['c1', 'C', 1]]);
p = K.proposer(Object.keys(G3), G3, { b1: H1('2026-10-25', 'C') }, { format: 5, nb, opts: O({}) });
assert.ok(!dans(p, 'C1').includes('b1') && dans(p, 'C1').length === 3, 'à plaquage égal : un autre B descend ' + dans(p, 'C1'));
// une passerelle vers le bas : à son tour en Roulant, le moins avancé en « Plaquage d'abord »
const G2bis = groupe([['a1', 'A', 3], ['a2', 'A', 3], ['a3', 'A', 3], ['b1', 'B', 1, 'C'], ['b2', 'B', 2, 'C'], ['b3', 'B', 2], ['b4', 'B', 2], ['c1', 'C', 1], ['c2', 'C', 1]]);
p = K.proposer(Object.keys(G2bis), G2bis, HG, { format: 5, nb, opts: O({ passerelles: 'niveau' }) });
assert.ok(dans(p, 'C1').includes('b1') && !dans(p, 'C1').includes('b2'), 'plaquage d\'abord : le moins avancé des passerelles descend ' + dans(p, 'C1'));
p = K.proposer(Object.keys(G2bis), G2bis, HG, { format: 5, nb, opts: O({}) });
assert.ok(dans(p, 'C1').includes('b2') && !dans(p, 'C1').includes('b1'), 'roulant : b2, qui n\'y a pas encore joué, passe avant b1 ' + dans(p, 'C1'));

// ----- (relecture v56) A forte, à plaquage égal : à son tour -----
const sp6 = [];
for (let i = 0; i < 6; i++) sp6.push(['a' + i, 'A', 3]);
for (let i = 0; i < 10; i++) sp6.push(['b' + i, 'B', 2]);
const F6 = groupe(sp6);
p = K.proposer(Object.keys(F6), F6, { b0: H1('2026-10-20', 'A') }, { format: 5, nb: nb2, opts: O({ orga: 'aforte' }) });
assert.ok(!dans(p, 'A1').includes('b0') && dans(p, 'A1').includes('b1'), 'A forte, même plaquage : b0 a déjà monté, un autre monte ' + dans(p, 'A1'));

// ----- (relecture v56) Roulant : pas de Confirmé en équipe C pour faire monter un Débutant -----
const sp7 = [];
for (let i = 0; i < 12; i++) sp7.push(['a' + (i < 10 ? '0' : '') + i, 'A', 3]);
for (let i = 0; i < 3; i++) sp7.push(['b' + i, 'B', 2]);
for (let i = 0; i < 3; i++) sp7.push(['c' + i, 'C', 1, i === 0 ? 'B' : '']);
const F7 = groupe(sp7);
p = K.proposer(Object.keys(F7), F7, {}, { format: 5, nb, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:6', 'B1:6', 'C1:6']);
assert.ok(!dans(p, 'C1').some(id => /^a/.test(id)), 'aucun Confirmé en C ' + dans(p, 'C1'));
const nbSansA = { A: 0, B: 1, C: 1 }, sp8 = [];
for (let i = 0; i < 7; i++) sp8.push(['a' + i, 'A', 3]);
for (let i = 0; i < 4; i++) sp8.push(['b' + i, 'B', 2]);
for (let i = 0; i < 2; i++) sp8.push(['c' + i, 'C', 1, i === 0 ? 'B' : '']);
const F8 = groupe(sp8);
p = K.proposer(Object.keys(F8), F8, {}, { format: 5, nb: nbSansA, opts: O({}) });
assert.ok(!dans(p, 'C1').some(id => /^a/.test(id)), 'sans équipe A non plus ' + dans(p, 'C1'));
// le cas 10 / 13 / 6 garde sa montée de C vers B
const spN2 = [];
for (let i = 0; i < 10; i++) spN2.push(['a' + i, 'A', 3]);
for (let i = 0; i < 13; i++) spN2.push(['b' + (i < 10 ? '0' : '') + i, 'B', 2, i < 2 ? 'A' : '']);
for (let i = 0; i < 6; i++) spN2.push(['c' + i, 'C', 1, i < 2 ? 'B' : '']);
const FN2 = groupe(spN2);
p = K.proposer(Object.keys(FN2), FN2, {}, { format: 5, nb, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:10', 'C1:9']);
assert.strictEqual(dans(p, 'B1').filter(id => /^c/.test(id)).length, 1, '10 / 13 / 6 : une passerelle monte de C en B ' + dans(p, 'B1'));

// ----- (relecture v56) des tailles réglées à la main : tenues, même avec des montées -----
const sp9 = [];
for (let i = 0; i < 10; i++) sp9.push(['a' + i, 'A', 3]);
for (let i = 0; i < 5; i++) sp9.push(['c' + i, 'C', 1, i === 0 ? 'B' : '']);
const F9 = groupe(sp9);
p = K.proposer(Object.keys(F9), F9, {}, { format: 5, nb, tailles: { A1: 10, B1: 0, C1: 5 }, opts: O({}) });
assert.deepStrictEqual(tailles(p), ['A1:10', 'B1:0', 'C1:5'], 'une équipe voulue à 0 joueur reste vide');
// tirage : le total voulu de chaque niveau est tenu
let graine = 12345; const hasard = (n) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % n; };
for (let n = 0; n < 400; n++) {
  const sp = [], nA = 3 + hasard(10), nB = 3 + hasard(10), nC = 2 + hasard(8);
  for (let i = 0; i < nA; i++) sp.push(['a' + i, 'A', 2 + hasard(2), hasard(4) === 0 ? 'B' : '']);
  for (let i = 0; i < nB; i++) sp.push(['b' + i, 'B', hasard(4), ['', '', 'A', 'C', 'AC'][hasard(5)]]);
  for (let i = 0; i < nC; i++) sp.push(['c' + i, 'C', hasard(3), hasard(3) === 0 ? 'B' : '']);
  const Fh = groupe(sp), idsh = Object.keys(Fh), nbh = { A: 1 + hasard(2), B: 1 + hasard(2), C: 1 };
  const tid = K.teamIds(nbh), t = {}; let reste = idsh.length;
  tid.forEach((x, i) => { const v = i === tid.length - 1 ? reste : Math.min(reste, 1 + hasard(Math.ceil(idsh.length / tid.length) + 2)); t[x] = v; reste -= v; });
  ['niveau', 'roulant'].forEach(pa => {
    const q = K.proposer(idsh, Fh, {}, { format: 5, nb: nbh, tailles: t, opts: O({ passerelles: pa }) });
    assert.strictEqual(q.equipes.reduce((s, e) => s + e.joueurs.length, 0), idsh.length, 'personne de perdu');
    ['A', 'B', 'C'].forEach(l => {
      const voulu = tid.filter(x => x[0] === l).reduce((s, x) => s + t[x], 0), eu = q.equipes.filter(e => e.niveau === l).reduce((s, e) => s + e.joueurs.length, 0);
      assert.strictEqual(eu, voulu, 'niveau ' + l + ' : ' + eu + ' au lieu de ' + voulu + ' ' + JSON.stringify(t) + ' ' + pa);
    });
  });
}

// ----- (relecture v56) « Sans » : la correction proposée ne dépend pas des copains -----
const sp10 = [];
for (let i = 0; i < 4; i++) sp10.push(['b' + i, 'B', 3]);
for (let i = 4; i < 8; i++) sp10.push(['b' + i, 'B', 1]);
const F10 = groupe(sp10), F10b = J(F10); F10b.b5.copains = ['b1'];
const c10 = (co) => ({ reglages: { format: 5, nb: { A: 0, B: 2, C: 0 }, opts: O({ copains: co }) }, equipes: [{ id: 'B1', niveau: 'B', joueurs: ['b0', 'b1', 'b2', 'b3'].map(id => ({ id })) }, { id: 'B2', niveau: 'B', joueurs: ['b4', 'b5', 'b6', 'b7'].map(id => ({ id })) }], banc: [] });
const fixDe = (c, Fx) => { const a = K.alertes(c, Fx, {}).filter(x => x.k === 'plaquage')[0]; return a && a.fix && a.fix.texte; };
assert.ok(fixDe(c10('sans'), F10), 'une correction est proposée');
assert.strictEqual(fixDe(c10('sans'), F10b), fixDe(c10('sans'), F10), '« Sans » : la même correction, avec ou sans copains');
assert.notStrictEqual(fixDe(c10('un'), F10b), fixDe(c10('un'), F10), 'avec les copains, la correction en tient compte');

// ----- suivre les niveaux : personne ne change de niveau, même avec une passerelle -----
p = K.proposer(Object.keys(G), G, {}, { format: 5, nb, opts: O({ effectifs: 'niveaux' }) });
assert.deepStrictEqual(tailles(p), ['A1:3', 'B1:5', 'C1:1']);
const G2 = groupe([['a1', 'A', 3], ['b1', 'B', 2, 'A'], ['b2', 'B', 2, 'A'], ['b3', 'B', 2, 'A'], ['b4', 'B', 2], ['c1', 'C', 1, 'B']]);
p = K.proposer(Object.keys(G2), G2, {}, { format: 5, nb, opts: O({ effectifs: 'niveaux' }) });
assert.deepStrictEqual(tailles(p), ['A1:1', 'B1:4', 'C1:1'], 'les passerelles restent aussi dans leur niveau');
assert.deepStrictEqual(J(Object.keys(p.raisons)), [], J(p.raisons));
assert.deepStrictEqual(J(K.idsEquipes({ nb, opts: O({ orga: 'aforte' }) })), ['A1', 'B1', 'B2'], 'A forte : les équipes d\'après les options');

// ----- copains : « Sans », ils ne comptent pas du tout -----
const spCop = [];
for (let i = 0; i < 12; i++) spCop.push(['b' + (i < 10 ? '0' : '') + i, 'B', [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0][i]]);
const FCop = groupe(spCop), nbCop = { A: 0, B: 2, C: 0 };
const FSansAmis = J(FCop);
FCop.b00.copains = ['b01']; FCop.b01.copains = ['b00']; FCop.b10.copains = ['b02'];
const HCop = { b00: Object.assign(H1('2026-10-20', 'B'), { sansCopainSerie: 2 }) };
const eqs = (q) => JSON.stringify(q.equipes.map(t => t.joueurs.map(j => j.id).sort()));
p = K.proposer(Object.keys(FCop), FCop, HCop, { format: 5, nb: nbCop, opts: O({ copains: 'sans' }) });
assert.strictEqual(eqs(p), eqs(K.proposer(Object.keys(FSansAmis), FSansAmis, HCop, { format: 5, nb: nbCop, opts: O({ copains: 'sans' }) })), 'la compo est la même que si personne n\'avait de copain');
assert.ok(!Object.values(p.raisons).some(r => /Avec /.test(r)), J(p.raisons));
const avecUn = K.proposer(Object.keys(FCop), FCop, HCop, { format: 5, nb: nbCop, opts: O({}) });
assert.strictEqual(avecUn.equipes.find(t => t.joueurs.some(j => j.id === 'b00')).joueurs.some(j => j.id === 'b01'), true, 'un pour chacun : b00 avec b01');
const cAlerte = (c) => K.alertes({ reglages: { format: 5, nb: nbCop, opts: O({ copains: c }) }, equipes: p.equipes, banc: [] }, FCop, HCop).filter(a => a.k === 'copain').length;
const seule = p.equipes.find(t => t.joueurs.some(j => j.id === 'b00')).joueurs.some(j => j.id === 'b01');
if (!seule) assert.ok(cAlerte('un') > 0, 'avec l\'option normale, l\'alerte existe');
assert.strictEqual(cAlerte('sans'), 0, '« Sans » : pas d\'alerte sur les copains');
p = K.proposer(ids2, F2, {}, { format: 5, nb: nb2, opts: O({ orga: 'aforte', copains: 'sans' }) });
assert.deepStrictEqual(tailles(p), ['A1:8', 'B1:8'], 'A forte sans les copains');

// ----- serveur : les options sont gardées -----
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const tok = r.token;
const P = {};
['Tom', 'Léa'].forEach(n => { r = g.call({ action: 'addPlayer', token: tok, prenom: n, familleNom: 'Famille ' + n }); P[n] = r.joueur.id; });
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai', debut: '2026-11-21', sorte: 'plateau', presents: [P.Tom, P['Léa']] });
const eq = [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P['Léa'] }] }];
const evId = r.evenement.id;
r = g.call({ action: 'saveCompo', token: tok, evenementId: evId, reglages: { format: 5, nb: { A: 1, B: 1 }, style: 'equilibre', opts: { orga: 'niveau', effectifs: 'equilibre', passerelles: 'niveau', change: 'tour', copains: 'sans', pirate: 'x' } }, equipes: eq, banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.reglages.opts, { orga: 'niveau', effectifs: 'equilibre', passerelles: 'niveau', change: 'tour', copains: 'sans' }, 'gardées (les valeurs inconnues écartées)');
// un site plus ancien encore ouvert : ses valeurs restent acceptées
r = g.call({ action: 'setEvenement', token: tok, titre: 'Plateau - Essai 2', debut: '2026-11-28', sorte: 'plateau', presents: [P.Tom, P['Léa']] });
r = g.call({ action: 'saveCompo', token: tok, evenementId: r.evenement.id, reglages: { format: 5, nb: { A: 1, B: 1 }, style: 'equilibre', opts: { passerelles: 'tour', copains: 'pirate', montees: 2 } }, equipes: eq, banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.reglages.opts, { passerelles: 'tour', montees: 2 }, 'anciennes valeurs gardées');

console.log('test_options : OK');
