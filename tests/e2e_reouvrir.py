# (v33) Rouvrir l'appli : on retrouve le dernier profil utilisé (enfant, parent, éduc), sans code.
# Sur un appareil partagé, le code adulte n'est redemandé qu'en revenant de l'espace joueur (plus de verrou au bout de 10 min).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_reouvrir.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def rouvrir(pg):
    # l'appli installée repart de son adresse de départ (sans #), comme en la rouvrant depuis l'écran d'accueil
    pg.goto(BASE); pg.wait_for_timeout(1300)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    # ----- 1. un éduc seul sur son téléphone -----
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    check('éduc connecté', '#/educ' in pg.url, pg.url)
    rouvrir(pg)
    check('éduc : en rouvrant, son espace (pas la connexion des enfants)', '#/educ/' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    # ----- 2. il passe le téléphone à son enfant, puis revient (code), puis rouvre -----
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    check('▶ Tom : espace de l\'enfant', '#/semaine' in pg.url, pg.url)
    rouvrir(pg)
    check('en rouvrant après l\'enfant : l\'espace de l\'enfant', '#/semaine' in pg.url, pg.url)
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    check('de l\'enfant vers l\'éduc : code redemandé', pg.query_selector('#adultzone [data-k="1"]') is not None, pg.url)
    pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    check('code retapé : espace éduc', '#/educ' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    # plus de verrou au bout de 10 min (ancienne valeur : heure d'expiration dépassée)
    pg.evaluate("localStorage.setItem('mc-adult-open', JSON.stringify(Date.now()-60000))")
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900)
    check('plus de verrou au bout de 10 min', '#/educ/progres' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    rouvrir(pg)
    check('en rouvrant après l\'éduc : l\'espace éduc, sans code', '#/educ/' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    # ----- 3. ancienne appli (sans « dernier profil ») : le plus récent des deux gagne -----
    pg.evaluate("localStorage.removeItem('mc-last'); localStorage.setItem('mc-kid-seen', JSON.stringify(Date.now()-3600000)); localStorage.setItem('mc-adult-open', JSON.stringify(Date.now()-120000))")
    rouvrir(pg)
    check('reprise d\'une appli d\'avant : adulte plus récent → espace éduc', '#/educ/' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    pg.evaluate("localStorage.removeItem('mc-last'); localStorage.setItem('mc-kid-seen', JSON.stringify(Date.now()-1000)); localStorage.setItem('mc-adult-open', JSON.stringify(Date.now()-3600000))")
    rouvrir(pg)
    check('reprise d\'une appli d\'avant : enfant plus récent → sa semaine', '#/semaine' in pg.url, pg.url)
    # ----- 4. un enfant seul -----
    pg.evaluate("MC.app.setAdult(null)"); rouvrir(pg)
    check('enfant seul : sa semaine', '#/semaine' in pg.url, pg.url)
    pg.evaluate("MC.app.setKid(null)"); rouvrir(pg)
    check('personne : connexion des enfants', '#/connexion' in pg.url, pg.url)
    # ----- 5. un parent -----
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1500)
    rouvrir(pg)
    check('parent : en rouvrant, son espace', '#/parent' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    # ----- 5b. appareil partagé : quitter l'espace adulte vers la connexion des joueurs, puis rouvrir → côté joueurs, pas le parent -----
    pg.goto(BASE + '#/parent/plus'); pg.wait_for_timeout(900)
    pg.evaluate("localStorage.setItem('mc-shared', JSON.stringify('on'))")
    pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(900)
    rouvrir(pg)
    check('partagé : parent → connexion des joueurs, puis rouvrir : pas l\'espace parent', '#/connexion' in pg.url, pg.url)
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(800)
    check('… et l\'espace parent redemande le code', pg.query_selector('#adultzone [data-k="1"]') is not None, pg.url)
    pin(pg, codes['parent']); pg.wait_for_timeout(1500)
    # un enfant connecté qui « change de joueur » puis rouvre : pas l'espace parent non plus
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    pg.evaluate("MC.act.logoutKid()"); pg.wait_for_timeout(700)
    rouvrir(pg)
    check('partagé : l\'enfant change de joueur puis rouvre : connexion des joueurs', '#/connexion' in pg.url, pg.url)
    # appareil à soi (pas partagé) : l'éduc qui a jeté un œil côté joueurs retrouve quand même son espace
    pg.evaluate("MC.app.setAdult(null); MC.app.setKid(null); localStorage.setItem('mc-recents', 'null'); localStorage.removeItem('mc-shared')")
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(800)
    rouvrir(pg)
    check('appareil à soi : l\'éduc passé côté joueurs retrouve son espace en rouvrant', '#/educ/' in pg.url and pg.query_selector('#adultzone') is None, pg.url)
    pg.evaluate("MC.app.setAdult(null)")
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1500)
    rouvrir(pg)
    # ----- 6. « Réparer l'appli » garde le dernier profil et les réglages des notifications ; « Repartir de zéro », non -----
    # (en démo, la réparation efface aussi la base de démo : on ne vérifie que ce qui est gardé sur l'appareil)
    pg.evaluate("localStorage.setItem('mc-notif:test', '1')")
    pg.goto(BASE + '?reset=1'); pg.wait_for_timeout(3500)
    kept = pg.evaluate("[localStorage.getItem('mc-last'), localStorage.getItem('mc-notif:test')]")
    check('Réparer l\'appli : dernier profil et notifications gardés', kept[0] == '"f"' and kept[1] == '1', kept)
    pg.goto(BASE + '?reset=2'); pg.wait_for_timeout(3500)
    kept = pg.evaluate("[localStorage.getItem('mc-last'), localStorage.getItem('mc-notif:test')]")
    check('Repartir de zéro : tout est effacé', kept[1] is None and kept[0] in (None, '"k"'), kept)
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad or errs else 0)
