/* =========================================================
   Mode champion · M12 — outils d'affichage
   ========================================================= */
window.MC = window.MC || {};

MC.ui = (function () {
  var C = MC.CONTENT;

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Icônes (traits) ----------
  var P = {
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chat: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    podium: '<path d="M3 21v-7h6v7M9 21V9h6v12M15 21v-5h6v5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    del: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M12 9l6 6M18 9l-6 6"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    gift: '<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M12 9v11M7.5 9C6 9 5 8 5 6.8S6.2 4.5 7.5 5.2C9.5 6.2 12 9 12 9s2.5-2.8 4.5-3.8C17.8 4.5 19 5.6 19 6.8S18 9 16.5 9"/>',
    send: '<path d="M4 12l16-8-6 16-3-6z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    up: '<path d="M6 15l6-6 6 6M6 20l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6M6 4l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
    skipb: '<path d="M18 6L10 12l8 6zM6 6v12"/>',
    skipf: '<path d="M6 6l8 6-8 6zM18 6v12"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    home: '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6"/>',
    group: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.8-3.5 3-5.5 6-5.5s5.2 2 6 5.5M14.5 15c2.8-.3 5 1.5 6 5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    sheet: '<path d="M4 3h16v18H4zM4 9h16M4 15h16M10 3v18"/>',
    logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    bar: '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    // Skills : le maul (trois joueurs liés) et la défense (une ligne)
    pack: '<circle cx="6" cy="7" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><path d="M3 20v-4.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V20M8.5 12.5l1 7.5M15.5 12.5l-1 7.5"/>',
    wall: '<path d="M3 6h18v12H3zM3 12h18M9 6v6M15 12v6"/>',
    heart: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/>',
    spring: '<path d="M7 3h10M7 21h10M7 3l10 3.6L7 10.2l10 3.6L7 17.4 17 21"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    ball: '<ellipse cx="12" cy="12" rx="9" ry="6" transform="rotate(-35 12 12)"/><path d="M8 16l8-8M10 11l3 3M12 9l3 3"/>',
    leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15zM5 19l7-7"/>',
    star: '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.8-4-8-.4 2.2-1.6 3.6-3 4 .2-3.4-1.4-6.4-4-9 .4 3.6-1 5.6-2.4 7.6C4.6 11.4 5 13 5 15c0 4.2 3 7 7 7z"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/>',
    house: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5"/>',
    hang: '<path d="M4 4h16M8 4v4M16 4v4"/><circle cx="12" cy="11" r="2"/><path d="M8 8l4 5 4-5M12 13v4M10 21l2-4 2 4"/>',
    flamingo: '<circle cx="13" cy="4" r="2"/><path d="M13 6v7M9 9l4 2 4-2M13 13l-1 8M13 13l3 3-2 1"/>',
    arm: '<path d="M3 20h12.5a4.5 4.5 0 0 0 4.5-4.6L19.6 7a3 3 0 0 0-3-2.8h-1.4A2.2 2.2 0 0 0 13 6.5l.4 4.2c-1.6-1.4-3.8-1.9-6-1.3C4.8 10.1 3 12 3 14.5z"/><path d="M8 15.5c1.8 1 3.8 1 5.6-.2"/>',
    gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4.5-5.5"/><circle cx="12" cy="17" r="1.2"/><path d="M6 13.5l1.4.8M12 8.5V10M18 13.5l-1.4.8"/>',
    infinity: '<path d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4z"/>',
    boot: '<path d="M2.5 17.5V13c0-.6.4-1 1-1H7l2.2-3.2c.3-.5 1-.6 1.5-.3l1.3.9 1.2 2.1 4.6 1.7c2 .7 3.7 2.2 3.7 4.3z"/><path d="M2.5 17.5h19v1.5a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1z"/><path d="M11 12.5l1.2-1M13 13.5l1.2-1"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    kids: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
    plus1: '<path d="M4 12h6M7 9v6"/><path d="M15 8l3-2v12"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevd: '<path d="M6 9l6 6 6-6"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/>',
    vest: '<path d="M3 11l9-7 9 7v10h-6v-6H9v6H3z"/>',
    board: '<rect x="4" y="4" width="16" height="17" rx="1"/><path d="M9 4V2.5h6V4M8 9l2.5 2.5M10.5 9L8 11.5M15 15.5h.01M9 17.5c1.5-3 4-4.5 6-6"/>',
    // un engrenage, comme dans la plupart des applis
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };
  function icon(name, size, extra) {
    var s = size || 20;
    var fill = (name === 'star' || name === 'flame' || name === 'play') ? 'currentColor' : 'none';
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + fill + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra ? ' ' + extra : '') + '>' + (P[name] || '') + '</svg>';
  }
  function starSvg(size, fill, stroke) {
    return '<svg class="star" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + P.star.match(/d="([^"]+)"/)[1] + '" fill="' + (fill || 'none') + '" stroke="' + (stroke || '#34405F') + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  function levelIcon() {
    return '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 5l4-3 4 3M2 8l4-3 4 3M2 11l4-3 4 3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  }
  function lvl(n, label) {
    var L = C.NIVEAUX[n] || C.NIVEAUX[1];
    return '<span class="lvl" style="--lc:' + L.color + '">' + levelIcon() + esc(label || L.code) + '</span>';
  }
  function hexToRgba(hex, a) {
    var h = (hex || '#38E8FF').replace('#', '');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function avatar(prenom, color, size) {
    var s = size || 44;
    var initial = esc((String(prenom || '?').trim().charAt(0) || '?').toUpperCase());
    return '<span class="av" style="width:' + s + 'px;height:' + s + 'px;--as:' + s + 'px;--ac:' + esc(color || '#38E8FF') + ';--ag:' + hexToRgba(color, 0.6) + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4L90 18V48C90 72 72 88 50 97C28 88 10 72 10 48V18Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="6"/></svg><b>' + initial + '</b></span>';
  }
  function hexa(prenom, color) { return avatar(prenom, color, 32); }

  // ---------- Doses ----------
  function doseLabel(d) {
    if (!d) return '';
    if (d.k === 'reps') return d.s + ' × ' + d.r + (d.u ? ' ' + d.u : '') + (d.cote ? ' / ' + d.cote : '');
    if (d.k === 'time') return (d.s > 1 ? d.s + ' × ' : '') + d.t + ' s' + (d.s === 1 && d.txt && d.txt.indexOf('par pied') === 0 ? ' / pied' : '');
    if (d.k === 'count') return d.r + ' ' + (d.unite || '');
    if (d.k === 'inter') return d.n + ' × (' + d.w + ' s / ' + d.p + ' s)';
    if (d.k === 'circuit') return d.tours + ' tours';
    if (d.k === 'dist') return d.s + ' × ' + d.m + ' m';
    return '';
  }
  function doseInfo(d) {
    if (!d) return '';
    var parts = [];
    if (d.k === 'inter') parts.push(d.w + ' s de corde puis ' + d.p + ' s de marche');
    if (d.k === 'circuit') parts.push('repos ' + (d.p >= 60 ? '1 min' : d.p + ' s') + ' entre les tours');
    if (d.txt && !(d.k === 'time' && d.s === 1 && d.txt === 'par pied')) parts.push(d.txt.replace(/^par pied, /, ''));
    return parts.join(' · ');
  }

  // ---------- Dates ----------
  var JOURS_C = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2], 12);
    return JOURS_C[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS_C[d.getMonth()];
  }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  // les temps d'une minute ou plus s'écrivent « 1 min 15 s »
  function minSec(v) { var a = Math.round(Math.abs(v)); return { neg: v < 0, m: Math.floor(a / 60), s: a % 60 }; }
  function fmtVal(v, unite, dec) {
    if (v === null || v === undefined || v === '') return '—';
    if (unite === 's' && !dec && Math.abs(v) >= 60) { var t = minSec(v); return (t.neg ? '-' : '') + t.m + ' min' + (t.s ? ' ' + t.s + ' s' : ''); }
    var s = dec ? String(Math.round(v * 10) / 10).replace('.', ',') : String(Math.round(v));
    return s + (unite ? ' ' + unite : '');
  }
  // même chose en HTML, chiffres en gros et unités en petit (tuiles de records)
  function valHtml(v, unite, dec) {
    if (v === null || v === undefined || v === '') return '—';
    if (unite === 's' && !dec && v >= 60) { var t = minSec(v); return t.m + '<small> min </small>' + t.s + '<small> s</small>'; }
    return fmtVal(v, '', dec) + (unite ? '<small> ' + esc(unite) + '</small>' : '');
  }

  // ---------- Champs chiffrés + pavé numérique ----------
  // Sur écran tactile (iPad, téléphone), les champs chiffrés n'ouvrent pas le clavier du système :
  // un pavé numérique du site s'affiche en bas (chiffres, virgule si besoin, effacer, Suivant).
  var TOUCH = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
  function numInput(o) {
    // o : id, kind ('int' | 'dec'), max (nb de caractères), value, cls, style, label, placeholder, attrs, auto (passe au champ suivant quand il est plein)
    var dec = o.kind === 'dec', v = o.value === undefined || o.value === null ? '' : String(o.value);
    return '<input type="text" id="' + esc(o.id) + '" class="' + (o.cls || 'num') + (v ? ' has' : '') + '"' + (o.style ? ' style="' + o.style + '"' : '') +
      ' inputmode="' + (dec ? 'decimal' : 'numeric') + '"' + (dec ? '' : ' pattern="[0-9]*"') + ' autocomplete="off" enterkeyhint="next" data-num="' + (dec ? 'dec' : 'int') + '"' +
      (o.max ? ' maxlength="' + o.max + '"' : '') + (o.auto ? ' data-auto="1"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + (TOUCH ? ' readonly' : '') +
      ' placeholder="' + esc(o.placeholder === undefined ? '—' : o.placeholder) + '" value="' + esc(v) + '"' + (o.attrs ? ' ' + o.attrs : '') + '>';
  }
  var np = { el: null, cur: null };
  function npBuild() {
    if (np.el) return np.el;
    var d = document.createElement('div');
    d.className = 'numpad'; d.id = 'numpad'; d.hidden = true;
    d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Pavé numérique');
    d.innerHTML = '<div class="np-top"><span class="np-lab" id="np_lab"></span><button type="button" class="np-ok" data-np="ok">Fermer</button></div>' +
      '<div class="np-body"><div class="pad np-keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map(function (k) {
        if (k === 'del') return '<button type="button" class="fn" data-np="del" aria-label="Effacer">' + icon('del', 26) + '</button>';
        if (k === ',') return '<button type="button" class="fn np-dec" data-np="," aria-label="Virgule">,</button>';
        return '<button type="button" data-np="' + k + '">' + k + '</button>';
      }).join('') + '</div><button type="button" class="np-next" data-np="next"><span id="np_next">Suivant</span>' + icon('right', 24) + '</button></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-np]'); if (b) npKey(b.getAttribute('data-np')); });
    np.el = d;
    return d;
  }
  function npFields() {
    return Array.prototype.filter.call(document.querySelectorAll('#app input[data-num]'), function (x) { return x.offsetParent !== null && !x.disabled; });
  }
  function npLabel(el) {
    var l = el.getAttribute('aria-label');
    if (!l && el.id) { var lab = document.querySelector('label[for="' + el.id + '"]'); if (lab) l = lab.textContent; }
    return (l || '').replace(/\s+/g, ' ').trim();
  }
  function npOpen(el, fromTap) {
    npBuild();
    if (np.cur && np.cur !== el) { np.cur.classList.remove('np-on'); np.cur.classList.remove('np-fresh'); }
    np.cur = el;
    np.openedAt = fromTap ? Date.now() : 0;
    np.fresh = !!el.value; // la 1re touche remplace la valeur déjà là (comme un champ sélectionné)
    el.classList.add('np-on');
    el.classList.toggle('np-fresh', np.fresh);
    try { el.blur(); } catch (e) { }
    document.getElementById('np_lab').textContent = npLabel(el);
    np.el.querySelector('.np-dec').style.visibility = el.getAttribute('data-num') === 'dec' ? '' : 'hidden';
    var all = npFields();
    document.getElementById('np_next').textContent = all.indexOf(el) < all.length - 1 ? 'Suivant' : 'OK';
    np.el.hidden = false;
    document.body.classList.add('np-open');
    document.documentElement.style.setProperty('--np-h', np.el.offsetHeight + 'px');
    requestAnimationFrame(function () { npReveal(el); });
  }
  // fait apparaître le champ au-dessus du pavé, et le gros bouton qui suit (Valider…) s'il tient aussi
  function npReveal(el) {
    var top = np.el.getBoundingClientRect().top, r = el.getBoundingClientRect(), bottom = r.bottom + 12;
    var btns = document.querySelectorAll('#app .btn.xl'), nb = null;
    for (var i = 0; i < btns.length; i++) if (el.compareDocumentPosition(btns[i]) & 4) { nb = btns[i]; break; }
    if (nb) { var rb = nb.getBoundingClientRect(); if (rb.bottom - r.top < top - 90) bottom = rb.bottom + 12; }
    if (bottom > top) window.scrollBy({ top: bottom - top, behavior: 'smooth' });
    else if (r.top < 60) window.scrollBy({ top: r.top - 100, behavior: 'smooth' });
  }
  function npClose() {
    if (np.cur) { np.cur.classList.remove('np-on'); np.cur.classList.remove('np-fresh'); }
    np.cur = null;
    if (np.el) np.el.hidden = true;
    document.body.classList.remove('np-open');
  }
  function npNext() {
    var all = npFields(), i = all.indexOf(np.cur);
    if (i >= 0 && i < all.length - 1) npOpen(all[i + 1]); else npClose();
  }
  function npKey(k) {
    var el = np.cur;
    if (el && !document.body.contains(el)) { el = el.id ? document.getElementById(el.id) : null; if (el) { np.cur = el; el.classList.add('np-on'); } }
    if (!el || k === 'ok') return npClose();
    if (k === 'next') return npNext();
    var v = el.value, max = Number(el.getAttribute('maxlength')) || 6, dec = el.getAttribute('data-num') === 'dec';
    if (np.fresh && k !== 'del') v = '';
    np.fresh = false; el.classList.remove('np-fresh');
    if (k === 'del') v = v.slice(0, -1);
    else if (k === ',') { if (!dec || v.indexOf(',') >= 0 || v.length >= max - 1) return; v = (v || '0') + ','; }
    else {
      if (v.length >= max) return;
      if (dec && v.indexOf(',') >= 0 && v.split(',')[1].length >= 1) return;
      v = v === '0' && !el.getAttribute('data-auto') ? k : v + k;
    }
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (k !== 'del' && el.getAttribute('data-auto') && v.length >= max) npNext();
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('input[data-num]');
    if (t && TOUCH) { e.preventDefault(); if (np.cur !== t || !np.el || np.el.hidden) npOpen(t, true); }
  });
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (TOUCH && t && t.matches && t.matches('input[data-num]') && np.cur !== t) npOpen(t, true);
  });
  // toucher ailleurs ferme le pavé, APRÈS le clic : un bouton « Valider » sous le doigt marche du 1er coup
  // (fermer au moment de l'appui changerait la mise en page sous le doigt et le clic serait perdu)
  document.addEventListener('click', function (e) {
    if (!np.el || np.el.hidden) return;
    var t = e.target;
    if (np.el.contains(t) || (t.closest && t.closest('input[data-num]'))) return;
    // le clic du toucher qui vient d'ouvrir le pavé (la page a pu bouger sous le doigt) ne le referme pas
    if (np.cur && document.body.contains(np.cur) && Date.now() - (np.openedAt || 0) < 500) return;
    npClose();
  });
  document.addEventListener('keydown', function (e) {
    if (!np.el || np.el.hidden) return;
    if (/^[0-9]$/.test(e.key)) { npKey(e.key); e.preventDefault(); }
    else if (e.key === ',' || e.key === '.') { npKey(','); e.preventDefault(); }
    else if (e.key === 'Backspace') { npKey('del'); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { npNext(); e.preventDefault(); }
    else if (e.key === 'Escape') npClose();
  });
  window.addEventListener('hashchange', npClose);

  // ---------- Toast et fenêtres ----------
  var toastTimer = null;
  function toast(msg, err) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast on' + (err ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast' + (err ? ' err' : ''); }, 3200);
  }
  function modal(opts) {
    return new Promise(function (resolve) {
      var host = document.createElement('div');
      host.className = 'modal';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      var btns = (opts.actions || [{ label: 'OK', value: true, cls: 'btn' }]).map(function (a, i) {
        return '<button type="button" class="' + (a.cls || 'btn') + '" data-i="' + i + '">' + a.label + '</button>';
      }).join('');
      // en haut : le titre et une croix pour fermer (toujours visibles) ; en bas : les boutons (toujours visibles)
      var closable = opts.dismiss !== false;
      host.innerHTML = '<div class="card">' + (opts.title || closable ? '<div class="mhead">' + (opts.title ? '<h2>' + opts.title + '</h2>' : '<span></span>') +
        (closable ? '<button type="button" class="ibtn mclose" data-close aria-label="Fermer">' + icon('x', 18) + '</button>' : '') + '</div>' : '') +
        (opts.body || '') + '<div class="sec mbtns">' + btns + '</div></div>';
      document.body.appendChild(host);
      var cancel = opts.cancelValue === undefined ? null : opts.cancelValue, done = false;
      function close(v) { if (done) return; done = true; host.remove(); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); resolve(v); }
      function onKey(e) { if (e.key === 'Escape' && closable) close(cancel); }
      // le bouton Retour du téléphone (ou de la barre du haut) ferme la fenêtre au lieu de la laisser ouverte sur un autre écran
      function onHash() { close(cancel); }
      document.addEventListener('keydown', onKey);
      window.addEventListener('hashchange', onHash);
      host.addEventListener('click', function (e) {
        if (e.target === host && closable) return close(cancel);
        if (e.target.closest('[data-close]')) return close(cancel);
        var b = e.target.closest('button[data-i]');
        if (!b) return;
        var a = opts.actions[Number(b.getAttribute('data-i'))];
        if (a.onClick) { a.onClick(host, close); return; }
        close(a.value);
      });
      var first = host.querySelector('button[data-i]');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
      if (opts.onOpen) opts.onOpen(host, close);
    });
  }
  function codeBox(code) {
    return '<div class="codebig" aria-label="Code ' + esc(code.split('').join(' ')) + '">' + code.split('').map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>';
  }

  // ---------- Bips (Web Audio) ----------
  // Sur iPhone, le son du web est coupé par le bouton « silencieux » : on demande à iOS (17 et plus)
  // une session « lecture », comme une appli de musique, pour que les bips passent quand même.
  // Sur les iOS plus anciens, un son muet joué en boucle produit le même effet.
  var audioCtx = null, muted = false, silentEl = null;
  try { muted = localStorage.getItem('mc-mute') === '1'; } catch (e) { }
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function silentWav() {
    var n = 2000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), i;
    function str(o, t) { for (var k = 0; k < t.length; k++) b[o + k] = t.charCodeAt(k); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    for (i = 44; i < 44 + n; i++) b[i] = 128;
    var bin = ''; for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function audioSession() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { }
    if (IOS && !navigator.audioSession) {
      try {
        if (!silentEl) { silentEl = document.createElement('audio'); silentEl.setAttribute('playsinline', ''); silentEl.loop = true; silentEl.src = silentWav(); }
        if (silentEl.paused) { var pr = silentEl.play(); if (pr && pr.catch) pr.catch(function () { }); }
      } catch (e) { }
    }
  }
  function unlockAudio() {
    try {
      audioSession();
      if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state !== 'running') audioCtx.resume();
      if (audioCtx) { var o = audioCtx.createOscillator(), g = audioCtx.createGain(); g.gain.value = 0.0001; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.02); }
    } catch (e) { }
  }
  // iOS met parfois le son en veille (écran verrouillé, autre appli) : on le relance au moindre toucher
  function wake() { if (audioCtx && audioCtx.state !== 'running') { try { audioSession(); audioCtx.resume(); } catch (e) { } } }
  document.addEventListener('touchend', wake, true);
  document.addEventListener('click', wake, true);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') wake(); });
  function beep(freq, dur, vol) {
    if (muted || !audioCtx) return;
    try {
      if (audioCtx.state !== 'running') audioCtx.resume();
      var t = audioCtx.currentTime + 0.01, o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = freq || 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) { }
  }
  // Bips des chronos (tous les mêmes) : 1 bip à 10 s de la fin, puis 1 bip par seconde de 5 à 1, puis le son de fin.
  // sec = seconde affichée (arrondie au-dessus), total = durée du chrono.
  function countBeep(sec, total) {
    if (sec === 10 && total > 10) beep(600, 0.22, 0.2);
    else if (sec >= 1 && sec <= 5) beep(760, 0.09);
  }
  function endBeep() { beep(990, 0.5, 0.22); }
  function setMuted(m) { muted = !!m; try { localStorage.setItem('mc-mute', m ? '1' : '0'); } catch (e) { } }
  function isMuted() { return muted; }

  // ---------- Écran toujours allumé ----------
  var wakeLock = null, wantWake = false;
  function keepAwake(on) {
    wantWake = !!on;
    if (!('wakeLock' in navigator)) return;
    if (on && !wakeLock) {
      navigator.wakeLock.request('screen').then(function (l) {
        wakeLock = l;
        l.addEventListener('release', function () { wakeLock = null; });
      }).catch(function () { });
    } else if (!on && wakeLock) {
      try { wakeLock.release(); } catch (e) { }
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && wantWake && !wakeLock) keepAwake(true);
  });

  // ---------- Démo d'un exercice (animation / vidéo) ----------
  function demoHtml(opts) {
    // opts: anim, video, color, label, mode ('anim'|'video')
    var hasA = !!(opts.anim && MC.anim && MC.anim.has(opts.anim));
    var hasV = !!opts.video;
    var mode = opts.mode || (hasA ? 'anim' : 'video');
    var seg = (hasA && hasV) ? '<div class="seg" role="group" aria-label="Type de démo">' +
      '<button type="button" data-act="demoMode" data-mode="anim" aria-pressed="' + (mode === 'anim') + '" class="' + (mode === 'anim' ? 'on' : '') + '">Animation</button>' +
      '<button type="button" data-act="demoMode" data-mode="video" aria-pressed="' + (mode === 'video') + '" class="' + (mode === 'video' ? 'on' : '') + '">Vidéo</button></div>' : '';
    var inner = '';
    if (mode === 'anim' && hasA) inner = '<div class="stage" data-anim="' + esc(opts.anim) + '" data-color="' + esc(opts.color || '#3DFFB0') + '" data-label="' + esc(opts.label || '') + '"></div>';
    else if (hasV && MC.CONFIG.VIDEOS_EN_LIEN) inner = '<a class="ytgo" href="https://www.youtube.com/watch?v=' + encodeURIComponent(opts.video) + '" target="_blank" rel="noopener"><span class="pl">' + icon('play', 26) + '</span>Voir la vidéo sur YouTube</a>';
    else if (hasV) inner = '<button type="button" class="ytgo" data-act="playVideo" data-video="' + esc(opts.video) + '"><span class="pl">' + icon('play', 26) + '</span>Voir la vidéo</button>';
    else inner = '<div class="ytgo">Démo bientôt</div>';
    if (opts.vite && mode === 'anim' && hasA) inner += '<span class="vite">' + icon('bolt', 14) + ' Au ralenti · en vrai : à fond !</span>';
    return '<figure class="demo" style="margin:0;--dc:' + esc(opts.color || '#3DFFB0') + ';--dg:' + hexToRgba(opts.color || '#3DFFB0', 0.16) + '" data-anim-key="' + esc(opts.anim || '') + '" data-video="' + esc(opts.video || '') + '" data-color="' + esc(opts.color || '') + '" data-label="' + esc(opts.label || '') + '"' + (opts.vite ? ' data-vite="1"' : '') + '>' + seg + inner + '</figure>';
  }
  function mountAnims(root) {
    if (!MC.anim) return;
    var els = (root || document).querySelectorAll('[data-anim]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__mounted) continue;
      el.__mounted = true;
      try { MC.anim.mount(el, el.getAttribute('data-anim'), { color: el.getAttribute('data-color') || '#3DFFB0', label: el.getAttribute('data-label') || '' }); } catch (e) { }
    }
  }
  // ---------- Fiche détaillée (bouton « Détails ») ----------
  function infoBtn(key, title, sub) {
    if (!key || !MC.fiche || !MC.fiche.get(key)) return '';
    return '<button type="button" class="infobtn" data-act="info" data-k="' + esc(key) + '" data-t="' + esc(title || '') + '"' + (sub ? ' data-s="' + esc(sub) + '"' : '') + '>' + icon('info', 16) + ' Détails et sécurité</button>';
  }
  function infoHtml(key, sub) {
    var f = MC.fiche.get(key);
    if (!f) return '';
    function list(a, tag) { return '<' + tag + ' class="fl">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '>'; }
    return '<div class="fiche">' + (sub ? '<p class="small" style="margin:0">' + esc(sub) + '</p>' : '') +
      (f.but ? '<p class="lead" style="margin:0">' + esc(f.but) + '</p>' : '') +
      '<h3>' + icon('list', 16) + ' Comment faire</h3>' + list(f.etapes || [], 'ol') +
      (f.erreurs && f.erreurs.length ? '<h3 class="warn">' + icon('x', 16) + ' Les erreurs à éviter</h3>' + list(f.erreurs, 'ul') : '') +
      '<h3 class="secu">' + icon('shield', 16) + ' Sécurité</h3>' + list((f.securite || []).concat(MC.fiche.regles), 'ul') + '</div>';
  }
  function showInfo(key, title, sub) {
    return modal({ title: esc(title || 'Détails'), body: infoHtml(key, sub), actions: [{ label: 'J\'ai compris', value: true, cls: 'btn' }], cancelValue: true });
  }

  function videoIframe(id) {
    return '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Vidéo de démonstration" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  }

  // ---------- Barre du haut (la même partout) ----------
  // À gauche, sur TOUS les écrans : le bouton Retour, un vrai « précédent » : il ramène à l'écran d'avant, à
  // l'endroit où l'on était (MC.app.back). S'il n'y a rien avant, il mène à l'écran parent prévu (o.back) ou à
  // l'accueil de l'espace ; grisé seulement quand on y est déjà. Au milieu : le titre (et au-dessus, la rubrique).
  // À droite : des actions et l'aide.
  // o : { back (écran parent si rien avant ; false = pas de bouton), backLabel (rubrique), title, kicker, left (html après le Retour),
  //       mid (html du milieu), right (html), help (lien, false = aucune), xp (% de la ligne d'XP) }
  function topbar(o) {
    o = o || {};
    var A = MC.app, fb = typeof o.back === 'string' ? o.back : '';
    var can = A && A.canBack ? A.canBack(fb) : true;
    var href = fb || (A && A.homeOf ? A.homeOf(A.spaceOf ? A.spaceOf(location.hash) : null) : '#/');
    var backBtn = o.back === false ? '' : '<a class="cbtn tb-back' + (can ? '' : ' off') + '" href="' + esc(href) + '" data-act="navBack"' + (fb ? ' data-fb="' + esc(fb) + '"' : '') +
      ' aria-label="Retour à l\'écran d\'avant"' + (can ? '' : ' aria-disabled="true" tabindex="-1"') + ' data-back>' + icon('left', 20) + '</a>';
    var left = backBtn + (o.left || '');
    var kick = o.back ? (o.backLabel || '') : (o.kicker || '');
    var mid = o.mid !== undefined ? o.mid : '<span class="tb-t">' + (kick ? '<span class="tb-k">' + esc(kick) + '</span>' : '') + '<span class="tb-title">' + esc(o.title || '') + '</span></span>';
    var help = o.help === false ? '' : '<a class="cbtn grey" href="' + esc(o.help || '#/guide') + '" aria-label="Aide : comment ça marche ?"><b class="q">?</b></a>';
    return '<header class="topbar">' + left + mid + (o.right || '') + help + (o.xp !== undefined ? '<i class="tb-xp" style="width:' + Math.max(2, Math.min(100, o.xp)) + '%" aria-hidden="true"></i>' : '') + '</header>';
  }
  // ---------- Sous-onglets en haut d'un onglet (2 à 4) ----------
  // nav : l'onglet du bas (pour retenir le dernier sous-onglet choisi) ; items : [[clé, lien, libellé, pastille]] ; on : la clé allumée ; c : couleur
  function subtabs(nav, items, on, c, label) {
    var cur = items.filter(function (it) { return it[0] === on; })[0];
    if (cur && MC.app && MC.app.rememberTab) MC.app.rememberTab(nav, cur[1]);
    return '<nav class="stabs" style="--n:' + items.length + (c ? ';--sc:' + c : '') + '" aria-label="' + esc(label || 'Sous-onglets') + '">' + items.map(function (it) {
      var act = it[0] === on;
      return '<a href="' + esc(it[1]) + '"' + (act ? ' class="on" aria-current="page"' : '') + '>' + esc(it[2]) + (it[3] ? '<span class="nbi">' + it[3] + '</span>' : '') + '</a>';
    }).join('') + '</nav>';
  }
  // un petit sélecteur à 2 ou 3 choix dans un écran (ex. Mes records | Mes niveaux)
  function seg(items, on, act) {
    return '<div class="seg3" style="--n:' + items.length + '" role="group">' + items.map(function (it) {
      var a = it[0] === on;
      return it[2] ? '<a class="opt' + (a ? ' on' : '') + '" href="' + esc(it[2]) + '"' + (a ? ' aria-current="true"' : '') + '>' + esc(it[1]) + '</a>' :
        '<button type="button" class="opt' + (a ? ' on' : '') + '" aria-pressed="' + a + '" data-act="' + esc(act) + '" data-v="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  // lien d'aide qui ramène ensuite à l'écran où l'on était
  function helpLink(pour) {
    var here = (location.hash || '').replace(/^#\/?/, '');
    return '#/guide?pour=' + (pour || 'joueur') + (here ? '&de=' + encodeURIComponent(here) : '');
  }

  return {
    topbar: topbar, helpLink: helpLink, subtabs: subtabs, seg: seg,
    esc: esc, icon: icon, starSvg: starSvg, lvl: lvl, levelIcon: levelIcon, avatar: avatar, hexa: hexa, rgba: hexToRgba,
    doseLabel: doseLabel, doseInfo: doseInfo, fmtDate: fmtDate, fmtNum: fmtNum, fmtVal: fmtVal, valHtml: valHtml,
    numInput: numInput, numpadClose: npClose, TOUCH: TOUCH,
    toast: toast, modal: modal, codeBox: codeBox,
    unlockAudio: unlockAudio, beep: beep, countBeep: countBeep, endBeep: endBeep, setMuted: setMuted, isMuted: isMuted, keepAwake: keepAwake,
    infoBtn: infoBtn, infoHtml: infoHtml, showInfo: showInfo,
    demoHtml: demoHtml, mountAnims: mountAnims, videoIframe: videoIframe
  };
})();
