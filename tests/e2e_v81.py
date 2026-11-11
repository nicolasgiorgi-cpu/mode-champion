# (v81) « C'est bon » sur les derniers scores d'un enfant (côté parent) : à côté de « Ce n'est pas ça », un toucher range les
# scores vus (sur cet appareil) et lit leurs lignes de la cloche ; un score noté ensuite revient seul.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v81.py 390 844 · 1180 820 · 820 1180
import sys, os
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
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
    def pad(code):
        for c in code: pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    def saisir(k, v):
        ev("([k, v]) => { const el = document.querySelector('[data-defi=\"' + k + '\"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }", [k, v])
    def enfant_score(badge, champs):
        pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(500)
        if pg.query_selector('.kidbtn:has-text("TOM")') is None: pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(400)
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350); pad('2580'); pg.wait_for_timeout(1300); modals()
        pg.goto(BASE + '#/defi/' + badge); pg.wait_for_timeout(800); modals()
        for k, v in champs: saisir(k, v)
        pg.click('[data-act="sendDefi"]'); pg.wait_for_timeout(1500); modals()
        pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(500); pg.click('[data-act="logoutKid"]'); pg.wait_for_timeout(500)
    def parent():
        pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(600)
        if pg.query_selector('[data-act="adultPick"][data-nom="Tom"]'):
            pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pad('1357'); pg.wait_for_timeout(1500); modals()
        pg.goto(BASE + '#/parent'); pg.wait_for_timeout(1000); modals()

    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    enfant_score('roc', [('m', '0'), ('s', '5')])
    parent()
    sc = pg.query_selector('details[data-cible="scores"]')
    n0 = pg.locator('details[data-cible="scores"] [data-act="pasCa"]').count()
    check('parent : « scores notés ces 14 jours », avec « C\'est bon »', sc is not None and n0 >= 1 and 'C\'est bon' in sc.inner_text(), sc.inner_text()[:300] if sc else None)
    pg.click('details[data-cible="scores"] > summary'); pg.wait_for_timeout(300)
    ok = pg.query_selector('details[data-cible="scores"] [data-act="scoresOk"]')
    ids = (ok.get_attribute('data-ids') or '').split(',') if ok else []
    check('… le bouton connaît les lignes de la cloche de ces scores', len(ids) >= 1 and all(x.startswith('r:') or x.startswith('b:') for x in ids), ids)
    check('… pas de défilement de côté', noscroll())
    ok.click(); pg.wait_for_timeout(800)
    check('« C\'est bon » : le bloc des derniers scores disparaît', pg.query_selector('details[data-cible="scores"]') is None, pg.inner_text('main')[:400])
    fam = ev("(MC.app.S.cache.family && MC.app.S.cache.family.famille || {}).id")
    lus = ev("k => { try { return Object.keys((JSON.parse(localStorage.getItem(k)) || {}).lus || {}); } catch (e) { return []; } }", 'mc-notif:f:' + str(fam))
    check('… et leurs lignes de la cloche sont lues', all(x in lus for x in ids), (ids, lus))
    pg.reload(); pg.wait_for_timeout(1500); modals()
    check('… même après avoir rouvert l\'appli', pg.query_selector('details[data-cible="scores"]') is None)
    # un score noté ensuite revient, seul (ajouté dans la démo, comme si l'enfant venait de le noter)
    ev("""() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k));
        const tom = D.tables.joueurs.find(j => j.prenom === 'Tom').id, now = new Date();
        D.tables.records.push({ id: 'v81-n', joueurId: tom, bilan: 'defi', test: 'susp', valeur: 7, extra: null, statut: 'ok', parQui: '', date: now.toISOString().slice(0, 10), cree: new Date(now.getTime() + 60000).toISOString(), exploit: '' });
        localStorage.setItem(k, JSON.stringify(D)); }""")
    pg.reload(); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(1200); modals()
    n1 = pg.locator('details[data-cible="scores"] [data-act="pasCa"]').count()
    check('un nouveau score : le bloc revient, avec ce seul score', pg.query_selector('details[data-cible="scores"]') is not None and n1 == 1, n1)
    # (relecture) un résultat déjà vu puis refait (même ligne, autre valeur et autre date, comme un bilan renvoyé) revient aussi
    pg.click('details[data-cible="scores"] > summary'); pg.wait_for_timeout(300)
    pg.click('details[data-cible="scores"] [data-act="scoresOk"]'); pg.wait_for_timeout(800)
    check('« C\'est bon » encore : plus de bloc', pg.query_selector('details[data-cible="scores"]') is None)
    rid = ids[0].split(':')[-1] if ids and ids[0].startswith('r:') else None
    ev("""rid => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k));
        const r = D.tables.records.find(x => x.id === rid); r.valeur = Number(r.valeur) + 3; r.date = new Date().toISOString().slice(0, 10);
        localStorage.setItem(k, JSON.stringify(D)); }""", rid)
    pg.reload(); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(1200); modals()
    n2 = pg.locator('details[data-cible="scores"] [data-act="pasCa"]').count()
    check('un résultat refait (autre valeur) revient dans le bloc', rid is not None and n2 == 1, (rid, n2))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
