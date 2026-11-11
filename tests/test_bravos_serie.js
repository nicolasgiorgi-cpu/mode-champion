// (v71) Les bravos en série des éducs (écran « Bravos ») : une liste { seanceId, mot }, comme autant de bravos ;
// réservé aux éducs, 40 au plus, une séance introuvable est sautée sans faire échouer les autres, un bravo par éduc et par séance ;
// une alerte par enfant (jamais le mot sur l'écran verrouillé). Côté écran : un grand choix de mots, 3 par enfant, tous différents.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_bravos_serie.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
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
const auj = new Date().toISOString().slice(0, 10);
const K = ['Tom', 'Léa', 'Noé'].map(prenom => {
  let x = g.call({ action: 'addPlayer', token: et, prenom, familleNom: 'Famille ' + prenom });
  const id = x.joueur.id, fcode = x.familleCode;
  x = g.call({ action: 'login', joueurId: id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '2580' });
  const kt = x.token, s = g.call({ action: 'logSession', token: kt, type: 'cros', date: auj, mode: 'rapide' }).seance.id;
  return { prenom, id, kt, fcode, s };
});
const [tom, lea, noe] = K;

// ---------- réservé aux éducs ----------
assert.strictEqual(g.call({ action: 'bravos', token: tom.kt, liste: [{ seanceId: lea.s }] }).error, 'interdit', 'un enfant ne s\'en sert pas');
let fam = g.call({ action: 'adultLogin', role: 'f', joueurId: tom.id, code: tom.fcode });
assert.strictEqual(g.call({ action: 'bravos', token: fam.token, liste: [{ seanceId: tom.s }] }).error, 'interdit', 'les parents non plus');

// ---------- plusieurs d'un coup, une séance introuvable sautée ----------
r = g.call({ action: 'bravos', token: et, liste: [{ seanceId: tom.s, mot: 'Super séance !' }, { seanceId: 'nimporte' }, { seanceId: lea.s, mot: 'Bien joué !' }, { seanceId: tom.s, mot: 'doublon' }] });
assert.ok(r.ok && r.bravos.length === 2 && r.nouveaux === 2, JSON.stringify(r));
assert.deepStrictEqual(r.bravos.map(b => [b.joueurId, b.mot]), [[tom.id, 'Super séance !'], [lea.id, 'Bien joué !']], 'un bravo par séance, le doublon ignoré');
r = g.call({ action: 'bravos', token: et, liste: [{ seanceId: tom.s, mot: 'Chapeau !' }, { seanceId: noe.s, mot: 'Bel effort !' }] });
assert.ok(r.ok && r.nouveaux === 1 && r.bravos.length === 2, 'Tom avait déjà son bravo : le mot change, pas de 2e bravo');
const tomB = g.call({ action: 'me', token: tom.kt }).bravos;
assert.ok(tomB.length === 1 && tomB[0].mot === 'Chapeau !', JSON.stringify(tomB));
assert.strictEqual(g.call({ action: 'bravos', token: et, liste: [] }).bravos.length, 0, 'liste vide : rien');
// 40 au plus
r = g.call({ action: 'bravos', token: et, liste: Array.from({ length: 60 }, (_, i) => ({ seanceId: 'x' + i })) });
assert.ok(r.ok && r.bravos.length === 0, 'au plus 40, toutes introuvables ici');
// le mot nettoyé et limité comme un bravo seul
const s4 = g.call({ action: 'logSession', token: lea.kt, type: 'meafou', date: auj, mode: 'rapide' }).seance.id;
r = g.call({ action: 'bravos', token: et, liste: [{ seanceId: s4, mot: '<b>Top</b> ' + 'x'.repeat(300) }] });
assert.ok(r.ok && r.bravos[0].mot.length <= 140 && r.bravos[0].mot.indexOf('<') < 0, r.bravos[0].mot);

// ---------- les alertes : une par enfant, jamais le mot ----------
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });
const T = { tom: 'jeton-tom-' + 't'.repeat(30), noe: 'jeton-noe-' + 'n'.repeat(30) };
g.call({ action: 'pushAbonner', token: tom.kt, jeton: T.tom, cats: ['bravo'] });
g.call({ action: 'pushAbonner', token: noe.kt, jeton: T.noe, cats: ['bravo'] });
const s5 = g.call({ action: 'logSession', token: tom.kt, type: 'capuozzo', date: auj, mode: 'rapide' }).seance.id;
const s6 = g.call({ action: 'logSession', token: noe.kt, type: 'dupont', date: auj, mode: 'rapide' }).seance.id;
envois.length = 0;
r = g.call({ action: 'bravos', token: et, liste: [{ seanceId: s5, mot: 'Mot très personnel' }, { seanceId: s6, mot: 'Autre mot' }] });
assert.ok(r.ok && r.nouveaux === 2);
assert.deepStrictEqual(envois.map(m => m.token).sort(), [T.noe, T.tom].sort(), 'une alerte par enfant');
assert.ok(envois.every(m => /te dit bravo/.test(m.data.texte) && !/personnel|Autre mot/.test(m.data.texte)), JSON.stringify(envois.map(m => m.data.texte)));

// ---------- l'écran : le grand choix de mots ----------
{
  const ctx = { window: {}, console, Date, Math, JSON, document: { addEventListener() {}, querySelectorAll() { return []; } }, location: { hash: '' } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext('window.MC = { act: {}, app: { route() {}, S: { cache: {} } }, ui: { esc: s => String(s) } };', ctx);
  for (const f of ['config', 'content', 'logic']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
  vm.runInContext(fs.readFileSync(__dirname + '/../js/bravos.js', 'utf8'), ctx, { filename: 'bravos.js' });
  const B = ctx.MC.bravo, M = B.MOTS;
  assert.ok(M.length >= 50, 'au moins 50 mots : ' + M.length);
  assert.strictEqual(new Set(M).size, M.length, 'pas deux fois le même mot');
  assert.ok(M.every(m => m.length <= 60), 'des mots courts');
  // pas d'accord masculin / féminin (le groupe est mixte)
  assert.ok(!M.some(m => /\b(champion|fier|prêt|costaud|guerrier|surpassé|allé)\b/i.test(m)), M.filter(m => /\b(champion|fier|prêt|costaud|guerrier|surpassé|allé)\b/i.test(m)));
  const pris = {}, enfants = Array.from({ length: 15 }, (_, i) => ({ joueur: { id: 'j' + i }, bravos: [] }));
  const l = enfants.map(p => B.motsPour(p, 3, pris));
  assert.ok(l.every(x => x.length === 3), '3 mots par enfant');
  assert.strictEqual(new Set([].concat(...l)).size, 45, '15 enfants : 45 mots, tous différents sur l\'écran');
  const recu = { joueur: { id: 'jx' }, bravos: [{ mot: M[0], cree: '2026-11-10' }, { mot: M[1], cree: '2026-11-09' }] };
  for (let i = 0; i < 20; i++) { const x = B.motsPour(recu, 3); assert.ok(x.indexOf(M[0]) < 0 && x.indexOf(M[1]) < 0, 'pas un mot qu\'il a déjà reçu'); }
}
console.log('test_bravos_serie : OK');
