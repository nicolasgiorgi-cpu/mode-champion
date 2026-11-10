# (v66) Arbitrages côté éducs acceptés par Nicolas le 10/11/2026 : bouton « Absent » dans le panneau d'un joueur de la compo,
# « N à regarder » en haut de la compo, équipes côte à côte par défaut à partir de 900 px (iPad paysage), barre du haut des
# 4 onglets éduc sans sur-titre et sans titre coupé.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v66.py 390 844 · 1180 820 · 820 1180 (et 360 780)
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    pg.goto(BASE); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(600)
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    for c in ev('MC.demo.CODES.educ'): pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if '#/educ/bienvenue' in pg.url:
        for i in range(2): pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="obPick"] >> nth=0'); pg.wait_for_timeout(200)
        pg.click('[data-act="obEducDone"]'); pg.wait_for_timeout(1000)

    # ----- 1. la barre du haut des 4 onglets : plus de sur-titre, le titre entier -----
    for url in ('#/educ/entrainements', '#/educ/plateaux', '#/educ/progres', '#/educ/joueurs'):
        pg.goto(BASE + url); pg.wait_for_timeout(900)
        r = ev("""(() => { const tb = document.querySelector('.topbar'), t = tb.querySelector('.tb-title'), k = tb.querySelector('.tb-k'), ps = tb.querySelector('.tb-pass');
          return { kicker: k ? k.textContent : '', titre: t ? t.textContent : '', coupe: t ? t.scrollWidth > t.clientWidth + 1 : true, pass: ps ? ps.getAttribute('aria-label') : null }; })()""")
        check('%s : plus de « Éduc · … » au-dessus du titre' % url, 'ÉDUC' not in r['kicker'].upper(), r)
        check('%s : le titre « %s » n\'est pas coupé' % (url, r['titre']), not r['coupe'], r)
        check('%s : « Passer le téléphone » garde le prénom pour le lecteur d\'écran' % url, r['pass'] is None or 'Passer le téléphone' in r['pass'], r)

    # ----- 2. la compo : « N à regarder » en haut, qui descend à la liste -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1500)
    ev('window.scrollTo(0, 0)'); pg.wait_for_timeout(300)
    n = ev("document.querySelectorAll('#calertes .calerts > li').length")
    chip = ev("(() => { const c = document.querySelector('.cnreg'); return c ? { lab: c.getAttribute('aria-label'), n: c.querySelector('b').textContent } : null; })()")
    check('compo : « %d à regarder » en haut, le même nombre que la liste' % n, n > 0 and chip and chip['n'] == str(n) and chip['lab'] == '%d à regarder' % n, (n, chip))
    r = ev("(() => { const c = document.querySelector('.cnreg').getBoundingClientRect(), p = document.querySelector('[data-act=cPublish]').getBoundingClientRect(); return { memeLigne: Math.abs(c.top - p.top) < 30, h: Math.round(c.height) }; })()")
    check('compo : la puce sur la même ligne que « Publier », 44 px au moins', r['memeLigne'] and r['h'] >= 44, r)
    pg.click('.cnreg'); pg.wait_for_timeout(900)
    r = ev("(() => { const s = document.getElementById('calertes').getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(); return { haut: Math.round(s.top), tBas: Math.round(t.bottom), vh: innerHeight, ouvert: [...document.querySelectorAll('#calertes details.calertw')].every(d => d.open) }; })()")
    check('compo : toucher la puce descend à « À regarder », ouvert, sous la barre du haut', r['ouvert'] and r['haut'] >= r['tBas'] - 2 and r['haut'] < r['vh'] / 2, r)

    # ----- 3. le panneau d'un joueur : « Absent », sans quitter la compo -----
    ev('window.scrollTo(0, 0)'); pg.wait_for_timeout(300)
    j = ev("document.querySelector('.ccol:not(.banc) .cpj:not(.gone):not(.att)[data-id]').getAttribute('data-id')")
    pg.click('.ccol:not(.banc) .cpj[data-id="%s"]' % j); pg.wait_for_timeout(500)
    check('panneau : « Absent » pour un enfant présent, à côté de « Sa fiche »', pg.query_selector('.cselp [data-act="cAbsent"][data-v="0"]') is not None and pg.query_selector('.cselp [data-act="cAbsent"][data-v="1"]') is None)
    h = ev("Math.round(document.querySelector('.cselp [data-act=cAbsent]').getBoundingClientRect().height)")
    check('panneau : le bouton fait 44 px au moins', h >= 44, h)
    pg.click('.cselp [data-act="cAbsent"][data-v="0"]'); pg.wait_for_timeout(1200)
    r = ev("(id => { const e = MC.app.S.cache.compos.evenements.find(x => x.id === 'sp-demo-p3'); const c = document.querySelector('.ccol .cpj[data-id=\"' + id + '\"]'); return { present: MC.compos.presents(e).indexOf(id) >= 0, barre: !!(c && c.classList.contains('gone')), toast: (document.querySelector('.toast') || {}).innerText || '' }; })('%s')" % j)
    check('« Absent » : retiré des présents de l\'événement, barré dans la compo, un message le dit', not r['present'] and r['barre'] and 'absent' in r['toast'], r)
    if not pg.query_selector('.cselp'):
        pg.click('.ccol .cpj[data-id="%s"]' % j); pg.wait_for_timeout(500)
    check('panneau : pour un absent, « Présent »', pg.query_selector('.cselp [data-act="cAbsent"][data-v="1"]') is not None)
    pg.click('.cselp [data-act="cAbsent"][data-v="1"]'); pg.wait_for_timeout(1200)
    r = ev("(id => { const e = MC.app.S.cache.compos.evenements.find(x => x.id === 'sp-demo-p3'); const c = document.querySelector('.ccol .cpj[data-id=\"' + id + '\"]'); return { present: MC.compos.presents(e).indexOf(id) >= 0, barre: !!(c && c.classList.contains('gone')) }; })('%s')" % j)
    check('« Présent » : de nouveau présent, plus barré', r['present'] and not r['barre'], r)
    check('compo : pas de défilement de côté', noscroll())

    # ----- 4. côte à côte par défaut à partir de 900 px ; le choix fait sur l'appareil reste -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    cote = ev("document.querySelector('[data-act=cCote][data-v=\"1\"]') ? document.querySelector('[data-act=cCote][data-v=\"1\"]').classList.contains('on') : null")
    if cote is None:
        check('affichage : le choix « l\'une sous l\'autre / côte à côte » est là', False)
    else:
        check('affichage : côte à côte par défaut %s 900 px de large' % ('à partir de' if W >= 900 else 'pas sous'), cote == (W >= 900), cote)
        autre = '0' if W >= 900 else '1'
        pg.click('[data-act="cCote"][data-v="%s"]' % autre); pg.wait_for_timeout(400)
        pg.reload(); pg.wait_for_timeout(1500)
        on = ev("document.querySelector('[data-act=cCote][data-v=\"%s\"]').classList.contains('on')" % autre)
        check('affichage : le choix fait sur l\'appareil est gardé, même contre le défaut', on, on)
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
