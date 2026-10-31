// Tests serveur des compos : fiche terrain, événements, compo publiée par un éduc, contre-propositions, jour J, Spond.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_compos_core.js
const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');

function setup(opts) {
  const g = makeEnv(opts);
  g.installer();
  const adminCode = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
  let r = g.call({ action: 'adultLogin', code: adminCode }); const nico = r.token;
  r = g.call({ action: 'addEduc', token: nico, nom: 'Cyril' }); const cyrilCode = r.code;
  r = g.call({ action: 'adultLogin', code: cyrilCode }); const cyril = r.token;
  const P = {};
  ['Tom', 'Léa', 'Hugo', 'Baptiste A.', 'Baptiste D.', 'Zoé', 'Inès', 'Malo'].forEach(function (p) {
    r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p });
    P[p] = r.joueur.id; P['code:' + p] = r.code; P['fam:' + p] = r.familleCode;
  });
  return { g, nico, cyril, P };
}

let { g, nico, cyril, P } = setup();
let r;

// ----- fiche terrain -----
r = g.call({ action: 'group', token: nico });
assert.strictEqual(r.joueurs[0].terrain, null, 'pas encore de fiche terrain');
r = g.call({ action: 'setTerrain', token: nico, lignes: [
  { joueurId: P.Tom, niveau: 'B', passerelle: 'A', plaquage: 3, postesOk: ['centre', 'pirate', 'centre'] },
  { joueurId: P['Léa'], niveau: 'A', passerelle: 'C', plaquage: 9 },          // passerelle A→C impossible, plaquage hors bornes
  { joueurId: P.Hugo, niveau: 'C', plaquage: 1 },
  { joueurId: 'inconnu', niveau: 'A' }
] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.terrain[P.Tom].postesOk, ['centre']);
assert.strictEqual(r.terrain[P['Léa']].passerelle, '');
assert.strictEqual(r.terrain[P['Léa']].plaquage, 0);
assert.strictEqual(r.terrain[P.Tom].parQui, 'Admin');
assert.strictEqual(Object.keys(r.terrain).length, 3);
// modification partielle : le reste ne bouge pas
r = g.call({ action: 'setTerrain', token: cyril, lignes: [{ joueurId: P.Tom, plaquage: 4 }] });
assert.strictEqual(r.terrain[P.Tom].niveau, 'B'); assert.strictEqual(r.terrain[P.Tom].passerelle, 'A'); assert.strictEqual(r.terrain[P.Tom].plaquage, 4);
assert.strictEqual(r.terrain[P.Tom].parQui, 'Cyril');
// changer de niveau peut rendre la passerelle impossible
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Hugo, niveau: 'C', passerelle: 'A' }] });
assert.strictEqual(r.terrain[P.Hugo].passerelle, '');
r = g.call({ action: 'group', token: nico });
const tomG = r.joueurs.find(p => p.joueur.id === P.Tom);
assert.strictEqual(tomG.terrain.niveau, 'B');
// les enfants et les parents n'y ont pas accès
r = g.call({ action: 'login', joueurId: P.Tom, pin: P['code:Tom'] }); const tomTok = r.token;
assert.ok(r.ok, JSON.stringify(r));
r = g.call({ action: 'setTerrain', token: tomTok, lignes: [{ joueurId: P.Tom, niveau: 'A' }] });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'compos', token: tomTok }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'adultLogin', code: P['fam:Tom'] }); const famTok = r.token;
r = g.call({ action: 'compos', token: famTok }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'family', token: famTok });
assert.ok(JSON.stringify(r).indexOf('"terrain"') < 0, 'la fiche terrain ne part pas aux parents');

// ----- événements à la main -----
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau 3 - Muret', debut: '2026-11-14', lieu: 'Muret', presents: [P.Tom, P['Léa'], P.Hugo, 'zzz'] });
assert.ok(r.ok, JSON.stringify(r));
const e3 = r.evenement;
assert.strictEqual(e3.sorte, 'plateau'); assert.strictEqual(e3.source, 'manuel'); assert.deepStrictEqual(e3.presents, [P.Tom, P['Léa'], P.Hugo]);
assert.strictEqual(e3.debut.slice(0, 10), '2026-11-14');
r = g.call({ action: 'setEvenement', token: nico, titre: '', debut: '2026-11-14' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'setEvenement', token: nico, titre: 'X', debut: 'demain' }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'setEvenement', token: cyril, id: e3.id, ajouts: [P.Zoé, P['Inès']], retraits: [P.Hugo] });
assert.deepStrictEqual(r.evenement.ajouts, [P.Zoé, P['Inès']]); assert.deepStrictEqual(r.evenement.retraits, [P.Hugo]);
r = g.call({ action: 'compos', token: cyril });
assert.strictEqual(r.evenements.length, 1); assert.strictEqual(r.compos.length, 0); assert.strictEqual(r.spond.branche, false);

// ----- la compo : un éduc suffit -----
const compo1 = {
  evenementId: e3.id, reglages: { format: 5, nb: { A: 1, B: 1, C: 0 } },
  equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P['Léa'], n: 'A' }, { id: P.Tom, n: 'B' }, { id: P.Tom, n: 'B' }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P.Zoé, n: '' }, { id: 'zzz' }] }],
  banc: [P['Inès'], P.Tom], raisons: { [P.Tom]: 'Passerelle : son tour', zzz: 'x' }, justification: 'Tom monte en A pour la 1re fois.'
};
r = g.call(Object.assign({ action: 'saveCompo', token: nico }, compo1));
assert.ok(r.ok, JSON.stringify(r));
let c = r.compo;
assert.strictEqual(c.version, 1); assert.strictEqual(c.statut, 'publiee'); assert.strictEqual(c.auteurNom, 'Admin');
assert.deepStrictEqual(c.equipes[0].joueurs.map(j => j.id), [P['Léa'], P.Tom], 'doublons et inconnus retirés');
assert.deepStrictEqual(c.banc, [P['Inès']], 'un joueur déjà placé ne va pas sur le banc');
assert.deepStrictEqual(Object.keys(c.raisons), [P.Tom]);
// un autre éduc ne peut pas la modifier directement…
r = g.call({ action: 'saveCompo', token: cyril, evenementId: e3.id, compoId: c.id, version: 1, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.error, 'interdit'); assert.ok(/contre-proposition/.test(r.message));
// … il fait une contre-proposition, avec une justification
const moved = JSON.parse(JSON.stringify(c));
moved.equipes[0].joueurs = moved.equipes[0].joueurs.filter(j => j.id !== P.Tom);
moved.equipes[1].joueurs.push({ id: P.Tom, poste: '', n: 'B' });
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: '' });
assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: c.equipes, banc: c.banc, justification: 'Rien changé' });
assert.strictEqual(r.error, 'invalide', 'sans changement');
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: 'Tom n\'a pas encore 4 étoiles de plaquage.' });
assert.ok(r.ok, JSON.stringify(r));
let avis = r.avis;
assert.strictEqual(avis.statut, 'attente'); assert.strictEqual(avis.changements.length, 1);
assert.deepStrictEqual([avis.changements[0].id, avis.changements[0].de, avis.changements[0].vers], [P.Tom, 'A1', 'B1']);
r = g.call({ action: 'compos', token: nico });
assert.strictEqual(r.avis.length, 1); assert.strictEqual(r.compos.length, 1);
// seul l'auteur (ou l'admin) répond ; ici Cyril n'est pas l'auteur
r = g.call({ action: 'repondreAvis', token: cyril, avisId: avis.id, accepte: true });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: false, reponse: 'On garde : c\'est son tour.' });
assert.strictEqual(r.avis.statut, 'refusee'); assert.strictEqual(r.compo.version, 1);
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: true });
assert.strictEqual(r.error, 'introuvable', 'déjà traitée');
// nouvelle contre-proposition, acceptée cette fois
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: moved.equipes, banc: moved.banc, justification: 'Je réessaie : Tom en B.' });
avis = r.avis;
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis.id, accepte: true, reponse: 'OK' });
assert.strictEqual(r.avis.statut, 'acceptee'); assert.strictEqual(r.compo.version, 2);
assert.ok(r.compo.equipes[1].joueurs.some(j => j.id === P.Tom));
assert.ok(/acceptée/.test(r.compo.historique[1].note));
c = r.compo;
// l'auteur modifie sa compo : version 3 ; avec une version périmée : conflit
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 1, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.error, 'conflit');
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 2, reglages: c.reglages, equipes: c.equipes, banc: [], note: 'Inès blessée' });
assert.strictEqual(r.compo.version, 3); assert.deepStrictEqual(r.compo.banc, []);
assert.strictEqual(r.compo.historique[2].note, 'Inès blessée');
// sans changement : pas de nouvelle version
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 3, reglages: c.reglages, equipes: c.equipes, banc: [] });
assert.strictEqual(r.compo.version, 3);
c = r.compo;
// contre-proposition faite sur une ancienne version : à l'acceptation, on rejoue seulement ses déplacements
const m2 = JSON.parse(JSON.stringify(c));
const zoe = m2.equipes[1].joueurs.find(j => j.id === P.Zoé);
m2.equipes[1].joueurs = m2.equipes[1].joueurs.filter(j => j.id !== P.Zoé); m2.equipes[0].joueurs.push(zoe);
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: m2.equipes, banc: m2.banc, justification: 'Zoé en A, 5 étoiles.' });
const avis2 = r.avis;
// pendant ce temps, l'auteur met Inès en B1 (version 4)
const c4 = JSON.parse(JSON.stringify(c)); c4.equipes[1].joueurs.push({ id: P['Inès'], poste: '', n: '' });
r = g.call({ action: 'saveCompo', token: nico, evenementId: e3.id, compoId: c.id, version: 3, reglages: c.reglages, equipes: c4.equipes, banc: [] });
assert.strictEqual(r.compo.version, 4);
r = g.call({ action: 'repondreAvis', token: nico, avisId: avis2.id, accepte: true });
assert.strictEqual(r.compo.version, 5);
assert.ok(r.compo.equipes[0].joueurs.some(j => j.id === P.Zoé), 'Zoé passe en A');
assert.ok(r.compo.equipes[1].joueurs.some(j => j.id === P['Inès']), 'Inès reste en B1 (changement de l\'auteur gardé)');
// l'auteur d'une contre-proposition peut la retirer
r = g.call({ action: 'contreProposition', token: cyril, compoId: c.id, equipes: c.equipes, banc: [P.Malo], justification: 'Malo sur le banc' });
r = g.call({ action: 'repondreAvis', token: nico, avisId: r.avis.id, retirer: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'compos', token: cyril });
const pending = r.avis.filter(a => a.statut === 'attente');
assert.strictEqual(pending.length, 1);
r = g.call({ action: 'repondreAvis', token: cyril, avisId: pending[0].id, retirer: true }); assert.strictEqual(r.avis.statut, 'retiree');

// ----- le jour J : tout éduc corrige directement (dernière minute) -----
const today = (function () { const d = new Date(); const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau du jour', debut: today, presents: [P.Tom, P['Léa']] });
const ej = r.evenement;
r = g.call({ action: 'saveCompo', token: nico, evenementId: ej.id, reglages: { format: 5, nb: { A: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }, { id: P['Léa'] }] }], banc: [] });
const cj = r.compo;
r = g.call({ action: 'saveCompo', token: cyril, evenementId: ej.id, compoId: cj.id, version: 1, reglages: cj.reglages, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }] }], banc: [P['Léa']], note: 'Léa malade' });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.version, 2); assert.strictEqual(r.compo.historique[1].dm, true);
// retirer une compo : son auteur (ou l'admin)
r = g.call({ action: 'retirerCompo', token: cyril, compoId: cj.id }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'retirerCompo', token: nico, compoId: cj.id }); assert.ok(r.ok);
r = g.call({ action: 'compos', token: nico });
assert.ok(!r.compos.some(x => x.id === cj.id));
// supprimer un événement ajouté à la main (pas s'il a une compo publiée)
r = g.call({ action: 'setEvenement', token: nico, id: e3.id, supprimer: true }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'setEvenement', token: nico, id: ej.id, supprimer: true }); assert.ok(r.supprime);
// ----- entraînement : les ateliers, puis les matchs (une compo pour chaque partie) -----
r = g.call({ action: 'setEvenement', token: nico, titre: 'Entraînement - Lézat', debut: '2026-11-04', presents: [P.Tom, P['Léa'], P.Hugo, P.Zoé, P['Inès'], P.Malo] });
const etE = r.evenement;
assert.strictEqual(etE.sorte, 'entrainement');
const ateliers = { evenementId: etE.id, partie: 'ateliers', version: 0, reglages: { partie: 'ateliers', mode: 'equilibre', separer: true, n: 2, nAv: 1, nAr: 1, nbMatchs: 9, format: 10 },
  equipes: [{ id: 'Av1', nom: 'Av1', niveau: '', bloc: 'av', joueurs: [{ id: P.Tom }, { id: P.Hugo }, { id: P.Tom }] }, { id: 'Ar1', nom: 'Ar1', niveau: '', bloc: 'ar', joueurs: [{ id: P['Léa'] }, { id: P.Zoé }] },
    { id: 'Ar1', nom: 'doublon', bloc: 'pirate', joueurs: [{ id: P['Inès'] }] }], banc: [P.Malo] };
r = g.call(Object.assign({ action: 'saveCompo', token: nico }, ateliers));
assert.ok(r.ok, JSON.stringify(r));
const ca = r.compo;
assert.strictEqual(ca.partie, 'ateliers');
assert.deepStrictEqual(ca.equipes.map(t => [t.id, t.bloc, t.nom]), [['Av1', 'av', 'Av1'], ['Ar1', 'ar', 'Ar1'], ['T1', 'g', 'doublon']], 'ids etE blocs des groupes nettoyés');
assert.deepStrictEqual(ca.equipes[0].joueurs.map(j => j.id), [P.Tom, P.Hugo], 'un joueur une seule fois');
assert.deepStrictEqual(ca.reglages, { format: 5, nb: { A: 0, B: 0, C: 0 }, partie: 'ateliers', mode: 'equilibre', separer: true, n: 2, nAv: 1, nAr: 1, nbMatchs: 2 });
// les matchs du même entraînement : une autre compo, à côté des ateliers
const matchs = { evenementId: etE.id, partie: 'matchs', version: 0, reglages: { partie: 'matchs', mode: 'niveau', nbMatchs: 1, separer: true },
  // une vieille compo peut encore envoyer « cote » (chasubles / maillots) : le serveur l'ignore
  equipes: [{ id: 'E1', nom: 'Équipe 1', cote: 'c', bloc: 'm1', joueurs: [{ id: P.Tom }, { id: P['Léa'] }, { id: P.Hugo }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: P.Zoé }, { id: P['Inès'] }, { id: P.Malo }] }], banc: [] };
r = g.call(Object.assign({ action: 'saveCompo', token: cyril }, matchs));
assert.ok(r.ok, JSON.stringify(r));
const cm = r.compo;
assert.strictEqual(cm.partie, 'matchs'); assert.strictEqual(cm.equipes[0].nom, 'Équipe 1'); assert.ok(!('cote' in cm.equipes[0]), 'plus de côté chasubles / maillots'); assert.strictEqual(cm.reglages.separer, false, 'pas d\'avants / arrières séparés pour les matchs');
assert.strictEqual(cm.reglages.format, 5, 'des matchs envoyés sans format : sans postes (comme avant)');
assert.strictEqual(r.compo.reglages.format, 5);
r = g.call({ action: 'compos', token: nico });
assert.strictEqual(r.compos.filter(x => x.evenementId === etE.id).length, 2);
// republier les ateliers sans version : conflit (ils existent déjà) ; modifier les matchs de Cyril : contre-proposition (pas le jour J)
r = g.call(Object.assign({ action: 'saveCompo', token: cyril }, ateliers)); assert.strictEqual(r.error, 'conflit');
r = g.call(Object.assign({ action: 'saveCompo', token: nico }, matchs, { compoId: cm.id, version: 1 })); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'contreProposition', token: nico, compoId: cm.id, version: 1, justification: 'Hugo dans l\'équipe 2',
  equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom }, { id: P['Léa'] }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: P.Zoé }, { id: P['Inès'] }, { id: P.Malo }, { id: P.Hugo }] }], banc: [] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.avis.changements.map(m => [m.de, m.vers]), [['E1', 'E2']]);
r = g.call({ action: 'repondreAvis', token: cyril, avisId: r.avis.id, accepte: true, reponse: 'ok' });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.equipes[1].joueurs.map(j => j.id), [P.Zoé, P['Inès'], P.Malo, P.Hugo]);
assert.strictEqual(r.compo.equipes[1].nom, 'Équipe 2', 'le nom de l\'équipe reste');
// (v35) l'auteur repasse ses matchs avec des postes (jeu à 10) : gardés, même un poste qui n'est pas sur la fiche
r = g.call(Object.assign({ action: 'saveCompo', token: cyril }, matchs, { compoId: cm.id, version: r.compo.version, reglages: { partie: 'matchs', mode: 'niveau', nbMatchs: 1, format: 10 },
  equipes: [{ id: 'E1', nom: 'Équipe 1', bloc: 'm1', joueurs: [{ id: P.Tom, poste: 'talonneur' }, { id: P['Léa'], poste: 'ailier' }] }, { id: 'E2', nom: 'Équipe 2', bloc: 'm1', joueurs: [{ id: P.Zoé, poste: 'pilier' }, { id: P['Inès'], poste: 'ouvreur' }, { id: P.Malo, poste: 'n-importe' }, { id: P.Hugo, poste: '' }] }], banc: [] }));
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compo.reglages.format, 10, 'matchs avec postes');
assert.deepStrictEqual(r.compo.equipes.map(t => t.joueurs.map(j => j.poste)), [['talonneur', 'ailier'], ['pilier', 'ouvreur', '', '']], 'postes gardés ; un poste inconnu est vidé');
r = g.call(Object.assign({ action: 'saveCompo', token: nico }, ateliers, { compoId: ca.id, version: ca.version, reglages: Object.assign({}, ateliers.reglages, { format: 10 }) }));
assert.ok(r.ok && r.compo.reglages.format === 5, 'les ateliers restent sans postes');
// 2 versions au vote, pour les ateliers d'un autre entraînement
r = g.call({ action: 'setEvenement', token: nico, titre: 'Entraînement - Saint-Sulpice', debut: '2026-11-07', presents: [P.Tom, P.Hugo, P.Zoé, P.Malo] });
const etE2 = r.evenement;
r = g.call({ action: 'saveCompo', token: nico, evenementId: etE2.id, partie: 'ateliers', version: 0, monVote: 0, versions: [
  { reglages: { partie: 'ateliers', mode: 'niveau', n: 2 }, equipes: [{ id: 'N1', nom: 'A1', niveau: 'A', bloc: 'A', joueurs: [{ id: P.Tom }, { id: P.Hugo }] }, { id: 'N2', nom: 'B1', niveau: 'B', bloc: 'B', joueurs: [{ id: P.Zoé }, { id: P.Malo }] }], banc: [] },
  { reglages: { partie: 'ateliers', mode: 'equilibre', n: 2 }, equipes: [{ id: 'G1', nom: 'G1', bloc: 'g', joueurs: [{ id: P.Tom }, { id: P.Zoé }] }, { id: 'G2', nom: 'G2', bloc: 'g', joueurs: [{ id: P.Hugo }, { id: P.Malo }] }], banc: [] }] });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.statut, 'vote'); assert.strictEqual(r.compo.partie, 'ateliers');
r = g.call({ action: 'voteCompo', token: cyril, compoId: r.compo.id, choix: 1 });
r = g.call({ action: 'cloreVote', token: nico, compoId: r.compo.id, choix: 1 });
assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.compo.statut, 'publiee'); assert.strictEqual(r.compo.equipes[0].bloc, 'g'); assert.strictEqual(r.compo.reglages.mode, 'equilibre');
// le plateau du même jour garde sa propre compo (partie vide) : rien ne se mélange
r = g.call({ action: 'compos', token: nico });
assert.ok(r.compos.filter(x => !x.partie).every(x => x.equipes.every(t => /^[ABC][1-9]$/.test(t.id))));
// Spond pas branché sur ce serveur
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'indispo');
// les données de l'éduc ne partent pas chez l'enfant
r = g.call({ action: 'me', token: tomTok });
assert.ok(JSON.stringify(r).indexOf('"terrain"') < 0 && JSON.stringify(r).indexOf('"compos"') < 0);

// ===================== SPOND (spond.gs + appels HTTP simulés) =====================
const GID = 'GROUPE-EDR-TEST', SG = 'SOUS-GROUPE-M12-TEST';
const calls = [];
let spondEvents = [];
const members = [
  { id: 'm-tom', firstName: 'Tom', lastName: 'Martin', subGroups: [SG] },
  { id: 'm-bapa', firstName: 'Baptiste', lastName: 'Abadie', subGroups: [SG] },
  { id: 'm-bapd', firstName: 'Baptiste', lastName: 'Durand', subGroups: [SG] },
  { id: 'm-lea', firstName: 'Léa', lastName: 'Roux', subGroups: [SG] },
  { id: 'm-coach', firstName: 'Julien', lastName: 'Coach', subGroups: [SG] },
  { id: 'm-m10', firstName: 'Paul', lastName: 'Petit', subGroups: ['AUTRE'] }
];
function spondHttp(url, params) {
  calls.push(url);
  if (/auth2\/login$/.test(url)) {
    const b = JSON.parse(params.payload);
    if (b.password !== 'secret') return { code: 401, body: { error: 'bad' } };
    return { code: 200, body: { accessToken: { token: 'TOK' }, refreshToken: { token: 'R' } } };
  }
  if (params.headers && params.headers.Authorization !== 'Bearer TOK') return { code: 401, body: {} };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: 'AUTRE-GROUPE', members: [], subGroups: [{ id: 'X', name: 'M10' }] }, { id: GID, members, subGroups: [{ id: 'AUTRE', name: 'M14' }, { id: SG, name: 'M12' }] }] };
  if (/sponds\//.test(url)) {
    assert.ok(url.indexOf('subgroupId=' + SG) > 0 && url.indexOf('groupId=' + GID) > 0);
    return { code: 200, body: spondEvents };
  }
  return { code: 404, body: {} };
}
({ g, nico, cyril, P } = setup({ spond: spondHttp }));
r = g.call({ action: 'compos', token: nico }); assert.strictEqual(r.spond.branche, false);
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'spond'); assert.ok(/identifiants/.test(r.message), r.message);
g._props.SPOND_EMAIL = 'nico@example.org'; g._props.SPOND_MDP = 'faux';
r = g.call({ action: 'syncSpond', token: nico }); assert.strictEqual(r.error, 'spond'); assert.ok(/refuse/.test(r.message), r.message);
g._props.SPOND_MDP = 'secret';
spondEvents = [
  { id: 'EV1', heading: 'Plateau 3 - Muret', startTimestamp: '2026-11-14T08:00:00Z', endTimestamp: '2026-11-14T12:00:00Z', location: { feature: 'Stade de Muret' },
    recipients: { group: { id: GID, subGroups: [{ id: SG }] } }, responses: { acceptedIds: ['m-tom', 'm-bapa', 'm-coach'], declinedIds: ['m-lea'], unansweredIds: ['m-bapd'], waitinglistIds: [] } },
  { id: 'EV2', heading: 'Entraînement - Lézat', startTimestamp: '2026-11-18T16:30:00Z', recipients: { group: { id: GID, subGroups: [{ id: 'AUTRE' }] } }, responses: { acceptedIds: ['m-tom'] } },
  { id: 'EV3', heading: 'Entraînement - Saint-Sulpice', startTimestamp: '2026-11-21T09:00:00Z', responses: { acceptedIds: ['m-lea', 'm-tom'], declinedIds: [] } }
];
r = g.call({ action: 'syncSpond', token: nico });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.info.evenements, 2, 'l\'événement d\'un autre sous-groupe est ignoré');
assert.deepStrictEqual(JSON.parse(g._props.SPOND_SOUS_GROUPES), [{ id: SG, groupeId: GID }], 'sans profil coach : le sous-groupe « M12 » est trouvé tout seul et gardé');
assert.strictEqual(r.info.membres, 5);
assert.strictEqual(r.info.nouveauxLiens, 4, 'Tom, Baptiste A., Baptiste D., Léa');
assert.deepStrictEqual(r.info.joueursSansLien.sort(), ['Hugo', 'Inès', 'Malo', 'Zoé']);
r = g.call({ action: 'compos', token: nico });
assert.strictEqual(r.spond.branche, true); assert.strictEqual(r.spond.derniere.evenements, 2);
let ev1 = r.evenements.find(e => e.id === 'sp-EV1');
assert.strictEqual(ev1.source, 'spond'); assert.strictEqual(ev1.sorte, 'plateau'); assert.strictEqual(ev1.lieu, 'Stade de Muret');
assert.deepStrictEqual(ev1.presents, [P.Tom, P['Baptiste A.']]);
assert.deepStrictEqual(ev1.absents, [P['Léa']]); assert.deepStrictEqual(ev1.sansReponse, [P['Baptiste D.']]);
assert.deepStrictEqual(ev1.inconnus, ['Julien C.'], 'un adulte du groupe qui a répondu oui : listé à part');
assert.strictEqual(r.evenements.find(e => e.id === 'sp-EV3').sorte, 'entrainement');
r = g.call({ action: 'group', token: nico });
assert.strictEqual(r.joueurs.find(p => p.joueur.id === P['Baptiste D.']).terrain.spondId, 'm-bapd');
// correction à la main des présents, puis nouvelle synchro : la correction reste, les réponses Spond se mettent à jour
g.call({ action: 'setEvenement', token: nico, id: 'sp-EV1', ajouts: [P.Hugo], retraits: [P['Baptiste A.']] });
spondEvents[0].responses.acceptedIds.push('m-lea'); spondEvents[0].responses.declinedIds = [];
r = g.call({ action: 'syncSpond', token: nico });
assert.strictEqual(r.info.nouveauxLiens, 0);
r = g.call({ action: 'compos', token: nico });
ev1 = r.evenements.find(e => e.id === 'sp-EV1');
assert.strictEqual(r.evenements.length, 2, 'pas de doublon');
assert.deepStrictEqual(ev1.presents, [P.Tom, P['Baptiste A.'], P['Léa']]);
assert.deepStrictEqual(ev1.ajouts, [P.Hugo]); assert.deepStrictEqual(ev1.retraits, [P['Baptiste A.']]);
// un lien posé à la main l'emporte : Hugo est en fait le membre « Paul Petit » (prénom d'usage différent)
g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Hugo, spondId: 'm-m10' }] });
members[5].subGroups = [SG]; spondEvents[0].responses.acceptedIds.push('m-m10');
r = g.call({ action: 'syncSpond', token: nico });
r = g.call({ action: 'compos', token: nico });
assert.ok(r.evenements.find(e => e.id === 'sp-EV1').presents.indexOf(P.Hugo) >= 0);
// la synchro automatique : déclencheur toutes les heures
g.brancherSpond();
assert.strictEqual(g._triggers.length, 1); assert.strictEqual(g._triggers[0].fn, 'synchroSpond');
g.brancherSpond();
assert.strictEqual(g._triggers.length, 1, 'pas de déclencheur en double');
assert.ok(g._logs.some(l => /Spond : 2 événements/.test(l)), g._logs.slice(-3).join(' | '));
// le jeton Spond est gardé (pas de nouvelle connexion à chaque synchro)
const logins = calls.filter(u => /login/.test(u)).length;
g.synchroSpond();
assert.strictEqual(calls.filter(u => /login/.test(u)).length, logins);
g.debrancherSpond(); assert.strictEqual(g._triggers.length, 0);
// ----- suites de la relecture : conflits, marques de présence, passerelle sans niveau, homonymes Spond -----
({ g, nico, cyril, P } = setup());
r = g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Tom, niveau: '', passerelle: 'A' }] });
assert.strictEqual(r.terrain[P.Tom].passerelle, '', 'pas de passerelle sans niveau');
const tdy = (function () { const d = new Date(); const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau test', debut: tdy, presents: [P.Tom, P['Léa'], P.Hugo] });
const et = r.evenement;
const eqA = [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }, { id: P['Léa'] }] }];
r = g.call({ action: 'saveCompo', token: nico, evenementId: et.id, version: 0, reglages: { format: 5, nb: { A: 1 } }, equipes: eqA, banc: [] });
const ct = r.compo;
// un brouillon publié par un autre éduc (même le jour J) n'écrase pas la compo publiée
r = g.call({ action: 'saveCompo', token: cyril, evenementId: et.id, version: 0, reglages: { format: 5, nb: { A: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Hugo }] }], banc: [] });
assert.strictEqual(r.error, 'conflit'); assert.ok(/Admin a publié/.test(r.message), r.message);
// ni le même éduc depuis un autre appareil, ni une version périmée
r = g.call({ action: 'saveCompo', token: nico, evenementId: et.id, reglages: { format: 5, nb: { A: 1 } }, equipes: eqA, banc: [P.Hugo] });
assert.strictEqual(r.error, 'conflit');
r = g.call({ action: 'saveCompo', token: nico, evenementId: et.id, compoId: ct.id, version: 1, reglages: ct.reglages, equipes: eqA, banc: [P.Hugo] });
assert.strictEqual(r.compo.version, 2);
r = g.call({ action: 'saveCompo', token: cyril, evenementId: et.id, compoId: ct.id, version: 1, reglages: ct.reglages, equipes: eqA, banc: [] });
assert.strictEqual(r.error, 'conflit', 'jour J mais version périmée');
r = g.call({ action: 'contreProposition', token: cyril, compoId: ct.id, version: 1, equipes: eqA, banc: [], justification: 'Hugo malade' });
assert.strictEqual(r.error, 'conflit', 'contre-proposition sur une version périmée');
// un joueur désactivé depuis n'est pas un « changement »
g.call({ action: 'updatePlayer', token: nico, joueurId: P.Hugo, actif: false });
r = g.call({ action: 'contreProposition', token: cyril, compoId: ct.id, version: 2, equipes: eqA, banc: [], justification: 'Rien de neuf' });
assert.strictEqual(r.error, 'invalide', JSON.stringify(r));
g.call({ action: 'updatePlayer', token: nico, joueurId: P.Hugo, actif: true });
// marques de présence : appliquées sur l'état du serveur (deux éducs en même temps)
r = g.call({ action: 'setEvenement', token: nico, id: et.id, marques: { [P.Hugo]: false, [P.Zoé]: true } });
assert.deepStrictEqual(r.evenement.presents, [P.Tom, P['Léa'], P.Zoé]);
r = g.call({ action: 'setEvenement', token: cyril, id: et.id, marques: { [P['Inès']]: true } });
assert.deepStrictEqual(r.evenement.presents, [P.Tom, P['Léa'], P.Zoé, P['Inès']], 'la correction de l\'autre éduc reste');

// ----- 2 versions soumises au vote des éducs : la majorité l'emporte, l'auteur départage -----
r = g.call({ action: 'addEduc', token: nico, nom: 'Julien' }); const julien = g.call({ action: 'adultLogin', code: r.code }).token;
r = g.call({ action: 'setEvenement', token: nico, titre: 'Plateau vote', debut: '2026-12-12', presents: [P.Tom, P['Léa'], P.Hugo, P.Zoé] });
const ev = r.evenement;
const V1 = { reglages: { format: 5, nb: { A: 1, B: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }, { id: P['Léa'] }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P.Hugo }, { id: P.Zoé }] }], banc: [] };
const V2 = { reglages: { format: 5, nb: { A: 1, B: 1 } }, equipes: [{ id: 'A1', niveau: 'A', joueurs: [{ id: P.Tom }, { id: P.Zoé }] }, { id: 'B1', niveau: 'B', joueurs: [{ id: P.Hugo }, { id: P['Léa'] }] }], banc: [] };
r = g.call({ action: 'saveCompo', token: nico, evenementId: ev.id, version: 0, versions: [V1], justification: 'x' });
assert.strictEqual(r.error, 'invalide', 'il faut deux versions');
r = g.call({ action: 'saveCompo', token: nico, evenementId: ev.id, version: 0, versions: [V1, V2], monVote: 0, justification: 'Copains ou plaquage ?' });
assert.ok(r.ok, JSON.stringify(r));
let cv = r.compo;
assert.strictEqual(cv.statut, 'vote'); assert.strictEqual(cv.versions.length, 2); assert.strictEqual(cv.votes[Object.keys(cv.votes)[0]], 0);
// pendant le vote : pas de modification directe, pas de contre-proposition, pas de 2e compo
r = g.call({ action: 'saveCompo', token: nico, evenementId: ev.id, compoId: cv.id, version: 1, reglages: V1.reglages, equipes: V1.equipes, banc: [] });
assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'contreProposition', token: cyril, compoId: cv.id, version: 1, equipes: V2.equipes, banc: [], justification: 'autre' });
assert.strictEqual(r.error, 'introuvable');
r = g.call({ action: 'saveCompo', token: cyril, evenementId: ev.id, version: 0, reglages: V1.reglages, equipes: V1.equipes, banc: [] });
assert.strictEqual(r.error, 'conflit');
// 3 éducs actifs (Admin, Cyril, Julien) : 2 voix suffisent
r = g.call({ action: 'voteCompo', token: cyril, compoId: cv.id, choix: 1 });
assert.strictEqual(r.compo.statut, 'vote');
r = g.call({ action: 'voteCompo', token: cyril, compoId: cv.id, choix: 0 });   // il change d'avis : 2 voix pour la version 1
assert.strictEqual(r.compo.statut, 'publiee'); assert.strictEqual(r.compo.choix, 0); assert.strictEqual(r.compo.version, 2);
assert.deepStrictEqual(r.compo.equipes[0].joueurs.map(j => j.id), [P.Tom, P['Léa']]);
assert.ok(/2 voix sur 3/.test(r.compo.historique[1].note), r.compo.historique[1].note);
r = g.call({ action: 'voteCompo', token: julien, compoId: cv.id, choix: 1 });
assert.strictEqual(r.error, 'introuvable', 'vote terminé');
// égalité : l'auteur départage en clôturant
g.call({ action: 'retirerCompo', token: nico, compoId: cv.id });
r = g.call({ action: 'saveCompo', token: nico, evenementId: ev.id, version: 0, versions: [V1, V2] });
cv = r.compo;
g.call({ action: 'voteCompo', token: cyril, compoId: cv.id, choix: 0 });
g.call({ action: 'voteCompo', token: julien, compoId: cv.id, choix: 1 });
r = g.call({ action: 'cloreVote', token: cyril, compoId: cv.id });
assert.strictEqual(r.error, 'interdit', 'seul l\'auteur clôt (hors jour J)');
r = g.call({ action: 'cloreVote', token: nico, compoId: cv.id });
assert.strictEqual(r.error, 'egalite');
r = g.call({ action: 'cloreVote', token: nico, compoId: cv.id, choix: 1 });
assert.strictEqual(r.compo.statut, 'publiee'); assert.strictEqual(r.compo.choix, 1);
assert.deepStrictEqual(r.compo.equipes[0].joueurs.map(j => j.id), [P.Tom, P.Zoé]);
assert.ok(/départagée par Admin/.test(r.compo.historique[1].note));
r = g.call({ action: 'compos', token: cyril });
assert.strictEqual(r.educs.length, 3);
assert.strictEqual(r.compos.find(c => c.id === cv.id).versions.length, 2, 'les 2 versions restent visibles');

// Spond : un seul « Baptiste » dans l'appli mais deux dans Spond → pas de lien au hasard ; « Zoé M » sans nom de famille
const members2 = [
  { id: 'm-b1', firstName: 'Baptiste', lastName: 'Abadie', subGroups: [SG] }, { id: 'm-b2', firstName: 'Baptiste', lastName: 'Durand', subGroups: [SG] },
  { id: 'm-z', firstName: 'Zoé M', lastName: '', subGroups: [SG] }, { id: 'm-t', firstName: 'Tom', lastName: 'Martin', subGroups: [SG] }
];
let evs2 = [{ id: 'E1', heading: 'Plateau 5', startTimestamp: new Date(Date.now() + 5 * 864e5).toISOString(), responses: { acceptedIds: ['m-b1', 'm-z'] } },
  { id: 'E2', heading: 'Plateau 6', startTimestamp: new Date(Date.now() + 9 * 864e5).toISOString(), responses: { acceptedIds: ['m-t'] } }];
function http2(url, params) {
  if (/login$/.test(url)) return { code: 200, body: { loginToken: 'TOK2' } };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: GID, members: members2, subGroups: [{ id: SG, name: 'M12 ' }] }] };
  if (/sponds\//.test(url)) return { code: 200, body: evs2 };
  return { code: 404, body: {} };
}
({ g, nico, cyril, P } = (function () {
  const x = makeEnv({ spond: http2 }); x.installer();
  const code = x._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
  const tok = x.call({ action: 'adultLogin', code }).token, PP = {};
  ['Baptiste', 'Zoé', 'Tom'].forEach(n => { PP[n] = x.call({ action: 'addPlayer', token: tok, prenom: n }).joueur.id; });
  return { g: x, nico: tok, cyril: null, P: PP };
})());
g._props.SPOND_EMAIL = 'a@b.c'; g._props.SPOND_MDP = 'x';
r = g.call({ action: 'syncSpond', token: nico });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.info.joueursSansLien, ['Baptiste'], 'deux Baptiste dans Spond : pas de lien au hasard');
r = g.call({ action: 'compos', token: nico });
assert.deepStrictEqual(r.evenements.find(e => e.id === 'sp-E1').presents, [P.Zoé], 'Zoé M reliée à Zoé');
assert.deepStrictEqual(r.spond.membres.map(m => m.nom), ['Baptiste A.', 'Baptiste D.', 'Tom M.', 'Zoé M.']);
// relier à la main depuis la fiche terrain
g.call({ action: 'setTerrain', token: nico, lignes: [{ joueurId: P.Baptiste, spondId: 'm-b1' }] });
// un événement supprimé dans Spond est marqué annulé
evs2 = evs2.slice(0, 1);
r = g.call({ action: 'syncSpond', token: nico });
r = g.call({ action: 'compos', token: nico });
assert.deepStrictEqual(r.evenements.find(e => e.id === 'sp-E1').presents, [P.Baptiste, P.Zoé]);
assert.strictEqual(r.evenements.find(e => e.id === 'sp-E2').annule, true);
// ===================== SPOND branché depuis l'appli (éduc admin), catégories d'après qui les coache =====================
const MDP = 'MotDePasse-Test-42', EMAIL = 'coach@example.org';
const membres3 = [
  { id: 'm-moi', firstName: 'Nico', lastName: 'Coach', profile: { id: 'P-MOI' }, roles: ['r-coach'], subGroups: ['SG12', 'SG14'] },
  { id: 'm-julien', firstName: 'Julien', lastName: 'Adulte', profile: { id: 'P-J' }, subGroups: ['SG12'] },
  { id: 'k-tom', firstName: 'Tom', lastName: 'Martin', subGroups: ['SG12'], guardians: [{ id: 'gd1', profile: { id: 'P-MOI' } }] },
  { id: 'k-lea', firstName: 'Léa', lastName: 'Roux', subGroups: ['SG12'], guardians: [{ id: 'gd2' }] },
  { id: 'k-sam', firstName: 'Sam', lastName: 'Neuf', subGroups: ['SG12'] },
  { id: 'k-max', firstName: 'Max', lastName: 'Quatorze', subGroups: ['SG14'] },
  { id: 'k-dix', firstName: 'Dix', lastName: 'Petit', subGroups: ['SG10'] }
];
const J5 = new Date(Date.now() + 5 * 864e5).toISOString(), J8 = new Date(Date.now() + 8 * 864e5).toISOString(), J9 = new Date(Date.now() + 9 * 864e5).toISOString();
const evE12 = { id: 'E12', heading: 'Plateau 7 - Test', startTimestamp: J5, recipients: { group: { id: 'G1', subGroups: [{ id: 'SG12' }] } }, responses: { acceptedIds: ['k-tom', 'm-julien', 'k-sam'] } };
const evBoth = { id: 'EB', heading: 'Rassemblement - Test', startTimestamp: J8, recipients: { group: { id: 'G1', subGroups: [{ id: 'SG12' }, { id: 'SG14' }] } }, responses: { acceptedIds: ['k-lea', 'k-max'] } };
const evE14 = { id: 'E14', heading: 'Entraînement - M14', startTimestamp: J9, recipients: { group: { id: 'G1', subGroups: [{ id: 'SG14' }] } }, responses: { acceptedIds: ['k-max'] } };
const vus3 = [];
function http3(url, params) {
  vus3.push(url + ' ' + (params.payload || ''));
  if (/login$/.test(url)) {
    const b = JSON.parse(params.payload);
    return b.email === EMAIL && b.password === MDP ? { code: 200, body: { accessToken: { token: 'TOK3' } } } : { code: 401, body: { error: 'bad' } };
  }
  if (params.headers && params.headers.Authorization !== 'Bearer TOK3') return { code: 401, body: {} };
  if (/profile$/.test(url)) return { code: 200, body: { id: 'P-MOI', firstName: 'Nico' } };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: 'G1', name: 'EDR Test', members: membres3, subGroups: [{ id: 'SG10', name: 'M10' }, { id: 'SG12', name: 'M12' }, { id: 'SG14', name: 'M14' }] }] };
  if (/sponds\//.test(url)) {
    const sg = (url.match(/subgroupId=([^&]+)/) || [])[1];
    return { code: 200, body: sg === 'SG12' ? [evE12, evBoth] : sg === 'SG14' ? [evE14, evBoth] : sg === 'SG10' ? [{ id: 'E10', heading: 'Plateau M10', startTimestamp: J5 }] : [] };
  }
  return { code: 404, body: {} };
}
function setup3(opts) {
  const x = makeEnv(Object.assign({ spond: http3 }, opts || {})); x.installer();
  const code = x._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
  const adm = x.call({ action: 'adultLogin', code }).token;
  const cc = x.call({ action: 'addEduc', token: adm, nom: 'Cyril' }).code;
  const cy = x.call({ action: 'adultLogin', code: cc }).token, PP = {};
  ['Tom', 'Léa'].forEach(n => { PP[n] = x.call({ action: 'addPlayer', token: adm, prenom: n }).joueur.id; });
  return { x, adm, cy, PP };
}
let S3 = setup3();
g = S3.x;
r = g.call({ action: 'compos', token: S3.adm });
assert.strictEqual(r.spond.branche, false); assert.strictEqual(r.spond.possible, true); assert.strictEqual(r.spond.compte, null);
r = g.call({ action: 'spondConnexion', token: S3.cy, email: EMAIL, mdp: MDP }); assert.strictEqual(r.error, 'interdit', 'un éduc non admin ne branche pas Spond');
r = g.call({ action: 'spondConnexion', token: S3.adm, email: 'pas-un-mail', mdp: MDP }); assert.strictEqual(r.error, 'invalide');
r = g.call({ action: 'spondConnexion', token: S3.adm, email: EMAIL, mdp: 'faux-' + MDP });
assert.strictEqual(r.error, 'spond'); assert.ok(/refuse/.test(r.message), r.message); assert.ok(r.message.indexOf(MDP) < 0);
assert.ok(!('SPOND_MDP' in g._props) && !('SPOND_EMAIL' in g._props), 'mot de passe refusé : rien n\'est gardé');
r = g.call({ action: 'spondConnexion', token: S3.adm, email: EMAIL, mdp: MDP });
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compte.email, 'c•••@example.org'); assert.strictEqual(r.compte.parQui, 'Admin'); assert.strictEqual(r.avertissement, '');
assert.deepStrictEqual(r.categories.map(c => [c.nom, c.coach, c.suivie]), [['M10', false, false], ['M12', true, true], ['M14', true, true]], 'les catégories dont le compte est coach sont suivies');
assert.strictEqual(r.info.evenements, 3, 'E12 + E14 + le rassemblement commun (une seule fois)');
assert.strictEqual(r.info.membres, 4, 'Tom, Léa, Sam, Max : ni les adultes, ni les M10');
assert.strictEqual(g._triggers.length, 1, 'synchro toutes les heures programmée');
assert.ok(!JSON.stringify(r).includes(MDP), 'le mot de passe ne revient jamais au navigateur');
r = g.call({ action: 'compos', token: S3.adm });
assert.strictEqual(r.spond.branche, true); assert.strictEqual(r.spond.compte.email, 'c•••@example.org');
const eb = r.evenements.find(e => e.id === 'sp-EB'), e12 = r.evenements.find(e => e.id === 'sp-E12');
assert.strictEqual(eb.categorie, 'M12, M14'); assert.strictEqual(r.evenements.find(e => e.id === 'sp-E14').categorie, 'M14');
assert.deepStrictEqual(e12.presents, [S3.PP.Tom]); assert.deepStrictEqual(e12.inconnus, ['Sam N.'], 'Julien (adulte) n\'est pas listé ; Sam (enfant pas encore dans l\'appli) oui');
assert.deepStrictEqual(r.spond.membres.map(m => [m.prenom, m.nomFamille, m.categorie, !!m.lie]), [['Léa', 'Roux', 'M12', true], ['Max', 'Quatorze', 'M14', false], ['Sam', 'Neuf', 'M12', false], ['Tom', 'Martin', 'M12', true]]);
// le mot de passe n'est nulle part ailleurs que dans la propriété SPOND_MDP
const partout = JSON.stringify(Object.keys(g._sheets).map(k => g._sheets[k])) + JSON.stringify(g._cache) + g._logs.join('\n') +
  JSON.stringify(Object.keys(g._props).filter(k => k !== 'SPOND_MDP').map(k => g._props[k]));
assert.ok(partout.indexOf(MDP) < 0, 'mot de passe trouvé hors de SPOND_MDP');
assert.strictEqual(g._props.SPOND_MDP, MDP);
// choisir les catégories suivies (admin) : seulement M12 → les événements M14 disparaissent, le commun reste
r = g.call({ action: 'spondCategories', token: S3.cy, ids: ['SG12'] }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'spondCategories', token: S3.adm, ids: ['SG12'] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.categories.filter(c => c.suivie).map(c => c.nom), ['M12']);
assert.strictEqual(r.info.evenements, 2); assert.strictEqual(r.info.membres, 3);
r = g.call({ action: 'compos', token: S3.adm });
assert.ok(!r.evenements.some(e => e.id === 'sp-E14'), 'l\'événement M14 n\'est plus suivi : il disparaît (pas « annulé »)');
assert.strictEqual(r.evenements.find(e => e.id === 'sp-EB').annule, false);
// ajouter un enfant de Spond dans l'appli : relié tout de suite, une seule fois
r = g.call({ action: 'addPlayer', token: S3.cy, prenom: 'Sam', familleNom: 'Famille Neuf', spondId: 'k-sam' });
assert.ok(r.ok && r.code && r.familleCode, JSON.stringify(r));
const samId = r.joueur.id;
r = g.call({ action: 'addPlayer', token: S3.cy, prenom: 'Sam', spondId: 'k-sam' }); assert.strictEqual(r.error, 'deja');
r = g.call({ action: 'compos', token: S3.adm });
assert.strictEqual(r.spond.membres.find(m => m.id === 'k-sam').lie, samId);
r = g.call({ action: 'syncSpond', token: S3.cy });
r = g.call({ action: 'compos', token: S3.adm });
assert.deepStrictEqual(r.evenements.find(e => e.id === 'sp-E12').presents, [S3.PP.Tom, samId]);
// débrancher (admin) : identifiants, catégories et synchro automatique oubliés
r = g.call({ action: 'spondDeconnexion', token: S3.cy }); assert.strictEqual(r.error, 'interdit');
r = g.call({ action: 'spondDeconnexion', token: S3.adm }); assert.ok(r.ok, JSON.stringify(r));
['SPOND_EMAIL', 'SPOND_MDP', 'SPOND_SOUS_GROUPES'].forEach(k => assert.ok(!(k in g._props), k + ' effacé'));
assert.strictEqual(g._triggers.length, 0);
r = g.call({ action: 'compos', token: S3.adm });
assert.strictEqual(r.spond.branche, false); assert.strictEqual(r.spond.compte, null); assert.deepStrictEqual(r.spond.categories, []);
r = g.call({ action: 'syncSpond', token: S3.adm }); assert.strictEqual(r.error, 'spond');
// le propriétaire n'a pas encore autorisé les déclencheurs : Spond est branché, l'appli dit quoi faire
S3 = setup3({ sansDeclencheur: true }); g = S3.x;
r = g.call({ action: 'spondConnexion', token: S3.adm, email: EMAIL, mdp: MDP });
assert.ok(r.ok, JSON.stringify(r)); assert.ok(/autoriserSpond/.test(r.avertissement), r.avertissement); assert.strictEqual(r.compte.declencheur, false);
// sans le fichier spond.gs (ou en mode démo) : indisponible, avec l'explication
({ g, nico } = setup());
r = g.call({ action: 'spondConnexion', token: nico, email: EMAIL, mdp: MDP });
assert.strictEqual(r.error, 'indispo'); assert.ok(/démo|autoriserSpond/.test(r.message), r.message);
r = g.call({ action: 'compos', token: nico }); assert.strictEqual(r.spond.possible, false);
console.log('COMPOS CORE OK');
