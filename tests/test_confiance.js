// (v70, lot E2) Confiance par défaut : un score compte tout de suite ; seuls les exploits attendent un témoin.
// Exploit : plus de 25 % de mieux que son meilleur score qui compte (même matériel), ou une entrée sur le podium de sa ligue
// en passant devant quelqu'un (au moins 3 autres joueurs classés). Faux serveur : aucun vrai code.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const Core = require('/home/claude/mode-champion/js/core.js');
const { makeEnv } = require('./gas_mock.js');

// ---------- les épreuves du serveur restent celles de js/content.js ----------
{
  const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['config', 'content']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
  const C = ctx.MC.CONTENT, E = Core._epreuves;
  const toutes = C.TESTS.concat(Object.keys(C.DEFI_TESTS).map(k => C.DEFI_TESTS[k]));
  assert.strictEqual(JSON.stringify(Object.keys(E).sort()), JSON.stringify(toutes.map(t => t.id).sort()), 'les mêmes épreuves');
  toutes.forEach(t => {
    assert.strictEqual(E[t.id][0], t.cle || '', 'clé du niveau de ' + t.id);
    assert.strictEqual(!!E[t.id][1], !!t.moinsMieux, 'sens de ' + t.id);
  });
  assert.strictEqual(Core._ligueMin, ctx.MC.CONFIG.LIGUE_MIN, 'la taille d\'une ligue est celle de config.js');
  assert.strictEqual(Core._exploitBond, 0.25, 'le seuil choisi par Nicolas le 11/11 : 25 %');
  console.log('épreuves OK');
}

const g = makeEnv(); g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const et = g.call({ action: 'adultLogin', code: ac }).token;
let pin = 2000;
function enfant(prenom, niveaux) {
  let r = g.call({ action: 'addPlayer', token: et, prenom, familleNom: 'Famille ' + prenom });
  assert.ok(r.ok, JSON.stringify(r));
  const j = r.joueur, fcode = r.familleCode;
  r = g.call({ action: 'login', joueurId: j.id, pin: r.code });
  r = g.call({ action: 'setPin', token: r.token, pin: String(++pin) });
  const tok = r.token;
  if (niveaux) assert.ok(g.call({ action: 'updateMe', token: tok, niveaux }).ok);
  return { id: j.id, tok, fcode };
}
function note(k, test, valeur, extra, bilan) {
  const r = g.call({ action: 'submitRecords', token: k.tok, bilan: bilan || 'defi', valeurs: [{ test, valeur, extra: extra || null }] });
  assert.ok(r.ok && r.records.length === 1, JSON.stringify(r));
  return r.records[0];
}
const st = x => x.statut + (x.exploit ? ':' + x.exploit : '');

// ---------- le bond : plus de 25 % de mieux d'un coup ----------
const tom = enfant('Tom');
assert.strictEqual(st(note(tom, 'pompes', 20)), 'ok', '1er résultat, personne d\'autre : il compte tout de suite');
assert.strictEqual(st(note(tom, 'pompes', 25)), 'ok', '+25 % tout juste : pas un exploit');
assert.strictEqual(st(note(tom, 'pompes', 31)), 'ok', '25 → 31 : +24 %');
assert.strictEqual(st(note(tom, 'pompes', 39)), 'attente:bond', '31 → 39 : +26 %, un exploit');
assert.strictEqual(st(note(tom, 'pompes', 40)), 'attente:bond', 'un exploit en attente ne sert pas de repère : 31 → 40');
assert.strictEqual(st(note(tom, 'pompes', 10)), 'ok', 'moins bien que son record : compte, sans exploit');
// le sens « moins c'est mieux » (navette)
assert.strictEqual(st(note(tom, 'navette', 16)), 'ok');
assert.strictEqual(st(note(tom, 'navette', 12.1)), 'ok', '16 → 12,1 s : 24 % plus rapide');
assert.strictEqual(st(note(tom, 'navette', 9)), 'attente:bond', '12,1 → 9 s : 26 % plus rapide');
assert.strictEqual(st(note(tom, 'navette', 20)), 'ok', 'plus lent : compte, sans exploit');
// le petit matériel se compare à lui-même
assert.strictEqual(st(note(tom, 'susp', 30)), 'ok');
assert.strictEqual(st(note(tom, 'susp', 60, { sm: true })), 'ok', 'Superman tenu : 1er résultat de ce matériel');
assert.strictEqual(st(note(tom, 'susp', 80, { sm: true })), 'attente:bond', 'Superman 60 → 80 : +33 %');
// partir de 0 : tout progrès est un bond
assert.strictEqual(st(note(tom, 'tract', 0)), 'ok');
assert.strictEqual(st(note(tom, 'tract', 1)), 'attente:bond', '0 → 1 traction');
// un résultat refusé (« Ce n'est pas ça ») ne sert pas de repère, un résultat confirmé si
let fam = g.call({ action: 'adultLogin', code: tom.fcode }); const ftom = fam.token;
const chaise = note(tom, 'chaise', 40);
assert.ok(g.call({ action: 'confirm', token: ftom, decisions: [{ id: chaise.id, statut: 'refuse' }] }).ok);
assert.strictEqual(st(note(tom, 'chaise', 60)), 'ok', 'la valeur refusée ne compte pas : 1er vrai résultat');
const bond = note(tom, 'chaise', 80);
assert.strictEqual(st(bond), 'attente:bond');
let x = g.call({ action: 'confirm', token: ftom, decisions: [{ id: bond.id, statut: 'ok' }] });
assert.ok(x.ok && x.records[0].statut === 'ok' && x.records[0].parQui === 'Parent', 'le témoin confirme');
assert.strictEqual(st(note(tom, 'chaise', 95)), 'ok', 'repère : 80, confirmé (95 = +19 %)');
// la famille corrige un score qui comptait déjà
const faux = note(tom, 'planche', 70);
x = g.call({ action: 'confirm', token: ftom, decisions: [{ id: faux.id, statut: 'refuse' }] });
assert.ok(x.ok && x.records[0].statut === 'refuse', 'Ce n\'est pas ça');
// un bilan corrigé ne se compare pas à lui-même
assert.strictEqual(st(note(tom, 'squats', 20, null, '1')), 'ok');
assert.strictEqual(st(note(tom, 'squats', 40, null, '1')), 'ok', 'Bilan 1 corrigé : pas de repère');
assert.strictEqual(st(note(tom, 'squats', 30, null, '2')), 'ok', 'Bilan 2 : 40 → 30');
assert.strictEqual(st(note(tom, 'squats', 52, null, '2')), 'attente:bond', 'Bilan 2 corrigé : 40 → 52, +30 %');
console.log('bond OK');

// ---------- le podium : entrer dans les 3 premiers de sa ligue en passant devant quelqu'un ----------
const A = enfant('Ana'), B = enfant('Bob'), Cc = enfant('Cléo'), D = enfant('Dan');
assert.strictEqual(st(note(A, 'burpees', 50)), 'ok');
assert.strictEqual(st(note(B, 'burpees', 40)), 'ok');
assert.strictEqual(st(note(Cc, 'burpees', 30)), 'ok', '3e sur 3 : il ne passe devant personne');
assert.strictEqual(st(note(D, 'burpees', 20)), 'ok', '4e sur 4');
const E = enfant('Eva');
assert.strictEqual(st(note(E, 'burpees', 35)), 'attente:podium', '1er résultat sur le podium : un exploit');
const F = enfant('Fil');
assert.strictEqual(st(note(F, 'burpees', 25)), 'ok', '1er résultat, 4e : compte tout de suite');
assert.strictEqual(st(note(F, 'burpees', 30)), 'attente:podium', '25 → 30 (+20 %) : à égalité avec la 3e, il entre sur le podium');
const G = enfant('Gus');
assert.strictEqual(st(note(G, 'burpees', 45)), 'attente:podium');
fam = g.call({ action: 'adultLogin', code: G.fcode });
x = g.call({ action: 'confirm', token: fam.token, decisions: [{ id: g.call({ action: 'me', token: G.tok }).records[0].id, statut: 'ok' }] });
assert.ok(x.ok);
assert.strictEqual(st(note(G, 'burpees', 48)), 'ok', 'déjà sur le podium : il progresse sans témoin');
// un N3 seul à son niveau rejoint tout le groupe (ligue élargie) : 1er, il entre sur le podium
const H = enfant('Hugo', { burpees: 3 });
assert.strictEqual(st(note(H, 'burpees', 90)), 'attente:podium', 'N3 seul : sa ligue s\'ouvre à tous les niveaux, il y est 1er');
// la ligue : son niveau quand il y a assez de joueurs (corde : deux N3 forts, quatre N1)
const Q1 = enfant('Quentin', { corde: 3 }), Q2 = enfant('Rose', { corde: 3 });
assert.strictEqual(st(note(Q1, 'corde', 90)), 'ok');
assert.strictEqual(st(note(Q2, 'corde', 95)), 'ok', '1 seul autre classé');
const P = ['Paul', 'Pia', 'Pat', 'Pol'].map(p => enfant(p));
[50, 40, 30, 20].forEach((v, i) => assert.strictEqual(st(note(P[i], 'corde', v)), 'ok', 'N1 ' + v + ' : derrière les N3 de la ligue élargie'));
const X = enfant('Xavier');
assert.strictEqual(st(note(X, 'corde', 35)), 'attente:podium', 'N1 : 5 joueurs à son niveau, la ligue ne s\'élargit pas ; 35 = 3e');
const Y = enfant('Yaël', { corde: 3 });
assert.strictEqual(st(note(Y, 'corde', 35)), 'ok', 'N3 : 3 joueurs à son niveau, la ligue s\'élargit ; 35 = 5e');
// un enfant caché par sa famille ne compte pas pour les autres
const L1 = enfant('Léo'), M = enfant('Mia'), N = enfant('Noé'), O = enfant('Oli'), O2 = enfant('Ozan');
note(L1, 'corde1', 100); note(M, 'corde1', 90); note(N, 'corde1', 80);
assert.strictEqual(st(note(O2, 'corde1', 85)), 'attente:podium', 'repère : Léo visible, 85 = 3e devant Noé');
fam = g.call({ action: 'adultLogin', code: L1.fcode });
assert.ok(g.call({ action: 'setVisible', token: fam.token, joueurId: L1.id, visible: false }).ok);
assert.strictEqual(st(note(O, 'corde1', 85)), 'ok', 'Léo caché : 2 autres classés seulement, pas de podium à gagner');
// un enfant désactivé ne compte pas non plus
const Z = ['Zia', 'Zoé', 'Zac'].map(p => enfant(p)), Z4 = enfant('Zéphyr');
[160, 150, 140].forEach((v, i) => note(Z[i], 'saut', v));
assert.ok(g.call({ action: 'updatePlayer', token: et, joueurId: Z[0].id, actif: false }).ok);
assert.strictEqual(st(note(Z4, 'saut', 155)), 'ok', 'Zia désactivée : 2 autres classés seulement (sinon : 2e sur 4, un podium)');
// (relecture) les niveaux du bilan comptent avant de juger le podium : la ligue où il s'affichera
const N3 = ['Abel', 'Adam', 'Ali', 'Amir', 'Anis'].map(p => enfant(p, { pompes: 3 }));
[40, 35, 30, 25, 20].forEach((v, i) => note(N3[i], 'pompes', v));
const N1 = ['Bao', 'Ben', 'Bix', 'Bly'].map(p => enfant(p));
[10, 8, 6, 5].forEach((v, i) => note(N1[i], 'pompes', v));
const nouveau = enfant('Cyan');
x = g.call({ action: 'submitRecords', token: nouveau.tok, bilan: '0', valeurs: [{ test: 'pompes', valeur: 15 }], niveaux: { pompes: 3 }, journal: [{ type: 'bilan_niveaux', data: { bilan: 0 } }] });
assert.ok(x.ok && st(x.records[0]) === 'ok', 'son bilan le passe N3 : 6e sur 6 de sa ligue N3, pas un podium chez les N1 — ' + JSON.stringify(x.records));
// un éduc qui n'est pas le parent ne peut pas retirer un score qui compte déjà
const scoreTom = g.call({ action: 'me', token: tom.tok }).records.find(r => r.statut === 'ok');
assert.strictEqual(g.call({ action: 'confirm', token: et, decisions: [{ id: scoreTom.id, statut: 'refuse' }] }).error, 'interdit', 'c\'est sa famille qui corrige');
console.log('podium OK');
console.log('TOUT OK');
