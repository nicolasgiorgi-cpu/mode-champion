# (v77) Un seul mot : « Défi » est réservé au défi d'équipe (revue de l'interface enfant du 09/11). Un badge d'exploit se tente
# (« Je tente » dans les trophées, « Badge à gagner » et « Pour le gagner » sur sa page), un résultat hors bilan est une
# « Tentative » ; aucun écran enfant ne dit « défi » sauf pour le défi d'équipe. Horloge : lundi 23/11 (défi d'équipe en cours).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v77.py 390 844 · 1180 820 · 820 1180
import sys, os, re
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
AUTRE_DEFI = re.compile(r"d[ée]fis?\b(?! d['’]équipe)", re.I)
def sans_autre_defi(t): return [m.group(0) + ' … ' + t[max(0, m.start() - 40):m.end() + 20].replace('\n', ' ') for m in AUTRE_DEFI.finditer(t) if not t[m.start():m.start() + 12].lower().startswith('défilement')]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_system_time('2026-11-23T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1500); modals()

    # ----- les trophées : un badge d'exploit se tente -----
    pg.goto(BASE + '#/trophees'); pg.wait_for_timeout(1000)
    lien = pg.query_selector('a.bdg[href^="#/defi/"]')
    st = lien.query_selector('.st') if lien else None
    if st: st.scroll_into_view_if_needed()
    check('Trophées : un badge d\'exploit pas gagné dit « Je tente »', st is not None and st.text_content() == 'Je tente' and st.is_visible(), st.text_content() if st else None)
    href = lien.get_attribute('href') if lien else '#/defi/accroche'
    pg.goto(BASE + href); pg.wait_for_timeout(900)
    t = pg.inner_text('main')
    check('Page du badge : « Badge à gagner » et « Pour le gagner »', 'BADGE À GAGNER' in t.upper() and 'POUR LE GAGNER' in t.upper(), t[:300])

    # ----- aucun écran enfant ne dit « défi », sauf le défi d'équipe -----
    pages = ['#/semaine', '#/equipe', '#/classement', '#/bilans', '#/trophees', href, '#/profil', '#/guide']
    for h in pages:
        pg.goto(BASE + h); pg.wait_for_timeout(1100); modals()
        t = pg.inner_text('body')
        check('%s : pas d\'autre « défi » que le défi d\'équipe' % h, sans_autre_defi(t) == [], sans_autre_defi(t)[:3])
    pg.goto(BASE + '#/equipe'); pg.wait_for_timeout(1100)
    check('Ça bouge : le « Défi d\'équipe » garde son nom', 'DÉFI D\'ÉQUIPE' in pg.inner_text('.eqdefi').upper())

    # ----- un résultat hors bilan est une « Tentative » (la fiche d'un exercice : « Ton record · … ») -----
    ev("""() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k)), me = MC.app.S.me.joueur.id;
        D.tables.records.push({ id: 'v77-t', joueurId: me, bilan: 'defi', test: 'pompes', valeur: 99, extra: null, statut: 'ok', parQui: '', date: '2026-11-22', cree: '2026-11-22T10:00:00.000Z', exploit: '' });
        localStorage.setItem(k, JSON.stringify(D)); }""")
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-me') === 0).forEach(k => localStorage.removeItem(k))")
    pg.reload(); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/exo/pompes'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('Fiche d\'un exercice : son record vient d\'une « Tentative »', 'Tentative' in t and sans_autre_defi(t) == [], (t[:400], sans_autre_defi(t)))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
