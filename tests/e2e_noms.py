# v40 : les homonymes sur l'écran de connexion (sans code) ont les premières lettres de leur nom, sur 2 lignes au besoin
# (jamais coupés en « ALEXANDRE D… »), et le nom entier une fois connecté (espace éduc). Noms fictifs.
# Lancer : sh tests/mkdemo.sh puis python3 tests/e2e_noms.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
OK, BAD = [], []
def check(name, cond, info=''):
    (OK if cond else BAD).append(name)
    print('OK ' if cond else 'BAD', name, '' if cond else info)
def noscroll(pg): return pg.evaluate('document.scrollingElement.scrollWidth <= innerWidth + 1')

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(1000)
    # deux enfants de la démo deviennent des homonymes reliés à Spond (prénom et nom repris de Spond)
    pg.evaluate("""(() => { const K = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), db = JSON.parse(localStorage.getItem(K));
      const js = db.tables ? db.tables.joueurs : db.joueurs, a = js.find(j => j.prenom === 'Inès'), c = js.find(j => j.prenom === 'Léo');
      Object.assign(a, { prenom: 'Alexandre Dupuis-Lefèvre', prenomUsuel: 'Alexandre', nom: 'Dupuis-Lefèvre' });
      Object.assign(c, { prenom: 'Alexandre Durand', prenomUsuel: 'Alexandre', nom: 'Durand' });
      localStorage.setItem(K, JSON.stringify(db)); localStorage.removeItem('mc-roster'); })()""")
    pg.goto(BASE + '#/connexion'); pg.reload(); pg.wait_for_timeout(1500)
    noms = pg.evaluate("[...document.querySelectorAll('.kidbtn .nm')].map(e => e.textContent)")
    check('connexion : les premières lettres du nom', 'Alexandre Dup.' in noms and 'Alexandre Dur.' in noms, noms)
    check('connexion : jamais le nom entier sans code', not any('Durand' in n or 'Lefèvre' in n for n in noms), noms)
    rognes = pg.evaluate("[...document.querySelectorAll('.kidbtn .nm')].filter(e => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)")
    check('connexion : aucun nom coupé', rognes == [], rognes)
    h = pg.evaluate("(() => { const e = [...document.querySelectorAll('.kidbtn .nm')].find(x => x.textContent === 'Alexandre Dup.'); return e ? Math.round(e.getBoundingClientRect().height) : 0; })()")
    check('connexion : sur 2 lignes au plus', 0 < h <= 30, h)
    check('connexion : pas de défilement horizontal', noscroll(pg))
    pg.screenshot(path='/tmp/compos-shots/%dx%d-connexion-homonymes.png' % (W, H))
    # une fois connecté (éduc) : le nom entier
    pg.evaluate("MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash='#/educ/joueurs'})"); pg.wait_for_timeout(1800)
    t = pg.inner_text('main')
    check('éduc : le nom entier', 'ALEXANDRE DUPUIS-LEFÈVRE' in t.upper() and 'ALEXANDRE DURAND' in t.upper(), t[:300])
    check('éduc : pas de défilement horizontal', noscroll(pg))
    print('ERREURS JS:', errs[:3])
    print('%d/%d OK' % (len(OK), len(OK) + len(BAD)), 'ÉCHECS:', BAD)
    b.close()
