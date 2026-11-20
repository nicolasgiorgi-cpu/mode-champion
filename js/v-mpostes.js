/* =========================================================
   Mode champion · M12 — ÉDUCS : Missions de poste, épisode 1 (essai, v92, demande de Nicolas du 20/11/2026)
   Les éducs voient l'épisode depuis Progrès › Missions et donnent leur avis ; les enfants ne le voient pas encore.
   - Progrès › Missions : la section « Missions de poste » en haut (MC.mpSection) : l'entrée qui ouvre l'épisode, puis
     « Retours des éducs » (replié), rangés par poste puis par situation ; « Voir » rouvre l'épisode à cet endroit.
     Les avis ne retardent jamais l'écran : la copie gardée tout de suite, les avis frais redessinent l'écran en arrivant.
   - #/educ/missions/postes : l'épisode (missions-postes/index.html, même site) dans une iframe, en plein écran, sans les
     onglets du bas. L'enveloppe est posée dans <body> (comme les fenêtres) et non dans la page de l'écran (#app est sur sa
     propre couche : un élément fixe s'y placerait par rapport à elle) ; un redessin de l'appli ne la recharge pas ; elle part
     quand on quitte l'écran. Si la page ne répond pas (pas de réseau), un message et « Retour » par-dessus.
     La page parle à l'appli par postMessage : « pret » (l'appli répond « init » : pas de prénom pour un éduc, donc
     « Champion » ; et mes avis déjà donnés), « avis » (l'appli ouvre « Mon avis » et l'envoie avec la session de l'éduc :
     action retourMission ; puis « avisOk » à la page), « fermer » (Retour sur le choix du poste, « Missions »).
   Logique sans écran : js/mpostes.js.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var app = MC.app, ui = MC.ui, MP = MC.mpostes, esc = ui.esc, icon = ui.icon;
  var KEY = 'mc-retoursmp', lu = 0, enCours = null, OUV = false, ATTENTE = 6000;

  // ---------- les avis des éducs (action retoursMissions) ----------
  function tokIci() { var A = app.S.adult; return A && A.role === 'e' ? A.token : null; }
  function cache() { return app.S.cache.retoursMP || null; }
  function lsCopie() { var c = app.lsGet(KEY), t = tokIci(); return c && t && c.tok === t && c.data ? c.data : null; }
  function setCache(r, tok) { if (!tok || tokIci() !== tok) return false; app.S.cache.retoursMP = r; lu = Date.now(); app.lsSet(KEY, { tok: tok, data: r }); return true; }
  function surMissions() { return /^#\/educ\/missions(\?|$)/.test(location.hash); }
  function surPostes() { return /^#\/educ\/missions\/postes(\?|$)/.test(location.hash); }
  function redessiner() { if (surMissions() && !document.querySelector('.modal')) app.rerender(); }
  // redemandés au serveur (au plus une fois par minute, sauf « force ») ; la réponse ne vaut que pour le même éduc
  function charger(force) {
    var tok = tokIci();
    if (!tok) return Promise.resolve(null);
    if (!force && cache() && Date.now() - lu < 60000) return Promise.resolve(cache());
    if (enCours && enCours.tok === tok) return enCours.p;
    var avant = cache();
    lu = Date.now();
    var p = MC.api.call('retoursMissions', { token: tok }, { silent: true }).then(function (r) {
      enCours = null;
      var chg = !avant || JSON.stringify(r.retours) !== JSON.stringify(avant.retours);
      if (setCache(r, tok) && chg) { redessiner(); initPage(); }
      return cache();
    }, function (e) { enCours = null; throw e; });
    enCours = { tok: tok, p: p };
    return p;
  }
  // pour Progrès › Missions : ce qu'on a tout de suite (ou null), et les avis frais en fond
  MC.mpRetours = function () {
    var c = cache() || lsCopie();
    if (c && !cache()) app.S.cache.retoursMP = c;
    charger(false).catch(function () { });
    return c;
  };
  app.onRefresh(function (o) {
    if (!tokIci() || o.adult !== 'e' || !surMissions()) return null;
    return charger(true).catch(function () { });
  });

  // ---------- Progrès › Missions : la section ----------
  function jourTxt(iso) { return iso ? ui.fmtDate(String(iso).slice(0, 10)) : ''; }
  function avisTxt(a) { return a === 'revoir' ? 'À revoir' : 'C\'est juste'; }
  function ligne(x) {
    return '<li class="mpr ' + (x.avis === 'revoir' ? 'revoir' : 'juste') + '"><span class="mpra">' + (x.avis === 'revoir' ? '' : icon('check', 14) + ' ') + avisTxt(x.avis) + '</span>' +
      (x.texte ? '<span class="mprt">' + esc(x.texte) + '</span>' : '') +
      '<span class="mprq">' + esc(x.moi ? 'Moi' : x.parNom || 'Un éduc') + ' · ' + esc(jourTxt(x.date || x.maj)) + '</span></li>';
  }
  function liste(l) {
    return MP.grouper(l).map(function (g) {
      var P = g.poste;
      return '<div class="mpg" style="--pc:' + P.col + '"><div class="mpgh"><span class="mppa">' + esc(P.court) + '</span><b>' + esc(P.nom) + '</b>' +
        '<span class="mpgc">' + (g.juste ? '<span class="j">' + icon('check', 13) + ' ' + g.juste + '</span>' : '') + (g.revoir ? '<span class="r">' + g.revoir + ' à revoir</span>' : '') + '</span></div>' +
        g.sits.map(function (s) {
          var href = '#/educ/missions/postes?p=' + P.id + '&s=' + s.situation + (s.variante ? '&alt=1' : ''), nom = MP.sitNom(s.situation, s.variante);
          return '<div class="mps"><div class="mpsh"><span>' + esc(nom) + '</span><a class="mpvoir" href="' + esc(href) + '" aria-label="Voir : ' + esc(P.nom + ', ' + nom.toLowerCase()) + '">Voir ' + icon('right', 14) + '</a></div>' +
            '<ul class="mpl">' + s.retours.map(ligne).join('') + '</ul></div>';
        }).join('') + '</div>';
    }).join('');
  }
  MC.mpSection = function (rd) {
    var l = (rd && rd.retours) || [], c = MP.compte(l);
    var t2 = 'Éducs seulement' + (rd ? ' · ' + (c.n ? c.n + ' retour' + (c.n > 1 ? 's' : '') + (c.revoir ? ' · ' + c.revoir + ' à revoir' : '') : 'pas encore de retour') : '');
    return '<section class="sec" data-cible="mpostes"><h2 class="h2">Missions de poste</h2><ul class="list"><li><a class="li mrow" href="#/educ/missions/postes">' +
      '<span class="mtag mpt">Essai</span><span class="grow"><span class="t1">Missions de poste · épisode 1 (essai)</span><span class="t2">' + t2 + '</span></span>' + icon('right', 16) + '</a></li></ul>' +
      (l.length ? '<details class="mpret"' + (OUV ? ' open' : '') + '><summary>Retours des éducs</summary><div class="mpgs">' + liste(l) + '</div></details>' : '') +
      '</section>';
  };
  // le volet reste ouvert d'un affichage à l'autre (données fraîches, avis envoyé)
  document.addEventListener('toggle', function (e) { if (e.target && e.target.classList && e.target.classList.contains('mpret')) OUV = e.target.open; }, true);

  // ---------- l'épisode en plein écran ----------
  function versionIci() { var s = document.querySelector('script[src*="js/mpostes.js"]'), m = s && /[?&]v=(\d+)/.exec(s.getAttribute('src') || ''); return m ? m[1] : ''; }
  function enveloppe() { return document.getElementById('mpwrap'); }
  function cadre() { return document.getElementById('mpframe'); }
  var tmKo = 0;
  function retirer() { clearTimeout(tmKo); var w = enveloppe(); if (w) w.remove(); }
  function montrerKo(on) { var k = document.getElementById('mpko'); if (k) k.hidden = !on; }
  // la page ne répond pas (« pret » n'arrive pas) : un message et « Retour », par-dessus
  function surveiller() {
    clearTimeout(tmKo); montrerKo(false);
    tmKo = setTimeout(function () { if (cadre()) montrerKo(true); }, ATTENTE);
  }
  function ouvrir(src) {
    var w = enveloppe();
    if (!w) {
      w = document.createElement('div');
      w.id = 'mpwrap'; w.className = 'mpwrap';
      // l'adresse dès la création (sinon une page vide se charge d'abord et passerait pour un échec)
      w.innerHTML = '<iframe id="mpframe" class="mpframe" data-src="' + esc(src) + '" src="' + esc(src) + '" title="Missions de poste · épisode 1 (essai)"></iframe>' +
        '<div class="mpko" id="mpko" role="alert" hidden><b>L\'épisode ne s\'ouvre pas</b><p>Vérifiez le réseau, puis réessayez.</p>' +
        '<div class="grid2"><button type="button" class="btn2" data-mp="ressayer">Réessayer</button><button type="button" class="btn" data-mp="retour">Retour</button></div></div>';
      document.body.appendChild(w);
      // hors de la page de l'écran : ses boutons ont leur propre écoute (la délégation de l'appli ne couvre que l'écran et les fenêtres)
      w.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mp]');
        if (!b) return;
        if (b.getAttribute('data-mp') === 'retour') app.back('#/educ/missions');
        else { var fr = cadre(), s = fr && fr.getAttribute('data-src'); if (fr) { fr.setAttribute('data-src', ''); ouvrir(s); } }
      });
      var f = w.querySelector('iframe');
      // la page chargée sans son jeu (erreur du réseau, page introuvable) : le message tout de suite
      f.addEventListener('load', function () { var ok = false; try { ok = !!(f.contentWindow && f.contentWindow.MQ); } catch (e) { ok = false; } if (!ok) montrerKo(true); });
      surveiller();
      return;
    }
    var fr = cadre();
    if (fr.getAttribute('data-src') !== src) { fr.setAttribute('data-src', src); fr.setAttribute('src', src); surveiller(); }
  }
  app.route('/educ/missions/postes', function (p, q, cur) {
    ouvrir(MP.adresse(versionIci(), q || {}));
    // en quittant l'écran, l'épisode part (pas pour un simple redessin du même écran)
    if (cur) cur.cleanup = function () { setTimeout(function () { if (!surPostes()) retirer(); }, 0); };
    charger(false).then(initPage, function () { });
    return '<main class="mpfull"><h1 class="sr-only">Missions de poste · épisode 1 (essai)</h1></main>';
  }, { adult: 'e' });

  function versPage(m) { var f = cadre(); if (f && f.contentWindow) { try { f.contentWindow.postMessage(m, location.origin); } catch (e) { } } }
  function initPage() { if (cadre()) { var c = cache(); versPage({ mp: 'init', prenom: '', mes: MP.mesAvis(c && c.retours) }); } }
  window.addEventListener('message', function (ev) {
    var f = cadre();
    if (!f || ev.source !== f.contentWindow || ev.origin !== location.origin) return;
    var m = MP.lireMessage(ev.data);
    if (!m) return;
    if (m.mp === 'pret') { clearTimeout(tmKo); montrerKo(false); initPage(); }
    else if (m.mp === 'fermer') app.back('#/educ/missions');
    else if (m.mp === 'avis' && !document.querySelector('.modal')) monAvis(m);
  });

  // « Mon avis » : C'est juste / À revoir, et un mot (obligatoire pour « À revoir »)
  function monAvis(m) {
    var c = cache(), ex = MP.monAvis(c && c.retours, m), choix = ex ? ex.avis : null;
    function ph(a) { return a === 'revoir' ? 'Ce qui est à revoir (obligatoire)' : 'Un mot si vous voulez'; }
    function bouton(a, lab) { return '<button type="button" class="btn2 mpch ' + a + (choix === a ? ' on' : '') + '" data-av="' + a + '" aria-pressed="' + (choix === a) + '">' + lab + '</button>'; }
    ui.modal({
      title: 'Mon avis',
      body: '<p class="mpctx"><b>' + esc(m.titre) + '</b>' + (m.sous ? '<span>' + esc(m.sous) + '</span>' : '') + '</p>' +
        '<div class="grid2 mpav" role="group" aria-label="Mon avis">' + bouton('juste', icon('check', 16) + ' C\'est juste') + bouton('revoir', 'À revoir') + '</div>' +
        '<label class="sr-only" for="mptexte">Mon mot</label><textarea id="mptexte" class="txt" rows="4" maxlength="600" placeholder="' + esc(ph(choix)) + '">' + esc(ex ? ex.texte : '') + '</textarea>' +
        (ex ? '<p class="small" style="margin:0">Déjà donné le ' + esc(jourTxt(ex.date || ex.maj)) + ' : le nouveau le remplace.</p>' : ''),
      actions: [{ label: 'Envoyer', cls: 'btn', onClick: function (host, close) {
        var t = host.querySelector('#mptexte'), tx = t ? t.value.replace(/\s+/g, ' ').trim() : '', b = host.querySelector('.mbtns button[data-i="0"]'), tok = tokIci();
        if (!choix) { ui.toast('Choisissez « C\'est juste » ou « À revoir ».', true); return; }
        if (choix === 'revoir' && tx.length < 3) { ui.toast('Dites en quelques mots ce qui est à revoir.', true); if (t) t.focus(); return; }
        if (b) b.disabled = true;
        app.adultCall('retourMission', { episode: 'ep1', poste: m.poste, situation: m.situation, variante: m.variante, avis: choix, texte: tx }).then(function (r) {
          var d = cache() || { retours: [] }, l = (d.retours || []).filter(function (x) { return x.id !== r.retour.id; });
          l.unshift(r.retour); setCache({ retours: l }, tok);
          versPage({ mp: 'avisOk', retour: { poste: r.retour.poste, situation: r.retour.situation, variante: r.retour.variante, avis: r.retour.avis } });
          close(true);
          ui.toast(r.nouveau ? 'Merci, avis envoyé' : 'Avis mis à jour');
        }).catch(function (e) {
          if (e.code === 'session') { close(null); return; }   // l'appli ramène à la connexion (et dit « Reconnectez-vous »)
          if (b) b.disabled = false; ui.toast(e.message, true);
        });
      } }, { label: 'Annuler', value: null, cls: 'btn2 grey' }],
      onOpen: function (host) {
        host.addEventListener('click', function (ev) {
          var o = ev.target.closest('[data-av]');
          if (!o) return;
          choix = o.getAttribute('data-av');
          Array.prototype.forEach.call(host.querySelectorAll('[data-av]'), function (x) { var on = x === o; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
          var t = host.querySelector('#mptexte'); if (t) t.setAttribute('placeholder', ph(choix));
          if (choix === 'revoir' && t && !t.value.trim()) setTimeout(function () { t.focus(); }, 30);
        });
      }
    });
  }
})();
