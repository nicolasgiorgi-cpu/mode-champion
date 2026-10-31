# (v36) « 👏 Bravo » pour une séance : l'éduc félicite en un toucher (Progrès › Ça bouge, la cloche, la fiche › Prépa),
# ajoute un mot ou retire le bravo en retouchant « Envoyé » ; l'enfant le voit (Ma semaine, sous la séance, la cloche),
# la famille aussi (sous la séance, la cloche) ; jamais de bouton Bravo côté parent ou enfant ; pas de débordement.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_bravos.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def sans_debord(pg): return pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
def mes_bravos(pg, jid):
    return pg.evaluate("(function(){var g=MC.app.S.cache.group,p=g.joueurs.filter(function(x){return x.joueur.id==='%s';})[0];return (p.bravos||[]).filter(function(b){return b.parQui===g.moi.id;});})()" % jid)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1800)

    # ----- Progrès › Ça bouge -----
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1300)
    rows = pg.query_selector_all('.bvrow')
    check('Ça bouge : un bouton « 👏 Bravo » sur les séances', len(rows) > 0 and pg.query_selector('.bvrow .bvb') is not None, len(rows))
    check('Ça bouge : pas de défilement de côté', sans_debord(pg))
    btn = pg.query_selector('.bvrow .bvb:not(.on)')
    jid = btn.get_attribute('data-j'); sid = btn.get_attribute('data-bv')
    nom = pg.evaluate("MC.app.S.cache.group.joueurs.filter(function(x){return x.joueur.id==='%s';})[0].joueur.prenom" % jid)
    r = btn.bounding_box()
    check('le bouton se touche facilement (44 px de haut au moins)', r and r['height'] >= 43.5, r)
    check('le bouton a un nom pour les lecteurs d\'écran', ('Dire bravo à ' + nom) in (btn.get_attribute('aria-label') or ''), btn.get_attribute('aria-label'))
    btn.click(); pg.wait_for_timeout(120)
    check('un toucher : « Envoyé » tout de suite', 'Envoyé' in pg.inner_text('.bvb[data-bv="%s"]' % sid))
    pg.wait_for_timeout(1300)
    check('le serveur a gardé le bravo (1 par éduc)', len(mes_bravos(pg, jid)) == 1, mes_bravos(pg, jid))
    check('message : « Bravo envoyé à … »', ('Bravo envoyé à ' + nom) in (pg.inner_text('#toast') or ''), pg.inner_text('#toast'))
    on = pg.query_selector('.bvb.on[data-bv="%s"]' % sid)
    check('après le serveur : toujours « Envoyé » (bouton vert)', on is not None and 'Envoyé' in on.inner_text())
    check('sous la ligne : « 👏 vous »', 'vous' in pg.evaluate("document.querySelector('.bvb[data-bv=\"%s\"]').closest('li').innerText" % sid))
    # retoucher : un mot (phrase toute prête), puis envoyer
    on.click(); pg.wait_for_timeout(500)
    check('retoucher « Envoyé » : la fenêtre « 👏 Bravo à … »', pg.query_selector('.modal') is not None and ('Bravo à ' + nom) in pg.text_content('.modal'), pg.text_content('.modal')[:80] if pg.query_selector('.modal') else '')
    check('4 phrases toutes prêtes', len(pg.query_selector_all('.modal [data-bvph]')) == 4)
    pg.click('.modal [data-bvph] >> nth=1'); pg.wait_for_timeout(150)
    mot = pg.input_value('#bvmot')
    check('toucher une phrase la met dans le mot', mot == 'Super séance !', mot)
    pg.click('.modal .mbtns button >> nth=0'); pg.wait_for_timeout(1500)
    mb = mes_bravos(pg, jid)
    check('le mot part avec le même bravo (pas de 2e)', len(mb) == 1 and mb[0]['mot'] == 'Super séance !', mb)
    check('le mot est écrit sous la ligne', 'Super séance !' in pg.evaluate("document.querySelector('.bvb[data-bv=\"%s\"]').closest('li').innerText" % sid))
    # le reste de la semaine, replié
    more = pg.query_selector('.sec details.more')
    if more: check('« Voir les … autres des 7 derniers jours » : replié', not more.evaluate('e => e.open'))

    # ----- la fiche › Prépa -----
    pg.goto(BASE + '#/educ/joueur/%s?t=prepa' % jid); pg.wait_for_timeout(1500)
    check('fiche › Prépa : « 👏 Bravo » sur les séances', len(pg.query_selector_all('.li.bvl .bvb')) > 0)
    check('fiche : la séance félicitée est « Envoyé »', pg.query_selector('.li.bvl .bvb.on[data-bv="%s"]' % sid) is not None)
    check('fiche : pas de défilement de côté', sans_debord(pg))
    det = pg.query_selector('.li.bvl.sess details')
    if det:
        pg.click('.li.bvl.sess details > summary >> nth=0'); pg.wait_for_timeout(300)
        check('fiche : toucher la séance ouvre toujours son détail', det.evaluate('e => e.open'))
    # retirer le bravo
    pg.click('.bvb.on[data-bv="%s"]' % sid); pg.wait_for_timeout(500)
    pg.click('.modal .mbtns button >> nth=1'); pg.wait_for_timeout(1500)
    check('« Retirer le bravo » : il n\'y est plus', len(mes_bravos(pg, jid)) == 0 and pg.query_selector('.bvb.on[data-bv="%s"]' % sid) is None)
    pg.click('.bvb[data-bv="%s"]' % sid); pg.wait_for_timeout(1500)
    check('… et on peut le redonner', len(mes_bravos(pg, jid)) == 1)

    # ----- la cloche : Tom (l'enfant de Coach Nico en démo) fait une séance -----
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    tom = pg.evaluate('MC.app.S.kid.joueur.id')
    r2 = pg.evaluate("MC.app.kidCall('logSession', { type: 'recup', date: MC.logic.today(), mode: 'rapide' })"); pg.wait_for_timeout(600)
    sid2 = r2['seance']['id']
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900); pin(pg, codes['educ']); pg.wait_for_timeout(1800)
    pg.evaluate("MC.loadGroup(true)"); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/educ/notifs'); pg.wait_for_timeout(1500)
    b2 = pg.query_selector('.ntb .bvb[data-bv="%s"]' % sid2)
    check('cloche : « 👏 Bravo » à côté de « Tom a fait la récup »', b2 is not None and 'Tom' in pg.evaluate("document.querySelector('.bvb[data-bv=\"%s\"]').closest('li').innerText" % sid2))
    check('cloche : pas de défilement de côté', sans_debord(pg))
    b2.click(); pg.wait_for_timeout(1500)
    check('cloche : un toucher, c\'est envoyé, on reste sur la cloche', '#/educ/notifs' in pg.url and pg.query_selector('.ntb .bvb.on[data-bv="%s"]' % sid2) is not None, pg.url)
    check('cloche : Tom a son bravo', any(x['seanceId'] == sid2 for x in mes_bravos(pg, tom)))

    # ----- l'enfant -----
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    pg.evaluate("MC.app.loadMe && MC.app.loadMe(true)"); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(1300)
    card = pg.query_selector('.bvcard')
    txt = card.inner_text() if card else ''
    check('Ma semaine : la carte des bravos', card is not None and 'te dit bravo pour ta récup' in txt, txt)
    check('… avec le bravo de Coach Cyril et son mot (démo)', 'Super régularité' in txt, txt)
    check('enfant : jamais de bouton Bravo', pg.query_selector('.bvb') is None)
    check('Ma semaine : pas de défilement de côté', sans_debord(pg))
    pg.goto(BASE + '#/progression'); pg.wait_for_timeout(1200)
    check('Ma progression : « 👏 » sous la séance', pg.query_selector('.bvw') is not None)
    pg.goto(BASE + '#/notifs'); pg.wait_for_timeout(1300)
    check('cloche de l\'enfant : « … te dit bravo pour ta récup ! »', 'te dit bravo pour ta récup' in pg.inner_text('main'))
    pg.goto(BASE + '#/notifs/reglages'); pg.wait_for_timeout(900)
    check('réglages de l\'enfant : « Les bravos de tes éducs »', pg.query_selector('[data-act="ntToggle"][data-c="bravo"]') is not None)

    # ----- le parent de Tom -----
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1800)
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(1300)
    check('parent : « 👏 » sous ses séances', pg.query_selector('.bvw') is not None)
    check('parent : jamais de bouton Bravo', pg.query_selector('.bvb') is None)
    check('parent : pas de défilement de côté', sans_debord(pg))
    pg.goto(BASE + '#/parent/notifs'); pg.wait_for_timeout(1300)
    check('cloche du parent : « … a dit bravo à Tom »', 'a dit bravo à Tom' in pg.inner_text('main'))
    check('cloche du parent : pas de bouton Bravo', pg.query_selector('.bvb') is None)
    pg.goto(BASE + '#/parent/notifs/reglages'); pg.wait_for_timeout(900)
    check('réglages du parent : « Bravos des éducs »', pg.query_selector('[data-act="ntToggle"][data-c="bravo"]') is not None)
    b.close()
bad = [n for n, c in res if not c]
print('e2e_bravos %dx%d : %d/%d' % (W, H, len(res) - len(bad), len(res)), len(bad), 'BAD', 'ERREURS JS :', errs or 'aucune')
