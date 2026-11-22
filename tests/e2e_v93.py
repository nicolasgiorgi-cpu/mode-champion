# (v93) Les animations des exercices sans traînée : plus aucun filtre de flou sur le bonhomme (dans Safari, iPhone et
# iPad, le halo d'un trait qui bouge sous un filtre n'était pas effacé et laissait une traînée derrière les bras et les
# jambes). Le halo est dessiné par 4 copies plus larges et translucides de chaque partie du corps, qui le suivent.
# Vérifié dans les écrans qui montrent des animations : fiche d'un exercice (grande démo + niveaux), échauffement
# (petites animations en liste), « Je tente ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v93.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
ETAT = """() => [...document.querySelectorAll('[data-anim] > svg')].map(svg => {
  const fig = svg.querySelector('g.mc-fig'), halos = [...svg.querySelectorAll('g.mc-halo')];
  const geo = el => el.tagName === 'circle' ? el.getAttribute('cx') + ',' + el.getAttribute('cy') : el.getAttribute('d');
  return {
    anim: svg.parentNode.getAttribute('data-anim'),
    filtres: svg.querySelectorAll('filter, feGaussianBlur, [filter]').length,
    filtreCss: [...svg.querySelectorAll('*')].concat([svg]).filter(e => getComputedStyle(e).filter !== 'none').length,
    halos: halos.length,
    dessous: !!fig && halos.every(h => h.parentNode === fig.parentNode && h.compareDocumentPosition(fig) === Node.DOCUMENT_POSITION_FOLLOWING),
    suit: !!fig && halos.every(h => h.children.length === fig.children.length && [...fig.children].every((p, i) => geo(h.children[i]) === geo(p))),
    tete: fig ? Number(fig.querySelector('circle').getAttribute('cx')) + ',' + Number(fig.querySelector('circle').getAttribute('cy')) : null,
    jambe: fig ? fig.children[4].getAttribute('d') : null
  };
})"""
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

    def ecran(nom, route, avant=None, mini=1):
        pg.goto(BASE + route); pg.wait_for_timeout(900)
        if avant: pg.click(avant); pg.wait_for_timeout(900)
        A = ev(ETAT)
        check(nom + ' : des animations à l\'écran (%d)' % len(A), len(A) >= mini, A)
        if not A: return
        check(nom + ' : aucun filtre (ni SVG ni CSS) sur les animations', all(a['filtres'] == 0 and a['filtreCss'] == 0 for a in A), [(a['anim'], a['filtres'], a['filtreCss']) for a in A])
        check(nom + ' : 4 anneaux de halo, sous le bonhomme', all(a['halos'] == 4 and a['dessous'] for a in A), [(a['anim'], a['halos'], a['dessous']) for a in A])
        check(nom + ' : le halo a la forme exacte du bonhomme', all(a['suit'] for a in A), [a['anim'] for a in A if not a['suit']])
        pg.wait_for_timeout(700); B = ev(ETAT)
        bouge = [a['anim'] for a, c in zip(A, B) if a['tete'] != c['tete'] or a['jambe'] != c['jambe']]
        check(nom + ' : elles bougent', len(bouge) >= 1, A[0]['anim'])
        check(nom + ' : … et le halo suit toujours (image suivante)', all(c['suit'] for c in B), [c['anim'] for c in B if not c['suit']])

    ecran('Fiche des pompes', '#/exo/pompes', mini=2)
    ecran('Échauffement', '#/echauffement', mini=3)
    ecran('Je tente · navette', '#/tente/navette', avant='[data-act="tnChaud"]')
    check('Pas de défilement de côté', ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
