# (v92) Missions de poste, épisode 1 : essai pour les éducs (demande de Nicolas du 20/11/2026). Progrès › Missions : la section
# « Missions de poste » en haut, l'entrée ouvre l'épisode (missions-postes/index.html) en plein écran dans une iframe du même site ;
# le choix du poste et le « ? » restent ; « Mon avis » sur chaque situation et sur la fin (C'est juste / À revoir + un mot,
# envoyé par l'appli avec la session de l'éduc : retourMission) ; « Retours des éducs » par poste puis par situation, « Voir »
# rouvre l'épisode à cet endroit ; aucun prénom d'enfant écrit en dur (« Champion ») ; un redessin ne recharge pas l'épisode.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v92.py 390 844 · 1180 820 · 820 1180 (et 360 780)
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
    db = lambda: ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables")
    rets = lambda: db().get('retoursMissions', [])
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/adultes'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = ev('MC.demo.CODES')
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    for c in codes['educ']: pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(50)
    pg.wait_for_timeout(1800); modals()

    # ----- Progrès › Missions : la section en haut, l'entrée -----
    pg.goto(BASE + '#/educ/missions'); pg.wait_for_timeout(1400); modals()
    h2 = ev("[...document.querySelectorAll('main .sec > .h2, main .sec .between .h2')].map(h => h.textContent.trim())")
    check('Progrès › Missions : « Missions de poste » en premier', len(h2) > 1 and h2[0] == 'Missions de poste' and h2[1] == 'Pour le groupe', h2)
    a = pg.query_selector('a[href="#/educ/missions/postes"]')
    check('l\'entrée « Missions de poste · épisode 1 (essai) »', a is not None and 'Missions de poste · épisode 1 (essai)' in a.inner_text() and 'Éducs seulement' in a.inner_text(), a.inner_text() if a else None)
    check('… pas encore de retour : pas de liste', 'pas encore de retour' in a.inner_text() and pg.query_selector('details.mpret') is None)
    check('pas de défilement de côté', noscroll())

    # ----- l'épisode en plein écran -----
    a.click(); pg.wait_for_timeout(2200)
    check('l\'adresse de l\'écran', pg.url.endswith('#/educ/missions/postes'), pg.url)
    f = pg.query_selector('#mpframe')
    bb = f.bounding_box() if f else None
    check('l\'iframe prend tout l\'écran', bb is not None and abs(bb['x']) < 1 and abs(bb['y']) < 1 and abs(bb['width'] - W) < 1 and abs(bb['height'] - H) < 1, bb)
    check('sans les onglets du bas (ni le rail de l\'iPad)', ev("!document.querySelector('.nav') || document.querySelector('.nav').hidden || getComputedStyle(document.querySelector('.nav')).display === 'none'"))
    vv = ev("/[?&]v=(\\d+)/.exec(document.querySelector('link[href*=\"style.css\"]').getAttribute('href'))[1]")
    check('l\'adresse de la page : mode éduc et la version de l\'appli', f.get_attribute('src') == 'missions-postes/index.html?educ=1&v=' + vv, (f.get_attribute('src'), vv))
    fr = f.content_frame(); fl = pg.frame_locator('#mpframe')
    fev = fr.evaluate
    check('la page : le choix du poste, 8 postes', len(fr.query_selector_all('[data-act="post"]')) == 8)
    check('… « Essai éducs », plus « Maquette »', 'ESSAI ÉDUCS' in fr.inner_text('body').upper() and 'MAQUETTE' not in fr.inner_text('body').upper(), fr.inner_text('.top'))
    check('… le menu « ? » est là', fr.query_selector('.top [data-act="menu"]') is not None)
    check('… pas de « Mon avis » sur le choix du poste', fr.query_selector('.ebb') is None)
    check('la page sait qu\'elle est dans l\'appli (mode éduc)', fev('document.querySelector(".hdw") !== null'))
    fl.locator('[data-act="post"][data-p="pil"]').click(); pg.wait_for_timeout(500)
    t = fr.inner_text('main')
    check('l\'accroche : « Champion, aujourd\'hui tu joues »', 'CHAMPION, AUJOURD’HUI TU JOUES' in t.upper(), t[:80])
    check('aucun prénom d\'enfant écrit en dur dans la page', 'MARCEL' not in fev('document.documentElement.outerHTML').upper())
    fl.locator('[data-act="start"]').click(); pg.wait_for_timeout(500)
    check('situation 1 : la barre des éducs et « Mon avis »', fr.query_selector('.eb .ebb') is not None and 'MON AVIS' in fr.inner_text('.ebb').upper())
    check('… « Pas encore d\'avis »', 'Pas encore d’avis' in fr.inner_text('#ebs'), fr.inner_text('#ebs'))
    ebb = fr.query_selector('.ebb').bounding_box()
    check('… « Mon avis » assez grand pour le doigt (44 px)', ebb['height'] >= 44, ebb)
    check('… la barre reste collée en haut en faisant défiler', fev("getComputedStyle(document.querySelector('.hdw')).position") == 'sticky')
    check('pas de défilement de côté dans la page', fev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'))

    # ----- « Mon avis » : la fenêtre de l'appli, au-dessus de l'épisode -----
    fl.locator('.ebb').click(); pg.wait_for_timeout(500)
    m = pg.query_selector('.modal')
    check('« Mon avis » ouvre la fenêtre de l\'appli', m is not None and 'MON AVIS' in m.inner_text().upper())
    check('… le poste et la situation', m is not None and 'Pilier · situation 1' in m.inner_text() and 'Défense' in m.inner_text(), m.inner_text() if m else None)
    check('… au-dessus de l\'épisode', ev("+getComputedStyle(document.querySelector('.modal')).zIndex > +getComputedStyle(document.querySelector('.mpwrap')).zIndex"))
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(400)
    check('sans choix : rien ne part', pg.query_selector('.modal') is not None and len(rets()) == 0)
    pg.click('.modal [data-av="revoir"]'); pg.wait_for_timeout(150)
    check('« À revoir » : le mot devient obligatoire', 'obligatoire' in pg.get_attribute('#mptexte', 'placeholder'))
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(400)
    check('« À revoir » sans mot : rien ne part', pg.query_selector('.modal') is not None and len(rets()) == 0)
    pg.fill('#mptexte', 'Le talonneur devrait être plus près du ruck.')
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(1000)
    R = rets()
    check('l\'avis est enregistré (date, éduc, poste, situation, variante, avis, mot)', len(R) == 1 and R[0]['poste'] == 'pil' and R[0]['situation'] == 1 and R[0]['variante'] is False and R[0]['avis'] == 'revoir'
          and R[0]['texte'] == 'Le talonneur devrait être plus près du ruck.' and R[0]['parNom'] == 'Coach Nico' and len(R[0]['date']) == 10, R)
    check('la fenêtre se ferme', pg.query_selector('.modal') is None)
    check('la page le montre : « Avis donné : à revoir »', 'à revoir' in fr.inner_text('#ebs') and 'revoir' in fr.get_attribute('#ebs', 'class'), fr.inner_text('#ebs'))
    # le même écran : l'avis se reprend et se remplace
    fl.locator('.ebb').click(); pg.wait_for_timeout(500)
    check('rouvrir : mon avis repris', pg.query_selector('.modal [data-av="revoir"].on') is not None and pg.input_value('#mptexte') == 'Le talonneur devrait être plus près du ruck.' and 'le nouveau le remplace' in pg.inner_text('.modal'))
    pg.click('.modal [data-av="juste"]'); pg.fill('#mptexte', '')
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(1000)
    R = rets()
    check('… remplacé, pas une 2e ligne', len(R) == 1 and R[0]['avis'] == 'juste' and R[0]['texte'] == '', R)
    check('… « ✓ Avis donné : c\'est juste »', 'c’est juste' in fr.inner_text('#ebs'), fr.inner_text('#ebs'))

    # ----- un redessin de l'appli ne recharge pas l'épisode -----
    fev('window.__garde = 1')
    ev('MC.app.rerender()'); pg.wait_for_timeout(700)
    check('un redessin ne recharge pas l\'épisode', pg.query_selector('#mpframe').content_frame().evaluate('window.__garde') == 1)
    fr = pg.query_selector('#mpframe').content_frame(); fev = fr.evaluate

    # ----- le « ? » : la situation 4 et sa variante -----
    fl.locator('.top [data-act="menu"]').click(); pg.wait_for_timeout(300)
    fl.locator('[data-act="jump"][data-s="play"][data-i="3"]').click(); pg.wait_for_timeout(400)
    fl.locator('.top [data-act="menu"]').click(); pg.wait_for_timeout(300)
    fl.locator('[data-act="altv"]').click(); pg.wait_for_timeout(400)
    check('la variante de la situation 4', fev('MQ.S.alt === true && MQ.S.i === 3'))
    fl.locator('.ebb').click(); pg.wait_for_timeout(500)
    check('« Mon avis » : la variante est nommée', pg.query_selector('.modal') is not None and 'Pilier · situation 4 (variante)' in pg.inner_text('.modal'), pg.inner_text('.modal') if pg.query_selector('.modal') else None)
    pg.click('.modal [data-av="juste"]'); pg.fill('#mptexte', 'Bonne variante.')
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(1000)
    R = rets()
    check('… enregistrée comme variante', any(x['situation'] == 4 and x['variante'] is True and x['avis'] == 'juste' for x in R), R)

    # ----- la fin de l'épisode -----
    fl.locator('.top [data-act="menu"]').click(); pg.wait_for_timeout(300)
    fl.locator('[data-act="jump"][data-s="end"]').click(); pg.wait_for_timeout(400)
    t = fr.inner_text('main')
    check('la fin : « … Champion ! », pas de prénom', 'CHAMPION' in t.upper() and 'MARCEL' not in t.upper(), t[:80])
    check('la fin : « Mon avis » aussi', fr.query_selector('.ebb') is not None and 'Pas encore d’avis' in fr.inner_text('#ebs'))
    fl.locator('.ebb').click(); pg.wait_for_timeout(500)
    check('… « Pilier · fin de l\'épisode »', 'Pilier · fin de l’épisode' in pg.inner_text('.modal'), pg.inner_text('.modal'))
    pg.click('.modal [data-av="revoir"]'); pg.fill('#mptexte', 'Le défi est un peu long à lire.')
    pg.click('.modal .mbtns button:has-text("Envoyer")'); pg.wait_for_timeout(1000)
    check('… enregistrée (situation 0)', any(x['situation'] == 0 and x['avis'] == 'revoir' for x in rets()))

    # ----- un autre éduc donne son avis (par le serveur de démo) -----
    autre = ev("""(async () => {
      const t = MC.app.S.adult.token;
      const a = await MC.api.call('addEduc', { token: t, nom: 'Cyril' });
      let r = await MC.api.call('adultLogin', { role: 'e', educId: a.educ.id, code: a.code });
      r = await MC.api.call('setAdultPin', { token: r.token, pin: '9753' });
      await MC.api.call('retourMission', { token: r.token, poste: 'ail', situation: 2, avis: 'revoir', texte: 'L’ailier qui reste de son côté : à voir ensemble.' });
      return true; })()""")

    # ----- « Missions » à la fin : retour à l'appli ; les retours, par poste puis par situation -----
    fl.locator('[data-act="quit"]').click(); pg.wait_for_timeout(1600)
    check('« Missions » : retour à Progrès › Missions', pg.url.endswith('#/educ/missions'), pg.url)
    ev('MC.mpRetours(true).then(() => MC.app.rerender())'); pg.wait_for_timeout(900)
    a = pg.query_selector('a[href="#/educ/missions/postes"]')
    check('l\'entrée compte les retours', a is not None and '4 retours · 2 à revoir' in a.inner_text(), a.inner_text() if a else None)
    d = pg.query_selector('details.mpret')
    check('« Retours des éducs » (replié)', d is not None and not ev("document.querySelector('details.mpret').open"))
    pg.click('details.mpret > summary'); pg.wait_for_timeout(300)
    postes = ev("[...document.querySelectorAll('.mpg .mpgh b')].map(b => b.textContent)")
    check('rangés par poste, dans l\'ordre du terrain', postes == ['Pilier', 'Ailier'], postes)
    sits = ev("[...document.querySelectorAll('.mpg')][0] ? [...[...document.querySelectorAll('.mpg')][0].querySelectorAll('.mpsh > span')].map(s => s.textContent) : []")
    check('… puis par situation (1, 4 variante, la fin)', sits == ['Situation 1', 'Situation 4 · variante', 'Fin de l\'épisode'], sits)
    tx = pg.inner_text('.mpgs')
    check('… avec l\'avis, le mot, qui et quand', 'À REVOIR' in tx.upper() and 'Le défi est un peu long à lire.' in tx and 'Moi ·' in tx and 'Cyril ·' in tx and 'L’ailier qui reste de son côté' in tx, tx[:300])
    check('… un « Voir » par situation', len(pg.query_selector_all('.mpvoir')) == 4)
    vb = pg.query_selector('.mpvoir').bounding_box()
    check('… « Voir » assez grand pour le doigt', vb['height'] >= 44, vb)
    check('après : pas de défilement de côté', noscroll())
    # le volet reste ouvert quand les données arrivent
    ev('MC.app.rerender()'); pg.wait_for_timeout(600)
    check('le volet reste ouvert après un redessin', ev("document.querySelector('details.mpret') && document.querySelector('details.mpret').open"))

    # ----- « Voir » : l'épisode rouvert à cet endroit, avec mon avis -----
    pg.click('.mpg >> nth=0 >> .mps >> nth=2 >> .mpvoir'); pg.wait_for_timeout(2200)
    check('« Voir » la fin : l\'adresse', pg.url.endswith('#/educ/missions/postes?p=pil&s=0'), pg.url)
    fr = pg.query_selector('#mpframe').content_frame()
    check('… la page s\'ouvre sur la fin du Pilier', fr.evaluate('MQ.S.scr') == 'end' and fr.evaluate('MQ.S.post') == 'pil')
    check('… et sait que j\'ai déjà donné mon avis', 'à revoir' in fr.inner_text('#ebs'), fr.inner_text('#ebs'))
    pg.go_back(); pg.wait_for_timeout(1200)
    check('Retour du navigateur : Progrès › Missions', pg.url.endswith('#/educ/missions'), pg.url)
    pg.goto(BASE + '#/educ/missions/postes?p=pil&s=4&alt=1'); pg.wait_for_timeout(2200)
    fr = pg.query_selector('#mpframe').content_frame()
    check('un lien vers la variante : situation 4, variante', fr.evaluate('MQ.S.i === 3 && MQ.S.alt === true && MQ.S.scr === "play"'))
    check('… « ✓ Avis donné : c\'est juste »', 'c’est juste' in fr.inner_text('#ebs'), fr.inner_text('#ebs'))
    # Retour de la page jusqu'au choix du poste, puis une fois de plus : l'appli reprend la main
    for _ in range(6):
        if fr.evaluate('MQ.S.scr') == 'pick': break
        pg.frame_locator('#mpframe').locator('.top [data-act="back"]').click(); pg.wait_for_timeout(300)
    check('Retour dans la page : jusqu\'au choix du poste', fr.evaluate('MQ.S.scr') == 'pick')
    pg.frame_locator('#mpframe').locator('.top [data-act="back"]').click(); pg.wait_for_timeout(1500)
    check('… puis Retour : l\'appli reprend la main', '#/educ/missions' in pg.url and '/postes' not in pg.url and pg.query_selector('#mpframe') is None, pg.url)

    # ----- pas pendant l'épisode : tirer pour actualiser, ni rechargement pour une nouvelle version -----
    pg.goto(BASE + '#/educ/missions/postes'); pg.wait_for_timeout(1500)
    check('l\'écran de l\'épisode n\'est pas « à actualiser »', ev('MC.app.pullable()') is False)

    # ----- seul un éduc : le parent et l'enfant ne lisent pas les avis -----
    ref = ev("""(async () => { try { await MC.api.call('retoursMissions', { token: 'x' }); return 'ok'; } catch (e) { return e.code; } })()""")
    check('sans session d\'éduc : refusé', ref in ('session', 'interdit'), ref)

    check('aucune erreur dans la console', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad else 0)
