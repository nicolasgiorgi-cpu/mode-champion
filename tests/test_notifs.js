// (v33) La cloche : quels événements pour l'éduc, le parent et l'enfant ; lu / non lu ; réglages ; parties fermées en V1.
// Lancer : node tests/test_notifs.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const ROOT = __dirname + '/../js/';
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions', 'competences', 'notifs']) vm.runInContext(fs.readFileSync(ROOT + f + '.js', 'utf8'), ctx, { filename: f });
const J = x => JSON.parse(JSON.stringify(x));
const MC = ctx.MC, N = MC.notifs;
MC.logic._setToday('2026-10-31');
function stock() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; }
const NOW = Date.parse('2026-10-31T12:00:00Z'), H = 3600000, iso = t => new Date(t).toISOString();
const ids = l => l.map(e => e.id);

// ---------- les catégories : en V1, rien des parties fermées pour les familles ; tout pour les éducs ----------
assert.deepStrictEqual(J(N.cats('e').map(c => c.id)), ['seance', 'bilan', 'mission', 'etoile', 'niveau', 'compo']);
// (v36) les bravos des éducs : une sorte ouverte aux familles dès le départ (la prépa n'est jamais fermée)
assert.deepStrictEqual(J(N.cats('f').map(c => c.id)), ['seance', 'bravo', 'confirmer', 'mission', 'niveau']);
assert.deepStrictEqual(J(N.cats('k').map(c => c.id)), ['resultat', 'bravo', 'nouvelle', 'niveau']);

// ---------- ÉDUC ----------
const moi = { id: 'ed1', nom: 'Nico', admin: true, enfants: [] };
function joueur(id, prenom, extra) { return Object.assign({ joueur: { id, prenom, actif: true }, seances: [], records: [], journal: [], missions: [], etoiles: [], encouragements: [], demandes: [] }, extra || {}); }
const g = { moi, defmissions: [{ id: 'q1', sorte: 'qcm', titre: 'Le hors-jeu', statut: 'active', cree: iso(NOW - 50 * H) }], joueurs: [
  joueur('j1', 'Léo', {
    seances: [{ id: 's1', type: 'cros', date: '2026-10-31', cree: iso(NOW - 2 * H) }],
    records: [{ id: 'r1', bilan: '1', test: 'saut', statut: 'ok', cree: iso(NOW - 3 * H) }, { id: 'r2', bilan: '1', test: 'flamant', statut: 'ok', cree: iso(NOW - 3 * H + 5000) },
      { id: 'r3', bilan: 'defi', test: 'saut', statut: 'ok', cree: iso(NOW - 4 * H) }],
    missions: [{ id: 'm1', mission: 'jeu10', reponses: { postes: ['centre'], copainsFait: true, message: 'Je veux <b>jouer</b> & gagner' }, maj: iso(NOW - 5 * H) },
      { id: 'm2', mission: 'q1', faite: true, reponses: { ans: [0, 1], score: 1, total: 2 }, maj: iso(NOW - 6 * H) }],
    demandes: [{ id: 'd1', domaine: 'plaquage', etoile: 'epaule', sorte: 'gagner', statut: 'attente', cree: iso(NOW - 7 * H) }],
    journal: [{ id: 'n1', type: 'niveau', data: { cle: 'pompes', de: 2, a: 3 }, cree: iso(NOW - 8 * H) },
      { id: 'n2', type: 'niveau_adulte', data: { changes: { susp: { de: 1, a: 2 } }, par: 'Parent' }, cree: iso(NOW - 9 * H) },
      { id: 'n3', type: 'niveau_adulte', data: { changes: { susp: { de: 2, a: 1 } }, par: 'Éduc Nico' }, cree: iso(NOW - 9 * H) },
      { id: 'n4', type: 'premiers_pas', data: {}, cree: iso(NOW - 9 * H) }]
  }),
  joueur('j2', 'Zoé', { joueur: { id: 'j2', prenom: 'Zoé', actif: false }, seances: [{ id: 's9', type: 'dupont', cree: iso(NOW - H) }] })
] };
const cd = { educs: [{ id: 'ed1', nom: 'Nico' }, { id: 'ed2', nom: 'Cyril' }],
  evenements: [{ id: 'ev1', titre: 'Plateau Lézat', debut: '2026-11-08T10:00:00', sorte: 'plateau' }],
  compos: [
    { id: 'c1', evenementId: 'ev1', partie: '', auteur: 'ed2', auteurNom: 'Cyril', statut: 'vote', votes: {}, cree: iso(NOW - 10 * H), maj: iso(NOW - 10 * H) },
    { id: 'c2', evenementId: 'ev1', partie: 'ateliers', auteur: 'ed1', auteurNom: 'Nico', statut: 'vote', votes: { ed1: 0, ed2: 1 }, cree: iso(NOW - 11 * H), maj: iso(NOW - 1 * H) },
    { id: 'c3', evenementId: 'ev1', partie: 'matchs', auteur: 'ed1', auteurNom: 'Nico', statut: 'publiee', votes: {}, cree: iso(NOW - 12 * H), maj: iso(NOW - 12 * H) }],
  avis: [{ id: 'a1', compoId: 'c3', auteur: 'ed2', auteurNom: 'Cyril', statut: 'attente', cree: iso(NOW - 13 * H) },
    { id: 'a2', compoId: 'c1', auteur: 'ed1', auteurNom: 'Nico', statut: 'acceptee', parQui: 'Cyril', cree: iso(NOW - 14 * H), maj: iso(NOW - 2 * H) },
    { id: 'a3', compoId: 'c3', auteur: 'ed2', auteurNom: 'Cyril', statut: 'retiree', cree: iso(NOW - 15 * H) }] };
assert.strictEqual(N.events('e', { group: g, compos: null }), null, 'sans les compos : rien (elles compteraient toutes comme nouvelles en arrivant)');
assert.strictEqual(N.events('e', { group: null, compos: cd }), null, 'sans le groupe : rien');
let ev = N.events('e', { group: g, compos: cd });
const byId = {}; ev.forEach(e => { byId[e.id] = e; });
assert.ok(byId['s:s1'] && byId['s:s1'].cat === 'seance' && /Léo<\/b> a fait la séance de Cros/.test(byId['s:s1'].txt), 'la séance de Léo');
assert.ok(!byId['s:s9'], 'pas les enfants désactivés');
assert.ok(byId['b:j1:1'] && /Bilan 1 \(2 résultats\)/.test(byId['b:j1:1'].txt), 'un bilan = une ligne (toujours la même), avec le nombre de résultats');
assert.ok(byId['r:r3'] && /défi : Saut/.test(byId['r:r3'].txt), 'un défi = une ligne');
const m1 = ev.filter(e => e.id.indexOf('m:m1:') === 0)[0];
assert.ok(m1 && /Choisis ton poste » et « Avec qui tu aimes jouer/.test(m1.txt), 'poste et copains');
assert.ok(m1.txt.indexOf('<b>jouer</b>') < 0 && m1.txt.indexOf('&lt;b&gt;jouer&lt;/b&gt; &amp; gagner') > 0, 'le mot pour les éducs est échappé (pas de HTML d\'un enfant)');
assert.ok(ev.some(e => e.id.indexOf('m:m2:') === 0 && /Le hors-jeu » \(1\/2\)/.test(e.txt)), 'une réponse au QCM, avec le score');
assert.ok(byId['d:d1'] && byId['d:d1'].cat === 'etoile' && /demande l'étoile « Épaule »/.test(byId['d:d1'].txt), 'une demande d\'étoile');
assert.ok(byId['n:n1'] && /passe en N3 : Pompes/.test(byId['n:n1'].txt), 'un niveau changé par l\'enfant');
assert.ok(byId['n:n2'] && /par sa famille/.test(byId['n:n2'].txt), 'par la famille');
assert.ok(!byId['n:n3'], 'pas ceux que j\'ai changés moi-même');
assert.ok(!byId['n:n4'], 'pas les autres lignes du journal');
assert.ok(byId['cv:c1'] && /Cyril<\/b> demande votre vote sur la compo du plateau « Plateau Lézat » du 08\/11/.test(byId['cv:c1'].txt), 'un vote demandé par un autre éduc');
assert.ok(!byId['cv:c2'], 'pas mon propre vote');
assert.ok(byId['vo:c2:ed2'] && /Cyril<\/b> a voté sur la compo des ateliers/.test(byId['vo:c2:ed2'].txt) && byId['vo:c2:ed2'].t === 0, 'un vote sur ma compo (sans heure : celle où on le voit)');
assert.ok(!byId['vo:c2:ed1'], 'pas mon vote');
assert.ok(byId['av:a1'] && /propose de modifier la compo des matchs/.test(byId['av:a1'].txt), 'une contre-proposition');
assert.ok(byId['ar:a2:acceptee'] && /Cyril<\/b> a accepté votre contre-proposition/.test(byId['ar:a2:acceptee'].txt), 'la réponse à ma contre-proposition');
assert.ok(!byId['av:a3'], 'pas les contre-propositions retirées');
assert.ok(ev.every(e => typeof e.href === 'string' && e.href.charAt(0) === '#'), 'chaque ligne mène à un écran');

// ---------- lu / non lu, réglages ----------
let st = stock();
let E = N.etat('e', 'ed1', ev, NOW, st);
assert.strictEqual(E.n, 0, '1re fois sur l\'appareil : tout est déjà « lu » (pas d\'avalanche)');
assert.ok(E.list.length === ev.length, 'mais tout est dans la liste');
assert.ok(E.list[0].quand >= E.list[E.list.length - 1].quand, 'du plus récent au plus ancien');
const s2 = { id: 's2', type: 'meafou', cree: iso(NOW + H) };
g.joueurs[0].seances.push(s2);
ev = N.events('e', { group: g, compos: cd });
E = N.etat('e', 'ed1', ev, NOW + H + 60000, st);
assert.strictEqual(E.n, 1, 'une nouvelle séance : 1 non lue');
assert.strictEqual(E.list[0].id, 's:s2', 'les nouvelles en haut');
assert.ok(E.list[0].nouveau && !E.list[1].nouveau);
E = N.etat('e', 'ed1', ev, NOW + H + 120000, st);
assert.strictEqual(E.n, 1, 'toujours non lue tant que la cloche n\'est pas ouverte');
N.marquerLu('e', 'ed1', NOW + H + 180000, st);
E = N.etat('e', 'ed1', ev, NOW + H + 240000, st);
assert.strictEqual(E.n, 0, 'cloche ouverte : tout est lu');
// un résultat qui apparaît tard (confirmé par la famille) avec une vieille heure : nouveau quand même
g.joueurs[0].records.push({ id: 'r4', bilan: 'defi', test: 'flamant', statut: 'ok', cree: iso(NOW - 20 * 24 * H) });
ev = N.events('e', { group: g, compos: cd });
E = N.etat('e', 'ed1', ev, NOW + 2 * H, st);
assert.strictEqual(E.n, 1, 'arrivé après coup : compté comme nouveau');
assert.strictEqual(E.list[0].id, 'r:r4');
// réglages : éteindre les bilans
N.regler('e', 'ed1', 'bilan', false, st);
E = N.etat('e', 'ed1', ev, NOW + 2 * H, st);
assert.strictEqual(E.n, 0, 'bilans éteints : plus comptés');
assert.ok(!E.list.some(e => e.cat === 'bilan'), 'ni montrés');
assert.deepStrictEqual(J(N.reglages('e', 'ed1', st)), { bilan: 1 });
N.regler('e', 'ed1', 'bilan', true, st);
assert.strictEqual(N.etat('e', 'ed1', ev, NOW + 2 * H, st).n, 1, 'rallumés : la nouveauté revient');
// 30 jours : les vieux événements déjà lus sortent de la liste
g.joueurs[0].seances.push({ id: 'svieux', type: 'cros', cree: iso(NOW - 40 * 24 * H) });
ev = N.events('e', { group: g, compos: cd });
N.marquerLu('e', 'ed1', NOW + 3 * H, st);
E = N.etat('e', 'ed1', ev, NOW + 3 * H, st);
assert.ok(!E.list.some(e => e.id === 's:svieux'), 'plus de 30 jours : pas dans la liste');
// le stockage d'un autre profil n'est pas touché
assert.deepStrictEqual(Object.keys(st._m), ['mc-notif:e:ed1']);

// ---------- PARENT ----------
const fam = { famille: { id: 'f1', nom: 'Famille' }, enfants: [
  { joueur: { id: 'k1', prenom: 'Tom' }, seances: [{ id: 'ps1', type: 'capuozzo', cree: iso(NOW - H) }],
    records: [{ id: 'pr1', bilan: '1', test: 'saut', statut: 'attente', cree: iso(NOW - 2 * H) }],
    missions: [{ id: 'pm1', mission: 'jeu10', reponses: { postes: ['ailier'], copainsFait: true }, maj: iso(NOW - 3 * H) }],
    journal: [{ id: 'pn1', type: 'niveau_adulte', data: { changes: { pompes: { de: 1, a: 2 } }, par: 'Parent' }, cree: iso(NOW - 4 * H) },
      { id: 'pn2', type: 'niveau_adulte', data: { changes: { pompes: { de: 2, a: 3 } }, par: 'Éduc Cyril' }, cree: iso(NOW - 5 * H) }],
    etoiles: [{ id: 'pe1', domaine: 'plaquage', etoile: 'epaule', parNom: 'Cyril', cree: iso(NOW - 6 * H) }],
    encouragements: [{ id: 'px1', mot: 'Bravo', parNom: 'Cyril', cree: iso(NOW - 7 * H) }],
    defmissions: [{ id: 'q1', sorte: 'qcm', titre: 'Le hors-jeu', statut: 'active', cree: iso(NOW - 8 * H) }] },
  { joueur: { id: 'k2', prenom: 'Lou' }, seances: [], records: [], missions: [], journal: [], defmissions: [{ id: 'q1', sorte: 'qcm', titre: 'Le hors-jeu', statut: 'active', cree: iso(NOW - 8 * H) }] }] };
let pe = N.events('f', { family: fam });
const pid = {}; pe.forEach(e => { pid[e.id] = e; });
assert.ok(pid['s:ps1'] && pid['s:ps1'].href === '#/parent?k=k1&c=s-ps1', '(v37) la séance, avec l\'enfant à regarder et la séance à ouvrir');
assert.ok(pid['b:k1:1'] && /À confirmer/.test(pid['b:k1:1'].txt), 'le bilan à confirmer');
assert.ok(pid['m:pm1:poste'] && !pid['m:pm1:copains'], 'V1 : la mission du poste, pas celle des copains');
assert.ok(!pid['n:pn1'] && pid['n:pn2'], 'niveaux : ceux des éducs (pas les nôtres)');
assert.ok(!pid['e:pe1'] && !pid['x:px1'] && !pid['dm:q1'], 'V1 : ni étoiles, ni mots, ni missions des éducs');
fam.enfants[0].records[0].statut = 'ok';
assert.ok(!/À confirmer/.test(N.events('f', { family: fam }).filter(e => e.id === 'b:k1:1')[0].txt), 'confirmé : plus « à confirmer », même ligne');

// ---------- ENFANT ----------
const me = { joueur: { id: 'k1', prenom: 'Tom' }, seances: [], journal: [{ id: 'kn1', type: 'niveau_adulte', data: { changes: { pompes: { de: 1, a: 2 } }, par: 'Parent' }, cree: iso(NOW - H) }],
  records: [{ id: 'kr1', bilan: '1', test: 'saut', statut: 'attente', cree: iso(NOW - 2 * H) }, { id: 'kr2', bilan: '1', test: 'flamant', statut: 'attente', cree: iso(NOW - 2 * H) }],
  missions: [], defmissions: [], etoiles: [{ id: 'ke1', domaine: 'plaquage', etoile: 'epaule', cree: iso(NOW - 3 * H) }], encouragements: [], demandes: [] };
let ke = N.events('k', { me });
assert.ok(!ke.some(e => e.cat === 'resultat'), 'rien de confirmé : pas de notification');
assert.ok(ke.some(e => e.id === 'nm:poste' && /Choisis ton poste/.test(e.txt)), 'la mission « Choisis ton poste » à faire');
assert.ok(ke.some(e => e.id === 'n:kn1' && /par ta famille/.test(e.txt)), 'niveau changé par la famille');
assert.ok(!ke.some(e => e.cat === 'etoile'), 'V1 : pas d\'étoiles');
st = stock();
N.etat('k', 'k1', ke, NOW, st);                       // 1re fois : rien de nouveau
me.records[0].statut = 'ok'; me.records[0].parQui = 'Parent';
ke = N.events('k', { me });
E = N.etat('k', 'k1', ke, NOW + 60000, st);
assert.strictEqual(E.n, 0, 'dans les 3 premières minutes : ce qui date d\'avant est encore « lu » (la réponse fraîche du serveur arrive après la copie gardée)');
st = stock();
me.records[0].statut = 'attente';
N.etat('k', 'k1', N.events('k', { me }), NOW, st);
me.records[0].statut = 'ok';
E = N.etat('k', 'k1', N.events('k', { me }), NOW + 5 * 60000, st);
assert.strictEqual(E.n, 1, 'après : 1 résultat confirmé = 1 nouvelle');
assert.ok(/Bilan 1<\/b> : 1 résultat confirmé par ta famille/.test(E.list[0].txt), E.list[0].txt);
assert.strictEqual(E.list[0].quand, NOW + 5 * 60000, 'sans heure dans les données : l\'heure où on l\'a vu');
me.records[1].statut = 'refuse'; me.records[1].parQui = 'Éduc Cyril';
E = N.etat('k', 'k1', N.events('k', { me }), NOW + 6 * 60000, st);
assert.strictEqual(E.n, 1, 'le 2e résultat (refusé) : la ligne du bilan est remplacée par une nouvelle');
assert.strictEqual(E.list.filter(e => e.cat === 'resultat').length, 1, 'une seule ligne par bilan');
assert.ok(E.list.some(e => /1 résultat confirmé, 1 refusé par Cyril/.test(e.txt)));

// ---------- pas d'avalanche : réglages avant la 1re cloche, sorte qui apparaît, stockage borné ----------
st = stock();
N.regler('k', 'k1', 'niveau', false, st);            // les réglages touchés avant la 1re cloche
E = N.etat('k', 'k1', N.events('k', { me }), NOW + 3600000, st);
assert.strictEqual(E.n, 0, 'réglages avant la 1re cloche : pas d\'avalanche');
assert.ok(!E.list.some(e => e.cat === 'niveau'), 'et le réglage est gardé');
st = stock();
N.marquerLu('k', 'k1', NOW, st);
assert.strictEqual(N.etat('k', 'k1', N.events('k', { me }), NOW + 3600000, st).n, 0, 'marquer lu avant la 1re cloche : pas d\'avalanche');
// une partie qui s'ouvre aux familles (Skills) : les étoiles données en avance ne sont pas « nouvelles »
st = stock();
N.etat('k', 'k1', N.events('k', { me }), NOW, st);
ctx.__MC_TOUT = true;
E = N.etat('k', 'k1', N.events('k', { me }), NOW + 3600000, st);
assert.ok(E.list.some(e => e.id === 'e:ke1') && !E.list.filter(e => e.id === 'e:ke1')[0].nouveau, 'Skills ouverts : l\'étoile d\'avant est dans la liste, pas en « nouveau »');
me.etoiles.push({ id: 'ke2', domaine: 'plaquage', etoile: 'joue', cree: iso(NOW + 2 * 3600000) });
E = N.etat('k', 'k1', N.events('k', { me }), NOW + 3 * 3600000, st);
assert.ok(E.list.filter(e => e.id === 'e:ke2')[0].nouveau, 'une étoile validée ensuite : nouvelle');
ctx.__MC_TOUT = false;
// le stockage ne garde ni les vieux événements (> 45 jours), ni ceux qui n'existent plus
st = stock();
const vieux = joueur('j9', 'Ana', { seances: Array.from({ length: 300 }, (_, i) => ({ id: 'v' + i, type: 'cros', cree: iso(NOW - (50 + i) * 24 * H) })) });
const g2 = { moi, defmissions: [], joueurs: [vieux] };
N.etat('e', 'ed1', N.events('e', { group: g2, compos: { compos: [], avis: [], evenements: [], educs: [] } }), NOW, st);
assert.strictEqual(Object.keys(JSON.parse(st._m['mc-notif:e:ed1']).vus).length, 0, 'les séances de plus de 45 jours ne sont pas gardées');
vieux.seances.push({ id: 'neuve', type: 'cros', cree: iso(NOW + 10 * 60000) });
E = N.etat('e', 'ed1', N.events('e', { group: g2, compos: { compos: [], avis: [], evenements: [], educs: [] } }), NOW + 20 * 60000, st);
assert.strictEqual(E.n, 1, 'mais une nouvelle séance, oui');
vieux.seances.pop();
N.etat('e', 'ed1', N.events('e', { group: g2, compos: { compos: [], avis: [], evenements: [], educs: [] } }), NOW + 30 * 60000, st);
assert.strictEqual(Object.keys(JSON.parse(st._m['mc-notif:e:ed1']).vus).length, 0, 'ce qui n\'existe plus est oublié');
// un vote déjà fait : plus de « demande votre vote »
cd.compos[0].votes = { ed1: 1 };
assert.ok(!N.events('e', { group: g, compos: cd }).some(e => e.id === 'cv:c1'), 'vote fait : plus de demande');

// ---------- (v36) les bravos des éducs pour une séance ----------
{
  const ses = [{ id: 'sb1', type: 'cros', date: '2026-10-30', cree: iso(NOW - 20 * H) }, { id: 'sb2', type: 'club', date: '2026-10-31', cree: iso(NOW - 3 * H) }];
  const bv = [{ id: 'bv1', seanceId: 'sb1', mot: '', parNom: 'Cyril', cree: iso(NOW - 2 * H), maj: iso(NOW - 2 * H) },
    { id: 'bv2', seanceId: 'sb2', mot: 'Top <b>match</b> & bravo', parNom: 'Julien', cree: iso(NOW - H), maj: iso(NOW - H / 2) }];
  const meB = { joueur: { id: 'k9', prenom: 'Nina' }, seances: ses, records: [], journal: [], bravos: bv };
  const kb = N.events('k', { me: meB }).filter(e => e.cat === 'bravo');
  assert.strictEqual(kb.length, 2, 'l\'enfant : une ligne par bravo');
  assert.strictEqual(kb.find(e => e.id === 'bv:bv1').txt, '👏 <b>Cyril</b> te dit bravo pour ta séance de Cros !');
  const k2 = kb.find(e => e.id === 'bv:bv2:m:' + bv[1].maj);
  assert.ok(k2 && /pour ton entraînement au club : « /.test(k2.txt), 'club : « ton entraînement au club », puis le mot', k2 && k2.txt);
  assert.ok(!/! :/.test(k2.txt), 'pas de « ! : » avec un mot');
  assert.ok(/« Top &lt;b&gt;match&lt;\/b&gt; &amp; bravo »/.test(k2.txt), 'le mot de l\'éduc, échappé');
  assert.strictEqual(k2.t, NOW - H / 2, 'un mot ajouté après coup : l\'heure du mot');
  // le lien : Ma semaine (carte des 7 derniers jours), sinon Ma progression (sous la séance)
  kb.forEach(e => assert.strictEqual(e.href, Date.now() - e.t < 6.5 * 86400000 ? '#/semaine?c=bravos' : '#/progression?c=s-' + bv.find(x => e.id.indexOf('bv:' + x.id) === 0).seanceId));
  // un mot changé : une nouvelle ligne (l'heure du mot dans l'identifiant)
  const k3 = N.events('k', { me: Object.assign({}, meB, { bravos: [Object.assign({}, bv[1], { mot: 'Autre', maj: iso(NOW) })] }) })[0];
  assert.ok(k3.id !== k2.id, 'mot changé : nouvelle ligne');
  const famB = { famille: { id: 'f9' }, enfants: [{ joueur: { id: 'k9', prenom: 'Nina' }, seances: ses, records: [], journal: [], missions: [], bravos: bv }] };
  const pb = N.events('f', { family: famB }).filter(e => e.cat === 'bravo');
  assert.strictEqual(pb.length, 2, 'la famille aussi');
  assert.strictEqual(pb.find(e => e.id === 'bv:bv1').txt, '👏 <b>Cyril</b> a dit bravo à <b>Nina</b> pour sa séance de Cros.');
  assert.ok(/pour son entraînement au club : « Top/.test(pb.find(e => e.id !== 'bv:bv1').txt), 'famille : le mot après « : »');
  assert.strictEqual(pb.find(e => e.id === 'bv:bv1').href, '#/parent?k=k9&c=s-sb1', '(v37) le bravo mène à la séance');
  // un bravo dont la séance n'est plus là : « sa séance », sans planter
  assert.ok(/pour ta séance !/.test(N.events('k', { me: Object.assign({}, meB, { seances: [] }) }).find(e => e.id === 'bv:bv1').txt));
  // l'éduc : le bouton « Bravo » sur chaque séance de la cloche
  const ge = N.events('e', { group: { moi, defmissions: [], joueurs: [joueur('k9', 'Nina', { seances: ses })] }, compos: { compos: [], avis: [], evenements: [], educs: [] } });
  const sl = ge.filter(e => e.cat === 'seance');
  assert.ok(sl.length === 2 && sl.every(e => e.bv && e.bv.j === 'k9' && e.bv.s && e.bv.s.id), 'chaque séance porte de quoi dire bravo');
  assert.ok(!ge.some(e => e.cat === 'bravo'), 'les éducs ne reçoivent pas les bravos des autres éducs dans la cloche');
  // pour() : les tournures
  assert.strictEqual(N.pour({ type: 'capuozzo' }, true), 'ta séance de Capuozzo');
  assert.strictEqual(N.pour({ type: 'recup' }, false), 'sa récup');
  assert.strictEqual(N.pour({ type: 'club', details: { match: true } }, true), 'ton match');
  assert.strictEqual(N.pour(null, false), 'sa séance');
}

// ---------- tout ouvert (plus tard) : les étoiles, les mots, les missions des éducs ----------
ctx.__MC_TOUT = true;
assert.deepStrictEqual(J(N.cats('k').map(c => c.id)), ['resultat', 'bravo', 'nouvelle', 'niveau', 'etoile', 'mots', 'demande']);
assert.deepStrictEqual(J(N.cats('f').map(c => c.id)), ['seance', 'bravo', 'confirmer', 'mission', 'niveau', 'skills', 'mots', 'nouvelle']);
pe = N.events('f', { family: fam });
assert.ok(pe.some(e => e.id === 'e:pe1') && pe.some(e => e.id === 'x:px1'), 'étoiles et mots');
assert.strictEqual(pe.filter(e => e.id === 'dm:q1').length, 1, 'une mission du groupe : une seule ligne même avec 2 enfants');
assert.ok(pe.some(e => e.id === 'm:pm1:copains'), 'et la mission des copains');
ke = N.events('k', { me });
assert.ok(ke.some(e => e.id === 'e:ke1' && /ton étoile « Épaule »/.test(e.txt)), 'l\'étoile validée');
ctx.__MC_TOUT = false;

console.log('test_notifs : OK');
