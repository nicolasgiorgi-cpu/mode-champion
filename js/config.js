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

  // Une ligue avec moins de joueurs que ça est fusionnée avec la ligue voisine.
  LIGUE_MIN: 5
};
