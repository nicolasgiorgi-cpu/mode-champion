/* =========================================================
   Mode champion · M12 — espaces adultes : parents et éducs
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;

  function siteUrl() { return location.origin + location.pathname; }
  function shareCode(text) {
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { ui.toast('Copié : vous pouvez le coller dans WhatsApp.'); }, function () { ui.toast('Copie impossible : notez le code.', true); });
      else ui.toast('Copie impossible : notez le code.', true);
    }
    if (navigator.share) { navigator.share({ text: text }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); }); return; }
    copy();
  }
  function showCode(title, code, lines, shareText) {
    return ui.modal({
      title: title,
      body: ui.codeBox(code) + '<ul class="list" style="gap:4px">' + lines.map(function (l) { return '<li class="row small" style="color:var(--soft);align-items:flex-start">' + icon('check', 16, 'style="color:var(--green);flex:none;margin-top:2px"') + '<span>' + l + '</span></li>'; }).join('') + '</ul>',
      actions: [
        { label: icon('copy', 18) + ' Copier / partager', cls: 'btn', onClick: function () { shareCode(shareText); } },
        { label: 'Fermer', value: true, cls: 'btn2 grey' }
      ]
    });
  }
  MC.showCode = showCode;

  function testName(r) {
    var t = L.testDef(r.test);
    if (!t) return r.test;
    return (r.extra && r.extra.sm && t.sm ? t.sm.nom : t.nom);
  }
  function recLine(r, prenom, withActions) {
    var t = L.testDef(r.test) || { unite: '' };
    var val = ui.fmtVal(r.valeur, t.unite, t.decimales);
    if (r.extra && r.extra.g !== undefined) val = 'G ' + r.extra.g + ' s · D ' + r.extra.d + ' s';
    if (r.extra && r.extra.elastique) val += ' (élastique ' + ({ fin: '10 kg', moyen: '20 kg', fort: '30 kg', '10': '10 kg', '20': '20 kg', '30': '30 kg' }[r.extra.elastique] || r.extra.elastique) + ' : ' + (r.extra.nbElastique || 0) + ')';
    return '<li class="li" style="flex-wrap:wrap"><span class="grow"><span class="t1">' + (prenom ? esc(prenom.toUpperCase()) + ' · ' : '') + esc(testName(r)) + '</span><span class="t2">' + (r.bilan === 'defi' ? 'Défi' : 'Bilan ' + esc(r.bilan)) + ' · ' + ui.fmtDate(r.date) + (r.statut === 'refuse' ? ' · <b style="color:var(--red)">refusé</b>' + (r.parQui ? ' par ' + esc(r.parQui) : '') : '') + '</span></span>' +
      '<span style="font:700 16px/1 var(--f-hud);color:' + (r.statut === 'refuse' ? 'var(--dim)' : 'var(--gold)') + '">' + esc(val) + '</span>' +
      (withActions ? decBtns(r) : '') + '</li>';
  }

  // ---------- Confirmer / refuser : on choisit d'abord (ça s'allume), puis on valide tout d'un coup ----------
  var dec = {}; // id du résultat → 'ok' | 'refuse' (choix pas encore envoyés)
  function decBtns(r) {
    var d = dec[r.id] || '', refused = r.statut === 'refuse';
    return '<span class="decis" data-rid="' + esc(r.id) + '">' +
      '<button type="button" class="dbtn dok' + (d === 'ok' ? ' on' : '') + '" aria-pressed="' + (d === 'ok') + '" data-act="decide" data-v="ok" data-id="' + esc(r.id) + '">' + icon('check', 16) + (refused ? ' Rétablir (confirmer)' : ' Confirmer') + '</button>' +
      (refused ? '' : '<button type="button" class="dbtn dno' + (d === 'refuse' ? ' on' : '') + '" aria-pressed="' + (d === 'refuse') + '" data-act="decide" data-v="refuse" data-id="' + esc(r.id) + '">' + icon('x', 16) + ' Refuser</button>') + '</span>';
  }
  // juste sous la liste des résultats à confirmer (et sous « Tout confirmer »)
  function decBar() {
    var n = Object.keys(dec).length;
    return '<div class="decbar" data-decbar' + (n ? '' : ' hidden') + '><span class="decn">' + decCount() + '</span>' +
      '<button type="button" class="btn2 sm grey" data-act="decCancel">Annuler</button><button type="button" class="btn sm" data-act="decSend">' + icon('check', 18) + ' Valider mes choix</button></div>';
  }
  function decCount() {
    var ok = 0, no = 0;
    Object.keys(dec).forEach(function (k) { if (dec[k] === 'ok') ok++; else no++; });
    return [ok ? ok + ' à confirmer' : '', no ? no + ' à refuser' : ''].filter(Boolean).join(' · ');
  }
  function updDec() {
    Array.prototype.forEach.call(document.querySelectorAll('.decis[data-rid]'), function (sp) {
      var d = dec[sp.getAttribute('data-rid')] || '';
      Array.prototype.forEach.call(sp.querySelectorAll('[data-act="decide"]'), function (b) {
        var on = b.getAttribute('data-v') === d;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
    });
    var n = Object.keys(dec).length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-decbar]'), function (bar) {
      bar.hidden = !n; bar.querySelector('.decn').textContent = decCount();
    });
  }
  MC.act.decide = function (b) {
    var id = b.getAttribute('data-id'), v = b.getAttribute('data-v');
    if (dec[id] === v) delete dec[id]; else dec[id] = v;
    updDec();
  };
  MC.act.decAll = function (b) { b.getAttribute('data-ids').split(',').forEach(function (id) { if (id) dec[id] = 'ok'; }); updDec(); };
  MC.act.decCancel = function () { dec = {}; updDec(); };
  // les résultats renvoyés par le serveur remplacent ceux gardés en mémoire (pas besoin de tout recharger)
  function patchRecords(recs) {
    var byId = {};
    recs.forEach(function (r) { byId[r.id] = r; });
    function fix(list) { (list || []).forEach(function (r, i) { if (byId[r.id]) list[i] = byId[r.id]; }); }
    var c = app.S.cache, tok = app.S.adult && app.S.adult.token;
    if (c.family) { c.family.enfants.forEach(function (e) { fix(e.records); }); app.lsSet('mc-fam', { tok: tok, data: c.family }); }
    if (c.group) { c.group.joueurs.forEach(function (p) { fix(p.records); }); app.lsSet('mc-group', { tok: tok, data: c.group }); }
    if (c.kid) fix(c.kid.records);
  }
  MC.act.decSend = function (b) {
    var list = Object.keys(dec).map(function (id) { return { id: id, statut: dec[id] }; });
    if (!list.length) return;
    b.disabled = true;
    app.adultCall('confirm', { decisions: list }).then(function (r) {
      if (r.records) return r;
      // serveur pas encore à jour : ancien format, un appel par sorte de choix
      var ok = list.filter(function (x) { return x.statut === 'ok'; }).map(function (x) { return x.id; });
      var no = list.filter(function (x) { return x.statut === 'refuse'; }).map(function (x) { return x.id; });
      return (ok.length ? app.adultCall('confirm', { ids: ok, statut: 'ok' }) : Promise.resolve()).then(function () {
        return no.length ? app.adultCall('confirm', { ids: no, statut: 'refuse' }) : null;
      }).then(function () { app.S.cache = {}; app.lsSet('mc-fam', null); app.lsSet('mc-group', null); return { confirmes: ok.length, refuses: no.length, records: [] }; });
    }).then(function (r) {
      patchRecords(r.records || []);
      dec = {};
      document.body.classList.remove('dec-open');
      ui.toast([r.confirmes ? r.confirmes + ' confirmé' + (r.confirmes > 1 ? 's' : '') : '', r.refuses ? r.refuses + ' refusé' + (r.refuses > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || 'Enregistré');
      app.rerender();
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  document.addEventListener('hashchange', function () { if (!/^#\/(parent|educ)/.test(location.hash)) { dec = {}; document.body.classList.remove('dec-open'); } });

  // ---------- résumé d'un enfant (parent et éduc) ----------
  function kidSummary(d, opts) {
    opts = opts || {};
    var st = L.compute(d), k = d.joueur, wk = st.week, t = L.today();
    var tiles = '<div class="grid2">' + [
      [st.maison, 'séances à la maison', 'var(--ink)'], [st.streak + ' j', 'série en cours', 'var(--orange)'],
      [st.grade.nom, 'grade · ' + ui.fmtNum(st.xp) + ' XP', 'var(--cyan)'], [st.nbBadges + ' / ' + C.BADGES.length, 'badges gagnés', 'var(--gold)']
    ].map(function (x) { return '<div class="tile"><span class="v" style="color:' + x[2] + ';font-size:22px">' + esc(x[0]) + '</span><span class="l" style="text-transform:none;letter-spacing:.02em;font-family:var(--f-body);font-size:13px">' + x[1] + '</span></div>'; }).join('') + '</div>';
    var days = C.SEMAINE.map(function (tp, i) {
      var j = C.JOURS[tp], sl = j.slot, done = sl >= 0 && wk.filled[sl], date = L.addDays(wk.mon, i);
      var cls = sl < 0 ? 'background:transparent;border:1px solid #1E2740' : done ? 'background:var(--gold)' : (date < t ? 'background:transparent;border:1px solid var(--red)' : 'background:transparent;border:1px dashed #2A3557');
      return '<div style="height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#0C1120;border:1px solid var(--line)' + (date === t ? ';border-color:var(--cyan)' : '') + '"><span style="font:700 12px/1 var(--f-hud);color:var(--soft)">' + j.court.charAt(0) + '</span><span style="width:14px;height:14px;transform:rotate(45deg);' + cls + '"></span></div>';
    }).join('');
    var last = (d.seances || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 6);
    var lastHtml = last.length ? '<ul class="list">' + last.map(function (s) {
      var j = C.JOURS[s.type] || {};
      var info = s.mode === 'guidee' ? 'séance guidée' : 'notée';
      if (s.ressenti) info += ' · ' + ({ facile: 'facile', bien: 'pile bien', dur: 'dur' }[s.ressenti]);
      if (s.details && s.details.niveau) info += ' · N' + s.details.niveau;
      if (s.type === 'club' && s.details && s.details.match) info = 'match' + (s.details.adversaire ? ' contre ' + s.details.adversaire : '') + (s.details.score ? ' · ' + s.details.score : '');
      return '<li class="li"><span class="dia" style="--dc:' + (j.color || '#888') + '"></span><span class="grow"><span class="t1">' + esc(j.nomSeance || s.type) + '</span><span class="t2">' + ui.fmtDate(s.date) + ' · ' + esc(info) + '</span></span></li>';
    }).join('') + '</ul>' : '<div class="empty">Aucune séance notée pour l\'instant.</div>';
    var pending = (d.records || []).filter(function (r) { return r.statut === 'attente'; });
    var refused = (d.records || []).filter(function (r) { return r.statut === 'refuse'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 12);
    var pendHtml = pending.length ? '<section class="note pink" style="flex-direction:column;gap:10px"><div><div class="hud" style="color:var(--pink)">' + pending.length + ' résultat' + (pending.length > 1 ? 's' : '') + ' à confirmer</div><div class="small" style="color:var(--soft);margin-top:4px">' + esc(k.prenom) + ' les a notés. Vous étiez là ? Choisissez <b>Confirmer</b> ou <b>Refuser</b> pour chacun (vous pouvez changer d\'avis), puis touchez <b>Valider mes choix</b> juste en dessous.</div></div>' +
      '<ul class="list" style="width:100%">' + pending.map(function (r) { return recLine(r, '', true); }).join('') + '</ul>' +
      (pending.length > 1 ? '<button type="button" class="btn2 pink" data-act="decAll" data-ids="' + esc(pending.map(function (r) { return r.id; }).join(',')) + '">' + icon('check', 16) + ' Tout confirmer</button>' : '') + decBar() + '</section>' : '';
    if (refused.length) pendHtml += '<details class="note" style="flex-direction:column;gap:8px;display:block"><summary style="cursor:pointer;min-height:32px"><span class="hud" style="color:var(--muted)">' + refused.length + ' résultat' + (refused.length > 1 ? 's' : '') + ' refusé' + (refused.length > 1 ? 's' : '') + '</span> <span class="small">· refusé par erreur ? Rétablissez-le.</span></summary>' +
      '<ul class="list" style="width:100%;margin-top:8px">' + refused.map(function (r) { return recLine(r, '', true); }).join('') + '</ul>' + (pending.length ? '' : decBar()) + '</details>';
    var niv = k.niveaux || {};
    var levels = '<ul class="list">' + C.FAMILLES.map(function (f) {
      return f.cles.map(function (cle) {
        var n = niv[cle] || 1;
        var ctl = opts.editLevels ? '<span class="row" style="gap:4px">' + [1, 2, 3, 4].map(function (i) { return '<button type="button" class="opt' + (i === n ? ' on' : '') + '" style="min-height:40px;width:40px;padding:0;--oc:' + C.NIVEAUX[i].color + '" data-act="edLevel" data-cle="' + cle + '" data-v="' + i + '" aria-label="' + esc(C.CLES[cle].nom) + ' niveau ' + i + '">' + i + '</button>'; }).join('') + '</span>' : ui.lvl(n);
        return '<li class="li"><span class="dia" style="--dc:' + f.color + '"></span><span class="grow"><span class="t1">' + esc(C.CLES[cle].nom) + '</span></span>' + ctl + '</li>';
      }).join('');
    }).join('') + '</ul>';
    var bests = st.bestsOk, recs = C.TESTS.map(function (t) {
      var b = bests[t.id] || bests[t.id + ':sm'];
      return '<div class="rec"><span class="v">' + (b ? ui.valHtml(b.valeur, t.unite, t.decimales) : '—') + '</span><span class="l">' + esc(t.court) + '</span></div>';
    }).join('');
    return { tiles: tiles, week: '<div class="grid4" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:5px">' + days + '</div>', last: lastHtml, pending: pendHtml, levels: levels, recs: '<div class="recgrid">' + recs + '</div>', st: st };
  }

  MC.act.adultLogout = function () {
    ui.modal({ title: 'Se déconnecter ?', body: '<p class="lead">Il faudra retaper le code sur cet appareil.</p>', actions: [{ label: 'Se déconnecter', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (ok) { app.setAdult(null); app.go('#/adultes'); }
    });
  };
  MC.act.kidCode = function (b) {
    var id = b.getAttribute('data-id');
    ui.modal({ title: 'Nouveau code provisoire ?', body: '<p class="lead">L\'ancien code de ' + esc(b.getAttribute('data-p')) + ' ne marchera plus. Avec le code provisoire, il choisira lui-même son nouveau code. Ses séances, étoiles et records sont gardés.</p>', actions: [{ label: 'Créer le code', value: true, cls: 'btn' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('resetKidPin', { joueurId: id }).then(function (r) {
        showCode('Code provisoire pour ' + esc(r.prenom), r.code, ['À donner à ' + esc(r.prenom) + ' : valable 48 h, une seule fois.', 'En se connectant avec, il choisira son nouveau code.'],
          'Mode champion M12 · ' + r.prenom + ' : ton code provisoire est ' + r.code + ' (valable 48 h). Connecte-toi sur ' + siteUrl() + ' puis choisis ton nouveau code.');
      }).catch(function (e) { ui.toast(e.message, true); });
    });
  };
  // modifie un joueur dans les données gardées (famille, vestiaire, fiche) sans tout recharger
  function patchKid(id, fn) {
    var c = app.S.cache, tok = app.S.adult && app.S.adult.token;
    if (c.family) { c.family.enfants.forEach(function (e) { if (e.joueur.id === id) fn(e.joueur); }); app.lsSet('mc-fam', { tok: tok, data: c.family }); }
    if (c.group) { c.group.joueurs.forEach(function (p) { if (p.joueur.id === id) fn(p.joueur); }); app.lsSet('mc-group', { tok: tok, data: c.group }); }
    if (c.kid && c.kid.joueur.id === id) fn(c.kid.joueur);
  }
  MC.act.kidVisible = function (b) {
    var on = b.getAttribute('aria-checked') !== 'true', id = b.getAttribute('data-id');
    app.adultCall('setVisible', { joueurId: id, visible: on }).then(function () { patchKid(id, function (j) { j.visible = on; }); app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  };

  // ---------- PARENT ----------
  var parentSel = null;
  app.route('/parent', function () {
    var a = app.S.adult;
    var p = app.S.cache.family ? Promise.resolve(app.S.cache.family) : app.swr('mc-fam', 'family', {}, function (res) {
      app.S.cache.family = res;
      if (location.hash.indexOf('#/parent') === 0 && !Object.keys(dec).length) app.rerender();
    }).then(function (r) { app.S.cache.family = r; return r; });
    return p.then(function (fam) {
      var kids = fam.enfants;
      if (!kids.length) return '<main class="screen nonav"><div class="head"><span class="kicker">Espace parent</span><h1 class="big md">' + esc(fam.famille.nom) + '</h1></div><div class="empty">Aucun enfant rattaché à ce code. Demandez à l\'éducateur.</div><button class="btn2 grey" data-act="adultLogout">Se déconnecter</button></main>';
      if (!parentSel || !kids.some(function (k) { return k.joueur.id === parentSel; })) parentSel = kids[0].joueur.id;
      var d = kids.filter(function (k) { return k.joueur.id === parentSel; })[0], k = d.joueur;
      var S = kidSummary(d, {});
      var sel = kids.length > 1 ? '<div class="row" style="gap:8px;flex-wrap:wrap">' + kids.map(function (x) {
        var on = x.joueur.id === parentSel;
        return '<button type="button" class="opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="parentKid" data-id="' + esc(x.joueur.id) + '" style="min-height:48px;padding:0 14px">' + ui.avatar(x.joueur.prenom, x.joueur.couleur, 28) + esc(x.joueur.prenom) + '</button>';
      }).join('') + '</div>' : '';
      return '<main class="screen nonav">' +
        '<div class="between" style="align-items:center"><span class="kicker">Espace parent · ' + esc(fam.famille.nom) + '</span><span class="row" style="gap:6px"><a class="tag" href="#/guide" style="min-height:40px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--soft)">' + icon('info', 14) + 'Aide</a><button type="button" class="tag" style="min-height:40px;background:none;cursor:pointer" data-act="adultLogout">' + icon('logout', 14) + ' Sortir</button></span></div>' +
        '<div class="row" style="gap:14px">' + ui.avatar(k.prenom, k.couleur, 64) + '<div class="head"><h1 class="big sm">Suivi de ' + esc(k.prenom) + '</h1></div></div>' + sel +
        S.pending + S.tiles +
        '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><div class="between"><h2 class="h2">Cette semaine</h2><span class="hud" style="color:var(--gold)">' + S.st.week.stars + ' / 6</span></div>' + S.week + '</section>' +
        '<section class="sec"><h2 class="h2">Dernières séances</h2>' + S.last + '</section></div>' +
        '<div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Ses niveaux</h2>' + S.levels + '<p class="small" style="margin:0">Ils viennent du bilan et montent quand c\'est « facile » 2 fois de suite. L\'éducateur peut les ajuster.</p></section>' +
        '<section class="sec"><h2 class="h2">Ses records confirmés</h2>' + S.recs + '</section>' +
        '<section class="sec"><h2 class="h2">Réglages</h2>' +
        '<button type="button" class="switch" role="switch" aria-checked="' + !!k.visible + '" data-act="kidVisible" data-id="' + esc(k.id) + '"><span><span class="t1" style="display:block">Afficher ' + esc(k.prenom) + ' au classement</span><span class="t2" style="display:block">' + (k.visible ? 'Son prénom apparaît dans sa ligue' : 'Il voit son rang, les autres ne le voient pas') + '</span></span><span class="k"></span></button>' +
        '<button type="button" class="switch" data-act="kidCode" data-id="' + esc(k.id) + '" data-p="' + esc(k.prenom) + '"><span><span class="t1" style="display:block">Nouveau code secret pour ' + esc(k.prenom) + '</span><span class="t2" style="display:block">S\'il a oublié le sien</span></span>' + icon('right', 18) + '</button>' +
        '</section></div></div>' +
        '<div class="note">' + icon('info', 20) + '<span>Le programme est fait pour 9-11 ans : poids du corps, pas de charge. Une douleur qui revient (talon, genou) = pause des sauts et avis médical. Le vendredi reste un jour de repos.</span></div>' +
        '</main>';
    });
  }, { adult: 'f', bg: '#16223F' });
  MC.act.parentKid = function (b) { parentSel = b.getAttribute('data-id'); app.rerender(); };

  // ---------- ÉDUC : le vestiaire ----------
  var edFilter = 'all', edQ = '';
  function loadGroup(force) {
    if (app.S.cache.group && !force) return Promise.resolve(app.S.cache.group);
    if (force) return app.adultCall('group').then(function (r) { app.S.cache.group = r; app.lsSet('mc-group', { tok: app.S.adult.token, data: r }); return r; });
    return app.swr('mc-group', 'group', {}, function (res) {
      app.S.cache.group = res;
      if (/^#\/educ/.test(location.hash) && !Object.keys(dec).length && !document.querySelector('.modal')) app.rerender();
    }).then(function (r) { app.S.cache.group = r; return r; });
  }
  // après une modification : on oublie le groupe gardé (sinon on reverrait l'ancien état un instant)
  function dropGroup() { app.S.cache.group = null; app.lsSet('mc-group', null); }
  app.route('/educ', function () {
    return loadGroup().then(function (g) { return paintEduc(g); });
  }, { adult: 'e', bg: '#16223F' });

  function paintEduc(g) {
    var t = L.today(), mon = L.monday(t), weekAgo = L.addDays(t, -7);
    var players = g.joueurs.filter(function (p) { return p.joueur.actif; });
    var sessionsWeek = 0, active = 0, late = [];
    players.forEach(function (p) {
      var last = '';
      p.seances.forEach(function (s) { if (s.date >= mon) sessionsWeek++; if (s.date > last) last = s.date; });
      p._last = last;
      if (last && last > weekAgo) active++; else late.push(p);
    });
    var pending = [];
    players.forEach(function (p) { p.records.forEach(function (r) { if (r.statut === 'attente') pending.push({ r: r, p: p }); }); });
    var list = edFilter === 'late' ? late : players;
    var q = edQ.toLowerCase();
    list = list.filter(function (p) { return !q || p.joueur.prenom.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
    var rows = list.map(function (p) {
      var w = L.weekInfo(L.weeks(p.seances), mon), dots = '';
      for (var i = 0; i < 6; i++) dots += '<i class="' + (w.filled[i] ? 'done' : '') + '" style="' + (w.filled[i] ? 'background:var(--gold);border:0' : '') + '"></i>';
      var lastTxt = p._last ? (p._last > weekAgo ? 'Dernière séance : ' + ui.fmtDate(p._last) : 'Rien depuis ' + L.daysBetween(p._last, t) + ' jours') : (p.joueur.aUnCode ? 'Pas encore de séance' : 'Pas encore connecté');
      return '<li><a class="li" href="#/educ/joueur/' + esc(p.joueur.id) + '">' + ui.hexa(p.joueur.prenom, p.joueur.couleur) + '<span class="grow"><span class="t1">' + esc(p.joueur.prenom.toUpperCase()) + '</span><span class="t2" style="color:' + (p._last && p._last > weekAgo ? 'var(--dim)' : 'var(--orange)') + '">' + esc(lastTxt) + '</span></span><span class="setdots" aria-label="' + w.stars + ' étoiles cette semaine">' + dots + '</span>' + icon('right', 16) + '</a></li>';
    }).join('');
    var pend = pending.length ? pending.slice(0, 30).map(function (x) { return recLine(x.r, x.p.joueur.prenom, true); }).join('') : '';
    return '<main class="screen nonav">' +
      '<div class="between" style="align-items:center"><span class="kicker">Espace éduc · ' + esc(g.moi.nom) + (g.moi.admin ? ' · admin' : '') + '</span><span class="row" style="gap:6px"><a class="tag" href="#/guide" style="min-height:40px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--soft)">' + icon('info', 14) + 'Aide</a><button type="button" class="tag" style="min-height:40px;background:none;cursor:pointer" data-act="adultLogout">' + icon('logout', 14) + ' Sortir</button></span></div>' +
      '<div class="head"><h1 class="big md">Le vestiaire</h1>' + (MC.api.DEMO ? '<p class="small" style="margin:0;color:var(--yellow)">Mode démo : joueurs fictifs.</p>' : '') + '</div>' +
      '<div class="grid3"><div class="tile"><span class="v">' + sessionsWeek + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">séances cette semaine</span></div>' +
      '<div class="tile"><span class="v" style="color:var(--green)">' + active + '<small style="font-size:13px;color:var(--dim)"> / ' + players.length + '</small></span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">actifs sur 7 jours</span></div>' +
      '<div class="tile" style="border-color:rgba(255,138,61,.5);background:rgba(255,138,61,.08)"><span class="v" style="color:var(--orange)">' + late.length + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">rien depuis 7 jours</span></div></div>' +
      '<div class="cols2"><div class="sec" style="gap:20px">' +
      '<section class="sec"><div class="between"><h2 class="h2">Résultats à valider</h2><span class="hud" style="color:var(--pink)">' + pending.length + '</span></div>' +
      (pending.length ? '<p class="small" style="margin:0">Choisissez Confirmer ou Refuser (vous pouvez changer d\'avis), puis <b>Valider mes choix</b> juste en dessous.</p><ul class="list">' + pend + '</ul>' + (pending.length > 1 ? '<button type="button" class="btn2 pink" data-act="decAll" data-ids="' + esc(pending.map(function (x) { return x.r.id; }).join(',')) + '">' + icon('check', 16) + ' Tout confirmer (' + pending.length + ')</button>' : '') + decBar() : '<div class="empty">Tout est validé. Bravo !</div>') + '</section>' +
      '<section class="sec"><h2 class="h2">Outils</h2>' +
      '<a class="switch" href="#/educ/ajouter" style="text-decoration:none">' + '<span class="row">' + icon('plus', 20, 'style="color:var(--cyan)"') + '<span class="t1">Ajouter un joueur</span></span>' + icon('right', 16) + '</a>' +
      '<a class="switch" href="#/educ/familles" style="text-decoration:none"><span class="row">' + icon('key', 20, 'style="color:var(--cyan)"') + '<span class="t1">Familles et codes parents</span></span>' + icon('right', 16) + '</a>' +
      (g.moi.admin ? '<a class="switch" href="#/educ/educs" style="text-decoration:none"><span class="row">' + icon('group', 20, 'style="color:var(--cyan)"') + '<span class="t1">Les éducs (admin)</span></span>' + icon('right', 16) + '</a>' : '') +
      '<button type="button" class="switch" data-act="myCode"><span class="row">' + icon('lock', 20, 'style="color:var(--cyan)"') + '<span class="t1">Changer mon code éduc</span></span>' + icon('right', 16) + '</button>' +
      '</section></div>' +
      '<section class="sec"><div class="between"><h2 class="h2">Les joueurs</h2><span class="small">' + players.length + '</span></div>' +
      '<label class="sr-only" for="edq">Chercher un joueur</label><input id="edq" class="search" type="search" placeholder="Chercher un prénom…" value="' + esc(edQ) + '">' +
      '<div class="grid2"><button type="button" class="opt' + (edFilter === 'all' ? ' on' : '') + '" data-act="edFilter" data-v="all">Tous · ' + players.length + '</button><button type="button" class="opt' + (edFilter === 'late' ? ' on' : '') + '" style="--oc:var(--orange)" data-act="edFilter" data-v="late">À relancer · ' + late.length + '</button></div>' +
      '<ul class="list" id="edlist">' + (rows || '<li class="empty">Personne.</li>') + '</ul></section></div>' + '</main>';
  }
  MC.act.edFilter = function (b) { edFilter = b.getAttribute('data-v'); app.rerender(); };
  var edTimer = null;
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'edq') {
      edQ = e.target.value;
      clearTimeout(edTimer);
      edTimer = setTimeout(function () {
        var html = paintEduc(app.S.cache.group);
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        var nl = tmp.querySelector('#edlist'), ol = document.getElementById('edlist');
        if (nl && ol) ol.innerHTML = nl.innerHTML;
      }, 150);
    }
  });
  MC.act.myCode = function () {
    ui.modal({ title: 'Nouveau code éduc ?', body: '<p class="lead">Votre code actuel ne marchera plus. Notez bien le nouveau.</p>', actions: [{ label: 'Créer mon nouveau code', value: true, cls: 'btn' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('resetEducCode', {}).then(function (r) {
        var a = app.S.adult;
        showCode('Votre nouveau code', r.code, ['Notez-le : il ne sera plus affiché.', 'Vous allez devoir vous reconnecter avec.'], 'Mode champion M12 · mon code éduc : ' + r.code).then(function () { app.setAdult(null); app.go('#/adultes'); });
      }).catch(function (e) { ui.toast(e.message, true); });
    });
  };

  // ---------- ÉDUC : un joueur ----------
  app.route('/educ/joueur/:id', function (p) {
    return loadGroup().then(function (g) {
      var c = app.S.cache.kid;
      if (c && c.joueur.id === p.id) return paintKid(c, g);
      var quick = g.joueurs.filter(function (x) { return x.joueur.id === p.id; })[0];
      var full = MC.api.call('kid', { token: app.S.adult.token, joueurId: p.id }, { silent: !!quick }).then(function (d) { app.S.cache.kid = d; return d; });
      if (quick) {
        full.then(function () { if (location.hash === '#/educ/joueur/' + p.id) app.rerender(); }).catch(function () { });
        return paintKid(quick, g);
      }
      return full.then(function (d) { return paintKid(d, g); });
    });
  }, { adult: 'e', bg: '#16223F' });
  function paintKid(d, g) {
        var k = d.joueur, S = kidSummary(d, { editLevels: true });
        var fam = g.familles.filter(function (f) { return f.id === k.familleId; })[0];
        return '<main class="screen nonav"><a class="back" href="#/educ">' + icon('left', 18) + 'Le vestiaire</a>' +
          '<div class="row" style="gap:14px">' + ui.avatar(k.prenom, k.couleur, 64) + '<div class="head"><span class="kicker">' + esc(fam ? fam.nom : '') + (k.actif ? '' : ' · désactivé') + '</span><h1 class="big sm">' + esc(k.prenom) + '</h1></div></div>' +
          S.pending + S.tiles +
          '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><div class="between"><h2 class="h2">Cette semaine</h2><span class="hud" style="color:var(--gold)">' + S.st.week.stars + ' / 6</span></div>' + S.week + '</section>' +
          '<section class="sec"><h2 class="h2">Dernières séances</h2>' + S.last + '</section>' +
          '<section class="sec"><h2 class="h2">Records confirmés</h2>' + S.recs + '</section></div>' +
          '<div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Niveaux</h2><p class="small" style="margin:0">Touchez un chiffre pour changer le niveau d\'un groupe d\'exercices.</p>' + S.levels + '</section>' +
          '<section class="sec"><h2 class="h2">Compte</h2>' +
          '<button type="button" class="switch" data-act="kidCode" data-id="' + esc(k.id) + '" data-p="' + esc(k.prenom) + '"><span><span class="t1" style="display:block">' + (k.aUnCode ? 'Nouveau code provisoire' : 'Code provisoire (1re connexion)') + '</span><span class="t2" style="display:block">Pour un code oublié ou une 1re connexion</span></span>' + icon('right', 18) + '</button>' +
          '<button type="button" class="switch" role="switch" aria-checked="' + !!k.visible + '" data-act="kidVisible" data-id="' + esc(k.id) + '"><span><span class="t1" style="display:block">Visible au classement</span><span class="t2" style="display:block">Les parents peuvent aussi le régler</span></span><span class="k"></span></button>' +
          '<label class="lab" for="kfam">Famille</label><select id="kfam" class="txt" data-act-change="kidFamily" data-id="' + esc(k.id) + '">' + g.familles.map(function (f) { return '<option value="' + esc(f.id) + '"' + (f.id === k.familleId ? ' selected' : '') + '>' + esc(f.nom) + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="btn2 ' + (k.actif ? 'grey' : '') + '" data-act="kidActive" data-id="' + esc(k.id) + '" data-on="' + (k.actif ? 0 : 1) + '">' + (k.actif ? 'Désactiver (a quitté le groupe)' : 'Réactiver') + '</button>' +
          '</section></div></div>' + '</main>';
  }
  MC.act.edLevel = function (b) {
    var id = app.current().params.id, cle = b.getAttribute('data-cle'), v = Number(b.getAttribute('data-v')), nv = {};
    nv[cle] = v;
    app.adultCall('updatePlayer', { joueurId: id, niveaux: nv }).then(function () {
      patchKid(id, function (j) { j.niveaux = j.niveaux || {}; j.niveaux[cle] = v; });
      ui.toast(C.CLES[cle].nom + ' : N' + v); app.rerender();
    }).catch(function (e) { ui.toast(e.message, true); });
  };
  MC.act.kidActive = function (b) {
    var on = b.getAttribute('data-on') === '1';
    app.adultCall('updatePlayer', { joueurId: b.getAttribute('data-id'), actif: on }).then(function () { patchKid(b.getAttribute('data-id'), function (j) { j.actif = on; }); ui.toast(on ? 'Joueur réactivé' : 'Joueur désactivé (il n\'apparaît plus)'); app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  };
  document.addEventListener('change', function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-act-change') === 'kidFamily') {
      app.adultCall('updatePlayer', { joueurId: e.target.getAttribute('data-id'), familleId: e.target.value }).then(function () { dropGroup(); ui.toast('Famille changée'); }).catch(function (er) { ui.toast(er.message, true); });
    }
  });

  // ---------- ÉDUC : ajouter un joueur ----------
  var add = { prenom: '', fam: 'new', famNom: '' };
  app.route('/educ/ajouter', function () {
    return loadGroup().then(function (g) {
      var fams = g.familles.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      return '<main class="screen nonav"><a class="back" href="#/educ">' + icon('left', 18) + 'Le vestiaire</a>' +
        '<div class="head"><span class="kicker">Nouveau joueur</span><h1 class="big md">Ajouter<br>un joueur</h1><p class="lead">Le site crée un code provisoire pour l\'enfant (valable 45 jours, pour sa 1re connexion) et, si c\'est une nouvelle famille, un code parent.</p></div>' +
        '<div class="sec"><label class="lab" for="ap">Prénom (ajoutez l\'initiale du nom si deux enfants ont le même prénom)</label><input id="ap" class="txt" maxlength="24" autocomplete="off" data-add="prenom" value="' + esc(add.prenom) + '">' +
        '<label class="lab" for="af">Famille</label><select id="af" class="txt" data-add="fam"><option value="new"' + (add.fam === 'new' ? ' selected' : '') + '>Nouvelle famille…</option>' + fams.map(function (f) { return '<option value="' + esc(f.id) + '"' + (add.fam === f.id ? ' selected' : '') + '>' + esc(f.nom) + ' (frère, sœur…)</option>'; }).join('') + '</select>' +
        (add.fam === 'new' ? '<label class="lab" for="an">Nom de la famille (facultatif)</label><input id="an" class="txt" maxlength="40" placeholder="ex. Famille Martin" data-add="famNom" value="' + esc(add.famNom) + '">' : '') + '</div>' +
        '<button type="button" class="btn xl" data-act="addPlayer">' + icon('plus', 20) + ' Créer le joueur</button></main>';
    });
  }, { adult: 'e', bg: '#16223F' });
  document.addEventListener('input', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-add'); if (k && k !== 'fam') add[k] = e.target.value; });
  document.addEventListener('change', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-add'); if (k === 'fam') { add.fam = e.target.value; app.rerender(); } });
  MC.act.addPlayer = function (b) {
    if (!add.prenom.trim()) return ui.toast('Il faut un prénom.', true);
    b.disabled = true;
    var p = { prenom: add.prenom };
    if (add.fam === 'new') p.familleNom = add.famNom; else p.familleId = add.fam;
    app.adultCall('addPlayer', p).then(function (r) {
      dropGroup();
      add = { prenom: '', fam: 'new', famNom: '' };
      var lines = ['Code provisoire de ' + esc(r.joueur.prenom) + ' (1re connexion, 45 jours) : il choisira ensuite son propre code.'];
      var text = 'Mode champion M12 · Bienvenue ' + r.joueur.prenom + ' ! Site : ' + siteUrl() + ' — touche ton prénom et tape ton code provisoire : ' + r.code + '.';
      if (r.familleCode) { lines.push('Code parent de « ' + esc(r.famille.nom) + ' » : <b style="color:var(--cyan);font-family:var(--f-hud);letter-spacing:.1em">' + r.familleCode + '</b> (espace adultes › Je suis parent).'); text += ' Code parent (espace adultes) : ' + r.familleCode + '.'; }
      return showCode(esc(r.joueur.prenom) + ' est ajouté !', r.code, lines, text);
    }).then(function () { app.go('#/educ'); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- ÉDUC : familles ----------
  app.route('/educ/familles', function () {
    return loadGroup(true).then(function (g) {
      var byFam = {};
      g.joueurs.forEach(function (p) { if (p.joueur.actif) (byFam[p.joueur.familleId] = byFam[p.joueur.familleId] || []).push(p.joueur.prenom); });
      var fams = g.familles.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      return '<main class="screen nonav"><a class="back" href="#/educ">' + icon('left', 18) + 'Le vestiaire</a>' +
        '<div class="head"><span class="kicker">Codes parents</span><h1 class="big md">Familles</h1><p class="lead">Un code par famille, pour tous ses enfants. Par sécurité, les codes ne sont jamais réaffichés : en cas d\'oubli, créez-en un nouveau (l\'ancien ne marche plus).</p></div>' +
        '<ul class="list">' + fams.map(function (f) {
          return '<li class="li"><span class="grow"><span class="t1">' + esc(f.nom) + '</span><span class="t2">' + esc((byFam[f.id] || []).join(', ') || 'aucun enfant actif') + '</span></span><button type="button" class="btn2 sm" data-act="famCode" data-id="' + esc(f.id) + '" data-n="' + esc(f.nom) + '">' + icon('key', 16) + ' Nouveau code</button></li>';
        }).join('') + '</ul></main>';
    });
  }, { adult: 'e', bg: '#16223F' });
  MC.act.famCode = function (b) {
    var nom = b.getAttribute('data-n');
    ui.modal({ title: 'Nouveau code parent ?', body: '<p class="lead">L\'ancien code de « ' + esc(nom) + ' » ne marchera plus.</p>', actions: [{ label: 'Créer le code', value: true, cls: 'btn' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('resetFamilyCode', { familleId: b.getAttribute('data-id') }).then(function (r) {
        showCode('Code parent', r.code, ['Pour « ' + esc(r.famille.nom) + ' » : espace adultes › Je suis parent.'], 'Mode champion M12 · ' + r.famille.nom + ' : votre code parent est ' + r.code + ' (espace adultes du site ' + siteUrl() + ').');
      }).catch(function (e) { ui.toast(e.message, true); });
    });
  };

  // ---------- ADMIN : les éducs ----------
  var newEduc = '';
  app.route('/educ/educs', function () {
    return Promise.all([app.adultCall('listEducs'), loadGroup()]).then(function (res) {
      var r = res[0];
      return '<main class="screen nonav"><a class="back" href="#/educ">' + icon('left', 18) + 'Le vestiaire</a>' +
        '<div class="head"><span class="kicker">Administration</span><h1 class="big md">Les éducs</h1></div>' +
        '<ul class="list">' + r.educs.map(function (e) {
          return '<li class="li" style="flex-wrap:wrap"><span class="grow"><span class="t1">' + esc(e.nom) + (e.admin ? ' · ADMIN' : '') + '</span><span class="t2">' + (e.actif ? 'actif' : 'désactivé') + '</span></span>' +
            '<button type="button" class="btn2 sm" data-act="educCode" data-id="' + esc(e.id) + '">' + icon('key', 16) + ' Code</button>' +
            (e.id !== app.S.cache.group.moi.id ? '<button type="button" class="btn2 sm grey" data-act="educActive" data-id="' + esc(e.id) + '" data-on="' + (e.actif ? 0 : 1) + '">' + (e.actif ? 'Désactiver' : 'Réactiver') + '</button>' : '') + '</li>';
        }).join('') + '</ul>' +
        '<section class="sec"><h2 class="h2">Ajouter un éduc</h2><label class="lab" for="ne">Nom</label><input id="ne" class="txt" maxlength="30" data-newedu value="' + esc(newEduc) + '">' +
        '<button type="button" class="btn" data-act="addEduc">' + icon('plus', 18) + ' Créer son code</button></section></main>';
    });
  }, { adult: 'e', bg: '#16223F' });
  document.addEventListener('input', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-newedu')) newEduc = e.target.value; });
  MC.act.addEduc = function (b) {
    if (!newEduc.trim()) return ui.toast('Il faut un nom.', true);
    b.disabled = true;
    app.adultCall('addEduc', { nom: newEduc }).then(function (r) {
      newEduc = '';
      return showCode('Code de ' + esc(r.educ.nom), r.code, ['Espace adultes › Je suis éduc.', 'Notez-le : il ne sera plus affiché.'], 'Mode champion M12 · ton code éduc : ' + r.code + ' (espace adultes du site ' + siteUrl() + ').');
    }).then(function () { app.rerender(); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.educCode = function (b) {
    app.adultCall('resetEducCode', { educId: b.getAttribute('data-id') }).then(function (r) {
      var mine = b.getAttribute('data-id') === app.S.cache.group.moi.id;
      showCode('Code de ' + esc(r.nom), r.code, ['L\'ancien code ne marche plus.'], 'Mode champion M12 · code éduc : ' + r.code).then(function () { if (mine) { app.setAdult(null); app.go('#/adultes'); } });
    }).catch(function (e) { ui.toast(e.message, true); });
  };
  MC.act.educActive = function (b) {
    app.adultCall('updateEduc', { educId: b.getAttribute('data-id'), actif: b.getAttribute('data-on') === '1' }).then(function () { app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  };
})();
