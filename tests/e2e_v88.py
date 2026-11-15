# (v88) Demandes de Nicolas du 15/11/2026, côté éducs :
# - « quand on a deux équipes côte à côte sur la compo, il faut que le début des lignes de postes soient alignés en hauteur. Qu'on
#   puisse voir facilement mes piliers en face les uns des autres, les talonneurs etc. » ;
# - « Les événements annulés il faut aussi pouvoir les supprimer par un glisser vers la gauche ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v88.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v88-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    cdp = ctx.new_cdp_session(pg)
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    shot = lambda n: pg.screenshot(path=OUT + tag + '-' + n + '.png')
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

    # ----- 1. la compo d'un plateau au jeu à 10, équipes côte à côte : les postes en face -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    if pg.query_selector('.ctop [data-act="cDiscard"]'):
        pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    MESURE = """(() => {
      const cols = [...document.querySelectorAll('.cboard2 .ccol:not(.banc)')].filter(c => c.offsetParent);
      const rangs = {}; cols.forEach(c => { const y = Math.round(c.getBoundingClientRect().top + scrollY); (rangs[y] = rangs[y] || []).push(c); });
      const out = { rangees: 0, ecarts: [], postes: 0, vides: 0, alignees: document.querySelectorAll('.ccol.aligne').length };
      Object.values(rangs).filter(r => r.length > 1).forEach(r => {
        out.rangees++;
        ['csech-Avants', 'csech-Arrières', 'pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'arriere'].forEach(k => {
          const els = r.map(c => k.startsWith('csech-') ? [...c.querySelectorAll('.csech')].find(e => e.textContent.startsWith(k.slice(6))) : c.querySelector('.cgrp[data-p="' + k + '"]'));
          if (els.some(e => !e || !e.offsetParent)) { out.ecarts.push(k + ' absent'); return; }
          const tops = els.map(e => e.getBoundingClientRect().top); out.postes++;
          if (Math.max(...tops) - Math.min(...tops) > 1) out.ecarts.push(k + ' ' + tops.map(Math.round).join('/'));
        });
      });
      out.decales = [...document.querySelectorAll('.cboard2 .cgrp, .cboard2 .csech')].filter(e => e.style.marginTop).length;
      out.vides = [...document.querySelectorAll('.cgrp.vide')].filter(e => e.offsetParent).length;
      return out; })()"""
    def cote(on):
        ev('MC.app.lsSet ? MC.app.lsSet("mc-ccote", %d) : localStorage.setItem("mc-ccote", "%d")' % (on, on)); pg.reload(); pg.wait_for_timeout(1500)
    if W >= 900:
        m = ev(MESURE)
        check('côte à côte (par défaut sur iPad paysage) : chaque poste en face du même poste de l\'autre équipe', m['rangees'] >= 1 and not m['ecarts'] and m['postes'] >= 10, m)
        shot('aligne')
        # un joueur touché (le panneau s'ouvre, l'écran se redessine) : toujours en face
        pg.click('.cboard2 .cpj[data-v="0"] >> nth=0'); pg.wait_for_timeout(600)
        m = ev(MESURE)
        check('après avoir touché un joueur : toujours alignés', m['rangees'] >= 1 and not m['ecarts'], m)
        if pg.query_selector('.cdock [data-act="cSelClose"], .cdock .cselh button'):
            pg.click('.cdock .cselh button'); pg.wait_for_timeout(400)
    else:
        m = ev(MESURE)
        check('une équipe sous l\'autre : rien à aligner, pas de poste vide affiché', m['rangees'] == 0 and m['alignees'] == 0 and m['vides'] == 0, m)
        shot('pile')
    if W < 900 and W >= 700:
        # l'iPad en portrait : côte à côte si on le choisit
        b2 = pg.query_selector('[data-act="cCote"][data-v="1"]')
        if b2:
            b2.click(); pg.wait_for_timeout(1000)
            m = ev(MESURE)
            if m['rangees']:
                check('iPad portrait, côte à côte choisi : les postes en face', not m['ecarts'], m)
                shot('aligne-portrait')
    # la fenêtre change de taille (iPad qu'on tourne) : on réaligne
    if W >= 900:
        pg.set_viewport_size({'width': 1366, 'height': 1024}); pg.wait_for_timeout(800)
        m = ev(MESURE)
        check('l\'iPad grandit (1366) : toujours en face', m['rangees'] >= 1 and not m['ecarts'], m)
        pg.set_viewport_size({'width': W, 'height': H}); pg.wait_for_timeout(800)
    check('compo : pas de défilement de côté', noscroll())
    # (relecture) au jeu à 5 (un plateau joué) et aux ateliers : rien n'est décalé (pas de trou sous une équipe courte)
    for ev_id in ['sp-demo-p2', 'sp-demo-e0']:
        pg.goto(BASE + '#/educ/compo/' + ev_id); pg.wait_for_timeout(1300)
        n = ev("[...document.querySelectorAll('.cboard2 .csech, .cboard2 .cgrp')].filter(e => e.style.marginTop).length")
        check('pas de jeu à 10 (%s) : rien n\'est décalé' % ev_id, n == 0, n)

    # ----- 2. un événement annulé : glisser sa ligne vers la gauche, « Effacer » -----
    def touche(typ, x=None, y=None):
        pts = [] if x is None else [{'x': x, 'y': y, 'id': 1, 'radiusX': 4, 'radiusY': 4, 'force': 1}]
        cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': pts})
    LI = '.cswipe:has(.t1:text("Revel"))'
    def boite():
        el = pg.query_selector(LI + ' > .cev'); el.scroll_into_view_if_needed(); pg.wait_for_timeout(150); return el.bounding_box()
    def doigt(dx, dy=0, pas=10):
        bb = boite(); x0, y0 = bb['x'] + bb['width'] * 0.75, bb['y'] + bb['height'] * 0.5
        touche('touchStart', x0, y0); pg.wait_for_timeout(40)
        for i in range(1, pas + 1): touche('touchMove', x0 + dx * i / pas, y0 + dy * i / pas); pg.wait_for_timeout(16)
        touche('touchEnd'); pg.wait_for_timeout(450)
    etat = lambda: ev("""(() => { const li = document.querySelector('.cswipe .cev') && [...document.querySelectorAll('.cswipe')].find(l => /Revel/.test(l.textContent)); if (!li) return null;
      const a = li.querySelector('.cev'), b = li.querySelector('.cswipe-del'), ra = a.getBoundingClientRect(), rl = li.getBoundingClientRect();
      return { ouvert: li.classList.contains('sw'), decale: Math.round(rl.right - ra.right), bouton: getComputedStyle(b).visibility, hash: location.hash }; })()""")
    pg.goto(BASE + '#/educ/plateaux'); pg.wait_for_timeout(1300)
    e0 = etat()
    check('Plateaux : le plateau annulé est dans la liste, marqué « Annulé », bouton caché', e0 and not e0['ouvert'] and e0['bouton'] == 'hidden' and 'annulé' in pg.inner_text(LI).lower(), e0)
    check('une ligne pas annulée ne se glisse pas (pas de bouton « Effacer »)', ev("document.querySelectorAll('.cswipe-del').length") == 1)
    if W >= 900:
        bb = boite(); x0, y0 = bb['x'] + bb['width'] * 0.75, bb['y'] + bb['height'] * 0.5
        pg.mouse.move(x0, y0); pg.mouse.down()
        for i in range(1, 11): pg.mouse.move(x0 - 15 * i, y0); pg.wait_for_timeout(16)
        pg.mouse.up(); pg.wait_for_timeout(450)
        e1 = etat()
        check('à la souris : glisser vers la gauche ouvre « Effacer », sans ouvrir l\'événement', e1['ouvert'] and e1['decale'] == 92 and e1['bouton'] == 'visible' and e1['hash'].endswith('/plateaux'), e1)
        pg.click(LI + ' > .cev'); pg.wait_for_timeout(450)
        e1 = etat()
        check('un clic sur la ligne ouverte la referme (on reste sur la liste)', not e1['ouvert'] and e1['decale'] == 0 and e1['hash'].endswith('/plateaux'), e1)
    doigt(-30)
    e1 = etat()
    check('au doigt, un petit glisser : la ligne revient', not e1['ouvert'] and e1['decale'] == 0 and e1['hash'].endswith('/plateaux'), e1)
    doigt(-8, 120)
    e1 = etat()
    check('au doigt, de haut en bas : rien ne s\'ouvre (la page défile)', not e1['ouvert'] and e1['decale'] == 0, e1)
    doigt(-160)
    e1 = etat()
    check('au doigt, glisser vers la gauche : « Effacer » apparaît, l\'événement ne s\'ouvre pas', e1['ouvert'] and e1['decale'] == 92 and e1['bouton'] == 'visible' and e1['hash'].endswith('/plateaux'), e1)
    shot('glisse')
    doigt(140)
    e1 = etat()
    check('glisser vers la droite : la ligne se referme', not e1['ouvert'] and e1['decale'] == 0, e1)
    doigt(-160)
    pg.click(LI + ' .cswipe-del'); pg.wait_for_timeout(500)
    mt = (pg.text_content('.modal') or '').lower() if pg.query_selector('.modal') else ''
    check('« Effacer » demande confirmation', 'supprimer l\'événement' in mt and 'annulé' in mt, mt)
    pg.click('.modal button[data-i="1"]'); pg.wait_for_timeout(500)
    e1 = etat()
    check('« Annuler » : l\'événement reste, la ligne se referme', e1 and not e1['ouvert'], e1)
    # la page de l'événement annulé : aussi un lien « Supprimer cet événement »
    pg.goto(BASE + '#/educ/evt/sp-demo-p5'); pg.wait_for_timeout(1100)
    check('page d\'un événement annulé : « Annulé dans Spond » et « Supprimer cet événement »', pg.query_selector('[data-act="eDel"]') is not None and 'Annulé dans Spond' in pg.inner_text('main'))
    pg.goto(BASE + '#/educ/plateaux'); pg.wait_for_timeout(1200)
    n0 = ev("document.querySelectorAll('.list > li').length")
    doigt(-160)
    pg.click(LI + ' .cswipe-del'); pg.wait_for_timeout(500)
    pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1500)
    check('confirmé : le plateau annulé disparaît de la liste', etat() is None and ev("document.querySelectorAll('.list > li').length") == n0 - 1, [etat(), n0])
    pg.reload(); pg.wait_for_timeout(1500)
    check('toujours parti après avoir rechargé', etat() is None and 'Revel' not in pg.inner_text('main'))
    check('liste : pas de défilement de côté', noscroll())

    check('aucune erreur de page', not errs, errs[:3])
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d OK' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad else 0)
