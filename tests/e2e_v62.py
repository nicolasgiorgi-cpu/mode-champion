# v62 : retour au calme — un temps pour se mettre en position avant chaque étape (10 s, 5 s pour changer de côté),
# « Terminer la séance » petit et avec confirmation tant que le retour au calme n'est pas fini. L'échauffement ne change pas.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v62.py 390 844   (aussi 1180 820 et 820 1180)
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v62-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def shot(pg, name): pg.screenshot(path=OUT + tag + '-' + name + '.png')
def pin(pg, code, sel):
    for c in code: pg.click('%s [data-k="%s"]' % (sel, c)); pg.wait_for_timeout(40)
def acts(pg): return pg.eval_on_selector_all('[data-act]', 'els=>els.filter(e=>e.offsetParent).map(e=>e.getAttribute("data-act"))')
def top(pg): return pg.inner_text('.run .top').upper() if pg.query_selector('.run .top') else ''
def lab(pg): return pg.inner_text('.run .ring .lab').strip().lower() if pg.query_selector('.run .ring .lab') else ''
def sec(pg): return pg.inner_text('.run .ring .sec').strip() if pg.query_selector('.run .ring .sec') else ''
def h1(pg): return pg.inner_text('.run h1').strip().lower()
def prep(pg): return pg.query_selector('.run .ring.prep') is not None
def ff(pg, ms): pg.clock.fast_forward(ms); pg.wait_for_timeout(260)
def noscroll(pg): return pg.evaluate('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
def jusquau_calme(pg):
    for n in range(300):
        if 'RETOUR AU CALME' in top(pg): return True
        a = acts(pg)
        for x in ['runSetDone', 'runFeel', 'runSkipRest', 'runTour', 'runLetGo', 'runInterStop', 'runNextStep', 'runGo']:
            if x in a:
                pg.click('[data-act="runFeel"][data-v="bien"]' if x == 'runFeel' else '[data-act="%s"] >> visible=true' % x); break
        else:
            ff(pg, 4000); continue
        pg.wait_for_timeout(120)
        if x == 'runGo': ff(pg, 3500)
    return False

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET = 1')
    pg = ctx.new_page(); pg.clock.install()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(600); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, '2580', '.modal'); pg.wait_for_timeout(1200)

    # ---------- l'échauffement ne change pas : les étapes s'enchaînent, « Échauffement fait » reste un grand bouton ----------
    pg.goto(BASE + '#/go/cros'); pg.wait_for_timeout(900)
    check('échauffement : « Échauffement fait » reste le grand bouton', pg.query_selector('.run [data-act="runNextStep"].btn.xl') is not None and pg.query_selector('.run .rtfin') is None)
    e1 = h1(pg)
    pg.click('[data-act="rtGo"]'); pg.wait_for_timeout(150); ff(pg, 3300)
    check('échauffement : après « 3, 2, 1 », le chrono de la 1re étape tourne', lab(pg) == 'il reste' and not prep(pg), lab(pg))
    ff(pg, 61000)
    check('échauffement : l\'étape suivante part tout de suite (pas de temps de mise en place)', h1(pg) != e1 and lab(pg) == 'il reste' and not prep(pg), h1(pg) + ' | ' + lab(pg))
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(300)

    # ---------- jusqu'au retour au calme ----------
    check('on arrive au retour au calme', jusquau_calme(pg), top(pg))
    pg.wait_for_timeout(300); shot(pg, '01-calme-pret')
    fin = pg.query_selector('.run .rtfin')
    check('retour au calme : « Terminer la séance » est le petit bouton', fin is not None and fin.get_attribute('data-act') == 'runEndAsk' and 'TERMINER LA SÉANCE' in fin.inner_text().upper())
    check('retour au calme : plus de grand bouton qui termine d\'un toucher', pg.query_selector('.run [data-act="runNextStep"]') is None, str(acts(pg)))
    bx = fin.bounding_box(); go = pg.query_selector('[data-act="rtGo"]').bounding_box()
    check('« Terminer la séance » : bien plus petit que GO, mais touchable (44 px)', 44 <= bx['height'] <= 48 and bx['width'] < go['width'] * 0.75 and bx['height'] < go['height'] - 12, str(bx) + str(go))
    check('« Terminer la séance » : sous GO, pas collé', bx['y'] >= go['y'] + go['height'] + 16, str(bx) + str(go))
    mins = pg.inner_text('.run p.next').lower()
    check('durée annoncée : elle compte les temps de mise en place', '4 min' in mins or '5 min' in mins, mins)
    check('pas de défilement horizontal', noscroll(pg))

    # ---------- la confirmation ----------
    fin.click(); pg.wait_for_timeout(300); shot(pg, '02-confirmation')
    m = pg.query_selector('.modal')
    check('un toucher sur « Terminer la séance » : une confirmation, la séance continue', m is not None and 'TU TERMINES LA SÉANCE' in m.inner_text().upper() and '#/go/cros' in pg.url)
    pg.click('.modal button:has-text("Je continue")'); pg.wait_for_timeout(300)
    check('« Je continue » : on reste au retour au calme', pg.query_selector('.modal') is None and 'RETOUR AU CALME' in top(pg) and '#/go/cros' in pg.url)
    pg.click('.run .rtfin'); pg.wait_for_timeout(250); pg.click('.modal [data-close]'); pg.wait_for_timeout(250)
    check('la croix de la confirmation : on reste au retour au calme', pg.query_selector('.modal') is None and '#/go/cros' in pg.url)

    # ---------- le temps de mise en place ----------
    n1 = h1(pg)
    pg.click('[data-act="rtGo"]'); pg.wait_for_timeout(150); ff(pg, 3300)
    check('1re étape : pas de temps de mise en place en plus du « 3, 2, 1 »', lab(pg) == 'il reste' and not prep(pg) and h1(pg) == n1, lab(pg))
    ff(pg, 50500); shot(pg, '03-mise-en-place')
    n2 = h1(pg)
    check('fin de la 1re étape : la suivante s\'affiche, « En position »', n2 != n1 and prep(pg) and lab(pg) == 'en position', n2 + ' | ' + lab(pg))
    check('mise en place : le mot tient dans l\'anneau', pg.evaluate("(()=>{const l=document.querySelector('.run .ring .lab').getBoundingClientRect(), r=document.querySelector('.run .ring').getBoundingClientRect(); const cy=r.top+r.height/2, R=r.width/2*0.78, dy=Math.abs((l.top+l.bottom)/2-cy), half=Math.sqrt(Math.max(0,R*R-dy*dy)); const sp=document.createRange(); sp.selectNodeContents(document.querySelector('.run .ring .lab')); const t=sp.getBoundingClientRect(); return t.width/2 <= half;})()"))
    check('mise en place : 10 secondes entre deux étapes', sec(pg) in ('10', '9'), sec(pg))
    check('mise en place : la consigne et la démo de l\'étape à venir sont là', pg.query_selector('.run .hd .small') is not None and len(pg.inner_text('.run .hd .small')) > 20 and pg.query_selector('.run .left') is not None)
    check('mise en place : « GO ! » à la place de « Suivant »', 'GO' in pg.inner_text('[data-act="rtNext"]').upper() and 'SUIVANT' not in pg.inner_text('[data-act="rtNext"]').upper())
    check('mise en place : « Terminer la séance » reste petit', pg.query_selector('.run .rtfin') is not None and pg.query_selector('.run [data-act="runNextStep"]') is None)
    check('pas de défilement horizontal (mise en place)', noscroll(pg))
    ff(pg, 5000)
    check('mise en place : le compte à rebours descend, le chrono de l\'étape n\'est pas parti', prep(pg) and sec(pg) in ('5', '4'), sec(pg))
    # pause pendant la mise en place
    pg.click('[data-act="rtPause"]'); pg.wait_for_timeout(200); ff(pg, 20000)
    check('pause pendant la mise en place : rien ne part', prep(pg) and lab(pg) == 'en pause' and h1(pg) == n2, lab(pg) + ' ' + sec(pg))
    pg.click('[data-act="rtPause"]'); pg.wait_for_timeout(200); ff(pg, 5500)
    check('après la mise en place : le chrono de l\'étape part tout seul', not prep(pg) and lab(pg) == 'il reste' and h1(pg) == n2, lab(pg) + ' | ' + h1(pg))
    check('le chrono de l\'étape part de sa durée entière', sec(pg) in ('20', '19'), sec(pg))
    ff(pg, 20500)
    n3 = h1(pg)
    check('étape suivante : de nouveau la mise en place', prep(pg) and n3 != n2, n3)
    # (relecture v62) « GO ! » touché pendant une pause de la mise en place : le chrono part quand même
    pg.click('[data-act="rtPause"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="rtNext"]'); pg.wait_for_timeout(250)
    check('« GO ! » : le chrono part sans attendre, sur la même étape', not prep(pg) and lab(pg) == 'il reste' and h1(pg) == n3, lab(pg) + ' | ' + h1(pg))
    s0 = sec(pg); ff(pg, 3000)
    check('« GO ! » touché en pause : le chrono tourne vraiment', sec(pg) != s0 and lab(pg) == 'il reste', s0 + ' → ' + sec(pg))
    cote1 = pg.inner_text('.run .sidetag').lower() if pg.query_selector('.run .sidetag') else ''
    ff(pg, 15500)
    cote2 = pg.inner_text('.run .sidetag').lower() if pg.query_selector('.run .sidetag') else ''
    check('changer de côté : 5 secondes de mise en place', prep(pg) and h1(pg) == n3 and cote1 and cote2 and cote1 != cote2 and sec(pg) in ('5', '4'), '%s → %s | %s' % (cote1, cote2, sec(pg)))
    # Suivant pendant une étape : la mise en place de la suivante ; Précédent : on revient
    ff(pg, 5500)
    pg.click('[data-act="rtNext"]'); pg.wait_for_timeout(250)
    n4 = h1(pg)
    check('« Suivant » pendant une étape : la mise en place de l\'étape d\'après', prep(pg) and n4 != n3, n4)
    pg.click('[data-act="rtPrev"]'); pg.wait_for_timeout(250)
    check('« Précédent » : retour à l\'étape d\'avant, avec sa mise en place', prep(pg) and h1(pg) == n3, h1(pg))

    # ---------- jusqu'au bout : le grand bouton vert, sans confirmation ----------
    for k in range(40):
        if pg.query_selector('[data-act="rtNext"]') is None: break
        pg.click('[data-act="rtNext"]'); pg.wait_for_timeout(120)
    pg.wait_for_timeout(250); shot(pg, '04-fini')
    big = pg.query_selector('.run [data-act="runNextStep"].btn.xl.green')
    check('tout est fait : « Séance finie ! », le grand bouton vert « Terminer la séance »', 'séance finie' in h1(pg) and big is not None and pg.query_selector('.run .rtfin') is None, h1(pg))
    pg.click('[data-act="rtPrev"]'); pg.wait_for_timeout(250)
    check('« Revenir à la dernière étape » : sa mise en place, et le petit bouton revient', prep(pg) and pg.query_selector('.run .rtfin') is not None)
    # terminer avant la fin, en confirmant
    pg.click('.run .rtfin'); pg.wait_for_timeout(250)
    pg.click('.modal button:has-text("Oui, je termine")'); pg.wait_for_timeout(1800)
    check('« Oui, je termine la séance » : la séance est enregistrée (écran bravo)', '#/bravo' in pg.url, pg.url)
    shot(pg, '05-bravo')
    check('aucune erreur de script', not errs, str(errs[:3]))
    b.close()
bad = [n for n, c in res if not c]
print('\n%s : %d vérifications, %d en échec' % (tag, len(res), len(bad)))
sys.exit(1 if bad else 0)
