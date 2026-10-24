// Tests serveur de la mission « Prépare le jeu à 10 » (postes, copains, secret des copains, reprise du Google Form)
// Lancer : sh outils/fabriquer-serveur.sh && node /home/claude/tests/test_mission.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv();
g.installer();
// une installation d'avant la mission : l'onglet « missions » n'existe pas encore, il doit se créer tout seul
delete g._sheets.missions;
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const et = r.token;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille Martin' }); const tom = r.joueur, tomTemp = r.code, famCode = r.familleCode;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Léa' }); const lea = r.joueur;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Hugo' }); const hugo = r.joueur, hugoTemp = r.code;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Baptiste A.' }); const bapA = r.joueur;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Baptiste D.' }); const bapD = r.joueur;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Ancien' }); const ancien = r.joueur;
g.call({ action: 'updatePlayer', token: et, joueurId: ancien.id, actif: false });

// ----- l'enfant fait sa mission -----
r = g.call({ action: 'login', joueurId: tom.id, pin: tomTemp }); let pt = r.token;
r = g.call({ action: 'setPin', token: pt, pin: '7391' }); pt = r.token;
assert.deepStrictEqual(r.me.missions, [], 'pas encore de mission');
r = g.call({ action: 'mission', token: pt, mission: 'xxx', postes: ['centre'] }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', postes: ['buteur'] }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', postes: ['centre', 'centre', 'ailier', 'pilier', 'talonneur'], quiz: { ans: [[0, 1], [2], [1], [0], [3, 4, 9, 99]] }, quizTop: [{ id: 'centre', pct: 88 }, { id: 'xx', pct: 2 }] });
assert.ok(r.ok, JSON.stringify(r));
let m = r.missions[0];
assert.deepStrictEqual(m.reponses.postes, ['centre', 'ailier', 'pilier'], '3 postes au plus, sans doublon');
assert.deepStrictEqual(m.reponses.quizTop, [{ id: 'centre', pct: 88 }]);
assert.deepStrictEqual(m.reponses.quiz.ans[4], [3, 4, 9], 'réponses du quiz nettoyées');
assert.strictEqual(m.faite, false);
assert.ok(g._sheets.missions, 'onglet missions créé tout seul');
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', fin: true }); assert.strictEqual(r.error, 'invalide', 'il faut au moins un copain');
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', copains: [lea.id, tom.id, 'inconnu', lea.id, ancien.id, bapD.id], fin: true });
assert.ok(r.ok, JSON.stringify(r));
m = r.missions[0];
assert.deepStrictEqual(m.reponses.copains, [lea.id, bapD.id], 'ni soi-même, ni inconnu, ni joueur désactivé, ni doublon');
assert.strictEqual(m.faite, true); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(m.date)); assert.strictEqual(m.source, 'appli');
// il change d'avis sur ses postes : la mission reste faite
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', postes: ['ailier'] });
assert.ok(r.missions[0].faite); assert.deepStrictEqual(r.missions[0].reponses.postes, ['ailier']);
r = g.call({ action: 'mission', token: pt, mission: 'jeu10', postes: [] }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'me', token: pt }); assert.deepStrictEqual(r.missions[0].reponses.copains, [lea.id, bapD.id], 'l\'enfant voit ses propres copains');

// ----- le secret des copains -----
r = g.call({ action: 'adultLogin', code: famCode }); const ft = r.token;
r = g.call({ action: 'family', token: ft });
let mf = r.enfants[0].missions[0];
assert.ok(mf && mf.faite && mf.reponses.postes[0] === 'ailier', 'les parents voient les postes');
assert.ok(!('copains' in mf.reponses), 'les parents ne voient pas les copains');
r = g.call({ action: 'kid', token: ft, joueurId: tom.id }); assert.ok(!('copains' in r.missions[0].reponses));
r = g.call({ action: 'kid', token: et, joueurId: tom.id }); assert.deepStrictEqual(r.missions[0].reponses.copains, [lea.id, bapD.id], 'l\'éduc voit les copains');
r = g.call({ action: 'group', token: et });
const gt = r.joueurs.find(p => p.joueur.id === tom.id);
assert.deepStrictEqual(gt.missions[0].reponses.copains, [lea.id, bapD.id]);
r = g.call({ action: 'league', token: pt }); assert.ok(!JSON.stringify(r).includes('copains'), 'rien dans le classement');
r = g.call({ action: 'roster' }); assert.ok(!JSON.stringify(r).includes('copains'));
r = g.call({ action: 'mission', token: ft, mission: 'jeu10', postes: ['centre'] }); assert.strictEqual(r.error, 'interdit', 'un parent ne remplit pas la mission');

// ----- reprise des réponses du Google Form « Choix de postes » -----
r = g.call({ action: 'importPostes', token: et }); assert.strictEqual(r.error, 'introuvable', 'pas encore d\'onglet de réponses');
const ss = g.SpreadsheetApp.getActiveSpreadsheet();
const rep = ss.insertSheet('Réponses au formulaire 1');
const rows = [
  ['Horodateur', 'Prénom', 'Nom', 'Choix 1', 'Choix 2', 'Choix 3', 'Message', 'Test Aide-moi à choisir'],
  ['10/10/2026 10:00:00', 'Hugo', 'Martin', 'Pilier', '—', '—', '', 'Pas fait'],
  ['11/10/2026 18:00:00', 'hugo ', 'MARTIN', 'Demi d’ouverture', 'Centre', '—', '', 'Postes proposés : 1. Demi d\'ouverture (90 %)\nPréfère : Taper au pied'],
  ['11/10/2026 19:00:00', 'Tom', 'Martin', 'Pilier', '', '', '', ''],
  ['11/10/2026 19:30:00', 'Baptiste', 'Dupont', '3e ligne', 'Demi de mêlée', 'Ailier', '', ''],
  ['11/10/2026 19:40:00', 'Baptiste', 'Zébulon', 'Centre', '', '', '', ''],
  ['11/10/2026 20:00:00', 'Zoé', 'X', 'Ailier', '', '', '', ''],
  ['11/10/2026 20:10:00', 'Léa', 'Y', '—', '—', '—', '', '']
];
rows.forEach((row, i) => rep.getRange(i + 1, 1, 1, row.length).setValues([row]));
r = g.call({ action: 'importPostes', token: et });
assert.ok(r.ok, JSON.stringify(r));
const info = r.info;
assert.strictEqual(info.reponses, 7);
assert.strictEqual(info.importes, 2, JSON.stringify(info));          // Hugo + Baptiste D. (Léa n'a choisi aucun poste)
assert.deepStrictEqual(info.gardes, ['Tom'], 'Tom a déjà choisi dans l\'appli');
assert.deepStrictEqual(info.inconnus, ['Baptiste Zébulon', 'Zoé X']);
r = g.call({ action: 'group', token: et });
const mh = r.joueurs.find(p => p.joueur.id === hugo.id).missions[0];
assert.deepStrictEqual(mh.reponses.postes, ['ouvreur', 'centre'], 'la dernière réponse compte');
assert.ok(/Taper au pied/.test(mh.reponses.quizResume) && /\n/.test(mh.reponses.quizResume), 'résumé du test gardé avec ses lignes');
assert.strictEqual(mh.source, 'formulaire'); assert.strictEqual(mh.faite, false);
assert.deepStrictEqual(r.joueurs.find(p => p.joueur.id === bapD.id).missions[0].reponses.postes, ['troisieme-ligne', 'demi-de-melee', 'ailier']);
assert.strictEqual(r.joueurs.find(p => p.joueur.id === bapA.id).missions.length, 0);
assert.strictEqual(r.joueurs.find(p => p.joueur.id === tom.id).missions[0].reponses.postes[0], 'ailier', 'Tom garde ses choix de l\'appli');
assert.strictEqual(r.importPostes.importes, 2, 'dernière reprise visible par les éducs');
// une 2e reprise sans nouvelle réponse ne change rien
r = g.call({ action: 'importPostes', token: et }); assert.strictEqual(r.info.importes, 0);
// Hugo retrouve ses postes dans l'appli et termine sa mission
r = g.call({ action: 'login', joueurId: hugo.id, pin: hugoTemp }); let ph = r.token;
r = g.call({ action: 'setPin', token: ph, pin: '8152' }); ph = r.token;
assert.deepStrictEqual(r.me.missions[0].reponses.postes, ['ouvreur', 'centre']);
r = g.call({ action: 'mission', token: ph, mission: 'jeu10', copains: [tom.id], fin: true });
assert.ok(r.missions[0].faite && r.missions[0].source === 'appli');
// une nouvelle réponse au formulaire ne remplace plus les choix faits dans l'appli
rep.getRange(9, 1, 1, 8).setValues([['12/10/2026 09:00:00', 'Hugo', 'Martin', 'Ailier', '', '', '', '']]);
r = g.call({ action: 'importPostes', token: et }); assert.ok(r.info.gardes.indexOf('Hugo') >= 0);
r = g.call({ action: 'kid', token: et, joueurId: hugo.id }); assert.deepStrictEqual(r.missions[0].reponses.postes, ['ouvreur', 'centre']);
// fonction de l'éditeur
g.reprendreChoixDePostes();
assert.ok(/Réponses lues : 8/.test(g._logs[g._logs.length - 1]), g._logs[g._logs.length - 1]);
// petits outils
const Core = require('/home/claude/mode-champion/js/core.js');
assert.strictEqual(Core._posteDuTexte('Demi d’ouverture'), 'ouvreur');
assert.strictEqual(Core._posteDuTexte('3e ligne'), 'troisieme-ligne');
assert.strictEqual(Core._posteDuTexte('Demi de mêlée'), 'demi-de-melee');
assert.strictEqual(Core._posteDuTexte('—'), null);
console.log('MISSION OK');
