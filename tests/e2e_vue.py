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
    fake(pg, 300); pg.wait_for_timeout(300); fake(pg, 0); pg.wait_for_timeout(800)
    check('écart de passage : on ne recale pas', abs(rect(pg, '#nav')['b'] - IH) < 1)
    check('écart de passage : rien de noté', pg.evaluate("localStorage.getItem('mc-vue')") is None)
    # le clavier d'Android ou d'iOS qui se ferme : la zone visible est plus petite un moment, sans offsetTop ; puis une zone
    # visible durablement plus petite (barre d'un navigateur) : ce n'est pas le bug
    fake(pg, 0, IH - 300); pg.wait_for_timeout(300); fake(pg, 0); pg.wait_for_timeout(120)
    check('clavier qui se ferme : la barre ne saute pas', abs(rect(pg, '#nav')['b'] - IH) < 1)
    fake(pg, 0, IH - 56); pg.wait_for_timeout(900)
    check('zone visible plus petite qui dure, sans décalage : on ne touche à rien', abs(rect(pg, '#nav')['b'] - IH) < 1, rect(pg, '#nav'))
    check('zone visible plus petite : rien de noté', pg.evaluate("localStorage.getItem('mc-vue')") is None)
    fake(pg, 0); pg.wait_for_timeout(120)
    # un message et le pavé, avant l'écart, pour comparer
    pg.evaluate("MC.ui.toast('essai')"); pg.wait_for_timeout(350)
    tt0 = rect(pg, '#toast')
    # l'écart de la capture d'écran : 397 px, et ça dure
    fake(pg, 397); pg.wait_for_timeout(900)
    n1 = rect(pg, '#nav')
    # ce qu'on voit commence à 397 dans la fenêtre de mise en page : la barre doit finir à 397 + hauteur visible
    check('écart 397 : la barre est recalée en bas de ce qu\'on voit', abs(n1['b'] - (IH + 397)) < 1.5, n1)
    check('écart 397 : même hauteur de barre' if not RAIL else 'écart 397 : le rail couvre ce qu\'on voit', abs(n1['h'] - n0['h']) < 1.5, (n0, n1))
    if RAIL: check('écart 397 : le rail commence en haut de ce qu\'on voit', abs(n1['t'] - 397) < 1.5, n1)
    tb1 = rect(pg, '.topbar')
    check('écart 397 : la barre du haut en haut de ce qu\'on voit', abs(tb1['t'] - 397) < 1.5, tb1)
    v = pg.evaluate("localStorage.getItem('mc-vue')")
    check('écart noté une fois, avec les hauteurs', v is not None and '"n":1' in v and '"haut":397' in v and '"vue":' in v and '"fen":' in v, v)
    # une fenêtre et un message pendant l'écart
    pg.evaluate("MC.ui.toast('essai')"); pg.wait_for_timeout(350)
    tt = rect(pg, '#toast')
    check('écart 397 : le message descend avec la zone visible', abs(tt['b'] - tt0['b'] - 397) < 1.5, (tt0, tt))
    # les autres éléments fixes et collants, ajoutés pour l'essai
    def essai(cls, html='', attr=''):
        pg.evaluate("([c,h])=>{var m=document.createElement('div');m.className=c;m.id='essai-vue';m.innerHTML=h;document.body.appendChild(m)}", [cls, html])
        r = rect(pg, '#essai-vue'); pg.evaluate("document.getElementById('essai-vue').remove()"); return r
    for cls in ('modal', 'bk'):
        mo = essai(cls)
        check('écart 397 : .%s couvre ce qu\'on voit' % cls, abs(mo['t'] - 397) < 1.5 and abs(mo['b'] - (IH + 397)) < 1.5, mo)
    np = essai('numpad', 'x')
    check('écart 397 : le pavé est en bas de ce qu\'on voit', abs(np['b'] - (IH + 397)) < 1.5, np)
    of = essai('offline', 'x')
    check('écart 397 : le bandeau hors ligne est en haut de ce qu\'on voit', abs(of['t'] - 397) < 1.5, of)
    pt = pg.evaluate("(function(){var m=document.createElement('div');m.className='ptr';document.body.appendChild(m);var r=m.getBoundingClientRect().top;m.remove();return r})()")
    pg.evaluate("document.documentElement.style.setProperty('--vvt','0px')")
    pt0 = pg.evaluate("(function(){var m=document.createElement('div');m.className='ptr';document.body.appendChild(m);var r=m.getBoundingClientRect().top;m.remove();return r})()")
    pg.evaluate("document.documentElement.style.setProperty('--vvt','397px')")
    check('écart 397 : le repère du tirer descend aussi', abs(pt - pt0 - 397) < 1.5, (pt0, pt))
    # les barres collantes des missions : leur « bottom » tient compte de l'écart
    cb = pg.evaluate("(function(){var m=document.createElement('div');m.className='cp-bar';document.querySelector('main').appendChild(m);var b=getComputedStyle(m).bottom;var n=document.createElement('div');n.className='cp-act';document.querySelector('main').appendChild(n);var c=getComputedStyle(n).bottom;m.remove();n.remove();return [parseFloat(b),parseFloat(c)]})()")
    check('écart 397 : les barres collantes des missions descendent', cb[0] < -300 and cb[1] < -300, cb)
    # le message ancré en haut (écran des compos, joueur touché)
    tc = pg.evaluate("(function(){var a=document.createElement('div');a.className='cdock';a.innerHTML='<i class=\\'cselp\\'></i>';document.body.appendChild(a);var r=document.getElementById('toast').getBoundingClientRect().top;a.remove();return r})()")
    check('écart 397 : le message ancré en haut reste dans ce qu\'on voit', tc > 397, tc)
    # l'écart suit (la page défile, il change)
    fake(pg, 120); pg.wait_for_timeout(120)
    check('l\'écart change : on suit', abs(rect(pg, '#nav')['b'] - (IH + 120)) < 1.5)
    # zone visible plus petite que la fenêtre (24 px, cas signalé sur les forums) : le bas ne bouge pas, le haut si
    # pendant le bug, height peut rester trop petit (signalé sur WebKit et chez Apple) : la barre du bas doit quand même descendre
    fake(pg, 24, IH - 24); pg.wait_for_timeout(120)
    check('24 px en haut, zone trop courte : la barre du bas descend', abs(rect(pg, '#nav')['b'] - (IH + 24)) < 1.5, rect(pg, '#nav'))
    check('24 px en haut : la barre du haut suit', abs(rect(pg, '.topbar')['t'] - 24) < 1.5, rect(pg, '.topbar'))
    fake(pg, 397, IH - 397); pg.wait_for_timeout(120)
    check('397 px en haut, zone trop courte : la barre du bas descend', abs(rect(pg, '#nav')['b'] - (IH + 397)) < 1.5, rect(pg, '#nav'))
    # l'écart disparaît : tout revient
    fake(pg, 0); pg.wait_for_timeout(120)
    check('écart nul : tout revient', abs(rect(pg, '#nav')['b'] - IH) < 1 and abs(rect(pg, '.topbar')['t']) < 1)
    # zoom avec les doigts : on ne touche à rien
    fake(pg, 200, IH / 2, 2); pg.wait_for_timeout(900)
    check('zoom : on ne touche à rien', abs(rect(pg, '#nav')['b'] - IH) < 1)
    fake(pg, 0); pg.wait_for_timeout(120)
    # le clavier ouvert (champ actif) : on ne touche à rien
    pg.evaluate("(function(){var i=document.createElement('input');i.id='essai-champ';document.body.appendChild(i);i.focus()})()")
    fake(pg, 300, IH - 340); pg.wait_for_timeout(900)
    check('clavier ouvert : on ne touche à rien', abs(rect(pg, '#nav')['b'] - IH) < 1)
    # le clavier se ferme et l'écart reste : le bug. On recale.
    pg.evaluate("document.getElementById('essai-champ').blur()")
    fake(pg, 300); pg.wait_for_timeout(900)
    check('clavier fermé, l\'écart reste : on recale', abs(rect(pg, '#nav')['b'] - (IH + 300)) < 1.5, rect(pg, '#nav'))
    pg.evaluate("document.getElementById('essai-champ').remove()")
    # un champ qui n'ouvre pas le clavier du téléphone (le pavé maison, en lecture seule ; une case à cocher) ne coupe pas le recalage
    for js, nom in (("i.readOnly=true", 'pavé maison, champ en lecture seule'), ("i.type='checkbox'", 'case à cocher')):
        pg.evaluate("(j)=>{var i=document.createElement('input');i.id='essai-champ';eval(j);document.body.appendChild(i);i.focus()}", js)
        fake(pg, 300); pg.wait_for_timeout(150)
        check(nom + ' : le recalage reste', abs(rect(pg, '#nav')['b'] - (IH + 300)) < 1.5, rect(pg, '#nav'))
        pg.evaluate("document.getElementById('essai-champ').remove()")
    # zone visible plus grande que la fenêtre, sans offsetTop (la fenêtre reste à la hauteur du clavier) : la barre descend
    fake(pg, 0, IH + 200); pg.wait_for_timeout(150)
    check('zone visible plus grande que la fenêtre : la barre descend', abs(rect(pg, '#nav')['b'] - (IH + 200)) < 1.5, rect(pg, '#nav'))
    fake(pg, 300); pg.wait_for_timeout(150)
    # la relance (un mini-défilement) : seulement s'il y a un écart, et la position ne change pas
    pg.wait_for_timeout(450)   # la relance d'avant (le champ retiré juste au-dessus) est passée
    pg.evaluate("(function(){window.__rel=0;var o=window.scrollTo;window.scrollTo=function(){window.__rel++;return o.apply(window,arguments)}})()")
    y1 = pg.evaluate('scrollY')
    fake(pg, 300); pg.evaluate("(function(){var i=document.createElement('input');i.id='essai-champ';document.body.appendChild(i);i.focus();i.blur();i.remove()})()"); pg.wait_for_timeout(700)
    check('clavier fermé avec un écart : la relance a lieu, sans bouger la page', pg.evaluate('__rel') == 2 and pg.evaluate('scrollY') == y1, (pg.evaluate('__rel'), y1, pg.evaluate('scrollY')))
    fake(pg, 0); pg.wait_for_timeout(150); pg.evaluate('window.__rel=0')
    pg.evaluate("(function(){var i=document.createElement('input');i.id='essai-champ';document.body.appendChild(i);i.focus();i.blur();i.remove()})()"); pg.wait_for_timeout(700)
    check('clavier fermé sans écart : aucune relance', pg.evaluate('__rel') == 0, pg.evaluate('__rel'))
    fake(pg, 300); pg.wait_for_timeout(900)
    # il n'y a pas que les événements : un état figé est vu au prochain relevé
    pg.evaluate("window.__MC_VV={offsetTop:0,height:innerHeight,scale:1}"); pg.wait_for_timeout(2300)
    check('sans événement : le relevé régulier voit que c\'est fini', abs(rect(pg, '#nav')['b'] - IH) < 1)
    # dans Réglages : la ligne n'apparaît que si c'est déjà arrivé
    pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(700)
    check('Réglages : le décalage est dit, avec le nombre de fois et les hauteurs', 'recalée 3 fois' in pg.inner_text('main') and 'fenêtre %d' % IH in pg.inner_text('main'), pg.inner_text('main')[-200:])
    pg.evaluate("localStorage.removeItem('mc-vue')"); pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(500); pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(700)
    check('Réglages : rien si jamais arrivé', 'recalée' not in pg.inner_text('main'))
    check('pas de défilement de côté', pg.evaluate('document.scrollingElement.scrollWidth <= innerWidth + 1'))
    check('aucune erreur', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('%d/%d' % (len(res) - len(bad), len(res)), W, H)
sys.exit(1 if bad else 0)
