/* =========================================================
   Mode champion · M12 — Équipe › « Ça bouge » (lot E5, 11/11/2026)
   Ce que font les copains ces 7 derniers jours : leurs séances et leurs records battus (le progrès, jamais le score),
   et le bravo entre enfants : un toucher, puis un mot tout prêt (jamais de texte libre).
   Décisions de Nicolas : revue de l'interface enfant (09/11), lots (10/11), « enfants : mots préremplis seuls » (11/11).
   Serveur : actions equipe et bravoCopain (js/core.js). Les enfants cachés par leur famille n'y sont pas.
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, esc = ui.esc, icon = ui.icon;
  var EQ = { data: null };

  // les sous-onglets de l'onglet Équipe (aussi en haut des podiums, js/v-profil.js)
  function tabs(on) { return ui.subtabs('equipe', [['fil', '#/equipe', 'Ça bouge'], ['podiums', '#/classement', 'Podiums']], on, '#FF7FBC', 'Équipe'); }
  MC.equipeTabs = tabs;

  function nomSeance(s) { return MC.notifs && MC.notifs.pour ? MC.notifs.pour({ type: s.type, details: s.match ? { match: true } : null }, false) : 'sa séance'; }
  function quand(iso, date) {
    var t = Date.parse(iso || ''), auj = L.today();
    if (date === auj && !isNaN(t)) { var h = new Date(t); return 'aujourd\'hui · ' + h.getHours() + 'h' + (h.getMinutes() < 10 ? '0' : '') + h.getMinutes(); }
    if (date === L.addDays(auj, -1)) return 'hier';
    return ui.fmtDate(date);
  }
  // 4 mots pour un copain, qui changent d'un copain et d'un jour à l'autre (pas toujours les mêmes en haut)
  function quatre(jid) {
    var M = (EQ.data && EQ.data.mots) || [], h = 7, k = L.today() + jid;
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 1000003;
    var d = M.length ? h % M.length : 0, l = M.slice(d).concat(M.slice(0, d));
    return l.slice(0, 4);
  }
  function fil(me, d) {
    var noms = {}, ev = [];
    d.joueurs.forEach(function (j) { noms[j.id] = j; });
    var parS = {};
    d.bravos.forEach(function (b) { (parS[b.seanceId] = parS[b.seanceId] || []).push(b); });
    d.seances.forEach(function (s) { ev.push({ t: s.cree || s.date, s: s }); });
    d.progres.forEach(function (r) { ev.push({ t: r.cree || r.date, r: r }); });
    ev.sort(function (a, b) { return a.t < b.t ? 1 : -1; });
    return ev.slice(0, 60).map(function (e) {
      var x = e.s || e.r, j = noms[x.joueurId] || { prenom: '?' }, moi = x.joueurId === me.joueur.id;
      var qui = moi ? 'Toi' : esc(j.prenom), dot = '<span class="eqdot" style="--c:' + esc(j.couleur || '#38E8FF') + '"></span>';
      if (e.r) {
        var t = L.testDef(x.test) || { court: x.test, unite: '' }, nom = x.sm && t.sm ? t.sm.nom : t.court;
        var g = t.moinsMieux ? ui.fmtVal(x.gain, t.unite, t.decimales) + ' plus rapide' : '+' + ui.fmtVal(x.gain, t.unite, t.decimales);
        return '<li class="li eqli eqrec">' + dot + '<span class="grow"><span class="t1">' + qui + (moi ? ' : ton record' : ' bat son record') + '</span><span class="t2">' + esc(nom) + ' · <b style="color:var(--green)">' + esc(g) + '</b> · ' + esc(quand(x.cree, x.date)) + '</span></span>' + icon('trophy', 18, 'style="color:var(--gold);flex:none"') + '</li>';
      }
      var bv = parS[x.id] || [], mien = bv.filter(function (b) { return b.moi; })[0], n = bv.length;
      var compte = n ? '<span class="eqn" aria-label="' + n + ' bravo' + (n > 1 ? 's' : '') + '">👏 ' + n + '</span>' : '';
      var btn = moi || !me.joueur.visible ? compte : '<button type="button" class="bvb sm' + (mien ? ' on' : '') + '" data-act="eqBravo" data-s="' + esc(x.id) + '" data-j="' + esc(x.joueurId) + '" aria-label="' + esc((mien ? 'Bravo envoyé à ' : 'Dire bravo à ') + j.prenom) + '"><span class="bv-i" aria-hidden="true">👏</span><span class="bv-t">' + (mien ? 'Envoyé' : 'Bravo') + '</span></button>';
      var t2 = esc(nomSeance(x).replace(/^sa /, '').replace(/^son /, '')) + ' · ' + esc(quand(x.cree, x.date)) + (mien && mien.mot ? ' · « ' + esc(mien.mot) + ' »' : '') + (!moi && n ? ' · 👏 ' + n : '');
      return '<li class="li eqli">' + dot + '<span class="grow"><span class="t1">' + qui + (moi ? ' : ta séance' : ' a fait sa séance') + '</span><span class="t2">' + t2 + '</span></span>' + btn + '</li>';
    }).join('');
  }
  app.route('/equipe', function () {
    return Promise.all([app.loadMe(), app.kidCall('equipe')]).then(function (res) {
      var me = res[0], d = res[1];
      EQ.data = d;
      var l = fil(me, d), cache = !me.joueur.visible;
      return '<main class="screen">' + MC.kidBar(me, app.S.stats) + tabs('fil') +
        '<p class="small" style="margin:0">Les séances et les records de l\'équipe, ces 7 derniers jours.' + (cache ? '' : ' Un 👏 pour encourager les autres !') + '</p>' +
        (cache ? '<div class="note">' + icon('info', 18, 'style="flex:none"') + '<span class="small">Ta famille a choisi de te cacher de l\'équipe : tu vois les autres, mais tu ne peux pas envoyer de bravo.</span></div>' : '') +
        (l ? '<ul class="list eqfil">' + l + '</ul>' : '<div class="empty">Pas encore de séance cette semaine dans l\'équipe. Lance la tienne !</div>') +
        '</main>';
    });
  }, { kid: true, nav: 'equipe' });

  // le bravo : un toucher, puis un mot tout prêt
  MC.act.eqBravo = function (b) {
    var sid = b.getAttribute('data-s'), jid = b.getAttribute('data-j'), d = EQ.data;
    if (!d) return;
    var j = d.joueurs.filter(function (x) { return x.id === jid; })[0] || { prenom: '' };
    var mien = d.bravos.filter(function (x) { return x.seanceId === sid && x.moi; })[0];
    ui.modal({
      title: '👏 Bravo à ' + esc(j.prenom),
      body: '<p class="small" style="margin:0">Choisis ton mot :</p><div class="bvph eqmots">' + quatre(jid).map(function (m) {
        return '<button type="button" data-eqmot="' + esc(m) + '"' + (mien && mien.mot === m ? ' class="on"' : '') + '>' + esc(m) + '</button>';
      }).join('') + '</div>',
      actions: [{ label: 'Annuler', value: false, cls: 'btn2 grey' }],
      onOpen: function (host, close) {
        host.addEventListener('click', function (e) { var c = e.target.closest('[data-eqmot]'); if (c) close({ mot: c.getAttribute('data-eqmot') }); });
      }
    }).then(function (v) {
      if (!v || !v.mot) return;
      // (relecture v72) « Envoyé » tout de suite : le serveur peut mettre 2 secondes à répondre
      b.classList.add('on'); b.setAttribute('data-wait', '1'); var bt = b.querySelector('.bv-t'); if (bt) bt.textContent = 'Envoyé';
      return app.kidCall('bravoCopain', { seanceId: sid, mot: v.mot }).then(function (r) {
        d.bravos = d.bravos.filter(function (x) { return !(x.seanceId === sid && x.moi); });
        d.bravos.push({ seanceId: sid, de: 'p', moi: true, parNom: '', mot: r.bravo.mot });
        ui.toast('👏 Bravo envoyé à ' + j.prenom + ' !');
        app.rerender();
      }, function (e) { b.removeAttribute('data-wait'); if (!mien) { b.classList.remove('on'); if (bt) bt.textContent = 'Bravo'; } ui.toast(e.message, true); });
    });
  };
})();
