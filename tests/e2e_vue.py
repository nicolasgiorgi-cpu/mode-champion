# La zone visible décalée (bug d'iOS 26, v53) : la barre du bas et les éléments fixes sont recalés sur ce qu'on voit.
# Chromium n'a pas le bug : window.__MC_VV joue le rôle de window.visualViewport.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_vue.py 390 844 · 1180 820 · 820 1180
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
RAIL = W >= 1000 and W > H
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def fake(pg, t, h=None, s=1):
    pg.evaluate("([t,h,s])=>{window.__MC_VV={offsetTop:t,height:h===null?innerHeight:h,scale:s};window.dispatchEvent(new Event('resize'))}", [t, h, s])
def rect(pg, sel): return pg.evaluate("(s)=>{var r=document.querySelector(s).getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,h:r.height}}", sel)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(600)
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    for c in '2468': pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if '#/educ/bienvenue' in pg.url:
        for i in range(2): pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="obPick"] >> nth=0'); pg.wait_for_timeout(200)
        pg.click('[data-act="obEducDone"]'); pg.wait_for_timeout(1000)
    if pg.query_selector('.modal.sheet-news'): pg.click('.modal.sheet-news button[data-i="0"]'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900)
    IH = pg.evaluate('innerHeight')
    n0 = rect(pg, '#nav')
    check('sans écart : la barre est à sa place', abs(n0['b'] - IH) < 1, n0)
    check('sans écart : aucune variable posée', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--vvt').trim()") in ('0px', ''))
    # on descend dans la page : la barre du haut doit être collée
    pg.evaluate('window.scrollTo(0, 400)'); pg.wait_for_timeout(250)
    y0 = pg.evaluate('scrollY')
    tb0 = rect(pg, '.topbar')
    check('barre du haut collée en haut (page assez longue)', y0 > 0 and abs(tb0['t']) < 1, (y0, tb0))
    # écart de passage (clavier qui se ferme) : rien ne bouge
    fake(pg, 300); pg.wait_for_timeout(60); fake(pg, 0); pg.wait_for_timeout(350)
    check('écart de passage : on ne recale pas', abs(rect(pg, '#nav')['b'] - IH) < 1)
    check('écart de passage : rien de noté', pg.evaluate("localStorage.getItem('mc-vue')") is None)
    # l'écart de la capture d'écran : 397 px, et ça dure
    fake(pg, 397); pg.wait_for_timeout(450)
    n1 = rect(pg, '#nav')
    # ce qu'on voit commence à 397 dans la fenêtre de mise en page : la barre doit finir à 397 + hauteur visible
    check('écart 397 : la barre est recalée en bas de ce qu\'on voit', abs(n1['b'] - (IH + 397)) < 1.5, n1)
    check('écart 397 : même hauteur de barre' if not RAIL else 'écart 397 : le rail couvre ce qu\'on voit', abs(n1['h'] - n0['h']) < 1.5, (n0, n1))
    if RAIL: check('écart 397 : le rail commence en haut de ce qu\'on voit', abs(n1['t'] - 397) < 1.5, n1)
    tb1 = rect(pg, '.topbar')
    check('écart 397 : la barre du haut en haut de ce qu\'on voit', abs(tb1['t'] - 397) < 1.5, tb1)
    v = pg.evaluate("localStorage.getItem('mc-vue')")
    check('écart noté une fois', v is not None and '"n":1' in v and '397' in v, v)
    # une fenêtre et un message pendant l'écart
    pg.evaluate("MC.ui.toast ? MC.ui.toast('essai') : 0"); pg.wait_for_timeout(350)
    tt = rect(pg, '#toast')
    check('écart 397 : le message reste au-dessus de la barre, dans ce qu\'on voit', tt['b'] <= n1['t'] + 1 if not RAIL else tt['b'] <= IH + 397, (tt, n1))
    pg.evaluate("(function(){var m=document.createElement('div');m.className='modal';m.id='essai-vue';document.body.appendChild(m)})()")
    mo = rect(pg, '#essai-vue')
    check('écart 397 : une fenêtre couvre ce qu\'on voit', abs(mo['t'] - 397) < 1.5 and abs(mo['b'] - (IH + 397)) < 1.5, mo)
    pg.evaluate("document.getElementById('essai-vue').remove()")
    # l'écart suit (la page défile, il change)
    fake(pg, 120); pg.wait_for_timeout(120)
    check('l\'écart change : on suit', abs(rect(pg, '#nav')['b'] - (IH + 120)) < 1.5)
    # zone visible plus petite que la fenêtre (24 px, cas signalé sur les forums) : le bas ne bouge pas, le haut si
    fake(pg, 24, IH - 24); pg.wait_for_timeout(120)
    check('24 px en haut, zone plus petite : la barre du bas reste', abs(rect(pg, '#nav')['b'] - IH) < 1.5, rect(pg, '#nav'))
    check('24 px en haut : la barre du haut suit', abs(rect(pg, '.topbar')['t'] - 24) < 1.5, rect(pg, '.topbar'))
    # l'écart disparaît : tout revient
    fake(pg, 0); pg.wait_for_timeout(120)
    check('écart nul : tout revient', abs(rect(pg, '#nav')['b'] - IH) < 1 and abs(rect(pg, '.topbar')['t']) < 1)
    # zoom avec les doigts : on ne touche à rien
    fake(pg, 200, IH / 2, 2); pg.wait_for_timeout(450)
    check('zoom : on ne touche à rien', abs(rect(pg, '#nav')['b'] - IH) < 1)
    fake(pg, 0); pg.wait_for_timeout(120)
    # le clavier ouvert (champ actif) : on ne touche à rien
    pg.evaluate("(function(){var i=document.createElement('input');i.id='essai-champ';document.body.appendChild(i);i.focus()})()")
    fake(pg, 300, IH - 340); pg.wait_for_timeout(450)
    check('clavier ouvert : on ne touche à rien', abs(rect(pg, '#nav')['b'] - IH) < 1)
    # le clavier se ferme et l'écart reste : le bug. On recale.
    pg.evaluate("document.getElementById('essai-champ').blur()")
    fake(pg, 300); pg.wait_for_timeout(450)
    check('clavier fermé, l\'écart reste : on recale', abs(rect(pg, '#nav')['b'] - (IH + 300)) < 1.5, rect(pg, '#nav'))
    pg.evaluate("document.getElementById('essai-champ').remove()")
    # il n'y a pas que les événements : un état figé est vu au prochain relevé
    pg.evaluate("window.__MC_VV={offsetTop:0,height:innerHeight,scale:1}"); pg.wait_for_timeout(2300)
    check('sans événement : le relevé régulier voit que c\'est fini', abs(rect(pg, '#nav')['b'] - IH) < 1)
    # dans Réglages : la ligne n'apparaît que si c'est déjà arrivé
    pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(700)
    check('Réglages : le décalage est dit, avec le nombre de fois', 'recalée 2 fois' in pg.inner_text('main'), pg.inner_text('main')[-200:])
    pg.evaluate("localStorage.removeItem('mc-vue')"); pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(500); pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(700)
    check('Réglages : rien si jamais arrivé', 'recalée' not in pg.inner_text('main'))
    check('pas de défilement de côté', pg.evaluate('document.scrollingElement.scrollWidth <= innerWidth + 1'))
    check('aucune erreur', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('%d/%d' % (len(res) - len(bad), len(res)), W, H)
sys.exit(1 if bad else 0)
