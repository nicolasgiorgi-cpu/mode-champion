/* =========================================================
   Mode champion · M12 — FICHES DÉTAILLÉES (bouton « Détails »)
   Pour chaque exercice, test du bilan ou étape d'échauffement :
   but = à quoi ça sert, etapes = comment faire, erreurs = à éviter,
   securite = règles de sécurité. Pour changer un texte : c'est ici.
   ========================================================= */
window.MC = window.MC || {};

(function () {
  var F = {
    // ===== LUNDI · CROS =====
    suspension: {
      but: 'Des mains, des avant-bras et des épaules solides : c\'est ce qui te permet de garder le ballon quand on te plaque.',
      etapes: ['Place une chaise stable sous la barre et monte dessus.', 'Attrape la barre à pleines mains (les pouces font le tour), mains écartées comme les épaules.', 'Plie les jambes pour que les pieds quittent la chaise : tu es suspendu.', 'Tire les épaules vers le bas, loin des oreilles. Corps droit, ventre serré.', 'Respire normalement et regarde devant toi.', 'À la fin, repose les pieds sur la chaise AVANT de lâcher la barre.'],
      erreurs: ['Épaules collées aux oreilles.', 'Se balancer pour tenir plus longtemps.', 'Bloquer sa respiration.'],
      securite: ['Toujours une chaise pour monter et pour descendre : on ne saute jamais de la barre.', 'Barre bien fixée, vérifiée par un adulte. Les pieds restent près du sol.', 'Mains moites : essuie-les. Si ça glisse, repose les pieds tout de suite.', 'Un adulte à côté les premières fois.']
    },
    superman: {
      but: 'Muscler le dos et les fesses, les muscles qui te gardent droit dans les contacts et en mêlée.',
      etapes: ['Allonge-toi à plat ventre sur un tapis, bras tendus devant, jambes tendues.', 'Regarde le tapis : le front reste à quelques centimètres du sol.', 'Décolle en même temps les bras, la poitrine et les jambes, juste un peu (5 à 10 cm suffisent).', 'Tiens en serrant les fesses (2 s, ou 3 s en N3-N4 ; en « tenu », tout le temps du chrono).', 'Redescends doucement.'],
      erreurs: ['Lever la tête pour regarder devant : ça tord le cou.', 'Monter trop haut en creusant fort le dos.', 'Plier les genoux.'],
      securite: ['Mouvement lent, sans à-coups.', 'Mal dans le bas du dos : monte moins haut, ou arrête.']
    },
    tractions: {
      but: 'Le roi des exercices pour les bras et le dos : tirer un adversaire, arracher un ballon, tenir dans un maul.',
      etapes: ['Accroche l\'élastique en boucle autour de la barre (une boucle passe dans l\'autre, tire pour serrer).', 'Monte sur la chaise et attrape la barre, paumes vers l\'avant, mains un peu plus larges que les épaules.', 'Mets un genou (ou un pied) dans l\'élastique, puis descends doucement de la chaise.', 'Tire la poitrine vers la barre jusqu\'à ce que le menton passe au-dessus.', 'Redescends lentement en comptant 3, jusqu\'aux bras presque tendus.', 'Pour sortir : pieds sur la chaise, retire le genou de l\'élastique, puis lâche.'],
      erreurs: ['Se balancer ou donner des coups de jambes.', 'Ne monter qu\'à moitié.', 'Se laisser tomber en descendant.'],
      securite: ['Élastique en bon état (pas fendu, pas craquelé), bien serré sur la barre.', 'Choix de l\'élastique : 30 kg aide le plus, puis 20 kg, puis 10 kg aide le moins.', 'Un adulte vérifie la barre et reste à côté.', 'Jamais de traction avec élan.']
    },
    tirage_elastique: {
      but: 'Le même travail que les tractions (dos et bras), sans barre.',
      etapes: ['Fixe l\'élastique en haut d\'une porte FERMÉE (ou un parent le tient debout sur une chaise).', 'À genoux face à la porte, bras tendus vers le haut, élastique un peu tendu.', 'Tire les poignées vers la poitrine : coudes vers le bas et vers l\'arrière, omoplates serrées.', 'Reviens lentement, bras tendus.'],
      erreurs: ['Se pencher en arrière pour tirer.', 'Laisser l\'élastique revenir d\'un coup.'],
      securite: ['Porte fermée (à clé si possible), du côté où elle ne s\'ouvre pas vers toi.', 'Élastique pas abîmé, le visage jamais dans l\'axe de l\'élastique.']
    },
    pompes: {
      but: 'Pectoraux, épaules, bras et gainage : pour repousser un adversaire et te relever vite.',
      etapes: ['Mains au sol sous les épaules, doigts vers l\'avant.', 'Jambes tendues, sur la pointe des pieds : les genoux ne touchent pas le sol. Ton corps fait une planche de la tête aux talons.', 'Serre le ventre et les fesses.', 'Descends la poitrine jusqu\'à 5 cm du sol, coudes vers l\'arrière (pas écartés sur les côtés).', 'Pousse fort pour remonter, bras tendus. Souffle en remontant.', 'Trop dur ? Mains sur un appui solide (canapé, marche d\'escalier) : plus l\'appui est haut, plus c\'est facile. Le corps reste droit.'],
      erreurs: ['Fesses en l\'air, ou ventre qui touche le sol en premier.', 'Coudes ouverts sur les côtés.', 'Descendre seulement à moitié.'],
      securite: ['Appui stable qui ne glisse pas : canapé, marche, chaise calée contre le mur.', 'Si le dos se creuse : mets les mains plus haut.', 'Mal au poignet : pose les mains sur les poings fermés ou sur un livre.']
    },
    rowing: {
      but: 'Muscler le haut du dos : de bonnes épaules et une belle posture.',
      etapes: ['Assis au sol, jambes tendues, dos bien droit.', 'Passe l\'élastique sous la plante des pieds, une poignée dans chaque main.', 'Tire les coudes vers l\'arrière, près du corps, en serrant les omoplates.', 'Reviens lentement, bras tendus.'],
      erreurs: ['Se pencher en arrière pour tirer.', 'Hausser les épaules.'],
      securite: ['Élastique bien coincé sous les pieds (baskets conseillées).', 'Élastique 10, 20 ou 30 kg selon ton niveau (ici, 30 kg = le plus dur).', 'Élastique pas abîmé.']
    },
    planche: {
      but: 'Le gainage : un ventre et un dos solides pour rester debout dans les contacts.',
      etapes: ['Avant-bras au sol, coudes sous les épaules.', 'Jambes tendues, sur la pointe des pieds.', 'Une ligne droite de la tête aux talons.', 'Serre le ventre et les fesses, regarde le sol.', 'Respire calmement tout le temps.'],
      erreurs: ['Fesses trop hautes (la montagne) ou trop basses (le hamac).', 'Bloquer sa respiration.', 'Laisser tomber la tête.'],
      securite: ['Tu ne peux plus garder la ligne droite : arrête, souffle, recommence après le repos.', 'Mal dans le bas du dos : arrête.']
    },

    // ===== MARDI · CAPUOZZO =====
    corde: {
      but: 'Des appuis légers et rapides, du souffle et de la coordination.',
      etapes: ['Réglage : pieds sur la corde, les poignées arrivent aux aisselles.', 'Coudes près du corps, mains à hauteur des hanches.', 'La corde tourne avec les poignets, pas avec les bras.', 'Petits sauts sur la pointe des pieds, juste assez haut pour laisser passer la corde.', 'Regarde devant toi.'],
      erreurs: ['Sauter trop haut.', 'Atterrir sur les talons.', 'Faire de grands mouvements de bras.'],
      securite: ['De la place tout autour : rien à casser, personne à côté.', 'Sol non glissant, baskets conseillées. Plafond assez haut.']
    },
    corde_imaginaire: {
      but: 'Le même travail que la corde, sans corde.',
      etapes: ['Petits sauts pieds joints sur la pointe des pieds.', 'Les poignets tournent comme s\'il y avait une corde.', 'Garde le rythme, regard devant.'],
      erreurs: ['Sauter trop haut.', 'Atterrir sur les talons.'],
      securite: ['Sol non glissant, de la place autour.']
    },
    saut_longueur: {
      but: 'L\'explosivité : partir vite, sauter pour un ballon, passer à travers un plaquage.',
      etapes: ['Pieds écartés comme les épaules, derrière une ligne.', 'Plie les genoux et lance les bras en arrière.', 'Lance les bras vers l\'avant et pousse fort sur les deux jambes.', 'Atterris sur les deux pieds, genoux pliés, SANS BRUIT, comme un chat.', 'Tiens l\'équilibre 2 secondes avant le saut suivant.'],
      erreurs: ['Atterrir jambes tendues (ça claque).', 'Genoux qui rentrent vers l\'intérieur à la réception.', 'Enchaîner sans contrôler.'],
      securite: ['Sol non glissant, zone de réception dégagée.', 'La réception fait du bruit ou fait mal : saute moins loin.']
    },
    sauts_lateraux: {
      but: 'Des appuis rapides pour changer de direction et éviter un défenseur.',
      etapes: ['Pose une corde à plat ou trace une ligne au sol.', 'Pieds joints à côté de la ligne, genoux un peu pliés.', 'Saute par-dessus la ligne, de gauche à droite, pieds joints.', 'À FOND : le plus de sauts possible, tout petits et très rapides, sur la pointe des pieds.'],
      erreurs: ['Sauter haut au lieu de sauter vite.', 'Toucher la ligne.', 'Atterrir sur les talons.'],
      securite: ['La corde est posée à plat, jamais tendue.', 'Sol non glissant.']
    },
    skipping: {
      but: 'La vitesse des pieds : plus tes pieds sont rapides, plus tu démarres vite.',
      etapes: ['Debout, grand, le buste droit.', 'Monte un genou à hauteur de la hanche, puis l\'autre.', 'Pose les pieds sur la pointe, sous toi.', 'Les bras bougent avec les jambes (bras opposé au genou).', 'À FOND : « pieds de feu », le plus de montées possible pendant le chrono, comme si le sol était brûlant. L\'animation est au ralenti : toi, tu vas beaucoup plus vite !'],
      erreurs: ['Aller doucement : ici c\'est vitesse maximum.', 'Se pencher en arrière.', 'Taper les talons au sol.'],
      securite: ['Toujours échauffé avant.', 'Sol non glissant.']
    },
    departs: {
      but: 'Te relever et partir avant le défenseur, comme après un plaquage.',
      etapes: ['Choisis une position de départ : debout, à genoux, assis ou à plat ventre.', 'Quelqu\'un dit « Go ! » (ou tu comptes jusqu\'à 3).', 'Relève-toi le plus vite possible et sprinte 10 m à fond.', 'Ralentis petit à petit après la ligne.', 'Reviens en marchant : c\'est ton repos.'],
      erreurs: ['Partir avant le signal.', 'S\'arrêter d\'un coup sur la ligne.'],
      securite: ['Échauffement obligatoire avant les sprints.', 'Couloir dégagé, sol non glissant, de la place après l\'arrivée pour freiner (pas de mur juste après).', 'Baskets ou pieds nus, jamais en chaussettes.']
    },
    montees_marche: {
      but: 'Pousser fort sur une jambe : c\'est le geste du démarrage, du sprint et du maul.',
      etapes: ['Face à une marche stable de 20 à 30 cm.', 'Pose un pied ENTIER sur la marche.', 'Pousse fort sur ce pied pour monter, en levant l\'autre genou haut.', 'Redescends en contrôle, puis change de jambe : droite, gauche, droite, gauche…', 'Chaque montée est explosive, la descente est calme.'],
      erreurs: ['Pousser avec la jambe qui reste en bas.', 'Seulement la pointe du pied sur la marche.', 'Genou qui rentre vers l\'intérieur.'],
      securite: ['Marche stable qui ne glisse pas (escalier : la première marche, la rampe à côté).', 'Jamais en chaussettes.']
    },
    montees_genoux: {
      but: 'La poussée d\'une jambe, sans marche.',
      etapes: ['Debout sur place.', 'Pousse fort sur une jambe : le genou opposé monte vite à hauteur de hanche.', 'Redescends en contrôle et change de jambe.'],
      erreurs: ['Se pencher en arrière.', 'Aller lentement.'],
      securite: ['Sol non glissant.']
    },

    // ===== MERCREDI · DUPONT =====
    intervalles_corde: {
      but: 'Le souffle : courir, plaquer, se relever et recommencer.',
      etapes: ['Pendant « CORDE » : petits sauts réguliers.', 'Pendant « MARCHE » : marche sur place et respire profondément.', 'Le site bipe à chaque changement.', 'Tu te trompes : repars tout de suite, le temps continue.'],
      erreurs: ['Partir trop vite au premier intervalle et exploser ensuite.', 'S\'arrêter pendant la marche.'],
      securite: ['Bois de l\'eau avant et après.', 'Mal à la tête, à la poitrine, ou beaucoup trop essoufflé : arrête et préviens un adulte.']
    },
    circuit: {
      but: 'Comme dans un match : enchaîner les efforts, se relever, repartir. Tout se fait sur place.',
      etapes: ['Pieds rapides : 10 s en position de plaqueur (genoux pliés, dos plat, bras prêts), les pieds tapent le sol le plus vite possible.', 'Jumping jacks : saute en écartant bras et jambes, puis referme.', 'Burpees : accroupi, mains au sol, pieds en arrière (planche), pieds vers les mains, saut bras en l\'air.', 'Mountain climbers : en planche sur les mains, ramène vite un genou puis l\'autre vers la poitrine.', '« Debout ! » : allongé sur le dos, lève-toi le plus vite possible.', 'Enchaîne les 5 = 1 tour, puis repos.'],
      erreurs: ['Bâcler les mouvements pour aller vite.', 'Dos qui s\'effondre en planche.'],
      securite: ['Un tapis pour les burpees et les « debout ».', 'Dégage l\'espace autour de toi.', 'Bois de l\'eau.']
    },

    // ===== JEUDI · MEAFOU =====
    squat: {
      but: 'Des jambes fortes : pousser en mêlée, plaquer bas, sprinter.',
      etapes: ['Pieds écartés comme les épaules, pointes un peu vers l\'extérieur.', 'Descends les fesses en arrière comme pour t\'asseoir.', 'Les genoux suivent la direction des pieds, les talons restent collés au sol.', 'Poitrine haute, regard devant, bras devant pour l\'équilibre.', 'Descends au moins jusqu\'aux cuisses horizontales, puis remonte fort.'],
      erreurs: ['Genoux qui rentrent vers l\'intérieur.', 'Talons qui décollent.', 'Dos rond.'],
      securite: ['Mouvement lent et contrôlé (descente en 2-3 s).', 'Au début, une chaise derrière toi aide à savoir jusqu\'où descendre (on la frôle, on ne s\'assoit pas).']
    },
    fentes: {
      but: 'De la force et de l\'équilibre sur une jambe, comme dans la course.',
      etapes: ['Debout, pieds écartés comme les hanches, mains sur les hanches.', 'Fais un grand pas en avant.', 'Descends : le genou arrière frôle le sol sans le toucher.', 'Le genou avant reste au-dessus du pied.', 'Relève-toi en ramenant la jambe arrière devant : c\'est l\'autre jambe qui fait le pas suivant. On avance en alternant.'],
      erreurs: ['Genou avant qui part loin devant les orteils.', 'Buste penché en avant.', 'Faire de trop petits pas.'],
      securite: ['De la place devant toi (5-6 m). Pas de place : fais-les sur place, en revenant à chaque fois.', 'Le genou arrière frôle, il ne cogne pas le sol.']
    },
    pont: {
      but: 'Les fessiers : le moteur du sprint et de la poussée.',
      etapes: ['Allongé sur le dos, genoux pliés, pieds à plat près des fesses.', 'Bras le long du corps.', 'Soulève le bassin en serrant les fesses : genoux, hanches et épaules sont alignés.', 'Tiens 2 secondes en haut, puis redescends doucement.', 'N3-N4 : une jambe tendue en l\'air, on pousse sur l\'autre.'],
      erreurs: ['Pousser avec le dos en le creusant.', 'Pieds trop loin des fesses.'],
      securite: ['Sur un tapis.', 'Mal dans le bas du dos : monte moins haut.']
    },
    pas_crabe: {
      but: 'Les muscles sur le côté des hanches : ils protègent les genoux quand tu changes de direction.',
      etapes: ['Mini-élastique autour des jambes, juste au-dessus des genoux.', 'Demi-squat : genoux pliés, fesses en arrière, dos droit.', '3 pas de côté vers la droite, les pieds ne se touchent jamais.', 'Puis 3 pas vers la gauche pour revenir : c\'est 1 aller-retour.', 'Reste bas tout le temps, l\'élastique toujours un peu tendu.'],
      erreurs: ['Se relever entre les pas.', 'Genoux qui se rapprochent.', 'Traîner les pieds.'],
      securite: ['Un espace de 2 m suffit.', 'Élastique au-dessus des genoux, jamais sur l\'articulation.']
    },
    mollets: {
      but: 'Des chevilles solides et des appuis toniques.',
      etapes: ['Pointes des pieds sur le bord d\'une marche, talons dans le vide.', 'Une main au mur ou sur la rampe.', 'Monte sur la pointe des pieds le plus haut possible.', 'Redescends lentement, talons un peu plus bas que la marche.', 'Sans marche : pointes sur un livre épais.'],
      erreurs: ['Rebondir en bas.', 'Plier les genoux.'],
      securite: ['Toujours une main en appui.', 'La première marche de l\'escalier, pas plus haut.']
    },
    dead_bug: {
      but: 'Un gainage qui protège le dos, en bougeant les bras et les jambes.',
      etapes: ['Sur le dos, bras tendus vers le plafond, genoux pliés à 90° au-dessus des hanches.', 'Colle le bas du dos au tapis.', 'Tends lentement un bras derrière la tête et la jambe opposée vers l\'avant, sans toucher le sol.', 'Reviens, puis change de côté. Souffle quand tu tends.'],
      erreurs: ['Le bas du dos qui décolle du tapis.', 'Aller trop vite.'],
      securite: ['Sur un tapis.', 'Le dos décolle : tends moins loin.']
    },
    marche_ours: {
      but: 'Coordination, gainage et épaules : comme pour aller chercher un ballon au sol.',
      etapes: ['À 4 pattes, mains sous les épaules, genoux sous les hanches.', 'Décolle les genoux de 5 cm.', 'Avance la main droite et le pied gauche en même temps, puis l\'inverse.', 'Dos plat (un verre d\'eau posé dessus ne tomberait pas), genoux toujours près du sol.'],
      erreurs: ['Fesses en l\'air.', 'Genoux qui touchent le sol.'],
      securite: ['Couloir dégagé, sol propre.']
    },
    flamant: {
      but: 'L\'équilibre et des chevilles solides : rester debout dans les contacts, moins d\'entorses.',
      etapes: ['Debout près d\'un mur, sur un pied.', 'Lève l\'autre genou devant toi, bras écartés.', 'Regarde un point fixe devant toi.', 'Tiens le temps demandé, puis change de pied.', 'Plus dur : les yeux fermés, puis sur un tapis plié.'],
      erreurs: ['Regarder ses pieds.', 'Bloquer sa respiration.'],
      securite: ['Près d\'un mur pour te rattraper, rien de dur ou de pointu autour.', 'Yeux fermés seulement quand c\'est facile les yeux ouverts.']
    },

    // ===== TESTS DU BILAN (protocole) =====
    t_navette: {
      but: 'Mesurer ta vitesse et tes changements de direction.',
      etapes: ['Deux lignes à 10 m l\'une de l\'autre.', 'Départ debout derrière une ligne, au « Go ! ».', '5 longueurs : à chaque bout, un pied touche la ligne et tu repars.', 'Le chrono s\'arrête quand tu passes la dernière ligne.'],
      erreurs: ['Ne pas toucher la ligne.', 'Freiner trop tôt à la fin.'],
      securite: ['Échauffement obligatoire.', 'Sol non glissant, aucun obstacle, de la place pour freiner après l\'arrivée.', 'Baskets.']
    },
    t_tract: {
      but: 'Savoir quel élastique te donne le bon niveau de tractions.',
      etapes: ['D\'abord SANS élastique : le plus possible, menton au-dessus de la barre, descente complète, sans balancement.', 'Moins de 5 : repos, puis avec l\'élastique 10 kg.', 'Toujours moins de 5 : élastique 20 kg, puis 30 kg (celui qui aide le plus).', 'On note avec quel élastique tu en fais 5 ou plus, et combien.'],
      erreurs: ['Se balancer.', 'Ne pas descendre bras tendus.'],
      securite: ['Chaise pour monter et descendre, un adulte à côté.', 'Élastique en bon état, bien serré sur la barre.']
    },
    t_pompes: {
      but: 'Compter tes pompes complètes.',
      etapes: ['Pompes au sol, sur la pointe des pieds (les genoux ne touchent pas).', 'Corps en planche, la poitrine descend à 5 cm du sol.', 'Bras tendus en haut.', 'Le plus possible d\'affilée : on arrête quand le corps n\'est plus droit.'],
      erreurs: ['Fesses en l\'air ou ventre qui s\'affaisse.', 'Descendre à moitié.'],
      securite: ['Mal au poignet : poings fermés ou mains sur un livre.']
    },
    t_squats: {
      but: 'L\'endurance des jambes en 1 minute.',
      etapes: ['Squat profond : cuisses au moins horizontales, talons au sol.', 'On ne compte que les squats complets.', 'L\'adulte touche +1 à chaque squat.'],
      erreurs: ['Descendre à moitié pour aller plus vite.', 'Genoux qui rentrent.'],
      securite: ['Régulier plutôt que trop vite au début.']
    },
    t_chaise: {
      but: 'L\'endurance des cuisses.',
      etapes: ['Dos plaqué au mur.', 'Descends jusqu\'aux cuisses horizontales, genoux au-dessus des chevilles.', 'Bras le long du corps ou croisés : interdit de poser les mains sur les cuisses.', 'Tiens le plus longtemps possible.'],
      erreurs: ['Pieds trop près du mur (genoux devant les orteils).', 'Fesses qui remontent.'],
      securite: ['Pieds nus ou baskets, jamais en chaussettes (ça glisse).', 'Mal au genou : arrête.']
    },
    t_ligne: {
      but: 'La version sans corde : des appuis rapides.',
      etapes: ['Une ligne au sol (craie, ruban, lacet).', 'Saute par-dessus pieds joints, de gauche à droite.', 'Sans t\'arrêter ni toucher la ligne : on compte les passages.'],
      erreurs: ['Toucher la ligne.', 'Sauter trop haut.'],
      securite: ['Sol non glissant.']
    },
    t_burpees: {
      but: 'Se relever vite et repartir, pendant 1 minute.',
      etapes: ['Debout.', 'Accroupis-toi, mains au sol.', 'Saute les pieds en arrière : position de planche.', 'Ramène les pieds vers les mains.', 'Saute bras en l\'air : ça fait 1. Technique complète à chaque fois.'],
      erreurs: ['Dos qui s\'effondre en planche.', 'Oublier le saut.'],
      securite: ['Sur un tapis ou un sol souple.', 'La qualité avant la vitesse.']
    },

    // ===== RÉVEIL DU GUERRIER =====
    r_corde: {
      but: 'Faire monter doucement le cœur et réveiller les chevilles.',
      etapes: ['Petits sauts pieds joints, réguliers.', 'Sans forcer : c\'est un échauffement.', 'Sans corde : corde imaginaire.'],
      erreurs: ['Partir trop vite.'],
      securite: ['De la place autour, sol non glissant.']
    },
    r_cercles: {
      but: 'Huiler toutes les articulations avant l\'effort.',
      etapes: ['Chevilles : pointe au sol, dessine des cercles avec le pied.', 'Genoux : mains sur les genoux, petits cercles.', 'Hanches : mains sur les hanches, grands cercles.', 'Épaules, puis poignets.', 'Cou : TOUT doucement, demi-cercles d\'une épaule à l\'autre.'],
      erreurs: ['Aller trop vite.'],
      securite: ['Le cou se tourne doucement, jamais de grands cercles rapides.']
    },
    r_genoux: {
      but: 'Réveiller les jambes et le cœur.',
      etapes: ['Sur place, en rythme (pas à fond).', 'Les genoux montent à hauteur des hanches.', 'Les bras bougent avec les jambes.'],
      erreurs: ['Se pencher en arrière.'],
      securite: ['Sol non glissant.']
    },
    r_talons: {
      but: 'Échauffer l\'arrière des cuisses.',
      etapes: ['Course sur place.', 'Les talons viennent toucher les fesses.', 'Reste sur la pointe des pieds.'],
      erreurs: ['Se pencher en avant.'],
      securite: ['Sol non glissant.']
    },
    r_squats: {
      but: 'Échauffer les cuisses, les fesses et les genoux.',
      etapes: ['Pieds écartés comme les épaules.', 'Descends lentement comme pour t\'asseoir, talons au sol.', 'Remonte. 10 fois, tranquillement.'],
      erreurs: ['Genoux qui rentrent.', 'Talons qui décollent.'],
      securite: ['Lent et contrôlé.']
    },
    r_araignee: {
      but: 'Réveiller les épaules et le gainage.',
      etapes: ['À 4 pattes, fesses basses.', 'Un bras et la jambe opposée avancent en même temps.', '6 pas, doucement.'],
      erreurs: ['Fesses en l\'air.'],
      securite: ['Couloir dégagé.']
    },
    r_moulin: {
      but: 'Préparer les épaules (plaquages, passes, mêlée).',
      etapes: ['Debout, bras tendus.', '10 grands cercles vers l\'avant.', 'Puis 10 vers l\'arrière.'],
      erreurs: ['Plier les bras.', 'Aller trop vite.'],
      securite: ['Personne à côté de toi (attention aux mains).']
    },

    // ===== RETOUR AU CALME =====
    c_respi: {
      but: 'Faire redescendre le cœur et se calmer.',
      etapes: ['Assis, dos droit, mains sur le ventre.', 'Inspire par le nez en comptant 4 : le ventre gonfle comme un ballon.', 'Souffle par la bouche en comptant 6 : le ballon se dégonfle.', '5 fois.'],
      erreurs: ['Gonfler la poitrine au lieu du ventre.', 'Respirer trop vite.'],
      securite: ['La tête tourne : respire normalement.']
    },
    c_chat: {
      but: 'Détendre le dos après l\'effort.',
      etapes: ['À 4 pattes, mains sous les épaules, genoux sous les hanches.', 'Dos rond : pousse le dos vers le plafond, la tête rentre.', 'Dos creux : le ventre descend, la tête se lève doucement.', 'Alterne lentement, en respirant.'],
      erreurs: ['Aller vite.', 'Forcer dans le dos creux.'],
      securite: ['Sur un tapis, sans forcer.']
    },
    c_mollets: {
      but: 'Étirer les mollets, qui ont beaucoup travaillé.',
      etapes: ['Face au mur, mains au mur à hauteur des épaules.', 'Une jambe pliée devant, l\'autre tendue derrière.', 'Talon arrière COLLÉ au sol, pointe vers le mur.', 'Pousse le mur : ça tire doucement dans le mollet. 15 s, puis change de jambe.'],
      erreurs: ['Le talon arrière qui décolle.', 'Pied arrière tourné vers l\'extérieur.'],
      securite: ['Un étirement tire, il ne fait jamais mal.', 'Pas d\'à-coups.']
    },
    c_genou: {
      but: 'Détendre les fesses et le bas du dos.',
      etapes: ['Allongé sur le dos.', 'Attrape un genou avec les deux mains et ramène-le contre la poitrine.', 'L\'autre jambe reste allongée.', 'Respire, 15 s, puis change de jambe.'],
      erreurs: ['Lever la tête.', 'Tirer d\'un coup.'],
      securite: ['Sur un tapis, sans forcer.']
    },
    c_flamant: {
      but: 'L\'équilibre, même fatigué.',
      etapes: ['Debout sur un pied, l\'autre genou levé, bras écartés.', 'Regarde un point fixe.', 'À ton niveau : le temps et la version (yeux ouverts ou fermés) indiqués.', 'Puis l\'autre pied.'],
      erreurs: ['Regarder ses pieds.'],
      securite: ['Près d\'un mur, rien de dur autour.']
    },
    c_susp: {
      but: 'Détendre les épaules et le dos.',
      etapes: ['Monte avec la chaise.', 'Laisse-toi pendre, épaules détendues, respire.', 'Repose les pieds sur la chaise avant de lâcher.'],
      erreurs: ['Sauter de la barre.'],
      securite: ['Toujours la chaise pour monter et descendre.', 'Barre vérifiée par un adulte.']
    },
    posture_enfant: {
      but: 'Détendre le dos et les épaules, se calmer.',
      etapes: ['À genoux, assis sur les talons.', 'Penche-toi en avant, bras loin devant, front au sol.', 'Respire lentement.'],
      erreurs: ['Forcer pour que les fesses touchent les talons.'],
      securite: ['Sur un tapis.']
    }
  };

  // règles qui valent pour tout
  var REGLES = ['Échauffé avant de commencer.', 'Douleur vive ou bizarre (articulation, dos, tête) : on arrête et on le dit à un adulte.', 'Bien faire avant de faire beaucoup.', 'De l\'eau à côté de toi.'];

  // version mini matériel d'un exercice de séance
  var MINI = { suspension: 'superman', tractions: 'tirage_elastique', corde: 'corde_imaginaire', intervalles_corde: 'intervalles_corde', montees_marche: 'montees_genoux' };
  // tests du bilan
  var TEST = { flamant: 'flamant', saut: 'saut_longueur', navette: 't_navette', susp: 'suspension', tract: 't_tract', pompes: 't_pompes', planche: 'planche', squats: 't_squats', chaise: 't_chaise', corde: 'corde', corde1: 'corde', burpees: 't_burpees' };
  var TEST_SM = { susp: 'superman', tract: 'tirage_elastique', corde: 't_ligne', corde1: 't_ligne' };

  MC.FICHES = F;
  MC.fiche = {
    regles: REGLES,
    get: function (k) { return F[k] || null; },
    exo: function (id, mini) { return F[(mini && MINI[id]) || id] || null; },
    test: function (id, sm) { return F[(sm && TEST_SM[id]) || TEST[id]] || null; },
    key: { exo: function (id, mini) { return (mini && MINI[id]) || id; }, test: function (id, sm) { return (sm && TEST_SM[id]) || TEST[id]; } }
  };
})();
