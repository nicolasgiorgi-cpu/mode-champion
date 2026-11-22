// (v93) Les animations des exercices ne laissent plus de traînée derrière les bras et les jambes sur iPhone et iPad.
// Cause : le halo néon était un flou SVG (feGaussianBlur) posé sur le bonhomme ; dans Safari, un trait qui bouge sous
// un filtre de flou ne fait pas effacer tout son halo d'une image à l'autre (bug WebKit 185074). Correction : plus aucun
// filtre dans les animations, le halo est fait de quatre copies plus larges et translucides de chaque partie du corps,
// dessinées sous le bonhomme et qui le suivent exactement.
// Lancer : node tests/test_anim_halo.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');

// un tout petit DOM : juste ce que js/anims.js utilise
function El(tag) { this.tagName = tag; this.attrs = {}; this.children = []; this.style = {}; this.parentNode = null; }
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; };
El.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.removeChild = function (c) { this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; return c; };
Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(El.prototype, 'isConnected', { get: function () { return true; } });
const document = { createElementNS: (ns, tag) => new El(tag) };
const ctx = { window: {}, document, console, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../js/anims.js', 'utf8'), ctx, { filename: 'anims.js' });
const A = ctx.MC.anim;

function tous(el, f) { f(el); el.children.forEach(c => tous(c, f)); }
const GEO = { path: ['d'], circle: ['cx', 'cy', 'r'] };
const keys = A.keys();
assert.ok(keys.length > 20, 'les animations sont là (' + keys.length + ')');

keys.forEach(key => {
  ['#3DFFB0', '#FF4FA3'].forEach(color => {
    const box = new El('div');
    A.mount(box, key, { paused: true, t: 0, color });
    const svg = box.firstChild;
    assert.ok(svg && svg.tagName === 'svg', key + ' : un svg');
    // aucun filtre nulle part (ni élément <filter>, ni attribut filter, ni style filter)
    tous(svg, el => {
      assert.ok(el.tagName !== 'filter' && el.tagName.indexOf('fe') !== 0, key + ' : pas d\'élément de filtre (' + el.tagName + ')');
      assert.ok(el.getAttribute('filter') == null, key + ' : pas d\'attribut filter');
      assert.ok(!/filter/.test(el.getAttribute('style') || '') && !el.style.filter, key + ' : pas de filtre en style');
    });
    // le bonhomme et ses quatre anneaux de halo, dans le même groupe qui bouge, les halos dessous
    const halos = [], figs = [];
    tous(svg, el => {
      const c = el.getAttribute('class');
      if (c === 'mc-halo') halos.push(el);
      if (c === 'mc-fig') figs.push(el);
    });
    assert.strictEqual(figs.length, 1, key + ' : un bonhomme');
    assert.strictEqual(halos.length, 4, key + ' : quatre anneaux de halo');
    const fig = figs[0], mov = fig.parentNode;
    halos.forEach(h => {
      assert.ok(h.parentNode === mov, key + ' : le halo bouge avec le bonhomme (même groupe, même miroir, même fondu)');
      assert.ok(mov.children.indexOf(h) < mov.children.indexOf(fig), key + ' : le halo est sous le bonhomme');
      const o = +h.getAttribute('opacity');
      assert.ok(o > 0.05 && o < 0.5, key + ' : halo translucide (' + o + ')');
      assert.strictEqual(h.children.length, fig.children.length, key + ' : une copie de halo par partie du corps');
    });
    // à chaque image, chaque copie du halo a exactement la forme de sa partie du corps, en plus large et sans remplissage
    for (let i = 0; i <= 12; i++) {
      A._renderAt(box, key, i / 12);
      fig.children.forEach((p, j) => {
        const w = +p.getAttribute('stroke-width');
        let prev = w;
        halos.slice().reverse().forEach(h => {
          const q = h.children[j];
          assert.strictEqual(q.tagName, p.tagName, key + ' : même type d\'élément');
          GEO[p.tagName].forEach(a => assert.strictEqual(q.getAttribute(a), p.getAttribute(a), key + ' t=' + (i / 12) + ' : le halo suit ' + a));
          assert.strictEqual(q.getAttribute('stroke'), p.getAttribute('stroke'), key + ' : même couleur');
          assert.strictEqual(q.getAttribute('opacity'), p.getAttribute('opacity'), key + ' : même opacité que sa partie');
          assert.ok(+q.getAttribute('stroke-width') > prev, key + ' : l\'anneau extérieur est plus large que l\'intérieur');
          prev = +q.getAttribute('stroke-width');
          assert.strictEqual(q.getAttribute('fill'), 'none', key + ' : le halo ne remplit rien');
          assert.strictEqual(q.getAttribute('stroke-linecap'), null, key + ' : bouts ronds hérités du groupe');
        });
        assert.ok(p.getAttribute('d') !== null || p.tagName === 'circle', key + ' : la partie est dessinée');
      });
    }
    assert.strictEqual(halos[0].getAttribute('stroke-linecap'), 'round');
    assert.strictEqual(fig.getAttribute('stroke-linecap'), 'round');
  });
});

// le fichier ne remet pas de filtre : garde-fou contre un retour en arrière
const src = fs.readFileSync(__dirname + '/../js/anims.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert.ok(!/feGaussian|['"]filter['"]|\.filter\s*=|filter\s*:|url\(#/.test(src), 'aucun filtre dans le code des animations');
console.log('test_anim_halo : OK (' + keys.length + ' animations)');
