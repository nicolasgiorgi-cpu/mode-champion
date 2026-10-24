# Compos : les enfants qui n'ont pas répondu sur Spond se placent en attendant ; s'ils répondent « non », la compo le signale
# et un geste les retire. Cartes des entraînements sans la ligne date / adresse.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_attente.py 390 844
import sys, os
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
OUT = os.environ.get('OUT', '/tmp/attente-shots/'); os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code):
    for c in code: pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, '2468'); pg.wait_for_timeout(1500)
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    card = pg.inner_text('a.cev >> nth=0')
    check('carte entraînement : pas de ligne date / adresse', pg.query_selector('a.cev .t2') is None, card)
    check('carte entraînement : l\'heure dans le carré', pg.query_selector('a.cev .cdate small.ch') is not None)
    pg.screenshot(path=OUT + 'a1-entrainements.png', clip={'x': 0, 'y': 0, 'width': W, 'height': 420})
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1000)
    if pg.query_selector('[data-act="cGo"]'): pg.click('[data-act="cGo"]'); pg.wait_for_timeout(800)
    btn = pg.query_selector('[data-act="cProposer"], [data-act="cPropose"], button:has-text("Proposer")')
    if btn: btn.click(); pg.wait_for_timeout(900)
    t = pg.inner_text('main')
    check('section « En attente de réponse »', 'EN ATTENTE DE RÉPONSE' in t.upper(), t[:300])
    nid = pg.evaluate("Object.keys(MC.app.S.cache.compos.evenements.find(e=>e.id==='sp-demo-p3')).length && MC.app.S.cache.compos.evenements.find(e=>e.id==='sp-demo-p3').sansReponse[0]")
    pg.click('.catt-sec [data-act="cPick"][data-id="%s"]' % nid); pg.wait_for_timeout(300)
    pg.click('.ccol:not(.banc) [data-act="cTeam"] >> nth=0'); pg.wait_for_timeout(500)
    check('placé en attendant : horloge sur son nom', pg.query_selector('.ccol:not(.banc) [data-id="%s"] .catt' % nid) is not None)
    check('alerte « placé en attendant sa réponse »', 'en attendant sa réponse' in pg.inner_text('main'))
    pg.screenshot(path=OUT + 'a2-place.png', full_page=True)
    # il répond « non » sur Spond (synchro)
    pg.evaluate("(function(id){var e=MC.app.S.cache.compos.evenements.find(e=>e.id==='sp-demo-p3');e.sansReponse=e.sansReponse.filter(x=>x!==id);e.absents=(e.absents||[]).concat([id]);MC.app.rerender();})('%s')" % nid)
    pg.wait_for_timeout(700)
    check('il a répondu non : barré « absent »', pg.query_selector('.cpj.gone[data-id="%s"]' % nid) is not None)
    check('alerte « ne vient plus » avec Retirer', 'Ne vient plus' in pg.inner_text('main') and pg.query_selector('[data-act="cFix"]:has-text("Retirer")') is not None)
    pg.screenshot(path=OUT + 'a3-absent.png', full_page=True)
    pg.click('[data-act="cFix"]:has-text("Retirer")'); pg.wait_for_timeout(600)
    check('retiré de la compo', pg.query_selector('[data-id="%s"]' % nid) is None)
    b.close()
print('ERREURS JS:', errs)
bad = [n for n, c in res if not c]
print('%d/%d OK' % (len(res) - len(bad), len(res)), 'ÉCHECS:', bad)
