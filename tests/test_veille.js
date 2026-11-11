// (v80) Journal et veille du serveur : chaque demande écrit son type et sa durée (jamais son contenu) ; une demande de plus de
// 20 s est notée ; la veille (toutes les minutes) repère une demande qui garde le verrou depuis plus d'une minute, note
// l'incident et prévient les éducs administrateurs sur leur téléphone, une seule fois par blocage. Le message « occupé ».
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_veille.js
const assert = require('assert'), crypto = require('crypto');
const { makeEnv } = require('./gas_mock.js');
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const envois = [];
const g = makeEnv({
  declencheurs: true,
  fcm: (url, p) => {
    if (/oauth2\.googleapis\.com\/token/.test(url)) return { code: 200, body: { access_token: 'acces' } };
    const m = JSON.parse(p.payload).message;
    envois.push({ token: m.token, data: m.data, verrou: g._verrou.pris });
    return { code: 200, body: { name: 'ok' } };
  }
});
const journal = [];
g.console = { log: m => journal.push(String(m)), error: () => {}, warn: () => {} };
g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const adminId = g.call({ action: 'educsListe' }).educs[0].id;
let r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: ac });
r = g.call({ action: 'setAdultPin', token: r.token, pin: '2468' }); const et = r.token;
r = g.call({ action: 'addEduc', token: et, nom: 'Cyril' }); const cyril = r.educ.id, cyrilCode = r.code;
r = g.call({ action: 'adultLogin', role: 'e', educId: cyril, code: cyrilCode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '1111' }); const ct = r.token;
const T = { admin: 'jeton-admin-' + 'a'.repeat(30), cyril: 'jeton-cyril-' + 'c'.repeat(30) };
g.call({ action: 'pushAbonner', token: et, jeton: T.admin, cats: ['seance'] });
g.call({ action: 'pushAbonner', token: ct, jeton: T.cyril, cats: ['seance', 'compo'] });
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });

// ---------- le journal : le type de demande et sa durée, jamais son contenu ----------
journal.length = 0;
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: '2468' });
assert.ok(r.ok);
assert.ok(journal.some(l => /^\[mc\] adultLogin \d+ ms ok \(attente \d+ ms\)$/.test(l)), journal.join('\n'));
assert.ok(!journal.join('\n').includes('2468') && !journal.join('\n').includes(adminId), 'jamais le code ni l\'identifiant dans le journal');
g.call({ action: 'pasUneAction<script>' });
assert.ok(journal.some(l => /^\[mc\] inconnue \d+ ms invalide \(attente \d+ ms\)$/.test(l)), 'une action bizarre est notée « inconnue »');
assert.strictEqual(g._cache['veille:enCours'], undefined, 'le verrou relâché : plus de demande « en cours »');

// une demande de plus de 20 s est notée dans les incidents (pas une demande ordinaire)
assert.strictEqual(g._props.veilleIncidents, undefined);
g.journal_('group', Date.now() - 25000, 'ok', Date.now() - 24000);
g.journal_('me', Date.now() - 2000, 'ok', Date.now() - 1900);
g.journal_('equipe', Date.now() - 24000, 'ok', Date.now() - 500);   // (relecture) 23,5 s d'attente du verrou, 0,5 s de traitement : pas un incident
let inc = JSON.parse(g._props.veilleIncidents);
assert.strictEqual(inc.length, 1);
assert.strictEqual(inc[0].action, 'group');
assert.ok(inc[0].ms >= 24000 && inc[0].ms < 25000 && inc[0].etat === 'ok', 'le temps de traitement seul');
g.journal_('group', Date.now() - 25000, 'occupe');
assert.strictEqual(JSON.parse(g._props.veilleIncidents).length, 1, 'une demande qui a seulement attendu le verrou n\'est pas un incident');

// ---------- la veille ----------
assert.strictEqual(g.veilleServeur(), null, 'rien en cours : rien à signaler');
g._cache['veille:enCours'] = JSON.stringify({ a: 'submitRecords', t: Date.now() - 30000 });
assert.strictEqual(g.veilleServeur(), null, 'depuis 30 s : pas encore un blocage');
const debut = Date.now() - 95000;
g._cache['veille:enCours'] = JSON.stringify({ a: 'adultLogin', t: debut });
envois.length = 0;
const texte = g.veilleServeur();
assert.ok(/^⚠️ Serveur bloqué depuis \d+ h \d\d \(connexion d'un adulte\) : il repart tout seul avant \d+ h \d\d\.$/.test(texte), texte);
assert.deepStrictEqual(envois.map(e => e.token), [T.admin], 'seul l\'éduc administrateur est prévenu (pas Cyril), même sans la sorte « serveur » cochée');
assert.strictEqual(envois[0].data.texte, texte);
assert.strictEqual(envois[0].data.lien, '#/educ');
assert.strictEqual(envois[0].verrou, false, 'la veille ne prend pas le verrou');
inc = JSON.parse(g._props.veilleIncidents);
assert.deepStrictEqual(inc[inc.length - 1], { quand: new Date(debut).toISOString(), action: 'adultLogin', etat: 'bloque' });
// une seule alerte par blocage
envois.length = 0;
assert.strictEqual(g.veilleServeur(), null);
assert.strictEqual(envois.length, 0);
// un nouveau blocage (une autre demande) : une nouvelle alerte
g._cache['veille:enCours'] = JSON.stringify({ a: 'group', t: Date.now() - 70000 });
assert.ok(/\(l'espace éduc\)/.test(g.veilleServeur()));
assert.strictEqual(envois.length, 1);
// les incidents : les 20 derniers seulement
for (let i = 0; i < 30; i++) g.journal_('me', Date.now() - 21000, 'ok', Date.now() - 21000);
assert.strictEqual(JSON.parse(g._props.veilleIncidents).length, 20);
// une demande qui finit normalement efface sa marque
g._cache['veille:enCours'] = JSON.stringify({ a: 'group', t: Date.now() - 70000 });
g.call({ action: 'ping' });
assert.strictEqual(g._cache['veille:enCours'], undefined);

// ---------- le déclencheur : toutes les minutes, sans doublon ----------
g.installerVeille(); g.installerVeille();
assert.deepStrictEqual(g._triggers.filter(t => t.fn === 'veilleServeur').map(t => t.m), [1]);
g.arreterVeille();
assert.strictEqual(g._triggers.filter(t => t.fn === 'veilleServeur').length, 0);

// ---------- « occupé » : le message dit que le serveur repart tout seul ----------
assert.ok(/repart tout seul/.test(g.OCCUPE_));
// (relecture) la veille ne remplit pas le cache des tables (lu sans le verrou) ; une panne du cache ne fait pas échouer le déclencheur
for (const k of Object.keys(g._cache)) if (/^t46:/.test(k)) delete g._cache[k];   // les tables gardées en cache (CK_)
const avant = Object.keys(g._cache).sort().join();
g._cache['veille:enCours'] = JSON.stringify({ a: 'login', t: Date.now() - 80000 });
envois.length = 0;
assert.ok(g.veilleServeur());
assert.strictEqual(envois.length, 1);
const ajoutes = Object.keys(g._cache).filter(k => avant.split(',').indexOf(k) < 0 && !/^veille:|^fcm:/.test(k));
assert.deepStrictEqual(ajoutes, [], 'aucune table remise dans le cache par la veille : ' + ajoutes);
const vraiGet = g.CacheService.getScriptCache;
g.CacheService.getScriptCache = () => ({ get() { throw new Error('cache en panne'); } });
assert.strictEqual(g.veilleServeur(), null, 'cache en panne : pas d\'exception');
g.CacheService.getScriptCache = vraiGet;
// et dans l'appli : un délai dépassé ne parle plus seulement de la connexion
const api = require('fs').readFileSync(__dirname + '/../js/api.js', 'utf8');
assert.ok(/error: 'lent', message: 'Le serveur ne répond pas pour l\\'instant : réessaie dans quelques minutes\./.test(api), 'le message « lent »');
console.log('test_veille : OK');
