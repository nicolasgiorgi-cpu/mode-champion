// (v34) sw.js : les alertes sur l'écran du téléphone. Le service worker tourne dans une bulle (vm) avec un faux « self » :
// une alerte reçue s'affiche TOUJOURS (même mal formée), le lien est contrôlé, et la toucher ouvre (ou ramène) l'appli sur la cloche.
// node tests/test_sw_alertes.js
var fs = require('fs'), vm = require('vm'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
var BASE = 'https://exemple.github.io/mode-champion/';
var fails = 0, n = 0;
function ok(c, m, info) { n++; if (!c) { fails++; console.log('ÉCHEC :', m, info === undefined ? '' : JSON.stringify(info)); } }

function monde(fenetres) {
  var L = {}, montre = [], ouvert = [], messages = [], focus = [];
  var self = {
    location: { origin: 'https://exemple.github.io' },
    registration: { scope: BASE, showNotification: function (t, o) { montre.push({ titre: t, o: o }); return Promise.resolve(); } },
    addEventListener: function (t, f) { L[t] = f; },
    clients: {
      matchAll: function () { return Promise.resolve((fenetres || []).map(function (u, i) {
        return { url: u, postMessage: function (m) { messages.push({ i: i, m: m }); }, focus: function () { focus.push(i); return Promise.resolve(this); } };
      })); },
      openWindow: function (u) { ouvert.push(u); return Promise.resolve(null); },
      claim: function () { return Promise.resolve(); }
    },
    skipWaiting: function () { }
  };
  var ctx = { self: self, URL: URL, Promise: Promise, caches: {}, fetch: function () { return Promise.reject(new Error('réseau')); }, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { L: L, montre: montre, ouvert: ouvert, messages: messages, focus: focus };
}
function pousser(w, data) {
  var attente = null;
  var ev = { data: data === undefined ? null : data, waitUntil: function (p) { attente = p; } };
  w.L.push(ev);
  return attente || Promise.resolve();
}
function charge(o) { return { json: function () { return JSON.parse(JSON.stringify(o)); }, text: function () { return JSON.stringify(o); } }; }
function brut(t) { return { json: function () { throw new Error('pas du JSON'); }, text: function () { return t; } }; }
function toucher(w, lien) {
  var attente = null, ferme = 0;
  w.L.notificationclick({ notification: { data: { lien: lien }, close: function () { ferme++; } }, waitUntil: function (p) { attente = p; } });
  return (attente || Promise.resolve()).then(function () { return ferme; });
}

(async function () {
  var w = monde();
  ok(typeof w.L.push === 'function' && typeof w.L.notificationclick === 'function', 'sw.js écoute push et notificationclick');

  // 1. le message de Firebase (data) : titre, texte, lien, une alerte par sorte (tag)
  await pousser(w, charge({ data: { titre: 'Mode champion', texte: 'Tom a fait la séance de Cros.', lien: '#/educ/notifs', tag: 'seance' }, from: '123', fcmMessageId: 'x' }));
  var a = w.montre[0];
  ok(a && a.titre === 'Mode champion' && a.o.body === 'Tom a fait la séance de Cros.', 'alerte : titre et texte', a);
  ok(a && a.o.tag === 'seance' && a.o.renotify === true, 'alerte : une par sorte (tag), elle sonne encore', a && a.o);
  ok(a && a.o.data.lien === '#/educ/notifs', 'alerte : le lien de la cloche est gardé', a && a.o.data);
  ok(a && a.o.icon === BASE + 'icons/icon-192.png', 'alerte : l\'icône de l\'appli', a && a.o.icon);

  // 2. toujours une alerte, même avec un message vide ou abîmé (sinon iOS coupe l'abonnement)
  await pousser(w, null);
  ok(w.montre.length === 2 && w.montre[1].titre === 'Mode champion' && /appli/.test(w.montre[1].o.body), 'message vide : une alerte quand même', w.montre[1]);
  await pousser(w, brut('pas du json'));
  ok(w.montre.length === 3 && w.montre[2].o.body === 'pas du json', 'message en texte : affiché tel quel', w.montre[2]);
  await pousser(w, charge({ notification: { title: 'Titre', body: 'Corps' } }));
  ok(w.montre[3].titre === 'Titre' && w.montre[3].o.body === 'Corps', 'message « notification » : compris aussi', w.montre[3]);
  await pousser(w, charge({ data: { texte: 'x' } }));
  ok(!w.montre[4].o.tag && w.montre[4].titre === 'Mode champion', 'sans tag : pas de tag, titre par défaut', w.montre[4].o);

  // 3. un lien qui n'est pas une adresse de l'appli est jeté
  for (var l of ['javascript:alert(1)', 'https://ailleurs.example/#/educ', '#/educ/notifs"><b>', '//ailleurs.example']) {
    var k = w.montre.length;
    await pousser(w, charge({ data: { titre: 't', texte: 'u', lien: l } }));
    ok(w.montre[k].o.data.lien === '', 'lien refusé : ' + l, w.montre[k].o.data);
  }

  // 4. toucher l'alerte, appli fermée : elle s'ouvre sur la cloche du bon profil
  var f = await toucher(w, '#/parent/notifs');
  ok(f === 1, 'toucher : l\'alerte se ferme');
  ok(w.ouvert.length === 1 && w.ouvert[0] === BASE + '#/parent/notifs', 'appli fermée : elle s\'ouvre sur la cloche', w.ouvert);

  // 5. appli déjà ouverte : elle revient au premier plan et va sur la cloche (pas de 2e fenêtre)
  var w2 = monde(['https://autre.example/', BASE + '#/educ/entrainements']);
  await toucher(w2, '#/educ/notifs');
  ok(w2.ouvert.length === 0, 'appli ouverte : pas de nouvelle fenêtre', w2.ouvert);
  ok(w2.focus.length === 1 && w2.focus[0] === 1, 'appli ouverte : c\'est elle qui revient (pas l\'autre site)', w2.focus);
  ok(w2.messages.length === 1 && w2.messages[0].m.mc === 'aller' && w2.messages[0].m.lien === '#/educ/notifs', 'appli ouverte : elle va sur la cloche', w2.messages);

  // 6. un lien abîmé au toucher : l'appli s'ouvre à son adresse de départ
  var w3 = monde();
  await toucher(w3, 'javascript:alert(1)');
  ok(w3.ouvert[0] === BASE, 'lien abîmé : l\'appli s\'ouvre simplement', w3.ouvert);

  console.log(fails ? 'test_sw_alertes : ' + fails + ' échec(s) sur ' + n : 'test_sw_alertes : OK (' + n + ')');
  process.exit(fails ? 1 : 0);
})();
