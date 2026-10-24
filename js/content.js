/* =========================================================
   Mode champion · M12 — LE PROGRAMME
   Tout le contenu vient du carnet « Mon carnet de champion »,
   de la fiche « Mon bilan de champion » et du tableau du mur.
   Pour changer une dose, un texte ou une vidéo : c'est ici.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  // ---------- Niveaux ----------
  var NIVEAUX = [
    null,
    { n: 1, code: 'N1', nom: 'Début', color: '#7CFF6B' },
    { n: 2, code: 'N2', nom: 'Moyen', color: '#FFD23D' },
    { n: 3, code: 'N3', nom: 'Fort', color: '#B48CFF' },
    { n: 4, code: 'N4', nom: 'Champion', color: '#FF4FA3' }
  ];

  // Chaque exercice règle son niveau sur un test du bilan (page 4 du carnet).
  // « cle » = clé de niveau, « test » = test du bilan qui la règle.
  var CLES = {
    susp:    { nom: 'Suspension',          famille: 'haut',   test: 'susp' },
    tract:   { nom: 'Tractions',           famille: 'haut',   test: 'tract' },
    pompes:  { nom: 'Pompes et rowing',    famille: 'haut',   test: 'pompes' },
    planche: { nom: 'Gainage',             famille: 'haut',   test: 'planche' },
    corde:   { nom: 'Corde et sauts',      famille: 'explo',  test: 'corde' },
    navette: { nom: 'Départs et marche',   famille: 'explo',  test: 'navette' },
    corde1:  { nom: 'Intervalles de corde', famille: 'cardio', test: 'corde1' },
    burpees: { nom: 'Circuit rugby',       famille: 'cardio', test: 'burpees' },
    squats:  { nom: 'Jambes',              famille: 'jambes', test: 'squats' },
    chaise:  { nom: 'Pas de crabe',        famille: 'jambes', test: 'chaise' },
    flamant: { nom: 'Flamant rose',        famille: 'jambes', test: 'flamant' }
  };

  var FAMILLES = [
    { id: 'haut',   nom: 'Force du haut',       color: '#4D9BFF', cles: ['susp', 'tract', 'pompes', 'planche'] },
    { id: 'explo',  nom: 'Explosivité',         color: '#FF8A3D', cles: ['corde', 'navette'] },
    { id: 'cardio', nom: 'Cardio',              color: '#FF4F6D', cles: ['corde1', 'burpees'] },
    { id: 'jambes', nom: 'Jambes et équilibre', color: '#3DFFB0', cles: ['squats', 'chaise', 'flamant'] }
  ];

  // ---------- Doses ----------
  // r = répétitions par série, t = secondes, s = séries, cote = « jambe » / « côté »,
  // n/w/p = intervalles (nombre, effort, pause), tours/p = circuit, m = mètres, txt = précision.
  function R(s, r, txt) { return { k: 'reps', s: s, r: r, txt: txt || '' }; }
  function T(s, t, txt) { return { k: 'time', s: s, t: t, txt: txt || '' }; }
  function C(s, r, cote, txt) { return { k: 'reps', s: s, r: r, cote: cote, txt: txt || '' }; }
  // pas de crabe : r allers-retours de 3 pas (3 à droite + 3 à gauche) par série
  function U(s, r) { return { k: 'reps', s: s, r: r, u: 'allers-retours', txt: '1 aller-retour = 3 pas à droite + 3 pas à gauche' }; }

  // ---------- Exercices ----------
  var EXOS = {
    // ===== LUNDI · CROS =====
    suspension: {
      nom: 'Suspension à la barre', cle: 'susp', anim: 'suspension', video: 'HUuXawco7UY',
      etapes: ['Monte avec la chaise, attrape la barre, lâche les pieds.', 'Épaules loin des oreilles, corps bien droit.', 'Regarde devant.'],
      attention: 'Toujours une chaise pour monter et descendre, pieds proches du sol.',
      mini: { nom: 'Superman tenu', anim: 'superman', video: 'GIw_kJ0gMw4', etapes: ['À plat ventre, bras et jambes décollés.', 'Tiens le même temps.', 'Regarde le sol pour protéger le cou.'] },
      doses: [null, T(3, 10), T(3, 20), T(3, 30), T(3, 40)]
    },
    tractions: {
      nom: 'Tractions avec élastique', cle: 'tract', anim: 'tractions', video: 'kmUO-ie6ys4',
      etapes: ['Élastique en boucle sur la barre, un genou dedans (30 kg = l\'élastique qui aide le plus).', 'Tire le menton vers la barre.', 'Descends lentement en comptant 3.'],
      attention: 'Pas de balancement, pas de secousse. Un adulte à côté les premières fois.',
      mini: { nom: 'Tirage élastique', anim: 'tirage_elastique', video: 'gebMl23Fw_4', etapes: ['Élastique fixé en haut d\'une porte fermée (ou tenu par un parent sur une chaise).', 'À genoux, tire les poignées vers la poitrine, coudes vers le bas et l\'arrière.', 'Reviens lentement.'],
        doses: [null, R(3, 8), R(3, 10), R(3, 12), R(3, 15)] },
      doses: [null, R(3, 3, 'élastique 30 kg'), R(3, 5, 'élastique 30 kg'), R(3, 5, 'élastique 20 kg'), R(3, 5, '+ 1 série sans élastique')]
    },
    pompes: {
      nom: 'Pompes', cle: 'pompes', anim: 'pompes', video: '50Yr6Mm78u0',
      etapes: ['Mains sous les épaules, corps en planche, fesses serrées.', 'Descends la poitrine vers le sol, coudes en flèche vers l\'arrière.', 'Remonte. N1-N2 : sur les genoux, le corps reste droit des genoux à la tête. N3-N4 : sur la pointe des pieds, les genoux ne touchent pas le sol.'],
      attention: 'Si le dos se creuse, reviens sur les genoux.',
      doses: [null, R(3, 6, 'sur les genoux'), R(3, 8, 'genoux, ou 3 × 5 complètes'), R(3, 8, 'complètes, genoux décollés'), R(3, 10, 'ou pieds sur une marche')],
      animNiveau: [null, 'pompes_genoux', 'pompes_genoux', 'pompes', 'pompes']
    },
    rowing: {
      nom: 'Rowing élastique', cle: 'pompes', anim: 'rowing', video: 'BI647VkG0iY',
      etapes: ['Assis jambes tendues, élastique autour des pieds.', 'Tire les coudes vers l\'arrière en serrant les omoplates.', 'Reviens lentement.'],
      attention: 'Dos droit, pas de mouvement du buste.',
      doses: [null, R(2, 10, 'élastique 10 kg'), R(3, 10, 'élastique 10 kg'), R(3, 12, 'élastique 20 kg'), R(3, 15, 'élastique 30 kg')]
    },
    planche: {
      nom: 'Planche', cle: 'planche', anim: 'planche', video: '4HDEV8B_8KE',
      etapes: ['Sur les coudes et les pieds.', 'Une ligne droite de la tête aux talons.', 'Serre le ventre et les fesses, respire !'],
      attention: 'Si les fesses montent ou descendent : arrête et recommence après le repos.',
      doses: [null, T(3, 15), T(3, 25), T(3, 35), T(3, 45, 'ou 3 × 30 s un pied levé')]
    },
    superman: {
      nom: 'Superman', cle: 'planche', anim: 'superman', video: 'GIw_kJ0gMw4',
      etapes: ['À plat ventre, bras devant.', 'Décolle bras et jambes en même temps, tiens 2 s.', 'Redescends.'],
      attention: 'Regarde le sol, pas devant, pour protéger le cou.',
      doses: [null, R(2, 8), R(2, 10), R(2, 12, 'tiens 3 s'), R(3, 12, 'tiens 3 s')]
    },

    // ===== MARDI · CAPUOZZO =====
    corde: {
      nom: 'Corde à sauter', cle: 'corde', anim: 'corde', video: 'H0r3EatR8bg',
      etapes: ['Petits sauts sur la pointe des pieds.', 'Coudes près du corps.', 'La corde tourne avec les poignets.'],
      attention: 'Longueur de corde : pieds dessus, poignées jusqu\'aux aisselles.',
      mini: { nom: 'Corde imaginaire', anim: 'corde_imaginaire', etapes: ['Mêmes petits sauts sur la pointe des pieds.', 'Les poignets tournent comme s\'il y avait une corde.'] },
      doses: [null, T(4, 20, 'repos 30 s'), T(4, 30, 'repos 30 s'), T(5, 30, 'pieds alternés'), T(5, 40, 'pieds alternés')],
      repos: 30
    },
    saut_longueur: {
      nom: 'Saut en longueur sans élan', cle: 'corde', anim: 'saut_longueur', video: 'V4QyVHGO_Wo',
      etapes: ['Pieds écartés largeur des épaules, bras en arrière.', 'Balance les bras et saute loin.', 'Atterris genoux fléchis, SANS BRUIT, tiens 2 s.'],
      attention: 'Réception « chat » : si ça claque au sol, saute moins loin.',
      doses: [null, R(2, 4), R(2, 5), R(3, 5), R(3, 4, 'doubles sauts enchaînés')]
    },
    sauts_lateraux: {
      nom: 'Sauts latéraux par-dessus la ligne', cle: 'corde', anim: 'sauts_lateraux', video: 'zcSsJVLsbjk',
      etapes: ['Corde posée au sol ou ligne tracée.', 'Saute de gauche à droite pieds joints, le plus vite possible.', 'Genoux souples, regarde devant.'],
      vite: 'Petits sauts ultra-rapides : la ligne est en lave !',
      doses: [null, T(3, 8), T(3, 10), T(3, 12), T(3, 15)]
    },
    skipping: {
      nom: 'Skipping genoux hauts', cle: 'corde', anim: 'skipping', video: 'kRaMa-8yU8s',
      etapes: ['Sur place, monte les genoux à la hauteur des hanches.', 'Pieds de feu : le plus de montées possible, comme si le sol était brûlant !', 'Les bras bougent avec les jambes. Reste grand, ne te penche pas en arrière.'],
      vite: 'Pieds de feu : le plus vite possible, le sol est brûlant !',
      doses: [null, T(3, 8), T(3, 10), T(3, 12), T(3, 15)]
    },
    departs: {
      nom: 'Départs de sprint 10 m', cle: 'navette', anim: 'departs', video: 'YuxiWOecNBs',
      etapes: ['Pars comme après un plaquage : debout, à genoux, assis ou à plat ventre.', 'Quelqu\'un dit « Go ! » (ou tu comptes 3) et tu sprintes 10 m.', 'Retour en marchant = repos.'],
      attention: 'Échauffé obligatoire. Sol non glissant, pas d\'obstacle à l\'arrivée.',
      vite: 'Fusée : tu te relèves et tu sprintes à fond !',
      doses: [null, { k: 'count', s: 1, r: 4, unite: 'départs' }, { k: 'count', s: 1, r: 5, unite: 'départs' }, { k: 'count', s: 1, r: 6, unite: 'départs' }, { k: 'count', s: 1, r: 6, unite: 'départs', txt: 'comme N3 : la qualité, pas le nombre' }]
    },
    montees_marche: {
      nom: 'Montées de marche rapides', cle: 'navette', anim: 'montees_marche', video: 'dTmjWVoa0oo',
      etapes: ['Un pied sur une marche (20-30 cm).', 'Pousse fort pour monter en levant le genou opposé.', 'Redescends en contrôle et change de jambe : droite, gauche, droite…'],
      vite: 'Explosif : chaque montée le plus vite possible, en contrôle !',
      attention: 'Le pied entier sur la marche, pas seulement la pointe.',
      mini: { nom: 'Montées de genoux explosives', anim: 'montees_genoux', etapes: ['Sur place, pousse fort sur une jambe.', 'Le genou opposé monte vite.', 'Redescends en contrôle et change de jambe.'] },
      doses: [null, C(2, 6, 'jambe'), C(2, 8, 'jambe'), C(3, 8, 'jambe'), C(3, 10, 'jambe')]
    },

    // ===== MERCREDI · DUPONT =====
    intervalles_corde: {
      nom: 'Intervalles de corde', cle: 'corde1', anim: 'corde', video: 'v_2ypytqX5Y',
      etapes: ['Alterne corde et marche sur place.', 'Reste sur la pointe des pieds, petits sauts.', 'Regard devant.'],
      attention: 'Si tu te trompes, repars tout de suite : le temps continue.',
      mini: { nom: 'Corde imaginaire ou course sur place', anim: 'corde_imaginaire', etapes: ['Pendant les phases « corde » : corde imaginaire ou course sur place genoux hauts.'] },
      doses: [null, { k: 'inter', n: 6, w: 20, p: 40 }, { k: 'inter', n: 8, w: 30, p: 30 }, { k: 'inter', n: 8, w: 40, p: 20 }, { k: 'inter', n: 8, w: 45, p: 15 }]
    },
    circuit: {
      nom: 'Circuit rugby', cle: 'burpees', anim: 'burpees', video: 'UBYhfk53igE',
      etapes: ['Enchaîne les 5 ateliers = 1 tour. Tout se fait sur place : un tapis suffit.', 'Repose-toi entre les tours.'],
      attention: 'Tapis pour les burpees et les « debout ». Genoux souples sur les jumping jacks.',
      tour: [
        { nom: '10 s de pieds rapides en position de plaqueur', anim: 'pieds_rapides', detail: 'à fond, sur place', video: 'mR2SO9UXPN8' },
        { nom: '8 jumping jacks', anim: 'jumping_jacks', video: 'zE7dBRlshSU' },
        { nom: '5 burpees', anim: 'burpees', detail: 'le gage du club !', video: 'UBYhfk53igE' },
        { nom: '10 s de mountain climbers', anim: 'mountain_climbers', detail: 'à fond', video: 'UNBiOYnQLRo' },
        { nom: '5 « debout ! »', anim: 'debout', detail: 'allongé sur le dos, lève-toi le plus vite possible' }
      ],
      doses: [null, { k: 'circuit', tours: 2, p: 60 }, { k: 'circuit', tours: 3, p: 60 }, { k: 'circuit', tours: 3, p: 45 }, { k: 'circuit', tours: 4, p: 45 }]
    },

    // ===== JEUDI · MEAFOU =====
    squat: {
      nom: 'Squat', cle: 'squats', anim: 'squat', video: '_8LiJL61A5g',
      etapes: ['Chaise derrière toi, descends jusqu\'à la toucher sans t\'asseoir.', 'Genoux vers l\'extérieur, talons au sol, poitrine haute.', 'Remonte fort.'],
      attention: 'Les genoux ne rentrent pas vers l\'intérieur.',
      doses: [null, R(3, 8), R(3, 10), R(3, 12, 'descente en 3 s'), R(3, 15, 'lents, ou sur 1 jambe (chaise) 2 × 6')]
    },
    fentes: {
      nom: 'Fentes marchées', cle: 'squats', anim: 'fentes', video: 'Frfms16Fv4I',
      etapes: ['Grand pas en avant, le genou arrière frôle le sol.', 'Buste droit, mains sur les hanches.', 'Relève-toi en ramenant la jambe arrière devant : l\'autre jambe fait le pas suivant. On alterne.'],
      attention: 'Le genou avant reste au-dessus du pied.',
      doses: [null, C(2, 6, 'jambe'), C(2, 8, 'jambe'), C(3, 8, 'jambe'), C(3, 10, 'jambe')]
    },
    pont: {
      nom: 'Pont fessier', cle: 'squats', anim: 'pont', video: 'C7fziQi3MAw',
      etapes: ['Sur le dos, pieds à plat près des fesses.', 'Soulève le bassin en serrant les fesses, tiens 2 s.', 'Redescends.'],
      attention: 'Pas de cambrure : ce sont les fesses qui poussent, pas le dos.',
      doses: [null, R(3, 10), R(3, 12), C(2, 8, 'jambe', 'une jambe tendue'), C(3, 8, 'jambe', 'une jambe tendue')],
      animNiveau: [null, 'pont', 'pont', 'pont_une_jambe', 'pont_une_jambe'],
      videoNiveau: [null, null, null, '43qFZebHGj8', '43qFZebHGj8']
    },
    pas_crabe: {
      nom: 'Pas de crabe', cle: 'chaise', anim: 'pas_crabe', video: 'FIKTyi4VIak',
      etapes: ['Élastique au-dessus des genoux, demi-squat.', '3 pas de côté vers la droite, puis 3 pas vers la gauche = 1 aller-retour.', 'Reste bas tout le temps, les pieds ne se touchent pas.'],
      doses: [null, U(2, 3), U(2, 4), U(3, 4), U(3, 5)]
    },
    mollets: {
      nom: 'Mollets sur la marche', cle: 'squats', anim: 'mollets', video: 'WRNofIcnyP0',
      etapes: ['Pointes des pieds sur la marche, talons dans le vide.', 'Monte sur la pointe.', 'Descends lentement en dessous de la marche.'],
      attention: 'Tiens-toi à l\'espalier ou au mur pour l\'équilibre.',
      mini: { nom: 'Mollets au sol', anim: 'mollets', etapes: ['Pointes sur un livre épais, une main au mur.', 'Mêmes séries.'] },
      doses: [null, R(2, 10), R(2, 15), R(3, 15), R(3, 15, 'sur une jambe')]
    },
    dead_bug: {
      nom: 'Dead bug (le scarabée)', cle: 'planche', anim: 'dead_bug', video: 'dr6RziM-BYk',
      etapes: ['Sur le dos, bras vers le plafond, genoux à 90°.', 'Tends un bras derrière la tête et la jambe opposée.', 'Le bas du dos reste collé au tapis.'],
      doses: [null, C(2, 6, 'côté'), C(2, 8, 'côté'), C(2, 10, 'côté', 'lent'), C(3, 10, 'côté', 'lent')]
    },
    marche_ours: {
      nom: 'Marche de l\'ours', cle: 'squats', anim: 'marche_ours', video: 'IxhlN_tkKcA',
      etapes: ['À 4 pattes, genoux à 5 cm du sol.', 'Avance en gardant le dos plat.'],
      doses: [null, { k: 'dist', s: 2, m: 5 }, { k: 'dist', s: 2, m: 8 }, { k: 'dist', s: 3, m: 8, txt: 'avant + arrière' }, { k: 'dist', s: 3, m: 10, txt: 'avant + arrière' }]
    },

    // ===== RETOUR AU CALME =====
    flamant: {
      nom: 'Flamant rose', cle: 'flamant', anim: 'flamant', video: '3ygYjZ3Oo6I',
      etapes: ['Debout sur un pied, l\'autre genou levé, bras écartés.', 'Regarde un point fixe.', 'Près d\'un mur pour te rattraper.'],
      doses: [null, T(1, 20, 'par pied'), T(1, 25, 'par pied'), T(1, 20, 'par pied, yeux fermés'), T(1, 20, 'par pied, yeux fermés sur un tapis plié')]
    }
  };

  // ---------- Échauffement et retour au calme ----------
  // Chaque étape a une durée (dur, en s) : le site enchaîne les étapes avec un chrono.
  // cotes : l'étape se fait d'un côté puis de l'autre (2 étapes de dur secondes).
  var REVEIL = {
    nom: 'Le Réveil du guerrier', duree: 240,
    intro: 'Enchaîne sans traîner : tu dois avoir un peu chaud à la fin.',
    items: [
      { id: 'r_corde', nom: 'Corde à sauter tranquille', dose: '1 min', dur: 60, detail: 'Petits sauts pieds joints, sans forcer.', anim: 'corde', video: 'H0r3EatR8bg',
        mini: { nom: 'Corde imaginaire', detail: 'Petits sauts pieds joints, les poignets tournent une corde imaginaire.', anim: 'corde_imaginaire' } },
      { id: 'r_cercles', nom: 'Cercles des articulations', dose: '1 min', dur: 60, detail: '10 cercles de chaque : chevilles, genoux, hanches, épaules, poignets, puis le cou tout doucement.', anim: 'cercles', video: 'RJTezdqvB2A' },
      { id: 'r_genoux', nom: 'Montées de genoux', dose: '15 s', dur: 15, detail: 'Sur place, en rythme : les genoux montent à hauteur des hanches.', anim: 'skipping', video: 'kRaMa-8yU8s' },
      { id: 'r_talons', nom: 'Talons-fesses', dose: '15 s', dur: 15, detail: 'Sur place, les talons viennent toucher les fesses.', anim: 'talons_fesses', video: 'oMW59TKZvaI' },
      { id: 'r_squats', nom: 'Squats lents', dose: '10 squats', dur: 30, detail: 'Descends comme pour t\'asseoir, talons au sol, et remonte.', anim: 'squat', video: '_8LiJL61A5g' },
      { id: 'r_araignee', nom: 'Marche de l\'araignée', dose: '6 pas', dur: 30, detail: 'À 4 pattes, fesses basses, un bras et la jambe opposée avancent ensemble.', anim: 'marche_ours', video: 'IxhlN_tkKcA' },
      { id: 'r_moulin', nom: 'Bras de moulin', dose: '10 + 10', dur: 30, detail: 'Grands cercles de bras vers l\'avant, puis vers l\'arrière.', anim: 'moulin', video: 'tYo5ghpLksg' }
    ]
  };
  var CALME = {
    nom: 'Le Retour au calme', duree: 180,
    intro: 'Sans forcer : on étire un peu, on respire, on tient son équilibre.',
    items: [
      { id: 'c_respi', nom: 'Respiration du ballon', dose: '5 respirations', dur: 50, detail: 'Assis, inspire par le nez 4 s (le ventre gonfle comme un ballon), souffle par la bouche 6 s.', anim: 'respiration', video: '2PcCmxEW5WA' },
      { id: 'c_chat', nom: 'Étirement du chat', dose: '20 s', dur: 20, detail: 'À 4 pattes : dos rond en rentrant la tête, puis dos creux en levant la tête, tout doucement.', anim: 'chat', video: 'Toc5--Smm4E' },
      { id: 'c_mollets', nom: 'Mollets contre le mur', dose: '15 s / jambe', dur: 15, cotes: ['jambe gauche', 'jambe droite'], detail: 'Mains au mur, une jambe tendue en arrière, talon collé au sol : pousse le mur.', anim: 'etirement_mollet', video: 'YTYQo4WvJHA' },
      { id: 'c_genou', nom: 'Cuisses et fesses', dose: '15 s / jambe', dur: 15, cotes: ['jambe gauche', 'jambe droite'], detail: 'Allongé sur le dos, ramène un genou contre la poitrine avec les mains, l\'autre jambe reste allongée.', anim: 'genou_poitrine', video: 'Yd9wY25koVk' },
      { id: 'c_flamant', nom: 'Le flamant rose', exo: 'flamant', cotes: ['pied gauche', 'pied droit'], detail: 'Debout sur un pied, l\'autre genou levé, bras écartés, regarde un point fixe.', anim: 'flamant', video: '3ygYjZ3Oo6I' },
      { id: 'c_susp', nom: 'Suspension douce à la barre', dose: '10 s', dur: 10, detail: 'Monte avec la chaise, laisse-toi pendre, épaules détendues, puis repose les pieds.', anim: 'suspension', video: 'HUuXawco7UY',
        mini: { nom: 'Posture de l\'enfant', dose: '20 s', dur: 20, detail: 'À genoux, assis sur les talons, bras loin devant, front au sol. Respire.', anim: 'posture_enfant', video: 'tYQjzSel2h4' } }
    ]
  };

  // ---------- La semaine ----------
  // slot = colonne du tableau du mur (une étoile par colonne et par semaine, sauf le vendredi).
  var JOURS = {
    cros: {
      jour: 'Lundi', court: 'LUN', slot: 0, maison: true, color: '#4D9BFF', theme: 'Force du haut du corps',
      joueur: 'François Cros', poste: '3e ligne', nomSeance: 'La séance de Cros', duree: 18, repos: 45,
      modele: 'Le plaqueur infatigable, celui qui va chercher les ballons au sol.',
      intro: 'Le 3e ligne plaque, arrache le ballon, se relève et repart : il lui faut des bras et un dos solides. Aujourd\'hui : tractions, pompes et ventre en béton.',
      terrain: 'Des bras et un dos forts, c\'est tenir le ballon quand on te plaque, arracher un ballon dans un ruck, pousser en mêlée et te relever vite.',
      materiel: 'Barre ou espalier, élastiques, tapis, chaise', materielMini: 'Tapis + élastiques (accrochés en haut d\'une porte ou tenus par un parent)',
      exos: ['suspension', 'tractions', 'pompes', 'rowing', 'planche', 'superman'],
      icon: 'bar'
    },
    capuozzo: {
      jour: 'Mardi', court: 'MAR', slot: 1, maison: true, color: '#FF8A3D', theme: 'Explosivité et vitesse',
      joueur: 'Ange Capuozzo', poste: 'ailier / arrière', nomSeance: 'La séance de Capuozzo', duree: 18, repos: 50,
      modele: 'Petit gabarit, énorme vitesse : il évite les plaquages et s\'envole pour les ballons hauts.',
      intro: 'L\'ailier part comme une fusée, change de direction et saute. Ici, la QUALITÉ compte plus que le nombre : sauts puissants, atterrissage silencieux comme un chat.',
      terrain: 'Le premier pas fait la différence : partir avant le défenseur, changer de direction, arriver premier sur un ballon au sol.',
      materiel: 'Corde à sauter, couloir de 10 m, marche', materielMini: 'Couloir de 10 m et une ligne au sol (craie, ruban, lacet), pas de corde',
      exos: ['corde', 'saut_longueur', 'sauts_lateraux', 'skipping', 'departs', 'montees_marche'],
      icon: 'bolt'
    },
    dupont: {
      jour: 'Mercredi', court: 'MER', slot: 2, maison: true, color: '#FF4F6D', theme: 'Cardio et endurance rugby',
      joueur: 'Antoine Dupont', poste: 'demi de mêlée', nomSeance: 'La séance de Dupont', duree: 13, repos: 45,
      modele: 'Le meilleur joueur du monde est surtout celui qui est encore partout à la 80e minute.',
      intro: 'Le demi de mêlée est partout : il plaque, se relève, court soutenir, repart. Ce soir il y a club : fais ta séance l\'après-midi, au moins 2 h avant. Bois de l\'eau.',
      terrain: 'Le joueur qui a du souffle est encore lucide et rapide à la fin, quand les autres sont fatigués : c\'est souvent là que se jouent les essais.',
      materiel: 'Corde à sauter, tapis (tout se fait sur place)', materielMini: 'Un tapis, pas de corde',
      exos: ['intervalles_corde', 'circuit'],
      club: true,
      icon: 'heart'
    },
    meafou: {
      jour: 'Jeudi', court: 'JEU', slot: 3, maison: true, color: '#3DFFB0', theme: 'Force des jambes',
      joueur: 'Emmanuel Meafou', poste: '2e ligne', nomSeance: 'La séance de Meafou', duree: 18, repos: 45,
      modele: 'Le géant qui pousse en mêlée et avance avec trois défenseurs sur le dos.',
      intro: 'Tout part des jambes : pousser, plaquer, courir, sauter. Mouvements lents et parfaits.',
      terrain: 'Pousser en mêlée, plaquer bas, sprinter, rester debout dans un contact : tout part des jambes et des fesses.',
      materiel: 'Tapis, chaise, élastique, marche', materielMini: 'Tapis, élastique, chaise, un livre épais (pas de marche)',
      exos: ['squat', 'fentes', 'pont', 'pas_crabe', 'mollets', 'dead_bug', 'marche_ours'],
      leger: { duree: 12, texte: 'Match samedi : 2 séries partout, fentes remplacées par le flamant rose (2 × 20 s / pied), pas de marche de l\'ours.' },
      lourdes: 'Jambes lourdes après mercredi ? C\'est normal : 2 séries au lieu de 3.',
      icon: 'spring'
    },
    repos: {
      jour: 'Vendredi', court: 'VEN', slot: -1, maison: false, color: '#5A6687', theme: 'Repos',
      nomSeance: 'Repos', duree: 0,
      intro: 'Rien à faire aujourd\'hui : le corps se répare pour être au top demain. C\'est voulu ! Pas de séance, pas d\'étoile.',
      icon: 'moon'
    },
    club: {
      jour: 'Samedi', court: 'SAM', slot: 4, maison: false, color: '#FFC23D', theme: 'Entraînement ou match',
      nomSeance: 'Jour de club', duree: 0,
      intro: 'Ton entraînement, c\'est au club ! Pas de séance à la maison. Donne-toi à fond et écoute les éducateurs.',
      icon: 'ball'
    },
    recup: {
      jour: 'Dimanche', court: 'DIM', slot: 5, maison: false, color: '#B48CFF', theme: 'Récupération',
      nomSeance: 'Récupération', duree: 0,
      intro: 'Le corps devient plus fort quand il se repose : sortie douce en famille (20-30 min de marche, vélo, piscine) ou vrai repos si tu es fatigué. Ta récup compte pour une étoile.',
      check: ['J\'ai dormi au moins 10 heures', 'J\'ai bu de l\'eau toute la journée', 'J\'ai fait ma sortie douce (ou je me suis vraiment reposé)'],
      icon: 'leaf'
    }
  };
  // Lundi → dimanche
  var SEMAINE = ['cros', 'capuozzo', 'dupont', 'meafou', 'repos', 'club', 'recup'];
  var SLOTS = 6; // étoiles possibles par semaine (+1 bonus si les 6 sont faites)

  // ---------- Bilan : les 12 tests ----------
  // seuils [a, b] : ≤ a → N1, ≤ b → N2, au-dessus → N3. Pour la navette c'est l'inverse (plus petit = mieux).
  var TESTS = [
    { id: 'flamant', n: 1, nom: 'Flamant yeux fermés', court: 'Flamant', unite: 's', max: 60, parPied: true, cle: 'flamant', seuils: [10, 25],
      comment: 'Debout sur un pied, l\'autre genou levé, bras écartés, yeux fermés. 2 essais par pied, on garde le meilleur de chaque pied.' },
    { id: 'saut', n: 2, nom: 'Saut en longueur', court: 'Saut', unite: 'cm', cle: 'corde', seuils: null,
      comment: 'Pieds derrière une ligne, balance les bras et saute. 3 essais, le meilleur. Mesure de la ligne au talon le plus proche.' },
    { id: 'navette', n: 3, nom: 'Navette 5 × 10 m', court: 'Navette', unite: 's', decimales: 1, moinsMieux: true, cle: 'navette', seuils: [17, 14],
      comment: 'Deux lignes à 10 m, départ debout au « Go ». Le pied touche la ligne à chaque bout. Un seul essai.' },
    { id: 'susp', n: 4, nom: 'Suspension à la barre', court: 'Suspension', unite: 's', max: 90, mmss: true, cle: 'susp', seuils: [25, 50],
      comment: 'Monte avec la chaise, lâche les pieds, corps droit. Chrono jusqu\'à ce que les mains lâchent.',
      sm: { nom: 'Superman tenu', comment: 'À plat ventre, bras et jambes décollés : chrono jusqu\'à ce qu\'un pied ou une main touche le sol.' } },
    { id: 'tract', n: 5, nom: 'Tractions sans élastique', court: 'Tractions', unite: '', cle: 'tract', seuils: null, special: 'tract',
      comment: 'D\'abord SANS élastique : combien ? Menton au-dessus de la barre, descente complète, sans balancement. Si moins de 5 : élastique 10 kg, puis 20 kg, puis 30 kg (celui qui aide le plus), jusqu\'à en faire 5.',
      sm: { nom: 'Tirages élastique', comment: 'Élastique 30 kg fixé en haut, à genoux : le plus possible d\'affilée, retour lent.', seuils: [8, 15] } },
    { id: 'pompes', n: 6, nom: 'Pompes complètes', court: 'Pompes', unite: '', cle: 'pompes', seuils: [3, 9],
      comment: 'Corps en planche, poitrine à 5 cm du sol, bras tendus en haut. Le plus possible d\'affilée.' },
    { id: 'planche', n: 7, nom: 'Planche', court: 'Planche', unite: 's', max: 120, mmss: true, cle: 'planche', seuils: [40, 70],
      comment: 'Sur les coudes, ligne droite. Arrêt : les fesses montent ou descendent et ne se corrigent pas.' },
    { id: 'squats', n: 8, nom: 'Squats en 1 minute', court: 'Squats', unite: '', cle: 'squats', seuils: [20, 35],
      comment: 'Squat profond (cuisses au moins horizontales), talons au sol. On ne compte que les squats complets.' },
    { id: 'chaise', n: 9, nom: 'Chaise contre le mur', court: 'Chaise', unite: 's', max: 90, mmss: true, cle: 'chaise', seuils: [30, 60],
      comment: 'Dos plaqué au mur, cuisses horizontales, mains interdites sur les cuisses. Arrêt : les fesses remontent.' },
    { id: 'corde', n: 10, nom: 'Corde : sauts d\'affilée', court: 'Corde', unite: '', max: 150, cle: 'corde', seuils: [20, 60],
      comment: 'Sauts pieds joints, on compte jusqu\'à la première faute. 2 essais, le meilleur.',
      sm: { nom: 'Sauts par-dessus la ligne d\'affilée', comment: 'Pieds joints par-dessus une ligne au sol, sans s\'arrêter ni toucher la ligne.' } },
    { id: 'corde1', n: 11, nom: 'Corde : sauts en 1 minute', court: 'Corde 1 min', unite: '', cle: 'corde1', seuils: [60, 100],
      comment: 'Le plus de sauts en 1 min. Une faute : tu repars, le chrono continue.',
      sm: { nom: 'Sauts par-dessus la ligne en 1 min', comment: 'Pieds joints par-dessus la ligne pendant 1 min, on compte les passages.' } },
    { id: 'burpees', n: 12, nom: 'Burpees en 1 minute', court: 'Burpees', unite: '', cle: 'burpees', seuils: [8, 14],
      comment: 'Debout → mains au sol → planche → pieds devant → saut mains en l\'air = 1. Technique complète.' }
  ];

  // Dates des bilans (une séance de tests toutes les ~8 semaines). Modifiable dans config.js.
  // ---------- Badges ----------
  // 19 badges en 4 familles :
  //  - exploit    : au bilan ou en défi (un adulte confirme) + Champion (un exo réussi en N4)
  //  - seances    : 10 / 25 / 40 séances d'un même jour → bronze, argent, or
  //  - regularite : automatiques (étoiles, séries)
  //  - missions   : une mission spéciale accomplie (voir MISSIONS dans js/missions.js)
  var FAMILLES_BADGES = [
    { id: 'exploit', nom: 'Badges d\'exploit', intro: 'Au bilan, ou un jour où tu te sens fort, avec un adulte qui compte. Touche un badge pour tenter le défi.' },
    { id: 'seances', nom: 'Badges de séances', intro: '10 séances = bronze, 25 = argent, 40 = or. Chaque palier rapporte des XP.' },
    { id: 'regularite', nom: 'Badges de régularité', intro: '' },
    { id: 'missions', nom: 'Badges de missions', intro: 'Une mission spéciale accomplie = un badge.' }
  ];
  var PALIERS = [
    { nom: 'Bronze', color: '#E0894A' },
    { nom: 'Argent', color: '#CFD8E6' },
    { nom: 'Or', color: '#FFC23D' }
  ];
  var BADGES = [
    { id: 'accroche', famille: 'exploit', nom: 'Accroché', cond: '30 s de suspension (ou de Superman tenu)', test: 'susp', seuil: 30, icon: 'hang', color: '#4D9BFF', defi: true },
    { id: 'cros', famille: 'exploit', nom: 'Cros', cond: '5 tractions sans élastique (ou 15 tirages)', test: 'tract', seuil: 5, seuilSm: 15, icon: 'bar', color: '#4D9BFF', defi: true },
    { id: 'capuozzo', famille: 'exploit', nom: 'Capuozzo', cond: '50 sauts de corde d\'affilée', test: 'corde', seuil: 50, icon: 'bolt', color: '#FF8A3D', defi: true },
    { id: 'roc', famille: 'exploit', nom: 'Roc', cond: '45 s de planche parfaite', test: 'planche', seuil: 45, icon: 'house', color: '#4D9BFF', defi: true },
    { id: 'dupont', famille: 'exploit', nom: 'Dupont', cond: 'Navette plus rapide qu\'à ton 1er bilan', test: 'navette', progres: true, icon: 'heart', color: '#FF4F6D', defi: true },
    { id: 'flamant', famille: 'exploit', nom: 'Flamant', cond: '20 s yeux fermés sur chaque pied', test: 'flamant', seuil: 20, icon: 'flamingo', color: '#3DFFB0', defi: true },
    { id: 'meafou', famille: 'exploit', nom: 'Meafou', cond: '20 squats parfaits d\'affilée', test: 'squats_affilee', seuil: 20, icon: 'spring', color: '#3DFFB0', defi: true },
    { id: 'champion', famille: 'exploit', nom: 'Champion', cond: 'Réussir un exercice en niveau 4', icon: 'crown', color: '#FFC23D' },
    { id: 'bras', famille: 'seances', nom: 'Bras d\'acier', cond: 'séances Cros (lundi, haut du corps)', jour: 'cros', paliers: [10, 25, 40], icon: 'arm', color: '#4D9BFF' },
    { id: 'turbo', famille: 'seances', nom: 'Turbo', cond: 'séances Capuozzo (mardi, explosivité)', jour: 'capuozzo', paliers: [10, 25, 40], icon: 'gauge', color: '#FF8A3D' },
    { id: 'infatigable', famille: 'seances', nom: 'Infatigable', cond: 'séances Dupont (mercredi, cardio)', jour: 'dupont', paliers: [10, 25, 40], icon: 'infinity', color: '#FF4F6D' },
    { id: 'jambes', famille: 'seances', nom: 'Jambes de fer', cond: 'séances Meafou (jeudi, jambes)', jour: 'meafou', paliers: [10, 25, 40], icon: 'boot', color: '#3DFFB0' },
    { id: 'premiere', famille: 'regularite', nom: 'Première étoile', cond: 'Ta 1re séance validée', icon: 'star', color: '#FFC23D' },
    { id: 'parfaite', famille: 'regularite', nom: 'Semaine parfaite', cond: 'Les 6 étoiles d\'une semaine', icon: 'calendar', color: '#38E8FF' },
    { id: 'serie7', famille: 'regularite', nom: 'Série de 7', cond: '7 étoiles d\'affilée sans en rater', icon: 'flame', color: '#FF8A3D' },
    { id: 'fidele', famille: 'regularite', nom: 'Fidèle', cond: '25 séances à la maison', icon: 'shield', color: '#B48CFF' },
    { id: 'legende', famille: 'regularite', nom: 'Légende', cond: '56 étoiles sur un cycle de 8 semaines', icon: 'trophy', color: '#FFC23D' },
    { id: 'jeu10', famille: 'missions', nom: 'Prêt pour le jeu à 10', cond: 'Mission « Choisis ton poste » accomplie', mission: 'poste', lien: '#/mission/postes', icon: 'ball', color: '#38E8FF' },
    { id: 'copains', famille: 'missions', nom: 'Esprit d\'équipe', cond: 'Mission « Avec qui tu aimes jouer » accomplie', mission: 'copains', lien: '#/mission/copains', icon: 'group', color: '#3DFFB0' }
  ];
  // Défi « Meafou » : un test qui n'est pas dans le bilan
  var DEFI_TESTS = {
    squats_affilee: { id: 'squats_affilee', nom: 'Squats parfaits d\'affilée', court: 'Squats d\'affilée', unite: '' }
  };

  // ---------- Grades (XP) ----------
  var GRADES = [
    { nom: 'Recrue', xp: 0 },
    { nom: 'Espoir', xp: 1500 },
    { nom: 'Titulaire', xp: 4000 },
    { nom: 'Capitaine', xp: 8000 },
    { nom: 'International', xp: 14000 },
    { nom: 'Légende', xp: 22000 }
  ];
  var XP = {
    seance: 150,      // séance à la maison (lundi → jeudi)
    club: 50,         // club du mercredi soir ou du samedi
    recup: 30,        // récup du dimanche
    bonus: 200,       // les 6 étoiles de la semaine
    badge: 100,       // badge gagné
    record: 50,       // record battu (confirmé par un adulte)
    niveau: 100,      // montée de niveau (une fois par niveau atteint)
    premiersPas: 100, // les 4 « premiers pas » du nouveau joueur (une fois)
    mission: 200,     // une mission spéciale accomplie (en plus de son badge)
    etoile: 100       // une étoile Skills validée par un éduc
  };

  MC.CONTENT = {
    NIVEAUX: NIVEAUX, CLES: CLES, FAMILLES: FAMILLES, EXOS: EXOS, REVEIL: REVEIL, CALME: CALME,
    JOURS: JOURS, SEMAINE: SEMAINE, SLOTS: SLOTS, TESTS: TESTS, BADGES: BADGES, FAMILLES_BADGES: FAMILLES_BADGES, PALIERS: PALIERS, DEFI_TESTS: DEFI_TESTS,
    GRADES: GRADES, XP: XP,
    COULEURS: ['#38E8FF', '#FF4FA3', '#3DFFB0', '#FFC23D', '#B48CFF', '#FF8A3D', '#4D9BFF', '#FF4F6D', '#7CFF6B', '#F5F7FF']
  };
})();
