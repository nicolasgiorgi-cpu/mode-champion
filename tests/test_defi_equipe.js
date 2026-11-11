// (v76, lot E6) Le défi d'équipe et les compteurs : la jauge commune additionne les répétitions des séances guidées de tous
// les enfants actifs (cachés compris : seul le total sort), pendant le défi ; chaque enfant voit le total et sa part, jamais
// celle des autres ; jauge pleine = un badge pour tous (et ses XP), même après la fin du défi, gardée pour toujours (relecture :
// un enfant désactivé ou un réglage changé ne retire pas le badge) ; un défi fini sans jauge pleine : son badge disparaît.
// Les compteurs d'un enfant : ses répétitions (ou ses secondes) des séances guidées depuis le début de la saison ; une dose
// « par jambe » compte les deux jambes, une série de plus de 100 est écartée, le mini matériel d'un autre mouvement ne compte pas.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_defi_equipe.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'core', 'logic']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const L = ctx.MC.logic, C = ctx.MC.CONTENT;
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);

// ---------- les compteurs ----------
const S = (date, mode, exos) => ({ date, mode, details: exos ? { exos } : null });
const seances = [
  S('2026-10-01', 'guidee', [{ id: 'squat', series: [8, 8, 6] }, { id: 'pompes', series: [6, 6, 5] }, { id: 'planche', series: [20, 20, 15] }]),
  S('2026-10-08', 'guidee', [{ id: 'squat', series: [10, '10', null] }, { id: 'pompes', series: [] }, { id: 'inconnu', series: [99] }]),
  S('2026-10-09', 'rapide', null),
  S('2026-09-01', 'guidee', [{ id: 'squat', series: [100] }]),   // avant la saison
  S('2026-10-15', 'guidee', [{ id: 'fentes', dose: '2 × 6 / jambe', series: [6, 6] }, { id: 'tractions', mini: true, series: [10, 10] }, { id: 'squat', series: [150] }]),
  S('2026-10-16', 'guidee', [{ id: 'tractions', series: [3] }, { id: 'mollets', mini: true, series: [10] }])
];
eq(L.compteurs(seances, '2026-09-14').map(c => [c.exo, c.n, c.temps]), [['squat', 42, false], ['pompes', 17, false], ['tractions', 3, false], ['fentes', 24, false], ['mollets', 10, false], ['planche', 55, true]],
  'les répétitions et les secondes, depuis la saison ; les fentes « par jambe » comptent les deux jambes ; 150 d\'un coup écarté ; le tirage élastique (mini) n\'est pas une traction, les mollets au sol (mini) comptent');
eq(L.compteurs([S('2026-10-01', 'guidee', [{ id: 'squat', series: [5000, -3] }])], '2026-09-14'), [], 'une valeur absurde ne compte pas');

// ---------- le serveur : la jauge ----------
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const D = g.Core._defisEquipe[0], il = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
D.debut = il(10); D.fin = il(-10);   // le défi en cours, pour le test
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
const adminId = g.call({ action: 'educsListe' }).educs[0].id;
let r = g.call({ action: 'adultLogin', role: 'e', educId: adminId, code: ac });
r = g.call({ action: 'setAdultPin', token: r.token, pin: '2468' }); const et = r.token;
const kid = prenom => { let x = g.call({ action: 'addPlayer', token: et, prenom, familleNom: 'Famille ' + prenom }); const id = x.joueur.id, f = x.familleCode;
  x = g.call({ action: 'login', joueurId: id, pin: x.code }); x = g.call({ action: 'setPin', token: x.token, pin: '2580' }); return { id, tok: x.token, f }; };
const tom = kid('Tom'), ana = kid('Ana'), eva = kid('Eva');
const seance = (k, date, exos, mode) => assert.ok(g.call({ action: 'logSession', token: k.tok, type: 'meafou', date, mode: mode || 'guidee', ressenti: 'bien', details: exos ? { exos } : null }).ok);
seance(tom, il(1), [{ id: 'squat', niveau: 1, series: [8, 8, 6, 150] }, { id: 'pompes', niveau: 1, series: [10] }, { id: 'fentes', niveau: 1, dose: '2 × 6 / jambe', series: [6, 6] }]);   // 22 + 24 = 46 de jambes (150 écarté)
seance(tom, il(20), [{ id: 'squat', niveau: 1, series: [100] }]);   // avant le défi
seance(tom, il(0), null, 'rapide');
seance(ana, il(2), [{ id: 'squat', niveau: 1, series: [10, 10] }]);   // 20, et Ana est cachée par sa famille
seance(eva, il(2), [{ id: 'pont', niveau: 1, series: [40] }]);         // Eva sera désactivée
const fam = g.call({ action: 'adultLogin', code: ana.f });
assert.ok(g.call({ action: 'setVisible', token: fam.token, joueurId: ana.id, visible: false }).ok);
assert.ok(g.call({ action: 'updatePlayer', token: et, joueurId: eva.id, actif: false }).ok);
let E = g.call({ action: 'equipe', token: tom.tok });
assert.ok(E.ok && E.defi, JSON.stringify(E.defi));
eq([E.defi.total, E.defi.moi, E.defi.plein, E.defi.cible], [66, 46, false, 10000], 'le total (Ana cachée comprise, pas Eva désactivée), sa part');
eq(Object.keys(E.defi).sort(), ['cible', 'debut', 'fin', 'id', 'moi', 'nom', 'plein', 'quoi', 'total'], 'jamais la part des autres');
eq(g.call({ action: 'equipe', token: ana.tok }).defi.moi, 20, 'la part d\'Ana');
// la part calculée au serveur = ses compteurs sur l'appareil pour les mêmes exercices (mêmes règles)
const partAppareil = L.compteurs(g.call({ action: 'me', token: tom.tok }).seances, D.debut).filter(c => D.exos.indexOf(c.exo) >= 0).reduce((a, c) => a + c.n, 0);
eq(partAppareil, 46, 'les compteurs de l\'appareil et la jauge du serveur comptent pareil');
// une séance notée plus d'un jour après la fin du défi (date choisie dans le passé) ne compte pas
seance(tom, il(5), [{ id: 'squat', niveau: 1, series: [10] }]);
eq(g.call({ action: 'equipe', token: tom.tok }).defi.total, 76);
const fin0 = D.fin; D.fin = il(4);
eq(g.call({ action: 'equipe', token: tom.tok }).defi.total, 0, 'notée après la fin du défi : pas comptée');
D.fin = fin0;
eq(g.call({ action: 'me', token: tom.tok }).defisEquipe, [{ id: D.id, plein: false, date: '', fini: false }], 'le dossier : le défi pas encore plein');
// la jauge pleine : un badge pour tous, même pour qui n'a rien fait, daté du jour où elle s'est remplie
D.cible = 50;
eq(g.call({ action: 'equipe', token: tom.tok }).defi.plein, true);
const meTom = g.call({ action: 'me', token: tom.tok }), meAna = g.call({ action: 'me', token: ana.tok });
eq([meTom.defisEquipe, meAna.defisEquipe[0].plein], [[{ id: D.id, plein: true, date: il(1), fini: false }], true], 'pleine le jour où le cumul passe la cible (10, puis 30, puis 76)');
// (relecture) gardée pour toujours : un enfant désactivé, un réglage changé ne la vident pas
assert.ok(g.call({ action: 'updatePlayer', token: et, joueurId: ana.id, actif: false }).ok);
D.cible = 10000;
E = g.call({ action: 'equipe', token: tom.tok });
eq([E.defi.plein, E.defi.total], [true, 10000], 'toujours pleine (et la jauge aussi)');
eq(g.call({ action: 'me', token: tom.tok }).defisEquipe[0].plein, true);
// fiche d'un enfant côté éduc : le badge dès la liste du groupe
eq(g.call({ action: 'group', token: et }).joueurs.map(j => j.defisEquipe[0].plein), [true, true, true]);
// fini depuis plus de 14 jours : plus affiché dans Ça bouge, le badge reste
D.debut = il(60); D.fin = il(30);
eq(g.call({ action: 'equipe', token: tom.tok }).defi, null, 'un défi fini depuis longtemps n\'est plus affiché');
eq(g.call({ action: 'me', token: tom.tok }).defisEquipe, [{ id: D.id, plein: true, date: il(1), fini: true }], 'le badge reste après la fin');

// ---------- le badge, côté appareil ----------
const B = C.BADGES.find(b => b.equipe === D.id);
assert.ok(B && B.famille === 'equipe', 'le badge du défi');
const st = x => L.compute({ joueur: { niveaux: {} }, seances: [], records: [], journal: [], defisEquipe: x });
const s0 = st([{ id: D.id, plein: false, date: '', fini: false }]), s1 = st([{ id: D.id, plein: true, date: '2026-12-02', fini: false }]);
eq([s0.badges[B.id].earned, s1.badges[B.id].earned, s1.badges[B.id].date], [false, true, '2026-12-02'], 'jauge pleine : le badge, daté');
eq(s1.xp - s0.xp, C.XP.badge, 'et les XP d\'un badge');
eq([st([]).nbBadgesTot, s0.nbBadgesTot], [C.BADGES.length, C.BADGES.length], 'pas encore commencé ou en cours : le badge se montre');
const sx = st([{ id: D.id, plein: false, date: '', fini: true }]);
eq([sx.badges[B.id].earned, !!sx.badges[B.id].cache, sx.nbBadgesTot], [false, true, C.BADGES.length - 1], 'défi fini sans jauge pleine : le badge disparaît (et du compte)');
console.log('test_defi_equipe : OK');
