// (v36) « Bravo » d'un éduc pour une séance de prépa faite : un toucher, un seul par éduc et par séance (le 2e geste change
// le mot), réservé aux éducs, visible par l'enfant et sa famille, retiré par son auteur ou l'admin ; alertes sur le téléphone
// (enfant et famille, le prénom de l'éduc, jamais le mot) ; aucune XP.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_bravos.js
const assert = require('assert'), crypto = require('crypto');
const { makeEnv } = require('./gas_mock.js');
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const envois = [];
const g = makeEnv({
  fcm: (url, p) => {
    if (/oauth2\.googleapis\.com\/token/.test(url)) return { code: 200, body: { access_token: 'acces' } };
    envois.push(JSON.parse(p.payload).message);
    return { code: 200, body: { name: 'ok' } };
  }
});
g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const adminId = g.call({ action: 'educsListe' }).educs[0].id;
let r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: ac });
r = g.call({ action: 'setAdultPin', token: r.token, pin: '2468' }); const et = r.token;
r = g.call({ action: 'addEduc', token: et, nom: 'Cyril' }); const cyril = r.educ.id, cyrilCode = r.code;
r = g.call({ action: 'adultLogin', role: 'e', educId: cyril, code: cyrilCode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '1111' }); const ct = r.token;
r = g.call({ action: 'addEduc', token: et, nom: 'Julien' }); const julien = r.educ.id, julienCode = r.code;
r = g.call({ action: 'adultLogin', role: 'e', educId: julien, code: julienCode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '3333' }); const jt = r.token;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille T' }); const tom = r.joueur.id, tomCode = r.code, fcode = r.familleCode;
r = g.call({ action: 'login', joueurId: tom, pin: tomCode }); r = g.call({ action: 'setPin', token: r.token, pin: '2580' }); const kt = r.token;
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: fcode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '0000' }); const ft = r.token;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Léa', familleNom: 'Famille L' }); const lea = r.joueur.id;
const auj = new Date().toISOString().slice(0, 10);

r = g.call({ action: 'logSession', token: kt, type: 'cros', date: auj, mode: 'guidee', ressenti: 'bien' });
assert.ok(r.ok); const s1 = r.seance.id;
r = g.call({ action: 'logSession', token: kt, type: 'club', date: auj, mode: 'rapide' }); const s2 = r.seance.id;
const xpAvant = JSON.stringify(g.call({ action: 'me', token: kt }).joueur);

// ---------- réservé aux éducs ----------
assert.strictEqual(g.call({ action: 'bravo', token: kt, seanceId: s1 }).error, 'interdit', 'un enfant ne se dit pas bravo');
assert.strictEqual(g.call({ action: 'bravo', token: ft, seanceId: s1 }).error, 'interdit', 'les parents ne donnent pas de bravo (décision du 31/10)');
assert.strictEqual(g.call({ action: 'bravo', seanceId: s1 }).error, 'session');
assert.strictEqual(g.call({ action: 'bravo', token: et, seanceId: 'nimporte' }).error, 'introuvable');
assert.strictEqual(g.call({ action: 'bravo', token: et }).error, 'introuvable');

// ---------- un toucher ----------
r = g.call({ action: 'bravo', token: et, seanceId: s1 });
assert.ok(r.ok && r.nouveau, 'le 1er bravo');
const b1 = r.bravo;
assert.strictEqual(b1.seanceId, s1); assert.strictEqual(b1.joueurId, tom); assert.strictEqual(b1.mot, ''); assert.strictEqual(b1.parQui, adminId);
assert.ok(b1.parNom && b1.cree && b1.maj);
// le même éduc retouche : pas de 2e bravo
r = g.call({ action: 'bravo', token: et, seanceId: s1 });
assert.ok(r.ok && !r.nouveau && r.bravo.id === b1.id, 'un seul bravo par éduc et par séance');
// + un mot (après coup)
r = g.call({ action: 'bravo', token: et, seanceId: s1, mot: '  Super   séance, continue !  ' });
assert.ok(r.ok && !r.nouveau && r.bravo.id === b1.id && r.bravo.mot === 'Super séance, continue !', 'le mot s\'ajoute au même bravo (nettoyé)');
r = g.call({ action: 'bravo', token: et, seanceId: s1, mot: 'x'.repeat(300) });
assert.strictEqual(r.bravo.mot.length, 140, 'mot limité à 140 caractères');
g.call({ action: 'bravo', token: et, seanceId: s1, mot: 'Super séance, continue !' });
// un autre éduc : son propre bravo
r = g.call({ action: 'bravo', token: ct, seanceId: s1 });
assert.ok(r.ok && r.nouveau && r.bravo.id !== b1.id && r.bravo.parQui === cyril, 'chaque éduc a le sien');
const b2 = r.bravo;
r = g.call({ action: 'bravo', token: et, seanceId: s2 }); const b3 = r.bravo;

// ---------- qui voit quoi ----------
let me = g.call({ action: 'me', token: kt });
assert.strictEqual(me.bravos.length, 3, 'l\'enfant voit ses bravos');
const vu = me.bravos.find(x => x.id === b1.id);
assert.strictEqual(vu.mot, 'Super séance, continue !'); assert.strictEqual(vu.seanceId, s1);
assert.ok(!('parQui' in vu), 'l\'enfant n\'a pas besoin de l\'identifiant de l\'éduc');
const fam = g.call({ action: 'family', token: ft });
assert.strictEqual(fam.enfants[0].bravos.length, 3, 'la famille voit les bravos');
assert.ok(!('parQui' in fam.enfants[0].bravos[0]));
let grp = g.call({ action: 'group', token: ct });
let gp = grp.joueurs.find(p => p.joueur.id === tom);
assert.strictEqual(gp.bravos.length, 3, 'les éducs voient tous les bravos');
assert.ok(gp.bravos.every(x => x.parQui), 'avec qui l\'a donné (pour « Bravo envoyé ✓ »)');
assert.strictEqual(grp.joueurs.find(p => p.joueur.id === lea).bravos.length, 0);
const kd = g.call({ action: 'kid', token: ct, joueurId: tom });
assert.strictEqual(kd.bravos.length, 3, 'la fiche de l\'enfant (éduc)');
assert.strictEqual(JSON.stringify(g.call({ action: 'me', token: kt }).joueur), xpAvant, 'un bravo ne change rien au joueur (pas d\'XP)');

// ---------- retirer ----------
assert.strictEqual(g.call({ action: 'retirerBravo', token: jt, id: b2.id }).error, 'interdit', 'un autre éduc ne retire pas le bravo de Cyril');
assert.strictEqual(g.call({ action: 'retirerBravo', token: ft, id: b2.id }).error, 'interdit');
r = g.call({ action: 'retirerBravo', token: ct, id: b2.id }); assert.ok(r.ok, 'son auteur le retire');
assert.strictEqual(g.call({ action: 'retirerBravo', token: ct, id: b2.id }).error, 'introuvable', 'déjà retiré');
r = g.call({ action: 'retirerBravo', token: et, id: b3.id }); assert.ok(r.ok, 'l\'admin aussi');
assert.strictEqual(g.call({ action: 'me', token: kt }).bravos.length, 1, 'les bravos retirés disparaissent');
r = g.call({ action: 'bravo', token: ct, seanceId: s1 });
assert.ok(r.ok && r.nouveau && r.bravo.id !== b2.id, 'après un retrait, Cyril peut redire bravo');

// ---------- enfant désactivé ----------
r = g.call({ action: 'addPlayer', token: et, prenom: 'Zoé', familleNom: 'Famille Z' }); const zoe = r.joueur.id, zc = r.code;
r = g.call({ action: 'login', joueurId: zoe, pin: zc }); r = g.call({ action: 'setPin', token: r.token, pin: '9753' });
const sz = g.call({ action: 'logSession', token: r.token, type: 'dupont', date: auj, mode: 'rapide' }).seance.id;
r = g.call({ action: 'updatePlayer', token: et, joueurId: zoe, actif: false }); assert.ok(r.ok);
assert.strictEqual(g.call({ action: 'bravo', token: et, seanceId: sz }).error, 'introuvable', 'enfant désactivé : pas de bravo');

// ---------- les alertes sur le téléphone ----------
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });
const T = { tom: 'jeton-tom-' + 't'.repeat(30), parent: 'jeton-parent-' + 'p'.repeat(30), julien: 'jeton-julien-' + 'j'.repeat(30), tomSans: 'jeton-tom2-' + 'u'.repeat(30) };
r = g.call({ action: 'pushAbonner', token: kt, jeton: T.tom, cats: ['resultat', 'bravo'] });
assert.deepStrictEqual(r.cats, ['resultat', 'bravo'], 'la sorte « bravo » existe pour l\'enfant');
r = g.call({ action: 'pushAbonner', token: ft, jeton: T.parent, cats: ['seance', 'bravo'] });
assert.deepStrictEqual(r.cats, ['seance', 'bravo'], 'et pour la famille');
r = g.call({ action: 'pushAbonner', token: jt, jeton: T.julien, cats: ['seance', 'bravo'] });
assert.deepStrictEqual(r.cats, ['seance'], 'pas pour les éducs');
const s3 = g.call({ action: 'logSession', token: kt, type: 'meafou', date: auj, mode: 'rapide' }).seance.id;
envois.length = 0;
r = g.call({ action: 'bravo', token: jt, seanceId: s3 });
assert.ok(r.ok && r.nouveau);
const aTom = envois.filter(m => m.token === T.tom), aPar = envois.filter(m => m.token === T.parent);
assert.strictEqual(aTom.length, 1, 'l\'enfant est prévenu');
assert.strictEqual(aTom[0].data.texte, '👏 Julien te dit bravo pour ta séance de Meafou !');
assert.strictEqual(aTom[0].data.lien, '#/notifs');
assert.strictEqual(aPar.length, 1, 'sa famille aussi');
assert.strictEqual(aPar[0].data.texte, '👏 Julien a dit bravo à Tom pour sa séance de Meafou.');
assert.ok(!envois.some(m => m.token === T.julien), 'jamais l\'éduc qui l\'a donné');
// le mot ajouté après : l'enfant est prévenu, sans le mot sur l'écran verrouillé
envois.length = 0;
r = g.call({ action: 'bravo', token: jt, seanceId: s3, mot: 'Mot très personnel' });
assert.ok(r.ok && !r.nouveau);
assert.ok(!JSON.stringify(envois).includes('très personnel'), 'jamais le mot sur l\'écran');
// (la même sorte sur le même appareil dans les 10 minutes : l'alerte peut être retenue ; s'il y en a une, c'est la bonne)
envois.filter(m => m.token === T.tom).forEach(m => assert.strictEqual(m.data.texte, '💬 Julien t\'a laissé un mot pour ta séance de Meafou.'));
assert.ok(!envois.some(m => m.token === T.parent), 'le mot seul ne réveille pas la famille');
// re-toucher sans changement : rien
envois.length = 0;
g.call({ action: 'bravo', token: jt, seanceId: s3 });
assert.strictEqual(envois.length, 0, 'un 2e toucher ne renvoie pas d\'alerte');
// club : « pour son entraînement au club »
const s4 = g.call({ action: 'logSession', token: kt, type: 'club', date: auj, mode: 'rapide' }).seance.id;
envois.length = 0;
r = g.call({ action: 'bravo', token: ct, seanceId: s4, mot: 'Bien joué' });
const t4 = envois.filter(m => m.token === T.tom), p4 = envois.filter(m => m.token === T.parent);
assert.strictEqual(t4.length, 1, 'une autre séance félicitée juste après : une alerte de plus (une par séance)');
assert.strictEqual(t4[0].data.texte, '👏 Cyril te dit bravo pour ton entraînement au club ! Avec un petit mot.');
assert.strictEqual(t4[0].data.tag, 'p-bravo-' + s4, 'tag par séance');
assert.strictEqual(p4.length, 1);
assert.strictEqual(p4[0].data.texte, '👏 Cyril a dit bravo à Tom pour son entraînement au club.');

console.log('test_bravos : OK');
