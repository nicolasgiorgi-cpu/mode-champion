// (v74, lot E3) Le record du jour : une épreuve par jour de séance à la maison (lundi le haut du corps, mardi l'explosivité,
// mercredi le cardio, jeudi les jambes), les 12 épreuves en 4 semaines ; une tentative par épreuve et par jour, deux épreuves
// par jour au plus (sur l'appareil et au serveur) ; +10 XP une fois par jour pour une tentative qui ne bat pas le record ;
// l'alerte « a tenté un record » (v77) à la famille, rien aux éducs ; dans la cloche des éducs, seulement les records battus.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_record_jour.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions', 'competences', 'notifs']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const L = ctx.MC.logic, C = ctx.MC.CONTENT;
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);

// ---------- l'épreuve du jour ----------
const dj = d => { const r = L.recordDuJour([], d); return r && r.test; };
eq([dj('2026-11-09'), dj('2026-11-16'), dj('2026-11-23'), dj('2026-11-30')], ['susp', 'tract', 'pompes', 'planche'], 'les lundis : le haut du corps, chacun son tour');
eq([dj('2026-11-10'), dj('2026-11-11'), dj('2026-11-12')], ['corde', 'corde1', 'flamant'], 'mardi, mercredi, jeudi');
eq([dj('2026-11-13'), dj('2026-11-14'), dj('2026-11-15')], [null, null, null], 'vendredi, samedi, dimanche : pas de record du jour');
const vus = {};
for (let w = 0; w < 4; w++) for (let d = 0; d < 4; d++) { const j = L.addDays('2026-11-09', 7 * w + d); vus[dj(j)] = 1; }
eq(Object.keys(vus).sort(), C.TESTS.map(t => t.id).sort(), 'les 12 épreuves en 4 semaines');
eq(L.recordDuJour([], '2026-11-23').type, 'cros', 'le record du jour est celui de la séance du jour');

// ---------- une tentative par épreuve et par jour, deux épreuves par jour ----------
const R = (test, date, bilan, statut) => ({ test, date, bilan: bilan || 'defi', statut: statut || 'ok', valeur: 10 });
const J = '2026-11-23';
eq(L.peutTenter([], 'pompes', J), '');
eq(L.peutTenter([R('pompes', J)], 'pompes', J), 'fait', 'déjà tentée aujourd\'hui');
eq(L.peutTenter([R('pompes', '2026-11-22')], 'pompes', J), '', 'hier ne compte pas');
eq(L.peutTenter([R('pompes', J, '1')], 'pompes', J), '', 'le bilan ne compte pas');
eq(L.peutTenter([R('pompes', J, 'defi', 'refuse')], 'pompes', J), '', 'retirée par la famille : il peut retenter');
eq(L.peutTenter([R('pompes', J, 'defi', 'attente')], 'pompes', J), 'fait', 'un exploit en attente compte comme une tentative');
eq(L.peutTenter([R('pompes', J), R('susp', J)], 'planche', J), 'plein', 'deux épreuves déjà : c\'est le maximum');
eq(L.recordDuJour([R('susp', J), R('tract', J)], J).etat, 'plein');
eq(L.recordDuJour([R('pompes', J)], J).etat, 'fait');

// ---------- XP : +50 un record battu, +10 une fois par jour une tentative qui ne le bat pas ----------
L._setToday('2026-11-23');
const xp = recs => L.compute({ joueur: { niveaux: {} }, seances: [], records: recs.map((r, i) => Object.assign({ id: 'r' + i, cree: r.date + 'T1' + i + ':00:00Z', extra: null }, r)), journal: [] }).xp;
const x0 = xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }]);
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 12, date: '2026-11-20', bilan: 'defi', statut: 'ok' }]) - x0, C.XP.record, 'record battu : +50');
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 9, date: '2026-11-20', bilan: 'defi', statut: 'ok' }]) - x0, C.XP.tentative, 'pas battu : +10');
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 9, date: '2026-11-20', bilan: 'defi', statut: 'ok' }, { test: 'susp', valeur: 20, date: '2026-11-20', bilan: 'defi', statut: 'ok' }]) - x0, C.XP.tentative, 'deux tentatives le même jour : +10 une seule fois');
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 9, date: '2026-11-19', bilan: 'defi', statut: 'ok' }, { test: 'pompes', valeur: 8, date: '2026-11-20', bilan: 'defi', statut: 'ok' }]) - x0, 2 * C.XP.tentative, 'deux jours : +10 chaque jour');
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 9, date: '2026-11-20', bilan: 'defi', statut: 'refuse' }]) - x0, 0, 'retirée par la famille : rien');
eq(xp([{ test: 'pompes', valeur: 10, date: '2026-11-01', bilan: '1', statut: 'ok' }, { test: 'pompes', valeur: 9, date: '2026-11-02', bilan: '2', statut: 'ok' }]) - x0, 0, 'un bilan qui ne bat pas le record : rien (ce n\'est pas une tentative)');
L._setToday(null);

// ---------- le serveur : les limites, l'alerte ----------
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
let x = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille Tom' });
const tomId = x.joueur.id, fcode = x.familleCode;
x = g.call({ action: 'login', joueurId: tomId, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '2580' });
const kt = x.token, ft = g.call({ action: 'adultLogin', code: fcode }).token;
const tente = (test, valeur, o) => g.call(Object.assign({ action: 'submitRecords', token: kt, bilan: 'defi', tentative: true, valeurs: [{ test, valeur }] }, o || {}));
const nbDefis = () => g.call({ action: 'me', token: kt }).records.filter(x => x.bilan === 'defi').length;

r = tente('pompes', 12); assert.ok(r.ok, JSON.stringify(r));
r = tente('pompes', 13); assert.strictEqual(r.error, 'limite', 'la même épreuve deux fois le même jour : non');
assert.ok(/déjà tenté cette épreuve/.test(r.message), r.message);
r = tente('susp', 30); assert.ok(r.ok, 'une 2e épreuve : oui');
r = tente('planche', 60); assert.strictEqual(r.error, 'limite', 'une 3e épreuve : non');
assert.ok(/Deux épreuves par jour/.test(r.message), r.message);
assert.strictEqual(nbDefis(), 2, 'rien d\'écrit pour les tentatives refusées');
const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
assert.ok(tente('planche', 60, { date: hier }).ok, 'un autre jour : oui');
// plusieurs épreuves dans un seul envoi : tout est vérifié avant d'écrire
const avant = nbDefis();
r = g.call({ action: 'submitRecords', token: kt, bilan: 'defi', date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), valeurs: [{ test: 'squats', valeur: 30 }, { test: 'chaise', valeur: 40 }, { test: 'corde', valeur: 50 }] });
assert.strictEqual(r.error, 'limite'); assert.strictEqual(nbDefis(), avant, 'trois épreuves d\'un coup : rien d\'écrit');
// le bilan n'est pas limité
r = g.call({ action: 'submitRecords', token: kt, bilan: '1', valeurs: [{ test: 'pompes', valeur: 11 }, { test: 'planche', valeur: 50 }, { test: 'squats', valeur: 30 }] });
assert.ok(r.ok && r.records.length === 3, 'le bilan : autant de tests qu\'on veut');
// une tentative retirée par la famille ne compte plus : il peut retenter
const pid = g.call({ action: 'me', token: kt }).records.find(x => x.bilan === 'defi' && x.test === 'pompes' && x.valeur === 12).id;
assert.ok(g.call({ action: 'confirm', token: ft, decisions: [{ id: pid, statut: 'refuse' }] }).ok);
assert.ok(tente('pompes', 12).ok, 'retirée par la famille : il peut retenter');

// l'alerte : « a tenté un record » à la famille (jamais le chiffre), rien aux éducs pour un record du jour ; un défi de badge garde son alerte
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });
const T = { f: 'jeton-famille-' + 'f'.repeat(30), e: 'jeton-educ-' + 'e'.repeat(30) };
assert.ok(g.call({ action: 'pushAbonner', token: ft, jeton: T.f, cats: ['confirmer', 'bilan'] }).ok);
assert.ok(g.call({ action: 'pushAbonner', token: et, jeton: T.e, cats: ['confirmer', 'bilan'] }).ok);
x = g.call({ action: 'addPlayer', token: et, prenom: 'Noé', familleNom: 'Famille Noé' });
const noeF = x.familleCode;
x = g.call({ action: 'login', joueurId: x.joueur.id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '2580' });
const nt = x.token, nft = g.call({ action: 'adultLogin', code: noeF }).token;
assert.ok(g.call({ action: 'pushAbonner', token: nft, jeton: T.f + 'n', cats: ['confirmer', 'bilan'] }).ok);
envois.length = 0;
r = g.call({ action: 'submitRecords', token: nt, bilan: 'defi', tentative: true, valeurs: [{ test: 'pompes', valeur: 7 }] });
assert.ok(r.ok);
assert.ok(envois.some(m => m.token === T.f + 'n' && /Noé a tenté un record\./.test(m.data.texte) && !/\b7\b/.test(m.data.texte)), JSON.stringify(envois.map(m => [m.token.slice(0, 12), m.data.texte])));   // le même mot que dans sa cloche
assert.ok(!envois.some(m => m.token === T.e), 'pas d\'alerte aux éducs pour une tentative');
envois.length = 0;
Object.keys(g._cache).filter(k => k.indexOf('fcm:v:') === 0).forEach(k => delete g._cache[k]);
r = g.call({ action: 'submitRecords', token: nt, bilan: 'defi', valeurs: [{ test: 'susp', valeur: 20 }] });
assert.ok(r.ok && envois.some(m => m.token === T.e && /a tenté un record/.test(m.data.texte)), 'un badge tenté : les éducs ont toujours leur alerte');

// ---------- la cloche des éducs : seulement les records battus ----------
{
  const N = ctx.MC.notifs, j = { id: 'j1', prenom: 'Tom', actif: true };
  const recs = [
    { id: 'a', test: 'pompes', valeur: 10, bilan: '1', statut: 'ok', date: '2026-11-10', cree: '2026-11-10T10:00:00Z' },
    { id: 'b', test: 'pompes', valeur: 9, bilan: 'defi', statut: 'ok', date: '2026-11-20', cree: '2026-11-20T10:00:00Z' },   // pas battu
    { id: 'c', test: 'pompes', valeur: 12, bilan: 'defi', statut: 'ok', date: '2026-11-21', cree: '2026-11-21T10:00:00Z' },  // battu
    { id: 'd', test: 'susp', valeur: 30, bilan: 'defi', statut: 'ok', date: '2026-11-21', cree: '2026-11-21T11:00:00Z' }     // 1er résultat
  ];
  L._setToday('2026-11-22');
  const items = N.events('e', { group: { joueurs: [{ joueur: j, records: recs, seances: [], missions: [] }], moi: { nom: 'X' } }, compos: [] });
  const txt = items.filter(i => /^r:/.test(i.id)).map(i => i.id + ' ' + i.txt.replace(/<[^>]+>/g, ''));
  eq(txt, ['r:c Tom bat son record : Pompes.'], 'seul le record battu, pas chaque tentative');
  L._setToday(null);
}
console.log('test_record_jour : OK');
