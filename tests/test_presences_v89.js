// (v89) Demande de Nicolas du 15/11/2026 : gérer la mise à jour des présences Spond dans les compos. Les compos se commencent
// souvent avant l'invitation Spond (avec tous les enfants) ; les réponses arrivent ensuite : voir qui a confirmé (✓), les absents
// à remplacer (✗) et ceux en attente (?).
// - serveur : une compo garde les réponses connues quand elle est enregistrée (reponses : { quand, pres, att, abs }) ; l'heure
//   d'envoi des invitations Spond est gardée sur l'événement (invitation) ;
// - la cloche des éducs : « X ne vient plus : à remplacer dans la compo… » pour un enfant placé qui a répondu non.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_presences_v89.js
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const { makeEnv } = require('./gas_mock.js');
const GID = 'G', SG = 'SG';
const members = ['Tom', 'Léa', 'Zoé', 'Malo'].map(p => ({ id: 'm-' + p, firstName: p, lastName: 'X' + p, subGroups: [SG] }));
let spondEvents = [];
function spondHttp(url) {
  if (/auth2\/login$/.test(url)) return { code: 200, body: { accessToken: { token: 'TOK' }, refreshToken: { token: 'R' } } };
  if (/groups\/$/.test(url)) return { code: 200, body: [{ id: GID, members, subGroups: [{ id: SG, name: 'M12' }] }] };
  if (/sponds\//.test(url)) return { code: 200, body: spondEvents };
  return { code: 404, body: {} };
}
const g = makeEnv({ spond: spondHttp }); g.installer();
const code = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let r = g.call({ action: 'adultLogin', code }); const nico = r.token;
const P = {};
['Tom', 'Léa', 'Zoé', 'Malo'].forEach(p => { r = g.call({ action: 'addPlayer', token: nico, prenom: p, familleNom: 'Famille ' + p }); P[p] = r.joueur.id; });
g._props.SPOND_EMAIL = 'nico@example.org'; g._props.SPOND_MDP = 'secret';
const jour = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const invit = jour(3) + 'T08:00:00.000Z';
// les invitations pas encore parties : personne n'a de réponse
spondEvents = [{ id: 'EV1', heading: 'Plateau 3 - Muret', startTimestamp: jour(10) + 'T08:00:00Z', inviteTime: invit, responses: {} }];
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok, JSON.stringify(r));
let ev = g.call({ action: 'compos', token: nico }).evenements.find(e => e.id === 'sp-EV1');
assert.strictEqual(ev.invitation, invit, 'l\'heure d\'envoi des invitations est gardée');
// la compo faite avec tout le groupe, avant les réponses : rien de connu
r = g.call({ action: 'saveCompo', token: nico, evenementId: 'sp-EV1', version: 0, banc: [], reglages: { format: 5, nb: { A: 0, B: 1, C: 0 } },
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['Tom', 'Léa', 'Zoé'].map(p => ({ id: P[p], poste: '' })) }] });
assert.ok(r.ok, JSON.stringify(r));
let c = r.compo;
assert.deepStrictEqual([c.reponses.pres, c.reponses.att, c.reponses.abs], [[], [], []], 'aucune réponse gardée avec la compo');
assert.ok(c.reponses.quand);
// les réponses arrivent : Tom oui, Léa non, Zoé pas répondu ; Malo (pas placé) oui
spondEvents[0].responses = { acceptedIds: ['m-Tom', 'm-Malo'], declinedIds: ['m-Léa'], unansweredIds: ['m-Zoé'] };
r = g.call({ action: 'syncSpond', token: nico }); assert.ok(r.ok);
r = g.call({ action: 'compos', token: nico });
c = r.compos.find(x => x.evenementId === 'sp-EV1');
assert.deepStrictEqual(c.reponses.pres, [], 'la compo garde les réponses du moment où elle a été enregistrée');
// l'éduc remplace Léa par Malo et enregistre : les réponses du moment sont gardées avec la nouvelle version
r = g.call({ action: 'saveCompo', token: nico, evenementId: 'sp-EV1', compoId: c.id, version: c.version, banc: [P['Léa']], reglages: c.reglages,
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['Tom', 'Malo', 'Zoé'].map(p => ({ id: P[p], poste: '' })) }] });
assert.ok(r.ok, JSON.stringify(r));
assert.deepStrictEqual(r.compo.reponses.pres.slice().sort(), [P.Tom, P.Malo].sort());
assert.deepStrictEqual(r.compo.reponses.abs, [P['Léa']]); assert.deepStrictEqual(r.compo.reponses.att, [P['Zoé']]);
// une correction à la main compte : Zoé retirée des présents = absente
g.call({ action: 'setEvenement', token: nico, id: 'sp-EV1', retraits: [P['Zoé']] });
c = r.compo;
r = g.call({ action: 'saveCompo', token: nico, evenementId: 'sp-EV1', compoId: c.id, version: c.version, banc: [P['Léa'], P['Zoé']], reglages: c.reglages,
  equipes: [{ id: 'B1', niveau: 'B', joueurs: ['Tom', 'Malo'].map(p => ({ id: P[p], poste: '' })) }] });
assert.deepStrictEqual(r.compo.reponses.abs.slice().sort(), [P['Léa'], P['Zoé']].sort());
assert.deepStrictEqual(r.compo.reponses.att, []);

// ---------- la cloche des éducs ----------
const ctx = { window: {}, console, Date, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'content', 'postes-data', 'core', 'logic', 'missions', 'competences', 'notifs']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx, { filename: f });
const N = ctx.MC.notifs; ctx.MC.logic._setToday('2026-11-15');
const joueur = (id, prenom) => ({ joueur: { id, prenom, actif: true }, seances: [], records: [], journal: [], missions: [], etoiles: [], encouragements: [], demandes: [] });
const grp = { moi: { id: 'ed1', nom: 'Nico' }, defmissions: [], joueurs: [joueur('j1', 'Léo'), joueur('j2', 'Tom'), joueur('j3', 'Sacha')] };
const cd = { educs: [{ id: 'ed1', nom: 'Nico' }], avis: [],
  evenements: [{ id: 'e1', titre: 'Plateau 2 bis - Lézat', debut: '2026-12-10T08:00:00Z', sorte: 'plateau', presents: ['j2'], absents: ['j1'], retraits: ['j3'], maj: '2026-11-15T10:00:00Z' },
    { id: 'e0', titre: 'Plateau passé', debut: '2026-11-01T08:00:00Z', sorte: 'plateau', presents: [], absents: ['j1'], maj: '2026-11-02T10:00:00Z' }],
  compos: [{ id: 'c1', evenementId: 'e1', statut: 'publiee', auteur: 'ed1', partie: '', equipes: [{ id: 'A1', joueurs: [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }] }], cree: '2026-11-13T10:00:00Z' },
    { id: 'c0', evenementId: 'e0', statut: 'publiee', auteur: 'ed1', partie: '', equipes: [{ id: 'A1', joueurs: [{ id: 'j1' }] }], cree: '2026-10-30T10:00:00Z' }] };
let L = N.events('e', { group: grp, compos: cd }).filter(x => /^ca:/.test(x.id));
assert.strictEqual(L.length, 1, 'une ligne pour la compo à venir, rien pour un plateau passé : ' + JSON.stringify(L));
assert.ok(/<b>Léo<\/b>, <b>Sacha<\/b> ne viennent plus : à remplacer dans la compo du plateau « Plateau 2 bis - Lézat » du 10\/12/.test(L[0].txt), L[0].txt);
assert.strictEqual(L[0].href, '#/educ/compo/e1');
// Sacha revient (ajouté à la main) : une autre ligne (Léo seul)
cd.evenements[0].ajouts = ['j3']; cd.evenements[0].retraits = [];
L = N.events('e', { group: grp, compos: cd }).filter(x => /^ca:/.test(x.id));
assert.ok(L.length === 1 && /^<b>Léo<\/b> ne vient plus/.test(L[0].txt) && L[0].id === 'ca:c1:j1', JSON.stringify(L));
// remplacé : plus de ligne
cd.compos[0].equipes[0].joueurs = [{ id: 'j2' }, { id: 'j3' }];
assert.strictEqual(N.events('e', { group: grp, compos: cd }).filter(x => /^ca:/.test(x.id)).length, 0);
console.log('test_presences_v89 : OK');
