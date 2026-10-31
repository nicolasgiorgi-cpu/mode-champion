/* =========================================================
   Mode champion · M12 — « Bravo » pour une séance de prépa (v36, 31/10/2026)
   Un éduc félicite un enfant qui a fait sa séance, d'un seul toucher, là où il voit la séance :
   Progrès › Ça bouge, la cloche (« … a fait la séance de … »), la fiche de l'enfant › Prépa › Séances.
   - Toucher « 👏 Bravo » : c'est envoyé tout de suite (le bouton passe à « 👏 Envoyé »).
   - Retoucher « Envoyé » : ajouter un petit mot (facultatif, phrases toutes prêtes) ou retirer le bravo.
   - Seulement sur les séances des 14 derniers jours (la fiche n'est pas couverte de boutons).
   L'enfant et sa famille le voient (Ma semaine, sous la séance, la cloche, une alerte sur le téléphone). Pas d'XP.
   Décisions de Nicolas (31/10) : les éducs seulement, un toucher, pas d'XP.
   Serveur : actions bravo et retirerBravo (js/core.js).
   ========================================================= */
(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, esc = ui.esc, RECENT = 14;
  var PHRASES = ['Bravo, continue comme ça !', 'Super séance !', 'Quelle régularité !', 'Tu progresses, bravo !'];
  function G() { return app.S.cache.group; }
  function persist() { var g = G(); if (g && app.S.adult) app.lsSet('mc-group', { tok: app.S.adult.token, data: g }); }
  function joueur(g, id) { return g && g.joueurs ? g.joueurs.filter(function (p) { return p.joueur.id === id; })[0] || null : null; }
  function seance(p, sid) { return p ? (p.seances || []).filter(function (s) { return s.id === sid; })[0] || null : null; }
  function mien(g, p, sid) { return p ? (p.bravos || []).filter(function (b) { return b.seanceId === sid && b.parQui === g.moi.id; })[0] || null : null; }
  // « sa séance de Cros », « son entraînement au club », « sa récup »
  function quoi(s, ta) { return MC.notifs && MC.notifs.pour ? MC.notifs.pour(s, ta) : (ta ? 'ta séance' : 'sa séance'); }

  // le bouton (vide si ce n'est pas un éduc, ou si l'enfant n'est plus dans le groupe)
  // o.sm : petit (dans une liste serrée)
  function btn(g, jid, s, o) {
    if (!g || !g.moi || !s || !s.id) return '';
    var p = joueur(g, jid);
    if (!p || !p.joueur.actif) return '';
    var m = mien(g, p, s.id), nom = p.joueur.prenom;
    // une séance de plus de 2 semaines : plus de bouton (sauf pour retoucher un bravo déjà donné)
    if (!m && s.date && s.date < L.addDays(L.today(), -RECENT)) return '';
    return '<button type="button" class="bvb' + (m ? ' on' : '') + (o && o.sm ? ' sm' : '') + '" data-act="' + (m ? 'bravoPlus' : 'bravo') + '" data-bv="' + esc(s.id) + '" data-j="' + esc(jid) + '" aria-label="' +
      esc(m ? 'Bravo envoyé à ' + nom + ' : ajouter un mot ou le retirer' : 'Dire bravo à ' + nom + ' pour ' + quoi(s)) + '">' +
      '<span class="bv-i" aria-hidden="true">👏</span><span class="bv-t">' + (m ? 'Envoyé' : 'Bravo') + '</span></button>';
  }
  // pour MC.suivi.seances : le bouton sur chaque séance et les bravos déjà reçus (« vous » pour les miens)
  function opts(g, jid, extra) {
    var p = joueur(g, jid), o = { bravos: (p && p.bravos) || [], moi: g && g.moi ? g.moi.id : '', bravo: function (s) { return btn(g, jid, s, { sm: true }); } };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }
  // le bravo arrive ou part : le groupe gardé en mémoire suit, puis les lignes de cette séance sont mises à jour SUR PLACE
  // (pas de redessin de l'écran : les volets ouverts, « Voir les autres », le détail d'une séance, restent ouverts,
  // et la cloche garde sa partie « Nouveau »)
  function garder(jid, b, retire) {
    var g = G(), p = joueur(g, jid);
    if (!p) return;
    p.bravos = (p.bravos || []).filter(function (x) { return x.id !== (b && b.id); });
    if (!retire && b) p.bravos.push(b);
    persist();
  }
  function surPlace(sid, jid) {
    var g = G(), p = joueur(g, jid), s = seance(p, sid) || { id: sid };
    Array.prototype.slice.call(document.querySelectorAll('.bvb')).forEach(function (el) {
      if (el.getAttribute('data-bv') !== sid) return;
      var li = el.closest('li'), tmp = document.createElement('div');
      tmp.innerHTML = btn(g, jid, s, { sm: el.classList.contains('sm') });
      if (tmp.firstChild) el.replaceWith(tmp.firstChild); else el.remove();
      // la ligne « 👏 vous · Cyril » sous la séance (Ça bouge, la fiche)
      var gr = li && li.querySelector('.grow');
      if (!gr || !MC.suivi) return;
      var old = gr.querySelector('.bvw');
      if (old) old.remove();
      gr.insertAdjacentHTML('beforeend', MC.suivi.bravosDe(s, { bravos: (p && p.bravos) || [], moi: g.moi.id }));
    });
  }

  MC.act.bravo = function (b) {
    var g = G(), sid = b.getAttribute('data-bv'), jid = b.getAttribute('data-j'), p = joueur(g, jid);
    if (!g || !p || b.getAttribute('data-wait')) return;
    // tout de suite à l'écran : le toucher se voit, même si le serveur met 2 secondes à répondre
    b.setAttribute('data-wait', '1'); b.classList.add('on'); b.querySelector('.bv-t').textContent = 'Envoyé';
    app.adultCall('bravo', { seanceId: sid }).then(function (r) {
      garder(jid, r.bravo);
      ui.toast('👏 Bravo envoyé à ' + p.joueur.prenom + ' (retouchez pour ajouter un mot)');
      surPlace(sid, jid);
    }).catch(function (e) { ui.toast(e.message || 'Le bravo n\'est pas parti.', true); surPlace(sid, jid); });
  };

  // retoucher « Envoyé » : un petit mot (phrases toutes prêtes) ou retirer le bravo
  MC.act.bravoPlus = function (b) {
    var g = G(), sid = b.getAttribute('data-bv'), jid = b.getAttribute('data-j'), p = joueur(g, jid), m = p ? mien(g, p, sid) : null, s = seance(p, sid);
    if (!g || !p || !m) return;
    var nom = p.joueur.prenom;
    ui.modal({
      title: '👏 Bravo à ' + esc(nom),
      body: '<p class="small" style="margin:0">' + esc(('Envoyé' + (s ? ' pour ' + quoi(s) + (s.date ? ' du ' + ui.fmtDate(s.date) : '') : '')).replace(/\.?$/, '.')) + ' ' + esc(nom) + ' et sa famille le voient.</p>' +
        '<label class="lab" for="bvmot">Un petit mot (facultatif)</label>' +
        '<div class="bvph">' + PHRASES.map(function (t) { return '<button type="button" class="chip" data-bvph="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
        '<textarea id="bvmot" class="txt" rows="2" maxlength="140" placeholder="Ou écrivez le vôtre">' + esc(m.mot || '') + '</textarea>',
      actions: [
        { label: 'Envoyer le mot', cls: 'btn', onClick: function (host, close) { close({ mot: host.querySelector('#bvmot').value }); } },
        { label: 'Retirer le bravo', value: 'retirer', cls: 'btn2 grey' }
      ],
      onOpen: function (host) {
        host.addEventListener('click', function (e) {
          var c = e.target.closest('[data-bvph]');
          if (c) { var t = host.querySelector('#bvmot'); t.value = c.getAttribute('data-bvph'); t.focus(); }
        });
      }
    }).then(function (v) {
      if (!v) return;
      if (v === 'retirer') {
        return app.adultCall('retirerBravo', { id: m.id }).then(function () {
          garder(jid, m, true); ui.toast('Bravo retiré.'); surPlace(sid, jid);
        }, function (e) { ui.toast(e.message, true); });
      }
      var mot = String(v.mot || '').replace(/\s+/g, ' ').trim();
      if (mot === (m.mot || '')) { ui.toast(mot ? 'C\'est déjà ce mot-là.' : 'Pas de mot : le bravo reste envoyé.'); return; }
      return app.adultCall('bravo', { seanceId: sid, mot: mot }).then(function (r) {
        garder(jid, r.bravo); ui.toast(mot ? 'Mot envoyé à ' + nom + '.' : 'Mot retiré.'); surPlace(sid, jid);
      }, function (e) { ui.toast(e.message, true); });
    });
  };

  MC.bravo = { btn: btn, opts: opts, quoi: quoi, PHRASES: PHRASES };
})();
