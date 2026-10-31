/* =========================================================
   Mode champion · M12 — SUIVI (parents, éducs, joueur)
   Progression d'un bilan à l'autre, détail des séances faites.
   ========================================================= */
window.MC = window.MC || {};

MC.suivi = (function () {
  var ui = MC.ui, C = MC.CONTENT, L = MC.logic, esc = ui.esc, icon = ui.icon;
  var ELAS = { fin: '10 kg', moyen: '20 kg', fort: '30 kg', '10': '10 kg', '20': '20 kg', '30': '30 kg' };
  var RESS = { facile: 'facile', bien: 'pile bien', dur: 'dur' };

  function isSm(r) { return !!(r && r.extra && r.extra.sm); }
  function bilanDef(n) { var l = MC.CONFIG.BILANS || []; for (var i = 0; i < l.length; i++) if (l[i].n === n) return l[i]; return { n: n, nom: 'Bilan ' + n }; }
  function valText(t, r) {
    var s = ui.fmtVal(r.valeur, t.unite, t.decimales);
    if (r.extra && r.extra.g !== undefined) s = 'G ' + ui.fmtVal(r.extra.g, 's') + ' · D ' + ui.fmtVal(r.extra.d, 's');
    if (r.extra && r.extra.elastique) s += ' + ' + (r.extra.nbElastique || 0) + ' (' + (ELAS[r.extra.elastique] || r.extra.elastique) + ')';
    if (isSm(r)) s += ' SM';
    return s;
  }
  function deltaHtml(t, last, prev) {
    if (!last || !prev) return '';
    if (isSm(last) !== isSm(prev)) return '<span class="delta none" title="Pas le même test (SM)">≠</span>';
    var d = Math.round((last.valeur - prev.valeur) * 10) / 10;
    if (!d) return '<span class="delta eq">=</span>';
    var good = t.moinsMieux ? d < 0 : d > 0;
    var txt = (d > 0 ? '+' : '−') + ui.fmtVal(Math.abs(d), t.unite, t.decimales);
    return '<span class="delta ' + (good ? 'up' : 'down') + '" title="' + (good ? 'Progrès' : 'Moins bien') + '">' + icon(good ? 'up' : 'down', 13) + esc(txt) + '</span>';
  }

  // ---------- progression d'un bilan à l'autre ----------
  // o.vide : texte si aucun bilan ; o.compact : sans le résumé des bilans
  function progression(records, o) {
    o = o || {};
    var recs = (records || []).filter(function (r) { return r.statut !== 'refuse' && /^\d+$/.test(String(r.bilan)); });
    if (!recs.length) return '<div class="empty">' + esc(o.vide || 'Pas encore de bilan noté.') + '</div>';
    var ns = [];
    recs.forEach(function (r) { var n = Number(r.bilan); if (ns.indexOf(n) < 0) ns.push(n); });
    ns.sort(function (a, b) { return a - b; });
    var resume = o.compact ? '' : '<div class="bilchips">' + ns.map(function (n) {
      var rs = recs.filter(function (r) { return Number(r.bilan) === n; }), wait = rs.filter(function (r) { return r.statut === 'attente'; }).length;
      var d = rs.map(function (r) { return r.date; }).filter(Boolean).sort()[0];
      return '<span class="bilchip"><b>' + esc(bilanDef(n).nom) + '</b>' + (d ? ' · ' + esc(ui.fmtDate(d)) : '') + ' · ' + rs.length + ' test' + (rs.length > 1 ? 's' : '') + (wait ? ' · <span style="color:var(--yellow)">' + wait + ' à confirmer</span>' : '') + '</span>';
    }).join('') + '</div>';
    var rows = C.TESTS.map(function (t) {
      var vals = ns.map(function (n) { return recs.filter(function (r) { return r.test === t.id && Number(r.bilan) === n; })[0] || null; });
      var have = vals.filter(Boolean);
      if (!have.length) return '';
      var cells = vals.map(function (r, i) {
        return '<span class="pv' + (r && r.statut === 'attente' ? ' wait' : '') + (r ? '' : ' none') + '"><small>B' + ns[i] + '</small>' + (r ? esc(valText(t, r)) : '—') + '</span>';
      }).join('');
      return '<li class="prow"><span class="pn">' + esc(t.court) + '</span><span class="pvals">' + cells + '</span>' + deltaHtml(t, have[have.length - 1], have[have.length - 2]) + '</li>';
    }).join('');
    return resume + '<ul class="plist">' + rows + '</ul>' +
      '<p class="small" style="margin:0">B0, B1… = les bilans de la saison. ' + icon('up', 12) + ' vert = progrès depuis le bilan d\'avant, en jaune = pas encore confirmé par un adulte.</p>';
  }

  // ---------- séances faites ----------
  function exoNom(e) {
    var ex = C.EXOS[e.id];
    if (!ex) return e.id;
    return e.mini && ex.mini ? ex.mini.nom : ex.nom;
  }
  function detail(s) {
    var d = s.details || {}, j = C.JOURS[s.type] || {};
    if (s.type === 'club') {
      if (d.match) return '<p class="small" style="margin:0">Match' + (d.adversaire ? ' contre ' + esc(d.adversaire) : '') + (d.score ? ' · score ' + esc(d.score) : '') + '</p>';
      return '<p class="small" style="margin:0">Entraînement au club.</p>';
    }
    if (s.type === 'recup') {
      var ch = (C.JOURS.recup.check || []).map(function (c, i) { var ok = d.check && d.check[i]; return '<li style="color:' + (ok ? 'var(--green)' : 'var(--dim)') + '">' + icon(ok ? 'check' : 'minus', 14) + ' ' + esc(c) + '</li>'; }).join('');
      return '<ul class="sdl">' + ch + '</ul>' + (d.jambes ? '<p class="small" style="margin:0">Jambes : ' + esc(String(d.jambes)) + '</p>' : '');
    }
    if (s.mode !== 'guidee' || !d.exos) {
      return '<p class="small" style="margin:0">Séance notée sans le guidage' + (d.niveau ? ' · niveau N' + esc(String(d.niveau)) : '') + (s.ressenti ? ' · ' + esc(RESS[s.ressenti] || s.ressenti) : '') + '.</p>';
    }
    var opts = d.options || {}, tags = [];
    if (d.duree) tags.push(Math.max(1, Math.round(d.duree / 60)) + ' min');
    if (opts.mini) tags.push('mini matériel');
    if (opts.leger) tags.push('version légère');
    if (opts.lourdes) tags.push('jambes lourdes');
    if (d.partiel) tags.push('arrêtée avant la fin');
    var rows = d.exos.map(function (e) {
      var fait = e.fait !== false && e.series && e.series.length;
      var res = (e.series || []).filter(function (x) { return x !== null && x !== undefined; }).join(' · ');
      return '<li class="sx' + (fait ? '' : ' off') + '"><span class="sxn">' + esc(exoNom(e)) + (e.niveau ? ' <span class="lvtag">N' + esc(String(e.niveau)) + '</span>' : '') + '</span>' +
        '<span class="sxd">' + esc(e.dose || '') + '</span><span class="sxr">' + (fait ? esc(res) : 'pas fait') + '</span>' +
        (e.ressenti ? '<span class="sxf f-' + esc(e.ressenti) + '">' + esc(RESS[e.ressenti] || e.ressenti) + '</span>' : '<span></span>') + '</li>';
    }).join('');
    return (tags.length ? '<p class="small" style="margin:0">' + esc(tags.join(' · ')) + '</p>' : '') + '<ul class="sxl">' + rows + '</ul>';
  }
  function info(s) {
    var d = s.details || {};
    var t = s.mode === 'guidee' ? 'séance guidée' : 'notée';
    if (s.ressenti) t += ' · ' + (RESS[s.ressenti] || s.ressenti);
    if (d.niveau) t += ' · N' + d.niveau;
    if (s.type === 'club' && d.match) t = 'match' + (d.adversaire ? ' contre ' + d.adversaire : '') + (d.score ? ' · ' + d.score : '');
    if (d.partiel) t += ' · pas finie';
    return t;
  }
  // (v36) les bravos des éducs reçus pour cette séance : « 👏 Cyril · Julien : « Super ! » » (« vous » : les miens, côté éduc)
  function bravosDe(s, o) {
    var l = (o.bravos || []).filter(function (b) { return b.seanceId === s.id; });
    if (!l.length) return '';
    return '<span class="t2 bvw">👏 ' + l.map(function (b) { return '<b>' + esc(o.moi && b.parQui === o.moi ? 'vous' : b.parNom || 'un éduc') + '</b>' + (b.mot ? ' : « ' + esc(b.mot) + ' »' : ''); }).join(' · ') + '</span>';
  }
  // o.bravo(s) : le bouton « 👏 Bravo » des éducs (js/bravos.js), à droite de la ligne
  function line(s, o) {
    o = o || {};
    var j = C.JOURS[s.type] || {}, has = !!s.details, bt = o.bravo ? o.bravo(s) : '';
    var sum = '<span class="dia" style="--dc:' + (j.color || '#888') + '"></span><span class="grow"><span class="t1">' + esc(j.nomSeance || s.type) + '</span><span class="t2">' + esc(ui.fmtDate(s.date)) + ' · ' + esc(info(s)) + '</span>' + bravosDe(s, o) + '</span>';
    var inner = has ? '<details><summary>' + sum + '<span class="chev">' + icon('right', 16) + '</span></summary><div class="sbody">' + detail(s) + '</div></details>' : sum;
    if (bt) return '<li class="li bvl' + (has ? ' sess' : '') + '">' + (has ? inner : '<div class="bvl-in">' + inner + '</div>') + bt + '</li>';
    return has ? '<li class="li sess">' + inner + '</li>' : '<li class="li">' + inner + '</li>';
  }
  // o.max : nombre de séances visibles avant « Voir plus » ; o.bravos, o.moi, o.bravo : les bravos (v36)
  function seances(list, o) {
    o = o || {};
    var all = (list || []).slice().sort(function (a, b) { return a.date === b.date ? (a.cree < b.cree ? 1 : -1) : (a.date < b.date ? 1 : -1); });
    if (!all.length) return '<div class="empty">' + esc(o.vide || 'Aucune séance notée pour l\'instant.') + '</div>';
    var max = o.max || 8, first = all.slice(0, max), rest = all.slice(max), ln = function (s) { return line(s, o); };
    return '<ul class="list">' + first.map(ln).join('') + '</ul>' +
      (rest.length ? '<details class="more"><summary class="small" style="cursor:pointer;color:var(--cyan);min-height:40px;display:flex;align-items:center">Voir les ' + rest.length + ' séances plus anciennes</summary><ul class="list" style="margin-top:6px">' + rest.map(ln).join('') + '</ul></details>' : '');
  }

  // ---------- progrès du groupe (éducs) ----------
  // joueurs : [{ joueur, records }] ; renvoie, pour un test, la liste triée par progrès
  function groupe(joueurs, testId) {
    var t = C.TESTS.filter(function (x) { return x.id === testId; })[0];
    if (!t) return '';
    var rows = [];
    joueurs.forEach(function (p) {
      if (!p.joueur.actif) return;
      var recs = (p.records || []).filter(function (r) { return r.test === t.id && r.statut !== 'refuse' && /^\d+$/.test(String(r.bilan)); })
        .sort(function (a, b) { return Number(a.bilan) - Number(b.bilan); });
      var last = recs[recs.length - 1] || null, prev = recs[recs.length - 2] || null;
      var d = last && prev && isSm(last) === isSm(prev) ? last.valeur - prev.valeur : null;
      if (d !== null && t.moinsMieux) d = -d;
      rows.push({ p: p, last: last, prev: prev, d: d, recs: recs });
    });
    rows.sort(function (a, b) {
      if ((a.d === null) !== (b.d === null)) return a.d === null ? 1 : -1;
      if (a.d !== b.d && a.d !== null) return b.d - a.d;
      if (!a.last !== !b.last) return a.last ? -1 : 1;
      return a.p.joueur.prenom.localeCompare(b.p.joueur.prenom, 'fr');
    });
    return '<ul class="list">' + rows.map(function (x) {
      var k = x.p.joueur;
      var vals = x.recs.map(function (r) { return '<span class="pv' + (r.statut === 'attente' ? ' wait' : '') + '"><small>B' + esc(String(r.bilan)) + '</small>' + esc(valText(t, r)) + '</span>'; }).join('');
      return '<li class="li"><a href="#/educ/joueur/' + esc(k.id) + '" class="row grow" style="gap:10px;text-decoration:none;color:inherit;min-width:0">' + ui.avatar(k.prenom, k.couleur, 32) +
        '<span class="grow" style="min-width:0"><span class="t1">' + esc(k.prenom) + '</span><span class="pvals" style="margin-top:4px">' + (vals || '<span class="small">pas de bilan</span>') + '</span></span></a>' +
        deltaHtml(t, x.last, x.prev) + '</li>';
    }).join('') + '</ul>';
  }

  return { progression: progression, seances: seances, detail: detail, groupe: groupe, valText: valText, bravosDe: bravosDe };
})();
