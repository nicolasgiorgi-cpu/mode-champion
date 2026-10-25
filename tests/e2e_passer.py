# Passer le téléphone à son enfant (parent et éduc) : ▶ en haut à droite, son espace s'ouvre sans son code (25/10),
# « Rendre le téléphone » redemande le code de l'adulte.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_passer.py
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    # ----- le parent -----
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1500)
    check('parent connecté', '#/parent' in pg.url, pg.url)
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    check('▶ Tom : son espace s\'ouvre sans son code', '#/semaine' in pg.url and pg.query_selector('.modal .pin-zone') is None and pg.evaluate("MC.app.S.kid && MC.app.S.kid.joueur.prenom") == 'Tom', pg.url)
    check('l\'espace adulte est refermé', not pg.evaluate('MC.app.adultUnlocked()'))
    pg.evaluate('window.scrollTo(0,document.body.scrollHeight)'); pg.wait_for_timeout(300)
    pg.click('text=Rendre le téléphone'); pg.wait_for_timeout(1200)
    check('Rendre le téléphone : le code du parent est redemandé', pg.query_selector('#adultzone [data-k="1"]') is not None, pg.url)
    pin(pg, codes['parent']); pg.wait_for_timeout(1500)
    check('parent revenu', '#/parent' in pg.url, pg.url)
    pg.click('.tb-pass'); pg.wait_for_timeout(1500)
    check('2e passage : direct', '#/semaine' in pg.url, pg.url)
    # ----- l'éduc, pour son enfant (Coach Nico est le papa de Tom en démo) -----
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(600)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    pg.evaluate("MC.app.setKid(null)")
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    btn = pg.query_selector('.tb-pass')
    check('éduc : bouton ▶ de son enfant', btn is not None)
    if btn:
        btn.click(); pg.wait_for_timeout(1800)
        check('éduc : l\'espace de son enfant s\'ouvre sans son code', '#/semaine' in pg.url and pg.query_selector('.modal .pin-zone') is None, pg.url)
    b.close()
print('ERREURS JS :', errs[:4] if errs else 'aucune')
ok = sum(1 for r in res if r[1]); print('%d/%d OK' % (ok, len(res)))
