// (v88) Demande de Nicolas du 15/11/2026 : « Les événements annulés il faut aussi pouvoir les supprimer par un glisser vers la gauche ».
// Serveur : un événement annulé (dans Spond) s'efface avec ses compos et leurs contre-propositions ; la synchro Spond ne le recrée
// pas tant qu'il reste annulé ; s'il est rétabli dans Spond, il revient. Un événement Spond pas annulé ne s'efface toujours pas.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_evt_efface.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');
const GID = 'GROUPE-EDR-TEST', SG = 'SOUS-GROUPE-M12-TEST';
const members = [{ id: 'm-tom', firstName: 'Tom', lastName: 'Martin', subGroups: [SG] }, { id: 'm-lea', firstName: 'Léa', lastName: 'Roux', subGroups: [SG] }];
let spondEvents = [];
function spondHttp(url, params) {
  if (/auth2\/login$/.test(url)) return { code: 200, body: { accessToken: { token: 'TOK' }, refreshToken: { token: 'R' } } };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: GID, members, subGroups: [{ id: SG, name: 'M12' }] }] };
  if (/sponds\//.test(url)) return { code: 200, body: spondEvents };
  return { code: 404, body: {} };
}
const g = makeEnv({ spond: spondHttp }); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const nico = r.token;
r = g.call({ action: 'addEduc', token: nico, nom: 'Cyril' }); r = g.call({ action: 'adultLogin', code: r.code }); const cyril = r.token;
const P = {};
['Tom', 'Léa'].forEach(p => { r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p }); P[p] = r.joueur.id; });
g._props.SPOND_EMAIL = 'nico@example.org'; g._props.SPOND_MDP = 'secret';
const jour = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ev = (id, titre, n, annule) => ({ id, heading: titre, startTimestamp: jour(n) + 'T08:00:00Z', cancelled: !!annule, responses: { acceptedIds: ['m-tom', 'm-lea'] } });
spondEvents = [ev('EV1', 'Plateau 3 - Muret', 10), ev('EV2', 'Entraînement - Lézat', 4)];
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok, JSON.stringify(r));
const evts = () => g.call({ action: 'compos', token: nico });

// un événement Spond pas annulé : on ne l'efface pas depuis l'appli
r = g.call({ action: 'setEvenement', token: nico, id: 'sp-EV1', supprimer: true });
assert.strictEqual(r.error, 'interdit', JSON.stringify(r));

// une compo publiée et une contre-proposition sur le plateau, puis il est annulé dans Spond
r = g.call({ action: 'saveCompo', token: nico, evenementId: 'sp-EV1', version: 0, banc: [], reglages: { format: 5, nb: { A: 0, B: 1, C: 0 } },
  equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: P.Tom, poste: '' }, { id: P['Léa'], poste: '' }] }] });
assert.ok(r.ok, JSON.stringify(r));
const c = r.compo;
r = g.call({ action: 'saveCompo', token: nico, evenementId: 'sp-EV1', compoId: c.id, version: c.version, banc: [], reglages: c.reglages, equipes: c.equipes, publier: true });
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: P['Léa'], poste: '' }] }], banc: [P.Tom], justification: 'Tom se repose.' });
const avisAvant = evts().avis.filter(a => a.statut === 'attente').length;
assert.strictEqual(avisAvant, 1, 'une contre-proposition en attente');
spondEvents[0].cancelled = true;
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok);
r = evts();
assert.strictEqual(r.evenements.find(e => e.id === 'sp-EV1').annule, true, 'annulé dans Spond');
assert.ok(r.compos.some(x => x.evenementId === 'sp-EV1'), 'sa compo est toujours là');

// annulé : n'importe quel éduc l'efface, avec sa compo et ses contre-propositions
r = g.call({ action: 'setEvenement', token: cyril, id: 'sp-EV1', supprimer: true });
assert.ok(r.ok && r.supprime, JSON.stringify(r));
r = evts();
assert.ok(!r.evenements.some(e => e.id === 'sp-EV1'), 'l\'événement est parti');
assert.ok(!r.compos.some(x => x.evenementId === 'sp-EV1'), 'ses compos aussi');
assert.strictEqual(r.avis.length, 0, 'et ses contre-propositions');
assert.ok(r.evenements.some(e => e.id === 'sp-EV2'), 'l\'autre événement ne bouge pas');
assert.deepStrictEqual(JSON.parse(g._props.evtsEffaces).map(x => x.id), ['sp-EV1']);
// la synchro ne le remet pas tant qu'il est annulé dans Spond ; il compte pour un événement vu (pas « supprimé dans Spond »)
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok);
assert.ok(!evts().evenements.some(e => e.id === 'sp-EV1'), 'pas recréé par la synchro');
r = g.call({ action: 'syncSpond', token: nico });
assert.ok(!evts().evenements.some(e => e.id === 'sp-EV1'), 'toujours pas');
// rétabli dans Spond : il revient (sans ses compos effacées)
spondEvents[0].cancelled = false;
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok);
r = evts();
const back = r.evenements.find(e => e.id === 'sp-EV1');
assert.ok(back && !back.annule, 'rétabli dans Spond : de retour');
assert.deepStrictEqual(back.presents.sort(), [P.Tom, P['Léa']].sort());
assert.deepStrictEqual(JSON.parse(g._props.evtsEffaces), [], 'plus dans la liste des effacés');
// un événement ajouté à la main : toujours effaçable sans compo, pas avec une compo publiée (inchangé)
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau - Essai', debut: jour(20), sorte: 'plateau', presents: [P.Tom, P['Léa']] });
const m = r.evenement.id;
r = g.call({ action: 'saveCompo', token: nico, evenementId: m, version: 0, banc: [], reglages: { format: 5, nb: { A: 0, B: 1, C: 0 } }, equipes: [{ id: 'B1', niveau: 'B', joueurs: [{ id: P.Tom, poste: '' }] }], publier: true });
r = g.call({ action: 'setEvenement', token: nico, id: m, supprimer: true });
assert.strictEqual(r.error, 'interdit', 'une compo publiée : on ne l\'efface pas');
// un parent ou un enfant ne peut rien effacer
r = g.call({ action: 'setEvenement', token: 'zzz', id: 'sp-EV2', supprimer: true });
assert.ok(r.error, JSON.stringify(r));
console.log('test_evt_efface : OK');
