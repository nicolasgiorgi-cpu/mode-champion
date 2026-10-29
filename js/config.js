/* =========================================================
   Mode champion · M12 — RÉGLAGES
   ========================================================= */
window.MC = window.MC || {};

MC.CONFIG = {
  // Adresse du « web app » Google Apps Script (voir README, étape « Google Sheets »).
  // Vide = MODE DÉMO : tout reste dans ce navigateur, avec des joueurs fictifs.
  API_URL: 'https://script.google.com/macros/s/AKfycbzeUymcxVaYsENKbVL2e6BMtwrQ_IRbjeCMQ3A_VJAgK1M4__ujnjc6wOb2DLdCZIg/exec',

  // Nom affiché
  CLUB: 'M12 · PRÉPA PHYSIQUE · 2026-27',

  // Les cycles de 8 semaines (le lundi de la 1re semaine). Le tableau des étoiles suit ces dates.
  CYCLES: [
    { n: 1, debut: '2026-09-14' },
    { n: 2, debut: '2026-11-16' },
    { n: 3, debut: '2027-01-11' },
    { n: 4, debut: '2027-03-08' },
    { n: 5, debut: '2027-05-03' }
  ],

  // Les bilans (séance de tests). On peut saisir un bilan à partir de 10 jours avant sa date.
  BILANS: [
    { n: 0, date: '2026-09-13', nom: 'Bilan 0', quand: 'mi-septembre' },
    { n: 1, date: '2026-11-14', nom: 'Bilan 1', quand: 'mi-novembre' },
    { n: 2, date: '2027-01-09', nom: 'Bilan 2', quand: 'mi-janvier' },
    { n: 3, date: '2027-03-06', nom: 'Bilan 3', quand: 'mi-mars' },
    { n: 4, date: '2027-05-01', nom: 'Bilan 4', quand: 'mi-mai' },
    { n: 5, date: '2027-06-26', nom: 'Bilan 5', quand: 'fin juin' }
  ],

  // « Un mot pour les éducs » dans « Choisis ton poste » (côté enfant) : il faut le serveur en version 12 (29/10/2026)
  MOT_EDUCS: true,

  // Une ligue avec moins de joueurs que ça est fusionnée avec la ligue voisine.
  LIGUE_MIN: 5,

  // Ce que voient les ENFANTS et les PARENTS. V1 envoyée aux familles le 28/10/2026 : la prépa physique
  // et la mission « Choisis ton poste », rien d'autre. Côté éducs, tout reste ouvert (on prépare les Skills en avance).
  // Pour ouvrir une partie aux enfants et aux parents : la passer à true (et augmenter ?v= dans index.html).
  ENFANTS: {
    skills: false,          // l'onglet Skills, la mission principale, le booster, les XP des étoiles
    copains: false,         // la mission « Avec qui tu aimes jouer » et son badge « Esprit d'équipe »
    missionsEducs: false    // les missions vidéo et QCM des éducs, les +1 et les mots des éducs
  }
};

// une partie de l'appli est-elle ouverte aux enfants et aux parents ? (window.__MC_TOUT : tout ouvert, pour les tests)
MC.ouvert = function (k) {
  if (window.__MC_TOUT) return true;
  var e = MC.CONFIG.ENFANTS;
  return !e || e[k] !== false;
};
