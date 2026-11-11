// (v75, lot E4) Le bilan qui se remplit : le bilan d'un cycle = pour chaque épreuve, le meilleur des lignes « bilan n » et des
// tentatives datées dans le cycle ; le bilan en cours = celui du cycle en cours ; le record du jour propose d'abord une épreuve
// pas encore faite dans le cycle (sans changer dans la journée) ; un bilan complet (12 épreuves) rapporte des XP, une fois par cycle.
// Lancer : node tests/test_bilan_cycle.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'core', 'logic']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const L = ctx.MC.logic, C = ctx.MC.CONTENT;
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);
let nid = 0;
const R = (test, valeur, date, bilan, statut, extra) => ({ id: 'r' + (++nid), test, valeur, date, bilan: bilan === undefined ? 'defi' : bilan, statut: statut || 'ok', extra: extra || null, cree: date + 'T10:00:00Z' });

// ---------- le bilan en cours = le bilan du cycle en cours ----------
const bil = d => { L._setToday(d); return L.currentBilan().n; };
eq([bil('2026-09-01'), bil('2026-09-14'), bil('2026-11-15'), bil('2026-11-16'), bil('2027-01-10'), bil('2027-01-11')], [0, 1, 1, 2, 2, 3],
  'avant le cycle 1 : le bilan 0 ; puis le bilan du cycle (le bilan 1 clôt le cycle 1, le 14/11)');

// ---------- le bilan d'un cycle ----------
L._setToday('2026-11-30');
const c2 = L.cycleDef(2);
eq([c2.debut, c2.fin], ['2026-11-16', '2027-01-10'], 'le cycle 2');
let recs = [
  R('pompes', 12, '2026-11-20', '2'),              // une ligne du bilan 2
  R('pompes', 14, '2026-11-25'),                   // une tentative du cycle, meilleure
  R('planche', 80, '2026-11-10'),                  // une tentative du cycle 1 : pas dans le cycle 2
  R('squats', 30, '2026-11-18', 'defi', 'refuse'), // retirée par la famille
  R('chaise', 90, '2026-11-19', 'defi', 'attente'),// un exploit en attente : la case est faite, à part
  R('navette', 15.2, '2026-11-17'), R('navette', 14.8, '2026-11-24'),   // moins = mieux
  R('flamant', 20, '2026-11-02', '1')              // le bilan 1 (cycle 1)
];
let B = L.bilanCycle(recs, 2);
eq(Object.keys(B.cases).sort(), ['chaise', 'navette', 'pompes'], 'les cases du cycle 2');
eq([B.faits, B.tot], [3, 12]);
eq(B.cases.pompes.ok.valeur, 14, 'le meilleur du cycle (bilan et tentatives)');
eq(B.cases.navette.ok.valeur, 14.8, 'navette : le plus rapide');
eq([B.cases.chaise.ok, B.cases.chaise.att.valeur], [null, 90], 'l\'exploit en attente à part');
eq(Object.keys(L.bilanCycle(recs, 1).cases).sort(), ['flamant'], 'le cycle 1 (avant la grille) : son bilan seulement, pas les tentatives');
// le mini matériel ne passe pas devant le matériel complet
B = L.bilanCycle([R('susp', 40, '2026-11-20', 'defi', 'ok', { sm: true }), R('susp', 20, '2026-11-21')], 2);
eq(B.cases.susp.ok.valeur, 20, 'le résultat avec le matériel complet d\'abord');

// ---------- une valeur par épreuve et par cycle (Ma progression, suivi des éducs) ----------
recs.push(R('pompes', 9, '2026-09-13', '0'));
const P = L.recordsParCycle(recs);
eq(P.filter(r => r.test === 'pompes').map(r => [r.bilan, r.valeur]), [['0', 9], ['2', 14]], 'pompes : le bilan 0, puis le meilleur du cycle 2');
eq(P.filter(r => r.test === 'planche').map(r => [r.bilan, r.valeur]), [], 'une tentative du cycle 1 ne compte pas pour le bilan 1 (la grille démarre au cycle 2)');
eq(P.filter(r => r.test === 'chaise').map(r => r.statut), ['attente'], 'l\'exploit en attente reste en attente');
assert.ok(!P.some(r => r.test === 'squats'), 'rien de retiré');
L._setToday('2026-11-12');
assert.ok(!L.recordsParCycle(recs).some(r => r.bilan === '2'), 'un cycle pas commencé n\'a pas de bilan');

// ---------- le record du jour : d'abord une épreuve pas faite dans le cycle ----------
L._setToday('2026-11-23');   // lundi, cycle 2 : la rotation donne « pompes »
eq(L.recordDuJour([], '2026-11-23').test, 'pompes');
eq(L.recordDuJour([R('pompes', 12, '2026-11-17')], '2026-11-23').test, 'planche', 'pompes déjà faites ce cycle : la suivante du thème');
eq(L.recordDuJour([R('pompes', 12, '2026-11-10')], '2026-11-23').test, 'pompes', 'faites au cycle 1 seulement : à refaire');
L._setToday('2026-11-09');
eq(L.recordDuJour([R('susp', 12, '2026-11-02')], '2026-11-09').test, 'susp', 'au cycle 1 (avant la grille) : la rotation seule');
eq(L.recordDuJour(['pompes', 'planche', 'susp', 'tract'].map(t => R(t, 10, '2026-11-17')), '2026-11-23').test, 'pompes', 'tout le thème fait : la rotation');
const dj = L.recordDuJour([R('pompes', 12, '2026-11-23')], '2026-11-23');
eq([dj.test, dj.etat], ['pompes', 'fait'], 'tentée aujourd\'hui : la même épreuve toute la journée (« fait »)');

// ---------- XP : un bilan complet ----------
L._setToday('2026-11-30');
const xp = rs => L.compute({ joueur: { niveaux: {} }, seances: [], records: rs, journal: [] });
const onze = C.TESTS.slice(0, 11).map((t, i) => R(t.id, 10, '2026-11-2' + (i % 3), '2'));
const s11 = xp(onze), s12 = xp(onze.concat([R(C.TESTS[11].id, 10, '2026-11-28')]));
eq([s11.bilansComplets, s12.bilansComplets], [0, 1]);
eq(s12.xp - s11.xp, C.XP.bilanComplet + C.XP.tentative, 'la 12e épreuve : +' + C.XP.bilanComplet + ' (et +' + C.XP.tentative + ' pour la tentative)');
const deux = xp(onze.concat([R(C.TESTS[11].id, 10, '2026-11-28'), R(C.TESTS[11].id, 11, '2026-11-29')]));
eq(deux.bilansComplets, 1, 'une fois par cycle');
eq(xp(C.TESTS.map(t => R(t.id, 10, '2026-11-10', '1'))).bilansComplets, 0, 'le Bilan 1 (cycle 1, avant la grille) : pas de « bilan complet »');
// (relecture) le défi Meafou (squats d'affilée) n'est pas une épreuve du bilan : pas de case, pas de bilan complet
const avecMeafou = onze.concat([R('squats_affilee', 25, '2026-11-28')]);
eq([L.bilanCycle(avecMeafou, 2).faits, xp(avecMeafou).bilansComplets], [11, 0], 'le défi Meafou ne remplit pas la 12e case');
assert.ok(!L.recordsParCycle(avecMeafou).some(r => r.test === 'squats_affilee'));
// (relecture) un exploit en attente remplit sa case, mais les XP du bilan complet attendent la confirmation
const attente = onze.concat([Object.assign(R(C.TESTS[11].id, 99, '2026-11-28'), { statut: 'attente' })]);
eq([L.bilanCycle(attente, 2).faits, L.bilanCycle(attente, 2).faitsOk, xp(attente).bilansComplets], [12, 11, 0]);
// (relecture) un envoi partiel ne remet à zéro que les propositions de niveau de ses clés
{
  const ses = d => ({ date: d, cree: d + 'T18:00:00Z', mode: 'guidee', type: 'cros', details: { exos: [{ id: 'pompes', niveau: 1, ressenti: 'facile', series: [6, 6] }] } });
  const base = { joueur: { niveaux: { pompes: 1 } }, seances: [ses('2026-11-20'), ses('2026-11-21')], records: [] };
  const props = j => L.proposals(Object.assign({}, base, { journal: j })).map(p => p.cle);
  eq(props([]), ['pompes'], 'deux séances faciles : on propose de monter');
  eq(props([{ type: 'bilan_niveaux', cree: '2026-11-22T10:00:00Z', data: { bilan: 2, niveaux: { squats: 2 } } }]), ['pompes'], 'un envoi qui ne touche pas les pompes ne l\'efface pas');
  eq(props([{ type: 'bilan_niveaux', cree: '2026-11-22T10:00:00Z', data: { bilan: 2, niveaux: { pompes: 1 } } }]), [], 'un envoi qui règle les pompes la remet à zéro');
}
console.log('test_bilan_cycle : OK');
