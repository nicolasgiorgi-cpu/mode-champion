# (v72, lot E5) L'équipe vivante côté enfant : l'onglet Équipe s'ouvre sur « Ça bouge » (séances et records battus des copains
# ces 7 jours, le progrès jamais le score), sous-onglets Ça bouge · Podiums ; un 👏 sur la séance d'un copain, puis un mot tout prêt
# (pas de champ de texte) ; le copain le voit sur sa séance ; pas de bravo pour soi ; pas de débordement.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v72.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_system_time('2026-11-12T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    db = lambda: ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables")
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    on_tab = lambda: (pg.inner_text('#nav a.on').strip().split('\n')[0].upper() if pg.query_selector('#nav a.on') else '')
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300); modals()
    tom = ev('MC.app.S.me.joueur.id')

    # ----- l'onglet Équipe : Ça bouge d'abord -----
    pg.click('#nav a:has-text("Équipe")'); pg.wait_for_timeout(1300); modals()
    check('Équipe : « Ça bouge » d\'abord', pg.url.endswith('#/equipe') and on_tab() == 'ÉQUIPE', (pg.url, on_tab()))
    st = [a.inner_text().strip().upper() for a in pg.query_selector_all('.stabs a')]
    check('sous-onglets Ça bouge · Podiums', st == ['ÇA BOUGE', 'PODIUMS'], st)
    lignes = pg.query_selector_all('.eqfil .eqli')
    check('le fil des copains : des séances', len(lignes) >= 5, len(lignes))
    t = pg.inner_text('.eqfil')
    check('le fil : « a fait sa séance »', 'a fait sa séance' in t, t[:200])
    vals = ev("JSON.stringify(MC.app.S.me.records.map(r => r.valeur))")
    check('le fil ne montre aucun score (pas de valeur de record)', not any(('· ' + str(v) + ' ') in t for v in ev("MC.app.S.me.records.map(r => r.valeur)") if v > 20))
    check('pas de bouton 👏 sur ses propres séances', ev("[...document.querySelectorAll('.eqli')].filter(li => /^Toi/.test(li.querySelector('.t1').textContent)).every(li => !li.querySelector('[data-act=eqBravo]'))"))
    check('pas de défilement de côté', noscroll())

    # ----- un bravo à un copain : un mot tout prêt -----
    b1 = pg.query_selector('[data-act="eqBravo"]:not(.on)')
    jid, sid = b1.get_attribute('data-j'), b1.get_attribute('data-s')
    b1.click(); pg.wait_for_timeout(400)
    mots = pg.query_selector_all('.modal [data-eqmot]')
    check('la fenêtre du bravo : 4 mots tout prêts', len(mots) == 4, len(mots))
    check('… et aucun champ de texte', pg.query_selector('.modal textarea, .modal input[type=text]') is None)
    mot = mots[1].get_attribute('data-eqmot')
    mots[1].click(); pg.wait_for_timeout(1200)
    r = [x for x in db()['bravos'] if x['seanceId'] == sid and x['parQui'] == tom and not x.get('retire')]
    check('le bravo part avec ce mot (de : un enfant)', len(r) == 1 and r[0]['mot'] == mot and r[0].get('de') == 'p' and r[0]['parNom'] == 'Tom', r)
    li = pg.query_selector('[data-act="eqBravo"][data-s="%s"]' % sid)
    check('la ligne passe à « Envoyé » avec le mot', li is not None and 'on' in li.get_attribute('class') and mot in li.evaluate('b => b.closest("li").innerText'), li.evaluate('b => b.closest("li").innerText') if li else None)
    # retoucher : changer de mot, pas de 2e bravo
    pg.click('[data-act="eqBravo"][data-s="%s"]' % sid); pg.wait_for_timeout(400)
    m2 = [m for m in pg.eval_on_selector_all('.modal [data-eqmot]', 'l => l.map(x => x.dataset.eqmot)') if m != mot][0]
    pg.click('.modal [data-eqmot="%s"]' % m2.replace('"', '\\"')); pg.wait_for_timeout(1200)
    r = [x for x in db()['bravos'] if x['seanceId'] == sid and x['parQui'] == tom and not x.get('retire')]
    check('retoucher : le mot change, pas de 2e bravo', len(r) == 1 and r[0]['mot'] == m2, r)

    # ----- Podiums : toujours là -----
    pg.click('.stabs a:has-text("Podiums")'); pg.wait_for_timeout(1300)
    check('Podiums : les podiums de sa ligue, onglet Équipe allumé', pg.url.endswith('#/classement') and on_tab() == 'ÉQUIPE' and pg.query_selector('.rkcards') is not None, pg.url)
    check('Podiums : pas de défilement de côté', noscroll())

    # ----- le copain le voit sur sa séance -----
    prenom = [x for x in db()['joueurs'] if x['id'] == jid][0]['prenom']
    ev("MC.app.setMe && 0"); pg.goto(BASE + '#/reglages'); pg.wait_for_timeout(500); pg.click('[data-act="logoutKid"]'); pg.wait_for_timeout(500)
    pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(600)
    btn = pg.query_selector('.kidbtn:has-text("%s")' % prenom.upper())
    if btn:
        btn.click(); pg.wait_for_timeout(350)
        for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
        pg.wait_for_timeout(1300); modals()
        mb = ev("(MC.app.S.me.bravos || []).filter(b => b.de === 'p' && b.parNom === 'Tom').map(b => b.mot)")
        check('le copain reçoit le bravo de Tom, avec son mot', m2 in mb, mb)
    else:
        check('le copain reçoit le bravo de Tom, avec son mot (connexion)', False, prenom)
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d · erreurs JS : %s' % (ok, len(res), errs))
sys.exit(0 if ok == len(res) and not errs else 1)
