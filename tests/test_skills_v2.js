// Tests Skills v2 (25/10/2026) : la liste du serveur = celle de l'appli, étoiles qui brillent, demandes des enfants, grades.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_skills_v2.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeEnv } = require('./gas_mock.js');

// ----- 1. le référentiel de l'appli (js/competences.js) -----
const sb = { window: {} }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'competences.js'), 'utf8'), sb);
const SK = sb.MC.SK;
assert.strictEqual(SK.DOMAINES.length, 8, '8 cartes');
assert.strictEqual(SK.MAX_TOTAL, 47, '47 étoiles');
assert.deepStrictEqual(Array.from(SK.DOMAINES.map(D => D.id)), ['plaquage', 'ruck', 'maul', 'defense', 'porteur', 'passe', 'pied', 'soutien']);
const vus = {};
SK.DOMAINES.forEach(function (D) {
  assert.ok(D.nom && D.icon && /^#[0-9A-F]{6}$/i.test(D.color), D.id);
  D.etoiles.forEach(function (s) {
    ['id', 'nom', 'phrase', 'mission', 'conseil', 'repere'].forEach(function (k) { assert.ok(typeof s[k] === 'string' && s[k].length > 1, D.id + ':' + s.id + ' ' + k); });
    assert.ok(!vus[D.id + ':' + s.id], 'pas de doublon ' + s.id); vus[D.id + ':' + s.id] = 1;
  });
});
// les étoiles en ligne (v26) gardent leur id
['plaquage:epaule', 'plaquage:joue', 'plaquage:deux-cotes', 'plaquage:cercle', 'plaquage:tomber', 'passe:mains', 'passe:en-courant', 'passe:droite', 'passe:gauche', 'passe:vrillee',
  'ruck:dos-plat', 'ruck:appuis', 'ruck:tete', 'ruck:gagne', 'ruck:roulade', 'pied:decolle', 'pied:chandelle', 'pied:rasant', 'pied:ramasse', 'pied:vise'].forEach(function (k) { assert.ok(vus[k], 'garde ' + k); });
// le hors-jeu au ruck ne parle jamais du pied (Nicolas, 25/10)
const hj = SK.star('ruck', 'hors-jeu');
assert.ok(!/pied/i.test(hj.phrase + hj.conseil + hj.repere), 'hors-jeu au ruck : pas de pied');
assert.strictEqual(SK.star('passe', 'piston').nom, 'Passe piston');
// les ateliers prêts : des étoiles qui existent, 5 au plus
SK.ATELIERS.forEach(function (a) {
  assert.ok(a.etoiles.length >= 1 && a.etoiles.length <= SK.MAX_ATELIER, a.id);
  a.etoiles.forEach(function (k) { const p = SK.parseKey(k); assert.ok(SK.star(p.d, p.e), a.id + ' ' + k); });
});
// grades : 1re étoile, 1/3, 2/3, toutes gagnées, toutes brillent ; une carte de 5 : 1, 2, 4, 5
assert.deepStrictEqual(Array.from(SK.paliers(5)), [1, 2, 4, 5]);
assert.deepStrictEqual(Array.from(SK.paliers(6)), [1, 2, 4, 6]);
assert.deepStrictEqual(Array.from(SK.paliers(7)), [1, 3, 5, 7]);
assert.strictEqual(SK.grade(0, 7).nom, 'À débloquer');
assert.strictEqual(SK.grade(1, 7).nom, 'Bronze');
assert.strictEqual(SK.grade(3, 7).nom, 'Argent');
assert.strictEqual(SK.grade(5, 7).nom, 'Or');
assert.strictEqual(SK.grade(7, 7, 6).nom, 'Diamant');
assert.strictEqual(SK.grade(7, 7, 7).nom, 'Légende');
assert.strictEqual(SK.avantGradeSuivant(4, 7).manque, 1); assert.strictEqual(SK.avantGradeSuivant(4, 7).grade.nom, 'Or');
assert.strictEqual(SK.avantGradeSuivant(7, 7), null);
// carte : nombres, brille ; demande possible
const data = { etoiles: [{ domaine: 'ruck', etoile: 'dos-plat', brille: '' }, { domaine: 'ruck', etoile: 'tete', brille: '2026-11-14' }, { domaine: 'ruck', etoile: 'inconnue' }], demandes: [] };
const c = SK.carte(data, 'ruck');
assert.strictEqual(c.n, 2); assert.strictEqual(c.max, 7); assert.strictEqual(c.nbBrille, 1); assert.strictEqual(c.grade.nom, 'Bronze');
assert.strictEqual(SK.total(data), 2, 'une étoile inconnue ne compte pas');
assert.strictEqual(SK.peutDemander(data, 'ruck', 'gagne'), 'gagner');
assert.strictEqual(SK.peutDemander(data, 'ruck', 'dos-plat'), 'briller');
assert.strictEqual(SK.peutDemander(data, 'ruck', 'tete'), null, 'brille déjà');
data.demandes.push({ statut: 'attente', domaine: 'ruck', etoile: 'gagne' });
assert.strictEqual(SK.peutDemander(data, 'ruck', 'appuis'), null, 'une seule demande à la fois');

// ----- 2. le serveur : même liste -----
const src = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'serveur-mode-champion.gs'), 'utf8');
const m = src.match(/var SKILLS = (\{[\s\S]*?\n  \});/);
const SRV = vm.runInNewContext('(' + m[1] + ')');
assert.strictEqual(JSON.stringify(Object.keys(SRV).sort()), JSON.stringify(Array.from(SK.DOMAINES.map(D => D.id)).sort()), 'mêmes cartes');
SK.DOMAINES.forEach(function (D) { assert.strictEqual(JSON.stringify(SRV[D.id]), JSON.stringify(D.etoiles.map(s => s.id)), 'mêmes étoiles ' + D.id); });

// ----- 3. brille et demandes -----
const g = makeEnv();
g.installer();
const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
r = g.call({ action: 'addEduc', token: nico, nom: 'Julien' }); r = g.call({ action: 'adultLogin', code: r.code }); const julien = r.token;
const P = {};
['Tom', 'Léa'].forEach(function (p) {
  r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p });
  P[p] = r.joueur.id; P['code:' + p] = r.code; P['fam:' + p] = r.familleCode;
});
r = g.call({ action: 'login', joueurId: P.Tom, pin: P['code:Tom'] }); const tom = r.token;
r = g.call({ action: 'login', joueurId: P['Léa'], pin: P['code:Léa'] }); const lea = r.token;
r = g.call({ action: 'adultLogin', code: P['fam:Tom'] }); const famTom = r.token;
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau 3 - Carbonne', debut: '2026-11-14', lieu: 'Carbonne', sorte: 'plateau', presents: [P.Tom, P['Léa']] });
const plateau = r.evenement || r.ev || r;
const plateauId = plateau.id;
assert.ok(plateauId, JSON.stringify(r).slice(0, 200));

// nouvelles cartes : valides
r = g.call({ action: 'validerEtoiles', token: nico, evenementId: '', etoiles: [{ joueurId: P.Tom, domaine: 'maul', etoile: 'lie' }, { joueurId: P.Tom, domaine: 'soutien', etoile: 'hors-jeu-pied' }] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.etoiles.length, 2); assert.strictEqual(r.etoiles[0].brille, '');
r = g.call({ action: 'validerEtoiles', token: nico, etoiles: [{ joueurId: P.Tom, domaine: 'pied', etoile: 'pirate' }] }); assert.strictEqual(r.error, 'invalide');
// après le plateau : brille (une étoile déjà gagnée s'allume, une nouvelle est gagnée et brille)
r = g.call({ action: 'validerEtoiles', token: julien, evenementId: plateauId, brille: true, etoiles: [{ joueurId: P.Tom, domaine: 'maul', etoile: 'lie' }, { joueurId: P['Léa'], domaine: 'plaquage', etoile: 'epaule' }] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.brillees, 1); assert.strictEqual(r.etoiles.length, 2);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.etoiles[0].brille), 'brille = la date');
assert.strictEqual(r.etoiles[0].brilleParNom, 'Julien'); assert.strictEqual(r.etoiles[0].brilleOccasion, 'Plateau 3 - Carbonne');
assert.ok(r.etoiles[1].brille, 'gagnée et brille d\'un coup');
r = g.call({ action: 'validerEtoiles', token: julien, evenementId: plateauId, brille: true, etoiles: [{ joueurId: P.Tom, domaine: 'maul', etoile: 'lie' }] });
assert.strictEqual(r.deja, 1, 'brille déjà');
r = g.call({ action: 'me', token: tom });
const lie = r.etoiles.find(e => e.etoile === 'lie'); assert.ok(lie.brille); assert.strictEqual(lie.brilleParNom, 'Julien');
assert.strictEqual(lie.parQui, undefined, 'l\'enfant ne voit pas les identifiants des éducs');
// éteindre (erreur de l'éduc) : l'étoile reste gagnée
r = g.call({ action: 'retirerEtoile', token: nico, id: lie.id, eteindre: true }); assert.ok(r.ok && r.eteinte);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.etoiles.find(e => e.etoile === 'lie').brille, '');
r = g.call({ action: 'retirerEtoile', token: nico, id: lie.id, eteindre: true }); assert.strictEqual(r.error, 'invalide');

// demandes : l'enfant seulement, une à la fois
r = g.call({ action: 'demanderEtoile', token: famTom, domaine: 'ruck', etoile: 'porte' }); assert.strictEqual(r.error, 'interdit', 'pas les parents');
r = g.call({ action: 'demanderEtoile', token: nico, domaine: 'ruck', etoile: 'porte' }); assert.strictEqual(r.error, 'interdit', 'pas les éducs');
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'ruck', etoile: 'pirate' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'ruck', etoile: 'porte' }); assert.ok(r.ok, JSON.stringify(r));
const d1 = r.demande; assert.strictEqual(d1.sorte, 'gagner'); assert.strictEqual(d1.statut, 'attente');
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'ruck', etoile: 'tete' }); assert.strictEqual(r.error, 'deja', 'une seule en attente');
// les éducs la voient dans le groupe ; la famille la voit
r = g.call({ action: 'group', token: julien }); assert.strictEqual(r.joueurs.find(p => p.joueur.id === P.Tom).demandes[0].id, d1.id);
r = g.call({ action: 'family', token: famTom }); assert.ok(JSON.stringify(r).indexOf(d1.id) >= 0);
// pas vu : message neutre, l'enfant peut redemander
r = g.call({ action: 'repondreDemande', token: tom, id: d1.id, oui: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'repondreDemande', token: julien, id: d1.id, oui: false }); assert.ok(r.ok); assert.strictEqual(r.demande.statut, 'pasvu'); assert.strictEqual(r.demande.parNom, 'Julien');
r = g.call({ action: 'repondreDemande', token: julien, id: d1.id, oui: true }); assert.strictEqual(r.error, 'introuvable', 'déjà répondu');
// faire briller une étoile gagnée (après le plateau), puis oui
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'maul', etoile: 'lie', evenementId: plateauId }); assert.ok(r.ok);
const d2 = r.demande; assert.strictEqual(d2.sorte, 'briller'); assert.strictEqual(d2.occasion, 'Plateau 3 - Carbonne');
r = g.call({ action: 'repondreDemande', token: nico, id: d2.id, oui: true }); assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.demande.statut, 'oui'); assert.ok(r.etoile.brille); assert.strictEqual(r.etoile.brilleOccasion, 'Plateau 3 - Carbonne');
// l'enfant annule sa demande
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'defense', etoile: 'ligne' }); const d3 = r.demande;
r = g.call({ action: 'retirerDemande', token: lea, id: d3.id }); assert.strictEqual(r.error, 'introuvable', 'pas celle d\'un autre');
r = g.call({ action: 'retirerDemande', token: tom, id: d3.id }); assert.ok(r.ok);
r = g.call({ action: 'me', token: tom }); assert.ok(!r.demandes.some(x => x.id === d3.id), 'annulée = plus affichée');
// un éduc valide l'étoile demandée par le circuit normal : la demande est close toute seule
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'defense', etoile: 'ligne' }); const d4 = r.demande;
r = g.call({ action: 'validerEtoiles', token: julien, etoiles: [{ joueurId: P.Tom, domaine: 'defense', etoile: 'ligne' }] }); assert.ok(r.ok);
r = g.call({ action: 'me', token: tom }); assert.strictEqual(r.demandes.find(x => x.id === d4.id).statut, 'oui');
// une étoile qui brille déjà ne se redemande pas
r = g.call({ action: 'demanderEtoile', token: tom, domaine: 'maul', etoile: 'lie' }); assert.strictEqual(r.error, 'invalide');

console.log('SKILLS V2 OK');
