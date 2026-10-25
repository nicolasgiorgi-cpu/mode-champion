# L'appli sur l'écran d'accueil (25/10) : pas à la 1re ouverture, un rappel à la 2e puis à la 4e (iPhone et Android),
# rien si l'appli est déjà installée ou sur un ordinateur ; l'entrée reste dans les réglages.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_install.py
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel):
    for c in code: pg.click('%s [data-k="%s"]' % (sel, c)); pg.wait_for_timeout(40)
def ouvrir(pg):   # une nouvelle ouverture : plus de 30 min sans s'en servir, puis l'appli revient au premier plan
    pg.evaluate("(() => { const o = JSON.parse(localStorage.getItem('mc-ouvertures') || '{}'); o.t = Date.now() - 3600000; localStorage.setItem('mc-ouvertures', JSON.stringify(o)); document.dispatchEvent(new Event('visibilitychange')); })()")
    pg.evaluate("location.hash = '#/profil'"); pg.wait_for_timeout(500); pg.evaluate("location.hash = '#/semaine'"); pg.wait_for_timeout(1500)
def fenetre(pg): return pg.query_selector('.modal') is not None and 'accueil' in pg.inner_text('.modal h2').lower()
def fermer(pg):
    if pg.query_selector('.modal'): pg.click('.modal .btn2' if pg.query_selector('.modal .btn2') else '.modal .btn'); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b = p.chromium.launch()
    for nom, ua in [('iPhone', IOS), ('Android', AND), ('ordinateur', None)]:
        o = {'viewport': {'width': 390, 'height': 844}, 'is_mobile': ua is not None, 'has_touch': True}
        if ua: o['user_agent'] = ua
        ctx = b.new_context(**o); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(800)
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, '2580', '.modal'); pg.wait_for_timeout(1800)
        check(nom + ' : 1re ouverture, pas de rappel', not fenetre(pg))
        fermer(pg)
        pg.evaluate("localStorage.setItem('mc-ouvertures', JSON.stringify({ n: 1, t: Date.now() }))")   # comme une vraie 1re ouverture
        vus = []
        for k in range(2, 7):
            ouvrir(pg); vus.append(k if fenetre(pg) else 0)
            if fenetre(pg) and nom == 'iPhone' and k == 2: check('iPhone : Partager › Sur l\'écran d\'accueil', 'Partager' in pg.inner_text('.modal') and 'Sur l\'écran d\'accueil' in pg.inner_text('.modal'))
            if fenetre(pg) and nom == 'Android' and k == 2: check('Android : menu ⋮ de Chrome', '⋮' in pg.inner_text('.modal'))
            fermer(pg)
        attendu = [2, 0, 4, 0, 0] if ua else [0, 0, 0, 0, 0]
        check(nom + ' : rappel à la 2e et à la 4e ouverture seulement' if ua else 'ordinateur : jamais de rappel', vus == attendu, vus)
        pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(800)
        check(nom + ' : l\'entrée reste dans Réglages', (pg.query_selector('[data-act="howInstall"]') is not None) == (ua is not None))
        ctx.close()
    # déjà installée (ouverte depuis l'icône) : jamais de rappel
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, user_agent=IOS)
    ctx.add_init_script("Object.defineProperty(navigator, 'standalone', { get: () => true })")
    pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, '2580', '.modal'); pg.wait_for_timeout(1800); fermer(pg)
    pg.evaluate("localStorage.setItem('mc-ouvertures', JSON.stringify({ n: 1, t: Date.now() }))")
    ouvrir(pg)
    check('déjà sur l\'écran d\'accueil : pas de rappel', not fenetre(pg))
    b.close()
print('ERREURS JS :', errs[:3] if errs else 'aucune')
ok = sum(1 for r in res if r[1]); print('%d/%d OK' % (ok, len(res)))
