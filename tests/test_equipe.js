// (E5) L'équipe vivante : le fil des copains (equipe) et le bravo entre enfants (bravoCopain).
// Le progrès, jamais le score ; les enfants cachés par leur famille ou désactivés n'y sont pas ; un bravo d'enfant = un mot tout prêt,
// un par séance, 30 par jour au plus, pas pour soi, pas sur une séance de plus de 7 jours ; l'alerte dit le prénom du copain, jamais le mot.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_equipe.js
const assert = require('assert'), crypto = require('crypto');
const Core = require('/home/claude/mode-champion/js/core.js');
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
const et = g.call({ action: 'adultLogin', code: ac }).token;
const auj = new Date().toISOString().slice(0, 10), il = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
let pin = 3000;
function enfant(prenom) {
  let x = g.call({ action: 'addPlayer', token: et, prenom, familleNom: 'Famille ' + prenom });
  const id = x.joueur.id, fcode = x.familleCode;
  x = g.call({ action: 'login', joueurId: id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: String(++pin) });
  return { id, tok: x.token, fcode, prenom };
}
const [tom, nina, leo, ines] = ['Tom', 'Nina', 'Léo', 'Inès'].map(enfant);
const sNina = g.call({ action: 'logSession', token: nina.tok, type: 'cros', date: auj, mode: 'rapide' }).seance.id;
const sLeo = g.call({ action: 'logSession', token: leo.tok, type: 'club', date: auj, mode: 'rapide', details: { match: true, adversaire: 'Nulle part', score: '20-10' } }).seance.id;
const sVieille = g.call({ action: 'logSession', token: leo.tok, type: 'dupont', date: il(10), mode: 'rapide' }).seance.id;
const sTom = g.call({ action: 'logSession', token: tom.tok, type: 'meafou', date: auj, mode: 'rapide' }).seance.id;
const sInes = g.call({ action: 'logSession', token: ines.tok, type: 'capuozzo', date: auj, mode: 'rapide' }).seance.id;
// Nina bat son record de pompes : 10 puis 12 (+2) ; Léo note un 1er résultat (pas un progrès)
g.call({ action: 'submitRecords', token: nina.tok, bilan: 'defi', valeurs: [{ test: 'pompes', valeur: 10 }] });
g.call({ action: 'submitRecords', token: nina.tok, bilan: 'defi', valeurs: [{ test: 'pompes', valeur: 12 }] });
g.call({ action: 'submitRecords', token: leo.tok, bilan: 'defi', valeurs: [{ test: 'planche', valeur: 60 }] });
// Inès est cachée par sa famille
let fam = g.call({ action: 'adultLogin', code: ines.fcode });
assert.ok(g.call({ action: 'setVisible', token: fam.token, joueurId: ines.id, visible: false }).ok);

// ---------- le fil ----------
assert.strictEqual(g.call({ action: 'equipe', token: et }).error, 'interdit', 'réservé aux enfants (les éducs ont Ça bouge)');
let F = g.call({ action: 'equipe', token: tom.tok });
assert.ok(F.ok, JSON.stringify(F));
assert.deepStrictEqual(F.joueurs.map(j => j.prenom).sort(), ['Léo', 'Nina', 'Tom'], 'Inès cachée par sa famille : pas dans le fil');
assert.deepStrictEqual(F.seances.map(s => s.id).sort(), [sLeo, sNina, sTom].sort(), '7 jours : pas la vieille séance de Léo, pas celle d\'Inès');
assert.ok(F.seances.find(s => s.id === sLeo).match, 'un match');
assert.ok(!JSON.stringify(F.seances).includes('20-10') && !JSON.stringify(F.seances).includes('Nulle part'), 'ni le score ni l\'adversaire');
assert.ok(F.seances.every(s => !('ressenti' in s) && !('mode' in s) && !('details' in s)), 'ni ressenti, ni mode, ni détail');
assert.strictEqual(F.progres.length, 1, 'le record battu de Nina, pas le 1er résultat de Léo');
assert.deepStrictEqual([F.progres[0].joueurId, F.progres[0].test, F.progres[0].gain], [nina.id, 'pompes', 2]);
assert.ok(!('valeur' in F.progres[0]) && !JSON.stringify(F.progres).includes('"12"') && !/valeur/.test(JSON.stringify(F)), 'le progrès, jamais le score');
assert.ok(Array.isArray(F.mots) && F.mots.length >= 20, 'les mots tout prêts');
// un score qui attend un témoin (exploit) n'y est pas
g.call({ action: 'submitRecords', token: nina.tok, bilan: 'defi', valeurs: [{ test: 'pompes', valeur: 30 }] });
assert.strictEqual(g.call({ action: 'equipe', token: tom.tok }).progres.length, 1, 'l\'exploit en attente n\'est pas dans le fil');

// ---------- le progrès : le sens, le petit matériel, l'égalité, la fenêtre de 7 jours, un résultat refusé ----------
{
  const P = enfant('Paco'), il = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const note = (test, valeur, extra, date) => g.call({ action: 'submitRecords', token: P.tok, bilan: 'defi', date: date || auj, valeurs: [{ test, valeur, extra: extra || null }] });
  note('navette', 15.0, null, il(3)); note('navette', 14.2, null, il(2)); note('navette', 14.5, null, il(1)); note('navette', 14.2);
  note('susp', 30, null, il(2)); note('susp', 20, { sm: true }, il(1)); note('susp', 24, { sm: true });
  note('planche', 40, null, il(20)); note('planche', 48, null, il(10)); note('planche', 55);
  note('chaise', 50, null, il(2)); const faux = note('chaise', 60).records[0];
  fam = g.call({ action: 'adultLogin', code: P.fcode });
  assert.ok(g.call({ action: 'confirm', token: fam.token, decisions: [{ id: faux.id, statut: 'refuse' }] }).ok);
  const pr = g.call({ action: 'equipe', token: tom.tok }).progres.filter(x => x.joueurId === P.id), par = {};
  pr.forEach(x => { (par[x.test + (x.sm ? ':sm' : '')] = par[x.test + (x.sm ? ':sm' : '')] || []).push(x.gain); });
  assert.deepStrictEqual(par.navette, [0.8], 'navette : moins = mieux, une égalité n\'est pas un progrès');
  assert.ok(!par.susp && JSON.stringify(par['susp:sm']) === '[4]', 'le petit matériel à part (son 1er résultat n\'est pas un progrès) : ' + JSON.stringify(par));
  assert.deepStrictEqual(par.planche, [7], 'planche : 48 il y a 10 jours (hors des 7 jours) puis 55 : +7');
  assert.ok(!par.chaise, 'un résultat retiré par la famille ne compte pas');
}

// ---------- le bravo entre enfants ----------
const mot = F.mots[0];
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina, mot: 'T\'es nulle' }).error, 'invalide', 'jamais de texte libre');
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina }).error, 'invalide', 'un mot est obligatoire');
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sTom, mot }).error, 'interdit', 'pas de bravo pour soi');
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sVieille, mot }).error, 'invalide', 'plus de 7 jours');
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sInes, mot }).error, 'introuvable', 'enfant caché : pas de bravo');
assert.strictEqual(g.call({ action: 'bravoCopain', token: et, seanceId: sNina, mot }).error, 'interdit', 'les éducs ont leur bravo');
let r = g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina, mot });
assert.ok(r.ok && r.nouveau && r.bravo.mot === mot && r.bravo.de === 'p' && r.bravo.parNom === 'Tom', JSON.stringify(r));
r = g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina, mot: F.mots[1] });
assert.ok(r.ok && !r.nouveau && r.bravo.mot === F.mots[1], 'le 2e geste change le mot, pas de 2e bravo');
// Nina le voit sur sa séance, avec le prénom et le mot ; dans le fil de Léo : compté, sans nom ni mot
const ninaMe = g.call({ action: 'me', token: nina.tok });
assert.ok(ninaMe.bravos.length === 1 && ninaMe.bravos[0].parNom === 'Tom' && ninaMe.bravos[0].mot === F.mots[1] && ninaMe.bravos[0].de === 'p');
assert.ok(!('parQui' in ninaMe.bravos[0]), 'pas l\'identifiant de Tom chez Nina');
const FL = g.call({ action: 'equipe', token: leo.tok }), bN = FL.bravos.filter(b => b.seanceId === sNina);
assert.ok(bN.length === 1 && bN[0].parNom === '' && bN[0].mot === '' && !bN[0].moi, 'chez Léo : un bravo compté, sans nom ni mot');
const FT = g.call({ action: 'equipe', token: tom.tok }), bT = FT.bravos.filter(b => b.seanceId === sNina);
assert.ok(bT.length === 1 && bT[0].moi && bT[0].mot === F.mots[1], 'chez Tom : le sien, avec son mot');
// un enfant caché par sa famille n'envoie pas de bravo (son prénom apparaîtrait chez l'autre)
const sNina2 = g.call({ action: 'logSession', token: nina.tok, type: 'capuozzo', date: auj, mode: 'rapide' }).seance.id;
assert.strictEqual(g.call({ action: 'bravoCopain', token: ines.tok, seanceId: sNina2, mot }).error, 'interdit', 'Inès est cachée : pas de bravo');
// changer de mot ne fait pas revenir le bravo en « nouveau » (même date)
const avantMaj = g.call({ action: 'me', token: nina.tok }).bravos.find(b => b.parNom === 'Tom').maj;
g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina, mot: F.mots[4] });
const apres = g.call({ action: 'me', token: nina.tok }).bravos.find(b => b.parNom === 'Tom');
assert.ok(apres.mot === F.mots[4] && apres.maj === avantMaj, 'le mot change, pas la date');
g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sNina, mot: F.mots[1] });
// l'éduc le voit sur la séance de Nina (le prénom de l'enfant)
const grp = g.call({ action: 'group', token: et }), pN = grp.joueurs.find(p => p.joueur.id === nina.id);
assert.ok(pN.bravos.some(b => b.parNom === 'Tom' && b.de === 'p'), 'l\'éduc voit le bravo de Tom');
// 30 bravos par jour au plus
const autres = Array.from({ length: 31 }, (_, i) => enfant('Ami' + i)).map(k => g.call({ action: 'logSession', token: k.tok, type: 'cros', date: auj, mode: 'rapide' }).seance.id);
let ok = 1;   // déjà un pour Nina
for (const sid of autres) { if (g.call({ action: 'bravoCopain', token: tom.tok, seanceId: sid, mot }).ok) ok++; }
assert.strictEqual(ok, 30, '30 bravos par jour au plus');
assert.strictEqual(g.call({ action: 'bravoCopain', token: tom.tok, seanceId: autres[30], mot }).error, 'limite');
// un enfant désactivé : plus dans le fil
assert.ok(g.call({ action: 'updatePlayer', token: et, joueurId: leo.id, actif: false }).ok);
assert.ok(!g.call({ action: 'equipe', token: tom.tok }).joueurs.some(j => j.id === leo.id), 'désactivé : plus dans le fil');

// ---------- l'alerte : le prénom du copain, jamais le mot ----------
g._props.FCM_CLE = JSON.stringify({ type: 'service_account', project_id: 'proj-test', client_email: 'envoi@proj-test.iam.gserviceaccount.com', private_key: PEM });
const J = 'jeton-nina-' + 'n'.repeat(30);
g.call({ action: 'pushAbonner', token: nina.tok, jeton: J, cats: ['bravo'] });
const s2 = g.call({ action: 'logSession', token: nina.tok, type: 'dupont', date: auj, mode: 'rapide' }).seance.id;
const lea = enfant('Léa');
envois.length = 0;
assert.ok(g.call({ action: 'bravoCopain', token: lea.tok, seanceId: s2, mot: F.mots[2] }).ok);
const a = envois.filter(m => m.token === J);
assert.strictEqual(a.length, 1, 'Nina est prévenue');
assert.ok(/copains/.test(a[0].data.tag) && a[0].data.tag !== 'p-bravo-' + nina.id, 'une étiquette à part de celle des éducs : ' + a[0].data.tag);
assert.strictEqual(a[0].data.texte, '👏 Léa te dit bravo pour ta séance de Dupont !');
assert.ok(!a[0].data.texte.includes(F.mots[2]), 'jamais le mot');
envois.length = 0;
g.call({ action: 'bravoCopain', token: lea.tok, seanceId: s2, mot: F.mots[3] });
assert.strictEqual(envois.length, 0, 'changer de mot : pas de 2e alerte');
// les mots : sans accord masculin / féminin, pas de doublon
const M = Core._motsEnfants;
assert.strictEqual(new Set(M).size, M.length);
const genre = /\b(fort|forte|champion|championne|fier|fière|prêt|prête|costaud|costaude|guerrier|guerrière|surpassé|surpassée|allé|allée)\b/i;
assert.ok(!M.some(m => genre.test(m)), M.filter(m => genre.test(m)));
console.log('test_equipe : OK');
