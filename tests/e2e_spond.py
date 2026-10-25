# Spond dans l'appli (mode démo) : l'écran Outils › Spond (formulaire, explication du mode démo),
# et « Depuis Spond » sur l'écran Ajouter un joueur (enfants Spond pas encore dans l'appli).
# Lancer : sh tests/mkdemo.sh puis python3 tests/e2e_spond.py [largeur hauteur]
import sys, json
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
    pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(800)
    pg.evaluate("MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash='#/educ/outils'})"); pg.wait_for_timeout(1500)
    check('Outils : lien Spond', pg.query_selector('a[href="#/educ/spond"]') is not None)
    pg.click('a[href="#/educ/spond"]'); pg.wait_for_timeout(900)
    t = pg.inner_text('main')
    check('Spond : formulaire e-mail et mot de passe', pg.query_selector('#sp-e[type="email"]') is not None and pg.query_selector('#sp-p[type="password"]') is not None)
    check('Spond : le mode démo est expliqué', 'Mode démo' in t and pg.query_selector('[data-spgo][disabled]') is not None, t[:200])
    check('Spond : pas branché', 'pas branché' in t)
    check('Spond : barre du haut avec Retour', pg.query_selector('header.topbar [data-back]') is not None)
    check('Spond : pas de défilement horizontal', noscroll(pg))
    pg.screenshot(path='/tmp/compos-shots/%dx%d-spond.png' % (W, H), full_page=True)
    # des enfants Spond (catégorie M12) pas encore dans l'appli : comme après une synchro
    pg.evaluate("""(() => { const db = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.indexOf('mc-demo-')===0)));
      db.props.spondMembres = JSON.stringify([{ id: 'sp-k1', nom: 'Sam N.', prenom: 'Sam', nomFamille: 'Neuf', categorie: 'M12' }, { id: 'sp-k2', nom: 'Tom Z.', prenom: 'Tom', nomFamille: 'Zèbre', categorie: 'M12' }, { id: 'sp-k3', nom: 'Ali B.', prenom: 'Ali', nomFamille: 'Bel', categorie: 'M12' }]);
      localStorage.setItem('mc-demo-v9', JSON.stringify(db)); localStorage.removeItem('mc-compos'); })()""")
    pg.goto(BASE + '#/educ/spond'); pg.reload(); pg.wait_for_timeout(1500)
    check('Spond : « 3 enfants de Spond pas encore dans l\'appli »', '3 enfants de Spond' in pg.inner_text('main'))
    pg.goto(BASE + '#/educ/ajouter'); pg.wait_for_timeout(1000)
    check('Ajouter : « Depuis Spond (3) »', 'DEPUIS SPOND (3)' in pg.inner_text('main').upper())
    check('Ajouter : pas de défilement horizontal', noscroll(pg))
    pg.screenshot(path='/tmp/compos-shots/%dx%d-ajouter-spond.png' % (W, H), full_page=True)
    pg.click('[data-act="spAdd"][data-id="sp-k1"]'); pg.wait_for_timeout(900)
    check('Ajouter depuis Spond : le code provisoire s\'affiche', pg.query_selector('.modal .codebig') is not None and 'RELIÉ À SPOND' in pg.inner_text('.modal').upper())
    pg.click('.modal button[data-i="1"]'); pg.wait_for_timeout(1200)
    sam = pg.evaluate("MC.loadGroup().then(g => { const p = g.joueurs.find(x => x.joueur.prenom === 'Sam'); return p ? (p.terrain || {}).spondId : null; })")
    check('Sam ajouté et relié à Spond', sam == 'sp-k1', sam)
    check('Ajouter : il en reste 2', 'DEPUIS SPOND (2)' in pg.inner_text('main').upper())
    pg.click('[data-act="spAddAll"]'); pg.wait_for_timeout(1500)
    md = pg.inner_text('.modal') if pg.query_selector('.modal') else ''
    check('Tout ajouter : la liste des codes', '2 JOUEURS AJOUTÉS' in md.upper() and 'Tom Z.' in md and 'Ali' in md, md[:200])
    pg.click('.modal button[data-i="1"]'); pg.wait_for_timeout(1200)
    check('Ajouter : plus personne à ajouter depuis Spond', 'DEPUIS SPOND' not in pg.inner_text('main').upper())
    fam = pg.evaluate("MC.loadGroup().then(g => g.familles.map(f => f.nom))")
    check('familles reprises de Spond', 'Famille Neuf' in fam and 'Famille Zèbre' in fam, fam)
    print('ERREURS JS:', errs[:3])
    print('%d/%d OK' % (len(OK), len(OK) + len(BAD)), 'ÉCHECS:', BAD)
    b.close()
