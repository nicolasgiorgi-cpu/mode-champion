const assert = require('assert'), crypto = require('crypto');
const Core = require('/home/claude/mode-champion/js/core.js');
// SHA / HMAC
for (const s of ['', 'abc', 'é à ç 🏉', 'x'.repeat(1000), 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64)]) {
  assert.strictEqual(Core._sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'), 'sha ' + s.length);
  assert.strictEqual(Core._hmac('clé-secrète', s), crypto.createHmac('sha256', 'clé-secrète').update(s, 'utf8').digest('hex'));
}
assert.strictEqual(Core._hmac('k'.repeat(100), 'm'), crypto.createHmac('sha256', 'k'.repeat(100)).update('m').digest('hex'));
console.log('sha256/hmac OK');

const { makeEnv } = require('./gas_mock.js');
const g = makeEnv();
g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
console.log('admin code', adminCode, Object.keys(g._sheets));
assert.ok(!g._sheets['Feuille 1']);
let r = g.call({ action: 'ping' }); assert.ok(r.ok, JSON.stringify(r));
// ----- connexion des adultes : son nom, puis un code à 4 chiffres -----
r = g.call({ action: 'educsListe' }); assert.ok(r.ok && r.educs.length === 1); const adminId = r.educs[0].id;
assert.ok(JSON.stringify(r).indexOf('Hash') < 0, 'pas d\'empreinte dans la liste publique');
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: '123456' }); assert.strictEqual(r.error, 'invalide', 'plus de code à 6 chiffres');
r = g.call({ action: 'adultLogin', role: 'e', code: adminCode }); assert.strictEqual(r.error, 'introuvable', 'il faut dire qui');
const faux = adminCode === '0000' ? '0001' : '0000';
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: faux }); assert.strictEqual(r.error, 'code'); assert.strictEqual(r.reste, 4);
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: adminCode }); assert.ok(r.ok && r.role === 'e' && r.admin && r.mustChange, JSON.stringify(r));
r = g.call({ action: 'setAdultPin', token: r.token, pin: '12a4' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: adminCode });
r = g.call({ action: 'setAdultPin', token: r.token, pin: '1111' }); assert.ok(r.ok && !r.mustChange, 'pas de règle « code trop simple »');
const et = r.token;
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: adminCode }); assert.strictEqual(r.error, 'code', 'le code provisoire ne sert plus');
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: '1111' }); assert.ok(r.ok && !r.mustChange);
r = g.call({ action: 'addPlayer', token: et, prenom: 'Tom', familleNom: 'Famille Martin' }); assert.ok(r.ok, JSON.stringify(r));
const tom = r.joueur, tomTemp = r.code, famCode = r.familleCode, famId = r.famille.id;
assert.ok(/^\d{4}$/.test(tomTemp) && /^\d{4}$/.test(famCode));
r = g.call({ action: 'addPlayer', token: et, prenom: 'Léa <b>', familleId: famId }); assert.ok(r.ok); assert.strictEqual(r.joueur.prenom, 'Léa b');
const lea = r.joueur, leaTemp = r.code;
r = g.call({ action: 'addPlayer', token: et, prenom: 'Hugo' }); const hugo = r.joueur, hugoTemp = r.code;
r = g.call({ action: 'roster' }); assert.deepStrictEqual(r.joueurs.map(j => j.prenom), ['Hugo', 'Léa b', 'Tom']);
// login kid with temp
r = g.call({ action: 'login', joueurId: tom.id, pin: '9999' }); assert.strictEqual(r.error, 'code');
r = g.call({ action: 'login', joueurId: tom.id, pin: tomTemp }); assert.ok(r.ok && r.joueur.mustChange, JSON.stringify(r));
let pt = r.token;
r = g.call({ action: 'setPin', token: pt, pin: '1234' }); assert.ok(r.ok, 'plus de règle « code trop simple »'); pt = r.token;
r = g.call({ action: 'setPin', token: pt, pin: '7391', couleur: '#FF4FA3' }); assert.ok(r.ok && !r.joueur.mustChange && r.joueur.couleur === '#FF4FA3', JSON.stringify(r));
const oldPt = pt; pt = r.token;
r = g.call({ action: 'me', token: oldPt }); assert.strictEqual(r.error, 'session');
r = g.call({ action: 'login', joueurId: tom.id, pin: tomTemp }); assert.strictEqual(r.error, 'code'); // temp invalidé
r = g.call({ action: 'login', joueurId: tom.id, pin: '7391' }); assert.ok(r.ok); pt = r.token;
// sessions
const today = new Date().toISOString().slice(0, 10);
r = g.call({ action: 'logSession', token: pt, type: 'cros', date: today, mode: 'guidee', ressenti: 'facile', details: { exos: [{ id: 'pompes', niveau: 2, series: [8, 8, 7], ressenti: 'facile' }] } });
assert.ok(r.ok, JSON.stringify(r)); const sid = r.seance.id;
r = g.call({ action: 'logSession', token: pt, type: 'xxx', date: today }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'logSession', token: pt, type: 'club', date: '2020-01-01' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'logSession', token: pt, type: 'recup', date: today, mode: 'rapide', details: { check: [true, true, false] } }); assert.ok(r.ok);
r = g.call({ action: 'me', token: pt }); assert.strictEqual(r.seances.length, 2); assert.deepStrictEqual(r.seances[0].details.exos[0].series, [8, 8, 7]);
r = g.call({ action: 'deleteSession', token: pt, id: sid }); assert.ok(r.ok);
r = g.call({ action: 'me', token: pt }); assert.strictEqual(r.seances.length, 1);
// niveaux
r = g.call({ action: 'updateMe', token: pt, niveaux: { pompes: 3, planche: 5, 'x y': 2 }, materiel: 'mini', journal: [{ type: 'niveau', data: { cle: 'pompes', de: 2, a: 3 } }] });
assert.ok(r.ok); assert.deepStrictEqual(r.joueur.niveaux, { pompes: 3 }); assert.strictEqual(r.joueur.materiel, 'mini'); assert.strictEqual(r.journal.length, 1);
// records
r = g.call({ action: 'submitRecords', token: pt, bilan: '0', valeurs: [{ test: 'planche', valeur: 80 }, { test: 'pompes', valeur: 12 }, { test: 'flamant', valeur: 22, extra: { g: 30, d: 22 } }] });
assert.ok(r.ok && r.records.length === 3);
r = g.call({ action: 'submitRecords', token: pt, bilan: '0', valeurs: [{ test: 'planche', valeur: 85 }] }); assert.strictEqual(r.records[0].valeur, 85);
r = g.call({ action: 'me', token: pt }); assert.strictEqual(r.records.length, 3);
// un éduc ne voit pas les résultats en attente des autres enfants et ne peut pas les confirmer ; ceux de son enfant, si
r = g.call({ action: 'group', token: et });
let tg = r.joueurs.find(p => p.joueur.id === tom.id);
assert.strictEqual(tg.records.length, 0, 'résultats en attente cachés'); assert.strictEqual(tg.enAttente, 3);
r = g.call({ action: 'kid', token: et, joueurId: tom.id }); assert.strictEqual(r.records.length, 0); assert.strictEqual(r.enAttente, 3);
r = g.call({ action: 'confirm', token: et, ids: [g.call({ action: 'me', token: pt }).records[0].id] }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'mesEnfants', token: et, ids: [tom.id] }); assert.ok(r.ok);
r = g.call({ action: 'group', token: et });
tg = r.joueurs.find(p => p.joueur.id === tom.id);
assert.strictEqual(tg.records.length, 3, 'son enfant : il voit tout'); assert.strictEqual(tg.enAttente, 0);
r = g.call({ action: 'confirm', token: et, decisions: [{ id: tg.records[0].id, statut: 'ok' }] }); assert.ok(r.ok && r.faits === 1, JSON.stringify(r));
r = g.call({ action: 'confirm', token: et, decisions: [{ id: tg.records[0].id, statut: 'attente' }] });
g.call({ action: 'mesEnfants', token: et, ids: [] });
// parent
r = g.call({ action: 'adultLogin', code: famCode }); assert.ok(r.ok && r.role === 'f'); const ft = r.token;
r = g.call({ action: 'family', token: ft }); assert.strictEqual(r.enfants.length, 2);
const recIds = r.enfants.find(e => e.joueur.id === tom.id).records.map(x => x.id);
r = g.call({ action: 'confirm', token: ft, ids: recIds }); assert.strictEqual(r.faits, 3);
r = g.call({ action: 'resetKidPin', token: ft, joueurId: hugo.id }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'setVisible', token: ft, joueurId: lea.id, visible: false }); assert.ok(r.ok);
// league for Hugo
r = g.call({ action: 'login', joueurId: hugo.id, pin: hugoTemp }); const ht = r.token;
r = g.call({ action: 'league', token: ht }); assert.ok(r.ok); assert.deepStrictEqual(r.joueurs.map(j => j.prenom).sort(), ['Hugo', 'Tom']); assert.strictEqual(r.records.filter(x => x.statut === 'ok').length, 3);
r = g.call({ action: 'family', token: ht }); assert.strictEqual(r.error, 'interdit');
// reset pin by parent
r = g.call({ action: 'resetKidPin', token: ft, joueurId: tom.id }); assert.ok(r.ok && /^\d{4}$/.test(r.code)); const newTemp = r.code;
r = g.call({ action: 'me', token: pt }); assert.strictEqual(r.error, 'session');
r = g.call({ action: 'login', joueurId: tom.id, pin: '7391' }); assert.strictEqual(r.error, 'code');
r = g.call({ action: 'login', joueurId: tom.id, pin: newTemp }); assert.ok(r.ok && r.joueur.mustChange);
// lockout
for (let i = 0; i < 4; i++) { r = g.call({ action: 'login', joueurId: lea.id, pin: '0000' }); assert.strictEqual(r.error, 'code'); }
r = g.call({ action: 'login', joueurId: lea.id, pin: '0000' }); assert.strictEqual(r.error, 'bloque');
r = g.call({ action: 'login', joueurId: lea.id, pin: leaTemp }); assert.strictEqual(r.error, 'bloque');
// educ group, admin
r = g.call({ action: 'group', token: et }); assert.ok(r.ok && r.joueurs.length === 3 && r.familles.length === 2, JSON.stringify(r).slice(0, 300));
r = g.call({ action: 'addEduc', token: et, nom: 'Julie' }); assert.ok(r.ok); const jc = r.code;
r = g.call({ action: 'adultLogin', code: jc }); assert.ok(r.ok && r.role === 'e' && !r.admin); const jt = r.token;
r = g.call({ action: 'addEduc', token: jt, nom: 'X' }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'resetFamilyCode', token: et, familleId: famId }); assert.ok(r.ok);
r = g.call({ action: 'family', token: ft }); assert.strictEqual(r.error, 'session');
r = g.call({ action: 'updatePlayer', token: et, joueurId: hugo.id, actif: false }); assert.ok(r.ok);
r = g.call({ action: 'roster' }); assert.strictEqual(r.joueurs.length, 2);
g.nouveauCodeAdmin(); const nc = g._logs.filter(l => /👉 Code provisoire administrateur pour/.test(l)).pop().match(/: (\d{4})$/)[1];
r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: nc }); assert.ok(r.ok && r.admin, JSON.stringify(r));
r = g.call({ action: 'group', token: et }); assert.ok(r.ok, 'un nouveau code provisoire ne ferme pas les sessions ouvertes');
// texte stocké : dates restent du texte
const sh = g._sheets['seances']; console.log('seances row', sh.data[1].slice(0, 6));
console.log('ALL TESTS OK');

// ---------- nouvelles fonctions : dossiers renvoyés, date du bilan, décisions, cache ----------
{
  const g2 = makeEnv(); g2.installer();
  const ac = g2._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
  let x = g2.call({ action: 'adultLogin', code: ac }); const et2 = x.token;
  x = g2.call({ action: 'addPlayer', token: et2, prenom: 'Zoé', familleNom: 'Famille Z' }); const zoe = x.joueur, zt = x.code, fcode = x.familleCode;
  // login avec code provisoire : pas de dossier (doit choisir son code)
  x = g2.call({ action: 'login', joueurId: zoe.id, pin: zt }); assert.ok(x.ok && x.me === null);
  x = g2.call({ action: 'setPin', token: x.token, pin: '4826' }); assert.ok(x.ok && x.me && Array.isArray(x.me.seances));
  x = g2.call({ action: 'login', joueurId: zoe.id, pin: '4826' }); assert.ok(x.ok && x.me && x.me.joueur.id === zoe.id); let zt2 = x.token;
  // logSession avec dossier
  x = g2.call({ action: 'logSession', token: zt2, type: 'cros', date: Core._isoDate ? undefined : undefined || new Date().toISOString().slice(0, 10), mode: 'rapide', avecDossier: true });
  assert.ok(x.ok && x.me && x.me.seances.length === 1, JSON.stringify(x).slice(0, 200));
  // le cache contient bien la nouvelle séance (2e demande, lue depuis le cache)
  const before = g2._cstats.gets;
  x = g2.call({ action: 'me', token: zt2 }); assert.strictEqual(x.seances.length, 1); assert.ok(g2._cstats.gets > before);
  assert.ok(g2._cache['t:seances'], 'onglet séances en cache');
  // bilan daté, niveaux dans le même appel
  const d0 = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  x = g2.call({ action: 'submitRecords', token: zt2, bilan: '0', date: d0, valeurs: [{ test: 'planche', valeur: 75 }, { test: 'pompes', valeur: 8 }], niveaux: { planche: 3 }, journal: [{ type: 'bilan_niveaux', data: { bilan: 0 } }], avecDossier: true });
  assert.ok(x.ok && x.records.every(r => r.date === d0) && x.me.joueur.niveaux.planche === 3 && x.me.journal.length === 1, JSON.stringify(x).slice(0, 300));
  x = g2.call({ action: 'submitRecords', token: zt2, bilan: '0', date: '2020-01-01', valeurs: [] }); assert.strictEqual(x.error, 'invalide');
  // le parent confirme la planche, refuse les pompes, puis rétablit les pompes
  x = g2.call({ action: 'adultLogin', code: fcode }); const ft2 = x.token;
  let fam = g2.call({ action: 'family', token: ft2 }); const recs = fam.enfants[0].records; const rp = recs.find(r => r.test === 'planche'), rpo = recs.find(r => r.test === 'pompes');
  x = g2.call({ action: 'confirm', token: ft2, decisions: [{ id: rp.id, statut: 'ok' }, { id: rpo.id, statut: 'refuse' }] });
  assert.ok(x.ok && x.faits === 2 && x.confirmes === 1 && x.refuses === 1 && x.records.length === 2);
  x = g2.call({ action: 'confirm', token: ft2, decisions: [{ id: rpo.id, statut: 'ok' }] }); assert.ok(x.ok && x.records[0].statut === 'ok');
  // ancien format toujours accepté
  x = g2.call({ action: 'confirm', token: ft2, ids: [rp.id], statut: 'ok' }); assert.ok(x.ok && x.faits === 1);
  // changer seulement la date du bilan : les résultats confirmés le restent
  const d1 = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
  x = g2.call({ action: 'submitRecords', token: zt2, bilan: '0', date: d1, valeurs: [{ test: 'planche', valeur: 75 }, { test: 'pompes', valeur: 8 }], avecDossier: true });
  assert.ok(x.me.records.every(r => r.date === d1 && r.statut === 'ok'), JSON.stringify(x.me.records));
  // un résultat modifié repasse « à confirmer »
  x = g2.call({ action: 'submitRecords', token: zt2, bilan: '0', date: d1, valeurs: [{ test: 'pompes', valeur: 9 }], avecDossier: true });
  assert.strictEqual(x.me.records.find(r => r.test === 'pompes').statut, 'attente'); assert.strictEqual(x.me.records.find(r => r.test === 'planche').statut, 'ok');
  // cache perdu (éviction) : on relit la feuille, mêmes données
  Object.keys(g2._cache).forEach(k => delete g2._cache[k]);
  x = g2.call({ action: 'me', token: zt2 }); assert.strictEqual(x.records.length, 2); assert.strictEqual(x.seances.length, 1);
  // viderCache
  g2.call({ action: 'me', token: zt2 }); assert.ok(g2._cache['t:records']); g2.viderCache(); assert.ok(!g2._cache['t:records']);
  console.log('NEW FEATURES OK');

  // ===== v9 : niveaux par les parents, éduc parent, sécurité des écritures =====
  x = g2.call({ action: 'setNiveaux', token: ft2, joueurId: zoe.id, niveaux: { pompes: 3, squats: 2 } });
  assert.ok(x.ok && x.joueur.niveaux.pompes === 3 && x.joueur.niveaux.squats === 2, JSON.stringify(x));
  x = g2.call({ action: 'me', token: zt2 }); assert.ok(x.journal.some(j => j.type === 'niveau_adulte' && j.data.par === 'Parent'), JSON.stringify(x.journal));
  // un parent ne touche pas aux enfants des autres
  x = g2.call({ action: 'addPlayer', token: et2, prenom: 'Autre', familleNom: 'Famille Autre' }); const autre = x.joueur;
  x = g2.call({ action: 'setNiveaux', token: ft2, joueurId: autre.id, niveaux: { pompes: 4 } }); assert.strictEqual(x.error, 'interdit');
  x = g2.call({ action: 'setNiveaux', token: et2, joueurId: autre.id, niveaux: { pompes: 4, bidon: 9 } }); assert.ok(x.ok && x.joueur.niveaux.pompes === 4 && !('bidon' in x.joueur.niveaux));
  // éduc parent
  x = g2.call({ action: 'mesEnfants', token: et2, ids: [zoe.id, 'inexistant'] }); assert.deepStrictEqual(x.enfants, [zoe.id]);
  x = g2.call({ action: 'group', token: et2 }); assert.deepStrictEqual(x.moi.enfants, [zoe.id]);
  // la feuille modifiée à la main (une ligne supprimée au-dessus) : l'écriture vise quand même la bonne ligne
  const shJ = g2._sheets['joueurs'];
  g2.call({ action: 'group', token: et2 });            // tout est en cache
  const idxZ = shJ.data.findIndex(row => row && row[0] === zoe.id), idxA = shJ.data.findIndex(row => row && row[0] === autre.id);
  assert.ok(idxA > idxZ);
  shJ.data.splice(idxZ, 1);                             // suppression à la main de la ligne de Zoé (le cache ne le sait pas)
  x = g2.call({ action: 'setNiveaux', token: et2, joueurId: autre.id, niveaux: { planche: 2 } }); assert.ok(x.ok, JSON.stringify(x));
  const rowA = shJ.data.find(row => row && row[0] === autre.id); assert.ok(rowA && rowA[1] === 'Autre');
  assert.ok(!shJ.data.some(row => row && row[0] === zoe.id), 'pas de ligne fantôme réécrite');
  assert.strictEqual(JSON.parse(rowA[Core.SCHEMA.joueurs.findIndex(c => c[0] === 'niveaux')]).planche, 2);
  // en-tête complété quand une colonne est ajoutée au programme
  const shE = g2._sheets['educs']; shE.data[0] = shE.data[0].slice(0, 7);
  g2.call({ action: 'mesEnfants', token: et2, ids: [] });
  assert.strictEqual(shE.data[0][7], 'enfants');
  console.log('V9 OK');
}

// v14 : « premiers pas » noté une seule fois
{
  const g3 = makeEnv(); g3.installer();
  const ad3 = g3._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
  const t0 = g3.call({ action: 'adultLogin', code: ad3 }).token;
  const np = g3.call({ action: 'addPlayer', token: t0, prenom: 'Nouveau', familleNom: 'Famille Neuve' }); assert.ok(np.ok, JSON.stringify(np));
  let lg = g3.call({ action: 'login', joueurId: np.joueur.id, pin: np.code }); assert.ok(lg.ok, JSON.stringify(lg));
  lg = g3.call({ action: 'setPin', token: lg.token, pin: '2468' }); assert.ok(lg.ok, JSON.stringify(lg));
  const tk = lg.token;
  let u = g3.call({ action: 'updateMe', token: tk, journal: [{ type: 'premiers_pas', data: { at: '2026-10-12' } }] }); assert.ok(u.ok, JSON.stringify(u));
  u = g3.call({ action: 'updateMe', token: tk, journal: [{ type: 'premiers_pas', data: {} }, { type: 'pirate', data: {} }] }); assert.ok(u.ok);
  assert.strictEqual(u.journal.filter(j => j.type === 'premiers_pas').length, 1, 'une seule fois');
  assert.strictEqual(u.journal.filter(j => j.type === 'pirate').length, 0);
  console.log('V14 OK');
}
