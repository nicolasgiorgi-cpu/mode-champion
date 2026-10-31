/* =========================================================
   Mode champion · M12 — NOTIFICATIONS : la cloche (v33, 31/10/2026)
   Ce qui s'est passé, pour l'enfant, le parent ou l'éduc : séances, résultats, missions, niveaux, étoiles, +1, compos…
   Tout est calculé sur l'appareil à partir des données déjà chargées : rien de plus côté serveur.
   Gardé sur l'appareil, par profil (clé « mc-notif:<rôle>:<id> ») :
   - vus : l'heure à laquelle chaque événement a été vu pour la 1re fois sur l'appareil (0 = déjà là avant) ;
   - lu  : l'heure de la dernière visite de la cloche. Non lu = vu après la dernière visite ;
   - off : les catégories éteintes par la personne (ses réglages : ce qu'elle ne veut pas recevoir).
   La 1re fois sur un appareil, tout ce qui existe déjà est « lu » (pas d'avalanche).
   Une partie fermée aux familles (MC.CONFIG.ENFANTS : Skills, missions des éducs) n'a pas de catégorie
   pour les enfants et les parents tant qu'elle reste fermée.
   Fichier sans écran (testé seul : tests/test_notifs.js) ; la cloche et les écrans : js/v-notifs.js.
   ========================================================= */
window.MC = window.MC || {};

MC.notifs = (function () {
  var JOUR = 86400000, FENETRE = 30 * JOUR, OUBLI = 45 * JOUR, GRACE = 3 * 60000, MAX = 80;
  function ouvert(k) { return MC.ouvert ? MC.ouvert(k) : true; }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function b(s) { return '<b>' + esc(s) + '</b>'; }
  function ms(iso) { var t = Date.parse(iso || ''); return isNaN(t) ? 0 : t; }
  function court(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function pl(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs || un + 's' : un); }

  // ---------- les catégories, par profil ----------
  // [clé, libellé, explication, icône, couleur, partie (pour les familles : seulement quand elle est ouverte)]
  var CATS = {
    e: [
      ['seance', 'Séances des enfants', 'Un enfant a fait une séance de prépa.', 'pulse', '#38E8FF'],
      ['bilan', 'Bilans et défis', 'Un enfant a noté son bilan ou un défi.', 'trend', '#3DFFB0'],
      ['mission', 'Réponses aux missions', 'Choisis ton poste, copains, vidéo, QCM, et le mot pour les éducs.', 'target', '#FF7FBC'],
      ['etoile', 'Demandes d\'étoiles', 'Un enfant demande une étoile Skills.', 'star', '#FFC23D'],
      ['niveau', 'Niveaux', 'Un niveau changé par l\'enfant, un parent ou un autre éduc.', 'up', '#C9AEFF'],
      ['compo', 'Compos', 'Un vote ou une contre-proposition d\'un autre éduc.', 'kids', '#FF8A3D']
    ],
    f: [
      ['seance', 'Séances', 'Votre enfant a fait une séance de prépa.', 'pulse', '#38E8FF'],
      ['bravo', 'Bravos des éducs', 'Un éduc a félicité votre enfant pour sa séance.', 'heart', '#FFC23D'],
      ['confirmer', 'Résultats à confirmer', 'Votre enfant a noté son bilan ou un défi.', 'check', '#FF4FA3'],
      ['mission', 'Missions faites', 'Votre enfant a fait une mission.', 'target', '#FF7FBC'],
      ['niveau', 'Niveaux', 'Un niveau de votre enfant a changé.', 'up', '#C9AEFF'],
      ['skills', 'Étoiles Skills', 'Un éduc a validé une étoile de votre enfant.', 'star', '#FFC23D', ['skills']],
      ['mots', '+1 et mots des éducs', 'Un encouragement d\'un éduc à votre enfant.', 'plus1', '#3DFFB0', ['missionsEducs']],
      ['nouvelle', 'Nouvelles missions', 'Une mission donnée par les éducs.', 'flag', '#FF8A3D', ['missionsEducs', 'skills']]
    ],
    k: [
      ['resultat', 'Tes résultats', 'Un parent ou un éduc a confirmé (ou refusé) un de tes résultats.', 'check', '#3DFFB0'],
      ['bravo', 'Les bravos de tes éducs', 'Un éduc te dit bravo pour ta séance.', 'heart', '#FFC23D'],
      ['nouvelle', 'Nouvelles missions', 'Une nouvelle mission à faire.', 'target', '#FF7FBC'],
      ['niveau', 'Tes niveaux', 'Un parent ou un éduc a changé un de tes niveaux.', 'up', '#C9AEFF'],
      ['etoile', 'Tes étoiles', 'Un éduc a validé une de tes étoiles.', 'star', '#FFC23D', ['skills']],
      ['mots', '+1 et mots', 'Un encouragement de tes éducs.', 'plus1', '#38E8FF', ['missionsEducs']],
      ['demande', 'Tes demandes d\'étoiles', 'La réponse de tes éducs.', 'spark', '#FF8A3D', ['skills']]
    ]
  };
  function cats(role) {
    return (CATS[role] || []).filter(function (c) { return role === 'e' || !c[5] || c[5].some(ouvert); })
      .map(function (c) { return { id: c[0], nom: c[1], info: c[2], icon: c[3], color: c[4] }; });
  }
  function catOf(role, id) { var l = cats(role); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }

  // ---------- libellés ----------
  function nomSeance(s) {
    var J = MC.CONTENT && MC.CONTENT.JOURS && MC.CONTENT.JOURS[s.type];
    if (s.type === 'club') return s.details && s.details.match ? 'un match' : 'l\'entraînement au club';
    if (s.type === 'recup') return 'la récup';
    return J ? (J.nomSeance || J.theme || s.type).replace(/^La séance de /, 'la séance de ') : 'une séance';
  }
  // (v36) « ta séance de Cros », « son entraînement au club », « sa récup » (ta : pour l'enfant ; sinon sa / son)
  function pour(s, ta) {
    var n = nomSeance(s || {});
    if (/^la séance/.test(n)) return (ta ? 'ta' : 'sa') + n.slice(2);
    if (n === 'la récup') return ta ? 'ta récup' : 'sa récup';
    if (/^l'entraînement/.test(n)) return (ta ? 'ton ' : 'son ') + n.slice(2);
    if (n === 'un match') return ta ? 'ton match' : 'son match';
    return ta ? 'ta séance' : 'sa séance';
  }
  // « 👏 Cyril te dit bravo pour ta séance de Cros ! » ; avec un mot : « … pour ta séance de Cros : « Super ! » »
  function bravoTxt(x, debut, fin) {
    return debut + (x.mot ? ' : « ' + esc(court(x.mot, 90)) + ' »' : fin);
  }
  // un mot ajouté ou changé = une ligne nouvelle (l'heure du mot dans l'identifiant)
  function bravoId(x) { return 'bv:' + x.id + (x.mot ? ':m:' + (x.maj || '') : ''); }
  function seanceDe(l, id) { for (var i = 0; i < (l || []).length; i++) if (l[i].id === id) return l[i]; return null; }
  function nomBilan(bilan) {
    var l = (MC.CONFIG && MC.CONFIG.BILANS) || [], n = Number(bilan);
    for (var i = 0; i < l.length; i++) if (l[i].n === n) return l[i].nom;
    return 'Bilan ' + bilan;
  }
  function nomTest(id) { var T = (MC.CONTENT && MC.CONTENT.TESTS) || []; for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i].court || T[i].nom; return id; }
  function nomCle(cle) { var c = MC.CONTENT && MC.CONTENT.CLES && MC.CONTENT.CLES[cle]; return c ? c.nom : cle; }
  function nomEtoile(d, e) { var s = MC.SK && MC.SK.star ? MC.SK.star(d, e) : null; return s ? s.nom : e; }
  function nomMission(id, defs) {
    var D = MC.missions && MC.missions.def ? MC.missions.def(id) : null;
    if (D) return D.titre;
    for (var i = 0; i < (defs || []).length; i++) if (defs[i].id === id) return defs[i].titre || 'Mission';
    return 'Mission';
  }
  // qui a confirmé : « Parent » ou « Éduc Cyril »
  function par(qui, toi) { if (!qui) return ''; if (qui === 'Parent') return toi ? ' par ta famille' : ' par sa famille'; return ' par ' + qui.replace(/^Éduc /, ''); }
  function changes(ch) {
    var l = Object.keys(ch || {}).slice(0, 3).map(function (k) { var c = ch[k] || {}; return nomCle(k) + ' N' + c.de + ' → N' + c.a; });
    return l.join(', ') + (Object.keys(ch || {}).length > 3 ? '…' : '');
  }

  // ---------- résultats : un bilan = un groupe ; un défi = un résultat ----------
  function groupes(records) {
    var g = {}, out = [];
    (records || []).forEach(function (r) {
      if (!r || !r.id) return;
      if (/^\d+$/.test(String(r.bilan))) {
        var k = String(r.bilan);
        if (!g[k]) { g[k] = { bilan: k, recs: [] }; out.push(g[k]); }
        g[k].recs.push(r);
      } else out.push({ defi: true, recs: [r] });
    });
    out.forEach(function (x) {
      x.t = 0; x.attente = 0;
      x.recs.forEach(function (r) { var t = ms(r.cree); if (t > x.t) x.t = t; if (r.statut === 'attente') x.attente++; });
    });
    return out;
  }

  // ---------- ÉDUC : tout le groupe ----------
  function educ(g, cd) {
    var out = [];
    if (!g) return out;
    var me = g.moi || {}, moiNom = 'Éduc ' + (me.nom || ''), defs = g.defmissions || [];
    (g.joueurs || []).forEach(function (p) {
      var j = p.joueur;
      if (!j || !j.actif) return;
      var who = b(j.prenom), fiche = '#/educ/joueur/' + encodeURIComponent(j.id);
      (p.seances || []).forEach(function (s) {
        // (v36) bv : le bouton « 👏 Bravo » sur la ligne (js/bravos.js)
        out.push({ id: 's:' + s.id, cat: 'seance', t: ms(s.cree), txt: who + ' a fait ' + esc(nomSeance(s)) + '.', href: fiche + '?t=prepa', bv: { j: j.id, s: s } });
      });
      groupes(p.records).forEach(function (x) {
        if (x.defi) { var r = x.recs[0]; out.push({ id: 'r:' + r.id, cat: 'bilan', t: x.t, txt: who + ' a relevé un défi : ' + esc(nomTest(r.test)) + '.', href: fiche + '?t=prepa' }); return; }
        out.push({ id: 'b:' + j.id + ':' + x.bilan, cat: 'bilan', t: x.t, txt: who + ' a noté son ' + esc(nomBilan(x.bilan)) + ' (' + pl(x.recs.length, 'résultat') + ').', href: fiche + '?t=prepa' });
      });
      (p.missions || []).forEach(function (m) {
        var r = m.reponses || {}, t = ms(m.maj), mot = r.message ? ' 💬 « ' + esc(court(r.message, 90)) + ' »' : '';
        if (m.mission === 'jeu10') {
          if (!(r.postes && r.postes.length) && !r.copainsFait) return;
          var quoi = (r.postes && r.postes.length ? '« Choisis ton poste »' : '') + (r.copainsFait ? (r.postes && r.postes.length ? ' et ' : '') + '« Avec qui tu aimes jouer »' : '');
          out.push({ id: 'm:' + m.id + ':' + (m.maj || ''), cat: 'mission', t: t, txt: who + ' a répondu à ' + quoi + '.' + mot, href: '#/educ/mission/poste' });
          return;
        }
        if (!m.faite && !r.vu && !r.ans) return;
        var sc = r.ans ? ' (' + (r.score || 0) + '/' + (r.total || 0) + ')' : '';
        out.push({ id: 'm:' + m.id + ':' + (m.maj || ''), cat: 'mission', t: t, txt: who + ' a répondu à la mission « ' + esc(nomMission(m.mission, defs)) + ' »' + sc + '.', href: '#/educ/missions/m/' + encodeURIComponent(m.mission) });
      });
      (p.demandes || []).forEach(function (x) {
        var et = '« ' + esc(nomEtoile(x.domaine, x.etoile)) + ' »';
        out.push({ id: 'd:' + x.id, cat: 'etoile', t: ms(x.cree), txt: x.sorte === 'briller' ? who + ' dit avoir fait briller l\'étoile ' + et + ' au plateau.' : who + ' demande l\'étoile ' + et + '.', href: '#/educ/skills' });
      });
      (p.journal || []).forEach(function (n) {
        var d = n.data || {};
        if (n.type === 'niveau' && d.cle) out.push({ id: 'n:' + n.id, cat: 'niveau', t: ms(n.cree), txt: who + (Number(d.a) > Number(d.de) ? ' passe en N' : ' revient en N') + esc(d.a) + ' : ' + esc(nomCle(d.cle)) + '.', href: fiche + '?t=prepa' });
        else if (n.type === 'niveau_adulte' && d.par !== moiNom) out.push({ id: 'n:' + n.id, cat: 'niveau', t: ms(n.cree), txt: 'Niveaux de ' + who + ' changés' + esc(par(d.par)) + ' : ' + esc(changes(d.changes)) + '.', href: fiche + '?t=prepa' });
      });
    });
    // les compos : un vote demandé, les votes sur ma compo, une contre-proposition, la réponse à la mienne
    if (cd) {
      var evts = {}, noms = {};
      (cd.evenements || []).forEach(function (e) { evts[e.id] = e; });
      (cd.educs || []).forEach(function (e) { noms[e.id] = e.nom; });
      var lien = function (c) { return '#/educ/compo/' + encodeURIComponent(c.evenementId) + (c.partie ? '?p=' + encodeURIComponent(c.partie) : ''); };
      var dequoi = function (c) {
        var e = evts[c.evenementId], q = !c.partie ? 'du plateau' : c.partie === 'ateliers' ? 'des ateliers' : 'des matchs';
        var dt = e && e.debut ? String(e.debut).slice(8, 10) + '/' + String(e.debut).slice(5, 7) : '';
        return 'la compo ' + q + (e ? ' « ' + esc(court(e.titre, 40)) + ' »' : '') + (dt ? ' du ' + esc(dt) : '');
      };
      var byId = {};
      (cd.compos || []).forEach(function (c) {
        byId[c.id] = c;
        if (c.statut === 'retiree') return;
        if (c.statut === 'vote' && c.auteur !== me.id && !(c.votes && c.votes[me.id] !== undefined)) out.push({ id: 'cv:' + c.id, cat: 'compo', t: ms(c.cree), txt: b(c.auteurNom || 'Un éduc') + ' demande votre vote sur ' + dequoi(c) + '.', href: lien(c) });
        if (c.auteur === me.id) Object.keys(c.votes || {}).forEach(function (eid) {
          if (eid === me.id) return;
          out.push({ id: 'vo:' + c.id + ':' + eid, cat: 'compo', t: 0, t0: ms(c.maj), txt: b(noms[eid] || 'Un éduc') + ' a voté sur ' + dequoi(c) + '.', href: lien(c) });
        });
      });
      (cd.avis || []).forEach(function (a) {
        var c = byId[a.compoId];
        if (!c || a.statut === 'retiree') return;
        if (a.auteur !== me.id) out.push({ id: 'av:' + a.id, cat: 'compo', t: ms(a.cree), txt: b(a.auteurNom || 'Un éduc') + ' propose de modifier ' + dequoi(c) + '.', href: '#/educ/avis/' + encodeURIComponent(a.id) });
        else if (a.statut === 'acceptee' || a.statut === 'refusee') out.push({ id: 'ar:' + a.id + ':' + a.statut, cat: 'compo', t: ms(a.maj), txt: b(a.parQui || 'Un éduc') + (a.statut === 'acceptee' ? ' a accepté' : ' a refusé') + ' votre contre-proposition sur ' + dequoi(c) + '.', href: '#/educ/avis/' + encodeURIComponent(a.id) });
      });
    }
    return out;
  }

  // ---------- PARENT : ses enfants ----------
  function parent(fam) {
    var out = [], seen = {};
    if (!fam) return out;
    (fam.enfants || []).forEach(function (d) {
      var j = d.joueur;
      if (!j) return;
      var who = b(j.prenom), k = '?k=' + encodeURIComponent(j.id);
      (d.seances || []).forEach(function (s) {
        out.push({ id: 's:' + s.id, cat: 'seance', t: ms(s.cree), txt: who + ' a fait ' + esc(nomSeance(s)) + '.', href: '#/parent' + k });
      });
      // (v36) les bravos des éducs ; un mot ajouté après coup = une nouvelle ligne
      (d.bravos || []).forEach(function (x) {
        var s = seanceDe(d.seances, x.seanceId);
        out.push({ id: bravoId(x), cat: 'bravo', t: ms(x.maj || x.cree), txt: bravoTxt(x, '👏 ' + b(x.parNom || 'Un éduc') + ' a dit bravo à ' + who + ' pour ' + esc(pour(s, false)), '.'), href: '#/parent' + k });
      });
      groupes(d.records).forEach(function (x) {
        var att = x.attente ? ' <span class="nt-att">À confirmer</span>' : '';
        if (x.defi) { var r = x.recs[0]; out.push({ id: 'r:' + r.id, cat: 'confirmer', t: x.t, txt: who + ' a relevé un défi : ' + esc(nomTest(r.test)) + '.' + att, href: '#/parent' + k }); return; }
        out.push({ id: 'b:' + j.id + ':' + x.bilan, cat: 'confirmer', t: x.t, txt: who + ' a noté son ' + esc(nomBilan(x.bilan)) + ' (' + pl(x.recs.length, 'résultat') + ').' + att, href: '#/parent' + k });
      });
      (d.missions || []).forEach(function (m) {
        var r = m.reponses || {}, t = ms(m.maj);
        if (m.mission === 'jeu10') {
          if (r.postes && r.postes.length) out.push({ id: 'm:' + m.id + ':poste', cat: 'mission', t: t, txt: who + ' a fait la mission « Choisis ton poste ».', href: '#/parent/missions' + k });
          if (r.copainsFait && ouvert('copains')) out.push({ id: 'm:' + m.id + ':copains', cat: 'mission', t: t, txt: who + ' a fait la mission « Avec qui tu aimes jouer ».', href: '#/parent/missions' + k });
          return;
        }
        if (m.faite && ouvert('missionsEducs')) out.push({ id: 'm:' + m.id, cat: 'mission', t: t, txt: who + ' a fait la mission « ' + esc(nomMission(m.mission, d.defmissions)) + ' ».', href: '#/parent/missions' + k });
      });
      (d.journal || []).forEach(function (n) {
        var dd = n.data || {};
        if (n.type === 'niveau' && dd.cle) out.push({ id: 'n:' + n.id, cat: 'niveau', t: ms(n.cree), txt: who + (Number(dd.a) > Number(dd.de) ? ' passe en N' : ' revient en N') + esc(dd.a) + ' : ' + esc(nomCle(dd.cle)) + '.', href: '#/parent' + k });
        else if (n.type === 'niveau_adulte' && /^Éduc /.test(dd.par || '')) out.push({ id: 'n:' + n.id, cat: 'niveau', t: ms(n.cree), txt: 'Niveaux de ' + who + ' changés' + esc(par(dd.par)) + ' : ' + esc(changes(dd.changes)) + '.', href: '#/parent' + k });
      });
      if (ouvert('skills')) (d.etoiles || []).forEach(function (e) {
        var et = '« ' + esc(nomEtoile(e.domaine, e.etoile)) + ' »';
        out.push({ id: 'e:' + e.id, cat: 'skills', t: ms(e.cree), txt: (e.parNom ? b(e.parNom) : 'Un éduc') + ' a validé l\'étoile ' + et + ' de ' + who + '.', href: '#/parent/skills' + k });
        if (e.brille) out.push({ id: 'eb:' + e.id, cat: 'skills', t: ms(e.maj), txt: 'L\'étoile ' + et + ' de ' + who + ' brille : vue au plateau.', href: '#/parent/skills' + k });
      });
      if (ouvert('missionsEducs')) (d.encouragements || []).forEach(function (x) {
        if (x.missionId && !ouvert('skills')) return;
        out.push({ id: 'x:' + x.id, cat: 'mots', t: ms(x.cree), txt: x.mot ? 'Mot de ' + b(x.parNom || 'un éduc') + ' pour ' + who + ' : « ' + esc(court(x.mot, 90)) + ' »' : '+1 de ' + b(x.parNom || 'un éduc') + ' pour ' + who + '.', href: '#/parent/missions' + k });
      });
      (d.defmissions || []).forEach(function (m) {
        if (m.statut !== 'active' || seen['dm:' + m.id]) return;
        if (m.sorte === 'etoile' ? !ouvert('skills') : !ouvert('missionsEducs')) return;
        seen['dm:' + m.id] = 1;
        out.push({ id: 'dm:' + m.id, cat: 'nouvelle', t: ms(m.cree), txt: m.sorte === 'etoile' ? 'Nouvelle mission principale pour ' + who + '.' : 'Nouvelle mission des éducs : « ' + esc(court(m.titre, 60)) + ' ».', href: '#/parent/missions' + k });
      });
    });
    return out;
  }

  // ---------- ENFANT : lui ----------
  function enfant(me) {
    var out = [];
    if (!me || !me.joueur) return out;
    (me.bravos || []).forEach(function (x) {
      var s = seanceDe(me.seances, x.seanceId);
      // le lien : Ma semaine (la carte des 7 derniers jours) ; plus ancien, Ma progression (sous la séance)
      var t = ms(x.maj || x.cree);
      out.push({ id: bravoId(x), cat: 'bravo', t: t, txt: bravoTxt(x, '👏 ' + b(x.parNom || 'Ton éduc') + ' te dit bravo pour ' + esc(pour(s, true)), ' !'), href: Date.now() - t < 6.5 * JOUR ? '#/semaine' : '#/progression' });
    });
    groupes(me.records).forEach(function (x) {
      var faits = x.recs.filter(function (r) { return r.statut === 'ok' || r.statut === 'refuse'; });
      if (!faits.length) return;
      var ok = faits.filter(function (r) { return r.statut === 'ok'; }).length, no = faits.length - ok, q = par(faits[faits.length - 1].parQui, true);
      if (x.defi) {
        var r = x.recs[0];
        out.push({ id: 'rs:' + r.id + ':' + r.statut, cat: 'resultat', t: 0, t0: x.t, txt: 'Ton défi ' + b(nomTest(r.test)) + (r.statut === 'ok' ? ' est confirmé' : ' n\'a pas été confirmé') + esc(q) + '.', href: '#/bilans' });
        return;
      }
      out.push({ id: 'rs:' + x.bilan + ':' + ok + ':' + no, cat: 'resultat', t: 0, t0: x.t,
        txt: (ok ? 'Ton ' + b(nomBilan(x.bilan)) + ' : ' + pl(ok, 'résultat confirmé', 'résultats confirmés') : 'Ton ' + b(nomBilan(x.bilan))) + (no ? (ok ? ', ' : ' : ') + pl(no, 'refusé') : '') + esc(q) + '.', href: '#/bilans' });
    });
    if (MC.missions && MC.missions.aFaire) MC.missions.aFaire(me).forEach(function (x) {
      var D = (me.defmissions || []).filter(function (m) { return m.id === x.id; })[0], M = MC.missions.def ? MC.missions.def(x.id) : null;
      out.push({ id: 'nm:' + x.id, cat: 'nouvelle', t: D ? ms(D.cree) : 0, t0: M && M.debut ? ms(M.debut + 'T08:00:00') : 0, txt: 'Nouvelle mission : ' + b(x.titre) + '.', href: D ? '#/missions/m/' + encodeURIComponent(x.id) : (M && M.lien) || '#/missions' });
    });
    if (ouvert('skills')) (me.defmissions || []).forEach(function (m) {
      if (m.sorte === 'etoile' && m.statut === 'active') out.push({ id: 'nm:' + m.id, cat: 'nouvelle', t: ms(m.cree), txt: 'Nouvelle mission principale de ' + b(m.parNom || 'tes éducs') + '.', href: '#/missions/perso' });
    });
    (me.journal || []).forEach(function (n) {
      var d = n.data || {};
      if (n.type === 'niveau_adulte') out.push({ id: 'n:' + n.id, cat: 'niveau', t: ms(n.cree), txt: 'Tes niveaux ont changé' + esc(par(d.par, true)) + ' : ' + esc(changes(d.changes)) + '.', href: '#/niveaux' });
    });
    if (ouvert('skills')) {
      (me.etoiles || []).forEach(function (e) {
        out.push({ id: 'e:' + e.id, cat: 'etoile', t: ms(e.cree), txt: (e.parNom ? b(e.parNom) + ' a validé' : 'Tes éducs ont validé') + ' ton étoile « ' + esc(nomEtoile(e.domaine, e.etoile)) + ' » !', href: '#/skills/' + encodeURIComponent(e.domaine) });
      });
      (me.demandes || []).forEach(function (x) {
        if (x.statut !== 'oui' && x.statut !== 'pasvu') return;
        out.push({ id: 'dr:' + x.id + ':' + x.statut, cat: 'demande', t: ms(x.reponseLe || x.maj), txt: 'Ta demande « ' + esc(nomEtoile(x.domaine, x.etoile)) + ' » : ' + (x.statut === 'oui' ? 'c\'est validé !' : 'pas encore vue, continue !'), href: '#/skills/' + encodeURIComponent(x.domaine) });
      });
    }
    if (ouvert('missionsEducs')) (me.encouragements || []).forEach(function (x) {
      if (x.missionId && !ouvert('skills')) return;
      out.push({ id: 'x:' + x.id, cat: 'mots', t: ms(x.cree), txt: x.mot ? 'Mot de ' + b(x.parNom || 'ton éduc') + ' : « ' + esc(court(x.mot, 90)) + ' »' : '+1 de ' + b(x.parNom || 'ton éduc') + ' !', href: '#/missions/mots' });
    });
    return out;
  }

  // tous les événements d'un profil, à partir de ses données ; null = données pas encore là (on ne touche à rien)
  function events(role, data) {
    if (!data) return null;
    // l'éduc : le groupe ET les compos (sinon les compos arrivées après compteraient toutes comme nouvelles)
    if (role === 'e') return data.group && data.compos ? educ(data.group, data.compos) : null;
    if (role === 'f') return data.family ? parent(data.family) : null;
    if (role === 'k') return data.me ? enfant(data.me) : null;
    return null;
  }

  // ---------- ce qui est gardé sur l'appareil ----------
  function key(role, id) { return 'mc-notif:' + role + ':' + id; }
  function stor(st) { if (st) return st; try { return window.localStorage; } catch (e) { return null; } }
  function load(st, k) {
    var v = null;
    try { v = JSON.parse((st && st.getItem(k)) || 'null'); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') return null;
    if (!v.vus || typeof v.vus !== 'object') v.vus = {};
    if (!v.off || typeof v.off !== 'object') v.off = {};
    v.lu = Number(v.lu) || 0;
    return v;
  }
  function save(st, k, v) { try { if (st) st.setItem(k, JSON.stringify(v)); } catch (e) { } }

  // l'état de la cloche : la liste (catégories allumées, 30 derniers jours, les nouveaux d'abord), le nombre de non lus
  // evs : events(...) ; now : l'heure ; st : le stockage (localStorage par défaut)
  // Jamais d'avalanche de « nouveau » :
  // - la 1re fois sur l'appareil (init), tout ce qui existe est lu ; pendant 3 min encore (GRACE), ce qui date d'avant
  //   aussi (la réponse fraîche du serveur arrive juste après la copie gardée sur l'appareil) ;
  // - une sorte qui apparaît (une partie de l'appli ouverte aux familles) : ce qu'elle contient déjà est lu ;
  // - plus de 45 jours : jamais nouveau, et pas gardé (le stockage reste petit ; absent = lu).
  function etat(role, id, evs, now, st) {
    st = stor(st);
    var k = key(role, id), s = load(st, k), changed = false;
    if (!s) s = { lu: now, vus: {}, off: {} };
    var first = !s.init;
    if (first) { s.init = now; s.lu = Math.max(Number(s.lu) || 0, now); changed = true; }
    var grace = now - s.init < GRACE, known = s.cats && typeof s.cats === 'object' ? s.cats : null, nowCats = {}, ids = {};
    cats(role).forEach(function (c) { nowCats[c.id] = 1; });
    (evs || []).forEach(function (ev) {
      ids[ev.id] = 1;
      if (Object.prototype.hasOwnProperty.call(s.vus, ev.id)) return;
      var t = ev.t || ev.t0 || 0;
      if (t && now - t > OUBLI) return;
      var vieux = first || (grace && t && t <= s.init) || (known && !known[ev.cat]);
      s.vus[ev.id] = vieux ? 0 : now; changed = true;
    });
    Object.keys(s.vus).forEach(function (x) { if (!ids[x]) { delete s.vus[x]; changed = true; } });   // ce qui n'existe plus
    if (!known || Object.keys(nowCats).sort().join() !== Object.keys(known).sort().join()) { s.cats = nowCats; changed = true; }
    if (changed) save(st, k, s);
    var okCats = {};
    Object.keys(nowCats).forEach(function (c) { if (!s.off[c]) okCats[c] = 1; });
    var list = (evs || []).filter(function (ev) { return okCats[ev.cat]; }).map(function (ev) {
      var vu = s.vus[ev.id] || 0, o = {};
      for (var x in ev) o[x] = ev[x];
      o.quand = ev.t || vu || ev.t0 || 0;
      o.nouveau = vu > s.lu;
      return o;
    }).filter(function (o) { return o.nouveau || (o.quand && now - o.quand < FENETRE); });
    list.sort(function (a, b2) { return a.nouveau !== b2.nouveau ? (a.nouveau ? -1 : 1) : b2.quand - a.quand; });
    list = list.slice(0, MAX);
    return { list: list, n: list.filter(function (o) { return o.nouveau; }).length, lu: s.lu, off: s.off };
  }
  // la cloche a été ouverte : tout ce qui est là est lu
  function marquerLu(role, id, now, st) {
    st = stor(st);
    var k = key(role, id), s = load(st, k) || { vus: {}, off: {} };   // sans « init » : la 1re cloche n'en fera pas une avalanche
    s.lu = now; save(st, k, s);
  }
  // réglages : allumer ou éteindre une catégorie
  function regler(role, id, cat, on, st) {
    st = stor(st);
    var k = key(role, id), s = load(st, k) || { lu: Date.now(), vus: {}, off: {} };
    if (on) delete s.off[cat]; else s.off[cat] = 1;
    save(st, k, s);
  }
  function reglages(role, id, st) { var s = load(stor(st), key(role, id)); return s ? s.off : {}; }

  return { CATS: CATS, cats: cats, catOf: catOf, events: events, pour: pour, etat: etat, marquerLu: marquerLu, regler: regler, reglages: reglages, key: key, FENETRE: FENETRE };
})();
