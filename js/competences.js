/* =========================================================
   Mode champion · M12 — SKILLS : le carnet de compétences rugby
   4 cartes (domaines) × 5 étoiles indépendantes, gagnées dans n'importe quel ordre.
   Une étoile ne s'allume que quand un éduc la valide (à l'entraînement, au plateau ou
   à la journée d'évaluation). Repris de la grille papier « Évaluation des acquis ».
   Les identifiants doivent rester ceux de Core.SKILLS (js/core.js).
   ========================================================= */
window.MC = window.MC || {};

MC.SK = (function () {
  var DOMAINES = [
    { id: 'plaquage', nom: 'Plaquage', icon: 'shield', color: '#FF4FA3', etoiles: [
      { id: 'epaule', nom: 'Épaule', phrase: 'Je vise la taille avec l\'épaule', mission: 'Engager l\'épaule au plaquage',
        conseil: 'À genoux face à un copain, puis en marchant : la joue contre sa hanche, l\'épaule touche la taille, les bras serrent. Doucement, des deux côtés.' },
      { id: 'joue', nom: 'Joue contre le dos', phrase: 'Ma tête du bon côté, joue collée contre son dos', mission: 'Placer sa tête du bon côté',
        conseil: 'Ta tête passe derrière le porteur, jamais devant : ta joue colle à son dos. Au ralenti d\'abord, contre un bouclier.' },
      { id: 'deux-cotes', nom: 'Des deux côtés', phrase: 'Je plaque aussi bien à gauche qu\'à droite', mission: 'Plaquer des deux côtés',
        conseil: 'Une fois épaule droite, une fois épaule gauche. Ton côté le moins facile : deux fois plus.' },
      { id: 'cercle', nom: 'Cercle de fer', phrase: 'Je serre fort, il ne s\'échappe pas', mission: 'Serrer fort sans lâcher',
        conseil: 'Les bras en cercle autour des cuisses, les mains qui se tiennent, et tu ne lâches pas. Essaie sur un gros coussin.' },
      { id: 'tomber', nom: 'Je fais tomber', phrase: 'Je pousse avec les jambes et il tombe vite', mission: 'Faire tomber vite',
        conseil: 'Petits pas avant le contact, puis tu pousses avec les jambes. Les squats et la chaise de ta prépa te donnent cette force.' }
    ] },
    { id: 'passe', nom: 'Passe', icon: 'ball', color: '#38E8FF', etoiles: [
      { id: 'mains', nom: 'Mains en cible', phrase: 'Je réceptionne à l\'arrêt, mains tendues', mission: 'Réceptionner mains en cible',
        conseil: 'Mains ouvertes devant la poitrine, doigts vers le haut : tu montres où tu veux le ballon. À 5 m, 10 réceptions de suite.' },
      { id: 'en-courant', nom: 'En courant', phrase: 'Je réceptionne en courant', mission: 'Réceptionner en courant',
        conseil: 'Cours droit, tourne les épaules vers le passeur, mains en cible. Ne ralentis pas pour attraper.' },
      { id: 'droite', nom: 'Passe à droite', phrase: 'Je fais la passe en courant vers la droite', mission: 'Passer à droite en courant',
        conseil: 'Le ballon à deux mains, tu regardes ta cible, et tes mains finissent tendues vers elle.' },
      { id: 'gauche', nom: 'Passe à gauche', phrase: 'Je fais la passe en courant vers la gauche', mission: 'Passer à gauche en courant',
        conseil: 'Pareil qu\'à droite, de l\'autre côté : regarde la cible, mains tendues vers elle à la fin.' },
      { id: 'vrillee', nom: 'Passe vrillée', phrase: 'Je fais une passe vrillée', mission: 'Réussir une passe vrillée',
        conseil: 'À l\'arrêt d\'abord : une main pousse, l\'autre fait tourner le ballon. Contre un mur à 3 m, puis plus loin.' }
    ] },
    { id: 'ruck', nom: 'Ruck', icon: 'group', color: '#3DFFB0', etoiles: [
      { id: 'dos-plat', nom: 'Dos plat', phrase: 'Dos plat, tête levée', mission: 'Garder le dos plat',
        conseil: 'À quatre pattes, une petite bouteille posée sur ton dos ne doit pas tomber. Tête levée, tu regardes devant.' },
      { id: 'appuis', nom: 'Sur mes appuis', phrase: 'Je me déplace sur mes appuis dans les 4 directions', mission: 'Bouger sur ses appuis',
        conseil: 'À 4 pattes, genoux décollés : avance, recule, va à gauche et à droite. La marche de l\'ours de ta prépa aide beaucoup.' },
      { id: 'tete', nom: 'Tête bien placée', phrase: 'Ma tête est à la bonne place', mission: 'Placer sa tête au ruck',
        conseil: 'La tête plus haute que les hanches, menton levé. Tu regardes devant toi, pas le sol.' },
      { id: 'gagne', nom: 'Je gagne le ballon', phrase: 'Je pousse dos droit et je gagne le ballon', mission: 'Gagner le ballon au ruck',
        conseil: 'Petits pas, dos droit, tu pousses avec les jambes pour passer au-dessus du ballon. Contre un bouclier tenu par un adulte.' },
      { id: 'roulade', nom: 'Roulade de judo', phrase: 'Je chute sans me faire mal, des deux côtés', mission: 'Rouler des deux côtés',
        conseil: 'Sur un tapis : roulade sur l\'épaule droite, puis sur la gauche. Menton rentré, bras arrondi.' }
    ] },
    { id: 'pied', nom: 'Jeu au pied', icon: 'boot', color: '#FFC23D', etoiles: [
      { id: 'decolle', nom: 'Coup de pied décollé', phrase: 'Mon coup de pied décolle du sol', mission: 'Faire décoller le ballon',
        conseil: 'Lâche le ballon bien droit sur ton pied, frappe avec le lacet, pointe tendue.' },
      { id: 'chandelle', nom: 'Chandelle', phrase: 'Je rattrape un ballon qui tombe du ciel', mission: 'Rattraper une chandelle',
        conseil: 'Lance-toi le ballon en l\'air, bras en panier, et serre-le contre ta poitrine. Puis de plus en plus haut.' },
      { id: 'rasant', nom: 'Pied rasant', phrase: 'Je pousse le ballon au pied en courant', mission: 'Pousser le ballon au pied',
        conseil: 'Petits coups de pied doux en marchant, puis en courant : le ballon reste près de toi.' },
      { id: 'ramasse', nom: 'Je ramasse', phrase: 'Je ramasse le ballon au sol en courant', mission: 'Ramasser le ballon en courant',
        conseil: 'Plie les jambes, pas le dos. Une main devant, une derrière, et tu repars vite.' },
      { id: 'vise', nom: 'Je vise juste', phrase: 'Mon drop ou ma volée reste sur le terrain', mission: 'Viser juste au pied',
        conseil: 'Vise une cible (un plot, un sac) à 10 m : le ballon doit rester dans le terrain.' }
    ] }
  ];
  // le grade d'une carte = son nombre d'étoiles
  var GRADES = [
    { n: 0, nom: 'À débloquer', color: '#56628A' },
    { n: 1, nom: 'Bronze', color: '#D9A06B' },
    { n: 2, nom: 'Argent', color: '#C9D1E0' },
    { n: 3, nom: 'Or', color: '#FFC23D' },
    { n: 4, nom: 'Diamant', color: '#7FE7FF' },
    { n: 5, nom: 'Légende', color: '#FF7FBC' }
  ];
  var MAX_PLUS1 = 5, PROPOSE_AU = 3;

  function dom(id) { for (var i = 0; i < DOMAINES.length; i++) if (DOMAINES[i].id === id) return DOMAINES[i]; return null; }
  function star(d, e) { var D = dom(d); if (!D) return null; for (var i = 0; i < D.etoiles.length; i++) if (D.etoiles[i].id === e) return D.etoiles[i]; return null; }
  function grade(n) { return GRADES[Math.max(0, Math.min(5, n || 0))]; }
  // les étoiles validées d'un enfant : { 'plaquage:epaule': ligne }
  function acquis(data) {
    var o = {};
    ((data && data.etoiles) || []).forEach(function (e) { o[e.domaine + ':' + e.etoile] = e; });
    return o;
  }
  function total(data) { return Object.keys(acquis(data)).length; }
  function carte(data, d) {
    var D = dom(d), A = acquis(data), n = 0;
    var stars = D.etoiles.map(function (s) { var row = A[d + ':' + s.id] || null; if (row) n++; return { def: s, row: row }; });
    return { dom: D, n: n, grade: grade(n), stars: stars };
  }
  // la mission perso en cours (une à la fois), ou la dernière faite si on demande
  function missionPerso(data, toutes) {
    var l = ((data && data.defmissions) || []).filter(function (m) { return m.sorte === 'etoile' && (toutes || m.statut === 'active'); });
    l.sort(function (a, b) { return (a.cree || '') < (b.cree || '') ? 1 : -1; });
    return toutes ? l : (l[0] || null);
  }
  // les +1 d'une mission, du plus récent au plus ancien
  function plus1(data, missionId) {
    return ((data && data.encouragements) || []).filter(function (x) { return x.missionId === missionId; })
      .sort(function (a, b) { return (a.cree || '') < (b.cree || '') ? 1 : -1; });
  }
  function titreMission(m) { var s = star(m.domaine, m.etoile); return s ? s.mission : (m.titre || 'Mission perso'); }
  // le prochain défi d'un enfant : l'étoile de sa mission perso, sinon une étoile pas encore gagnée de sa carte la plus avancée
  function prochainDefi(data) {
    var m = missionPerso(data);
    if (m) return { d: m.domaine, e: m.etoile, mission: m };
    var best = null;
    DOMAINES.forEach(function (D) {
      var c = carte(data, D.id);
      if (c.n >= 5) return;
      if (!best || c.n > best.n) best = c;
    });
    if (!best) return null;
    var s = best.stars.filter(function (x) { return !x.row; })[0];
    return { d: best.dom.id, e: s.def.id, mission: null };
  }

  return {
    DOMAINES: DOMAINES, GRADES: GRADES, MAX_PLUS1: MAX_PLUS1, PROPOSE_AU: PROPOSE_AU,
    dom: dom, star: star, grade: grade, acquis: acquis, total: total, carte: carte,
    missionPerso: missionPerso, plus1: plus1, titreMission: titreMission, prochainDefi: prochainDefi
  };
})();
