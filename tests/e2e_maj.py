# (v51) Une nouvelle version en ligne : en revenant dans l'appli (ou en tirant pour actualiser), elle se recharge d'elle-même,
# au calme (pas de fenêtre ouverte, pas de saisie en cours, pas pendant une séance) ; sinon au prochain changement d'écran.
# Sur iPhone, revenir dans l'appli la reprenait telle quelle : Nicolas voyait encore la v49 (05/11).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_maj.py [largeur hauteur]
import sys, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
EN_LIGNE = {'v': None, 'n': 0}   # la version « en ligne » que voit la vérification (None : la vraie page)
def page_en_ligne(route, req):
    # seulement la lecture de la page par l'appli, jamais le chargement de la page elle-même (rechargement compris)
    if req.is_navigation_request() or EN_LIGNE['v'] is None: return route.continue_()
    EN_LIGNE['n'] += 1
    r = route.fetch(); html = r.text()
    route.fulfill(response=r, body=re.sub(r'\?v=\d+', '?v=%d' % EN_LIGNE['v'], html))
def marquer(pg): pg.evaluate('window.__avant = 1')
def recharge(pg): return pg.evaluate('window.__avant') is None
def revenir(pg):
    # l'appli revient au premier plan (sur iPhone : on la rouvre depuis l'écran d'accueil sans qu'elle ait été fermée)
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(1200)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route(re.compile(r'.*/index\.html(\?.*)?$'), page_en_ligne)
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    ici = pg.evaluate("Number(/v=(\\d+)/.exec(document.querySelector('link[href*=\"style.css\"]').getAttribute('href'))[1])")
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    pg.goto(BASE + '#/educ/plateaux'); pg.wait_for_timeout(900)
    check('éduc connecté, onglet Plateaux', '#/educ/plateaux' in pg.url, pg.url)
    # ----- 1. même version en ligne : rien ne se passe -----
    EN_LIGNE['v'] = ici; marquer(pg); revenir(pg)
    check('même version en ligne : la page lue, pas de rechargement', EN_LIGNE['n'] == 1 and not recharge(pg), EN_LIGNE)
    revenir(pg)
    check('au plus une lecture par minute en revenant', EN_LIGNE['n'] == 1, EN_LIGNE)
    # ----- 2. une nouvelle version, mais une fenêtre est ouverte : on attend -----
    EN_LIGNE['v'] = ici + 1
    pg.evaluate("void MC.ui.modal({ title: 'Essai', body: '<p>fenêtre</p>', actions: [{ label: 'Fermer', value: true, cls: 'btn' }] })"); pg.wait_for_timeout(300)
    pg.evaluate('void MC.app.verifierVersion(true)'); pg.wait_for_timeout(1200)
    check('nouvelle version, fenêtre ouverte : pas de rechargement', not recharge(pg) and pg.query_selector('.modal') is not None)
    pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(400)
    check('fenêtre fermée : toujours pas (on attend un changement d\'écran)', not recharge(pg))
    pg.click('#nav a[href="#/educ/entrainements"]'); pg.wait_for_timeout(2000)
    check('changement d\'écran : l\'appli se recharge, sur l\'écran demandé', recharge(pg) and '#/educ/entrainements' in pg.url, pg.url)
    check('toujours connecté après le rechargement', pg.query_selector('#adultzone') is None and pg.query_selector('#nav') is not None)
    # ----- 3. en revenant dans l'appli, au calme : rechargement tout de suite -----
    # (dans la démo, la page rechargée garde son numéro : on simule une version encore plus récente)
    EN_LIGNE['v'] = ici + 2; marquer(pg)
    pg.evaluate("sessionStorage.removeItem('mc-maj')")
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900); marquer(pg)
    revenir(pg); pg.wait_for_timeout(800)
    check('en revenant dans l\'appli : rechargée, même écran', recharge(pg) and '#/educ/progres' in pg.url, pg.url)
    # ----- 4. jamais deux fois de suite pour la même version (page rechargée encore ancienne : réseau lent) -----
    marquer(pg); pg.evaluate('void MC.app.verifierVersion(true)'); pg.wait_for_timeout(1200)
    check('même version déjà tentée : pas de 2e rechargement', not recharge(pg))
    # ----- 5. une saisie en cours : on attend -----
    EN_LIGNE['v'] = ici + 3; marquer(pg)
    pg.evaluate("(()=>{const i=document.createElement('input'); i.id='essai'; document.querySelector('main').appendChild(i); i.focus();})()")
    pg.evaluate('void MC.app.verifierVersion(true)'); pg.wait_for_timeout(1200)
    check('saisie en cours : pas de rechargement', not recharge(pg))
    # ----- 6. tirer pour actualiser : aussi l'appli -----
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    pg.evaluate('void MC.app.pullRefresh()'); pg.wait_for_timeout(1800)
    check('tirer pour actualiser : l\'appli se recharge', recharge(pg) and '#/educ/progres' in pg.url, pg.url)
    # ----- 6 bis. (relecture) un écran de saisie (les présents, pas encore enregistrés) : jamais, même en revenant -----
    EN_LIGNE['v'] = ici + 5
    pg.goto(BASE + '#/educ/evt/sp-demo-p3/presents'); pg.wait_for_timeout(1000)
    pg.click('main details > summary'); pg.wait_for_timeout(200)
    pg.locator('[data-act="prToggle"]').first.click(); pg.wait_for_timeout(300)
    marquer(pg); revenir(pg)
    check('présents cochés, pas enregistrés : en revenant, pas de rechargement', not recharge(pg) and pg.query_selector('[data-act="prSave"]') is not None)
    pg.click('#nav a[href="#/educ/plateaux"]'); pg.wait_for_timeout(2500)
    check('en arrivant sur un écran calme (Plateaux) : rechargée', recharge(pg) and '#/educ/plateaux' in pg.url, pg.url)
    # ----- 6 ter. (relecture) une mise à jour en attente, puis un toucher sur la fiche terrain : pas de rechargement avant l'envoi -----
    EN_LIGNE['v'] = ici + 6
    tid = pg.evaluate("MC.app.S.cache.group.joueurs.find(p=>p.joueur.prenom==='Tom').joueur.id")
    pg.goto(BASE + '#/educ/joueur/' + tid + '?t=terrain'); pg.wait_for_timeout(1500)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(300)
    pg.evaluate("void MC.ui.modal({ title: 'Essai', body: '<p>fenêtre</p>', actions: [{ label: 'Fermer', value: true, cls: 'btn' }] })"); pg.wait_for_timeout(300)
    pg.evaluate('void MC.app.verifierVersion(true)'); pg.wait_for_timeout(1200)
    pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(300); marquer(pg)
    niv = pg.evaluate("(document.querySelector('[data-act=\"tkNiv\"]:not(.on)')||{}).getAttribute ? document.querySelector('[data-act=\"tkNiv\"]:not(.on)').getAttribute('data-v') : ''")
    pg.click('[data-act="tkNiv"][data-v="%s"]' % niv); pg.wait_for_timeout(2500)
    srv = pg.evaluate("(id) => MC.api.call('group', { token: MC.app.S.adult.token }).then(g => (g.joueurs.find(p => p.joueur.id === id).terrain || {}).niveau || '')", tid)
    check('niveau touché sur la fiche : pas de rechargement, envoyé au serveur', not recharge(pg) and srv == niv, (niv, srv))
    # ----- 7. pendant une séance : jamais -----
    EN_LIGNE['v'] = ici + 7
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(2500)
    check('la mise à jour en attente : prise en arrivant sur Progrès', recharge(pg) and '#/educ/progres' in pg.url, pg.url)
    pg.click('.tb-pass') if pg.query_selector('.tb-pass') else None; pg.wait_for_timeout(1800)
    if '#/semaine' in pg.url:
        pg.goto(BASE + '#/go/cros'); pg.wait_for_timeout(1200); marquer(pg)
        on_go = '#/go/' in pg.url
        pg.evaluate('void MC.app.verifierVersion(true)'); pg.wait_for_timeout(1200)
        check('pendant une séance : pas de rechargement', on_go and not recharge(pg), pg.url)
    else:
        check('espace de l\'enfant ouvert pour la séance', False, pg.url)
    b.close()
print('ERREURS JS:', errs)
bad = [n for n, c in res if not c]
print('%d/%d OK' % (len(res) - len(bad), len(res)), 'ÉCHECS:', bad)
sys.exit(1 if bad or errs else 0)
