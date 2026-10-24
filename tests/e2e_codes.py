# Codes adultes à 4 chiffres : nom puis code, code provisoire puis code choisi, changer son code.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_codes.py 390 844
import sys, os
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code):
    for c in code: pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1')
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    check('parent : la liste des enfants', len(pg.query_selector_all('[data-act="adultPick"]')) >= 20)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(600)
    check('éduc : la liste des éducs', pg.query_selector('[data-act="adultPick"][data-nom="Coach Nico"]') is not None)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    check('4 cases', len(pg.query_selector_all('#adultzone .digit, #adultzone .dg, #adultzone [class*="digit"] > *')) >= 4 or '4 CHIFFRES' in pg.inner_text('main').upper())
    pin(pg, '9999'); pg.wait_for_timeout(700)
    check('code faux : message et essais restants', 'incorrect' in pg.inner_text('#adultzone .msg').lower() and '4 essais' in pg.inner_text('#adultzone .msg'), pg.inner_text('#adultzone .msg'))
    pin(pg, '2468'); pg.wait_for_timeout(1500)
    check('connecté : espace éduc', '#/educ' in pg.url, pg.url)
    # l'admin crée un éduc : code provisoire à 4 chiffres
    pg.goto(BASE + '#/educ/educs'); pg.wait_for_timeout(900)
    pg.fill('#ne', 'Paul'); pg.click('[data-act="addEduc"]'); pg.wait_for_timeout(900)
    code = pg.evaluate("(document.querySelector('.modal .codebig, .modal .bigcode, .modal [class*=code] b') || {}).textContent || ''").strip()
    if not code.isdigit():
        import re; m = re.search(r'\b(\d{4})\b', pg.inner_text('.modal')); code = m.group(1) if m else ''
    check('code provisoire à 4 chiffres', len(code) == 4 and code.isdigit(), code)
    pg.click('.modal button:has-text("Fermer")'); pg.wait_for_timeout(400)
    # Paul se connecte : son nom, le code provisoire, puis il choisit le sien
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(600)
    pg.click('[data-act="adultPick"][data-nom="Paul"]'); pg.wait_for_timeout(300)
    pin(pg, code); pg.wait_for_timeout(1300)
    check('1re connexion : choisir son code', '#/adultes/code' in pg.url and 'CHOISISSEZ' in pg.inner_text('main').upper(), pg.url)
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(700)
    check('pas d\'espace avant d\'avoir choisi', '#/adultes/code' in pg.url, pg.url)
    pin(pg, '1111'); pg.wait_for_timeout(400); pin(pg, '1112'); pg.wait_for_timeout(500)
    check('deux codes différents : on recommence', 'différents' in pg.inner_text('#adultzone .msg'))
    pin(pg, '1111'); pg.wait_for_timeout(400); pin(pg, '1111'); pg.wait_for_timeout(1200)
    check('code 1111 accepté (pas de règle)', 'CODE ENREGISTRÉ' in pg.inner_text('main').upper(), pg.inner_text('main')[:200])
    pg.click('main a.btn'); pg.wait_for_timeout(1200)
    check('puis son espace', '#/educ' in pg.url and '#/adultes' not in pg.url, pg.url)
    # se reconnecter avec son code
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500); pg.click('[data-act="adultPick"][data-nom="Paul"]'); pg.wait_for_timeout(300)
    pin(pg, '1111'); pg.wait_for_timeout(1300)
    check('reconnecté avec son code', '#/educ' in pg.url and '#/adultes' not in pg.url, pg.url)
    # changer son code depuis l'engrenage
    pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(800); pg.click('[data-act="myCode"]'); pg.wait_for_timeout(600)
    check('engrenage › Changer mon code', '#/adultes/code' in pg.url and 'NOUVEAU CODE' in pg.inner_text('main').upper())
    # parent : prénom de l'enfant, puis le code famille
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Lou"]'); pg.wait_for_timeout(300); pin(pg, '1357'); pg.wait_for_timeout(1300)
    check('parent : par le prénom de son 2e enfant', '#/parent' in pg.url, pg.url)
    pg.goto(BASE + '#/parent/plus'); pg.wait_for_timeout(800)
    check('Plus : changer mon code parent', pg.query_selector('a[href="#/adultes/code"]') is not None)
    b.close()
print('ERREURS JS:', errs)
bad = [n for n, c in res if not c]
print('%d/%d OK' % (len(res) - len(bad), len(res)), 'ÉCHECS:', bad)
