# (v68) Lot enfant E1 (navigation validée par Nicolas le 09/11/2026, lots acceptés le 10/11) : 4 onglets Accueil · Équipe · Progrès · Moi.
# Accueil : la séance du jour avec son bouton au premier écran (les exercices repliés dessous), les missions à faire en cartes,
# la semaine en une ligne ; Équipe : les podiums, filtres repliés ; Progrès : Records · Niveaux (· Skills une fois ouverts) ;
# un jour de repos dit « Repos aujourd'hui » ; libellés des onglets à 12 px.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v68.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    tabs = lambda: [a.inner_text().strip().split('\n')[0].upper() for a in pg.query_selector_all('#nav a')]
    on_tab = lambda: (pg.inner_text('#nav a.on').strip().split('\n')[0].upper() if pg.query_selector('#nav a.on') else '')
    # un jeudi (séance Meafou), l'horloge avance normalement
    pg.clock.set_system_time('2026-11-12T10:00:00')
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    while pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)

    # ----- les onglets -----
    check('4 onglets : Accueil · Équipe · Progrès · Moi', tabs() == ['ACCUEIL', 'ÉQUIPE', 'PROGRÈS', 'MOI'], tabs())
    fs = ev("[...document.querySelectorAll('#nav a span:not(.nb)')].map(s => getComputedStyle(s).fontSize)")
    check('les libellés des onglets à 12 px', all(x == '12px' for x in fs if x), fs)

    # ----- l'accueil -----
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(1000)
    while pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
    check('Accueil : l\'onglet Accueil allumé, pas de sous-onglets', on_tab() == 'ACCUEIL' and len(pg.query_selector_all('.stabs a')) == 0, on_tab())
    check('Accueil : « Séance du jour » en titre', 'SÉANCE DU JOUR' in pg.inner_text('main h1.acc-t').upper())
    r = ev("""(() => { const a = [...document.querySelectorAll('main a.btn')].find(x => /Lancer la séance|Revoir la séance/.test(x.textContent)); if (!a) return null;
      const n = document.getElementById('nav').getBoundingClientRect(), r = a.getBoundingClientRect(), bas = n.top > innerHeight / 2 ? n.top : innerHeight;
      return { bas: Math.round(r.bottom), limite: Math.round(bas) }; })()""")
    check('Accueil : le bouton de la séance visible au premier écran, sans défiler', r and r['bas'] <= r['limite'], r)
    check('Accueil : les exercices repliés sous le bouton', pg.query_selector('details.exd:not([open])') is not None)
    pg.click('details.exd > summary'); pg.wait_for_timeout(300)
    check('Accueil : les exercices se déplient', ev("document.querySelector('details.exd').open") and len(pg.query_selector_all('details.exd .exlist > *')) >= 2)
    check('Accueil : « J\'ai déjà fait ma séance », discret', pg.query_selector('a.acc-deja') is not None)
    check('Accueil : les missions à faire en cartes, et « Toutes »', len(pg.query_selector_all('.acc-mis a.acc-mi')) >= 1 and pg.query_selector('.acc-mis a.lnk[href="#/missions"]') is not None)
    check('Accueil : « Ma semaine » en une ligne (la bande des jours) et « Semaine parfaite »', pg.query_selector('.acc-sem .week') is not None and pg.query_selector('.acc-sem .acc-sp') is not None)
    nb = ev("(() => { const n = document.querySelector('#nav a[href=\"#/semaine\"] .nb'); return n ? +n.textContent : 0; })()")
    check('Accueil : la pastille des missions sur l\'onglet Accueil', nb >= 1, nb)
    check('Accueil : pas de défilement de côté', noscroll())
    pg.click('.acc-mis a.lnk[href="#/missions"]'); pg.wait_for_timeout(800)
    check('Missions : depuis l\'Accueil, onglet Accueil allumé, Retour en haut', on_tab() == 'ACCUEIL' and pg.query_selector('.topbar [data-act="back"], .topbar .tb-back') is not None, on_tab())

    # ----- Équipe : les podiums -----
    pg.click('#nav a[href="#/classement"]'); pg.wait_for_timeout(900)
    check('Équipe : « Les podiums », onglet Équipe allumé', on_tab() == 'ÉQUIPE' and 'LES PODIUMS' in pg.inner_text('main h1.acc-t').upper(), on_tab())
    check('Équipe : les filtres repliés sous une ligne', pg.query_selector('details.rkf:not([open])') is not None)
    pg.click('details.rkf > summary'); pg.wait_for_timeout(300)
    check('Équipe : les filtres se déplient', ev("document.querySelector('details.rkf').open"))
    check('Équipe : pas de défilement de côté', noscroll())

    # ----- Progrès : Records · Niveaux (les Skills sont fermés aux enfants en V1) -----
    pg.click('#nav a[href="#/bilans"]'); pg.wait_for_timeout(900)
    st = [a.inner_text().strip().upper() for a in pg.query_selector_all('.stabs a')]
    check('Progrès : sous-onglets Records · Niveaux', on_tab() == 'PROGRÈS' and st == ['RECORDS', 'NIVEAUX'], (on_tab(), st))
    pg.click('.stabs a:has-text("Niveaux")'); pg.wait_for_timeout(800)
    check('Progrès › Niveaux : toujours l\'onglet Progrès', on_tab() == 'PROGRÈS' and '#/niveaux' in pg.url, (on_tab(), pg.url))
    check('Progrès : pas de défilement de côté', noscroll())

    # ----- Moi -----
    pg.click('#nav a[href="#/profil"]'); pg.wait_for_timeout(900)
    check('Moi : onglet Moi allumé', on_tab() == 'MOI', on_tab())

    # ----- un jour de repos (vendredi) -----
    pg.clock.set_system_time('2026-11-13T10:00:00')
    pg.goto(BASE + '#/semaine'); pg.reload(); pg.wait_for_timeout(1400)
    while pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
    t = pg.inner_text('main')
    check('jour de repos : « Aujourd\'hui » et « Repos aujourd\'hui »', 'AUJOURD\'HUI' in pg.inner_text('main h1.acc-t').upper() and 'Repos aujourd\'hui' in t, t[:300])
    check('jour de repos : pas de bouton « Lancer la séance »', 'Lancer la séance' not in t)
    check('jour de repos : pas de défilement de côté', noscroll())
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
