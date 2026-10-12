/* =========================================================
   Mode champion · M12 — ÉCRANS DES COMPOS (éducs)
   Onglet « Compos » : les événements (Spond ou ajoutés à la main) et leurs présents,
   la compo d'un plateau (proposition automatique, tableau, publication, contre-propositions),
   la fiche terrain du groupe (niveaux, passerelles, plaquage) et sur la fiche de chaque joueur.
   Règle du groupe : un éduc suffit ; s'il n'y a pas de contre-proposition, c'est la compo.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, K = MC.compos, M = MC.missions;
  var esc = ui.esc, icon = ui.icon;
  var COURT = { pilier: 'Pilier', talonneur: 'Talon.', 'troisieme-ligne': '3e L.', 'demi-de-melee': '9', ouvreur: '10', centre: 'Centre', ailier: 'Ailier' };
  var BG = '#1E1A3A';

  // ---------- données ----------
  function loadCompos(force) {
    function set(r) { app.S.cache.compos = r; return r; }
    if (app.S.cache.compos && !force) return Promise.resolve(app.S.cache.compos);
    if (force) return app.adultCall('compos').then(function (r) { app.lsSet('mc-compos', { tok: app.S.adult.token, data: r }); return set(r); });
    return app.swr('mc-compos', 'compos', {}, function (res) {
      set(res); app.refreshNav();
      if (/^#\/educ\/(compos|evt|compo|avis)/.test(location.hash) && !(B && B.dirty) && !Object.keys(PR.chg).length && !document.querySelector('.modal')) rerenderKeep();
    }).then(set);
  }
  MC.loadCompos = loadCompos;
  function both() { return Promise.all([MC.loadGroup(), loadCompos()]); }
  function ctxOf(g, cd) {
    var F = K.fiches(g), evts = {};
    cd.evenements.forEach(function (e) { evts[e.id] = e; });
    var actifs = {};
    g.joueurs.forEach(function (p) { if (p.joueur.actif) actifs[p.joueur.id] = true; });
    return { g: g, cd: cd, F: F, evts: evts, actifs: actifs, H: K.historique(cd.compos, evts, F, L.today()), moi: g.moi };
  }
  function compoOf(cd, evtId) { return cd.compos.filter(function (c) { return c.evenementId === evtId && c.statut === 'publiee'; })[0] || null; }
  function avisOf(cd, compoId) { return cd.avis.filter(function (a) { return a.compoId === compoId; }); }
  function pendingAvis(cd) { return ((cd && cd.avis) || []).filter(function (a) { return a.statut === 'attente'; }); }
  MC.composPending = function () { return pendingAvis(app.S.cache.compos).length; };
  function presentsOf(C, e) { return K.presents(e).filter(function (id) { return C.actifs[id]; }); }
  function jour(e) { return String(e.debut || '').slice(0, 10); }
  function heure(e) {
    if (e.source !== 'spond') return '';
    var d = new Date(e.debut); if (isNaN(d)) return '';
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + 'h' + (d.getMinutes() ? (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() : '');
  }
  function quand(e) { var h = heure(e); return ui.fmtDate(jour(e)) + (h ? ' · ' + h : ''); }
  function nom(C, id) { return (C.F[id] || {}).prenom || '?'; }
  function niveauTag(n, small) {
    if (!n) return '<span class="cniv none"' + (small ? ' style="--s:20px"' : '') + ' title="Niveau à renseigner">?</span>';
    return '<span class="cniv" style="--lc:' + K.COUL_NIV[n] + (small ? ';--s:20px' : '') + '" title="' + K.NOM_NIV[n] + '">' + n + '</span>';
  }
  function starsMini(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    return '<span class="cstars" aria-label="Plaquage : ' + n + ' étoile' + (n > 1 ? 's' : '') + ' sur 5">' + s + '</span>';
  }
  function virg(x) { return String(x).replace('.', ','); }
  // jour (local) d'un horodatage ISO
  function localDay(iso) {
    var d = new Date(iso); if (isNaN(d)) return String(iso || '').slice(0, 10);
    return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }
  function relTime(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 2) return 'à l\'instant';
    if (m < 60) return 'il y a ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'il y a ' + h + ' h';
    return 'le ' + ui.fmtDate(String(iso).slice(0, 10));
  }
  // garder la position du tableau (défilement horizontal) d'un affichage à l'autre
  var keepX = null;
  function rerenderKeep() {
    var bd = document.querySelector('.cboard');
    keepX = bd ? bd.scrollLeft : null;
    app.rerender();
  }
  function afterPaint(cur) {
    cur.after = function (root) {
      var bd = root.querySelector('.cboard');
      if (bd && keepX !== null) bd.scrollLeft = keepX;
      keepX = null;
    };
  }

  // ======================================================================
  // Onglet « Compos » : les événements
  // ======================================================================
  app.route('/educ/compos', function (p, q, cur) {
    return both().then(function (r) { app.refreshNav(); return paintCompos(ctxOf(r[0], r[1])); });
  }, { adult: 'e', nav: 'e:compos', bg: BG });

  function evtCard(C, e) {
    var c = compoOf(C.cd, e.id), pres = presentsOf(C, e), av = c ? avisOf(C.cd, c.id).filter(function (a) { return a.statut === 'attente'; }) : [];
    var past = jour(e) < L.today(), dans = L.daysBetween(L.today(), jour(e));
    var chip;
    if (e.annule) chip = '<span class="pill" style="--pc:var(--red)">Annulé</span>';
    else if (c) chip = '<span class="pill" style="--pc:var(--green)">' + (past ? 'Compo jouée' : 'Compo de ' + esc(c.auteurNom)) + '</span>';
    else if (e.sorte === 'plateau') chip = past ? '<span class="pill" style="--pc:var(--faint);color:var(--ink)">Pas de compo</span>' : '<span class="pill" style="--pc:' + (dans <= 14 ? 'var(--orange)' : 'var(--line3);color:var(--ink)') + '">Compo à faire</span>';
    else chip = '<span class="pill" style="--pc:var(--line3);color:var(--ink)">' + (e.sorte === 'entrainement' ? 'Entraînement' : 'Événement') + '</span>';
    var sr = (e.sansReponse || []).filter(function (id) { return C.actifs[id] && pres.indexOf(id) < 0; }).length;
    return '<li><a class="li cev' + (past ? ' past' : '') + '" href="#/educ/evt/' + esc(e.id) + '">' +
      '<span class="cdate"><b>' + esc(String(new Date(jour(e) + 'T12:00:00').getDate())) + '</b><small>' + esc(ui.fmtDate(jour(e)).split(' ').slice(-1)[0]) + '</small></span>' +
      '<span class="grow"><span class="t1">' + esc(e.titre) + '</span><span class="t2">' + esc(quand(e)) + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</span>' +
      '<span class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">' + chip +
      '<span class="cmeta">' + icon('group', 14) + ' ' + pres.length + ' présent' + (pres.length > 1 ? 's' : '') + (sr && !past ? ' · ' + sr + ' sans réponse' : '') + '</span>' +
      (av.length ? '<span class="pill" style="--pc:var(--pink)">' + av.length + ' contre-proposition' + (av.length > 1 ? 's' : '') + '</span>' : '') + '</span></span>' + icon('right', 16) + '</a></li>';
  }
  function paintCompos(C) {
    var t = L.today(), cd = C.cd;
    var avenir = cd.evenements.filter(function (e) { return jour(e) >= t; });
    var passes = cd.evenements.filter(function (e) { return jour(e) < t; }).reverse().slice(0, 10);
    var F = C.F, ids = Object.keys(C.actifs), cnt = { A: 0, B: 0, C: 0, '': 0 };
    ids.forEach(function (id) { cnt[(F[id] || {}).niveau || '']++; });
    var sp = cd.spond || {}, d = sp.derniere;
    var spond = MC.api.DEMO ? '<p class="small" style="margin:0;color:var(--yellow)">Mode démo : événements fictifs (Spond n\'est pas branché).</p>' :
      sp.branche ? '<div class="between cspond"><span class="small">' + icon('refresh', 14) + ' Spond : ' + (d ? 'mis à jour ' + esc(relTime(d.quand)) : 'pas encore lu') + '</span><button type="button" class="btn2 sm" data-act="cSync">' + icon('refresh', 14) + ' Actualiser</button></div>' :
        '<p class="small" style="margin:0">Spond n\'est pas encore branché : ajoutez les plateaux à la main en attendant (les présents se cochent dans l\'appli).</p>';
    var pend = pendingAvis(cd);
    return '<main class="screen">' + MC.educBar(C.g, 'Les compos') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Plateaux et entraînements</span><h1 class="big md">Les compos</h1>' + spond + '</div>' +
      (pend.length ? '<a class="li calert-top" href="#/educ/avis/' + esc(pend[0].id) + '">' + icon('swap', 20, 'style="color:var(--pink);flex:none"') + '<span class="grow"><span class="t1">' + pend.length + ' contre-proposition' + (pend.length > 1 ? 's' : '') + ' en attente</span><span class="t2">De ' + esc(pend.map(function (a) { return a.auteurNom; }).join(', ')) + '</span></span>' + icon('right', 16) + '</a>' : '') +
      '<a class="li cterr" href="#/educ/terrain">' + icon('shield', 22, 'style="color:var(--cyan);flex:none"') + '<span class="grow"><span class="t1">Fiche terrain du groupe</span><span class="t2">Niveaux, passerelles, plaquage</span>' +
      '<span class="row" style="gap:6px;margin-top:6px">' + ['A', 'B', 'C'].map(function (n) { return niveauTag(n, true) + '<b class="cnum">' + cnt[n] + '</b>'; }).join('') +
      (cnt[''] ? '<span class="cmeta" style="color:var(--orange)">' + cnt[''] + ' sans niveau</span>' : '') + '</span></span>' + icon('right', 16) + '</a>' +
      '<div class="cols2"><section class="sec"><div class="between"><h2 class="h2">À venir</h2><a class="lnk" href="#/educ/evt-nouveau">' + icon('plus', 14) + ' Ajouter</a></div>' +
      (avenir.length ? '<ul class="list">' + avenir.map(function (e) { return evtCard(C, e); }).join('') + '</ul>' : '<div class="empty">Aucun événement à venir.' + (sp.branche ? '' : ' Ajoutez le prochain plateau avec « Ajouter ».') + '</div>') + '</section>' +
      '<section class="sec"><h2 class="h2">Déjà joués</h2>' + (passes.length ? '<ul class="list">' + passes.map(function (e) { return evtCard(C, e); }).join('') + '</ul>' : '<div class="empty">Rien pour l\'instant.</div>') + '</section></div>' +
      '</main>';
  }
  MC.act.cSync = function (b) {
    b.disabled = true;
    app.adultCall('syncSpond', {}).then(function (r) {
      var i = r.info;
      ui.toast('Spond : ' + i.evenements + ' événement' + (i.evenements > 1 ? 's' : '') + (i.nouveauxLiens ? ', ' + i.nouveauxLiens + ' joueur' + (i.nouveauxLiens > 1 ? 's' : '') + ' relié' + (i.nouveauxLiens > 1 ? 's' : '') : ''));
      return Promise.all([loadCompos(true), MC.loadGroup(true)]);
    }).then(function () { app.rerender(); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- ajouter un événement à la main ----------
  var NE = { titre: 'Plateau ', date: '', lieu: '', sorte: 'plateau' };
  app.route('/educ/evt-nouveau', function () {
    return MC.loadGroup().then(function (g) {
      if (!NE.date) NE.date = L.addDays(L.today(), (5 - L.dow(L.today()) + 7) % 7 || 7);   // samedi qui vient
      return '<main class="screen">' + MC.educBar(g, 'Nouvel événement', '#/educ/compos', 'Les compos') +
        '<div class="head"><span class="kicker">À la main, en attendant Spond</span><h1 class="big sm">Nouvel événement</h1></div>' +
        '<section class="sec"><label class="lab" for="ne-t">Titre</label><input id="ne-t" class="txt" maxlength="80" value="' + esc(NE.titre) + '" placeholder="Plateau 3 - Muret">' +
        '<label class="lab" for="ne-d">Date</label><input id="ne-d" class="txt" type="date" value="' + esc(NE.date) + '">' +
        '<label class="lab" for="ne-l">Lieu (facultatif)</label><input id="ne-l" class="txt" maxlength="80" value="' + esc(NE.lieu) + '">' +
        '<span class="lab">C\'est…</span><div class="seg3">' + [['plateau', 'Un plateau'], ['entrainement', 'Un entraînement'], ['autre', 'Autre']].map(function (o) {
          return '<button type="button" class="opt' + (NE.sorte === o[0] ? ' on' : '') + '" aria-pressed="' + (NE.sorte === o[0]) + '" data-act="neSorte" data-v="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<p class="small" style="margin:0">Les présents se cochent ensuite sur la page de l\'événement.</p>' +
        '<button type="button" class="btn" data-act="neCreate">' + icon('check', 18) + ' Créer l\'événement</button></section></main>';
    });
  }, { adult: 'e', nav: 'e:compos', bg: BG });
  function neRead() {
    var t = document.getElementById('ne-t'), d = document.getElementById('ne-d'), l = document.getElementById('ne-l');
    if (t) NE.titre = t.value; if (d) NE.date = d.value; if (l) NE.lieu = l.value;
  }
  MC.act.neSorte = function (b) { neRead(); NE.sorte = b.getAttribute('data-v'); app.rerender(); };
  MC.act.neCreate = function (b) {
    neRead();
    if (!NE.titre.trim()) { ui.toast('Il faut un titre.', true); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(NE.date)) { ui.toast('Choisissez la date.', true); return; }
    b.disabled = true;
    app.adultCall('setEvenement', { titre: NE.titre.trim(), debut: NE.date, lieu: NE.lieu.trim(), sorte: NE.sorte }).then(function (r) {
      NE = { titre: 'Plateau ', date: '', lieu: '', sorte: 'plateau' };
      return loadCompos(true).then(function () { ui.toast('Événement créé : cochez les présents'); app.go('#/educ/evt/' + r.evenement.id, true); });
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ======================================================================
  // Un événement : les présents, la compo
  // ======================================================================
  var PR = { evtId: null, chg: {} };   // présents modifiés (id → true présent / false absent), en attente d'enregistrement
  app.route('/educ/evt/:id', function (p, q, cur) {
    return both().then(function (r) {
      var C = ctxOf(r[0], r[1]), e = C.evts[p.id];
      if (!e) return '<main class="screen">' + MC.educBar(C.g, 'Événement', '#/educ/compos', 'Les compos') + '<div class="empty">Événement introuvable (supprimé ou trop ancien).</div></main>';
      if (PR.evtId !== e.id) PR = { evtId: e.id, chg: {} };
      return paintEvt(C, e);
    });
  }, { adult: 'e', nav: 'e:compos', bg: BG });

  function isPresent(e, id) {
    if (PR.chg[id] !== undefined) return PR.chg[id];
    return K.presents(e).indexOf(id) >= 0;
  }
  function paintEvt(C, e) {
    var c = compoOf(C.cd, e.id), past = jour(e) < L.today();
    var players = Object.keys(C.actifs).map(function (id) { return C.F[id]; }).filter(Boolean).sort(function (a, b) { return a.prenom.localeCompare(b.prenom, 'fr'); });
    var groups = { oui: [], nsp: [], non: [] };
    players.forEach(function (f) {
      if (isPresent(e, f.id)) groups.oui.push(f);
      else if ((e.absents || []).indexOf(f.id) >= 0 || (e.retraits || []).indexOf(f.id) >= 0 && PR.chg[f.id] === undefined) groups.non.push(f);
      else if ((e.sansReponse || []).indexOf(f.id) >= 0) groups.nsp.push(f);
      else groups.non.push(f);
    });
    function chip(f) {
      var on = isPresent(e, f.id), changed = PR.chg[f.id] !== undefined;
      var sp = (e.presents || []).indexOf(f.id) >= 0;
      // une correction à la main par rapport à Spond se voit sous le prénom
      var note = e.source !== 'spond' ? '' : on && !sp ? 'ajouté à la main' : !on && sp ? 'retiré à la main' : (e.absents || []).indexOf(f.id) >= 0 ? 'non sur Spond' : '';
      return '<button type="button" class="cop cpres' + (on ? ' on' : '') + (changed ? ' chg' : '') + '" aria-pressed="' + on + '" data-act="prToggle" data-id="' + esc(f.id) + '">' +
        niveauTag(f.niveau, true) + '<span class="nm">' + esc(f.prenom) + (note ? '<small class="csp' + (/ajouté/.test(note) ? ' oui' : /retiré|non/.test(note) ? ' non' : '') + '">' + note + '</small>' : '') + '</span>' +
        '<span class="ck">' + icon('check', 14) + '</span></button>';
    }
    var nchg = Object.keys(PR.chg).length;
    var av = c ? avisOf(C.cd, c.id).filter(function (a) { return a.statut === 'attente'; }) : [];
    var compoBlock;
    if (e.sorte !== 'plateau') {
      compoBlock = '<p class="small" style="margin:0">Les groupes du mercredi et les matchs de fin d\'entraînement arrivent plus tard. Si c\'est en fait un plateau :</p>' +
        '<button type="button" class="btn2 grey" data-act="eSorte" data-v="plateau">C\'est un plateau</button>';
    } else if (c) {
      compoBlock = '<a class="li" href="#/educ/compo/' + esc(e.id) + '">' + icon('swap', 20, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">Compo de ' + esc(c.auteurNom) + ' · version ' + c.version + '</span><span class="t2">' +
        c.equipes.map(function (t) { return t.id + ' (' + t.joueurs.length + ')'; }).join(' · ') + (c.reglages.format === 10 ? ' · jeu à 10' : ' · jeu à 5') + '</span></span>' + icon('right', 16) + '</a>' +
        (av.length ? '<a class="li calert-top" href="#/educ/avis/' + esc(av[0].id) + '">' + icon('swap', 18, 'style="color:var(--pink);flex:none"') + '<span class="grow"><span class="t1">Contre-proposition de ' + esc(av[0].auteurNom) + '</span><span class="t2">' + av[0].changements.length + ' changement' + (av[0].changements.length > 1 ? 's' : '') + ' · à voir</span></span>' + icon('right', 16) + '</a>' : '');
    } else if (past) {
      compoBlock = '<div class="empty">Pas de compo enregistrée pour ce plateau.</div>';
    } else {
      var dr = app.lsGet('mc-cdraft:' + e.id);
      compoBlock = '<a class="btn" href="#/educ/compo/' + esc(e.id) + '">' + icon('swap', 18) + (dr ? ' Reprendre ma compo en cours' : ' Préparer la compo') + '</a>' +
        '<p class="small" style="margin:0">Un éduc suffit : la compo publiée est celle du plateau, sauf si un autre éduc fait une contre-proposition.</p>';
    }
    var inc = (e.inconnus || []);
    return '<main class="screen">' + MC.educBar(C.g, e.titre, '#/educ/compos', 'Les compos') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">' + esc(quand(e)) + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</span><h1 class="big sm">' + esc(e.titre) + '</h1>' +
      '<p class="small" style="margin:0">' + (e.source === 'spond' ? 'Depuis Spond' + (e.annule ? ' · <b style="color:var(--red)">annulé dans Spond</b>' : '') : 'Ajouté à la main par ' + esc(e.parQui || 'un éduc')) + '</p></div>' +
      '<div class="cols2"><section class="sec"><h2 class="h2">La compo</h2>' + compoBlock + '</section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Présents</h2><span class="hud" style="color:var(--green)">' + groups.oui.length + '</span></div>' +
      '<p class="small" style="margin:0">' + (e.source === 'spond' ? 'D\'après les réponses Spond. Touchez un prénom pour corriger (venu sans répondre, forfait de dernière minute) : la correction reste après chaque synchro.' : 'Touchez les prénoms des enfants présents.') + '</p>' +
      '<div class="cop-list">' + groups.oui.map(chip).join('') + '</div>' +
      (groups.nsp.length ? '<h3 class="mlab" style="margin-top:6px">Pas de réponse (' + groups.nsp.length + ')</h3><div class="cop-list">' + groups.nsp.map(chip).join('') + '</div>' : '') +
      '<details' + (e.source !== 'spond' ? ' open' : '') + '><summary class="mlab" style="cursor:pointer;margin-top:6px">' + (e.source === 'spond' ? 'Absents ou pas inscrits' : 'Les autres') + ' (' + groups.non.length + ')</summary><div class="cop-list" style="margin-top:8px">' + groups.non.map(chip).join('') + '</div></details>' +
      (inc.length ? '<p class="small" style="margin:0">Aussi inscrits sur Spond, sans joueur dans l\'appli : ' + inc.map(esc).join(', ') + ' (adultes, ou enfants à relier dans leur fiche terrain).</p>' : '') +
      (e.source === 'manuel' && !c ? '<button type="button" class="lnk" data-act="eDel" style="align-self:flex-start">Supprimer cet événement</button>' : '') +
      '</section></div>' +
      (nchg ? '<div class="cp-bar cdock"><span class="grow small" style="color:var(--soft)">' + nchg + ' changement' + (nchg > 1 ? 's' : '') + '</span><button type="button" class="btn2 sm grey" data-act="prCancel">Annuler</button><button type="button" class="btn sm" data-act="prSave">' + icon('check', 16) + ' Enregistrer</button></div>' : '') +
      '</main>';
  }
  MC.act.prToggle = function (b) {
    var id = b.getAttribute('data-id'), e = (app.S.cache.compos.evenements || []).filter(function (x) { return x.id === PR.evtId; })[0];
    if (!e) return;
    var base = K.presents(e).indexOf(id) >= 0, now = !isPresent(e, id);
    if (now === base) delete PR.chg[id]; else PR.chg[id] = now;
    app.rerender();
  };
  MC.act.prCancel = function () { PR.chg = {}; app.rerender(); };
  MC.act.prSave = function (b) {
    var e = (app.S.cache.compos.evenements || []).filter(function (x) { return x.id === PR.evtId; })[0];
    if (!e) return;
    var params = { id: e.id };
    if (e.source === 'manuel') {
      var pres = (e.presents || []).slice();
      Object.keys(PR.chg).forEach(function (id) { var i = pres.indexOf(id); if (PR.chg[id] && i < 0) pres.push(id); if (!PR.chg[id] && i >= 0) pres.splice(i, 1); });
      params.presents = pres;
    } else {
      var aj = (e.ajouts || []).slice(), re = (e.retraits || []).slice(), sp = e.presents || [];
      Object.keys(PR.chg).forEach(function (id) {
        aj = aj.filter(function (x) { return x !== id; }); re = re.filter(function (x) { return x !== id; });
        if (PR.chg[id] && sp.indexOf(id) < 0) aj.push(id);
        if (!PR.chg[id] && sp.indexOf(id) >= 0) re.push(id);
      });
      params.ajouts = aj; params.retraits = re;
    }
    b.disabled = true;
    app.adultCall('setEvenement', params).then(function (r) {
      var l = app.S.cache.compos.evenements;
      for (var i = 0; i < l.length; i++) if (l[i].id === r.evenement.id) l[i] = r.evenement;
      app.lsSet('mc-compos', { tok: app.S.adult.token, data: app.S.cache.compos });
      PR.chg = {}; ui.toast('Présents enregistrés'); app.rerender();
    }).catch(function (er) { b.disabled = false; ui.toast(er.message, true); });
  };
  MC.act.eSorte = function (b) {
    app.adultCall('setEvenement', { id: PR.evtId, sorte: b.getAttribute('data-v') }).then(function () { return loadCompos(true); }).then(function () { app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  };
  MC.act.eDel = function () {
    ui.modal({ title: 'Supprimer l\'événement ?', body: '<p class="lead">Il disparaît de la liste, avec ses présents.</p>', actions: [{ label: 'Supprimer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('setEvenement', { id: PR.evtId, supprimer: true }).then(function () { return loadCompos(true); }).then(function () { ui.toast('Événement supprimé'); app.go('#/educ/compos', true); }).catch(function (e) { ui.toast(e.message, true); });
    });
  };

  // ======================================================================
  // La compo d'un plateau : réglages, proposition, tableau, publication
  // ======================================================================
  // B : la compo affichée. mode = 'reglages' (pas encore de compo) | 'draft' (brouillon, pas publiée)
  //     | 'edit' (je suis l'auteur, ou c'est le jour J) | 'view' (compo d'un autre éduc) | 'counter' (ma contre-proposition)
  var B = null;
  function draftKey(id) { return 'mc-cdraft:' + id; }
  function saveDraft() { if (B && B.dirty) app.lsSet(draftKey(B.evtId), { base: B.base, compoId: B.compoId, mode: B.mode, d: B.d, undo: B.undo.slice(-15) }); }
  function dropDraft(id) { app.lsSet(draftKey(id), null); }
  function copyCompo(c) { return JSON.parse(JSON.stringify({ reglages: c.reglages, equipes: c.equipes, banc: c.banc || [], raisons: c.raisons || {} })); }
  function canEdit(C, c) { var e = C.evts[c.evenementId]; return c.auteur === C.moi.id || (e && jour(e) === L.today()); }
  function initBoard(C, e) {
    var c = compoOf(C.cd, e.id), base = c ? c.version : 0;
    if (B && B.evtId === e.id && B.base === base) return B;
    var s = app.lsGet(draftKey(e.id));
    if (s && s.d && s.base === base) { B = { evtId: e.id, base: base, compoId: s.compoId, mode: s.mode, d: s.d, undo: s.undo || [], sel: null, dirty: true }; return B; }
    if (s) { dropDraft(e.id); if (B && B.evtId === e.id && B.dirty) ui.toast('La compo a changé entre-temps : vos changements non envoyés sont effacés.', true); }
    if (c) B = { evtId: e.id, base: base, compoId: c.id, mode: canEdit(C, c) ? 'edit' : 'view', d: copyCompo(c), undo: [], sel: null, dirty: false };
    else B = { evtId: e.id, base: 0, compoId: null, mode: 'reglages', d: null, undo: [], sel: null, dirty: false, reg: null };
    return B;
  }
  function editable() { return B && (B.mode === 'draft' || B.mode === 'edit' || B.mode === 'counter'); }
  function change(fn) {
    if (!editable()) return;
    B.undo.push(JSON.stringify(B.d)); if (B.undo.length > 30) B.undo.shift();
    fn(); B.dirty = true; saveDraft(); rerenderKeep();
  }

  app.route('/educ/compo/:id', function (p, q, cur) {
    return both().then(function (r) {
      var C = ctxOf(r[0], r[1]), e = C.evts[p.id];
      if (!e) return '<main class="screen">' + MC.educBar(C.g, 'Compo', '#/educ/compos', 'Les compos') + '<div class="empty">Événement introuvable.</div></main>';
      initBoard(C, e);
      afterPaint(cur);
      return B.mode === 'reglages' ? paintReglages(C, e) : paintBoard(C, e);
    });
  }, { adult: 'e', nav: 'e:compos', bg: BG });

  // ---------- réglages : format et nombre d'équipes par niveau ----------
  function regOf(C, e) {
    if (B.reg) return B.reg;
    var ids = presentsOf(C, e), format = jour(e) >= '2026-12-01' ? 10 : 5;
    // reprendre le format du dernier plateau
    var last = C.cd.compos.filter(function (c) { return c.statut === 'publiee'; }).sort(function (a, b) { return a.maj < b.maj ? 1 : -1; })[0];
    if (last && last.reglages && last.reglages.format) format = last.reglages.format;
    B.reg = { format: format, nb: K.suggestNb(ids, C.F, format) };
    return B.reg;
  }
  function paintReglages(C, e) {
    var ids = presentsOf(C, e), reg = regOf(C, e), cnt = { A: 0, B: 0, C: 0, '': 0 };
    ids.forEach(function (id) { cnt[(C.F[id] || {}).niveau || '']++; });
    var tot = reg.nb.A + reg.nb.B + reg.nb.C, sug = K.suggestNb(ids, C.F, reg.format);
    var per = tot ? Math.round(ids.length / tot * 10) / 10 : 0;
    function stepper(n) {
      return '<div class="cstep" style="--lc:' + K.COUL_NIV[n] + '"><span class="row" style="gap:8px">' + niveauTag(n) + '<span><b>' + K.NOM_NIV[n] + '</b><small class="small" style="display:block">' + cnt[n] + ' présent' + (cnt[n] > 1 ? 's' : '') + (sug[n] !== reg.nb[n] ? ' · conseillé : ' + sug[n] : '') + '</small></span></span>' +
        '<span class="row" style="gap:6px"><button type="button" class="ibtn" data-act="cNb" data-n="' + n + '" data-d="-1" aria-label="Une équipe ' + n + ' de moins"' + (reg.nb[n] <= 0 ? ' disabled' : '') + '>' + icon('minus', 18) + '</button>' +
        '<output class="cnbv">' + reg.nb[n] + '</output><button type="button" class="ibtn" data-act="cNb" data-n="' + n + '" data-d="1" aria-label="Une équipe ' + n + ' de plus"' + (reg.nb[n] >= 6 ? ' disabled' : '') + '>' + icon('plus', 18) + '</button></span></div>';
    }
    var noLv = ids.filter(function (id) { return !(C.F[id] || {}).niveau; });
    return '<main class="screen">' + MC.educBar(C.g, 'Compo · ' + e.titre, '#/educ/evt/' + e.id, e.titre) +
      '<div class="head"><span class="kicker" style="color:var(--gold)">' + esc(quand(e)) + ' · ' + ids.length + ' présents</span><h1 class="big sm">Préparer la compo</h1></div>' +
      (ids.length < 2 ? '<div class="empty">Cochez d\'abord les présents sur la page de l\'événement.</div><a class="btn2" href="#/educ/evt/' + esc(e.id) + '">Les présents</a></main>' :
      '<section class="sec"><h2 class="h2">Le format</h2><div class="grid2">' + K.FORMATS.map(function (f) {
        return '<button type="button" class="opt' + (reg.format === f ? ' on' : '') + '" aria-pressed="' + (reg.format === f) + '" data-act="cFmt" data-v="' + f + '">Jeu à ' + f + '</button>';
      }).join('') + '</div><p class="small" style="margin:0">' + (reg.format === 10 ? 'Jeu à 10 : l\'appli place aussi les postes (mêlée 3 + 2, demi de mêlée, ouvreur, 2 centres, 1 ailier), d\'après les vœux des enfants et les postes compatibles.' : 'Jeu à 5 : pas de postes dans la compo.') + '</p></section>' +
      '<section class="sec"><h2 class="h2">Équipes par niveau</h2>' + stepper('A') + stepper('B') + stepper('C') +
      '<p class="small" style="margin:0">' + tot + ' équipe' + (tot > 1 ? 's' : '') + (tot ? ', environ ' + virg(per) + ' joueurs par équipe' : '') + '. Un niveau sans équipe joue dans le niveau voisin ; les passerelles comblent les écarts, chacun son tour.</p>' +
      (noLv.length ? '<p class="small" style="margin:0;color:var(--orange)">Sans niveau (placés en B en attendant) : ' + noLv.map(function (id) { return esc(nom(C, id)); }).join(', ') + '. <a href="#/educ/terrain">Fiche terrain</a></p>' : '') + '</section>' +
      '<div class="sec"><button type="button" class="btn" data-act="cPropose"' + (tot ? '' : ' disabled') + '>' + icon('spark', 18) + ' Proposer une compo</button>' +
      '<button type="button" class="btn2 grey" data-act="cZero"' + (tot ? '' : ' disabled') + '>Partir de zéro</button>' +
      '<p class="small" style="margin:0">La proposition équilibre le plaquage, fait tourner les passerelles et met chacun avec au moins un copain quand c\'est possible. Ce n\'est qu\'un point de départ : tout se déplace ensuite d\'un geste.</p></div></main>');
  }
  MC.act.cFmt = function (b) { if (!B || !B.reg) return; B.reg.format = Number(b.getAttribute('data-v')); app.rerender(); };
  MC.act.cNb = function (b) { if (!B || !B.reg) return; var n = b.getAttribute('data-n'); B.reg.nb[n] = Math.max(0, Math.min(6, B.reg.nb[n] + Number(b.getAttribute('data-d')))); app.rerender(); };
  function withC(fn) {
    var g = app.S.cache.group, cd = app.S.cache.compos;
    if (!g || !cd || !B) return;
    var C = ctxOf(g, cd), e = C.evts[B.evtId];
    if (e) fn(C, e);
  }
  MC.act.cPropose = function () {
    withC(function (C, e) {
      var reg = B.reg || (B.d && B.d.reglages);
      var prop = K.proposer(presentsOf(C, e), C.F, C.H, reg, L.today());
      var d = { reglages: { format: reg.format, nb: K.nbOf(reg) }, equipes: prop.equipes, banc: prop.banc, raisons: prop.raisons };
      if (B.d) B.undo.push(JSON.stringify(B.d));
      B.d = d; if (B.mode === 'reglages') B.mode = 'draft';
      B.dirty = true; B.sel = null; saveDraft();
      ui.toast('Compo proposée : à vous d\'ajuster');
      app.rerender();
    });
  };
  MC.act.cZero = function () {
    withC(function (C, e) {
      var reg = B.reg;
      B.d = K.vide(presentsOf(C, e), reg); B.d.reglages = { format: reg.format, nb: K.nbOf(reg) };
      B.mode = 'draft'; B.dirty = true; saveDraft(); app.rerender();
    });
  };

  // ---------- le tableau ----------
  function teamName(t) { return 'Équipe ' + t.id; }
  function chip(C, t, j, moved) {
    var f = C.F[j.id] || { prenom: '?', copains: [] }, ids = t ? t.joueurs.map(function (x) { return x.id; }) : [];
    var cps = (f.copains || []).filter(function (x) { return ids.indexOf(x) >= 0; });
    var heart = !(f.copains || []).length ? '' : cps.length ? '<span class="cfl cop-ok" title="Avec un copain">' + icon('heart', 12) + '</span>' : '<span class="cfl cop-no" title="Sans copain">' + icon('heart', 12) + '</span>';
    var lv = t && f.niveau && f.niveau !== t.niveau ? '<span class="cfl cpas" title="Joue hors de son niveau (' + f.niveau + ')">' + (K.NIV.indexOf(t.niveau) < K.NIV.indexOf(f.niveau) ? '↑' : '↓') + f.niveau + '</span>' : '';
    var warn = t && (!f.niveau || (f.plaquage || 0) < (K.SEUIL[t.niveau] || 0));
    var poste = t && B.d.reglages.format === 10 ? '<span class="cpo' + (j.poste ? '' : ' none') + '">' + (j.poste ? COURT[j.poste] : 'Remp.') + '</span>' : '';
    return '<li><button type="button" class="cpj' + (B.sel === j.id ? ' sel' : '') + (moved ? ' moved' : '') + (warn ? ' warn' : '') + '" data-act="cPick" data-id="' + esc(j.id) + '" aria-pressed="' + (B.sel === j.id) + '">' +
      '<span class="cpn">' + esc(f.prenom) + '</span>' + poste + '<span class="row cfls">' + starsMini(f.plaquage || 0) + lv + heart + (f.niveau ? '' : '<span class="cfl cq" title="Niveau à renseigner">?</span>') + '</span></button></li>';
  }
  function column(C, t, st, moved) {
    var fmt10 = B.d.reglages.format === 10;
    var dest = B.sel && editable() && K.where(B.d, B.sel) && (K.where(B.d, B.sel).t < 0 || B.d.equipes[K.where(B.d, B.sel).t].id !== t.id);
    return '<section class="ccol" style="--lc:' + K.COUL_NIV[t.niveau] + '" aria-label="' + esc(teamName(t)) + '">' +
      '<button type="button" class="chd' + (dest ? ' dest' : '') + '" data-act="cTeam" data-t="' + esc(t.id) + '"' + (dest ? '' : ' tabindex="-1"') + '>' +
      '<span class="row" style="justify-content:space-between;width:100%"><b class="ctid">' + esc(t.id) + '</b><span class="cn">' + st.n + '</span></span>' +
      '<span class="cind"><span title="Plaquage moyen">' + icon('star', 12) + ' ' + virg(st.plaq) + '</span><span title="Bons plaqueurs (3 étoiles et plus)">' + icon('shield', 12) + ' ' + st.bons + '</span>' +
      (st.ontCopains ? '<span title="Avec au moins un copain">' + icon('heart', 12) + ' ' + st.avecCopain + '/' + st.ontCopains + '</span>' : '') + (st.passerelles ? '<span title="Hors de leur niveau (passerelles)">⇅ ' + st.passerelles + '</span>' : '') + '</span>' +
      (fmt10 && st.manquants.length ? '<span class="cmiss">Manque : ' + st.manquants.map(function (p) { return COURT[p]; }).join(', ') + '</span>' : '') +
      (dest ? '<span class="cdest">' + icon('down', 12) + ' Déplacer ici</span>' : '') + '</button>' +
      '<ul class="cpl">' + t.joueurs.map(function (j) { return chip(C, t, j, moved[j.id]); }).join('') + '</ul></section>';
  }
  function paintBoard(C, e) {
    var d = B.d, c = compoOf(C.cd, e.id), presents = presentsOf(C, e);
    var fmt10 = d.reglages.format === 10;
    var al = K.alertes(d, C.F, C.H, presents);
    // inscrits retirés depuis : encore placés mais plus présents
    var placed = []; d.equipes.forEach(function (t) { t.joueurs.forEach(function (j) { placed.push(j.id); }); });
    var partis = placed.filter(function (id) { return presents.indexOf(id) < 0; });
    if (partis.length) al.unshift({ k: 'parti', niveau: 'warn', texte: 'Plus dans les présents : ' + partis.map(function (id) { return nom(C, id); }).join(', ') + '.', fix: null, ids: partis });
    var moved = {};
    if (c && (B.mode === 'counter' || (B.mode === 'edit' && B.dirty))) K.diff(c, d).forEach(function (m) { moved[m.id] = true; });
    var stats = d.equipes.map(function (t) { return K.stats(t, C.F, d.reglages.format); });
    var cols = d.equipes.map(function (t, i) { return column(C, t, stats[i], moved); }).join('');
    var banc = d.banc || [];
    var showBanc = banc.length || (B.sel && editable());
    if (showBanc) {
      var bdest = B.sel && editable() && banc.indexOf(B.sel) < 0;
      cols += '<section class="ccol banc" aria-label="Pas placés"><button type="button" class="chd' + (bdest ? ' dest' : '') + '" data-act="cTeam" data-t="banc"' + (bdest ? '' : ' tabindex="-1"') + '><span class="row" style="justify-content:space-between;width:100%"><b class="ctid" style="font-size:14px">Pas placés</b><span class="cn">' + banc.length + '</span></span>' +
        '<span class="cind"><span>Présents sans équipe, blessés…</span></span>' + (bdest ? '<span class="cdest">' + icon('down', 12) + ' Déplacer ici</span>' : '') + '</button>' +
        '<ul class="cpl">' + banc.map(function (id) { return chip(C, null, { id: id }, moved[id]); }).join('') + '</ul></section>';
    }
    // en-tête : état de la compo
    var av = c ? avisOf(C.cd, c.id) : [], avAtt = av.filter(function (a) { return a.statut === 'attente'; });
    var state;
    if (B.mode === 'draft') state = '<div class="cstate draft">' + icon('edit', 18) + '<span><b>Brouillon</b> : vous seul le voyez. Publiez-le quand il vous va.</span></div>';
    else if (B.mode === 'counter') state = '<div class="cstate counter">' + icon('swap', 18) + '<span><b>Votre contre-proposition</b> sur la compo de ' + esc(c.auteurNom) + ' : déplacez, puis envoyez-la avec un mot d\'explication.</span></div>';
    else state = '<div class="cstate pub">' + icon('check', 18) + '<span><b>Compo de ' + esc(c.auteurNom) + '</b> · version ' + c.version + (c.justification ? '<br><span class="small" style="color:var(--soft)">« ' + esc(c.justification) + ' »</span>' : '') +
      (B.mode === 'edit' && c.auteur !== C.moi.id ? '<br><span class="small" style="color:var(--gold)">C\'est le jour J : vous pouvez corriger directement (dernière minute).</span>' : '') + '</span></div>';
    var avBlock = avAtt.map(function (a) {
      return '<a class="li calert-top" href="#/educ/avis/' + esc(a.id) + '">' + icon('swap', 18, 'style="color:var(--pink);flex:none"') + '<span class="grow"><span class="t1">Contre-proposition de ' + esc(a.auteurNom) + '</span><span class="t2">' + a.changements.length + ' changement' + (a.changements.length > 1 ? 's' : '') + ' · « ' + esc(a.justification.slice(0, 80)) + (a.justification.length > 80 ? '…' : '') + ' »</span></span>' + icon('right', 16) + '</a>';
    }).join('');
    // panneau du joueur choisi + actions
    var dock = dockHtml(C, e, c);
    var alHtml = al.length ? '<section class="sec"><div class="between"><h2 class="h2">À regarder</h2><span class="hud" style="color:var(--orange)">' + al.length + '</span></div><ul class="list calerts">' + al.map(function (a, i) {
      return '<li class="li ' + (a.niveau === 'warn' ? 'warn' : 'info') + '">' + icon(a.niveau === 'warn' ? 'warn' : 'info', 18, 'style="flex:none"') + '<span class="grow small" style="color:var(--soft)">' + esc(a.texte) + '</span>' +
        (a.fix && editable() ? '<button type="button" class="btn2 sm" data-act="cFix" data-i="' + i + '" title="' + esc(a.fix.texte) + '">Corriger</button>' : '') + '</li>';
    }).join('') + '</ul></section>' : '<div class="empty" style="border-color:rgba(61,255,176,.4);color:var(--green)">' + icon('check', 16) + ' Rien à signaler : effectifs, plaquage et copains sont équilibrés.</div>';
    var rs = Object.keys(d.raisons || {}).filter(function (id) { return placed.indexOf(id) >= 0 || banc.indexOf(id) >= 0; });
    var raisons = rs.length ? '<details class="box"><summary class="mlab" style="cursor:pointer;margin:0">Pourquoi ces choix (' + rs.length + ')</summary><ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:1.5;color:var(--soft)">' +
      rs.map(function (id) { return '<li><b style="color:var(--ink)">' + esc(nom(C, id)) + '</b> : ' + esc(d.raisons[id]) + '</li>'; }).join('') + '</ul></details>' : '';
    var hist = c && c.historique && c.historique.length ? '<details class="box"><summary class="mlab" style="cursor:pointer;margin:0">Versions (' + c.historique.length + ')</summary><ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:1.5;color:var(--soft)">' +
      c.historique.slice().reverse().map(function (h) { return '<li>v' + h.v + ' · ' + esc(h.par) + ' · ' + esc(ui.fmtDate(localDay(h.quand))) + ' · ' + esc(h.note || '') + (h.n ? ' (' + h.n + ' changement' + (h.n > 1 ? 's' : '') + ')' : '') + '</li>'; }).join('') + '</ul></details>' : '';
    var oldAv = av.filter(function (a) { return a.statut !== 'attente'; });
    var avHist = oldAv.length ? '<details class="box"><summary class="mlab" style="cursor:pointer;margin:0">Contre-propositions traitées (' + oldAv.length + ')</summary><ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:1.5;color:var(--soft)">' +
      oldAv.map(function (a) { return '<li><a href="#/educ/avis/' + esc(a.id) + '">' + esc(a.auteurNom) + '</a> · ' + ({ acceptee: 'acceptée', refusee: 'refusée', retiree: 'retirée' }[a.statut] || a.statut) + (a.reponse ? ' · « ' + esc(a.reponse) + ' »' : '') + '</li>'; }).join('') + '</ul></details>' : '';
    var tools = '';
    return '<main class="screen cscreen">' + MC.educBar(C.g, 'Compo · ' + e.titre, '#/educ/evt/' + e.id, e.titre) +
      '<div class="head"><span class="kicker" style="color:var(--gold)">' + esc(quand(e)) + ' · ' + presents.length + ' présents · jeu à ' + d.reglages.format + '</span><h1 class="big sm">La compo</h1></div>' +
      state + avBlock + tools +
      '<p class="small" style="margin:0">' + (editable() ? 'Touchez un joueur, puis son équipe d\'arrivée (ou un joueur d\'une autre équipe : ils s\'échangent).' : 'Touchez un joueur pour voir sa fiche.') + '</p>' +
      '<p class="small clegend"><span>' + icon('star', 11) + ' plaquage moyen</span><span>' + icon('shield', 11) + ' bons plaqueurs</span><span>' + icon('heart', 11) + ' avec un copain</span><span>⇅ hors niveau</span></p>' +
      '<div class="cboard" style="--n:' + (d.equipes.length + (showBanc ? 1 : 0)) + '">' + cols + '</div>' +
      alHtml + raisons + hist + avHist +
      (B.mode === 'draft' ? '<button type="button" class="lnk" data-act="cDiscard" style="align-self:flex-start">Effacer le brouillon</button>' :
        B.mode === 'counter' ? '<button type="button" class="lnk" data-act="cDiscard" style="align-self:flex-start">Abandonner ma contre-proposition</button>' :
        B.mode === 'edit' && B.dirty ? '<button type="button" class="lnk" data-act="cDiscard" style="align-self:flex-start">Annuler mes changements (revenir à la version ' + c.version + ')</button>' : '') +
      (c && B.mode !== 'counter' && (c.auteur === C.moi.id || C.moi.admin) ? '<button type="button" class="lnk" data-act="cRetirer" style="align-self:flex-start">Retirer cette compo (repartir de zéro)</button>' : '') +
      dock + '</main>';
  }
  function dockHtml(C, e, c) {
    var sel = B.sel ? C.F[B.sel] : null, html = '';
    if (sel) {
      var w = K.where(B.d, B.sel), t = w && w.t >= 0 ? B.d.equipes[w.t] : null, h = K.hOf(C.H, sel.id);
      var cpsWhere = (sel.copains || []).map(function (id) {
        var ww = K.where(B.d, id); if (!ww) return null;
        return esc(nom(C, id)) + ' (' + (ww.t >= 0 ? B.d.equipes[ww.t].id : 'pas placé') + ')';
      }).filter(Boolean);
      var info = '<div class="row" style="gap:10px;align-items:flex-start">' + niveauTag(sel.niveau) + '<span class="grow"><b class="t1" style="display:block;font:700 15px/1.2 var(--f-hud)">' + esc(sel.prenom) +
        (sel.passerelle ? ' <small style="color:var(--violet)">passerelle ' + sel.niveau + '↔' + sel.passerelle + '</small>' : '') + '</b>' +
        '<span class="small" style="display:block;margin-top:3px">' + starsMini(sel.plaquage) + ' · ' + (sel.voeux.length ? sel.voeux.map(function (p) { return COURT[p]; }).join(', ') : 'pas de vœu de poste') +
        ' · ' + h.plateaux + ' plateau' + (h.plateaux > 1 ? 'x' : '') + (h.autre ? ', ' + h.autre + ' hors niveau' : '') + '</span>' +
        (cpsWhere.length ? '<span class="small" style="display:block;margin-top:3px;color:var(--soft)">' + icon('heart', 11) + ' ' + cpsWhere.join(', ') + '</span>' : '') +
        (B.d.raisons && B.d.raisons[sel.id] ? '<span class="small" style="display:block;margin-top:3px;color:var(--gold)">' + esc(B.d.raisons[sel.id]) + '</span>' : '') + '</span>' +
        '<button type="button" class="ibtn" data-act="cPick" data-id="' + esc(sel.id) + '" aria-label="Fermer">' + icon('x', 18) + '</button></div>';
      var moves = '';
      if (editable()) {
        moves = '<div class="cmoves">' + B.d.equipes.map(function (x) {
          var here = t && x.id === t.id;
          return '<button type="button" class="cmv' + (here ? ' here' : '') + '" style="--lc:' + K.COUL_NIV[x.niveau] + '" data-act="cMove" data-t="' + esc(x.id) + '"' + (here ? ' disabled' : '') + '>' + esc(x.id) + '</button>';
        }).join('') + '<button type="button" class="cmv' + (!t ? ' here' : '') + '" style="--lc:var(--dim)" data-act="cMove" data-t="banc"' + (!t ? ' disabled' : '') + '>Pas placé</button></div>';
        if (t && B.d.reglages.format === 10) {
          var cur = (t.joueurs.filter(function (j) { return j.id === sel.id; })[0] || {}).poste || '';
          moves += '<div class="cmoves">' + K.POSTES10.map(function (p) {
            var r = sel.voeux.indexOf(p[0]);
            return '<button type="button" class="cmv po' + (cur === p[0] ? ' here' : '') + '" data-act="cPoste" data-p="' + p[0] + '">' + COURT[p[0]] + (r >= 0 ? '<sup>' + (r + 1) + '</sup>' : (sel.postesOk || []).indexOf(p[0]) >= 0 ? '<sup>✓</sup>' : '') + '</button>';
          }).join('') + '<button type="button" class="cmv po' + (!cur ? ' here' : '') + '" data-act="cPoste" data-p="">Remp.</button></div>';
        }
      }
      html += '<div class="cselp">' + info + moves + '<a class="lnk" href="#/educ/joueur/' + esc(sel.id) + '" style="align-self:flex-start;min-height:32px">Sa fiche</a></div>';
    }
    var act = '';
    if (B.mode === 'draft') act = '<button type="button" class="btn sm" data-act="cPublish">' + icon('send', 16) + ' Publier</button>';
    else if (B.mode === 'edit' && B.dirty) act = '<button type="button" class="btn sm" data-act="cSave">' + icon('check', 16) + ' Enregistrer (v' + (c.version + 1) + ')</button>';
    else if (B.mode === 'view') act = '<button type="button" class="btn sm" data-act="cCounter">' + icon('swap', 16) + ' Proposer des changements</button>';
    else if (B.mode === 'counter') act = '<button type="button" class="btn sm pink" data-act="cSendCounter"' + (c && K.diff(c, B.d).length ? '' : ' disabled') + '>' + icon('send', 16) + ' Envoyer à ' + esc(c ? c.auteurNom : '') + '</button>';
    // outils du tableau (annuler le dernier geste, réglages, postes) à gauche des boutons
    var tl = editable() ? '<button type="button" class="ibtn" data-act="cUndo" aria-label="Annuler le dernier changement" title="Annuler le dernier changement"' + (B.undo.length ? '' : ' disabled') + '>' + icon('undo', 18) + '</button>' +
      '<button type="button" class="ibtn" data-act="cRegl" aria-label="Réglages : format et équipes" title="Réglages">' + icon('settings', 18) + '</button>' +
      (B.d.reglages.format === 10 ? '<button type="button" class="ibtn" data-act="cPostes" aria-label="Répartir les postes d\'après les vœux" title="Postes auto">' + icon('spark', 18) + '</button>' : '') : '';
    if (act || tl) html += '<div class="row cacts">' + (tl ? '<span class="row ctl">' + tl + '</span>' : '') + act + '</div>';
    return html ? '<div class="cp-bar cdock">' + html + '</div>' : '';
  }

  MC.act.cPick = function (b) {
    if (!B || !B.d) return;
    var id = b.getAttribute('data-id');
    if (B.sel === id) { B.sel = null; rerenderKeep(); return; }
    if (B.sel && editable()) {
      var wa = K.where(B.d, B.sel), wb = K.where(B.d, id);
      if (wa && wb && wa.t !== wb.t) {
        var a = B.sel, nA = nameOf(a), nB = nameOf(id);
        B.sel = null;
        change(function () { B.d = K.swap(B.d, a, id); });
        ui.toast('Échangés : ' + nA + ' ⇄ ' + nB);
        return;
      }
    }
    B.sel = id; rerenderKeep();
  };
  function nameOf(id) { var g = app.S.cache.group, p = g && g.joueurs.filter(function (x) { return x.joueur.id === id; })[0]; return p ? p.joueur.prenom : '?'; }
  function moveSel(dest) {
    if (!B || !B.sel || !editable()) return;
    var id = B.sel, F = K.fiches(app.S.cache.group);
    B.sel = null;
    change(function () {
      B.d = K.moveTo(B.d, id, dest, F);
      // jeu à 10 : il prend un poste libre de sa nouvelle équipe s'il en a un dans ses vœux
      if (B.d.reglages.format === 10 && dest !== 'banc') {
        var t = B.d.equipes.filter(function (x) { return x.id === dest; })[0], st = K.stats(t, F, 10), f = F[id] || {};
        var p = (f.voeux || []).concat(f.postesOk || []).filter(function (x) { return st.manquants.indexOf(x) >= 0; })[0];
        if (p) B.d = K.setPoste(B.d, id, p);
      }
    });
  }
  MC.act.cMove = function (b) { moveSel(b.getAttribute('data-t')); };
  MC.act.cTeam = function (b) { if (B && B.sel && editable()) moveSel(b.getAttribute('data-t')); };
  MC.act.cPoste = function (b) { if (!B || !B.sel) return; var id = B.sel, p = b.getAttribute('data-p'); change(function () { B.d = K.setPoste(B.d, id, p); }); };
  MC.act.cUndo = function () {
    if (!B || !B.undo.length) return;
    B.d = JSON.parse(B.undo.pop()); B.sel = null;
    var c = compoOf(app.S.cache.compos, B.evtId);
    B.dirty = !c || B.mode === 'draft' || K.diff(c, B.d).length > 0 || JSON.stringify(c.reglages) !== JSON.stringify(B.d.reglages);
    if (B.dirty) saveDraft(); else dropDraft(B.evtId);
    rerenderKeep();
  };
  MC.act.cFix = function (b) {
    withC(function (C, e) {
      var al = K.alertes(B.d, C.F, C.H, presentsOf(C, e));
      var placed = []; B.d.equipes.forEach(function (t) { t.joueurs.forEach(function (j) { placed.push(j.id); }); });
      if (placed.some(function (id) { return presentsOf(C, e).indexOf(id) < 0; })) al.unshift({ fix: null });
      var a = al[Number(b.getAttribute('data-i'))];
      if (!a || !a.fix) return;
      var fx = a.fix;
      change(function () { B.d = fx.t === 'swap' ? K.swap(B.d, fx.a, fx.b) : K.moveTo(B.d, fx.id, fx.vers, C.F); });
      ui.toast(fx.texte);
    });
  };
  MC.act.cPostes = function () {
    withC(function (C) {
      change(function () {
        B.d.equipes.forEach(function (t) {
          var po = K.apparier(t.joueurs.map(function (j) { return j.id; }), C.F).poste;
          t.joueurs.forEach(function (j) { j.poste = po[j.id] || ''; });
        });
      });
      ui.toast('Postes répartis d\'après les vœux');
    });
  };
  MC.act.cRegl = function () {
    if (!B || !B.d) return;
    var reg = JSON.parse(JSON.stringify(B.d.reglages));
    function body() {
      return '<div class="grid2">' + K.FORMATS.map(function (f) { return '<button type="button" class="opt' + (reg.format === f ? ' on' : '') + '" data-rf="' + f + '">Jeu à ' + f + '</button>'; }).join('') + '</div>' +
        K.NIV.map(function (n) {
          return '<div class="cstep" style="--lc:' + K.COUL_NIV[n] + '"><span class="row" style="gap:8px">' + niveauTag(n) + '<b>' + K.NOM_NIV[n] + '</b></span><span class="row" style="gap:6px"><button type="button" class="ibtn" data-rn="' + n + '" data-d="-1">' + icon('minus', 18) + '</button><output class="cnbv">' + reg.nb[n] + '</output><button type="button" class="ibtn" data-rn="' + n + '" data-d="1">' + icon('plus', 18) + '</button></span></div>';
        }).join('') + '<p class="small" style="margin:0">« Proposer à nouveau » refait toute la compo. « Garder mes placements » ajoute ou enlève seulement des équipes (les joueurs d\'une équipe enlevée passent en « Pas placés »).</p>';
    }
    ui.modal({
      title: 'Réglages', body: '<div class="sec creg">' + body() + '</div>',
      actions: [{ label: 'Proposer à nouveau', value: 'new', cls: 'btn' }, { label: 'Garder mes placements', value: 'keep', cls: 'btn2' }, { label: 'Annuler', value: null, cls: 'btn2 grey' }],
      onOpen: function (host) {
        host.addEventListener('click', function (ev) {
          var f = ev.target.closest('[data-rf]'), n = ev.target.closest('[data-rn]');
          if (f) reg.format = Number(f.getAttribute('data-rf'));
          else if (n) { var k = n.getAttribute('data-rn'); reg.nb[k] = Math.max(0, Math.min(6, reg.nb[k] + Number(n.getAttribute('data-d')))); }
          else return;
          host.querySelector('.creg').innerHTML = body();
        });
      }
    }).then(function (v) {
      if (!v) return;
      if (v === 'new') { B.reg = reg; MC.act.cPropose(); return; }
      change(function () {
        var ids = K.teamIds(reg.nb), keep = [], banc = (B.d.banc || []).slice();
        B.d.equipes.forEach(function (t) { if (ids.indexOf(t.id) >= 0) keep.push(t); else t.joueurs.forEach(function (j) { banc.push(j.id); }); });
        ids.forEach(function (id) { if (!keep.some(function (t) { return t.id === id; })) keep.push({ id: id, niveau: id.charAt(0), joueurs: [] }); });
        keep.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
        if (reg.format !== 10) keep.forEach(function (t) { t.joueurs.forEach(function (j) { j.poste = ''; }); });
        B.d.equipes = keep; B.d.banc = banc; B.d.reglages = reg;
      });
    });
  };
  function askText(title, lead, ph, required, okLabel, cls) {
    return ui.modal({
      title: title, body: '<p class="lead" style="font-size:14px">' + lead + '</p><label class="sr-only" for="cjust">' + esc(title) + '</label><textarea id="cjust" class="txt" rows="4" maxlength="600" placeholder="' + esc(ph) + '"></textarea>',
      actions: [{ label: okLabel, cls: cls || 'btn', onClick: function (host, close) {
        var v = host.querySelector('#cjust').value.trim();
        if (required && v.length < 3) { ui.toast('Quelques mots pour expliquer, s\'il vous plaît.', true); return; }
        close({ text: v });
      } }, { label: 'Annuler', value: null, cls: 'btn2 grey' }],
      onOpen: function (host) { setTimeout(function () { var t = host.querySelector('#cjust'); if (t) t.focus(); }, 60); }
    });
  }
  function afterSave(msg) {
    var id = B.evtId; dropDraft(id); B = null;
    return loadCompos(true).then(function () { ui.toast(msg); app.rerender(); });
  }
  function onErr(e) {
    if (e.code === 'conflit') { ui.toast(e.message, true); loadCompos(true).then(function () { B = null; app.rerender(); }); return; }
    ui.toast(e.message, true);
  }
  MC.act.cPublish = function () {
    if (!B || !B.d) return;
    askText('Publier la compo', 'Elle devient la compo du plateau pour tous les éducs. Un mot pour expliquer vos choix ? (facultatif)', 'Ex. : Tom monte en A, c\'est son tour.', false, 'Publier').then(function (r) {
      if (!r) return;
      app.adultCall('saveCompo', { evenementId: B.evtId, reglages: B.d.reglages, equipes: B.d.equipes, banc: B.d.banc, raisons: B.d.raisons, justification: r.text }).then(function () { return afterSave('Compo publiée'); }).catch(onErr);
    });
  };
  MC.act.cSave = function () {
    if (!B || !B.d) return;
    var c = compoOf(app.S.cache.compos, B.evtId);
    askText('Enregistrer les changements', 'Ce qui a changé, en quelques mots (facultatif) : les autres éducs le verront dans les versions.', 'Ex. : Inès blessée, Malo la remplace.', false, 'Enregistrer').then(function (r) {
      if (!r) return;
      app.adultCall('saveCompo', { evenementId: B.evtId, compoId: B.compoId, version: c ? c.version : B.base, reglages: B.d.reglages, equipes: B.d.equipes, banc: B.d.banc, raisons: B.d.raisons, note: r.text }).then(function () { return afterSave('Compo enregistrée'); }).catch(onErr);
    });
  };
  MC.act.cDiscard = function () {
    var draft = B && B.mode === 'draft';
    ui.modal({ title: draft ? 'Effacer le brouillon ?' : 'Annuler vos changements ?', body: '<p class="lead">' + (draft ? 'On revient aux réglages.' : 'On revient à la compo publiée.') + '</p>', actions: [{ label: draft ? 'Effacer' : 'Oui, annuler', value: true, cls: 'btn pink' }, { label: 'Non', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok || !B) return;
      dropDraft(B.evtId); var keepReg = draft ? B.d.reglages : null; B = null;
      app.rerender();
      if (keepReg) setTimeout(function () { if (B) B.reg = { format: keepReg.format, nb: keepReg.nb }; app.rerender(); }, 0);
    });
  };
  MC.act.cCounter = function () { if (!B) return; B.mode = 'counter'; B.sel = null; app.rerender(); ui.toast('Déplacez les joueurs, puis envoyez votre proposition'); };
  MC.act.cSendCounter = function () {
    var c = B && compoOf(app.S.cache.compos, B.evtId);
    if (!c) return;
    askText('Contre-proposition', 'Pour ' + esc(c.auteurNom) + ' : pourquoi ces changements ? (obligatoire)', 'Ex. : Léo n\'a pas encore de copain dans son équipe.', true, 'Envoyer', 'btn pink').then(function (r) {
      if (!r) return;
      app.adultCall('contreProposition', { compoId: c.id, equipes: B.d.equipes, banc: B.d.banc, justification: r.text }).then(function () { return afterSave('Contre-proposition envoyée à ' + c.auteurNom); }).catch(onErr);
    });
  };
  MC.act.cRetirer = function () {
    var c = B && compoOf(app.S.cache.compos, B.evtId);
    if (!c) return;
    ui.modal({ title: 'Retirer la compo ?', body: '<p class="lead">Le plateau n\'a plus de compo : on repart des réglages. Les contre-propositions en attente sont retirées aussi.</p>', actions: [{ label: 'Retirer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('retirerCompo', { compoId: c.id }).then(function () { return afterSave('Compo retirée'); }).catch(onErr);
    });
  };
  document.addEventListener('hashchange', function () {
    if (B && location.hash.indexOf('#/educ/compo/' + B.evtId) !== 0) { if (!B.dirty) B = null; else B.sel = null; }
  });

  // ======================================================================
  // Une contre-proposition : les changements, la réponse de l'auteur
  // ======================================================================
  app.route('/educ/avis/:id', function (p, q, cur) {
    return both().then(function (r) {
      var C = ctxOf(r[0], r[1]), a = C.cd.avis.filter(function (x) { return x.id === p.id; })[0];
      if (!a) return '<main class="screen">' + MC.educBar(C.g, 'Contre-proposition', '#/educ/compos', 'Les compos') + '<div class="empty">Introuvable.</div></main>';
      var c = C.cd.compos.filter(function (x) { return x.id === a.compoId; })[0];
      var e = c && C.evts[c.evenementId];
      afterPaint(cur);
      return paintAvis(C, a, c, e);
    });
  }, { adult: 'e', nav: 'e:compos', bg: BG });
  function paintAvis(C, a, c, e) {
    var moves = a.changements.map(function (m) {
      var de = m.de === 'banc' ? 'pas placé' : m.de || '—', vers = m.vers === 'banc' ? 'pas placé' : m.vers || '—';
      return '<li class="li"><span class="grow"><span class="t1">' + esc(nom(C, m.id)) + '</span><span class="t2">' + (m.de !== m.vers ? esc(de) + ' → <b style="color:var(--ink)">' + esc(vers) + '</b>' : 'poste : ' + esc(COURT[m.posteDe] || 'remp.') + ' → <b style="color:var(--ink)">' + esc(COURT[m.poste] || 'remp.') + '</b>') + '</span></span></li>';
    }).join('');
    var moved = {}; a.changements.forEach(function (m) { moved[m.id] = true; });
    var att = a.statut === 'attente', me = C.moi;
    var canDecide = att && c && (c.auteur === me.id || me.admin), mine = att && a.auteur === me.id;
    var prev = { reglages: c ? c.reglages : { format: 5 }, equipes: a.equipes, banc: a.banc };
    var saveB = B; B = { d: prev, sel: null, mode: 'view', undo: [] };
    var cols = prev.equipes.map(function (t) { return column(C, t, K.stats(t, C.F, prev.reglages.format), moved); }).join('') +
      (prev.banc.length ? '<section class="ccol banc"><div class="chd"><b class="ctid" style="font-size:14px">Pas placés</b></div><ul class="cpl">' + prev.banc.map(function (id) { return chip(C, null, { id: id }, moved[id]); }).join('') + '</ul></section>' : '');
    B = saveB;
    var stale = att && c && Number(a.version) !== Number(c.version);
    var etat = att ? '<span class="pill" style="--pc:var(--pink)">En attente</span>' : '<span class="pill" style="--pc:' + (a.statut === 'acceptee' ? 'var(--green)' : 'var(--line3);color:var(--ink)') + '">' + ({ acceptee: 'Acceptée', refusee: 'Refusée', retiree: 'Retirée' }[a.statut] || a.statut) + '</span>';
    return '<main class="screen cscreen">' + MC.educBar(C.g, 'Contre-proposition', e ? '#/educ/compo/' + e.id : '#/educ/compos', e ? 'La compo' : 'Les compos') +
      '<div class="head"><span class="kicker" style="color:var(--pink)">' + (e ? esc(e.titre) + ' · ' : '') + 'compo de ' + esc(c ? c.auteurNom : '?') + '</span><h1 class="big sm">De ' + esc(a.auteurNom) + '</h1>' +
      '<div class="row" style="gap:8px">' + etat + '<span class="small">' + esc(ui.fmtDate(localDay(a.cree))) + '</span></div></div>' +
      '<div class="box"><span class="mlab">Pourquoi</span><p style="margin:0">« ' + esc(a.justification) + ' »</p>' + (a.reponse ? '<span class="mlab" style="margin-top:10px">Réponse de ' + esc(a.parQui || '') + '</span><p style="margin:0">« ' + esc(a.reponse) + ' »</p>' : '') + '</div>' +
      '<section class="sec"><h2 class="h2">' + a.changements.length + ' changement' + (a.changements.length > 1 ? 's' : '') + '</h2><ul class="list">' + moves + '</ul>' +
      (stale ? '<p class="small" style="margin:0;color:var(--gold)">La compo a changé depuis (version ' + c.version + ') : en acceptant, seuls ces changements-là sont appliqués.</p>' : '') + '</section>' +
      '<section class="sec"><h2 class="h2">La compo proposée</h2><p class="small" style="margin:0">Les joueurs déplacés sont entourés.</p><div class="cboard" style="--n:' + (prev.equipes.length + (prev.banc.length ? 1 : 0)) + '">' + cols + '</div></section>' +
      (canDecide ? '<div class="cp-bar cdock"><div class="row cacts"><button type="button" class="btn2 sm grey" data-act="aRefuse" data-id="' + esc(a.id) + '">Refuser</button><button type="button" class="btn sm green" data-act="aAccept" data-id="' + esc(a.id) + '">' + icon('check', 16) + ' Accepter</button></div></div>' : '') +
      (mine ? '<button type="button" class="btn2 grey" data-act="aWithdraw" data-id="' + esc(a.id) + '">Retirer ma contre-proposition</button>' : '') +
      (att && !canDecide && !mine ? '<p class="small" style="margin:0">C\'est à ' + esc(c ? c.auteurNom : 'l\'auteur') + ' de répondre.</p>' : '') +
      '</main>';
  }
  function avisAnswer(id, params, msg) {
    params.avisId = id;
    return app.adultCall('repondreAvis', params).then(function () { return loadCompos(true); }).then(function () { B = null; ui.toast(msg); app.rerender(); }).catch(function (e) { ui.toast(e.message, true); });
  }
  MC.act.aAccept = function (b) {
    var id = b.getAttribute('data-id');
    askText('Accepter', 'Les changements passent dans la compo. Un mot pour ' + 'l\'auteur ? (facultatif)', 'Ex. : Bien vu, merci !', false, 'Accepter', 'btn green').then(function (r) { if (r) avisAnswer(id, { accepte: true, reponse: r.text }, 'Contre-proposition acceptée'); });
  };
  MC.act.aRefuse = function (b) {
    var id = b.getAttribute('data-id');
    askText('Refuser', 'Pourquoi on garde la compo telle quelle ? (une phrase suffit)', 'Ex. : On garde Tom en A : c\'est son tour.', true, 'Refuser', 'btn pink').then(function (r) { if (r) avisAnswer(id, { accepte: false, reponse: r.text }, 'Contre-proposition refusée'); });
  };
  MC.act.aWithdraw = function (b) { avisAnswer(b.getAttribute('data-id'), { retirer: true }, 'Contre-proposition retirée'); };

  // ======================================================================
  // Fiche terrain du groupe : niveaux, passerelles, plaquage (réglés par les éducs)
  // ======================================================================
  var T = { chg: {}, filtre: 'all', q: '' };
  app.route('/educ/terrain', function () {
    return MC.loadGroup().then(function (g) { return paintTerrain(g); });
  }, { adult: 'e', nav: 'e:compos', bg: BG });
  function tVal(F, id, k) { var c = T.chg[id]; return c && c[k] !== undefined ? c[k] : (F[id] || {})[k]; }
  function tSet(id, k, v, F) {
    var c = T.chg[id] || (T.chg[id] = {});
    c[k] = v;
    if (k === 'niveau') { var p = tVal(F, id, 'passerelle'); if (p && Math.abs(K.NIV.indexOf(p) - K.NIV.indexOf(v)) !== 1) c.passerelle = ''; }
    // rien de changé au final : on retire
    var f = F[id] || {};
    Object.keys(c).forEach(function (x) { if (c[x] === f[x]) delete c[x]; });
    if (!Object.keys(c).length) delete T.chg[id];
  }
  function rowTerrain(F, id) {
    var f = F[id], niv = tVal(F, id, 'niveau'), pas = tVal(F, id, 'passerelle'), pl = tVal(F, id, 'plaquage') || 0;
    var segs = K.NIV.map(function (n) { return '<button type="button" class="tlv' + (niv === n ? ' on' : '') + '" style="--lc:' + K.COUL_NIV[n] + '" aria-pressed="' + (niv === n) + '" data-act="tNiv" data-id="' + esc(id) + '" data-v="' + n + '" title="' + K.NOM_NIV[n] + '">' + n + '</button>'; }).join('');
    var pasOpts = niv ? K.NIV.filter(function (n) { return Math.abs(K.NIV.indexOf(n) - K.NIV.indexOf(niv)) === 1; }) : [];
    var pasB = pasOpts.map(function (n) { return '<button type="button" class="tpas' + (pas === n ? ' on' : '') + '" aria-pressed="' + (pas === n) + '" data-act="tPas" data-id="' + esc(id) + '" data-v="' + n + '" title="Passerelle vers ' + K.NOM_NIV[n] + '">⇅ ' + n + '</button>'; }).join('');
    var st = '';
    for (var i = 1; i <= 5; i++) st += '<button type="button" class="tst' + (i <= pl ? ' on' : '') + '" data-act="tPl" data-id="' + esc(id) + '" data-v="' + i + '" aria-label="' + i + ' étoile' + (i > 1 ? 's' : '') + '">' + icon('star', 16) + '</button>';
    return '<li class="tfrow' + (T.chg[id] ? ' changed' : '') + '"><a class="tnm" href="#/educ/joueur/' + esc(id) + '">' + esc(f.prenom) + (f.voeux.length ? '<small>' + esc(f.voeux.map(function (p) { return COURT[p]; }).join(' · ')) + '</small>' : '') + '</a>' +
      '<span class="tseg" role="group" aria-label="Niveau de ' + esc(f.prenom) + '">' + segs + '</span><span class="tpasw">' + (pasB || '<span class="small" style="color:var(--faint)">—</span>') + '</span>' +
      '<span class="tstars" role="group" aria-label="Plaquage de ' + esc(f.prenom) + '">' + st + '</span></li>';
  }
  function paintTerrain(g) {
    var F = K.fiches(g);
    var ids = Object.keys(F).filter(function (id) { return F[id].actif && !/^test$/i.test(F[id].prenom); }).sort(function (a, b) { return F[a].prenom.localeCompare(F[b].prenom, 'fr'); });
    var cnt = { all: ids.length, '': 0, A: 0, B: 0, C: 0 };
    ids.forEach(function (id) { cnt[tVal(F, id, 'niveau') || '']++; });
    var q = T.q.toLowerCase();
    var list = ids.filter(function (id) {
      var n = (T.chg[id] ? F[id].niveau : tVal(F, id, 'niveau')) || '';   // un joueur qu'on vient de modifier reste dans la liste filtrée
      if (T.filtre !== 'all' && n !== (T.filtre === 'none' ? '' : T.filtre)) return false;
      return !q || F[id].prenom.toLowerCase().indexOf(q) >= 0;
    });
    var nchg = Object.keys(T.chg).length;
    function fb(v, label, n, col) { return '<button type="button" class="opt' + (T.filtre === v ? ' on' : '') + '"' + (col ? ' style="--oc:' + col + '"' : '') + ' aria-pressed="' + (T.filtre === v) + '" data-act="tFiltre" data-v="' + v + '">' + label + ' · ' + n + '</button>'; }
    return '<main class="screen">' + MC.educBar(g, 'Fiche terrain', '#/educ/compos', 'Les compos') +
      '<div class="head"><span class="kicker" style="color:var(--cyan)">Réglée par les éducs · pour les compos</span><h1 class="big sm">Fiche terrain</h1>' +
      '<p class="small" style="margin:0"><b>A</b> Confirmés · <b>B</b> Débrouillés · <b>C</b> Débutants. <b>⇅</b> passerelle : peut jouer aussi dans le niveau voisin, à tour de rôle. ' + icon('star', 11) + ' plaquage sur 5 (repères provisoires : ' + K.SEUIL.B + ' pour jouer en B, ' + K.SEUIL.A + ' en A ; l\'appli prévient, elle n\'interdit rien). Les postes compatibles se règlent sur la fiche du joueur.</p></div>' +
      '<label class="sr-only" for="tq">Chercher un joueur</label><input id="tq" class="search" type="search" placeholder="Chercher un prénom…" value="' + esc(T.q) + '">' +
      '<div class="tfil">' + fb('all', 'Tous', cnt.all) + fb('none', 'Sans niveau', cnt[''], 'var(--orange)') + fb('A', 'A', cnt.A, K.COUL_NIV.A) + fb('B', 'B', cnt.B, K.COUL_NIV.B) + fb('C', 'C', cnt.C, K.COUL_NIV.C) + '</div>' +
      '<div class="thead small"><span>Joueur</span><span>Niveau</span><span>Passerelle</span><span>Plaquage</span></div>' +
      '<ul class="list tlist" id="tlist">' + (list.map(function (id) { return rowTerrain(F, id); }).join('') || '<li class="empty">Personne.</li>') + '</ul>' +
      (nchg ? '<div class="cp-bar cdock"><div class="row cacts"><span class="grow small" style="color:var(--soft)">' + nchg + ' joueur' + (nchg > 1 ? 's' : '') + ' modifié' + (nchg > 1 ? 's' : '') + '</span><button type="button" class="btn2 sm grey" data-act="tCancel">Annuler</button><button type="button" class="btn sm" data-act="tSave">' + icon('check', 16) + ' Enregistrer</button></div></div>' : '') +
      '</main>';
  }
  function tRepaint() { app.rerender(); }
  MC.act.tNiv = function (b) { var F = K.fiches(app.S.cache.group), id = b.getAttribute('data-id'), v = b.getAttribute('data-v'); tSet(id, 'niveau', tVal(F, id, 'niveau') === v ? '' : v, F); tRepaint(); };
  MC.act.tPas = function (b) { var F = K.fiches(app.S.cache.group), id = b.getAttribute('data-id'), v = b.getAttribute('data-v'); tSet(id, 'passerelle', tVal(F, id, 'passerelle') === v ? '' : v, F); tRepaint(); };
  MC.act.tPl = function (b) { var F = K.fiches(app.S.cache.group), id = b.getAttribute('data-id'), v = Number(b.getAttribute('data-v')); tSet(id, 'plaquage', (tVal(F, id, 'plaquage') || 0) === v ? v - 1 : v, F); tRepaint(); };
  MC.act.tFiltre = function (b) { T.filtre = b.getAttribute('data-v'); app.rerender(); };
  MC.act.tCancel = function () { T.chg = {}; app.rerender(); };
  MC.act.tSave = function (b) {
    var lignes = Object.keys(T.chg).map(function (id) { var o = { joueurId: id }; for (var k in T.chg[id]) o[k] = T.chg[id][k]; return o; });
    if (!lignes.length) return;
    b.disabled = true;
    app.adultCall('setTerrain', { lignes: lignes }).then(function (r) {
      patchTerrain(r.terrain);
      T.chg = {}; ui.toast('Fiche terrain enregistrée (' + Object.keys(r.terrain).length + ')'); app.rerender();
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  function patchTerrain(map) {
    var g = app.S.cache.group;
    if (!g) return;
    g.joueurs.forEach(function (p) { if (map[p.joueur.id]) p.terrain = map[p.joueur.id]; });
    app.lsSet('mc-group', { tok: app.S.adult.token, data: g });
  }
  var tTimer = null;
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'tq') return;
    T.q = e.target.value;
    clearTimeout(tTimer);
    tTimer = setTimeout(function () {
      var tmp = document.createElement('div'); tmp.innerHTML = paintTerrain(app.S.cache.group);
      var nl = tmp.querySelector('#tlist'), ol = document.getElementById('tlist');
      if (nl && ol) ol.innerHTML = nl.innerHTML;
    }, 150);
  });
  document.addEventListener('hashchange', function () { if (location.hash !== '#/educ/terrain' && Object.keys(T.chg).length) { T.chg = {}; } });

  // ======================================================================
  // Sur la fiche d'un joueur (éduc) : sa fiche terrain et ses plateaux
  // ======================================================================
  var TK = null;   // fiche en cours de modification : { id, niveau, passerelle, plaquage, postesOk }
  MC.terrainKid = function (d, g) {
    var id = d.joueur.id, F = K.fiches(g), f = F[id];
    if (!f) return '';
    var cd = app.S.cache.compos;
    if (!cd) loadCompos().then(function () { if (location.hash === '#/educ/joueur/' + id) app.rerender(); }).catch(function () { });
    var H = cd ? (function () { var ev = {}; cd.evenements.forEach(function (e) { ev[e.id] = e; }); return K.historique(cd.compos, ev, F, L.today()); })() : {};
    var h = K.hOf(H, id);
    var ed = TK && TK.id === id ? TK : null;
    var body;
    if (ed) {
      var pasOpts = ed.niveau ? K.NIV.filter(function (n) { return Math.abs(K.NIV.indexOf(n) - K.NIV.indexOf(ed.niveau)) === 1; }) : [];
      var st = '';
      for (var i = 1; i <= 5; i++) st += '<button type="button" class="tst' + (i <= ed.plaquage ? ' on' : '') + '" data-act="tkPl" data-v="' + i + '" aria-label="' + i + ' étoile' + (i > 1 ? 's' : '') + '">' + icon('star', 20) + '</button>';
      body = '<span class="mlab">Niveau</span><div class="seg3">' + K.NIV.map(function (n) { return '<button type="button" class="opt' + (ed.niveau === n ? ' on' : '') + '" style="--oc:' + K.COUL_NIV[n] + '" aria-pressed="' + (ed.niveau === n) + '" data-act="tkNiv" data-v="' + n + '">' + n + ' · ' + K.NOM_NIV[n] + '</button>'; }).join('') + '</div>' +
        '<span class="mlab">Passerelle (peut jouer aussi en…)</span><div class="row" style="gap:8px;flex-wrap:wrap">' + (pasOpts.length ? pasOpts.map(function (n) { return '<button type="button" class="opt' + (ed.passerelle === n ? ' on' : '') + '" style="--oc:var(--violet);min-width:120px" aria-pressed="' + (ed.passerelle === n) + '" data-act="tkPas" data-v="' + n + '">⇅ ' + n + ' · ' + K.NOM_NIV[n] + '</button>'; }).join('') : '<span class="small">Choisissez d\'abord le niveau.</span>') + '</div>' +
        '<span class="mlab">Plaquage (sur 5)</span><span class="tstars big">' + st + '</span>' +
        '<span class="mlab">Postes compatibles (jeu à 10)</span><div class="tpostes">' + K.POSTES10.map(function (p) {
          var on = ed.postesOk.indexOf(p[0]) >= 0, r = f.voeux.indexOf(p[0]);
          return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="tkPoste" data-v="' + p[0] + '"><span class="nm">' + esc(K.nomPoste(p[0])) + (r >= 0 ? ' <small style="color:var(--gold)">vœu ' + (r + 1) + '</small>' : '') + '</span><span class="ck">' + icon('check', 14) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="grid2"><button type="button" class="btn2 grey" data-act="tkCancel">Annuler</button><button type="button" class="btn" data-act="tkSave">' + icon('check', 16) + ' Enregistrer</button></div>';
    } else {
      body = '<div class="row" style="gap:12px;flex-wrap:wrap">' + niveauTag(f.niveau) + '<span class="grow"><b>' + (f.niveau ? K.NOM_NIV[f.niveau] : 'Niveau à renseigner') + '</b>' + (f.passerelle ? ' <span style="color:var(--violet)">· passerelle ⇅ ' + f.passerelle + '</span>' : '') +
        '<span class="small" style="display:block;margin-top:4px">Plaquage ' + starsMini(f.plaquage) + '</span></span></div>' +
        '<div><span class="mlab">Postes compatibles</span>' + (f.postesOk.length ? MC.ptags(f.postesOk) : '<span class="small">' + (f.voeux.length ? 'Pas encore cochés (ses vœux comptent déjà).' : 'Aucun pour l\'instant.') + '</span>') + '</div>' +
        '<button type="button" class="btn2" data-act="tkEdit" data-id="' + esc(id) + '">' + icon('edit', 16) + ' Modifier</button>';
    }
    var hl = h.liste.slice().reverse().slice(0, 8).map(function (x) {
      return '<li><b>' + esc(x.titre) + '</b> · ' + esc(ui.fmtDate(x.date)) + ' · ' + esc(x.equipe) + (x.poste ? ' (' + esc(K.nomPoste(x.poste)) + ')' : '') + (x.autre ? ' · <span style="color:var(--violet)">hors niveau</span>' : '') +
        (x.copains.length ? ' · avec ' + esc(x.copains.map(function (c) { return (F[c] || {}).prenom || '?'; }).join(', ')) : '') + '</li>';
    }).join('');
    var sp = (g.joueurs.filter(function (p) { return p.joueur.id === id; })[0] || {}).terrain;
    return '<section class="sec"><div class="between"><h2 class="h2">Sur le terrain</h2>' + (f.niveau ? '' : '<span class="pill" style="--pc:var(--orange)">À renseigner</span>') + '</div><div class="box" style="display:flex;flex-direction:column;gap:12px">' + body + '</div>' +
      '<div class="box" style="display:flex;flex-direction:column;gap:8px"><span class="mlab" style="margin:0">Ses plateaux</span>' +
      (h.plateaux ? '<span class="small" style="color:var(--soft)">' + h.plateaux + ' plateau' + (h.plateaux > 1 ? 'x' : '') + ' · ' + h.autre + ' hors de son niveau' + (f.copains.length ? ' · avec un copain ' + h.avecCopain + ' fois' : '') + (h.sansCopainSerie ? ' · <b style="color:var(--orange)">sans copain la dernière fois</b>' : '') + '</span><ul class="small" style="margin:0;padding-left:18px;line-height:1.5;color:var(--soft)">' + hl + '</ul>' : '<span class="small">' + (cd ? 'Pas encore de plateau avec une compo dans l\'appli.' : 'Chargement…') + '</span>') +
      '<span class="small" style="color:var(--faint)">Spond : ' + (sp && sp.spondId ? 'relié' : 'pas encore relié') + '</span></div></section>';
  };
  MC.act.tkEdit = function (b) {
    var F = K.fiches(app.S.cache.group), f = F[b.getAttribute('data-id')];
    if (!f) return;
    TK = { id: f.id, niveau: f.niveau, passerelle: f.passerelle, plaquage: f.plaquage, postesOk: (f.postesOk.length ? f.postesOk : f.voeux).slice() };
    app.rerender();
  };
  MC.act.tkCancel = function () { TK = null; app.rerender(); };
  MC.act.tkNiv = function (b) { if (!TK) return; TK.niveau = b.getAttribute('data-v'); if (TK.passerelle && Math.abs(K.NIV.indexOf(TK.passerelle) - K.NIV.indexOf(TK.niveau)) !== 1) TK.passerelle = ''; app.rerender(); };
  MC.act.tkPas = function (b) { if (!TK) return; var v = b.getAttribute('data-v'); TK.passerelle = TK.passerelle === v ? '' : v; app.rerender(); };
  MC.act.tkPl = function (b) { if (!TK) return; var v = Number(b.getAttribute('data-v')); TK.plaquage = TK.plaquage === v ? v - 1 : v; app.rerender(); };
  MC.act.tkPoste = function (b) { if (!TK) return; var v = b.getAttribute('data-v'), i = TK.postesOk.indexOf(v); if (i >= 0) TK.postesOk.splice(i, 1); else TK.postesOk.push(v); app.rerender(); };
  MC.act.tkSave = function (b) {
    if (!TK) return;
    b.disabled = true;
    app.adultCall('setTerrain', { lignes: [{ joueurId: TK.id, niveau: TK.niveau, passerelle: TK.passerelle, plaquage: TK.plaquage, postesOk: TK.postesOk }] }).then(function (r) {
      patchTerrain(r.terrain); TK = null; ui.toast('Fiche terrain enregistrée'); app.rerender();
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  document.addEventListener('hashchange', function () { TK = null; });
})();
