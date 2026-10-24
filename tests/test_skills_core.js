// Tests serveur : étoiles Skills, +1 des éducs, missions des éducs (vidéo, QCM, mission perso), accès des enfants et des parents.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_skills_core.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');

const g = makeEnv();
g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{6})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
r = g.call({ action: 'addEduc', token: nico, nom: 'Julien' }); const julCode = r.code;
r = g.call({ action: 'adultLogin', code: julCode }); const julien = r.token;
const P = {};
['Tom', 'Léa', 'Hugo'].forEach(function (p) {
  r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p });
  P[p] = r.joueur.id; P['code:' + p] = r.code; P['fam:' + p] = r.familleCode;
});
r = g.call({ action: 'login', joueurId: P.Tom, pin: P['code:Tom'] }); const tom = r.token; assert.ok(r.ok, JSON.stringify(r));
r = g.call({ action: 'login', joueurId: P['Léa'], pin: P['code:Léa'] }); const lea = r.token;
r = g.call({ action: 'adultLogin', code: P['fam:Tom'] }); const famTom = r.token;

// ----- au départ : rien -----
r = g.call({ action: 'me', token: tom });
assert.deepStrictEqual(r.etoiles, []); assert.deepStrictEqual(r.encouragements, []); assert.deepStrictEqual(r.defmissions, []);

// ----- mission perso : décrocher l'étoile Épaule -----
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'plaquage', etoile: 'pirate' });
assert.strictEqual(r.error, 'invalide', 'étoile inconnue');
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule', titre: 'Engager l\'épaule au plaquage' });
assert.ok(r.ok, JSON.stringify(r));
const mTom = r.mission;
assert.strictEqual(mTom.statut, 'active'); assert.strictEqual(mTom.joueurId, P.Tom); assert.strictEqual(mTom.parNom, 'Admin');
// une seule mission perso à la fois
r = g.call({ action: 'defMission', token: julien, sorte: 'etoile', joueurId: P.Tom, domaine: 'passe', etoile: 'gauche' });
assert.strictEqual(r.error, 'deja'); assert.strictEqual(r.missionId, mTom.id);
// les enfants et les parents ne créent pas de mission
r = g.call({ action: 'defMission', token: tom, sorte: 'etoile', joueurId: P.Tom, domaine: 'plaquage', etoile: 'joue' }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'defMission', token: famTom, sorte: 'qcm', titre: 'x', questions: [] }); assert.strictEqual(r.error, 'interdit');

// ----- +1 -----
r = g.call({ action: 'plusUn', token: famTom, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.error, 'interdit', 'un parent ne donne jamais de +1');
r = g.call({ action: 'plusUn', token: tom, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'plusUn', token: julien, joueurId: P.Tom, missionId: mTom.id, occasion: 'Plateau du 10 oct.', mot: 'Bien mieux à droite' });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.nb, 1); assert.strictEqual(r.max, 5);
assert.strictEqual(r.encouragement.parNom, 'Julien'); assert.strictEqual(r.encouragement.domaine, 'plaquage'); assert.strictEqual(r.encouragement.etoile, 'epaule');
const p1 = r.encouragement;
r = g.call({ action: 'plusUn', token: nico, joueurId: P['Léa'], missionId: mTom.id }); assert.strictEqual(r.error, 'invalide', 'la mission de Tom, pas celle de Léa');
r = g.call({ action: 'plusUn', token: nico, joueurId: P['Léa'] }); assert.strictEqual(r.error, 'invalide', 'sans mission : un mot obligatoire');
r = g.call({ action: 'plusUn', token: nico, joueurId: P['Léa'], mot: 'Super passe à gauche <b>!</b>' });
assert.ok(r.ok); assert.strictEqual(r.encouragement.missionId, ''); assert.ok(r.encouragement.mot.indexOf('<') < 0, 'pas de HTML');
for (let i = 2; i <= 5; i++) { r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.nb, i); }
r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.error, 'limite', 'jusqu\'à 5 +1 par mission');
// retirer un +1 : son auteur ou l'admin
r = g.call({ action: 'retirerEncouragement', token: julien, id: (g.call({ action: 'group', token: nico }).joueurs.find(p => p.joueur.id === P.Tom).encouragements.find(x => x.parNom === 'Admin')).id });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'retirerEncouragement', token: nico, id: p1.id }); assert.ok(r.ok, 'l\'admin peut retirer');
r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.nb, 5, 'un +1 retiré libère une place');

// l'enfant et sa famille voient les +1 et les mots
r = g.call({ action: 'me', token: tom });
assert.strictEqual(r.encouragements.length, 5); assert.strictEqual(r.defmissions.length, 1); assert.strictEqual(r.defmissions[0].id, mTom.id);
r = g.call({ action: 'family', token: famTom });
assert.strictEqual(r.enfants[0].encouragements.length, 5);
// la mission perso de Tom n'est pas montrée à Léa ; le mot de Léa n'est pas montré à Tom
r = g.call({ action: 'me', token: lea });
assert.strictEqual(r.defmissions.length, 0); assert.strictEqual(r.encouragements.length, 1);

// ----- valider une étoile : la mission perso est faite -----
r = g.call({ action: 'validerEtoiles', token: tom, etoiles: [{ joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule' }] }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'validerEtoiles', token: famTom, etoiles: [{ joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule' }] }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'validerEtoiles', token: julien, etoiles: [{ joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule' }, { joueurId: P.Tom, domaine: 'faux', etoile: 'x' }] });
assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'group', token: nico });
assert.strictEqual(r.joueurs.find(p => p.joueur.id === P.Tom).etoiles.length, 0, 'rien écrit quand une étoile du lot est fausse');
r = g.call({ action: 'validerEtoiles', token: julien, occasion: 'Entraînement du 21 oct.', etoiles: [
  { joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule' }, { joueurId: P.Tom, domaine: 'plaquage', etoile: 'joue', essais: [1, 0, 1] }, { joueurId: P['Léa'], domaine: 'passe', etoile: 'gauche' }] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.etoiles.length, 3); assert.deepStrictEqual(r.missionsFaites, [mTom.id]);
assert.deepStrictEqual(r.etoiles[1].essais, [1, 0, 1]);
r = g.call({ action: 'validerEtoiles', token: nico, etoiles: [{ joueurId: P.Tom, domaine: 'plaquage', etoile: 'epaule' }] });
assert.strictEqual(r.etoiles.length, 0); assert.strictEqual(r.deja, 1, 'pas deux fois la même étoile');
r = g.call({ action: 'me', token: tom });
assert.strictEqual(r.etoiles.length, 2); assert.strictEqual(r.etoiles[0].parNom, 'Julien'); assert.strictEqual(r.etoiles[0].occasion, 'Entraînement du 21 oct.');
assert.ok(r.etoiles[0].essais === undefined, 'le détail des essais reste aux éducs');
assert.strictEqual(r.defmissions[0].statut, 'faite');
// plus de +1 sur une mission faite
r = g.call({ action: 'plusUn', token: nico, joueurId: P.Tom, missionId: mTom.id }); assert.strictEqual(r.error, 'invalide');
// retirer une étoile validée par erreur : la mission repart
const ep = g.call({ action: 'group', token: nico }).joueurs.find(p => p.joueur.id === P.Tom).etoiles.find(e => e.etoile === 'epaule');
r = g.call({ action: 'retirerEtoile', token: famTom, id: ep.id }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'retirerEtoile', token: julien, id: ep.id }); assert.ok(r.ok); assert.deepStrictEqual(r.missionsRouvertes, [mTom.id]);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.etoiles.length, 1); assert.strictEqual(r.defmissions[0].statut, 'active');
// on ne peut pas viser une étoile déjà gagnée ; remplacer la mission en cours
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'plaquage', etoile: 'joue', remplacer: true }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'defMission', token: nico, sorte: 'etoile', joueurId: P.Tom, domaine: 'passe', etoile: 'gauche', remplacer: true }); assert.ok(r.ok);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.defmissions.length, 1, 'l\'ancienne mission perso est retirée'); assert.strictEqual(r.defmissions[0].etoile, 'gauche');

// ----- missions du groupe : vidéo + quiz, QCM -----
const qs = [{ q: 'Au ruck, où est ta tête ?', opts: ['Devant le ballon', 'Au-dessus, dos plat', 'Baissée'], ok: 1 }, { q: 'Tu rentres…', opts: ['Par le côté', 'Dans l\'axe'], ok: 1 }];
r = g.call({ action: 'defMission', token: nico, sorte: 'video', titre: 'Le ruck en vidéo', video: 'pas une vidéo', questions: qs }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'defMission', token: nico, sorte: 'video', titre: 'Le ruck en vidéo', video: 'https://www.youtube.com/watch?v=abcdefghijk&t=3', questions: qs, fin: '2026-11-02' });
assert.ok(r.ok, JSON.stringify(r)); const mVid = r.mission;
assert.strictEqual(mVid.video, 'abcdefghijk'); assert.strictEqual(mVid.xp, 50); assert.strictEqual(mVid.fin, '2026-11-02');
r = g.call({ action: 'defMission', token: nico, sorte: 'qcm', titre: 'Le hors-jeu', questions: [] }); assert.strictEqual(r.error, 'invalide', 'un QCM a des questions');
r = g.call({ action: 'defMission', token: nico, sorte: 'qcm', titre: 'Le hors-jeu', questions: [{ q: 'Q', opts: ['a', 'b'], ok: 2 }] }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'defMission', token: julien, sorte: 'qcm', titre: 'Le hors-jeu', questions: [{ q: 'Q1', opts: ['a', 'b', 'c'], ok: 2 }], xp: 9999 });
assert.ok(r.ok); const mQcm = r.mission; assert.strictEqual(mQcm.xp, 50, 'XP bornés');
r = g.call({ action: 'me', token: lea }); assert.strictEqual(r.defmissions.length, 2, 'Léa voit les 2 missions du groupe');
// la vidéo, puis les réponses
r = g.call({ action: 'repondreMission', token: famTom, missionId: mVid.id, vu: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'repondreMission', token: lea, missionId: mVid.id, vu: true });
assert.ok(r.ok, JSON.stringify(r)); let ml = r.missions.find(m => m.mission === mVid.id); assert.strictEqual(ml.faite, false); assert.strictEqual(ml.reponses.vu, true);
r = g.call({ action: 'repondreMission', token: lea, missionId: mVid.id, reponses: [1] }); assert.strictEqual(r.error, 'invalide', 'toutes les questions');
r = g.call({ action: 'repondreMission', token: lea, missionId: mVid.id, reponses: [1, 0] });
ml = r.missions.find(m => m.mission === mVid.id); assert.strictEqual(ml.faite, true); assert.strictEqual(ml.reponses.score, 1); assert.strictEqual(ml.reponses.total, 2);
r = g.call({ action: 'repondreMission', token: lea, missionId: mVid.id, reponses: [1, 1] });
ml = r.missions.find(m => m.mission === mVid.id); assert.strictEqual(ml.reponses.score, 1, 'la 1re fois compte');
r = g.call({ action: 'repondreMission', token: lea, missionId: mQcm.id, reponses: [2] });
assert.strictEqual(r.missions.find(m => m.mission === mQcm.id).faite, true);
// modifier, retirer : l'auteur ou l'admin
r = g.call({ action: 'defMission', token: julien, id: mVid.id, titre: 'Autre' }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'defMission', token: nico, id: mQcm.id, fin: '2026-11-30' }); assert.ok(r.ok); assert.strictEqual(r.mission.fin, '2026-11-30');
r = g.call({ action: 'defMission', token: julien, id: mQcm.id, retirer: true }); assert.ok(r.ok); assert.strictEqual(r.mission.statut, 'retiree');
r = g.call({ action: 'me', token: lea }); assert.strictEqual(r.defmissions.length, 1);
r = g.call({ action: 'repondreMission', token: tom, missionId: mQcm.id, reponses: [2] }); assert.strictEqual(r.error, 'introuvable');

// ----- l'éduc voit tout dans le groupe -----
r = g.call({ action: 'group', token: julien });
assert.ok(r.defmissions.some(m => m.id === mVid.id)); assert.ok(r.defmissions.some(m => m.sorte === 'etoile' && m.joueurId === P.Tom));
const leaG = r.joueurs.find(p => p.joueur.id === P['Léa']);
assert.strictEqual(leaG.etoiles.length, 1); assert.strictEqual(leaG.encouragements.length, 1);
assert.strictEqual(leaG.missions.find(m => m.mission === mVid.id).reponses.score, 1);

// ----- les prochains rendez-vous des familles : seulement là où leur enfant est invité -----
r = g.call({ action: 'setEvenement', token: nico, titre: 'Entraînement - Lézat', debut: '2099-11-04', lieu: 'Lézat', sorte: 'entrainement', presents: [P.Tom] });
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau autre catégorie', debut: '2099-11-05', presents: [P['Léa']] });
r = g.call({ action: 'family', token: famTom });
assert.strictEqual(r.prochains.length, 1); assert.strictEqual(r.prochains[0].titre, 'Entraînement - Lézat');
assert.ok(JSON.stringify(r.prochains).indexOf('presents') < 0, 'pas les présents');

console.log('SKILLS CORE OK');
