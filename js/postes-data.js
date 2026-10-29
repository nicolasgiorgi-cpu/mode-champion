/* =========================================================
   Mode champion · M12 — les 7 cartes postes de la mission « Prépare le jeu à 10 »
   (reprises du site « Choisis ton poste », dépôt nicolasgiorgi-cpu/choisis-ton-poste, fichier data.js)
   Contenu à modifier librement.
   - stats : 6 notes sur 100, converties en étoiles (90+ = 5, 75+ = 4, 60+ = 3, 45+ = 2, sinon 1)
     ordre : Puissance, Vitesse, Mains, Plaquage, Vision, Jeu au pied
   - heros[].commons : nom du fichier sur Wikimedia Commons (photo libre, affichée avec son crédit)
     heros[].photo : OU nom d'une image déposée à côté de index.html (prioritaire si rempli)
     laisser les deux vides = silhouette
   - videos : vidéos YouTube intégrées dans la page (id = ce qui suit watch?v=)
     start / end (en secondes) optionnels pour ne montrer qu'un extrait
   - highlight : lien vers une compilation qui s'ouvre sur YouTube
   ========================================================= */

window.MC = window.MC || {};
// Couleurs (29/10) : un dégradé du plus foncé (pilier, le marron orangé) au plus clair (ailier), dans l'ordre des postes.
MC.POSTES = [
  {
    id: "pilier",
    n: "1·3",
    code: "PIL",
    nom: "Pilier",
    numeros: "N°1 et N°3 · 1re ligne",
    surnom: "Le Roc",
    cls: "Tank de mêlée",
    groupe: "Avants",
    color: "#FF6A3D",
    dark: "#7A2A14",
    emblem: "colonne",
    stats: [95, 45, 55, 80, 50, 20],
    intro: "Costaud et solide, le pilier tient la mêlée. Il porte le ballon au contact pour faire avancer l'équipe et plaque sans jamais lâcher.",
    pouvoirs: [
      { icon: "colonne", titre: "Mur de mêlée", texte: "Il tient la mêlée solide et pousse pour son équipe." },
      { icon: "belier", titre: "Bélier", texte: "Il avance au contact avec le ballon et fait reculer la défense." }
    ],
    attaque: ["Pousser en mêlée", "Porter le ballon au contact", "Soutenir le porteur"],
    defense: ["Plaquer", "Se battre au ruck", "Pousser fort en mêlée"],
    jeu10: "En mêlée, vous êtes 3 devant : 2 piliers et le talonneur au milieu. Tu pousses dans l'axe jusqu'à ce que le ballon soit gagné.",
    pourToi: ["tu es costaud et solide", "tu aimes pousser et le contact", "tu ne lâches jamais rien"],
    heros: [
      { nom: "Cyril Baille", info: "Pilier gauche · Stade Toulousain", photo: "", commons: "Cyril_Baille_cropped.jpg", credit: "PierreSelim / Blackcat · CC BY-SA 3.0" },
      { nom: "Dorian Aldegheri", info: "Pilier droit · Stade Toulousain", photo: "", commons: "Dorian_Aldegheri.jpg", credit: "LightPrimeape · CC BY-SA 4.0" }
    ],
    videos: [
      { id: "eC-N_-vMB1Y", titre: "Un pro présente le poste de pilier gauche", source: "Jefferson Poirot · Ligue nationale de rugby" },
      { id: "nNyv9WEsSUA", titre: "Les qualités du pilier droit", source: "Demba Bamba · Ligue nationale de rugby" }
    ],
    highlight: { id: "cxDA7EkXC-8", titre: "Les plus belles actions d'Uini Atonio", source: "Pilier droit du XV de France" }
  },
  {
    id: "talonneur",
    n: "2",
    code: "TAL",
    nom: "Talonneur",
    numeros: "N°2 · 1re ligne",
    surnom: "Le Lanceur",
    cls: "Avant vif",
    groupe: "Avants",
    color: "#FE8A00",
    dark: "#6E3700",
    emblem: "cible",
    stats: [85, 75, 80, 80, 60, 25],
    intro: "Au centre de la mêlée, il gagne le ballon avec son pied et lance en touche. C'est un avant costaud, mais aussi vif et rapide : on le voit partout.",
    pouvoirs: [
      { icon: "cible", titre: "Lancer laser", texte: "C'est lui qui lance le ballon en touche, bien droit vers ses sauteurs." },
      { icon: "eclair", titre: "Démarrage éclair", texte: "Un avant qui court vite : il porte le ballon et arrive le premier au soutien." }
    ],
    attaque: ["Lancer en touche", "Talonner en mêlée", "Porter le ballon et avancer"],
    defense: ["Plaquer beaucoup", "Se relever vite", "Gratter le ballon au sol"],
    jeu10: "En mêlée, tu es au milieu des 3 joueurs de devant, avec 2 coéquipiers liés à côté. En touche, c'est toi qui lances.",
    pourToi: ["tu aimes le contact ET courir", "tu es précis avec tes mains", "tu veux être au cœur de l'action"],
    heros: [
      { nom: "Julien Marchand", info: "Talonneur · Stade Toulousain", photo: "", commons: "European_Rugby_Champions_Cup_24-25-_RC_Toulonnais_vs_Stade_Toulousain-61-Migliorato-NR_(54468571137)_(cropped).jpg", credit: "Stefano Delfrate · CC BY-SA 2.0" },
      { nom: "Peato Mauvaka", info: "Talonneur · Stade Toulousain", photo: "", commons: "PeatoMauvaka2022.png", credit: "Société Générale · CC BY 3.0" }
    ],
    videos: [
      { id: "CxeqbzT9rIA", titre: "Un pro présente le poste de talonneur", source: "Guilhem Guirado · Ligue nationale de rugby" },
      { id: "mZsq8lkP28s", titre: "Le lancer en touche, étape par étape", source: "mobilesport" }
    ],
    highlight: { id: "0LPOXa8kvgQ", titre: "Les meilleurs moments de Julien Marchand", source: "Stade Toulousain · Champions Cup" }
  },
  {
    id: "troisieme-ligne",
    n: "6·7",
    code: "3L",
    nom: "3e ligne",
    numeros: "N°6 et N°7 · 3e ligne",
    surnom: "Le Gratteur",
    cls: "Défenseur",
    groupe: "Avants",
    color: "#F2AA06",
    dark: "#604100",
    emblem: "griffe",
    stats: [75, 75, 60, 95, 70, 30],
    intro: "Le 3e ligne est un défenseur infatigable. Il plaque, se relève, plaque encore et gratte les ballons au sol. Il est partout où ça se bat.",
    pouvoirs: [
      { icon: "radar", titre: "Plaquage radar", texte: "Il repère le porteur et le plaque avant qu'il puisse avancer." },
      { icon: "griffe", titre: "Gratteur", texte: "Il est le premier sur le ballon au sol pour le récupérer." }
    ],
    attaque: ["Soutenir le porteur", "Porter le ballon", "Arriver vite au ruck"],
    defense: ["Plaquer encore et encore", "Gratter le ballon au sol", "Mettre la pression sur le 9 adverse"],
    jeu10: "En mêlée, tu es lié debout à côté du pilier, sans pousser. Tu joues dès que la mêlée est finie : sois prêt à partir plaquer ou soutenir !",
    pourToi: ["tu adores plaquer", "tu as de l'énergie à revendre", "tu veux toujours récupérer le ballon"],
    heros: [
      { nom: "François Cros", info: "3e ligne · Stade Toulousain", photo: "", commons: "FrancoisCrosToulouse2018(cropped).jpg", credit: "Helene Brasseur · CC BY 2.0" },
      { nom: "Anthony Jelonch", info: "3e ligne · Stade Toulousain", photo: "", commons: "AnthonyJelonch2019.png", credit: "Castres Olympique · CC BY 3.0" }
    ],
    videos: [
      { id: "HP_tPxjhOiM", titre: "Un pro présente le poste de 3e ligne aile", source: "Julien Puricelli · Ligue nationale de rugby" },
      { id: "Dbp38-ANm5A", titre: "Grégory Alldritt explique comment gratter au ruck", source: "L'Équipe" }
    ],
    highlight: { id: "5Rgrk189Ow0", titre: "Hommage à Thierry Dusautoir, le plaqueur", source: "Capitaine du XV de France" }
  },
  {
    id: "demi-de-melee",
    n: "9",
    code: "9",
    nom: "Demi de mêlée",
    numeros: "N°9 · charnière",
    surnom: "L'Éclair",
    cls: "Meneur-passeur",
    groupe: "Trois-quarts",
    color: "#E2C72D",
    dark: "#534800",
    emblem: "eclair",
    stats: [40, 80, 95, 60, 85, 70],
    intro: "Le demi de mêlée est collé au ballon. À chaque mêlée et chaque ruck, il le sort et le passe vite. C'est lui qui dirige les avants avec sa voix.",
    pouvoirs: [
      { icon: "aimant", titre: "Colle au ballon", texte: "Il est toujours là où est le ballon, à chaque ruck et chaque mêlée." },
      { icon: "eclair", titre: "Passe éclair", texte: "Il sort le ballon très vite et le donne au bon partenaire." }
    ],
    attaque: ["Sortir le ballon des rucks et des mêlées", "Passer vite au 10 ou aux avants", "Guider les avants à la voix"],
    defense: ["Couvrir derrière la ligne", "Plaquer près des rucks", "Replacer ses coéquipiers"],
    jeu10: "C'est toi qui introduis le ballon en mêlée. La mêlée se termine quand tu soulèves le ballon : à toi de jouer !",
    pourToi: ["tu as des mains rapides", "tu aimes parler et diriger", "tu veux toucher le ballon tout le temps"],
    heros: [
      { nom: "Antoine Dupont", info: "Demi de mêlée · Stade Toulousain", photo: "", commons: "Antoine_Dupont_February_2023.jpg", credit: "stede64 · CC BY-SA 2.0" },
      { nom: "Paul Graou", info: "Demi de mêlée · Stade Toulousain", photo: "", commons: "Paul_Graou_2025.jpg", credit: "Stefano Delfrate · CC BY-SA 2.0" }
    ],
    videos: [
      { id: "qDc34wVBv3c", titre: "Un pro présente le poste de demi de mêlée", source: "Tom Ecochard · Ligue nationale de rugby" },
      { id: "Pff-dfmfags", titre: "La passe du demi de mêlée", source: "mobilesport" }
    ],
    highlight: { id: "OevkonlavLg", titre: "Les meilleurs moments d'Antoine Dupont", source: "Stade Toulousain · Champions Cup" }
  },
  {
    id: "ouvreur",
    n: "10",
    code: "10",
    nom: "Demi d'ouverture",
    numeros: "N°10 · charnière",
    surnom: "Le Stratège",
    cls: "Décideur · jeu au pied",
    groupe: "Trois-quarts",
    color: "#CAE268",
    dark: "#424E00",
    emblem: "oeil",
    stats: [45, 70, 90, 60, 95, 95],
    intro: "L'ouvreur est le stratège de l'équipe. Il reçoit le ballon du 9 et décide : passe, course ou coup de pied. C'est lui qui voit le mieux le jeu.",
    pouvoirs: [
      { icon: "oeil", titre: "Lecture du jeu", texte: "Il regarde la défense et choisit : passer, courir ou taper." },
      { icon: "pied", titre: "Coup de pied ciblé", texte: "Il tape au pied pour gagner du terrain ou trouver l'espace." }
    ],
    attaque: ["Recevoir le ballon du 9", "Choisir : passe, course ou pied", "Lancer les trois-quarts"],
    defense: ["Garder sa place dans la ligne", "Plaquer dans son couloir", "Faire monter la ligne : « Ligne » → « Jeu »"],
    jeu10: "Au jeu à 10, le jeu au pied est autorisé : un bon coup de pied peut faire gagner beaucoup de terrain.",
    pourToi: ["tu aimes réfléchir et décider", "tu as une bonne passe", "tu aimes taper au pied"],
    heros: [
      { nom: "Romain Ntamack", info: "Demi d'ouverture · Stade Toulousain", photo: "", commons: "RomainNtamack2023.png", credit: "Société Générale · CC BY 3.0" },
      { nom: "Thomas Ramos", info: "Ouvreur et arrière · Stade Toulousain", photo: "", commons: "Thomas_Ramos_2018.jpg", credit: "Patrick S. · CC BY-SA 2.0" }
    ],
    videos: [
      { id: "IJ9GQHRl0sE", titre: "Romain Ntamack présente le poste d'ouvreur", source: "Ligue nationale de rugby" },
      { id: "CE7XQe8KHDw", titre: "La passe au pied de l'ouvreur", source: "mobilesport" }
    ],
    highlight: { id: "T93boYvFUVU", titre: "Les plus belles actions de Romain Ntamack", source: "Ouvreur du XV de France" }
  },
  {
    id: "centre",
    n: "12·13",
    code: "CEN",
    nom: "Centre",
    numeros: "N°12 et N°13 · trois-quarts",
    surnom: "Le Perforateur",
    cls: "Gros plaqueur",
    groupe: "Trois-quarts",
    color: "#B0F99E",
    dark: "#205510",
    emblem: "perce",
    stats: [80, 75, 75, 90, 65, 50],
    intro: "Le centre prend le ballon lancé et fonce droit pour percer la défense. En défense, c'est un gros plaqueur qui ne laisse rien passer au milieu.",
    pouvoirs: [
      { icon: "perce", titre: "Perce", texte: "Il fonce droit dans la défense pour la traverser." },
      { icon: "bouclier", titre: "Mur défensif", texte: "Gros plaqueur, il arrête les attaquants au milieu du terrain." }
    ],
    attaque: ["Percer droit dans la défense", "Fixer pour libérer l'ailier", "Passer après le contact"],
    defense: ["Faire de gros plaquages", "Monter vite en ligne", "Ne rien laisser passer au milieu"],
    jeu10: "Au jeu à 10, le terrain fait 45 m de large : le centre a de l'espace pour percer, et beaucoup de plaquages à faire.",
    pourToi: ["tu aimes foncer et percer", "tu n'as pas peur de plaquer", "tu as de bonnes mains"],
    heros: [
      { nom: "Pierre-Louis Barassi", info: "Centre · Stade Toulousain", photo: "", commons: "PierreLouisBarassi2022.png", credit: "Société Générale · CC BY 3.0" },
      { nom: "Tommaso Menoncello", info: "Centre · Stade Toulousain", photo: "", commons: "Tommaso_Menoncello_2023.jpg", credit: "Stefano Delfrate · CC BY-SA 2.0" }
    ],
    videos: [
      { id: "NiBVXR87kGo", titre: "Gaël Fickou présente le poste de centre", source: "Ligue nationale de rugby" },
      { id: "K31FeN_2XqQ", titre: "La passe après contact du centre", source: "mobilesport" }
    ],
    highlight: { id: "vJrG-__gGNc", titre: "Le grand match de Gaël Fickou contre l'Argentine", source: "Centre du XV de France · World Rugby" }
  },
  {
    id: "ailier",
    n: "11·14",
    code: "AIL",
    nom: "Ailier",
    numeros: "N°11 et N°14 · trois-quarts",
    surnom: "La Flèche",
    cls: "Sprinteur · finisseur",
    groupe: "Trois-quarts",
    color: "#C9FFE1",
    dark: "#015636",
    emblem: "aile",
    stats: [50, 98, 65, 65, 60, 55],
    intro: "L'ailier est le sprinteur de l'équipe. Placé sur le côté du terrain, il attend le ballon pour accélérer et aller aplatir l'essai.",
    pouvoirs: [
      { icon: "turbo", titre: "Turbo", texte: "Il accélère dans l'espace et laisse les défenseurs derrière lui." },
      { icon: "essai", titre: "Finisseur", texte: "Il est au bout des actions pour aplatir l'essai." }
    ],
    attaque: ["Rester large pour écarter le jeu : « Plus »", "Accélérer dans l'espace", "Aplatir l'essai"],
    defense: ["Garder son couloir", "Plaquer le dernier attaquant", "Rattraper les coups de pied"],
    jeu10: "Au jeu à 10, le terrain fait 45 m de large : l'ailier a de la place sur son côté pour faire parler sa vitesse.",
    pourToi: ["tu cours très vite", "tu aimes marquer des essais", "tu sais accélérer et feinter"],
    heros: [
      { nom: "Matthis Lebel", info: "Ailier · Stade Toulousain", photo: "", commons: "MatthisLebel2022.png", credit: "Société Générale · CC BY 3.0" },
      { nom: "Teddy Thomas", info: "Ailier · Stade Toulousain", photo: "", commons: "TEDDY_THOMAS.jpg", credit: "Victor1765 · CC BY-SA 4.0" }
    ],
    videos: [
      { id: "VcpIfdBghNk", titre: "Maxime Médard présente le poste d'ailier", source: "Ligue nationale de rugby" },
      { id: "O1TxLh2Xr7E", titre: "Le cadrage-débordement de l'ailier", source: "mobilesport" }
    ],
    highlight: { id: "B_FAC-UtVx4", titre: "Les 10 essais de Damian Penaud en Champions Cup", source: "Ailier du XV de France" }
  }
];
