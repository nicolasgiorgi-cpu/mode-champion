// Codes adultes à 4 chiffres : nom puis code, code provisoire puis code choisi, blocage, codes pour tous.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_codes_adultes.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv();
g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const adminId = g.call({ action: 'educsListe' }).educs[0].id;
let r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: ac }); assert.ok(r.ok && r.mustChange);
r = g.call({ action: 'setAdultPin', token: r.token, pin: '2468' }); const et = r.token;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille T' }); const tom = r.joueur.id, fcode = r.familleCode;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Lou', familleId: r.famille.id }); const lou = r.joueur.id;
assert.strictEqual(r.familleCode, null, 'même famille : pas de 2e code');
// le parent : le prénom de n'importe lequel de ses enfants, puis le code de la famille
r = g.call({ action: 'adultLogin', role: 'f', joueurId: lou, code: fcode }); assert.ok(r.ok && r.role === 'f' && r.mustChange && r.enfant === 'Lou', JSON.stringify(r));
r = g.call({ action: 'setAdultPin', token: r.token, pin: '0000' }); assert.ok(r.ok);
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: '0000' }); assert.ok(r.ok && !r.mustChange); const ft = r.token;
// l'autre parent entre avec le code provisoire du message : il n'a pas à rechoisir (un seul code par famille)
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: fcode }); assert.ok(r.ok && !r.mustChange && r.provisoire, JSON.stringify(r));
r = g.call({ action: 'family', token: ft }); assert.ok(r.ok, '1er choix : l\'autre appareil reste connecté');
r = g.call({ action: 'setAdultPin', token: g.call({ action: 'login', joueurId: tom, pin: 'xxxx' }).token, pin: '1111' }); assert.ok(!r.ok, 'un enfant ne change pas le code des parents');
// 5 codes faux : bloqué 10 minutes, même avec le bon code
for (let i = 0; i < 4; i++) { r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: '9999' }); assert.strictEqual(r.error, 'code'); }
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: '9999' }); assert.strictEqual(r.error, 'bloque');
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: '0000' }); assert.strictEqual(r.error, 'bloque');
// l'éduc admin n'est pas bloqué pour autant
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: '2468' }); assert.ok(r.ok);
// codes provisoires pour tous (fonction de l'éditeur) : les sessions ouvertes restent ouvertes
g.addEduc && 0;
r = g.call({ action: 'addEduc', token: et, nom: 'Cyril' }); const cyrilCode = r.code, cyrilId = r.educ.id;
g.nouveauxCodesAdultes();
const lignes = g._logs.filter(l => /^(ÉDUC|FAMILLE) /.test(l));
assert.strictEqual(lignes.length, 3, lignes.join('\n'));
const lt = lignes.find(l => /^FAMILLE Famille T \(Tom, Lou\) : \d{4} \| Tom \d{4} \| Lou \d{4}$/.test(l)); assert.ok(lt, lignes.join('\n'));
const tomCode = lt.match(/Tom (\d{4})/)[1];
r = g.call({ action: 'login', joueurId: tom, pin: tomCode }); assert.ok(r.ok && r.joueur.mustChange, 'nouveau code provisoire de l\'enfant');
r = g.call({ action: 'group', token: et }); assert.ok(r.ok, 'session admin gardée');
r = g.call({ action: 'family', token: ft }); assert.ok(r.ok, 'session parent gardée');
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: '2468' }); assert.strictEqual(r.error, 'code', 'son ancien code ne sert plus');
r = g.call({ action: 'adultLogin', role: 'e', educId: cyrilId, code: cyrilCode });
const nouveauCyril = lignes.find(l => /^ÉDUC Cyril/.test(l)).match(/(\d{4})$/)[1];
if (nouveauCyril !== cyrilCode) assert.strictEqual(r.error, 'code', 'l\'ancien provisoire ne sert plus');
r = g.call({ action: 'adultLogin', role: 'e', educId: cyrilId, code: nouveauCyril }); assert.ok(r.ok && r.mustChange);
// un éduc désactivé n'apparaît plus et ne se connecte plus
r = g.call({ action: 'updateEduc', token: et, educId: cyrilId, actif: false });
assert.ok(!g.call({ action: 'educsListe' }).educs.some(e => e.id === cyrilId));
console.log('CODES ADULTES OK');
