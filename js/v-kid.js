/* =========================================================
   Mode champion · M12 — écrans enfant : ma semaine, une séance,
   une fiche exo, « j'ai fait ma séance », récompenses
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;

  function jourColors(j) {
    var c = j.color;
    return '--mc:' + c + ';--md:' + ui.rgba(c, 0.35) + ';--me:' + ui.rgba(c, 0.15) + ';--mg:' + ui.rgba(c, 0.22) + ';--mr1:' + ui.rgba(c, 0.2) + ';--mr2:' + ui.rgba(c, 0.4);
  }
  // exercices réels d'un jour selon les options (mini matériel, match samedi, jambes lourdes)
  function plan(type, niveaux, opts) {
    opts = opts || {};
    var j = C.JOURS[type];
    if (!j || !j.exos) return [];
    var list = [];
    j.exos.forEach(function (id) {
      var ex = C.EXOS[id];
      if (opts.leger && type === 'meafou' && id === 'marche_ours') return;
      if (opts.leger && type === 'meafou' && id === 'fentes') {
        list.push({ id: 'flamant', ex: C.EXOS.flamant, niveau: niveaux.flamant || 1, dose: { k: 'time', s: 2, t: 20, txt: 'par pied' }, nom: 'Flamant rose', remplace: true });
        return;
      }
      var n = niveaux[ex.cle] || 1;
      var mini = opts.mini && ex.mini;
      var dose = JSON.parse(JSON.stringify((mini && ex.mini.doses ? ex.mini.doses : ex.doses)[n]));
      if ((opts.leger || opts.lourdes) && type === 'meafou' && dose.s >= 3) dose.s = 2;
      list.push({
        id: id, ex: ex, niveau: n, dose: dose,
        nom: mini ? ex.mini.nom : ex.nom,
        anim: mini ? (ex.mini.anim || ex.anim) : (ex.animNiveau ? ex.animNiveau[n] : ex.anim),
        video: mini ? (ex.mini.video || null) : ((ex.videoNiveau && ex.videoNiveau[n]) || ex.video),
        etapes: mini ? ex.mini.etapes : ex.etapes, mini: !!mini
      });
    });
    return list;
  }
  MC.plan = plan;

  function prefs() { return app.lsGet('mc-prefs') || {}; }
  function setPref(k, v) { var p = prefs(); p[k] = v; app.lsSet('mc-prefs', p); }
  MC.prefs = prefs; MC.setPref = setPref;
  // appareil partagé : on sort du profil (la séance faite reste enregistrée), le suivant tape son code
  MC.act.switchKid = function () { app.setKid(null); app.go('#/connexion'); };

  // ---------- barre du haut côté joueur (les 3 onglets) : qui je suis, mes étoiles, l'aide ----------
  function kidBar(me, st, right) {
    var k = me.joueur, g = st.grade;
    return ui.topbar({
      mid: '<a class="tb-who" href="#/profil" aria-label="Mon profil">' + ui.avatar(k.prenom, k.couleur, 38) + '<span class="tb-t"><span class="tb-title">' + esc(k.prenom) + '</span><span class="tb-k" style="color:var(--cyan)">' + esc(g.nom) + ' · ' + ui.fmtNum(st.xp) + ' XP</span></span></a>',
      right: '<span class="tb-cnt"><span style="color:var(--orange)" title="Série d\'étoiles">' + icon('flame', 14) + st.streak + '</span><span style="color:var(--gold)" title="Étoiles">' + icon('star', 14) + st.stars + '</span></span>' + (right || ''),
      help: ui.helpLink('joueur'), xp: g.pct
    });
  }
  MC.kidBar = kidBar;
  function subBar(back, backLabel, title) { return ui.topbar({ back: back, backLabel: backLabel, title: title, help: ui.helpLink('joueur') }); }
  MC.kidSubBar = subBar;

  // ---------- MA SEMAINE ----------
  app.route('/semaine', function (p, q, cur) {
    return app.loadMe().then(function (me) {
      if (MC.accueil && MC.accueil.needTour('k', me.joueur.id)) { setTimeout(function () { app.go('#/bienvenue', true); }, 0); return null; }
      cur.after = function () { if (MC.news) setTimeout(function () { if (location.hash.indexOf('#/semaine') === 0) MC.news.maybeShow('k', me.joueur.id); }, 350); };
      return paintSemaine(me, app.S.stats);
    });
  }, { kid: true, nav: 'semaine', live: true });

  function paintSemaine(me, st) {
    var t = L.today(), type = L.dayType(t), j = C.JOURS[type], niv = me.joueur.niveaux || {};
    var wk = st.week, cy = st.cycle;
    var doneToday = j.slot >= 0 && wk.filled[j.slot];
    var mission = '';
    if (j.maison) {
      var lv = L.dayLevel(niv, type), items = plan(type, niv, { mini: me.joueur.materiel === 'mini' });
      mission = '<section class="mission" style="' + jourColors(j) + '"><div class="in">' +
        '<div class="art"><span class="pill" style="--pc:' + j.color + '">' + esc(j.theme) + '</span>' + ui.lvl(lv) +
        '<div class="anim" data-anim="' + esc(items[0] ? items[0].anim : '') + '" data-color="' + j.color + '"></div></div>' +
        '<div class="body"><div><div class="ttl">' + esc(j.nomSeance) + '</div><div class="sub">' + items.length + ' exos · ≈ ' + j.duree + ' min · +' + C.XP.seance + ' XP</div></div>' +
        '<ul class="exlist">' + items.map(function (it, i) {
          return '<li><a class="exrow" style="--xc:' + j.color + '" href="#/exo/' + it.id + '?jour=' + type + '"><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(it.nom) + '</span><span class="ds">' + esc(ui.doseLabel(it.dose)) + '</span>' + icon('right', 16) + '</a></li>';
        }).join('') + '</ul>' +
        (doneToday ? '<div class="note green">' + icon('check', 22) + '<span><b>Séance faite cette semaine !</b> Ton étoile est gagnée. Tu peux la refaire pour le plaisir.</span></div>' : '') +
        (!doneToday && MC.accueil && !(me.seances || []).length ? MC.accueil.tip('k-lancer', me.joueur.id, 'Touche ici : le site t\'explique chaque exercice et lance le chrono pour toi.') : '') +
        '<a class="btn' + (doneToday ? '' : ' glow') + '" href="#/jour/' + type + '">' + icon('play', 18) + (doneToday ? ' Revoir la séance' : ' Lancer la séance') + '</a>' +
        (doneToday ? '' : '<a class="btn2" href="#/noter?type=' + type + '">' + icon('check', 16) + ' J\'ai déjà fait ma séance</a>') +
        '</div></div></section>';
    } else {
      var txt = j.intro, act = '';
      if (type === 'club') act = doneToday ? '<div class="note green">' + icon('check', 22) + '<span>Club noté : étoile gagnée !</span></div>' : '<a class="btn" href="#/noter?type=club">' + icon('ball', 18) + ' J\'ai fait le club</a>';
      if (type === 'recup') act = doneToday ? '<div class="note green">' + icon('check', 22) + '<span>Récup notée : étoile gagnée !</span></div>' : '<a class="btn" href="#/noter?type=recup">' + icon('leaf', 18) + ' Valider ma récup</a>';
      if (type === 'repos') act = '<div class="note">' + icon('moon', 22) + '<span>Pas de séance, pas d\'étoile à gagner aujourd\'hui : c\'est pendant le repos que les muscles deviennent plus forts.</span></div>';
      mission = '<section class="mission" style="' + jourColors(j) + '"><div class="in">' +
        '<div class="art"><span class="pill" style="--pc:' + j.color + '">' + esc(j.theme) + '</span><span class="ico">' + icon(j.icon, 96) + '</span></div>' +
        '<div class="body"><div><div class="ttl">' + esc(j.nomSeance) + '</div>' + (j.slot >= 0 ? '<div class="sub">+1 étoile · +' + (type === 'club' ? C.XP.club : C.XP.recup) + ' XP</div>' : '') + '</div>' +
        '<p class="lead" style="color:var(--soft)">' + esc(txt) + '</p>' + act + '</div></div></section>';
    }

    // la semaine
    var days = C.SEMAINE.map(function (tp, d) {
      var date = L.addDays(wk.mon, d), jj = C.JOURS[tp], sl = jj.slot;
      var done = sl >= 0 && wk.filled[sl], isT = date === t, rest = sl < 0;
      var col = rest ? '#3A4566' : jj.color;
      var star = rest ? ui.starSvg(22, 'none', '#1E2740') : ui.starSvg(22, done ? '#FFC23D' : 'none', done ? '#FFC23D' : '#34405F');
      var href = jj.maison ? '#/jour/' + tp : (tp === 'repos' ? '#/jour/repos' : '#/noter?type=' + tp);
      var short = { cros: 'CROS', capuozzo: 'CAPUO', dupont: 'DUPONT', meafou: 'MEAFOU', repos: 'REPOS', club: 'CLUB', recup: 'RÉCUP' }[tp];
      return {
        strip: '<a class="wd' + (isT ? ' today' : '') + (rest ? ' rest' : '') + '" style="--tc:' + col + '" href="' + href + '" aria-label="' + esc(jj.jour + ' : ' + jj.nomSeance + (done ? ', faite' : '')) + '"><span class="j">' + jj.court.charAt(0) + '</span><span class="dia" style="--dc:' + col + '"></span>' + star + '<span class="t">' + short + '</span></a>',
        list: '<a class="wl' + (isT ? ' today' : '') + (rest ? ' rest' : '') + '" style="--tc:' + col + '" href="' + href + '"><span class="j">' + jj.jour.toUpperCase() + '</span><span class="dia" style="--dc:' + col + '"></span><span class="t">' + esc(jj.joueur ? jj.joueur.split(' ').pop() + ' · ' + jj.theme.toLowerCase() : jj.nomSeance) + '</span>' + star + '</a>'
      };
    });
    var seg = '';
    for (var i = 0; i < 6; i++) seg += '<i class="' + (wk.filled[i] ? 'on' : '') + '"></i>';

    var props = st.proposals.length ? '<div class="note pink">' + icon('up', 22) + '<div style="flex:1"><b>Changement de niveau possible</b><div class="small" style="color:var(--soft);margin-top:3px">' + st.proposals.map(function (p) { return esc(C.CLES[p.cle].nom) + ' : N' + p.de + ' → N' + p.a; }).join(' · ') + '</div></div><a class="btn2 sm pink" href="#/niveaux">Voir</a></div>' : '';
    var noBilan = !(me.records || []).some(function (r) { return r.bilan !== 'defi'; });
    var bilanNote = noBilan && !(MC.accueil && MC.accueil.kidChecklistShown(me)) ? '<div class="note gold">' + icon('trophy', 22) + '<div style="flex:1"><b>Pas encore de bilan ? Pas grave.</b><div class="small" style="color:var(--soft);margin-top:3px">Tu t\'entraînes déjà, au niveau 1. Ton bilan (12 tests avec un adulte) réglera ensuite chaque exercice pile pour toi.</div></div><a class="btn2 sm gold" href="#/bilan">Le bilan</a></div>' : '';
    var pend = (me.records || []).filter(function (r) { return r.statut === 'attente'; }).length;
    var pendNote = pend ? '<div class="note">' + icon('clock', 20) + '<span>' + pend + ' record' + (pend > 1 ? 's' : '') + ' en attente : un parent ou ton éduc doit confirmer.</span></div>' : '';

    return '<main class="screen">' + kidBar(me, st) +
      '<button type="button" class="pastoi" data-act="switchKid">' + icon('user', 14) + ' Pas ' + esc(me.joueur.prenom) + ' ? Changer de joueur</button>' +
      '<div class="head"><span class="kicker">' + esc(C.JOURS[type].jour.toUpperCase()) + ' · ' + (cy.semaine > 8 ? 'SEMAINE DU BILAN' : 'SEMAINE ' + cy.semaine + ' / 8') + '</span>' +
      '<h1 class="big">Mission<br>du jour</h1></div>' +
      (MC.missionCard ? MC.missionCard(me) : '') +
      (MC.accueil ? MC.accueil.kidChecklist(me, st) : '') +
      bilanNote + props + pendNote +
      '<div class="home"><div>' + mission + '</div><div class="side">' +
      '<section class="sec"><div class="between"><h2 class="h2">Ma semaine</h2><span class="hud" style="color:var(--gold)">' + wk.stars + ' / 6 étoiles</span></div>' +
      '<div class="week">' + days.map(function (d) { return d.strip; }).join('') + '</div>' +
      '<div class="weeklist">' + days.map(function (d) { return d.list; }).join('') + '</div></section>' +
      '<section class="defi">' + icon('gift', 40, 'style="color:var(--gold);flex:none"') + '<div style="flex:1;display:flex;flex-direction:column;gap:6px"><span class="hud" style="color:var(--gold)">Défi de la semaine</span><span style="font-size:14px;line-height:1.3">' + (wk.bonus ? 'Coffre ouvert : +1 étoile bonus et +' + C.XP.bonus + ' XP !' : 'Gagne les 6 étoiles de la semaine et ouvre le coffre : +1 étoile bonus et +' + C.XP.bonus + ' XP.') + '</span><div class="segs" style="--n:6">' + seg + '</div></div></section>' +
      '</div></div></main>';
  }

  // ---------- UNE SÉANCE (programme + lancement) ----------
  app.route('/jour/:type', function (p) {
    var j = C.JOURS[p.type];
    if (!j) return app.go('#/semaine', true);
    return app.loadMe().then(function (me) { return paintJour(p.type, me); });
  }, { kid: true, nav: 'semaine' });

  function paintJour(type, me) {
    var j = C.JOURS[type], niv = me.joueur.niveaux || {}, pr = prefs();
    var back = subBar('#/semaine', 'Ma semaine', j.nomSeance);
    if (!j.maison) {
      var extra = '';
      if (type === 'club') extra = '<a class="btn" href="#/noter?type=club">' + icon('ball', 18) + ' J\'ai fait le club</a>';
      if (type === 'recup') extra = '<ul class="steps">' + j.check.map(function (c, i) { return '<li><span class="num" style="--sc:' + j.color + '">' + (i + 1) + '</span><span class="tx">' + esc(c) + '</span></li>'; }).join('') + '</ul><a class="btn" href="#/noter?type=recup">' + icon('leaf', 18) + ' Valider ma récup</a>';
      return '<main class="screen">' + back + '<div class="head"><span class="kicker" style="color:' + j.color + '">' + esc(j.jour.toUpperCase()) + '</span><h1 class="big md">' + esc(j.nomSeance) + '</h1><p class="lead">' + esc(j.intro) + '</p></div>' + extra + '</main>';
    }
    var mini = me.joueur.materiel === 'mini';
    var opts = { mini: mini, leger: !!pr.leger && type === 'meafou', lourdes: !!pr.lourdes && type === 'meafou' };
    var items = plan(type, niv, opts), lv = L.dayLevel(niv, type);
    var duree = opts.leger ? j.leger.duree : j.duree;
    function stepLi(n, nom, info, dose, href, warm) {
      return '<li style="display:flex;gap:12px;align-items:stretch">' +
        '<div style="width:30px;flex:none;display:flex;flex-direction:column;align-items:center"><span style="width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;font:700 13px/1 var(--f-hud);color:' + (warm ? 'var(--muted)' : '#070A12') + ';background:' + (warm ? 'var(--panel)' : j.color) + ';border:' + (warm ? '1px solid var(--line2)' : '0') + ';clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)">' + n + '</span><span style="flex:1;width:2px;min-height:10px;background:#1E2740"></span></div>' +
        '<a href="' + href + '" style="flex:1;min-width:0;padding:4px 0 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;text-decoration:none;color:var(--ink)"><span style="display:flex;flex-direction:column;gap:4px"><span style="font:600 16px/1.2 var(--f-body)">' + esc(nom) + '</span><span style="font-size:13px;color:var(--muted)">' + esc(info) + '</span></span>' +
        '<span style="flex:none;font:700 13px/1.2 var(--f-hud);color:' + (warm ? 'var(--muted)' : j.color) + ';padding-top:3px;text-align:right">' + esc(dose) + '</span></a></li>';
    }
    var parcours = stepLi('0', C.REVEIL.nom, 'Échauffement obligatoire', '4 min', '#/echauffement?jour=' + type, true) +
      items.map(function (it, i) { return stepLi(i + 1, it.nom, ui.doseInfo(it.dose) || ('Repos ' + (it.ex.repos || j.repos) + ' s entre les séries'), ui.doseLabel(it.dose), '#/exo/' + it.id + '?jour=' + type, false); }).join('') +
      stepLi('★', C.CALME.nom, 'Étirements et flamant rose', '3 min', '#/calme?jour=' + type, true);
    function sw(key, on, t1, t2, act) {
      return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-act="' + act + '" data-k="' + key + '"><span><span class="t1" style="display:block">' + t1 + '</span>' + (t2 ? '<span class="t2" style="display:block">' + t2 + '</span>' : '') + '</span><span class="k"></span></button>';
    }
    var switches = sw('son', !ui.isMuted(), icon('sound', 18) + ' Bip du chrono', 'Un bip 10 s avant la fin, puis 5-4-3-2-1 et le son de fin', 'togglePref') +
      sw('mini', mini, 'Mode mini matériel', 'Tapis + élastiques : pas de barre, pas de corde, pas de marche', 'toggleMini') +
      (type === 'meafou' ? sw('leger', !!pr.leger, 'Match samedi : version légère', j.leger.texte, 'togglePref') + sw('lourdes', !!pr.lourdes, 'Jambes lourdes', j.lourdes, 'togglePref') : '');

    return '<main class="screen">' + back +
      '<div class="head"><span class="kicker" style="color:' + j.color + '">' + esc(j.jour.toUpperCase()) + ' · ' + esc(j.theme.toUpperCase()) + ' · N' + lv + '</span>' +
      '<h1 class="big md" style="text-shadow:3px 3px 0 ' + ui.rgba(j.color, 0.35) + ',-2px -2px 0 ' + j.color + '">Prêt pour<br>' + esc(j.joueur.split(' ').pop()) + ' ?</h1></div>' +
      '<div class="grid3"><div class="tile"><span class="v">' + duree + '\'</span><span class="l">Durée</span></div><div class="tile"><span class="v">' + items.length + '</span><span class="l">Exos</span></div><div class="tile" style="background:rgba(255,194,61,.08);border-color:rgba(255,194,61,.45)"><span class="v" style="color:var(--gold)">+' + C.XP.seance + '</span><span class="l">XP à gagner</span></div></div>' +
      '<div class="cols2"><section class="sec"><h2 class="h2">Le parcours</h2><ol style="list-style:none;margin:0;padding:0">' + parcours + '</ol></section>' +
      '<div class="sec"><div class="box"><div class="hud" style="color:' + j.color + '">Mon modèle : ' + esc(j.joueur) + ' · ' + esc(j.poste) + '</div><p class="lead" style="margin-top:6px;color:var(--soft)">' + esc(j.modele) + '</p><p class="lead" style="margin-top:8px">' + esc(j.intro) + '</p></div>' +
      '<div class="box"><div class="hud" style="color:var(--muted)">Matériel</div><p class="lead" style="margin-top:6px">' + esc(mini ? j.materielMini : j.materiel) + '</p></div>' +
      switches + '</div></div>' +
      (MC.accueil && !(me.seances || []).some(function (s) { return s.mode === 'guidee'; }) ? MC.accueil.tip('k-partir', me.joueur.id, 'Touche « C\'est parti » : l\'échauffement, chaque exercice, le chrono et les bips, tout est guidé. Le bouton Retour en haut annule un clic de trop.') : '') +
      '<a class="btn xl glow" href="#/go/' + type + '" data-act="startRun">' + icon('play', 20) + ' C\'est parti !</a>' +
      '<a class="btn2" href="#/noter?type=' + type + '">' + icon('check', 16) + ' Je l\'ai déjà faite</a>' +
      '<div class="note gold">' + icon('trophy', 22) + '<span><b>À quoi ça sert sur le terrain ?</b> ' + esc(j.terrain) + '</span></div>' +
      '</main>';
  }
  MC.act.startRun = function (a) { ui.unlockAudio(); app.go(a.getAttribute('href')); };
  MC.act.togglePref = function (b) {
    var k = b.getAttribute('data-k');
    if (k === 'son') { ui.setMuted(!ui.isMuted()); if (!ui.isMuted()) { ui.unlockAudio(); ui.beep(880, 0.1); } }
    else setPref(k, !prefs()[k]);
    app.rerender();
  };
  MC.act.toggleMini = function () {
    var m = app.S.me.joueur.materiel === 'mini' ? 'complet' : 'mini';
    app.kidCall('updateMe', { materiel: m }).then(function (res) {
      app.setMe(res);
      ui.toast(m === 'mini' ? 'Mode mini matériel activé' : 'Matériel complet');
      app.rerender();
    }).catch(function (e) { ui.toast(e.message, true); });
  };

  // ---------- Échauffement et retour au calme (consultation) ----------
  function routineView(R, jour) {
    var j = C.JOURS[jour];
    var back = j && j.maison ? subBar('#/jour/' + jour, j.nomSeance, R.nom) : subBar('#/semaine', 'Ma semaine', R.nom);
    return '<main class="screen">' + back +
      '<div class="head"><span class="kicker">' + Math.round(R.duree / 60) + ' minutes · avant / après chaque séance</span><h1 class="big md">' + esc(R.nom) + '</h1><p class="lead">' + esc(R.intro) + '</p></div>' +
      '<p class="small" style="margin:0">Pendant la séance guidée, touche <b>GO</b> : chaque étape s\'affiche en grand avec son chrono et sa démo.</p>' +
      '<ul class="wulist">' + R.items.map(function (it) {
        var dose = it.dose;
        if (it.exo) { var n = (app.S.me && app.S.me.joueur.niveaux.flamant) || 1; dose = ui.doseLabel(C.EXOS.flamant.doses[n]); }
        var mini = it.mini ? ' Sans matériel : ' + it.mini.nom.toLowerCase() + (it.mini.detail ? ' (' + it.mini.detail.replace(/\.$/, '') + ')' : '') + '.' : '';
        return '<li>' + (it.anim ? '<span class="wuanim" data-anim="' + esc(it.anim) + '" data-color="#3DFFB0"></span>' : '') + '<span class="ds">' + esc(dose) + '</span><span><b>' + esc(it.nom) + '</b><small>' + esc(it.detail) + esc(mini) + '</small>' + ui.infoBtn(it.id, it.nom) + '</span></li>';
      }).join('') + '</ul></main>';
  }
  app.route('/echauffement', function (p, q) { return app.loadMe().then(function () { return routineView(C.REVEIL, q.jour); }); }, { kid: true, nav: 'semaine' });
  app.route('/calme', function (p, q) { return app.loadMe().then(function () { return routineView(C.CALME, q.jour); }); }, { kid: true, nav: 'semaine' });

  // ---------- FICHE EXO ----------
  app.route('/exo/:id', function (p, q) {
    var ex = C.EXOS[p.id];
    if (!ex) return app.go('#/semaine', true);
    return app.loadMe().then(function (me) { return paintExo(p.id, q.jour, me); });
  }, { kid: true, nav: 'semaine', bg: '#12352E' });

  function paintExo(id, type, me) {
    var ex = C.EXOS[id], niv = me.joueur.niveaux || {}, n = niv[ex.cle] || 1;
    var j = C.JOURS[type] || null;
    if (!j) { for (var k in C.JOURS) if (C.JOURS[k].exos && C.JOURS[k].exos.indexOf(id) >= 0) { j = C.JOURS[k]; type = k; } }
    var color = j ? j.color : '#3DFFB0';
    var mini = me.joueur.materiel === 'mini' && ex.mini;
    var idx = j && j.exos ? j.exos.indexOf(id) : -1;
    var back = j ? subBar('#/jour/' + type, j.nomSeance, mini ? ex.mini.nom : ex.nom) : subBar('#/semaine', 'Ma semaine', mini ? ex.mini.nom : ex.nom);
    var anim = mini ? (ex.mini.anim || ex.anim) : (ex.animNiveau ? ex.animNiveau[n] : ex.anim);
    var video = mini ? (ex.mini.video || null) : ((ex.videoNiveau && ex.videoNiveau[n]) || ex.video);
    var etapes = mini ? ex.mini.etapes : ex.etapes;
    var doses = mini && ex.mini.doses ? ex.mini.doses : ex.doses;
    var lvCards = [1, 2, 3, 4].map(function (i) {
      var Lv = C.NIVEAUX[i], me2 = i === n, lock = i === 4 && n < 4;
      var info = ui.doseInfo(doses[i]);
      if (i === 4 && !info) info = 'S\'ouvre quand le N3 est « facile » 2 fois de suite';
      else if (i === 4 && lock) info += ' · s\'ouvre quand le N3 est facile 2 fois';
      var lvAnim = !mini && ex.animNiveau ? '<span class="lvanim" data-anim="' + esc(ex.animNiveau[i]) + '" data-color="' + Lv.color + '" data-label="' + esc(ex.nom + ' niveau ' + i) + '"></span>' : '';
      return '<div class="lvcard' + (me2 ? ' me' : '') + '" style="--lc:' + Lv.color + '"><div class="between" style="align-items:center">' + ui.lvl(i, i === 4 ? 'N4 · CHAMPION' : Lv.code) +
        (me2 ? '<span class="hud" style="font-size:9px;color:' + Lv.color + '">TON NIVEAU</span>' : (lock ? '<span style="color:var(--pink)" aria-label="Verrouillé">' + icon('lock', 16) + '</span>' : '')) +
        '</div>' + lvAnim + '<span class="d">' + esc(ui.doseLabel(doses[i])) + '</span><span class="i">' + esc(info) + '</span></div>';
    }).join('');
    var t = null;
    C.TESTS.forEach(function (tt) { if (tt.cle === ex.cle && tt.seuils) t = tt; });
    var rec = '';
    if (t) {
      var b = app.S.stats.bests[t.id + (t.sm && me.joueur.materiel === 'mini' ? ':sm' : '')];
      if (b) rec = '<div class="note gold">' + icon('trophy', 26) + '<div style="flex:1"><div class="hud" style="color:var(--gold)">Ton record · ' + esc(t.nom) + '</div><div class="small" style="margin-top:3px">' + (b.bilan === 'defi' ? 'Défi' : 'Bilan ' + esc(b.bilan)) + ' · ' + ui.fmtDate(b.date) + '</div></div><span style="font:700 26px/1 var(--f-hud);color:var(--gold)">' + ui.fmtVal(b.valeur, t.unite, t.decimales) + '</span></div>';
    }
    var nav = '';
    if (j && idx >= 0) {
      var prev = j.exos[idx - 1], next = j.exos[idx + 1];
      nav = '<div class="grid2">' + (prev ? '<a class="btn2 grey" href="#/exo/' + prev + '?jour=' + type + '">' + icon('left', 16) + ' Précédent</a>' : '<a class="btn2 grey" href="#/jour/' + type + '">' + icon('left', 16) + ' La séance</a>') +
        (next ? '<a class="btn green" style="min-height:48px;font-size:13px" href="#/exo/' + next + '?jour=' + type + '">Exo suivant ' + icon('right', 16) + '</a>' : '<a class="btn green" style="min-height:48px;font-size:13px" href="#/jour/' + type + '">' + icon('play', 14) + ' Lancer</a>') + '</div>';
    }
    return '<main class="screen">' + back +
      '<div class="head"><div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill" style="--pc:' + color + '">' + esc(C.CLES[ex.cle].nom) + '</span>' + (idx >= 0 ? '<span class="tag">Exo ' + (idx + 1) + ' / ' + j.exos.length + '</span>' : '') + (mini ? '<span class="tag" style="color:var(--yellow);border-color:var(--yellow)">Mini matériel</span>' : '') + '</div>' +
      '<h1 class="big md" style="text-shadow:3px 3px 0 ' + ui.rgba(color, 0.3) + ',-2px -2px 0 ' + color + '">' + esc(mini ? ex.mini.nom : ex.nom) + '</h1></div>' +
      '<div class="cols2"><div class="sec">' + ui.demoHtml({ anim: anim, video: video, color: color, label: mini ? ex.mini.nom : ex.nom, vite: !!ex.vite && !mini }) +
      '<section class="sec"><h2 class="h2">Les secrets</h2><ol class="steps">' + etapes.map(function (s, i) { return '<li><span class="num" style="--sc:' + color + '">' + (i + 1) + '</span><span class="tx">' + esc(s) + '</span></li>'; }).join('') + '</ol>' +
      ui.infoBtn(MC.fiche.key.exo(id, mini), mini ? ex.mini.nom : ex.nom) +
      (ex.vite && !mini ? '<span class="vitetag">' + icon('bolt', 14) + ' ' + esc(ex.vite) + '</span>' : '') +
      (ex.attention ? '<div class="warn">' + icon('warn', 16) + '<span>' + esc(ex.attention) + '</span></div>' : '') +
      (ex.mini && !mini ? '<div class="note yellow">' + icon('home', 20) + '<span><b>Mini matériel :</b> ' + esc(ex.mini.nom) + '. ' + esc(ex.mini.etapes.join(' ')) + '</span></div>' : '') +
      (ex.tour ? '<ul class="circuitsteps">' + ex.tour.map(function (s) { return '<li><span class="mini" data-anim="' + esc(s.anim) + '" data-color="' + color + '"></span><span>' + esc(s.nom) + (s.detail ? ' <span class="small">(' + esc(s.detail) + ')</span>' : '') + '</span></li>'; }).join('') + '</ul>' : '') +
      '</section></div>' +
      '<div class="sec"><section class="sec"><div class="between"><h2 class="h2">Les 4 niveaux</h2><span class="small">Ton niveau : N' + n + '</span></div><div class="lvgrid">' + lvCards + '</div>' +
      '<p class="small" style="margin:0">Tu montes d\'un niveau quand c\'est « facile » 2 séances de suite avec une technique parfaite.</p></section>' + rec + '</div></div>' +
      nav + '</main>';
  }

  // ---------- J'AI FAIT MA SÉANCE (saisie rapide) ----------
  var form = null;
  app.route('/noter', function (p, q) {
    return app.loadMe().then(function (me) {
      var t = L.today(), def = q.type || L.dayType(t);
      if (def === 'repos') def = 'cros';
      if (!form || form.key !== (q.type || '') + L.today()) {
        form = { key: (q.type || '') + L.today(), quand: 'auj', date: t, type: def, niveau: L.dayLevel(me.joueur.niveaux || {}, def), ressenti: 'bien', clubMer: false, match: false, adv: '', score: '', sA: '', sB: '', check: [false, false, false], jambes: '' };
      }
      return paintNoter(me);
    });
  }, { kid: true, nav: 'semaine' });

  function paintNoter(me) {
    var f = form, t = L.today();
    function opt(act, val, on, label, extra) { return '<button type="button" class="opt' + (on ? ' on' : '') + (extra || '') + '" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + esc(val) + '">' + label + '</button>'; }
    var quand = '<fieldset><legend><b>1 ·</b> Quand ?</legend><div class="grid3">' + opt('nQuand', 'auj', f.quand === 'auj', 'Aujourd\'hui') + opt('nQuand', 'hier', f.quand === 'hier', 'Hier') + opt('nQuand', 'autre', f.quand === 'autre', 'Autre jour') + '</div>' +
      (f.quand === 'autre' ? '<label class="lab" for="ndate">Le jour</label><input id="ndate" class="txt" type="date" max="' + t + '" min="' + L.addDays(t, -60) + '" value="' + esc(f.date) + '" data-input="nDate">' : '') + '</fieldset>';
    var types = ['cros', 'capuozzo', 'dupont', 'meafou', 'club', 'recup'];
    var quoi = '<fieldset><legend><b>2 ·</b> Quelle séance ?</legend><div class="grid2">' + types.map(function (tp) {
      var j = C.JOURS[tp], on = f.type === tp;
      var nom = { cros: 'Cros', capuozzo: 'Capuozzo', dupont: 'Dupont', meafou: 'Meafou', club: 'Club', recup: 'Récup' }[tp];
      var sub = tp === 'club' ? 'Entraînement ou match' : (tp === 'recup' ? 'Le dimanche' : j.theme);
      return '<button type="button" class="sopt' + (on ? ' on' : '') + '" style="--oc:' + j.color + '" aria-pressed="' + on + '" data-act="nType" data-v="' + tp + '"><span class="bar"></span><span><b>' + nom + '</b><small>' + esc(sub) + '</small></span></button>';
    }).join('') + '</div></fieldset>';
    var rest = '', n = 3;
    if (C.JOURS[f.type].maison) {
      rest += '<fieldset><legend><b>' + n++ + ' ·</b> À quel niveau ?</legend><div class="grid4">' + [1, 2, 3, 4].map(function (i) {
        var Lv = C.NIVEAUX[i], on = f.niveau === i;
        return '<button type="button" class="opt lv' + (on ? ' on' : '') + '" style="--oc:' + Lv.color + ';' + (on ? '' : 'color:' + Lv.color) + '" aria-pressed="' + on + '" data-act="nNiv" data-v="' + i + '"><b>N' + i + '</b><small>' + Lv.nom.toUpperCase() + '</small></button>';
      }).join('') + '</div><span class="small">Ton niveau habituel pour cette séance : N' + L.dayLevel(me.joueur.niveaux || {}, f.type) + '</span></fieldset>';
      rest += '<fieldset><legend><b>' + n++ + ' ·</b> C\'était comment ?</legend><div class="grid3">' + [['facile', 'Facile', 1], ['bien', 'Pile bien', 2], ['dur', 'Dur', 3]].map(function (r) {
        var on = f.ressenti === r[0], bars = '';
        for (var i = 1; i <= 3; i++) bars += '<i class="' + (i <= r[2] && on ? 'on' : '') + '"></i>';
        return '<button type="button" class="opt tall' + (on ? ' on' : '') + '" style="flex-direction:column;gap:8px" aria-pressed="' + on + '" data-act="nRess" data-v="' + r[0] + '"><span class="feel">' + bars + '</span>' + r[1] + '</button>';
      }).join('') + '</div></fieldset>';
      if (f.type === 'dupont') rest += '<button type="button" class="switch" role="switch" aria-checked="' + f.clubMer + '" data-act="nClub"><span><span class="t1" style="display:block">J\'ai aussi fait le club le soir</span><span class="t2" style="display:block">+' + C.XP.club + ' XP</span></span><span class="k"></span></button>';
    } else if (f.type === 'club') {
      rest += '<fieldset><legend><b>3 ·</b> C\'était…</legend><div class="grid2">' + opt('nMatch', '0', !f.match, 'Un entraînement') + opt('nMatch', '1', f.match, 'Un match') + '</div>' +
        (f.match ? '<div class="grid2"><div><label class="lab" for="nadv">Contre qui ?</label><input id="nadv" class="txt" maxlength="30" value="' + esc(f.adv) + '" data-input="nAdv"></div><div><label class="lab" for="nsa">Score</label><div class="row" style="gap:6px">' + ui.numInput({ id: 'nsa', kind: 'int', max: 3, cls: 'txt', style: 'width:64px;text-align:center;padding:0 4px', label: 'Score de ton équipe', placeholder: 'Nous', value: f.sA, attrs: 'data-input="nScoreA"' }) + '<span class="unit">–</span>' + ui.numInput({ id: 'nsb', kind: 'int', max: 3, cls: 'txt', style: 'width:64px;text-align:center;padding:0 4px', label: 'Score de l\'adversaire', placeholder: 'Eux', value: f.sB, attrs: 'data-input="nScoreB"' }) + '</div></div></div>' : '') + '</fieldset>';
    } else if (f.type === 'recup') {
      rest += '<fieldset><legend><b>3 ·</b> Ma récup</legend>' + C.JOURS.recup.check.map(function (c, i) {
        return '<button type="button" class="switch" role="switch" aria-checked="' + !!f.check[i] + '" data-act="nCheck" data-v="' + i + '"><span class="t1">' + esc(c) + '</span><span class="k"></span></button>';
      }).join('') + '<span class="lab" style="margin-top:6px">Mes jambes sont…</span><div class="grid3">' + [['fraiches', 'Fraîches'], ['lourdes', 'Un peu lourdes'], ['courbatures', 'Courbaturées']].map(function (r) { return opt('nJambes', r[0], f.jambes === r[0], r[1]); }).join('') + '</div></fieldset>';
    }
    var xp = C.JOURS[f.type].maison ? C.XP.seance + (f.type === 'dupont' && f.clubMer ? C.XP.club : 0) : (f.type === 'club' ? C.XP.club : C.XP.recup);
    var dateOk = f.date <= t;
    return '<main class="screen">' + subBar('#/semaine', 'Ma semaine', 'J\'ai fait ma séance') +
      '<div class="head"><span class="kicker">Saisie rapide</span><h1 class="big md">J\'ai fait<br>ma séance !</h1></div>' +
      '<div class="cols2"><div class="sec">' + quand + quoi + '</div><div class="sec">' + rest +
      (C.JOURS[f.type].maison ? '<div class="note green">' + icon('up', 20) + '<span>Dis la vérité sur le ressenti : 2 séances « facile » de suite et le site te propose de monter d\'un niveau.</span></div>' : '') +
      '<button type="button" class="btn xl" data-act="nSave"' + (dateOk ? '' : ' disabled') + '>' + icon('check', 20) + ' Valider · +' + xp + ' XP</button></div></div></main>';
  }
  function upd() { app.rerender(); }
  MC.act.nQuand = function (b) { form.quand = b.getAttribute('data-v'); var t = L.today(); form.date = form.quand === 'hier' ? L.addDays(t, -1) : t; upd(); };
  MC.act.nType = function (b) { form.type = b.getAttribute('data-v'); if (C.JOURS[form.type].maison) form.niveau = L.dayLevel(app.S.me.joueur.niveaux || {}, form.type); upd(); };
  MC.act.nNiv = function (b) { form.niveau = Number(b.getAttribute('data-v')); upd(); };
  MC.act.nRess = function (b) { form.ressenti = b.getAttribute('data-v'); upd(); };
  MC.act.nClub = function () { form.clubMer = !form.clubMer; upd(); };
  MC.act.nMatch = function (b) { form.match = b.getAttribute('data-v') === '1'; upd(); };
  MC.act.nCheck = function (b) { var i = Number(b.getAttribute('data-v')); form.check[i] = !form.check[i]; upd(); };
  MC.act.nJambes = function (b) { form.jambes = b.getAttribute('data-v'); upd(); };
  document.addEventListener('change', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-input');
    if (!k || !form) return;
    if (k === 'nDate') { form.date = e.target.value || L.today(); upd(); }
  });
  document.addEventListener('input', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-input');
    if (!k || !form) return;
    if (k === 'nAdv') form.adv = e.target.value;
    if (k === 'nScoreA' || k === 'nScoreB') {
      var c = e.target.value.replace(/[^0-9]/g, '');
      if (c !== e.target.value) e.target.value = c;
      if (k === 'nScoreA') form.sA = c; else form.sB = c;
      form.score = form.sA || form.sB ? (form.sA || '0') + '-' + (form.sB || '0') : '';
    }
  });
  MC.act.nSave = function (b) {
    var f = form, j = C.JOURS[f.type];
    b.disabled = true;
    var p = { type: f.type, date: f.date, mode: 'rapide' };
    if (j.maison) { p.ressenti = f.ressenti; p.details = { niveau: f.niveau }; }
    if (f.type === 'club') p.details = { match: f.match, adversaire: f.match ? f.adv : '', score: f.match ? f.score : '' };
    if (f.type === 'recup') p.details = { check: f.check, jambes: f.jambes };
    var extra = j.maison && f.type === 'dupont' && f.clubMer ? { type: 'club', date: f.date, mode: 'rapide' } : null;
    saveSessions([p].concat(extra ? [extra] : []), null).then(function () { form = null; })
      .catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // enregistre une ou plusieurs séances puis affiche les récompenses
  function saveSessions(list, recap) {
    var before = app.S.stats;
    var chain = Promise.resolve();
    var saved = [], fresh = null;
    // le dernier envoi renvoie directement le profil à jour : un seul aller-retour avec le serveur
    list.forEach(function (p, i) {
      p.avecDossier = i === list.length - 1;
      chain = chain.then(function () { return app.kidCall('logSession', p).then(function (r) { saved.push(r.seance); if (r.me) fresh = r.me; }); });
    });
    return chain.then(function () { if (fresh) { app.setMe(fresh); return fresh; } return app.loadMe(true); }).then(function () {
      app.S.lastResult = { before: before, after: app.S.stats, seances: saved, recap: recap };
      app.go('#/bravo');
    });
  }
  MC.saveSessions = saveSessions;

  // ---------- RÉCOMPENSES ----------
  app.route('/bravo', function () {
    var R = app.S.lastResult;
    if (!R) return app.go('#/semaine', true);
    return app.loadMe().then(function (me) { return paintBravo(R, me); });
  }, { kid: true, bg: '#3A2C10' });

  function paintBravo(R, me) {
    var a = R.after, b = R.before || a, s0 = R.seances[0] || {}, j = C.JOURS[s0.type] || C.JOURS.cros;
    var dxp = Math.max(0, a.xp - b.xp), dstars = Math.max(0, a.stars - b.stars);
    var newBadges = C.BADGES.filter(function (bd) { return (a.badges[bd.id].tier || 0) > ((b.badges[bd.id] && b.badges[bd.id].tier) || 0); });
    var gradeUp = a.grade.i > b.grade.i;
    var conf = '';
    var cols = ['#FF4FA3', '#38E8FF', '#3DFFB0', '#FFC23D'];
    for (var i = 0; i < 10; i++) conf += '<span class="confetti" style="left:' + (8 + i * 9) + '%;top:' + (10 + (i * 37) % 60) + '%;background:' + cols[i % 4] + ';animation-delay:' + (i * 0.07) + 's;transform:rotate(' + (i * 30) + 'deg)"></span>';
    var newB = newBadges.map(function (bd) {
      var t = a.badges[bd.id].tier || 1, col = bd.paliers ? C.PALIERS[t - 1].color : bd.color;
      var titre = bd.paliers ? 'Badge ' + C.PALIERS[t - 1].nom.toLowerCase() + ' !' : 'Nouveau badge !';
      var cond = bd.paliers ? bd.paliers[t - 1] + ' ' + bd.cond : bd.cond;
      return '<section class="newbadge" style="--bc:' + col + '"><div>' + badgeIcon({ icon: bd.icon, color: col }, true, 64) + '<div style="display:flex;flex-direction:column;gap:4px"><span class="hud" style="color:' + col + '">' + titre + '</span><span style="font:italic 900 26px/.95 var(--f-title);text-transform:uppercase">' + esc(bd.nom) + '</span><span class="small" style="color:var(--muted)">' + esc(cond) + '</span></div></div></section>';
    }).join('');
    var recap = '';
    if (R.recap && R.recap.length) {
      recap = '<section class="sec"><h2 class="h2">Ce que tu as fait</h2><ul class="list">' + R.recap.map(function (r) {
        var fc = { facile: 'var(--green)', bien: 'var(--cyan)', dur: 'var(--yellow)' }[r.ressenti] || 'var(--dim)';
        var fl = { facile: 'FACILE', bien: 'PILE BIEN', dur: 'DUR' }[r.ressenti] || '';
        return '<li class="li"><span style="color:' + (r.fait ? 'var(--green)' : 'var(--dim)') + '">' + icon(r.fait ? 'check' : 'minus', 18) + '</span><span class="grow" style="font:600 15px/1.2 var(--f-body)">' + esc(r.nom) + '</span><span class="hud" style="color:var(--soft)">' + esc(r.res) + '</span>' + (fl ? '<span style="font:700 9px/1 var(--f-hud);letter-spacing:.08em;color:' + fc + ';border:1px solid currentColor;padding:4px 5px">' + fl + '</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
    }
    var adj = levelAdjust(R, me, a);
    var props = a.proposals.filter(function (p) { return adj.cles.indexOf(p.cle) < 0; }).map(propCard).join('');
    var clubBtn = (s0.type === 'dupont' && R.seances.length === 1 && s0.mode === 'guidee') ? '<button type="button" class="btn2 gold" data-act="clubSoir">' + icon('ball', 16) + ' Ce soir j\'ai aussi le club (+' + C.XP.club + ' XP)</button>' : '';
    return '<main class="screen nonav">' +
      '<div class="burst">' + conf + '<svg class="st" width="140" height="140" viewBox="0 0 24 24" role="img" aria-label="Étoile gagnée"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#FFC23D" stroke="#FFF1C2" stroke-width=".6" stroke-linejoin="round"/></svg></div>' +
      '<div class="head" style="text-align:center;align-items:center"><span class="kicker" style="color:var(--gold)">' + esc(j.nomSeance) + '</span><h1 class="big md">' + (s0.type === 'recup' ? 'Récup<br>validée !' : s0.type === 'club' ? 'Club<br>validé !' : 'Séance<br>validée !') + '</h1></div>' +
      '<div class="grid3"><div class="reward"><span class="v">+' + dxp + '</span><span class="l">XP</span></div><div class="reward"><span class="v">+' + dstars + '</span><span class="l">Étoile' + (dstars > 1 ? 's' : '') + ' · ' + a.stars + '</span></div>' +
      '<div class="reward" style="background:rgba(255,138,61,.08);border-color:rgba(255,138,61,.5)"><span class="v" style="color:var(--orange)">' + icon('flame', 22) + a.streak + '</span><span class="l">Série d\'étoiles</span></div></div>' +
      (dstars === 0 && s0.type !== 'club' ? '<div class="note">' + icon('info', 20) + '<span>L\'étoile de cette séance était déjà gagnée cette semaine : bravo pour le bonus d\'entraînement !</span></div>' : '') +
      '<div class="sec"><div class="between"><span class="hud" style="color:var(--cyan)">' + esc(a.grade.nom) + '</span><span class="hud" style="color:var(--dim)">' + ui.fmtNum(a.xp) + (a.grade.next ? ' / ' + ui.fmtNum(a.grade.next.xp) + ' XP' : ' XP') + '</span></div>' +
      '<div class="xpbar" style="height:12px"><i style="width:' + a.grade.pct + '%"></i></div>' +
      (gradeUp ? '<div class="note pink">' + icon('trophy', 22) + '<span><b>Nouveau grade : ' + esc(a.grade.nom) + ' !</b> Montre-le à tes parents.</span></div>' : (a.grade.next ? '<span class="small">Plus que ' + ui.fmtNum(a.grade.next.xp - a.xp) + ' XP pour devenir <b style="color:var(--ink)">' + esc(a.grade.next.nom) + '</b>.</span>' : '')) + '</div>' +
      newB + adj.html + recap + props + clubBtn +
      '<div class="sec"><a class="btn" href="#/profil">Voir mon profil</a><a class="btn2 grey" href="#/semaine">Retour à ma semaine</a>' +
      (app.recents().length >= 2 || app.S.adult ? '<button type="button" class="btn2 grey" data-act="switchKid">' + icon('user', 16) + ' J\'ai fini : un autre joueur ou je rends l\'appareil</button>' : '') + '</div></main>';
  }
  MC.act.clubSoir = function (b) {
    b.disabled = true;
    var d = app.S.lastResult.seances[0].date;
    var before = app.S.lastResult.before;
    app.kidCall('logSession', { type: 'club', date: d, mode: 'rapide', avecDossier: true }).then(function (r) {
      return (r.me ? Promise.resolve(app.setMe(r.me)) : app.loadMe(true)).then(function () {
        app.S.lastResult = { before: before, after: app.S.stats, seances: app.S.lastResult.seances.concat([r.seance]), recap: app.S.lastResult.recap };
        ui.toast('Club noté : +' + C.XP.club + ' XP');
        app.rerender();
      });
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- après une séance : changer de niveau en un geste ----------
  // « facile » → niveau d'après (le N4 champion reste à débloquer : « facile » 2 fois de suite en N3),
  // « dur » → niveau d'avant. Rien ne change sans que l'enfant touche le bouton.
  function levelAdjust(R, me, st) {
    var out = { html: '', cles: [] };
    if (!R.recap || !R.recap.length) return out;
    var niv = me.joueur.niveaux || {}, by = {}, order = [];
    R.recap.forEach(function (r) {
      var ex = C.EXOS[r.id];
      if (!ex || !ex.cle || !r.fait || (r.ressenti !== 'facile' && r.ressenti !== 'dur')) return;
      if (!by[ex.cle]) { by[ex.cle] = { cle: ex.cle, facile: [], dur: [] }; order.push(ex.cle); }
      by[ex.cle][r.ressenti].push(r.nom);
    });
    R.adjusted = R.adjusted || {};
    var rows = order.map(function (cle) {
      var b = by[cle], n = niv[cle] || 1, done = R.adjusted[cle], nom = C.CLES[cle].nom;
      var exos = (b.dur.length ? b.dur : b.facile).join(', ');
      out.cles.push(cle);
      if (done) return '<li class="li adj done">' + icon('check', 18, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">' + esc(nom) + '</span><span class="t2">' + (done.keep ? 'Tu gardes le niveau N' + n + '.' : 'C\'est fait : tu es en N' + done.a + '.') + '</span></span>' + ui.lvl(n) + '</li>';
      if (b.dur.length) {
        if (n <= 1) return '<li class="li adj"><span class="grow"><span class="t1">' + esc(nom) + ' · c\'était dur</span><span class="t2">Tu es déjà au niveau 1 : prends ton temps, la technique d\'abord.</span></span>' + ui.lvl(n) + '</li>';
        return '<li class="li adj"><span class="grow"><span class="t1">' + esc(nom) + ' · c\'était dur</span><span class="t2">' + esc(exos) + '</span></span>' +
          '<span class="adjb"><button type="button" class="btn2 sm gold" data-act="lvQuick" data-cle="' + cle + '" data-de="' + n + '" data-a="' + (n - 1) + '">' + icon('down', 14) + ' Revenir en N' + (n - 1) + '</button><button type="button" class="btn2 sm grey" data-act="lvKeep" data-cle="' + cle + '">Garder N' + n + '</button></span></li>';
      }
      if (n >= 4) return '<li class="li adj"><span class="grow"><span class="t1">' + esc(nom) + ' · c\'était facile</span><span class="t2">Tu es au niveau champion. Respect !</span></span>' + ui.lvl(4) + '</li>';
      var p4 = n === 3 && st.proposals.some(function (p) { return p.cle === cle && p.a === 4; });
      if (n === 3 && !p4) return '<li class="li adj"><span class="grow"><span class="t1">' + esc(nom) + ' · c\'était facile</span><span class="t2">Encore une séance « facile » en N3 et le <b style="color:var(--pink)">N4 champion</b> s\'ouvre.</span></span>' + ui.lvl(3) + '</li>';
      return '<li class="li adj"><span class="grow"><span class="t1">' + esc(nom) + ' · c\'était facile</span><span class="t2">' + esc(exos) + '</span></span>' +
        '<span class="adjb"><button type="button" class="btn2 sm pink" data-act="lvQuick" data-cle="' + cle + '" data-de="' + n + '" data-a="' + (n + 1) + '">' + icon('up', 14) + ' Passer en N' + (n + 1) + '</button><button type="button" class="btn2 sm grey" data-act="lvKeep" data-cle="' + cle + '">Garder N' + n + '</button></span></li>';
    });
    if (!rows.length) return out;
    out.html = '<section class="sec"><div class="between"><h2 class="h2">Tes niveaux</h2><span class="small">d\'après ton ressenti</span></div><ul class="list">' + rows.join('') + '</ul>' +
      '<p class="small" style="margin:0">Monte seulement si la technique est parfaite. Tu pourras toujours revenir en arrière (Profil › Mes niveaux).</p></section>';
    return out;
  }
  function changeLevel(cle, de, a, btn) {
    var nv = {}; nv[cle] = a;
    if (btn) btn.disabled = true;
    var xp0 = app.S.stats ? app.S.stats.xp : 0;
    return app.kidCall('updateMe', { niveaux: nv, journal: [{ type: 'niveau', data: { cle: cle, de: de, a: a } }] }).then(function (res) {
      app.setMe(res);
      var gain = (app.S.stats ? app.S.stats.xp : 0) - xp0;
      ui.toast(C.CLES[cle].nom + ' : N' + a + (gain > 0 ? ' · +' + gain + ' XP' : ''));
      if (app.S.lastResult) app.S.lastResult.after = app.S.stats;
      return true;
    }).catch(function (e) { if (btn) btn.disabled = false; ui.toast(e.message, true); return false; });
  }
  MC.changeLevel = changeLevel;
  MC.act.lvQuick = function (b) {
    var cle = b.getAttribute('data-cle'), de = Number(b.getAttribute('data-de')), a = Number(b.getAttribute('data-a'));
    changeLevel(cle, de, a, b).then(function (ok) {
      if (!ok) return;
      var R = app.S.lastResult; if (R) { R.adjusted = R.adjusted || {}; R.adjusted[cle] = { a: a }; }
      app.rerender();
    });
  };
  MC.act.lvKeep = function (b) { var R = app.S.lastResult, cle = b.getAttribute('data-cle'); if (R) { R.adjusted = R.adjusted || {}; R.adjusted[cle] = { keep: true }; } app.rerender(); };

  // ---------- propositions de niveau ----------
  function propCard(p) {
    var up = p.sens === 'up', cle = C.CLES[p.cle];
    return '<section class="note ' + (up ? 'pink' : 'yellow') + '" style="flex-direction:column;gap:12px"><div class="row" style="align-items:flex-start">' + icon(up ? 'up' : 'down', 28) +
      '<div style="flex:1"><div class="hud" style="color:' + (up ? 'var(--pink)' : 'var(--yellow)') + '">' + (up ? 'Montée de niveau possible' : 'On redescend un peu ?') + '</div>' +
      '<div style="margin-top:5px;font-size:14px;line-height:1.35">' + esc(cle.nom) + ' : ' + (up ? '« facile » 2 fois de suite en N' + p.de + '. Tu passes en <b>' + (p.a === 4 ? 'N4 Champion' : 'N' + p.a) + '</b> ?' : '« dur » 2 fois de suite en N' + p.de + '. On repasse en <b>N' + p.a + '</b> pour bien faire les mouvements ?') + '</div></div></div>' +
      '<div class="grid2"><button type="button" class="btn ' + (up ? 'pink' : 'gold') + '" style="min-height:48px;font-size:13px" data-act="propYes" data-cle="' + p.cle + '" data-de="' + p.de + '" data-a="' + p.a + '">' + (up ? 'Oui, je monte' : 'Oui') + '</button>' +
      '<button type="button" class="btn2 grey" data-act="propNo" data-cle="' + p.cle + '" data-de="' + p.de + '">' + (up ? 'Pas encore' : 'Non, je garde') + '</button></div></section>';
  }
  MC.propCard = propCard;
  MC.act.propYes = function (b) {
    var cle = b.getAttribute('data-cle'), de = Number(b.getAttribute('data-de')), a = Number(b.getAttribute('data-a'));
    var nv = {}; nv[cle] = a;
    b.disabled = true;
    app.kidCall('updateMe', { niveaux: nv, journal: [{ type: 'niveau', data: { cle: cle, de: de, a: a } }] }).then(function (res) {
      app.setMe(res);
      ui.toast(a > de ? 'Bravo ! ' + C.CLES[cle].nom + ' : N' + a + (a > de ? ' · +' + C.XP.niveau + ' XP' : '') : C.CLES[cle].nom + ' : N' + a);
      if (app.S.lastResult) app.S.lastResult.after = app.S.stats;
      app.rerender();
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.propNo = function (b) {
    var cle = b.getAttribute('data-cle'), de = Number(b.getAttribute('data-de'));
    app.kidCall('updateMe', { journal: [{ type: 'niveau_refus', data: { cle: cle, niveau: de } }] }).then(function (res) {
      app.setMe(res);
      if (app.S.lastResult) app.S.lastResult.after = app.S.stats;
      app.rerender();
    }).catch(function (e) { ui.toast(e.message, true); });
  };

  // ---------- icônes de badge ----------
  function badgeIcon(bd, on, size) {
    var s = size || 56;
    return '<span class="ic" style="position:relative;width:' + s + 'px;height:' + s + 'px;flex:none;color:' + (on ? bd.color : 'var(--faint)') + ';' + (on ? 'filter:drop-shadow(0 0 8px ' + bd.color + ')' : '') + '">' +
      '<svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true"><path d="M50 4L90 18V48C90 72 72 88 50 97C28 88 10 72 10 48V18Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="4"/></svg>' +
      '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' + icon(bd.icon, Math.round(s * 0.46)) + '</span></span>';
  }
  MC.badgeIcon = badgeIcon;
})();
