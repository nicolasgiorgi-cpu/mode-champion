# (v78) La navette du bilan montre la bonne animation : départ debout derrière la ligne, sprint, le pied touche la ligne
# d'en face, demi-tour (avant : l'animation des départs de sprint, qui part allongé). Par « Je tente » (#/tente/navette).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v78.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
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
    pg.goto(BASE + '#/tente/navette'); pg.wait_for_timeout(1000)
    pg.click('[data-act="tnChaud"]'); pg.wait_for_timeout(1000)
    st = pg.query_selector('.stage[data-anim]')
    check('Navette : l\'animation de la navette (plus celle des départs allongés)', st is not None and st.get_attribute('data-anim') == 'navette', st.get_attribute('data-anim') if st else None)
    lab = ev("(document.querySelector('.stage svg') || {}).getAttribute ? document.querySelector('.stage svg').getAttribute('aria-label') : ''")
    check('… elle se dessine (le nom de l\'épreuve)', bool(lab) and 'Navette' in lab, lab)
    check('… le texte dit toujours « départ debout »', 'départ debout' in pg.inner_text('main'))
    # l'image du départ (mouvements réduits) : debout, derrière la ligne de départ
    J = ev("MC.anim._pose('navette', MC.anim._meta('navette').still)")
    check('Image fixe : debout, les deux pieds derrière la ligne de départ', J['hip'][1] < 102 and max(J['lN']['toe'][0], J['lF']['toe'][0]) < 52, J)
    tete = "(() => { const c = document.querySelector('.stage svg circle[r=\"8\"]'); return c ? Number(c.getAttribute('cx')) : null; })()"
    x0 = ev(tete); pg.wait_for_timeout(900); x1 = ev(tete)
    check('… et elle s\'anime (le bonhomme bouge)', x0 is not None and x1 is not None and abs(x1 - x0) > 3, (x0, x1))
    check('Pas de défilement de côté', ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
