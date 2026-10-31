// (v39) sw.js : les icônes et le manifeste arrivent frais. Avant, la copie gardée passait d'abord : juste après une
// nouvelle icône, « Sur l'écran d'accueil » (iPhone) recevait encore l'ancienne, et il fallait ajouter l'appli deux fois.
// Le service worker tourne dans une bulle (vm) avec un faux « self », un faux réseau et un faux cache.
// node tests/test_sw_icones.js
var fs = require('fs'), vm = require('vm'), path = require('path');
var RACINE = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
var html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
var BASE = 'https://exemple.github.io/mode-champion/';
var fails = 0, n = 0;
function ok(c, m, info) { n++; if (!c) { fails++; console.log('ÉCHEC :', m, info === undefined ? '' : JSON.stringify(info)); } }

function Rep(corps, o) {
  o = o || {};
  this.corps = String(corps); this.status = o.status || 200; this.ok = this.status >= 200 && this.status < 300;
  this.redirected = !!o.redirected; this.type = o.type || 'basic';
}
Rep.prototype.clone = function () { return new Rep(this.corps, { status: this.status, redirected: this.redirected, type: this.type }); };
Rep.prototype.text = function () { return Promise.resolve(this.corps); };
Rep.error = function () { return new Rep('', { status: 0, type: 'error' }); };

// reseau(url) : une réponse, une promesse, ou une erreur (pas de réseau)
function monde(reseau) {
  var L = {}, stock = {}, appels = [];
  function cle(u) { return typeof u === 'string' ? u : u.url; }
  var caches = {
    open: function (nom) {
      var c = stock[nom] = stock[nom] || {};
      return Promise.resolve({
        match: function (u) { return Promise.resolve(c[cle(u)]); },
        put: function (u, r) { c[cle(u)] = r; return Promise.resolve(); },
        keys: function () { return Promise.resolve(Object.keys(c).map(function (k) { return { url: k }; })); },
        delete: function (u) { delete c[cle(u)]; return Promise.resolve(true); }
      });
    },
    keys: function () { return Promise.resolve(Object.keys(stock)); },
    delete: function (nom) { delete stock[nom]; return Promise.resolve(true); }
  };
  var self = {
    location: { origin: 'https://exemple.github.io' },
    registration: { scope: BASE, showNotification: function () { return Promise.resolve(); } },
    addEventListener: function (t, f) { L[t] = f; },
    clients: { matchAll: function () { return Promise.resolve([]); }, claim: function () { return Promise.resolve(); } },
    skipWaiting: function () { },
    caches: caches
  };
  function leFetch(req, init) {
    var url = cle(req);
    appels.push({ url: url, cache: init && init.cache });
    try { return Promise.resolve(reseau(url)); } catch (e) { return Promise.reject(e); }
  }
  // les attentes du service worker, 100 fois plus courtes (NAV_WAIT = 3,5 s → 35 ms)
  var ctx = { self: self, URL: URL, Promise: Promise, caches: caches, Response: Rep, fetch: leFetch, console: console,
    setTimeout: function (f, ms) { return setTimeout(f, ms / 100); }, clearTimeout: clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { L: L, stock: stock, appels: appels };
}
function demander(w, chemin, mode) {
  var reponse = null, attentes = [];
  var ev = { request: { url: BASE + chemin, method: 'GET', mode: mode || 'no-cors' },
    respondWith: function (p) { reponse = p; }, waitUntil: function (p) { attentes.push(p); } };
  w.L.fetch(ev);
  return Promise.resolve(reponse).then(function (r) { return Promise.all(attentes).then(function () { return r; }); });
}
function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function garder(w, chemin, corps) { w.stock['mc-shell-1'] = w.stock['mc-shell-1'] || {}; w.stock['mc-shell-1'][BASE + chemin] = new Rep(corps); }
function gardee(w, chemin) { var c = w.stock['mc-shell-1'] || {}; return c[BASE + chemin] && c[BASE + chemin].corps; }

(async function () {
  // 1. une icône du manifeste déjà gardée (l'ancienne) et le réseau qui a la nouvelle : c'est la nouvelle qui part
  var w = monde(function () { return new Rep('nouvelle'); });
  garder(w, 'icons/icon-192.png', 'ancienne');
  var r = await demander(w, 'icons/icon-192.png');
  ok(r && r.corps === 'nouvelle', 'icône : la nouvelle, pas la copie gardée', r && r.corps);
  ok(gardee(w, 'icons/icon-192.png') === 'nouvelle', 'icône : la copie gardée est remplacée', gardee(w, 'icons/icon-192.png'));
  ok(w.appels.length === 1 && w.appels[0].cache === 'no-cache', 'icône : revalidée auprès du site (pas la copie du navigateur)', w.appels);

  // 2. le manifeste : pareil
  w = monde(function () { return new Rep('{"name":"nouveau"}'); });
  garder(w, 'manifest.webmanifest', '{"name":"ancien"}');
  r = await demander(w, 'manifest.webmanifest');
  ok(r && r.corps === '{"name":"nouveau"}', 'manifeste : le nouveau', r && r.corps);
  ok(gardee(w, 'manifest.webmanifest') === '{"name":"nouveau"}', 'manifeste : la copie gardée est remplacée');

  // 3. sans réseau : la copie gardée
  w = monde(function () { throw new Error('pas de réseau'); });
  garder(w, 'icons/icon-512.png', 'gardée');
  r = await demander(w, 'icons/icon-512.png');
  ok(r && r.corps === 'gardée', 'sans réseau : la copie gardée', r && r.corps);
  // … et sans copie : une erreur (pas d'attente sans fin)
  w = monde(function () { throw new Error('pas de réseau'); });
  r = await demander(w, 'icons/icon-512.png');
  ok(r && r.type === 'error', 'sans réseau ni copie : une erreur', r);

  // 4. un réseau qui traîne : la copie gardée au bout de NAV_WAIT, puis la copie est mise à jour quand la réponse arrive
  //    (la réponse est lue seule : demander() attendrait aussi la mise à jour de la copie)
  var lent = null, reponse = null, attentes = [];
  w = monde(function () { return new Promise(function (res) { lent = res; }); });
  garder(w, 'icons/icon-192.png', 'gardée');
  w.L.fetch({ request: { url: BASE + 'icons/icon-192.png', method: 'GET', mode: 'no-cors' }, respondWith: function (q) { reponse = q; }, waitUntil: function (q) { attentes.push(q); } });
  r = await Promise.race([reponse, attendre(400).then(function () { return null; })]);
  ok(r && r.corps === 'gardée', 'réseau lent : la copie gardée sans attendre', r && r.corps);
  lent(new Rep('nouvelle')); await Promise.all(attentes);
  ok(gardee(w, 'icons/icon-192.png') === 'nouvelle', 'réseau lent : la copie est mise à jour ensuite', gardee(w, 'icons/icon-192.png'));

  // 5. le site répond une erreur (404) : la copie gardée s'il y en a une, sinon l'erreur du site
  w = monde(function () { return new Rep('introuvable', { status: 404 }); });
  garder(w, 'icons/icon-192.png', 'gardée');
  r = await demander(w, 'icons/icon-192.png');
  ok(r && r.corps === 'gardée', 'erreur du site : la copie gardée', r && r.corps);
  ok(gardee(w, 'icons/icon-192.png') === 'gardée', 'erreur du site : la copie n\'est pas abîmée');
  w = monde(function () { return new Rep('introuvable', { status: 404 }); });
  r = await demander(w, 'icons/icon-192.png');
  ok(r && r.status === 404, 'erreur du site sans copie : la réponse du site', r && r.status);

  // 6. l'icône de l'écran d'accueil iPhone et celle de l'onglet portent ?v=N : la copie gardée de cette version, sans réseau
  var nv = /js\/app\.js\?v=(\d+)/.exec(html)[1];
  var touch = /<link rel="apple-touch-icon" href="([^"]+)"/.exec(html), fav = /<link rel="icon" href="([^"]+)"/.exec(html);
  ok(touch && touch[1] === 'icons/apple-touch-icon.png?v=' + nv, 'index.html : l\'icône de l\'écran d\'accueil iPhone suit la version du site', touch && touch[1]);
  ok(fav && fav[1] === 'icons/favicon.svg?v=' + nv, 'index.html : l\'icône de l\'onglet suit la version du site', fav && fav[1]);
  var versions = {}; html.replace(/(?:src|href)="[^"]+[?&]v=(\d+)"/g, function (_, v) { versions[v] = 1; });
  ok(Object.keys(versions).length === 1, 'index.html : un seul ?v= pour tous les fichiers', Object.keys(versions));
  ok(/<link rel="manifest" href="manifest\.webmanifest">/.test(html), 'index.html : l\'adresse du manifeste ne change pas (Android reconnaît l\'appli installée)');
  var man = JSON.parse(fs.readFileSync(path.join(RACINE, 'manifest.webmanifest'), 'utf8'));
  ok(man.icons.every(function (i) { return !/\?/.test(i.src) && fs.existsSync(path.join(RACINE, i.src)); }), 'manifeste : des icônes à adresse fixe, qui existent', man.icons);
  ok(fs.existsSync(path.join(RACINE, 'icons/apple-touch-icon.png')) && fs.existsSync(path.join(RACINE, 'icons/favicon.svg')), 'les fichiers d\'icônes existent');

  w = monde(function () { return new Rep('ne doit pas servir'); });
  garder(w, 'icons/apple-touch-icon.png?v=' + nv, 'icône v' + nv);
  r = await demander(w, 'icons/apple-touch-icon.png?v=' + nv);
  ok(r && r.corps === 'icône v' + nv && w.appels.length === 0, 'icône versionnée : la copie gardée, sans réseau', { r: r && r.corps, appels: w.appels });

  // 7. à l'installation du service worker, l'icône versionnée est gardée avec le reste de la page
  w = monde(function (url) { return url === BASE ? new Rep(html) : new Rep('fichier ' + url.slice(BASE.length)); });
  var att = null;
  w.L.install({ waitUntil: function (q) { att = q; } });
  await att;
  ok(gardee(w, 'icons/apple-touch-icon.png?v=' + nv) === 'fichier icons/apple-touch-icon.png?v=' + nv, 'installation : l\'icône de l\'écran d\'accueil est gardée', Object.keys(w.stock['mc-shell-1'] || {}).length);
  ok(gardee(w, 'icons/favicon.svg?v=' + nv) === 'fichier icons/favicon.svg?v=' + nv, 'installation : l\'icône de l\'onglet est gardée');
  ok(w.appels.filter(function (a) { return a.url !== BASE; }).every(function (a) { return a.cache === 'no-cache'; }), 'installation : les fichiers sont demandés au site, pas à la copie du navigateur');

  // 8. ce qui ne change pas : polices Google (copie d'abord), serveur Google jamais intercepté, une autre page du site non plus
  w = monde(function () { return new Rep('police'); });
  var vu = null;
  w.L.fetch({ request: { url: 'https://script.google.com/macros/s/x/exec', method: 'GET', mode: 'cors' }, respondWith: function (q) { vu = q; }, waitUntil: function () { } });
  ok(vu === null, 'le serveur Google n\'est jamais intercepté');
  vu = null;
  w.L.fetch({ request: { url: BASE + 'guide-parents/index.html', method: 'GET', mode: 'navigate' }, respondWith: function (q) { vu = q; }, waitUntil: function () { } });
  ok(vu === null, 'le guide des parents : le réseau, jamais la copie de l\'appli');

  console.log(fails ? fails + ' échec(s) sur ' + n : 'OK ' + n + ' vérifications (icônes et manifeste frais)');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.log('ÉCHEC : exception', e && e.stack); process.exit(1); });
