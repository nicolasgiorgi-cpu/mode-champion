/* =========================================================
   Mode champion · M12 — service worker
   Garde une copie de l'appli sur l'appareil pour qu'elle s'ouvre même quand le réseau traîne.
   - la page (index.html) : réseau d'abord ; sans réponse en 3,5 s, la copie gardée
   - les fichiers versionnés (?v=N) : la copie gardée d'abord (ils ne changent jamais pour un même N)
   - icônes, polices Google : la copie, mise à jour en arrière-plan
   - le serveur Google (les données) : jamais intercepté
   Réparer : ouvrir l'adresse avec ?reset=1 (voir index.html).
   ========================================================= */
var SHELL = 'mc-shell-1', FONTS = 'mc-fonts-1', NAV_WAIT = 3500;
var BASE = self.registration.scope;               // https://…/mode-champion/
var BASE_PATH = new URL(BASE).pathname;

// une page index.html n'est gardée qu'une fois tous ses fichiers gardés (jamais de version à moitié)
function storeShell(res) {
  return res.clone().text().then(function (html) {
    if (html.indexOf('MC.app.start') < 0) return;   // pas notre page
    var urls = [], v = 0;
    html.replace(/(?:src|href)="([^"]+[?&]v=(\d+))"/g, function (_, u, n) { urls.push(new URL(u, BASE).href); v = Math.max(v, Number(n)); });
    return caches.open(SHELL).then(function (c) {
      return Promise.all(urls.map(function (u) {
        return c.match(u).then(function (hit) {
          if (hit) return;
          return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('fichier ' + u); return c.put(u, r); });
        });
      })).then(function () { return c.put(BASE, res); })
        .then(function () {
          // on garde la version d'avant (une page déjà ouverte peut encore en avoir besoin)
          return c.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { var m = /[?&]v=(\d+)/.exec(k.url); if (m && Number(m[1]) < v - 1) return c.delete(k); }));
          });
        });
    });
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    fetch(BASE, { cache: 'no-cache' }).then(function (r) { if (r.ok && !r.redirected) return storeShell(r); })
      .catch(function () { })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k.indexOf('mc-') === 0 && k !== SHELL && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cached(req, name) { return caches.open(name).then(function (c) { return c.match(req); }); }

function cacheFirst(req) {
  return cached(req, SHELL).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  });
}

function staleWhileRevalidate(e, name) {
  var req = e.request;
  var net = fetch(req).then(function (r) {
    if (r && (r.ok || r.type === 'opaque')) { var copy = r.clone(); return caches.open(name).then(function (c) { return c.put(req, copy); }).then(function () { return r; }); }
    return r;
  });
  e.waitUntil(net.catch(function () { }));
  return cached(req, name).then(function (hit) { return hit || net; });
}

function page(e) {
  var net = fetch(e.request);
  e.waitUntil(net.then(function (r) {
    if (r && r.ok && !r.redirected && r.type === 'basic') return storeShell(r.clone());
  }).catch(function () { }));
  return new Promise(function (resolve) {
    var done = false;
    function give(r) { if (!done && r) { done = true; resolve(r); } }
    function fromCache(orError) {
      cached(BASE, SHELL).then(function (hit) { if (hit) give(hit); else if (orError) give(Response.error()); });
    }
    var tm = setTimeout(function () { fromCache(false); }, NAV_WAIT);
    net.then(function (r) { clearTimeout(tm); give(r); }, function () { clearTimeout(tm); fromCache(true); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf(BASE_PATH) !== 0) return;
    if (req.mode === 'navigate') {
      if (/[?&]reset=/.test(url.search)) return;         // « Réparer l'appli » : toujours le réseau
      e.respondWith(page(e));
      return;
    }
    if (/sw\.js$/.test(url.pathname)) return;
    if (/[?&]v=\d+/.test(url.search)) { e.respondWith(cacheFirst(req)); return; }
    if (/\/icons\/|manifest\.webmanifest$/.test(url.pathname)) { e.respondWith(staleWhileRevalidate(e, SHELL)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(staleWhileRevalidate(e, FONTS)); return; }
});
