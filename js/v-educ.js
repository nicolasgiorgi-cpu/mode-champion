/* =========================================================
   Mode champion · M12 — ÉDUCS : Progrès › Skills et Missions, le +1, la fiche d'un enfant
   - Skills : évaluer (un seul écran, Skills v2 : une étoile = la liste, un atelier = la grille, groupes d'ateliers,
     gardé sur le téléphone puis envoyé à la fin, brille après un plateau, demandes des enfants), le passeport du groupe.
   - Missions : pour le groupe (vidéo + questions, QCM, et « Prépare le jeu à 10 »),
     et la mission principale de chaque enfant (visuels v2, 25/10 : 1 à 3 étoiles d'une même carte, une date de fin,
     donnée à plusieurs enfants d'un coup, avec un récapitulatif par enfant).
   - Le +1 (un encouragement pour l'enfant) : d'un seul toucher, un mot si on veut. Jusqu'à 5 par étoile visée ;
     au 3e, l'appli propose de valider, sans rien faire toute seule.
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
  // la mission principale encore en cours (pas celle dont la date est passée)
  function persoActif(gr, id) { var m = persoDe(gr, id); return m && !(m.fin && m.fin < L.today()) ? m : null; }
  function persosToutes(gr, id) { return SK.missionPerso({ defmissions: (gr.defmissions || []).filter(function (m) { return m.joueurId === id; }) }, true); }
  function p1De(gr, id, mid) { var p = jp(gr, id); return p ? SK.plus1({ encouragements: p.encouragements || [] }, mid) : []; }
  function dataDe(gr, id) { var p = jp(gr, id); return { etoiles: (p && p.etoiles) || [], encouragements: (p && p.encouragements) || [] }; }
  // la mission principale : où elle en est (étoiles gagnées, restantes, date passée)
  function etatDe(gr, m) { return SK.etatMission(dataDe(gr, m.joueurId), m, L.today()); }
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
  // evId === null : aucune occasion (file « Tous les enfants » envoyée plus tard) ; '' : l'événement du jour
  function occasionCtx(evId) { var e = evId ? evtById(evId) : evId === null ? null : evtDuJour(); return { evenementId: e ? e.id : '', occasion: e && MC.evtOccasion ? MC.evtOccasion(e) : '' }; }
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
  // au 3e +1 (et au dernier), l'appli propose de valider l'étoile (ou de choisir laquelle) ; rien d'automatique
  function proposerValidation(jid, mid, n, evId) {
    var gr = G(), m = (gr.defmissions || []).filter(function (x) { return x.id === mid; })[0];
    if (!m || m.statut !== 'active') return;
    var et = etatDe(gr, m), D = SK.dom(m.domaine), nom = nomDe(gr, jid);
    if (!et.restantes.length) return;
    setTimeout(function () {
      var acts = et.restantes.map(function (x) { return { label: MC.ui.icon('star', 18) + ' ' + esc(x.def.nom), value: x.id, cls: 'btn gold' }; });
      acts.push({ label: 'Plus tard', value: null, cls: 'btn2 grey' });
      ui.modal({
        title: (n === SK.PROPOSE_AU ? '3e +1' : n + ' +1') + ' pour ' + esc(nom),
        body: '<p class="lead">« ' + esc(SK.titreMission(m)) + ' » : ' + esc(nom) + ' est sur la bonne voie. Valider ' + (et.restantes.length > 1 ? 'une étoile' : 'l\'étoile') + ' <b>' + esc(D.nom) + '</b> maintenant ?</p><p class="small">Rien d\'automatique : c\'est vous qui décidez. Vous pourrez aussi la valider plus tard.</p>',
        actions: acts
      }).then(function (v) { if (v) valider([{ joueurId: jid, domaine: m.domaine, etoile: v }], evId).then(function () { app.rerender(); }); else app.rerender(); });
    }, 120);
  }
  function valider(list, evId, btn, brille) {
    var gr = G(), o = occasionCtx(evId);
    if (btn) btn.disabled = true;
    return app.adultCall('validerEtoiles', { etoiles: list, evenementId: o.evenementId, occasion: o.occasion, brille: !!brille }).then(function (r) {
      r.etoiles.forEach(function (e) { var x = jp(gr, e.joueurId); if (x) { x.etoiles = (x.etoiles || []).filter(function (y) { return y.id !== e.id; }); x.etoiles.push(e); } });
      // une demande de l'enfant sur une étoile validée est close par le serveur : pareil ici
      list.forEach(function (it) { var x = jp(gr, it.joueurId); (x && x.demandes || []).forEach(function (d) { if (d.statut === 'attente' && d.domaine === it.domaine && d.etoile === it.etoile && (d.sorte !== 'briller' || brille)) d.statut = 'oui'; }); });
      (r.missionsFaites || []).forEach(function (id) { (gr.defmissions || []).forEach(function (m) { if (m.id === id) { m.statut = 'faite'; m.faiteLe = L.today(); } }); });
      persist();
      if (r.etoiles.length === 1) { var e0 = r.etoiles[0], s = SK.star(e0.domaine, e0.etoile); ui.toast((r.brillees ? '★ Elle brille' : '★ Étoile validée') + ' · ' + nomDe(gr, e0.joueurId) + ' · ' + (s ? s.nom : '') + (r.missionsFaites && r.missionsFaites.length ? ' · mission réussie !' : '')); }
      else ui.toast(r.etoiles.length + ' étoile' + (r.etoiles.length > 1 ? 's' : '') + ' envoyée' + (r.etoiles.length > 1 ? 's' : '') + (r.brillees ? ' (' + r.brillees + ' qui brille' + (r.brillees > 1 ? 'nt' : '') + ')' : '') + (r.deja ? ' · ' + r.deja + ' déjà acquise' + (r.deja > 1 ? 's' : '') : ''));
      return r;
    }).catch(function (e) { if (btn) btn.disabled = false; ui.toast(e.message, true); throw e; });
  }
  MC.act.plus1 = function (b) {
    envoyerPlus1(b.getAttribute('data-j'), b.getAttribute('data-m'), b.getAttribute('data-ev'), '', b).then(function (r) { if (!(r.nb === SK.PROPOSE_AU || r.nb === r.max)) app.rerender(); }).catch(function () { });
  };
  MC.act.valMission = function (b) {
    var gr = G(), m = (gr.defmissions || []).filter(function (x) { return x.id === b.getAttribute('data-m'); })[0];
    if (!m) return;
    var et = etatDe(gr, m), nom = nomDe(gr, m.joueurId);
    if (et.restantes.length === 1) { confirmerEtoile(m.joueurId, m.domaine, et.restantes[0].id).then(function (ok) { if (ok) valider([{ joueurId: m.joueurId, domaine: m.domaine, etoile: et.restantes[0].id }], b.getAttribute('data-ev'), b).then(function () { app.rerender(); }).catch(function () { }); }); return; }
    var acts = et.restantes.map(function (x) { return { label: icon('star', 18) + ' ' + esc(x.def.nom), value: x.id, cls: 'btn gold' }; });
    acts.push({ label: 'Annuler', value: null, cls: 'btn2 grey' });
    ui.modal({ title: 'Valider pour ' + esc(nom), body: '<p class="lead">Quelle étoile de sa mission « ' + esc(SK.titreMission(m)) + ' » ?</p>', actions: acts }).then(function (v) {
      if (v) valider([{ joueurId: m.joueurId, domaine: m.domaine, etoile: v }], b.getAttribute('data-ev')).then(function () { app.rerender(); }).catch(function () { });
    });
  };
  // (retouche UI-05) valider une étoile : un court panneau dit pour qui, quelle carte, quelle étoile (un +1, lui, part d'un toucher)
  function confirmerEtoile(jid, d, e) {
    var s = SK.star(d, e), D = SK.dom(d), nom = nomDe(G(), jid);
    if (!s || !D) return Promise.resolve(false);
    return ui.modal({
      title: 'Valider l\'étoile',
      body: '<p class="lead"><b>' + esc(nom) + ' · ' + esc(D.nom) + '</b><br>' + esc(s.nom) + ' : « ' + esc(s.phrase) + ' »</p><p class="small">Elle s\'allume pour ' + esc(nom) + ' (+' + C.XP.etoile + ' XP). Validée par erreur ? « Retirer » sur sa fiche.</p>',
      actions: [{ label: icon('star', 18) + ' Valider pour ' + esc(nom), value: true, cls: 'btn gold' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }]
    });
  }
  MC.act.valEtoile = function (b) {
    var jid = b.getAttribute('data-j'), d = b.getAttribute('data-d'), e = b.getAttribute('data-e');
    confirmerEtoile(jid, d, e).then(function (ok) {
      if (ok) valider([{ joueurId: jid, domaine: d, etoile: e }], b.getAttribute('data-ev'), b).then(function () { app.rerender(); }).catch(function () { });
    });
  };
  MC.act.retEtoile = function (b) {
    var gr = G(), id = b.getAttribute('data-id'), jid = b.getAttribute('data-j'), x = jp(gr, jid), e = x && (x.etoiles || []).filter(function (y) { return y.id === id; })[0];
    if (!e) return;
    var s = SK.star(e.domaine, e.etoile);
    ui.modal({ title: 'Retirer cette étoile ?', body: '<p class="lead">L\'étoile <b>' + esc(SK.dom(e.domaine).nom + ' · ' + (s ? s.nom : '')) + '</b> de ' + esc(x.joueur.prenom) + ' a été validée par erreur ? Elle redevient grise pour lui (et sa mission principale repart si elle la visait).</p>', actions: [{ label: 'Retirer', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('retirerEtoile', { id: id }).then(function (r) {
        x.etoiles = x.etoiles.filter(function (y) { return y.id !== id; });
        (r.missionsRouvertes || []).forEach(function (mid) { (gr.defmissions || []).forEach(function (m) { if (m.id === mid) { m.statut = 'active'; m.faiteLe = ''; } }); });
        persist(); ui.toast('Étoile retirée'); app.rerender();
      }).catch(function (er) { ui.toast(er.message, true); });
    });
  };
  MC.act.eteEtoile = function (b) {
    var gr = G(), id = b.getAttribute('data-id'), x = jp(gr, b.getAttribute('data-j')), e = x && (x.etoiles || []).filter(function (y) { return y.id === id; })[0];
    if (!e) return;
    var s = SK.star(e.domaine, e.etoile);
    ui.modal({ title: 'Éteindre cette étoile ?', body: '<p class="lead"><b>' + esc(SK.dom(e.domaine).nom + ' · ' + (s ? s.nom : '')) + '</b> de ' + esc(x.joueur.prenom) + ' ne brille plus, mais reste gagnée.</p>', actions: [{ label: 'Éteindre', value: true, cls: 'btn pink' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }] }).then(function (ok) {
      if (!ok) return;
      app.adultCall('retirerEtoile', { id: id, eteindre: true }).then(function () {
        e.brille = ''; e.brilleParNom = ''; e.brilleOccasion = ''; e.brilleParQui = '';
        persist(); ui.toast('Étoile éteinte'); app.rerender();
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
    var l = p1De(gr, jid, m.id), n = l.length, today = l.some(function (x) { return x.date === L.today(); }), max = SK.maxPlus1(m);
    if (n >= max) return '<span class="pill" style="--pc:var(--gold)">' + max + ' +1 · à valider</span>';
    return '<button type="button" class="p1btn' + (small ? ' sm' : '') + (today ? ' done' : '') + '" data-act="plus1" data-j="' + esc(jid) + '" data-m="' + esc(m.id) + '"' + (evId ? ' data-ev="' + esc(evId) + '"' : '') + ' aria-label="Encourager ' + esc(nomDe(gr, jid)) + ' (+1) : ' + esc(SK.titreMission(m)) + '">+1</button>';
  }
  MC.btnPlus1 = btnPlus1;

  // ======================================================================
  // Sur la page d'un entraînement ou d'un plateau : évaluer des Skills, les missions des présents
  // ======================================================================
  MC.pendantSeance = function (gr, e, pres, train) {
    var rows = pres.map(function (id) { var m = persoDe(gr, id); return m && !etatDe(gr, m).expiree ? { id: id, m: m } : null; }).filter(Boolean)
      .sort(function (a, b) { return nomDe(gr, a.id).localeCompare(nomDe(gr, b.id), 'fr'); });
    var list = rows.map(function (x) {
      var l = p1De(gr, x.id, x.m.id), n = l.length, today = l.filter(function (y) { return y.date === L.today(); })[0];
      return '<li class="mpres"><a class="grow" href="#/educ/joueur/' + esc(x.id) + '?t=missions"><span class="t1">' + esc(nomDe(gr, x.id)) + ' · ' + esc(SK.titreMission(x.m)) + '</span><span class="t2">' +
        (today ? '<b style="color:var(--green)">' + icon('check', 12) + ' +1 envoyé aujourd\'hui · il le voit</b>' : MC.encTxt(n)) + (n >= SK.PROPOSE_AU ? ' · à valider quand vous voulez' : '') + '</span></a>' +
        '<a class="cbtn grey" href="#/educ/encourager/' + esc(x.id) + '?m=' + esc(x.m.id) + '&evt=' + esc(e.id) + '" aria-label="+1 avec un mot pour ' + esc(nomDe(gr, x.id)) + '">' + icon('edit', 16) + '</a>' + btnPlus1(gr, x.id, x.m, e.id) + '</li>';
    }).join('');
    var nq = queue(evs(), e.id).length, plat = estPlateau(e);
    return '<section class="sec"><h2 class="h2">' + (plat ? 'Après le plateau' : train ? 'Après la séance' : 'Après l\'événement') + '</h2>' +
      '<a class="li" href="#/educ/skills?evt=' + esc(e.id) + '">' + icon(plat ? 'spark' : 'star', 20, 'style="color:var(--gold);flex:none"') + '<span class="grow"><span class="t1">' + (plat ? 'Faire briller des étoiles' : 'Évaluer des Skills') + '</span><span class="t2">' + (nq ? '<b style="color:var(--pink)">' + nq + ' pas encore envoyée' + (nq > 1 ? 's' : '') + '</b> · ' : '') + 'Avec les ' + pres.length + ' présents' + (plat ? ' · elles brillent' : ' · une étoile ou un atelier') + '</span></span>' + icon('right', 16) + '</a>' +
      '<div class="between" style="margin-top:6px"><span class="mlab" style="margin:0">Missions des présents</span><span class="small">un toucher = +1</span></div>' +
      (list ? '<ul class="list">' + list + '</ul>' : '<p class="small" style="margin:0">Aucun présent n\'a de mission principale en cours. Donnez-en une depuis Progrès › Missions ou la fiche d\'un enfant.</p>') +
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
      var m = persoActif(gr, p.id);   // une mission terminée ne reçoit plus d'encouragement
      if (!ENC || ENC.jid !== p.id) {
        var e0 = q.evt ? evtById(q.evt) : evtDuJour();
        ENC = { jid: p.id, quoi: m && (!q.m || q.m === m.id) && p1De(gr, p.id, m.id).length < SK.maxPlus1(m) ? m.id : 'autre', ev: e0 ? e0.id : '', mot: '', retour: q.evt ? '#/educ/evt/' + q.evt : '#/educ/joueur/' + p.id + '?t=missions' };
      }
      return paintEnc(gr, x, m);
    });
  }, { adult: 'e', nav: 'e:enfants', bg: BG });
  function paintEnc(gr, x, m) {
    var nom = x.joueur.prenom, n = m ? p1De(gr, x.joueur.id, m.id).length : 0, plein = m && n >= SK.maxPlus1(m);
    var t = L.today(), recents = evts().filter(function (e) { return !e.annule && jour(e) <= t && jour(e) >= L.addDays(t, -21) && (e.sorte === 'entrainement' || e.sorte === 'plateau'); })
      .sort(function (a, b) { return jour(a) < jour(b) ? 1 : -1; }).slice(0, 5);
    var quoi = '<div class="seg3" style="--n:2">' + (m ? '<button type="button" class="opt' + (ENC.quoi === m.id ? ' on' : '') + '" style="--oc:var(--gold)" aria-pressed="' + (ENC.quoi === m.id) + '" data-act="encQuoi" data-v="' + esc(m.id) + '"' + (plein ? ' disabled' : '') + '>★ ' + esc(SK.titreMission(m)) + (plein ? ' (' + SK.maxPlus1(m) + ' +1)' : '') + '</button>' : '<span class="opt" style="opacity:.6">Pas de mission principale</span>') +
      '<button type="button" class="opt' + (ENC.quoi === 'autre' ? ' on' : '') + '" aria-pressed="' + (ENC.quoi === 'autre') + '" data-act="encQuoi" data-v="autre">Autre chose</button></div>';
    var quand = '<div class="cop-list" style="grid-template-columns:1fr">' + recents.map(function (e) {
      var on = ENC.ev === e.id;
      return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="encEv" data-v="' + esc(e.id) + '"><span class="nm">' + esc(MC.evtOccasion(e)) + '</span><span class="ck">' + icon('check', 14) + '</span></button>';
    }).join('') + '<button type="button" class="cop' + (!ENC.ev ? ' on' : '') + '" aria-pressed="' + !ENC.ev + '" data-act="encEv" data-v=""><span class="nm">Sans événement (aujourd\'hui)</span><span class="ck">' + icon('check', 14) + '</span></button></div>';
    var info = ENC.quoi !== 'autre' && m ? (n + 1 === SK.PROPOSE_AU ? 'Ce sera son 3e encouragement : l\'appli te proposera de valider. Rien d\'automatique, c\'est toi qui décides.' : 'Ce sera son ' + (n + 1) + (n === 0 ? 'er' : 'e') + ' encouragement sur cette mission (il voit le nombre, sans total).') : 'Sur autre chose : le mot est obligatoire.';
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
  // (hashchange arrive sur window, pas sur document)
  window.addEventListener('hashchange', function () {
    if (location.hash.indexOf('#/educ/encourager/') !== 0) ENC = null;
    // une mission principale commencée puis abandonnée ne revient pas la fois suivante
    if (NM && NM.type === 'perso' && location.hash.indexOf('#/educ/missions/nouvelle') !== 0) NM = null;
  });

  // ======================================================================
  // Progrès › Skills : ÉVALUER (Skills v2, 25/10/2026) — un seul écran pour tout
  // - 1 étoile choisie : la liste des enfants ; plusieurs (un atelier) : une grille enfants × étoiles ;
  // - groupes d'ateliers publiés pour la séance : des pastilles pour n'afficher que le groupe qui arrive ;
  // - l'éduc touche ceux qui ont réussi (règle des 3 essais, 2 réussis sur 3, dans sa tête) ;
  // - gardé sur le téléphone (même sans réseau), envoyé en une fois à la fin :
  //   les enfants découvrent leurs étoiles après l'entraînement ;
  // - ouvert depuis un plateau : les étoiles touchées brillent (gagnées et brillent si besoin) ;
  // - les demandes des enfants en haut : Oui / Pas vu.
  // Remplace « Évaluer des Skills » et la « Journée d'évaluation » (3 cases par essai) de la v26.
  // ======================================================================
  var EV = null;
  function evs() {
    if (!EV) {
      EV = app.lsGet('mc-eval') || {};
      // les essais gagnés (2 sur 3) et pas envoyés de l'ancienne « Journée d'évaluation » (v26) passent dans la file
      var J = app.lsGet('mc-journee');
      if (J && J.d && J.ess && SK.dom(J.d)) {
        var old = [];
        Object.keys(J.ess).forEach(function (jid) { Object.keys(J.ess[jid] || {}).forEach(function (e) { if ((J.ess[jid][e] || []).filter(function (v) { return v === 1; }).length >= 2 && SK.star(J.d, e)) old.push(jid + '|' + SK.key(J.d, e)); }); });
        if (old.length) { EV.q = EV.q || {}; EV.repris = old; }
        app.lsSet('mc-journee', null);
      }
    }
    if (!Array.isArray(EV.sel)) EV.sel = ['plaquage:epaule'];
    EV.sel = EV.sel.filter(function (k) { var p = SK.parseKey(k); return p && SK.star(p.d, p.e); }).slice(0, SK.MAX_ATELIER);
    if (!EV.q || typeof EV.q !== 'object') EV.q = {};   // { idÉvénement (ou '_') : ['idJoueur|carte:étoile', …] }
    if (typeof EV.evt !== 'string') EV.evt = '';
    if (typeof EV.grp !== 'string') EV.grp = '';
    if (!SK.dom(EV.d)) EV.d = EV.sel.length ? SK.parseKey(EV.sel[0]).d : SK.DOMAINES[0].id;
    return EV;
  }
  function saveEv() { app.lsSet('mc-eval', EV); }
  function qKey(evtId) { return evtId || '_'; }
  // les étoiles touchées sont rangées par éduc (un autre éduc sur le même téléphone ne voit ni n'envoie celles d'un collègue)
  function qRoot(st) { var gr = G(), me = (gr && gr.moi && gr.moi.id) || '?'; if (!st.q[me] || typeof st.q[me] !== 'object' || Array.isArray(st.q[me])) st.q[me] = {}; return st.q[me]; }
  function queue(st, evtId) { var R = qRoot(st), k = qKey(evtId === undefined ? st.evt : evtId); if (!Array.isArray(R[k])) R[k] = []; return R[k]; }
  // combien d'étoiles touchées et pas encore envoyées (tous événements)
  function enAttente() { var st = evs(), R = qRoot(st), n = 0; Object.keys(R).forEach(function (k) { n += (R[k] || []).length; }); return n; }
  MC.evalEnAttente = enAttente;
  function estPlateau(e) { return !!(e && e.sorte === 'plateau'); }
  // les groupes d'ateliers publiés (ou au vote) de la séance
  function groupesDe(e) {
    var cd = app.S.cache.compos; if (!e || !cd) return [];
    var c = (cd.compos || []).filter(function (x) { return x.evenementId === e.id && x.partie === 'ateliers' && (x.statut === 'publiee' || x.statut === 'vote'); })[0];
    if (!c) return [];
    return (c.equipes || []).map(function (t) { return { id: String(t.id), nom: String(t.nom || t.id), ids: (t.joueurs || []).map(function (j) { return j.id; }) }; }).filter(function (t) { return t.ids.length; });
  }
  // les demandes des enfants en attente
  function demandesAttente(gr) {
    var out = [];
    actifs(gr).forEach(function (p) { (p.demandes || []).forEach(function (x) { if (x.statut === 'attente') out.push(x); }); });
    return out.sort(function (a, b) { return (a.cree || '') < (b.cree || '') ? -1 : 1; });
  }
  MC.demandesSkills = function () { var gr = G(); return gr ? demandesAttente(gr).length : 0; };
  // l'état d'une case : déjà (rien à faire), à toucher, touchée
  function etat(gr, id, k, plat, q) {
    var p = SK.parseKey(k), row = etoileDe(gr, id, p.d, p.e);
    if (row && (!plat || row.brille)) return { deja: true, brille: !!row.brille, row: row };
    return { deja: false, gagnee: !!row, on: q.indexOf(id + '|' + k) >= 0 };
  }
  function nomCourt(s) { return s.nom.length > 14 ? s.nom.slice(0, 13) + '.' : s.nom; }

  app.route('/educ/skills', function (p, q) {
    return both().then(function (r) {
      var gr = r[0], st = evs();
      app.refreshNav();
      if (q.evt !== undefined && q.evt !== st.evt) { st.evt = q.evt; st.grp = ''; saveEv(); }
      else if (st.evt && !evtById(st.evt)) { st.evt = ''; st.grp = ''; }
      if (!st.evt && q.evt === undefined) { var ej = evtDuJour(); if (ej) st.evt = ej.id; }
      return paintEval(gr, st);
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });
  // l'ancienne journée d'évaluation : le même écran
  app.route('/educ/skills/journee', function () { app.go('#/educ/skills'); return Promise.resolve('<main class="screen"></main>'); }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });

  function paintEval(gr, st) {
    if (Array.isArray(st.repris) && st.repris.length) { var q0 = queue(st, ''); st.repris.forEach(function (k) { if (q0.indexOf(k) < 0) q0.push(k); }); st.repris = null; saveEv(); }
    var e = st.evt ? evtById(st.evt) : null, plat = estPlateau(e), q = queue(st);
    var tous = e ? presentsDe(e, gr) : actifs(gr).map(function (p) { return p.joueur.id; });
    var grps = groupesDe(e), g = grps.filter(function (x) { return x.id === st.grp; })[0] || null;
    var ok = {}; tous.forEach(function (id) { ok[id] = true; });
    var ids = g ? g.ids.filter(function (id) { return ok[id]; }) : tous;
    var sel = st.sel, D = SK.dom(st.d);

    // l'en-tête : avec qui, et le plateau
    var head = '<section class="skeval"><div class="between" style="align-items:center"><span class="hud" style="color:var(--gold)">Évaluer · ' + ids.length + (g ? ' dans ' + esc(g.nom) : e ? ' présent' + (ids.length > 1 ? 's' : '') : ' enfants') + (e ? ' · ' + esc(e.lieu || e.titre) : '') + '</span><button type="button" class="lnk" data-act="skEvt">Changer</button></div>' +
      (plat ? '<p class="small" style="margin:0;color:var(--gold)">' + icon('spark', 14) + ' Après un plateau : les étoiles que vous touchez <b>brillent</b> (et sont gagnées si l\'enfant ne les avait pas).</p>' : '') +
      (function () { var R = qRoot(st), autres = Object.keys(R).filter(function (k) { return k !== qKey(st.evt) && (R[k] || []).length; }); if (!autres.length) return ''; var k = autres[0], ev = k === '_' ? null : evtById(k);
        return '<a class="small" style="color:var(--pink)" href="#/educ/skills?evt=' + esc(k === '_' ? '' : k) + '">' + R[k].length + ' étoile' + (R[k].length > 1 ? 's' : '') + ' pas encore envoyée' + (R[k].length > 1 ? 's' : '') + (ev ? ' · ' + esc(ev.titre) : ' · tous les enfants') + '</a>'; })() +
      (function () { var nd = demandesAttente(gr).length; return nd ? '<button type="button" class="lnk" style="align-self:flex-start;color:var(--cyan)" data-act="evVoirDem">' + nd + ' demande' + (nd > 1 ? 's' : '') + ' d\'enfant' + (nd > 1 ? 's' : '') + ' à répondre ↓</button>' : ''; })() + '</section>';

    // les demandes des enfants
    var dems = demandesAttente(gr), demHtml = '';
    if (dems.length) demHtml = '<section class="sec" id="evdem"><div class="between"><h2 class="mlab" style="margin:0">Demandes des enfants (' + dems.length + ')</h2><span class="small">quand vous voulez</span></div><ul class="list">' + dems.map(function (x) {
      var s = SK.star(x.domaine, x.etoile), Dd = SK.dom(x.domaine);
      return '<li class="li evdem"><span class="grow"><span class="t1">' + esc(nomDe(gr, x.joueurId)) + ' · ' + esc(Dd ? Dd.nom : '') + ' · ' + esc(s ? s.nom : x.etoile) + '</span><span class="t2">' + (x.sorte === 'briller' ? 'L\'a fait au plateau' + (x.occasion ? ' (' + esc(x.occasion) + ')' : '') + ' : la faire briller ?' : 'Demande l\'étoile' + (x.occasion ? ' (' + esc(x.occasion) + ')' : '')) + '</span></span>' +
        '<button type="button" class="btn2 sm grey" data-act="demNon" data-id="' + esc(x.id) + '">Pas vu</button><button type="button" class="btn2 sm gold" data-act="demOui" data-id="' + esc(x.id) + '">Oui</button></li>';
    }).join('') + '</ul></section>';

    // le choix des étoiles : un atelier prêt, ou carte › étoiles (plusieurs possibles)
    var ateliers = '<div class="skstars evats">' + SK.ATELIERS.map(function (a) { var on = a.etoiles.length === sel.length && a.etoiles.every(function (k) { return sel.indexOf(k) >= 0; });
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--cyan)" aria-pressed="' + on + '" data-act="evAt" data-v="' + a.id + '">' + esc(a.nom) + '</button>'; }).join('') + '</div>';
    var doms = '<div class="skdoms evdoms">' + SK.DOMAINES.map(function (x) { var on = x.id === D.id, n = sel.filter(function (k) { return k.indexOf(x.id + ':') === 0; }).length;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + x.color + '" aria-pressed="' + on + '" data-act="evDom" data-v="' + x.id + '">' + icon(x.icon, 16) + ' ' + esc(x.nom) + (n ? ' · ' + n : '') + '</button>'; }).join('') + '</div>';
    var stars = '<div class="skstars">' + D.etoiles.map(function (x) { var k = SK.key(D.id, x.id), on = sel.indexOf(k) >= 0;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--gold)" aria-pressed="' + on + '" data-act="evStar" data-v="' + k + '">★ ' + esc(x.nom) + '</button>'; }).join('') + '</div>';
    var atSel = SK.ATELIERS.filter(function (a) { return a.etoiles.length === sel.length && a.etoiles.every(function (k) { return sel.indexOf(k) >= 0; }); })[0];
    var resume = sel.map(function (k) { var p = SK.parseKey(k); return SK.star(p.d, p.e).nom; }).join(' · ');
    var choix = (sel.length && !st.ouvert)
      ? '<section class="sec evsel"><div class="between" style="align-items:center"><span class="grow"><span class="mlab" style="margin:0">' + (atSel ? 'Atelier · ' + esc(atSel.nom) : sel.length > 1 ? sel.length + ' étoiles' : 'L\'étoile') + '</span><span class="small" style="display:block;color:var(--soft)">' + esc(resume) + '</span></span><button type="button" class="btn2 sm grey" data-act="evOuvre">Changer</button></div></section>'
      : '<section class="sec"><div class="between"><h2 class="mlab" style="margin:0">Les étoiles (' + sel.length + ' / ' + SK.MAX_ATELIER + ')</h2>' + (sel.length ? '<span><button type="button" class="lnk" data-act="evClr">Effacer</button> <button type="button" class="btn2 sm gold" data-act="evFerme">OK</button></span>' : '') + '</div>' +
        '<span class="small" style="color:var(--dim)">Un atelier prêt</span>' + ateliers + '<span class="small" style="color:var(--dim)">Ou carte par carte (plusieurs possibles)</span>' + doms + stars + '</section>';

    // les groupes d'ateliers
    var grpHtml = grps.length ? '<div class="evgrps" role="group" aria-label="Groupe">' + [{ id: '', nom: 'Tous' }].concat(grps).map(function (x) { var on = x.id === st.grp;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--cyan)" aria-pressed="' + on + '" data-act="evGrp" data-v="' + esc(x.id) + '">' + esc(x.nom) + '</button>'; }).join('') + '</div>' : '';

    // les enfants : liste (1 étoile) ou grille (plusieurs)
    var corps = '';
    if (!sel.length) corps = '<div class="empty">Choisissez une étoile, ou un atelier prêt.</div>';
    else if (!ids.length) corps = '<div class="empty">Personne : cochez d\'abord les présents de la séance.</div>';
    else if (sel.length === 1) {
      var k0 = sel[0], p0 = SK.parseKey(k0), s0 = SK.star(p0.d, p0.e), nAcq = 0;
      corps = '<p class="small" style="margin:0;color:var(--soft)">« ' + esc(s0.phrase) + ' »<br><span style="color:var(--dim)">' + esc(s0.repere) + '</span></p><ul class="list">' + ids.map(function (id) {
        var x = etat(gr, id, k0, plat, q), m = persoDe(gr, id), isM = m && !etatDe(gr, m).expiree && SK.dansMission(m, p0.d, p0.e), n = isM ? p1De(gr, id, m.id).length : 0;
        if (x.deja) nAcq++;
        var right = x.deja ? '<span class="skok">' + icon('star', 14) + (x.brille ? ' Brille' : ' Acquise') + '</span>'
          : (isM ? btnPlus1(gr, id, m, e && e.id, true) : '') + '<button type="button" class="evc evtog' + (x.on ? ' on' : '') + (x.gagnee ? ' gagnee' : '') + '" aria-pressed="' + !!x.on + '" data-act="evCell" data-k="' + esc(id + '|' + k0) + '" aria-label="' + esc(nomDe(gr, id) + ' : ' + s0.nom) + '">' + icon('star', 18) + '</button>';
        return '<li class="li skrow' + (x.deja ? ' acq' : '') + (isM ? ' mis' : '') + '">' + nivTag(gr, id) + '<span class="grow"><span class="t1">' + esc(nomDe(gr, id)) + '</span>' +
          (x.deja ? '<span class="t2">' + (x.brille ? 'brille · ' + esc(x.row.brilleParNom) + ', ' + jourTxt(x.row.brille) : 'par ' + esc(qui(gr, x.row)) + ', ' + jourTxt(x.row.date)) + '</span>' : x.gagnee ? '<span class="t2">gagnée à l\'entraînement : touchez pour la faire briller</span>' : isM ? '<span class="t2" style="color:var(--violet)">sa mission principale · ' + MC.encTxt(n) + '</span>' : '') + '</span>' + right + '</li>';
      }).join('') + '</ul><p class="small" style="margin:0">' + nAcq + ' / ' + ids.length + (plat ? ' la font déjà briller' : ' l\'ont déjà') + '</p>';
    } else {
      var defs = sel.map(function (k) { var p = SK.parseKey(k); return { k: k, s: SK.star(p.d, p.e), D: SK.dom(p.d) }; });
      corps = '<p class="small" style="margin:0;color:var(--soft)">Après les 3 essais, touchez ceux qui ont réussi 2 fois sur 3.</p>' +
        '<div class="evgrid" style="--n:' + defs.length + '"><span></span>' + defs.map(function (x) { return '<span class="evh" style="--dc:' + x.D.color + '" title="' + esc(x.s.phrase) + '">' + esc(nomCourt(x.s)) + '</span>'; }).join('') +
        ids.map(function (id) {
          return '<span class="evn">' + esc(nomDe(gr, id)) + '</span>' + defs.map(function (x) {
            var c = etat(gr, id, x.k, plat, q);
            if (c.deja) return '<span class="evc deja" title="' + (c.brille ? 'brille déjà' : 'déjà acquise') + '">' + (c.brille ? 'brille' : 'déjà') + '</span>';
            return '<button type="button" class="evc' + (c.on ? ' on' : '') + (c.gagnee ? ' gagnee' : '') + '" aria-pressed="' + !!c.on + '" data-act="evCell" data-k="' + esc(id + '|' + x.k) + '" aria-label="' + esc(nomDe(gr, id) + ' : ' + x.s.nom + (c.gagnee ? ' (gagnée, faire briller)' : '')) + '">' + icon('star', 18) + '</button>';
          }).join('');
        }).join('') + '</div>' +
        '<details class="evrep"><summary class="small">Ce qu\'on regarde</summary>' + defs.map(function (x) { return '<p class="small" style="margin:6px 0 0"><b>' + esc(x.s.nom) + '</b> : ' + esc(x.s.repere) + '</p>'; }).join('') + '</details>';
    }

    var n = q.length;
    var dock = '<div class="cp-bar evdock"><span class="grow small" style="color:var(--soft)" id="ev_t">' + dockTxt(n) + '</span>' +
      '<button type="button" class="btn" id="ev_send" data-act="evSend"' + (n ? '' : ' disabled') + '>' + icon('send', 16) + ' Envoyer</button></div>';

    return '<main class="screen">' + MC.educBar(gr, 'Progrès') + MC.progresTabs('skills') + head + choix +
      (grpHtml ? '<section class="sec"><h2 class="mlab" style="margin:0">Le groupe qui arrive</h2>' + grpHtml + '</section>' : '') +
      '<section class="sec">' + corps + '</section>' + demHtml +
      '<p class="small" style="margin:0">Les enfants découvrent leurs étoiles après l\'entraînement, quand vous envoyez. Le +1 dit « tu es sur la bonne voie » ; seule une étoile envoyée la donne.</p>' +
      '<div class="grid2"><a class="li" href="#/educ/skills/passeport">' + icon('list', 20, 'style="color:var(--cyan);flex:none"') + '<span class="grow"><span class="t1">Passeport du groupe</span><span class="t2">Toutes les cartes</span></span>' + icon('right', 16) + '</a></div>' +
      dock + '</main>';
  }
  function dockTxt(n) { return '<b id="ev_n">' + n + '</b> ' + (n > 1 ? 'étoiles prêtes, gardées' : 'étoile prête, gardée') + ' sur le téléphone'; }
  function majDock() {
    var st = evs(), n = queue(st).length, t = document.getElementById('ev_t'), b = document.getElementById('ev_send');
    if (t) t.innerHTML = dockTxt(n); if (b) b.disabled = !n;
  }
  MC.act.evCell = function (b) {
    var st = evs(), k = b.getAttribute('data-k'), q = queue(st), i = q.indexOf(k);
    if (i >= 0) q.splice(i, 1); else q.push(k);
    saveEv();
    var on = i < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    majDock(); app.refreshNav && app.refreshNav();
  };
  MC.act.evAt = function (b) { var st = evs(), a = SK.atelier(b.getAttribute('data-v')); if (!a) return; st.sel = a.etoiles.slice(0, SK.MAX_ATELIER); st.d = SK.parseKey(st.sel[0]).d; st.ouvert = false; saveEv(); app.rerender(); };
  MC.act.evDom = function (b) { var st = evs(); st.d = b.getAttribute('data-v'); saveEv(); app.rerender(); };
  MC.act.evStar = function (b) {
    var st = evs(), k = b.getAttribute('data-v'), i = st.sel.indexOf(k);
    if (i >= 0) st.sel.splice(i, 1);
    else { if (st.sel.length >= SK.MAX_ATELIER) { ui.toast(SK.MAX_ATELIER + ' étoiles au plus par atelier'); return; } st.sel.push(k); }
    saveEv(); app.rerender();
  };
  MC.act.evClr = function () { var st = evs(); st.sel = []; st.ouvert = true; saveEv(); app.rerender(); };
  MC.act.evOuvre = function () { var st = evs(); st.ouvert = true; saveEv(); app.rerender(); };
  MC.act.evFerme = function () { var st = evs(); st.ouvert = false; saveEv(); app.rerender(); window.scrollTo(0, 0); };
  MC.act.evVoirDem = function () { var x = document.getElementById('evdem'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  MC.act.evGrp = function (b) { var st = evs(); st.grp = b.getAttribute('data-v') || ''; saveEv(); app.rerender(); window.scrollTo(0, 0); };
  // les enfants à qui on peut encore envoyer : actifs, et présents si la file est celle d'un événement
  function poolDe(gr, st) {
    var e = st.evt ? evtById(st.evt) : null, ok = {};
    (e ? presentsDe(e, gr) : actifs(gr).map(function (p) { return p.joueur.id; })).forEach(function (id) { ok[id] = true; });
    return ok;
  }
  MC.act.evSend = function (b) {
    var gr = G(), st = evs(), e = st.evt ? evtById(st.evt) : null, q = queue(st), ok = poolDe(gr, st);
    if (!q.length) return;
    // un enfant devenu inactif ou plus présent sort de la file (sinon le serveur refuserait tout le lot)
    var hors = q.filter(function (x) { var p = SK.parseKey(x.slice(x.indexOf('|') + 1)); return !ok[x.slice(0, x.indexOf('|'))] || !p || !SK.star(p.d, p.e); });
    if (hors.length) {
      var R0 = qRoot(st); R0[qKey(st.evt)] = q.filter(function (x) { return hors.indexOf(x) < 0; }); saveEv();
      ui.toast(hors.length + ' étoile' + (hors.length > 1 ? 's' : '') + ' retirée' + (hors.length > 1 ? 's' : '') + ' : enfant absent ou plus inscrit');
      q = queue(st); if (!q.length) { app.rerender(); return; }
    }
    var envoyes = q.slice(), lots = [];
    for (var i = 0; i < envoyes.length; i += 250) lots.push(envoyes.slice(i, i + 250));
    if (b) b.disabled = true;
    var chain = Promise.resolve(), faits = [];
    lots.forEach(function (lot) {
      chain = chain.then(function () {
        var list = lot.map(function (x) { var i = x.indexOf('|'), p = SK.parseKey(x.slice(i + 1)); return { joueurId: x.slice(0, i), domaine: p.d, etoile: p.e }; });
        return valider(list, e ? e.id : null, null, estPlateau(e)).then(function () {
          faits = faits.concat(lot);
          var R = qRoot(st); R[qKey(st.evt)] = queue(st).filter(function (x) { return faits.indexOf(x) < 0; }); saveEv();
        });
      });
    });
    chain.then(function () { app.refreshNav && app.refreshNav(); app.rerender(); }).catch(function (er) {
      if (b) b.disabled = false;
      if (er && (er.code === 'reseau' || er.code === 'lent')) ui.toast('Pas envoyé : les étoiles restent gardées sur le téléphone. Réessayez avec du réseau.', true);
      app.rerender();
    });
  };
  function repondre(b, oui) {
    var gr = G(), id = b.getAttribute('data-id');
    b.disabled = true;
    app.adultCall('repondreDemande', { id: id, oui: !!oui }).then(function (r) {
      gr.joueurs.forEach(function (p) { (p.demandes || []).forEach(function (x, i) { if (x.id === id) p.demandes[i] = r.demande; }); });
      if (r.etoile) { var x = jp(gr, r.etoile.joueurId); if (x) { x.etoiles = (x.etoiles || []).filter(function (y) { return y.id !== r.etoile.id; }); x.etoiles.push(r.etoile); } }
      (r.missionsFaites || []).forEach(function (mid) { (gr.defmissions || []).forEach(function (m) { if (m.id === mid) { m.statut = 'faite'; m.faiteLe = L.today(); } }); });
      persist(); app.refreshNav && app.refreshNav();
      ui.toast(oui ? (r.etoile && r.etoile.brille ? 'L\'étoile brille' : 'Étoile donnée') + ' : ' + nomDe(gr, r.demande.joueurId) + ' la verra' : 'Réponse envoyée : « retente la prochaine fois »');
      app.rerender();
    }).catch(function (er) { b.disabled = false; ui.toast(er.message, true); });
  }
  MC.act.demOui = function (b) { repondre(b, true); };
  MC.act.demNon = function (b) { repondre(b, false); };
  MC.act.skEvt = function () {
    var gr = G(), t = L.today();
    var list = evts().filter(function (e) { return !e.annule && jour(e) >= L.addDays(t, -14) && jour(e) <= L.addDays(t, 2); }).sort(function (a, b) { return jour(a) < jour(b) ? 1 : -1; });
    ui.modal({
      title: 'Avec qui ?',
      body: '<div class="sec" style="gap:6px">' + list.map(function (e) { return '<button type="button" class="li" data-skev="' + esc(e.id) + '">' + icon(e.sorte === 'plateau' ? 'flag' : 'calendar', 18) + '<span class="grow"><span class="t1">' + esc(e.titre) + '</span><span class="t2">' + esc(ui.fmtDate(jour(e))) + ' · ' + presentsDe(e, gr).length + ' présents</span></span></button>'; }).join('') +
        '<button type="button" class="li" data-skev="">' + icon('kids', 18) + '<span class="grow"><span class="t1">Tous les enfants</span><span class="t2">' + actifs(gr).length + ' enfants</span></span></button></div>',
      actions: [{ label: 'Fermer', value: null, cls: 'btn2 grey' }],
      onOpen: function (host, close) { host.addEventListener('click', function (ev) { var x = ev.target.closest('[data-skev]'); if (x) { var st = evs(); st.evt = x.getAttribute('data-skev'); st.grp = ''; saveEv(); close(null); app.go('#/educ/skills?evt=' + st.evt); } }); }
    });
  };

  // ---------- le passeport du groupe ----------
  var ABR = { plaquage: 'Plaq.', ruck: 'Ruck', maul: 'Maul', defense: 'Déf.', porteur: 'Port.', passe: 'Passe', pied: 'Pied', soutien: 'Sout.' };
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
        '<p class="small" style="margin:0">Le nombre d\'étoiles de chaque carte (' + SK.DOMAINES.map(function (D) { return ABR[D.id] + ' ' + D.etoiles.length; }).join(', ') + '). Touchez un prénom pour sa fiche. Jamais montré aux enfants comme un classement.</p></div>' +
        '<div class="sktable-w"><table class="sktable"><thead><tr><th></th>' + SK.DOMAINES.map(function (D) { return '<th scope="col" style="color:' + D.color + '" title="' + esc(D.nom) + '">' + esc(ABR[D.id] || D.nom) + '</th>'; }).join('') + '<th>Tout</th></tr></thead><tbody>' + rows + '</tbody>' +
        '<tfoot><tr><th>Total</th>' + SK.DOMAINES.map(function (D) { return '<td>' + tot[D.id] + '</td>'; }).join('') + '<td></td></tr></tfoot></table></div></main>';
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#2E2612' });

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
    var kids = actifs(gr), groupe = '';
    MC.MISSIONS.forEach(function (Dx) {   // les 2 missions du jeu à 10 : le poste, les copains
      var f = kids.filter(function (p) { return M.etat({ missions: p.missions || [] }, Dx.id).faite; }).length;
      groupe += '<li><a class="li mrow" href="#/educ/mission/' + Dx.id + '"><span class="mtag">' + (Dx.id === 'poste' ? 'Poste' : 'Copains') + '</span><span class="grow"><span class="t1">' + esc(Dx.titre) + '</span><span class="t2">' + f + ' / ' + kids.length + ' l\'ont faite' + (kids.length - f ? ' · ' + (kids.length - f) + ' pas encore' : '') + '</span></span>' + icon('right', 16) + '</a></li>';
    });
    (gr.defmissions || []).filter(function (m) { return m.sorte !== 'etoile' && m.statut !== 'retiree'; }).sort(function (a, b) { return a.cree < b.cree ? 1 : -1; }).forEach(function (m) {
      var s = statsGroupe(gr, m);
      groupe += '<li><a class="li mrow" href="#/educ/missions/m/' + esc(m.id) + '"><span class="mtag">' + (m.sorte === 'video' ? 'Vidéo' : 'QCM') + '</span><span class="grow"><span class="t1">' + esc(m.titre) + '</span><span class="t2">' + s.faits + ' / ' + s.kids + ' l\'ont faite' + (s.moyenne !== null ? ' · moyenne ' + String(s.moyenne).replace('.', ',') + ' / ' + s.nq : '') + (m.fin ? ' · jusqu\'au ' + jourTxt(m.fin) : '') + '</span></span>' + icon('right', 16) + '</a></li>';
    });
    var indiv = (gr.defmissions || []).filter(function (m) { return m.sorte === 'etoile' && m.statut === 'active' && jp(gr, m.joueurId) && jp(gr, m.joueurId).joueur.actif; })
      .sort(function (a, b) { return nomDe(gr, a.joueurId).localeCompare(nomDe(gr, b.joueurId), 'fr'); });
    var ind = indiv.map(function (m) {
      var l = p1De(gr, m.joueurId, m.id), n = l.length, last = l[0], et = etatDe(gr, m), D = SK.dom(m.domaine);
      return '<li class="mpres"><a class="grow" href="#/educ/joueur/' + esc(m.joueurId) + '?t=missions"><span class="t1">' + esc(nomDe(gr, m.joueurId)) + ' · ' + esc(D ? D.nom : '') + ' · ' + esc(SK.titreMission(m)) + '</span>' +
        '<span class="t2">' + et.n + ' / ' + et.max + ' étoile' + (et.max > 1 ? 's' : '') + ' · ' + (et.expiree ? '<b style="color:var(--orange)">terminée le ' + jourTxt(m.fin) + '</b>' : m.fin ? 'jusqu\'au ' + jourTxt(m.fin) : 'sans date') + (last ? ' · dernier +1 : ' + esc(qui(gr, last)) + ', ' + jourTxt(last.date) : '') + '</span>' +
        '<span class="row" style="gap:8px;margin-top:4px">' + MC.encDots(n) + '<span class="small" style="color:var(--violet)">' + MC.encTxt(n) + '</span>' + (n >= SK.PROPOSE_AU && et.restantes.length ? '<span class="pill" style="--pc:var(--gold)">À valider</span>' : '') + '</span></a>' +
        (et.restantes.length ? '<button type="button" class="btn2 sm gold" data-act="valMission" data-m="' + esc(m.id) + '" aria-label="Valider une étoile pour ' + esc(nomDe(gr, m.joueurId)) + '">Valider l\'étoile</button>' : '') + (et.expiree ? '' : btnPlus1(gr, m.joueurId, m)) + '</li>';
    }).join('');
    var reussies = (gr.defmissions || []).filter(function (m) { return m.sorte === 'etoile' && m.statut === 'faite'; }).sort(function (a, b) { return (a.faiteLe || '') < (b.faiteLe || '') ? 1 : -1; });
    var sans = kids.filter(function (p) { var m = persoDe(gr, p.joueur.id); return !m || etatDe(gr, m).expiree; }).length;
    return '<main class="screen">' + MC.educBar(gr, 'Progrès') + MC.progresTabs('missions') +
      '<section class="sec"><h2 class="h2">Pour le groupe</h2>' + (groupe ? '<ul class="list">' + groupe + '</ul>' : '<p class="small" style="margin:0">Pas encore de mission pour le groupe.</p>') + '</section>' +
      '<section class="sec"><div class="between"><h2 class="h2">Missions principales</h2><span class="small">1 à 3 étoiles par enfant</span></div>' +
      (ind ? '<ul class="list">' + ind + '</ul>' : '<p class="small" style="margin:0">Pas encore de mission principale.</p>') +
      (sans ? '<p class="small" style="margin:0">' + sans + ' enfant' + (sans > 1 ? 's' : '') + ' sans mission principale en cours.</p>' : '') +
      '<p class="small" style="margin:0">Jusqu\'à 5 encouragements (+1) par étoile visée. Au 3e, l\'appli propose de valider ; rien d\'automatique, c\'est un éduc qui valide.</p></section>' +
      '<div class="grid2"><a class="btn2" href="#/educ/missions/nouvelle?type=video">' + icon('plus', 16) + ' Pour le groupe</a><a class="btn2 gold" href="#/educ/missions/nouvelle?type=perso">' + icon('plus', 16) + ' Mission principale</a></div>' +
      (reussies.length ? '<details><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Missions principales réussies (' + reussies.length + ')</summary><ul class="list" style="margin-top:6px">' + reussies.map(function (m) { return '<li><a class="li" href="#/educ/joueur/' + esc(m.joueurId) + '?t=missions"><span class="grow"><span class="t1">' + esc(nomDe(gr, m.joueurId)) + ' · ★ ' + esc(SK.titreMission(m)) + '</span><span class="t2">réussie le ' + jourTxt(m.faiteLe) + '</span></span></a></li>'; }).join('') + '</ul></details>' : '') +
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
    if (NM && NM.type === type && (type !== 'perso' || !joueur || NM.joueurs.indexOf(joueur) >= 0)) { if (joueur) NM.depuis = joueur; return NM; }
    var vac = SK.prochainesVacances(L.today());
    NM = { type: type, titre: '', texte: '', video: '', fin: type === 'perso' ? vac.date : L.addDays(L.today(), 14), finChoix: 'vac', xp: 50, questions: type === 'qcm' ? [{ q: '', opts: ['', '', ''], ok: -1 }] : [],
      joueurs: joueur ? [joueur] : [], filtre: 'tous', d: '', etoiles: [], mot: '', depuis: joueur || '' };
    return NM;
  }
  app.route('/educ/missions/nouvelle', function (p, q) {
    return both().then(function (r) {
      var gr = r[0], type = q.type === 'perso' ? 'perso' : q.type === 'qcm' ? 'qcm' : 'video';
      var st = nmInit(type, q.joueur);
      return type === 'perso' ? paintNouvellePerso(gr, st, q) : paintNouvelleGroupe(gr, st);
    });
  }, { adult: 'e', nav: 'e:progres', bg: '#33122A' });
  // ---------- donner une mission principale (visuels v2) : plusieurs enfants d'un coup, une carte, 1 à 3 étoiles,
  // une date de fin (les prochaines vacances par défaut), un mot ; récapitulatif par enfant avant de donner ----------
  function nmPlan(gr, st) {
    // pour chaque enfant choisi : les étoiles qui lui resteront, la mission remplacée, ou pourquoi il n'aura rien
    return st.joueurs.map(function (id) {
      var x = jp(gr, id), d = dataDe(gr, id), A = SK.acquis(d), cur = persoActif(gr, id);   // une mission terminée ne bloque pas
      var reste = st.d ? st.etoiles.filter(function (e) { return !A[SK.key(st.d, e)]; }) : [];
      var r = { id: id, nom: x ? x.joueur.prenom : '?', reste: reste, cur: cur };
      if (!st.d || !st.etoiles.length) r.ko = '';
      else if (!reste.length) r.ko = st.etoiles.length > 1 ? 'a déjà ces étoiles' : 'a déjà cette étoile';
      else if (cur && cur.parQui && cur.parQui !== gr.moi.id && !gr.moi.admin) r.ko = 'sa mission vient de ' + (cur.parNom || 'un autre éduc') + ' : lui ou l\'admin peut la remplacer';
      return r;
    });
  }
  function paintNouvellePerso(gr, st, q) {
    var back = st.depuis ? '#/educ/joueur/' + st.depuis + '?t=missions' : '#/educ/missions';
    var bar = MC.educBar(gr, 'Mission principale', back, st.depuis ? nomDe(gr, st.depuis) : 'Missions');
    var head = '<div class="head"><span class="kicker" style="color:var(--gold)">Mission principale</span><h1 class="big sm">Donner une mission principale</h1><p class="small" style="margin:0">1 à 3 étoiles d\'une même carte, jusqu\'à une date. L\'enfant la voit en haut de ses Missions et sur sa carte Skills, avec vos encouragements. Une seule à la fois : la nouvelle remplace celle en cours.</p></div>';
    // 1. les enfants
    var ev = evtDuJour(), pres = ev ? presentsDe(ev, gr) : [];
    var kids = actifs(gr).filter(function (p) {
      if (st.filtre === 'presents') return pres.indexOf(p.joueur.id) >= 0;
      if (st.filtre === 'sans') { var m = persoDe(gr, p.joueur.id); return !m || etatDe(gr, m).expiree; }
      return true;
    });
    var filtres = '<div class="seg3" style="--n:' + (ev ? 3 : 2) + '">' + [['tous', 'Tous']].concat(ev ? [['presents', 'Présents (' + pres.length + ')']] : []).concat([['sans', 'Sans mission']]).map(function (f) {
      return '<button type="button" class="opt' + (st.filtre === f[0] ? ' on' : '') + '" aria-pressed="' + (st.filtre === f[0]) + '" data-act="nmFiltre" data-v="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div>';
    var liste = '<div class="cop-list">' + kids.map(function (p) {
      var id = p.joueur.id, on = st.joueurs.indexOf(id) >= 0, m = persoDe(gr, id), sub = m ? (etatDe(gr, m).expiree ? 'mission terminée' : 'a « ' + SK.titreMission(m) + ' »') : '';
      return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="nmKid" data-v="' + esc(id) + '"><span class="nm">' + esc(p.joueur.prenom) + (sub ? '<small class="csp">' + esc(sub) + '</small>' : '') + '</span><span class="ck">' + icon('check', 14) + '</span></button>';
    }).join('') + '</div>';
    var tous = kids.length && kids.every(function (p) { return st.joueurs.indexOf(p.joueur.id) >= 0; });
    var s1 = '<section class="sec"><div class="between"><h2 class="mlab" style="margin:0">1. Pour qui ? · ' + st.joueurs.length + ' choisi' + (st.joueurs.length > 1 ? 's' : '') + '</h2><button type="button" class="lnk" data-act="nmTous">' + (tous ? 'Tout décocher' : 'Tout cocher') + '</button></div>' + filtres + liste + '</section>';
    // 2. la carte
    var s2 = '<section class="sec"><h2 class="mlab" style="margin:0">2. La carte</h2><div class="skdoms">' + SK.DOMAINES.map(function (D) { var on = D.id === st.d; return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:' + D.color + '" aria-pressed="' + on + '" data-act="nmDom" data-v="' + D.id + '">' + icon(D.icon, 16) + ' ' + esc(D.nom) + '</button>'; }).join('') + '</div></section>';
    // 3. les étoiles (1 à 3) : combien des enfants choisis l'ont déjà
    var s3 = '<section class="sec"><h2 class="mlab" style="margin:0">3. Les étoiles · 1 à 3</h2><p class="small" style="margin:0">Choisissez d\'abord la carte.</p></section>';
    if (st.d) {
      var D = SK.dom(st.d);
      s3 = '<section class="sec"><h2 class="mlab" style="margin:0">3. Les étoiles · 1 à 3</h2><div class="sec" style="gap:6px">' + D.etoiles.map(function (sd) {
        var on = st.etoiles.indexOf(sd.id) >= 0, deja = st.joueurs.filter(function (id) { return SK.acquis(dataDe(gr, id))[SK.key(st.d, sd.id)]; }).length, plein = !on && st.etoiles.length >= 3;
        return '<button type="button" class="cop' + (on ? ' on' : '') + '"' + (plein ? ' disabled' : ' data-act="nmStar" data-v="' + sd.id + '"') + ' aria-pressed="' + on + '"><span class="nm">★ ' + esc(sd.nom) + '<small class="csp">' + (st.joueurs.length ? deja + ' sur ' + st.joueurs.length + ' l\'ont déjà · ' : '') + '« ' + esc(sd.phrase) + ' »</small></span><span class="ck">' + icon('check', 14) + '</span></button>';
      }).join('') + '</div></section>';
    }
    // 4. jusqu'à quand (obligatoire) : les prochaines vacances par défaut
    var vac = SK.prochainesVacances(L.today()), t = L.today();
    var choix = [['vac', (vac.nom ? 'Vacances de ' + (vac.nom === 'été' ? 'l\'été' : vac.nom === 'hiver' ? 'l\'hiver' : vac.nom === 'Noël' || vac.nom === 'Toussaint' ? vac.nom : 'printemps') : 'Dans 6 semaines') + ' · ' + ui.fmtDate(vac.date), vac.date], ['4s', '4 semaines · ' + ui.fmtDate(L.addDays(t, 28)), L.addDays(t, 28)], ['6s', '6 semaines · ' + ui.fmtDate(L.addDays(t, 42)), L.addDays(t, 42)], ['autre', 'Autre date', st.finChoix === 'autre' ? st.fin : '']];
    var s4 = '<section class="sec"><h2 class="mlab" style="margin:0">4. Jusqu\'à quand ?</h2><div class="cop-list" style="grid-template-columns:1fr">' + choix.map(function (c) {
      var on = st.finChoix === c[0];
      return '<button type="button" class="cop' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="nmFin" data-v="' + c[0] + '" data-d="' + esc(c[2]) + '"><span class="nm">' + esc(c[1]) + '</span><span class="ck">' + icon('check', 14) + '</span></button>';
    }).join('') + '</div>' + (st.finChoix === 'autre' ? '<label class="lab" for="nm-pf">La date de fin</label><input id="nm-pf" class="txt" type="date" min="' + L.addDays(t, 1) + '" data-nm="fin" value="' + esc(st.fin) + '">' : '') + '</section>';
    var s5 = '<section class="sec"><label class="mlab" style="margin:0" for="nm-mot">5. Un mot (facultatif)</label><textarea id="nm-mot" class="txt" rows="2" maxlength="240" data-nm="mot" placeholder="Ex. : On travaille la passe à gauche jusqu\'à Noël !">' + esc(st.mot) + '</textarea></section>';
    // le récapitulatif par enfant
    var plan = nmPlan(gr, st), ok = plan.filter(function (r) { return r.ko === undefined; });
    var recap = '';
    if (st.d && st.etoiles.length && st.joueurs.length) {
      recap = '<section class="sec"><h2 class="mlab" style="margin:0">Récapitulatif · ' + ok.length + ' enfant' + (ok.length > 1 ? 's' : '') + '</h2><ul class="list">' + plan.map(function (r) {
        var t2 = r.ko !== undefined ? '<span style="color:var(--orange)">Pas de mission : ' + esc(r.ko) + '</span>'
          : esc(r.reste.map(function (e) { return SK.star(st.d, e).nom; }).join(', ')) + (r.reste.length < st.etoiles.length ? ' <span style="color:var(--dim)">(a déjà les autres)</span>' : '') + (r.cur ? ' · <span style="color:var(--gold)">remplace « ' + esc(SK.titreMission(r.cur)) + ' »</span>' : '');
        return '<li class="li"><span class="grow"><span class="t1">' + esc(r.nom) + '</span><span class="t2">' + t2 + '</span></span></li>';
      }).join('') + '</ul></section>';
    }
    var pret = ok.length && st.fin && st.fin > t;
    return '<main class="screen">' + bar + head + s1 + s2 + s3 + s4 + s5 + recap +
      '<button type="button" class="btn gold" data-act="nmPerso"' + (pret ? '' : ' disabled') + '>' + icon('star', 18) + ' Donner la mission' + (ok.length ? ' · ' + ok.length + ' enfant' + (ok.length > 1 ? 's' : '') : '') + '</button>' +
      '<p class="small" style="margin:0;text-align:center">Les +1 déjà reçus restent dans l\'historique de chaque enfant.</p></main>';
  }
  MC.act.nmFiltre = function (b) { NM.filtre = b.getAttribute('data-v'); app.rerender(); };
  MC.act.nmKid = function (b) { var id = b.getAttribute('data-v'), i = NM.joueurs.indexOf(id); if (i >= 0) NM.joueurs.splice(i, 1); else NM.joueurs.push(id); app.rerender(); };
  MC.act.nmTous = function () {
    var gr = G(), b = document.querySelectorAll('[data-act="nmKid"]'), ids = Array.prototype.map.call(b, function (x) { return x.getAttribute('data-v'); });
    var tous = ids.every(function (id) { return NM.joueurs.indexOf(id) >= 0; });
    if (tous) NM.joueurs = NM.joueurs.filter(function (id) { return ids.indexOf(id) < 0; });
    else ids.forEach(function (id) { if (NM.joueurs.indexOf(id) < 0) NM.joueurs.push(id); });
    app.rerender();
  };
  MC.act.nmDom = function (b) { var v = b.getAttribute('data-v'); if (NM.d !== v) { NM.d = v; NM.etoiles = []; } app.rerender(); };
  MC.act.nmStar = function (b) { var e = b.getAttribute('data-v'), i = NM.etoiles.indexOf(e); if (i >= 0) NM.etoiles.splice(i, 1); else if (NM.etoiles.length < 3) NM.etoiles.push(e); app.rerender(); };
  MC.act.nmFin = function (b) { NM.finChoix = b.getAttribute('data-v'); var d = b.getAttribute('data-d'); NM.fin = d || (NM.finChoix === 'autre' ? '' : NM.fin); app.rerender(); };
  MC.act.nmPerso = function (b) {
    var gr = G(), st = NM, plan = nmPlan(gr, st).filter(function (r) { return r.ko === undefined; });
    if (!plan.length || !st.d || !st.etoiles.length) return;
    if (!st.fin || st.fin <= L.today()) { ui.toast('Choisissez une date de fin.', true); return; }
    b.disabled = true;
    app.adultCall('defMission', { sorte: 'etoile', joueurIds: plan.map(function (r) { return r.id; }), domaine: st.d, etoiles: st.etoiles, fin: st.fin, texte: st.mot, remplacer: true }).then(function (r) {
      var rm = r.remplacees || [];
      gr.defmissions = (gr.defmissions || []).filter(function (x) { return rm.indexOf(x.id) < 0; }).concat(r.missions || []);
      persist();
      var n = (r.missions || []).length, back = st.depuis ? '#/educ/joueur/' + st.depuis + '?t=missions' : '#/educ/missions';
      // les enfants que le serveur a laissés de côté (données du téléphone pas à jour : un autre éduc vient de lui en donner une…)
      var RAISON = { deja: 'a déjà ces étoiles', encours: 'a déjà une mission en cours', autre: 'a une mission d\'un autre éduc' };
      var ig = (r.ignores || []).map(function (x) { return nomDe(gr, x.joueurId) + ' ' + (RAISON[x.raison] || 'pas changé'); });
      if (!n) {
        b.disabled = false;
        ui.toast('Aucune mission donnée : ' + (ig.join(', ') || 'rien à changer') + '.', true);
        MC.loadGroup(true).then(function () { app.rerender(); }).catch(function () { });
        return;
      }
      NM = null;
      ui.toast((n === 1 ? 'Mission donnée à ' + nomDe(gr, r.missions[0].joueurId) + ' : elle la voit dans son appli' : 'Mission donnée à ' + n + ' enfants : ils la voient dans leur appli') +
        (ig.length ? '. Pas changé : ' + ig.join(', ') + '.' : ''), !!ig.length);
      app.go(back);
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
  document.addEventListener('change', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-nm'); if (k === 'fin' && NM) { NM.fin = e.target.value; if (NM.type === 'perso') app.rerender(); } });
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
      return '<section class="fsk"><div class="between" style="align-items:center"><h2 class="h2" style="color:' + D.color + '">' + icon(D.icon, 18) + ' ' + esc(D.nom) + '</h2><span class="skcell" style="--gc:' + c.grade.color + '">' + esc(c.grade.nom) + ' · ' + c.n + '/' + c.max + (c.nbBrille ? ' · ' + c.nbBrille + ' brille' + (c.nbBrille > 1 ? 'nt' : '') : '') + '</span></div><ul class="list">' + c.stars.map(function (s) {
        var isM = m && !etatDe(gr, m).expiree && SK.dansMission(m, D.id, s.def.id);
        var dm = (d.demandes || []).filter(function (x) { return x.statut === 'attente' && x.domaine === D.id && x.etoile === s.def.id; })[0];
        var demTxt = dm ? ' · <b style="color:var(--cyan)">' + (dm.sorte === 'briller' ? 'demande à la faire briller' : 'demande l\'étoile') + '</b>' : '';
        if (s.row) return '<li class="li skrow acq' + (s.brille ? ' brille' : '') + '"><span class="skok">' + icon(s.brille ? 'spark' : 'star', 14) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + '</span><span class="t2">par ' + esc(qui(gr, s.row)) + ', ' + jourTxt(s.row.date) + (s.row.occasion ? ' · ' + esc(s.row.occasion) : '') + (s.row.essais ? ' · essais ' + s.row.essais.map(function (v) { return v ? '✓' : '✗'; }).join('') : '') +
          (s.brille ? '<br><b style="color:var(--gold)">brille</b> depuis le ' + jourTxt(s.row.brille) + (s.row.brilleOccasion ? ' · ' + esc(s.row.brilleOccasion) : '') + ' · ' + esc(s.row.brilleParNom) : '') + demTxt + '</span></span>' +
          (s.brille ? '<button type="button" class="lnk" data-act="eteEtoile" data-id="' + esc(s.row.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Éteindre</button>' : '') +
          '<button type="button" class="lnk" data-act="retEtoile" data-id="' + esc(s.row.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Retirer</button></li>';
        var n = isM ? p1De(gr, id, m.id).length : 0;
        return '<li class="li skrow' + (isM ? ' mis' : '') + '"><span class="skno">' + icon('star', 14) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + '</span><span class="t2">' + (isM ? '<b style="color:var(--violet)">sa mission principale · ' + MC.encTxt(n) + '</b>' : '« ' + esc(s.def.phrase) + ' »') + demTxt + '</span></span>' +
          (isM ? btnPlus1(gr, id, m, '', true) : '') + '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(id) + '" data-d="' + D.id + '" data-e="' + s.def.id + '" aria-label="Valider l\'étoile ' + esc(s.def.nom) + '">Valider</button></li>';
      }).join('') + '</ul></section>';
    }).join('');
    return '<div class="between"><span class="hud" style="color:var(--gold)">' + SK.total(d) + ' / ' + SK.MAX_TOTAL + ' étoiles' + (SK.totalBrille(d) ? ' · ' + SK.totalBrille(d) + ' brillent' : '') + '</span>' + (m && !etatDe(gr, m).expiree ? '' : '<a class="lnk" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '">Lui donner une mission principale</a>') + '</div>' + cartes +
      '<p class="small" style="margin:0">Valider = l\'étoile s\'allume pour lui (+' + C.XP.etoile + ' XP) ; elle brille quand elle est vue au plateau (+' + C.XP.brille + ' XP, depuis Évaluer ouvert sur le plateau). Validée par erreur ? « Retirer » ; allumée par erreur ? « Éteindre ».</p>';
  };
  MC.ficheMissions = function (d, gr) {
    var id = d.joueur.id, nom = d.joueur.prenom, m = persoDe(gr, id), out = '';
    if (m) {
      var l = p1De(gr, id, m.id), n = l.length, et = etatDe(gr, m), D = SK.dom(m.domaine);
      out += '<section class="fmis"><span class="hud" style="color:var(--pink)">Sa mission principale · depuis le ' + jourTxt(m.debut || m.cree) + (m.parNom ? ' · ' + esc(m.parNom) : '') + '</span><h2 class="h2" style="font-size:24px">★ ' + esc((D ? D.nom + ' · ' : '') + SK.titreMission(m)) + '</h2>' +
        '<span class="small" style="color:var(--soft)">' + et.n + ' / ' + et.max + ' étoile' + (et.max > 1 ? 's' : '') + ' · ' + (et.expiree ? '<b style="color:var(--orange)">terminée le ' + jourTxt(m.fin) + '</b>' : m.fin ? 'jusqu\'au ' + jourTxt(m.fin) : 'sans date') + '</span>' +
        (m.texte ? '<p class="small" style="margin:0">« ' + esc(m.texte) + ' »</p>' : '') +
        '<ul class="list">' + et.etoiles.map(function (x) {
          return '<li class="li skrow' + (x.row ? ' acq' : ' mis') + '"><span class="' + (x.row ? 'skok' : 'skno') + '">' + icon('star', 14) + '</span><span class="grow"><span class="t1">' + esc(x.def.nom) + '</span><span class="t2">' + (x.row ? 'gagnée le ' + jourTxt(x.row.date) + ' · ' + esc(qui(gr, x.row)) : '« ' + esc(x.def.phrase) + ' »') + '</span></span>' +
            (x.row ? '' : '<button type="button" class="btn2 sm gold" data-act="valEtoile" data-j="' + esc(id) + '" data-d="' + esc(m.domaine) + '" data-e="' + esc(x.id) + '" aria-label="Valider l\'étoile ' + esc(x.def.nom) + '">Valider</button>') + '</li>';
        }).join('') + '</ul>' +
        '<div class="row" style="gap:10px">' + MC.encDots(n) + '<span class="small" style="color:var(--soft)">' + MC.encTxt(n) + ' · au ' + SK.PROPOSE_AU + 'e, on vous propose de valider</span></div>' +
        (l.length ? '<ol class="p1list">' + l.map(function (x) {
          return '<li class="p1row"><b class="p1tag">+1</b><span class="grow"><span class="p1-k">' + esc(qui(gr, x)) + ' · ' + esc(x.occasion || jourTxt(x.date)) + '</span>' + (x.mot ? '<span class="p1-m">« ' + esc(x.mot) + ' »</span>' : '') + '</span>' +
            (x.parQui === gr.moi.id || gr.moi.admin ? '<button type="button" class="lnk" data-act="retPlus1" data-id="' + esc(x.id) + '" data-j="' + esc(id) + '" style="color:var(--dim)">Retirer</button>' : '') + '</li>';
        }).join('') + '</ol>' : '<p class="small" style="margin:0">Pas encore d\'encouragement.</p>') +
        (et.expiree ? '' : '<div class="fmis-act">' + btnPlus1(gr, id, m, '') + '<a class="btn2 sm" href="#/educ/encourager/' + esc(id) + '?m=' + esc(m.id) + '">' + icon('edit', 14) + ' +1 avec un mot</a></div>') +
        '<a class="lnk" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '" style="align-self:flex-start">' + (et.expiree ? 'Lui donner une nouvelle mission' : 'Changer de mission') + '</a></section>';
    } else out += '<div class="note">' + icon('star', 20) + '<span>Pas de mission principale pour ' + esc(nom) + '. 1 à 3 étoiles Skills à décrocher, qu\'il voit dans son appli avec vos encouragements.</span></div><a class="btn2 gold" href="#/educ/missions/nouvelle?type=perso&joueur=' + esc(id) + '">' + icon('plus', 16) + ' Lui donner une mission principale</a>';
    var faites = persosToutes(gr, id).filter(function (x) { return x.statut === 'faite'; });
    if (faites.length) out += '<details><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Ses missions principales réussies (' + faites.length + ')</summary><ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.6;color:var(--soft)">' + faites.map(function (x) { return '<li>★ ' + esc(SK.titreMission(x)) + ' · ' + jourTxt(x.faiteLe) + '</li>'; }).join('') + '</ul></details>';
    // missions du groupe
    var lg = '';
    MC.MISSIONS.forEach(function (Dx) {   // les 2 missions du jeu à 10
      var ex = M.etat(d, Dx.id);
      lg += '<li class="li"><span class="mtag">' + (Dx.id === 'poste' ? 'Poste' : 'Copains') + '</span><span class="grow"><span class="t1">' + esc(Dx.titre) + '</span><span class="t2">' + (ex.faite ? 'faite' + (Dx.id === 'poste' ? ' · ' + ex.postes.map(function (pid) { return esc(M.poste(pid).nom.toLowerCase()); }).join(', ') : ' · ' + ex.copains.length + ' copain' + (ex.copains.length > 1 ? 's' : '')) : '<span style="color:var(--orange)">pas encore</span>') + '</span></span></li>';
    });
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
