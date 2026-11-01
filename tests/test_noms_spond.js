// Tests serveur (v40) : les noms des enfants suivent Spond (avec garde-fou), les homonymes ont leur nom de famille
// (en entier une fois connecté, les premières lettres sur l'écran de connexion), un enfant de Spond « sans doute déjà
// dans l'appli » est proposé à relier (plus de doublon créé par « Ajouter depuis Spond »), délier ou désactiver libère le lien.
// Noms fictifs. Lancer : sh outils/fabriquer-serveur.sh && node tests/test_noms_spond.js
const assert = require('assert');
const Core = require('../js/core.js');
const { makeEnv } = require('./gas_mock.js');
const J = x => JSON.parse(JSON.stringify(x));   // objets venus du bac à sable du faux Apps Script

// ---------- petits outils ----------
assert.strictEqual(Core._nomPropre('SAINT LAURENT'), 'Saint Laurent');
assert.strictEqual(Core._nomPropre('lacoste vidal'), 'Lacoste Vidal');
assert.strictEqual(Core._nomPropre('Clara SAINT'), 'Clara Saint', 'un mot en majuscules dans un nom écrit normalement');
assert.strictEqual(Core._nomPropre('Ilan LACOSTE Vidal'), 'Ilan Lacoste Vidal');
assert.strictEqual(Core._nomPropre('GARCIA DEL RIO'), 'Garcia del Rio', 'particule en minuscules');
assert.strictEqual(Core._nomPropre('Garcia del Rio'), 'Garcia del Rio', 'écriture déjà soignée : gardée');
assert.strictEqual(Core._nomPropre('MOREL LE GALL'), 'Morel Le Gall', '« le » en minuscules seulement après de / du');
assert.strictEqual(Core._nomPropre('DE LA TOUR'), 'De la Tour');
assert.strictEqual(Core._nomPropre('McLEAN'), 'McLEAN', 'majuscules et minuscules mêlées dans le mot : gardé');
assert.strictEqual(Core._nomPropre('JEAN-LOUIS'), 'Jean-Louis');
assert.strictEqual(Core._nomPropre('  '), '');
assert.strictEqual(Core._nomAffiche('Maxime', 'Arnaud Bel'), 'Maxime Arnaud Bel');
assert.strictEqual(Core._nomAffiche('Maximilien', 'Fernandez de la Torre'), 'Maximilien Fernandez', 'trop long : le premier mot du nom');
assert.ok(Core._nomAffiche('Maximilien-Alexandre', 'Abcdefghijklmnop').length <= 28);
assert.strictEqual(Core._distance('maxme', 'maxime'), 1);
assert.ok(Core._prenomsVoisins('Mathys', 'Mathis') && Core._prenomsVoisins('Clara Saint', 'Clara') && !Core._prenomsVoisins('Noé', 'Noa') && !Core._prenomsVoisins('Sophie', 'Léo'));

// ---------- le cas réel (noms fictifs) : enfants inscrits à la main, Spond avec des noms mal saisis ----------
const GID = 'G-NOMS', SG = 'SG-M12';
let membres = [
  { id: 'm-maxa', firstName: 'Maxme', lastName: 'Arnaud Bel', subGroups: [SG] },        // faute de frappe dans Spond
  { id: 'm-maxd', firstName: 'Maxime', lastName: 'Dupuis', subGroups: [SG] },
  { id: 'm-clara', firstName: 'CLARA SAINT', lastName: 'LAURENT', subGroups: [SG] },     // nom composé coupé au mauvais endroit
  { id: 'm-ilan', firstName: 'Ilan LACOSTE', lastName: 'VIDAL', subGroups: [SG] },
  { id: 'm-leo', firstName: 'Léo', lastName: 'Ferrand', subGroups: [SG] },                // un vrai nouveau (Léa, sa sœur, est dans l'appli)
  { id: 'm-tom', firstName: 'Tom', lastName: 'Martin', subGroups: [SG] },                 // un autre Tom que celui de l'appli (Famille Roux)
  { id: 'm-noa', firstName: 'Noa', lastName: 'Petit', subGroups: [SG] }                   // famille créée sans nom dans l'appli
];
function http(url) {
  if (/login$/.test(url)) return { code: 200, body: { loginToken: 'TOK' } };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: GID, members: membres, subGroups: [{ id: SG, name: 'M12' }] }] };
  if (/sponds\//.test(url)) return { code: 200, body: [{ id: 'E1', heading: 'Plateau 1', startTimestamp: new Date(Date.now() + 3 * 864e5).toISOString(), responses: { acceptedIds: ['m-maxa', 'm-clara', 'm-ilan', 'm-maxd', 'm-tom'] } }] };
  return { code: 404, body: {} };
}
const g = makeEnv({ spond: http }); g.installer();
const admin = g.call({ action: 'adultLogin', code: g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1] }).token;
const P = {};
[['Maxime A.', 'Famille Arnaud Bel'], ['Maxime D.', 'Famille Dupuis'], ['Clara', 'Famille Saint Laurent'], ['Ilan', 'Famille Lacoste Vidal'], ['Léa', 'Famille Ferrand'],
  ['Paul B.', 'Famille B'], ['Tom', 'Famille Roux'], ['Noa', '']].forEach(function (x) {
  const r = g.call({ action: 'addPlayer', token: admin, prenom: x[0], familleNom: x[1] });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.joueur.prenom, x[0], 'ajouté à la main : le nom tapé est gardé');
  P[x[0]] = r.joueur.id;
});
g._props.SPOND_EMAIL = 'a@b.c'; g._props.SPOND_MDP = 'x';
let r = g.call({ action: 'syncSpond', token: admin });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.info.nouveauxLiens, 2, 'Maxime D. (initiale) et Noa (famille sans nom) ; pas Tom : autre famille');
assert.deepStrictEqual(J(r.info.renommes), ['Maxime D. → Maxime Dupuis'], 'homonyme : le nom de famille en entier');
const noms = () => { const x = {}; g.call({ action: 'group', token: admin }).joueurs.forEach(p => { x[p.joueur.id] = p.joueur.prenom; }); return x; };
assert.strictEqual(noms()[P['Maxime A.']], 'Maxime A.', 'sans lien Spond : le nom tapé reste');
assert.strictEqual(noms()[P['Tom']], 'Tom');

// « Ajouter depuis Spond » : les membres pas reliés, et ceux qui sont sans doute déjà dans l'appli
r = g.call({ action: 'compos', token: admin });
let mb = id => r.spond.membres.find(m => m.id === id);
assert.strictEqual(mb('m-clara').nom, 'Clara Saint Laurent', 'nom complet dans la liste Spond');
assert.strictEqual(mb('m-ilan').nom, 'Ilan Lacoste Vidal');
assert.strictEqual(mb('m-maxd').lie, P['Maxime D.']);
assert.strictEqual(mb('m-maxa').proche && mb('m-maxa').proche.id, P['Maxime A.'], 'faute de frappe + même famille');
assert.strictEqual(mb('m-maxa').proche.seul, 'Maxime');
assert.strictEqual(mb('m-clara').proche && mb('m-clara').proche.id, P['Clara'], 'nom collé au prénom + famille');
assert.strictEqual(mb('m-ilan').proche && mb('m-ilan').proche.id, P['Ilan']);
assert.strictEqual(mb('m-leo').proche, undefined, 'Léo ≠ Léa, même famille : prénoms trop courts pour une faute de frappe (frère et sœur)');
assert.strictEqual(mb('m-tom').proche, undefined, 'Tom Martin ≠ Tom (Famille Roux)');
assert.strictEqual(mb('m-maxa').proche.famille, 'Famille Arnaud Bel');

// le doublon qui s'est produit : « Ajouter » depuis Spond (comme le faisait la v39 : prénom de Spond, pas de nom)
r = g.call({ action: 'addPlayer', token: admin, prenom: 'Ilan LACOSTE', familleNom: 'Famille VIDAL', spondId: 'm-ilan' });
assert.ok(r.ok, JSON.stringify(r));
const doublon = r.joueur.id;
// relier l'enfant d'origine : le lien Spond se déplace (il n'est plus sur le doublon)
r = g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Ilan'], spondId: 'm-ilan' }] });
assert.strictEqual(r.terrain[P['Ilan']].spondId, 'm-ilan');
assert.strictEqual(r.terrain[doublon].spondId, '', 'le doublon perd le lien');
g.call({ action: 'updatePlayer', token: admin, joueurId: doublon, actif: false });
// relier les deux autres comme le fait le bouton « Relier »
g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Maxime A.'], spondId: 'm-maxa' }, { joueurId: P['Clara'], spondId: 'm-clara' }] });
r = g.call({ action: 'compos', token: admin });
assert.deepStrictEqual(J(r.spond.membres.filter(m => !m.lie).map(m => m.id)).sort(), ['m-leo', 'm-tom'], 'tout le monde est relié, sauf les nouveaux');

// tant que Spond n'est pas corrigé, l'appli reprend ce qu'il y a dans Spond (les noms se ressemblent)
r = g.call({ action: 'syncSpond', token: admin });
let n = noms();
assert.strictEqual(n[P['Maxime A.']], 'Maxme');
assert.strictEqual(n[P['Clara']], 'Clara Saint');
assert.strictEqual(n[P['Ilan']], 'Ilan Lacoste');
assert.strictEqual(n[P['Maxime D.']], 'Maxime', 'plus d\'homonyme : le prénom seul');
let ev = g.call({ action: 'compos', token: admin }).evenements.find(e => e.id === 'sp-E1');
assert.deepStrictEqual(J(ev.presents).sort(), [P['Maxime A.'], P['Clara'], P['Ilan'], P['Maxime D.']].sort(), 'les présences vont aux enfants d\'origine');
assert.ok(ev.presents.indexOf(doublon) < 0);
// chaque changement de nom est gardé dans le journal
assert.ok(new g.SheetDB_().rows('journal').some(x => x.type === 'nom' && x.joueurId === P['Clara'] && x.data.avant === 'Clara' && x.data.apres === 'Clara Saint'));

// les familles corrigent Spond : la synchro suivante suffit
membres = membres.map(m => m.id === 'm-maxa' ? Object.assign({}, m, { firstName: 'Maxime' }) : m.id === 'm-clara' ? Object.assign({}, m, { firstName: 'Clara', lastName: 'Saint Laurent' })
  : m.id === 'm-ilan' ? Object.assign({}, m, { firstName: 'Ilan', lastName: 'Lacoste Vidal' }) : m);
r = g.call({ action: 'syncSpond', token: admin });
n = noms();
assert.strictEqual(n[P['Maxime A.']], 'Maxime Arnaud Bel');
assert.strictEqual(n[P['Maxime D.']], 'Maxime Dupuis');
assert.strictEqual(n[P['Clara']], 'Clara');
assert.strictEqual(n[P['Ilan']], 'Ilan');
assert.strictEqual(n[P['Paul B.']], 'Paul B.', 'pas dans Spond : inchangé');
assert.ok(r.info.renommes.indexOf('Maxme → Maxime Arnaud Bel') >= 0, JSON.stringify(r.info.renommes));
assert.ok(r.info.renommes.indexOf('Clara Saint → Clara') >= 0);
// une 2e synchro sans changement ne renomme rien
r = g.call({ action: 'syncSpond', token: admin });
assert.deepStrictEqual(J(r.info.renommes), []); assert.deepStrictEqual(J(r.info.aVerifier), []);
// l'écran de connexion (sans code) : les premières lettres du nom pour les homonymes ; le nom entier une fois connecté
let roster = g.call({ action: 'roster' }).joueurs.map(j => j.prenom);
assert.ok(roster.indexOf('Maxime Arn.') >= 0 && roster.indexOf('Maxime Dup.') >= 0 && roster.indexOf('Maxime Arnaud Bel') < 0, roster.join(', '));
assert.ok(roster.indexOf('Ilan') >= 0 && roster.indexOf('Ilan Lacoste') < 0 && roster.indexOf('Paul B.') >= 0, roster.join(', '));
assert.deepStrictEqual(J(Core._nomsConnexion([{ id: 'a', prenom: 'Lou Martin', prenomUsuel: 'Lou', nom: 'Martin' }, { id: 'b', prenom: 'Lou Martinez', prenomUsuel: 'Lou', nom: 'Martinez' }])),
  { b: 'Lou Martine.' }, 'assez de lettres pour les distinguer ; « Martin » est le début de « Martinez » : nom entier');

// ---------- garde-fou : un lien faux ne renomme pas ----------
// Léa reliée à la main au mauvais membre (un parent inscrit sous son nom) : rien n'est repris, « à vérifier »
membres.push({ id: 'm-sophie', firstName: 'Sophie', lastName: 'Garnier', subGroups: [SG] });
g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Léa'], spondId: 'm-sophie' }] });
r = g.call({ action: 'syncSpond', token: admin });
assert.strictEqual(noms()[P['Léa']], 'Léa', 'pas renommée « Sophie »');
assert.deepStrictEqual(J(r.info.aVerifier), ['Léa ↔ Sophie Garnier']);
// délier à la main : « Pas relié » reste (la synchro ne la relie pas toute seule de nouveau)
r = g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Léa'], spondId: '' }] });
assert.strictEqual(r.terrain[P['Léa']].spondId, '');
g.call({ action: 'syncSpond', token: admin });
assert.strictEqual(J(g.call({ action: 'group', token: admin }).joueurs.find(p => p.joueur.id === P['Léa']).terrain).spondId, '');
// enregistrer la fiche sans changer le lien ne touche à rien (l'écran renvoie le lien à chaque fois)
r = g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Clara'], niveau: 'B', spondId: 'm-clara' }] });
assert.deepStrictEqual(Object.keys(r.terrain), [P['Clara']]);
// un lien délié perd le nom de Spond : il ne suit plus Spond
g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Ilan'], spondId: '' }] });
assert.ok(!new g.SheetDB_().rows('joueurs').find(j => j.id === P['Ilan']).nom);
g.call({ action: 'setTerrain', token: admin, lignes: [{ joueurId: P['Ilan'], spondId: 'm-ilan' }] });

// ---------- ajouter depuis Spond (v40 : prénom + nom) un 2e « Clara » : les deux prennent leur nom de famille ----------
r = g.call({ action: 'addPlayer', token: admin, prenom: 'CLARA', nom: 'MOREAU', familleNom: 'Famille Moreau', spondId: 'm-clara2' });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.joueur.prenom, 'Clara Moreau');
assert.deepStrictEqual(J(r.renommes).sort(), ['Clara → Clara Moreau', 'Clara → Clara Saint Laurent']);
assert.strictEqual(noms()[P['Clara']], 'Clara Saint Laurent');
// désactivé : son lien Spond est libéré, et l'autre retrouve son prénom seul à la synchro suivante
const clara2 = r.joueur.id;
g.call({ action: 'updatePlayer', token: admin, joueurId: clara2, actif: false });
assert.strictEqual(((new g.SheetDB_().rows('terrain').find(t => t.id === clara2)) || {}).spondId || '', '');
g.call({ action: 'syncSpond', token: admin });
assert.strictEqual(noms()[P['Clara']], 'Clara');
// un vieux doublon désactivé qui a gardé son lien : ignoré (l'enfant Spond est proposé à l'ajout, les présences ne vont pas au doublon)
const db2 = new g.SheetDB_();
db2.update('joueurs', P['Tom'], { actif: false });
if (db2.rows('terrain').find(t => t.id === P['Tom'])) db2.update('terrain', P['Tom'], { spondId: 'm-tom' });
else db2.insert('terrain', { id: P['Tom'], niveau: '', passerelle: '', plaquage: 0, postesOk: [], spondId: 'm-tom', note: '', parQui: '', maj: '' });
db2.flush_();
r = g.call({ action: 'compos', token: admin });
assert.strictEqual(r.spond.membres.find(m => m.id === 'm-tom').lie, '', 'lien d\'un joueur désactivé : ignoré');
r = g.call({ action: 'addPlayer', token: admin, prenom: 'Tom', nom: 'Martin', familleNom: 'Famille Martin', spondId: 'm-tom' });
assert.ok(r.ok, 'l\'enfant Spond peut être ajouté : ' + JSON.stringify(r));

// un enfant délié à la main n'est plus relié tout seul… mais reste proposé avec « Relier » (avec confirmation)
membres.push({ id: 'm-lea', firstName: 'Léa', lastName: 'Ferrand', subGroups: [SG] });
r = g.call({ action: 'syncSpond', token: admin });
assert.strictEqual(J(g.call({ action: 'group', token: admin }).joueurs.find(p => p.joueur.id === P['Léa']).terrain).spondId, '', 'pas de lien automatique après « Pas relié »');
r = g.call({ action: 'compos', token: admin });
assert.strictEqual((r.spond.membres.find(m => m.id === 'm-lea').proche || {}).id, P['Léa'], 'proposée avec « Relier »');

// ---------- procheDe : pas de proposition hasardeuse ----------
const fams = { f1: { nom: 'Famille Roux' }, f2: { nom: 'Famille Petit' }, f3: { nom: 'Famille de Tom' }, f4: { nom: 'Famille Leroux' }, f5: { nom: 'Famille B' }, f6: { nom: 'Famille Dupont' } };
const libres = [{ id: 'a', prenom: 'Tom', familleId: 'f1' }, { id: 'b', prenom: 'Tom', familleId: 'f2' }];
assert.strictEqual(Core._procheDe({ prenom: 'Tom', nom: 'Martin' }, libres, fams), null, 'deux Tom d\'autres familles : personne');
assert.strictEqual(Core._procheDe({ prenom: 'Tom', nom: 'Petit' }, libres, fams).id, 'b');
assert.strictEqual(Core._procheDe({ prenom: 'Thomas', nom: '' }, [{ id: 'c', prenom: 'Tom', familleId: 'f1' }], fams), null, 'trop différent');
assert.strictEqual(Core._procheDe({ prenom: 'Louise', nom: 'Roux' }, [{ id: 'd', prenom: 'Louis', familleId: 'f1' }], fams).id, 'd', 'une lettre de plus, même famille : proposé (l\'éduc confirme ou choisit Ajouter)');
assert.strictEqual(Core._procheDe({ prenom: 'Louise', nom: 'Martin' }, [{ id: 'd', prenom: 'Louis', familleId: 'f1' }], fams), null, 'autre famille : rien');
assert.strictEqual(Core._procheDe({ prenom: 'Jules', nom: 'Roux' }, [{ id: 'e', prenom: 'Julie', familleId: 'f1' }], fams), null, '2 lettres sur un prénom court : rien');
assert.strictEqual(Core._procheDe({ prenom: 'Tom', nom: 'Zèbre' }, [{ id: 'g', prenom: 'Tom', familleId: 'f3' }], fams).id, 'g', 'famille sans nom : le même prénom suffit');
assert.strictEqual(Core._procheDe({ prenom: 'Tome', nom: 'Zèbre' }, [{ id: 'g', prenom: 'Tom', familleId: 'f3' }], fams), null, 'famille sans nom et prénom seulement voisin : rien');
assert.strictEqual(Core._procheDe({ prenom: 'Tom', nom: 'Roux' }, [{ id: 'h', prenom: 'Tom', familleId: 'f4' }], fams), null, 'Leroux n\'est pas Roux (mot à mot)');
assert.strictEqual(Core._procheDe({ prenom: 'Paul', nom: 'Roux' }, [{ id: 'i', prenom: 'Paul B.', familleId: 'f5' }], fams), null, 'initiale B contre Roux : rien');
assert.strictEqual(Core._procheDe({ prenom: 'Paul', nom: 'Bonnet' }, [{ id: 'i', prenom: 'Paul B.', familleId: 'f5' }], fams).id, 'i', 'initiale qui va (famille sans vrai nom) : proposé');
assert.strictEqual(Core._procheDe({ prenom: 'Hugo', nom: 'Dupnt' }, [{ id: 'k', prenom: 'Hugo', familleId: 'f6' }], fams).id, 'k', 'une faute dans le nom de famille');

// une famille nommée d'après les prénoms de ses enfants : on ne connaît pas son nom (pas « une autre famille »)
const fam7 = { f7: { nom: 'Famille Tom et Lou', _prenoms: ['tom', 'lou'] } };
assert.strictEqual(Core._procheDe({ prenom: 'Tom', nom: 'Martin' }, [{ id: 't', prenom: 'Tom', familleId: 'f7' }], fam7).id, 't');
assert.ok(Core._ressemble({ prenom: 'Lou', familleId: 'f7' }, { prenom: 'Lou', nom: 'Martin' }, fam7));

console.log('test_noms_spond : OK');
