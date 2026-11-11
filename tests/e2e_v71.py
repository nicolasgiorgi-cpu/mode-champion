# (v71) Les bravos en série des éducs (demande de Nicolas du 11/11, « Liste à cocher ») : Progrès › Prépa physique ›
# « 👏 Bravos à donner » ; un enfant par ligne (ses séances depuis mon dernier bravo), 3 mots proposés, tous différents sur l'écran ;
# un mot touché = le bravo part avec ce mot ; le crayon pour écrire le sien ; « Bravo à tous » envoie à chacun un mot différent.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v71.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_system_time('2026-11-10T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    db = lambda: ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables")
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/adultes'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = ev('MC.demo.CODES')
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    for c in codes['educ']: pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(50)
    pg.wait_for_timeout(1800); modals()
    moi = ev('MC.app.S.cache.group ? MC.app.S.cache.group.moi.id : null') or ev('MC.loadGroup().then(g => g.moi.id)')

    # ----- l'entrée : Progrès › Prépa physique -----
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1300); modals()
    a = pg.query_selector('a.bvgo')
    check('Prépa physique : « Bravos à donner » avec le nombre d\'enfants', a is not None and 'Bravos à donner' in a.inner_text() and 'séance' in a.inner_text(), a.inner_text() if a else None)
    n_av = ev("MC.bravo.nb(MC.app.S.cache.group)")
    pg.click('a.bvgo'); pg.wait_for_timeout(1000)
    check('l\'écran « Bravos » s\'ouvre', pg.url.endswith('#/educ/bravos') and 'BRAVOS' in pg.inner_text('.topbar').upper(), pg.url)
    lignes = pg.query_selector_all('.bvk')
    check('un enfant par ligne, autant que « à donner »', len(lignes) == n_av and n_av >= 3, (len(lignes), n_av))
    mots = ev("[...document.querySelectorAll('.bvk [data-act=bvMot]')].map(b => b.dataset.mot)")
    check('3 mots par enfant', all(len(l.query_selector_all('[data-act="bvMot"]')) == 3 for l in lignes))
    check('tous les mots proposés sont différents sur l\'écran', len(mots) == len(set(mots)), len(mots) - len(set(mots)))
    check('un crayon par enfant', len(pg.query_selector_all('.bvk [data-act="bvEcrire"]')) == len(lignes))
    check('« Bravo à tous » avec le nombre', pg.query_selector('[data-act="bvTous"]') is not None and str(n_av) in pg.inner_text('[data-act="bvTous"]'))
    check('pas de défilement de côté', noscroll())
    # les mots restent les mêmes pendant la visite (pas de nouveau tirage à chaque affichage)
    ev('MC.app.rerender()'); pg.wait_for_timeout(500)
    check('les mots ne changent pas d\'un affichage à l\'autre', ev("[...document.querySelectorAll('.bvk [data-act=bvMot]')].map(b => b.dataset.mot)") == mots)

    # ----- un mot touché : le bravo part avec ce mot -----
    jid = lignes[0].get_attribute('data-j'); mot = lignes[0].query_selector('[data-act="bvMot"]').get_attribute('data-mot')
    pg.click('.bvk[data-j="%s"] [data-act="bvMot"] >> nth=0' % jid); pg.wait_for_timeout(1200)
    r = [x for x in db()['bravos'] if x['joueurId'] == jid and x['parQui'] == moi and not x.get('retire')]
    check('un toucher sur un mot : le bravo est envoyé avec ce mot', len(r) == 1 and r[0]['mot'] == mot, r)
    li = pg.query_selector('.bvk[data-j="%s"]' % jid)
    check('la ligne reste, « envoyé » avec son mot', li is not None and 'ok' in li.get_attribute('class') and mot in li.inner_text(), li.inner_text() if li else None)
    check('… à sa place (la 1re ligne)', pg.get_attribute('.bvk >> nth=0', 'data-j') == jid, pg.get_attribute('.bvk >> nth=0', 'data-j'))
    check('« Bravo à tous » compte un enfant de moins', str(n_av - 1) in pg.inner_text('[data-act="bvTous"]'), pg.inner_text('[data-act="bvTous"]'))

    # ----- le crayon : son propre mot -----
    j2 = pg.get_attribute('.bvk:not(.ok) >> nth=0', 'data-j')
    pg.click('.bvk[data-j="%s"] [data-act="bvEcrire"]' % j2); pg.wait_for_timeout(400)
    pg.fill('#bvmot2', 'Super gainage aujourd\'hui !'); pg.click('.modal button:has-text("Envoyer")'); pg.wait_for_timeout(1200)
    r = [x for x in db()['bravos'] if x['joueurId'] == j2 and x['parQui'] == moi and not x.get('retire')]
    check('le crayon : un bravo avec son propre mot', len(r) == 1 and r[0]['mot'] == 'Super gainage aujourd\'hui !', r)

    # ----- « Bravo à tous » : chacun un mot différent -----
    reste = ev("[...document.querySelectorAll('.bvk:not(.ok)')].map(l => [l.dataset.j, l.querySelector('[data-act=bvMot]').dataset.mot])")
    pg.click('[data-act="bvTous"]'); pg.wait_for_timeout(400)
    check('« Bravo à tous » : une confirmation d\'abord', pg.query_selector('.modal') is not None and 'mot différent' in pg.inner_text('.modal'))
    pg.click('.modal button:has-text("Envoyer les")'); pg.wait_for_timeout(1800)
    B = [x for x in db()['bravos'] if x['parQui'] == moi and not x.get('retire')]
    ok = all(any(x['joueurId'] == j and x['mot'] == m for x in B) for j, m in reste)
    check('« Bravo à tous » : chacun reçoit le 1er mot proposé', ok, reste)
    envoyes = [x['mot'] for x in B if x['joueurId'] in [j for j, _ in reste]]
    check('… tous différents', len(envoyes) == len(set(envoyes)) == len(reste), envoyes)
    check('plus de « Bravo à tous » une fois tout envoyé', pg.query_selector('[data-act="bvTous"]') is None)
    check('après : pas de défilement de côté', noscroll())
    # en revenant : plus personne à féliciter (sauf une nouvelle séance)
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900)
    check('Prépa physique : plus de « Bravos à donner »', pg.query_selector('a.bvgo') is None)
    BV = ev("(MC.bravo.nb(MC.app.S.cache.group))")
    check('« à donner » retombe à 0', BV == 0, BV)
    # la fenêtre d'un bravo déjà donné : 4 mots du grand choix
    pg.goto(BASE + '#/educ/bravos'); pg.wait_for_timeout(900)
    check('écran vide : « Personne à féliciter »', 'Personne à féliciter' in pg.inner_text('main') or pg.query_selector('.bvk') is not None)
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d · erreurs JS : %s' % (ok, len(res), errs))
sys.exit(0 if ok == len(res) and not errs else 1)
