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
  // (v71, demande de Nicolas du 11/11) un grand choix de mots, pour ne pas se répéter (sans accord masculin / féminin)
  var MOTS = PHRASES.concat(['Énorme boulot !', 'Tu ne lâches rien, bravo !', 'Ça, c\'est du sérieux !', 'Belle séance !', 'Quelle fierté !',
    'Tu montres l\'exemple !', 'Quelle motivation !', 'On voit tes efforts, top !', 'Bien joué !', 'Chapeau !', 'Ça paie, continue !',
    'Encore un pas vers tes objectifs !', 'Solide comme un pilier !', 'Rapide comme un ailier !', 'Le flair d\'un demi de mêlée !',
    'Tu tiens le rythme, bravo !', 'Séance bouclée, chapeau !', 'Quelle énergie !', 'Rien ne t\'arrête !', 'Tu es sur la bonne voie !',
    'Les efforts d\'aujourd\'hui, les essais de demain !', 'Ton équipe peut compter sur toi !', 'Grosse séance, respect !',
    'Tu as tout donné, bravo !', 'La régularité d\'une horloge !', 'Bravo pour ta persévérance !', 'On sent la progression !',
    'Tu fais plaisir à voir !', 'Magnifique, continue !', 'Toujours au rendez-vous, bravo !', 'Ça, c\'est l\'esprit rugby !',
    'Jusqu\'au bout, bravo !', 'Impressionnant !', 'Une séance de pro !', 'Bravo, quelle volonté !', 'Tu gagnes en force !',
    'Tu gagnes en vitesse !', 'Bel effort !', 'Mental d\'acier !', 'Tu assures !', 'Continue, tu es au top !', 'Merci pour ton sérieux !',
    'Le travail paie, bravo !', 'Des progrès de géant !', 'Quelle constance !', 'Tes adversaires n\'ont qu\'à bien se tenir !', 'Une vraie machine !',
    'Tout le groupe peut s\'inspirer de toi !', 'Du grand travail !', 'Tu fais bien les choses, bravo !']);
  // n mots pour un enfant : pas ceux qu'il a reçus dernièrement, ni ceux déjà proposés sur l'écran (pris) ; l'ordre change d'un jour et d'un enfant à l'autre
  function hache(t) { var h = 7; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 1000003; return h; }
  function ordreMots(p) {
    var recus = {}, l;
    ((p && p.bravos) || []).slice().sort(function (a, b) { return (a.maj || a.cree) < (b.maj || b.cree) ? 1 : -1; }).slice(0, 12).forEach(function (x) { if (x.mot) recus[x.mot] = 1; });
    var depart = hache(L.today() + ((p && p.joueur && p.joueur.id) || '')) % MOTS.length;
    l = MOTS.slice(depart).concat(MOTS.slice(0, depart));
    return { l: l, recus: recus };
  }
  // (relecture v71) pour tout l'écran : le 1er mot de chacun d'abord (tous différents jusqu'à 54 enfants), puis le 2e, puis le 3e
  // deja : les mots déjà à l'écran (un enfant qui arrive pendant la visite ne reprend pas le 1er mot d'un autre)
  function repartir(ps, n, deja0) {
    var pris = {}, out = {}, O = {};
    Object.keys(deja0 || {}).forEach(function (m) { pris[m] = 1; });
    ps.forEach(function (p) { O[p.joueur.id] = ordreMots(p); out[p.joueur.id] = []; });
    for (var k = 0; k < n; k++) {
      ps.forEach(function (p) {
        var id = p.joueur.id, o = O[id], deja = out[id];
        var m = o.l.filter(function (x) { return !o.recus[x] && !pris[x] && deja.indexOf(x) < 0; })[0] ||
          o.l.filter(function (x) { return !pris[x] && deja.indexOf(x) < 0; })[0] || o.l.filter(function (x) { return deja.indexOf(x) < 0; })[0];
        if (m) { deja.push(m); pris[m] = 1; }
      });
    }
    return out;
  }
  function motsPour(p, n, pris) {
    var o = ordreMots(p), recus = o.recus, l = o.l;
    var ok = l.filter(function (m) { return !recus[m] && !(pris && pris[m]); });
    if (ok.length < n) ok = ok.concat(l.filter(function (m) { return ok.indexOf(m) < 0 && !(pris && pris[m]); }));
    if (ok.length < n) ok = ok.concat(l.filter(function (m) { return ok.indexOf(m) < 0; }));
    ok = ok.slice(0, n);
    if (pris) ok.forEach(function (m) { pris[m] = 1; });
    return ok;
  }
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
        '<div class="bvph">' + motsPour(p, 4).map(function (t) { return '<button type="button" class="chip" data-bvph="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
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
          garder(jid, m, true); ui.toast('Bravo retiré.');
          if (location.hash.indexOf('#/educ/bravos') === 0) { delete BV.faits[jid]; app.rerender(); } else surPlace(sid, jid);
        }, function (e) { ui.toast(e.message, true); });
      }
      var mot = String(v.mot || '').replace(/\s+/g, ' ').trim();
      if (mot === (m.mot || '')) { ui.toast(mot ? 'C\'est déjà ce mot-là.' : 'Pas de mot : le bravo reste envoyé.'); return; }
      return app.adultCall('bravo', { seanceId: sid, mot: mot }).then(function (r) {
        garder(jid, r.bravo); ui.toast(mot ? 'Mot envoyé à ' + nom + '.' : 'Mot retiré.');
        if (location.hash.indexOf('#/educ/bravos') === 0) app.rerender(); else surPlace(sid, jid);
      }, function (e) { ui.toast(e.message, true); });
    });
  };

  // ======================================================================
  // (v71) Les bravos en série : Progrès › Prépa physique › « 👏 Bravos ». Pour chaque enfant qui a fait une séance depuis
  // mon dernier bravo (14 jours au plus), 3 mots proposés : un toucher envoie le bravo avec ce mot (sur sa dernière séance) ;
  // le crayon pour écrire le sien ; « Bravo à tous » envoie à chacun le 1er mot proposé (tous différents).
  // ======================================================================
  var BV = { cle: '', mots: {}, faits: {}, ordre: [] };   // pendant la visite : les mots proposés, l'ordre des lignes, faits (enfant → séance félicitée ici)
  function aFeliciter(g) {
    var depuis = L.addDays(L.today(), -RECENT), out = [];
    (g.joueurs || []).forEach(function (p) {
      if (!p.joueur.actif) return;
      var miens = (p.bravos || []).filter(function (b) { return b.parQui === g.moi.id; }), dernier = '';
      // (relecture v71) le repère : la séance la plus récente que j'ai félicitée (un bravo donné jeudi sur la séance de lundi ne cache pas celle de mercredi)
      miens.forEach(function (b) { var s = seance(p, b.seanceId), t = s ? (s.cree || s.date) : (b.cree || ''); if (t > dernier) dernier = t; });
      var l = (p.seances || []).filter(function (s) { return s.date >= depuis && (s.cree || s.date) > dernier && !mien(g, p, s.id); })
        .sort(function (a, b) { return (a.cree || a.date) < (b.cree || b.date) ? 1 : -1; });
      if (l.length) out.push({ p: p, s: l[0], n: l.length });
    });
    out.sort(function (a, b) { return (a.s.cree || a.s.date) < (b.s.cree || b.s.date) ? 1 : -1; });
    return out;
  }
  function nb(g) { return g ? aFeliciter(g).length : 0; }
  function ligne(g, x) {
    var p = x.p, jid = p.joueur.id, fait = BV.faits[jid], m = fait ? mien(g, p, fait) : null;
    var info = esc((C().JOURS[x.s.type] || {}).nomSeance || x.s.type) + ' · ' + esc(ui.fmtDate(x.s.date)) + (x.n > 1 ? ' (+' + (x.n - 1) + ')' : '');
    var corps = m ? '<div class="bvfait"><span>👏 ' + (m.mot ? '« ' + esc(m.mot) + ' »' : 'Envoyé') + '</span>' + btn(g, jid, seance(p, fait) || { id: fait }, { sm: true }) + '</div>' :
      '<div class="bvmots">' + BV.mots[jid].map(function (t) { return '<button type="button" class="chip" data-act="bvMot" data-j="' + esc(jid) + '" data-bv="' + esc(x.s.id) + '" data-mot="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') +
      '<button type="button" class="chip bvecr" data-act="bvEcrire" data-j="' + esc(jid) + '" data-bv="' + esc(x.s.id) + '" aria-label="Écrire un mot pour ' + esc(p.joueur.prenom) + '">' + MC.ui.icon('edit', 16) + '</button></div>';
    return '<li class="bvk' + (m ? ' ok' : '') + '" data-j="' + esc(jid) + '"><div class="bvk-h"><span class="t1">' + esc(p.joueur.prenom) + '</span><span class="t2">' + info + '</span></div>' + corps + '</li>';
  }
  function C() { return MC.CONTENT; }
  app.route('/educ/bravos', function () {
    return MC.loadGroup().then(function (g) {
      app.refreshNav();
      var cle = g.moi.id;
      if (BV.cle !== cle) BV = { cle: cle, mots: {}, faits: {}, ordre: [] };   // remis à zéro en quittant l'écran (plus bas)
      // les enfants déjà félicités pendant cette visite restent à leur place (avec leur mot) ; un nouveau arrive en bas
      var a = aFeliciter(g), par = {}, l = [];
      a.forEach(function (x) { par[x.p.joueur.id] = x; });
      BV.ordre.forEach(function (jid) {
        if (par[jid]) { l.push(par[jid]); delete par[jid]; return; }
        var p = joueur(g, jid), s = BV.faits[jid] ? seance(p, BV.faits[jid]) : null;
        if (p && s) l.push({ p: p, s: s, n: 1 });
      });
      a.forEach(function (x) { if (par[x.p.joueur.id]) { l.push(x); BV.ordre.push(x.p.joueur.id); } });
      var neufs = l.filter(function (x) { return !BV.mots[x.p.joueur.id]; }).map(function (x) { return x.p; });
      if (neufs.length) {
        var affiches = {};
        Object.keys(BV.mots).forEach(function (k) { BV.mots[k].forEach(function (m) { affiches[m] = 1; }); });
        var R = repartir(neufs, 3, affiches); Object.keys(R).forEach(function (id) { BV.mots[id] = R[id]; });
      }
      var reste = l.filter(function (x) { return !BV.faits[x.p.joueur.id]; });
      var tous = reste.length > 1 ? '<button type="button" class="btn gold" data-act="bvTous">👏 Bravo à tous (' + reste.length + ')</button>' : '';
      return '<main class="screen">' + MC.educBar(g, 'Bravos', '#/educ/progres', 'Prépa physique') +
        '<p class="small" style="margin:0">Leurs séances depuis votre dernier bravo. Un mot touché = envoyé.</p>' + tous +
        (l.length ? '<ul class="list bvlist">' + l.map(function (x) { return ligne(g, x); }).join('') + '</ul>' : '<div class="empty">Personne à féliciter pour l\'instant.</div>') +
        '</main>';
    });
  }, { adult: 'e', nav: 'e:progres' });
  function envoyer(liste) {
    return app.adultCall('bravos', { liste: liste }).then(function (r) {
      (r.bravos || []).forEach(function (b) { garder(b.joueurId, b); BV.faits[b.joueurId] = b.seanceId; });
      return r;
    });
  }
  MC.act.bvMot = function (b) {
    var jid = b.getAttribute('data-j'), sid = b.getAttribute('data-bv'), mot = b.getAttribute('data-mot'), g = G(), p = joueur(g, jid);
    var li = b.closest('.bvk');
    if (!p || (li && li.classList.contains('wait'))) return;
    if (li) li.classList.add('wait');   // (relecture v71) toute la ligne attend la réponse : pas de 2e mot pendant l'envoi
    b.classList.add('on');
    envoyer([{ seanceId: sid, mot: mot }]).then(function () { ui.toast('👏 Bravo envoyé à ' + p.joueur.prenom); app.rerender(); })
      .catch(function (e) { if (li) li.classList.remove('wait'); b.classList.remove('on'); ui.toast(e.message || 'Le bravo n\'est pas parti.', true); });
  };
  MC.act.bvEcrire = function (b) {
    var jid = b.getAttribute('data-j'), sid = b.getAttribute('data-bv'), g = G(), p = joueur(g, jid), li = b.closest('.bvk');
    if (!p || (li && li.classList.contains('wait'))) return;
    ui.modal({ title: '👏 Bravo à ' + esc(p.joueur.prenom), body: '<label class="lab" for="bvmot2">Votre mot</label><textarea id="bvmot2" class="txt" rows="2" maxlength="140" placeholder="Ex. : Super séance de gainage !"></textarea>',
      actions: [{ label: 'Envoyer', cls: 'btn', onClick: function (host, close) { close({ mot: host.querySelector('#bvmot2').value }); } }, { label: 'Annuler', value: false, cls: 'btn2 grey' }]
    }).then(function (v) {
      var mot = v && String(v.mot || '').replace(/\s+/g, ' ').trim();
      if (!mot) return;
      var l2 = document.querySelector('.bvk[data-j="' + jid + '"]');
      if (l2) l2.classList.add('wait');   // (relecture v71) la ligne attend aussi pendant l'envoi du mot écrit
      return envoyer([{ seanceId: sid, mot: mot }]).then(function () { ui.toast('👏 Bravo envoyé à ' + p.joueur.prenom); app.rerender(); }, function (e) { if (l2) l2.classList.remove('wait'); ui.toast(e.message, true); });
    });
  };
  MC.act.bvTous = function (b) {
    var g = G();
    if (!g) return;
    var l = aFeliciter(g).filter(function (x) { return !BV.faits[x.p.joueur.id] && BV.mots[x.p.joueur.id]; });
    if (!l.length) return;
    ui.modal({ title: '👏 Bravo à tous ?', body: '<p class="lead">' + l.length + ' enfants reçoivent un bravo' + (l.length <= MOTS.length ? ', chacun avec un mot différent' : '') + '.</p>',
      actions: [{ label: 'Envoyer les ' + l.length + ' bravos', value: true, cls: 'btn gold' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }]
    }).then(function (ok) {
      if (!ok) return;
      b.disabled = true;
      return envoyer(l.map(function (x) { return { seanceId: x.s.id, mot: BV.mots[x.p.joueur.id][0] }; })).then(function (r) {
        ui.toast('👏 ' + (r.bravos || []).length + ' bravos envoyés'); app.rerender();
      }, function (e) { b.disabled = false; ui.toast(e.message, true); });
    });
  };

  // en quittant l'écran : la visite est finie (les lignes « envoyé » partent, de nouveaux mots la prochaine fois)
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('#/educ/bravos') !== 0) BV = { cle: '', mots: {}, faits: {}, ordre: [] }; });

  MC.bravo = { btn: btn, opts: opts, quoi: quoi, PHRASES: PHRASES, MOTS: MOTS, motsPour: motsPour, repartir: repartir, aFeliciter: aFeliciter, nb: nb };
})();
