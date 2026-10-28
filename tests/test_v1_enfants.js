// V1 du 28/10/2026 : côté enfants et parents, seulement la prépa physique et la mission « Choisis ton poste ».
// Pas de Skills, pas de mission des copains, pas de missions ni de mots des éducs (MC.CONFIG.ENFANTS).
// Lancer : node tests/test_v1_enfants.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = __dirname + '/../js/';
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions']) vm.runInContext(fs.readFileSync(ROOT + f + '.js', 'utf8'), ctx, { filename: f });
const J = x => JSON.parse(JSON.stringify(x));   // les tableaux viennent d'un autre contexte
const MC = ctx.MC, L = MC.logic, C = MC.CONTENT, M = MC.missions;
L._setToday('2026-10-28');

// les réglages de la V1
assert.strictEqual(MC.ouvert('skills'), false);
assert.strictEqual(MC.ouvert('copains'), false);
assert.strictEqual(MC.ouvert('missionsEducs'), false);
assert.strictEqual(MC.ouvert('autre'), true, 'ce qui n\'est pas listé reste ouvert');

// badges : 18, sans « Esprit d'équipe »
assert.strictEqual(C.BADGES.length, 18);
assert.ok(!C.BADGES.some(b => b.id === 'copains'));
assert.ok(C.BADGES.some(b => b.id === 'jeu10'));

// XP : le poste compte, pas les copains, ni les étoiles Skills, ni les missions des éducs
const base = { joueur: { id: 'j1', niveaux: {} }, seances: [], records: [], journal: [] };
const x0 = L.compute(base).xp;
const poste = { mission: 'jeu10', faite: false, reponses: { postes: ['centre'] }, date: '2026-10-20' };
const deux = { mission: 'jeu10', faite: true, reponses: { postes: ['centre'], copains: ['x'], copainsFait: true }, date: '2026-10-21' };
let s = L.compute(Object.assign({}, base, { missions: [poste] }));
assert.strictEqual(s.xp, x0 + C.XP.mission + C.XP.badge, 'le poste : +200 XP et son badge');
s = L.compute(Object.assign({}, base, { missions: [deux] }));
assert.strictEqual(s.xp, x0 + C.XP.mission + C.XP.badge, 'les copains déjà choisis ne rapportent rien en V1');
assert.ok(!('copains' in s.badges));
s = L.compute(Object.assign({}, base, { etoiles: [{ domaine: 'plaquage', etoile: 'a', brille: true }, { domaine: 'passe', etoile: 'b' }] }));
assert.strictEqual(s.xp, x0, 'les étoiles Skills attendent l\'ouverture des Skills');
assert.strictEqual(s.etoilesSkills, 2, 'mais elles sont bien là');
s = L.compute(Object.assign({}, base, { missions: [{ mission: 'm1', faite: true, reponses: { xp: 80 } }] }));
assert.strictEqual(s.xp, x0, 'une mission vidéo / QCM ne rapporte rien en V1');

// missions : seulement « Choisis ton poste »
assert.deepStrictEqual(J(M.visibles().map(D => D.id)), ['poste']);
const groupe = { id: 'm1', sorte: 'qcm', titre: 'QCM', statut: 'active', cree: '2026-10-27T10:00:00Z', questions: [{ q: '?', opts: ['a', 'b'], ok: 0 }] };
const perso = { id: 'p1', sorte: 'etoile', joueurId: 'j1', domaine: 'plaquage', etoile: 'a', statut: 'active', cree: '2026-10-27T11:00:00Z' };
const enc = [{ id: 'e1', mot: 'Bravo', cree: '2026-10-27T12:00:00Z' }, { id: 'e2', missionId: 'p1', cree: '2026-10-27T13:00:00Z' }];
let d = Object.assign({}, base, { missions: [], defmissions: [groupe, perso], encouragements: enc });
assert.deepStrictEqual(J(M.pending(d).map(D => D.id)), ['poste']);
assert.deepStrictEqual(J(M.aFaire(d).map(x => x.id)), ['poste'], 'ni QCM, ni copains');
const nv = M.nouveaux('k', d);
assert.strictEqual(nv.n, 0, 'aucun « nouveau » des éducs (pastille, bandeau)');
d = Object.assign({}, d, { missions: [deux] });
assert.strictEqual(M.pending(d).length, 0, 'poste fait : plus rien à faire');
assert.strictEqual(M.aFaire(d).length, 0);
assert.strictEqual(M.nbFaites(d), 1, 'seule la mission du poste compte');

// tout rouvrir (les éducs, ou plus tard) : la logique d'avant revient
ctx.__MC_TOUT = true;
assert.deepStrictEqual(J(M.visibles().map(D => D.id)), ['poste', 'copains']);
d = Object.assign({}, base, { missions: [], defmissions: [groupe, perso], encouragements: enc });
assert.deepStrictEqual(J(M.aFaire(d).map(x => x.id).sort()), ['m1', 'poste']);
assert.strictEqual(M.nouveaux('k', d).enc.length, 2);
s = L.compute(Object.assign({}, base, { etoiles: [{ domaine: 'plaquage', etoile: 'a', brille: true }] }));
assert.strictEqual(s.xp, x0 + C.XP.etoile + C.XP.brille);

console.log('V1 ENFANTS OK');
