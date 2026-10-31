// (v37) Toucher une alerte du téléphone mène à l'endroit précis (c = l'élément à montrer, son volet ouvert),
// et c'est le MÊME lien que la ligne correspondante de la cloche : arriver par l'alerte la marque « lue » (lireLien).
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_liens.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const { makeEnv } = require('./gas_mock.js');
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
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
r = g.call({ action: 'addEduc', token: et, nom: 'Cyril' }); const cyril = r.educ.id, cc = r.code;
r = g.call({ action: 'adultLogin', role: 'e', educId: cyril, code: cc }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '1111' }); const ct = r.token;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille T' }); const tom = r.joueur.id, tc = r.code, fcode = r.familleCode;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Léa', familleNom: 'Famille L' }); const lea = r.joueur.id;
r = g.call({ action: 'login', joueurId: tom, pin: tc }); r = g.call({ action: 'setPin', token: r.token, pin: '2580' }); const kt = r.token;
r = g.call({ action: 'adultLogin', role: 'f', joueurId: tom, code: fcode }); r = g.call({ action: 'setAdultPin', token: r.token, pin: '0000' }); const ft = r.token;
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'p', client_email: 'e@p.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const J = { admin: 'jeton-admin-' + 'a'.repeat(30), cyril: 'jeton-cyril-' + 'c'.repeat(30), parent: 'jeton-parent-' + 'p'.repeat(30), tom: 'jeton-tom-' + 't'.repeat(30) };
g.call({ action: 'pushAbonner', token: et, jeton: J.admin, cats: ['seance', 'bilan', 'mission', 'etoile', 'niveau', 'compo'] });
g.call({ action: 'pushAbonner', token: ct, jeton: J.cyril, cats: ['seance', 'bilan', 'mission', 'etoile', 'niveau', 'compo'] });
g.call({ action: 'pushAbonner', token: ft, jeton: J.parent, cats: ['seance', 'bravo', 'confirmer', 'mission', 'niveau'] });
g.call({ action: 'pushAbonner', token: kt, jeton: J.tom, cats: ['resultat', 'bravo', 'nouvelle', 'niveau'] });
const LIEN_OK = /^#\/[A-Za-z0-9\/_-]*(\?[a-z]+=[A-Za-z0-9_-]+(&[a-z]+=[A-Za-z0-9_-]+)*)?$/;
function liens(tok) { return envois.filter(m => m.token === tok).map(m => m.data.lien); }
function vider() { envois.length = 0; Object.keys(g._cache).forEach(k => { if (k.indexOf('fcm:v:') === 0) delete g._cache[k]; }); }
const auj = new Date().toISOString().slice(0, 10);

// ---------- les actions, et le lien de chaque alerte ----------
vider();
const s1 = g.call({ action: 'logSession', token: kt, type: 'cros', date: auj, mode: 'rapide' }).seance.id;
const L = {};
L.seanceE = liens(J.admin)[0]; L.seanceF = liens(J.parent)[0];
assert.strictEqual(L.seanceE, '#/educ/joueur/' + tom + '?t=prepa&c=s-' + s1, 'séance (éduc) : sa fiche, la séance ouverte');
assert.strictEqual(L.seanceF, '#/parent?k=' + tom + '&c=s-' + s1, 'séance (famille) : son suivi, la séance ouverte');
vider();
g.call({ action: 'submitRecords', token: kt, bilan: '1', valeurs: [{ test: 'saut', valeur: 187 }] });
L.confirmerF = liens(J.parent)[0]; L.bilanE = liens(J.admin)[0];
assert.strictEqual(L.confirmerF, '#/parent?k=' + tom + '&c=confirmer', 'bilan (famille) : « à confirmer »');
assert.strictEqual(L.bilanE, '#/educ/joueur/' + tom + '?t=prepa&c=bilans', 'bilan (éduc) : sa progression aux bilans');
vider();
g.call({ action: 'mission', token: kt, mission: 'jeu10', postes: ['centre'] });
L.posteE = liens(J.admin)[0]; L.posteF = liens(J.parent)[0];
assert.strictEqual(L.posteE, '#/educ/mission/poste?c=j-' + tom, '« Choisis ton poste » (éduc) : sa ligne dépliée');
assert.strictEqual(L.posteF, '#/parent/missions/jeu10?k=' + tom, '« Choisis ton poste » (famille)');
vider();
r = g.call({ action: 'mission', token: kt, mission: 'jeu10', fin: true, copains: [lea] });
assert.ok(r.ok, r.message);
L.copainsE = liens(J.admin)[0];
assert.strictEqual(L.copainsE, '#/educ/mission/copains?c=j-' + tom, 'copains (éduc) : sa ligne dans la mission des copains');
vider();
g.call({ action: 'demanderEtoile', token: kt, domaine: 'plaquage', etoile: 'epaule' });
L.etoileE = liens(J.admin)[0];
assert.strictEqual(L.etoileE, '#/educ/skills?c=demandes', 'demande d\'étoile (éduc) : les demandes');
vider();
g.call({ action: 'updateMe', token: kt, niveaux: { gainage: 2 }, journal: [{ type: 'niveau', data: { cle: 'gainage', de: 1, a: 2 } }] });
L.niveauMoiE = liens(J.admin)[0];
assert.ok(!L.niveauMoiE || L.niveauMoiE === '#/educ/joueur/' + tom + '?t=prepa&c=niveaux', 'niveau changé par l\'enfant (éduc) : ses niveaux');
vider();
const recs = g.call({ action: 'family', token: ft }).enfants[0].records.filter(x => x.statut === 'attente');
g.call({ action: 'confirm', token: ft, decisions: recs.map(x => ({ id: x.id, statut: 'ok' })) });
L.resultatK = liens(J.tom)[0];
assert.strictEqual(L.resultatK, '#/bilans', 'résultats confirmés (enfant) : ses bilans');
vider();
g.call({ action: 'setNiveaux', token: ct, joueurId: tom, niveaux: { pompes: 3 } });
L.niveauK = liens(J.tom)[0]; L.niveauF = liens(J.parent)[0]; L.niveauE = liens(J.admin)[0];
assert.strictEqual(L.niveauK, '#/niveaux');
assert.strictEqual(L.niveauF, '#/parent/bilans?k=' + tom + '&c=niveaux', 'niveaux (famille) : ses niveaux');
assert.strictEqual(L.niveauE, '#/educ/joueur/' + tom + '?t=prepa&c=niveaux', 'niveaux (autre éduc) : ses niveaux sur sa fiche');
vider();
g.call({ action: 'bravo', token: ct, seanceId: s1 });
L.bravoK = liens(J.tom)[0]; L.bravoF = liens(J.parent)[0];
assert.strictEqual(L.bravoK, '#/semaine?c=bravos', 'bravo (enfant) : la carte des bravos');
assert.strictEqual(L.bravoF, '#/parent?k=' + tom + '&c=s-' + s1, 'bravo (famille) : la séance');
Object.keys(L).forEach(k => L[k] && assert.ok(LIEN_OK.test(L[k]), 'lien accepté par sw.js : ' + L[k]));
// l'essai : la cloche
vider();
g.call({ action: 'pushEssai', token: ft, jeton: J.parent, cats: ['seance'] });
assert.strictEqual(liens(J.parent)[0], '#/parent/notifs', 'l\'alerte d\'essai : la cloche');

// ---------- la cloche : les mêmes liens (pour marquer « lue » la ligne de l'alerte touchée) ----------
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions', 'competences', 'notifs']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const N = ctx.MC.notifs;
const ge = N.events('e', { group: g.call({ action: 'group', token: et }), compos: { compos: [], avis: [], evenements: [], educs: [] } });
const fe = N.events('f', { family: g.call({ action: 'family', token: ft }) });
const ke = N.events('k', { me: g.call({ action: 'me', token: kt }) });
const href = l => l.map(e => e.href);
[['seanceE', ge], ['bilanE', ge], ['copainsE', ge], ['etoileE', ge], ['niveauE', ge], ['seanceF', fe], ['confirmerF', fe], ['posteF', fe], ['niveauF', fe], ['bravoF', fe], ['resultatK', ke], ['niveauK', ke], ['bravoK', ke]].forEach(([k, evs]) => {
  assert.ok(href(evs).indexOf(L[k]) >= 0, 'la cloche a une ligne avec le même lien que l\'alerte « ' + k + ' » : ' + L[k] + ' — liens de la cloche : ' + JSON.stringify(href(evs)));
});

// ---------- lireLien : la ligne de l'alerte touchée part, pas les autres ----------
function stock() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; }
const st = stock(), t0 = Date.now();
N.etat('f', 'fam', [], t0 - 10 * 60000, st);                       // la cloche existe sur l'appareil depuis 10 min
let evs = N.events('f', { family: g.call({ action: 'family', token: ft }) }).map(e => Object.assign({}, e, { t: t0 - 60000 }));
let E = N.etat('f', 'fam', evs, t0, st);
const nAvant = E.n;
assert.ok(nAvant >= 3, 'plusieurs nouveautés : ' + nAvant);
assert.strictEqual(N.lireLien('f', 'fam', L.bravoF, evs, st) >= 1, true, 'arrivé par l\'alerte du bravo : sa ligne est lue');
E = N.etat('f', 'fam', evs, t0 + 1000, st);
assert.strictEqual(E.n, nAvant - 1, 'une seule ligne lue (la plus récente qui mène là) ; les autres restent « nouvelles »');
assert.strictEqual(evs.filter(e => e.href === L.bravoF).length, 2, 'ici, la séance et son bravo mènent au même endroit');
assert.strictEqual(E.list.filter(e => e.href === L.bravoF && e.nouveau).length, 1, '… une des deux reste nouvelle');
assert.strictEqual(N.lireLien('f', 'fam', L.bravoF, evs, st), 1, '2e alerte vers le même endroit : l\'autre ligne');
assert.strictEqual(N.etat('f', 'fam', evs, t0 + 1500, st).n, nAvant - 2);
assert.strictEqual(N.lireLien('f', 'fam', '#/rien', evs, st), 0, 'un lien sans ligne : rien');
N.marquerLu('f', 'fam', t0 + 2000, st);
assert.deepStrictEqual(JSON.parse(st._m['mc-notif:f:fam']).lus, {}, 'la cloche ouverte : tout est lu, plus besoin du détail');

console.log('test_liens : OK');
