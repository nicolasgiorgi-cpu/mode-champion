// (v83) La date choisie dans le formulaire du bilan ne vaut que pour les résultats envoyés : les épreuves déjà envoyées de ce
// bilan gardent le jour où elles ont été faites (avant, tout le bilan prenait la nouvelle date). Faux serveur : aucun vrai code.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_bilan_date.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');

const g = makeEnv(); g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const et = g.call({ action: 'adultLogin', code: ac }).token;
let r = g.call({ action: 'addPlayer', token: et, prenom: 'Zoé', familleNom: 'Famille Test' });
assert.ok(r.ok, JSON.stringify(r));
r = g.call({ action: 'login', joueurId: r.joueur.id, pin: r.code });
const tok = g.call({ action: 'setPin', token: r.token, pin: '2468' }).token;
const ilJ = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const dateDe = (recs, test) => (recs.find(x => x.test === test && x.bilan === '2') || {}).date;

// 1er jour (il y a 5 jours) : 2 épreuves
r = g.call({ action: 'submitRecords', token: tok, bilan: '2', date: ilJ(5), valeurs: [{ test: 'pompes', valeur: 8 }, { test: 'planche', valeur: 60 }], avecDossier: true });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(dateDe(r.me.records, 'pompes'), ilJ(5)); assert.strictEqual(dateDe(r.me.records, 'planche'), ilJ(5));
// 2e jour (il y a 2 jours), noté plus tard avec sa date : seule la nouvelle épreuve prend cette date
r = g.call({ action: 'submitRecords', token: tok, bilan: '2', date: ilJ(2), valeurs: [{ test: 'squats', valeur: 30 }], avecDossier: true });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(dateDe(r.me.records, 'squats'), ilJ(2), 'la nouvelle épreuve a sa date');
assert.strictEqual(dateDe(r.me.records, 'pompes'), ilJ(5), 'les pompes gardent leur jour');
assert.strictEqual(dateDe(r.me.records, 'planche'), ilJ(5), 'la planche garde son jour');
// sans date choisie : aujourd'hui pour ce qui est envoyé, rien d'autre ne bouge
r = g.call({ action: 'submitRecords', token: tok, bilan: '2', valeurs: [{ test: 'chaise', valeur: 45 }], avecDossier: true });
assert.strictEqual(dateDe(r.me.records, 'chaise'), ilJ(0));
assert.strictEqual(dateDe(r.me.records, 'squats'), ilJ(2)); assert.strictEqual(dateDe(r.me.records, 'pompes'), ilJ(5));
// une épreuve corrigée prend la date choisie avec sa nouvelle valeur ; un résultat renvoyé tel quel avec une date la reprend aussi
r = g.call({ action: 'submitRecords', token: tok, bilan: '2', date: ilJ(1), valeurs: [{ test: 'pompes', valeur: 9 }, { test: 'planche', valeur: 60 }], avecDossier: true });
assert.strictEqual(dateDe(r.me.records, 'pompes'), ilJ(1)); assert.strictEqual(dateDe(r.me.records, 'planche'), ilJ(1));
assert.strictEqual(dateDe(r.me.records, 'squats'), ilJ(2), 'les autres ne bougent pas'); assert.strictEqual(dateDe(r.me.records, 'chaise'), ilJ(0));
console.log('test_bilan_date OK');
