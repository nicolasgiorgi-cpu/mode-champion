// (v78) L'animation de la navette du bilan (5 × 10 m) : départ DEBOUT derrière la ligne (avant : l'animation des départs
// de sprint, qui part allongé, alors que le texte dit « départ debout »), sprint, le pied touche la ligne d'en face,
// demi-tour (le retour est dessiné en miroir), retour, et on repart.
// Lancer : node tests/test_anim_navette.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../js/anims.js', 'utf8'), ctx, { filename: 'anims.js' });
const A = ctx.MC.anim, LIGNE_A = 52, LIGNE_B = 196, SOL = 139;
// le bilan et « Je tente » montrent cette animation pour la navette
assert.ok(A.has('navette'), 'l\'animation « navette » existe');
assert.ok(/navette: 'navette'/.test(fs.readFileSync(__dirname + '/../js/v-bilan.js', 'utf8')), 'le bilan montre l\'animation de la navette');
const M = A._meta('navette');
assert.ok(M.chrono, 'un chrono : c\'est un test chronométré');
// l'image fixe (mouvements réduits) et le début : debout, les deux pieds au sol, derrière la ligne de départ
const sx = (J, p) => J.flip ? 240 - p[0] : p[0];   // abscisse à l'écran
[M.still, 0.05, 0.12].forEach(t => {
  const J = A._pose('navette', t);
  assert.ok(!J.flip && J.hip[1] < 102 && J.sh[1] < J.hip[1] - 20, t + ' : debout (hanches hautes, épaules au-dessus)');
  assert.ok(Math.abs(J.lN.toe[1] - SOL) < 0.5 && Math.abs(J.lF.toe[1] - SOL) < 0.5, t + ' : les deux pieds au sol');
  assert.ok(Math.max(J.lN.toe[0], J.lF.toe[0], J.lN.end[0], J.lF.end[0]) < LIGNE_A, t + ' : derrière la ligne de départ');
});
// jamais allongé (la tête reste haute), jamais dans le sol, les jambes atteignent leurs cibles
for (let i = 0; i < 200; i++) {
  const t = i / 200, J = A._pose('navette', t);
  assert.ok(J.head[1] < 90, t + ' : la tête reste haute (jamais allongé) ' + J.head[1]);
  assert.ok(J.pen < 1 && J.lN.miss < 0.5 && J.lF.miss < 0.5, t + ' : ni dans le sol ni de jambe trop courte');
  assert.ok(J.o >= 0 && J.o <= 1);
}
// le pied touche la ligne d'en face, puis demi-tour : le retour vers la gauche est dessiné en miroir
const allerFin = A._pose('navette', 0.435), retour = A._pose('navette', 0.55), retourFin = A._pose('navette', 0.685), repart = A._pose('navette', 0.75);
assert.ok(!allerFin.flip && Math.max(sx(allerFin, allerFin.lN.end), sx(allerFin, allerFin.lF.end)) >= LIGNE_B, 'à l\'aller, un pied touche la ligne d\'en face');
assert.ok(retour.flip, 'au retour, il court vers la gauche (dessiné en miroir)');
assert.ok(retourFin.flip && Math.min(sx(retourFin, retourFin.lN.end), sx(retourFin, retourFin.lF.end)) <= LIGNE_A, 'au retour, un pied touche la ligne de départ');
assert.ok(!repart.flip && sx(repart, repart.hip) > LIGNE_A, 'puis il repart vers la droite');
// il avance : à l'aller vers la droite, au retour vers la gauche (à l'écran)
assert.ok(sx(A._pose('navette', 0.3), A._pose('navette', 0.3).hip) > sx(A._pose('navette', 0.25), A._pose('navette', 0.25).hip));
assert.ok(sx(A._pose('navette', 0.6), A._pose('navette', 0.6).hip) < sx(A._pose('navette', 0.5), A._pose('navette', 0.5).hip));
// les autres animations ne sont pas retournées
assert.ok(['departs', 'squat', 'pompes', 'burpees'].every(k => !A._pose(k, 0.3).flip));
console.log('test_anim_navette : OK');
