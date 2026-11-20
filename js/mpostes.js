/* =========================================================
   Mode champion · M12 — MISSIONS DE POSTE, épisode 1 (v92, 20/11/2026) : la partie sans écran
   L'épisode lui-même est une page à part (missions-postes/index.html, reprise de la maquette validée par Nicolas) ;
   pour l'instant c'est un essai pour les éducs : les enfants ne la voient pas encore.
   Ici : les 8 postes de l'épisode, l'adresse de la page, la lecture des messages de la page (postMessage, même site),
   et le rangement des avis des éducs par poste puis par situation (1 à 4, puis la fin de l'épisode = 0).
   Fichier sans écran (testé seul : tests/test_mpostes.js) ; les écrans : js/v-mpostes.js.
   ========================================================= */
window.MC = window.MC || {};

MC.mpostes = (function () {
  // les postes de l'épisode, dans l'ordre du terrain (mêmes identifiants et couleurs que la page)
  var POSTES = [
    { id: 'pil', nom: 'Pilier', court: 'Pil', col: '#FF6A3D' }, { id: 'tal', nom: 'Talonneur', court: 'Tal', col: '#FE8A00' },
    { id: 'l3', nom: '3e ligne', court: '3L', col: '#F2AA06' }, { id: 'm9', nom: 'Demi de mêlée', court: '9', col: '#CAE268' },
    { id: 'o10', nom: 'Demi d\'ouverture', court: '10', col: '#A6E06A' }, { id: 'ctr', nom: 'Centre', court: 'Ctr', col: '#7FD67A' },
    { id: 'ail', nom: 'Ailier', court: 'Ail', col: '#57C98A' }, { id: 'arr', nom: 'Arrière', court: '15', col: '#33BFA8' }
  ];
  var IDS = POSTES.map(function (p) { return p.id; });
  var PAGE = 'missions-postes/index.html';
  function poste(id) { for (var i = 0; i < POSTES.length; i++) if (POSTES[i].id === id) return POSTES[i]; return null; }
  // un écran de l'épisode : la situation 1 à 4, ou 0 = la fin ; la variante n'existe qu'en situation 4
  function sitOk(s) { return typeof s === 'number' && s >= 0 && s <= 4 && Math.floor(s) === s; }
  function cle(x) { return x.poste + '|' + x.situation + '|' + (x.situation === 4 && x.variante ? 1 : 0); }
  function sitNom(s, v) { return s ? 'Situation ' + s + (v ? ' · variante' : '') : 'Fin de l\'épisode'; }

  // l'adresse de la page, avec la version de l'appli (une nouvelle version = une nouvelle adresse, jamais l'ancienne copie)
  // et, si on veut, une situation précise : q = { p, s, alt }
  function adresse(v, q) {
    var u = PAGE + '?educ=1' + (v ? '&v=' + v : '');
    q = q || {};
    if (IDS.indexOf(q.p) >= 0) {
      u += '&p=' + q.p;
      if (/^[0-4]$/.test(String(q.s))) u += '&s=' + q.s;
      if (String(q.alt) === '1' && String(q.s) === '4') u += '&alt=1';
    }
    return u;
  }

  // un message de la page : seulement ceux qu'on connaît, vérifiés (la page est du même site, mais on ne se fie à rien)
  function lireMessage(d) {
    if (!d || typeof d !== 'object' || typeof d.mp !== 'string') return null;
    if (d.mp === 'pret' || d.mp === 'fermer') return { mp: d.mp };
    if (d.mp !== 'avis') return null;
    if (IDS.indexOf(d.poste) < 0 || !sitOk(d.situation)) return null;
    function txt(t, n) { return typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, n) : ''; }
    return { mp: 'avis', poste: d.poste, situation: d.situation, variante: d.situation === 4 && d.variante === true,
      titre: txt(d.titre, 80) || (poste(d.poste).nom + ' · ' + sitNom(d.situation, d.situation === 4 && d.variante === true).toLowerCase()), sous: txt(d.sous, 80) };
  }

  // mes avis (pour la page : « Avis : c'est juste » sur l'écran où je l'ai donné)
  function mesAvis(retours) { return (retours || []).filter(function (x) { return x.moi; }).map(function (x) { return { poste: x.poste, situation: x.situation, variante: !!x.variante, avis: x.avis }; }); }
  function monAvis(retours, o) { var k = cle(o), r = null; (retours || []).forEach(function (x) { if (x.moi && cle(x) === k) r = x; }); return r; }

  // les avis rangés : par poste (ordre du terrain), puis par situation (1, 2, 3, 4, 4 variante, puis la fin), le plus récent d'abord
  function grouper(retours) {
    var par = {};
    (retours || []).forEach(function (x) {
      if (IDS.indexOf(x.poste) < 0 || !sitOk(x.situation)) return;
      var p = par[x.poste] || (par[x.poste] = { poste: poste(x.poste), n: 0, juste: 0, revoir: 0, sits: {} });
      var k = cle(x), s = p.sits[k] || (p.sits[k] = { situation: x.situation, variante: x.situation === 4 && !!x.variante, retours: [] });
      s.retours.push(x); p.n++;
      if (x.avis === 'revoir') p.revoir++; else p.juste++;
    });
    function ordre(s) { return (s.situation === 0 ? 9 : s.situation) * 2 + (s.variante ? 1 : 0); }
    return IDS.filter(function (id) { return par[id]; }).map(function (id) {
      var p = par[id];
      p.sits = Object.keys(p.sits).map(function (k) { return p.sits[k]; }).sort(function (a, b) { return ordre(a) - ordre(b); });
      p.sits.forEach(function (s) { s.retours.sort(function (a, b) { return (a.maj || '') < (b.maj || '') ? 1 : (a.maj || '') > (b.maj || '') ? -1 : 0; }); });
      return p;
    });
  }
  function compte(retours) {
    var o = { n: 0, revoir: 0 };
    (retours || []).forEach(function (x) { o.n++; if (x.avis === 'revoir') o.revoir++; });
    return o;
  }

  return { POSTES: POSTES, IDS: IDS, PAGE: PAGE, poste: poste, cle: cle, sitNom: sitNom, adresse: adresse, lireMessage: lireMessage,
    mesAvis: mesAvis, monAvis: monAvis, grouper: grouper, compte: compte };
})();
