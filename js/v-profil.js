/* =========================================================
   Mode champion · M12 — profil, niveaux, trophées, défis,
   classement par ligue, bilan, réglages
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;

  function famLevel(niv, fam) {
    var s = 0;
    fam.cles.forEach(function (k) { s += niv[k] || 1; });
    return Math.round(s / fam.cles.length);
  }
  function pips(n, color) {
    var o = '<span class="pips" style="--pc:' + color + '">';
    for (var i = 1; i <= 4; i++) o += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    return o + '</span>';
  }
  function testUnit(t) { return t.unite || ''; }
  function recVal(r, t) {
    if (!r) return '—';
    return ui.fmtVal(r.valeur, testUnit(t), t.decimales);
  }

  // ---------- PROFIL ----------
  app.route('/profil', function () {
    return app.loadMe().then(function (me) { return paintProfil(me, app.S.stats); });
  }, { kid: true, nav: 'moi', live: true });

  function boardHtml(st) {
    var b = st.board, cells = '';
    var heads = '<span></span>' + C.SEMAINE.map(function (t) { return '<span class="h">' + C.JOURS[t].court.charAt(0) + '</span>'; }).join('');
    b.rows.forEach(function (r) {
      cells += '<span class="w" style="' + (r.current ? 'color:var(--cyan)' : '') + '">S' + r.n + '</span>';
      r.cells.forEach(function (c) {
        var style = c.st === 'done' ? 'background:' + c.color : '';
        cells += '<span class="c ' + c.st + '" style="' + style + '" title="' + esc(ui.fmtDate(c.date)) + '"></span>';
      });
    });
    var g = '';
    var max = Math.max(56, b.max);
    for (var i = 1; i <= 56; i++) g += '<i class="' + (i <= b.total ? 'on' : '') + (i % 14 === 0 ? ' mk' : '') + '"></i>';
    var gradeTxt = b.total >= 56 ? 'Légende' : b.total >= 42 ? 'Capitaine' : b.total >= 28 ? 'Titulaire' : b.total >= 14 ? 'Espoir' : '—';
    return '<section class="sec"><div class="between"><h2 class="h2">Mon tableau · cycle ' + st.cycle.n + '</h2><span class="hud" style="color:var(--gold)">' + b.total + ' / 56</span></div>' +
      '<div class="board">' + heads + cells + '</div>' +
      '<div class="legend"><span><span style="width:10px;height:10px;background:var(--green)"></span>faite</span><span><span style="width:10px;height:10px;border:1px solid var(--red)"></span>ratée</span><span><span style="width:10px;height:10px;background:#161E36"></span>repos</span><span><span style="width:10px;height:10px;border:1.5px solid var(--cyan)"></span>aujourd\'hui</span></div>' +
      '<div class="gauge" style="--g:56" aria-label="Jauge : ' + b.total + ' étoiles sur 56">' + g + '</div>' +
      '<span class="small">Jauge du cycle : 14 Espoir · 28 Titulaire · 42 Capitaine · 56 Légende (badge !). Ton palier : <b style="color:var(--ink)">' + gradeTxt + '</b>.</span></section>';
  }

  function paintProfil(me, st) {
    var k = me.joueur, niv = k.niveaux || {}, g = st.grade;
    var skills = C.FAMILLES.map(function (f) { var n = famLevel(niv, f); return '<div class="skill"><span class="l">' + esc(f.nom) + '</span><span class="row" style="gap:6px">' + pips(n, f.color) + '<span style="width:24px;text-align:right;font:700 12px/1 var(--f-hud);color:' + f.color + '">N' + n + '</span></span></div>'; }).join('');
    var card = '<section class="pcard" style="--pc1:' + esc(k.couleur) + '"><div class="in"><div class="art"><span class="club">M12</span><span class="pill" style="--pc:var(--cyan)">' + esc(g.nom) + '</span>' + ui.avatar(k.prenom, k.couleur, 116) + '</div>' +
      '<div class="bd"><div><div class="nm">' + esc(k.prenom) + '</div><div class="hud" style="color:var(--muted);margin-top:5px;font-size:11px">' + st.maison + ' séances · ' + ui.fmtNum(st.xp) + ' XP</div></div>' + skills + '</div></div></section>';
    var e10 = MC.missions ? MC.missions.etat(me, 'jeu10') : null, p0 = e10 && e10.postes.length ? MC.missions.poste(e10.postes[0]) : null;
    var xp = '<div class="sec" style="gap:6px">' + (p0 ? '<span class="small" style="color:var(--soft)">Mon poste préféré : <b style="color:' + p0.color + '">' + esc(p0.nom.toLowerCase()) + '</b></span>' : '') +
      '<div class="between"><span class="hud" style="color:var(--cyan)">' + esc(g.nom) + (g.next ? ' → ' + esc(g.next.nom) : '') + '</span><span class="hud" style="color:var(--dim)">' + ui.fmtNum(st.xp) + (g.next ? ' / ' + ui.fmtNum(g.next.xp) : '') + ' XP</span></div><div class="xpbar" style="height:10px"><i style="width:' + g.pct + '%"></i></div>' +
      (g.next ? '<span class="small">Plus que ' + ui.fmtNum(g.next.xp - st.xp) + ' XP pour le prochain grade.</span>' : '') + '</div>';
    var nMis = MC.missions ? MC.missions.nbFaites(me) : 0, nSk = MC.SK ? MC.SK.total(me) : 0;
    var tiles = '<div class="grid3">' + [
      [st.maison, 'séances', 'var(--cyan)', '#/semaine'], [nMis, 'missions faites', 'var(--pink)', '#/missions?vue=faites'], [nSk, 'étoiles Skills', 'var(--gold)', '#/skills']
    ].map(function (t) { return '<a class="tile" href="' + t[3] + '" style="text-decoration:none;color:inherit"><span class="v" style="color:' + t[2] + '">' + t[0] + '</span><span class="l" style="text-transform:none;font-family:var(--f-body);letter-spacing:0;font-size:12px;color:var(--soft)">' + t[1] + '</span></a>'; }).join('') + '</div>';
    function row(href, ic, col, t1, t2) { return '<a class="li" href="' + href + '">' + icon(ic, 22, 'style="color:' + col + ';flex:none"') + '<span class="grow"><span class="t1">' + t1 + '</span><span class="t2">' + t2 + '</span></span>' + icon('right', 16) + '</a>'; }
    var links = '<div class="sec" style="gap:6px">' +
      (e10 && e10.postes.length ? row('#/mission/postes', 'ball', 'var(--cyan)', 'Mes postes', e10.postes.map(function (id) { return MC.missions.poste(id).nom; }).join(' · ')) : '') +
      (e10 && e10.copainsFait ? row('#/mission/copains', 'group', 'var(--green)', 'Mes copains', 'Secret : vus par tes éducs seulement') : '') +
      row('#/trophees', 'trophy', 'var(--gold)', 'Trophées', st.nbBadges + ' / ' + C.BADGES.length + ' badges · grades et coffres') +
      row('#/aide', 'info', 'var(--cyan)', 'Aide et nouveautés', 'Comment ça marche, revoir la visite') +
      row('#/reglages', 'settings', 'var(--soft)', 'Réglages', 'Le son, mon code, changer de joueur') + '</div>';
    var more = '<div class="grid2">' + [[st.bestStreak + ' j', 'Meilleure série', 'var(--orange)'], [st.stars, 'Étoiles de la prépa', 'var(--gold)']].map(function (t) { return '<div class="tile"><span class="v" style="color:' + t[2] + '">' + t[0] + '</span><span class="l">' + t[1] + '</span></div>'; }).join('') + '</div>';
    return '<main class="screen">' + ui.topbar({ kicker: 'Mode champion', title: 'Moi', right: '<a class="cbtn grey" href="#/reglages" aria-label="Réglages">' + icon('settings', 20) + '</a>', help: ui.helpLink('joueur') }) +
      '<div class="profile-grid"><div class="sec" style="gap:14px">' + card + xp + tiles + '</div>' +
      '<div class="sec" style="gap:20px">' + links + more + '</div>' +
      '<div class="sec" style="gap:20px">' + boardHtml(st) + '</div></div></main>';
  }

  // ---------- AIDE ET NOUVEAUTÉS ----------
  app.route('/aide', function () {
    return app.loadMe().then(function (me) {
      function lk(href, t1, t2) { return '<a class="switch" href="' + href + '" style="text-decoration:none"><span><span class="t1" style="display:block">' + t1 + '</span><span class="t2" style="display:block">' + t2 + '</span></span>' + icon('right', 18) + '</a>'; }
      return '<main class="screen">' + MC.kidSubBar('#/profil', 'Moi', 'Aide et nouveautés') +
        '<div class="head"><span class="kicker">' + esc(me.joueur.prenom) + '</span><h1 class="big md">Aide</h1></div><div class="sec">' +
        lk('#/guide?pour=joueur&de=aide', 'Comment ça marche ?', 'Étoiles, niveaux, badges, bilan, missions, Skills') +
        lk('#/nouveautes', 'Les nouveautés', 'Ce qui a changé dans l\'appli') +
        lk('#/bienvenue?revoir=1', 'Revoir la visite', 'Les écrans du début') + '</div></main>';
    });
  }, { kid: true, nav: 'moi' });

  // ---------- PRÉPA › BILANS : mes records, mes niveaux ----------
  app.route('/bilans', function () {
    return app.loadMe().then(function (me) { return paintBilans(me, app.S.stats); });
  }, { kid: true, nav: 'prepa', live: true });
  function paintBilans(me, st) {
    var k = me.joueur, niv = k.niveaux || {}, bl = L.currentBilan(), nb = L.nextBilan();
    var recs = (me.records || []).filter(function (r) { return r.statut !== 'refuse'; });
    var rows = C.TESTS.map(function (t) {
      var sm = t.sm && k.materiel === 'mini', key = t.id + (sm ? ':sm' : '');
      var b = st.bests[key];
      var mine = recs.filter(function (r) { return r.test === t.id && (!!(r.extra && r.extra.sm) === !!sm); }).sort(function (a, c) { return (a.date + a.cree) < (c.date + c.cree) ? -1 : 1; });
      var first = mine[0], gain = '';
      if (b && first && first.id !== b.id && L.better(t, b.valeur, first.valeur)) {
        var d = Math.abs(b.valeur - first.valeur);
        gain = t.moinsMieux ? ui.fmtVal(d, t.unite, t.decimales) + ' plus rapide' : '+' + ui.fmtVal(d, t.unite, t.decimales);
        gain += ' depuis ' + (first.bilan === 'defi' ? 'ton 1er défi' : 'le bilan ' + first.bilan);
      }
      var lv = C.CLES[t.cle] ? (niv[t.cle] || 1) : null, wait = b && b.statut === 'attente';
      return '<li class="li"><span class="grow"><span class="t1">' + esc(sm ? t.sm.nom : t.court) + '</span><span class="t2">' + (gain ? '<b style="color:var(--green)">' + esc(gain) + '</b>' : b ? 'ton record' : 'pas encore de résultat') + (wait ? ' · à confirmer' : '') + '</span></span>' +
        (lv ? ui.lvl(lv) : '') + '<span style="font:700 17px/1 var(--f-hud);min-width:64px;text-align:right;color:' + (b ? 'var(--gold)' : 'var(--dim)') + '">' + (b ? ui.valHtml(b.valeur, t.unite, t.decimales) : '—') + '</span></li>';
    }).join('');
    var dans = nb ? L.daysBetween(L.today(), nb.date) : null;
    return '<main class="screen">' + MC.kidBar(me, st) + MC.prepaTabs('bilans') +
      ui.seg([['records', 'Mes records', '#/bilans'], ['niveaux', 'Mes niveaux', '#/niveaux']], 'records') +
      '<p class="small" style="margin:0">Tes meilleurs résultats aux bilans et aux défis, et ce que tu as gagné depuis ton premier.</p>' +
      '<ol class="list">' + rows + '</ol>' +
      '<a class="btn" href="#/bilan">' + icon('plus', 18) + ' Saisir mon ' + esc(bl.nom.toLowerCase()) + ' · ' + esc(bl.quand) + '</a>' +
      '<a class="btn2" href="#/progression">' + icon('up', 16) + ' Ma progression d\'un bilan à l\'autre</a>' +
      (nb ? '<div class="note gold">' + icon('trophy', 20) + '<span><b>Prochain bilan : ' + (dans > 13 ? 'dans ' + Math.round(dans / 7) + ' semaines' : dans > 0 ? 'dans ' + dans + ' jour' + (dans > 1 ? 's' : '') : 'maintenant') + '.</b> Tu le passes avec un adulte. Il confirme tes résultats, puis ils arrivent ici.</span></div>' : '') +
      '</main>';
  }

  // ---------- MA PROGRESSION ----------
  app.route('/progression', function () {
    return app.loadMe().then(function (me) {
      return '<main class="screen">' + MC.kidSubBar('#/bilans', 'Bilans', 'Ma progression') +
        '<div class="head"><span class="kicker">Bilans de la saison</span><h1 class="big md">Ma progression</h1><p class="lead" style="margin:0">Tes résultats à chaque bilan, et ce que tu as gagné depuis le bilan d\'avant.</p></div>' +
        '<section class="sec">' + MC.suivi.progression(me.records, { vide: 'Fais ton premier bilan pour voir ta progression ici.' }) + '</section>' +
        '<section class="sec"><h2 class="h2">Mes séances</h2><p class="small" style="margin:0">Touche une séance pour revoir le détail.</p>' + MC.suivi.seances(me.seances) + '</section></main>';
    });
  }, { kid: true, nav: 'prepa', live: true });

  // ---------- NIVEAUX ----------
  app.route('/niveaux', function () {
    return app.loadMe().then(function (me) {
      var st = app.S.stats, niv = me.joueur.niveaux || {};
      var props = st.proposals.map(MC.propCard).join('');
      var fams = C.FAMILLES.map(function (f) {
        return '<section class="sec"><div class="row"><span class="dia" style="--dc:' + f.color + '"></span><h2 class="h2">' + esc(f.nom) + '</h2></div><ul class="list">' + f.cles.map(function (cle) {
          var n = niv[cle] || 1, exos = [];
          for (var id in C.EXOS) if (C.EXOS[id].cle === cle) exos.push(C.EXOS[id].nom);
          var p4 = n === 3 && st.proposals.some(function (p) { return p.cle === cle && p.a === 4; });
          var upOk = n < 3 || p4;
          return '<li class="li lvrow"><div class="grow"><div class="t1">' + esc(C.CLES[cle].nom) + ' ' + ui.lvl(n) + '</div><div class="t2">' + esc(exos.join(' · ')) + '</div>' + pips(n, C.NIVEAUX[n].color) + '</div>' +
            '<span class="lvstep"><button type="button" class="cbtn grey" data-act="lvStep" data-cle="' + cle + '" data-n="' + n + '" data-d="-1" aria-label="' + esc(C.CLES[cle].nom) + ' : niveau d\'avant"' + (n <= 1 ? ' disabled' : '') + '>' + icon('minus', 18) + '</button>' +
            '<button type="button" class="cbtn" data-act="lvStep" data-cle="' + cle + '" data-n="' + n + '" data-d="1" aria-label="' + esc(C.CLES[cle].nom) + ' : niveau d\'après"' + (upOk ? '' : ' disabled') + '>' + icon('plus', 18) + '</button></span></li>';
        }).join('') + '</ul></section>';
      }).join('');
      return '<main class="screen">' + MC.kidBar(me, st) + MC.prepaTabs('bilans') +
        ui.seg([['records', 'Mes records', '#/bilans'], ['niveaux', 'Mes niveaux', '#/niveaux']], 'niveaux') +
        '<div class="head"><span class="kicker">N1 début · N2 moyen · N3 fort · N4 champion</span>' +
        '<p class="lead">Ils viennent de ton bilan (niveau 1 si tu ne l\'as pas encore fait). Trop facile ? Touche <b>+</b> pour passer au niveau d\'après, si ta technique est parfaite. Trop dur ? Touche <b>−</b>. Le <b>N4 champion</b> s\'ouvre quand le N3 est « facile » 2 séances de suite.</p></div>' +
        props + '<div class="cols2"><div class="sec" style="gap:20px">' + fams.split('</section>').slice(0, 2).join('</section>') + '</section></div><div class="sec" style="gap:20px">' + fams.split('</section>').slice(2, 4).join('</section>') + '</section></div></div>' +
        '<div class="note">' + icon('info', 20) + '<span>Tes parents et ton éduc voient tes niveaux et peuvent aussi les ajuster.</span></div></main>';
    });
  }, { kid: true, nav: 'prepa', live: true });

  MC.act.lvStep = function (b) {
    var cle = b.getAttribute('data-cle'), n = Number(b.getAttribute('data-n')), a = n + Number(b.getAttribute('data-d'));
    if (a < 1 || a > 4) return;
    MC.changeLevel(cle, n, a, b).then(function (ok) { if (ok) app.rerender(); });
  };

  // ---------- TROPHÉES ----------
  app.route('/trophees', function () {
    return app.loadMe().then(function (me) {
      var st = app.S.stats;
      var grades = C.GRADES.map(function (g, i) {
        var cls = i < st.grade.i ? 'done' : i === st.grade.i ? 'cur' : 'lock';
        return '<li class="grade ' + cls + '"><div class="rail"><span class="dot"></span>' + (i < C.GRADES.length - 1 ? '<span class="ln"></span>' : '') + '</div><div class="bx"><div class="between"><span class="gn">' + esc(g.nom) + '</span><span class="hud" style="color:var(--dim)">' + ui.fmtNum(g.xp) + ' XP</span></div>' +
          (cls === 'cur' ? '<div class="xpbar"><i style="width:' + st.grade.pct + '%"></i></div><span class="hud" style="color:var(--cyan);font-size:10px">Tu es ici · ' + ui.fmtNum(st.xp) + ' XP</span>' : '') + '</div></li>';
      }).join('');
      function badgeCard(b) {
        var res = st.badges[b.id], on = res.earned;
        var pend = b.test && (me.records || []).some(function (r) { return r.bilan === 'defi' && r.statut === 'attente' && (r.test === b.test); });
        var status = on ? (res.date ? 'Gagné · ' + ui.fmtDate(res.date) : 'Gagné') : pend ? 'À confirmer par un adulte' : (res.prog || (b.defi ? 'Tenter le défi' : 'À débloquer'));
        var pips = '';
        if (b.paliers) {
          var P = C.PALIERS[(res.tier || 1) - 1];
          status = on ? P.nom + (res.next ? ' · ' + res.count + ' / ' + res.next : ' · ' + res.count + ' séances') : res.prog;
          pips = '<span class="pips" aria-label="Palier ' + (res.tier || 0) + ' sur 3">' + C.PALIERS.map(function (p, i) { return '<i class="' + (i < res.tier ? 'on' : '') + '" style="--pc:' + p.color + '"></i>'; }).join('') + '</span>';
        }
        var href = b.defi && !on ? '#/defi/' + b.id : (b.lien && !on ? b.lien : '');
        var tag = href ? 'a' : 'div';
        var col = b.paliers && on ? C.PALIERS[res.tier - 1].color : b.color;
        return '<' + tag + ' class="bdg' + (on ? ' on' : '') + '" style="--bc:' + col + '"' + (href ? ' href="' + href + '"' : '') + '>' + MC.badgeIcon({ icon: b.icon, color: col }, on, 56) + '<span class="nm">' + esc(b.nom) + '</span><span class="cd">' + esc(b.paliers ? b.paliers.join(' / ') + ' ' + b.cond : b.cond) + '</span>' + pips + '<span class="st">' + esc(status) + '</span></' + tag + '>';
      }
      var familles = C.FAMILLES_BADGES.map(function (f) {
        var list = C.BADGES.filter(function (b) { return b.famille === f.id; });
        var n = list.filter(function (b) { return st.badges[b.id].earned; }).length;
        return '<section class="sec"><div class="between"><h2 class="h2">' + esc(f.nom) + '</h2><span class="hud" style="color:var(--gold)">' + n + ' / ' + list.length + '</span></div>' +
          (f.intro ? '<p class="small" style="margin:0">' + esc(f.intro) + '</p>' : '') + '<div class="badges">' + list.map(badgeCard).join('') + '</div></section>';
      }).join('');
      return '<main class="screen">' + MC.kidSubBar('#/profil', 'Moi', 'Mes trophées') +
        '<div class="head"><span class="kicker" style="color:var(--gold)">Salle des trophées</span><h1 class="big md">Grades<br>et badges</h1></div>' +
        '<div class="cols2"><section class="sec"><div class="between"><h2 class="h2">Ma carrière</h2><span class="small">1 séance = ' + C.XP.seance + ' XP</span></div><ol class="grades">' + grades + '</ol>' +
        '<div class="box small" style="line-height:1.5">Séance à la maison +' + C.XP.seance + ' · club +' + C.XP.club + ' · récup +' + C.XP.recup + ' · semaine parfaite +' + C.XP.bonus + ' · badge ou palier +' + C.XP.badge + ' · record battu +' + C.XP.record + ' · niveau monté +' + C.XP.niveau + ' · mission spéciale +' + C.XP.mission + '</div></section>' +
        '<div class="sec" style="gap:20px">' + familles + '</div></div></main>';
    });
  }, { kid: true, nav: 'moi', bg: '#2E2612', live: true });

  // ---------- DÉFI (badge) ----------
  var defi = {};
  app.route('/defi/:id', function (p) {
    var b = null;
    C.BADGES.forEach(function (x) { if (x.id === p.id) b = x; });
    if (!b || !b.defi) return app.go('#/trophees', true);
    return app.loadMe().then(function (me) {
      var t = L.testDef(b.test), mini = me.joueur.materiel === 'mini';
      var sm = !!(t.sm && mini && (b.id === 'accroche' || b.id === 'cros'));
      if (defi.id !== b.id) defi = { id: b.id, v: '', g: '', d: '', m: '', s: '' };
      var input;
      function field(id, lab, o) { return '<div class="sec" style="gap:6px"><label class="lab" for="' + id + '">' + esc(lab) + '</label>' + ui.numInput(Object.assign({ id: id, kind: 'int', cls: 'txt', placeholder: '' }, o)) + '</div>'; }
      if (b.id === 'flamant') {
        input = '<div class="grid2">' + field('dg', 'Pied gauche (s)', { max: 2, value: defi.g, attrs: 'data-defi="g"' }) + field('dd', 'Pied droit (s)', { max: 2, value: defi.d, attrs: 'data-defi="d"' }) + '</div>';
      } else if (t.mmss) {
        input = '<span class="lab">' + esc((sm ? t.sm.nom : t.nom) + ' : ton temps') + '</span><div class="grid2">' +
          field('dm', 'Minutes', { max: 1, auto: true, placeholder: '0', value: defi.m, attrs: 'data-defi="m"' }) + field('ds', 'Secondes', { max: 2, placeholder: '0', value: defi.s, attrs: 'data-defi="s"' }) + '</div>';
      } else {
        var unit = t.unite ? ' (' + t.unite + ')' : '', dec = !!t.decimales;
        input = field('dv', (sm ? t.sm.nom : t.nom) + unit, { kind: dec ? 'dec' : 'int', max: dec ? 4 : 3, value: defi.v, placeholder: b.id === 'dupont' ? 'ex. 15,4' : '', attrs: 'data-defi="v"' });
      }
      var prev = '';
      if (b.id === 'dupont') {
        var nav = (me.records || []).filter(function (r) { return r.test === 'navette' && r.statut === 'ok'; }).sort(function (a, c) { return a.date < c.date ? -1 : 1; });
        prev = nav.length ? '<div class="note">' + icon('info', 20) + '<span>Ton 1er chrono de navette : <b>' + ui.fmtVal(nav[0].valeur, 's', 1) + '</b>. Fais mieux !</span></div>' : '<div class="note yellow">' + icon('info', 20) + '<span>Il faut d\'abord un 1er chrono de navette (au bilan) pour pouvoir le battre.</span></div>';
      }
      return '<main class="screen">' + MC.kidSubBar('#/trophees', 'Mes trophées', 'Défi ' + b.nom) +
        '<div class="row" style="gap:16px">' + MC.badgeIcon(b, true, 84) + '<div class="head"><span class="kicker" style="color:' + b.color + '">Défi badge</span><h1 class="big sm">' + esc(b.nom) + '</h1></div></div>' +
        '<div class="box"><div class="hud" style="color:' + b.color + '">Le défi</div><p class="lead" style="margin-top:6px;color:var(--ink)">' + esc(b.cond) + '</p>' + (t.comment ? '<p class="small" style="margin:8px 0 0">' + esc(sm ? t.sm.comment : t.comment) + '</p>' : '') + '</div>' +
        prev + '<div class="note yellow">' + icon('group', 20) + '<span>Un adulte doit être là pour compter. Ensuite, un parent ou ton éduc confirme dans son espace et le badge s\'allume.</span></div>' +
        '<div class="sec">' + input + '</div><button type="button" class="btn xl" data-act="sendDefi" data-b="' + b.id + '" data-sm="' + (sm ? 1 : 0) + '">' + icon('send', 20) + ' Envoyer mon résultat</button></main>';
    });
  }, { kid: true, nav: 'moi' });
  document.addEventListener('input', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-defi');
    if (!k) return;
    var clean = e.target.value.replace(e.target.getAttribute('data-num') === 'int' ? /[^0-9]/g : /[^0-9.,]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
    defi[k] = clean;
  });
  function num(s) { var n = parseFloat(String(s || '').replace(',', '.')); return isFinite(n) ? n : null; }
  MC.act.sendDefi = function (btn) {
    var b = null;
    C.BADGES.forEach(function (x) { if (x.id === btn.getAttribute('data-b')) b = x; });
    var sm = btn.getAttribute('data-sm') === '1', val, extra = sm ? { sm: true } : null;
    if (b.id === 'flamant') {
      var g = num(defi.g), d = num(defi.d);
      if (g === null || d === null) return ui.toast('Note le temps des deux pieds.', true);
      val = Math.min(g, d); extra = { g: g, d: d };
    } else if (L.testDef(b.test).mmss) {
      if (!defi.m && !defi.s) return ui.toast('Note ton temps.', true);
      val = (num(defi.m) || 0) * 60 + (num(defi.s) || 0);
    } else {
      val = num(defi.v);
      if (val === null) return ui.toast('Note ton résultat.', true);
    }
    btn.disabled = true;
    app.kidCall('submitRecords', { bilan: 'defi', valeurs: [{ test: b.test, valeur: val, extra: extra }], avecDossier: true }).then(function (r) {
      defi = {};
      if (r.me) { app.setMe(r.me); return r.me; }
      return app.loadMe(true);
    }).then(function () {
      ui.toast('Envoyé ! Un adulte doit confirmer.');
      app.go('#/trophees');
    }).catch(function (e) { btn.disabled = false; ui.toast(e.message, true); });
  };

  // ---------- CLASSEMENT ----------
  var rank = { test: C.TESTS[0].id, mode: 'best' };   // la 1re épreuve affichée
  app.route('/classement', function () {
    return Promise.all([app.loadMe(), app.kidCall('league')]).then(function (res) {
      app.S.league = res[1];
      if (MC.accueil) MC.accueil.markArene(res[0].joueur.id);
      return paintRank(res[0], res[1]);
    });
  }, { kid: true, nav: 'prepa', bg: '#2A1640' });

  function paintRank(me, Lg) {
    var lg = L.league(Lg, me.joueur.id, rank.test, rank.mode), t = lg.test;
    var chips = C.TESTS.map(function (tt) {
      var on = tt.id === rank.test;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" style="--oc:var(--pink);flex:none;min-height:44px;padding:0 12px" aria-pressed="' + on + '" data-act="rkTest" data-v="' + tt.id + '">' + esc(tt.court) + '</button>';
    }).join('');
    var lname = lg.lo === lg.hi ? 'Ligue N' + lg.lo : 'Ligue N' + lg.lo + '-N' + lg.hi;
    var lc = C.NIVEAUX[lg.myLv].color;
    var medal = ['#FFC23D', '#C7CEDF', '#E39A5B'];
    var rows = lg.rows.map(function (r) {
      var mine = r.p.id === me.joueur.id;
      var v = rank.mode === 'prog' ? (r.prog > 0 ? '+' : '') + ui.fmtVal(r.prog, t.unite, t.decimales) : ui.fmtVal(r.best, t.unite, t.decimales);
      return '<li class="li' + (mine ? ' me' : '') + '"><span class="rank" style="--rc:' + (r.rank <= 3 ? medal[r.rank - 1] : 'var(--dim)') + '">' + r.rank + '</span>' + ui.hexa(r.p.prenom, r.p.couleur) +
        '<span class="grow"><span class="t1">' + (mine ? 'TOI · ' : '') + esc(r.p.prenom.toUpperCase()) + '</span>' + (lg.lo !== lg.hi ? '<span class="t2">N' + r.lv + '</span>' : '') + '</span>' +
        '<span style="font:700 18px/1 var(--f-hud);color:' + (rank.mode === 'prog' ? 'var(--green)' : mine ? 'var(--cyan)' : 'var(--ink)') + '">' + v + '</span></li>';
    }).join('');
    var inIt = lg.rows.some(function (r) { return r.p.id === me.joueur.id; });
    var empty = !lg.rows.length ? '<div class="empty">' + (rank.mode === 'prog' ? 'Pas encore de progrès à comparer : il faut au moins 2 résultats confirmés (bilan + défi ou bilan suivant).' : 'Personne n\'a encore de résultat confirmé sur cette épreuve dans ta ligue.') + '</div>' : '';
    var meNote = !inIt && lg.rows.length ? '<div class="note">' + icon('info', 20) + '<span>Tu n\'apparais pas encore : saisis ton bilan (ou un défi) et fais-le confirmer par un adulte.</span></div>' : '';
    return '<main class="screen">' + MC.kidBar(me, app.S.stats) + MC.prepaTabs('classement') + '<div class="head"><span class="kicker" style="color:var(--pink)">Classement · M12</span><h1 class="big">L\'arène</h1></div>' +
      '<section class="row" style="padding:12px 14px;background:' + ui.rgba(lc, 0.1) + ';border:1.5px solid ' + lc + ';align-items:center">' + ui.lvl(lg.myLv, lname.toUpperCase()) +
      '<span style="font-size:13px;line-height:1.35;color:var(--soft)">Tu te mesures aux joueurs de ton niveau sur cette épreuve' + (lg.sm ? ' (version mini matériel)' : '') + '.</span></section>' +
      '<div class="sec" style="gap:8px"><span class="lab">Épreuve</span><div class="row chipsx" style="overflow-x:auto;gap:8px;padding-bottom:4px;-webkit-overflow-scrolling:touch">' + chips + '</div></div>' +
      '<div class="grid2"><button type="button" class="opt' + (rank.mode === 'best' ? ' on' : '') + '" aria-pressed="' + (rank.mode === 'best') + '" data-act="rkMode" data-v="best">Meilleur score</button>' +
      '<button type="button" class="opt' + (rank.mode === 'prog' ? ' on' : '') + '" style="--oc:var(--green)" aria-pressed="' + (rank.mode === 'prog') + '" data-act="rkMode" data-v="prog">Plus gros progrès</button></div>' +
      '<div class="between"><h2 class="h2">' + esc(t.nom) + '</h2><span class="small">' + lg.rows.length + ' joueur' + (lg.rows.length > 1 ? 's' : '') + '</span></div>' +
      meNote + empty + '<ol class="list">' + rows + '</ol>' +
      '<p class="small" style="text-align:center;margin:0">' + (rank.mode === 'prog' ? 'Progrès depuis ton 1er résultat : tout le monde peut être 1er.' : 'Records des bilans et des défis, confirmés par un adulte.') + '</p></main>';
  }
  MC.act.rkTest = function (b) { rank.test = b.getAttribute('data-v'); paintAgain(); };
  MC.act.rkMode = function (b) { rank.mode = b.getAttribute('data-v'); paintAgain(); };
  function paintAgain() {
    var host = document.getElementById('app'), y = window.scrollY;
    var sc = host.querySelector('[style*="overflow-x:auto"]'), x = sc ? sc.scrollLeft : 0;
    host.innerHTML = paintRank(app.S.me, app.S.league);
    var sc2 = host.querySelector('[style*="overflow-x:auto"]'); if (sc2) sc2.scrollLeft = x;
    window.scrollTo(0, y);
  }

  // ---------- BILAN ----------
  // Les valeurs du bilan en cours (formulaire et bilan guidé partagent le même état, gardé sur l'appareil)
  var bil = null, BIL_KEY = 'mc-bil';
  function saveBil() { app.lsSet(BIL_KEY, bil); }
  function ensureBil(me) {
    var B = L.currentBilan();
    if (!bil) bil = app.lsGet(BIL_KEY);
    if (!bil || bil.n !== B.n || bil.kid !== me.joueur.id) {
        bil = { n: B.n, kid: me.joueur.id, v: {}, date: '' };
        var ex = L.bilanRecords(me.records, B.n);
        Object.keys(ex).forEach(function (tid) {
          var r = ex[tid], td = L.testDef(tid);
          if (!bil.date && r.date) bil.date = r.date;
          if (td && td.mmss) { bil.v[tid + '_m'] = String(Math.floor(r.valeur / 60)); bil.v[tid + '_s'] = String(Math.round(r.valeur % 60)); }
          else bil.v[tid] = String(r.valeur).replace('.', ',');
          if (r.extra) {
            if (r.extra.g !== undefined) { bil.v.flamant_g = String(r.extra.g); bil.v.flamant_d = String(r.extra.d); }
            if (r.extra.elastique) { bil.v.tract_el = r.extra.elastique; bil.v.tract_nb = String(r.extra.nbElastique || ''); }
          }
        });
    }
    if (!bil.date) {
      var ex2 = L.bilanRecords(me.records, B.n), k2 = Object.keys(ex2)[0];
      if (k2 && ex2[k2].date) bil.date = ex2[k2].date;
    }
    return bil;
  }
  // date de réalisation du bilan (aujourd'hui par défaut, modifiable)
  function dateField(id) {
    var t = L.today();
    return '<div class="sec" style="gap:6px"><label class="lab" for="' + id + '">' + icon('calendar', 14) + ' Date du bilan : le jour où tu as fait les tests</label>' +
      '<input id="' + id + '" class="txt" type="date" max="' + t + '" min="' + L.addDays(t, -150) + '" value="' + esc(bil.date || t) + '" data-bildate></div>';
  }
  function onBilDate(e) {
    if (!e.target || !e.target.hasAttribute || !e.target.hasAttribute('data-bildate') || !bil) return;
    bil.date = e.target.value || '';
    saveBil();
  }
  document.addEventListener('change', onBilDate);
  document.addEventListener('input', onBilDate);
  app.route('/bilan', function () {
    return app.loadMe().then(function (me) {
      ensureBil(me);
      return paintBilan(me, L.currentBilan());
    });
  }, { kid: true, nav: 'prepa' });

  function prevBilanValue(me, test, B) {
    var best = null;
    (me.records || []).forEach(function (r) {
      if (r.test !== test || r.bilan === 'defi' || Number(r.bilan) >= B.n || r.statut === 'refuse') return;
      if (!best || Number(r.bilan) > Number(best.bilan)) best = r;
    });
    return best;
  }
  function bilanValues(me) {
    var mini = me.joueur.materiel === 'mini', out = [];
    C.TESTS.forEach(function (t) {
      var sm = !!(t.sm && mini);
      if (t.parPied) {
        var g = num(bil.v.flamant_g), d = num(bil.v.flamant_d);
        if (g !== null && d !== null) out.push({ test: t.id, valeur: Math.min(g, d), extra: { g: g, d: d } });
        return;
      }
      var v;
      if (t.mmss) {
        var mm = bil.v[t.id + '_m'], ss = bil.v[t.id + '_s'];
        if (!mm && !ss) return;
        v = (num(mm) || 0) * 60 + (num(ss) || 0);
      } else v = num(bil.v[t.id]);
      if (v === null) return;
      var extra = sm ? { sm: true } : null;
      if (t.special === 'tract' && !sm && v < 5 && bil.v.tract_el) extra = { elastique: bil.v.tract_el, nbElastique: num(bil.v.tract_nb) || 0 };
      out.push({ test: t.id, valeur: v, extra: extra });
    });
    return out;
  }
  function paintBilan(me, B) {
    var mini = me.joueur.materiel === 'mini', vals = bilanValues(me), done = vals.length, recs = 0;
    var bests = L.bests(me.records, {});
    var groups = C.FAMILLES.map(function (f) {
      var tests = C.TESTS.filter(function (t) { return C.CLES[t.cle] && C.CLES[t.cle].famille === f.id; });
      if (f.id === 'explo') tests = tests.concat([]);
      return '<section class="sec" style="gap:6px"><div class="row"><span class="dia" style="--dc:' + f.color + '"></span><h2 class="h2" style="font-size:21px">' + esc(f.nom) + '</h2></div>' + tests.map(function (t) {
        var sm = !!(t.sm && mini), nom = sm ? t.sm.nom : t.nom;
        var prev = prevBilanValue(me, t.id, B);
        var cur = vals.filter(function (v) { return v.test === t.id; })[0];
        var b = bests[t.id + (sm ? ':sm' : '')];
        var isRec = cur && b && b.bilan !== String(B.n) && L.better(t, cur.valeur, b.valeur);
        if (isRec) recs++;
        var inputs;
        var ic = '--ic:' + f.color;
        if (t.parPied) {
          inputs = '<span class="row" style="gap:6px">' + ui.numInput({ id: 'b_fg', kind: 'int', max: 2, style: ic + ';width:58px', label: nom + ' : pied gauche (s)', placeholder: 'G', value: bil.v.flamant_g, attrs: 'data-bil="flamant_g"' }) +
            ui.numInput({ id: 'b_fd', kind: 'int', max: 2, style: ic + ';width:58px', label: nom + ' : pied droit (s)', placeholder: 'D', value: bil.v.flamant_d, attrs: 'data-bil="flamant_d"' }) + '</span>';
        } else if (t.mmss) {
          inputs = '<span class="row" style="gap:4px">' + ui.numInput({ id: 'b_' + t.id + '_m', kind: 'int', max: 1, auto: true, cls: 'num sm', style: ic, label: nom + ' : minutes', placeholder: '0', value: bil.v[t.id + '_m'], attrs: 'data-bil="' + t.id + '_m"' }) + '<span class="unit">min</span>' +
            ui.numInput({ id: 'b_' + t.id + '_s', kind: 'int', max: 2, cls: 'num sm', style: ic, label: nom + ' : secondes', placeholder: '00', value: bil.v[t.id + '_s'], attrs: 'data-bil="' + t.id + '_s"' }) + '<span class="unit">s</span></span>';
        } else {
          var dec = !!t.decimales;
          inputs = '<span class="row" style="gap:4px">' + ui.numInput({ id: 'b_' + t.id, kind: dec ? 'dec' : 'int', max: dec ? 4 : 3, style: ic, label: nom + (t.unite ? ' (' + t.unite + ')' : ''), value: bil.v[t.id], attrs: 'data-bil="' + t.id + '"' }) + '<span class="unit" style="width:22px">' + esc(t.unite) + '</span></span>';
        }
        var extraRow = t.special === 'tract' ? tractExtra(sm) : '';
        return '<div class="trow' + (isRec ? ' rec' : '') + '" id="row_' + t.id + '"><label class="grow" for="' + (t.parPied ? 'b_fg' : 'b_' + t.id + (t.mmss ? '_m' : '')) + '"><span class="t1">' + t.n + '. ' + esc(nom) + (sm ? ' <span class="small">(SM)</span>' : '') + '</span><span class="t2">' + (prev ? 'Bilan ' + esc(prev.bilan) + ' : ' + recVal(prev, t) : (t.parPied ? 'gauche · droit' : esc(t.comment.split('.')[0]))) + '</span></label>' +
          '<span class="badge-rec" id="rb_' + t.id + '"' + (isRec ? '' : ' hidden') + '>Record</span>' + inputs + '</div>' + (t.special === 'tract' ? '<div id="tract_extra">' + extraRow + '</div>' : '');
      }).join('') + '</section>';
    }).join('');
    var pct = Math.round(done / C.TESTS.length * 100);
    var nb = L.nextBilan();
    return '<main class="screen">' + MC.kidSubBar('#/bilans', 'Bilans', 'Mon bilan') +
      '<div class="head"><span class="kicker">' + esc(B.nom) + ' · ' + esc(B.quand) + '</span><h1 class="big md">Mon bilan<br>de champion</h1></div>' +
      bilanExplain(me) +
      guidedCta() + dateField('bil_date') +
      (mini ? '<div class="note yellow">' + icon('home', 20) + '<span>Mode mini matériel : les tests 4, 5, 10 et 11 sont en version « SM ».</span></div>' : '') +
      '<div class="sec" style="gap:6px"><div class="between"><span class="hud" id="bil_done">' + done + ' / 12 tests notés</span><span class="hud" style="color:var(--gold)" id="bil_recs">' + recs + ' record' + (recs > 1 ? 's' : '') + '</span></div><div class="xpbar" style="height:8px"><i id="bil_bar" style="width:' + pct + '%"></i></div></div>' +
      '<h2 class="h2" style="margin-bottom:-8px">' + (MC.bilanGuide && MC.bilanGuide.started() ? 'Mes résultats' : 'Ou note tes résultats ici') + '</h2>' +
      '<div class="cols2"><div class="sec" style="gap:18px">' + groups.split('</section>').slice(0, 2).join('</section>') + '</section></div><div class="sec" style="gap:18px">' + groups.split('</section>').slice(2, 4).join('</section>') + '</section>' +
      '<button type="button" class="btn xl" id="bil_send" data-act="sendBilan"' + (done ? '' : ' disabled') + '>' + icon('send', 20) + ' Envoyer mon bilan</button>' +
      '<p class="small" style="text-align:center;margin:0">Tu peux revenir le compléter plus tard.' + (nb && nb.n !== B.n ? ' Prochain : ' + esc(nb.nom.toLowerCase()) + ', ' + esc(nb.quand) + '.' : '') + '</p></div></div></main>';
  }
  // le principe du bilan, expliqué simplement (et on peut s'entraîner sans)
  function bilanExplain(me) {
    var first = !(me.records || []).some(function (r) { return /^\d+$/.test(String(r.bilan)); });
    return '<section class="bilexp"><div class="hud" style="color:var(--cyan)">Le bilan, c\'est quoi ?</div>' +
      '<ol class="steps">' +
      '<li><span class="num" style="--sc:var(--cyan)">1</span><span class="tx"><b>12 petits tests</b> (sauts, gainage, navette…) pour voir où tu en es. Toutes les 8 semaines environ.</span></li>' +
      '<li><span class="num" style="--sc:var(--cyan)">2</span><span class="tx"><b>Avec un adulte</b> à côté qui regarde, compte et chronomètre. Environ 45 min, 2 min de repos entre deux tests.</span></li>' +
      '<li><span class="num" style="--sc:var(--cyan)">3</span><span class="tx">Il <b>règle tes niveaux</b> exercice par exercice, et tes résultats deviennent tes <b>records</b>.</span></li>' +
      '<li><span class="num" style="--sc:var(--cyan)">4</span><span class="tx">Un parent ou ton éduc les <b>confirme</b> : ils entrent alors dans l\'arène (le classement).</span></li></ol>' +
      (first ? '<p class="small" style="margin:0;color:var(--soft)">' + icon('info', 14) + ' Pas d\'adulte dispo aujourd\'hui ? Pas de souci : <b>tu peux t\'entraîner dès maintenant</b>, tes exos sont au niveau 1. Tu feras ton bilan quand un adulte sera là.</p>' : '') + '</section>';
  }
  function guidedCta() {
    var g = MC.bilanGuide && MC.bilanGuide.progress();
    return '<a class="btn xl gold" href="#/bilan/go" style="box-shadow:0 0 24px rgba(255,194,61,.35)">' + icon('play', 22) + (g ? ' Reprendre le bilan guidé · ' + esc(g) : ' Lancer le bilan guidé') + '</a>' +
      '<p class="small" style="margin:-8px 0 0;text-align:center">Test par test, comme une séance : la démo, le chrono, et tu notes au fur et à mesure.</p>';
  }
  function tractExtra(sm) {
    var v = num(bil.v.tract);
    if (sm || v === null || v >= 5) return '';
    var el = elasNom(bil.v.tract_el);
    return '<div class="box" style="display:flex;flex-direction:column;gap:8px;margin-top:-2px"><span class="small">Moins de 5 : avec quel élastique en fais-tu 5 ou plus ? (10 kg aide le moins, 30 kg aide le plus)</span><div class="grid3">' + [['10', '10 kg'], ['20', '20 kg'], ['30', '30 kg']].map(function (e) {
      return '<button type="button" class="opt' + (el === e[1] ? ' on' : '') + '" data-act="bilEl" data-v="' + e[0] + '">' + e[1] + '</button>';
    }).join('') + '</div>' + (bil.v.tract_el ? '<label class="row small" for="b_tnb">Combien avec l\'élastique ' + esc(el) + ' ? ' + ui.numInput({ id: 'b_tnb', kind: 'int', max: 2, label: 'Tractions avec l\'élastique ' + el, value: bil.v.tract_nb, attrs: 'data-bil="tract_nb"' }) + '</label>' : '') + '</div>';
  }
  function elasNom(e) { return { fin: '10 kg', moyen: '20 kg', fort: '30 kg', '10': '10 kg', '20': '20 kg', '30': '30 kg' }[e] || e || '';
  }
  // mise à jour sans redessiner la page (le clavier reste ouvert)
  function refreshBilan() {
    var me = app.S.me, B = L.currentBilan(), mini = me.joueur.materiel === 'mini';
    var vals = bilanValues(me), bests = L.bests(me.records, {}), recs = 0;
    C.TESTS.forEach(function (t) {
      var sm = !!(t.sm && mini), cur = vals.filter(function (v) { return v.test === t.id; })[0], b = bests[t.id + (sm ? ':sm' : '')];
      var isRec = !!(cur && b && b.bilan !== String(B.n) && L.better(t, cur.valeur, b.valeur));
      if (isRec) recs++;
      var row = document.getElementById('row_' + t.id), rb = document.getElementById('rb_' + t.id);
      if (row) row.classList.toggle('rec', isRec);
      if (rb) rb.hidden = !isRec;
    });
    var d = document.getElementById('bil_done'), r = document.getElementById('bil_recs'), bar = document.getElementById('bil_bar'), send = document.getElementById('bil_send');
    if (d) d.textContent = vals.length + ' / 12 tests notés';
    if (r) r.textContent = recs + ' record' + (recs > 1 ? 's' : '');
    if (bar) bar.style.width = Math.round(vals.length / C.TESTS.length * 100) + '%';
    if (send) send.disabled = !vals.length;
  }
  document.addEventListener('input', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-bil');
    if (!k || !bil) return;
    var clean = e.target.value.replace(e.target.getAttribute('data-num') === 'int' ? /[^0-9]/g : /[^0-9.,]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
    bil.v[k] = clean;
    saveBil();
    e.target.classList.toggle('has', !!clean);
    refreshBilan();
    if (k === 'tract') {
      var box = document.getElementById('tract_extra');
      if (box) { var show = !!tractExtra(app.S.me.joueur.materiel === 'mini'); if (show !== !!box.innerHTML) box.innerHTML = tractExtra(app.S.me.joueur.materiel === 'mini'); }
    }
  });
  MC.act.bilEl = function (b) { bil.v.tract_el = b.getAttribute('data-v'); saveBil(); var box = document.getElementById('tract_extra'); if (box) box.innerHTML = tractExtra(false); refreshBilan(); };
  MC.act.sendBilan = function (btn) { submitBilan(btn); };
  function submitBilan(btn) {
    var me = app.S.me, B = L.currentBilan();
    ensureBil(me);
    var vals = bilanValues(me);
    if (!vals.length) { ui.toast('Aucun résultat à envoyer.', true); return Promise.resolve(false); }
    if (btn) btn.disabled = true;
    var newLv = L.levelsFromBilan(vals, me.joueur.niveaux || {});
    var old = me.joueur.niveaux || {};
    var journal = [{ type: 'bilan_niveaux', data: { bilan: B.n, niveaux: newLv } }];
    // un seul appel : résultats datés + niveaux + profil à jour en retour
    return app.kidCall('submitRecords', { bilan: String(B.n), valeurs: vals, date: bil.date || L.today(), niveaux: newLv, journal: journal, avecDossier: true }).then(function (r) {
      if (r.me) return r.me;
      return app.kidCall('updateMe', { niveaux: newLv, journal: journal }); // serveur pas encore à jour
    }).then(function (res) {
      app.setMe(res);
      var changes = Object.keys(newLv).filter(function (k) { return (old[k] || 1) !== newLv[k]; });
      var body = '<p class="lead">' + vals.length + ' test' + (vals.length > 1 ? 's' : '') + ' envoyé' + (vals.length > 1 ? 's' : '') + '. Un parent ou ton éduc doit les confirmer.</p>' +
        (changes.length ? '<ul class="list">' + changes.map(function (k) { return '<li class="li"><span class="grow t1">' + esc(C.CLES[k].nom) + '</span>' + ui.lvl(old[k] || 1) + icon('right', 16) + ui.lvl(newLv[k]) + '</li>'; }).join('') + '</ul>' : '<p class="small">Tes niveaux ne changent pas.</p>');
      return ui.modal({ title: 'Bilan envoyé !', body: body, actions: [{ label: 'Voir mes bilans', value: 1, cls: 'btn' }] });
    }).then(function () { bil = null; saveBil(); app.go('#/bilans'); return true; })
      .catch(function (e) { if (btn) btn.disabled = false; ui.toast(e.message, true); return false; });
  }
  // utilisé par le bilan guidé (v-bilan.js)
  MC.bilan = {
    ensure: ensureBil, save: saveBil, submit: submitBilan, dateField: dateField,
    values: function (me) { ensureBil(me); return bilanValues(me); }
  };

  // ---------- RÉGLAGES ----------
  app.route('/reglages', function () {
    return app.loadMe().then(function (me) {
      var k = me.joueur, mini = k.materiel === 'mini';
      function sw(on, t1, t2, act) { return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-act="' + act + '"><span><span class="t1" style="display:block">' + t1 + '</span><span class="t2" style="display:block">' + t2 + '</span></span><span class="k"></span></button>'; }
      return '<main class="screen">' + MC.kidSubBar('#/profil', 'Moi', 'Réglages') +
        '<div class="head"><span class="kicker">' + esc(k.prenom) + '</span><h1 class="big md">Réglages</h1></div>' +
        '<div class="sec">' + sw(mini, 'Mode mini matériel', 'Tapis + élastiques : les exercices et les tests s\'adaptent', 'toggleMini') +
        sw(!ui.isMuted(), 'Bips du chrono', 'Un bip 10 s avant la fin, puis 5-4-3-2-1 et le son de fin', 'togglePrefSon') +
        '<a class="switch" href="#/guide?pour=joueur&de=reglages" style="text-decoration:none"><span><span class="t1" style="display:block">Comment ça marche ?</span><span class="t2" style="display:block">Étoiles, niveaux, badges, bilan, classement</span></span>' + icon('right', 18) + '</a>' +
        '<a class="switch" href="#/nouveautes" style="text-decoration:none"><span><span class="t1" style="display:block">Les nouveautés</span><span class="t2" style="display:block">Ce qui a changé dans l\'appli</span></span>' + icon('right', 18) + '</a>' +
        '<a class="switch" href="#/bienvenue?revoir=1" style="text-decoration:none"><span><span class="t1" style="display:block">Revoir la visite</span><span class="t2" style="display:block">Les 5 écrans du début</span></span>' + icon('right', 18) + '</a>' +
        '<a class="switch" href="#/premiere?change=1" style="text-decoration:none"><span><span class="t1" style="display:block">Changer mon code secret</span><span class="t2" style="display:block">Et ma couleur reste la même</span></span>' + icon('right', 18) + '</a>' +
        '<div class="box"><span class="t2 small">' + (k.visible ? 'Tu apparais dans le classement de ta ligue.' : 'Tes parents ont choisi de ne pas t\'afficher dans le classement des autres.') + '</span></div></div>' +
        '<button type="button" class="btn2 grey" data-act="logoutKid">' + icon('logout', 18) + ' Changer de joueur</button>' +
        '<a class="btn2 grey" href="#/adultes">' + icon('lock', 18) + ' Espace adultes (parents, éducs)</a>' +
        '<p class="small" style="margin:0;text-align:center">Sur l\'iPad ou le téléphone : menu Partager › « Sur l\'écran d\'accueil » pour avoir le site comme une appli.</p></main>';
    });
  }, { kid: true, nav: 'moi' });
  MC.act.togglePrefSon = function () { ui.setMuted(!ui.isMuted()); if (!ui.isMuted()) { ui.unlockAudio(); ui.beep(880, 0.08); } app.rerender(); };
  MC.act.logoutKid = function () { app.setKid(null); app.go('#/connexion'); };
})();
