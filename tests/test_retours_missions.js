// (v92) Missions de poste, épisode 1 (essai pour les éducs, demande de Nicolas du 20/11/2026) : chaque éduc donne son avis
// sur une situation (1 à 4) ou sur la fin de l'épisode (0) — « C'est juste » ou « À revoir », avec un mot (obligatoire pour
// « À revoir »). Un avis par éduc, poste, situation et variante (le renvoyer le remplace) ; la variante n'existe qu'en
// situation 4 ; tous les éducs lisent tous les avis ; ni les enfants ni les parents n'y ont accès ; entrées vérifiées.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_retours_missions.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const adminId = g.call({ action: 'educsListe' }).educs[0].id;
let r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: ac });
r = g.call({ action: 'setAdultPin', token: r.token, pin: '2468' }); const nico = r.token;
r = g.call({ action: 'addEduc', token: nico, nom: 'Cyril' }); const cyrilId = r.educ.id;
r = g.call({ action: 'adultLogin', role: 'e', educId: cyrilId, code: r.code }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '1357' }); const cyril = r.token;
r = g.call({ action: 'addPlayer', token: nico, prenom: 'Tom', familleNom: 'Famille T' }); const tom = r.joueur.id, tomCode = r.code, fcode = r.familleCode;
r = g.call({ action: 'login', joueurId: tom, pin: tomCode }); r = g.call({ action: 'setPin', token: r.token, pin: '2580' }); const kid = r.token;
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: fcode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '9753' }); const fam = r.token;
const lire = (t) => g.call({ action: 'retoursMissions', token: t || nico });

// rien au départ ; l'onglet se crée à la première écriture
r = lire(); assert.ok(r.ok, JSON.stringify(r)); assert.deepStrictEqual(r.retours, []);

// un avis « C'est juste », sans mot
r = g.call({ action: 'retourMission', token: nico, poste: 'pil', situation: 2, avis: 'juste' });
assert.ok(r.ok && r.nouveau, JSON.stringify(r));
assert.strictEqual(r.retour.poste, 'pil'); assert.strictEqual(r.retour.situation, 2); assert.strictEqual(r.retour.variante, false);
assert.strictEqual(r.retour.avis, 'juste'); assert.strictEqual(r.retour.texte, ''); assert.strictEqual(r.retour.episode, 'ep1');
assert.strictEqual(r.retour.moi, true); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.retour.date), r.retour.date);
assert.ok(g._sheets.retoursMissions, 'l\'onglet retoursMissions est créé');

// « À revoir » demande un mot
r = g.call({ action: 'retourMission', token: cyril, poste: 'ail', situation: 2, avis: 'revoir', texte: '   ' });
assert.strictEqual(r.error, 'invalide', JSON.stringify(r)); assert.ok(/ce qui est à revoir/.test(r.message));
r = g.call({ action: 'retourMission', token: cyril, poste: 'ail', situation: 2, avis: 'revoir', texte: 'L\'ailier qui reste de son côté :\n à voir <b>ensemble</b>' });
assert.ok(r.ok && r.nouveau, JSON.stringify(r));
assert.strictEqual(r.retour.texte, 'L\'ailier qui reste de son côté : à voir b ensemble /b', 'texte nettoyé (une ligne, sans < >)');
const idCyril = r.retour.id;

// le même éduc, le même poste et la même situation : son avis est remplacé (pas une 2e ligne)
r = g.call({ action: 'retourMission', token: cyril, poste: 'ail', situation: 2, avis: 'juste', texte: 'En fait ça va.' });
assert.ok(r.ok && !r.nouveau, JSON.stringify(r)); assert.strictEqual(r.retour.id, idCyril);
r = lire(); assert.strictEqual(r.retours.filter(x => x.poste === 'ail').length, 1);
assert.strictEqual(r.retours.find(x => x.poste === 'ail').avis, 'juste');

// la variante : seulement en situation 4, un avis à part de la version de base
r = g.call({ action: 'retourMission', token: nico, poste: 'l3', situation: 4, variante: true, avis: 'revoir', texte: 'Variante : le pilier va trop vite.' });
assert.ok(r.ok && r.retour.variante === true, JSON.stringify(r));
r = g.call({ action: 'retourMission', token: nico, poste: 'l3', situation: 4, variante: false, avis: 'juste' });
assert.ok(r.ok && r.nouveau && r.retour.variante === false, 'base et variante : deux avis');
r = g.call({ action: 'retourMission', token: nico, poste: 'l3', situation: 3, variante: true, avis: 'juste' });
assert.ok(r.ok && r.retour.variante === false, 'pas de variante en situation 3');
r = g.call({ action: 'retourMission', token: nico, poste: 'l3', situation: 4, variante: 'oui', avis: 'juste' });
assert.ok(r.ok && !r.nouveau && r.retour.variante === false, 'variante : seulement true');

// la fin de l'épisode = situation 0
r = g.call({ action: 'retourMission', token: cyril, poste: 'arr', situation: 0, avis: 'revoir', texte: 'Le défi est trop dur.' });
assert.ok(r.ok && r.retour.situation === 0, JSON.stringify(r));

// entrées vérifiées
const bad = (p, msg) => { const x = g.call(Object.assign({ action: 'retourMission', token: nico, poste: 'pil', situation: 1, avis: 'juste' }, p)); assert.strictEqual(x.error, 'invalide', msg + ' ' + JSON.stringify(x)); };
bad({ poste: 'pilier' }, 'poste inconnu'); bad({ poste: '' }, 'poste vide');
bad({ situation: 5 }, 'situation 5'); bad({ situation: -1 }, 'situation -1'); bad({ situation: 1.5 }, 'situation pas entière'); bad({ situation: 'deux' }, 'situation en texte');
bad({ avis: 'bof' }, 'avis inconnu'); bad({ avis: '' }, 'avis vide');
bad({ episode: 'ep2' }, 'épisode inconnu');
r = g.call({ action: 'retourMission', token: nico, poste: 'm9', situation: 1, avis: 'revoir', texte: 'x'.repeat(900) });
assert.ok(r.ok && r.retour.texte.length === 600, 'texte coupé à 600 caractères');

// tous les éducs lisent tout ; « moi » dit lequel est le sien ; le plus récent d'abord
r = lire(cyril); assert.ok(r.ok);
assert.strictEqual(r.retours.length, 7, JSON.stringify(r.retours.map(x => x.poste + x.situation)));
assert.ok(r.retours.every(x => x.moi === (x.parNom === 'Cyril')), 'moi = ses avis');
assert.ok(r.retours.some(x => x.parNom === 'Admin' || x.parNom === 'Nico' || !x.moi), 'les avis des autres aussi');
for (let i = 1; i < r.retours.length; i++) assert.ok(r.retours[i - 1].maj >= r.retours[i].maj, 'du plus récent au plus ancien');
assert.ok(r.retours.every(x => !('codeHash' in x) && !('cree' in x)), 'seulement les champs publics');

// ni les enfants ni les parents
assert.strictEqual(g.call({ action: 'retoursMissions', token: kid }).error, 'interdit');
assert.strictEqual(g.call({ action: 'retoursMissions', token: fam }).error, 'interdit');
assert.strictEqual(g.call({ action: 'retourMission', token: kid, poste: 'pil', situation: 1, avis: 'juste' }).error, 'interdit');
assert.strictEqual(g.call({ action: 'retourMission', token: fam, poste: 'pil', situation: 1, avis: 'juste' }).error, 'interdit');
assert.strictEqual(g.call({ action: 'retoursMissions' }).error, 'session');

// une ligne de la feuille par avis (7, plus l'en-tête), relue après le cache vidé
assert.strictEqual(g._sheets.retoursMissions.getLastRow(), 8);
Object.keys(g._cache).forEach(k => delete g._cache[k]);
r = g.call({ action: 'retoursMissions', token: nico });
assert.strictEqual(r.retours.length, 7);
const l3v = r.retours.find(x => x.poste === 'l3' && x.situation === 4 && x.variante);
assert.ok(l3v && l3v.avis === 'revoir' && /pilier va trop vite/.test(l3v.texte), 'relu depuis la feuille : ' + JSON.stringify(l3v));
console.log('OK test_retours_missions (' + r.retours.length + ' avis)');
