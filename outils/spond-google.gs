/* =========================================================
   Mode champion · M12 — SPOND (fichier à part : « spond.gs » dans le projet Apps Script)
   Lit les événements des catégories suivies et leurs réponses (lecture seule), toutes les heures.
   API non officielle (celle du site spond.com) : elle peut changer.

   Une seule fois, le propriétaire du script :
   1. Dans l'éditeur Apps Script : « + » à côté de Fichiers › Script, nommez-le « spond », collez ce fichier, enregistrez.
   2. En haut, choisissez la fonction « autoriserSpond » puis ▶ Exécuter : Google demande deux autorisations de plus
      (se connecter à un service externe, gérer les déclencheurs) : Autoriser.
   3. Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer.
   Ensuite, dans l'appli : l'engrenage › Spond. Un éduc administrateur y tape lui-même l'e-mail et le mot de passe de SON compte Spond.
   Ils sont gardés seulement dans les propriétés du script (SPOND_EMAIL, SPOND_MDP) : jamais dans la feuille, jamais réaffichés.
   L'appli suit les catégories (sous-groupes Spond) dont ce compte est coach ; l'admin peut changer ce choix.
   Synchro toutes les heures, et bouton « Actualiser » dans les onglets Entraîn. et Plateaux.
   (Pour brancher sans l'appli : remplir SPOND_EMAIL et SPOND_MDP dans Paramètres du projet › Propriétés du script,
   puis lancer « brancherSpond ».)
   ========================================================= */

var SPOND_API = 'https://api.spond.com/core/v1/';
// Aucun identifiant dans ce fichier : le dépôt GitHub est public.
// Les catégories suivies sont gardées dans la propriété du script SPOND_SOUS_GROUPES ([{ id, groupeId }]).
// Si le compte n'est coach d'aucun sous-groupe, on prend celui qui s'appelle « M12 » (comme avant).
var SPOND_NOM_SOUS_GROUPE = /^\s*m\s*-?\s*12\b/i;

function spondInfo_() {
  var p = PropertiesService.getScriptProperties();
  return { branche: !!(p.getProperty('SPOND_EMAIL') && p.getProperty('SPOND_MDP')) };
}

/** À LANCER UNE FOIS dans l'éditeur, par le propriétaire du script : Google demande les autorisations dont Spond a besoin. */
function autoriserSpond() {
  UrlFetchApp.fetch(SPOND_API, { method: 'get', muteHttpExceptions: true });
  ScriptApp.getProjectTriggers();
  Logger.log('Spond autorisé. Pensez à Déployer › Nouvelle version, puis branchez Spond dans l\'appli (engrenage › Spond).');
}

// connexion à Spond (deux adresses connues : Spond a changé la sienne en 2025) ; renvoie le jeton
function connexionSpond_(email, mdp) {
  var body = JSON.stringify({ email: email, password: mdp });
  var urls = [SPOND_API + 'auth2/login', SPOND_API + 'login'], dernier = '';
  for (var i = 0; i < urls.length; i++) {
    var r = UrlFetchApp.fetch(urls[i], { method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true });
    var code = r.getResponseCode(), o = null;
    try { o = JSON.parse(r.getContentText()); } catch (e) { o = null; }
    if (code >= 200 && code < 300 && o) {
      var tok = o.loginToken || (o.accessToken && (o.accessToken.token || o.accessToken)) || o.token;
      if (typeof tok === 'string' && tok) return tok;
      if (o.twoFactorRequired || o.phoneNumber || o.twoFactorToken) throw new Error('Spond demande un code de vérification (double authentification) pour ce compte.');
    }
    if (code === 401 || code === 403) throw new Error('Spond refuse l\'e-mail ou le mot de passe.');
    dernier = 'réponse ' + code;
  }
  throw new Error('connexion à Spond impossible (' + dernier + ')');
}

function spondToken_() {
  var cs = CacheService.getScriptCache(), t = cs.get('spond:token');
  if (t) return t;
  var p = PropertiesService.getScriptProperties();
  var email = p.getProperty('SPOND_EMAIL'), mdp = p.getProperty('SPOND_MDP');
  if (!email || !mdp) throw new Error('identifiants Spond absents : un éduc admin branche Spond dans l\'appli (engrenage › Spond)');
  var tok = connexionSpond_(email, mdp);
  cs.put('spond:token', tok, 3000);
  return tok;
}

function spondGet_(path, tok) {
  var r = UrlFetchApp.fetch(SPOND_API + path, { method: 'get', headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
  var code = r.getResponseCode();
  if (code === 401) { CacheService.getScriptCache().remove('spond:token'); throw new Error('session Spond expirée, réessayez'); }
  if (code >= 300) throw new Error('Spond répond ' + code);
  return JSON.parse(r.getContentText());
}

// ---------- qui coache quoi ----------
function idsDe_(l) { return (Array.isArray(l) ? l : []).map(function (x) { return String(x && typeof x === 'object' ? x.id : x); }); }
// l'id du profil du compte connecté (vide si l'API ne le donne pas)
function monProfil_(tok) {
  try { var p = spondGet_('profile', tok); return p && p.id ? String(p.id) : ''; } catch (e) { return ''; }
}
function estMoi_(m, moi) { return !!(moi && m && m.profile && String(m.profile.id) === moi); }
// un adulte du groupe (coach, dirigeant…) : c'est moi, ou il a un rôle, ou il a son propre profil sans parent rattaché
function estAdulte_(m, moi) {
  if (!m) return false;
  if (estMoi_(m, moi)) return true;
  if (Array.isArray(m.roles) && m.roles.length) return true;
  if (m.profile && m.profile.id && !(Array.isArray(m.guardians) && m.guardians.length)) return true;
  return false;
}
// un champ du genre « admins » (s'il existe) qui me cite
function meCite_(x, moi, mesIds) {
  return ['admins', 'adminIds', 'leaders', 'leaderIds', 'owners', 'coaches'].some(function (k) {
    return idsDe_(x && x[k]).some(function (id) { return id === moi || mesIds.indexOf(id) >= 0; });
  });
}
// toutes les catégories (sous-groupes) des groupes du compte ; coach = j'en suis membre moi-même, ou admin cité
function categoriesSpond_(groupes, moi) {
  var out = [];
  (groupes || []).forEach(function (g) {
    var miens = (g.members || []).filter(function (m) { return estMoi_(m, moi); }), mesIds = miens.map(function (m) { return String(m.id); });
    var sgMoi = {};
    miens.forEach(function (m) { idsDe_(m.subGroups).forEach(function (s) { sgMoi[s] = true; }); });
    (g.subGroups || []).forEach(function (sg) {
      var id = String(sg.id);
      out.push({ id: id, nom: String(sg.name || ''), groupeId: String(g.id), groupe: String(g.name || ''), coach: !!sgMoi[id] || meCite_(sg, moi, mesIds) });
    });
  });
  return out;
}
// les catégories suivies : celles choisies (SPOND_SOUS_GROUPES), sinon l'ancien réglage, sinon celles dont le compte est coach, sinon « M12 »
function suivies_(cats) {
  var p = PropertiesService.getScriptProperties(), choix = null;
  try { choix = JSON.parse(p.getProperty('SPOND_SOUS_GROUPES') || 'null'); } catch (e) { choix = null; }
  var ids = Array.isArray(choix) ? choix.map(function (c) { return String(c && c.id || c); }) : [];
  if (!ids.length && p.getProperty('SPOND_SOUS_GROUPE')) ids = [String(p.getProperty('SPOND_SOUS_GROUPE'))];
  var l = cats.filter(function (c) { return ids.indexOf(c.id) >= 0; });
  if (!l.length) l = cats.filter(function (c) { return c.coach; });
  if (!l.length) l = cats.filter(function (c) { return SPOND_NOM_SOUS_GROUPE.test(c.nom); });
  if (!l.length) throw new Error(cats.length ? 'ce compte n\'est coach d\'aucune catégorie Spond : choisissez-les dans l\'appli (engrenage › Spond)' : 'pas de groupe Spond pour ce compte');
  p.setProperty('SPOND_SOUS_GROUPES', JSON.stringify(l.map(function (c) { return { id: c.id, groupeId: c.groupeId }; })));
  return l;
}
function avecSuivie_(cats, suiv) {
  var ids = suiv.map(function (c) { return c.id; });
  return cats.map(function (c) { return { id: c.id, nom: c.nom, groupe: c.groupe, coach: c.coach, suivie: ids.indexOf(c.id) >= 0 }; });
}

// l'événement vise-t-il ce sous-groupe ? (sans l'info, on le garde : la demande filtre déjà le sous-groupe)
function pourSousGroupe_(e, sgid) {
  var rg = e && e.recipients && e.recipients.group;
  if (rg && Array.isArray(rg.subGroups) && rg.subGroups.length) {
    return rg.subGroups.some(function (s) { return String(s && s.id || s) === sgid; });
  }
  return true;
}

/** Lit Spond : les enfants des catégories suivies et leurs événements de J-30 à J+60, avec les réponses. */
function lireSpond_() {
  var tok = spondToken_();
  var groupes = spondGet_('groups/', tok) || [], moi = monProfil_(tok);
  var cats = categoriesSpond_(groupes, moi), suiv = suivies_(cats);
  var parId = {}; groupes.forEach(function (g) { parId[String(g.id)] = g; });
  var membres = [], vusM = {}, evenements = [], vusE = {};
  var min = new Date(Date.now() - 30 * 864e5).toISOString(), max = new Date(Date.now() + 60 * 864e5).toISOString();
  suiv.forEach(function (c) {
    var g = parId[c.groupeId];
    if (!g) return;
    // les enfants de la catégorie (les adultes : coachs, dirigeants… ne sont ni reliés ni listés)
    (g.members || []).forEach(function (m) {
      if (vusM[m.id] || estAdulte_(m, moi)) return;
      if (!idsDe_(m.subGroups).some(function (s) { return s === c.id; })) return;
      vusM[m.id] = true;
      membres.push({ id: m.id, prenom: m.firstName || '', nom: m.lastName || '', categorie: c.nom });
    });
    var q = 'sponds/?includeComments=false&addProfileInfo=false&scheduled=true&order=asc&max=200&groupId=' + c.groupeId + '&subgroupId=' + c.id +
      '&minEndTimestamp=' + encodeURIComponent(min) + '&maxEndTimestamp=' + encodeURIComponent(max);
    (spondGet_(q, tok) || []).forEach(function (e) {
      if (!pourSousGroupe_(e, c.id)) return;
      if (vusE[e.id]) { if (vusE[e.id].categorie.indexOf(c.nom) < 0) vusE[e.id].categorie += ', ' + c.nom; return; }
      var r = e.responses || {};
      var ev = {
        id: e.id, titre: e.heading || '', debut: e.startTimestamp || '', fin: e.endTimestamp || '', categorie: c.nom,
        lieu: (e.location && (e.location.feature || e.location.address)) || '', annule: !!(e.cancelled || e.canceled),
        acceptes: r.acceptedIds || [], refuses: r.declinedIds || [], sansReponse: (r.unansweredIds || []).concat(r.unconfirmedIds || []), attente: r.waitinglistIds || []
      };
      vusE[e.id] = ev; evenements.push(ev);
    });
  });
  return { membres: membres, evenements: evenements, categories: avecSuivie_(cats, suiv) };
}

// ---------- branché depuis l'appli (appelé par le serveur, pour un éduc admin) ----------
function declencheur_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'synchroSpond') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('synchroSpond').timeBased().everyHours(1).create();
}
/** Vérifie l'e-mail et le mot de passe auprès de Spond, les garde (propriétés du script), programme la synchro. */
function spondConnecter_(email, mdp) {
  var tok = connexionSpond_(email, mdp);              // erreur si Spond refuse : rien n'est gardé
  var p = PropertiesService.getScriptProperties();
  var avant = p.getProperty('SPOND_EMAIL');
  p.setProperty('SPOND_EMAIL', email);
  p.setProperty('SPOND_MDP', mdp);
  if (avant && avant !== email) { p.deleteProperty('SPOND_SOUS_GROUPES'); p.deleteProperty('SPOND_GROUPE'); p.deleteProperty('SPOND_SOUS_GROUPE'); }   // autre compte : autres catégories
  CacheService.getScriptCache().put('spond:token', tok, 3000);
  var ok = true, err = '';
  try { declencheur_(); } catch (e) { ok = false; err = String(e && e.message || e); }
  return { declencheur: ok, erreurDeclencheur: err };
}
/** Les catégories que l'appli suit (ids de sous-groupes parmi ceux du compte). */
function spondChoisir_(ids) {
  var tok = spondToken_(), cats = categoriesSpond_(spondGet_('groups/', tok) || [], monProfil_(tok));
  var l = cats.filter(function (c) { return ids.indexOf(c.id) >= 0; });
  if (!l.length) throw new Error('catégorie inconnue pour ce compte Spond');
  PropertiesService.getScriptProperties().setProperty('SPOND_SOUS_GROUPES', JSON.stringify(l.map(function (c) { return { id: c.id, groupeId: c.groupeId }; })));
  return avecSuivie_(cats, l);
}
/** Débrancher : on oublie l'e-mail, le mot de passe, les catégories, et la synchro automatique s'arrête. */
function spondDebrancher_() {
  var p = PropertiesService.getScriptProperties();
  ['SPOND_EMAIL', 'SPOND_MDP', 'SPOND_SOUS_GROUPES', 'SPOND_GROUPE', 'SPOND_SOUS_GROUPE'].forEach(function (k) { p.deleteProperty(k); });
  CacheService.getScriptCache().remove('spond:token');
  try { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'synchroSpond') ScriptApp.deleteTrigger(t); }); } catch (e) { /* pas autorisé : la synchro s'arrêtera faute d'identifiants */ }
  return true;
}

/** Synchro (lancée toutes les heures par le déclencheur, ou depuis l'éditeur). */
function synchroSpond() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var db = new SheetDB_();
  try {
    var info = Core.syncSpondDepuis(db, env_(), lireSpond_());
    Logger.log('Spond : ' + info.evenements + ' événements, ' + info.membres + ' enfants, ' + info.nouveauxLiens + ' nouveaux liens joueur ↔ Spond' +
      (info.joueursSansLien.length ? ' · joueurs sans lien Spond : ' + info.joueursSansLien.join(', ') : ''));
  } finally {
    try { db.flush_(); } catch (e) { /* le cache sera relu */ }
    lock.releaseLock();
  }
}

/** Sans l'appli : après avoir rempli SPOND_EMAIL et SPOND_MDP à la main, synchro toutes les heures + une synchro tout de suite. */
function brancherSpond() {
  declencheur_();
  Logger.log('Synchro Spond programmée toutes les heures.');
  synchroSpond();
}

/** Pour couper la synchro automatique (les identifiants restent). */
function debrancherSpond() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'synchroSpond') ScriptApp.deleteTrigger(t); });
  CacheService.getScriptCache().remove('spond:token');
  Logger.log('Synchro Spond arrêtée.');
}
