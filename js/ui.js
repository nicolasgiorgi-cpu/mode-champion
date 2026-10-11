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
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    home: '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6"/>',
    group: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.8-3.5 3-5.5 6-5.5s5.2 2 6 5.5M14.5 15c2.8-.3 5 1.5 6 5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    sheet: '<path d="M4 3h16v18H4zM4 9h16M4 15h16M10 3v18"/>',
    logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    bar: '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
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
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
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
    if (d.k === 'reps') return d.s + ' × ' + d.r + (d.cote ? ' / ' + d.cote : '');
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
  function fmtVal(v, unite, dec) {
    if (v === null || v === undefined || v === '') return '—';
    var s = dec ? String(Math.round(v * 10) / 10).replace('.', ',') : String(Math.round(v));
    return s + (unite ? ' ' + unite : '');
  }

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
      host.innerHTML = '<div class="card">' + (opts.title ? '<h2>' + opts.title + '</h2>' : '') + (opts.body || '') + '<div class="sec">' + btns + '</div></div>';
      document.body.appendChild(host);
      function close(v) { host.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') close(opts.cancelValue === undefined ? null : opts.cancelValue); }
      document.addEventListener('keydown', onKey);
      host.addEventListener('click', function (e) {
        if (e.target === host && opts.dismiss !== false) return close(opts.cancelValue === undefined ? null : opts.cancelValue);
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
  var audioCtx = null, muted = false;
  try { muted = localStorage.getItem('mc-mute') === '1'; } catch (e) { }
  function unlockAudio() {
    try {
      if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      if (audioCtx) { var o = audioCtx.createOscillator(), g = audioCtx.createGain(); g.gain.value = 0.0001; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.02); }
    } catch (e) { }
  }
  function beep(freq, dur, vol) {
    if (muted || !audioCtx) return;
    try {
      var t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = freq || 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) { }
  }
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
    return '<figure class="demo" style="margin:0;--dc:' + esc(opts.color || '#3DFFB0') + ';--dg:' + hexToRgba(opts.color || '#3DFFB0', 0.16) + '" data-anim-key="' + esc(opts.anim || '') + '" data-video="' + esc(opts.video || '') + '" data-color="' + esc(opts.color || '') + '" data-label="' + esc(opts.label || '') + '">' + seg + inner + '</figure>';
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
  function videoIframe(id) {
    return '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Vidéo de démonstration" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  }

  return {
    esc: esc, icon: icon, starSvg: starSvg, lvl: lvl, levelIcon: levelIcon, avatar: avatar, hexa: hexa, rgba: hexToRgba,
    doseLabel: doseLabel, doseInfo: doseInfo, fmtDate: fmtDate, fmtNum: fmtNum, fmtVal: fmtVal,
    toast: toast, modal: modal, codeBox: codeBox,
    unlockAudio: unlockAudio, beep: beep, setMuted: setMuted, isMuted: isMuted, keepAwake: keepAwake,
    demoHtml: demoHtml, mountAnims: mountAnims, videoIframe: videoIframe
  };
})();
