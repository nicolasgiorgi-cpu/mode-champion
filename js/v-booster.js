/* =========================================================
   Mode champion · M12 — la NOUVELLE ÉTOILE : l'ouverture du booster (visuels v2, 25/10/2026)
   Demandé par Nicolas : « comme l'ouverture d'un booster dans les jeux vidéo, très gratifiant,
   avec de l'impact, des effets de lumière, une petite explosion ».
   - Jamais à l'ouverture de l'appli : l'onglet Skills s'allume en doré (app.js), le booster se joue
     quand l'enfant ouvre Skills.
   - Une étoile : le booster à la couleur et à l'icône de la carte. Plusieurs d'un coup : un seul booster,
     qui révèle toutes les étoiles ensemble, rangées par carte (jamais une par une).
   - Étapes : arrivée (« Touche pour ouvrir ») → charge (il tremble, la lumière sort) → petite explosion
     (flash, ondes de choc, éclats ; un son si le son est activé) → révélation (l'étoile tourne, son nom,
     l'éduc ; +XP, grade) → « Ranger dans mon carnet » : l'étoile vole jusqu'à sa place.
   - « Passer » à tout moment ; Échap aussi. Moins d'animations demandé par le téléphone : la révélation directement.
   - Une étoile qui se met à briller (plateau) : le même booster, en blanc et arc-en-ciel.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var ui = MC.ui, SK = MC.SK, C = MC.CONTENT, L = MC.logic;
  var esc = ui.esc;
  var SPARK = 'M0 -10L2.2 -2.2 10 0 2.2 2.2 0 10 -2.2 2.2 -10 0 -2.2 -2.2Z';
  var COLS = ['#FFC23D', '#FFFFFF', '#FF4FA3', '#FFE9A8', '#38E8FF', '#FFC23D'];

  function reduit() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function jour(iso) { return iso ? ui.fmtDate(String(iso).slice(0, 10)) : ''; }

  // ce qui arrive : pour chaque étoile, gagnée (nouvelle) et/ou qui brille ; XP ; changements de grade
  function analyse(me, nouv, lu) {
    var items = nouv.map(function (e) {
      var neuve = (e.cree || '') > lu;
      return { e: e, d: e.domaine, s: SK.star(e.domaine, e.etoile), neuve: neuve, brille: !!e.brille, D: SK.dom(e.domaine) };
    }).filter(function (x) { return x.s && x.D; });
    // l'ordre du carnet, puis l'ordre des étoiles dans la carte
    items.sort(function (a, b) { var ia = SK.DOMAINES.indexOf(a.D), ib = SK.DOMAINES.indexOf(b.D); return ia !== ib ? ia - ib : a.D.etoiles.indexOf(a.s) - b.D.etoiles.indexOf(b.s); });
    var xp = items.reduce(function (t, x) { return t + (x.neuve ? C.XP.etoile : 0) + (x.brille ? C.XP.brille : 0); }, 0);
    // les cartes avant / après (sans les étoiles qui viennent d'arriver)
    var keys = {}; items.forEach(function (x) { keys[SK.key(x.d, x.e.etoile)] = x; });
    var avant = { etoiles: (me.etoiles || []).filter(function (e) { var x = keys[SK.key(e.domaine, e.etoile)]; return !(x && x.neuve); }).map(function (e) { var x = keys[SK.key(e.domaine, e.etoile)]; return x && !x.neuve ? Object.assign({}, e, { brille: '' }) : e; }) };
    var grades = [];
    SK.DOMAINES.forEach(function (D) {
      if (!items.some(function (x) { return x.D === D; })) return;
      var g0 = SK.carte(avant, D.id).grade, g1 = SK.carte(me, D.id).grade;
      if (g1.n !== g0.n) grades.push({ D: D, de: g0, a: g1 });
    });
    return { items: items, xp: xp, grades: grades, holo: items.every(function (x) { return !x.neuve && x.brille; }) };
  }

  function bigStar(brille) {
    var STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
    return '<svg viewBox="-3 -3 30 30" aria-hidden="true"><path d="' + STAR + '" fill="#FFC23D"/><path d="M12 2.5V12L2.6 9.4l6.6-.8z" fill="#FFE9A8"/><path d="M12 12l4.9 2.4 1.3 6.6L12 17.3z" fill="#E0A020"/>' +
      '<path d="M12 2.5l2.9 6.1L12 12zM21.5 9.4l-4.9 4.6L12 12z" fill="#FFD56A"/><path d="' + STAR + '" fill="none" stroke="#FFFFFF" stroke-width="' + (brille ? 1.4 : 0.9) + '" stroke-linejoin="round"/>' +
      (brille ? '<path d="M20.5 .3l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="#FFFFFF"/>' : '') + '</svg>';
  }
  function particles() {
    var o = '';
    for (var k = 0; k < 24; k++) {
      var a = (k * 15 + (k % 2 ? 7 : -5)) * Math.PI / 180, dist = 140 + (k * 37) % 90, sz = 9 + (k * 5) % 9;
      o += '<span class="bk-pt" style="--dx:' + Math.round(dist * Math.cos(a)) + 'px;--dy:' + Math.round(dist * Math.sin(a)) + 'px;--r:' + ((k * 47) % 360) + 'deg;--s:' + sz + 'px;--pc:' + COLS[k % COLS.length] + '">' +
        (k % 3 === 0 ? '<svg width="' + (sz * 2) + '" height="' + (sz * 2) + '" viewBox="-10 -10 20 20" style="display:block;margin:-' + sz + 'px 0 0 -' + sz + 'px;overflow:visible"><path d="' + SPARK + '" fill="' + COLS[k % COLS.length] + '"/></svg>' : '<i></i>') + '</span>';
    }
    return o;
  }

  function html(A, me) {
    var one = A.items.length === 1, x0 = A.items[0], D0 = x0.D, multiCartes = A.items.some(function (x) { return x.D !== D0; });
    var bc = A.holo ? '#FFFFFF' : multiCartes ? '#FFC23D' : D0.color;
    var nb = A.items.length, chip = A.holo ? (nb > 1 ? nb + ' ÉTOILES QUI BRILLENT' : '1 ÉTOILE QUI BRILLE') : (nb > 1 ? nb + ' NOUVELLES ÉTOILES' : '1 NOUVELLE ÉTOILE');
    var icone = multiCartes ? '<svg viewBox="-3 -3 30 30" aria-hidden="true">' + bigStar(false).replace(/^<svg[^>]*>/, '').replace('</svg>', '') + '</svg>' : MC.ICO_SK[D0.id] ? MC.ICO_SK[D0.id]('bk-' + D0.id) : '';
    var pack = '<button type="button" class="bk-pack' + (A.holo ? ' holo' : '') + '" data-bk="open" aria-label="Ouvrir le booster : ' + chip.toLowerCase() + '">' +
      '<span class="bk-top"><span class="bk-crimp"></span><span class="bk-brand">MODE CHAMPION</span><span class="bk-white"></span></span>' +
      '<span class="bk-bot"><span class="bk-ic">' + icone + '</span><b class="bk-nm">Skills</b><span class="bk-chip">' + chip + '</span><span class="bk-crimp"></span><span class="bk-foil"></span><span class="bk-white"></span></span>' +
      '<span class="bk-seam"></span></button>';
    var stage = '<div class="bk-rays"></div><div class="bk-stage"><span class="bk-glow"></span>' + pack +
      '<span class="bk-hint">TOUCHE POUR OUVRIR</span><span class="bk-shock"></span><span class="bk-shock s2"></span>' + particles() + '</div>';
    var rev;
    if (one) {
      var e = x0.e, kick = x0.D.nom + ' · ' + (x0.neuve ? (x0.brille ? 'nouvelle étoile, elle brille déjà' : 'nouvelle étoile') : 'ton étoile brille');
      var qui = x0.neuve ? (e.parNom ? 'Validée par ' + esc(e.parNom) + (e.date ? ' · ' + jour(e.date) : '') : '') : (e.brilleParNom ? 'Vue au plateau par ' + esc(e.brilleParNom) + (e.brille ? ' · ' + jour(e.brille) : '') : '');
      var sp = [[-92, -70, 18, 0], [78, -40, 14, .5], [66, 58, 20, .25], [-84, 50, 12, .8], [6, -96, 12, 1.1], [-30, 84, 10, .4]].map(function (p) {
        return '<span class="bk-sp" style="left:calc(50% + ' + (p[0] - p[2] / 2) + 'px);top:calc(40% + ' + (p[1] - p[2] / 2) + 'px);--d:' + p[3] + 's"><svg width="' + p[2] + '" height="' + p[2] + '" viewBox="-10 -10 20 20" style="display:block;overflow:visible"><path d="' + SPARK + '" fill="#FFF6DA"/></svg></span>';
      }).join('');
      rev = sp + '<span class="bk-star" data-k="' + esc(SK.key(x0.d, e.etoile)) + '">' + bigStar(x0.brille) + '</span>' +
        '<div class="bk-txt"><span class="bk-k">' + esc(kick) + '</span><b class="bk-t"' + (x0.s.nom.length > 13 ? ' style="font-size:42px"' : '') + '>' + esc(x0.s.nom) + '</b><span class="bk-p">« ' + esc(x0.s.phrase) + ' »</span>' + (qui ? '<span class="bk-q">' + qui + '</span>' : '') + '</div>';
    } else {
      var groupes = [], cur = null, i = 0;
      A.items.forEach(function (x) { if (!cur || cur.D !== x.D) { cur = { D: x.D, l: [] }; groupes.push(cur); } cur.l.push(x); });
      rev = '<div class="bk-multi"><span class="bk-k">' + esc(chip) + '</span>' + groupes.map(function (g) {
        return '<div class="bk-grp" style="--gc:' + g.D.color + '"><b>' + esc(g.D.nom) + '</b><div class="bk-row">' + g.l.map(function (x) {
          i++;
          return '<span class="bk-mini" style="--d:' + (0.12 * i).toFixed(2) + 's" data-k="' + esc(SK.key(x.d, x.e.etoile)) + '">' + bigStar(x.brille) + '<span>' + esc(x.s.nom) + (x.brille && !x.neuve ? ' · brille' : '') + '</span></span>';
        }).join('') + '</div></div>';
      }).join('') + '</div>';
    }
    var chips = '<span class="bk-xp">+' + A.xp + ' XP</span>' + A.grades.map(function (g) {
      return '<span class="bk-gr" style="--gc:' + g.a.color + '"><span style="color:' + g.de.color + '">' + esc(g.de.nom.toUpperCase()) + '</span><span style="color:#8A93AD">▸</span><span style="color:' + g.a.color + '">' + esc(g.a.nom.toUpperCase()) + '</span>' + (A.grades.length > 1 || !one ? '<span style="color:#AEB6CC">· ' + esc(g.D.nom.toUpperCase()) + '</span>' : '') + '</span>';
    }).join('');
    var dire = A.items.map(function (x) { return x.D.nom + ' · ' + x.s.nom + (x.brille && !x.neuve ? ' (elle brille)' : ''); }).join(', ');
    return '<div class="bk" role="dialog" aria-modal="true" aria-label="' + esc(chip.toLowerCase()) + '" style="--bc:' + bc + '">' +
      '<div class="bk-ov"></div><button type="button" class="bk-skip" data-bk="skip">PASSER ›</button>' + stage +
      '<div class="bk-flash"></div><div class="bk-rev">' + rev + '</div>' +
      '<div class="bk-end"><div class="bk-chips">' + chips + '</div><button type="button" class="bk-btn" data-bk="store">Ranger dans mon carnet</button></div>' +
      '<p class="sr-only" aria-live="polite" data-bk="live"></p><span class="sr-only" data-bk="dire">' + esc((nb > 1 ? nb + ' nouvelles étoiles : ' : 'Nouvelle étoile : ') + dire + '. +' + A.xp + ' XP.') + '</span></div>';
  }

  // le son de l'explosion (seulement si le son n'est pas coupé dans les réglages)
  function boum() { if (ui.isMuted && ui.isMuted()) return; try { ui.beep(110, 0.28, 0.25); setTimeout(function () { ui.beep(660, 0.12, 0.12); }, 90); setTimeout(function () { ui.beep(990, 0.18, 0.1); }, 200); } catch (e) { } }

  // me : le dossier de l'enfant ; nouv : les étoiles arrivées (lignes) ; lu : la date de la dernière visite du carnet
  // renvoie une promesse : les clés des étoiles, quand le booster est fermé (rangé ou passé)
  MC.booster = function (me, nouv, lu) {
    var A = analyse(me, nouv, lu || '');
    if (!A.items.length) return Promise.resolve([]);
    return new Promise(function (resolve) {
      var host = document.createElement('div');
      host.innerHTML = html(A, me);
      var bk = host.firstChild, timers = [], fini = false, avant = document.activeElement;
      document.body.appendChild(bk);
      var keys = A.items.map(function (x) { return SK.key(x.d, x.e.etoile); });
      function phase(p) { bk.setAttribute('data-ph', p); }
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      function dire() { var l = bk.querySelector('[data-bk="live"]'), t = bk.querySelector('[data-bk="dire"]'); if (l && t) l.textContent = t.textContent; }
      function reveal() {
        phase('reveal'); dire();
        later(function () { var b = bk.querySelector('.bk-btn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } }, reduit() ? 0 : 1450);
      }
      function ouvrir() {
        if (bk.getAttribute('data-ph') !== 'arrive') return;
        if (ui.unlockAudio) ui.unlockAudio();
        if (reduit()) { reveal(); return; }
        phase('charge');
        later(function () { phase('boom'); boum(); }, 1000);
        later(reveal, 1450);
      }
      function fermer() {
        if (fini) return; fini = true;
        timers.forEach(clearTimeout);
        document.removeEventListener('keydown', onKey, true);
        if (bk.parentNode) bk.parentNode.removeChild(bk);
        if (avant && avant.focus) try { avant.focus({ preventScroll: true }); } catch (e) { }
        resolve(keys);
      }
      // ranger : les étoiles volent jusqu'à leur place dans les cartes (la 1re carte est amenée à l'écran)
      function ranger() {
        if (fini || bk.getAttribute('data-ph') === 'store') return;
        if (reduit()) { fermer(); return; }
        var cible0 = document.querySelector('.sk-tilt[data-carte="' + A.items[0].d + '"]');
        if (cible0 && cible0.scrollIntoView) { var r0 = cible0.getBoundingClientRect(); if (r0.top < 70 || r0.bottom > window.innerHeight - 90) cible0.scrollIntoView({ block: 'center' }); }
        phase('store');
        var src = Array.prototype.slice.call(bk.querySelectorAll('[data-k]'));
        src.forEach(function (el) {
          var k = el.getAttribute('data-k'), x = A.items.filter(function (y) { return SK.key(y.d, y.e.etoile) === k; })[0];
          if (!x) return;
          var card = document.querySelector('.sk-tilt[data-carte="' + x.d + '"]'), idx = x.D.etoiles.indexOf(x.s);
          var pip = card && card.querySelectorAll('.sk-pips .et')[idx];
          var r = el.getBoundingClientRect(), svg = el.querySelector('svg');
          if (!pip || !svg) return;
          var t = pip.getBoundingClientRect();
          if (t.bottom < 0 || t.top > window.innerHeight) return;
          var fly = document.createElement('div');
          fly.className = 'bk-fly';
          var w = svg.getBoundingClientRect();
          fly.style.left = w.left + 'px'; fly.style.top = w.top + 'px'; fly.style.width = w.width + 'px'; fly.style.height = w.height + 'px';
          fly.innerHTML = bigStar(x.brille);
          document.body.appendChild(fly);
          el.style.visibility = 'hidden';
          var dx = t.left + t.width / 2 - (w.left + w.width / 2), dy = t.top + t.height / 2 - (w.top + w.height / 2), sc = Math.max(0.08, t.width * 1.25 / w.width);
          requestAnimationFrame(function () { requestAnimationFrame(function () { fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')'; fly.style.opacity = '0'; }); });
          setTimeout(function () { if (fly.parentNode) fly.parentNode.removeChild(fly); }, 900);
        });
        later(fermer, 760);
      }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); fermer(); } else if ((e.key === 'Enter' || e.key === ' ') && bk.getAttribute('data-ph') === 'arrive') { e.preventDefault(); ouvrir(); } }
      document.addEventListener('keydown', onKey, true);
      bk.addEventListener('click', function (ev) {
        var t = ev.target.closest('[data-bk]'), a = t && t.getAttribute('data-bk');
        if (a === 'skip') { ev.preventDefault(); fermer(); return; }
        if (a === 'store') { ev.preventDefault(); ranger(); return; }
        if (bk.getAttribute('data-ph') === 'arrive') { ev.preventDefault(); ouvrir(); }   // un toucher n'importe où ouvre le booster
      });
      if (reduit()) reveal();
      else requestAnimationFrame(function () { phase('arrive'); var p = bk.querySelector('.bk-pack'); if (p) try { p.focus({ preventScroll: true }); } catch (e) { } });
    });
  };
  MC.boosterAnalyse = analyse;
})();
