// (v63) La compo publiée en texte, pour la partager entre éducs (WhatsApp) : prénoms et postes seulement, les absents à part.
// Lancer : node tests/test_partage.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = '/home/claude/mode-champion/js';
vm.runInContext(fs.readFileSync(path.join(ROOT, 'compos.js'), 'utf8'), ctx, { filename: 'compos.js' });
const K = ctx.MC.compos;
const F = {}; ['Léo', 'Gabin', 'Adam', 'Tom', 'Nina', 'Louise', 'Sacha', 'Inès', 'Lou', 'Hugo', 'Zoé'].forEach((p) => { F[p] = { id: p, prenom: p, niveau: 'A', plaquage: 3, copains: ['Léo'], passerelles: ['B'] }; });
const j = (id, poste) => ({ id, poste: poste || '' });

// ----- jeu à 10 : une ligne par poste, dans l'ordre des postes ; sans poste à la fin ; les absents sortent de l'équipe -----
const c10 = { reglages: { format: 10 }, banc: ['Zoé'], equipes: [
  { id: 'A1', niveau: 'A', joueurs: [j('Nina', 'demi-de-melee'), j('Léo', 'pilier'), j('Gabin', 'pilier'), j('Adam', 'talonneur'), j('Tom', 'troisieme-ligne'), j('Louise', 'ouvreur'), j('Hugo', 'ailier')] },
  { id: 'B1', niveau: 'B', joueurs: [j('Sacha', 'centre'), j('Inès', 'ailier'), j('Lou', '')] }] };
let t = K.texteCompo(c10, F, { titre: 'Plateau 3 - Muret', quand: 'ven. 11 déc. · 09h', absent: (id) => id === 'Hugo' });
assert.strictEqual(t, [
  '*Plateau 3 - Muret* · ven. 11 déc. · 09h', 'Compo · jeu à 10', '',
  '*Équipe A1* (6)', 'Piliers : Léo, Gabin', 'Talonneur : Adam', '3e ligne : Tom', '9 : Nina', '10 : Louise', '',
  '*Équipe B1* (3)', 'Centre : Sacha', 'Ailier : Inès', 'Sans poste : Lou', '',
  'Pas placés : Zoé', '', 'Absents : Hugo'].join('\n'));
assert.ok(!/plaquage|copain|passerelle|⇅|\b3\b(?!e)/.test(t.split('\n').slice(2).join('\n').replace(/\(\d+\)/g, '')), 'ni plaquage, ni copains, ni passerelles dans le texte');

// ----- jeu à 5 : les prénoms sur une ligne -----
t = K.texteCompo({ reglages: { format: 5 }, banc: [], equipes: [{ id: 'A1', joueurs: [j('Léo'), j('Nina')] }, { id: 'C1', joueurs: [] }] }, F, {});
assert.strictEqual(t, ['Compo · jeu à 5', '', '*Équipe A1* (2)', 'Léo, Nina', '', '*Équipe C1* (0)', '—'].join('\n'));

// ----- ateliers : des groupes, sans postes, même au jeu à 10 ; matchs : « Équipe 1 » sans la répéter -----
t = K.texteCompo({ reglages: { partie: 'ateliers', format: 10 }, equipes: [{ id: 'A1', joueurs: [j('Léo', 'pilier')] }, { id: 'B+C', joueurs: [j('Lou')] }] }, F, { titre: 'Entraînement' });
assert.strictEqual(t, ['*Entraînement*', 'Groupes des ateliers', '', '*Groupe A1* (1)', 'Léo', '', '*Groupe B+C* (1)', 'Lou'].join('\n'));
t = K.texteCompo({ reglages: { partie: 'matchs', format: 10 }, equipes: [{ id: 'E1', nom: 'Équipe 1', joueurs: [j('Léo', 'pilier')] }] }, F, {});
assert.strictEqual(t, ['Matchs · jeu à 10', '', '*Équipe 1* (1)', 'Pilier : Léo'].join('\n'));

// ----- un joueur inconnu, une compo vide : pas d'erreur -----
assert.strictEqual(K.texteCompo({ reglages: {}, equipes: [{ id: 'A1', joueurs: [j('zz')] }] }, F), ['Compo · jeu à 5', '', '*Équipe A1* (1)', '?'].join('\n'));
assert.strictEqual(K.texteCompo(null, F), 'Compo · jeu à 5');
console.log('test_partage : OK');
