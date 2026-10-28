/* =========================================================
   Mode champion · M12 — MISSIONS et SKILLS côté enfant et côté parent
   Missions : ce que demandent les éducs (visuels v2, 25/10 : la mission principale en haut, dans son cadre
   arc-en-ciel, avec ses encouragements ; puis les missions ponctuelles : poste, vidéo, QCM ; et tous les mots des éducs).
   Skills : le carnet de compétences (8 cartes, Skills v2 du 25/10 ; étoiles validées par les éducs, qui brillent après un plateau ;
   l'enfant peut demander une étoile, une demande à la fois).
   Les parents voient la même chose, en lecture seule : ils ne donnent jamais de +1.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var app = MC.app, ui = MC.ui, L = MC.logic, C = MC.CONTENT, M = MC.missions, SK = MC.SK;
  var esc = ui.esc, icon = ui.icon;

  // R : qui regarde. Enfant : { k: true, d: me, base: '#/missions', sk: '#/skills' } ; parent : { k: false, d: dossier de l'enfant, fam }
  function bar(R, title) { return R.k ? MC.kidBar(R.d, app.S.stats) : MC.parentBar(R.fam, R.d, title); }
  function sub(R, back, backLabel, title) { return ui.topbar({ back: back, backLabel: backLabel, title: title, help: ui.helpLink(R.k ? 'joueur' : 'parent') }); }
  function T(R, k, p) { return R.k ? k : p; }        // texte enfant ou parent
  function prenom(R) { return R.d.joueur.prenom; }
  function jour(iso) { return iso ? ui.fmtDate(String(iso).slice(0, 10)) : ''; }
  function navKey(R, k) { return (R.k ? '' : 'p:') + k; }

  // l'ancienne jauge de 5 +1 (gardée pour les écrans qui l'appellent encore)
  function jauge(n, big) {
    var o = '<span class="g5' + (big ? ' big' : '') + '" role="img" aria-label="' + n + ' +1 sur ' + SK.MAX_PLUS1 + '">';
    for (var i = 1; i <= SK.MAX_PLUS1; i++) o += '<i class="' + (i <= n ? 'on' : '') + (i === SK.PROPOSE_AU ? ' seuil' : '') + '"></i>';
    return o + '</span>';
  }
  MC.jauge5 = jauge;
  // (visuels v2) les encouragements : des points violets, sans total (un +1 ne « remplit » rien : c'est un éduc qui valide l'étoile)
  function encDots(n) {
    var o = '<span class="encd" aria-hidden="true">';
    for (var i = 0; i < Math.min(n, 10); i++) o += '<i></i>';
    return o + '</span>';
  }
  function encTxt(n) { return n + ' encouragement' + (n > 1 ? 's' : ''); }
  MC.encDots = encDots; MC.encTxt = encTxt;
  // la mission principale en cours, si sa date n'est pas passée
  function missionActive(d) { var m = SK.missionPerso(d); return m && !SK.etatMission(d, m, L.today()).expiree ? m : null; }
  MC.missionActive = missionActive;
  // « jusqu'aux vacances de Noël (sam. 19 déc.) » ou « jusqu'au sam. 19 déc. »
  function finTxt(m) {
    if (!m.fin) return '';
    var v = SK.VACANCES.filter(function (x) { return x[0] === m.fin; })[0];
    return v ? 'Jusqu\'aux vacances ' + (v[1] === 'été' ? 'd\'été' : v[1] === 'hiver' ? 'd\'hiver' : v[1] === 'printemps' ? 'de printemps' : 'de ' + v[1]) + ' (' + jour(m.fin) + ')' : 'Jusqu\'au ' + jour(m.fin);
  }
  MC.finMission = finTxt;
  // le bloc « Ma mission principale » (Missions, et rappel dans Skills) : cadre blanc, étiquette soulignée arc-en-ciel
  function blocMission(R, mp, court) {
    var d = R.d;
    if (!mp) return '<p class="small" style="margin:0">' + T(R, 'Pas de mission principale pour l\'instant. Tes éducs t\'en donneront une : 1 à 3 étoiles Skills à décrocher.', 'Pas de mission principale pour l\'instant : les éducs en donnent une (1 à 3 étoiles Skills à décrocher).') + '</p>';
    var et = SK.etatMission(d, mp, L.today()), Dm = SK.dom(mp.domaine), p1 = SK.plus1(d, mp.id), n = p1.length, last = p1[0];
    var stars = court ? '' : '<span class="mp-stars">' + et.etoiles.map(function (x) {
      return '<span class="mp-st' + (x.row ? ' on' : '') + '">' + MC.etoileSvg(x.row ? (x.brille ? 'brille' : 'gagnee') : 'mission', 18, 'mb' + mp.id + x.id) + '<span>' + esc(x.def.nom) + '</span></span>';
    }).join('') + '</span>';
    var tag = et.expiree ? 'Mission terminée' : T(R, 'Ma mission principale', 'Sa mission principale');
    var etat = et.expiree ? 'Terminée le ' + jour(mp.fin) + ' · ' + et.n + ' / ' + et.max + ' étoile' + (et.max > 1 ? 's' : '') + '. ' + T(R, 'Tes éducs vont t\'en donner une nouvelle.', 'Les éducs vont en donner une nouvelle.')
      : [finTxt(mp), mp.parNom ? 'donnée par ' + esc(mp.parNom) : ''].filter(Boolean).join(' · ');
    return '<a class="mp-bloc' + (et.expiree ? ' fin' : '') + '" href="' + R.base + '/perso">' +
      '<span class="mp-tag"><b>' + icon('star', 10) + ' ' + tag + '</b></span><span class="mp-c"><span class="grow">' +
      '<b class="mp-t">' + esc(Dm ? Dm.nom : '') + ' · ' + esc(SK.titreMission(mp)) + '</b>' + stars +
      '<span class="mp-enc">' + encDots(n) + '<span>' + encTxt(n).toUpperCase() + ' · ' + et.n + ' / ' + et.max + ' ÉTOILE' + (et.max > 1 ? 'S' : '') + '</span></span>' +
      '<span class="mp-q">' + etat + '</span>' +
      (!court && mp.texte ? '<span class="mp-mot">« ' + esc(mp.texte) + ' »</span>' : '') +
      (!court && last ? '<span class="mp-q">Dernier encouragement : ' + esc(last.parNom) + ', ' + jour(last.date) + (last.mot ? ' · « ' + esc(last.mot) + ' »' : '') + '</span>' : '') +
      '</span>' + icon('right', 18) + '</span></a>';
  }
  MC.blocMission = blocMission;
  function p1Tag() { return '<b class="p1tag">+1</b>'; }
  function motDe(x) { return x.mot ? '« ' + esc(x.mot) + ' »' : (x.missionId ? 'Sur la bonne voie' : ''); }
  function quiQuand(x) { return esc(x.parNom) + ' · ' + esc(x.occasion ? x.occasion.charAt(0).toLowerCase() + x.occasion.slice(1) : jour(x.date)); }

  // ======================================================================
  // MISSIONS : en cours · faites
  // ======================================================================
  function missionsHome(R, vue) {
    // V1 (28/10) : sans les Skills (mission principale), ni les missions et les mots des éducs, ni les copains (MC.CONFIG.ENFANTS)
    var skOn = MC.ouvert('skills'), meOn = MC.ouvert('missionsEducs');
    var d = R.d, mp = skOn ? SK.missionPerso(d) : null, mpa = skOn ? missionActive(d) : null, groupe = meOn ? M.groupe(d) : [], nv = M.nouveaux(R.k ? 'k' : 'f', d), luIds = {};
    nv.enc.forEach(function (x) { luIds[x.id] = true; }); nv.missions.forEach(function (m) { luIds[m.id] = true; });
    var spec = M.pending(d), faitesG = groupe.filter(function (x) { return x.faite; }), aFaireG = groupe.filter(function (x) { return !x.faite && !x.finie; });
    var persoFaites = skOn ? SK.missionPerso(d, true).filter(function (m) { return m.statut === 'faite'; }) : [];
    // les missions spéciales (le poste, les copains) : chacune sa ligne, faite ou à faire
    var specFaites = M.visibles().filter(function (Dx) { return M.etat(d, Dx.id).faite; });
    var nEnCours = spec.length + aFaireG.length + (mpa ? 1 : 0), nFaites = faitesG.length + persoFaites.length + specFaites.length;
    function specHref(Dx) { return R.k ? Dx.lien : R.base + '/jeu10'; }
    var tabs = ui.subtabs(navKey(R, 'missions'), [['encours', R.base, 'En cours · ' + nEnCours], ['faites', R.base + '?vue=faites', 'Faites · ' + nFaites]], vue, '#FF4FA3', 'Missions');
    var body = '';
    if (vue === 'faites') {
      var items = [];
      persoFaites.forEach(function (m) { var D = SK.dom(m.domaine), nb = SK.etoilesMission(m).length; items.push({ at: m.faiteLe, html: '<a class="li mrow" href="' + R.sk + '/' + esc(m.domaine) + '"><span class="mic gold">' + icon('star', 18) + '</span><span class="grow"><span class="t1">' + esc(SK.titreMission(m)) + '</span><span class="t2">' + T(R, 'Ta mission principale', 'Sa mission principale') + ' · ' + esc(D ? D.nom : '') + ' · ' + (nb > 1 ? nb + ' étoiles gagnées' : 'étoile gagnée') + ' le ' + jour(m.faiteLe) + '</span></span>' + icon('right', 16) + '</a>' }); });
      faitesG.forEach(function (x) { items.push({ at: x.date, html: '<a class="li mrow" href="' + R.base + '/m/' + esc(x.def.id) + '"><span class="mic">' + icon(x.def.sorte === 'video' ? 'play' : 'list', 18) + '</span><span class="grow"><span class="t1">' + esc(x.def.titre) + '</span><span class="t2">' + (x.total ? x.score + ' / ' + x.total + ' bonnes réponses · ' : '') + 'faite le ' + jour(x.date) + (x.xp ? ' · +' + x.xp + ' XP' : '') + '</span></span>' + icon('right', 16) + '</a>' }); });
      specFaites.forEach(function (Dx) {
        var ex = M.etat(d, Dx.id);
        var t2 = Dx.id === 'poste' ? T(R, 'Tes postes', 'Ses postes') + ' : ' + ex.postes.map(function (id) { return esc(M.poste(id).nom); }).join(' · ') : T(R, ex.copains.length + ' copain' + (ex.copains.length > 1 ? 's' : '') + ', en secret', 'Ses copains restent secrets');
        items.push({ at: ex.date, html: '<a class="li mrow" href="' + specHref(Dx) + '"><span class="mic">' + icon(Dx.icon, 18) + '</span><span class="grow"><span class="t1">' + esc(Dx.titre) + '</span><span class="t2">' + t2 + ' · +' + C.XP.mission + ' XP</span></span>' + icon('right', 16) + '</a>' });
      });
      items.sort(function (a, b) { return (a.at || '') < (b.at || '') ? 1 : -1; });
      body = items.length ? '<ul class="list">' + items.map(function (x) { return '<li>' + x.html + '</li>'; }).join('') + '</ul>' : '<div class="empty">' + T(R, 'Pas encore de mission faite. Elles arrivent ici, avec tes résultats.', 'Pas encore de mission faite.') + '</div>';
    } else {
      // un nouveau mot d'un éduc (sur autre chose que la mission : les encouragements de la mission sont dans son bloc)
      var encs = meOn ? (d.encouragements || []).slice().sort(function (a, b) { return a.cree < b.cree ? 1 : -1; }) : [];
      var lastMot = encs.filter(function (x) { return !x.missionId; })[0];
      if (lastMot && luIds[lastMot.id]) {
        body += '<a class="lastp1" href="' + R.base + '/mots"><span class="row" style="gap:8px">' + icon('heart', 16, 'style="color:var(--green)"') + '<span class="hud" style="color:var(--green)">Nouveau · ' + esc(lastMot.parNom) + ' · ' + jour(lastMot.date) + '</span></span>' +
          '<b class="lp-t">' + T(R, 'Un mot de ton éduc', 'Un mot de son éduc') + '</b>' + (lastMot.mot ? '<span class="lp-m">« ' + esc(lastMot.mot) + ' »</span>' : '') + '</a>';
      }
      // la mission principale
      if (skOn) body += '<section class="sec">' + blocMission(R, mp) + '</section>';
      // pour toute l'équipe
      var eq = '';
      spec.forEach(function (Dx) {
        var ex = M.etat(d, Dx.id);
        eq += '<li><a class="li mrow" href="' + specHref(Dx) + '"><span class="mic gold">' + icon(ex.bloquee ? 'lock' : Dx.icon, 18) + '</span><span class="grow"><span class="t1">' + esc(Dx.titre) + '</span><span class="t2">' + (ex.bloquee ? 'Se débloque après « ' + esc(M.def(Dx.apres).titre) + ' »' : Dx.id === 'poste' ? T(R, 'Choisis ton top : 1 à 3 postes', 'Choisir son top : 1 à 3 postes') : T(R, 'Autant de copains que tu veux, c\'est secret', 'Ses copains de jeu, en secret')) + (Dx.fin >= L.today() ? ' · jusqu\'au ' + jour(Dx.fin) : '') + ' · +' + C.XP.mission + ' XP</span></span>' + icon('right', 16) + '</a></li>';
      });
      aFaireG.forEach(function (x) {
        var m = x.def, nq = (m.questions || []).length;
        var t2 = m.sorte === 'video' ? (x.vu ? 'Vidéo vue · ' + (nq ? 'le quiz à faire' : 'à terminer') : 'Une vidéo' + (nq ? ' et ' + nq + ' question' + (nq > 1 ? 's' : '') : '')) : 'QCM · ' + nq + ' question' + (nq > 1 ? 's' : '');
        eq += '<li><a class="li mrow" href="' + R.base + '/m/' + esc(m.id) + '"><span class="mic">' + icon(m.sorte === 'video' ? 'play' : 'list', 18) + '</span><span class="grow"><span class="t1">' + esc(m.titre) + (luIds[m.id] ? ' <span class="pill" style="--pc:var(--pink)">Nouveau</span>' : '') + '</span><span class="t2">' + t2 + (m.fin ? ' · jusqu\'au ' + jour(m.fin) : '') + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</span></span>' + icon('right', 16) + '</a></li>';
      });
      body += '<section class="sec"><h2 class="h2">' + (skOn ? 'Missions ponctuelles' : 'Pour toute l\'équipe') + '</h2>' + (eq ? '<ul class="list">' + eq + '</ul>' : '<p class="small" style="margin:0">Rien à faire pour l\'instant.</p>') + '</section>';
      if (meOn) body += '<a class="li" href="' + R.base + '/mots">' + icon('heart', 20, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">' + T(R, 'Tous les mots de mes éducs', 'Tous les mots de ses éducs') + '</span><span class="t2">' + encs.length + ' en tout, du plus récent au plus ancien</span></span>' + icon('right', 16) + '</a>';
      if (!R.k) body += '<p class="small" style="margin:0">' + (meOn ? 'Les missions, les encouragements et les mots viennent des éducs. Les parents suivent, sans en donner.' : 'Les missions viennent des éducs : ' + esc(prenom(R)) + ' les fait dans son onglet Missions, vous suivez ici.') + '</p>';
    }
    return '<main class="screen">' + bar(R, 'Missions') + tabs + body + '</main>';
  }

  // ======================================================================
  // Une mission du groupe : vidéo puis questions, ou QCM
  // ======================================================================
  var QZ = null;   // le quiz en cours : { mid, joueur, i, ans: [], voir: bool (la réponse de la question i est montrée) }
  function quizState(R, m) {
    if (!QZ || QZ.mid !== m.id || QZ.joueur !== R.d.joueur.id) {
      var saved = app.lsGet('mc-qz:' + R.d.joueur.id + ':' + m.id);
      QZ = saved && Array.isArray(saved.ans) ? saved : { mid: m.id, joueur: R.d.joueur.id, i: 0, ans: [], voir: false };
    }
    return QZ;
  }
  function saveQuiz() { if (QZ) app.lsSet('mc-qz:' + QZ.joueur + ':' + QZ.mid, QZ); }
  function missionGroupe(R, id) {
    var x = M.groupe(R.d).filter(function (y) { return y.def.id === id; })[0];
    if (!x) return '<main class="screen">' + sub(R, R.base, 'Missions', 'Mission') + '<div class="empty">Cette mission n\'existe plus.</div></main>';
    var m = x.def, qs = m.questions || [], vid = m.sorte === 'video';
    var head = '<div class="head"><span class="kicker" style="color:var(--pink)">Pour toute l\'équipe' + (m.fin ? ' · jusqu\'au ' + jour(m.fin) : '') + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</span><h1 class="big sm">' + esc(m.titre) + '</h1>' + (m.texte ? '<p class="lead">' + esc(m.texte) + '</p>' : '') + '</div>';
    var steps = vid && qs.length ? '<div class="qsteps"><span class="' + (x.vu ? 'done' : 'on') + '">' + (x.vu ? icon('check', 14) : '1') + ' · Vidéo' + (x.vu ? ' vue' : '') + '</span><span class="' + (x.faite ? 'done' : x.vu ? 'on' : '') + '">' + (x.faite ? icon('check', 14) : '2') + ' · Le quiz</span></div>' : '';
    var video = vid ? '<div class="cp-vid" style="--c:var(--pink)"><div class="cp-vframe"><button type="button" class="cp-vplay" data-act="mVid" data-vid="' + esc(m.video) + '" data-mid="' + esc(m.id) + '"' + (R.k ? ' data-k="1"' : '') + ' aria-label="Lire la vidéo : ' + esc(m.titre) + '"><img src="https://i.ytimg.com/vi/' + esc(m.video) + '/hqdefault.jpg" alt="" loading="lazy"><span class="pb">' + icon('play', 26, 'style="color:#0A0F1F"') + '</span></button></div></div>' : '';
    var quiz = '';
    if (x.faite || x.ans) {
      quiz = '<section class="sec"><div class="note green">' + icon('check', 22) + '<span><b>' + T(R, 'Mission faite', 'Mission faite') + ' le ' + jour(x.date) + (qs.length ? ' : ' + x.score + ' / ' + x.total + ' bonne' + (x.score > 1 ? 's' : '') + ' réponse' + (x.score > 1 ? 's' : '') : '') + '.</b>' + (x.xp ? ' +' + x.xp + ' XP' : '') + '</span></div>' +
        (qs.length ? '<details' + (R.k ? ' open' : '') + '><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:32px">Les questions et les bonnes réponses</summary><ol class="qcorr">' + qs.map(function (q, i) {
          var a = x.ans ? x.ans[i] : -1;
          return '<li><b>' + esc(q.q) + '</b><span class="' + (a === q.ok ? 'ok' : 'ko') + '">' + (a === q.ok ? icon('check', 14) + ' ' : a >= 0 ? icon('x', 14) + ' ' + esc(q.opts[a]) + ' · ' : '') + 'Bonne réponse : ' + esc(q.opts[q.ok]) + '</span></li>';
        }).join('') + '</ol></details>' : '') + '</section>';
    } else if (!R.k) {
      quiz = '<div class="note">' + icon('info', 20) + '<span>' + esc(prenom(R)) + ' ne l\'a pas encore faite' + (vid ? (x.vu ? ' (vidéo vue, quiz à faire)' : '') : '') + '. Elle est dans son onglet Missions.</span></div>';
    } else if (qs.length && (!vid || x.vu)) {
      var Q = quizState(R, m), i = Math.min(Q.i, qs.length - 1), q = qs[i], sel = Q.ans[i], voir = Q.voir && sel !== undefined;
      var fin = Q.ans.length === qs.length && Q.ans.every(function (a) { return a !== undefined && a !== null; }) && Q.i >= qs.length - 1 && voir;
      quiz = '<section class="qz"><div class="between"><span class="kicker">Question ' + (i + 1) + ' sur ' + qs.length + '</span><span class="cp-qbars" aria-hidden="true">' + qs.map(function (z, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
        '<h2 class="qz-q" id="qzq">' + esc(q.q) + '</h2><div class="qz-opts" role="group" aria-labelledby="qzq">' + q.opts.map(function (o, j) {
          var cls = 'qz-opt' + (sel === j ? ' on' : '') + (voir && j === q.ok ? ' ok' : '') + (voir && sel === j && j !== q.ok ? ' ko' : '');
          return '<button type="button" class="' + cls + '" aria-pressed="' + (sel === j) + '"' + (voir ? ' disabled' : ' data-act="qzPick" data-j="' + j + '"') + '><span>' + esc(o) + '</span>' + (voir && j === q.ok ? icon('check', 18) : voir && sel === j ? icon('x', 18) : '') + '</button>';
        }).join('') + '</div>' +
        (voir ? '<p class="qz-fb ' + (sel === q.ok ? 'ok' : 'ko') + '">' + (sel === q.ok ? 'Bravo, c\'est ça !' : 'Pas tout à fait : la bonne réponse est en vert.') + '</p>' : '') +
        (!voir ? '<button type="button" class="btn" data-act="qzCheck"' + (sel === undefined ? ' disabled' : '') + '>Valider ma réponse</button>' :
          fin ? '<button type="button" class="btn gold glow" data-act="qzSend" data-mid="' + esc(m.id) + '">' + icon('send', 18) + ' Envoyer mes réponses' + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</button>' :
            '<button type="button" class="btn" data-act="qzNext">Question suivante</button>') + '</section>';
    } else if (vid && !x.vu) {
      quiz = '<p class="small" style="margin:0">Touche la vidéo pour la regarder' + (qs.length ? ' : ensuite, ' + qs.length + ' petite' + (qs.length > 1 ? 's' : '') + ' question' + (qs.length > 1 ? 's' : '') + '.' : '. C\'est tout !') + '</p>';
    } else if (vid && !qs.length && x.vu && !x.faite) {
      quiz = '<button type="button" class="btn gold" data-act="mVu" data-mid="' + esc(m.id) + '">J\'ai regardé la vidéo</button>';
    }
    return '<main class="screen">' + sub(R, R.base, 'Missions', vid ? 'Mission vidéo' : 'Mission QCM') + head + '<div id="msteps">' + steps + '</div>' + video + '<div id="mqz" class="sec">' + quiz + '</div></main>';
  }
  function kidRepondre(params) {
    return app.kidCall('repondreMission', params).then(function (res) { app.setMe(res); return res; });
  }
  MC.act.mVid = function (b) {
    var fr = b.parentNode, mid = b.getAttribute('data-mid');
    fr.innerHTML = ui.videoIframe(b.getAttribute('data-vid'));
    var me = app.S.me;
    if (!me || !app.S.kid || !b.hasAttribute('data-k')) return;   // un parent regarde (même sur l'appareil d'un enfant) : rien n'est noté
    var x = M.groupe(me).filter(function (y) { return y.def.id === mid; })[0];
    if (x && !x.vu) kidRepondre({ missionId: mid, vu: true }).then(function () {
      // la vidéo continue de jouer : seules les étapes et les questions sont redessinées, dessous
      var tmp = document.createElement('div');
      tmp.innerHTML = missionGroupe(kidR(app.S.me), mid);
      ['msteps', 'mqz'].forEach(function (id) { var a = document.getElementById(id), b2 = tmp.querySelector('#' + id); if (a && b2) a.innerHTML = b2.innerHTML; });
    }).catch(function (e) { ui.toast(e.message, true); });
  };
  MC.act.mVu = function (b) {
    b.disabled = true;
    kidRepondre({ missionId: b.getAttribute('data-mid'), vu: true }).then(function () { ui.toast('Mission faite !'); app.rerender(); }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };
  MC.act.qzPick = function (b) { if (!QZ) return; QZ.ans[QZ.i] = Number(b.getAttribute('data-j')); saveQuiz(); app.rerender(); };
  MC.act.qzCheck = function () { if (!QZ || QZ.ans[QZ.i] === undefined) return; QZ.voir = true; saveQuiz(); app.rerender(); };
  MC.act.qzNext = function () { if (!QZ) return; QZ.i++; QZ.voir = false; saveQuiz(); app.rerender(); window.scrollTo(0, 0); };
  MC.act.qzSend = function (b) {
    if (!QZ) return;
    var mid = b.getAttribute('data-mid'), ans = QZ.ans.slice();
    b.disabled = true;
    kidRepondre({ missionId: mid, reponses: ans }).then(function (res) {
      app.lsSet('mc-qz:' + QZ.joueur + ':' + QZ.mid, null); QZ = null;
      var x = M.groupe(res).filter(function (y) { return y.def.id === mid; })[0];
      ui.toast('Mission faite' + (x && x.total ? ' : ' + x.score + ' / ' + x.total : '') + (x && x.xp ? ' · +' + x.xp + ' XP' : '') + ' !');
      app.rerender(); window.scrollTo(0, 0);
    }).catch(function (e) { b.disabled = false; ui.toast(e.message, true); });
  };

  // ======================================================================
  // La mission principale : ses étoiles, ses encouragements
  // ======================================================================
  function missionPerso(R) {
    var d = R.d, mp = SK.missionPerso(d) || SK.missionPerso(d, true)[0], titre = T(R, 'Ma mission principale', 'Sa mission principale');
    if (!mp) return '<main class="screen">' + sub(R, R.base, 'Missions', titre) + '<div class="empty">' + T(R, 'Pas de mission principale pour l\'instant.', 'Pas de mission principale pour l\'instant.') + '</div></main>';
    var et = SK.etatMission(d, mp, L.today()), D = SK.dom(mp.domaine), p1 = SK.plus1(d, mp.id), n = p1.length, faite = mp.statut === 'faite';
    var lu = M.luAt(R.k ? 'k' : 'f', d.joueur.id);
    var liste = p1.map(function (x) {
      return '<li class="p1row' + ((x.cree || '') > lu ? ' new' : '') + '">' + p1Tag() + '<span class="grow"><span class="p1-k">' + quiQuand(x) + ((x.cree || '') > lu ? ' · nouveau' : '') + '</span><span class="p1-m">' + motDe(x) + '</span></span></li>';
    }).join('');
    var stars = et.etoiles.map(function (x) {
      return '<li><a class="li sk-row' + (x.row ? ' on' : ' mis') + '" href="' + R.sk + '/' + esc(mp.domaine) + '"><span class="sk-st">' + MC.etoileSvg(x.row ? (x.brille ? 'brille' : 'gagnee') : 'mission', 22, 'mp' + x.id) + '</span><span class="grow"><span class="t1">' + esc(x.def.nom) + '</span><span class="t2">« ' + esc(x.def.phrase) + ' »</span>' +
        '<span class="t2" style="color:' + (x.row ? 'var(--gold)' : 'var(--dim)') + '">' + (x.row ? 'Gagnée le ' + jour(x.row.date) + ' · ' + esc(x.row.parNom) : 'À gagner · grise tant qu\'un éduc ne l\'a pas validée') + '</span></span>' + icon('right', 16) + '</a></li>';
    }).join('');
    var conseils = et.restantes.map(function (x, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary><b>' + esc(x.def.nom) + '</b></summary><p class="small" style="margin:6px 0 0;color:var(--soft)">' + esc(x.def.conseil) + '</p></details>'; }).join('');
    return '<main class="screen">' + sub(R, R.base, 'Missions', titre) +
      '<div class="head"><span class="kicker" style="color:var(--pink)">' + T(R, 'Rien que pour toi, ', 'Mission pour ') + esc(prenom(R)) + (mp.parNom ? ' · par ' + esc(mp.parNom) : '') + ' · depuis le ' + jour(mp.debut || mp.cree) + '</span>' +
      '<h1 class="big sm">' + esc((D ? D.nom + ' · ' : '') + SK.titreMission(mp)) + '</h1>' + (mp.texte ? '<p class="lead">« ' + esc(mp.texte) + ' »</p>' : '') +
      '<p class="small" style="margin:0;color:var(--soft)">' + (et.expiree ? 'Terminée le ' + jour(mp.fin) + ' · ' : mp.fin ? finTxt(mp) + ' · ' : '') + et.n + ' / ' + et.max + ' étoile' + (et.max > 1 ? 's' : '') + ' gagnée' + (et.n > 1 ? 's' : '') + '</p></div>' +
      (faite ? '<div class="note gold">' + icon('star', 22) + '<span><b>Mission réussie !</b> ' + (et.max > 1 ? 'Les ' + et.max + ' étoiles sont validées.' : 'L\'étoile est validée.') + (R.k ? ' Bravo !' : '') + '</span></div>' : et.expiree ? '<div class="note">' + icon('info', 20) + '<span>La date est passée. ' + T(R, 'Tes éducs vont t\'en donner une nouvelle ; les étoiles que tu n\'as pas encore restent à gagner.', 'Les éducs vont en donner une nouvelle.') + '</span></div>' : '') +
      '<ul class="list sk-rows">' + stars + '</ul>' +
      '<section class="p1box"><div class="between" style="align-items:center"><span class="hud" style="color:var(--violet)">' + T(R, 'Tes encouragements', 'Ses encouragements') + '</span><span class="row" style="gap:10px">' + encDots(n) + '<b class="hud" style="color:var(--violet);font-size:15px">' + n + '</b></span></div>' +
      (!faite ? '<p class="small" style="margin:0;color:var(--soft)">Un encouragement veut dire « ' + T(R, 'tu es', 'il est') + ' sur la bonne voie » : il ne donne pas l\'étoile, c\'est un éduc qui la valide.' + T(R, ' Tu peux aussi la demander, sur sa carte.', '') + '</p>' : '') +
      (liste ? '<span class="mlab" style="margin:4px 0 0">Du plus récent au plus ancien</span><ol class="p1list">' + liste + '</ol>' : '<p class="small" style="margin:0">Pas encore d\'encouragement : ça viendra à l\'entraînement ou au plateau.</p>') + '</section>' +
      (conseils && !faite ? '<section class="sec"><h2 class="h2">Comment ' + T(R, 't\'entraîner', 'il peut s\'entraîner') + '</h2><div class="sk-tips">' + conseils + '</div></section>' : '') +
      '</main>';
  }

  // ======================================================================
  // Tous les mots des éducs
  // ======================================================================
  function mots(R) {
    var d = R.d, lu = M.luAt(R.k ? 'k' : 'f', d.joueur.id);
    var l = (d.encouragements || []).slice().sort(function (a, b) { return a.cree < b.cree ? 1 : -1; });
    return '<main class="screen">' + sub(R, R.base, 'Missions', T(R, 'Les mots de mes éducs', 'Les mots de ses éducs')) +
      '<div class="head"><span class="kicker" style="color:var(--green)">' + l.length + ' en tout</span><h1 class="big sm">' + T(R, 'Les mots de mes éducs', 'Les mots des éducs') + '</h1></div>' +
      (l.length ? '<ol class="p1list">' + l.map(function (x) {
        var sq = SK.surQuoi(d, x);
        return '<li class="p1row' + ((x.cree || '') > lu ? ' new' : '') + '">' + (x.missionId ? p1Tag() : '<b class="p1tag mot">' + icon('heart', 14) + '</b>') + '<span class="grow"><span class="p1-k">' + quiQuand(x) + ((x.cree || '') > lu ? ' · nouveau' : '') + '</span><span class="p1-m">' + (motDe(x) || '+1') + '</span>' + (sq ? '<span class="t2" style="margin-top:4px">sur « ' + esc(sq) + ' »</span>' : '') + '</span></li>';
      }).join('') + '</ol>' : '<div class="empty">' + T(R, 'Pas encore de mot : ils arrivent ici quand un éduc t\'encourage.', 'Pas encore de mot des éducs.') + '</div>') + '</main>';
  }

  // ======================================================================
  // SKILLS : le carnet
  // ======================================================================
  // (visuels v2) la carte brillante : bord du grade vers la couleur de la carte, halo, icône néon trophée qui flotte,
  // crans de grade, étoiles à facettes ; la carte de la mission principale a le cadre arc-en-ciel A3.
  // o.nouv : { 'carte:etoile': true } les étoiles qui viennent d'arriver (elles « tombent » à leur place)
  var UID = 0;
  function crans(g) { var o = '<span class="sk-cr" aria-hidden="true">'; for (var i = 1; i <= 5; i++) o += '<i class="' + (i <= g.n ? 'on' : '') + '"></i>'; return o + '</span>'; }
  function pipEtat(s, mp, D) { return s.row ? (s.brille ? 'brille' : 'gagnee') : (mp && SK.dansMission(mp, D.id, s.def.id) ? 'mission' : 'a_gagner'); }
  function carteHtml(R, D, c, big, o) {
    o = o || {};
    var g = c.grade, mp = missionActive(R.d), mis = !!(mp && mp.domaine === D.id), nv = o.nouv || {}, nNew = 0, nMis = 0, u = 'sk' + (++UID);
    var pips = c.stars.map(function (s, i) {
      var et = pipEtat(s, mp, D), svg = MC.etoileSvg(et, big ? 18 : 15, u + 'p' + i);
      if (et === 'mission') nMis++;
      if (nv[SK.key(D.id, s.def.id)]) { nNew++; svg = svg.replace('class="et ', 'class="et pop ').replace('<svg ', '<svg style="animation-delay:' + (0.15 * nNew).toFixed(2) + 's" '); }
      return svg;
    }).join('');
    var label = c.n + ' étoile' + (c.n > 1 ? 's' : '') + ' sur ' + c.max + (c.nbBrille ? ', ' + c.nbBrille + ' qui brille' + (c.nbBrille > 1 ? 'nt' : '') : '') + (nMis ? ', ' + nMis + ' en mission' : '');
    var art = '<span class="sk-art">' + (mis ? '<span class="sk-mtag"><b>★ MISSION</b></span>' : '') + (nNew ? '<span class="sk-newtag">' + (nNew > 1 ? nNew + ' NOUVELLES' : 'NOUVELLE ÉTOILE') + '</span>' : '') +
      MC.trophee(D.id, u, big ? 112 : mis ? 76 : 82) + '</span>';
    var body = '<span class="sk-body"><span class="sk-nm">' + esc(D.nom) + '</span><span class="sk-gr">' + esc(g.nom) + ' · ' + c.n + ' / ' + c.max + (g.n ? crans(g) : '') + '</span>' +
      '<span class="sk-pips" role="img" aria-label="' + label + '">' + pips + '</span></span>';
    var inner = mis ? '<span class="sk-line"><span class="sk-inner">' + art + body + '</span></span>' : art + body;
    var tag = big ? 'div' : 'a href="' + R.sk + '/' + esc(D.id) + '" aria-label="' + esc(D.nom + ' : ' + g.nom + ', ' + label + (mis ? ', ta mission principale' : '')) + '"';
    return '<div class="cp-tilt sk-tilt' + (big ? ' skbig' : '') + '" data-carte="' + esc(D.id) + '" style="--c:' + g.color + ';--d:' + D.color + ';--glow2:' + ui.rgba(D.color, 0.22) + '">' +
      '<' + tag + ' class="cp-card sk-card sk-g' + g.n + (mis ? ' sk-mis' : '') + '"><span class="cp-in">' + inner +
      '<span class="cp-holo"></span><span class="cp-shine"></span></span></' + (big ? 'div' : 'a') + '></div>';
  }
  // les étoiles arrivées depuis la dernière visite du carnet (pas à la toute 1re visite : tout serait « nouveau »)
  // une étoile qui se met à briller compte aussi comme nouvelle (sa date de mise à jour change)
  function nouvellesEtoiles(d, lu) {
    return lu ? (d.etoiles || []).filter(function (e) { return SK.star(e.domaine, e.etoile) && ((e.cree || '') > lu || (e.brille && (e.maj || '') > lu)); }) : [];
  }
  MC.nouvellesEtoiles = nouvellesEtoiles;
  function skillsHome(R, o) {
    o = o || {};
    var d = R.d, tot = SK.total(d), def = SK.prochainDefi(d), mp = SK.missionPerso(d);
    var cartes = SK.DOMAINES.map(function (D) { return carteHtml(R, D, SK.carte(d, D.id), false, o); }).join('');
    var rappel = '';
    if (mp) rappel = blocMission(R, mp, true);
    else if (def) {
      var s = SK.star(def.d, def.e), Dd = SK.dom(def.d);
      rappel = '<a class="defi2" href="' + R.sk + '/' + esc(def.d) + '"><span class="hud" style="color:var(--gold)">' + T(R, 'Ton prochain défi', 'Son prochain défi') + '</span>' +
        '<b>' + esc(Dd.nom) + ' · l\'étoile ' + esc(s.nom) + '</b><span class="small" style="color:var(--soft)">« ' + esc(s.phrase) + ' »</span></a>';
    }
    return '<main class="screen">' + bar(R, 'Skills') +
      '<div class="between" style="align-items:center;gap:10px"><h1 class="h2" style="font-size:26px;white-space:nowrap">' + T(R, 'Mes Skills', 'Ses Skills') + '</h1><span class="hud" style="color:var(--gold)">' + tot + ' / ' + SK.MAX_TOTAL + ' étoiles' + (SK.totalBrille(d) ? ' · ' + SK.totalBrille(d) + ' brillent' : '') + '</span></div>' +
      (o.note || '') +
      '<div class="sk-grid">' + cartes + '</div>' + rappel +
      '<p class="small" style="margin:0">Une étoile reste grise tant qu\'un éduc ne l\'a pas validée ; elle <b>brille</b> quand un éduc la voit au plateau. Les étoiles se gagnent dans n\'importe quel ordre. ' + T(R, 'Tu peux aussi en demander une, sur sa carte (une demande à la fois). ', '') + 'Les Skills ne sont jamais classés : chacun avance à son rythme.</p></main>';
  }
  function skillsCarte(R, id) {
    var d = R.d, D = SK.dom(id);
    if (!D) return '<main class="screen">' + sub(R, R.sk, 'Skills', 'Skills') + '<div class="empty">Carte introuvable.</div></main>';
    var c = SK.carte(d, id), mp = SK.missionPerso(d), mpa = missionActive(d), def = SK.prochainDefi(d);
    var ladder = '<ol class="sk-lad">' + SK.GRADES.slice(1).map(function (g) { return '<li class="' + (g.n <= c.grade.n ? 'on' : '') + (g.n === c.grade.n ? ' cur' : '') + '" style="--gc:' + g.color + '">' + esc(g.nom) + '</li>'; }).join('') + '</ol>' +
      (c.suivant ? '<p class="small" style="margin:0;color:var(--soft)">Encore ' + c.suivant.manque + ' étoile' + (c.suivant.manque > 1 ? 's' : '') + ' pour passer <b>' + esc(c.suivant.grade.nom) + '</b>. Dans n\'importe quel ordre.</p>'
        : c.nbBrille < c.max ? '<p class="small" style="margin:0;color:var(--soft)">Toutes gagnées ! Fais-les briller au plateau pour passer <b>Légende</b> (' + c.nbBrille + ' / ' + c.max + ').</p>' : '');
    var dem = SK.demandeEnCours(d);
    // la dernière réponse « pas vu » de chaque étoile (message neutre)
    var pasvu = {}; (d.demandes || []).forEach(function (x) { if (x.statut === 'pasvu' && x.domaine === id) { var k = x.etoile; if (!pasvu[k] || (pasvu[k].maj || '') < (x.maj || '')) pasvu[k] = x; } });
    var rows = c.stars.map(function (s, i) {
      var isM = mpa && SK.dansMission(mpa, id, s.def.id), isDefi = !s.row && def && def.d === id && def.e === s.def.id && !isM;
      var right = '', sub2;
      var demIci = dem && dem.domaine === id && dem.etoile === s.def.id, peut = R.k && SK.peutDemander(d, id, s.def.id);
      if (s.row && s.brille) sub2 = 'Brille depuis le ' + jour(s.row.brille) + ' · vue au plateau' + (s.row.brilleOccasion ? ' (' + esc(s.row.brilleOccasion) + ')' : '') + ' par ' + esc(s.row.brilleParNom);
      else if (s.row) sub2 = 'Gagnée le ' + jour(s.row.date) + ' · ' + esc(s.row.parNom) + (s.row.occasion ? ' · ' + esc(s.row.occasion) : '');
      else if (isM) {
        var n = SK.plus1(d, mpa.id).length;
        sub2 = [T(R, 'Ta', 'Sa') + ' mission principale', finTxt(mpa).replace(/^J/, 'j'), 'à valider par un éduc'].filter(Boolean).join(' · ');
        right = '<span class="sk-p1">' + encDots(n) + '<small>' + encTxt(n) + '</small></span>';
      } else sub2 = 'À gagner';
      if (demIci) sub2 += '<br><b style="color:var(--cyan)">' + (dem.sorte === 'briller' ? 'Demande envoyée : la faire briller' : 'Demande envoyée') + ' · un éduc va répondre</b>' + (R.k ? ' <button type="button" class="lnk" data-act="skDemAnn" data-id="' + esc(dem.id) + '">Annuler</button>' : '');
      else if (pasvu[s.def.id] && !(s.row && (s.brille || pasvu[s.def.id].sorte === 'gagner'))) sub2 += '<br><span style="color:var(--dim)">Pas vu cette fois par ' + esc(pasvu[s.def.id].parNom || 'les éducs') + ' : retente ' + (pasvu[s.def.id].sorte === 'briller' ? 'au prochain plateau' : 'à l\'entraînement') + '.</span>';
      if (peut && !demIci) right += '<button type="button" class="btn2 sm' + (peut === 'briller' ? ' gold' : '') + ' skdem" data-act="skDem" data-d="' + esc(id) + '" data-e="' + esc(s.def.id) + '" data-s="' + peut + '">' + (peut === 'briller' ? icon('spark', 14) + ' Fait au plateau' : 'Demander') + '</button>';
      var et = s.row ? (s.brille ? 'brille' : 'gagnee') : isM ? 'mission' : 'a_gagner';
      return '<li class="li sk-row' + (s.row ? ' on' : '') + (s.brille ? ' brille' : '') + (isM ? ' mis' : '') + '"><span class="sk-st">' + MC.etoileSvg(et, 22, 'r' + id + i) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + (isDefi ? ' <span class="pill" style="--pc:var(--gold)">Prochain défi</span>' : '') + '</span><span class="t2">« ' + esc(s.def.phrase) + ' »</span><span class="t2" style="color:' + (s.row ? 'var(--gold)' : 'var(--dim)') + '">' + sub2 + '</span>' + right + '</span>' +
        (isM ? '<a class="cbtn grey" href="' + R.base + '/perso" aria-label="Voir la mission">' + icon('right', 16) + '</a>' : '') + '</li>';
    }).join('');
    var conseils = c.stars.filter(function (s) { return !s.row; }).sort(function (a, b) { var am = mpa && SK.dansMission(mpa, id, a.def.id), bm = mpa && SK.dansMission(mpa, id, b.def.id); return am === bm ? 0 : am ? -1 : 1; })
      .map(function (s, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary><b>' + esc(s.def.nom) + '</b></summary><p class="small" style="margin:6px 0 0;color:var(--soft)">' + esc(s.def.conseil) + '</p></details>'; }).join('');
    return '<main class="screen">' + sub(R, R.sk, 'Skills', 'Carte ' + D.nom) + carteHtml(R, D, c, true) + ladder +
      '<ul class="list sk-rows">' + rows + '</ul>' +
      (conseils ? '<section class="sec" id="conseil"><h2 class="h2">Comment ' + T(R, 't\'entraîner', 's\'entraîner') + '</h2><div class="sk-tips">' + conseils + '</div></section>' : (c.grade.n === 5 ? '<div class="note gold">' + icon('star', 22) + '<span><b>Carte complète : Légende !</b></span></div>' : '<div class="note gold">' + icon('star', 22) + '<span><b>Toutes gagnées : Diamant !</b> ' + T(R, 'Fais-les', 'Il peut les faire') + ' briller au plateau pour passer Légende (' + c.nbBrille + ' / ' + c.max + ').</span></div>')) +
      '</main>';
  }

  // ----- l'enfant demande une étoile (une demande à la fois) -----
  MC.act.skDem = function (b) {
    var d = b.getAttribute('data-d'), e = b.getAttribute('data-e'), sorte = b.getAttribute('data-s'), s = SK.star(d, e), D = SK.dom(d);
    if (!s) return;
    ui.modal({
      title: sorte === 'briller' ? 'Tu l\'as fait au plateau ?' : 'Tu l\'as réussie ?',
      body: '<p class="lead"><b>' + esc(D.nom + ' · ' + s.nom) + '</b> : « ' + esc(s.phrase) + ' »</p><p class="small">' +
        (sorte === 'briller' ? 'Les éducs vont regarder s\'ils l\'ont vu au plateau. Si oui, ton étoile brille.' : 'Les éducs vont te répondre. Si c\'est oui, ton étoile s\'allume.') + ' Une seule demande à la fois.</p>',
      actions: [{ label: icon('send', 16) + ' Demander', value: true, cls: 'btn gold' }, { label: 'Annuler', value: false, cls: 'btn2 grey' }]
    }).then(function (ok) {
      if (!ok) return;
      app.kidCall('demanderEtoile', { domaine: d, etoile: e }).then(function (r) {
        var me = app.S.me; if (me) { me.demandes = (me.demandes || []).concat([r.demande]); app.setMe(me); }
        ui.toast('Demande envoyée : un éduc va te répondre'); app.rerender();
      }).catch(function (er) { ui.toast(er.message, true); });
    });
  };
  MC.act.skDemAnn = function (b) {
    var id = b.getAttribute('data-id');
    app.kidCall('retirerDemande', { id: id }).then(function () {
      var me = app.S.me; if (me) { me.demandes = (me.demandes || []).filter(function (x) { return x.id !== id; }); app.setMe(me); }
      ui.toast('Demande annulée'); app.rerender();
    }).catch(function (er) { ui.toast(er.message, true); });
  };

  // ======================================================================
  // Routes enfant
  // ======================================================================
  function kidR(me) { return { k: true, d: me, base: '#/missions', sk: '#/skills' }; }
  // V1 (28/10) : une partie pas encore ouverte aux enfants et aux parents (MC.CONFIG.ENFANTS) renvoie ailleurs
  // (un ancien lien, une nouveauté d'avant, l'onglet gardé en mémoire)
  function ferme(k, vers) {
    if (MC.ouvert(k)) return false;
    setTimeout(function () { app.go(vers, true); }, 0);
    return true;
  }
  function garde(k, vers, fn) { return function (p, q, cur) { return ferme(k, vers) ? null : fn(p, q, cur); }; }
  function luEnSortant(qui, d, cur) {
    // l'onglet a été vu : la pastille s'éteint (les « nouveau » restent affichés cette fois-ci)
    cur.after = function () { M.marquerLu(qui, d.joueur.id, d); app.refreshNav(); };
  }
  app.route('/missions', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return missionsHome(kidR(me), q.vue === 'faites' ? 'faites' : 'encours'); });
  }, { kid: true, nav: 'missions', live: true, bg: '#33122A' });
  app.route('/missions/m/:id', garde('missionsEducs', '#/missions', function (p) {
    return app.loadMe().then(function (me) { return missionGroupe(kidR(me), p.id); });
  }), { kid: true, nav: 'missions', bg: '#33122A' });
  app.route('/missions/perso', garde('skills', '#/missions', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return missionPerso(kidR(me)); });
  }), { kid: true, nav: 'missions', live: true, bg: '#33122A' });
  app.route('/missions/mots', garde('missionsEducs', '#/missions', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return mots(kidR(me)); });
  }), { kid: true, nav: 'missions', live: true, bg: '#12333A' });
  // (visuels v2) les étoiles arrivées depuis la dernière visite : le booster se joue à l'ouverture de Skills,
  // puis les cartes montrent leurs nouvelles étoiles (elles « tombent » à leur place, étiquette « Nouvelle étoile »)
  var APRES = null;
  // la dernière visite du carnet (sur le téléphone, et en mémoire au cas où l'écriture échoue)
  var LU = {};
  function luSkills(jid) { var a = app.lsGet('mc-sklu:' + jid) || '', b = LU[jid] || ''; return a > b ? a : b; }
  MC.luSkills = luSkills;
  app.route('/skills', garde('skills', '#/semaine', function (p, q, cur) {
    return app.loadMe().then(function (me) {
      var jid = me.joueur.id, lu = luSkills(jid), nouv = nouvellesEtoiles(me, lu), o = {};
      if (APRES && APRES.jid === jid) { o.nouv = {}; APRES.keys.forEach(function (k) { o.nouv[k] = true; }); APRES = null; }
      cur.cleanup = unbindCards;
      cur.after = function (root) {
        bindCards(root);
        var mx = new Date(0).toISOString(); (me.etoiles || []).forEach(function (e) { [e.maj, e.cree].forEach(function (t) { if (t && t > mx) mx = t; }); });
        // si le téléphone refuse d'écrire (stockage plein, navigation privée), la date est gardée en mémoire : le booster ne revient pas en boucle
        app.lsSet('mc-sklu:' + jid, mx);
        if (app.lsGet('mc-sklu:' + jid) !== mx) LU[jid] = mx; else delete LU[jid];
        app.refreshNav();
        if (nouv.length && MC.booster) MC.booster(me, nouv, lu).then(function (keys) {
          // rangé dans le carnet : les étoiles arrivent dans leurs cartes. Fermé en quittant Skills : rien à rejouer plus tard
          if (location.hash.indexOf('#/skills') === 0 && location.hash.indexOf('#/skills/') !== 0) { APRES = { jid: jid, keys: keys }; app.rerender(); }
        });
      };
      return skillsHome(kidR(me), o);
    });
  }), { kid: true, nav: 'skills', live: true, bg: '#2E2612' });
  app.route('/skills/:dom', garde('skills', '#/semaine', function (p, q, cur) {
    return app.loadMe().then(function (me) { cur.after = bindCards; cur.cleanup = unbindCards; return skillsCarte(kidR(me), p.dom); });
  }), { kid: true, nav: 'skills', live: true, bg: '#2E2612' });

  // ======================================================================
  // Routes parent (l'enfant suivi se choisit en haut)
  // ======================================================================
  function famR(fam) { var d = MC.famKid(fam); return { k: false, d: d, fam: fam, base: '#/parent/missions', sk: '#/parent/skills' }; }
  function parentRoute(fn, mark, module, vers) {
    return function (p, q, cur) {
      if (module && ferme(module, vers || '#/parent/missions')) return null;
      return MC.loadFamily().then(function (fam) {
        app.refreshNav();
        if (!fam.enfants.length) return MC.parentNoKid(fam);
        var R = famR(fam);
        if (mark) cur.after = function (root) { M.marquerLu('f', R.d.joueur.id, R.d); app.refreshNav(); bindCards(root); };
        else cur.after = bindCards;
        cur.cleanup = unbindCards;
        return fn(R, p, q);
      });
    };
  }
  app.route('/parent/missions', parentRoute(function (R, p, q) { return missionsHome(R, q.vue === 'faites' ? 'faites' : 'encours'); }, true), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/m/:id', parentRoute(function (R, p) { return missionGroupe(R, p.id); }, false, 'missionsEducs'), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/perso', parentRoute(function (R) { return missionPerso(R); }, true, 'skills'), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/mots', parentRoute(function (R) { return mots(R); }, true, 'missionsEducs'), { adult: 'f', nav: 'p:missions', bg: '#12333A' });
  app.route('/parent/missions/jeu10', parentRoute(function (R) {
    var e = M.etat(R.d, 'jeu10');
    return '<main class="screen">' + sub(R, R.base, 'Missions', 'Le jeu à 10') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">' + (MC.ouvert('copains') ? 'Missions spéciales' : 'Mission spéciale') + '</span><h1 class="big sm">Le jeu à 10</h1></div>' +
      (MC.missionParent ? MC.missionParent(R.d) : '') +
      (MC.ouvert('copains') ? '<p class="small" style="margin:0">Les copains choisis restent secrets : seuls ' + esc(prenom(R)) + ' et les éducs les voient.</p>' : '') +
      (e.postes.length ? '<section class="sec"><h2 class="h2">Ses postes</h2>' + (MC.ptags ? MC.ptags(e.postes, true) : '') + '</section>' : '') + '</main>';
  }), { adult: 'f', nav: 'p:missions', bg: '#2E2612' });
  app.route('/parent/skills', parentRoute(function (R) { return skillsHome(R); }, false, 'skills', '#/parent'), { adult: 'f', nav: 'p:skills', bg: '#2E2612' });
  app.route('/parent/skills/:dom', parentRoute(function (R, p) { return skillsCarte(R, p.dom); }, false, 'skills', '#/parent'), { adult: 'f', nav: 'p:skills', bg: '#2E2612' });

  // les cartes Skills brillent sous le doigt, comme les cartes des postes
  function unbindCards() { if (MC.unbindTrophees) MC.unbindTrophees(); }
  function bindCards(root) { if (MC.bindTilt && root) MC.bindTilt(root); if (MC.bindTrophees && root) MC.bindTrophees(root); }
  MC.carteSkill = function (R, D, c, big, o) { return carteHtml(R, D, c, big, o); };
  MC.bindCartesSkills = bindCards;
})();
