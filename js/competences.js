/* =========================================================
   Mode champion · M12 — SKILLS : le carnet de compétences rugby (référentiel v2, 25/10/2026)
   8 cartes, des étoiles indépendantes gagnées dans n'importe quel ordre (plus de limite à 5 par carte).
   Une étoile ne s'allume que quand un éduc la valide (après la séance, à un atelier d'évaluation ou
   après un plateau). Les enfants ne la découvrent qu'après l'entraînement.
   États d'une étoile : à débloquer · en mission · gagnée (à l'entraînement) · brille (vue au plateau).
   Repris de la grille papier « Évaluation des acquis » de Nicolas, enrichi avec le Livret du Jeune
   Joueur FFR M12 et les règlements M12 2026-2027.
   Pour chaque étoile : nom, phrase (ce que voit l'enfant), mission (titre de mission perso),
   conseil (« Comment t'entraîner »), repere (ce que regarde l'éduc).
   Les identifiants doivent rester ceux de Core.SKILLS (js/core.js) : une étoile déjà validée garde son id.
   ========================================================= */
window.MC = window.MC || {};

MC.SK = (function () {
  var DOMAINES = [
    { id: 'plaquage', nom: 'Plaquage', icon: 'shield', color: '#FF4FA3', etoiles: [
      { id: 'epaule', nom: 'Épaule', phrase: 'Je vise la taille avec l\'épaule', mission: 'Engager l\'épaule au plaquage',
        conseil: 'À genoux face à un copain, puis en marchant : la joue contre sa hanche, l\'épaule touche la taille, les bras serrent. Doucement, des deux côtés.',
        repere: 'Cible la taille et y engage l\'épaule (pas les bras seuls), tête relevée.' },
      { id: 'joue', nom: 'Joue contre le dos', phrase: 'Ma tête du bon côté, joue collée contre son dos', mission: 'Placer sa tête du bon côté',
        conseil: 'Ta tête passe derrière le porteur, jamais devant : ta joue colle à son dos. Au ralenti d\'abord, contre un bouclier.',
        repere: 'Tête du bon côté, sur le flanc ou dans le dos du porteur, jamais devant lui.' },
      { id: 'deux-cotes', nom: 'Des deux côtés', phrase: 'Je plaque aussi bien à gauche qu\'à droite', mission: 'Plaquer des deux côtés',
        conseil: 'Une fois épaule droite, une fois épaule gauche. Ton côté le moins facile : deux fois plus.',
        repere: 'Épaule et tête réussies à gauche et à droite.' },
      { id: 'cercle', nom: 'Cercle de fer', phrase: 'Je serre fort, il ne s\'échappe pas', mission: 'Serrer fort sans lâcher',
        conseil: 'Les bras en cercle autour des cuisses, les mains qui se tiennent, et tu ne lâches pas. Essaie sur un gros coussin.',
        repere: 'Serre les deux bras autour des cuisses jusqu\'au sol, sans lâcher.' },
      { id: 'tomber', nom: 'Je fais tomber', phrase: 'J\'avance, je pousse avec les jambes et il tombe vite', mission: 'Faire tomber vite',
        conseil: 'Petits pas pour avancer vers lui avant le contact, puis tu pousses avec les jambes. Les squats et la chaise de ta prépa te donnent cette force.',
        repere: 'Gagne du terrain avant le contact, pousse sur les jambes et fait tomber rapidement.' }
    ] },
    { id: 'passe', nom: 'Passe', icon: 'ball', color: '#38E8FF', etoiles: [
      { id: 'mains', nom: 'Mains en cible', phrase: 'Je réceptionne à l\'arrêt, mains tendues', mission: 'Réceptionner mains en cible',
        conseil: 'Mains ouvertes devant la poitrine, doigts vers le haut : tu montres où tu veux le ballon. À 5 m, 10 réceptions de suite.',
        repere: 'Mains en cible devant la poitrine, réception à 5 m à l\'arrêt sans échapper.' },
      { id: 'en-courant', nom: 'En courant', phrase: 'Je réceptionne en courant', mission: 'Réceptionner en courant',
        conseil: 'Cours droit, tourne les épaules vers le passeur, mains en cible. Ne ralentis pas pour attraper.',
        repere: 'Réception en course, sans ralentir, mains tendues vers le passeur.' },
      { id: 'droite', nom: 'Passe à droite', phrase: 'Je fais la passe en courant vers la droite', mission: 'Passer à droite en courant',
        conseil: 'Le ballon à deux mains, tu regardes ta cible, et tes mains finissent tendues vers elle.',
        repere: 'Passe en course vers la droite, dans la cible, les mains finissent vers la cible.' },
      { id: 'gauche', nom: 'Passe à gauche', phrase: 'Je fais la passe en courant vers la gauche', mission: 'Passer à gauche en courant',
        conseil: 'Pareil qu\'à droite, de l\'autre côté : regarde la cible, mains tendues vers elle à la fin.',
        repere: 'Passe en course vers la gauche, dans la cible, les mains finissent vers la cible.' },
      { id: 'vrillee', nom: 'Passe vrillée', phrase: 'Je fais une passe vrillée', mission: 'Réussir une passe vrillée',
        conseil: 'À l\'arrêt d\'abord : une main pousse, l\'autre fait tourner le ballon. Contre un mur à 3 m, puis plus loin.',
        repere: 'Passe vrillée à l\'arrêt, à gauche et à droite, trajectoire tendue.' },
      { id: 'piston', nom: 'Passe piston', phrase: 'Au contact ou en tombant, je pousse le ballon vers le copain tout proche qui m\'appelle', mission: 'Réussir une passe piston',
        conseil: 'Avec un copain juste à côté de toi : le ballon contre ta poitrine, tu le pousses d\'un coup sec vers lui, les bras qui se tendent. Puis à genoux, puis en tombant sur un tapis.',
        repere: 'Passe courte poussée, faite au contact ou pendant la chute, tournée vers le soutien proche qui appelle ; le ballon arrive dans ses mains.' }
    ] },
    { id: 'ruck', nom: 'Ruck', icon: 'group', color: '#3DFFB0', etoiles: [
      { id: 'dos-plat', nom: 'Dos plat', phrase: 'Dos plat, tête levée', mission: 'Garder le dos plat',
        conseil: 'À quatre pattes, une petite bouteille posée sur ton dos ne doit pas tomber. Tête levée, tu regardes devant.',
        repere: 'À 4 pattes, dos horizontal, tête levée, regard devant.' },
      { id: 'appuis', nom: 'Sur mes appuis', phrase: 'Je me déplace sur mes appuis dans les 4 directions', mission: 'Bouger sur ses appuis',
        conseil: 'À 4 pattes, genoux décollés : avance, recule, va à gauche et à droite. La marche de l\'ours de ta prépa aide beaucoup.',
        repere: 'Se déplace en 4 appuis dans les 4 directions, bassin à hauteur des épaules, jambes qui ne se croisent pas.' },
      { id: 'tete', nom: 'Tête bien placée', phrase: 'Ma tête est à la bonne place', mission: 'Placer sa tête au ruck',
        conseil: 'La tête plus haute que les hanches, menton levé. Tu regardes devant toi, pas le sol.',
        repere: 'Tête plus haute que les hanches, menton levé, regard devant.' },
      { id: 'gagne', nom: 'Je gagne le ballon', phrase: 'Je pousse dos droit et je gagne le ballon', mission: 'Gagner le ballon au ruck',
        conseil: 'Petits pas, dos droit, tu pousses avec les jambes pour passer au-dessus du ballon. Contre un bouclier tenu par un adulte.',
        repere: 'Pousse dos droit en petits pas et passe au-dessus du ballon.' },
      { id: 'roulade', nom: 'Roulade de judo', phrase: 'Je chute sans me faire mal, des deux côtés', mission: 'Rouler des deux côtés',
        conseil: 'Sur un tapis : roulade sur l\'épaule droite, puis sur la gauche. Menton rentré, bras arrondi.',
        repere: 'Roulade de judo sur l\'épaule gauche et sur la droite, menton rentré, se relève vite.' },
      { id: 'hors-jeu', nom: 'Hors-jeu au ruck', phrase: 'Si je ne suis pas dans le ruck, je reste derrière tout le corps du dernier copain du ruck', mission: 'Respecter le hors-jeu au ruck',
        conseil: 'Regarde le dernier copain du ruck : si une partie de son corps est plus en arrière que toi, tu es hors-jeu. Recule jusqu\'à être derrière lui tout entier, puis attends le ballon.',
        repere: 'Hors du ruck, reste derrière la ligne de hors-jeu : la partie du corps la plus en arrière, quelle qu\'elle soit, du dernier participant de son équipe.' },
      { id: 'porte', nom: 'Par la porte', phrase: 'J\'entre dans le ruck par mon camp, en arrivant de derrière le dernier copain', mission: 'Entrer dans le ruck par la porte',
        conseil: 'Avant d\'entrer dans le ruck, fais le tour s\'il le faut : tu arrives par derrière, dans l\'axe du ballon, jamais par le côté.',
        repere: 'Rejoint le ruck par son camp, de derrière le dernier participant de son équipe, dans l\'axe ; jamais par le côté.' }
    ] },
    { id: 'maul', nom: 'Maul', icon: 'pack', color: '#FF8A3D', etoiles: [
      { id: 'debout', nom: 'Debout', phrase: 'Au contact, je reste debout, tête haute, ballon caché', mission: 'Rester debout au contact',
        conseil: 'Face à un copain qui tient un coussin : tu avances et tu le touches avec l\'épaule, jambes fléchies, tête haute, le ballon serré contre toi, loin de lui. Tu restes sur tes pieds.',
        repere: 'Le porteur reste sur ses pieds au contact, ballon tenu loin du défenseur, sans pencher le buste en avant (tête haute).' },
      { id: 'tourne', nom: 'Je me tourne', phrase: 'Je me tourne vers mes copains et je leur montre le ballon', mission: 'Se tourner vers ses copains',
        conseil: 'Au contact, pivote : ton dos vers l\'adversaire, ton ballon vers ton équipe. Entraîne-toi au ralenti avec un copain.',
        repere: 'Pivote au contact pour présenter le ballon à son camp.' },
      { id: 'lie', nom: 'Je me lie', phrase: 'J\'arrive vite et je me colle au porteur, bien lié', mission: 'Se lier au porteur',
        conseil: 'Ton bras passe autour du porteur, ton épaule collée contre lui, jambes fléchies. Bien liés, on ne peut plus vous séparer.',
        repere: 'Le 1er soutien arrive vite et se lie (bras autour, épaule collée), bas sur ses appuis.' },
      { id: 'arrache', nom: 'J\'arrache', phrase: 'J\'arrache le ballon et je le fais passer derrière', mission: 'Arracher le ballon dans le maul',
        conseil: 'Avec un copain qui serre le ballon : tu mets tes mains dessus, tu tournes d\'un coup sec et tu le ramènes contre toi. Puis tu le passes au copain derrière.',
        repere: 'Prend le ballon des mains du porteur et le transmet vers l\'arrière (ou au demi de mêlée).' },
      { id: 'avance', nom: 'On avance', phrase: 'Petits pas, dos plat : on fait avancer le maul ensemble', mission: 'Faire avancer le maul',
        conseil: 'Petits pas rapides, dos plat, tête plus haute que les hanches : tout le monde pousse dans le même sens.',
        repere: 'Poussée groupée en petits pas, dos plat, tête au-dessus des hanches, personne au sol.' },
      { id: 'arrete', nom: 'Je l\'arrête debout', phrase: 'On bloque à deux, on ne tire jamais au sol', mission: 'Arrêter le maul debout',
        conseil: 'En défense, tu te colles au porteur avec un copain et vous poussez, debout. Tirer un joueur au sol est interdit et dangereux.',
        repere: 'Défend le maul debout, à deux, sans l\'écrouler (règle M12 : aucun soutien ne doit amener un adversaire au sol).' }
    ] },
    { id: 'defense', nom: 'Défense', icon: 'wall', color: '#4F7BFF', etoiles: [
      { id: 'ligne', nom: 'Ligne', phrase: 'Je me place en ligne avec mes copains, face au jeu', mission: 'Se placer en ligne',
        conseil: 'En défense, regarde à gauche et à droite : tu dois être à la même hauteur que tes copains, ni devant, ni derrière.',
        repere: 'Se place dans la ligne défensive, à hauteur de ses partenaires, sans être hors-jeu (« Ligne »).' },
      { id: 'jeu', nom: 'Jeu', phrase: 'Au signal, on monte tous ensemble', mission: 'Monter en ligne',
        conseil: 'Au mot « Jeu », toute la ligne avance en même temps. Si tu pars seul, tu laisses un trou.',
        repere: 'Monte avec la ligne, sans sortir seul (« Ligne » puis « Jeu »).' },
      { id: 'parle', nom: 'Je parle', phrase: 'Je dis qui je prends', mission: 'Annoncer qui je prends',
        conseil: 'En défense, parle fort : « Je prends le 10 ! », « J\'ai celui-là ! ». Tes copains savent où tu es et personne n\'est oublié.',
        repere: 'Annonce son vis-à-vis, ne laisse pas de trou avec ses voisins.' },
      { id: 'cadre', nom: 'Je cadre', phrase: 'Je monte vite, je ralentis et je le pousse vers la touche', mission: 'Cadrer le porteur',
        conseil: 'Vite pour fermer l\'espace, puis petits pas pour ne pas te faire déborder, et place-toi un peu à l\'intérieur de lui pour l\'envoyer vers la touche.',
        repere: 'Cadrage : montée vite-lent-vite, épaule extérieure face à la hanche intérieure du porteur, l\'oriente vers la touche.' },
      { id: 'retour', nom: 'Retour en ligne', phrase: 'Après un plaquage, je me relève vite et je reviens dans la ligne', mission: 'Revenir vite dans la ligne',
        conseil: 'Plaquer, c\'est la moitié du travail : relève-toi tout de suite et cours reprendre ta place dans la ligne.',
        repere: 'Après le plaquage : lâche le plaqué, se relève vite et se replace dans la ligne défensive.' }
    ] },
    { id: 'porteur', nom: 'Porteur', icon: 'bolt', color: '#FF4D4D', etoiles: [
      { id: 'droit', nom: 'Droit', phrase: 'Je redresse ma course et je tranche la défense', mission: 'Courir droit',
        conseil: 'Cours vers l\'en-but, pas vers la touche : choisis un trou entre deux défenseurs et fonce tout droit dedans.',
        repere: 'Redresse sa course vers l\'en-but et attaque l\'espace entre deux défenseurs (« Droit »).' },
      { id: 'avance', nom: 'Avance', phrase: 'J\'entre dans la défense et je continue d\'avancer', mission: 'Avancer au contact',
        conseil: 'Au contact, petits pas rapides et jambes qui poussent : tu ne t\'arrêtes pas au premier défenseur.',
        repere: 'Entre dans la défense et continue d\'avancer au contact, jambes actives (« Avance »).' },
      { id: 'cherche', nom: 'Cherche', phrase: 'Je passe avant le contact au copain bien placé', mission: 'Passer avant le contact',
        conseil: 'Lève la tête en courant : si un copain est mieux placé que toi, donne-lui le ballon avant que le défenseur te touche.',
        repere: 'Prend en compte le défenseur et le partenaire proche, donne avant le contact (« Cherche »).' },
      { id: 'raffut', nom: 'Raffut', phrase: 'Je repousse le plaqueur avec la paume, jamais au visage', mission: 'Réussir un raffut',
        conseil: 'Le ballon dans un bras, l\'autre bras tendu, la main ouverte : tu repousses l\'épaule ou le torse du plaqueur. Jamais le visage, jamais le poing.',
        repere: 'Raffut EDR : paume de la main, bras tendu, sur le haut du corps, jamais au visage.' },
      { id: 'tombe', nom: 'Je tombe bien', phrase: 'Plaqué, je tombe sans me faire mal, je m\'amortis avec les avant-bras', mission: 'Bien tomber quand je suis plaqué',
        conseil: 'Sur un tapis ou dans l\'herbe, à genoux d\'abord : tu te laisses tomber sur le côté et tes avant-bras amortissent. Puis debout, doucement.',
        repere: 'Chute contrôlée, amortie avec les avant-bras, tête protégée.' },
      { id: 'ballon-camp', nom: 'Ballon dans mon camp', phrase: 'Au sol, je protège le ballon et je le pose de mon côté, vers mes copains', mission: 'Poser le ballon dans son camp',
        conseil: 'Au sol, ton corps est entre le ballon et l\'adversaire : tu tends les bras et tu poses le ballon vers tes copains, tout de suite.',
        repere: 'Au sol : ballon protégé, posé tout de suite de son côté, bras tendus vers ses partenaires (au jeu à 5 : transmet ou libère immédiatement).' }
    ] },
    { id: 'pied', nom: 'Jeu au pied', icon: 'boot', color: '#FFC23D', etoiles: [
      { id: 'decolle', nom: 'Coup de pied décollé', phrase: 'Mon coup de pied décolle du sol', mission: 'Faire décoller le ballon',
        conseil: 'Lâche le ballon bien droit sur ton pied, frappe avec le lacet, pointe tendue.',
        repere: 'Le ballon décolle du sol, frappé avec le lacet, pointe tendue.' },
      { id: 'chandelle', nom: 'Chandelle', phrase: 'Je rattrape un ballon qui tombe du ciel', mission: 'Rattraper une chandelle',
        conseil: 'Lance-toi le ballon en l\'air, bras en panier, et serre-le contre ta poitrine. Puis de plus en plus haut.',
        repere: 'Rattrape un ballon haut, bras en panier, sans le faire tomber.' },
      { id: 'rasant', nom: 'Pied rasant', phrase: 'Je pousse le ballon au pied en courant', mission: 'Pousser le ballon au pied',
        conseil: 'Petits coups de pied doux en marchant, puis en courant : le ballon reste près de toi.',
        repere: 'Pousse le ballon au pied dans la course, le ballon reste près de lui.' },
      { id: 'ramasse', nom: 'Je ramasse', phrase: 'Je ramasse le ballon au sol en courant', mission: 'Ramasser le ballon en courant',
        conseil: 'Plie les jambes, pas le dos. Une main devant, une derrière, et tu repars vite.',
        repere: 'Ramasse le ballon au sol sans s\'arrêter, jambes fléchies.' },
      { id: 'vise', nom: 'Je vise juste', phrase: 'Mon drop retombe là où je vise', mission: 'Viser juste au drop',
        conseil: 'Vise une cible (un plot, un sac) à 10 m : lâche le ballon bien droit et frappe juste après le rebond.',
        repere: 'Drop qui retombe dans la zone visée (au coup d\'envoi du jeu à 10 : il passe les 5 m et reste dans le terrain).' },
      { id: 'deux-pieds', nom: 'Des deux pieds', phrase: 'Je tape aussi du pied qui n\'est pas mon préféré', mission: 'Taper des deux pieds',
        conseil: 'Contre un mur ou avec un copain : 10 coups de pied doux avec ton pied préféré, puis 10 avec l\'autre. L\'autre pied progresse vite si tu le fais travailler.',
        repere: 'Réussit un coup de pied contrôlé (drop ou volée) avec son mauvais pied.' }
    ] },
    { id: 'soutien', nom: 'Soutien', icon: 'kids', color: '#B6FF3B', etoiles: [
      { id: 'axe', nom: 'Axe', phrase: 'Je suis dans l\'axe, juste derrière le porteur', mission: 'Se placer dans l\'axe',
        conseil: 'Regarde le porteur : place-toi juste derrière lui, à deux ou trois pas, prêt à recevoir. Jamais à côté, jamais devant.',
        repere: 'Soutien proche dans l\'axe du porteur, en retrait, prêt à recevoir (« Axe »).' },
      { id: 'montre', nom: 'Je me montre', phrase: 'Je bouge et j\'appelle pour être libre avant d\'avoir le ballon', mission: 'Se démarquer avant le ballon',
        conseil: 'Avant que le ballon arrive, fais un pas d\'un côté puis pars de l\'autre, et appelle fort : « Là ! ».',
        repere: 'Se démarque et appelle avant de recevoir le ballon.' },
      { id: 'plus', nom: 'Plus', phrase: 'Quand on dit « Plus », je m\'écarte et je tiens la largeur', mission: 'Tenir la largeur',
        conseil: 'Si tu es loin du ballon, reste écarté vers la touche : c\'est toi qui recevras quand on écartera le jeu.',
        repere: 'Partenaire éloigné qui tient la largeur et ne vient pas s\'agglutiner près du ballon (« Plus »).' },
      { id: 'premier', nom: '1er arrivé', phrase: 'Mon copain est pris : j\'arrive le premier pour l\'aider', mission: 'Être le 1er soutien',
        conseil: 'Suis toujours le ballon des yeux : dès qu\'un copain est plaqué ou bloqué, fonce l\'aider. Le premier arrivé fait gagner le ballon.',
        repere: 'Arrive le premier au contact pour aider le porteur, debout ou au sol.' },
      { id: 'replace', nom: 'Je me replace', phrase: 'Après ma passe, je repars me placer', mission: 'Se replacer après la passe',
        conseil: 'Ta passe est partie ? Ne reste pas à regarder : repars te placer dans un espace libre pour rejouer.',
        repere: 'Se replace après sa passe dans un espace libre.' },
      { id: 'hors-jeu-pied', nom: 'Hors-jeu au pied', phrase: 'Un copain tape et je suis devant lui : je ne vais pas vers le ballon tant qu\'il ne m\'a pas dépassé', mission: 'Respecter le hors-jeu au pied',
        conseil: 'Quand un copain tape au pied, regarde où tu es : si tu es devant lui, attends qu\'il te dépasse (ou un copain parti derrière lui) avant de courir vers le ballon.',
        repere: 'Devant le botteur : n\'avance pas vers le ballon ni vers le receveur avant d\'être remis en jeu (dépassé par le botteur ou par un partenaire parti derrière lui).' }
    ] }
  ];
  // l'ordre d'affichage : le combat et la défense d'abord, puis le ballon et l'attaque (4 par ligne sur iPad)
  var ORDRE = ['plaquage', 'ruck', 'maul', 'defense', 'porteur', 'passe', 'pied', 'soutien'];
  DOMAINES.sort(function (a, b) { return ORDRE.indexOf(a.id) - ORDRE.indexOf(b.id); });

  // Ateliers prêts : les étoiles qu'on évalue ensemble dans une même situation (journée d'évaluation,
  // atelier d'évaluation). Un atelier peut mélanger plusieurs cartes. 5 étoiles au plus (largeur du téléphone).
  var ATELIERS = [
    { id: 'plaquage-1c1', nom: 'Plaquage 1 contre 1', etoiles: ['plaquage:epaule', 'plaquage:joue', 'plaquage:deux-cotes', 'plaquage:cercle', 'plaquage:tomber'] },
    { id: 'passes-course', nom: 'Passes en course', etoiles: ['passe:mains', 'passe:en-courant', 'passe:droite', 'passe:gauche'] },
    { id: 'vrillee-piston', nom: 'Vrillée et piston', etoiles: ['passe:vrillee', 'passe:piston'] },
    { id: 'posture', nom: 'Posture au sol', etoiles: ['ruck:dos-plat', 'ruck:appuis', 'ruck:tete', 'ruck:gagne', 'ruck:roulade'] },
    { id: 'plaque-ruck', nom: 'Plaqué, puis ruck', etoiles: ['porteur:tombe', 'porteur:ballon-camp', 'soutien:premier', 'ruck:porte', 'ruck:hors-jeu'] },
    { id: 'maul', nom: 'Maul', etoiles: ['maul:debout', 'maul:tourne', 'maul:lie', 'maul:arrache', 'maul:avance'] },
    { id: 'porteur', nom: 'Porteur face au défenseur', etoiles: ['porteur:droit', 'porteur:avance', 'porteur:cherche', 'porteur:raffut'] },
    { id: 'golf', nom: 'Parcours au pied', etoiles: ['pied:decolle', 'pied:vise', 'pied:deux-pieds', 'pied:rasant'] },
    { id: 'reception', nom: 'Réceptions et ramassage', etoiles: ['pied:chandelle', 'pied:ramasse', 'passe:en-courant'] },
    { id: 'jeu-attaque', nom: 'Jeu réduit · attaque', etoiles: ['soutien:axe', 'soutien:montre', 'soutien:plus', 'soutien:replace', 'soutien:hors-jeu-pied'] },
    { id: 'jeu-defense', nom: 'Jeu réduit · défense', etoiles: ['defense:ligne', 'defense:jeu', 'defense:parle', 'defense:cadre', 'defense:retour'] }
  ];

  // le grade d'une carte : selon la part de ses étoiles gagnées, puis Légende quand toutes brillent
  var GRADES = [
    { n: 0, nom: 'À débloquer', color: '#56628A' },
    { n: 1, nom: 'Bronze', color: '#D9A06B' },
    { n: 2, nom: 'Argent', color: '#C9D1E0' },
    { n: 3, nom: 'Or', color: '#FFC23D' },
    { n: 4, nom: 'Diamant', color: '#7FE7FF' },
    { n: 5, nom: 'Légende', color: '#FF7FBC' }
  ];
  var MAX_PLUS1 = 5, PROPOSE_AU = 3, MAX_ATELIER = 5;

  function dom(id) { for (var i = 0; i < DOMAINES.length; i++) if (DOMAINES[i].id === id) return DOMAINES[i]; return null; }
  function star(d, e) { var D = dom(d); if (!D) return null; for (var i = 0; i < D.etoiles.length; i++) if (D.etoiles[i].id === e) return D.etoiles[i]; return null; }
  function key(d, e) { return d + ':' + e; }
  function parseKey(k) { var i = String(k).indexOf(':'); return i < 0 ? null : { d: k.slice(0, i), e: k.slice(i + 1) }; }
  // le nombre d'étoiles à partir duquel une carte passe à chaque grade (Bronze, Argent, Or, Diamant)
  function paliers(max) {
    var arg = Math.max(2, Math.ceil(max / 3)), or = Math.max(arg + 1, Math.ceil(2 * max / 3));
    return [1, arg, Math.min(or, max), max];
  }
  // grade(n, max, nbBrille) ; sans max, l'ancienne règle d'une carte de 5
  function grade(n, max, nb) {
    n = n || 0; max = max || 5;
    if (n <= 0) return GRADES[0];
    if (n >= max && (nb || 0) >= max) return GRADES[5];
    var p = paliers(max), g = 0;
    for (var i = 0; i < p.length; i++) if (n >= p[i]) g = i + 1;
    return GRADES[Math.min(4, g)];
  }
  // combien d'étoiles manquent pour le grade suivant (null si Diamant atteint : il reste à les faire briller)
  function avantGradeSuivant(n, max) {
    var p = paliers(max);
    for (var i = 0; i < p.length; i++) if (n < p[i]) return { manque: p[i] - n, grade: GRADES[i + 1] };
    return null;
  }
  function brille(row) { return !!(row && row.brille); }
  // les étoiles validées d'un enfant : { 'plaquage:epaule': ligne }
  function acquis(data) {
    var o = {};
    ((data && data.etoiles) || []).forEach(function (e) { if (dom(e.domaine) && star(e.domaine, e.etoile)) o[key(e.domaine, e.etoile)] = e; });
    return o;
  }
  function total(data) { return Object.keys(acquis(data)).length; }
  function totalBrille(data) { var A = acquis(data); return Object.keys(A).filter(function (k) { return brille(A[k]); }).length; }
  var MAX_TOTAL = DOMAINES.reduce(function (s, D) { return s + D.etoiles.length; }, 0);
  function carte(data, d) {
    var D = dom(d), A = acquis(data), n = 0, nb = 0;
    var stars = D.etoiles.map(function (s) { var row = A[key(d, s.id)] || null; if (row) n++; if (brille(row)) nb++; return { def: s, row: row, brille: brille(row) }; });
    return { dom: D, n: n, max: D.etoiles.length, nbBrille: nb, grade: grade(n, D.etoiles.length, nb), stars: stars, suivant: avantGradeSuivant(n, D.etoiles.length) };
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
      if (c.n >= c.max) return;
      if (!best || c.n / c.max > best.n / best.max) best = c;
    });
    if (!best) return null;
    var s = best.stars.filter(function (x) { return !x.row; })[0];
    return { d: best.dom.id, e: s.def.id, mission: null };
  }
  // ----- les demandes des enfants (« Valide-moi cette étoile », « Je l'ai fait au plateau ») -----
  // une seule demande en attente par enfant ; sorte : 'gagner' (étoile pas encore gagnée) ou 'briller' (déjà gagnée)
  function demandeEnCours(data) {
    var l = ((data && data.demandes) || []).filter(function (x) { return x.statut === 'attente'; });
    return l[0] || null;
  }
  function peutDemander(data, d, e) {
    if (!star(d, e) || demandeEnCours(data)) return null;
    var row = acquis(data)[key(d, e)];
    if (!row) return 'gagner';
    if (!brille(row)) return 'briller';
    return null;
  }
  function atelier(id) { for (var i = 0; i < ATELIERS.length; i++) if (ATELIERS[i].id === id) return ATELIERS[i]; return null; }

  return {
    DOMAINES: DOMAINES, GRADES: GRADES, ATELIERS: ATELIERS, MAX_PLUS1: MAX_PLUS1, PROPOSE_AU: PROPOSE_AU, MAX_ATELIER: MAX_ATELIER, MAX_TOTAL: MAX_TOTAL,
    dom: dom, star: star, key: key, parseKey: parseKey, grade: grade, paliers: paliers, avantGradeSuivant: avantGradeSuivant, brille: brille,
    acquis: acquis, total: total, totalBrille: totalBrille, carte: carte, atelier: atelier,
    missionPerso: missionPerso, plus1: plus1, titreMission: titreMission, prochainDefi: prochainDefi,
    demandeEnCours: demandeEnCours, peutDemander: peutDemander
  };
})();
