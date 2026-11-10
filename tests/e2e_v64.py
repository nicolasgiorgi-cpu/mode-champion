# (v64) Décision de Nicolas du 10/11/2026 : le bilan n'a plus de date imposée. Sur l'accueil de l'enfant, plus de « Semaine du bilan »
# ni de « Prochain bilan : dans N jours » ; à la place « Ton bilan, quand tu veux ». Même chose dans Bilans et dans l'aide « ? ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v64.py 390 844 · 1180 820 · 820 1180
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)

    def accueil(jour):
        # l'horloge du navigateur figée sur ce jour, puis la page rechargée : l'état de la semaine est calculé au chargement
        pg.clock.set_fixed_time(jour + 'T10:00:00')
        pg.goto(BASE + '#/semaine'); pg.reload(); pg.wait_for_timeout(1500)
        if pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
        return pg.inner_text('main')

    # la semaine 9 du cycle 1 (jeudi 12/11/2026, Bilan 1 le samedi 14/11)
    t = accueil('2026-11-12')
    k = pg.inner_text('main .head .kicker').upper()
    check('semaine 9 : « FIN DU CYCLE » en haut, plus « SEMAINE DU BILAN »', 'FIN DU CYCLE' in k and 'BILAN' not in k, k)
    check('accueil : plus de « Prochain bilan » ni de compte à rebours', 'Prochain bilan' not in t and 'dans 2 jours' not in t)
    check('accueil : « Ton bilan, quand tu veux », qui mène à Bilans', 'Ton bilan, quand tu veux' in t and pg.query_selector('a.li[href="#/bilans"]:has-text("quand tu veux")') is not None, t[-600:])
    check('accueil : pas de défilement de côté', ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'))

    # une semaine ordinaire du cycle 2 : le compteur de semaines est inchangé
    accueil('2026-11-19')
    k = pg.inner_text('main .head .kicker').upper()
    check('cycle 2 : « SEMAINE 1 / 8 » comme avant', 'SEMAINE 1 / 8' in k, k)
    check('cycle 2 : toujours « Ton bilan, quand tu veux », sans date', 'Ton bilan, quand tu veux' in pg.inner_text('main') and 'Prochain bilan' not in pg.inner_text('main'))

    # Bilans : la note sans date
    accueil('2026-11-12')
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(700)
    t = pg.inner_text('main')
    check('Bilans : « Ton bilan, quand tu veux », plus de « Prochain bilan »', 'Ton bilan, quand tu veux' in t and 'Prochain bilan' not in t, t[-500:])

    check('Bilans : le bouton du bilan sans « mi-novembre »', 'mi-novembre' not in t.lower(), t[-500:])
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(700)
    k = pg.inner_text('main .head .kicker')
    check('Mon bilan : en haut « Bilan 1 », sans « mi-novembre »', 'BILAN' in k.upper() and 'NOVEMBRE' not in k.upper(), k)
    # (relecture) un enfant qui a fini son bilan : pas de « quand tu veux » qui ne mène à rien
    e = ev("""(() => { const bl = MC.logic.currentBilan(), T = MC.CONTENT.TESTS;
      const plein = { records: T.map(t => ({ bilan: String(bl.n), test: t.id, valeur: 1, statut: 'ok' })) };
      const moitie = { records: T.slice(0, 5).map(t => ({ bilan: String(bl.n), test: t.id, valeur: 1, statut: 'ok' })) };
      return [MC.bilanEtat({ records: [] }).etat, MC.bilanEtat(moitie).etat + ' ' + MC.bilanEtat(moitie).n, MC.bilanEtat(plein).etat]; })()""")
    check('état du bilan : vide, en cours (5), fait', e == ['vide', 'encours 5', 'fait'], e)
    accueil('2026-11-12')
    li = pg.inner_text('a.li[href="#/bilans"]')
    check('accueil : la ligne du bilan dit l\'un des trois états, jamais une date', any(x in li for x in ('Ton bilan, quand tu veux', 'Ton bilan est fait', 'Ton bilan : ')) and 'novembre' not in li.lower(), li)

    # l'aide « ? » : plus de date du prochain bilan
    pg.goto(BASE + '#/guide'); pg.wait_for_timeout(700)
    t = pg.inner_text('main')
    check('aide : le bilan « quand tu veux », plus de « Prochain : Bilan 1 »', 'quand tu veux' in t and 'Prochain : Bilan' not in t, t[:300])
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
