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
   - Sur l'appareil : mc-notif-push:<rôle>:<id> = { on, jeton, t } (gardé par « Réparer l'appli », comme la cloche).
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
      cfgP = appel(role, 'pushConfig').then(function (r) { return r && r.web ? r.web : null; });
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
    if (window.__MC_PUSH_FAKE) return Promise.resolve(String(window.__MC_PUSH_FAKE));
    return Promise.all([firebase(web), travailleur()]).then(function (x) {
      return x[0].M.getToken(x[0].msg, { vapidKey: web.vapidKey, serviceWorkerRegistration: x[1] });
    }).then(function (t) { if (!t) throw { code: 'jeton' }; return t; });
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
      return appel(role, 'pushAbonner', { jeton: t, cats: catsOn(role, id), appareil: appareil() }).then(function () {
        ecrire(role, id, { on: true, jeton: t, t: Date.now() });
        return true;
      });
    });
  }
  function desactiver(role, id) {
    var s = lire(role, id);
    ecrire(role, id, { on: false });
    if (s && s.jeton) return appel(role, 'pushDesabonner', { jeton: s.jeton }).catch(noop);
    return Promise.resolve();
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
      appel(role, 'pushAbonner', { jeton: s.jeton, cats: catsOn(role, id), appareil: appareil() }).then(function () { s.t = Date.now(); ecrire(role, id, s); }, noop);
    }, 1200);
  }

  // à l'ouverture (la cloche se dessine) : l'abonnement est-il toujours là ? Le jeton peut changer (Firebase le renouvelle,
  // « Réparer l'appli » efface le service worker) : on le redemande au plus une fois par jour, ou tout de suite s'il est perdu.
  var vu = {};
  function verifier(w) {
    if (!w || !w.id || !actif(w.role, w.id)) return;
    var k = w.role + ':' + w.id, now = Date.now();
    if (vu[k] && now - vu[k] < PAUSE) return;
    vu[k] = now;
    var s = lire(w.role, w.id);
    if (support() !== 'ok' || permission() !== 'granted') {   // l'alerte a été coupée dans les réglages du téléphone
      if (support() !== 'ios-ecran') desactiver(w.role, w.id);
      return;
    }
    var perdu = window.__MC_PUSH_FAKE ? Promise.resolve(false) :
      navigator.serviceWorker.getRegistration().then(function (r) { return r ? r.pushManager.getSubscription().then(function (x) { return !x; }) : true; }).catch(function () { return false; });
    perdu.then(function (p) {
      if (!p && now - (s.t || 0) < JOUR) return;
      return nouveauJeton(w.role).then(function (t) {
        var avant = s.jeton;
        return appel(w.role, 'pushAbonner', { jeton: t, cats: catsOn(w.role, w.id), appareil: appareil() }).then(function () {
          ecrire(w.role, w.id, { on: true, jeton: t, t: Date.now() });
          if (avant && avant !== t) appel(w.role, 'pushDesabonner', { jeton: avant }).catch(noop);
        });
      });
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
  function oublier(role) {
    var id = idDe(role), cles = [], S = app.S, tok = role === 'k' ? S.kid && S.kid.token : S.adult && S.adult.token;
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mc-notif-push:' + role + ':') === 0 && (!id || k === cle(role, id))) cles.push(k); }); } catch (e) { }
    cles.forEach(function (k) {
      var s = app.lsGet(k);
      // directement (pas adultCall : la session se ferme, rien à rouvrir ni à rediriger)
      if (s && s.on && s.jeton && tok) MC.api.call('pushDesabonner', { token: tok, jeton: s.jeton }).catch(noop);
      app.lsSet(k, null);
    });
  }

  function essai(role) { return appel(role, 'pushEssai'); }

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
    verifier: verifier, oublier: oublier, essai: essai, message: message, catsOn: catsOn, cle: cle };
})();
