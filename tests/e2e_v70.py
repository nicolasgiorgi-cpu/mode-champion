# (v70) Lot enfant E2 « confiance par défaut » (décision de Nicolas du 11/11 : « 25 % plus podium ») :
# un score compte tout de suite ; seuls les exploits (plus de 25 % de mieux d'un coup, ou une entrée sur le podium de sa ligue)
# attendent qu'un parent (ou l'éduc parent de l'enfant) les confirme ; la famille corrige un score d'un toucher (« Ce n'est pas ça »).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v70.py 390 844 · 1180 820 · 820 1180
import sys, os, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    db = lambda: ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables")
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
    def pad(code):
        for c in code: pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    def toast():
        pg.wait_for_selector('#toast:not([hidden])', timeout=4000)
        return pg.inner_text('#toast')
    def saisir(k, v):
        ev("([k, v]) => { const el = document.querySelector('[data-defi=\"' + k + '\"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }", [k, v])

    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350); pad('2580'); pg.wait_for_timeout(1300); modals()
    tom = ev('MC.app.S.me.joueur.id')

    # ----- l'enfant : un score qui compte tout de suite -----
    pg.goto(BASE + '#/defi/roc'); pg.wait_for_timeout(800); modals()
    check('défi : le texte dit que ça compte tout de suite', 'compte tout de suite' in pg.inner_text('main'), pg.inner_text('main')[:300])
    saisir('m', '0'); saisir('s', '5')
    pg.click('[data-act="sendDefi"]')
    t = toast(); check('défi normal : « ton résultat compte déjà »', 'compte déjà' in t, t)
    pg.wait_for_timeout(800)
    r = [x for x in db()['records'] if x['joueurId'] == tom and x['test'] == 'planche' and x['valeur'] == 5]
    check('défi normal : il compte (statut ok, sans témoin)', len(r) == 1 and r[0]['statut'] == 'ok' and not r[0].get('parQui') and not r[0].get('exploit'), r)

    # ----- l'enfant : un exploit (plus de 25 % de mieux que son record de tractions) -----
    best = ev("""Math.max(-1, ...MC.app.S.me.records.filter(r => r.test === 'tract' && r.statut === 'ok' && !(r.extra && r.extra.sm)).map(r => r.valeur))""")
    cible = 2 if best <= 0 else int(best * 1.3) + 2
    pg.goto(BASE + '#/defi/cros'); pg.wait_for_timeout(800); modals()
    saisir('v', str(cible)); pg.click('[data-act="sendDefi"]')
    t = toast(); check('exploit : « Exploit ! Un parent ou ton éduc doit le confirmer »', 'Exploit' in t and 'confirmer' in t, (t, best, cible))
    pg.wait_for_timeout(800)
    r = [x for x in db()['records'] if x['joueurId'] == tom and x['test'] == 'tract' and x['valeur'] == cible]
    check('exploit : en attente, marqué « bond »', len(r) == 1 and r[0]['statut'] == 'attente' and r[0].get('exploit') == 'bond', r)
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(900); modals()
    t = pg.inner_text('main')
    check('Records : l\'exploit à part, « un adulte doit le confirmer »', 'Exploit :' in t and 'un adulte doit le confirmer' in t, t[:400])
    check('Records : « ton bilan, quand tu veux » dit que les résultats arrivent tout de suite', 'Il confirme' not in t, t[-300:])
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(900); modals()
    t = pg.inner_text('main')
    check('Accueil : « 2 exploits attendent »', '2 exploits attendent' in t, t[:500])
    check('enfant : pas de défilement de côté', noscroll())
    pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(500); pg.click('[data-act="logoutKid"]'); pg.wait_for_timeout(500)

    # ----- le parent : les exploits à confirmer, les derniers scores corrigeables -----
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(600)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pad('1357'); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(900)
    sec = pg.query_selector('[data-cible="confirmer"]')
    st = sec.inner_text() if sec else ''
    check('parent : « 2 exploits à confirmer » en haut', sec is not None and '2 exploits à confirmer' in st.lower(), st[:200])
    check('parent : chaque exploit a son étiquette « Exploit »', pg.locator('[data-cible="confirmer"] .rexp').count() == 2)
    check('parent : « Confirmer » ou « Ce n\'est pas ça » (plus de « Refuser »)', 'Ce n\'est pas ça' in st and 'Refuser' not in st and pg.locator('[data-cible="confirmer"] [data-act="decide"][data-v="refuse"]').count() == 2, st[:400])
    sc = pg.query_selector('details[data-cible="scores"]')
    check('parent : « scores notés ces 14 jours », repliés', sc is not None and not ev("document.querySelector('details[data-cible=scores]').open") and 'comptent déjà' in sc.inner_text(), sc.inner_text()[:200] if sc else None)
    n_sc = pg.locator('details[data-cible="scores"] [data-act="pasCa"]').count()
    check('parent : un « Ce n\'est pas ça » par score (le défi de 5 s et le score de la veille)', n_sc >= 2, n_sc)
    pg.click('details[data-cible="scores"] > summary'); pg.wait_for_timeout(300)
    rid = pg.get_attribute('details[data-cible="scores"] [data-act="pasCa"] >> nth=0', 'data-id')
    pg.click('details[data-cible="scores"] [data-act="pasCa"] >> nth=0'); pg.wait_for_timeout(400)
    mt = pg.inner_text('.modal') if pg.query_selector('.modal') else ''
    check('« Ce n\'est pas ça » : une confirmation d\'abord', 'ne comptera plus' in mt, mt)
    pg.click('.modal button:has-text("Retirer ce score")'); pg.wait_for_timeout(1000)
    r = [x for x in db()['records'] if x['id'] == rid]
    check('« Ce n\'est pas ça » : le score ne compte plus (pas retenu par le parent)', r and r[0]['statut'] == 'refuse' and r[0]['parQui'] == 'Parent', r)
    t = pg.inner_text('main')
    check('… et il passe dans « pas retenus » (on peut le rétablir)', 'pas retenu' in t and pg.locator('details[data-cible="scores"] [data-act="pasCa"]').count() == n_sc - 1, t[:600])
    check('parent : pas de défilement de côté', noscroll())
    # le lien de l'alerte « ça compte déjà » : les scores ouverts
    pg.goto(BASE + '#/parent?k=' + tom + '&c=scores'); pg.wait_for_timeout(1500)
    check('lien d\'une alerte (c=scores) : les derniers scores dépliés', ev("!!(document.querySelector('details[data-cible=scores]') || {}).open"))
    # confirmer un exploit
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(900)
    eid = pg.get_attribute('[data-cible="confirmer"] [data-act="decide"][data-v="ok"] >> nth=0', 'data-id')
    pg.click('[data-cible="confirmer"] [data-act="decide"][data-v="ok"] >> nth=0'); pg.wait_for_timeout(200)
    pg.click('[data-act="decSend"] >> visible=true'); pg.wait_for_timeout(1200)
    r = [x for x in db()['records'] if x['id'] == eid]
    check('parent : un exploit confirmé compte (témoin : Parent)', r and r[0]['statut'] == 'ok' and r[0]['parQui'] == 'Parent', r)
    pg.goto(BASE + '#/parent/aide'); pg.wait_for_timeout(800)
    ev("document.querySelectorAll('details').forEach(d => d.open = true)")
    t = pg.inner_text('main')
    check('aide des parents : « Ce n\'est pas ça » et le seuil de 25 %', 'Ce n\'est pas ça' in t and '25 %' in t, t[:200])
    ev('MC.app.setAdult(null)')

    # ----- un éduc qui n'est pas son parent : il voit, sans corriger -----
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Cyril"]'); pg.wait_for_timeout(300); pad('7001'); pg.wait_for_timeout(1800); modals()
    pg.goto(BASE + '#/educ/joueur/' + tom + '?t=prepa'); pg.wait_for_timeout(1500); modals()
    t = pg.inner_text('main')
    check('éduc (pas son parent) : « 1 exploit attend la confirmation de sa famille »', '1 exploit attend la confirmation de sa famille' in t, t[:400])
    check('éduc (pas son parent) : pas de « Ce n\'est pas ça »', pg.locator('[data-act="pasCa"], [data-act="decide"]').count() == 0)
    check('éduc : « Records » (plus « Records confirmés »)', 'Records confirmés' not in t)
    check('éduc : pas de défilement de côté', noscroll())
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d · erreurs JS : %s' % (ok, len(res), errs))
sys.exit(0 if ok == len(res) and not errs else 1)
