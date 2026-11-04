/* Banc d'essai TEMPORAIRE (branche essai-ipad, jamais sur main) : reproduire sur le simulateur iPad le dédoublement
   de la page pendant le rebond et le « tirer pour actualiser », et comparer des façons de faire bouger la page.
   Données de démo uniquement (API_URL vide). */
(function () {
  var V = ['A', 'B', 'C', 'D'];
  var NOMS = { A: 'A · v40 telle quelle', B: 'B · page opaque', C: 'C · opaque + couche fixe', D: 'D · sans couche (top)' };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  var variante = get('essai-v', 'A'), auto = get('essai-auto', '0') === '1';
  document.documentElement.classList.add('essai-' + variante);

  var css = document.createElement('style');
  css.textContent =
    '#essai{position:fixed;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;flex-wrap:wrap;gap:4px;max-width:330px;padding:6px;background:#FFF;color:#000;font:600 12px/1.2 system-ui;border:2px solid #F0F;opacity:.92}' +
    '#essai button{font:600 12px/1 system-ui;padding:7px 8px;border:1px solid #888;background:#EEE;color:#000;border-radius:4px}' +
    '#essai button.on{background:#F0F;color:#FFF}' +
    '#essai .t{width:100%}' +
    'html.essai-B #app,html.essai-C #app{background:var(--bg)}' +
    'html.essai-C .bgfx{display:none}' +
    'html.essai-C #app{will-change:transform;min-height:100vh}' +
    'html.essai-D #app,html.essai-D #app.eb-prep{will-change:auto!important}';
  document.head.appendChild(css);

  // D : la page bouge par « top » (pas de couche graphique) au lieu de transform : on intercepte app.style.transform
  function versTop(app) {
    var st = app.style, cur = '';
    Object.defineProperty(st, 'transform', { configurable: true, get: function () { return cur; }, set: function (v) {
      cur = v || ''; var m = /translate3d\(\s*0(?:px)?\s*,\s*(-?[\d.]+)px/.exec(cur);
      if (m) { st.position = 'relative'; st.top = m[1] + 'px'; } else { st.top = ''; }
    } });
  }

  function panneau() {
    var app = document.getElementById('app');
    if (!app || document.getElementById('essai')) return;
    if (variante === 'D') versTop(app);
    var p = document.createElement('div'); p.id = 'essai';
    p.innerHTML = '<div class="t">Essai · ' + NOMS[variante] + '</div>' +
      V.map(function (v) { return '<button data-v="' + v + '"' + (v === variante ? ' class="on"' : '') + '>' + v + '</button>'; }).join('') +
      '<button data-a="auto"' + (auto ? ' class="on"' : '') + '>Rebond auto</button>' +
      '<button data-a="bas">Rebond bas</button><button data-a="haut">Tirer</button>';
    document.body.appendChild(p);
    p.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.v) { set('essai-v', b.dataset.v); location.reload(); return; }
      if (b.dataset.a === 'auto') { auto = !auto; set('essai-auto', auto ? '1' : '0'); b.classList.toggle('on', auto); if (auto) boucle(); return; }
      bouge(b.dataset.a === 'bas' ? -1 : 1, 2500);
    });
    if (auto) boucle();
  }

  // imite le rebond de js/app.js : la page sur sa couche (eb-prep), elle glisse, reste, puis revient
  var occupe = false;
  function bouge(dir, tenir, fin) {
    if (occupe) return; occupe = true;
    var app = document.getElementById('app'), bar = app.querySelector('.topbar'), max = dir < 0 ? 110 : 120, t0 = 0;
    app.classList.add('eb-prep');
    function pose(x) {
      app.style.transform = x ? 'translate3d(0,' + x.toFixed(1) + 'px,0)' : '';
      if (bar) bar.style.transform = x < 0 ? 'translate3d(0,' + (-x).toFixed(1) + 'px,0)' : '';
    }
    function aller(now) {
      if (!t0) t0 = now; var k = Math.min(1, (now - t0) / 300);
      pose(dir * max * k);
      if (k < 1) requestAnimationFrame(aller);
      else setTimeout(function () { t0 = 0; requestAnimationFrame(retour); }, tenir);
    }
    function retour(now) {
      if (!t0) t0 = now; var k = Math.min(1, (now - t0) / 400);
      pose(dir * max * (1 - k));
      if (k < 1) requestAnimationFrame(retour);
      else { pose(0); setTimeout(function () { app.classList.remove('eb-prep'); occupe = false; if (fin) fin(); }, 1500); }
    }
    setTimeout(function () { requestAnimationFrame(aller); }, 60);
  }
  var dirAuto = -1;
  function boucle() { if (!auto) return; bouge(dirAuto, 2500, function () { dirAuto = -dirAuto; setTimeout(boucle, 800); }); }

  // connexion automatique en démo (enfant « Tom ») la première fois
  function connecte() {
    if (!window.MC || !MC.app || !MC.api || !MC.demo) return setTimeout(connecte, 300);
    try { if (localStorage.getItem('mc-kid') || localStorage.getItem('mc-adult')) return; } catch (e) { return; }
    MC.api.call('roster', {}).then(function (r) {
      var k = (r.joueurs || r).find(function (x) { return x.prenom === 'Tom'; });
      return MC.api.call('login', { joueurId: k.id, pin: MC.demo.CODES.enfant });
    }).then(function (res) { MC.app.setKid({ token: res.token, joueur: res.joueur }); if (res.me) MC.app.setMe(res.me); location.hash = '#/semaine'; });
  }
  function demarre() { panneau(); connecte(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarre); else demarre();
})();
