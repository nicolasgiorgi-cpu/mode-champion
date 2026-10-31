/* =========================================================
   Mode champion · M12 — la cloche : bouton en haut des écrans, liste, réglages (v33, 31/10/2026)
   La logique (quels événements, lu / non lu, réglages) : js/notifs.js.
   - La cloche est dans la barre du haut de tous les écrans avec onglets (enfant, parent, éduc), à gauche du « ? ».
     Une pastille rose dit combien de nouveautés n'ont pas été vues.
   - Toucher la cloche : la liste (les nouvelles en haut), puis tout devient « lu ». Chaque ligne mène au bon écran.
   - Réglages (roue dentée de la liste, ou Réglages / Plus / l'engrenage) : chacun allume ou éteint chaque sorte de
     notification, sur son appareil (deux parents sur deux téléphones règlent chacun les leurs).
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, N = MC.notifs, esc = ui.esc, icon = ui.icon;
  var HREF = { k: '#/notifs', f: '#/parent/notifs', e: '#/educ/notifs' };

  // les données déjà chargées (sinon la dernière copie gardée sur l'appareil, si elle est de cette session)
  function gardee(k) { var c = app.lsGet(k); return c && app.S.adult && c.tok === app.S.adult.token ? c.data : null; }
  function famille() { return app.S.cache.family || gardee('mc-fam'); }
  function groupe() { return app.S.cache.group || gardee('mc-group'); }
  function compos() { return app.S.cache.compos || gardee('mc-compos'); }
  // qui regarde (selon l'écran affiché) : { role, id } ; id = null tant que ses données ne sont pas là
  function qui() {
    var c = app.current(), o = (c && c.route && c.route.opts) || {}, S = app.S;
    if (o.kid && S.kid) return { role: 'k', id: S.kid.joueur.id };
    if (o.adult && S.adult && o.adult === S.adult.role && app.adultUnlocked()) {
      if (S.adult.role === 'f') { var f = famille(); return { role: 'f', id: f && f.famille ? f.famille.id : null }; }
      var g = groupe(); return { role: 'e', id: g && g.moi ? g.moi.id : null };
    }
    return null;
  }
  function donnees(role) {
    if (role === 'k') { var me = app.S.me; return { me: me && app.S.kid && me.joueur && me.joueur.id === app.S.kid.joueur.id ? me : null }; }
    if (role === 'f') return { family: famille() };
    return { group: groupe(), compos: compos() };   // les deux sont nécessaires (js/notifs.js)
  }
  function etat(w) {
    if (!w || !w.id) return null;
    var evs = N.events(w.role, donnees(w.role));
    return evs ? N.etat(w.role, w.id, evs, Date.now()) : null;
  }

  // ---------- la cloche, dans la barre du haut ----------
  function bellHtml() {
    var c = app.current(), o = (c && c.route && c.route.opts) || {};
    if (!o.nav || o.cloche === false) return '';
    var w = qui();
    if (!w) return '';
    if (MC.alertes) MC.alertes.verifier(w);   // (v34) les alertes sur le téléphone : l'abonnement est-il toujours là ?
    var st = etat(w), n = st ? st.n : 0, href = HREF[w.role];
    if (MC.alertes && st) MC.alertes.pastille(n);   // (v35) la pastille sur l'icône de l'appli
    return '<a class="tb-bell' + (n ? ' on' : '') + '" href="' + href + '" data-cloche aria-label="' + lab(n) + '">' + icon('bell', 22) +
      (n ? '<span class="tb-nb">' + (n > 9 ? '9+' : n) + '</span>' : '') + '</a>';
  }
  function lab(n) { return 'Notifications' + (n ? ' : ' + n + (n > 1 ? ' nouvelles' : ' nouvelle') : ''); }
  // après le chargement des données (ou une lecture) : la pastille de la cloche déjà affichée
  function paintBell() {
    var el = document.querySelector('.topbar [data-cloche]');
    if (!el) return;
    var w = qui(), st = etat(w), n = st ? st.n : 0;
    if (MC.alertes) MC.alertes.verifier(w);   // (v34) les alertes sur le téléphone : l'abonnement est-il toujours là ?
    if (MC.alertes && st) MC.alertes.pastille(n);   // (v35) la pastille sur l'icône de l'appli
    el.classList.toggle('on', !!n);
    el.setAttribute('aria-label', lab(n));
    var nb = el.querySelector('.tb-nb');
    if (!n) { if (nb) nb.remove(); return; }
    if (!nb) { nb = document.createElement('span'); nb.className = 'tb-nb'; el.appendChild(nb); }
    nb.textContent = n > 9 ? '9+' : String(n);
  }
  MC.cloche = bellHtml;
  MC.clocheMaj = paintBell;

  // ---------- la liste ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function quand(t, now) {
    if (!t) return '';
    var m = Math.round((now - t) / 60000), D = new Date(t), hh = D.getHours() + ' h ' + pad(D.getMinutes());
    if (m < 1) return 'à l\'instant';
    if (m < 60) return 'il y a ' + m + ' min';
    if (D.toDateString() === new Date(now).toDateString()) return m < 240 ? 'il y a ' + Math.floor(m / 60) + ' h' : 'aujourd\'hui à ' + hh;
    if (D.toDateString() === new Date(now - 86400000).toDateString()) return 'hier à ' + hh;
    return D.getDate() + '/' + pad(D.getMonth() + 1) + ' à ' + hh;
  }
  function ligne(role, ev, now) {
    var c = N.catOf(role, ev.cat) || { icon: 'bell', color: '#38E8FF' };
    // (v36) une séance d'un enfant : « 👏 Bravo » d'un toucher, à côté de la ligne (js/bravos.js)
    var bv = role === 'e' && ev.bv && MC.bravo ? MC.bravo.btn(groupe(), ev.bv.j, ev.bv.s, { sm: true }) : '';
    return '<li' + (bv ? ' class="ntb"' : '') + '><a class="nt' + (ev.nouveau ? ' new' : '') + '" href="' + esc(ev.href || HREF[role]) + '">' +
      '<span class="nt-ic" style="--nc:' + c.color + '">' + icon(c.icon, 18) + '</span>' +
      '<span class="nt-tx"><span class="nt-t">' + ev.txt + '</span><span class="nt-q">' + (ev.nouveau ? '<b>Nouveau</b> · ' : '') + esc(quand(ev.quand, now)) + '</span></span>' +
      (bv ? '' : icon('right', 16, 'class="nt-go"')) + '</a>' + bv + '</li>';
  }
  function T(role, k, a) { return role === 'k' ? k : a; }
  function charger(role) {
    if (role === 'k') return app.loadMe();
    if (role === 'f') return MC.loadFamily();
    return Promise.all([MC.loadGroup(), MC.loadCompos ? MC.loadCompos().catch(function () { return null; }) : null]);
  }
  function home(role) { return role === 'k' ? '#/semaine' : role === 'f' ? '#/parent' : '#/educ/entrainements'; }
  function liste(role) {
    return function (p, q, cur) {
      return charger(role).then(function () {
        var w = qui(), now = Date.now(), st = etat(w);
        var reg = '<a class="cbtn grey" href="' + HREF[role] + '/reglages" aria-label="Réglages des notifications">' + icon('settings', 20) + '</a>';
        var bar = ui.topbar({ back: home(role), backLabel: T(role, 'Accueil', 'Accueil'), title: 'Notifications', right: reg, help: ui.helpLink(role === 'k' ? 'joueur' : role === 'f' ? 'parent' : 'educ') });
        if (!st) return '<main class="screen">' + bar + '<div class="empty">' + (role === 'e' && groupe() && !compos() ?
          'Les compos n\'ont pas pu être chargées, et la cloche en a besoin. Tirez l\'écran vers le bas pour réessayer.' : 'Rien pour l\'instant.') + '</div></main>';
        if (w && w.id) cur.after = function () { N.marquerLu(w.role, w.id, Date.now()); paintBell(); app.refreshNav(); if (MC.alertes) MC.alertes.pastille(0); };
        var neuf = st.list.filter(function (e) { return e.nouveau; }), vieux = st.list.filter(function (e) { return !e.nouveau; });
        var nbOff = Object.keys(st.off || {}).filter(function (k) { return N.catOf(role, k); }).length;
        var body = !st.list.length ? '<div class="empty">' + T(role, 'Rien de neuf pour l\'instant. Quand tes parents ou tes éducs confirment un résultat ou te donnent une mission, ça arrive ici.', 'Rien pour l\'instant. Les séances, les résultats et les missions arriveront ici.') + '</div>' :
          (neuf.length ? '<section class="sec"><h2 class="h2">Nouveau<span class="nbi">' + neuf.length + '</span></h2><ul class="ntl">' + neuf.map(function (e) { return ligne(role, e, now); }).join('') + '</ul></section>' : '') +
          (vieux.length ? '<section class="sec"><h2 class="h2">' + (neuf.length ? 'Plus tôt' : 'Déjà vu') + '</h2><ul class="ntl">' + vieux.map(function (e) { return ligne(role, e, now); }).join('') + '</ul></section>' : '');
        return '<main class="screen">' + bar + body +
          '<p class="small" style="margin:0">' + T(role, 'Les 30 derniers jours.', 'Les 30 derniers jours, sur cet appareil.') +
          (nbOff ? ' ' + T(role, nbOff + ' sorte' + (nbOff > 1 ? 's' : '') + ' de notifications éteinte' + (nbOff > 1 ? 's' : '') + '.', nbOff + ' sorte' + (nbOff > 1 ? 's' : '') + ' de notifications éteinte' + (nbOff > 1 ? 's' : '') + '.') : '') +
          ' <a href="' + HREF[role] + '/reglages">' + T(role, 'Choisir ce que je reçois', 'Choisir ce que je reçois') + '</a></p></main>';
      });
    };
  }

  // ---------- les réglages ----------
  function reglages(role) {
    return function () {
      return charger(role).then(function () {
        var w = qui(), off = w && w.id ? N.reglages(role, w.id) : {};
        var sw = N.cats(role).map(function (c) {
          var on = !off[c.id];
          return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-act="ntToggle" data-c="' + esc(c.id) + '"><span class="row">' +
            '<span class="nt-ic" style="--nc:' + c.color + '">' + icon(c.icon, 18) + '</span><span><span class="t1" style="display:block">' + esc(c.nom) + '</span>' +
            '<span class="t2" style="display:block">' + esc(c.info) + '</span></span></span><span class="k"></span></button>';
        }).join('');
        return '<main class="screen">' + ui.topbar({ back: HREF[role], backLabel: 'Notifications', title: 'Ce que je reçois', help: false }) +
          '<div class="head"><h1 class="big md">' + T(role, 'Ce que<br>je reçois', 'Ce que<br>je reçois') + '</h1><p class="lead" style="margin:0">' +
          T(role, 'Allume ce que tu veux voir dans la cloche, éteins le reste.', 'Allumez ce que vous voulez voir dans la cloche, éteignez le reste.') + '</p></div>' +
          alertes(role, w) +
          '<div class="sec">' + sw + '</div>' +
          '<p class="small" style="margin:0">' + T(role, 'Réglé sur cet appareil.', 'Réglé sur cet appareil : sur un autre téléphone (l\'autre parent, une tablette), réglez-le aussi là-bas.') + '</p></main>';
      });
    };
  }
  MC.act.ntToggle = function (b) {
    var w = qui(); if (!w || !w.id) return;
    var on = b.getAttribute('aria-checked') !== 'true';
    N.regler(w.role, w.id, b.getAttribute('data-c'), on);
    b.setAttribute('aria-checked', String(on));
    paintBell();
    if (MC.alertes) MC.alertes.majCats(w.role, w.id);   // les alertes du téléphone suivent la cloche
  };

  // ---------- (v34) les alertes sur l'écran du téléphone (js/alertes.js) ----------
  // un interrupteur en haut des réglages ; sinon une ligne qui dit quoi faire (iPhone : l'appli sur l'écran d'accueil)
  function ou() { var p = MC.alertes.plateforme(); return p.ipad ? 'cette tablette' : p.ios || p.android ? 'ce téléphone' : 'cet appareil'; }
  function note(txt, plus) {
    return '<div class="sec"><div class="note">' + icon('bell', 18, 'style="color:var(--cyan);flex:none"') + '<span class="small">' + txt + '</span></div>' + (plus || '') + '</div>';
  }
  function alertes(role, w) {
    var A = MC.alertes;
    if (!A || !w || !w.id) return '';
    var tu = role === 'k', s = A.support(), p = A.plateforme(), on = A.actif(role, w.id);
    if (s === 'ios-ecran') return note((tu ? 'Pour recevoir des alertes sur l\'écran de l\'iPhone, même appli fermée : mets l\'appli sur l\'écran d\'accueil, ouvre-la depuis son icône, puis reviens ici.' :
      'Pour recevoir des alertes sur l\'écran de l\'iPhone, même appli fermée : mettez l\'appli sur l\'écran d\'accueil, ouvrez-la depuis son icône, puis revenez ici.') + ' (iOS 16.4 ou plus)',
      '<button type="button" class="btn2 grey" data-act="howInstall" data-r="' + role + '">' + icon('phone', 18) + ' Comment faire</button>');
    if (s === 'ios-maj') return note('Pour les alertes sur l\'écran, il faut iOS 16.4 ou plus : Réglages › Général › Mise à jour logicielle.');
    if (s === 'non') return note('Ce navigateur n\'affiche pas les alertes sur l\'écran.' + (p.android ? (tu ? ' Ouvre l\'appli dans Chrome.' : ' Ouvrez l\'appli dans Chrome.') : ''));
    if (!on) A.prechauffer(role);   // la configuration et Firebase prêts avant le toucher
    if (s === 'bloque') return note((tu ? 'Les alertes sont bloquées pour l\'appli. Pour les rouvrir : ' : 'Les alertes sont bloquées pour l\'appli. Pour les rouvrir : ') +
      (p.ios ? 'Réglages de l\'iPhone › Notifications › Champion' : p.android ? 'Paramètres › Applis › Chrome (ou l\'appli) › Notifications' : 'le cadenas à gauche de l\'adresse › Notifications') + (tu ? ', puis reviens ici.' : ', puis revenez ici.'));
    return '<div class="sec"><button type="button" class="switch" role="switch" aria-checked="' + on + '" data-act="alerteToggle"><span class="row">' +
      '<span class="nt-ic" style="--nc:#38E8FF">' + icon('bell', 18) + '</span><span><span class="t1" style="display:block">Alertes sur ' + ou() + '</span>' +
      '<span class="t2" style="display:block" data-t2>' + (on ? T(role, 'Ce que tu allumes ci-dessous s\'affiche aussi sur l\'écran, même appli fermée.', 'Ce que vous allumez ci-dessous s\'affiche aussi sur l\'écran, même appli fermée.') :
        T(role, 'Pour être prévenu même quand l\'appli est fermée.', 'Pour être prévenu même quand l\'appli est fermée.')) + '</span></span></span><span class="k"></span></button>' +
      (on ? '<button type="button" class="btn2 grey" data-act="alerteEssai">' + icon('bell', 18) + T(role, ' M\'envoyer une alerte d\'essai', ' M\'envoyer une alerte d\'essai') + '</button>' : '') + '</div>';
  }
  MC.act.alerteToggle = function (b) {
    var w = qui(), A = MC.alertes;
    if (!w || !w.id || !A || b.getAttribute('aria-busy') === 'true') return;
    var tu = w.role === 'k';
    if (b.getAttribute('aria-checked') === 'true') {
      A.desactiver(w.role, w.id);
      ui.toast(tu ? 'Alertes éteintes sur ce téléphone.' : 'Alertes éteintes sur cet appareil.');
      app.rerender();
      return;
    }
    b.setAttribute('aria-busy', 'true'); b.setAttribute('aria-checked', 'true');
    var t2 = b.querySelector('[data-t2]'); if (t2) t2.textContent = 'Un instant…';
    // tout de suite, dans le toucher : sinon l'iPhone ne pose pas la question « Autoriser les notifications ? »
    A.activer(w.role, w.id).then(function () {
      ui.toast(tu ? 'C\'est allumé : tu seras prévenu sur l\'écran.' : 'C\'est allumé : vous serez prévenu sur l\'écran.');
      app.rerender();
    }, function (e) {
      ui.toast(A.message(e, tu), true);
      app.rerender();
    });
  };
  MC.act.alerteEssai = function (b) {
    var w = qui(); if (!w || !MC.alertes) return;
    b.disabled = true;
    MC.alertes.essai(w.role, w.id).then(function (r) {
      ui.toast(r && r.envoi ? 'Alerte envoyée : elle arrive dans quelques secondes.' : 'Le serveur n\'envoie pas encore les alertes.', !(r && r.envoi));
    }, function (e) { ui.toast(MC.alertes.message(e, w.role === 'k'), true); }).then(function () { b.disabled = false; });
  };

  app.route('/notifs', liste('k'), { kid: true, nav: 'moi', bg: '#1B2552', cloche: false });
  app.route('/notifs/reglages', reglages('k'), { kid: true, nav: 'moi', bg: '#1B2552', cloche: false });
  app.route('/parent/notifs', liste('f'), { adult: 'f', nav: 'p:plus', bg: '#16223F', cloche: false });
  app.route('/parent/notifs/reglages', reglages('f'), { adult: 'f', nav: 'p:plus', bg: '#16223F', cloche: false });
  app.route('/educ/notifs', liste('e'), { adult: 'e', nav: 'e:gear', bg: '#16223F', cloche: false });
  app.route('/educ/notifs/reglages', reglages('e'), { adult: 'e', nav: 'e:gear', bg: '#16223F', cloche: false });
})();
