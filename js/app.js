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

  // Une session mal formée (appli coupée au mauvais moment, ancienne version…) ne doit jamais bloquer
  // le démarrage : on la jette, l'enfant ou l'adulte retape simplement son code.
  function validKid(k) { return !!(k && typeof k === 'object' && typeof k.token === 'string' && k.token && k.joueur && typeof k.joueur === 'object' && k.joueur.id); }
  function validAdult(a) { return !!(a && typeof a === 'object' && typeof a.token === 'string' && a.token && (a.role === 'e' || a.role === 'f')); }
  function setKid(k) {
    if (k && !validKid(k)) k = null;
    S.kid = k; S.me = null; S.stats = null; S.league = null; lsSet('mc-kid', k);
    if (k) lsSet('mc-kid-seen', Date.now());
    if (k) rememberKid(k.joueur.id); else lsSet(ME_KEY, null);
  }
  function setAdult(a) {
    S.adult = a; S.cache = {}; lsSet('mc-adult', a);
    if (!a) {
      lsSet('mc-fam', null); lsSet('mc-group', null); lsSet('mc-compos', null);
      // les brouillons de compo (ils citent des copains, secrets) ne restent pas sur l'appareil
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('mc-cdraft:') === 0) localStorage.removeItem(k); }); } catch (e) { }
    }
  }
  function rememberKid(id) {
    var r = recents();
    r = [id].concat(r.filter(function (x) { return x !== id; })).slice(0, 6);
    lsSet('mc-recents', r);
  }

  // ---------- Appareil partagé (le téléphone ou l'iPad des parents) ----------
  // (31/10, v33) Quand on rouvre l'appli, on retrouve le DERNIER profil utilisé (enfant, parent ou éduc), sans code.
  // Sur un appareil qui sert aussi à un enfant, le code adulte n'est redemandé qu'à un moment : quand on repasse
  // de l'espace de l'enfant (ou de la connexion des joueurs) à l'espace adulte. Plus de verrou au bout de 10 min.
  // Les adultes peuvent couper ce réglage. Quand plusieurs enfants utilisent l'appareil, « C'est bien toi ? » après 30 min.
  var OPEN_KEY = 'mc-adult-open', SHARED_KEY = 'mc-shared', SEEN_KEY = 'mc-kid-seen', LAST_KEY = 'mc-last';
  var ADULT_IDLE = 10 * 60000, KID_IDLE = 30 * 60000;   // ADULT_IDLE : seulement pour lire l'ancien réglage (heure d'expiration)
  var adultTarget = null, kidTarget = null, lastAdult = false;
  function recents() { var r = lsGet('mc-recents'); return Array.isArray(r) ? r.filter(function (x) { return typeof x === 'string'; }) : []; }
  function sharedDevice() { var p = lsGet(SHARED_KEY); if (p === 'off') return false; if (p === 'on') return true; return recents().length > 0; }
  function setShared(on) { lsSet(SHARED_KEY, on ? 'on' : 'off'); if (on) touchAdult(); }
  // ouvert = true. Avant la v33, c'était une heure d'expiration (un nombre) : elle est convertie une seule fois au démarrage
  // (ouvert seulement si l'adulte est le dernier à s'être servi de l'appareil), voir start()
  function openFlag() { return lsGet(OPEN_KEY) === true; }
  function adultUnlocked() { if (!S.adult) return false; if (!sharedDevice()) return true; return openFlag(); }
  function touchAdult() { if (S.adult && sharedDevice() && lsGet(OPEN_KEY) !== true) lsSet(OPEN_KEY, true); }
  function lockAdult() { lsSet(OPEN_KEY, null); }
  // le dernier profil utilisé sur l'appareil : 'k' (un enfant), 'f' (parent) ou 'e' (éduc) ; null = la connexion des joueurs
  // mc-last : 'k', 'f', 'e', ou 'j' (« côté joueurs » : on a quitté l'espace adulte d'un appareil partagé vers la connexion des joueurs)
  function lastProfile() {
    var l = lsGet(LAST_KEY);
    // côté joueurs : jamais l'espace adulte sans son code (un enfant qui ferme et rouvre l'appli reste côté joueurs)
    if (l === 'k' || l === 'j') return S.kid ? 'k' : null;
    if (l === 'f' || l === 'e') return S.adult && S.adult.role === l ? l : (S.kid ? 'k' : null);
    // pas encore retenu (appli d'avant la v33) : le plus récent des deux ; sur un appareil partagé, l'adulte seulement
    // s'il s'en est servi après l'enfant (sinon on reste côté joueurs, comme le verrou d'avant)
    if (S.adult && !sharedDevice()) return S.adult.role;
    if (S.adult) {
      var v = lsGet(OPEN_KEY), adultAt = typeof v === 'number' ? v - ADULT_IDLE : v === true ? Date.now() : 0, kidAt = Number(lsGet(SEEN_KEY) || 0);
      if (adultAt > kidAt) return S.adult.role;
    }
    return S.kid ? 'k' : null;
  }
  function startHash() { var l = lastProfile(); return l === 'k' ? '#/semaine' : l === 'f' ? '#/parent' : l === 'e' ? '#/educ/entrainements' : '#/connexion'; }
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
    // remplacer l'écran garde l'identifiant de l'entrée d'historique (sinon la liste des écrans se décale)
    if (replace) { setUrl(h); render(); } else location.hash = h;
  }
  // change l'adresse sans créer d'entrée d'historique (ni redessiner)
  function setUrl(h) {
    try { history.replaceState(history.state, '', h); } catch (e) { }
    var en = hEntry(); if (en) { en.h = location.hash; hSave(); }
  }
  function parseHash(src) {
    var h = (src === undefined ? location.hash : src).replace(/^#/, '') || '/';
    var q = {}, i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) { try { q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); } catch (e) { } } });
      h = h.slice(0, i);
    }
    return { path: h, q: q };
  }
  function matchRoute(path) {
    for (var i = 0; i < routes.length; i++) { var m = path.match(routes[i].re); if (m) return { r: routes[i], m: m }; }
    return null;
  }

  // ---------- Historique : le bouton Retour revient vraiment à l'écran d'avant ----------
  // Chaque entrée de l'historique du navigateur reçoit un identifiant (history.state.mc). L'appli garde la liste
  // de ces entrées sur l'appareil (sessionStorage, le temps de l'onglet), avec, pour chaque écran, l'endroit où
  // l'on était (défilement, volets ouverts). Retour = l'écran d'avant « utilisable » : ni un écran de passage
  // (connexion, code, bravo, séance guidée…), ni l'espace d'un autre profil, ni le même écran. S'il n'y en a pas,
  // l'écran parent prévu par l'écran (ou l'accueil de l'espace) le remplace : jamais de boucle Retour ⇄ écran.
  var HK = 'mc-hist', HMAX = 80, H = { list: [], cur: null }, painted = false, restoreTo = null, scrollRaf = 0;
  var PASSAGE = /^\/(connexion|premiere|oubli|qui|adultes|adultes\/code|bravo|mission|mission\/bravo|go\/[^/]+|bilan\/go|bienvenue|parent\/bienvenue|educ\/bienvenue|educ\/mission)$/;
  function hLoad() {
    try {
      var v = JSON.parse(sessionStorage.getItem(HK) || 'null');
      if (v && Array.isArray(v.list)) H.list = v.list.filter(function (e) { return e && typeof e.id === 'string' && typeof e.h === 'string'; }).slice(-HMAX);
    } catch (e) { H.list = []; }
  }
  function hSave() { try { sessionStorage.setItem(HK, JSON.stringify({ list: H.list.slice(-HMAX) })); } catch (e) { } }
  function hIdx(id) { if (!id) return -1; for (var i = H.list.length - 1; i >= 0; i--) if (H.list[i].id === id) return i; return -1; }
  function hEntry() { var i = hIdx(H.cur); return i >= 0 ? H.list[i] : null; }
  function hState() { try { var s = history.state; return s && typeof s === 'object' && typeof s.mc === 'string' ? s.mc : null; } catch (e) { return null; } }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  // l'écran qu'on quitte : sa position de défilement et ses volets ouverts
  function snap() {
    var en = hEntry();
    if (!en || !painted || !root) return;
    en.y = Math.max(0, Math.round(window.scrollY || 0));
    var d = root.querySelectorAll('details');
    en.dt = d.length ? [].map.call(d, function (x) { return x.open ? '1' : '0'; }).join('') : '';
    en.op = [].filter.call(d, function (x) { return x.open; }).map(detKey);
  }
  // un volet se reconnaît à son titre (le prénom d'un enfant, le nom d'un poste…), son rang sinon
  function detKey(x, k) {
    var sm = x.querySelector('summary'), t = sm ? (sm.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    return t || '#' + [].indexOf.call(root.querySelectorAll('details'), x);
  }
  // à chaque affichage : de quelle entrée d'historique s'agit-il ? (même écran, retour/avance, nouvel écran)
  function hSync() {
    var id = hState(), h = location.hash, en, i;
    if (id && id === H.cur && (en = hEntry())) {
      if (en.h !== h) { en.h = h; en.u = whoOf(spaceOf(h)); restoreTo = null; painted = false; hSave(); }   // l'écran a été remplacé (redirection)
      return;
    }
    snap();
    painted = false;
    if (id && (i = hIdx(id)) >= 0) {                     // retour ou avance (bouton Retour, geste, rechargement)
      backBusy = 0;
      H.cur = id; H.list[i].h = h; restoreTo = H.list[i]; hSave(); return;
    }
    // nouvel écran (lien, onglet, bouton) : il remplace les écrans « en avant »
    var ci = hIdx(H.cur);
    backBusy = 0;
    // même adresse, état perdu (certains navigateurs, lien vers l'écran déjà ouvert) : c'est le même écran, pas un nouveau
    if (!id && ci >= 0 && H.list[ci].h === h) {
      try { history.replaceState({ mc: H.cur }, '', location.href); } catch (e) { }
      painted = true; return;
    }
    if (!id) { id = newId(); try { var st = history.state && typeof history.state === 'object' ? history.state : {}, o = {}; for (var k in st) o[k] = st[k]; o.mc = id; history.replaceState(o, '', location.href); } catch (e) { } }
    H.list = ci >= 0 ? H.list.slice(0, ci + 1) : [];
    H.list.push({ id: id, h: h, y: 0, dt: '', u: whoOf(spaceOf(h)) });
    if (H.list.length > HMAX) H.list = H.list.slice(-HMAX);
    H.cur = id; restoreTo = null; hSave();
  }
  function spaceOf(h) {
    var mr = matchRoute(parseHash(h).path); if (!mr) return null;
    var o = mr.r.opts; return o.kid ? 'k' : o.adult ? o.adult : 'n';
  }
  // qui est connecté dans cet espace : un écran d'un autre joueur (changement de joueur) ou d'un autre adulte n'est pas « l'écran d'avant »
  function whoOf(sp) {
    if (sp === 'k') return S.kid ? 'k:' + S.kid.joueur.id : '';
    if (sp === 'f' || sp === 'e') return S.adult ? sp + ':' + (S.adult.nom || '') : '';
    return '';
  }
  function homeOf(sp) {
    if (sp === 'k') return '#/semaine';
    if (sp === 'f') return '#/parent';
    if (sp === 'e') return '#/educ/entrainements';
    var l = lastProfile();
    if ((l === 'f' || l === 'e') && !adultUnlocked()) l = S.kid ? 'k' : null;
    return l === 'k' ? '#/semaine' : l === 'f' ? '#/parent' : l === 'e' ? '#/educ/entrainements' : '#/connexion';
  }
  function isHome(h, sp) { var p = parseHash(h).path; return p === parseHash(homeOf(sp)).path || (sp === 'e' && p === '/educ'); }
  function usable(en, here, sp) {
    var h = en && en.h;
    if (!h || h === here) return false;
    var p = parseHash(h).path;
    if (PASSAGE.test(p) || !matchRoute(p)) return false;
    var s2 = spaceOf(h);
    if (s2 === 'k' && !S.kid) return false;
    if ((s2 === 'f' || s2 === 'e') && (!S.adult || S.adult.role !== s2)) return false;
    if (s2 !== 'n' && sp && sp !== 'n' && s2 !== sp) return false;   // pas de retour dans l'espace d'un autre profil
    if (s2 !== 'n' && en.u && en.u !== whoOf(s2)) return false;     // ni dans celui d'un autre joueur (changement de joueur)
    return true;
  }
  function prevIndex() {
    var cur = hIdx(H.cur), here = location.hash, sp = spaceOf(here);
    if (cur < 0) return -1;
    for (var i = cur - 1; i >= 0; i--) if (usable(H.list[i], here, sp)) return i;
    return -1;
  }
  // le bouton Retour est-il utile ici ? (sinon il est grisé : rien avant, et on est déjà à l'accueil de l'espace)
  function canBack(fb) {
    if (prevIndex() >= 0) return true;
    var here = location.hash, sp = spaceOf(here), f = fb || homeOf(sp);
    return !!f && f !== here && !(!fb && isHome(here, sp));
  }
  var backBusy = 0;
  function back(fb) {
    // un Retour déjà en route (l'écran d'avant se charge) : les touchers suivants n'empilent rien
    if (backBusy && Date.now() - backBusy < 4000) return;
    var cur = hIdx(H.cur), j = prevIndex(), here = location.hash, sp = spaceOf(here), from = hState();
    function fallback() {
      var f = fb || homeOf(sp);
      if (f && f !== here && !(!fb && isHome(here, sp))) go(f, true);
    }
    if (j >= 0 && cur > j && from === H.cur) {
      backBusy = Date.now();
      try { history.go(j - cur); } catch (e) { backBusy = 0; fallback(); return; }
      // garde-fou : si le navigateur n'a pas bougé (historique coupé), on prend l'écran parent
      setTimeout(function () { if (backBusy && hState() === from && location.hash === here) { backBusy = 0; fallback(); } }, 2500);
      return;
    }
    fallback();
  }
  // après l'affichage d'un écran retrouvé : ses volets ouverts, puis l'endroit où l'on était
  function restore(en) {
    var d = root.querySelectorAll('details');
    if (Array.isArray(en.op) && d.length) {
      var keys = {}; en.op.forEach(function (k) { keys[k] = 1; });
      [].forEach.call(d, function (x) { x.open = !!keys[detKey(x)]; });
    } else if (en.dt && d.length === en.dt.length) [].forEach.call(d, function (x, k) { x.open = en.dt.charAt(k) === '1'; });
    var y = en.y || 0;
    window.scrollTo(0, y);
    // la page peut encore grandir (images, animations) : un 2e essai
    if (y > 0) setTimeout(function () { if (H.cur === en.id && Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); }, 160);
  }

  var renderSeq = 0, lastPath = null, renderedHash = null;
  function render() {
    try { renderNow(); }
    catch (e) {
      try { console.error(e); } catch (x) { }
      try { if (S.kid && !validKid(S.kid)) setKid(null); if (S.adult && !validAdult(S.adult)) setAdult(null); } catch (x) { }
      root.innerHTML = errorView(e);
    }
  }
  function renderNow() {
    hSync();
    renderedHash = location.hash;
    var ph = parseHash(), r = null, params = {}, mr = matchRoute(ph.path);
    if (mr) { r = mr.r; r.keys.forEach(function (k, j) { try { params[k] = decodeURIComponent(mr.m[j + 1]); } catch (e) { params[k] = mr.m[j + 1]; } }); }
    if (!r) { go(homeOf(null), true); return; }
    var o = r.opts;
    if (o.kid && !S.kid) { go('#/connexion', true); return; }
    if (o.kid && S.kid && S.kid.joueur.mustChange && !o.first) { go('#/premiere', true); return; }
    if (o.adult && !S.adult) { go('#/adultes', true); return; }
    if (o.adult && S.adult && o.adult !== S.adult.role) { go(S.adult.role === 'e' ? '#/educ' : '#/parent', true); return; }
    if (o.adult && !adultUnlocked()) { adultTarget = location.hash; go('#/adultes', true); return; }
    if (o.adult && S.adult.mustChange) { go('#/adultes/code', true); return; }   // 1re connexion : il choisit d'abord son code
    if (o.kid && !o.first && !o.busy && kidCheckNeeded()) { kidTarget = location.hash; go('#/qui', true); return; }
    var lastAdult0 = lastAdult;
    if (o.adult) touchAdult();
    else if ((lastAdult || o.kid) && !o.neutral && sharedDevice()) lockAdult();   // retour côté joueur : l'espace adulte se referme
    lastAdult = !!o.adult;
    if (o.kid) touchKid();
    // le dernier profil utilisé : c'est lui qu'on retrouve en rouvrant l'appli (sans code) ; quitter l'espace adulte d'un appareil
    // partagé vers la connexion des joueurs compte comme « côté joueurs » (sinon un enfant n'aurait qu'à fermer et rouvrir l'appli)
    var lp = o.kid ? 'k' : o.adult ? S.adult.role : (lastAdult0 && !o.neutral && sharedDevice() ? 'j' : null);
    if (lp && lsGet(LAST_KEY) !== lp) lsSet(LAST_KEY, lp);
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) { } }
    current = { route: r, params: params, q: ph.q, cleanup: null };
    var seq = ++renderSeq;
    var same = lastPath === ph.path;
    lastPath = ph.path;
    if (!same && ui.numpadClose) ui.numpadClose();
    if (!same) painted = false;
    var po = { keep: same, entry: H.cur };
    document.body.classList.toggle('has-nav', !!o.nav);
    navEl.hidden = !o.nav;
    if (o.nav) paintNav(typeof o.nav === 'function' ? o.nav(params, ph.q) : o.nav);
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
    var en = restoreTo && restoreTo.id === o.entry && H.cur === o.entry ? restoreTo : null;
    if (en) { restoreTo = null; restore(en); }
    else if (!o.keep) window.scrollTo(0, 0); else window.scrollTo(0, y);
    if (H.cur === o.entry) painted = true;
    var h = root.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); }
    if (current && current.after) { try { current.after(root); } catch (e) { console.error(e); } }
    try { cible(root); } catch (e) { }
  }
  // (v37) arriver d'une alerte du téléphone ou d'une ligne de la cloche : « c » dans l'adresse (#/…?c=j-abc) désigne
  // l'élément [data-cible="j-abc"] à montrer : ses volets ouverts (et le sien), au milieu de l'écran, avec un éclair.
  // Pendant 6 s, chaque nouveau dessin (les données fraîches arrivent après la copie gardée) le rouvre et le recentre.
  var CIB = { hash: '', t: 0, vu: false };
  function cible(root) {
    var c = parseHash().q.c;
    if (!c || !/^[A-Za-z0-9_-]{1,80}$/.test(c)) return;
    if (CIB.hash !== location.hash) CIB = { hash: location.hash, t: Date.now(), vu: false };
    if (Date.now() - CIB.t > 6000) return;
    var el = root.querySelector('[data-cible="' + c + '"]');
    if (!el) return;
    for (var p = el; p && p !== root; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    var d = el.querySelector('details');
    if (d && (d.parentElement === el || el.tagName === 'LI')) d.open = true;
    var r = el.getBoundingClientRect();
    if (!CIB.vu || r.top < 60 || r.top > window.innerHeight * 0.6) {
      // un grand bloc (une section) : son haut sous la barre du haut ; une ligne : au milieu de l'écran
      if (r.height > window.innerHeight * 0.5) window.scrollTo(0, Math.max(0, window.scrollY + r.top - 84));
      else { try { el.scrollIntoView({ block: 'center' }); } catch (e) { el.scrollIntoView(); } }
    }
    if (!CIB.vu) { CIB.vu = true; el.classList.add('cible-on'); setTimeout(function () { el.classList.remove('cible-on'); }, 2200); }
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
      '<a class="btn2 grey" href="#/">Accueil</a>' +
      '<a class="btn2 grey" href="?reset=1">Réparer l\'appli</a></main>';
  }

  // ---------- Onglets du bas (les mêmes règles pour les enfants, les parents et les éducs) ----------
  // Enfant : Prépa · Missions · Skills · Moi. Parent : Prépa · Missions · Skills · Plus (sans Skills en V1 : 3 onglets).
  // Éduc : Entraîn. · Plateaux · Progrès · Enfants ; la gestion est derrière l'engrenage (aucun onglet allumé).
  // Chaque onglet a 2 ou 3 sous-onglets ; le dernier choisi est gardé (l'onglet du bas y ramène).
  var NAVS = {
    k: [['prepa', '#/semaine', 'bolt', 'Prépa', '#38E8FF'], ['missions', '#/missions', 'target', 'Missions', '#FF7FBC'], ['skills', '#/skills', 'star', 'Skills', '#FFC23D'], ['moi', '#/profil', 'user', 'Moi', '#3DFFB0']],
    p: [['p:prepa', '#/parent', 'bolt', 'Prépa', '#38E8FF'], ['p:missions', '#/parent/missions', 'target', 'Missions', '#FF7FBC'], ['p:skills', '#/parent/skills', 'star', 'Skills', '#FFC23D'], ['p:plus', '#/parent/plus', 'menu', 'Plus', '#C9AEFF']],
    e: [['e:entrain', '#/educ/entrainements', 'calendar', 'Entraîn.', '#38E8FF'], ['e:plateaux', '#/educ/plateaux', 'flag', 'Plateaux', '#FFC23D'], ['e:progres', '#/educ/progres', 'trend', 'Progrès', '#3DFFB0'], ['e:enfants', '#/educ/joueurs', 'kids', 'Enfants', '#C9AEFF']]
  };
  // anciens noms d'onglets (écrans pas encore rangés ailleurs)
  var NAV_ALIAS = { semaine: 'prepa', classement: 'prepa', profil: 'moi', 'p:suivi': 'p:prepa', 'p:progres': 'p:prepa', 'p:classement': 'p:prepa',
    'e:vestiaire': 'e:progres', 'e:classement': 'e:progres', 'e:joueurs': 'e:enfants', 'e:outils': 'e:gear', 'e:compos': 'e:plateaux' };
  var navActive = null;
  function pendingCount(list) { var n = 0; (list || []).forEach(function (d) { (d.records || []).forEach(function (r) { if (r.statut === 'attente') n++; }); }); return n; }
  function mesEnfantsDuGroupe(g) { var mine = (g.moi && g.moi.enfants) || []; return g.joueurs.filter(function (p) { return p.joueur.actif && mine.indexOf(p.joueur.id) >= 0; }); }
  function navBadge(key) {
    var c = S.cache || {};
    if (key === 'missions' && S.me && MC.missions) return MC.missions.aFaire(S.me).length + MC.missions.nouveaux('k', S.me).enc.length;
    // (visuels v2) des étoiles arrivées depuis la dernière visite du carnet : l'onglet Skills s'allume en doré
    if (key === 'skills' && S.me && MC.nouvellesEtoiles) return MC.nouvellesEtoiles(S.me, MC.luSkills ? MC.luSkills(S.me.joueur.id) : (lsGet('mc-sklu:' + S.me.joueur.id) || '')).length;
    if (key === 'p:prepa' && c.family) return pendingCount(c.family.enfants);
    if (key === 'p:missions' && c.family && MC.missions) { var n = 0; c.family.enfants.forEach(function (d) { n += MC.missions.nouveaux('f', d).enc.length; }); return n; }
    if (key === 'e:progres' && c.group) return pendingCount(mesEnfantsDuGroupe(c.group)) + (MC.demandesSkills ? MC.demandesSkills() : 0);   // + les demandes d'étoiles des enfants (Skills v2)
    if (key === 'e:plateaux' && MC.composPending) return MC.composPending('plateau');   // votes et contre-propositions en attente
    if (key === 'e:entrain' && MC.composPending) return MC.composPending('entrainement');
    return 0;
  }
  var NB_LABEL = { skills: ' nouvelle(s) étoile(s)', missions: ' à voir', 'p:prepa': ' à confirmer', 'p:missions': ' nouveau', 'e:progres': ' à traiter', 'e:plateaux': ' à voir', 'e:entrain': ' à voir' };
  // le dernier sous-onglet choisi dans chaque onglet
  function tabHref(it) { var h = lsGet('mc-stab:' + it[0]); return typeof h === 'string' && h.charAt(0) === '#' ? h : it[1]; }
  function rememberTab(key, href) { lsSet('mc-stab:' + (NAV_ALIAS[key] || key), href); }
  function paintNav(active) {
    if (typeof active === 'function') active = active();
    active = NAV_ALIAS[active] || active;
    navActive = active;
    var set = /^p:/.test(active) ? 'p' : /^e:/.test(active) ? 'e' : 'k';
    // V1 (28/10) : pas d'onglet Skills pour les enfants ni les parents tant qu'il n'est pas ouvert (MC.CONFIG.ENFANTS)
    var items = NAVS[set].filter(function (it) { return (it[0] !== 'skills' && it[0] !== 'p:skills') || MC.ouvert('skills'); });
    navEl.style.setProperty('--n', items.length);
    navEl.setAttribute('aria-label', set === 'k' ? 'Navigation principale' : set === 'p' ? 'Navigation de l\'espace parent' : 'Navigation de l\'espace éduc');
    navEl.innerHTML = '<span class="brand" aria-hidden="true">' + ui.avatar('M', '#38E8FF', 48).replace('>M<', '>M12<') + '</span>' + items.map(function (it) {
      var on = active === it[0], n = navBadge(it[0]);
      return '<a href="' + (on ? it[1] : tabHref(it)) + '" class="' + (on ? 'on' : '') + (it[0] === 'skills' && n && !on ? ' gold' : '') + '" style="--tc:' + it[4] + '"' + (on ? ' aria-current="page"' : '') + '>' + ui.icon(it[2], 22) + '<span>' + it[3] + '</span>' +
        (n ? '<span class="nb" aria-label="' + n + (NB_LABEL[it[0]] || '') + '">' + n + '</span>' : '') + '</a>';
    }).join('');
  }
  // après le chargement des données (pastilles « à valider »)
  function refreshNav() { if (navActive && !navEl.hidden) paintNav(navActive); if (MC.clocheMaj) { try { MC.clocheMaj(); } catch (e) { } } }
  // un écran qui ne sait qu'après avoir lu ses données dans quel onglet il est (ex. un événement : entraînement ou plateau)
  function setNav(key) { if (!navEl.hidden) paintNav(key); }

  // ---------- Données du joueur connecté ----------
  // Gardées aussi sur l'appareil : à l'ouverture, l'écran s'affiche tout de suite avec la dernière
  // version connue, puis se met à jour en arrière-plan (le serveur Google répond en 1 à 3 s).
  var ME_KEY = 'mc-me';
  function setMe(res) {
    if (!res || !res.joueur || !res.joueur.id) return;                       // réponse inattendue : on garde ce qu'on a
    if (S.kid && S.kid.joueur.id !== res.joueur.id) return;                  // la réponse d'un joueur d'avant (changement de joueur entre-temps)
    S.me = res;
    S.stats = L.compute(res);
    if (S.kid) { S.kid.joueur = res.joueur; lsSet('mc-kid', S.kid); }
    lsSet(ME_KEY, { kid: res.joueur.id, me: res });
    refreshNav();   // pastille « mission à faire » sur l'onglet Semaine
  }
  function loadMe(force) {
    if (S.me && !force) return Promise.resolve(S.me);
    if (!force) {
      var c = lsGet(ME_KEY);
      if (c && c.me && S.kid && c.kid === S.kid.joueur.id) {
        S.me = c.me; S.stats = L.compute(c.me); refreshNav();
        refreshMe();
        return Promise.resolve(S.me);
      }
    }
    var who = S.kid.joueur.id;
    return api.call('me', { token: S.kid.token }).then(function (res) { if (S.kid && S.kid.joueur.id === who) setMe(res); return res; });
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

  // ---------- Tirer pour actualiser ----------
  // En haut d'un écran qui montre des données du serveur : tirer vers le bas puis lâcher redemande tout au serveur.
  // Un repère apparaît au-dessus de l'écran qui descend avec le doigt : la flèche tourne, devient pleine quand on a
  // tiré assez (« Lâche pour actualiser »), puis tourne pendant le chargement. Pas sur les formulaires, la connexion,
  // les séances et bilans guidés (rien à perdre en cours de saisie).
  var refreshers = [];
  function onRefresh(fn) { refreshers.push(fn); }
  var NOPULL = /^\/(connexion|premiere|oubli|qui|adultes|adultes\/code|go\/[^/]+|bilan|bilan\/go|noter|echauffement|calme|guide|aide|reglages|bienvenue|bravo|mission\/bravo|mission\/quiz|mission\/copains|parent\/bienvenue|parent\/plus|notifs\/reglages|parent\/notifs\/reglages|educ\/(notifs\/reglages|bienvenue|evt-nouveau|missions\/nouvelle|encourager\/[^/]+|ajouter|compo\/[^/]+|avis\/[^/]+|terrain|skills\/journee|evt\/[^/]+\/presents|spond|reglages|outils|familles|educs))$/;
  function pullable() {
    if (!current || !current.route || !painted) return false;
    var o = current.route.opts;
    if (!(o.kid || o.adult) || o.busy || o.first) return false;
    if (o.kid && !S.kid) return false;
    if (o.adult && !S.adult) return false;
    return !NOPULL.test(parseHash().path);
  }
  function pullRefresh() {
    var o = current.route.opts, jobs = [];
    if (o.kid && S.kid) {
      var who = S.kid.joueur.id;
      S.league = null;
      jobs.push(api.call('me', { token: S.kid.token }, { silent: true }).then(function (res) { if (S.kid && S.kid.joueur.id === who) setMe(res); }));
    }
    refreshers.forEach(function (fn) { try { var p = fn(o); if (p && typeof p.then === 'function') jobs.push(p); } catch (e) { } });
    return Promise.all(jobs).then(function () { render(); });
  }
  // (31/10, après les essais de Nicolas) plus difficile à déclencher : il faut tirer franchement (environ 210 px de doigt,
  // un quart d'écran de téléphone ; avant : 130) et pas d'un simple coup de doigt rapide (au moins 0,3 s).
  var PT = { track: false, on: false, busy: false, y0: 0, x0: 0, d: 0, ts: 0, tm: 0, el: null },
    PULL_DEAD = 16, PULL_RATIO = 0.5, PULL_GO = 96, PULL_MAX = 132, PULL_TMIN = 300;
  function pullPret() { return PT.d >= PULL_GO && Date.now() - PT.ts >= PULL_TMIN; }
  function ptrEl() {
    if (!PT.el) {
      PT.el = document.createElement('div');
      PT.el.className = 'ptr'; PT.el.setAttribute('role', 'status'); PT.el.setAttribute('aria-live', 'polite');
      PT.el.innerHTML = '<span class="ptr-i">' + ui.icon('refresh', 18) + '</span><span class="ptr-t"></span>';
      document.body.appendChild(PT.el);
    }
    return PT.el;
  }
  function ptrText(k) {
    var kid = current && current.route.opts.kid;
    return k === 'go' ? (kid ? 'Lâche pour actualiser' : 'Relâchez pour actualiser') : k === 'load' ? 'Actualisation…' : k === 'ok' ? 'À jour' : k === 'err' ? 'Pas de réseau' : (kid ? 'Tire pour actualiser' : 'Tirez pour actualiser');
  }
  function ptrShow(d, state) {
    var el = ptrEl();
    el.className = 'ptr on' + (state === 'go' ? ' go' : state === 'load' ? ' go spin' : state === 'ok' ? ' go done' : state === 'err' ? ' err' : '');
    el.style.setProperty('--d', d + 'px');
    el.style.setProperty('--rot', state === 'pull' ? Math.round(d / PULL_GO * 300) + 'deg' : '0deg');
    el.style.opacity = Math.min(1, d / 34);
    el.querySelector('.ptr-t').textContent = ptrText(state);
    root.style.transform = d ? 'translate3d(0,' + d + 'px,0)' : '';
  }
  function ptrHide() {
    root.classList.add('ptr-back'); if (PT.el) PT.el.classList.add('ptr-back');
    ptrShow(0, 'pull');
    setTimeout(function () { root.classList.remove('ptr-back'); if (PT.el) { PT.el.classList.remove('ptr-back'); PT.el.className = 'ptr'; } root.style.transform = ''; }, 260);
  }
  function scrolledInside(t) {
    for (var el = t; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.scrollTop > 0) return true;
    }
    return false;
  }
  function onTouchStart(e) {
    if (PT.on) { PT.on = false; root.classList.remove('ptr-pull'); ptrHide(); }   // un 2e doigt pendant qu'on tire : on lâche tout
    PT.track = false;
    if (PT.busy || !e.touches || e.touches.length !== 1 || (window.scrollY || 0) > 0 || !pullable()) return;
    var t = e.target;
    if (!t || !t.closest || t.closest('input, textarea, select, .modal, .numpad, .bk, [data-noptr]') || document.querySelector('.modal, .bk') || document.body.classList.contains('np-open')) return;
    if (scrolledInside(t)) return;
    PT.track = true; PT.y0 = e.touches[0].clientY; PT.x0 = e.touches[0].clientX; PT.d = 0; PT.ts = Date.now();
    ebPrep();   // la page sur sa couche graphique avant de bouger (pas de saccade à la 1re image)
  }
  function onTouchMove(e) {
    if (!PT.track || !e.touches || e.touches.length !== 1) return;
    var dy = e.touches[0].clientY - PT.y0, dx = e.touches[0].clientX - PT.x0;
    if (!PT.on) {
      if (dy <= 0 || Math.abs(dx) > dy || (window.scrollY || 0) > 0) { if (dy < 0 || Math.abs(dx) > 12) PT.track = false; return; }
      if (dy < PULL_DEAD) return;             // un simple toucher qui glisse un peu ne déclenche rien
      PT.on = true; root.classList.add('ptr-pull');
    } else if (dy <= 4 || (window.scrollY || 0) > 0) {
      // on remonte (ou la page défile) : on lâche, le défilement normal reprend
      PT.on = false; PT.track = false; root.classList.remove('ptr-pull'); ptrHide(); return;
    }
    // l'écran part de 0 (pas de saut au moment où le tirer commence), avec résistance
    PT.d = Math.max(0, Math.min(PULL_MAX, Math.round((dy - PULL_DEAD) * PULL_RATIO)));
    ptrShow(PT.d, pullPret() ? 'go' : 'pull');
    // assez tiré mais trop vite : « Relâchez » s'affiche quand même au bout de 0,3 s si le doigt ne bouge plus
    clearTimeout(PT.tm);
    if (PT.d >= PULL_GO && !pullPret()) PT.tm = setTimeout(function () { if (PT.on && pullPret()) ptrShow(PT.d, 'go'); }, PULL_TMIN - (Date.now() - PT.ts) + 5);
  }
  function onTouchEnd() {
    if (!PT.track) return;
    PT.track = false;
    if (!PT.on) return;
    PT.on = false; root.classList.remove('ptr-pull'); clearTimeout(PT.tm);
    if (!pullPret()) { ptrHide(); return; }
    PT.busy = true;
    root.classList.add('ptr-back'); ptrShow(56, 'load');
    var t0 = Date.now();
    pullRefresh().then(function () {
      setTimeout(function () { ptrShow(56, 'ok'); setTimeout(function () { PT.busy = false; ptrHide(); }, 450); }, Math.max(0, 500 - (Date.now() - t0)));
    }, function (err) {
      if (err && err.code === 'session') {
        PT.busy = false; ptrHide();
        if (current && current.route.opts.adult) { setAdult(null); go('#/adultes', true); ui.toast('Reconnectez-vous.', true); }
        else { setKid(null); go('#/connexion', true); ui.toast('Reconnecte-toi avec ton code.', true); }
        return;
      }
      ptrShow(56, 'err');
      setTimeout(function () { PT.busy = false; ptrHide(); ui.toast(err && err.message ? err.message : 'Pas de réseau : réessaie dans un instant.', true); }, 700);
    });
  }
  // ---------- Rebond en fin de défilement (v33) ----------
  // Le rebond natif est coupé (overscroll-behavior, pour « tirer pour actualiser ») : sans rien, le défilement
  // s'arrêtait net au bout. Un léger ressort à la place : glisser au-delà du bas (ou du haut, sur les écrans sans
  // « tirer pour actualiser ») tire la page avec résistance, puis elle revient ; un élan (doigt levé) qui arrive au
  // bout rebondit un peu. La barre du haut reste en place. Rien si l'appareil demande de réduire les animations.
  // (31/10, plus fluide) : la page passe sur sa propre couche graphique un peu avant le rebond (eb-prep : sinon la
  // 1re image saccade, le temps de la créer) ; translate3d ; la barre du haut retenue directement (plus de variable CSS
  // héritée par toute la page, qui faisait recalculer tous les éléments à chaque image) ; ressort amorti sans
  // dépassement, calculé d'après l'heure (régulier même si une image saute) ; l'élan garde sa vitesse en arrivant au bout.
  var EB = { track: false, on: false, dir: 0, py: 0, y0: 0, x0: 0, axis: 0, anchor: 0, x: 0, raf: 0, touching: false, tEnd: 0, lastY: 0, lastT: 0,
    vel: 0, bar: null, shown: false, prep: false, prepT: 0 };
  var EB_W = 15;   // le ressort (rad/s) : revient en ~0,45 s
  var EB_SKIP = 'input, textarea, select, .modal, .numpad, .bk, [data-noptr], .fiche, .kidpick';
  var EB_OK = (function () { try { return !window.CSS || !CSS.supports || CSS.supports('overscroll-behavior-y', 'none'); } catch (e) { return true; } })();
  // pas de rebond maison : animations réduites, navigateur qui rebondit déjà tout seul (iOS < 16), ou clavier ouvert (champ actif)
  function ebReduced() {
    if (!EB_OK) return true;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function maxScroll() { var de = document.documentElement; return Math.max(0, Math.max(de.scrollHeight, document.body.scrollHeight) - window.innerHeight); }
  function ebPrep() {
    if (!root) return;
    if (!EB.prep) { EB.prep = true; root.classList.add('eb-prep'); }
    clearTimeout(EB.prepT); EB.prepT = setTimeout(ebUnprep, 1500);
  }
  function ebUnprep() {
    if (EB.on || EB.raf || EB.x || EB.touching || PT.on || PT.busy) { EB.prepT = setTimeout(ebUnprep, 1500); return; }
    EB.prep = false; root.classList.remove('eb-prep');
  }
  // près du haut (écran sans « tirer pour actualiser ») ou du bas : préparer la couche
  function ebPres() {
    var sy = window.scrollY || 0, h = window.innerHeight || 600;
    return sy >= maxScroll() - h * 0.6 || (sy <= h * 0.3 && !pullable());
  }
  // x < 0 : la page monte (rebond en bas), la barre du haut est retenue ; x > 0 : la page descend (rebond en haut)
  function ebSet(x) {
    EB.x = x;
    if (Math.abs(x) < 0.4) {
      EB.x = 0;
      if (EB.shown) { EB.shown = false; root.classList.remove('eb-on'); root.style.transform = ''; if (EB.bar) EB.bar.style.transform = ''; EB.bar = null; }
      return;
    }
    if (!EB.shown || (EB.bar && !EB.bar.isConnected)) { EB.shown = true; root.classList.add('eb-on'); EB.bar = root.querySelector('.topbar'); }
    root.style.transform = 'translate3d(0,' + x.toFixed(1) + 'px,0)';
    if (EB.bar) EB.bar.style.transform = x < 0 ? 'translate3d(0,' + (-x).toFixed(1) + 'px,0)' : '';
  }
  // ressort amorti (un léger dépassement, puis immobile) : départ en x (px) avec une vitesse v (px/s)
  // ressort à amortissement critique : x(t) = (x0 + (v0 + w·x0)·t)·e^(−w·t) ; départ en x0 (px), vitesse v0 (px/s)
  function ebSpring(x0, v0) {
    if (EB.raf) cancelAnimationFrame(EB.raf);
    ebPrep();
    var w = EB_W, b = v0 + w * x0, t0 = performance.now();
    function step(now) {
      var t = Math.max(0, (now - t0) / 1000), e = Math.exp(-w * t), x = (x0 + b * t) * e, v = (v0 - w * b * t) * e;
      if (t > 0.03 && Math.abs(x) < 0.5 && Math.abs(v) < 15) { EB.raf = 0; ebSet(0); return; }
      ebSet(x);
      EB.raf = requestAnimationFrame(step);
    }
    EB.raf = requestAnimationFrame(step);
  }
  function ebStop() { if (EB.raf) { cancelAnimationFrame(EB.raf); EB.raf = 0; } ebSet(0); }
  function ebStart(e) {
    EB.touching = true; EB.track = false; EB.on = false; EB.axis = 0;
    if (!e.touches || e.touches.length !== 1 || ebReduced() || !root) { if (EB.x) ebSpring(EB.x, 0); return; }
    var t = e.target;
    if (!t || !t.closest || t.closest(EB_SKIP) || document.querySelector('.modal, .bk') || document.body.classList.contains('np-open')) return;
    if (EB.raf) ebStop();   // un doigt pendant que la page revient : elle s'arrête là où elle est (presque revenue)
    EB.track = true; EB.py = EB.y0 = e.touches[0].clientY; EB.x0 = e.touches[0].clientX;
    if (ebPres()) ebPrep();
  }
  function ebMove(e) {
    if (!EB.track || !e.touches || e.touches.length !== 1) return;
    if (PT.on || PT.busy) { EB.track = false; if (EB.on) { EB.on = false; ebSet(0); } return; }   // « tirer pour actualiser » a la main
    var y = e.touches[0].clientY, py = EB.py;
    EB.py = y;
    if (!EB.axis) {
      var adx = Math.abs(e.touches[0].clientX - EB.x0), ady = Math.abs(y - EB.y0);
      if (adx < 8 && ady < 8) return;
      if (adx > ady) { EB.track = false; return; }   // geste de côté (carrousel, curseur…) : pas de rebond
      EB.axis = 1;
    }
    if (!EB.on) {
      var sy = window.scrollY || 0;
      if (!EB.prep && ebPres()) ebPrep();
      if (y < py && sy >= maxScroll() - 2) { EB.on = true; EB.dir = -1; EB.anchor = py; }
      else if (y > py && sy <= 0 && !pullable()) { EB.on = true; EB.dir = 1; EB.anchor = py; }
      else return;
    }
    var over = EB.dir < 0 ? EB.anchor - y : y - EB.anchor;
    if (over <= 0) { EB.on = false; ebSet(0); return; }   // le doigt repart dans l'autre sens : la page défile normalement
    var dim = Math.max(260, window.innerHeight * 0.6), d = (1 - 1 / (over * 0.55 / dim + 1)) * dim;
    ebSet(EB.dir * Math.min(150, d));
  }
  function ebEnd() {
    EB.touching = false; EB.tEnd = Date.now(); EB.track = false;
    if (EB.on) { EB.on = false; ebSpring(EB.x, 0); }
    else if (EB.x && !EB.raf) ebSpring(EB.x, 0);
  }
  // l'élan du défilement (doigt levé) qui arrive en bas ou en haut : la page continue un peu, puis revient
  function ebScroll() {
    var now = performance.now(), y = window.scrollY || 0, dt = now - EB.lastT, dy = y - EB.lastY, prev = EB.lastY, vAvant = EB.vel;
    EB.lastY = y; EB.lastT = now;
    // la vitesse du défilement (px/ms), lissée sur les derniers événements
    EB.vel = dt > 0 && dt < 100 && Math.abs(dy) < 600 ? (vAvant ? 0.6 * (dy / dt) + 0.4 * vAvant : dy / dt) : 0;
    if (EB.touching || EB.raf || EB.x || !painted || Date.now() - EB.tEnd > 3000 || !(dt > 0 && dt < 100) || Math.abs(dy) > 600) return;
    if (!EB.prep && !ebReduced() && ebPres()) ebPrep();   // l'élan approche du bout : la couche est prête avant
    // au bout, le dernier pas est raccourci (la page s'arrête net) : la vitesse d'avant compte aussi
    var vel = Math.abs(vAvant) > Math.abs(dy / dt) && (vAvant > 0) === (dy > 0) ? vAvant : dy / dt;
    if (Math.abs(vel) < 0.35 || ebReduced() || PT.on || PT.busy || document.querySelector('.modal, .bk')) return;
    var max = maxScroll(), v0 = Math.min(2000, 1000 * Math.abs(vel));   // px/s : le rebond part à la vitesse de l'élan (50 px au plus)
    if (vel > 0 && y >= max - 1 && prev < max - 1) ebSpring(0, -v0);
    else if (vel < 0 && y <= 0 && prev > 0) ebSpring(0, v0);
  }
  function bindPull() {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });   // jamais bloquant : le défilement n'est jamais empêché
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', function () { if (PT.on) { PT.on = false; PT.track = false; root.classList.remove('ptr-pull'); ptrHide(); } else PT.track = false; }, { passive: true });
    // le rebond (après « tirer pour actualiser », qui passe en premier)
    document.addEventListener('touchstart', ebStart, { passive: true });
    document.addEventListener('touchmove', ebMove, { passive: true });
    document.addEventListener('touchend', ebEnd, { passive: true });
    document.addEventListener('touchcancel', ebEnd, { passive: true });
    window.addEventListener('scroll', ebScroll, { passive: true });
  }
  MC.rebond = { set: ebSet, spring: ebSpring, state: EB };   // pour les tests

  // ---------- Événements ----------
  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (!t || !root.contains(t) && !t.closest('.modal')) return;
    var fn = MC.act[t.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(t, e); }
  }
  MC.act.reload = function () { render(); };
  // le bouton Retour en haut à gauche (data-fb : l'écran parent prévu, s'il n'y a rien avant)
  MC.act.navBack = function (b) { if (b.getAttribute('aria-disabled') === 'true') return; back(b.getAttribute('data-fb') || ''); };
  MC.act.back = MC.act.navBack;
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
    if (S.kid && !validKid(S.kid)) { S.kid = null; lsSet('mc-kid', null); lsSet(ME_KEY, null); }
    S.adult = lsGet('mc-adult');
    if (S.adult && !validAdult(S.adult)) { S.adult = null; lsSet('mc-adult', null); }
    document.addEventListener('click', onClick);
    // un lien vers le même écran (seul un réglage change : onglet de la fiche, filtre, partie…) remplace l'écran
    // au lieu d'en empiler un de plus : Retour ramène à l'écran d'avant, pas à l'onglet d'avant
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#/"]') : null;
      if (!a || a.target || a.hasAttribute('data-act')) return;
      var h = a.getAttribute('href');
      if (h === location.hash) { e.preventDefault(); return; }
      if (parseHash(h).path === parseHash().path) {
        e.preventDefault(); go(h, true);
        try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (x) { }   // fenêtres, pavé, brouillons : comme un vrai changement d'écran
      }
    });
    document.addEventListener('click', function () { if (S.kid && current && current.route.opts.kid) touchKid(); if (current && current.route.opts.adult) touchAdult(); }, true);
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      if (r && r.code === 'session') return;
      if (r && r.message) ui.toast(r.message, true);
    });
    window.addEventListener('hashchange', function () { if (location.hash === renderedHash && hState() === H.cur && H.cur) return; render(); });
    // retour/avance vers une entrée qui a la même adresse : pas de « hashchange », on redessine quand même
    window.addEventListener('popstate', function () { if (location.hash === renderedHash && hState() !== H.cur) render(); });
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { }
    window.addEventListener('scroll', function () {
      if (!painted || scrollRaf) return;
      scrollRaf = (window.requestAnimationFrame || setTimeout)(function () { scrollRaf = 0; var en = hEntry(); if (en && painted) en.y = Math.max(0, Math.round(window.scrollY || 0)); });
    }, { passive: true });
    window.addEventListener('pagehide', function () { snap(); hSave(); });
    bindPull();
    document.addEventListener('visibilitychange', function () { if (document.hidden) { snap(); hSave(); } });
    window.addEventListener('online', function () { var o = document.getElementById('offline'); if (o) o.hidden = true; });
    window.addEventListener('offline', function () { var o = document.getElementById('offline'); if (o) o.hidden = false; });
    if (navigator.onLine === false) { var off = document.getElementById('offline'); if (off) off.hidden = false; }
    hLoad();
    // (v33) l'appli s'ouvre sur le dernier profil utilisé (enfant, parent ou éduc), sans redemander de code
    // (un espace verrouillé ne se rouvre jamais sans le code : le verrou « mc-adult-open » est gardé d'une ouverture à l'autre)
    var lp0 = lastProfile(), ov = lsGet(OPEN_KEY);
    lsSet(LAST_KEY, lp0 || 'j');   // retenu tout de suite (une appli d'avant la v33 le devine une seule fois)
    if (typeof ov === 'number') lsSet(OPEN_KEY, lp0 === 'f' || lp0 === 'e' ? true : null);   // ancienne valeur : convertie une fois
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      try { history.replaceState(history.state, '', startHash()); } catch (e) { }
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
    back: back, canBack: canBack, homeOf: homeOf, setUrl: setUrl, spaceOf: spaceOf, onRefresh: onRefresh, pullRefresh: pullRefresh, pullable: pullable,
    refreshNav: refreshNav, setNav: setNav, rememberTab: rememberTab,
    sharedDevice: sharedDevice, setShared: setShared, adultUnlocked: adultUnlocked, touchAdult: touchAdult, lockAdult: lockAdult,
    touchKid: touchKid, takeTarget: takeTarget, recents: recents, lastProfile: lastProfile
  };
})();
