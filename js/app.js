/* =========================================================
   Mode champion · M12 — application (navigation, sessions)
   ========================================================= */
window.MC = window.MC || {};
MC.act = MC.act || {};

MC.app = (function () {
  var ui = MC.ui, L = MC.logic, api = MC.api;
  var root, navEl, bgEl;
  var S = { kid: null, me: null, stats: null, adult: null, roster: null, league: null, cache: {} };
  var routes = [];
  var current = null;

  // ---------- Sessions mémorisées sur l'appareil ----------
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function setKid(k) {
    S.kid = k; S.me = null; S.stats = null; S.league = null; lsSet('mc-kid', k);
    if (k) lsSet('mc-kid-seen', Date.now());
    if (k) rememberKid(k.joueur.id); else lsSet(ME_KEY, null);
  }
  function setAdult(a) { S.adult = a; S.cache = {}; lsSet('mc-adult', a); if (!a) { lsSet('mc-fam', null); lsSet('mc-group', null); } }
  function rememberKid(id) {
    var r = lsGet('mc-recents') || [];
    r = [id].concat(r.filter(function (x) { return x !== id; })).slice(0, 6);
    lsSet('mc-recents', r);
  }

  // ---------- Appareil partagé (le téléphone ou l'iPad des parents) ----------
  // Dès qu'un enfant a utilisé l'appareil, l'espace adulte se verrouille : on retape son code après
  // 10 min sans y toucher, ou dès qu'on revient côté joueur. Les adultes peuvent couper ce réglage.
  // Quand plusieurs enfants utilisent l'appareil, on demande « C'est bien toi ? » après 30 min.
  var OPEN_KEY = 'mc-adult-open', SHARED_KEY = 'mc-shared', SEEN_KEY = 'mc-kid-seen';
  var ADULT_IDLE = 10 * 60000, KID_IDLE = 30 * 60000;
  var adultTarget = null, kidTarget = null, lastAdult = false;
  function recents() { return lsGet('mc-recents') || []; }
  function sharedDevice() { var p = lsGet(SHARED_KEY); if (p === 'off') return false; if (p === 'on') return true; return recents().length > 0; }
  function setShared(on) { lsSet(SHARED_KEY, on ? 'on' : 'off'); if (on) touchAdult(); }
  function adultUnlocked() { if (!S.adult) return false; if (!sharedDevice()) return true; return Number(lsGet(OPEN_KEY) || 0) > Date.now(); }
  function touchAdult() { if (S.adult && sharedDevice()) lsSet(OPEN_KEY, Date.now() + ADULT_IDLE); }
  function lockAdult() { lsSet(OPEN_KEY, null); }
  function touchKid() { if (S.kid) lsSet(SEEN_KEY, Date.now()); }
  function kidCheckNeeded() { return !!(S.kid && recents().length >= 2 && Date.now() - Number(lsGet(SEEN_KEY) || 0) > KID_IDLE); }
  function takeTarget(who) { var t = who === 'adult' ? adultTarget : kidTarget; if (who === 'adult') adultTarget = null; else kidTarget = null; return t; }

  // ---------- Routes ----------
  function route(pattern, fn, opts) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ re: re, keys: keys, fn: fn, opts: opts || {} });
  }
  function go(h, replace) {
    if (h.charAt(0) !== '#') h = '#' + h;
    if (location.hash === h) { render(); return; }
    if (replace) { history.replaceState(null, '', h); render(); } else location.hash = h;
  }
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = {}, i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
      h = h.slice(0, i);
    }
    return { path: h, q: q };
  }

  var renderSeq = 0, lastPath = null;
  function render() {
    var ph = parseHash(), r = null, params = {};
    for (var i = 0; i < routes.length; i++) {
      var m = ph.path.match(routes[i].re);
      if (m) { r = routes[i]; r.keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); }); break; }
    }
    if (!r) { go(S.kid ? '#/semaine' : '#/connexion', true); return; }
    var o = r.opts;
    if (o.kid && !S.kid) { go('#/connexion', true); return; }
    if (o.kid && S.kid && S.kid.joueur.mustChange && !o.first) { go('#/premiere', true); return; }
    if (o.adult && !S.adult) { go('#/adultes', true); return; }
    if (o.adult && S.adult && o.adult !== S.adult.role) { go(S.adult.role === 'e' ? '#/educ' : '#/parent', true); return; }
    if (o.adult && !adultUnlocked()) { adultTarget = location.hash; go('#/adultes', true); return; }
    if (o.kid && !o.first && !o.busy && kidCheckNeeded()) { kidTarget = location.hash; go('#/qui', true); return; }
    if (o.adult) touchAdult();
    else if (lastAdult && !o.neutral && sharedDevice()) lockAdult();   // retour côté joueur : l'espace adulte se referme
    lastAdult = !!o.adult;
    if (o.kid) touchKid();
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) { } }
    current = { route: r, params: params, q: ph.q, cleanup: null };
    var seq = ++renderSeq;
    var same = lastPath === ph.path;
    lastPath = ph.path;
    if (!same && ui.numpadClose) ui.numpadClose();
    var po = { keep: same };
    document.body.classList.toggle('has-nav', !!o.nav);
    navEl.hidden = !o.nav;
    if (o.nav) paintNav(o.nav);
    bgEl.style.setProperty('--bgtop', o.bg || '#1B2552');
    var out;
    try { out = r.fn(params, ph.q, current); } catch (e) { out = errorView(e); }
    if (out && typeof out.then === 'function') {
      if (!same) root.innerHTML = '<div class="loading" role="status"><i></i><i></i><i></i><span class="sr-only">Chargement</span></div>';
      out.then(function (html) { if (seq === renderSeq) paint(html, po); }, function (e) { if (seq === renderSeq) paint(errorView(e), po); });
    } else paint(out, po);
  }
  function paint(html, o) {
    if (html === null || html === undefined) return;
    var y = window.scrollY;
    root.innerHTML = html;
    ui.mountAnims(root);
    if (!o.keep) window.scrollTo(0, 0); else window.scrollTo(0, y);
    var h = root.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); }
    if (current && current.after) { try { current.after(root); } catch (e) { console.error(e); } }
  }
  function rerender() { render(); }
  function errorView(e) {
    if (e && e.code === 'session') {
      if (S.adult && current && current.route.opts.adult) { setAdult(null); setTimeout(function () { go('#/adultes', true); ui.toast('Reconnectez-vous.', true); }, 0); }
      else { setKid(null); setTimeout(function () { go('#/connexion', true); ui.toast('Reconnecte-toi avec ton code.', true); }, 0); }
      return '';
    }
    console.error(e);
    return '<main class="screen nonav"><div class="head"><span class="kicker">Oups</span><h1 class="big sm">Un souci</h1>' +
      '<p class="lead">' + ui.esc(e && e.message ? e.message : 'Erreur inconnue.') + '</p></div>' +
      '<button type="button" class="btn" data-act="reload">' + ui.icon('refresh') + ' Réessayer</button>' +
      '<a class="btn2 grey" href="#/">Accueil</a></main>';
  }

  function paintNav(active) {
    var items = [['semaine', '#/semaine', 'calendar', 'Semaine'], ['profil', '#/profil', 'user', 'Profil'], ['classement', '#/classement', 'podium', 'Classement']];
    navEl.innerHTML = '<span class="brand" aria-hidden="true">' + ui.avatar('M', '#38E8FF', 48).replace('>M<', '>M12<') + '</span>' + items.map(function (it) {
      return '<a href="' + it[1] + '" class="' + (active === it[0] ? 'on' : '') + '"' + (active === it[0] ? ' aria-current="page"' : '') + '>' + ui.icon(it[2], 22) + it[3].toUpperCase() + '</a>';
    }).join('');
  }

  // ---------- Données du joueur connecté ----------
  // Gardées aussi sur l'appareil : à l'ouverture, l'écran s'affiche tout de suite avec la dernière
  // version connue, puis se met à jour en arrière-plan (le serveur Google répond en 1 à 3 s).
  var ME_KEY = 'mc-me';
  function setMe(res) {
    S.me = res;
    S.stats = L.compute(res);
    if (S.kid) { S.kid.joueur = res.joueur; lsSet('mc-kid', S.kid); }
    lsSet(ME_KEY, { kid: res.joueur.id, me: res });
  }
  function loadMe(force) {
    if (S.me && !force) return Promise.resolve(S.me);
    if (!force) {
      var c = lsGet(ME_KEY);
      if (c && c.me && S.kid && c.kid === S.kid.joueur.id) {
        S.me = c.me; S.stats = L.compute(c.me);
        refreshMe();
        return Promise.resolve(S.me);
      }
    }
    return api.call('me', { token: S.kid.token }).then(function (res) { setMe(res); return res; });
  }
  function refreshMe() {
    var id = S.kid.joueur.id, before = JSON.stringify(S.me);
    api.call('me', { token: S.kid.token }, { silent: true }).then(function (res) {
      if (!S.kid || S.kid.joueur.id !== id) return;
      setMe(res);
      if (JSON.stringify(res) !== before && current && current.route.opts.live) render();
    }).catch(function (e) {
      if (e.code === 'session') { setKid(null); go('#/connexion', true); ui.toast('Reconnecte-toi avec ton code.', true); }
    });
  }
  // même principe pour les espaces adultes (famille, vestiaire)
  function swr(lsKey, action, params, live) {
    var tok = S.adult && S.adult.token, c = lsGet(lsKey);
    function fetch(silent) {
      var p = {}; for (var k in (params || {})) p[k] = params[k];
      p.token = S.adult && S.adult.token;
      return api.call(action, p, { silent: silent }).then(function (res) { lsSet(lsKey, { tok: tok, data: res }); return res; });
    }
    if (c && c.tok === tok && c.data) {
      fetch(true).then(function (res) {
        if (JSON.stringify(res) !== JSON.stringify(c.data)) { live(res); }
      }).catch(function (e) { if (e.code === 'session') { setAdult(null); go('#/adultes', true); } });
      return Promise.resolve(c.data);
    }
    return fetch(false).catch(function (e) {
      if (e.code === 'session') { setAdult(null); go('#/adultes', true); ui.toast('Reconnectez-vous.', true); }
      throw e;
    });
  }
  function kidCall(action, params) {
    var p = params || {};
    p.token = S.kid && S.kid.token;
    return api.call(action, p).catch(function (e) {
      if (e.code === 'session') { setKid(null); go('#/connexion', true); ui.toast('Reconnecte-toi avec ton code.', true); }
      throw e;
    });
  }
  function adultCall(action, params) {
    var p = params || {};
    p.token = S.adult && S.adult.token;
    touchAdult();
    return api.call(action, p).catch(function (e) {
      if (e.code === 'session') { setAdult(null); go('#/adultes', true); ui.toast('Reconnectez-vous.', true); }
      throw e;
    });
  }

  // ---------- Événements ----------
  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (!t || !root.contains(t) && !t.closest('.modal')) return;
    var fn = MC.act[t.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(t, e); }
  }
  MC.act.reload = function () { render(); };
  MC.act.back = function () { if (history.length > 1) history.back(); else go('#/semaine'); };
  MC.act.demoMode = function (b) {
    var fig = b.closest('.demo');
    var mode = b.getAttribute('data-mode');
    var holder = document.createElement('div');
    holder.innerHTML = ui.demoHtml({ anim: fig.getAttribute('data-anim-key'), video: fig.getAttribute('data-video'), color: fig.getAttribute('data-color'), label: fig.getAttribute('data-label'), vite: !!fig.getAttribute('data-vite'), mode: mode });
    var nf = holder.firstChild;
    fig.parentNode.replaceChild(nf, fig);
    ui.mountAnims(nf.parentNode);
    if (mode === 'video') { var go2 = nf.querySelector('[data-act="playVideo"]'); if (go2) go2.focus(); }
  };
  MC.act.info = function (b) { ui.showInfo(b.getAttribute('data-k'), b.getAttribute('data-t'), b.getAttribute('data-s')); };
  MC.act.playVideo = function (b) {
    var fig = b.closest('.demo');
    b.outerHTML = ui.videoIframe(b.getAttribute('data-video'));
    fig.classList.add('playing');
  };

  function start() {
    root = document.getElementById('app');
    navEl = document.getElementById('nav');
    bgEl = document.querySelector('.bgfx');
    S.kid = lsGet('mc-kid');
    S.adult = lsGet('mc-adult');
    document.addEventListener('click', onClick);
    document.addEventListener('click', function () { if (S.kid && current && current.route.opts.kid) touchKid(); if (current && current.route.opts.adult) touchAdult(); }, true);
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      if (r && r.code === 'session') return;
      if (r && r.message) ui.toast(r.message, true);
    });
    window.addEventListener('hashchange', render);
    window.addEventListener('online', function () { var o = document.getElementById('offline'); if (o) o.hidden = true; });
    window.addEventListener('offline', function () { var o = document.getElementById('offline'); if (o) o.hidden = false; });
    if (navigator.onLine === false) { var off = document.getElementById('offline'); if (off) off.hidden = false; }
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      history.replaceState(null, '', S.kid ? '#/semaine' : '#/connexion');
    }
    render();
    window.__mcStarted = true;
    registerSW();
  }

  // ---------- Appli « hors ligne » ----------
  // Le service worker garde une copie de l'appli sur l'appareil : elle s'ouvre même quand le réseau
  // traîne (iPhone qui sort de veille, Wi-Fi capricieux). Les données passent toujours par le serveur.
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && lsGet('mc-sw') !== 1) return;
    function reg() { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () { }); }
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
  }

  return {
    S: S, route: route, go: go, render: render, rerender: rerender, start: start,
    setKid: setKid, setAdult: setAdult, loadMe: loadMe, setMe: setMe, swr: swr, kidCall: kidCall, adultCall: adultCall,
    lsGet: lsGet, lsSet: lsSet, current: function () { return current; },
    sharedDevice: sharedDevice, setShared: setShared, adultUnlocked: adultUnlocked, touchAdult: touchAdult, lockAdult: lockAdult,
    touchKid: touchKid, takeTarget: takeTarget, recents: recents
  };
})();
