// (v87) Demande de Nicolas du 15/11/2026 : dans la compo, dire qui démarre et qui est remplaçant à chaque poste
// (2 piliers, 1 talonneur, 2 3es lignes, 1 9, 1 10, 1 centre, 1 ailier, 1 arrière). Dans l'ordre affiché d'un poste, les premiers
// démarrent ; les suivants sont remplaçants. Un absent ne prend pas de place.
// Lancer : node tests/test_compo_v87.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
['postes-data.js', 'compos.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f }));
const K = ctx.MC.compos;
const J = (o) => JSON.parse(JSON.stringify(o));
function fiche(id, niveau, plaquage, postes) {
  return { id, prenom: id, niveau, plaquage, postesOk: postes, pref: postes.slice(0, 1), voeux: [], copains: [], passerelle: '', passerelles: [] };
}
const F = {
  p1: fiche('p1', 'A', 3, ['pilier']), p2: fiche('p2', 'A', 2, ['pilier']), p3: fiche('p3', 'B', 3, ['pilier']),
  t1: fiche('t1', 'B', 1, ['talonneur']), t2: fiche('t2', 'A', 1, ['talonneur']),
  a1: fiche('a1', 'B', 2, ['arriere']),
  x: fiche('x', 'C', 0, ['centre'])
};
const t = { id: 'A1', niveau: 'A', joueurs: [
  { id: 'p3', poste: 'pilier' }, { id: 'p1', poste: 'pilier' }, { id: 'p2', poste: 'pilier' },
  { id: 't1', poste: 'talonneur' }, { id: 't2', poste: 'talonneur' }, { id: 'a1', poste: 'arriere' }, { id: 'x', poste: '' }] };
// trié : les A d'abord, puis le plaquage ; 2 piliers et 1 talonneur démarrent
let T = K.titulaires(t, F);
assert.deepStrictEqual(Object.keys(T).sort(), ['a1', 'p1', 'p2', 't2'], 'les 2 meilleurs piliers, le talonneur A, l\'arrière ; pas le joueur sans poste');
// un absent ne prend pas de place : le pilier suivant démarre
T = K.titulaires(t, F, id => id === 'p1');
assert.deepStrictEqual(Object.keys(T).sort(), ['a1', 'p2', 'p3', 't2'], 'un absent laisse sa place');
// rangé à la main : l'ordre posé décide (le pilier B en tête démarre)
const m = K.ranger({ reglages: { format: 10 }, equipes: [t], banc: [] }, 'p3', 'A1', 'pilier', 'p1', F);
assert.strictEqual(m.equipes[0].tri, 'main');
T = K.titulaires(m.equipes[0], F);
assert.ok(T.p3 && T.p1 && !T.p2, 'le pilier mis en tête démarre, le 3e devient remplaçant : ' + Object.keys(T));
// remplaçant : à la fin du poste
const r = K.ranger(m, 'p3', 'A1', 'pilier', null, F);
T = K.titulaires(r.equipes[0], F);
assert.ok(!T.p3 && T.p1 && T.p2, 'remplaçant : il passe après les autres piliers');
// le texte partagé : les titulaires, puis « remplaçant(s) »
const FT = { p1: { prenom: 'Ana' }, p2: { prenom: 'Bob' }, p3: { prenom: 'Cid' }, t1: { prenom: 'Dan' }, t2: { prenom: 'Eve' }, a1: { prenom: 'Fox' }, x: { prenom: 'Gus' } };
const tx = K.texteCompo({ reglages: { format: 10 }, equipes: [m.equipes[0]] }, Object.assign({}, F, Object.fromEntries(Object.keys(FT).map(k => [k, Object.assign({}, F[k], FT[k])]))));
assert.ok(tx.indexOf('Piliers : Cid, Ana · remplaçant : Bob') > 0, tx);
assert.ok(tx.indexOf('Talonneur : Eve · remplaçant : Dan') > 0, tx);
assert.ok(tx.indexOf('Arrière : Fox\n') > 0 || /Arrière : Fox$/m.test(tx), tx);
// deux remplaçants : au pluriel
const t3 = { id: 'B1', niveau: 'B', joueurs: [{ id: 'a1', poste: 'arriere' }, { id: 'p1', poste: 'arriere' }, { id: 'p2', poste: 'arriere' }] };
const tx3 = K.texteCompo({ reglages: { format: 10 }, equipes: [t3] }, Object.fromEntries(Object.keys(FT).map(k => [k, Object.assign({}, F[k], FT[k])])));
assert.ok(/Arrière : \w+ · remplaçants : \w+, \w+/.test(tx3), tx3);
console.log('test_compo_v87 : OK');
