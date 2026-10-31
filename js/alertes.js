/* =========================================================
   Mode champion · M12 — les alertes sur l'écran du téléphone (v34, 31/10/2026)
   La cloche (js/notifs.js, js/v-notifs.js) montre ce qui s'est passé quand on ouvre l'appli. Les alertes préviennent
   aussi appli fermée, sur l'écran du téléphone : iPhone (iOS 16.4 ou plus, appli mise sur l'écran d'accueil),
   Android (Chrome, Samsung Internet, Firefox), ordinateur.
   - Chacun les allume sur son appareil, pour son profil (Réglages de la cloche › « Alertes sur ce téléphone ») :
     le téléphone demande la permission, Firebase Cloud Messaging donne un « jeton » à l'appareil, et le serveur
     le garde (onglet push) avec les sortes allumées dans la cloche. Éteindre une sorte dans la cloche l'éteint ici aussi.
   - Le serveur envoie l'alerte après une action (js/core.js, ALERTES) ; sw.js l'affiche, et la toucher ouvre la cloche.
   - La configuration Firebase vient du serveur (action pushConfig) : rien d'identifiant dans ce dépôt public.
   - Sur l'appareil : mc-notif-push:<rôle>:<id> = { on, jeton, t } (gardé par « Réparer l'appli », comme la cloche) ;
     mc-push-jeton = le jeton de l'appareil (envoyé avec chaque action : cet appareil ne sonne pas pour ce qu'on vient
     d'y faire ; et tous les profils de l'appareil suivent quand il change) ; mc-push-retirer = les désabonnements pas
     encore confirmés par le serveur (réessayés à l'ouverture : éteindre ne doit jamais rester à moitié fait).
   - Les appels faits en arrière-plan (vérifier, sortes) passent directement par MC.api, sans rouvrir l'espace adulte.
   - Se déconnecter (parent, éduc) éteint les alertes de ce profil sur l'appareil. « Changer de joueur » non : sur la
     tablette de la famille, chaque enfant garde les siennes (il les éteint dans ses réglages).
   - Tests : window.__MC_PUSH_FAKE = un faux jeton (pas de Firebase, pas de réseau).
   ========================================================= */
window.MC = window.MC || {};

MC.alertes = (function () {
  var app = MC.app, N = MC.notifs;
  var FB = '12.2.1';                     // version du SDK Firebase (modules chargés à la demande, seulement pour activer)
  var JOUR = 86400000, PAUSE = 10 * 60000;

  function noop() { }
  function cle(role, id) { return 'mc-notif-push:' + role + ':' + id; }
  function lire(role, id) { var o = id ? app.lsGet(cle(role, id)) : null; return o && typeof o === 'object' ? o : null; }
  function ecrire(role, id, o) { app.lsSet(cle(role, id), o); }
  function appel(role, action, params) { return role === 'k' ? app.kidCall(action, params || {}) : app.adultCall(action, params || {}); }
  // en arrière-plan : pas de barre d'activité, pas de « Reconnectez-vous », et surtout pas de touchAdult (sur un appareil
  // partagé, l'espace adulte refermé quand l'enfant a pris le téléphone doit le rester)
  function tokenDe(role) { var S = app.S; return role === 'k' ? S.kid && S.kid.token : S.adult && S.adult.role === role ? S.adult.token : null; }
  function fond(role, action, params) {
    var tok = tokenDe(role), p = { token: tok };
    if (!tok) return Promise.reject({ code: 'session' });
    for (var k in (params || {})) p[k] = params[k];
    return MC.api.call(action, p, { silent: true });
  }
  function jetonAppareil(t) { if (t) app.lsSet('mc-push-jeton', t); return app.lsGet('mc-push-jeton'); }
  // les sortes allumées dans la cloche (les mêmes clés que le serveur)
  function catsOn(role, id) { var off = (N && N.reglages(role, id)) || {}; return N ? N.cats(role).filter(function (c) { return !off[c.id]; }).map(function (c) { return c.id; }) : []; }

  // ---------- ce que l'appareil sait faire ----------
  function plateforme() {
    var ua = '', p = { ios: false, standalone: false, android: false, ipad: false };
    try { ua = navigator.userAgent || ''; } catch (e) { }
    try { p.ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); } catch (e) { }
    try { p.standalone = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches); } catch (e) { }
    p.android = /Android/i.test(ua);
    p.ipad = /iPad/.test(ua) || (p.ios && !/iPhone|iPod/.test(ua));
    return p;
  }
  // 'ok' | 'ios-ecran' (iPhone : mettre l'appli sur l'écran d'accueil) | 'ios-maj' (iOS trop ancien) | 'non' | 'bloque'
  function support() {
    var p = plateforme(), ok = false;
    try { ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext !== false; } catch (e) { ok = false; }
    if (p.ios && !p.standalone) return 'ios-ecran';
    if (!ok) return p.ios ? 'ios-maj' : 'non';
    try { if (Notification.permission === 'denied') return 'bloque'; } catch (e) { return 'non'; }
    return 'ok';
  }
  function appareil() { var p = plateforme(); return p.ios ? (p.ipad ? 'iPad' : 'iPhone') : p.android ? 'Android' : 'Ordinateur'; }
  function permission() {
    try { return Notification.permission; } catch (e) { return 'denied'; }
  }
  // à appeler PENDANT le toucher (sinon l'iPhone refuse de poser la question)
  function demander() {
    if (permission() === 'granted') return Promise.resolve('granted');
    return new Promise(function (ok) {
      try { var r = Notification.requestPermission(ok); if (r && r.then) r.then(ok, function () { ok('default'); }); }
      catch (e) { ok('default'); }
    });
  }

  // ---------- Firebase (chargé seulement quand il faut un jeton) ----------
  var cfgP = null, fbP = null;
  function config(role) {
    if (!cfgP) {
      cfgP = fond(role, 'pushConfig').then(function (r) { return r && r.web ? r.web : null; });
      cfgP.then(function (w) { if (!w) cfgP = null; }, function () { cfgP = null; });
    }
    return cfgP;
  }
  function firebase(web) {
    if (!fbP) {
      var imp, base = 'https://www.gstatic.com/firebasejs/' + FB + '/';
      // import() dans une fonction : un vieux navigateur qui ne le connaît pas ne casse pas le reste de l'appli
      try { imp = new Function('u', 'return import(u)'); } catch (e) { return Promise.reject({ code: 'non' }); }
      fbP = Promise.all([imp(base + 'firebase-app.js'), imp(base + 'firebase-messaging.js')]).then(function (m) {
        var A = m[0], M = m[1];
        return M.isSupported().then(function (ok) {
          if (!ok) throw { code: 'non' };
          var a = A.getApps().filter(function (x) { return x.name === 'mc'; })[0] ||
            A.initializeApp({ apiKey: web.apiKey, authDomain: web.authDomain, projectId: web.projectId, messagingSenderId: web.messagingSenderId, appId: web.appId }, 'mc');
          return { M: M, msg: M.getMessaging(a) };
        });
      });
      fbP.catch(function () { fbP = null; });
    }
    return fbP;
  }
  // le service worker de l'appli (sw.js) : c'est lui qui reçoit et affiche les alertes
  function travailleur() {
    return navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function () { return navigator.serviceWorker.ready; });
  }
  function jeton(web) {
    var p = window.__MC_PUSH_FAKE ? Promise.resolve(String(window.__MC_PUSH_FAKE)) : Promise.all([firebase(web), travailleur()]).then(function (x) {
      return x[0].M.getToken(x[0].msg, { vapidKey: web.vapidKey, serviceWorkerRegistration: x[1] });
    });
    return p.then(function (t) { if (!t) throw { code: 'jeton' }; jetonAppareil(t); return t; });
  }
  // à l'affichage des réglages : la configuration et Firebase déjà là quand on touche l'interrupteur (moins d'attente)
  function prechauffer(role) {
    if (support() !== 'ok' || window.__MC_PUSH_FAKE) return;
    config(role).then(function (web) { if (web) return firebase(web); }).catch(noop);
  }
  function nouveauJeton(role) {
    return config(role).then(function (web) {
      if (!web) throw { code: 'pret' };
      return jeton(web);
    });
  }

  // ---------- allumer, éteindre ----------
  // à appeler directement depuis le toucher (la permission est demandée tout de suite)
  function activer(role, id) {
    var s = support();
    if (s !== 'ok') return Promise.reject({ code: s });
    var perm = demander();
    return perm.then(function (p) {
      if (p !== 'granted') throw { code: p === 'denied' ? 'bloque' : 'annule' };
      return nouveauJeton(role);
    }).then(function (t) {
      // si la réponse se perd, le serveur a peut-être abonné l'appareil : on le saura à retirer (l'interrupteur dit « éteint »)
      ecrire(role, id, { on: false, jeton: t, retirer: true });
      return appel(role, 'pushAbonner', { jeton: t, cats: catsOn(role, id), appareil: appareil() }).then(function () {
        ecrire(role, id, { on: true, jeton: t, t: Date.now() });
        return true;
      });
    });
  }
  // éteindre : l'interrupteur s'éteint tout de suite ; tant que le serveur n'a pas confirmé, on garde de quoi réessayer
  function desactiver(role, id, enFond) {
    var s = lire(role, id);
    if (!s || !s.jeton) { ecrire(role, id, { on: false }); return Promise.resolve(); }
    ecrire(role, id, { on: false, jeton: s.jeton, retirer: true });
    return (enFond ? fond : appel)(role, 'pushDesabonner', { jeton: s.jeton }).then(function () {
      var x = lire(role, id);
      if (x && !x.on) ecrire(role, id, { on: false });
    }, noop);
  }
  function actif(role, id) { var s = lire(role, id); return !!(s && s.on && s.jeton); }

  // une sorte allumée ou éteinte dans la cloche : le serveur suit (un seul envoi si on touche plusieurs interrupteurs)
  var minuteur = {};
  function majCats(role, id) {
    if (!actif(role, id)) return;
    clearTimeout(minuteur[role + id]);
    minuteur[role + id] = setTimeout(function () {
      var s = lire(role, id);
      if (!s || !s.on || !s.jeton) return;
      fond(role, 'pushAbonner', { jeton: s.jeton, cats: catsOn(role, id), appareil: appareil() }).then(function () { s.t = Date.now(); ecrire(role, id, s); },
        function () { s.t = 0; ecrire(role, id, s); });   // raté : réessayé à la prochaine ouverture
    }, 1200);
  }

  // à l'ouverture (la cloche se dessine) : l'abonnement est-il toujours là ? Le jeton peut changer (Firebase le renouvelle,
  // « Réparer l'appli » efface le service worker) : on le redemande au plus une fois par jour, ou tout de suite s'il est perdu.
  var vu = {};
  function verifier(w) {
    if (!w || !w.id) return;
    var k = w.role + ':' + w.id, now = Date.now(), s = lire(w.role, w.id);
    if (!s || (!s.on && !s.retirer) || !s.jeton) return;
    if (vu[k] && now - vu[k] < PAUSE) return;
    vu[k] = now;
    retirerEnAttente();
    if (s.retirer && !s.on) { desactiver(w.role, w.id, true); return; }   // un « éteindre » pas encore confirmé : on réessaie
    if (support() !== 'ok' || permission() !== 'granted') {   // l'alerte a été coupée dans les réglages du téléphone
      if (support() !== 'ios-ecran') desactiver(w.role, w.id, true);
      return;
    }
    function reabonner(t) {
      var avant = s.jeton;
      return fond(w.role, 'pushAbonner', { jeton: t, cats: catsOn(w.role, w.id), appareil: appareil() }).then(function () {
        ecrire(w.role, w.id, { on: true, jeton: t, t: Date.now() });
        if (avant && avant !== t) fond(w.role, 'pushDesabonner', { jeton: avant }).catch(noop);
      });
    }
    // le jeton de l'appareil a changé (renouvelé en ouvrant un autre profil) : ce profil suit tout de suite
    var dev = jetonAppareil();
    if (dev && dev !== s.jeton) { reabonner(dev).catch(noop); return; }
    var perdu = window.__MC_PUSH_FAKE ? Promise.resolve(false) :
      navigator.serviceWorker.getRegistration().then(function (r) { return r ? r.pushManager.getSubscription().then(function (x) { return !x; }) : true; }).catch(function () { return false; });
    perdu.then(function (p) {
      if (!p && now - (s.t || 0) < JOUR) return;
      return nouveauJeton(w.role).then(reabonner);
    }).catch(noop);
  }

  // se déconnecter : plus d'alertes de ce profil sur cet appareil (à appeler AVANT d'effacer la session)
  function idDe(role) {
    var S = app.S;
    try {
      if (role === 'k') return S.kid && S.kid.joueur.id;
      var g = function (k) { var c = app.lsGet(k); return c && S.adult && c.tok === S.adult.token ? c.data : null; };
      if (role === 'f') { var f = S.cache.family || g('mc-fam'); return f && f.famille ? f.famille.id : null; }
      var gr = S.cache.group || g('mc-group'); return gr && gr.moi ? gr.moi.id : null;
    } catch (e) { return null; }
  }
  // les désabonnements de profils déconnectés, pas encore confirmés : { tok (la session, encore valable côté serveur), jeton, exp }
  var RET = 'mc-push-retirer';
  function retirerEnAttente() {
    var l = app.lsGet(RET), now = Date.now();
    if (!Array.isArray(l) || !l.length) return;
    l.filter(function (x) { return x && x.tok && x.jeton && x.exp > now; }).forEach(function (x) { essayerRetrait(x); });
  }
  function essayerRetrait(x) {
    MC.api.call('pushDesabonner', { token: x.tok, jeton: x.jeton }, { silent: true }).then(fini, function (e) { if (e && (e.code === 'session' || e.code === 'invalide')) fini(); });
    function fini() {
      var l = app.lsGet(RET);
      l = (Array.isArray(l) ? l : []).filter(function (y) { return y && !(y.tok === x.tok && y.jeton === x.jeton) && y.exp > Date.now(); });
      app.lsSet(RET, l.length ? l : null);
    }
  }
  function oublier(role) {
    var id = idDe(role), cles = [], tok = tokenDe(role);
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mc-notif-push:' + role + ':') === 0 && (!id || k === cle(role, id))) cles.push(k); }); } catch (e) { }
    cles.forEach(function (k) {
      var s = app.lsGet(k);
      // directement (pas adultCall : la session se ferme, rien à rouvrir ni à rediriger) ; gardé jusqu'à confirmation (7 jours au plus)
      if (s && s.jeton && (s.on || s.retirer) && tok) {
        var x = { tok: tok, jeton: s.jeton, exp: Date.now() + 7 * JOUR }, l = app.lsGet(RET);
        app.lsSet(RET, (Array.isArray(l) ? l : []).concat([x]).slice(-20));
        essayerRetrait(x);
      }
      app.lsSet(k, null);
    });
  }
  // au démarrage : les désabonnements restés en attente (réseau coupé au moment de se déconnecter…)
  setTimeout(function () { try { retirerEnAttente(); } catch (e) { } }, 5000);

  // l'essai : seulement sur CET appareil (pas sur le téléphone de l'autre parent)
  function essai(role, id) {
    var s = lire(role, id);
    if (!s || !s.jeton) return Promise.reject({ code: 'jeton' });
    return appel(role, 'pushEssai', { jeton: s.jeton, cats: catsOn(role, id), appareil: appareil() });
  }

  // toucher une alerte quand l'appli est déjà ouverte : sw.js demande d'aller sur la cloche
  try {
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.mc === 'aller' && /^#\/[a-z/]*$/.test(String(d.lien || ''))) app.go(d.lien);
    });
  } catch (e) { }

  // les messages pour les erreurs (tu = l'enfant)
  function message(e, tu) {
    var c = e && e.code;
    if (c === 'annule') return tu ? 'Il faut toucher « Autoriser » pour recevoir les alertes.' : 'Il faut toucher « Autoriser » pour recevoir les alertes.';
    if (c === 'bloque') return tu ? 'Les alertes sont bloquées sur ce téléphone.' : 'Les alertes sont bloquées pour l\'appli sur cet appareil.';
    if (c === 'pret') return 'Les alertes ne sont pas encore prêtes. Réessayez plus tard.';
    if (c === 'non' || c === 'ios-maj' || c === 'ios-ecran') return 'Ce navigateur ne sait pas afficher les alertes.';
    if (c === 'reseau' || c === 'session') return (e && e.message) || 'Pas de connexion. Réessayez.';
    return tu ? 'Ça n\'a pas marché. Réessaie dans un moment.' : 'Ça n\'a pas marché. Réessayez dans un moment.';
  }

  return { support: support, plateforme: plateforme, activer: activer, desactiver: desactiver, actif: actif, majCats: majCats,
    verifier: verifier, oublier: oublier, essai: essai, message: message, catsOn: catsOn, cle: cle, prechauffer: prechauffer };
})();
