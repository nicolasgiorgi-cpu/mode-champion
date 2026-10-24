/* =========================================================
   Mode champion · M12 — MISSIONS et SKILLS côté enfant et côté parent
   Missions : ce que demandent les éducs (le dernier +1, la mission perso et sa jauge
   de 5 +1, les missions de l'équipe : poste, vidéo, QCM, et tous les mots des éducs).
   Skills : le carnet de compétences (4 cartes, 5 étoiles chacune, validées par les éducs).
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

  // la jauge de 5 +1 (et le seuil du 3e, où l'appli propose aux éducs de valider)
  function jauge(n, big) {
    var o = '<span class="g5' + (big ? ' big' : '') + '" role="img" aria-label="' + n + ' +1 sur ' + SK.MAX_PLUS1 + '">';
    for (var i = 1; i <= SK.MAX_PLUS1; i++) o += '<i class="' + (i <= n ? 'on' : '') + (i === SK.PROPOSE_AU ? ' seuil' : '') + '"></i>';
    return o + '</span>';
  }
  MC.jauge5 = jauge;
  function p1Tag() { return '<b class="p1tag">+1</b>'; }
  function motDe(x) { return x.mot ? '« ' + esc(x.mot) + ' »' : (x.missionId ? 'Sur la bonne voie' : ''); }
  function quiQuand(x) { return esc(x.parNom) + ' · ' + esc(x.occasion ? x.occasion.charAt(0).toLowerCase() + x.occasion.slice(1) : jour(x.date)); }

  // ======================================================================
  // MISSIONS : en cours · faites
  // ======================================================================
  function missionsHome(R, vue) {
    var d = R.d, mp = SK.missionPerso(d), groupe = M.groupe(d), nv = M.nouveaux(R.k ? 'k' : 'f', d), luIds = {};
    nv.enc.forEach(function (x) { luIds[x.id] = true; }); nv.missions.forEach(function (m) { luIds[m.id] = true; });
    var spec = M.pending(d), faitesG = groupe.filter(function (x) { return x.faite; }), aFaireG = groupe.filter(function (x) { return !x.faite && !x.finie; });
    var persoFaites = SK.missionPerso(d, true).filter(function (m) { return m.statut === 'faite'; });
    var e10 = M.etat(d, 'jeu10'), D10 = M.def('jeu10');
    var nEnCours = spec.length + aFaireG.length + (mp ? 1 : 0), nFaites = faitesG.length + persoFaites.length + (e10.faite ? 1 : 0);
    var tabs = ui.subtabs(navKey(R, 'missions'), [['encours', R.base, 'En cours · ' + nEnCours], ['faites', R.base + '?vue=faites', 'Faites · ' + nFaites]], vue, '#FF4FA3', 'Missions');
    var body = '';
    if (vue === 'faites') {
      var items = [];
      persoFaites.forEach(function (m) { var s = SK.star(m.domaine, m.etoile), D = SK.dom(m.domaine); items.push({ at: m.faiteLe, html: '<a class="li mrow" href="' + R.sk + '/' + esc(m.domaine) + '"><span class="mic gold">' + icon('star', 18) + '</span><span class="grow"><span class="t1">' + esc(SK.titreMission(m)) + '</span><span class="t2">' + T(R, 'Ta mission perso', 'Sa mission perso') + ' · étoile ' + esc(D ? D.nom : '') + ' · ' + esc(s ? s.nom : '') + ' gagnée le ' + jour(m.faiteLe) + '</span></span>' + icon('right', 16) + '</a>' }); });
      faitesG.forEach(function (x) { items.push({ at: x.date, html: '<a class="li mrow" href="' + R.base + '/m/' + esc(x.def.id) + '"><span class="mic">' + icon(x.def.sorte === 'video' ? 'play' : 'list', 18) + '</span><span class="grow"><span class="t1">' + esc(x.def.titre) + '</span><span class="t2">' + (x.total ? x.score + ' / ' + x.total + ' bonnes réponses · ' : '') + 'faite le ' + jour(x.date) + (x.xp ? ' · +' + x.xp + ' XP' : '') + '</span></span>' + icon('right', 16) + '</a>' }); });
      if (e10.faite && D10) items.push({ at: (e10.m && e10.m.date) || '', html: '<a class="li mrow" href="' + (R.k ? '#/mission' : R.base + '/jeu10') + '"><span class="mic">' + icon('ball', 18) + '</span><span class="grow"><span class="t1">' + esc(D10.titre) + '</span><span class="t2">' + T(R, 'Tes postes', 'Ses postes') + ' : ' + e10.postes.map(function (id) { return esc(M.poste(id).nom); }).join(' · ') + '</span></span>' + icon('right', 16) + '</a>' });
      items.sort(function (a, b) { return (a.at || '') < (b.at || '') ? 1 : -1; });
      body = items.length ? '<ul class="list">' + items.map(function (x) { return '<li>' + x.html + '</li>'; }).join('') + '</ul>' : '<div class="empty">' + T(R, 'Pas encore de mission faite. Elles arrivent ici, avec tes résultats.', 'Pas encore de mission faite.') + '</div>';
    } else {
      // le dernier +1 ou mot (nouveau s'il n'a pas encore été vu)
      var encs = (d.encouragements || []).slice().sort(function (a, b) { return a.cree < b.cree ? 1 : -1; }), last = encs[0];
      if (last) {
        var isNew = !!luIds[last.id], href = last.missionId && mp && last.missionId === mp.id ? R.base + '/perso' : R.base + '/mots';
        var sur = last.missionId ? (function () { var s = SK.star(last.domaine, last.etoile); return s ? '« ' + s.mission + ' »' : 'ta mission'; })() : '';
        body += '<a class="lastp1" href="' + href + '">' + '<span class="row" style="gap:8px">' + (last.missionId ? p1Tag() : icon('heart', 16, 'style="color:var(--green)"')) + '<span class="hud" style="color:var(--green)">' + (isNew ? 'Nouveau · ' : '') + esc(last.parNom) + ' · ' + jour(last.date) + '</span></span>' +
          (last.missionId ? '<b class="lp-t">' + T(R, 'Tu as reçu un +1', esc(prenom(R)) + ' a reçu un +1') + (sur ? ' sur ' + esc(sur) : '') + '</b>' : '<b class="lp-t">' + T(R, 'Un mot de ton éduc', 'Un mot de son éduc') + '</b>') +
          (last.mot ? '<span class="lp-m">« ' + esc(last.mot) + ' »</span>' : '') + '</a>';
      }
      // la mission perso
      body += '<section class="sec"><h2 class="h2">' + T(R, 'Ma mission perso', 'Sa mission perso') + '</h2>';
      if (mp) {
        var n = SK.plus1(d, mp.id).length, st = SK.star(mp.domaine, mp.etoile), Dm = SK.dom(mp.domaine);
        body += '<a class="mperso" href="' + R.base + '/perso"><span class="grow"><span class="mp-t">' + icon('star', 16, 'style="color:var(--gold)"') + ' ' + esc(SK.titreMission(mp)) + '</span>' +
          '<span class="row" style="gap:10px;margin-top:8px">' + jauge(n) + '<span class="hud" style="color:var(--green)">' + n + ' / ' + SK.MAX_PLUS1 + ' +1</span></span>' +
          '<span class="t2">Carte ' + esc(Dm ? Dm.nom : '') + ' · l\'étoile ' + esc(st ? st.nom : '') + (n >= SK.PROPOSE_AU ? ' · ' + T(R, 'tes éducs peuvent la valider', 'ses éducs peuvent la valider') : ' · depuis le ' + jour(mp.debut || mp.cree)) + '</span></span>' + icon('right', 18) + '</a>';
      } else body += '<p class="small" style="margin:0">' + T(R, 'Pas de mission perso pour l\'instant. Tes éducs t\'en donneront une : une étoile Skills à décrocher.', 'Pas de mission perso pour l\'instant : les éducs en donnent une (une étoile Skills à décrocher).') + '</p>';
      body += '</section>';
      // pour toute l'équipe
      var eq = '';
      spec.forEach(function (Dx) {
        var ex = M.etat(d, Dx.id);
        eq += '<li><a class="li mrow" href="' + (R.k ? '#/mission' : R.base + '/jeu10') + '"><span class="mic gold">' + icon('ball', 18) + '</span><span class="grow"><span class="t1">' + esc(Dx.titre) + '</span><span class="t2">' + (ex.postes.length ? 'Postes choisis, copains à faire' : 'Choisir son poste et ses copains') + (Dx.fin >= L.today() ? ' · jusqu\'au ' + jour(Dx.fin) : '') + ' · +' + C.XP.mission + ' XP</span></span>' + icon('right', 16) + '</a></li>';
      });
      aFaireG.forEach(function (x) {
        var m = x.def, nq = (m.questions || []).length;
        var t2 = m.sorte === 'video' ? (x.vu ? 'Vidéo vue · ' + (nq ? 'le quiz à faire' : 'à terminer') : 'Une vidéo' + (nq ? ' et ' + nq + ' question' + (nq > 1 ? 's' : '') : '')) : 'QCM · ' + nq + ' question' + (nq > 1 ? 's' : '');
        eq += '<li><a class="li mrow" href="' + R.base + '/m/' + esc(m.id) + '"><span class="mic">' + icon(m.sorte === 'video' ? 'play' : 'list', 18) + '</span><span class="grow"><span class="t1">' + esc(m.titre) + (luIds[m.id] ? ' <span class="pill" style="--pc:var(--pink)">Nouveau</span>' : '') + '</span><span class="t2">' + t2 + (m.fin ? ' · jusqu\'au ' + jour(m.fin) : '') + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</span></span>' + icon('right', 16) + '</a></li>';
      });
      body += '<section class="sec"><h2 class="h2">Pour toute l\'équipe</h2>' + (eq ? '<ul class="list">' + eq + '</ul>' : '<p class="small" style="margin:0">Rien à faire pour l\'instant.</p>') + '</section>';
      body += '<a class="li" href="' + R.base + '/mots">' + icon('heart', 20, 'style="color:var(--green);flex:none"') + '<span class="grow"><span class="t1">' + T(R, 'Tous les mots de mes éducs', 'Tous les mots de ses éducs') + '</span><span class="t2">' + encs.length + ' en tout, du plus récent au plus ancien</span></span>' + icon('right', 16) + '</a>';
      if (!R.k) body += '<p class="small" style="margin:0">Les missions, les +1 et les mots viennent des éducs. Les parents suivent, sans en donner.</p>';
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
  // La mission perso : l'étoile à décrocher, les +1
  // ======================================================================
  function missionPerso(R) {
    var d = R.d, mp = SK.missionPerso(d) || SK.missionPerso(d, true)[0];
    if (!mp) return '<main class="screen">' + sub(R, R.base, 'Missions', T(R, 'Ma mission perso', 'Sa mission perso')) + '<div class="empty">' + T(R, 'Pas de mission perso pour l\'instant.', 'Pas de mission perso pour l\'instant.') + '</div></main>';
    var st = SK.star(mp.domaine, mp.etoile), D = SK.dom(mp.domaine), p1 = SK.plus1(d, mp.id), n = p1.length, faite = mp.statut === 'faite';
    var lu = M.luAt(R.k ? 'k' : 'f', d.joueur.id), row = SK.acquis(d)[mp.domaine + ':' + mp.etoile];
    var liste = p1.map(function (x, i) {
      return '<li class="p1row' + ((x.cree || '') > lu ? ' new' : '') + '">' + p1Tag() + '<span class="grow"><span class="p1-k">N°' + (n - i) + ' · ' + quiQuand(x) + ((x.cree || '') > lu ? ' · nouveau' : '') + '</span><span class="p1-m">' + motDe(x) + '</span></span></li>';
    }).join('');
    return '<main class="screen">' + sub(R, R.base, 'Missions', T(R, 'Ma mission perso', 'Sa mission perso')) +
      '<div class="head"><span class="kicker" style="color:var(--pink)">' + T(R, 'Rien que pour toi, ', 'Mission pour ') + esc(prenom(R)) + ' · depuis le ' + jour(mp.debut || mp.cree) + '</span>' +
      '<h1 class="big sm">' + icon('star', 30, 'style="color:var(--gold);vertical-align:-3px"') + ' ' + esc(SK.titreMission(mp)) + '</h1>' + (st ? '<p class="lead">« ' + esc(st.phrase) + ' »</p>' : '') + '</div>' +
      (faite ? '<div class="note gold">' + icon('star', 22) + '<span><b>Mission réussie !</b> L\'étoile ' + esc(st ? st.nom : '') + ' est validée' + (row ? ' par ' + esc(row.parNom) + ', le ' + jour(row.date) : '') + '.' + (R.k ? ' Bravo !' : '') + '</span></div>' : '') +
      '<a class="li" href="' + R.sk + '/' + esc(mp.domaine) + '">' + icon('star', 20, 'style="color:' + (faite ? 'var(--gold)' : 'var(--faint)') + ';flex:none"') + '<span class="grow"><span class="t1">' + T(R, 'Dans mon carnet', 'Dans son carnet') + ' : ' + esc(D ? D.nom : '') + ' · ' + esc(st ? st.nom : '') + '</span><span class="t2">' + (faite ? 'Étoile gagnée' : 'Grise tant qu\'un éduc ne l\'a pas validée') + '</span></span>' + icon('right', 16) + '</a>' +
      '<section class="p1box"><div class="between" style="align-items:center"><span class="hud" style="color:var(--green)">' + T(R, 'Tes +1', 'Ses +1') + '</span><span class="row" style="gap:10px">' + jauge(n, true) + '<b class="hud" style="color:var(--green);font-size:15px">' + n + ' / ' + SK.MAX_PLUS1 + '</b></span></div>' +
      (!faite ? '<p class="small" style="margin:0;color:var(--soft)">' + (n >= SK.PROPOSE_AU ? n + ' +1 : ' + T(R, 'tes éducs peuvent valider l\'étoile au prochain entraînement.', 'les éducs peuvent valider l\'étoile au prochain entraînement.') + ' ' : '') + 'Un +1 veut dire « ' + T(R, 'tu es', 'il est') + ' sur la bonne voie » : il ne donne pas l\'étoile, c\'est un éduc qui la valide.</p>' : '') +
      (liste ? '<span class="mlab" style="margin:4px 0 0">' + T(R, 'Tes +1', 'Ses +1') + ', du plus récent</span><ol class="p1list">' + liste + '</ol>' : '<p class="small" style="margin:0">Pas encore de +1 : ça viendra à l\'entraînement ou au plateau.</p>') + '</section>' +
      (st && !faite ? '<section class="sec"><h2 class="h2">Comment ' + T(R, 't\'entraîner', 'il peut s\'entraîner') + '</h2><p class="lead" style="color:var(--soft)">' + esc(st.conseil) + '</p></section>' : '') +
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
        var s = x.missionId ? SK.star(x.domaine, x.etoile) : null;
        return '<li class="p1row' + ((x.cree || '') > lu ? ' new' : '') + '">' + (x.missionId ? p1Tag() : '<b class="p1tag mot">' + icon('heart', 14) + '</b>') + '<span class="grow"><span class="p1-k">' + quiQuand(x) + ((x.cree || '') > lu ? ' · nouveau' : '') + '</span><span class="p1-m">' + (motDe(x) || '+1') + '</span>' + (s ? '<span class="t2" style="margin-top:4px">sur « ' + esc(s.mission) + ' »</span>' : '') + '</span></li>';
      }).join('') + '</ol>' : '<div class="empty">' + T(R, 'Pas encore de mot : ils arrivent ici quand un éduc t\'encourage.', 'Pas encore de mot des éducs.') + '</div>') + '</main>';
  }

  // ======================================================================
  // SKILLS : le carnet
  // ======================================================================
  function carteHtml(R, D, c, big) {
    var g = c.grade, pips = c.stars.map(function (s) { return '<i class="' + (s.row ? 'on' : '') + '"></i>'; }).join('');
    return '<div class="cp-tilt sk-tilt' + (big ? ' skbig' : '') + '" style="--c:' + g.color + ';--d:' + D.color + ';--glow2:' + ui.rgba(D.color, 0.22) + '">' +
      '<' + (big ? 'div' : 'a href="' + R.sk + '/' + esc(D.id) + '"') + ' class="cp-card sk-card g' + c.n + '"><span class="cp-in">' +
      '<span class="sk-art"><span class="sk-em" style="color:' + D.color + '">' + icon(D.icon, big ? 64 : 44) + '</span></span>' +
      '<span class="sk-body"><span class="sk-nm">' + esc(D.nom) + '</span><span class="sk-gr">' + esc(g.nom) + (c.n ? ' · ' + c.n + ' / 5' : '') + '</span><span class="sk-pips" aria-label="' + c.n + ' étoiles sur 5">' + pips + '</span></span>' +
      '<span class="cp-holo"></span><span class="cp-shine"></span></span></' + (big ? 'div' : 'a') + '></div>';
  }
  function skillsHome(R) {
    var d = R.d, tot = SK.total(d), def = SK.prochainDefi(d), lu = R.k ? (app.lsGet('mc-sklu:' + d.joueur.id) || '') : '';
    // les étoiles validées depuis la dernière visite du carnet (pas à la toute 1re visite : tout serait « nouveau »)
    var nouv = R.k && lu ? (d.etoiles || []).filter(function (e) { return (e.cree || '') > lu; }) : [];
    var cartes = SK.DOMAINES.map(function (D) { return carteHtml(R, D, SK.carte(d, D.id)); }).join('');
    var defi = '';
    if (def) {
      var s = SK.star(def.d, def.e), Dd = SK.dom(def.d), n = def.mission ? SK.plus1(d, def.mission.id).length : 0;
      defi = '<a class="defi2" href="' + (def.mission ? R.base + '/perso' : R.sk + '/' + esc(def.d)) + '"><span class="hud" style="color:var(--gold)">' + (R.k ? 'Ton prochain défi' : 'Son prochain défi') + (def.mission ? ' · ' + T(R, 'ta', 'sa') + ' mission perso' : '') + '</span>' +
        '<b>' + esc(Dd.nom) + ' · l\'étoile ' + esc(s.nom) + '</b><span class="small" style="color:var(--soft)">« ' + esc(s.phrase) + ' »</span>' +
        (def.mission ? '<span class="row" style="gap:8px">' + jauge(n) + '<span class="hud" style="color:var(--green)">' + n + ' +1 sur ' + SK.MAX_PLUS1 + (n >= SK.PROPOSE_AU ? ' · à valider' : '') + '</span></span>' : '') + '</a>';
    }
    return '<main class="screen">' + bar(R, 'Skills') +
      '<div class="between" style="align-items:center"><h1 class="h2" style="font-size:26px">' + T(R, 'Mes Skills', 'Ses Skills') + '</h1><span class="hud" style="color:var(--gold)">' + tot + ' / 20 étoiles</span></div>' +
      (nouv.length ? '<div class="note gold">' + icon('star', 22) + '<span><b>' + (nouv.length > 1 ? nouv.length + ' nouvelles étoiles !' : 'Nouvelle étoile !') + '</b> ' + nouv.map(function (e) { var s = SK.star(e.domaine, e.etoile); return esc((SK.dom(e.domaine) || {}).nom + ' · ' + (s ? s.nom : '')) + ' (' + esc(e.parNom) + ')'; }).join(', ') + '. +' + (C.XP.etoile * nouv.length) + ' XP</span></div>' : '') +
      '<div class="sk-grid">' + cartes + '</div>' + defi +
      '<p class="small" style="margin:0">Une étoile reste grise tant qu\'un éduc ne l\'a pas validée, à l\'entraînement ou au plateau. Un +1 ' + T(R, 'te dit que tu es', 'dit qu\'il est') + ' sur la bonne voie. Les Skills ne sont jamais classés : chacun avance à son rythme.</p></main>';
  }
  function skillsCarte(R, id) {
    var d = R.d, D = SK.dom(id);
    if (!D) return '<main class="screen">' + sub(R, R.sk, 'Skills', 'Skills') + '<div class="empty">Carte introuvable.</div></main>';
    var c = SK.carte(d, id), mp = SK.missionPerso(d), def = SK.prochainDefi(d);
    var ladder = '<ol class="sk-lad">' + SK.GRADES.slice(1).map(function (g) { return '<li class="' + (g.n <= c.n ? 'on' : '') + (g.n === c.n ? ' cur' : '') + '" style="--gc:' + g.color + '">' + esc(g.nom) + '</li>'; }).join('') + '</ol>';
    var rows = c.stars.map(function (s) {
      var isM = mp && mp.domaine === id && mp.etoile === s.def.id, isDefi = !s.row && def && def.d === id && def.e === s.def.id;
      var right = '', sub2;
      if (s.row) sub2 = 'Gagnée le ' + jour(s.row.date) + ' · ' + esc(s.row.parNom) + (s.row.occasion ? ' · ' + esc(s.row.occasion) : '');
      else if (isM) {
        var n = SK.plus1(d, mp.id).length, last = SK.plus1(d, mp.id)[0];
        sub2 = T(R, 'Ta', 'Sa') + ' mission perso depuis le ' + jour(mp.debut || mp.cree) + ' · à valider par un éduc';
        right = '<span class="sk-p1">' + jauge(n) + (last ? '<small>dernier : ' + esc(last.parNom) + ', ' + jour(last.date) + '</small>' : '') + '</span>';
      } else sub2 = 'À débloquer';
      return '<li class="sk-row' + (s.row ? ' on' : '') + (isM ? ' mis' : '') + '"><span class="sk-st">' + icon('star', 22) + '</span><span class="grow"><span class="t1">' + esc(s.def.nom) + (isDefi ? ' <span class="pill" style="--pc:var(--gold)">Prochain défi</span>' : '') + '</span><span class="t2">« ' + esc(s.def.phrase) + ' »</span><span class="t2" style="color:' + (s.row ? 'var(--gold)' : 'var(--dim)') + '">' + sub2 + '</span>' + right + '</span>' +
        (isM ? '<a class="cbtn grey" href="' + R.base + '/perso" aria-label="Voir la mission">' + icon('right', 16) + '</a>' : '') + '</li>';
    }).join('');
    var conseils = c.stars.filter(function (s) { return !s.row; }).sort(function (a, b) { var am = mp && mp.etoile === a.def.id && mp.domaine === id, bm = mp && mp.etoile === b.def.id && mp.domaine === id; return am === bm ? 0 : am ? -1 : 1; })
      .map(function (s, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary><b>' + esc(s.def.nom) + '</b></summary><p class="small" style="margin:6px 0 0;color:var(--soft)">' + esc(s.def.conseil) + '</p></details>'; }).join('');
    return '<main class="screen">' + sub(R, R.sk, 'Skills', 'Carte ' + D.nom) + carteHtml(R, D, c, true) + ladder +
      '<ul class="list sk-rows">' + rows + '</ul>' +
      (conseils ? '<section class="sec" id="conseil"><h2 class="h2">Comment ' + T(R, 't\'entraîner', 's\'entraîner') + '</h2><div class="sk-tips">' + conseils + '</div></section>' : '<div class="note gold">' + icon('star', 22) + '<span><b>Carte complète : Légende !</b></span></div>') +
      '</main>';
  }

  // ======================================================================
  // Routes enfant
  // ======================================================================
  function kidR(me) { return { k: true, d: me, base: '#/missions', sk: '#/skills' }; }
  function luEnSortant(qui, d, cur) {
    // l'onglet a été vu : la pastille s'éteint (les « nouveau » restent affichés cette fois-ci)
    cur.after = function () { M.marquerLu(qui, d.joueur.id, d); app.refreshNav(); };
  }
  app.route('/missions', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return missionsHome(kidR(me), q.vue === 'faites' ? 'faites' : 'encours'); });
  }, { kid: true, nav: 'missions', live: true, bg: '#33122A' });
  app.route('/missions/m/:id', function (p) {
    return app.loadMe().then(function (me) { return missionGroupe(kidR(me), p.id); });
  }, { kid: true, nav: 'missions', bg: '#33122A' });
  app.route('/missions/perso', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return missionPerso(kidR(me)); });
  }, { kid: true, nav: 'missions', live: true, bg: '#33122A' });
  app.route('/missions/mots', function (p, q, cur) {
    return app.loadMe().then(function (me) { luEnSortant('k', me, cur); return mots(kidR(me)); });
  }, { kid: true, nav: 'missions', live: true, bg: '#12333A' });
  app.route('/skills', function (p, q, cur) {
    return app.loadMe().then(function (me) {
      cur.after = function (root) { bindCards(root); var mx = new Date(0).toISOString(); (me.etoiles || []).forEach(function (e) { if ((e.cree || '') > mx) mx = e.cree; }); app.lsSet('mc-sklu:' + me.joueur.id, mx); };
      return skillsHome(kidR(me));
    });
  }, { kid: true, nav: 'skills', live: true, bg: '#2E2612' });
  app.route('/skills/:dom', function (p, q, cur) {
    return app.loadMe().then(function (me) { cur.after = bindCards; return skillsCarte(kidR(me), p.dom); });
  }, { kid: true, nav: 'skills', live: true, bg: '#2E2612' });

  // ======================================================================
  // Routes parent (l'enfant suivi se choisit en haut)
  // ======================================================================
  function famR(fam) { var d = MC.famKid(fam); return { k: false, d: d, fam: fam, base: '#/parent/missions', sk: '#/parent/skills' }; }
  function parentRoute(fn, mark) {
    return function (p, q, cur) {
      return MC.loadFamily().then(function (fam) {
        app.refreshNav();
        if (!fam.enfants.length) return MC.parentNoKid(fam);
        var R = famR(fam);
        if (mark) cur.after = function (root) { M.marquerLu('f', R.d.joueur.id, R.d); app.refreshNav(); bindCards(root); };
        else cur.after = bindCards;
        return fn(R, p, q);
      });
    };
  }
  app.route('/parent/missions', parentRoute(function (R, p, q) { return missionsHome(R, q.vue === 'faites' ? 'faites' : 'encours'); }, true), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/m/:id', parentRoute(function (R, p) { return missionGroupe(R, p.id); }), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/perso', parentRoute(function (R) { return missionPerso(R); }, true), { adult: 'f', nav: 'p:missions', bg: '#33122A' });
  app.route('/parent/missions/mots', parentRoute(function (R) { return mots(R); }, true), { adult: 'f', nav: 'p:missions', bg: '#12333A' });
  app.route('/parent/missions/jeu10', parentRoute(function (R) {
    var D = M.def('jeu10'), e = M.etat(R.d, 'jeu10');
    return '<main class="screen">' + sub(R, R.base, 'Missions', D ? D.titre : 'Mission') +
      '<div class="head"><span class="kicker" style="color:var(--gold)">Mission spéciale</span><h1 class="big sm">' + esc(D ? D.titre : '') + '</h1></div>' +
      (MC.missionParent ? MC.missionParent(R.d) : '') +
      '<p class="small" style="margin:0">Les copains choisis restent secrets : seuls ' + esc(prenom(R)) + ' et les éducs les voient.</p>' +
      (e.postes.length ? '<section class="sec"><h2 class="h2">Ses postes</h2>' + (MC.ptags ? MC.ptags(e.postes, true) : '') + '</section>' : '') + '</main>';
  }), { adult: 'f', nav: 'p:missions', bg: '#2E2612' });
  app.route('/parent/skills', parentRoute(function (R) { return skillsHome(R); }), { adult: 'f', nav: 'p:skills', bg: '#2E2612' });
  app.route('/parent/skills/:dom', parentRoute(function (R, p) { return skillsCarte(R, p.dom); }), { adult: 'f', nav: 'p:skills', bg: '#2E2612' });

  // les cartes Skills brillent sous le doigt, comme les cartes des postes
  function bindCards(root) { if (MC.bindTilt && root) MC.bindTilt(root); }
  MC.carteSkill = function (R, D, c, big) { return carteHtml(R, D, c, big); };
})();
