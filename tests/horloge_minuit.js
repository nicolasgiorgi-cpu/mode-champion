// (v67) Horloge décalée pour les tests : il est 0 h 30 à Paris (lancer node avec TZ=Europe/Paris et -r ./tests/horloge_minuit.js).
// Entre minuit et 1 h, la date du jour à Paris n'est pas celle d'une date ISO en UTC : les comptes « par jour » doivent suivre Paris.
const Vraie = Date, decal = Vraie.parse('2026-11-11T23:30:00Z') - Vraie.now();
class Horloge extends Vraie {
  constructor(...a) { if (a.length) super(...a); else super(Vraie.now() + decal); }
  static now() { return Vraie.now() + decal; }
}
global.Date = Horloge;
