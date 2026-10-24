/* =========================================================
   Mode champion · M12 — ÉDUCS : Progrès › Skills et Missions, le +1, la fiche d'un enfant
   - Skills : évaluer pendant la séance (domaine › étoile › les présents), le passeport du groupe,
     la journée d'évaluation (groupes qui tournent, 3 essais par critère, étoile à 2 sur 3).
   - Missions : pour le groupe (vidéo + questions, QCM, et « Prépare le jeu à 10 »),
     individuelles (décrocher une étoile précise).
   - Le +1 : d'un seul toucher sur la skill demandée, un mot si on veut. Jusqu'à 5 par mission ;
     au 3e, l'appli propose de valider l'étoile, sans rien faire toute seule.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, SK = MC.SK, M = MC.missions;
  var esc = ui.esc, icon = ui.icon;
  var BG = '#12333A';

  // ---------- données ----------
  function G() { return app.S.cache.group; }
  function persist() { var gr = G(); if (gr && app.S.adult) app.lsSet('mc-group', { tok: app.S.adult.token, data: gr }); }
  function jp(gr, id) { return gr.joueurs.filter(function (p) { return p.joueur.id === id; })[0] || null; }
  function actifs(gr) { return gr.joueurs.filter(function (p) { return p.joueur.actif && !/^test$/i.test(p.joueur.prenom); }).sort(function (a, b) { return a.joueur.prenom.localeCompare(b.joueur.prenom, 'fr'); }); }
  function persoDe(gr, id) { return SK.missionPerso({ defmissions: (gr.defmissions || []).filter(function (m) { return m.joueurId === id; }) }); }
  function persosToutes(gr, id) { return SK.missionPerso({ defmissions: (gr.defmissions || []).filter(function (m) { return m.joueurId === id; }) }, true); }
  function p1De(gr, id, mid) { var p = jp(gr, id); return p ? SK.plus1({ encouragements: p.encouragements || [] }, mid) : []; }
  function etoileDe(gr, id, d, e) { var p = jp(gr, id); return p ? (p.etoiles || []).filter(function (x) { return x.domaine === d && x.etoile === e; })[0] || null : null; }
  function both() { return Promise.all([MC.loadGroup(), MC.loadCompos ? MC.loadCompos().catch(function () { return null; }) : null]); }
  function jour(e) { return String(e.debut || '').slice(0, 10); }
  function evts() { var cd = app.S.cache.compos; return (cd && cd.evenements) || []; }
  function evtById(id) { return evts().filter(function (e) { return e.id === id; })[0] || null; }
  // l'entraînement ou le plateau du jour (pour l'occasion d'un +1 ou d'une étoile)
  function evtDuJour() { var t = L.today(); return evts().filter(function (e) { return !e.annule && jour(e) === t && (e.sorte === 'entrainement' || e.sorte === 'plateau'); })[0] || null; }
  function presentsDe(e, gr) { var ok = {}; actifs(gr).forEach(function (p) { ok[p.joueur.id] = true; }); return MC.compos.presents(e).filter(function (id) { return ok[id]; }); }
  function nomDe(gr, id) { var p = jp(gr, id); return p ? p.joueur.prenom : '?'; }
  function moiNom(gr) { return gr.moi.nom; }
  function qui(gr, x) { return x.parQui === gr.moi.id ? 'moi' : x.parNom; }
  function jourTxt(iso) { return iso ? ui.fmtDate(String(iso).slice(0, 10)) : ''; }
  var NIVC = { A: '#FFC23D', B: '#38E8FF', C: '#3DFFB0' };
  function nivTag(gr, id) { var p = jp(gr, id), n = p && p.terrain && p.terrain.niveau; return n ? '<span class="cniv" style="--lc:' + NIVC[n] + ';--s:22px">' + n + '</span>' : '<span class="cniv none" style="--s:22px">?</span>'; }

  // ======================================================================
  // Les gestes : +1, valider une étoile, retirer
  // ======================================================================
  function occasionCtx(evId) { var e = evId ? evtById(evId) : evtDuJour(); return { evenementId: e ? e.id : '', occasion: e && MC.evtOccasion ? MC.evtOccasion(e) : '' }; }
  function envoyerPlus1(jid, mid, evId, mot, btn) {
    var gr = G(), o = occasionCtx(evId), p = { joueurId: jid, missionId: mid || '', mot: mot || '', evenementId: o.evenementId, occasion: o.occasion };
    if (btn) btn.disabled = true;
    return app.adultCall('plusUn', p).then(function (r) {
      var x = jp(gr, jid); if (x) { x.encouragements = x.encouragements || []; x.encouragements.push(r.encouragement); }
      persist();
      var nom = nomDe(gr, jid);
      ui.toast(mid ? '+1 envoyé à ' + nom + ' (' + r.nb + ' / ' + r.max + ') : ' + nom + ' le voit' : 'Mot envoyé à ' + nom);
      if (mid && (r.nb === SK.PROPOSE_AU || r.nb === r.max)) proposerValidation(jid, mid, r.nb, evId);
      return r;
    }).catch(function (e) { if (btn) btn.disabled = false; ui.toast(e.message, true); throw e; });
  }
  // au 3e +1 (et au 5e), l'appli propose de valider l'étoile ; rien d'automatique
  function proposerValidation(jid, mid, n, evId) {
    var gr = G(), m = (gr.defmissions || []).filter(function (x) { return x.id === mid; })[0];
    if (!m || m.statut !== 'active') return;
    var s = SK.star(m.domaine, m.etoile), D = SK.dom(m.domaine), nom = nomDe(gr, jid);
    setTimeout(function () {
      ui.modal({
        title: (n === SK.PROPOSE_AU ? '3e +1' : n + ' +1') + ' pour ' + esc(nom),
        body: '<p class="lead">« ' + esc(SK.titreMission(m)) + ' » : ' + esc(nom) + ' est sur la bonne voie. Valider l\'étoile <b>' + esc(D.nom + ' · ' + s.nom) + '</b> maintenant ?</p><p class="small">Rien d\'automatique : c\'est vous qui décidez. Vous pourrez aussi la valider plus tard.</p>',
        actions: [{ label: icon('star', 18) + ' Valider l\'étoile', value: 'ok', cls: 'btn gold' }, { label: 'Plus tard', value: null, cls: 'btn2 grey' }]
      }).then(function (v) { if (v === 'ok') valider([{ joueurId: jid, domaine: m.domaine, etoile: m.etoile }], evId).then(function () { app.rerender(); }); else app.rerender(); });
    }, 120);
  }
  function valider(list, evId, btn) {
    var gr = G(), o = occasionCtx(evId);
    if (btn) btn.disabled = true;
    return app.adultCall('validerEtoiles', { etoiles: list, evenementId: o.evenementId, occasion: o.occasion }).then(function (r) {
      r.etoiles.forEach(function (e) { var x = jp(gr, e.joueurId); if (x) { x.etoiles = x.etoiles || []; x.etoiles.push(e); } });
      (r.missionsFaites || []).forEach(function (id) { (gr.defmissions || []).forEach(function (m) { if (m.id === id) { m.statut = 'faite'; m.faiteLe = L.today(); } }); });
      persist();
      if (r.etoiles.length === 1) { var e0 = r.etoiles[0], s = SK.star(e0.domaine, e0.etoile); ui.toast('★ ' + (s ? s.nom : 'Étoile') + ' validée pour ' + nomDe(gr, e0.joueurId) + (r.missionsFaites && r.missionsFaites.length ? ' · mission réussie !' : '')); }
      else ui.toast(r.etoiles.length + ' étoile' + (r.etoiles.length > 1 ? 's' : '') + ' validée' + (r.etoiles.length > 1 ? 's' : '') + (r.deja ? ' · ' + r.deja + ' déjà acquise' + (r.deja > 1 ? 's' : '') : ''));
      return r;
    }).catch(function (e) { if (btn) btn.disabled = false; ui.toast(e.message, true); throw e; });
  }
  MC.act.plus1 = function (b) {
    envoyerPlus1(b.getAttribute('data-j'), b.getAttribute('data-m'), b.getAttribute('data-ev'), '', b).then(function (r) { if (!(r.nb === SK.PROPOSE_AU || r.nb === r.max)) app.rerender(); }).catch(function () { });
  };
  MC.act.valEtoile = function (b) {
    valider([{ joueurId: b.getAttribute('data-j'), domaine: b.getAttribute('data-d'), etoile: b.getAttribute('data-e') }], b.getAttribute('data-ev'), b).then(function () { app.rerender(); }).catch(function () { });
  };
  MC.act.retEtoile = function (b) {
    var gr = G(), id = b.getAttribute('data-id'), jid = b.getAttribute('data-j'), x = jp(gr, jid), e = x && (x.etoiles || []).filter(function (y) { return y.id === id; })[0];
    if (!e) return;
    var s = SK.star(e.domaine, e.etoile);
    ui.modal({ title: 'Retirer cette étoile ?', body: '<p class="lead">L\'étoile <b>' + esc(SK.dom(e.domaine).nom + ' · ' + (s ? s.nom : '')) + '</b> de ' + esc(x.joueur.prenom) + ' a été validée par erreur ? Elle redevient grise pour lui (et sa mission perso repart si elle la visait).</p>', actions: [{ label: 'Retirer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('retirerEtoile', { id: id }).then(function (r) {
        x.etoiles = x.etoiles.filter(function (y) { return y.id !== id; });
        (r.missionsRouvertes || []).forEach(function (mid) { (gr.defmissions || []).forEach(function (m) { if (m.id === mid) { m.statut = 'active'; m.faiteLe = ''; } }); });
        persist(); ui.toast('Étoile retirée'); app.rerender();
      }).catch(function (er) { ui.toast(er.message, true); });
    });
  };
  MC.act.retPlus1 = function (b) {
    var gr = G(), id = b.getAttribute('data-id'), x = jp(gr, b.getAttribute('data-j'));
    ui.modal({ title: 'Retirer ce +1 ?', body: '<p class="lead">Donné par erreur ? Il disparaît pour l\'enfant et sa famille.</p>', actions: [{ label: 'Retirer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('retirerEncouragement', { id: id }).then(function () {
        if (x) x.encouragements = (x.encouragements || []).filter(function (y) { return y.id !== id; });
        persist(); ui.toast('Retiré'); app.rerender();
      }).catch(function (er) { ui.toast(er.message, true); });
    });
  };
  // le bouton +1 (et son état : combien, envoyé aujourd'hui, 5 atteints)
  function btnPlus1(gr, jid, m, evId, small) {
    var l = p1De(gr, jid, m.id), n = l.length, today = l.some(function (x) { return x.date === L.today(); });
    if (n >= SK.MAX_PLUS1) return '<span class="pill" style="--pc:var(--gold)">5 +1 · à valider</span>';
    return '<button type="button" class="p1btn' + (small ? ' sm' : '') + (today ? ' done' : '') + '" data-act="plus1" data-j="' + esc(jid) + '" data-m="' + esc(m.id) + '"' + (evId ? ' data-ev="' + esc(evId) + '"' : '') + ' aria-label="+1 pour ' + esc(nomDe(gr, jid)) + ' : ' + esc(SK.titreMission(m)) + '">+1</button>';
  }
  MC.btnPlus1 = btnPlus1;

  // ======================================================================
  // Sur la page d'un entraînement ou d'un plateau : évaluer des Skills, les missions des présents
  // ======================================================================
  MC.pendantSeance = function (gr, e, pres, train) {
    var rows = pres.map(function (id) { var m = persoDe(gr, id); return m ? { id: id, m: m } : null; }).filter(Boolean)
      .sort(function (a, b) { return nomDe(gr, a.id).localeCompare(nomDe(gr, b.id), 'fr'); });
    var list = rows.map(function (x) {
      var l = p1De(gr, x.id, x.m.id), n = l.length, today = l.filter(function (y) { return y.date === L.today(); })[0];
      return '<li class="mpres"><a class="grow" href="#/educ/joueur/' + esc(x.id) + '?t=missions"><span class="t1">' + esc(nomDe(gr, x.id)) + ' · ' + esc(SK.titreMission(x.m)) + '</span><span class="t2">' +
        (today ? '<b style="color:var(--green)">' + icon('check', 12) + ' +1 envoyé aujourd\'hui · il le voit</b>' : n + ' +1 reçu' + (n > 1 ? 's' : '')) + (n >= SK.PROPOSE_AU ? ' · étoile à valider quand vous voulez' : '') + '</span></a>' +
        '<a class="cbtn grey" href="#/educ/encourager/' + esc(x.id) + '?m=' + esc(x.m.id) + '&evt=' + esc(e.id) + '" aria-label="+1 avec un mot pour ' + esc(nomDe(gr, x.id)) + '">' + icon('edit', 16) + '</a>' + btnPlus1(gr, x.id, x.m, e.id) + '</li>';
    }).join('');
    return '<section class="sec"><h2 class="h2">' + (train ? 'Pendant la séance' : 'Pendant et après le plateau') + '</h2>' +
      '<a class="li" href="#/educ/skills?evt=' + esc(e.id) + '">' + icon('star', 20, 'style="color:var(--gold);flex:none"') + '<span class="grow"><span class="t1">Évaluer des Skills</span><span class="t2">Avec les ' + pres.length + ' présents du jour</span></span>' + icon('right', 16) + '</a>' +
      '<div class="between" style="margin-top:6px"><span class="mlab" style="margin:0">Missions des présents</span><span class="small">un toucher = +1</span></div>' +
      (list ? '<ul class="list">' + list + '</ul>' : '<p class="small" style="margin:0">Aucun présent n\'a de mission perso pour l\'instant. Donnez-en une depuis Progrès › Missions ou la fiche d\'un enfant.</p>') +
      '<button type="button" class="li" data-act="encAutre" data-ev="' + esc(e.id) + '">' + icon('heart', 20, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">Encourager un autre enfant</span><span class="t2">Un +1 avec un mot, sur sa mission ou autre chose</span></span>' + icon('right', 16) + '</button></section>';
  };
  MC.act.encAutre = function (b) {
    var gr = G(), evId = b.getAttribute('data-ev'), e = evtById(evId), ids = e ? presentsDe(e, gr) : actifs(gr).map(function (p) { return p.joueur.id; });
    ui.modal({
      title: 'Encourager qui ?',
      body: '<div class="kidpick">' + ids.map(function (id) { return '<button type="button" class="opt" data-encpick="' + esc(id) + '">' + esc(nomDe(gr, id)) + '</button>'; }).join('') + '</div>',
      actions: [{ label: 'Fermer', value: null, cls: 'btn2 grey' }],
      onOpen: function (host, close) {
        host.addEventListener('click', function (ev) { var x = ev.target.closest('[data-encpick]'); if (x) { close(null); app.go('#/educ/encourager/' + x.getAttribute('data-encpick') + (evId ? '?evt=' + evId : '')); } });
      }
    });
  };

  // ======================================================================
  // +1 avec un mot
  // ======================================================================
  var ENC = null;
  var CHIPS = ['Je l\'ai vu !', 'Bien mieux', 'Continue comme ça', 'Gros plaquage', 'Super passe', 'Quelle envie !'];
  app.route('/educ/encourager/:id', function (p, q) {
    return both().then(function (r) {
      var gr = r[0], x = jp(gr, p.id);
      if (!x) return '<main class="screen">' + MC.educBar(gr, 'Encourager', '#/educ/joueurs', 'Enfants') + '<div class="empty">Enfant introuvable.</div></main>';
      var m = persoDe(gr, p.id);
      if (!ENC || ENC.jid !== p.id) {
        var e0 = q.evt ? evtById(q.evt) : evtDuJour();
        ENC = { jid: p.id, quoi: m && (!q.m || q.m === m.id) && p1De(gr, p.id, m.id).length < SK.MAX_PLUS1 ? m.id : 'autre', ev: e0 ? e0.id : '', mot: '', retour: q.evt ? '#/educ/evt/' + q.evt : '#/educ/joueur/' + p.id + '?t=missions' };
      }
      return paintEnc(gr, x, m);
    });
  }, { adult: 'e', nav: 'e:enfants', bg: BG });
  function paintEnc(gr, x, m) {
    var nom = x.joueur.prenom, n = m ? p1De(gr, x.joueur.id, m.id).length : 0, plein = m && n >= SK.MAX_PLUS1;
    var t = L.today(), recents = evts().filter(function (e) { return !e.annule && jour(e) <= t && jour(e) >= L.addDays(t, -21) && (e.sorte === 'entrainement' || e.sorte === 'plateau'); })
      .sort(function (a, b) { return jour(a) < jour(b) ? 1 : -1; }).slice(0, 5);
    var quoi = '<div class="seg3" style="--n:2">' + (m ? '<button type="button" class="opt' + (ENC.quoi === m.id ? ' on' : '') + '" style="--oc:var(--gold)" aria-pressed="' + (ENC.quoi === m.id) + '" data-act="encQuoi" data-v="' + esc(m.id) + '"' + (plein ? ' disabled' : '') + '>★ ' + esc(SK.titreMission(m)) + (plein ? ' (5 +1)' : '') + '</button>' : '<span class="opt" style="opacity:.6">Pas de mission perso</span>') +
      '<button type="button" class="opt' + (ENC.quoi === 'autre' ? ' on' : '') + '" aria-pressed="' + (ENC.quoi === 'autre') + '" data-act="encQuoi" data-v="autre">Autre chose</button></div>';
    var quand = '<div class="cop-list" style="grid-template-columns:1fr">' + recents.map(function (e) {
      var on = ENC.ev === e.id;
      return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="encEv" data-v="' + esc(e.id) + '"><span class="nm">' + esc(MC.evtOccasion(e)) + '</span><span class="ck">' + icon('check', 14) + '</span></button>';
    }).join('') + '<button type="button" class="cop' + (!ENC.ev ? ' on' : '') + '" aria-pressed="' + !ENC.ev + '" data-act="encEv" data-v=""><span class="nm">Sans événement (aujourd\'hui)</span><span class="ck">' + icon('check', 14) + '</span></button></div>';
    var info = ENC.quoi !== 'autre' && m ? (n + 1 === SK.PROPOSE_AU ? 'Ce sera son 3e +1 : l\'appli te proposera de valider l\'étoile. Rien d\'automatique, c\'est toi qui décides.' : 'Ce sera son ' + (n + 1) + (n === 0 ? 'er' : 'e') + ' +1 sur ' + SK.MAX_PLUS1 + '.') : 'Sur autre chose : le mot est obligatoire.';
    return '<main class="screen">' + MC.educBar(gr, 'Encourager · ' + nom, ENC.retour, ENC.retour.indexOf('evt') >= 0 ? 'La séance' : nom) +
      '<div class="head"><span class="kicker" style="color:var(--green)">+1 avec un mot</span><h1 class="big sm">Encourager ' + esc(nom) + '</h1></div>' +
      '<section class="sec"><h2 class="mlab" style="margin:0">Sur quoi</h2>' + quoi + '</section>' +
      '<section class="sec"><h2 class="mlab" style="margin:0">Quand</h2>' + quand + '</section>' +
      '<section class="sec"><h2 class="mlab" style="margin:0">Un mot ' + (ENC.quoi === 'autre' ? '' : '(facultatif)') + '</h2><div class="row" style="flex-wrap:wrap;gap:6px">' + CHIPS.map(function (c) { return '<button type="button" class="chipw" data-act="encChip" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<label class="sr-only" for="enc-mot">Le mot</label><textarea id="enc-mot" class="txt" rows="3" maxlength="140" placeholder="Ex. : L\'épaule était bien engagée sur le plaquage de Jules.">' + esc(ENC.mot) + '</textarea></section>' +
      '<div class="note green">' + icon('info', 20) + '<span>' + esc(info) + '</span></div>' +
      '<button type="button" class="btn" data-act="encSend">' + (ENC.quoi === 'autre' ? icon('send', 18) + ' Envoyer le mot' : '+1 · Envoyer') + '</button>' +
      '<p class="small" style="margin:0;text-align:center">' + esc(nom) + ' le voit dans son appli ; sa famille aussi.</p></main>';
  }
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'enc-mot' && ENC) ENC.mot = e.target.value; });
  MC.act.encQuoi = function (b) { if (!ENC) return; ENC.quoi = b.getAttribute('data-v'); app.rerender(); };
  MC.act.encEv = function (b) { if (!ENC) return; ENC.ev = b.getAttribute('data-v'); app.rerender(); };
  MC.act.encChip = function (b) {
    if (!ENC) return;
    var c = b.getAttribute('data-v'), t = ENC.mot.trim();
    ENC.mot = (t ? t.replace(/[.!]?$/, '') + '. ' : '') + c;
    ENC.mot = ENC.mot.slice(0, 140);
    var ta = document.getElementById('enc-mot'); if (ta) ta.value = ENC.mot;
  };
  MC.act.encSend = function (b) {
    if (!ENC) return;
    var mid = ENC.quoi === 'autre' ? '' : ENC.quoi, mot = ENC.mot.trim();
    if (!mid && !mot) { ui.toast('Écrivez un mot (ou choisissez sa mission).', true); return; }
    var retour = ENC.retour;
    envoyerPlus1(ENC.jid, mid, ENC.ev, mot, b).then(function (r) { ENC = null; app.go(retour); }).catch(function () { });
  };
  document.addEventListener('hashchange', function () { if (location.hash.indexOf('#/educ/encourager/') !== 0) ENC = null; });

  // ======================================================================
  // Progrès › Skills : évaluer (domaine › étoile › les enfants présents)
  // ======================================================================
  var SKS = null;
  function sks() { if (!SKS) SKS = app.lsGet('mc-sks') || { d: 'plaquage', e: 'epaule', evt: '' }; return SKS; }
  function saveSks() { app.lsSet('mc-sks', SKS); }
  app.route('/educ/skills', function (p, q) {
    return both().then(function (r) {
      var gr = r[0], st = sks();
      app.refreshNav();
      if (q.evt !== undefined) { st.evt = q.evt; saveSks(); }
      else if (st.evt && !evtById(st.evt)) st.evt = '';
      if (!st.evt && q.evt === undefined) { var ej = evtDuJour(); if (ej) st.evt = ej.id; }
      return paintSkills(gr, st);
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });
  function paintSkills(gr, st) {
    var e = st.evt ? evtById(st.evt) : null, ids = e ? presentsDe(e, gr) : actifs(gr).map(function (p) { return p.joueur.id; });
    var D = SK.dom(st.d) || SK.DOMAINES[0], s = SK.star(D.id, st.e) || D.etoiles[0];
    var doms = '<div class="skdoms">' + SK.DOMAINES.map(function (x) { var on = x.id === D.id; return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + x.color + '" aria-pressed="' + on + '" data-act="skDom" data-v="' + x.id + '">' + icon(x.icon, 16) + ' ' + esc(x.nom) + '</button>'; }).join('') + '</div>';
    var stars = '<div class="skstars">' + D.etoiles.map(function (x) { var on = x.id === s.id; return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--gold)" aria-pressed="' + on + '" data-act="skStar" data-v="' + x.id + '">★ ' + esc(x.nom) + '</button>'; }).join('') + '</div>';
    var rows = ids.map(function (id) {
      var acq = etoileDe(gr, id, D.id, s.id), m = persoDe(gr, id), isM = m && m.domaine === D.id && m.etoile === s.id, n = isM ? p1De(gr, id, m.id).length : 0;
      var right = acq ? '<span class="skok">' + icon('star', 14) + ' Acquise</span>' : (isM ? btnPlus1(gr, id, m, e && e.id, true) : '') + '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(id) + '" data-d="' + D.id + '" data-e="' + s.id + '"' + (e ? ' data-ev="' + esc(e.id) + '"' : '') + '>Valider ★</button>';
      return '<li class="li skrow' + (acq ? ' acq' : '') + (isM ? ' mis' : '') + '">' + nivTag(gr, id) + '<span class="grow"><span class="t1">' + esc(nomDe(gr, id)) + '</span>' +
        (acq ? '<span class="t2">par ' + esc(qui(gr, acq)) + ', ' + jourTxt(acq.date) + '</span>' : isM ? '<span class="t2" style="color:var(--green)">sa mission · ' + n + ' +1 sur ' + SK.MAX_PLUS1 + '</span>' : '') + '</span>' + right + '</li>';
    }).join('');
    var nAcq = ids.filter(function (id) { return etoileDe(gr, id, D.id, s.id); }).length;
    return '<main class="screen">' + MC.educBar(gr, 'Progrès') + MC.progresTabs('skills') +
      '<section class="skeval"><div class="between" style="align-items:center"><span class="hud" style="color:var(--gold)">Évaluer · ' + ids.length + (e ? ' présent' + (ids.length > 1 ? 's' : '') + ' · ' + esc(e.lieu || e.titre) : ' enfants') + '</span><button type="button" class="lnk" data-act="skEvt">Changer</button></div>' +
      doms + stars + '<p class="small" style="margin:0;color:var(--soft)">« ' + esc(s.phrase) + ' » · ' + nAcq + ' / ' + ids.length + ' l\'ont déjà</p></section>' +
      (ids.length ? '<ul class="list">' + rows + '</ul>' : '<div class="empty">Personne : cochez d\'abord les présents de la séance.</div>') +
      '<p class="small" style="margin:0">Le +1 dit « tu es sur la bonne voie » ; seul « Valider » donne l\'étoile. Au 3e +1, l\'appli propose de valider, sans le faire toute seule.</p>' +
      '<div class="grid2"><a class="li" href="#/educ/skills/passeport">' + icon('list', 20, 'style="color:var(--cyan);flex:none"') + '<span class="grow"><span class="t1">Passeport du groupe</span><span class="t2">Toutes les cartes</span></span>' + icon('right', 16) + '</a>' +
      '<a class="li" href="#/educ/skills/journee">' + icon('calendar', 20, 'style="color:var(--gold);flex:none"') + '<span class="grow"><span class="t1">Journée d\'évaluation</span><span class="t2">Ateliers, 3 essais</span></span>' + icon('right', 16) + '</a></div></main>';
  }
  MC.act.skDom = function (b) { var st = sks(), D = SK.dom(b.getAttribute('data-v')); st.d = D.id; st.e = D.etoiles[0].id; saveSks(); app.rerender(); };
  MC.act.skStar = function (b) { var st = sks(); st.e = b.getAttribute('data-v'); saveSks(); app.rerender(); };
  MC.act.skEvt = function () {
    var gr = G(), t = L.today();
    var list = evts().filter(function (e) { return !e.annule && jour(e) >= L.addDays(t, -14) && jour(e) <= L.addDays(t, 2); }).sort(function (a, b) { return jour(a) < jour(b) ? 1 : -1; });
    ui.modal({
      title: 'Avec qui ?',
      body: '<div class="sec" style="gap:6px">' + list.map(function (e) { return '<button type="button" class="li" data-skev="' + esc(e.id) + '">' + icon(e.sorte === 'plateau' ? 'flag' : 'calendar', 18) + '<span class="grow"><span class="t1">' + esc(e.titre) + '</span><span class="t2">' + esc(ui.fmtDate(jour(e))) + ' · ' + presentsDe(e, gr).length + ' présents</span></span></button>'; }).join('') +
        '<button type="button" class="li" data-skev="">' + icon('kids', 18) + '<span class="grow"><span class="t1">Tous les enfants</span><span class="t2">' + actifs(gr).length + ' enfants</span></span></button></div>',
      actions: [{ label: 'Fermer', value: null, cls: 'btn2 grey' }],
      onOpen: function (host, close) { host.addEventListener('click', function (ev) { var x = ev.target.closest('[data-skev]'); if (x) { var st = sks(); st.evt = x.getAttribute('data-skev'); saveSks(); close(null); app.go('#/educ/skills?evt=' + st.evt); } }); }
    });
  };

  // ---------- le passeport du groupe ----------
  app.route('/educ/skills/passeport', function () {
    return MC.loadGroup().then(function (gr) {
      var kids = actifs(gr), tot = {}, mois = L.today().slice(0, 7), ceMois = 0;
      SK.DOMAINES.forEach(function (D) { tot[D.id] = 0; });
      var rows = kids.map(function (p) {
        var d = { etoiles: p.etoiles || [] };
        (p.etoiles || []).forEach(function (e) { if (String(e.date).slice(0, 7) === mois) ceMois++; });
        return '<tr><th scope="row"><a href="#/educ/joueur/' + esc(p.joueur.id) + '?t=skills">' + esc(p.joueur.prenom) + '</a></th>' + SK.DOMAINES.map(function (D) {
          var c = SK.carte(d, D.id); tot[D.id] += c.n;
          return '<td><span class="skcell" style="--gc:' + c.grade.color + '">' + (c.n ? c.n : '·') + '</span></td>';
        }).join('') + '<td class="sktot">' + SK.total(d) + '</td></tr>';
      }).join('');
      return '<main class="screen">' + MC.educBar(gr, 'Passeport du groupe', '#/educ/skills', 'Skills') +
        '<div class="head"><span class="kicker" style="color:var(--gold)">' + kids.length + ' enfants · ' + ceMois + ' étoile' + (ceMois > 1 ? 's' : '') + ' validée' + (ceMois > 1 ? 's' : '') + ' ce mois-ci</span><h1 class="big sm">Le passeport</h1>' +
        '<p class="small" style="margin:0">Le nombre d\'étoiles de chaque carte (sur 5). Touchez un prénom pour sa fiche. Jamais montré aux enfants comme un classement.</p></div>' +
        '<div class="sktable-w"><table class="sktable"><thead><tr><th></th>' + SK.DOMAINES.map(function (D) { return '<th scope="col" style="color:' + D.color + '">' + esc(D.nom.replace('Jeu au pied', 'Pied')) + '</th>'; }).join('') + '<th>Tout</th></tr></thead><tbody>' + rows + '</tbody>' +
        '<tfoot><tr><th>Total</th>' + SK.DOMAINES.map(function (D) { return '<td>' + tot[D.id] + '</td>'; }).join('') + '<td></td></tr></tfoot></table></div></main>';
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });

  // ---------- la journée d'évaluation : un atelier, un groupe, 3 essais par critère ----------
  // une étoile = critère réussi 2 essais sur 3
  var J = null;
  function jstate() { if (!J) J = app.lsGet('mc-journee') || { d: '', kids: [], ess: {} }; return J; }
  function saveJ() { app.lsSet('mc-journee', J); }
  function reussis(a) { return (a || []).filter(function (v) { return v === 1; }).length; }
  app.route('/educ/skills/journee', function () {
    return both().then(function (r) { return paintJournee(r[0], jstate()); });
  }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });
  function paintJournee(gr, st) {
    var bar = MC.educBar(gr, 'Journée d\'évaluation', '#/educ/skills', 'Skills');
    var intro = '<div class="head"><span class="kicker" style="color:var(--gold)">Comme sur la grille papier</span><h1 class="big sm">Journée d\'évaluation</h1>' +
      '<p class="small" style="margin:0">Un éduc par atelier, des groupes de 5 qui tournent. 3 essais par critère : l\'étoile est gagnée à 2 réussis sur 3.</p></div>';
    var doms = '<div class="skdoms">' + SK.DOMAINES.map(function (x) { var on = x.id === st.d; return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + x.color + '" aria-pressed="' + on + '" data-act="jDom" data-v="' + x.id + '">' + icon(x.icon, 16) + ' ' + esc(x.nom) + '</button>'; }).join('') + '</div>';
    if (!st.d) return '<main class="screen">' + bar + intro + '<section class="sec"><h2 class="mlab" style="margin:0">1. Mon atelier</h2>' + doms + '</section></main>';
    var D = SK.dom(st.d), e = evtDuJour(), pool = e ? presentsDe(e, gr) : actifs(gr).map(function (p) { return p.joueur.id; });
    var pick = '<div class="cop-list">' + pool.map(function (id) { var on = st.kids.indexOf(id) >= 0; return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="jKid" data-v="' + esc(id) + '"><span class="nm">' + esc(nomDe(gr, id)) + '</span><span class="ck">' + icon('check', 14) + '</span></button>'; }).join('') + '</div>';
    var cards = st.kids.map(function (id) {
      var ess = st.ess[id] = st.ess[id] || {};
      return '<section class="jcard"><div class="between"><b class="jnm">' + esc(nomDe(gr, id)) + '</b><span class="small">' + SK.carte({ etoiles: (jp(gr, id) || {}).etoiles || [] }, D.id).n + ' / 5 déjà</span></div>' + D.etoiles.map(function (s) {
        var acq = etoileDe(gr, id, D.id, s.id), a = ess[s.id] || [null, null, null], ok = reussis(a) >= 2;
        if (acq) return '<div class="jrow acq"><span class="grow"><b>' + esc(s.nom) + '</b><small>déjà acquise (' + esc(qui(gr, acq)) + ', ' + jourTxt(acq.date) + ')</small></span><span class="skok">' + icon('star', 14) + '</span></div>';
        return '<div class="jrow' + (ok ? ' ok' : '') + '"><span class="grow"><b>' + esc(s.nom) + '</b><small>' + esc(s.phrase) + '</small></span><span class="jess">' + [0, 1, 2].map(function (k) {
          var v = a[k]; return '<button type="button" class="je' + (v === 1 ? ' y' : v === 0 ? ' n' : '') + '" data-act="jEss" data-j="' + esc(id) + '" data-s="' + s.id + '" data-k="' + k + '" aria-label="Essai ' + (k + 1) + ' : ' + (v === 1 ? 'réussi' : v === 0 ? 'raté' : 'pas encore') + '">' + (v === 1 ? icon('check', 16) : v === 0 ? icon('x', 16) : k + 1) + '</button>';
        }).join('') + '</span>' + (ok ? '<span class="skok" title="Étoile gagnée">' + icon('star', 14) + '</span>' : '') + '</div>';
      }).join('') + '</section>';
    }).join('');
    var gagnees = aValider(gr, st);
    return '<main class="screen">' + bar + intro +
      '<section class="sec"><h2 class="mlab" style="margin:0">1. Mon atelier</h2>' + doms + '</section>' +
      '<section class="sec"><div class="between"><h2 class="mlab" style="margin:0">2. Le groupe (' + st.kids.length + ')</h2><span class="small">' + (e ? 'les présents du jour' : 'tous les enfants') + '</span></div>' + pick + '</section>' +
      (st.kids.length ? '<section class="sec"><h2 class="mlab" style="margin:0">3. Les essais · touchez : ✓ réussi, ✗ raté</h2>' + cards + '</section>' : '') +
      (st.kids.length ? '<div class="cp-bar jdock"><span class="grow small" style="color:var(--soft)">' + gagnees.length + ' étoile' + (gagnees.length > 1 ? 's' : '') + ' à valider</span>' +
        '<button type="button" class="btn2 sm grey" data-act="jNext">Suivant</button><button type="button" class="btn" data-act="jSend"' + (gagnees.length ? '' : ' disabled') + '>' + icon('star', 16) + ' Valider</button></div>' : '') + '</main>';
  }
  function aValider(gr, st) {
    var out = [];
    st.kids.forEach(function (id) {
      var ess = st.ess[id] || {};
      SK.dom(st.d).etoiles.forEach(function (s) { if (!etoileDe(gr, id, st.d, s.id) && reussis(ess[s.id]) >= 2) out.push({ joueurId: id, domaine: st.d, etoile: s.id, essais: (ess[s.id] || []).map(function (v) { return v === 1 ? 1 : 0; }) }); });
    });
    return out;
  }
  MC.act.jDom = function (b) { var st = jstate(); st.d = b.getAttribute('data-v'); st.ess = {}; saveJ(); app.rerender(); };
  MC.act.jKid = function (b) { var st = jstate(), id = b.getAttribute('data-v'), i = st.kids.indexOf(id); if (i >= 0) st.kids.splice(i, 1); else st.kids.push(id); saveJ(); app.rerender(); };
  MC.act.jEss = function (b) {
    var st = jstate(), id = b.getAttribute('data-j'), s = b.getAttribute('data-s'), k = Number(b.getAttribute('data-k'));
    var ess = st.ess[id] = st.ess[id] || {}, a = ess[s] = ess[s] || [null, null, null];
    a[k] = a[k] === null || a[k] === undefined ? 1 : a[k] === 1 ? 0 : null;
    saveJ(); app.rerender();
  };
  MC.act.jSend = function (b) {
    var gr = G(), st = jstate(), list = aValider(gr, st);
    if (!list.length) return;
    valider(list, '', b).then(function () { app.rerender(); }).catch(function () { });
  };
  MC.act.jNext = function () {
    var gr = G(), st = jstate(), reste = aValider(gr, st).length;
    function go() { st.kids = []; st.ess = {}; saveJ(); app.rerender(); window.scrollTo(0, 0); }
    if (!reste) return go();
    ui.modal({ title: 'Groupe suivant ?', body: '<p class="lead">' + reste + ' étoile' + (reste > 1 ? 's' : '') + ' gagnée' + (reste > 1 ? 's' : '') + ' pas encore validée' + (reste > 1 ? 's' : '') + '.</p>', actions: [{ label: 'Valider puis passer', value: 'v', cls: 'btn' }, { label: 'Passer sans valider', value: 'p', cls: 'btn2 grey' }, { label: 'Annuler', value: null, cls: 'btn2 grey' }] }).then(function (v) {
      if (v === 'v') valider(aValider(gr, st), '').then(go).catch(function () { });
      else if (v === 'p') go();
    });
  };

  // ======================================================================
  // Progrès › Missions
  // ======================================================================
  app.route('/educ/missions', function () {
    return both().then(function (r) { app.refreshNav(); return paintMissions(r[0]); });
  }, { adult: 'e', nav: 'e:progres', bg: '#33122A' });
  function statsGroupe(gr, m) {
    var kids = actifs(gr), faits = 0, vus = 0, somme = 0, nq = (m.questions || []).length;
    kids.forEach(function (p) {
      var row = (p.missions || []).filter(function (x) { return x.mission === m.id; })[0], rep = (row && row.reponses) || {};
      if (row && row.faite) { faits++; somme += rep.score || 0; } else if (rep.vu) vus++;
    });
    return { kids: kids.length, faits: faits, vus: vus, moyenne: faits && nq ? Math.round(somme / faits * 10) / 10 : null, nq: nq };
  }
  function paintMissions(gr) {
    var kids = actifs(gr), D10 = M.def('jeu10'), groupe = '';
    if (D10) {
      var f10 = kids.filter(function (p) { return M.etat({ missions: p.missions || [] }, 'jeu10').faite; }).length;
      groupe += '<li><a class="li mrow" href="#/educ/mission"><span class="mtag">Poste</span><span class="grow"><span class="t1">' + esc(D10.titre) + '</span><span class="t2">' + f10 + ' / ' + kids.length + ' l\'ont faite' + (kids.length - f10 ? ' · ' + (kids.length - f10) + ' pas encore' : '') + '</span></span>' + icon('right', 16) + '</a></li>';
    }
    (gr.defmissions || []).filter(function (m) { return m.sorte !== 'etoile' && m.statut !== 'retiree'; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; }).forEach(function (m) {
      var s = statsGroupe(gr, m);
      groupe += '<li><a class="li mrow" href="#/educ/missions/m/' + esc(m.id) + '"><span class="mtag">' + (m.sorte === 'video' ? 'Vidéo' : 'QCM') + '</span><span class="grow"><span class="t1">' + esc(m.titre) + '</span><span class="t2">' + s.faits + ' / ' + s.kids + ' l\'ont faite' + (s.moyenne !== null ? ' · moyenne ' + String(s.moyenne).replace('.', ',') + ' / ' + s.nq : '') + (m.fin ? ' · jusqu\'au ' + jourTxt(m.fin) : '') + '</span></span>' + icon('right', 16) + '</a></li>';
    });
    var indiv = (gr.defmissions || []).filter(function (m) { return m.sorte === 'etoile' && m.statut === 'active' && jp(gr, m.joueurId) && jp(gr, m.joueurId).joueur.actif; })
      .sort(function (a, b) { return nomDe(gr, a.joueurId).localeCompare(nomDe(gr, b.joueurId), 'fr'); });
    var ind = indiv.map(function (m) {
      var l = p1De(gr, m.joueurId, m.id), n = l.length, last = l[0];
      return '<li class="mpres"><a class="grow" href="#/educ/joueur/' + esc(m.joueurId) + '?t=missions"><span class="t1">' + esc(nomDe(gr, m.joueurId)) + ' · ★ ' + esc(SK.titreMission(m)) + '</span><span class="t2">' + (last ? 'dernier : ' + esc(qui(gr, last)) + ', ' + jourTxt(last.date) : 'pas encore de +1') + '</span>' +
        '<span class="row" style="gap:8px;margin-top:4px">' + MC.jauge5(n) + (n >= SK.PROPOSE_AU ? '<span class="pill" style="--pc:var(--gold)">À valider</span>' : '') + '</span></a>' +
        (n >= SK.PROPOSE_AU ? '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(m.joueurId) + '" data-d="' + esc(m.domaine) + '" data-e="' + esc(m.etoile) + '">Valider ★</button>' : '') + btnPlus1(gr, m.joueurId, m) + '</li>';
    }).join('');
    var reussies = (gr.defmissions || []).filter(function (m) { return m.sorte === 'etoile' && m.statut === 'faite'; }).sort(function (a, b) { return (a.faiteLe || '') < (b.faiteLe || '') ? 1 : -1; });
    var sans = kids.filter(function (p) { return !persoDe(gr, p.joueur.id); }).length;
    return '<main class="screen">' + MC.educBar(gr, 'Progrès') + MC.progresTabs('missions') +
      '<section class="sec"><h2 class="h2">Pour le groupe</h2>' + (groupe ? '<ul class="list">' + groupe + '</ul>' : '<p class="small" style="margin:0">Pas encore de mission pour le groupe.</p>') + '</section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Individuelles</h2><span class="small">une étoile à décrocher</span></div>' +
      (ind ? '<ul class="list">' + ind + '</ul>' : '<p class="small" style="margin:0">Pas encore de mission perso.</p>') +
      (sans ? '<p class="small" style="margin:0">' + sans + ' enfant' + (sans > 1 ? 's' : '') + ' sans mission perso.</p>' : '') +
      '<p class="small" style="margin:0">Jusqu\'à 5 +1 par mission. Au 3e, l\'appli propose de valider l\'étoile ; rien d\'automatique, c\'est un éduc qui valide.</p></section>' +
      '<div class="grid2"><a class="btn2" href="#/educ/missions/nouvelle?type=video">' + icon('plus', 16) + ' Pour le groupe</a><a class="btn2" href="#/educ/missions/nouvelle?type=perso">' + icon('plus', 16) + ' Individuelle</a></div>' +
      (reussies.length ? '<details><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Missions perso réussies (' + reussies.length + ')</summary><ul class="list" style="margin-top:6px">' + reussies.map(function (m) { return '<li><a class="li" href="#/educ/joueur/' + esc(m.joueurId) + '?t=missions"><span class="grow"><span class="t1">' + esc(nomDe(gr, m.joueurId)) + ' · ★ ' + esc(SK.titreMission(m)) + '</span><span class="t2">étoile validée le ' + jourTxt(m.faiteLe) + '</span></span></a></li>'; }).join('') + '</ul></details>' : '') +
      '</main>';
  }

  // ---------- une mission du groupe : qui l'a faite ----------
  app.route('/educ/missions/m/:id', function (p) {
    return both().then(function (r) {
      var gr = r[0], m = (gr.defmissions || []).filter(function (x) { return x.id === p.id; })[0];
      if (!m) return '<main class="screen">' + MC.educBar(gr, 'Mission', '#/educ/missions', 'Missions') + '<div class="empty">Mission introuvable (retirée ?).</div></main>';
      var s = statsGroupe(gr, m), qs = m.questions || [], peut = m.parQui === gr.moi.id || gr.moi.admin;
      var lignes = actifs(gr).map(function (p) {
        var row = (p.missions || []).filter(function (x) { return x.mission === m.id; })[0], rep = (row && row.reponses) || {};
        var t = row && row.faite ? '<b style="color:var(--green)">faite</b>' + (qs.length ? ' · ' + (rep.score || 0) + ' / ' + (rep.total || qs.length) : '') + ' · ' + jourTxt(row.date) : rep.vu ? 'vidéo vue, quiz à faire' : '<span style="color:var(--orange)">pas encore</span>';
        return { f: row && row.faite ? 0 : rep.vu ? 1 : 2, html: '<li class="li"><span class="grow"><span class="t1">' + esc(p.joueur.prenom) + '</span><span class="t2">' + t + '</span></span></li>' };
      }).sort(function (a, b) { return a.f - b.f; }).map(function (x) { return x.html; }).join('');
      return '<main class="screen">' + MC.educBar(gr, m.titre, '#/educ/missions', 'Missions') +
        '<div class="head"><span class="kicker" style="color:var(--pink)">' + (m.sorte === 'video' ? 'Vidéo' + (qs.length ? ' + ' + qs.length + ' question' + (qs.length > 1 ? 's' : '') : '') : 'QCM · ' + qs.length + ' question' + (qs.length > 1 ? 's' : '')) + ' · +' + m.xp + ' XP · par ' + esc(m.parNom) + '</span><h1 class="big sm">' + esc(m.titre) + '</h1>' + (m.texte ? '<p class="lead">' + esc(m.texte) + '</p>' : '') + '</div>' +
        '<div class="grid3"><div class="tile"><span class="v" style="color:var(--green)">' + s.faits + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">l\'ont faite</span></div>' +
        '<div class="tile"><span class="v" style="color:var(--orange)">' + (s.kids - s.faits) + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">pas encore</span></div>' +
        '<div class="tile"><span class="v">' + (s.moyenne !== null ? String(s.moyenne).replace('.', ',') : '—') + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px">moyenne' + (s.nq ? ' / ' + s.nq : '') + '</span></div></div>' +
        (m.sorte === 'video' ? '<a class="li" href="https://www.youtube.com/watch?v=' + esc(m.video) + '" target="_blank" rel="noopener">' + icon('play', 20, 'style="color:var(--pink);flex:none"') + '<span class="grow"><span class="t1">Voir la vidéo</span><span class="t2">YouTube</span></span>' + icon('right', 16) + '</a>' : '') +
        (qs.length ? '<details><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Les questions et les bonnes réponses</summary><ol class="qcorr">' + qs.map(function (q) { return '<li><b>' + esc(q.q) + '</b><span class="ok">' + esc(q.opts[q.ok]) + '</span></li>'; }).join('') + '</ol></details>' : '') +
        '<section class="sec"><h2 class="h2">Les enfants</h2><ul class="list">' + lignes + '</ul></section>' +
        (peut ? '<section class="sec"><h2 class="h2">Réglages</h2><label class="lab" for="mfin">Date limite</label><input id="mfin" class="txt" type="date" value="' + esc(m.fin || '') + '">' +
          '<div class="grid2"><button type="button" class="btn2" data-act="mFin" data-id="' + esc(m.id) + '">' + icon('check', 16) + ' Enregistrer la date</button><button type="button" class="btn2 grey" data-act="mRetirer" data-id="' + esc(m.id) + '">Retirer la mission</button></div></section>' : '') +
        '</main>';
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#33122A' });
  MC.act.mFin = function (b) {
    var el = document.getElementById('mfin'), id = b.getAttribute('data-id');
    b.disabled = true;
    app.adultCall('defMission', { id: id, fin: el ? el.value : '' }).then(function (r) { remplaceDef(r.mission); ui.toast('Date enregistrée'); app.rerender(); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.mRetirer = function (b) {
    var id = b.getAttribute('data-id');
    ui.modal({ title: 'Retirer la mission ?', body: '<p class="lead">Elle disparaît pour les enfants. Les XP déjà gagnés restent.</p>', actions: [{ label: 'Retirer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('defMission', { id: id, retirer: true }).then(function (r) { remplaceDef(r.mission); ui.toast('Mission retirée'); app.go('#/educ/missions', true); }).catch(function (e) { ui.toast(e.message, true); });
    });
  };
  function remplaceDef(m) {
    var gr = G(); if (!gr) return;
    gr.defmissions = (gr.defmissions || []).filter(function (x) { return x.id !== m.id; });
    if (m.statut !== 'retiree') gr.defmissions.push(m);
    persist();
  }

  // ---------- créer une mission ----------
  var NM = null;
  function nmInit(type, joueur) {
    if (NM && NM.type === type && (type !== 'perso' || !joueur || NM.joueurId === joueur)) return NM;
    NM = { type: type, titre: '', texte: '', video: '', fin: L.addDays(L.today(), 14), xp: 50, questions: type === 'qcm' ? [{ q: '', opts: ['', '', ''], ok: -1 }] : [], joueurId: joueur || '', d: '', e: '' };
    return NM;
  }
  app.route('/educ/missions/nouvelle', function (p, q) {
    return both().then(function (r) {
      var gr = r[0], type = q.type === 'perso' ? 'perso' : q.type === 'qcm' ? 'qcm' : 'video';
      var st = nmInit(type, q.joueur);
      if (q.joueur) st.joueurId = q.joueur;
      return type === 'perso' ? paintNouvellePerso(gr, st, q) : paintNouvelleGroupe(gr, st);
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#33122A' });
  function paintNouvellePerso(gr, st, q) {
    var back = q.joueur ? '#/educ/joueur/' + q.joueur + '?t=missions' : '#/educ/missions';
    var bar = MC.educBar(gr, 'Mission perso', back, q.joueur ? nomDe(gr, q.joueur) : 'Missions');
    var head = '<div class="head"><span class="kicker" style="color:var(--gold)">Individuelle</span><h1 class="big sm">Une étoile à décrocher</h1><p class="small" style="margin:0">L\'enfant voit sa mission dans son onglet Missions, avec ses +1. Une seule à la fois.</p></div>';
    if (!st.joueurId) {
      return '<main class="screen">' + bar + head + '<section class="sec"><h2 class="mlab" style="margin:0">1. Pour qui ?</h2><div class="cop-list">' + actifs(gr).map(function (p) {
        var m = persoDe(gr, p.joueur.id);
        return '<button type="button" class="cop" data-act="nmKid" data-v="' + esc(p.joueur.id) + '"><span class="nm">' + esc(p.joueur.prenom) + (m ? '<small class="csp">a déjà « ' + esc(SK.titreMission(m)) + ' »</small>' : '') + '</span></button>';
      }).join('') + '</div></section></main>';
    }
    var x = jp(gr, st.joueurId), cur = persoDe(gr, st.joueurId), d = { etoiles: (x && x.etoiles) || [] };
    var bloque = cur && cur.parQui && cur.parQui !== gr.moi.id && !gr.moi.admin;   // la mission d'un autre éduc : lui ou l'admin la remplace
    var doms = '<div class="skdoms">' + SK.DOMAINES.map(function (D) { var on = D.id === st.d; return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + D.color + '" aria-pressed="' + on + '" data-act="nmDom" data-v="' + D.id + '">' + icon(D.icon, 16) + ' ' + esc(D.nom) + ' · ' + SK.carte(d, D.id).n + '/5</button>'; }).join('') + '</div>';
    var stars = st.d ? '<div class="sec" style="gap:6px">' + SK.carte(d, st.d).stars.map(function (s) {
      var on = st.e === s.def.id;
      return '<button type="button" class="cop' + (on ? ' on' : '') + '"' + (s.row ? ' disabled' : ' data-act="nmStar" data-v="' + s.def.id + '"') + ' aria-pressed="' + on + '"><span class="nm">★ ' + esc(s.def.mission) + '<small class="csp">' + (s.row ? 'déjà gagnée' : '« ' + esc(s.def.phrase) + ' »') + '</small></span><span class="ck">' + icon('check', 14) + '</span></button>';
    }).join('') + '</div>' : '';
    return '<main class="screen">' + bar + head +
      '<section class="sec"><div class="between"><h2 class="mlab" style="margin:0">Pour ' + esc(x ? x.joueur.prenom : '?') + '</h2>' + (q.joueur ? '' : '<button type="button" class="lnk" data-act="nmKid" data-v="">Changer</button>') + '</div>' +
      (bloque ? '<div class="note">' + icon('info', 20) + '<span>' + esc(x ? x.joueur.prenom : '') + ' a déjà la mission « ' + esc(SK.titreMission(cur)) + ' », donnée par ' + esc(cur.parNom || 'un autre éduc') + ' : seul cet éduc (ou l\'admin) peut la remplacer. Encouragez-le avec un +1 !</span></div>' :
        cur ? '<div class="note gold">' + icon('info', 20) + '<span>Elle remplace sa mission en cours « ' + esc(SK.titreMission(cur)) + ' » (ses +1 restent dans son historique).</span></div>' : '') + '</section>' +
      '<section class="sec"><h2 class="mlab" style="margin:0">La carte</h2>' + doms + '</section>' +
      (st.d ? '<section class="sec"><h2 class="mlab" style="margin:0">L\'étoile</h2>' + stars + '</section>' : '') +
      '<button type="button" class="btn gold" data-act="nmPerso"' + (st.d && st.e && !bloque ? '' : ' disabled') + '>' + icon('star', 18) + ' Donner la mission</button></main>';
  }
  MC.act.nmKid = function (b) { NM.joueurId = b.getAttribute('data-v'); NM.d = ''; NM.e = ''; app.rerender(); };
  MC.act.nmDom = function (b) { NM.d = b.getAttribute('data-v'); NM.e = ''; app.rerender(); };
  MC.act.nmStar = function (b) { NM.e = b.getAttribute('data-v'); app.rerender(); };
  MC.act.nmPerso = function (b) {
    var gr = G(), st = NM, s = SK.star(st.d, st.e), cur = persoDe(gr, st.joueurId);
    if (!s) return;
    b.disabled = true;
    app.adultCall('defMission', { sorte: 'etoile', joueurId: st.joueurId, domaine: st.d, etoile: st.e, titre: s.mission, remplacer: !!cur }).then(function (r) {
      if (cur) cur.statut = 'retiree';
      gr.defmissions = (gr.defmissions || []).filter(function (x) { return x.statut !== 'retiree'; });
      gr.defmissions.push(r.mission); persist();
      var jid = st.joueurId; NM = null;
      ui.toast('Mission donnée à ' + nomDe(gr, jid) + ' : elle la voit dans son appli');
      app.go('#/educ/joueur/' + jid + '?t=missions');
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  function paintNouvelleGroupe(gr, st) {
    var vid = st.type === 'video';
    var qs = st.questions.map(function (q, i) {
      return '<fieldset class="nmq"><legend>Question ' + (i + 1) + '</legend>' +
        '<label class="sr-only" for="nq' + i + '">Question ' + (i + 1) + '</label><input id="nq' + i + '" class="txt" maxlength="160" placeholder="Ex. : Au ruck, où doit être ta tête ?" data-nm="q" data-i="' + i + '" value="' + esc(q.q) + '">' +
        q.opts.map(function (o, j) {
          var ok = q.ok === j;
          return '<div class="nmo"><button type="button" class="nmok' + (ok ? ' on' : '') + '" aria-pressed="' + ok + '" data-act="nmOk" data-i="' + i + '" data-j="' + j + '" aria-label="Réponse ' + 'ABCD'.charAt(j) + ' : la bonne">' + (ok ? icon('check', 16) : 'ABCD'.charAt(j)) + '</button>' +
            '<input class="txt" maxlength="90" placeholder="Réponse ' + 'ABCD'.charAt(j) + '" data-nm="o" data-i="' + i + '" data-j="' + j + '" value="' + esc(o) + '" aria-label="Réponse ' + 'ABCD'.charAt(j) + ' de la question ' + (i + 1) + '"></div>';
        }).join('') +
        '<div class="row" style="gap:12px">' + (q.opts.length < 4 ? '<button type="button" class="lnk" data-act="nmAddOpt" data-i="' + i + '">+ une réponse</button>' : '') + '<button type="button" class="lnk" data-act="nmDelQ" data-i="' + i + '" style="color:var(--dim)">Supprimer la question</button></div>' +
        '<span class="small">Touchez la lettre de la bonne réponse.</span></fieldset>';
    }).join('');
    return '<main class="screen">' + MC.educBar(gr, 'Mission pour le groupe', '#/educ/missions', 'Missions') +
      '<div class="head"><span class="kicker" style="color:var(--pink)">Pour le groupe</span><h1 class="big sm">Nouvelle mission</h1></div>' +
      ui.seg([['video', 'Une vidéo + questions', '#/educ/missions/nouvelle?type=video'], ['qcm', 'Un QCM', '#/educ/missions/nouvelle?type=qcm']], st.type) +
      '<section class="sec"><label class="lab" for="nm-t">Titre</label><input id="nm-t" class="txt" maxlength="80" placeholder="' + (vid ? 'Ex. : Le ruck en vidéo' : 'Ex. : Le hors-jeu en mêlée') + '" data-nm="titre" value="' + esc(st.titre) + '">' +
      '<label class="lab" for="nm-x">Consigne (facultatif)</label><input id="nm-x" class="txt" maxlength="240" placeholder="Ex. : Regarde bien où est la tête du joueur." data-nm="texte" value="' + esc(st.texte) + '">' +
      (vid ? '<label class="lab" for="nm-v">Lien de la vidéo YouTube</label><input id="nm-v" class="txt" type="url" inputmode="url" autocapitalize="none" placeholder="https://www.youtube.com/watch?v=…" data-nm="video" value="' + esc(st.video) + '">' : '') + '</section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Les questions</h2><span class="small">' + (vid ? 'facultatives, 3 c\'est bien' : 'au moins une') + '</span></div>' + qs +
      (st.questions.length < 10 ? '<button type="button" class="btn2" data-act="nmAddQ">' + icon('plus', 16) + ' Ajouter une question</button>' : '') + '</section>' +
      '<section class="sec"><label class="lab" for="nm-f">Jusqu\'au</label><input id="nm-f" class="txt" type="date" data-nm="fin" value="' + esc(st.fin) + '">' +
      '<span class="lab">XP gagnés</span>' + ui.seg([['0', '0'], ['50', '+50'], ['100', '+100']], String(st.xp), 'nmXp') + '</section>' +
      '<button type="button" class="btn" data-act="nmGroupe">' + icon('send', 18) + ' Créer la mission</button>' +
      '<p class="small" style="margin:0;text-align:center">Tous les enfants la voient dans leur onglet Missions.</p></main>';
  }
  document.addEventListener('input', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-nm');
    if (!k || !NM) return;
    var i = Number(e.target.getAttribute('data-i')), j = Number(e.target.getAttribute('data-j'));
    if (k === 'q') NM.questions[i].q = e.target.value;
    else if (k === 'o') NM.questions[i].opts[j] = e.target.value;
    else NM[k] = e.target.value;
  });
  document.addEventListener('change', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-nm'); if (k === 'fin' && NM) NM.fin = e.target.value; });
  MC.act.nmAddQ = function () { NM.questions.push({ q: '', opts: ['', '', ''], ok: -1 }); app.rerender(); };
  MC.act.nmDelQ = function (b) { NM.questions.splice(Number(b.getAttribute('data-i')), 1); app.rerender(); };
  MC.act.nmAddOpt = function (b) { var q = NM.questions[Number(b.getAttribute('data-i'))]; if (q.opts.length < 4) q.opts.push(''); app.rerender(); };
  MC.act.nmOk = function (b) { NM.questions[Number(b.getAttribute('data-i'))].ok = Number(b.getAttribute('data-j')); app.rerender(); };
  MC.act.nmXp = function (b) { NM.xp = Number(b.getAttribute('data-v')); app.rerender(); };
  MC.act.nmGroupe = function (b) {
    var st = NM;
    if (!st.titre.trim()) { ui.toast('Il faut un titre.', true); return; }
    var qs = st.questions.map(function (q) {
      var opts = [], ok = -1;
      q.opts.forEach(function (o, j) { if (o.trim()) { if (j === q.ok) ok = opts.length; opts.push(o.trim()); } });
      return { q: q.q.trim(), opts: opts, ok: ok };
    }).filter(function (q) { return q.q || q.opts.length; });
    for (var i = 0; i < qs.length; i++) {
      if (!qs[i].q) { ui.toast('La question ' + (i + 1) + ' est vide.', true); return; }
      if (qs[i].opts.length < 2) { ui.toast('Question ' + (i + 1) + ' : au moins 2 réponses.', true); return; }
      if (qs[i].ok < 0) { ui.toast('Question ' + (i + 1) + ' : touchez la lettre de la bonne réponse.', true); return; }
    }
    if (st.type === 'qcm' && !qs.length) { ui.toast('Un QCM a au moins une question.', true); return; }
    b.disabled = true;
    app.adultCall('defMission', { sorte: st.type, titre: st.titre, texte: st.texte, video: st.video, questions: qs, fin: st.fin, xp: st.xp }).then(function (r) {
      var gr = G(); gr.defmissions = gr.defmissions || []; gr.defmissions.push(r.mission); persist();
      NM = null; ui.toast('Mission créée : les enfants la voient dans leur onglet Missions'); app.go('#/educ/missions', true);
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ======================================================================
  // La fiche d'un enfant : ses Skills, ses missions et ses encouragements
  // ======================================================================
  MC.ficheSkills = function (d, gr) {
    var id = d.joueur.id, m = persoDe(gr, id);
    var cartes = SK.DOMAINES.map(function (D) {
      var c = SK.carte(d, D.id);
      return '<section class="fsk"><div class="between" style="align-items:center"><h2 class="h2" style="color:' + D.color + '">' + icon(D.icon, 18) + ' ' + esc(D.nom) + '</h2><span class="skcell" style="--gc:' + c.grade.color + '">' + esc(c.grade.nom) + ' · ' + c.n + '/5</span></div><ul class="list">' + c.stars.map(function (s) {
        var isM = m && m.domaine === D.id && m.etoile === s.def.id;
        if (s.row) return '<li class="li skrow acq"><span class="skok">' + icon('star', 14) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + '</span><span class="t2">par ' + esc(qui(gr, s.row)) + ', ' + jourTxt(s.row.date) + (s.row.occasion ? ' · ' + esc(s.row.occasion) : '') + (s.row.essais ? ' · essais ' + s.row.essais.map(function (v) { return v ? '✓' : '✗'; }).join('') : '') + '</span></span><button type="button" class="lnk" data-act="retEtoile" data-id="' + esc(s.row.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Retirer</button></li>';
        var n = isM ? p1De(gr, id, m.id).length : 0;
        return '<li class="li skrow' + (isM ? ' mis' : '') + '"><span class="skno">' + icon('star', 14) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + '</span><span class="t2">' + (isM ? '<b style="color:var(--green)">sa mission · ' + n + ' +1 sur ' + SK.MAX_PLUS1 + '</b>' : '« ' + esc(s.def.phrase) + ' »') + '</span></span>' +
          (isM ? btnPlus1(gr, id, m, '', true) : '') + '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(id) + '" data-d="' + D.id + '" data-e="' + s.def.id + '">Valider</button></li>';
      }).join('') + '</ul></section>';
    }).join('');
    return '<div class="between"><span class="hud" style="color:var(--gold)">' + SK.total(d) + ' / 20 étoiles</span>' + (m ? '' : '<a class="lnk" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '">Lui donner une mission perso</a>') + '</div>' + cartes +
      '<p class="small" style="margin:0">Valider = l\'étoile s\'allume pour lui (+' + C.XP.etoile + ' XP). Validée par erreur ? « Retirer ».</p>';
  };
  MC.ficheMissions = function (d, gr) {
    var id = d.joueur.id, nom = d.joueur.prenom, m = persoDe(gr, id), out = '';
    if (m) {
      var l = p1De(gr, id, m.id), n = l.length, s = SK.star(m.domaine, m.etoile);
      out += '<section class="fmis"><span class="hud" style="color:var(--pink)">Sa mission · depuis le ' + jourTxt(m.debut || m.cree) + '</span><h2 class="h2" style="font-size:24px">★ ' + esc(SK.titreMission(m)) + '</h2>' +
        '<div class="row" style="gap:10px">' + MC.jauge5(n, true) + '<span class="small" style="color:var(--soft)">' + n + ' sur ' + SK.MAX_PLUS1 + ' · au ' + SK.PROPOSE_AU + 'e, on vous propose de valider</span></div>' +
        (l.length ? '<ol class="p1list">' + l.map(function (x) {
          return '<li class="p1row"><b class="p1tag">+1</b><span class="grow"><span class="p1-k">' + esc(qui(gr, x)) + ' · ' + esc(x.occasion || jourTxt(x.date)) + '</span>' + (x.mot ? '<span class="p1-m">« ' + esc(x.mot) + ' »</span>' : '') + '</span>' +
            (x.parQui === gr.moi.id || gr.moi.admin ? '<button type="button" class="lnk" data-act="retPlus1" data-id="' + esc(x.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Retirer</button>' : '') + '</li>';
        }).join('') + '</ol>' : '<p class="small" style="margin:0">Pas encore de +1.</p>') +
        '<div class="fmis-act">' + btnPlus1(gr, id, m, '') + '<a class="btn2 sm" href="#/educ/encourager/' + esc(id) + '?m=' + esc(m.id) + '">' + icon('edit', 14) + ' +1 avec un mot</a>' +
        '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(id) + '" data-d="' + esc(m.domaine) + '" data-e="' + esc(m.etoile) + '">' + icon('star', 14) + ' Valider l\'étoile</button></div>' +
        (s ? '<p class="small" style="margin:0">« ' + esc(s.phrase) + ' » · ' + esc(s.conseil) + '</p>' : '') +
        '<a class="lnk" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '" style="align-self:flex-start">Changer de mission</a></section>';
    } else out += '<div class="note">' + icon('star', 20) + '<span>Pas de mission perso pour ' + esc(nom) + '. Une étoile Skills à décrocher, qu\'il voit dans son appli avec vos +1.</span></div><a class="btn2 gold" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '">' + icon('plus', 16) + ' Lui donner une mission perso</a>';
    var faites = persosToutes(gr, id).filter(function (x) { return x.statut === 'faite'; });
    if (faites.length) out += '<details><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Ses missions perso réussies (' + faites.length + ')</summary><ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.6;color:var(--soft)">' + faites.map(function (x) { return '<li>★ ' + esc(SK.titreMission(x)) + ' · ' + jourTxt(x.faiteLe) + '</li>'; }).join('') + '</ul></details>';
    // missions du groupe
    var D10 = M.def('jeu10'), e10 = M.etat(d, 'jeu10'), lg = '';
    if (D10) lg += '<li class="li"><span class="mtag">Poste</span><span class="grow"><span class="t1">' + esc(D10.titre) + '</span><span class="t2">' + (e10.faite ? 'faite · ' + e10.postes.map(function (pid) { return esc(M.poste(pid).nom.toLowerCase()); }).join(', ') : e10.postes.length ? 'postes choisis, copains à faire' : '<span style="color:var(--orange)">pas encore</span>') + '</span></span></li>';
    M.groupe(d).forEach(function (x) {
      lg += '<li class="li"><span class="mtag">' + (x.def.sorte === 'video' ? 'Vidéo' : 'QCM') + '</span><span class="grow"><span class="t1">' + esc(x.def.titre) + '</span><span class="t2">' + (x.faite ? 'faite' + (x.total ? ' · ' + x.score + ' / ' + x.total : '') : x.vu ? 'vidéo vue, quiz à faire' : '<span style="color:var(--orange)">pas encore vue</span>') + '</span></span></li>';
    });
    out += '<section class="sec"><h2 class="h2">Missions du groupe</h2>' + (lg ? '<ul class="list">' + lg + '</ul>' : '<p class="small" style="margin:0">Aucune.</p>') + '</section>';
    // les mots (sur autre chose que sa mission)
    var mots = (d.encouragements || []).filter(function (x) { return !x.missionId; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; });
    out += '<section class="sec"><div class="between"><h2 class="h2">Ses mots</h2><a class="lnk" href="#/educ/encourager/' + esc(id) + '">' + icon('plus', 14) + ' Un mot</a></div>' +
      (mots.length ? '<ol class="p1list">' + mots.map(function (x) { return '<li class="p1row"><b class="p1tag mot">' + icon('heart', 14) + '</b><span class="grow"><span class="p1-k">' + esc(qui(gr, x)) + ' · ' + esc(x.occasion || jourTxt(x.date)) + '</span><span class="p1-m">« ' + esc(x.mot) + ' »</span></span>' + (x.parQui === gr.moi.id || gr.moi.admin ? '<button type="button" class="lnk" data-act="retPlus1" data-id="' + esc(x.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Retirer</button>' : '') + '</li>'; }).join('') + '</ol>' : '<p class="small" style="margin:0">Pas encore de mot.</p>') + '</section>';
    return out;
  };
})();
