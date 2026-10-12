// Tests serveur des compos : fiche terrain, événements, compo publiée par un éduc, contre-propositions, jour J, Spond.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_compos_core.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');

function setup(opts) {
  const g = makeEnv(opts);
  g.installer();
  const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{6})/)[1];
  let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
  r = g.call({ action: 'addEduc', token: nico, nom: 'Cyril' }); const cyrilCode = r.code;
  r = g.call({ action: 'adultLogin', code: cyrilCode }); const cyril = r.token;
  const P = {};
  ['Tom', 'Léa', 'Hugo', 'Baptiste A.', 'Baptiste D.', 'Zoé', 'Inès', 'Malo'].forEach(function (p) {
    r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p });
    P[p] = r.joueur.id; P['code:' + p] = r.code; P['fam:' + p] = r.familleCode;
  });
  return { g, nico, cyril, P };
}

let { g, nico, cyril, P } = setup();
let r;

// ----- fiche terrain -----
r = g.call({ action: 'group', token: nico });
assert.strictEqual(r.joueurs[0].terrain, null, 'pas encore de fiche terrain');
r = g.call({ action: 'setTerrain', token: nico, lignes: [
  { joueurId: P.Tom, niveau: 'B', passerelle: 'A', plaquage: 3, postesOk: ['centre', 'pirate', 'centre'] },
  { joueurId: P['Léa'], niveau: 'A', passerelle: 'C', plaquage: 9 },          // passerelle A→C impossible, plaquage hors bornes
  { joueurId: P.Hugo, niveau: 'C', plaquage: 1 },
  { joueurId: 'inconnu', niveau: 'A' }
] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.terrain[P.Tom].postesOk, ['centre']);
assert.strictEqual(r.terrain[P['Léa']].passerelle, '');
assert.strictEqual(r.terrain[P['Léa']].plaquage, 0);
assert.strictEqual(r.terrain[P.Tom].parQui, 'Admin');
assert.strictEqual(Object.keys(r.terrain).length, 3);
// modification partielle : le reste ne bouge pas
r = g.call({ action: 'setTerrain', token: cyril, lignes: [{ joueurId: P.Tom, plaquage: 4 }] });
assert.strictEqual(r.terrain[P.Tom].niveau, 'B'); assert.strictEqual(r.terrain[P.Tom].passerelle, 'A'); assert.strictEqual(r.terrain[P.Tom].plaquage, 4);
assert.strictEqual(r.terrain[P.Tom].parQui, 'Cyril');
// changer de niveau peut rendre la passerelle impossible
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Hugo, niveau: 'C', passerelle: 'A' }] });
assert.strictEqual(r.terrain[P.Hugo].passerelle, '');
r = g.call({ action: 'group', token: nico });
const tomG = r.joueurs.find(p => p.joueur.id === P.Tom);
assert.strictEqual(tomG.terrain.niveau, 'B');
// les enfants et les parents n'y ont pas accès
r = g.call({ action: 'login', joueurId: P.Tom, pin: P['code:Tom'] }); const tomTok = r.token;
assert.ok(r.ok, JSON.stringify(r));
r = g.call({ action: 'setTerrain', token: tomTok, lignes: [{ joueurId: P.Tom, niveau: 'A' }] });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'compos', token: tomTok }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'adultLogin', code: P['fam:Tom'] }); const famTok = r.token;
r = g.call({ action: 'compos', token: famTok }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'family', token: famTok });
assert.ok(JSON.stringify(r).indexOf('"terrain"') < 0, 'la fiche terrain ne part pas aux parents');

// ----- événements à la main -----
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau 3 - Muret', debut: '2026-11-14', lieu: 'Muret', presents: [P.Tom, P['Léa'], P.Hugo, 'zzz'] });
assert.ok(r.ok, JSON.stringify(r));
const e3 = r.evenement;
assert.strictEqual(e3.sorte, 'plateau'); assert.strictEqual(e3.source, 'manuel'); assert.deepStrictEqual(e3.presents, [P.Tom, P['Léa'], P.Hugo]);
assert.strictEqual(e3.debut.slice(0, 10), '2026-11-14');
r = g.call({ action: 'setEvenement', token: nico, titre: '', debut: '2026-11-14' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'setEvenement', token: nico, titre: 'X', debut: 'demain' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'setEvenement', token: cyril, id: e3.id, ajouts: [P.Zoé, P['Inès']], retraits: [P.Hugo] });
assert.deepStrictEqual(r.evenement.ajouts, [P.Zoé, P['Inès']]); assert.deepStrictEqual(r.evenement.retraits, [P.Hugo]);
r = g.call({ action: 'compos', token: cyril });
assert.strictEqual(r.evenements.length, 1); assert.strictEqual(r.compos.length, 0); assert.strictEqual(r.spond.branche, false);

// ----- la compo : un éduc suffit -----
const compo1 = {
  evenementId: e3.id, reglages: { format: 5, nb: { A: 1, B: 1, C: 0 } },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P['Léa'], n: 'A' }, { id: P.Tom, n: 'B' }, { id: P.Tom, n: 'B' }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P.Zoé, n: '' }, { id: 'zzz' }] }],
  banc: [P['Inès'], P.Tom], raisons: { [P.Tom]: 'Passerelle : son tour', zzz: 'x' }, justification: 'Tom monte en A pour la 1re fois.'
};
r = g.call(Object.assign({ action: 'saveCompo', token: nico }, compo1));
assert.ok(r.ok, JSON.stringify(r));
let c = r.compo;
assert.strictEqual(c.version, 1); assert.strictEqual(c.statut, 'publiee'); assert.strictEqual(c.auteurNom, 'Admin');
assert.deepStrictEqual(c.equipes[0].joueurs.map(j => j.id), [P['Léa'], P.Tom], 'doublons et inconnus retirés');
assert.deepStrictEqual(c.banc, [P['Inès']], 'un joueur déjà placé ne va pas sur le banc');
assert.deepStrictEqual(Object.keys(c.raisons), [P.Tom]);
// un autre éduc ne peut pas la modifier directement…
r = g.call({ action: 'saveCompo', token: cyril, evenementId: e3.id, compoId: c.id, version: 1, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.error, 'interdit'); assert.ok(/contre-proposition/.test(r.message));
// … il fait une contre-proposition, avec une justification
const moved = JSON.parse(JSON.stringify(c));
moved.equipes[0].joueurs = moved.equipes[0].joueurs.filter(j => j.id !== P.Tom);
moved.equipes[1].joueurs.push({ id: P.Tom, poste: '', n: 'B' });
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: '' });
assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: c.equipes, banc: c.banc, justification: 'Rien changé' });
assert.strictEqual(r.error, 'invalide', 'sans changement');
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: 'Tom n\'a pas encore 4 étoiles de plaquage.' });
assert.ok(r.ok, JSON.stringify(r));
let avis = r.avis;
assert.strictEqual(avis.statut, 'attente'); assert.strictEqual(avis.changements.length, 1);
assert.deepStrictEqual([avis.changements[0].id, avis.changements[0].de, avis.changements[0].vers], [P.Tom, 'A1', 'B1']);
r = g.call({ action: 'compos', token: nico });
assert.strictEqual(r.avis.length, 1); assert.strictEqual(r.compos.length, 1);
// seul l'auteur (ou l'admin) répond ; ici Cyril n'est pas l'auteur
r = g.call({ action: 'repondreAvis', token: cyril, avisId: avis.id, accepte: true });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: false, reponse: 'On garde : c\'est son tour.' });
assert.strictEqual(r.avis.statut, 'refusee'); assert.strictEqual(r.compo.version, 1);
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: true });
assert.strictEqual(r.error, 'introuvable', 'déjà traitée');
// nouvelle contre-proposition, acceptée cette fois
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: 'Je réessaie : Tom en B.' });
avis = r.avis;
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: true, reponse: 'OK' });
assert.strictEqual(r.avis.statut, 'acceptee'); assert.strictEqual(r.compo.version, 2);
assert.ok(r.compo.equipes[1].joueurs.some(j => j.id === P.Tom));
assert.ok(/acceptée/.test(r.compo.historique[1].note));
c = r.compo;
// l'auteur modifie sa compo : version 3 ; avec une version périmée : conflit
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 1, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.error, 'conflit');
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 2, reglages: c.reglages, equipes: c.equipes, banc: [], note: 'Inès blessée' });
assert.strictEqual(r.compo.version, 3); assert.deepStrictEqual(r.compo.banc, []);
assert.strictEqual(r.compo.historique[2].note, 'Inès blessée');
// sans changement : pas de nouvelle version
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 3, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.compo.version, 3);
c = r.compo;
// contre-proposition faite sur une ancienne version : à l'acceptation, on rejoue seulement ses déplacements
const m2 = JSON.parse(JSON.stringify(c));
const zoe = m2.equipes[1].joueurs.find(j => j.id === P.Zoé);
m2.equipes[1].joueurs = m2.equipes[1].joueurs.filter(j => j.id !== P.Zoé); m2.equipes[0].joueurs.push(zoe);
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: m2.equipes, banc: m2.banc, justification: 'Zoé en A, 5 étoiles.' });
const avis2 = r.avis;
// pendant ce temps, l'auteur met Inès en B1 (version 4)
const c4 = JSON.parse(JSON.stringify(c)); c4.equipes[1].joueurs.push({ id: P['Inès'], poste: '', n: '' });
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 3, reglages: c.reglages, equipes: c4.equipes, banc: [] });
assert.strictEqual(r.compo.version, 4);
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis2.id, accepte: true });
assert.strictEqual(r.compo.version, 5);
assert.ok(r.compo.equipes[0].joueurs.some(j => j.id === P.Zoé), 'Zoé passe en A');
assert.ok(r.compo.equipes[1].joueurs.some(j => j.id === P['Inès']), 'Inès reste en B1 (changement de l\'auteur gardé)');
// l'auteur d'une contre-proposition peut la retirer
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: c.equipes, banc: [P.Malo], justification: 'Malo sur le banc' });
r = g.call({ action: 'repondreAvis', token: nico, avisId: r.avis.id, retirer: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'compos', token: cyril });
const pending = r.avis.filter(a => a.statut === 'attente');
assert.strictEqual(pending.length, 1);
r = g.call({ action: 'repondreAvis', token: cyril, avisId: pending[0].id, retirer: true }); assert.strictEqual(r.avis.statut, 'retiree');

// ----- le jour J : tout éduc corrige directement (dernière minute) -----
const today = (function () { const d = new Date(); const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau du jour', debut: today, presents: [P.Tom, P['Léa']] });
const ej = r.evenement;
r = g.call({ action: 'saveCompo', token: nico, evenementId: ej.id, reglages: { format: 5, nb: { A: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }, { id: P['Léa'] }] }], banc: [] });
const cj = r.compo;
r = g.call({ action: 'saveCompo', token: cyril, evenementId: ej.id, compoId: cj.id, version: 1, reglages: cj.reglages, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }], banc: [P['Léa']], note: 'Léa malade' });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.version, 2); assert.strictEqual(r.compo.historique[1].dm, true);
// retirer une compo : son auteur (ou l'admin)
r = g.call({ action: 'retirerCompo', token: cyril, compoId: cj.id }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'retirerCompo', token: nico, compoId: cj.id }); assert.ok(r.ok);
r = g.call({ action: 'compos', token: nico });
assert.ok(!r.compos.some(x => x.id === cj.id));
// supprimer un événement ajouté à la main (pas s'il a une compo publiée)
r = g.call({ action: 'setEvenement', token: nico, id: e3.id, supprimer: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'setEvenement', token: nico, id: ej.id, supprimer: true }); assert.ok(r.supprime);
// Spond pas branché sur ce serveur
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'indispo');
// les données de l'éduc ne partent pas chez l'enfant
r = g.call({ action: 'me', token: tomTok });
assert.ok(JSON.stringify(r).indexOf('"terrain"') < 0 && JSON.stringify(r).indexOf('"compos"') < 0);

// ===================== SPOND (spond.gs + appels HTTP simulés) =====================
const GID = 'GROUPE-EDR-TEST', SG = 'SOUS-GROUPE-M12-TEST';
const calls = [];
let spondEvents = [];
const members = [
  { id: 'm-tom', firstName: 'Tom', lastName: 'Martin', subGroups: [SG] },
  { id: 'm-bapa', firstName: 'Baptiste', lastName: 'Abadie', subGroups: [SG] },
  { id: 'm-bapd', firstName: 'Baptiste', lastName: 'Durand', subGroups: [SG] },
  { id: 'm-lea', firstName: 'Léa', lastName: 'Roux', subGroups: [SG] },
  { id: 'm-coach', firstName: 'Julien', lastName: 'Coach', subGroups: [SG] },
  { id: 'm-m10', firstName: 'Paul', lastName: 'Petit', subGroups: ['AUTRE'] }
];
function spondHttp(url, params) {
  calls.push(url);
  if (/auth2\/login$/.test(url)) {
    const b = JSON.parse(params.payload);
    if (b.password !== 'secret') return { code: 401, body: { error: 'bad' } };
    return { code: 200, body: { accessToken: { token: 'TOK' }, refreshToken: { token: 'R' } } };
  }
  if (params.headers && params.headers.Authorization !== 'Bearer TOK') return { code: 401, body: {} };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: 'AUTRE-GROUPE', members: [], subGroups: [{ id: 'X', name: 'M10' }] }, { id: GID, members, subGroups: [{ id: 'AUTRE', name: 'M14' }, { id: SG, name: 'M12' }] }] };
  if (/sponds\//.test(url)) {
    assert.ok(url.indexOf('subgroupId=' + SG) > 0 && url.indexOf('groupId=' + GID) > 0);
    return { code: 200, body: spondEvents };
  }
  return { code: 404, body: {} };
}
({ g, nico, cyril, P } = setup({ spond: spondHttp }));
r = g.call({ action: 'compos', token: nico }); assert.strictEqual(r.spond.branche, false);
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'spond'); assert.ok(/identifiants/.test(r.message), r.message);
g._props.SPOND_EMAIL = 'nico@example.org'; g._props.SPOND_MDP = 'faux';
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'spond'); assert.ok(/refuse/.test(r.message), r.message);
g._props.SPOND_MDP = 'secret';
spondEvents = [
  { id: 'EV1', heading: 'Plateau 3 - Muret', startTimestamp: '2026-11-14T08:00:00Z', endTimestamp: '2026-11-14T12:00:00Z', location: { feature: 'Stade de Muret' },
    recipients: { group: { id: GID, subGroups: [{ id: SG }] } }, responses: { acceptedIds: ['m-tom', 'm-bapa', 'm-coach'], declinedIds: ['m-lea'], unansweredIds: ['m-bapd'], waitinglistIds: [] } },
  { id: 'EV2', heading: 'Entraînement - Lézat', startTimestamp: '2026-11-18T16:30:00Z', recipients: { group: { id: GID, subGroups: [{ id: 'AUTRE' }] } }, responses: { acceptedIds: ['m-tom'] } },
  { id: 'EV3', heading: 'Entraînement - Saint-Sulpice', startTimestamp: '2026-11-21T09:00:00Z', responses: { acceptedIds: ['m-lea', 'm-tom'], declinedIds: [] } }
];
r = g.call({ action: 'syncSpond', token: nico });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.info.evenements, 2, 'l\'événement d\'un autre sous-groupe est ignoré');
assert.strictEqual(g._props.SPOND_GROUPE, GID); assert.strictEqual(g._props.SPOND_SOUS_GROUPE, SG, 'le sous-groupe M12 est trouvé tout seul et gardé');
assert.strictEqual(r.info.membres, 5);
assert.strictEqual(r.info.nouveauxLiens, 4, 'Tom, Baptiste A., Baptiste D., Léa');
assert.deepStrictEqual(r.info.joueursSansLien.sort(), ['Hugo', 'Inès', 'Malo', 'Zoé']);
r = g.call({ action: 'compos', token: nico });
assert.strictEqual(r.spond.branche, true); assert.strictEqual(r.spond.derniere.evenements, 2);
let ev1 = r.evenements.find(e => e.id === 'sp-EV1');
assert.strictEqual(ev1.source, 'spond'); assert.strictEqual(ev1.sorte, 'plateau'); assert.strictEqual(ev1.lieu, 'Stade de Muret');
assert.deepStrictEqual(ev1.presents, [P.Tom, P['Baptiste A.']]);
assert.deepStrictEqual(ev1.absents, [P['Léa']]); assert.deepStrictEqual(ev1.sansReponse, [P['Baptiste D.']]);
assert.deepStrictEqual(ev1.inconnus, ['Julien C.'], 'un adulte du groupe qui a répondu oui : listé à part');
assert.strictEqual(r.evenements.find(e => e.id === 'sp-EV3').sorte, 'entrainement');
r = g.call({ action: 'group', token: nico });
assert.strictEqual(r.joueurs.find(p => p.joueur.id === P['Baptiste D.']).terrain.spondId, 'm-bapd');
// correction à la main des présents, puis nouvelle synchro : la correction reste, les réponses Spond se mettent à jour
g.call({ action: 'setEvenement', token: nico, id: 'sp-EV1', ajouts: [P.Hugo], retraits: [P['Baptiste A.']] });
spondEvents[0].responses.acceptedIds.push('m-lea'); spondEvents[0].responses.declinedIds = [];
r = g.call({ action: 'syncSpond', token: nico });
assert.strictEqual(r.info.nouveauxLiens, 0);
r = g.call({ action: 'compos', token: nico });
ev1 = r.evenements.find(e => e.id === 'sp-EV1');
assert.strictEqual(r.evenements.length, 2, 'pas de doublon');
assert.deepStrictEqual(ev1.presents, [P.Tom, P['Baptiste A.'], P['Léa']]);
assert.deepStrictEqual(ev1.ajouts, [P.Hugo]); assert.deepStrictEqual(ev1.retraits, [P['Baptiste A.']]);
// un lien posé à la main l'emporte : Hugo est en fait le membre « Paul Petit » (prénom d'usage différent)
g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Hugo, spondId: 'm-m10' }] });
members[5].subGroups = [SG]; spondEvents[0].responses.acceptedIds.push('m-m10');
r = g.call({ action: 'syncSpond', token: nico });
r = g.call({ action: 'compos', token: nico });
assert.ok(r.evenements.find(e => e.id === 'sp-EV1').presents.indexOf(P.Hugo) >= 0);
// la synchro automatique : déclencheur toutes les heures
g.brancherSpond();
assert.strictEqual(g._triggers.length, 1); assert.strictEqual(g._triggers[0].fn, 'synchroSpond');
g.brancherSpond();
assert.strictEqual(g._triggers.length, 1, 'pas de déclencheur en double');
assert.ok(g._logs.some(l => /Spond : 2 événements/.test(l)), g._logs.slice(-3).join(' | '));
// le jeton Spond est gardé (pas de nouvelle connexion à chaque synchro)
const logins = calls.filter(u => /login/.test(u)).length;
g.synchroSpond();
assert.strictEqual(calls.filter(u => /login/.test(u)).length, logins);
g.debrancherSpond(); assert.strictEqual(g._triggers.length, 0);
console.log('COMPOS CORE OK');
