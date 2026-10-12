/* ====== Mode champion · M12 — SPOND (2e fichier du projet Apps Script : « spond ») ====== */
/* Généré automatiquement : ne pas modifier ici, voir outils/spond-google.gs */

/* =========================================================
   Mode champion · M12 — SPOND (fichier à part : « spond.gs » dans le projet Apps Script)
   Lit les événements du sous-groupe M12 et leurs réponses (lecture seule), toutes les heures,
   avec le compte Spond de Nicolas. API non officielle (celle du site spond.com) : elle peut changer.

   Pour brancher Spond (une seule fois, Nicolas lui-même) :
   1. Dans l'éditeur Apps Script : « + » à côté de Fichiers › Script, nommez-le « spond », collez ce fichier, enregistrez.
   2. Paramètres du projet (roue dentée à gauche) › Propriétés du script › ajoutez
      SPOND_EMAIL = l'e-mail du compte Spond, SPOND_MDP = son mot de passe. Ils ne sortent jamais de Google.
   3. En haut, choisissez la fonction « brancherSpond » puis ▶ Exécuter. Google demande deux autorisations
      de plus (se connecter à un service externe, déclencheurs) : Autoriser. Le résultat s'affiche dans le journal.
   4. Déployer › Gérer les déploiements › crayon › Nouvelle version › Déployer.
   Ensuite : synchro toutes les heures, et bouton « Actualiser depuis Spond » dans l'onglet Compos.
   ========================================================= */

var SPOND_API = 'https://api.spond.com/core/v1/';
// Le groupe et le sous-groupe M12 sont trouvés tout seuls (le sous-groupe qui s'appelle « M12 ») puis gardés
// dans les propriétés du script SPOND_GROUPE et SPOND_SOUS_GROUPE (on peut aussi les y mettre à la main).
// Aucun identifiant dans ce fichier : le dépôt GitHub est public.
var SPOND_NOM_SOUS_GROUPE = /^\s*m\s*-?\s*12\b/i;

function spondInfo_() {
  var p = PropertiesService.getScriptProperties();
  return { branche: !!(p.getProperty('SPOND_EMAIL') && p.getProperty('SPOND_MDP')) };
}

function spondToken_() {
  var cs = CacheService.getScriptCache(), t = cs.get('spond:token');
  if (t) return t;
  var p = PropertiesService.getScriptProperties();
  var email = p.getProperty('SPOND_EMAIL'), mdp = p.getProperty('SPOND_MDP');
  if (!email || !mdp) throw new Error('identifiants Spond absents (propriétés du script SPOND_EMAIL et SPOND_MDP)');
  var body = JSON.stringify({ email: email, password: mdp });
  // deux adresses de connexion connues (Spond a changé la sienne en 2025)
  var urls = [SPOND_API + 'auth2/login', SPOND_API + 'login'], dernier = '';
  for (var i = 0; i < urls.length; i++) {
    var r = UrlFetchApp.fetch(urls[i], { method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true });
    var code = r.getResponseCode(), o = null;
    try { o = JSON.parse(r.getContentText()); } catch (e) { o = null; }
    if (code >= 200 && code < 300 && o) {
      var tok = o.loginToken || (o.accessToken && (o.accessToken.token || o.accessToken)) || o.token;
      if (typeof tok === 'string' && tok) { cs.put('spond:token', tok, 3000); return tok; }
      if (o.twoFactorRequired || o.phoneNumber || o.twoFactorToken) throw new Error('Spond demande un code de vérification (double authentification) pour ce compte.');
    }
    if (code === 401 || code === 403) throw new Error('Spond refuse l\'e-mail ou le mot de passe.');
    dernier = 'réponse ' + code;
  }
  throw new Error('connexion à Spond impossible (' + dernier + ')');
}

function spondGet_(path, tok) {
  var r = UrlFetchApp.fetch(SPOND_API + path, { method: 'get', headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
  var code = r.getResponseCode();
  if (code === 401) { CacheService.getScriptCache().remove('spond:token'); throw new Error('session Spond expirée, réessayez'); }
  if (code >= 300) throw new Error('Spond répond ' + code);
  return JSON.parse(r.getContentText());
}

// l'événement vise-t-il le sous-groupe M12 ? (sans l'info, on le garde : la demande filtre déjà le sous-groupe)
function pourSousGroupe_(e, sgid) {
  var rg = e && e.recipients && e.recipients.group;
  if (rg && Array.isArray(rg.subGroups) && rg.subGroups.length) {
    return rg.subGroups.some(function (s) { return String(s && s.id || s) === sgid; });
  }
  return true;
}

/** Lit Spond : les membres du sous-groupe M12 et les événements de J-30 à J+60 avec leurs réponses. */
function lireSpond_() {
  var p = PropertiesService.getScriptProperties();
  var gid = p.getProperty('SPOND_GROUPE'), sgid = p.getProperty('SPOND_SOUS_GROUPE');
  var tok = spondToken_();
  var groupes = spondGet_('groups/', tok) || [], g = null;
  if (gid) groupes.forEach(function (x) { if (String(x.id) === gid) g = x; });
  if (!g || !sgid) {
    // 1re fois : le groupe qui a un sous-groupe « M12 »
    var trouves = [];
    groupes.forEach(function (x) { (x.subGroups || []).forEach(function (sg) { if (SPOND_NOM_SOUS_GROUPE.test(String(sg.name || ''))) trouves.push({ g: x, sg: sg }); }); });
    if (trouves.length !== 1) throw new Error(trouves.length ? 'plusieurs sous-groupes « M12 » : mettez SPOND_GROUPE et SPOND_SOUS_GROUPE dans les propriétés du script' : 'pas de sous-groupe « M12 » dans les groupes Spond de ce compte');
    g = trouves[0].g; gid = String(g.id); sgid = String(trouves[0].sg.id);
    p.setProperty('SPOND_GROUPE', gid); p.setProperty('SPOND_SOUS_GROUPE', sgid);
  }
  var membres = (g.members || []).filter(function (m) { return (m.subGroups || []).some(function (s) { return String(s && s.id || s) === sgid; }); })
    .map(function (m) { return { id: m.id, prenom: m.firstName || '', nom: m.lastName || '' }; });
  var min = new Date(Date.now() - 30 * 864e5).toISOString(), max = new Date(Date.now() + 60 * 864e5).toISOString();
  var q = 'sponds/?includeComments=false&addProfileInfo=false&scheduled=true&order=asc&max=200&groupId=' + gid + '&subgroupId=' + sgid +
    '&minEndTimestamp=' + encodeURIComponent(min) + '&maxEndTimestamp=' + encodeURIComponent(max);
  var evs = spondGet_(q, tok) || [];
  return {
    membres: membres,
    evenements: evs.filter(function (e) { return pourSousGroupe_(e, sgid); }).map(function (e) {
      var r = e.responses || {};
      return {
        id: e.id, titre: e.heading || '', debut: e.startTimestamp || '', fin: e.endTimestamp || '',
        lieu: (e.location && (e.location.feature || e.location.address)) || '', annule: !!(e.cancelled || e.canceled),
        acceptes: r.acceptedIds || [], refuses: r.declinedIds || [], sansReponse: (r.unansweredIds || []).concat(r.unconfirmedIds || []), attente: r.waitinglistIds || []
      };
    })
  };
}

/** Synchro (lancée toutes les heures par le déclencheur, ou depuis l'éditeur). */
function synchroSpond() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var db = new SheetDB_();
  try {
    var info = Core.syncSpondDepuis(db, env_(), lireSpond_());
    Logger.log('Spond : ' + info.evenements + ' événements, ' + info.membres + ' membres M12, ' + info.nouveauxLiens + ' nouveaux liens joueur ↔ Spond' +
      (info.joueursSansLien.length ? ' · joueurs sans lien Spond : ' + info.joueursSansLien.join(', ') : ''));
  } finally {
    try { db.flush_(); } catch (e) { /* le cache sera relu */ }
    lock.releaseLock();
  }
}

/** À LANCER UNE FOIS (après avoir rempli SPOND_EMAIL et SPOND_MDP) : synchro toutes les heures + une synchro tout de suite. */
function brancherSpond() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'synchroSpond') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('synchroSpond').timeBased().everyHours(1).create();
  Logger.log('Synchro Spond programmée toutes les heures.');
  synchroSpond();
}

/** Pour couper la synchro automatique. */
function debrancherSpond() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'synchroSpond') ScriptApp.deleteTrigger(t); });
  CacheService.getScriptCache().remove('spond:token');
  Logger.log('Synchro Spond arrêtée.');
}
