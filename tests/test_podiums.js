// (v73, lot E5) Les podiums de toute l'équipe : Progrès du mois (les records battus ces 30 derniers jours, résultats qui comptent,
// à égalité le plus gros progrès en %), Régularité (les étoiles des 4 dernières semaines) ; le podium puis « toi et tes voisins ».
// Le serveur envoie les séances des 4 dernières semaines (le type et le jour, rien d'autre) avec la ligue.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'core', 'logic']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const L = ctx.MC.logic;
L._setToday('2026-11-11');   // un mercredi
const R = (joueurId, test, valeur, date, extra, statut) => ({ joueurId, test, valeur, date, extra: extra || null, statut: statut || 'ok', cree: date + 'T10:00:00Z' });
const J = id => ({ id, prenom: id.toUpperCase() });
// les tableaux viennent d'un autre contexte (vm) : on compare leur texte
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);

// ---------- Progrès du mois ----------
let Lg = { joueurs: ['a', 'b', 'c', 'd', 'e'].map(J), records: [
  R('a', 'pompes', 10, '2026-09-01'), R('a', 'pompes', 14, '2026-11-05'),                    // +40 %
  R('a', 'navette', 16, '2026-09-01'), R('a', 'navette', 15, '2026-11-05'),                  // moins = mieux : +6 %
  R('b', 'pompes', 10, '2026-09-01'), R('b', 'pompes', 20, '2026-11-05'),                    // +100 %
  R('c', 'pompes', 10, '2026-11-01'),                                                         // 1er résultat : pas un progrès
  R('d', 'planche', 60, '2026-09-01'), R('d', 'planche', 50, '2026-11-05'),                  // moins bien : rien
  R('d', 'chaise', 30, '2026-09-01'), R('d', 'chaise', 60, '2026-11-05', null, 'attente'),   // exploit en attente : ne compte pas
  R('e', 'susp', 30, '2026-09-01'), R('e', 'susp', 40, '2026-11-05', { sm: true }),          // petit matériel : pas comparé au normal
  R('e', 'squats', 20, '2026-10-01'), R('e', 'squats', 22, '2026-10-05')                     // plus de 30 jours : rien
] };
let P = L.progresMois(Lg);
eq(P.map(r => [r.p.id, r.n, r.pct, r.rank]), [['a', 2, 46, 1], ['b', 1, 100, 2]], JSON.stringify(P.map(r => [r.p.id, r.n, r.pct])));
// un 1er résultat dans le mois, battu dans le mois : c'est un record battu ce mois-ci
Lg.records.push(R('d', 'burpees', 8, '2026-10-20'), R('d', 'burpees', 10, '2026-11-08'));
P = L.progresMois(Lg);
eq(P.map(r => [r.p.id, r.n, r.pct]), [['a', 2, 46], ['b', 1, 100], ['d', 1, 25]]);
Lg.records = Lg.records.filter(r => r.test !== 'burpees');
// égalité : même nombre et même % = même rang
Lg.records.push(R('c', 'pompes', 5, '2026-09-01'), R('c', 'corde', 10, '2026-09-01'), R('c', 'corde', 13, '2026-11-02'));   // c : pompes 5 → 10 (+100 %), corde +30 % → 2 records, 130 %
P = L.progresMois(Lg);
eq(P.map(r => [r.p.id, r.n, r.rank]), [['c', 2, 1], ['a', 2, 2], ['b', 1, 3]]);
// ---------- Régularité : les étoiles (créneaux de la semaine + bonus de la semaine parfaite) ----------
const S = (joueurId, type, date) => ({ joueurId, type, date });
Lg = { joueurs: ['a', 'b', 'c'].map(J), seances: [
  // a : semaine du 09/11 parfaite (6 créneaux) → 7 étoiles ; + 2 la semaine d'avant
  S('a', 'cros', '2026-11-09'), S('a', 'capuozzo', '2026-11-10'), S('a', 'dupont', '2026-11-11'), S('a', 'meafou', '2026-11-12'), S('a', 'club', '2026-11-14'), S('a', 'recup', '2026-11-15'),
  S('a', 'cros', '2026-11-02'), S('a', 'cros', '2026-11-02'), S('a', 'capuozzo', '2026-11-03'),
  // b : 1 séance il y a 5 semaines (hors des 4 semaines) + 1 cette semaine
  S('b', 'cros', '2026-10-05'), S('b', 'cros', '2026-11-09')
] };
L._setToday('2026-11-15');
const G = L.regularite(Lg);
eq(G.map(r => [r.p.id, r.etoiles, r.rank]), [['a', 9, 1], ['b', 1, 2]], JSON.stringify(G.map(r => [r.p.id, r.etoiles])));
// ---------- le podium, puis toi et tes voisins ----------
const K = (n, mi) => Object.keys(L.podiumVoisins(n, mi)).map(Number).sort((x, y) => x - y);
eq(K(10, 6), [0, 1, 2, 5, 6, 7], 'le podium, celui devant, toi, celui derrière');
eq(K(10, 9), [0, 1, 2, 8, 9], 'dernier : pas de voisin derrière');
eq(K(10, 1), [0, 1, 2], 'sur le podium');
eq(K(10, -1), [0, 1, 2], 'pas classé : le podium seulement, jamais le bas du tableau');
eq(K(2, 0), [0, 1]);

// ---------- le serveur : les séances des 4 dernières semaines avec la ligue ----------
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const et = g.call({ action: 'adultLogin', code: ac }).token;
const kid = prenom => { let x = g.call({ action: 'addPlayer', token: et, prenom, familleNom: 'Famille ' + prenom }); const id = x.joueur.id, f = x.familleCode;
  x = g.call({ action: 'login', joueurId: id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '2468' }); return { id, tok: x.token, f }; };
const tom = kid('Tom'), ana = kid('Ana'), eva = kid('Eva');
const auj = new Date().toISOString().slice(0, 10), il = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
g.call({ action: 'logSession', token: ana.tok, type: 'cros', date: auj, mode: 'guidee', ressenti: 'dur', details: { exos: [{ id: 'pompes', series: [5, 5] }] } });
g.call({ action: 'logSession', token: ana.tok, type: 'capuozzo', date: il(60), mode: 'rapide' });
g.call({ action: 'logSession', token: eva.tok, type: 'cros', date: auj, mode: 'rapide' });
const fam = g.call({ action: 'adultLogin', code: eva.f });
g.call({ action: 'setVisible', token: fam.token, joueurId: eva.id, visible: false });
const Lsv = g.call({ action: 'league', token: tom.tok });
assert.ok(Lsv.ok && Array.isArray(Lsv.seances));
eq(Lsv.seances.map(s => s.joueurId), [ana.id], 'Ana (pas sa séance d\'il y a 60 jours), pas Eva cachée');
eq(Object.keys(Lsv.seances[0]).sort(), ['date', 'joueurId', 'type'], 'le type et le jour, rien d\'autre (ni ressenti, ni détail)');
console.log('test_podiums : OK');
