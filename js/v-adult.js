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
      '<button type="button" class="dbtn dok' + (d === 'ok' ? ' on' : '') + '" aria-pressed="' + (d === 'ok') + '" aria-label="' + (refused ? 'Rétablir (confirmer)' : 'Confirmer') + ' : ' + esc(testName(r)) + '" data-act="decide" data-v="ok" data-id="' + esc(r.id) + '">' + icon('check', 16) + (refused ? ' Rétablir (confirmer)' : ' Confirmer') + '</button>' +
      (refused ? '' : '<button type="button" class="dbtn dno' + (d === 'refuse' ? ' on' : '') + '" aria-pressed="' + (d === 'refuse') + '" aria-label="Refuser : ' + esc(testName(r)) + '" data-act="decide" data-v="refuse" data-id="' + esc(r.id) + '">' + icon('x', 16) + ' Refuser</button>') + '</span>';
  }
  // juste sous la liste des résultats à confirmer (et sous « Tout confirmer »)
  function decBar() {
    var n = Object.keys(dec).length;
    return '<div class="decbar" data-decbar' + (n ? '' : ' hidden') + '><span class="decn">' + decCount() + '</span>' +
      '<button type="button" class="btn2 sm grey" data-act="decCancel">Annuler</button><button type="button" class="btn sm" data-act="decSend">' + icon('check', 18) + ' <span class="decl">' + (n > 1 ? 'Enregistrer mes choix' : 'Enregistrer mon choix') + '</span></button></div>';
  }
  function decCount() {
    var ok = 0, no = 0;
    Object.keys(dec).forEach(function (k) { if (dec[k] === 'ok') ok++; else no++; });
    // (retouche UI-04) la différence entre choisir et enregistrer : « Choix non enregistré » tant qu'on n'a pas touché Enregistrer
    var t = [ok ? ok + ' à confirmer' : '', no ? no + ' à refuser' : ''].filter(Boolean).join(' · ');
    return t ? 'Choix non enregistré · ' + t : '';
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
      var l = bar.querySelector('.decl'); if (l) l.textContent = n > 1 ? 'Enregistrer mes choix' : 'Enregistrer mon choix';
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
      ui.toast((list.length > 1 ? list.length + ' choix enregistrés' : '1 choix enregistré') + ' : ' + ([r.confirmes ? r.confirmes + ' confirmé' + (r.confirmes > 1 ? 's' : '') : '', r.refuses ? r.refuses + ' refusé' + (r.refuses > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || 'c\'est noté'));
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
    var attFam = d.enAttente ? '<div class="note">' + icon('info', 18, 'style="color:var(--cyan);flex:none"') + '<span class="small">' + d.enAttente + ' résultat' + (d.enAttente > 1 ? 's attendent' : ' attend') + ' la confirmation de sa famille.</span></div>' : '';
    var pendHtml = attFam + (pending.length ? '<section class="note pink" style="flex-direction:column;gap:10px"><div><div class="hud" style="color:var(--pink)">' + pending.length + ' résultat' + (pending.length > 1 ? 's' : '') + ' à confirmer</div><div class="small" style="color:var(--soft);margin-top:4px">' + esc(k.prenom) + ' les a notés. Vous étiez là ? Choisissez <b>Confirmer</b> ou <b>Refuser</b> pour chacun (vous pouvez changer d\'avis), puis touchez <b>Enregistrer</b> juste en dessous : tant que ce n\'est pas fait, c\'est « Choix non enregistré ».</div></div>' +
      '<ul class="list" style="width:100%">' + pending.map(function (r) { return recLine(r, '', true); }).join('') + '</ul>' +
      (pending.length > 1 ? '<button type="button" class="btn2 pink" data-act="decAll" data-ids="' + esc(pending.map(function (r) { return r.id; }).join(',')) + '">' + icon('check', 16) + ' Tout confirmer</button>' : '') + decBar() + '</section>' : '');
    if (refused.length) pendHtml += '<details class="note" style="flex-direction:column;gap:8px;display:block"><summary style="cursor:pointer;min-height:32px"><span class="hud" style="color:var(--muted)">' + refused.length + ' résultat' + (refused.length > 1 ? 's' : '') + ' refusé' + (refused.length > 1 ? 's' : '') + '</span> <span class="small">· refusé par erreur ? Rétablissez-le.</span></summary>' +
      '<ul class="list" style="width:100%;margin-top:8px">' + refused.map(function (r) { return recLine(r, '', true); }).join('') + '</ul>' + (pending.length ? '' : decBar()) + '</details>';
    var niv = k.niveaux || {};
    var editing = !!(opts.editLevels && lvDraft && lvDraft.id === k.id);
    var levels = '<ul class="list">' + C.FAMILLES.map(function (f) {
      return f.cles.map(function (cle) {
        var n = niv[cle] || 1, dn = editing ? (lvDraft.niv[cle] || n) : n;
        var ctl = editing ? '<span class="row" style="gap:4px">' + [1, 2, 3, 4].map(function (i) { return '<button type="button" class="opt' + (i === dn ? ' on' : '') + '" style="min-height:40px;width:40px;padding:0;--oc:' + C.NIVEAUX[i].color + '" data-act="lvPick" data-cle="' + cle + '" data-v="' + i + '" aria-pressed="' + (i === dn) + '" aria-label="' + esc(C.CLES[cle].nom) + ' niveau ' + i + '">' + i + '</button>'; }).join('') + '</span>' : ui.lvl(n);
        return '<li class="li' + (editing && dn !== n ? ' changed' : '') + '"><span class="dia" style="--dc:' + f.color + '"></span><span class="grow"><span class="t1">' + esc(C.CLES[cle].nom) + '</span>' + (editing && dn !== n ? '<span class="t2" style="color:var(--yellow)">N' + n + ' → N' + dn + '</span>' : '') + '</span>' + ctl + '</li>';
      }).join('');
    }).join('') + '</ul>';
    if (opts.editLevels) {
      levels += editing ?
        '<div class="grid2"><button type="button" class="btn2 grey" data-act="lvCancel">Annuler</button><button type="button" class="btn" style="min-height:48px;font-size:13px" data-act="lvSave" data-id="' + esc(k.id) + '">' + icon('check', 16) + ' Enregistrer les niveaux</button></div>' :
        '<button type="button" class="btn2" data-act="lvEdit" data-id="' + esc(k.id) + '">' + icon('edit', 16) + ' Modifier les niveaux</button>';
    }
    var bests = st.bestsOk, recs = C.TESTS.map(function (t) {
      var b = bests[t.id] || bests[t.id + ':sm'];
      return '<div class="rec"><span class="v">' + (b ? ui.valHtml(b.valeur, t.unite, t.decimales) : '—') + '</span><span class="l">' + esc(t.court) + '</span></div>';
    }).join('');
    return { tiles: tiles, week: '<div class="grid4" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:5px">' + days + '</div>', last: lastHtml, pending: pendHtml, levels: levels, recs: '<div class="recgrid">' + recs + '</div>', st: st,
      hist: MC.suivi.seances(d.seances), prog: MC.suivi.progression(d.records, { vide: k.prenom + ' n\'a pas encore noté de bilan.' }) };
  }

  // appareil partagé avec un enfant : l'espace adulte se reverrouille (code redemandé)
  function sharedSwitch() {
    var on = app.sharedDevice();
    return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-act="toggleShared"><span><span class="t1" style="display:block">Appareil partagé avec un enfant</span><span class="t2" style="display:block">' +
      (on ? 'Votre code est redemandé quand on revient de l\'espace joueur' : 'Votre espace reste ouvert sur cet appareil') + '</span></span><span class="k"></span></button>';
  }
  MC.act.toggleShared = function () { app.setShared(!app.sharedDevice()); app.rerender(); };
  MC.act.adultLogout = function () {
    ui.modal({ title: 'Se déconnecter ?', body: '<p class="lead">Il faudra retaper le code sur cet appareil.</p>', actions: [{ label: 'Se déconnecter', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (ok) { if (MC.alertes && app.S.adult) MC.alertes.oublier(app.S.adult.role); app.setAdult(null); app.go('#/adultes'); }
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

  // ======================================================================
  // PARENT : 4 onglets (Suivi · Progrès · Classement · Plus), l'enfant suivi se choisit en haut
  // ======================================================================
  var parentSel = null;
  function loadFamily() {
    if (app.S.cache.family) return Promise.resolve(app.S.cache.family);
    return app.swr('mc-fam', 'family', {}, function (res) {
      app.S.cache.family = res;
      if (location.hash.indexOf('#/parent') === 0 && !Object.keys(dec).length && !document.querySelector('.modal')) app.rerender();
      app.refreshNav();
    }).then(function (r) { app.S.cache.family = r; return r; });
  }
  MC.loadFamily = loadFamily;
  // tirer pour actualiser (espaces parent et éduc) : la famille ou le groupe, redemandés au serveur
  app.onRefresh(function (o) {
    var A = app.S.adult;
    if (!A || !o.adult || o.adult !== A.role) return null;
    var c = app.S.cache, tok = A.token;
    return MC.api.call(A.role === 'e' ? 'group' : 'family', { token: tok }, { silent: true }).then(function (r) {
      if (!app.S.adult || app.S.adult.token !== tok) return;
      c.league = null; c.kid = null;
      if (A.role === 'e') { c.group = r; app.lsSet('mc-group', { tok: tok, data: r }); }
      else { c.family = r; app.lsSet('mc-fam', { tok: tok, data: r }); }
      app.refreshNav();
    });
  });
  function famKid(fam) {
    var kids = fam.enfants;
    if (!parentSel || !kids.some(function (k) { return k.joueur.id === parentSel; })) parentSel = kids[0].joueur.id;
    return kids.filter(function (k) { return k.joueur.id === parentSel; })[0];
  }
  MC.famKid = famKid;
  // (v33) un lien d'une notification (…?k=<id>) : on regarde cet enfant-là, puis l'adresse redevient normale
  MC.parentPick = function (q) {
    if (!q || !q.k) return;
    parentSel = String(q.k);
    app.setUrl(location.hash.replace(/([?&])k=[^&]*(&|$)/, function (_, a, z) { return z ? a : ''; }));
  };
  // le numéro de version (celui des fichiers, ?v=…) : pour vérifier que l'appli est à jour
  function versionLine() { var l = document.querySelector('link[href*="style.css"]'), m = l && /v=(\d+)/.exec(l.getAttribute('href')); return m ? '<p class="small" style="margin:0;text-align:center;color:var(--dim)">Version ' + m[1] + '</p>' : ''; }
  function parentBar(fam, d, title) {
    var k = d.joueur, many = fam.enfants.length > 1;
    var who = (many ? '<button type="button" class="tb-switch" data-act="parentPick" aria-label="Enfant suivi : ' + esc(k.prenom) + '. Changer">' : '<span class="tb-switch" style="cursor:default">') +
      ui.avatar(k.prenom, k.couleur, 28) + '<span>' + esc(k.prenom) + '</span>' + (many ? icon('chevd', 16) + '</button>' : '</span>');
    return ui.topbar({ left: who, kicker: 'Espace parent', title: title, right: passBtn([k]), help: ui.helpLink('parent') });
  }
  MC.parentBar = parentBar;

  // ----- Passer le téléphone à son enfant -----
  // Un geste, en haut à droite de l'espace parent (et de l'espace éduc pour un éduc qui est aussi parent) :
  // l'espace adulte se referme (votre code est redemandé pour revenir) et l'appli passe côté joueur,
  // directement sur la semaine de l'enfant s'il est déjà connecté sur l'appareil, sinon sur son code secret.
  var passList = [];
  function passBtn(kids) {
    kids = (kids || []).filter(Boolean);
    if (!kids.length) return '';
    passList = kids.map(function (k) { return { id: k.id, prenom: k.prenom, couleur: k.couleur }; });
    var one = kids.length === 1;
    return '<button type="button" class="tb-pass" data-act="passKid" data-id="' + (one ? esc(kids[0].id) : '') + '" aria-label="' + (one ? 'Passer le téléphone à ' + esc(kids[0].prenom) : 'Passer le téléphone à un de mes enfants') + '">' +
      icon('play', 14) + '<span>' + (one ? esc(kids[0].prenom) : 'Enfant') + '</span></button>';
  }
  MC.passBtn = passBtn;
  // (25/10) son espace s'ouvre sans son code : le parent est déjà entré avec le code de la famille
  var passing = false;
  function passTo(k) {
    if (app.S.kid && app.S.kid.joueur && app.S.kid.joueur.id === k.id) { app.lockAdult(); app.go('#/semaine'); ui.toast('À toi ' + k.prenom + ' !'); return; }
    if (passing) return;
    passing = true;
    app.adultCall('ouvrirEnfant', { joueurId: k.id }).then(function (r) {
      passing = false;
      app.lockAdult();
      app.setKid({ token: r.token, joueur: r.joueur });
      if (r.me) app.setMe(r.me);
      if (r.joueur.mustChange) app.go('#/premiere');
      else { app.go('#/semaine'); ui.toast('À toi ' + k.prenom + ' !'); }
    }).catch(function (e) {
      passing = false;
      if (e.code === 'session') return;
      // serveur pas encore à jour (ou pas de réseau) : comme avant, l'enfant tape son code
      app.lockAdult();
      if (app.S.kid) app.setKid(null);
      app.go('#/connexion?k=' + encodeURIComponent(k.id));
    });
  }
  MC.act.passKid = function (b) {
    var id = b.getAttribute('data-id');
    var k = passList.filter(function (x) { return x.id === id; })[0];
    if (k) return passTo(k);
    ui.modal({
      title: 'Passer le téléphone à…',
      body: '<p class="small" style="margin:0">Son espace s\'ouvre directement, sans son code. Pour revenir ici, votre code vous sera redemandé.</p>',
      actions: passList.map(function (x, i) { return { label: icon('play', 16) + ' ' + esc(x.prenom), value: i + 1, cls: 'btn' }; }).concat([{ label: 'Annuler', value: 0, cls: 'btn2 grey' }])
    }).then(function (i) { if (i) passTo(passList[i - 1]); });
  };
  // les sous-onglets de Prépa côté parent : Sa semaine · Bilans · Classement
  function parentPrepaTabs(on) { return ui.subtabs('p:prepa', [['semaine', '#/parent', 'Sa semaine'], ['bilans', '#/parent/bilans', 'Bilans'], ['classement', '#/parent/classement', 'Classement']], on, '#38E8FF', 'Prépa'); }
  MC.parentPrepaTabs = parentPrepaTabs;
  MC.parentNoKid = function (fam) { return noKid(fam); };
  function noKid(fam) {
    return '<main class="screen">' + ui.topbar({ kicker: 'Espace parent', title: fam.famille.nom, help: ui.helpLink('parent') }) +
      '<div class="empty">Aucun enfant rattaché à ce code. Demandez à l\'éducateur.</div><button type="button" class="btn2 grey" data-act="adultLogout">Se déconnecter</button></main>';
  }
  MC.act.parentPick = function () {
    var fam = app.S.cache.family;
    if (!fam) return;
    var kids = fam.enfants;
    if (kids.length === 2) { parentSel = kids.filter(function (k) { return k.joueur.id !== parentSel; })[0].joueur.id; app.rerender(); return; }
    ui.modal({
      title: 'Quel enfant ?',
      body: '<div class="sec">' + kids.map(function (x, i) { return '<button type="button" class="li" data-pick="' + i + '" style="cursor:pointer">' + ui.avatar(x.joueur.prenom, x.joueur.couleur, 32) + '<span class="grow t1">' + esc(x.joueur.prenom) + '</span>' + (x.joueur.id === parentSel ? icon('check', 18, 'style="color:var(--cyan)"') : '') + '</button>'; }).join('') + '</div>',
      actions: [{ label: 'Fermer', value: null, cls: 'btn2 grey' }],
      onOpen: function (host, close) {
        host.addEventListener('click', function (e) {
          var b = e.target.closest('[data-pick]');
          if (b) { parentSel = kids[Number(b.getAttribute('data-pick'))].joueur.id; close(null); app.rerender(); }
        });
      }
    });
  };

  // ----- Suivi -----
  app.route('/parent', function (p, q, cur) {
    MC.parentPick(q);
    return loadFamily().then(function (fam) {
      app.refreshNav();
      if (!fam.enfants.length) return noKid(fam);
      if (MC.accueil && MC.accueil.needTour('f', fam.famille.id)) { setTimeout(function () { app.go('#/parent/bienvenue', true); }, 0); return null; }
      cur.after = function () { if (MC.news) setTimeout(function () { if (location.hash === '#/parent') MC.news.maybeShow('f', fam.famille.id); }, 350); };
      var d = famKid(fam), k = d.joueur, S = kidSummary(d, {});
      var others = fam.enfants.filter(function (x) { return x.joueur.id !== k.id && (x.records || []).some(function (r) { return r.statut === 'attente'; }); });
      var otherNote = others.map(function (x) {
        var n = x.records.filter(function (r) { return r.statut === 'attente'; }).length;
        return '<button type="button" class="note pink" data-act="parentSee" data-id="' + esc(x.joueur.id) + '" style="cursor:pointer;text-align:left">' + icon('check', 20) + '<span>' + esc(x.joueur.prenom) + ' a aussi ' + n + ' résultat' + (n > 1 ? 's' : '') + ' à confirmer. <b>Voir</b></span></button>';
      }).join('');
      // un +1 ou un mot d'éduc pas encore vu : une ligne verte, discrète, qui mène à Missions
      var nv = MC.missions ? MC.missions.nouveaux('f', d) : { enc: [] }, last = nv.enc[0], sk = MC.SK;
      var p1line = last ? '<a class="li p1line" href="#/parent/missions' + (last.missionId ? '/perso' : '/mots') + '"><b class="p1tag">' + (last.missionId ? '+1' : icon('heart', 14)) + '</b><span class="grow"><span class="t1" style="font-family:var(--f-body);letter-spacing:0;font-size:14px;font-weight:600">Dans Missions : ' +
        (last.missionId ? 'un encouragement de ' + esc(last.parNom) + (sk && sk.surQuoi(d, last) ? ' sur « ' + esc(sk.surQuoi(d, last)) + ' »' : '') : 'un mot de ' + esc(last.parNom)) + (nv.enc.length > 1 ? ' (et ' + (nv.enc.length - 1) + ' autre' + (nv.enc.length > 2 ? 's' : '') + ')' : '') + '</span></span>' + icon('right', 16) + '</a>' : '';
      var rdv = (fam.prochains || [])[0], rdvH = '';
      if (rdv) {
        var dj = String(rdv.debut).slice(0, 10), hh = '';
        if (rdv.source === 'spond') { var dt = new Date(rdv.debut); if (!isNaN(dt)) hh = (dt.getHours() < 10 ? '0' : '') + dt.getHours() + 'h' + (dt.getMinutes() ? (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes() : ''); }
        rdvH = '<div class="li rdv"><span class="cdate"><b>' + new Date(dj + 'T12:00:00').getDate() + '</b><small>' + esc(ui.fmtDate(dj).split(' ').slice(-1)[0]) + '</small></span><span class="grow"><span class="t1">Prochain rendez-vous · ' + esc(rdv.titre) + '</span><span class="t2">' + esc(ui.fmtDate(dj)) + (hh ? ' · ' + hh : '') + (rdv.lieu ? ' · ' + esc(rdv.lieu) : '') + (rdv.source === 'spond' ? ' · la présence se répond dans Spond' : '') + '</span></span></div>';
      }
      return '<main class="screen">' + parentBar(fam, d, 'Prépa') + parentPrepaTabs('semaine') +
        S.pending + otherNote + p1line +
        (MC.accueil ? MC.accueil.parentChecklist(fam) : '') +
        '<div class="head"><span class="kicker" style="color:var(--cyan)">' + esc(ui.fmtDate(L.today())) + '</span><h1 class="big md">' + esc(k.prenom) + '<br>cette semaine</h1></div>' +
        '<div class="cols2"><section class="sec"><div class="between"><h2 class="h2">Sa semaine</h2><span class="hud" style="color:var(--gold)">' + S.st.week.stars + ' / 6 étoiles</span></div>' + S.week + S.tiles + '</section>' +
        '<section class="sec"><h2 class="h2">Ses séances</h2><p class="small" style="margin:0">Touchez une séance pour le détail : exercices, séries, ressenti.</p>' + MC.suivi.seances(d.seances, { max: 4, bravos: d.bravos }) + rdvH + '</section></div>' +
        '</main>';
    });
  }, { adult: 'f', nav: 'p:prepa', bg: '#12333A' });
  MC.act.parentSee = function (b) { parentSel = b.getAttribute('data-id'); app.rerender(); window.scrollTo(0, 0); };

  // ----- Prépa › Bilans (bilans, records, niveaux) -----
  function parentBilans() {
    return loadFamily().then(function (fam) {
      app.refreshNav();
      if (!fam.enfants.length) return noKid(fam);
      var d = famKid(fam), k = d.joueur, S = kidSummary(d, { editLevels: true });
      return '<main class="screen">' + parentBar(fam, d, 'Prépa') + parentPrepaTabs('bilans') +
        '<div class="head"><span class="kicker" style="color:var(--cyan)">Bilans, records et niveaux</span><h1 class="big md">Les progrès<br>de ' + esc(k.prenom) + '</h1></div>' +
        '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">D\'un bilan à l\'autre</h2>' + S.prog + '</section>' +
        '<section class="sec"><h2 class="h2">Ses records confirmés</h2>' + S.recs + '</section></div>' +
        '<section class="sec"><h2 class="h2">Ses niveaux</h2><p class="small" style="margin:0">Ils viennent du bilan. ' + esc(k.prenom) + ' peut monter d\'un niveau après une séance « facile » (ou redescendre après une séance « dure »). Vous pouvez aussi les ajuster ici.</p>' + S.levels + '</section></div>' +
        '</main>';
    });
  }
  app.route('/parent/bilans', parentBilans, { adult: 'f', nav: 'p:prepa', bg: '#12333A' });
  app.route('/parent/progres', parentBilans, { adult: 'f', nav: 'p:prepa', bg: '#12333A' });

  // ----- Plus -----
  app.route('/parent/plus', function () {
    return loadFamily().then(function (fam) {
      app.refreshNav();
      if (!fam.enfants.length) return noKid(fam);
      var d = famKid(fam), k = d.joueur;
      function link(href, ic, t1, t2) { return '<a class="switch" href="' + href + '" style="text-decoration:none"><span class="row">' + icon(ic, 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">' + t1 + '</span>' + (t2 ? '<span class="t2" style="display:block">' + t2 + '</span>' : '') + '</span></span>' + icon('right', 16) + '</a>'; }
      return '<main class="screen">' + parentBar(fam, d, 'Plus') +
        '<div class="head"><span class="kicker" style="color:var(--green)">' + esc(fam.famille.nom) + '</span><h1 class="big md">Plus</h1></div>' +
        '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">' + esc(k.prenom) + '</h2>' +
        '<button type="button" class="switch" role="switch" aria-checked="' + !!k.visible + '" data-act="kidVisible" data-id="' + esc(k.id) + '"><span><span class="t1" style="display:block">Afficher ' + esc(k.prenom) + ' au classement</span><span class="t2" style="display:block">' + (k.visible ? 'Son prénom apparaît dans sa ligue' : 'Il voit son rang, les autres ne le voient pas') + '</span></span><span class="k"></span></button>' +
        '<button type="button" class="switch" data-act="kidCode" data-id="' + esc(k.id) + '" data-p="' + esc(k.prenom) + '"><span><span class="t1" style="display:block">Nouveau code secret pour ' + esc(k.prenom) + '</span><span class="t2" style="display:block">S\'il a oublié le sien</span></span>' + icon('right', 18) + '</button></section>' +
        '<section class="sec"><h2 class="h2">Cet appareil</h2>' + link('#/parent/notifs/reglages', 'bell', 'Mes notifications', 'Ce qui arrive dans la cloche, en haut de l\'écran') + sharedSwitch() +
        '<button type="button" class="switch" data-act="howInstall"><span class="row">' + icon('phone', 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">Mettre l\'appli sur l\'écran d\'accueil</span><span class="t2" style="display:block">Elle s\'ouvre alors comme une vraie appli</span></span></span>' + icon('right', 16) + '</button>' +
        '<button type="button" class="switch" data-act="passKid" data-id="' + esc(k.id) + '"><span class="row">' + icon('play', 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">Passer le téléphone à ' + esc(k.prenom) + '</span><span class="t2" style="display:block">Aussi en haut à droite (▶ ' + esc(k.prenom) + '). Pour revenir ici : votre code</span></span></span>' + icon('right', 16) + '</button>' +
        link(app.S.kid ? '#/semaine' : '#/connexion', 'user', 'Côté joueur', 'Tous les joueurs de cet appareil') + '</section></div>' +
        '<div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Aide</h2>' +
        link('#/parent/nouveautes', 'news', 'Les nouveautés', 'Ce qui a changé dans l\'appli') +
        link(ui.helpLink('parent'), 'info', 'Comment ça marche ?', 'Le guide pour les parents') +
        link('#/parent/bienvenue?revoir=1', 'play', 'Revoir la visite', 'Les 3 écrans du début') +
        '<div class="note">' + icon('heart', 20) + '<span><b>Le programme en bref.</b> Fait pour les 9-11 ans : poids du corps, pas de charge, 15 à 20 min. Une douleur qui revient (talon, genou) = pause des sauts et avis médical. Le vendredi reste un jour de repos.</span></div></section>' +
        '<a class="btn2 grey" href="#/adultes/code">' + icon('lock', 18) + ' Changer mon code parent</a>' +
        '<button type="button" class="btn2 grey" data-act="adultLogout">' + icon('logout', 18) + ' Se déconnecter</button>' + versionLine() + '</div></div></main>';
    });
  }, { adult: 'f', nav: 'p:plus', bg: '#12333A' });

  // ======================================================================
  // ÉDUC : 5 onglets (Vestiaire · Joueurs · Compos · Classement · Outils) ; Compos : voir v-compos.js
  // ======================================================================
  var edFilter = 'all', edQ = '';
  MC.loadGroup = function (force) { return loadGroup(force); };
  function loadGroup(force) {
    if (app.S.cache.group && !force) return Promise.resolve(app.S.cache.group);
    if (force) return app.adultCall('group').then(function (r) { app.S.cache.group = r; app.lsSet('mc-group', { tok: app.S.adult.token, data: r }); return r; });
    return app.swr('mc-group', 'group', {}, function (res) {
      app.S.cache.group = res;
      if (/^#\/educ/.test(location.hash) && !Object.keys(dec).length && !document.querySelector('.modal')) app.rerender();
      app.refreshNav();
    }).then(function (r) { app.S.cache.group = r; return r; });
  }
  MC.loadGroup = loadGroup;
  // après une modification : on oublie le groupe gardé (sinon on reverrait l'ancien état un instant)
  function dropGroup() { app.S.cache.group = null; app.lsSet('mc-group', null); }
  function educBar(g, title, back, backLabel) {
    if (back) return ui.topbar({ back: back, backLabel: backLabel, title: title, help: ui.helpLink('educ') });
    var right = passBtn(mesEnfants(g).map(function (p) { return p.joueur; })) + '<a class="cbtn grey" href="#/educ/reglages" aria-label="Réglages et gestion">' + icon('settings', 20) + '</a>';
    return ui.topbar({ kicker: 'Éduc · ' + g.moi.nom + (g.moi.admin ? ' · admin' : ''), title: title, right: right, help: ui.helpLink('educ') });
  }
  MC.educBar = educBar;
  // Progrès : Prépa physique · Skills · Missions
  function progresTabs(on) { return ui.subtabs('e:progres', [['prepa', '#/educ/progres', 'Prépa physique'], ['skills', '#/educ/skills', 'Skills'], ['missions', '#/educ/missions', 'Missions']], on, '#3DFFB0', 'Progrès'); }
  MC.progresTabs = progresTabs;
  // Enfants : Tous · À relancer · Niveaux et postes
  function enfantsTabs(on, g) {
    var G = g ? groupStats(g) : null;
    return ui.subtabs('e:enfants', [['all', '#/educ/joueurs', 'Tous' + (G ? ' · ' + G.players.length : '')], ['late', '#/educ/joueurs?filtre=late', 'À relancer' + (G ? ' · ' + G.late.length : '')], ['terrain', '#/educ/terrain', 'Niveaux et postes']], on, '#C9AEFF', 'Enfants');
  }
  MC.enfantsTabs = enfantsTabs;
  function mesEnfants(g) { return (g.moi.enfants || []).map(function (id) { return g.joueurs.filter(function (p) { return p.joueur.id === id; })[0]; }).filter(Boolean); }
  MC.mesEnfants = mesEnfants;
  function groupStats(g) {
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
    return { players: players, sessionsWeek: sessionsWeek, active: active, late: late, pending: pending, weekAgo: weekAgo, mon: mon, today: t };
  }

  // ----- Progrès › Prépa physique : les résultats de mon enfant à confirmer, ça bouge, le classement, les progrès aux bilans -----
  app.route('/educ/progres', function (p, q, cur) {
    return loadGroup().then(function (g) {
      app.refreshNav();
      if (MC.loadCompos) MC.loadCompos().then(function () { app.refreshNav(); }).catch(function () { });   // pastilles des onglets Entraîn. et Plateaux
      return paintVestiaire(g);
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#12333A' });

  // Les résultats à confirmer : seulement ceux de mes enfants (reliés à mon profil) ; les autres, c'est leur famille
  function aConfirmer(g, pending, pend) {
    var mine = (g.moi.enfants || []).map(function (id) { return g.joueurs.filter(function (p) { return p.joueur.id === id; })[0]; }).filter(Boolean);
    var noms = mine.map(function (p) { return p.joueur.prenom; }).join(', ');
    if (!mine.length) return '<h2 class="h2">Résultats à confirmer</h2><div class="note">' + icon('info', 20, 'style="color:var(--cyan);flex:none"') + '<span class="small">Ce sont les familles qui confirment les résultats de leur enfant (bilans et défis). Votre enfant est dans le groupe ? Reliez-le à votre profil : vous confirmerez les siens ici.</span></div>' +
      '<button type="button" class="btn2 grey" data-act="myKids">' + icon('user', 16) + ' Choisir mon enfant</button>';
    return '<div class="between"><h2 class="h2">À confirmer · ' + esc(noms) + '</h2><span class="hud" style="color:var(--pink)">' + pending.length + '</span></div>' +
      (pending.length ? '<p class="small" style="margin:0">Les résultats de ' + esc(noms) + ' : Confirmer ou Refuser (vous pouvez changer d\'avis), puis <b>Enregistrer</b> juste en dessous. Ceux des autres enfants, c\'est leur famille qui les confirme.</p><ul class="list">' + pend + '</ul>' +
        (pending.length > 1 ? '<button type="button" class="btn2 pink" data-act="decAll" data-ids="' + esc(pending.map(function (x) { return x.r.id; }).join(',')) + '">' + icon('check', 16) + ' Tout confirmer (' + pending.length + ')</button>' : '') + decBar() : '<div class="empty">Rien à confirmer pour ' + esc(noms) + '.</div>');
  }
  function paintVestiaire(g) {
    var G = groupStats(g), mineIds = g.moi.enfants || [], pending = G.pending.filter(function (x) { return mineIds.indexOf(x.p.joueur.id) >= 0; });
    var pend = pending.slice(0, 30).map(function (x) { return recLine(x.r, x.p.joueur.prenom, true); }).join('');
    // ce qui s'est passé ces derniers jours : séances et bilans envoyés
    var ev = [];
    G.players.forEach(function (p) {
      p.seances.forEach(function (s) { ev.push({ s: s, bravos: p.bravos || [], at: s.cree || s.date, id: p.joueur.id, p: p.joueur, t1: (C.JOURS[s.type] || {}).nomSeance || s.type, t2: ui.fmtDate(s.date) + ' · ' + (s.mode === 'guidee' ? 'séance guidée' : 'notée') + (s.ressenti ? ' · ' + ({ facile: 'facile', bien: 'pile bien', dur: 'dur' }[s.ressenti] || '') : ''), c: (C.JOURS[s.type] || {}).color || '#888' }); });
      var byB = {};
      p.records.forEach(function (r) { if (r.bilan === 'defi') { ev.push({ at: r.cree || r.date, id: p.joueur.id, p: p.joueur, t1: 'Défi · ' + testName(r), t2: ui.fmtDate(r.date), c: '#FFC23D' }); return; } var key = r.bilan + r.date; (byB[key] = byB[key] || []).push(r); });
      Object.keys(byB).forEach(function (key) { var l = byB[key]; ev.push({ at: l[0].cree || l[0].date, id: p.joueur.id, p: p.joueur, t1: 'Bilan ' + l[0].bilan + ' · ' + l.length + ' test' + (l.length > 1 ? 's' : ''), t2: ui.fmtDate(l[0].date), c: '#38E8FF' }); });
    });
    ev.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    // (v36) une séance : « 👏 Bravo » d'un toucher à droite (js/bravos.js), et les bravos déjà donnés dessous
    function feedLi(e) {
      var bt = e.s && MC.bravo ? MC.bravo.btn(g, e.id, e.s, { sm: true }) : '', vu = e.s ? MC.suivi.bravosDe(e.s, { bravos: e.bravos, moi: g.moi.id }) : '';
      var a = '<a class="li" href="#/educ/joueur/' + esc(e.id) + '"><span class="dia" style="--dc:' + e.c + '"></span><span class="grow"><span class="t1">' + esc(e.p.prenom) + ' · ' + esc(e.t1) + '</span><span class="t2">' + esc(e.t2) + '</span>' + vu + '</span>' + (bt ? '' : icon('right', 16)) + '</a>';
      return bt ? '<li class="bvrow">' + a + bt + '</li>' : '<li>' + a + '</li>';
    }
    var feed = ev.slice(0, 6).map(feedLi).join('');
    // la suite de la semaine (pour féliciter tout le monde), repliée
    var plus = ev.slice(6).filter(function (e) { return String(e.at).slice(0, 10) >= G.weekAgo; }).slice(0, 40);
    if (feed && plus.length) feed = '<ul class="list">' + feed + '</ul><details class="more"><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:44px;display:flex;align-items:center">Voir les ' + plus.length + ' autres des 7 derniers jours</summary><ul class="list" style="margin-top:6px">' + plus.map(feedLi).join('') + '</ul></details>';
    else if (feed) feed = '<ul class="list">' + feed + '</ul>';
    return '<main class="screen">' + educBar(g, 'Progrès') + progresTabs('prepa') +
      (MC.accueil ? MC.accueil.educChecklist(g) : '') +
      (MC.api.DEMO ? '<p class="small" style="margin:0;color:var(--yellow)">Mode démo : joueurs fictifs.</p>' : '') +
      '<div class="grid3"><div class="tile"><span class="v">' + G.sessionsWeek + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">séances cette semaine</span></div>' +
      '<div class="tile"><span class="v" style="color:var(--green)">' + G.active + '<small style="font-size:13px;color:var(--dim)"> / ' + G.players.length + '</small></span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">actifs sur 7 jours</span></div>' +
      '<a class="tile" href="#/educ/joueurs?filtre=late" style="text-decoration:none;border-color:rgba(255,138,61,.5);background:rgba(255,138,61,.08)"><span class="v" style="color:var(--orange)">' + G.late.length + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px;color:var(--soft)">à relancer ›</span></a></div>' +
      '<div class="cols2"><section class="sec">' + aConfirmer(g, pending, pend) + '</section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Ça bouge</h2><a class="lnk" href="#/educ/joueurs">Les enfants</a></div>' + (feed || '<div class="empty">Pas encore de séance notée.</div>') + '</section></div>' +
      '<div class="grid2"><a class="li" href="#/educ/classement">' + icon('podium', 20, 'style="color:var(--pink);flex:none"') + '<span class="grow"><span class="t1">Le classement</span><span class="t2">L\'arène, par ligue</span></span>' + icon('right', 16) + '</a>' +
      '<a class="li" href="#/educ/progres/bilans">' + icon('up', 20, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">Progrès aux bilans</span><span class="t2">Test par test</span></span>' + icon('right', 16) + '</a></div>' +
      '</main>';
  }

  // ----- Joueurs -----
  app.route('/educ/joueurs', function (p, q) {
    edFilter = q.filtre === 'late' ? 'late' : 'all';
    return loadGroup().then(function (g) { app.refreshNav(); return paintJoueurs(g); });
  }, { adult: 'e', nav: 'e:enfants', bg: '#2A1640' });
  function paintJoueurs(g) {
    var G = groupStats(g), t = G.today;
    var list = edFilter === 'late' ? G.late : G.players;
    var q = edQ.toLowerCase();
    list = list.filter(function (p) { return !q || p.joueur.prenom.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
    var mine = g.moi.enfants || [], NIVC = { A: '#FFC23D', B: '#38E8FF', C: '#3DFFB0' };
    var pnom = { pilier: 'Pilier', talonneur: 'Talonneur', 'troisieme-ligne': '3e ligne', 'demi-de-melee': 'Demi de mêlée', ouvreur: 'Ouvreur', centre: 'Centre', ailier: 'Ailier' };
    // mes enfants d'abord
    list.sort(function (a, b) { var am = mine.indexOf(a.joueur.id) >= 0, bm = mine.indexOf(b.joueur.id) >= 0; return am === bm ? 0 : am ? -1 : 1; });
    var rows = list.map(function (p) {
      var lastTxt = p._last ? (p._last > G.weekAgo ? 'Dernière séance : ' + ui.fmtDate(p._last) : 'Rien depuis ' + L.daysBetween(p._last, t) + ' jours') : (p.joueur.aUnCode ? 'Pas encore de séance' : 'Pas encore connecté');
      var att = p.records.filter(function (r) { return r.statut === 'attente'; }).length;
      var tr = p.terrain || {}, po = tr.postesOk && tr.postesOk[0] ? pnom[tr.postesOk[0]] : '';
      var mp = MC.SK ? MC.SK.missionPerso({ defmissions: (g.defmissions || []).filter(function (m) { return m.joueurId === p.joueur.id; }) }) : null;
      if (mp && mp.fin && mp.fin < t) mp = null;   // mission terminée par la date : plus « en cours »
      var n1 = mp ? (p.encouragements || []).filter(function (x) { return x.missionId === mp.id; }).length : 0;
      var info = [po, tr.passerelle ? 'passerelle vers ' + tr.passerelle : '', mp ? '★ ' + MC.SK.titreMission(mp) + (n1 ? ' · ' + n1 + ' encouragement' + (n1 > 1 ? 's' : '') : '') : ''].filter(Boolean).join(' · ');
      var isMine = mine.indexOf(p.joueur.id) >= 0;
      return '<li><a class="li" href="#/educ/joueur/' + esc(p.joueur.id) + '">' + (tr.niveau ? '<span class="cniv" style="--lc:' + NIVC[tr.niveau] + '" title="Niveau ' + tr.niveau + '">' + tr.niveau + '</span>' : '<span class="cniv none" title="Niveau à renseigner">?</span>') +
        '<span class="grow"><span class="t1">' + esc(p.joueur.prenom.toUpperCase()) + (isMine ? ' <span class="pill" style="--pc:var(--cyan)">Mon enfant</span>' : '') + (att && isMine ? ' <span class="nbi">' + att + '</span>' : '') + '</span>' +
        (info ? '<span class="t2">' + esc(info) + '</span>' : '') +
        '<span class="t2" style="color:' + (p._last && p._last > G.weekAgo ? 'var(--dim)' : 'var(--orange)') + '">' + esc(lastTxt) + '</span></span>' + icon('right', 16) + '</a></li>';
    }).join('');
    return '<main class="screen">' + educBar(g, 'Enfants · ' + G.players.length) + enfantsTabs(edFilter, g) +
      '<label class="sr-only" for="edq">Chercher un prénom</label><input id="edq" class="search" type="search" placeholder="Chercher un prénom…" value="' + esc(edQ) + '">' +
      (edFilter === 'late' ? '<p class="small" style="margin:0">Aucune séance notée depuis 7 jours, ou jamais connecté. Un petit mot à l\'entraînement suffit souvent !</p>' : '') +
      '<ul class="list" id="edlist">' + (rows || '<li class="empty">Personne.</li>') + '</ul>' +
      '<a class="btn2" href="#/educ/ajouter">' + icon('plus', 16) + ' Ajouter des enfants (depuis Spond)</a></main>';
  }
  MC.act.edFilter = function (b) { app.go(b.getAttribute('data-v') === 'late' ? '#/educ/joueurs?filtre=late' : '#/educ/joueurs'); };
  var edTimer = null;
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'edq') {
      edQ = e.target.value;
      clearTimeout(edTimer);
      edTimer = setTimeout(function () {
        var html = paintJoueurs(app.S.cache.group);
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        var nl = tmp.querySelector('#edlist'), ol = document.getElementById('edlist');
        if (nl && ol) ol.innerHTML = nl.innerHTML;
      }, 150);
    }
  });

  // ----- L'engrenage : réglages et gestion (mon enfant, les éducs, les familles et leurs codes, Spond, cet appareil, l'aide) -----
  app.route('/educ/outils', function () { app.go('#/educ/reglages', true); return null; }, { adult: 'e', nav: 'e:gear' });
  app.route('/educ/reglages', function () {
    return Promise.all([loadGroup(), MC.loadCompos ? MC.loadCompos().catch(function () { return null; }) : null]).then(function (res) {
      var g = res[0];
      app.refreshNav();
      function link(href, ic, t1, t2, tag) { return '<a class="switch" href="' + href + '" style="text-decoration:none"><span class="row">' + icon(ic, 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">' + t1 + (tag || '') + '</span>' + (t2 ? '<span class="t2" style="display:block">' + t2 + '</span>' : '') + '</span></span>' + icon('right', 16) + '</a>'; }
      var mine = mesEnfants(g), sp = app.S.cache.compos && app.S.cache.compos.spond;
      var sansCode = g.familles.filter(function (f) { return !g.joueurs.some(function (p) { return p.joueur.actif && p.joueur.familleId === f.id && p.joueur.aUnCode; }); }).length;
      var admin = ' <span class="pill" style="--pc:var(--violet)">admin</span>';
      return '<main class="screen">' + educBar(g, 'Réglages et gestion', '#/educ/entrainements', 'Entraînements') +
        '<div class="head"><span class="kicker" style="color:var(--violet)">Éduc · ' + esc(g.moi.nom) + (g.moi.admin ? ' · admin' : '') + '</span><h1 class="big md">Réglages</h1></div>' +
        '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Moi</h2>' +
        '<button type="button" class="switch" data-act="myKids"><span class="row">' + icon('user', 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">' + (mine.length > 1 ? 'Mes enfants' : 'Mon enfant') + '</span><span class="t2" style="display:block">' + (mine.length ? esc(mine.map(function (p) { return p.joueur.prenom; }).join(', ')) + ' · ses résultats à confirmer, dans Progrès' : 'Vous êtes aussi parent d\'un joueur ? Choisissez-le') + '</span></span></span>' + icon('right', 16) + '</button>' +
        mine.map(function (p) { return link('#/educ/joueur/' + esc(p.joueur.id), 'shield', 'La fiche de ' + esc(p.joueur.prenom), 'Terrain, Skills, missions, prépa, famille et codes'); }).join('') +
        (mine.length && passBtn(mine.map(function (p) { return p.joueur; })) ? mine.map(function (p) { return '<button type="button" class="switch" data-act="passKid" data-id="' + esc(p.joueur.id) + '"><span class="row">' + icon('play', 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">Passer le téléphone à ' + esc(p.joueur.prenom) + '</span><span class="t2" style="display:block">Aussi en haut à droite des onglets (▶ ' + esc(p.joueur.prenom) + '). Pour revenir : votre code</span></span></span>' + icon('right', 16) + '</button>'; }).join('') : '') +
        '<button type="button" class="switch" data-act="myCode"><span class="row">' + icon('lock', 20, 'style="color:var(--cyan);flex:none"') + '<span class="t1">Changer mon code</span></span>' + icon('right', 16) + '</button></section>' +
        '<section class="sec"><h2 class="h2">Le groupe</h2>' +
        (g.moi.admin ? link('#/educ/educs', 'group', 'Les éducs', 'Les codes des éducs', admin) : '') +
        link('#/educ/familles', 'key', 'Familles et codes', sansCode ? sansCode + ' famille' + (sansCode > 1 ? 's' : '') + ' sans enfant connecté' : 'Un nouveau code si une famille a perdu le sien') +
        link('#/educ/spond', 'refresh', 'Spond', !sp ? 'Les événements et les réponses des familles' : sp.branche ? 'Branché · les événements et les réponses des familles' : 'Pas encore branché', g.moi.admin ? admin : '') +
        link('#/educ/ajouter', 'plus', 'Ajouter des enfants', 'Depuis Spond, avec leurs codes') +
        '<p class="small" style="margin:0">Spond : le compte et le mot de passe se tapent ici, ils restent sur le serveur du club.</p></section></div>' +
        '<div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Cet appareil</h2>' + link('#/educ/notifs/reglages', 'bell', 'Mes notifications', 'Ce qui arrive dans la cloche : séances, bilans, missions, compos…') + sharedSwitch() +
        (MC.accueil && MC.accueil.mobile() && !MC.accueil.installee() ? '<button type="button" class="switch" data-act="howInstall" data-r="e"><span class="row">' + icon('phone', 20, 'style="color:var(--cyan);flex:none"') + '<span><span class="t1" style="display:block">Mettre l\'appli sur l\'écran d\'accueil</span><span class="t2" style="display:block">Elle s\'ouvre d\'un geste, comme une vraie appli</span></span></span>' + icon('right', 16) + '</button>' : '') +
        link(app.S.kid ? '#/semaine' : '#/connexion', 'user', 'Côté joueur', 'Voir l\'appli comme les enfants') + '</section>' +
        '<button type="button" class="btn2 grey" data-act="adultLogout">' + icon('logout', 18) + ' Se déconnecter</button>' +
        '<section class="sec"><h2 class="h2">Aide</h2>' +
        link(ui.helpLink('educ'), 'info', 'Comment ça marche ?', 'Le guide pour les éducs') +
        link('#/educ/nouveautes', 'news', 'Nouveautés', 'Ce qui a changé dans l\'appli') +
        link('#/educ/bienvenue?revoir=1', 'play', 'Revoir la visite', 'Les écrans du début') + '</section>' + versionLine() + '</div></div></main>';
    });
  }, { adult: 'e', nav: 'e:gear', bg: '#2A1640' });

  MC.act.myCode = function () { app.go('#/adultes/code'); };

  // ======================================================================
  // CLASSEMENT (onglet des parents et des éducs)
  // Parents : la ligue de leur enfant, comme il la voit. Éducs : tout le groupe, filtrable par niveau.
  // ======================================================================
  var arene = { test: C.TESTS[0].id, mode: 'best', lv: 0 };   // la 1re épreuve affichée
  // gardé 2 min : changer d'épreuve ou de ligue ne refait pas d'appel au serveur
  function loadLeague() {
    var c = app.S.cache;
    if (c.league && Date.now() - c.leagueAt < 120000) return Promise.resolve(c.league);
    return app.adultCall('league').then(function (r) { c.league = r; c.leagueAt = Date.now(); return r; });
  }
  function areneHead() {
    return '<div class="head"><span class="kicker" style="color:var(--pink)">Classement · M12</span><h1 class="big">L\'arène</h1></div>';
  }
  // (29/10) les épreuves reviennent à la ligne (plus de bande qui défile de côté) ; côté éduc, une épreuve à la fois (tout le groupe)
  function areneChips() {
    return '<div class="sec" style="gap:8px"><span class="lab">Épreuve</span><div class="rkchips" role="group" aria-label="Épreuve">' + C.TESTS.map(function (tt) {
      var on = tt.id === arene.test;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--pink)" aria-pressed="' + on + '" data-act="arTest" data-v="' + tt.id + '">' + esc(tt.court) + '</button>';
    }).join('') + '</div></div>' +
      '<div class="grid2"><button type="button" class="opt' + (arene.mode === 'best' ? ' on' : '') + '" aria-pressed="' + (arene.mode === 'best') + '" data-act="arMode" data-v="best">Meilleur score</button>' +
      '<button type="button" class="opt' + (arene.mode === 'prog' ? ' on' : '') + '" style="--oc:var(--green)" aria-pressed="' + (arene.mode === 'prog') + '" data-act="arMode" data-v="prog">Plus gros progrès</button></div>';
  }
  function areneRows(rows, t, mineIds, showLv) {
    var medal = ['#FFC23D', '#C7CEDF', '#E39A5B'];
    if (!rows.length) return '<div class="empty">' + (arene.mode === 'prog' ? 'Pas encore de progrès à comparer : il faut au moins 2 résultats confirmés.' : 'Personne n\'a encore de résultat confirmé sur cette épreuve ici.') + '</div>';
    return '<ol class="list">' + rows.map(function (r) {
      var mine = mineIds.indexOf(r.p.id) >= 0;
      var v = arene.mode === 'prog' ? (r.prog > 0 ? '+' : '') + ui.fmtVal(r.prog, t.unite, t.decimales) : ui.fmtVal(r.best, t.unite, t.decimales);
      return '<li class="li' + (mine ? ' me' : '') + '"><span class="rank" style="--rc:' + (r.rank <= 3 ? medal[r.rank - 1] : 'var(--dim)') + '">' + r.rank + '</span>' + ui.hexa(r.p.prenom, r.p.couleur) +
        '<span class="grow"><span class="t1">' + esc(r.p.prenom.toUpperCase()) + '</span>' + (showLv ? '<span class="t2">N' + r.lv + '</span>' : '') + '</span>' +
        '<span style="font:700 18px/1 var(--f-hud);color:' + (arene.mode === 'prog' ? 'var(--green)' : mine ? 'var(--cyan)' : 'var(--ink)') + '">' + v + '</span></li>';
    }).join('') + '</ol>';
  }
  // parent : comme l'enfant, toutes les épreuves d'abord (sa ligue sur chacune), puis on choisit celles à garder
  var pRank = { sel: [], mode: 'best' };
  app.route('/parent/classement', function () {
    return Promise.all([loadFamily(), loadLeague()]).then(function (res) {
      app.refreshNav();
      var fam = res[0], Lg = res[1];
      if (!fam.enfants.length) return noKid(fam);
      var d = famKid(fam), k = d.joueur;
      var R = MC.rankCards(Lg, { id: k.id, prenom: k.prenom, toi: false }, pRank.sel, pRank.mode);
      return '<main class="screen">' + parentBar(fam, d, 'Prépa') + parentPrepaTabs('classement') + areneHead() +
        '<section class="rkset"><p class="small" style="margin:0;color:var(--soft)">Sur chaque épreuve, ' + esc(k.prenom) + ' se mesure aux joueurs de son niveau (sa ligue).' + (k.visible ? '' : ' Il est masqué : les autres ne le voient pas.') + '</p>' +
        '<div class="sec" style="gap:8px"><span class="lab">Épreuves' + (pRank.sel.length ? ' · ' + pRank.sel.length + ' choisie' + (pRank.sel.length > 1 ? 's' : '') : ' · toutes') + '</span>' + MC.rankChips(pRank.sel, 'prTest') + '</div>' +
        '<div class="sec" style="gap:8px"><span class="lab">Classer par</span>' + MC.rankModeBtns(pRank.mode, 'prMode') + '</div></section>' +
        (!R.seen ? '<div class="note">' + icon('info', 20) + '<span>' + esc(k.prenom) + ' n\'apparaît pas encore : il faut un résultat de bilan ou de défi confirmé.</span></div>' : '') +
        R.html +
        '<button type="button" class="switch" role="switch" aria-checked="' + !!k.visible + '" data-act="kidVisible" data-id="' + esc(k.id) + '"><span><span class="t1" style="display:block">' + esc(k.prenom) + ' apparaît dans le classement des autres</span><span class="t2" style="display:block">' + (k.visible ? 'Son prénom apparaît dans sa ligue' : 'Il voit son rang, les autres ne le voient pas') + '</span></span><span class="k"></span></button>' +
        '<p class="small" style="margin:0">Seule la prépa physique compte ici (bilans et défis confirmés). Les missions et les Skills ne sont jamais classés.</p></main>';
    });
  }, { adult: 'f', nav: 'p:prepa', bg: '#2A1640' });
  MC.act.prTest = function (b) { pRank.sel = MC.rankToggle(pRank.sel, b.getAttribute('data-v')); app.rerender(); };
  MC.act.prMode = function (b) { pRank.mode = b.getAttribute('data-v'); app.rerender(); };
  app.route('/educ/classement', function () {
    return Promise.all([loadGroup(), loadLeague()]).then(function (res) {
      app.refreshNav();
      var g = res[0], Lg = res[1];
      var rk = L.ranking(Lg, arene.test, arene.mode, arene.lv, false), t = rk.test;
      var lvChips = '<div class="row" style="gap:6px;flex-wrap:wrap">' + [0, 1, 2, 3, 4].map(function (n) {
        var on = arene.lv === n, col = n ? C.NIVEAUX[n].color : 'var(--cyan)';
        return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + col + ';min-height:40px;padding:0 12px" aria-pressed="' + on + '" data-act="arLv" data-v="' + n + '">' + (n ? 'Ligue N' + n : 'Tout le groupe') + '</button>';
      }).join('') + '</div>';
      var hidden = g.joueurs.filter(function (p) { return p.joueur.actif && !p.joueur.visible; }).length;
      return '<main class="screen">' + educBar(g, 'Classement', '#/educ/progres', 'Prépa physique') + areneHead() +
        '<p class="small" style="margin:0">Les enfants voient la ligue de leur niveau. Ici, tout le groupe, ou une ligue à la fois.' + (hidden ? ' ' + hidden + ' joueur' + (hidden > 1 ? 's' : '') + ' masqué' + (hidden > 1 ? 's' : '') + ' (choix des parents ou compte de test) n\'apparai' + (hidden > 1 ? 'ssent' : 't') + ' pas.' : '') + '</p>' +
        lvChips + areneChips() + '<div class="between"><h2 class="h2">' + esc(t.nom) + '</h2><span class="small">' + rk.rows.length + ' joueur' + (rk.rows.length > 1 ? 's' : '') + '</span></div>' +
        areneRows(rk.rows, t, (g.moi.enfants || []), true) + (function () {
          var inRk = {}; rk.rows.forEach(function (r) { inRk[r.p.id] = 1; });
          var cle = t.cle, rest = Lg.joueurs.filter(function (p) { return !inRk[p.id] && (!arene.lv || ((p.niveaux && p.niveaux[cle]) || 1) === arene.lv); });
          return rest.length ? '<p class="small" style="margin:0"><b>Pas encore classés</b> (pas de résultat confirmé' + (arene.mode === 'prog' ? ', ou un seul' : '') + ') : ' + esc(rest.map(function (p) { return p.prenom; }).sort(function (a, b) { return a.localeCompare(b, 'fr'); }).join(', ')) + '.</p>' : '';
        })() +
        (t.sm ? '<p class="small" style="margin:0">Les résultats « mini matériel » (SM) ont leur propre classement chez les enfants concernés.</p>' : '') + '</main>';
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#2A1640' });
  MC.act.arTest = function (b) { arene.test = b.getAttribute('data-v'); app.rerender(); };
  MC.act.arMode = function (b) { arene.mode = b.getAttribute('data-v'); app.rerender(); };
  MC.act.arLv = function (b) { arene.lv = Number(b.getAttribute('data-v')); app.rerender(); };

  // ---------- ÉDUC : progrès du groupe aux bilans ----------
  var progTest = 'pompes';
  app.route('/educ/progres/bilans', function () {
    return loadGroup().then(function (g) {
      var chips = C.TESTS.map(function (t) {
        return '<button type="button" class="opt' + (t.id === progTest ? ' on' : '') + '" aria-pressed="' + (t.id === progTest) + '" data-act="progTest" data-v="' + t.id + '">' + esc(t.court) + '</button>';
      }).join('');
      var t = C.TESTS.filter(function (x) { return x.id === progTest; })[0];
      return '<main class="screen">' + educBar(g, 'Progrès aux bilans', '#/educ/progres', 'Prépa physique') +
        '<div class="head"><span class="kicker">Bilans de la saison</span><h1 class="big sm">Progrès du groupe</h1><p class="lead" style="margin:0">Choisissez un test : les joueurs qui ont le plus progressé depuis leur bilan d\'avant sont en haut.</p></div>' +
        '<div class="testchips">' + chips + '</div>' +
        '<section class="sec"><div class="between"><h2 class="h2">' + esc(t.nom) + '</h2>' + (t.moinsMieux ? '<span class="small">plus petit = mieux</span>' : '') + '</div>' + MC.suivi.groupe(g.joueurs, progTest) + '</section></main>';
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#16223F' });
  MC.act.progTest = function (b) { progTest = b.getAttribute('data-v'); app.rerender(); };

  // ---------- ÉDUC : un joueur ----------
  app.route('/educ/joueur/:id', function (p, q, cur) {
    var tab = q.t || app.lsGet('mc-ftab') || 'terrain';
    if (q.t) app.lsSet('mc-ftab', q.t);
    // (retouche UI-13) l'onglet ouvert reste entièrement visible dans la bande qui défile
    if (cur) cur.after = function (root) {
      var nav = root.querySelector('.ftabs'), on = nav && nav.querySelector('a.on');
      if (!on || nav.scrollWidth <= nav.clientWidth) return;
      var a = nav.getBoundingClientRect(), b = on.getBoundingClientRect();
      if (b.right > a.right - 8) nav.scrollLeft += b.right - a.right + 16; else if (b.left < a.left + 8) nav.scrollLeft -= a.left - b.left + 16;
    };
    return Promise.all([loadGroup(), MC.loadCompos ? MC.loadCompos().catch(function () { return null; }) : null]).then(function (res) {
      var g = res[0], c = app.S.cache.kid;
      if (c && c.joueur.id === p.id) return paintKid(c, g, tab);
      var quick = g.joueurs.filter(function (x) { return x.joueur.id === p.id; })[0];
      var full = MC.api.call('kid', { token: app.S.adult.token, joueurId: p.id }, { silent: !!quick }).then(function (d) { app.S.cache.kid = d; return d; });
      if (quick) {
        full.then(function () { if (location.hash.indexOf('#/educ/joueur/' + p.id) === 0) app.rerender(); }).catch(function () { });
        return paintKid(quick, g, tab);
      }
      return full.then(function (d) { return paintKid(d, g, tab); });
    });
  }, { adult: 'e', nav: 'e:enfants', bg: '#16223F' });
  // les Skills, +1 et missions d'un enfant viennent du groupe gardé en mémoire (mis à jour à chaque geste des éducs)
  function dossierGroupe(g, d) {
    var gp = g.joueurs.filter(function (x) { return x.joueur.id === d.joueur.id; })[0] || {};
    var o = {}; for (var k in d) o[k] = d[k];
    o.etoiles = gp.etoiles || d.etoiles || [];
    o.encouragements = gp.encouragements || d.encouragements || [];
    o.bravos = gp.bravos || d.bravos || [];
    o.missions = gp.missions || d.missions || [];
    o.demandes = gp.demandes || d.demandes || [];
    o.defmissions = (g.defmissions || []).filter(function (m) { return m.sorte !== 'etoile' || m.joueurId === d.joueur.id; });
    return o;
  }
  MC.dossierGroupe = dossierGroupe;
  var FTABS = [['terrain', 'Terrain'], ['skills', 'Skills'], ['missions', 'Missions'], ['prepa', 'Prépa'], ['hist', 'Historique'], ['famille', 'Famille']];
  function paintKid(d0, g, tab) {
    var d = dossierGroupe(g, d0), k = d.joueur;
    if (!FTABS.some(function (t) { return t[0] === tab; })) tab = 'terrain';
    var fam = g.familles.filter(function (f) { return f.id === k.familleId; })[0];
    var mine = (g.moi.enfants || []).indexOf(k.id) >= 0;
    var gp = g.joueurs.filter(function (x) { return x.joueur.id === k.id; })[0] || {}, tr = gp.terrain || {};
    var NIVN = { A: 'Confirmé', B: 'Débrouillé', C: 'Débutant' }, NIVC = { A: '#FFC23D', B: '#38E8FF', C: '#3DFFB0' };
    var pnom = { pilier: 'pilier', talonneur: 'talonneur', 'troisieme-ligne': '3e ligne', 'demi-de-melee': 'demi de mêlée', ouvreur: 'ouvreur', centre: 'centre', ailier: 'ailier' };
    var resume = [tr.niveau ? NIVN[tr.niveau] : 'niveau à renseigner', tr.postesOk && tr.postesOk[0] ? pnom[tr.postesOk[0]] : '', tr.passerelle ? 'passerelle vers ' + tr.passerelle : ''].filter(Boolean).join(' · ');
    var head = '<div class="fhead">' + (tr.niveau ? '<span class="cniv big" style="--lc:' + NIVC[tr.niveau] + '">' + tr.niveau + '</span>' : '<span class="cniv none big">?</span>') +
      '<div class="grow"><h1 class="big sm" style="margin:0">' + esc(k.prenom) + (mine ? ' <span class="pill" style="--pc:var(--cyan);vertical-align:8px">Mon enfant</span>' : '') + '</h1><span class="small" style="color:var(--soft)">' + esc(resume) + (k.actif ? '' : ' · <b style="color:var(--orange)">désactivé</b>') + '</span></div></div>';
    var tabs = '<nav class="ftabs" aria-label="La fiche de ' + esc(k.prenom) + '">' + FTABS.map(function (t) {
      var on = t[0] === tab;
      return '<a href="#/educ/joueur/' + esc(k.id) + '?t=' + t[0] + '"' + (on ? ' class="on" aria-current="page"' : '') + '>' + t[1] + '</a>';
    }).join('') + '</nav>';
    var body = '';
    if (tab === 'terrain') body = (MC.terrainKid ? MC.terrainKid(d, g, 'fiche') : '') + (MC.missionKid ? MC.missionKid(d, g) : '');
    else if (tab === 'skills') body = MC.ficheSkills ? MC.ficheSkills(d, g) : '';
    else if (tab === 'missions') body = MC.ficheMissions ? MC.ficheMissions(d, g) : '';
    else if (tab === 'hist') body = MC.terrainKid ? MC.terrainKid(d, g, 'hist') : '';
    else if (tab === 'prepa') {
      var S = kidSummary(d, { editLevels: true });
      body = S.pending + S.tiles +
        '<div class="cols2"><div class="sec" style="gap:20px"><section class="sec"><div class="between"><h2 class="h2">Cette semaine</h2><span class="hud" style="color:var(--gold)">' + S.st.week.stars + ' / 6</span></div>' + S.week + '</section>' +
        '<section class="sec"><h2 class="h2">Séances</h2>' + (d.seances && d.seances.length && !d.seances.some(function (x) { return x.details; }) ? '<p class="small" style="margin:0">Chargement du détail…</p>' : '') +
        (MC.bravo ? MC.suivi.seances(d.seances, MC.bravo.opts(g, k.id)) : S.hist) + '</section></div>' +
        '<div class="sec" style="gap:20px"><section class="sec"><h2 class="h2">Progression aux bilans</h2>' + S.prog + '</section>' +
        '<section class="sec"><h2 class="h2">Records confirmés</h2>' + S.recs + '</section>' +
        '<section class="sec"><h2 class="h2">Niveaux</h2>' + S.levels + '</section></div></div>';
    } else if (tab === 'famille') {
      body = '<section class="sec"><h2 class="h2">Famille</h2><p class="small" style="margin:0">' + esc(fam ? fam.nom : 'Sans famille') + '. Le code parent se refait dans Réglages › Familles et codes.</p>' +
        '<label class="lab" for="kfam">Changer de famille</label><select id="kfam" class="txt" data-act-change="kidFamily" data-id="' + esc(k.id) + '">' + g.familles.map(function (f) { return '<option value="' + esc(f.id) + '"' + (f.id === k.familleId ? ' selected' : '') + '>' + esc(f.nom) + '</option>'; }).join('') + '</select></section>' +
        '<section class="sec"><h2 class="h2">Son compte</h2>' +
        '<button type="button" class="switch" data-act="kidCode" data-id="' + esc(k.id) + '" data-p="' + esc(k.prenom) + '"><span><span class="t1" style="display:block">' + (k.aUnCode ? 'Nouveau code provisoire' : 'Code provisoire (1re connexion)') + '</span><span class="t2" style="display:block">Pour un code oublié ou une 1re connexion</span></span>' + icon('right', 18) + '</button>' +
        '<button type="button" class="switch" role="switch" aria-checked="' + !!k.visible + '" data-act="kidVisible" data-id="' + esc(k.id) + '"><span><span class="t1" style="display:block">Visible au classement</span><span class="t2" style="display:block">Les parents peuvent aussi le régler</span></span><span class="k"></span></button>' +
        '<button type="button" class="btn2 ' + (k.actif ? 'grey' : '') + '" data-act="kidActive" data-id="' + esc(k.id) + '" data-on="' + (k.actif ? 0 : 1) + '">' + (k.actif ? 'Désactiver (a quitté le groupe)' : 'Réactiver') + '</button></section>';
    }
    return '<main class="screen">' + educBar(g, (mine ? 'Mon enfant · ' : '') + k.prenom, '#/educ/joueurs', 'Enfants') + head + tabs + body + '</main>';
  }
  MC.act.myKids = function () {
    var g = app.S.cache.group;
    if (!g) return;
    var sel = (g.moi.enfants || []).slice();
    var list = g.joueurs.filter(function (p) { return p.joueur.actif; }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); });
    ui.modal({
      title: 'Mon enfant',
      body: '<p class="small">Touchez votre enfant (ou vos enfants). Son bouclier apparaît en haut de votre espace : un geste pour retrouver tout son suivi.</p><div class="kidpick">' + list.map(function (p) {
        var on = sel.indexOf(p.joueur.id) >= 0;
        return '<button type="button" class="opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-kidpick="' + esc(p.joueur.id) + '">' + esc(p.joueur.prenom) + '</button>';
      }).join('') + '</div>',
      actions: [{ label: 'Enregistrer', value: 'ok', cls: 'btn' }, { label: 'Annuler', value: null, cls: 'btn2 grey' }],
      onOpen: function (host) {
        host.addEventListener('click', function (e) {
          var b = e.target.closest('[data-kidpick]');
          if (!b) return;
          var id = b.getAttribute('data-kidpick'), i = sel.indexOf(id);
          if (i >= 0) sel.splice(i, 1); else sel.push(id);
          b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', String(i < 0));
        });
      }
    }).then(function (v) {
      if (v !== 'ok') return;
      app.adultCall('mesEnfants', { ids: sel }).then(function (r) {
        g.moi.enfants = r.enfants;
        app.lsSet('mc-group', { tok: app.S.adult.token, data: g });
        ui.toast(r.enfants.length ? 'C\'est noté' : 'Plus d\'enfant choisi');
        app.rerender();
      }).catch(function (e) { ui.toast(e.message, true); });
    });
  };

  // ---------- niveaux : on passe en mode « modifier », on choisit, puis on enregistre ----------
  var lvDraft = null;
  MC.act.lvEdit = function (b) { lvDraft = { id: b.getAttribute('data-id'), niv: {} }; app.rerender(); };
  MC.act.lvCancel = function () { lvDraft = null; app.rerender(); };
  MC.act.lvPick = function (b) { if (!lvDraft) return; lvDraft.niv[b.getAttribute('data-cle')] = Number(b.getAttribute('data-v')); app.rerender(); };
  MC.act.lvSave = function (b) {
    if (!lvDraft) return;
    var id = lvDraft.id, nv = lvDraft.niv;
    if (!Object.keys(nv).length) { lvDraft = null; app.rerender(); return; }
    b.disabled = true;
    app.adultCall('setNiveaux', { joueurId: id, niveaux: nv }).catch(function (e) {
      // serveur pas encore à jour : l'éduc passe par l'ancienne action
      if (e.code === 'invalide' && app.S.adult.role === 'e') return app.adultCall('updatePlayer', { joueurId: id, niveaux: nv });
      throw e;
    }).then(function () {
      patchKid(id, function (j) { j.niveaux = j.niveaux || {}; for (var c in nv) j.niveaux[c] = nv[c]; });
      lvDraft = null;
      ui.toast('Niveaux enregistrés'); app.rerender();
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  document.addEventListener('hashchange', function () { lvDraft = null; });
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
  // les enfants de Spond (catégories suivies) pas encore reliés à un joueur de l'appli
  function spondAAjouter() {
    var sp = app.S.cache.compos && app.S.cache.compos.spond;
    return ((sp && sp.membres) || []).filter(function (m) { return !m.lie; });
  }
  function spondListe(g) {
    var l = spondAAjouter();
    if (!l.length) return '';
    return '<section class="sec"><div class="between"><h2 class="h2">Depuis Spond (' + l.length + ')</h2>' + (l.length > 1 ? '<button type="button" class="btn2 sm" data-act="spAddAll">' + icon('plus', 16) + ' Tout ajouter</button>' : '') + '</div>' +
      '<p class="small" style="margin:0">Inscrits dans Spond, pas encore dans l\'appli. Ajoutés d\'un geste : prénom et famille repris de Spond, reliés à Spond tout de suite, codes créés.</p>' +
      '<ul class="list">' + l.map(function (m) {
        return '<li class="li"><span class="grow"><span class="t1">' + esc(m.prenom || m.nom) + (m.nomFamille ? ' ' + esc(m.nomFamille) : '') + '</span><span class="t2">' + esc(m.categorie || 'Spond') + '</span></span>' +
          '<button type="button" class="btn2 sm" data-act="spAdd" data-id="' + esc(m.id) + '">' + icon('plus', 16) + ' Ajouter</button></li>';
      }).join('') + '</ul></section>';
  }
  // prénom de l'appli (avec l'initiale du nom si le prénom est déjà pris) et famille (« Famille Nom » si elle existe déjà : frère, sœur)
  function spondParams(g, m) {
    var prenom = String(m.prenom || m.nom || '').trim(), ini = String(m.nomFamille || '').trim().charAt(0).toUpperCase();
    var pris = g.joueurs.some(function (p) { return p.joueur.actif && p.joueur.prenom.toLowerCase() === prenom.toLowerCase(); });
    var p = { prenom: (pris && ini ? prenom + ' ' + ini + '.' : prenom).slice(0, 24), spondId: m.id };
    var nomFam = m.nomFamille ? 'Famille ' + m.nomFamille : '';
    var fam = nomFam && g.familles.filter(function (f) { return f.nom.toLowerCase() === nomFam.toLowerCase(); })[0];
    if (fam) p.familleId = fam.id; else p.familleNom = nomFam;
    return p;
  }
  function apresSpond() { dropGroup(); return Promise.all([loadGroup(true), MC.loadCompos ? MC.loadCompos(true) : null]).then(function () { app.rerender(); }); }
  MC.act.spAdd = function (b) {
    var m = spondAAjouter().filter(function (x) { return x.id === b.getAttribute('data-id'); })[0], g = app.S.cache.group;
    if (!m || !g) return;
    b.disabled = true;
    app.adultCall('addPlayer', spondParams(g, m)).then(function (r) {
      var lines = ['Code provisoire de ' + esc(r.joueur.prenom) + ' (1re connexion, 45 jours) : il choisira ensuite son propre code.', 'Relié à Spond : ses réponses arrivent toutes seules.'];
      var text = 'Mode champion M12 · Bienvenue ' + r.joueur.prenom + ' ! Site : ' + siteUrl() + ' — touche ton prénom et tape ton code provisoire : ' + r.code + '.';
      if (r.familleCode) { lines.push('Code parent provisoire de « ' + esc(r.famille.nom) + ' » : <b style="color:var(--cyan);font-family:var(--f-hud);letter-spacing:.1em">' + r.familleCode + '</b> (Adultes › Je suis parent › le prénom de l\'enfant ; 30 jours, puis le parent choisit le sien).'); text += ' Code parent provisoire (Adultes › Je suis parent › ' + r.joueur.prenom + ') : ' + r.familleCode + '.'; }
      else lines.push('Famille « ' + esc(r.famille.nom) + ' » : même code parent que ses frères et sœurs.');
      return showCode(esc(r.joueur.prenom) + ' est ajouté !', r.code, lines, text);
    }).then(apresSpond).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.spAddAll = function (b) {
    var l = spondAAjouter(), g = app.S.cache.group, faits = [];
    if (!l.length || !g) return;
    b.disabled = true;
    // un par un : chaque enfant ajouté compte pour le suivant (prénom déjà pris, famille déjà créée)
    l.reduce(function (pr, m) {
      return pr.then(function () {
        return app.adultCall('addPlayer', spondParams(g, m)).then(function (r) {
          faits.push(r);
          g.joueurs.push({ joueur: r.joueur }); if (r.familleCode) g.familles.push({ id: r.famille.id, nom: r.famille.nom });
        });
      });
    }, Promise.resolve()).then(function () {
      var text = 'Mode champion M12 · ' + siteUrl() + ' — codes provisoires (1re connexion) :\n' + faits.map(function (r) { return r.joueur.prenom + ' : ' + r.code + (r.familleCode ? ' · code parent (' + r.famille.nom + ') : ' + r.familleCode : ''); }).join('\n');
      return ui.modal({
        title: faits.length + ' joueur' + (faits.length > 1 ? 's' : '') + ' ajouté' + (faits.length > 1 ? 's' : ''),
        body: '<p class="small" style="margin:0">Notez ou partagez ces codes : ils ne seront plus affichés.</p><ul class="list" style="gap:6px">' + faits.map(function (r) {
          return '<li class="li"><span class="grow"><span class="t1">' + esc(r.joueur.prenom) + '</span><span class="t2">' + (r.familleCode ? 'Code parent (' + esc(r.famille.nom) + ') : <b style="color:var(--cyan)">' + r.familleCode + '</b>' : esc(r.famille.nom)) + '</span></span><b style="font:700 18px/1 var(--f-hud);letter-spacing:.12em">' + esc(r.code) + '</b></li>';
        }).join('') + '</ul>',
        actions: [{ label: icon('copy', 18) + ' Copier / partager', cls: 'btn', onClick: function () { shareCode(text); } }, { label: 'Fermer', value: true, cls: 'btn2 grey' }]
      });
    }).then(apresSpond).catch(function (e) { b.disabled = false; ui.toast(e.message + (faits.length ? ' (' + faits.length + ' déjà ajouté' + (faits.length > 1 ? 's' : '') + ')' : ''), true); apresSpond(); });
  };
  app.route('/educ/ajouter', function () {
    return Promise.all([loadGroup(), MC.loadCompos ? MC.loadCompos().catch(function () { return null; }) : null]).then(function (res) {
      var g = res[0];
      var fams = g.familles.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      return '<main class="screen">' + educBar(g, 'Ajouter des enfants', '#/educ/joueurs', 'Enfants') +
        '<div class="head"><span class="kicker">Nouveau joueur</span><h1 class="big md">Ajouter<br>un joueur</h1><p class="lead">Le site crée un code provisoire pour l\'enfant (valable 45 jours, pour sa 1re connexion) et, si c\'est une nouvelle famille, un code parent.</p></div>' +
        spondListe(g) +
        '<div class="sec"><label class="lab" for="ap">Prénom (ajoutez l\'initiale du nom si deux enfants ont le même prénom)</label><input id="ap" class="txt" maxlength="24" autocomplete="off" data-add="prenom" value="' + esc(add.prenom) + '">' +
        '<label class="lab" for="af">Famille</label><select id="af" class="txt" data-add="fam"><option value="new"' + (add.fam === 'new' ? ' selected' : '') + '>Nouvelle famille…</option>' + fams.map(function (f) { return '<option value="' + esc(f.id) + '"' + (add.fam === f.id ? ' selected' : '') + '>' + esc(f.nom) + ' (frère, sœur…)</option>'; }).join('') + '</select>' +
        (add.fam === 'new' ? '<label class="lab" for="an">Nom de la famille (facultatif)</label><input id="an" class="txt" maxlength="40" placeholder="ex. Famille Martin" data-add="famNom" value="' + esc(add.famNom) + '">' : '') + '</div>' +
        '<button type="button" class="btn xl" data-act="addPlayer">' + icon('plus', 20) + ' Créer le joueur</button></main>';
    });
  }, { adult: 'e', nav: 'e:enfants', bg: '#16223F' });
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
      if (r.familleCode) { lines.push('Code parent provisoire de « ' + esc(r.famille.nom) + ' » : <b style="color:var(--cyan);font-family:var(--f-hud);letter-spacing:.1em">' + r.familleCode + '</b> (Adultes › Je suis parent › le prénom de l\'enfant ; 30 jours, puis le parent choisit le sien).'); text += ' Code parent provisoire (Adultes › Je suis parent › ' + r.joueur.prenom + ') : ' + r.familleCode + '.'; }
      return showCode(esc(r.joueur.prenom) + ' est ajouté !', r.code, lines, text);
    }).then(function () { app.go('#/educ/joueurs'); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- ÉDUC : familles ----------
  app.route('/educ/familles', function () {
    return loadGroup(true).then(function (g) {
      var byFam = {};
      g.joueurs.forEach(function (p) { if (p.joueur.actif) (byFam[p.joueur.familleId] = byFam[p.joueur.familleId] || []).push(p.joueur.prenom); });
      var fams = g.familles.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      return '<main class="screen">' + educBar(g, 'Familles et codes', '#/educ/reglages', 'Réglages') +
        '<div class="head"><span class="kicker">Codes parents</span><h1 class="big md">Familles</h1><p class="lead">Un code par famille, pour tous ses enfants. Par sécurité, les codes ne sont jamais réaffichés : en cas d\'oubli, créez-en un nouveau (l\'ancien ne marche plus).</p></div>' +
        '<ul class="list">' + fams.map(function (f) {
          return '<li class="li"><span class="grow"><span class="t1">' + esc(f.nom) + '</span><span class="t2">' + esc((byFam[f.id] || []).join(', ') || 'aucun enfant actif') + '</span></span><button type="button" class="btn2 sm" data-act="famCode" data-id="' + esc(f.id) + '" data-n="' + esc(f.nom) + '">' + icon('key', 16) + ' Nouveau code</button></li>';
        }).join('') + '</ul></main>';
    });
  }, { adult: 'e', nav: 'e:outils', bg: '#16223F' });
  MC.act.famCode = function (b) {
    var nom = b.getAttribute('data-n');
    ui.modal({ title: 'Nouveau code parent ?', body: '<p class="lead">L\'ancien code de « ' + esc(nom) + ' » ne marchera plus. Le nouveau est provisoire : le parent choisira le sien.</p>', actions: [{ label: 'Créer le code', value: true, cls: 'btn' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('resetFamilyCode', { familleId: b.getAttribute('data-id') }).then(function (r) {
        showCode('Code parent provisoire', r.code, ['Pour « ' + esc(r.famille.nom) + ' » : Adultes › Je suis parent › le prénom de l\'enfant, puis ce code.', 'Valable 30 jours : à la 1re connexion, le parent choisit son propre code.'], 'Mode champion M12 · ' + r.famille.nom + ' : votre code parent provisoire est ' + r.code + ' (' + siteUrl() + ' › Adultes › Je suis parent › le prénom de votre enfant). Vous choisirez ensuite votre propre code.');
      }).catch(function (e) { ui.toast(e.message, true); });
    });
  };

  // ---------- ADMIN : les éducs ----------
  var newEduc = '';
  app.route('/educ/educs', function () {
    return Promise.all([app.adultCall('listEducs'), loadGroup()]).then(function (res) {
      var r = res[0];
      return '<main class="screen">' + educBar(res[1], 'Les éducs', '#/educ/reglages', 'Réglages') +
        '<div class="head"><span class="kicker">Administration</span><h1 class="big md">Les éducs</h1></div>' +
        '<ul class="list">' + r.educs.map(function (e) {
          return '<li class="li" style="flex-wrap:wrap"><span class="grow"><span class="t1">' + esc(e.nom) + (e.admin ? ' · ADMIN' : '') + '</span><span class="t2">' + (e.actif ? 'actif' : 'désactivé') + '</span></span>' +
            '<button type="button" class="btn2 sm" data-act="educCode" data-id="' + esc(e.id) + '">' + icon('key', 16) + ' Code</button>' +
            (e.id !== app.S.cache.group.moi.id ? '<button type="button" class="btn2 sm grey" data-act="educActive" data-id="' + esc(e.id) + '" data-on="' + (e.actif ? 0 : 1) + '">' + (e.actif ? 'Désactiver' : 'Réactiver') + '</button>' : '') + '</li>';
        }).join('') + '</ul>' +
        '<section class="sec"><h2 class="h2">Ajouter un éduc</h2><label class="lab" for="ne">Nom</label><input id="ne" class="txt" maxlength="30" data-newedu value="' + esc(newEduc) + '">' +
        '<button type="button" class="btn" data-act="addEduc">' + icon('plus', 18) + ' Créer son code</button></section></main>';
    });
  }, { adult: 'e', nav: 'e:outils', bg: '#16223F' });
  document.addEventListener('input', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-newedu')) newEduc = e.target.value; });
  MC.act.addEduc = function (b) {
    if (!newEduc.trim()) return ui.toast('Il faut un nom.', true);
    b.disabled = true;
    app.adultCall('addEduc', { nom: newEduc }).then(function (r) {
      newEduc = '';
      return showCode('Code provisoire de ' + esc(r.educ.nom), r.code, ['Adultes › Je suis éduc › son nom, puis ce code (30 jours).', 'À la 1re connexion, il choisit son propre code.'], 'Mode champion M12 · ton code éduc provisoire : ' + r.code + ' (' + siteUrl() + ' › Adultes › Je suis éduc › ton nom). Tu choisiras ensuite ton propre code.');
    }).then(function () { app.rerender(); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.educCode = function (b) {
    app.adultCall('resetEducCode', { educId: b.getAttribute('data-id') }).then(function (r) {
      var mine = b.getAttribute('data-id') === app.S.cache.group.moi.id;
      showCode('Code provisoire de ' + esc(r.nom), r.code, ['L\'ancien code ne marche plus. Adultes › Je suis éduc › son nom, puis ce code (30 jours) : il choisira ensuite le sien.'], 'Mode champion M12 · ton code éduc provisoire : ' + r.code + ' (' + siteUrl() + ' › Adultes › Je suis éduc › ton nom). Tu choisiras ensuite ton propre code.').then(function () { if (mine) { app.setAdult(null); app.go('#/adultes'); } });
    }).catch(function (e) { ui.toast(e.message, true); });
  };
  MC.act.educActive = function (b) {
    app.adultCall('updateEduc', { educId: b.getAttribute('data-id'), actif: b.getAttribute('data-on') === '1' }).then(function () { app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  };
})();
