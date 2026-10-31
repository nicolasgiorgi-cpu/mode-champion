// (v34) Alertes sur le téléphone : abonnements, qui reçoit quoi, texte (prénom, jamais de résultat ni de mot d'enfant),
// envoi par Firebase (jeton RS256, une alerte de la même sorte par appareil toutes les 10 min), appareils morts, aucune fuite de clé.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_push.js
const assert = require('assert'), crypto = require('crypto');
const { makeEnv } = require('./gas_mock.js');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const envois = [], jetonsAcces = [];
let panne = null, morts = {};
const g = makeEnv({
  fcm: (url, p) => {
    if (/oauth2\.googleapis\.com\/token/.test(url)) {
      const jwt = p.payload.assertion, [h, c, sig] = jwt.split('.');
      const ok = crypto.verify('sha256', Buffer.from(h + '.' + c), publicKey, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      const claim = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      jetonsAcces.push({ ok, claim });
      return ok ? { code: 200, body: { access_token: 'acces-' + jetonsAcces.length } } : { code: 400, body: 'invalid_grant' };
    }
    const m = JSON.parse(p.payload).message;
    envois.push({ url, auth: p.headers.Authorization, token: m.token, data: m.data });
    if (panne) return { code: 500, body: 'panne' };
    if (morts[m.token]) return { code: 404, body: { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } };
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
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille T' }); const tom = r.joueur.id, tomCode = r.code, fcode = r.familleCode;
r = g.call({ action: 'login', joueurId: tom, pin: tomCode }); r = g.call({ action: 'setPin', token: r.token, pin: '2580' }); const kt = r.token;
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: fcode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '0000' }); const ft = r.token;

// ---------- la configuration publique ----------
r = g.call({ action: 'pushConfig', token: ft });
assert.ok(r.ok && r.web === null, 'sans FCM_WEB : pas d\'alertes');
assert.strictEqual(g.call({ action: 'pushConfig' }).error, 'session', 'réservé aux profils connectés');
g._props.FCM_WEB = JSON.stringify({ apiKey: 'AIza-public', authDomain: 'x.firebaseapp.com', projectId: 'proj-test', messagingSenderId: '123', appId: '1:123:web:abc', vapidKey: 'BPublicVapid', autre: 'pas-renvoye' });
r = g.call({ action: 'pushConfig', token: ft });
assert.deepStrictEqual(r.web, { apiKey: 'AIza-public', authDomain: 'x.firebaseapp.com', projectId: 'proj-test', messagingSenderId: '123', appId: '1:123:web:abc', vapidKey: 'BPublicVapid' });

// ---------- sans la clé secrète : on s'abonne, rien ne part, les actions marchent ----------
const T = { admin: 'jeton-admin-' + 'a'.repeat(30), cyril: 'jeton-cyril-' + 'c'.repeat(30), parent: 'jeton-parent-' + 'p'.repeat(30), tom: 'jeton-tom-' + 't'.repeat(30) };
r = g.call({ action: 'pushAbonner', token: et, jeton: T.admin, cats: ['seance', 'bilan', 'mission', 'niveau', 'compo', 'nimporte'], appareil: 'iPhone' });
assert.ok(r.ok && r.abonne && JSON.stringify(r.cats) === JSON.stringify(['seance', 'bilan', 'mission', 'niveau', 'compo']), 'les sortes inconnues sont ignorées');
assert.ok(!JSON.stringify(r).includes(T.admin), 'le jeton n\'est jamais renvoyé');
assert.strictEqual(g.call({ action: 'pushAbonner', token: et, jeton: 'court', cats: [] }).error, 'invalide');
assert.strictEqual(g.call({ action: 'pushAbonner', token: et, jeton: '<script>' + 'x'.repeat(30), cats: [] }).error, 'invalide');
g.call({ action: 'pushAbonner', token: ct, jeton: T.cyril, cats: ['seance', 'compo'] });            // Cyril : séances et compos seulement
g.call({ action: 'pushAbonner', token: ft, jeton: T.parent, cats: ['seance', 'confirmer', 'mission', 'niveau'] });
g.call({ action: 'pushAbonner', token: kt, jeton: T.tom, cats: ['resultat', 'niveau'] });
r = g.call({ action: 'logSession', token: kt, type: 'cros', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.ok(r.ok && envois.length === 0, 'sans FCM_CLE : rien ne part, l\'action marche');

// ---------- avec la clé ----------
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });
r = g.call({ action: 'logSession', token: kt, type: 'capuozzo', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.ok(r.ok);
assert.strictEqual(jetonsAcces.length, 1, 'un jeton d\'accès Google demandé');
assert.ok(jetonsAcces[0].ok, 'jeton signé RS256 avec la clé du compte de service (signature vérifiée)');
assert.strictEqual(jetonsAcces[0].claim.scope, 'https://www.googleapis.com/auth/firebase.messaging');
assert.strictEqual(jetonsAcces[0].claim.iss, 'envoi@proj-test.iam.gserviceaccount.com');
const vers = envois.map(e => e.token).sort();
assert.deepStrictEqual(vers, [T.admin, T.cyril, T.parent].sort(), 'les éducs abonnés aux séances et la famille ; pas l\'enfant lui-même');
envois.forEach(e => {
  assert.ok(/fcm\.googleapis\.com\/v1\/projects\/proj-test\/messages:send/.test(e.url));
  assert.strictEqual(e.auth, 'Bearer acces-1');
  assert.strictEqual(e.data.texte, 'Tom a fait la séance de Capuozzo.', 'avec le prénom (choix de Nicolas)');
  assert.strictEqual(e.data.tag, 'seance');
});
assert.strictEqual(envois.find(e => e.token === T.parent).data.lien, '#/parent/notifs');
assert.strictEqual(envois.find(e => e.token === T.admin).data.lien, '#/educ/notifs');
// une alerte de la même sorte par appareil toutes les 10 minutes
envois.length = 0;
g.call({ action: 'logSession', token: kt, type: 'dupont', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.strictEqual(envois.length, 0, 'la 2e séance dans les 10 min : pas de 2e alerte');
assert.strictEqual(jetonsAcces.length, 1, 'le jeton d\'accès est réutilisé (cache)');
Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);   // 10 min plus tard

// ---------- un bilan : la famille « à confirmer », les éducs « bilan » ; jamais les valeurs ----------
r = g.call({ action: 'submitRecords', token: kt, bilan: '1', valeurs: [{ test: 'saut', valeur: 187 }, { test: 'flamant', valeur: 25 }] });
assert.ok(r.ok);
let p = envois.find(e => e.token === T.parent), a = envois.find(e => e.token === T.admin);
assert.strictEqual(p.data.texte, 'Tom a noté son Bilan 1 (2 résultats). À confirmer.');
assert.strictEqual(a.data.texte, 'Tom a noté son Bilan 1 (2 résultats).');
assert.ok(!envois.some(e => e.token === T.cyril), 'Cyril n\'a pas pris les bilans');
assert.ok(!envois.some(e => /187|25/.test(e.data.texte)), 'aucun résultat chiffré sur l\'écran verrouillé');
// la famille confirme : l'enfant est prévenu
envois.length = 0;
const ids = r.records.map(x => x.id);
r = g.call({ action: 'confirm', token: ft, decisions: [{ id: ids[0], statut: 'ok' }, { id: ids[1], statut: 'refuse' }] });
assert.ok(r.ok);
assert.deepStrictEqual(envois.map(e => [e.token, e.data.texte]), [[T.tom, 'Tes résultats : 1 résultat confirmé, 1 refusé par ta famille.']]);

// ---------- mission : prénom, jamais le mot de l'enfant ni ses copains ----------
envois.length = 0;
r = g.call({ action: 'mission', token: kt, mission: 'jeu10', postes: ['centre'], message: 'Je veux être ouvreur, pas pilier' });
assert.ok(r.ok);
a = envois.find(e => e.token === T.admin); p = envois.find(e => e.token === T.parent);
assert.strictEqual(a.data.texte, 'Tom a répondu à « Choisis ton poste ».');
assert.strictEqual(p.data.texte, 'Tom a fait la mission « Choisis ton poste ».');
assert.ok(!envois.some(e => /ouvreur|pilier/.test(JSON.stringify(e.data))), 'le mot pour les éducs ne part pas');

// ---------- niveaux changés par un éduc : l'enfant, sa famille, les autres éducs (pas lui) ----------
envois.length = 0;
r = g.call({ action: 'setNiveaux', token: ct, joueurId: tom, niveaux: { pompes: 3 } });
assert.ok(r.ok);
assert.deepStrictEqual(envois.map(e => e.token).sort(), [T.admin, T.parent, T.tom].sort(), 'Cyril a fait le changement : pas d\'alerte pour lui');
assert.strictEqual(envois.find(e => e.token === T.tom).data.texte, 'Tes niveaux de prépa ont changé (Cyril).');

// ---------- appareil mort (désinstallé) : désabonné tout seul ----------
envois.length = 0; Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);
morts[T.cyril] = true;
g.call({ action: 'logSession', token: kt, type: 'meafou', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.ok(envois.some(e => e.token === T.cyril), 'tenté une fois');
const ligneCyril = new g.SheetDB_().rows('push').find(x => x.jeton === T.cyril);
assert.strictEqual(ligneCyril.actif, false, 'puis désabonné');
delete morts[T.cyril];

// ---------- Firebase en panne : l'action réussit quand même ----------
envois.length = 0; Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);
panne = true;
r = g.call({ action: 'logSession', token: kt, type: 'club', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.ok(r.ok && envois.length > 0, 'panne : la séance est quand même notée');
panne = null;

// ---------- l'essai : sur ses propres appareils, même pendant la pause ----------
envois.length = 0;
r = g.call({ action: 'pushEssai', token: ft });
assert.ok(r.ok && r.appareils === 1 && r.envoi === true);
assert.deepStrictEqual(envois.map(e => e.token), [T.parent]);
envois.length = 0; g.call({ action: 'pushEssai', token: ft });
assert.strictEqual(envois.length, 1, 'l\'essai ne fait pas de pause');

// ---------- se désabonner ----------
r = g.call({ action: 'pushDesabonner', token: ft, jeton: T.parent });
assert.ok(r.ok && r.abonne === false);
envois.length = 0; Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);
g.call({ action: 'logSession', token: kt, type: 'cros', date: new Date().toISOString().slice(0, 10), mode: 'rapide' });
assert.ok(!envois.some(e => e.token === T.parent), 'désabonné : plus d\'alerte');
// on se réabonne : la même ligne revient
g.call({ action: 'pushAbonner', token: ft, jeton: T.parent, cats: ['seance'] });
assert.strictEqual(new g.SheetDB_().rows('push').filter(x => x.jeton === T.parent).length, 1, 'pas de doublon');

// ---------- un compte ne voit ni ne touche les abonnements des autres ----------
g.call({ action: 'pushDesabonner', token: kt, jeton: T.parent });
assert.strictEqual(new g.SheetDB_().rows('push').find(x => x.jeton === T.parent).actif, true, 'l\'enfant ne désabonne pas ses parents');

// ---------- aucune fuite : ni la clé, ni les jetons dans les réponses, ni dans le journal ----------
const tout = JSON.stringify([g.call({ action: 'group', token: et }), g.call({ action: 'family', token: ft }), g.call({ action: 'me', token: kt }), g.call({ action: 'pushConfig', token: et })]);
assert.ok(!tout.includes('PRIVATE KEY') && !tout.includes('jeton-') && !tout.includes('envoi@proj-test'), 'rien de secret dans les réponses');
assert.ok(!g._logs.join('\n').includes('PRIVATE KEY'));
// vérifierAlertes (éditeur) : dit si la clé est acceptée, sans l'afficher
g.verifierAlertes();
assert.ok(/✅ Firebase accepte la clé du projet « proj-test »/.test(g._logs.join('\n')), g._logs.slice(-2).join('\n'));
assert.ok(!g._logs.join('\n').includes('BEGIN'));

console.log('test_push : OK');
