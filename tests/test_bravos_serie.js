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
// 40 au plus (de vraies séances : 45 ici)
const TYPES = ['cros', 'capuozzo', 'dupont', 'meafou', 'recup'], vraies = [];
for (let i = 0; i < 9; i++) {
  let x = g.call({ action: 'addPlayer', token: et, prenom: 'Ami' + i, familleNom: 'Famille A' + i });
  x = g.call({ action: 'login', joueurId: x.joueur.id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '1357' });
  TYPES.forEach(t => vraies.push(g.call({ action: 'logSession', token: x.token, type: t, date: auj, mode: 'rapide' }).seance.id));
}
assert.strictEqual(vraies.length, 45);
r = g.call({ action: 'bravos', token: et, liste: vraies.map(id => ({ seanceId: id, mot: 'Bien joué !' })) });
assert.ok(r.ok && r.bravos.length === 40 && r.nouveaux === 40, 'au plus 40 d\'un coup : ' + r.bravos.length);
assert.ok(g.call({ action: 'bravos', token: et, liste: [{ seanceId: 'x1' }, { seanceId: 'x2' }] }).bravos.length === 0, 'introuvables : sautées');
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
// (relecture) deux séances du même enfant dans une liste : une seule alerte pour lui
const s7 = g.call({ action: 'logSession', token: tom.kt, type: 'cros', date: auj, mode: 'guidee' }).seance.id;
const s8 = g.call({ action: 'logSession', token: tom.kt, type: 'recup', date: auj, mode: 'rapide' }).seance.id;
Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);
envois.length = 0;
r = g.call({ action: 'bravos', token: et, liste: [{ seanceId: s7, mot: 'Chapeau !' }, { seanceId: s8, mot: 'Top' }] });
assert.ok(r.ok && r.nouveaux === 2);
assert.strictEqual(envois.filter(m => m.token === T.tom).length, 1, 'une alerte pour Tom, pas deux');

// ---------- l'écran : le grand choix de mots ----------
{
  const ctx = { window: {}, console, Date, Math, JSON, document: { addEventListener() {}, querySelectorAll() { return []; } }, location: { hash: '' }, addEventListener() {} };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext('window.MC = { act: {}, app: { route() {}, S: { cache: {} } }, ui: { esc: s => String(s) } };', ctx);
  for (const f of ['config', 'content', 'logic']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
  vm.runInContext(fs.readFileSync(__dirname + '/../js/bravos.js', 'utf8'), ctx, { filename: 'bravos.js' });
  const B = ctx.MC.bravo, M = B.MOTS, L = ctx.MC.logic;
  assert.ok(M.length >= 50, 'au moins 50 mots : ' + M.length);
  assert.strictEqual(new Set(M).size, M.length, 'pas deux fois le même mot');
  assert.ok(M.every(m => m.length <= 60), 'des mots courts');
  // pas d'accord masculin / féminin (le groupe est mixte)
  const genre = /\b(champion|championne|fier|fière|prêt|prête|costaud|guerrier|surpassé|allé|malin|maligne|régulier|régulière|futé|réglé|fort|forte)\b/i;
  assert.ok(!M.some(m => genre.test(m)), M.filter(m => genre.test(m)));
  // l'écran : le 1er mot de chacun d'abord, tous différents même pour un groupe de 34
  for (const n of [15, 18, 34, 54]) {
    const enfants = Array.from({ length: n }, (_, i) => ({ joueur: { id: 'j' + n + '-' + i }, bravos: [] }));
    const R = B.repartir(enfants, 3), l = enfants.map(p => R[p.joueur.id]);
    assert.ok(l.every(x => x.length === 3 && new Set(x).size === 3), n + ' enfants : 3 mots différents chacun');
    assert.strictEqual(new Set(l.map(x => x[0])).size, n, n + ' enfants : les 1ers mots (ceux de « Bravo à tous ») tous différents');
    if (n * 3 <= M.length) assert.strictEqual(new Set([].concat(...l)).size, n * 3, n + ' enfants : tous les mots de l\'écran différents');
  }
  // un enfant qui arrive pendant la visite : son 1er mot n'est pas déjà à l'écran
  for (let k = 0; k < 30; k++) {
    const taille = k % 2 ? 12 : 30, ecran = Array.from({ length: taille }, (_, i) => ({ joueur: { id: 'v' + k + '-' + i }, bravos: [] })), R0 = B.repartir(ecran, 3), affiches = {};
    Object.keys(R0).forEach(id => R0[id].forEach((m, i) => { if (!i) affiches[m] = 2; else if (!affiches[m]) affiches[m] = 1; }));
    const nouveau = { joueur: { id: 'n' + k }, bravos: [] }, Rn = B.repartir([nouveau], 3, affiches)[nouveau.joueur.id];
    assert.ok(affiches[Rn[0]] !== 2, 'le 1er mot du nouveau n\'est le 1er mot de personne (' + taille + ' enfants)');
    if (taille * 3 + 3 <= M.length) assert.ok(Rn.every(m => !affiches[m]), 'avec de la place : aucun de ses mots n\'est déjà affiché');
  }
  // pas un mot qu'il vient de recevoir (les 3 proposés, marqués reçus, ne reviennent pas)
  const p0 = { joueur: { id: 'jx' }, bravos: [] }, avant = B.motsPour(p0, 3);
  p0.bravos = avant.map((m, i) => ({ mot: m, cree: '2026-11-1' + i }));
  const apres = B.motsPour(p0, 3), R2 = B.repartir([p0], 3)[p0.joueur.id];
  assert.ok(apres.every(m => avant.indexOf(m) < 0) && R2.every(m => avant.indexOf(m) < 0), JSON.stringify([avant, apres, R2]));
  // à qui dire bravo : les séances depuis la plus récente que j'ai félicitée (14 jours au plus), enfants actifs
  const J = n => L.addDays(L.today(), -n), seance = (id, d, h) => ({ id, date: J(d), cree: J(d) + 'T1' + h + ':00:00.000Z', type: 'cros' });
  const grp = { moi: { id: 'e1' }, joueurs: [
    { joueur: { id: 'a', actif: true }, seances: [seance('a1', 3, 0), seance('a2', 1, 0)], bravos: [{ seanceId: 'a1', parQui: 'e1', cree: J(0) + 'T09:00:00.000Z' }] },
    { joueur: { id: 'b', actif: true }, seances: [seance('b1', 2, 0)], bravos: [{ seanceId: 'b1', parQui: 'e1', cree: J(1) + 'T09:00:00.000Z' }] },
    { joueur: { id: 'c', actif: true }, seances: [seance('c1', 20, 0), seance('c2', 2, 0), seance('c3', 1, 1)], bravos: [{ seanceId: 'c2', parQui: 'e2', cree: J(1) + 'T09:00:00.000Z' }] },
    { joueur: { id: 'd', actif: false }, seances: [seance('d1', 1, 0)], bravos: [] }
  ] };
  const A = B.aFeliciter(grp), par = {};
  A.forEach(x => { par[x.p.joueur.id] = x; });
  assert.ok(par.a && par.a.s.id === 'a2' && par.a.n === 1, 'un bravo donné aujourd\'hui sur la séance d\'avant-hier ne cache pas celle d\'hier');
  assert.ok(!par.b, 'b : sa seule séance a déjà mon bravo');
  assert.ok(par.c && par.c.s.id === 'c3' && par.c.n === 2, 'c : le bravo d\'un autre éduc ne compte pas ; pas la séance de plus de 14 jours');
  assert.ok(!par.d, 'enfant désactivé : pas de ligne');
  assert.strictEqual(B.nb(grp), 2);
}
console.log('test_bravos_serie : OK');
