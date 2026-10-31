# (v33) Rebond en fin de défilement : glisser au-delà du bas (ou du haut sans « tirer pour actualiser ») tire la page
# avec résistance puis elle revient ; un élan qui arrive au bout rebondit un peu ; la barre du haut reste en place.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_rebond.py [largeur hauteur]
import sys, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def ty(pg, sel):
    t = pg.evaluate("(function(){var e=document.querySelector('%s');return e?e.style.transform||getComputedStyle(e).transform:''})()" % sel)
    m = re.search(r'translateY\((-?[\d.]+)px\)', t or '') or re.search(r'translate3d\(0(?:px)?, (-?[\d.]+)px', t or '')
    if m: return float(m.group(1))
    m = re.search(r'matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)', t or '')
    return float(m.group(1)) if m else 0.0
def touch(cdp, kind, x, y):
    cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y}]})
def drag(pg, cdp, x, y0, y1, steps=12, hold=False):
    touch(cdp, 'touchStart', x, y0)
    for i in range(1, steps + 1):
        touch(cdp, 'touchMove', x, y0 + (y1 - y0) * i / steps); pg.wait_for_timeout(16)
    if not hold: touch(cdp, 'touchEnd', x, y1)
with sync_playwright() as p:
    b = p.chromium.launch()
    for reduce in (False, True):
        ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True, reduced_motion='reduce' if reduce else 'no-preference')
        pg = ctx.new_page(); pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
        cdp = ctx.new_cdp_session(pg)
        pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
        codes = pg.evaluate('MC.demo.CODES')
        pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
        pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
        pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1200)
        pg.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); pg.wait_for_timeout(300)
        at_bottom = pg.evaluate('Math.abs(window.scrollY - (document.documentElement.scrollHeight - innerHeight)) < 3')
        if not reduce:
            check('liste des enfants : on est en bas', at_bottom)
            drag(pg, cdp, W // 2, int(H * 0.7), int(H * 0.3), hold=True)
            d = ty(pg, '#app'); tb = ty(pg, '#app .topbar')
            check('en bas, on tire vers le haut : la page monte avec résistance', -150 <= d < -20, d)
            check('la barre du haut reste en place', abs(tb + d) < 1.5, (d, tb))
            # (31/10, plus fluide) la page est sur sa propre couche, sans variable CSS recalculée pour toute la page
            check('pendant le rebond : la page sur sa couche (eb-prep, will-change)', pg.evaluate("document.getElementById('app').classList.contains('eb-prep') && getComputedStyle(document.getElementById('app')).willChange === 'transform'"))
            check('pendant le rebond : plus de variable --eb sur la page', pg.evaluate("document.getElementById('app').style.getPropertyValue('--eb')") == '')
            touch(cdp, 'touchEnd', W // 2, int(H * 0.3)); pg.wait_for_timeout(150)
            mid = ty(pg, '#app')
            pg.wait_for_timeout(1100)
            check('lâché : la page revient (ressort)', abs(mid) < abs(d) and ty(pg, '#app') == 0 and not pg.evaluate("document.getElementById('app').classList.contains('eb-on')"), (d, mid, ty(pg, '#app')))
            check('lâché : plus aucun décalage (barre du haut, style)', pg.evaluate("document.getElementById('app').style.transform") == '' and ty(pg, '#app .topbar') == 0)
            # l'élan qui arrive en bas (doigt levé) : un petit rebond
            pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(300)
            pg.evaluate("""() => new Promise(r => { MC.rebond.state.tEnd = Date.now(); MC.rebond.state.touching = false;
                var max = document.documentElement.scrollHeight - innerHeight, y = Math.max(0, max - 600), mn = 0;
                // le décalage vertical de la page (translate3d(0, y, 0) ou translateY(y))
                function ty() { var m = document.getElementById('app').style.transform.match(/translate(?:3d\\(0(?:px)?, |Y\\()(-?[\\d.]+)px/); return m ? parseFloat(m[1]) : 0; }
                (function f(){ y = Math.min(max, y + 40); window.scrollTo(0, y); var t = ty(); if (t < mn) mn = t; if (y < max) requestAnimationFrame(f); else { var n = 0; (function g(){ var t2 = ty(); if (t2 < mn) mn = t2; if (++n < 30) requestAnimationFrame(g); else { window.__mn = mn; r(); } })(); } })(); })""")
            mn = pg.evaluate('window.__mn')
            check('élan qui arrive en bas : petit rebond vers le haut', -60 <= mn < -3, mn)
            # le ressort : la vitesse de l'élan, puis retour sans dépasser de l'autre côté
            tr = pg.evaluate("""() => new Promise(res => { var out = []; MC.rebond.spring(0, -1500); var t0 = performance.now();
                (function f(t){ var m = (document.getElementById('app').style.transform.match(/translate3d\\(0px, (-?[\\d.]+)px/)||[0,0])[1]; out.push(+m); if (t - t0 < 800) requestAnimationFrame(f); else res(out); })(t0); })""")
            check('ressort : pic proportionné à l\'élan (1500 px/s → 25 à 50 px)', -50 <= min(tr) <= -25, min(tr))
            check('ressort : jamais de l\'autre côté (pas de saccade au retour)', max(tr) <= 0 and tr[-1] == 0, (max(tr), tr[-1]))
            pg.wait_for_timeout(900)
            check('après l\'élan : la page est revenue', ty(pg, '#app') == 0)
            # en haut d'un écran SANS « tirer pour actualiser » (réglages éduc) : rebond vers le bas
            pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(1000); pg.evaluate('window.scrollTo(0,0)')
            drag(pg, cdp, W // 2, int(H * 0.25), int(H * 0.6), hold=True)
            d2 = ty(pg, '#app')
            check('en haut sans « tirer pour actualiser » : la page descend un peu', 15 < d2 <= 150, d2)
            touch(cdp, 'touchEnd', W // 2, int(H * 0.6)); pg.wait_for_timeout(1000)
            check('… puis revient', ty(pg, '#app') == 0)
            # en haut d'un écran AVEC « tirer pour actualiser » : c'est lui qui répond, pas le rebond
            pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1000); pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(200)
            drag(pg, cdp, W // 2, int(H * 0.5), int(H * 0.75), hold=True)   # pas sur le champ de recherche
            check('en haut avec « tirer pour actualiser » : le repère d\'actualisation, pas le rebond', pg.evaluate("document.getElementById('app').classList.contains('ptr-pull') && !document.getElementById('app').classList.contains('eb-on')"))
            touch(cdp, 'touchEnd', W // 2, int(H * 0.75)); pg.wait_for_timeout(1800)
            # un geste de côté ne fait rien
            pg.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); pg.wait_for_timeout(200)
            touch(cdp, 'touchStart', 60, int(H * 0.6))
            for i in range(1, 10): touch(cdp, 'touchMove', 60 + i * 25, int(H * 0.6) - i * 3); pg.wait_for_timeout(16)
            check('geste de côté : pas de rebond', ty(pg, '#app') == 0)
            touch(cdp, 'touchEnd', 280, int(H * 0.6)); pg.wait_for_timeout(300)
            # une fenêtre ouverte : pas de rebond de la page derrière
            pg.evaluate("() => { MC.ui.modal({title:'Test', body:'<p>x</p>', actions:[{label:'OK', value:1, cls:'btn'}]}); }"); pg.wait_for_timeout(300)
            drag(pg, cdp, W // 2, int(H * 0.3), int(H * 0.1), hold=True)
            check('fenêtre ouverte : la page derrière ne bouge pas', ty(pg, '#app') == 0)
            touch(cdp, 'touchEnd', W // 2, int(H * 0.1))
        else:
            drag(pg, cdp, W // 2, int(H * 0.7), int(H * 0.3), hold=True)
            check('« réduire les animations » : pas de rebond', ty(pg, '#app') == 0)
            touch(cdp, 'touchEnd', W // 2, int(H * 0.3))
        ctx.close()
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad or errs else 0)
