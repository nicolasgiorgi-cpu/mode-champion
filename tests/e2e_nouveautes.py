# (31/10/2026) « Quoi de neuf ? » ne s'ouvre plus tout seul pour les enfants et les parents (MC.CONFIG.NOUVEAUTES_AUTO) :
# les nouveautés sont marquées vues sans s'afficher ; la bienvenue de la 1re ouverture reste ; les éducs l'ont toujours.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_nouveautes.py [largeur hauteur]
import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def fermer(pg):
    for k in ['.modal.sheet-news', '.modal.sheet-bvn']:
        if pg.query_selector(k): pg.click(k + ' button[data-i="0"]'); pg.wait_for_timeout(300)
def oublier(pg, cle):
    # une nouveauté pas encore vue pour ce profil (comme un appareil qui revient après une mise à jour)
    pg.evaluate("(k => { var o = JSON.parse(localStorage.getItem('mc-news') || '{}'); if (o[k]) o[k] = o[k].slice(1); localStorage.setItem('mc-news', JSON.stringify(o)); })('%s')" % cle)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    codes = pg.evaluate('MC.demo.CODES')
    # ----- l'enfant -----
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, '2580', '.modal'); pg.wait_for_timeout(1500)
    check('enfant, 1re ouverture : la bienvenue reste', pg.query_selector('.modal.sheet-bvn') is not None)
    fermer(pg)
    kid = pg.evaluate('MC.app.S.me.joueur.id')
    oublier(pg, 'k:' + kid); pg.reload(); pg.wait_for_timeout(1800); fermer(pg) if pg.query_selector('.modal.sheet-bvn') else None
    pg.reload(); pg.wait_for_timeout(1800)
    check('enfant qui revient : pas de « Quoi de neuf ? »', pg.query_selector('.modal.sheet-news') is None)
    vus = pg.evaluate("(JSON.parse(localStorage.getItem('mc-news') || '{}')['k:%s'] || []).length" % kid)
    tous = pg.evaluate("MC.news.forRole('k').length")
    check('… les nouveautés sont marquées vues (pas d\'avalanche plus tard)', vus == tous, (vus, tous))
    check('… la liste reste dans Réglages', pg.evaluate("MC.news.forRole('k').length") > 0)
    # ----- le parent -----
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent'], '#adultzone'); pg.wait_for_timeout(1800)
    fermer(pg)
    fam = pg.evaluate('MC.app.S.cache.family.famille.id')
    oublier(pg, 'f:' + fam); pg.goto(BASE + '#/parent'); pg.reload(); pg.wait_for_timeout(2000)
    fermer(pg) if pg.query_selector('.modal.sheet-bvn') else None
    oublier(pg, 'f:' + fam); pg.reload(); pg.wait_for_timeout(2000)
    check('parent qui revient : pas de « Quoi de neuf ? »', pg.query_selector('.modal.sheet-news') is None)
    # ----- l'éduc : toujours -----
    pg.evaluate("MC.app.setAdult(null); 0"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ'], '#adultzone'); pg.wait_for_timeout(1800)
    fermer(pg)
    pg.evaluate("MC.loadGroup().then(function(g){ MC.accueil.markTour('e', g.moi.id); }); 0"); pg.wait_for_timeout(1200)
    ed = pg.evaluate("(MC.app.S.cache.group && MC.app.S.cache.group.moi.id) || ''")
    pg.evaluate("(function(){var o=JSON.parse(localStorage.getItem('mc-news')||'{}');o['e:%s']=MC.news.forRole('e').map(function(n){return n.id;}).slice(1);localStorage.setItem('mc-news',JSON.stringify(o));})(); 0" % ed)
    pg.goto(BASE + '#/educ/entrainements'); pg.reload(); pg.wait_for_timeout(2200)
    for _ in range(2):
        if pg.query_selector('.modal.sheet-bvn'): fermer(pg); pg.reload(); pg.wait_for_timeout(2200)
    check('éduc : « Quoi de neuf ? » toujours là', pg.query_selector('.modal.sheet-news') is not None)
    b.close()
bad = [n for n, c in res if not c]
print('e2e_nouveautes %dx%d : %d/%d' % (W, H, len(res) - len(bad), len(res)), len(bad), 'BAD', 'ERREURS JS :', errs or 'aucune')
