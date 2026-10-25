// Tests serveur : la mission principale (visuels v2, 25/10/2026) : 1 à 3 étoiles d'une même carte, une date de fin
// (les prochaines vacances par défaut), à plusieurs enfants d'un coup, faite quand toutes ses étoiles sont gagnées.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_mission_principale.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeEnv } = require('./gas_mock.js');

// ----- 1. côté appli : js/competences.js -----
const sb = { window: {} }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'competences.js'), 'utf8'), sb);
const SK = sb.MC.SK;
const m2 = { sorte: 'etoile', statut: 'active', domaine: 'passe', etoile: 'vrillee', etoiles: ['vrillee', 'gauche'], fin: '2026-12-19' };
assert.deepStrictEqual(Array.from(SK.etoilesMission(m2)), ['gauche', 'vrillee'], 'dans l\'ordre de la carte');
assert.deepStrictEqual(Array.from(SK.etoilesMission({ domaine: 'plaquage', etoile: 'epaule' })), ['epaule'], 'les anciennes : une étoile');
assert.strictEqual(SK.titreMission(m2), 'Passe à gauche et Passe vrillée');
assert.strictEqual(SK.maxPlus1(m2), 10, '5 encouragements par étoile');
assert.ok(SK.dansMission(m2, 'passe', 'gauche') && !SK.dansMission(m2, 'passe', 'droite'));
let et = SK.etatMission({ etoiles: [{ domaine: 'passe', etoile: 'gauche' }] }, m2, '2026-11-01');
assert.strictEqual(et.n, 1); assert.strictEqual(et.max, 2); assert.strictEqual(et.restantes[0].id, 'vrillee'); assert.strictEqual(et.expiree, false);
assert.strictEqual(SK.etatMission({}, m2, '2026-12-20').expiree, true, 'la date est passée');
assert.strictEqual(SK.prochainesVacances('2026-10-25').date, '2026-12-19', 'pendant la Toussaint : Noël');
assert.strictEqual(SK.prochainesVacances('2026-12-15').date, '2027-02-06', 'à moins d\'une semaine : les suivantes');
assert.strictEqual(SK.prochainDefi({ defmissions: [m2], etoiles: [{ domaine: 'passe', etoile: 'gauche' }] }).e, 'vrillee');

// ----- 2. le serveur -----
const g = makeEnv();
g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
r = g.call({ action: 'addEduc', token: nico, nom: 'Julien' }); const julCode = r.code;
r = g.call({ action: 'adultLogin', code: julCode }); const julien = r.token;
const P = {};
['Tom', 'Léa', 'Hugo', 'Inès'].forEach(function (p) {
  r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p });
  P[p] = r.joueur.id; P['code:' + p] = r.code;
});
r = g.call({ action: 'login', joueurId: P.Tom, pin: P['code:Tom'] }); const tom = r.token;

// Léa a déjà Passe à gauche ; Hugo a déjà les deux ; Inès a une mission de Julien
g.call({ action: 'validerEtoiles', token: nico, etoiles: [{ joueurId: P['Léa'], domaine: 'passe', etoile: 'gauche' }, { joueurId: P.Hugo, domaine: 'passe', etoile: 'gauche' }, { joueurId: P.Hugo, domaine: 'passe', etoile: 'vrillee' }] });
r = g.call({ action: 'defMission', token: julien, sorte: 'etoile', joueurId: P['Inès'], domaine: 'ruck', etoile: 'tete', fin: '2026-11-30' }); assert.ok(r.ok, JSON.stringify(r));
const mInes = r.mission;
assert.deepStrictEqual(mInes.etoiles, ['tete']); assert.strictEqual(mInes.fin, '2026-11-30');

// les erreurs
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'passe', etoiles: ['gauche', 'vrillee', 'droite', 'mains'] }); assert.strictEqual(r.error, 'invalide', '4 étoiles');
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'passe', etoiles: ['gauche', 'epaule'] }); assert.strictEqual(r.error, 'invalide', 'une autre carte');
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Hugo, domaine: 'passe', etoiles: ['gauche', 'vrillee'] }); assert.strictEqual(r.error, 'invalide', 'un seul enfant qui a déjà tout');
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurIds: ['inconnu'], domaine: 'passe', etoiles: ['gauche'] }); assert.strictEqual(r.error, 'introuvable');

// plusieurs enfants d'un coup, sans date : les prochaines vacances
r = g.call({ action: 'defMission', token: julien, sorte: 'etoile', joueurIds: [P.Tom, P['Léa'], P.Hugo, P['Inès']], domaine: 'passe', etoiles: ['vrillee', 'gauche'], texte: 'Jusqu\'à Noël !', remplacer: true });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.missions.length, 3, 'Tom, Léa et Inès (Hugo a déjà tout)');
const byJ = {}; r.missions.forEach(function (m) { byJ[m.joueurId] = m; });
assert.deepStrictEqual(byJ[P.Tom].etoiles, ['gauche', 'vrillee']);
assert.deepStrictEqual(byJ[P['Léa']].etoiles, ['vrillee'], 'Léa : seulement celle qui lui manque');
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(byJ[P.Tom].fin) && byJ[P.Tom].fin > new Date().toISOString().slice(0, 10), 'une date de fin par défaut');
assert.strictEqual(byJ[P.Tom].texte, 'Jusqu\'à Noël !');
assert.deepStrictEqual(r.ignores.map(function (x) { return x.joueurId + ':' + x.raison; }), [P.Hugo + ':deja']);
assert.deepStrictEqual(r.remplacees, [mInes.id], 'la mission d\'Inès (du même éduc) est remplacée');
const mTom = byJ[P.Tom];
// un autre éduc (pas admin) ne remplace pas la mission de Julien ; l'admin, si
r = g.call({ action: 'addEduc', token: nico, nom: 'Cyril' }); const cyCode = r.code;
r = g.call({ action: 'adultLogin', code: cyCode }); const cyril = r.token;
r = g.call({ action: 'defMission', token: cyril, sorte: 'etoile', joueurIds: [P.Tom, P.Hugo], domaine: 'plaquage', etoiles: ['epaule'], remplacer: true });
assert.ok(r.ok); assert.strictEqual(r.missions.length, 1, 'Hugo seulement'); assert.strictEqual(r.ignores[0].raison, 'autre');
r = g.call({ action: 'defMission', token: cyril, sorte: 'etoile', joueurIds: [P['Léa']], domaine: 'plaquage', etoiles: ['epaule'] });
assert.ok(r.ok); assert.strictEqual(r.missions.length, 0); assert.strictEqual(r.ignores[0].raison, 'encours', 'sans « remplacer » : rien');

// l'enfant voit sa mission et ses étoiles
r = g.call({ action: 'me', token: tom });
const vue = r.defmissions.filter(function (m) { return m.sorte === 'etoile' && m.statut === 'active'; });
assert.strictEqual(vue.length, 1); assert.deepStrictEqual(vue[0].etoiles, ['gauche', 'vrillee']);

// les encouragements : 5 par étoile visée (10 ici) ; l'étoile visée = la 1re pas encore gagnée
for (let i = 0; i < 10; i++) { r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.ok(r.ok, JSON.stringify(r)); }
assert.strictEqual(r.nb, 10); assert.strictEqual(r.max, 10); assert.strictEqual(r.encouragement.etoile, 'gauche');
r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.error, 'limite');

// une étoile gagnée sur deux : la mission continue ; la 2e : réussie
r = g.call({ action: 'validerEtoiles', token: nico, etoiles: [{ joueurId: P.Tom, domaine: 'passe', etoile: 'gauche' }] });
assert.deepStrictEqual(r.missionsFaites, []);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.defmissions.filter(function (m) { return m.id === mTom.id; })[0].statut, 'active');
r = g.call({ action: 'validerEtoiles', token: nico, etoiles: [{ joueurId: P.Tom, domaine: 'passe', etoile: 'vrillee' }] });
assert.deepStrictEqual(r.missionsFaites, [mTom.id], 'toutes gagnées : réussie');
const eV = r.etoiles[0];
// une étoile retirée : la mission repart
r = g.call({ action: 'retirerEtoile', token: nico, id: eV.id });
assert.deepStrictEqual(r.missionsRouvertes, [mTom.id]);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.defmissions.filter(function (m) { return m.id === mTom.id; })[0].statut, 'active');

console.log('MISSION PRINCIPALE OK');
