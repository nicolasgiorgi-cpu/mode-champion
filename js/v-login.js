/* =========================================================
   Mode champion · M12 — connexion enfant, 1re connexion,
   code oublié, connexion des adultes
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, api = MC.api, C = MC.CONTENT, esc = ui.esc;

  // ---------- pavé numérique partagé ----------
  var pad = null; // { len, val, onDone, reveal, el }
  function padHtml(withEye) {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', withEye ? 'eye' : '', '0', 'del'];
    return '<div class="pad">' + keys.map(function (k) {
      if (!k) return '<span></span>';
      if (k === 'del') return '<button type="button" class="fn" data-act="pad" data-k="del" aria-label="Effacer">' + ui.icon('del', 26) + '</button>';
      if (k === 'eye') return '<button type="button" class="fn" data-act="pad" data-k="eye" aria-label="Montrer ou cacher le code">' + ui.icon('eye', 26) + '</button>';
      return '<button type="button" data-act="pad" data-k="' + k + '">' + k + '</button>';
    }).join('') + '</div>';
  }
  function digitsHtml(len, val, reveal, ok) {
    var out = '<div class="digits" style="--nd:' + len + '" aria-live="polite" aria-label="' + val.length + ' chiffres sur ' + len + '">';
    for (var i = 0; i < len; i++) {
      var full = i < val.length, cur = !ok && i === val.length;
      out += '<div class="digit' + (full ? ' full' : '') + (full && reveal ? ' show' : '') + (cur ? ' cur' : '') + (ok ? ' ok' : '') + '">' + (full && reveal ? esc(val.charAt(i)) : '') + '</div>';
    }
    return out + '</div>';
  }
  function paintDigits() {
    if (!pad || !pad.el) return;
    var d = pad.el.querySelector('.digits');
    if (d) d.outerHTML = digitsHtml(pad.len, pad.val, pad.reveal);
  }
  function setMsg(text, err) {
    if (!pad || !pad.el) return;
    var m = pad.el.querySelector('.msg');
    if (m) { m.textContent = text || ''; m.className = 'msg' + (err ? ' err' : ''); }
  }
  MC.act.pad = function (b) {
    if (!pad || pad.busy) return;
    var k = b.getAttribute('data-k');
    if (k === 'del') { pad.val = pad.val.slice(0, -1); setMsg(pad.hint || ''); paintDigits(); return; }
    if (k === 'eye') { pad.reveal = !pad.reveal; paintDigits(); return; }
    if (pad.val.length >= pad.len) return;
    pad.val += k;
    paintDigits();
    if (pad.val.length === pad.len) { var v = pad.val; setTimeout(function () { if (pad) pad.onDone(v); }, 120); }
  };
  document.addEventListener('keydown', function (e) {
    if (!pad || !pad.el || !document.body.contains(pad.el)) return;
    if (/^\d$/.test(e.key)) { var b = pad.el.querySelector('[data-k="' + e.key + '"]'); if (b) MC.act.pad(b); }
    else if (e.key === 'Backspace') { var d = pad.el.querySelector('[data-k="del"]'); if (d) MC.act.pad(d); }
  });

  // ---------- Écran de connexion ----------
  var rosterQuery = '';
  app.route('/connexion', function (p, q, cur) {
    // « Passer le téléphone à Tom » (espace parent ou éduc) : son code secret s'ouvre tout de suite
    if (q && q.k) {
      var kid = q.k;
      cur.after = function () {
        app.setUrl('#/connexion');
        var k = (app.S.roster || []).filter(function (x) { return x.id === kid; })[0];
        if (k && !document.querySelector('.modal')) pinSheet(k, true);
      };
    }
    // la liste gardée sur l'appareil s'affiche tout de suite, puis se met à jour
    if (!app.S.roster) { var cr = app.lsGet('mc-roster'); app.S.roster = Array.isArray(cr) ? cr : null; }
    var had = !!app.S.roster, before = JSON.stringify(app.S.roster);
    var fresh = api.call('roster', {}, { silent: had }).then(function (res) {
      app.S.roster = res.joueurs;
      app.lsSet('mc-roster', res.joueurs);
      return JSON.stringify(res.joueurs) !== before;
    });
    if (had) {
      fresh.then(function (changed) {
        if (changed && location.hash.indexOf('#/connexion') === 0 && !document.querySelector('.modal')) app.rerender();
      }).catch(function () { });
      return paintConnexion();
    }
    return fresh.then(function () { return paintConnexion(); });
  }, { bg: '#1B2552' });

  function kidButton(k) {
    return '<button type="button" class="kidbtn" data-act="pickKid" data-id="' + esc(k.id) + '"><span>' + ui.avatar(k.prenom, k.couleur, 40) + '<span class="nm">' + esc(k.prenom) + '</span></span></button>';
  }
  function paintConnexion() {
    var list = app.S.roster || [];
    var recents = app.recents().map(function (id) { return list.filter(function (k) { return k.id === id; })[0]; }).filter(Boolean);
    var q = rosterQuery.toLowerCase();
    var shown = list.filter(function (k) { return !q || k.prenom.toLowerCase().indexOf(q) >= 0; });
    var demo = api.DEMO ? '<div class="demo-banner"><b>MODE DÉMO</b> · joueurs fictifs, rien n\'est envoyé. Code des enfants : <b>' + MC.demo.CODES.enfant + '</b> · Rose (1re connexion) : <b>' + MC.demo.CODES.nouveau + '</b> · Parent de Tom : <b>' + MC.demo.CODES.parent + '</b> · Éduc : <b>' + MC.demo.CODES.educ + '</b> <button type="button" class="btn2 sm grey" style="margin-top:8px" data-act="resetDemo">Remettre la démo à zéro</button></div>' : '';
    // le Retour (vrai « précédent ») quand on arrive d'un autre écran : changer de joueur, espace adulte…
    var bk = app.canBack && app.canBack('') ? '<a class="cbtn tb-back" href="' + esc(app.homeOf(null)) + '" data-act="navBack" aria-label="Retour à l\'écran d\'avant" data-back>' + ui.icon('left', 20) + '</a>' : '';
    return '<main class="screen nonav">' +
      '<div class="between" style="align-items:center;gap:10px">' + (bk ? '<span class="row" style="gap:10px;align-items:center;min-width:0">' + bk : '') + '<span class="kicker">' + esc(MC.CONFIG.CLUB) + '</span>' + (bk ? '</span>' : '') +
      '<span class="row" style="gap:6px"><a class="tag" href="#/guide" style="min-height:40px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--soft)">' + ui.icon('info', 14) + 'Aide</a>' +
      '<a class="tag" href="#/adultes" style="min-height:40px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--soft)">' + ui.icon('lock', 14) + 'Adultes</a></span></div>' +
      '<div class="head"><h1 class="big">Mode<br>champion</h1><p class="lead">Touche ton avatar, puis tape ton code secret pour entrer dans l\'arène.</p></div>' +
      demo +
      (recents.length ? '<section class="sec"><h2 class="h2">Déjà venus ici</h2><div class="roster">' + recents.map(kidButton).join('') + '</div></section>' : '') +
      '<section class="sec"><div class="between"><h2 class="h2">Qui s\'entraîne ?</h2><span class="small">' + list.length + ' joueurs</span></div>' +
      (list.length > 12 ? '<label class="sr-only" for="q">Chercher mon prénom</label><input id="q" class="search" type="search" placeholder="Cherche ton prénom…" value="' + esc(rosterQuery) + '" autocomplete="off">' : '') +
      '<div class="roster" id="roster">' + (shown.length ? shown.map(kidButton).join('') : '<div class="empty" style="grid-column:1/-1">Personne avec ce prénom. Demande à ton éduc de t\'ajouter.</div>') + '</div></section>' +
      '</main>';
  }
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') {
      rosterQuery = e.target.value;
      var list = app.S.roster || [], q = rosterQuery.toLowerCase();
      var shown = list.filter(function (k) { return !q || k.prenom.toLowerCase().indexOf(q) >= 0; });
      var r = document.getElementById('roster');
      if (r) r.innerHTML = shown.length ? shown.map(kidButton).join('') : '<div class="empty" style="grid-column:1/-1">Personne avec ce prénom. Demande à ton éduc de t\'ajouter.</div>';
    }
  });
  MC.act.resetDemo = function () {
    ui.modal({ title: 'Remettre la démo à zéro ?', body: '<p class="lead">Toutes les séances notées pendant l\'essai seront effacées.</p>', actions: [{ label: 'Oui, remettre à zéro', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      api.resetDemo(); app.setKid(null); app.setAdult(null); app.lsSet('mc-recents', null); app.go('#/connexion'); app.render();
    });
  };

  MC.act.pickKid = function (b) {
    var id = b.getAttribute('data-id');
    var k = (app.S.roster || []).filter(function (x) { return x.id === id; })[0];
    if (!k) return;
    pinSheet(k);
  };

  function pinSheet(k, passe) {
    var host = document.createElement('div');
    host.className = 'modal';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Code secret de ' + k.prenom);
    host.innerHTML = '<div class="card pin-zone">' +
      '<div class="row">' + ui.avatar(k.prenom, k.couleur, 48) + '<div style="flex:1"><div class="kicker">' + (passe ? 'À toi ! Tape ton code secret' : k.nouveau ? 'Code provisoire de ton éduc' : 'Code secret') + '</div><div style="font:700 20px/1.1 var(--f-hud);letter-spacing:.04em;margin-top:5px">' + esc(k.prenom.toUpperCase()) + '</div></div>' +
      '<button type="button" class="cbtn grey" data-close aria-label="Fermer">' + ui.icon('x') + '</button></div>' +
      digitsHtml(4, '', false) + '<div class="msg" aria-live="polite"></div>' + padHtml(true) +
      '<a href="#/oubli" class="btn2 grey" data-close>Code oublié ?</a></div>';
    document.body.appendChild(host);
    function close() { host.remove(); pad = null; }
    host.addEventListener('click', function (e) {
      if (e.target === host || e.target.closest('[data-close]')) { close(); }
      var b = e.target.closest('[data-act="pad"]');
      if (b) { e.stopPropagation(); MC.act.pad(b); }
    });
    pad = { len: 4, val: '', reveal: false, el: host, onDone: function (v) {
      pad.busy = true;
      setMsg('Vérification…');
      ui.unlockAudio();
      api.call('login', { joueurId: k.id, pin: v }).then(function (res) {
        close();
        app.setKid({ token: res.token, joueur: res.joueur });
        if (res.me) app.setMe(res.me);
        if (res.joueur.mustChange) app.go('#/premiere');
        else app.go('#/semaine');   // (retouche UI-06) plus de message flottant par-dessus l'écran d'accueil
      }).catch(function (e) {
        if (!pad) return;
        pad.busy = false;
        pad.val = '';
        paintDigits();
        var m = e.message;
        if (e.code === 'code' && e.data && e.data.reste !== undefined && e.data.reste <= 2) m += ' Encore ' + e.data.reste + ' essai' + (e.data.reste > 1 ? 's' : '') + '.';
        setMsg(m, true);
        var dg = host.querySelector('.digits');
        if (dg && dg.animate) dg.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 260 });
      });
    } };
  }

  // ---------- 1re connexion / changer son code ----------
  var first = null;
  app.route('/premiere', function (p, q, cur) {
    var k = app.S.kid;
    if (!first || first.id !== k.joueur.id) first = { id: k.joueur.id, step: q.change ? 'code' : 'color', couleur: k.joueur.couleur || '#38E8FF', code: '', change: !!q.change };
    cur.cleanup = function () { pad = null; };
    cur.after = function (el) { setupFirstPad(el); };
    return paintFirst();
  }, { kid: true, first: true });

  function paintFirst() {
    var k = app.S.kid.joueur, st = first.step;
    var title = { color: 'Choisis\nta couleur', code: 'Choisis ton\ncode secret', confirm: 'Tape-le\nencore une fois', done: 'Code\nenregistré !' }[st];
    var sub = {
      color: 'C\'est la couleur de ton bouclier de champion.',
      code: '4 chiffres faciles à retenir pour toi, mais pas pour les autres.',
      confirm: 'Pour être sûr que tu ne t\'es pas trompé.',
      done: 'La prochaine fois, touche ton avatar et tape ce code.'
    }[st];
    var stepLabel = { color: 'ÉTAPE 1/3', code: first.change ? 'ÉTAPE 1/2' : 'ÉTAPE 2/3', confirm: first.change ? 'ÉTAPE 2/2' : 'ÉTAPE 3/3', done: 'C\'EST BON' }[st];
    var body = '';
    if (st === 'color') {
      body = '<div class="swatches" role="radiogroup" aria-label="Couleur">' + C.COULEURS.map(function (c) {
        var on = c.toLowerCase() === String(first.couleur).toLowerCase();
        return '<button type="button" class="swatch' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" aria-label="Couleur ' + c + '" data-act="pickColor" data-c="' + c + '">' + ui.avatar(k.prenom, c, 38) + '</button>';
      }).join('') + '</div><button type="button" class="btn" data-act="firstNext">C\'est ma couleur ' + ui.icon('right', 18) + '</button>';
    } else if (st === 'code' || st === 'confirm') {
      body = digitsHtml(4, '', false) + '<div class="msg" aria-live="polite">' + (st === 'code' ? 'Astuce : le numéro de maillot de ton joueur préféré + ton âge ?' : '') + '</div>' + padHtml(true);
    } else {
      body = '<div class="note green">' + ui.icon('check', 28) + '<div><div class="hud" style="color:var(--green)">' + (first.change ? 'Nouveau code' : 'Tu es Recrue · c\'est parti !') + '</div><div style="margin-top:4px">Ton code est à toi seul. Ne le donne à personne, même pas à tes copains.</div></div></div>' +
        '<a class="btn" href="#/semaine">' + ui.icon('play', 18) + ' Entrer dans l\'arène</a>';
    }
    return '<main class="screen nonav" id="firstzone">' +
      '<div class="row">' + ui.avatar(k.prenom, first.couleur, 48) + '<div><div class="kicker">' + (first.change ? 'CHANGER MON CODE' : '1RE CONNEXION') + ' · ' + stepLabel + '</div><div style="font:700 16px/1.2 var(--f-hud);margin-top:5px">' + (first.change ? '' : 'Bienvenue ') + esc(k.prenom) + (first.change ? '' : ' !') + '</div></div></div>' +
      '<div class="head"><h1 class="big md" style="white-space:pre-line">' + title + '</h1><p class="lead">' + sub + '</p></div>' +
      '<div class="sec pin-zone" style="width:100%;margin:0 auto">' + body + '</div></main>';
  }
  function setupFirstPad(el) {
    if (first.step !== 'code' && first.step !== 'confirm') { pad = null; return; }
    pad = { len: 4, val: '', reveal: false, el: el.querySelector('#firstzone'), hint: '', onDone: function (v) {
      if (first.step === 'code') {
        first.code = v; first.step = 'confirm'; app.render(); return;
      }
      if (v !== first.code) { first.step = 'code'; first.code = ''; app.render(); setTimeout(function () { setMsg('Les deux codes sont différents. On recommence !', true); }, 30); return; }
      pad.busy = true;
      setMsg('Enregistrement…');
      app.kidCall('setPin', { pin: v, couleur: first.couleur }).then(function (res) {
        app.S.kid.token = res.token; app.S.kid.joueur = res.joueur; app.setKid(app.S.kid);
        if (res.me) app.setMe(res.me);
        first.step = 'done'; app.render();
      }).catch(function (e) { if (pad) { pad.busy = false; pad.val = ''; paintDigits(); setMsg(e.message, true); } });
    } };
  }
  MC.act.pickColor = function (b) { first.couleur = b.getAttribute('data-c'); app.render(); };
  MC.act.firstNext = function () { first.step = 'code'; app.render(); };

  // ---------- Code oublié ----------
  app.route('/oubli', function () {
    function step(n, t) { return '<li><span class="num" style="--sc:var(--cyan)">' + n + '</span><span class="tx">' + t + '</span></li>'; }
    return '<main class="screen nonav">' + ui.topbar({ back: '#/connexion', backLabel: 'Qui s\'entraîne ?', title: 'Code oublié', help: false }) +
      '<div style="align-self:center">' + ui.avatar('?', '#FF4FA3', 110) + '</div>' +
      '<div class="head" style="text-align:center"><h1 class="big md">Code oublié ?</h1><p class="lead">Pas de panique, ça arrive même aux pros. Tes étoiles et ton XP ne sont pas perdus.</p></div>' +
      '<ol class="steps">' + step(1, 'Demande à <b>un parent</b> ou à <b>ton éduc</b> un code provisoire. Ils le créent en 2 secondes dans leur espace.') +
      step(2, 'Touche ton avatar et tape ce code provisoire.') + step(3, 'Choisis un nouveau code secret, rien qu\'à toi.') + '</ol>' +
      '<div class="note yellow">' + ui.icon('lock', 20) + '<span>Après 5 codes faux, ton profil se bloque 10 minutes. C\'est pour que personne ne devine ton code.</span></div>' +
      '<a class="btn" href="#/connexion">J\'ai mon code provisoire</a></main>';
  }, { bg: '#2A1640' });

  // ---------- Connexion des adultes ----------
  // On choisit d'abord QUI (parent : le prénom de son enfant ; éduc : son nom), puis le code à 4 chiffres.
  // 1re connexion avec un code provisoire : on choisit ensuite son propre code (#/adultes/code).
  var adultWho = 'f', adultPick = null, educsCache = null, educsAt = 0, adultQuery = '';
  function adultLoginDone(res, who) {
    var A = app.S.adult;
    var same = A && A.role === res.role && A.nom === res.nom;
    app.setAdult({ token: res.token, role: res.role, nom: res.nom, admin: res.admin, who: who, mustChange: !!res.mustChange });
    app.touchAdult();
    adultPick = null;
    if (res.mustChange) { app.go('#/adultes/code'); return; }
    if (res.provisoire && res.role === 'f') setTimeout(function () { ui.toast('Votre famille a déjà choisi son code : demandez-le à l\'autre parent (le code provisoire ne marchera plus après sa date).'); }, 400);
    var home = res.role === 'e' ? '#/educ' : '#/parent', t = app.takeTarget('adult');
    app.go(same && t ? t : home);
  }
  function adultPad(el, who) {
    pad = { len: 4, val: '', reveal: false, el: el.querySelector('#adultzone'), onDone: function (v) {
      pad.busy = true; setMsg('Vérification…');
      var p = { role: who.role, code: v };
      if (who.role === 'e') p.educId = who.id; else p.joueurId = who.id;
      api.call('adultLogin', p).then(function (res) { pad = null; adultLoginDone(res, who); })
        .catch(function (e) { if (pad) { pad.busy = false; pad.val = ''; paintDigits(); setMsg(e.message + (e.data && e.data.reste ? ' Encore ' + e.data.reste + ' essai' + (e.data.reste > 1 ? 's' : '') + '.' : ''), true); } });
    } };
  }
  function adultCodeZone(lab) {
    return '<div class="sec pin-zone" style="width:100%;margin:0 auto"><span class="lab">' + lab + ' · 4 chiffres</span>' + digitsHtml(4, '', false) +
      '<div class="msg" aria-live="polite"></div>' + padHtml(true) + '</div>';
  }
  app.route('/adultes', function (p, q, cur) {
    var A = app.S.adult;
    if (A && app.adultUnlocked() && !A.mustChange) { setTimeout(function () { app.go(app.takeTarget('adult') || (A.role === 'e' ? '#/educ' : '#/parent'), true); }, 0); return ''; }
    cur.cleanup = function () { pad = null; };
    if (A && A.who && A.who.id) {
      // appareil partagé : l'espace est verrouillé, on retape son code
      cur.after = function (el) { adultPad(el, A.who); };
      var w = A.role === 'e' ? 'éduc' : 'parent';
      return '<main class="screen nonav" id="adultzone">' + ui.topbar({ back: '#/connexion', backLabel: 'Espace joueurs', title: 'Espace ' + w, help: false }) +
        '<div class="head"><span class="kicker">Espace ' + w + ' · ' + esc(A.nom || '') + '</span><h1 class="big md">Espace<br>verrouillé</h1>' +
        '<p class="lead" style="margin:0">Cet appareil sert aussi à un enfant : retapez votre code pour ouvrir votre espace. Il se referme tout seul après 10 minutes sans y toucher.</p></div>' +
        adultCodeZone('Votre code') +
        '<button type="button" class="btn2 grey" data-act="adultForget">Ce n\'est pas mon espace : se déconnecter</button></main>';
    }
    var head = ui.topbar({ back: '#/connexion', backLabel: 'Espace joueurs', title: 'Espace adultes', help: '#/guide?pour=' + (adultWho === 'e' ? 'educ' : 'parent') + '&de=adultes' }) +
      '<div class="head"><span class="kicker">' + esc(MC.CONFIG.CLUB) + '</span><h1 class="big md">Espace<br>adultes</h1></div>' +
      '<div class="grid2" role="tablist" aria-label="Je suis" style="border:1px solid var(--line2);padding:4px;gap:4px">' +
      '<button type="button" role="tab" aria-selected="' + (adultWho === 'f') + '" class="opt' + (adultWho === 'f' ? ' on' : '') + '" data-act="adultWho" data-w="f" style="min-height:44px">Je suis parent</button>' +
      '<button type="button" role="tab" aria-selected="' + (adultWho === 'e') + '" class="opt' + (adultWho === 'e' ? ' on' : '') + '" data-act="adultWho" data-w="e" style="min-height:44px">Je suis éduc</button></div>';
    var foot = '<a class="btn2 grey" href="#/guide?pour=' + (adultWho === 'e' ? 'educ' : 'parent') + '">' + ui.icon('info', 16) + ' Comment ça marche ?</a>';
    // 2. le code
    if (adultPick && adultPick.role === adultWho) {
      cur.after = function (el) { adultPad(el, adultPick); };
      return '<main class="screen nonav" id="adultzone">' + head +
        '<div class="between" style="align-items:center"><span class="hud">' + (adultWho === 'f' ? 'Parent de ' : '') + esc(adultPick.nom) + '</span><button type="button" class="lnk" data-act="adultPick" data-id="">Changer</button></div>' +
        adultCodeZone(adultWho === 'f' ? 'Code famille' : 'Code éduc') +
        '<p class="small" style="margin:0">' + (adultWho === 'f' ? 'Le code de votre famille (le même pour tous vos enfants). La 1re fois, tapez le code provisoire donné par l\'éducateur : vous choisirez ensuite le vôtre.' : 'La 1re fois, tapez le code provisoire donné par l\'administrateur : vous choisirez ensuite le vôtre.') + ' Vous restez connecté sur cet appareil.</p>' + foot + '</main>';
    }
    // 1. qui ?
    if (adultWho === 'e') {
      var draw = function (l) {
        return '<main class="screen nonav" id="adultzone">' + head + '<section class="sec"><h2 class="h2">Qui êtes-vous ?</h2><div class="roster">' +
          l.map(function (e) { return '<button type="button" class="kidbtn" data-act="adultPick" data-id="' + esc(e.id) + '" data-nom="' + esc(e.nom) + '"><span>' + ui.avatar(e.nom, '#B48CFF', 40) + '<span class="nm">' + esc(e.nom) + '</span></span></button>'; }).join('') +
          '</div></section>' + foot + '</main>';
      };
      var lire = api.call('educsListe', {}, { silent: !!educsCache }).then(function (r) { var ch = JSON.stringify(r.educs) !== JSON.stringify(educsCache); educsCache = r.educs; educsAt = Date.now(); return ch; });
      if (educsCache) {   // la liste connue tout de suite, puis à jour (un éduc ajouté entre-temps)
        lire.then(function (ch) { if (ch && location.hash.indexOf('#/adultes') === 0 && adultWho === 'e' && !adultPick) app.rerender(); }).catch(function () { });
        return draw(educsCache);
      }
      return lire.then(function () { return draw(educsCache); });
    }
    var drawF = function () {
      var list = rosterList(), qq = adultQuery.toLowerCase();
      var shown = list.filter(function (k) { return !qq || k.prenom.toLowerCase().indexOf(qq) >= 0; });
      return '<main class="screen nonav" id="adultzone">' + head + '<section class="sec"><h2 class="h2">Le parent de qui ?</h2>' +
        '<p class="small" style="margin:0">Touchez le prénom de votre enfant (un seul suffit si vous en avez plusieurs).</p>' +
        (list.length > 12 ? '<label class="sr-only" for="aq">Chercher le prénom</label><input id="aq" class="search" type="search" placeholder="Prénom de votre enfant…" value="' + esc(adultQuery) + '" autocomplete="off">' : '') +
        '<div class="roster" id="aroster">' + shown.map(parentKidBtn).join('') + '</div></section>' + foot + '</main>';
    };
    if (rosterList().length) return drawF();
    return api.call('roster', {}).then(function (res) { app.S.roster = res.joueurs; app.lsSet('mc-roster', res.joueurs); return drawF(); });
  }, { bg: '#16223F' });
  function parentKidBtn(k) { return '<button type="button" class="kidbtn" data-act="adultPick" data-id="' + esc(k.id) + '" data-nom="' + esc(k.prenom) + '"><span>' + ui.avatar(k.prenom, k.couleur, 40) + '<span class="nm">' + esc(k.prenom) + '</span></span></button>'; }
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'aq') {
      adultQuery = e.target.value;
      var qq = adultQuery.toLowerCase(), r = document.getElementById('aroster');
      if (r) r.innerHTML = rosterList().filter(function (k) { return !qq || k.prenom.toLowerCase().indexOf(qq) >= 0; }).map(parentKidBtn).join('');
    }
  });
  MC.act.adultWho = function (b) { adultWho = b.getAttribute('data-w'); adultPick = null; app.render(); };
  MC.act.adultPick = function (b) { var id = b.getAttribute('data-id'); adultPick = id ? { role: adultWho, id: id, nom: b.getAttribute('data-nom') || '' } : null; app.render(); };
  MC.act.adultForget = function () { app.setAdult(null); app.lockAdult(); app.render(); };

  // ---------- L'adulte choisit son code (1re connexion, ou pour en changer) ----------
  var ac = { step: 'code', code: '' };
  app.route('/adultes/code', function (p, q, cur) {
    var A = app.S.adult;
    if (!A) { setTimeout(function () { app.go('#/adultes', true); }, 0); return ''; }
    var change = !A.mustChange, home = A.role === 'e' ? '#/educ' : '#/parent';
    if (ac.step === 'done') {
      ac = { step: 'code', code: '' };
      return '<main class="screen nonav">' + '<div class="note green">' + ui.icon('check', 28) + '<div><div class="hud" style="color:var(--green)">Code enregistré</div><div style="margin-top:4px">C\'est votre code à vous : ne le donnez à personne, surtout pas aux enfants.</div></div></div>' +
        '<a class="btn" href="' + home + '">' + ui.icon('right', 18) + ' Continuer</a></main>';
    }
    cur.cleanup = function () { pad = null; };
    cur.after = function (el) {
      pad = { len: 4, val: '', reveal: false, el: el.querySelector('#adultzone'), onDone: function (v) {
        if (ac.step === 'code') { ac.code = v; ac.step = 'confirm'; app.render(); return; }
        if (v !== ac.code) { ac = { step: 'code', code: '' }; app.render(); setTimeout(function () { setMsg('Les deux codes sont différents. On recommence.', true); }, 30); return; }
        pad.busy = true; setMsg('Enregistrement…');
        app.adultCall('setAdultPin', { pin: v }).then(function (res) {
          var S = app.S.adult; S.token = res.token; S.mustChange = false; app.setAdult(S); app.touchAdult();
          ac.step = 'done'; app.render();
        }).catch(function (e) { if (pad) { pad.busy = false; pad.val = ''; paintDigits(); setMsg(e.message, true); } });
      } };
    };
    var t = ac.step === 'code' ? (change ? 'Votre nouveau code' : 'Choisissez votre code') : 'Retapez-le';
    return '<main class="screen nonav" id="adultzone">' + (change ? ui.topbar({ back: A.role === 'e' ? '#/educ/reglages' : '#/parent/plus', backLabel: A.role === 'e' ? 'Réglages' : 'Plus', title: 'Mon code', help: false }) : '') +
      '<div class="head"><span class="kicker">' + (change ? 'Changer mon code' : '1re connexion') + ' · ' + esc(A.nom || '') + '</span><h1 class="big md">' + t + '</h1>' +
      '<p class="lead" style="margin:0">' + (ac.step === 'code' ? (A.role === 'e' ? '4 chiffres, rien qu\'à vous. Vous le taperez après avoir touché votre nom.' : '4 chiffres, le même pour toute la famille : donnez-le à l\'autre parent. Vous le taperez après avoir touché le prénom de votre enfant.') : 'Pour être sûr qu\'il n\'y a pas d\'erreur.') + '</p></div>' +
      adultCodeZone(ac.step === 'code' ? 'Nouveau code' : 'Le même code') + '</main>';
  }, { bg: '#16223F' });

  function rosterList() { var r = app.S.roster || app.lsGet('mc-roster'); return Array.isArray(r) ? r : []; }

  // ---------- « C'est bien toi ? » (plusieurs enfants sur le même appareil) ----------
  app.route('/qui', function () {
    return app.loadMe().then(function (me) {
      var k = me.joueur, list = rosterList();
      var others = app.recents().filter(function (id) { return id !== k.id; }).map(function (id) { return list.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
      return '<main class="screen nonav"><div class="head" style="text-align:center;align-items:center"><span class="kicker">Appareil partagé</span><h1 class="big md">C\'est bien toi ?</h1></div>' +
        '<div style="align-self:center">' + ui.avatar(k.prenom, k.couleur, 120) + '</div>' +
        '<button type="button" class="btn xl" data-act="quiOui">' + ui.icon('check', 22) + ' Oui, je suis ' + esc(k.prenom) + '</button>' +
        (others.length ? '<section class="sec"><h2 class="h2">Non, je suis…</h2><div class="roster">' + others.map(function (o) {
          return '<button type="button" class="kidbtn" data-act="quiAutre" data-id="' + esc(o.id) + '"><span>' + ui.avatar(o.prenom, o.couleur, 40) + '<span class="nm">' + esc(o.prenom) + '</span></span></button>';
        }).join('') + '</div></section>' : '') +
        '<button type="button" class="btn2 grey" data-act="quiNon">Quelqu\'un d\'autre</button>' +
        '<p class="small" style="margin:0;text-align:center">Plusieurs joueurs s\'entraînent sur cet appareil : on vérifie que les séances vont dans le bon profil.</p></main>';
    });
  }, { kid: true, busy: true, bg: '#1B2552' });
  MC.act.quiOui = function () { app.touchKid(); app.go(app.takeTarget('kid') || '#/semaine', true); };
  MC.act.quiNon = function () { app.takeTarget('kid'); app.setKid(null); app.go('#/connexion', true); };
  MC.act.quiAutre = function (b) {
    var id = b.getAttribute('data-id'), list = rosterList();
    var k = list.filter(function (x) { return x.id === id; })[0];
    app.takeTarget('kid'); app.setKid(null); app.go('#/connexion', true);
    if (k) setTimeout(function () { pinSheet(k); }, 60);
  };
})();
