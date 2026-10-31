# (v33) La cloche des notifications : dans la barre du haut (éduc, parent, enfant), la pastille, la liste, « lu »,
# les réglages (éteindre une sorte), les liens vers les bons écrans, et les entrées dans Réglages / Plus / l'engrenage.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_notifs.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def nb(pg):
    el = pg.query_selector('.topbar [data-cloche] .tb-nb')
    return el.inner_text() if el else ''
def sans_debord(pg): return pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    # (v35) la pastille sur l'icône de l'appli : on note les appels (le navigateur de test n'a pas d'icône)
    pg.add_init_script("window.__badge = []; navigator.setAppBadge = function (n) { __badge.push(n); return Promise.resolve(); }; navigator.clearAppBadge = function () { __badge.push(0); return Promise.resolve(); };")
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    # ----- l'éduc -----
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1800)
    for h in ('#/educ/entrainements', '#/educ/plateaux', '#/educ/progres', '#/educ/joueurs', '#/educ/reglages'):
        pg.goto(BASE + h); pg.wait_for_timeout(900)
        check('éduc : la cloche en haut de ' + h, pg.query_selector('.topbar [data-cloche]') is not None)
    check('éduc : 1re fois, rien de « nouveau » (pas d\'avalanche)', nb(pg) == '', nb(pg))
    check('engrenage : « Mes notifications »', pg.query_selector('a[href="#/educ/notifs/reglages"]') is not None)
    # un enfant fait une séance (Tom, l'enfant de Coach Nico en démo) : passer le téléphone, noter une séance, revenir
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    check('▶ Tom : son espace', '#/semaine' in pg.url, pg.url)
    check('enfant : la cloche aussi', pg.query_selector('.topbar [data-cloche]') is not None)
    pg.evaluate("MC.app.kidCall('logSession', { type: 'club', date: MC.logic.today(), mode: 'rapide' })"); pg.wait_for_timeout(600)
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900); pin(pg, codes['educ']); pg.wait_for_timeout(1800)
    pg.evaluate("MC.loadGroup(true)"); pg.wait_for_timeout(900); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1000)
    check('éduc : la séance de Tom allume la cloche (1)', nb(pg) == '1', nb(pg))
    check('pastille sur l\'icône de l\'appli : 1', pg.evaluate('window.__badge[window.__badge.length - 1]') == 1, pg.evaluate('window.__badge'))
    check('… et le même nombre gardé pour les alertes à venir (cache « pastille »)', pg.evaluate("caches.open('pastille').then(c => c.match(location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + '__pastille')).then(r => r ? r.text() : null)") == '1')
    pg.click('.topbar [data-cloche]'); pg.wait_for_timeout(1500)
    check('la cloche ouvre la liste', '#/educ/notifs' in pg.url, pg.url)
    check('liste lue : plus de pastille sur l\'icône', pg.evaluate('window.__badge[window.__badge.length - 1]') == 0, pg.evaluate('window.__badge'))
    first = pg.query_selector('.ntl .nt.new')
    check('en haut, en nouveau : « Tom a fait … »', first is not None and 'Tom' in first.inner_text() and 'entraînement au club' in first.inner_text(), first.inner_text() if first else '')
    check('pas de cloche sur l\'écran de la liste', pg.query_selector('.topbar [data-cloche]') is None)
    check('liste : pas de défilement de côté', sans_debord(pg))
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900)
    check('après la visite : plus de pastille', nb(pg) == '', nb(pg))
    pg.goto(BASE + '#/educ/notifs'); pg.wait_for_timeout(1200)
    check('après la visite : la séance est dans « Déjà vu »', pg.query_selector('.ntl .nt.new') is None and 'Tom' in pg.inner_text('.ntl'))
    pg.click('.ntl .nt >> nth=0'); pg.wait_for_timeout(1300)
    check('toucher une ligne : le bon écran (la fiche de Tom, Prépa)', '#/educ/joueur/' in pg.url and 't=prepa' in pg.url, pg.url)
    # réglages : éteindre les séances
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    sw = pg.query_selector('[data-act="ntToggle"][data-c="seance"]')
    check('réglages : un interrupteur par sorte (6 pour les éducs)', pg.evaluate("document.querySelectorAll('[data-act=ntToggle]').length") == 6)
    check('réglages : pas de défilement de côté', sans_debord(pg))
    sw.click(); pg.wait_for_timeout(300)
    check('éteindre « Séances des enfants »', sw.get_attribute('aria-checked') == 'false')
    pg.goto(BASE + '#/educ/notifs'); pg.wait_for_timeout(1200)
    check('séances éteintes : plus dans la liste', 'entraînement au club' not in (pg.inner_text('main') or ''))
    check('la liste dit qu\'une sorte est éteinte', 'éteinte' in pg.inner_text('main'))
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(900); pg.click('[data-act="ntToggle"][data-c="seance"]'); pg.wait_for_timeout(300)
    # ----- le parent de Tom -----
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1800)
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(1000)
    check('parent : la cloche', pg.query_selector('.topbar [data-cloche]') is not None)
    check('parent : 1re fois, rien de nouveau', nb(pg) == '', nb(pg))
    pg.goto(BASE + '#/parent/plus'); pg.wait_for_timeout(900)
    check('Plus : « Mes notifications »', pg.query_selector('a[href="#/parent/notifs/reglages"]') is not None)
    pg.goto(BASE + '#/parent/notifs/reglages'); pg.wait_for_timeout(900)
    check('parent (V1) : 4 sortes (rien des parties fermées)', pg.evaluate("document.querySelectorAll('[data-act=ntToggle]').length") == 4)
    tom = pg.evaluate("MC.app.S.cache.family.enfants[0].joueur.id")
    pg.goto(BASE + '#/parent?k=' + tom); pg.wait_for_timeout(1000)
    check('un lien de notification (?k=) : l\'adresse redevient #/parent', pg.url.endswith('#/parent'), pg.url)
    # Tom note un défi, le parent le voit, le confirme ; Tom le voit dans sa cloche
    pg.evaluate("""() => MC.api.call('submitRecords', { token: MC.app.S.kid.token, bilan: 'defi', valeurs: [{ test: 'saut', valeur: 150 }] })"""); pg.wait_for_timeout(600)
    pg.evaluate("MC.app.S.cache.family = null; MC.app.lsSet('mc-fam', null)"); pg.goto(BASE + '#/parent/classement'); pg.wait_for_timeout(1500)
    check('parent : le défi de Tom allume la cloche', nb(pg) == '1', nb(pg))
    pg.goto(BASE + '#/parent/notifs'); pg.wait_for_timeout(1300)
    t = pg.inner_text('.ntl') if pg.query_selector('.ntl') else ''
    check('parent : « Tom a relevé un défi : Saut » à confirmer', 'défi' in t and 'Saut' in t and 'confirmer' in t.lower(), t[:120])
    check('liste parent : pas de défilement de côté', sans_debord(pg))
    rid = pg.evaluate("MC.app.S.cache.family.enfants[0].records.filter(r => r.statut === 'attente').map(r => r.id)")
    # le temps passe (plus de 3 min depuis la 1re cloche de Tom sur cet appareil : ce qui arrive ensuite est « nouveau »)
    pg.evaluate("Object.keys(localStorage).filter(k => k.indexOf('mc-notif:k:') === 0).forEach(k => { var s = JSON.parse(localStorage.getItem(k)); s.init -= 600000; localStorage.setItem(k, JSON.stringify(s)); })")
    pg.evaluate("ids => MC.api.call('confirm', { token: MC.app.S.adult.token, decisions: ids.map(id => ({ id: id, statut: 'ok' })) })", rid); pg.wait_for_timeout(600)
    # ----- Tom -----
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(900); pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    pg.evaluate("MC.app.loadMe(true)"); pg.wait_for_timeout(900); pg.goto(BASE + '#/profil'); pg.wait_for_timeout(1000)
    n_att = len(rid)   # Tom avait déjà un défi à confirmer en démo : le parent a tout confirmé
    check('enfant : ses défis confirmés allument sa cloche', nb(pg) == str(n_att), (nb(pg), n_att))
    pg.click('.topbar [data-cloche]'); pg.wait_for_timeout(1300)
    t = ' | '.join(pg.eval_on_selector_all('.ntl .nt.new', 'l => l.map(x => x.innerText)'))
    check('enfant : « Ton défi Saut est confirmé par ta famille »', 'Saut' in t and 'confirmé' in t and 'famille' in t, t)
    check('liste enfant : pas de défilement de côté', sans_debord(pg))
    pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(900)
    check('Réglages enfant : « Mes notifications »', pg.query_selector('a[href="#/notifs/reglages"]') is not None)
    pg.goto(BASE + '#/notifs/reglages'); pg.wait_for_timeout(900)
    check('enfant (V1) : 3 sortes', pg.evaluate("document.querySelectorAll('[data-act=ntToggle]').length") == 3)
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad or errs else 0)
