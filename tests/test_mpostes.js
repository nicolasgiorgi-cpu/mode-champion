// (v92) Missions de poste, épisode 1 (essai pour les éducs) : la partie sans écran (js/mpostes.js) — l'adresse de la page,
// la lecture des messages de la page (postMessage), mes avis, et les avis rangés par poste puis par situation.
// Lancer : node tests/test_mpostes.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../js/mpostes.js', 'utf8'), ctx, { filename: 'mpostes' });
const MP = ctx.MC.mpostes, J = x => JSON.parse(JSON.stringify(x));

// les 8 postes, dans l'ordre du terrain, les mêmes que la page
assert.deepStrictEqual(J(MP.IDS), ['pil', 'tal', 'l3', 'm9', 'o10', 'ctr', 'ail', 'arr']);
const page = fs.readFileSync(__dirname + '/../missions-postes/index.html', 'utf8');
assert.ok(page.indexOf("var ORDER=['pil','tal','l3','m9','o10','ctr','ail','arr'];") >= 0, 'même ordre que la page');
MP.POSTES.forEach(p => assert.ok(page.indexOf("POSTS." + p.id + "={ name:'" + p.nom.replace("'", '’') + "'") >= 0 && page.indexOf("col:'" + p.col + "'") >= 0, 'nom et couleur de ' + p.id));
// aucun prénom d'enfant dans la page (dépôt public) : celui de l'appli, sinon « Champion »
assert.ok(!/Marcel/.test(page), 'pas de prénom écrit en dur');
assert.ok(/var PRENOM = nomOk\(QS\.prenom\)\|\|'Champion';/.test(page));

// l'adresse : le mode éduc, la version, une situation précise si on veut (vérifiée)
assert.strictEqual(MP.adresse('92'), 'missions-postes/index.html?educ=1&v=92');
assert.strictEqual(MP.adresse('92', { p: 'ail', s: '2' }), 'missions-postes/index.html?educ=1&v=92&p=ail&s=2');
assert.strictEqual(MP.adresse('92', { p: 'l3', s: '4', alt: '1' }), 'missions-postes/index.html?educ=1&v=92&p=l3&s=4&alt=1');
assert.strictEqual(MP.adresse('92', { p: 'l3', s: '3', alt: '1' }), 'missions-postes/index.html?educ=1&v=92&p=l3&s=3', 'variante : situation 4 seulement');
assert.strictEqual(MP.adresse('92', { p: 'arr', s: '0' }), 'missions-postes/index.html?educ=1&v=92&p=arr&s=0', 'la fin');
assert.strictEqual(MP.adresse('92', { p: 'xx', s: '2' }), 'missions-postes/index.html?educ=1&v=92', 'poste inconnu : le choix du poste');
assert.strictEqual(MP.adresse('92', { p: 'pil', s: '9' }), 'missions-postes/index.html?educ=1&v=92&p=pil', 'situation inconnue : l\'accroche');
assert.strictEqual(MP.adresse('92', { p: 'pil', s: '1&educ=0' }), 'missions-postes/index.html?educ=1&v=92&p=pil');

// les messages de la page : seulement ceux qu'on connaît, vérifiés
assert.deepStrictEqual(J(MP.lireMessage({ mp: 'pret' })), { mp: 'pret' });
assert.deepStrictEqual(J(MP.lireMessage({ mp: 'fermer', x: 1 })), { mp: 'fermer' });
[null, 'avis', 3, {}, { mp: 'inconnu' }, { mp: 'avis', poste: 'pilier', situation: 1 }, { mp: 'avis', poste: 'pil', situation: 5 }, { mp: 'avis', poste: 'pil', situation: '2' }, { mp: 'avis', poste: 'pil', situation: 1.5 }, { mp: 'avis', poste: 'pil', situation: -1 }]
  .forEach(d => assert.strictEqual(MP.lireMessage(d), null, JSON.stringify(d)));
let m = MP.lireMessage({ mp: 'avis', poste: 'l3', situation: 4, variante: true, titre: '3e ligne · situation 4 (variante)', sous: 'Attaque · un copain est plaqué', autre: '<b>' });
assert.deepStrictEqual(J(m), { mp: 'avis', poste: 'l3', situation: 4, variante: true, titre: '3e ligne · situation 4 (variante)', sous: 'Attaque · un copain est plaqué' });
m = MP.lireMessage({ mp: 'avis', poste: 'l3', situation: 2, variante: true });
assert.strictEqual(m.variante, false, 'variante : situation 4 seulement');
assert.strictEqual(m.titre, '3e ligne · situation 2', 'un titre par défaut');
m = MP.lireMessage({ mp: 'avis', poste: 'arr', situation: 0, titre: 'x'.repeat(300) });
assert.strictEqual(m.titre.length, 80, 'titre coupé');
assert.strictEqual(MP.lireMessage({ mp: 'avis', poste: 'arr', situation: 0 }).titre, 'Arrière · fin de l\'épisode');
assert.strictEqual(MP.lireMessage({ mp: 'avis', poste: 'pil', situation: 4, variante: 'oui' }).variante, false);

// mes avis, mon avis sur un écran
const R = [
  { id: 'a', poste: 'ail', situation: 2, variante: false, avis: 'revoir', texte: 'L\'ailier reste de son côté ?', parNom: 'Cyril', moi: false, maj: '2026-11-20T20:00:00Z' },
  { id: 'b', poste: 'pil', situation: 1, variante: false, avis: 'juste', texte: '', parNom: 'Nico', moi: true, maj: '2026-11-20T19:00:00Z' },
  { id: 'c', poste: 'pil', situation: 0, variante: false, avis: 'juste', texte: 'Top', parNom: 'Nico', moi: true, maj: '2026-11-20T21:00:00Z' },
  { id: 'd', poste: 'pil', situation: 4, variante: true, avis: 'revoir', texte: 'Variante trop rapide', parNom: 'Cyril', moi: false, maj: '2026-11-20T18:00:00Z' },
  { id: 'e', poste: 'pil', situation: 4, variante: false, avis: 'juste', texte: '', parNom: 'Nico', moi: true, maj: '2026-11-20T18:30:00Z' },
  { id: 'f', poste: 'pil', situation: 1, variante: false, avis: 'revoir', texte: 'Le talonneur est mal placé', parNom: 'Cyril', moi: false, maj: '2026-11-20T21:30:00Z' },
  { id: 'g', poste: 'xx', situation: 1, avis: 'juste', moi: false },
  { id: 'h', poste: 'pil', situation: 7, avis: 'juste', moi: false }
];
assert.deepStrictEqual(J(MP.mesAvis(R)), [
  { poste: 'pil', situation: 1, variante: false, avis: 'juste' }, { poste: 'pil', situation: 0, variante: false, avis: 'juste' }, { poste: 'pil', situation: 4, variante: false, avis: 'juste' }]);
assert.strictEqual(MP.monAvis(R, { poste: 'pil', situation: 4, variante: false }).id, 'e');
assert.strictEqual(MP.monAvis(R, { poste: 'pil', situation: 4, variante: true }), null, 'la variante de Cyril n\'est pas mon avis');
assert.strictEqual(MP.monAvis(R, { poste: 'ail', situation: 2 }), null);

// rangés par poste (ordre du terrain), puis par situation (1… 4, 4 variante, la fin), le plus récent d'abord
const G = MP.grouper(R);
assert.deepStrictEqual(J(G.map(g => g.poste.id)), ['pil', 'ail'], 'ordre du terrain, postes inconnus écartés');
assert.deepStrictEqual(J(G[0].sits.map(s => [s.situation, s.variante])), [[1, false], [4, false], [4, true], [0, false]]);
assert.deepStrictEqual(J(G[0].sits[0].retours.map(x => x.id)), ['f', 'b'], 'le plus récent d\'abord');
assert.strictEqual(G[0].n, 5); assert.strictEqual(G[0].juste, 3); assert.strictEqual(G[0].revoir, 2);
assert.strictEqual(MP.sitNom(4, true), 'Situation 4 · variante'); assert.strictEqual(MP.sitNom(0), 'Fin de l\'épisode'); assert.strictEqual(MP.sitNom(2, false), 'Situation 2');
assert.deepStrictEqual(J(MP.compte(R.slice(0, 6))), { n: 6, revoir: 3 });
assert.deepStrictEqual(J(MP.grouper(null)), []);
console.log('OK test_mpostes');
