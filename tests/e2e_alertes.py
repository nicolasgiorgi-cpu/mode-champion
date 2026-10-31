# (v34) Les alertes sur l'écran du téléphone : l'interrupteur en haut des réglages de la cloche (éduc, parent, enfant),
# l'abonnement gardé par le serveur (onglet push de la démo), les sortes qui suivent la cloche, l'essai, éteindre,
# se déconnecter, l'abonnement vérifié à l'ouverture, la permission refusée ou bloquée, l'iPhone sans l'appli installée,
# un navigateur sans alertes, et le toucher d'une alerte quand l'appli est ouverte.
# Pas de Firebase ici : window.__MC_PUSH_FAKE donne un faux jeton. Rien n'est envoyé (la démo n'a pas d'envoi).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_alertes.py [largeur hauteur]
import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
JETON = 'faux-jeton:APA91b_0123456789abcdefghij'
DEMO = 'mc-demo-v11'
IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def rows(pg): return pg.evaluate("(JSON.parse(localStorage.getItem('%s') || '{}').tables || {}).push || []" % DEMO)
def actifs(pg, role): return [r for r in rows(pg) if r['role'] == role and r['actif']]
def toast(pg): return pg.inner_text('#toast') if pg.query_selector('#toast') else ''
def sw(pg): return pg.query_selector('[data-act="alerteToggle"]')
def coche(pg): el = sw(pg); return el.get_attribute('aria-checked') if el else None
def sans_debord(pg): return pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
def config_firebase(pg):
    # la configuration publique de Firebase, côté serveur (propriété FCM_WEB) : ici une fausse
    pg.evaluate("""k => { var d = JSON.parse(localStorage.getItem(k)); d.props.FCM_WEB = JSON.stringify({ apiKey: 'demo', authDomain: 'demo.example', projectId: 'demo', messagingSenderId: '1', appId: '1:1:web:1', vapidKey: 'demo-vapid' }); localStorage.setItem(k, JSON.stringify(d)); }""", DEMO)
    pg.reload(); pg.wait_for_timeout(1200)
def contexte(b, perm=True, ua=None, init=''):
    o = dict(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    o['user_agent'] = ua or ANDROID   # un téléphone Android (Chrome) par défaut
    ctx = b.new_context(**o)
    # Chromium sans écran répond toujours « denied » à Notification.permission : on fait comme un vrai téléphone
    etat = 'granted' if perm else 'default'
    ctx.add_init_script('window.__MC_QUIET=1; window.__MC_PUSH_FAKE=%s;' % json.dumps(JETON) +
        "Object.defineProperty(Notification, 'permission', { configurable: true, get: function () { return '%s'; } });" % etat + init)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    return ctx, pg
def educ(pg, codes):
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
def parent(pg, codes):
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1500)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = contexte(b)
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    educ(pg, codes)
    # ----- 1. l'interrupteur, et le serveur pas encore prêt -----
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    check('éduc : « Alertes sur ce téléphone » en haut des réglages', sw(pg) is not None and 'Alertes sur ce téléphone' in sw(pg).inner_text(), pg.inner_text('main')[:200])
    check('éteint au départ', coche(pg) == 'false')
    check('les 6 sortes de la cloche sont toujours là', pg.evaluate("document.querySelectorAll('[data-act=ntToggle]').length") == 6)
    check('l\'interrupteur est au-dessus des sortes', pg.evaluate("document.querySelector('[data-act=alerteToggle]').compareDocumentPosition(document.querySelector('[data-act=ntToggle]')) & 4") > 0)
    check('réglages : pas de défilement de côté', sans_debord(pg))
    sw(pg).click(); pg.wait_for_timeout(1200)
    check('serveur sans configuration : « pas encore prêtes »', 'pas encore prêtes' in toast(pg), toast(pg))
    check('… l\'interrupteur reste éteint, rien de gardé', coche(pg) == 'false' and not rows(pg))
    # ----- 2. allumer -----
    config_firebase(pg)
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    sw(pg).click(); pg.wait_for_timeout(1500)
    check('allumé : « C\'est allumé »', 'allumé' in toast(pg), toast(pg))
    check('allumé : l\'interrupteur', coche(pg) == 'true')
    r = actifs(pg, 'e')
    moi = pg.evaluate('MC.app.S.cache.group.moi.id')
    check('le serveur garde l\'appareil (éduc, son id, le jeton)', len(r) == 1 and r[0]['qui'] == moi and r[0]['jeton'] == JETON, r)
    check('… avec les 6 sortes allumées dans la cloche', r and sorted(r[0]['cats']) == sorted(['seance', 'bilan', 'mission', 'etoile', 'niveau', 'compo']), r and r[0]['cats'])
    check('… et le type d\'appareil (sans rien d\'autre)', r and r[0]['appareil'] == 'Android', r and r[0]['appareil'])
    loc = pg.evaluate("JSON.parse(localStorage.getItem('mc-notif-push:e:' + MC.app.S.cache.group.moi.id))")
    check('sur l\'appareil : allumé, avec le jeton', loc and loc.get('on') is True and loc.get('jeton') == JETON, loc)
    check('allumé : le bouton d\'essai', pg.query_selector('[data-act="alerteEssai"]') is not None)
    pg.click('[data-act="alerteEssai"]'); pg.wait_for_timeout(900)
    check('essai en démo : « le serveur n\'envoie pas encore »', 'envoie pas encore' in toast(pg), toast(pg))
    # ----- 3. les sortes suivent la cloche -----
    pg.click('[data-act="ntToggle"][data-c="seance"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="ntToggle"][data-c="compo"]'); pg.wait_for_timeout(2000)
    r = actifs(pg, 'e')
    check('éteindre deux sortes dans la cloche : le serveur suit (un seul abonnement)', len(r) == 1 and sorted(r[0]['cats']) == sorted(['bilan', 'mission', 'etoile', 'niveau']), r and r[0]['cats'])
    pg.click('[data-act="ntToggle"][data-c="seance"]'); pg.wait_for_timeout(300); pg.click('[data-act="ntToggle"][data-c="compo"]'); pg.wait_for_timeout(1800)
    check('les rallumer : le serveur suit', len(actifs(pg, 'e')[0]['cats']) == 6, actifs(pg, 'e'))
    # ----- 4. éteindre, rallumer -----
    sw(pg).click(); pg.wait_for_timeout(1000)
    check('éteindre : l\'interrupteur et plus d\'abonnement actif', coche(pg) == 'false' and not actifs(pg, 'e'), rows(pg))
    check('éteint : plus de bouton d\'essai', pg.query_selector('[data-act="alerteEssai"]') is None)
    sw(pg).click(); pg.wait_for_timeout(1500)
    check('rallumer : le même abonnement revient (pas de doublon)', coche(pg) == 'true' and len(actifs(pg, 'e')) == 1 and len([x for x in rows(pg) if x['role'] == 'e']) == 1, rows(pg))
    # ----- 5. à l'ouverture : le jeton est redonné au serveur une fois par jour -----
    vu = actifs(pg, 'e')[0]['vu']
    pg.evaluate("(function(){ var k = 'mc-notif-push:e:' + MC.app.S.cache.group.moi.id, s = JSON.parse(localStorage.getItem(k)); s.t = Date.now() - 2 * 86400000; localStorage.setItem(k, JSON.stringify(s)); })()")
    pg.reload(); pg.wait_for_timeout(800); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1800)
    check('plus d\'un jour : l\'appli redonne le jeton au serveur', actifs(pg, 'e') and actifs(pg, 'e')[0]['vu'] != vu, (vu, actifs(pg, 'e')))
    vu2 = actifs(pg, 'e')[0]['vu']
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1500)
    check('… et pas à chaque écran', actifs(pg, 'e')[0]['vu'] == vu2)
    # ----- 5b. (relecture) l'appareil d'où vient l'action est signalé au serveur (il ne sonnera pas pour elle) -----
    pg.evaluate("(function(){ var h = Core.handle; Core.handle = function (req) { window.__pj = req.pj; return h.apply(this, arguments); }; })()")
    pg.evaluate("MC.app.adultCall('group', {})"); pg.wait_for_timeout(600)
    check('chaque action dit de quel appareil elle vient (son jeton d\'alertes)', pg.evaluate('window.__pj') == JETON, pg.evaluate('window.__pj'))
    # ----- 5c. (relecture) les appels en arrière-plan ne rouvrent pas l'espace adulte d'un appareil partagé -----
    pg.evaluate("localStorage.setItem('mc-shared', JSON.stringify('on')); localStorage.setItem('mc-adult-open', 'true')")
    pg.evaluate("(function(){ var k = 'mc-notif-push:e:' + MC.app.S.cache.group.moi.id, s = JSON.parse(localStorage.getItem(k)); s.t = 0; localStorage.setItem(k, JSON.stringify(s)); })()")
    vu3 = actifs(pg, 'e')[0]['vu']
    pg.reload(); pg.wait_for_timeout(300)
    pg.evaluate("MC.app.lockAdult()")   # l'enfant prend le téléphone pendant que l'appli revérifie l'abonnement
    pg.wait_for_timeout(2500)
    check('vérification en arrière-plan : faite', actifs(pg, 'e') and actifs(pg, 'e')[0]['vu'] != vu3, (vu3, actifs(pg, 'e')))
    check('… sans rouvrir l\'espace adulte refermé', pg.evaluate("localStorage.getItem('mc-adult-open')") is None, pg.evaluate("localStorage.getItem('mc-adult-open')"))
    pg.evaluate("localStorage.removeItem('mc-shared'); localStorage.setItem('mc-adult-open', 'true')")
    # ----- 5d. (relecture) le jeton de l'appareil change (ouvert depuis un autre profil) : ce profil suit -----
    NEUF = 'nouveau-jeton:APA91b_abcdefghij0123456789'
    pg.evaluate("j => localStorage.setItem('mc-push-jeton', JSON.stringify(j))", NEUF)
    pg.reload(); pg.wait_for_timeout(800); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1800)
    a = actifs(pg, 'e')
    check('nouveau jeton de l\'appareil : le profil se réabonne avec lui (l\'ancien est retiré)', len(a) == 1 and a[0]['jeton'] == NEUF, a)
    pg.evaluate("j => localStorage.setItem('mc-push-jeton', JSON.stringify(j))", JETON)
    pg.reload(); pg.wait_for_timeout(800); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1800)
    # ----- 5e. (relecture) éteindre sans réseau : l'appli réessaie, l'appareil ne reste jamais abonné en douce -----
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    pg.evaluate("(function(){ var c = MC.api.call; MC.api.call = function (a) { if (a === 'pushDesabonner') return Promise.reject({ code: 'reseau', message: 'Pas de réseau' }); return c.apply(this, arguments); }; })()")
    sw(pg).click(); pg.wait_for_timeout(1000)
    loc = pg.evaluate("JSON.parse(localStorage.getItem('mc-notif-push:e:' + MC.app.S.cache.group.moi.id))")
    check('éteint sans réseau : l\'interrupteur est éteint, le retrait reste à faire', coche(pg) == 'false' and loc.get('retirer') is True and len(actifs(pg, 'e')) == 1, (coche(pg), loc))
    pg.reload(); pg.wait_for_timeout(800); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1800)
    loc = pg.evaluate("JSON.parse(localStorage.getItem('mc-notif-push:e:' + MC.app.S.cache.group.moi.id))")
    check('… réessayé à l\'ouverture : plus abonné', not actifs(pg, 'e') and not loc.get('retirer'), (rows(pg), loc))
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000); sw(pg).click(); pg.wait_for_timeout(1500)
    check('(rallumé)', coche(pg) == 'true' and len(actifs(pg, 'e')) == 1)
    # ----- 6. toucher une alerte, appli ouverte : la cloche (et un lien abîmé ne fait rien) -----
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1000)
    pg.evaluate("navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { mc: 'aller', lien: 'javascript:alert(1)' } }))"); pg.wait_for_timeout(600)
    check('lien abîmé : on reste où on est', '#/educ/progres' in pg.url, pg.url)
    pg.evaluate("navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { mc: 'aller', lien: '#/educ/notifs' } }))"); pg.wait_for_timeout(1200)
    check('alerte touchée, appli ouverte : la cloche', '#/educ/notifs' in pg.url and '/reglages' not in pg.url, pg.url)
    # ----- 7. alertes coupées dans les réglages du téléphone : l'appli s'en aperçoit -----
    p2 = ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
    p2.add_init_script("Object.defineProperty(Notification, 'permission', { configurable: true, get: function () { return 'denied'; } });")
    p2.goto(BASE + '#/educ/joueurs'); p2.wait_for_timeout(1800)
    check('permission retirée : l\'abonnement est éteint', not actifs(p2, 'e'), rows(p2))
    p2.goto(BASE + '#/educ/notifs/reglages'); p2.wait_for_timeout(1000)
    check('permission retirée : les réglages disent comment rouvrir', 'bloquées' in p2.inner_text('main') and sw(p2) is None, p2.inner_text('main')[:300])
    check('… pas de défilement de côté', sans_debord(p2))
    p2.close()
    # ----- 8. se déconnecter : plus d'alertes pour ce profil sur l'appareil -----
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    if coche(pg) != 'true': sw(pg).click(); pg.wait_for_timeout(1500)
    check('(rallumé avant de se déconnecter)', len(actifs(pg, 'e')) == 1)
    pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(800)
    pg.click('[data-act="adultLogout"]'); pg.wait_for_timeout(500)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1200)
    check('déconnexion : l\'abonnement est éteint', not actifs(pg, 'e'), rows(pg))
    check('déconnexion : plus rien sur l\'appareil', pg.evaluate("Object.keys(localStorage).filter(k => k.indexOf('mc-notif-push:e:') === 0).length") == 0)
    check('déconnexion : le retrait confirmé ne laisse pas la session sur l\'appareil', pg.evaluate("localStorage.getItem('mc-push-retirer')") is None, pg.evaluate("localStorage.getItem('mc-push-retirer')"))
    # ----- 9. le parent, puis l'enfant -----
    parent(pg, codes)
    pg.goto(BASE + '#/parent/notifs/reglages'); pg.wait_for_timeout(1000)
    check('parent : l\'interrupteur', sw(pg) is not None and coche(pg) == 'false')
    sw(pg).click(); pg.wait_for_timeout(1500)
    r = actifs(pg, 'f')
    fam = pg.evaluate('MC.app.S.cache.family.famille.id')
    check('parent : abonné, pour sa famille, avec les 5 sortes ouvertes (V1 ; v36 : + bravo)', len(r) == 1 and r[0]['qui'] == fam and sorted(r[0]['cats']) == sorted(['seance', 'bravo', 'confirmer', 'mission', 'niveau']), r)
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(900); pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    pg.goto(BASE + '#/notifs/reglages'); pg.wait_for_timeout(1000)
    check('enfant : l\'interrupteur', sw(pg) is not None and 'Alertes sur ce téléphone' in sw(pg).inner_text())
    sw(pg).click(); pg.wait_for_timeout(1500)
    r = actifs(pg, 'p'); tom = pg.evaluate('MC.app.S.kid.joueur.id')
    check('enfant : abonné (rôle joueur, son id, 4 sortes ; v36 : + bravo)', len(r) == 1 and r[0]['qui'] == tom and sorted(r[0]['cats']) == sorted(['resultat', 'bravo', 'nouvelle', 'niveau']), r)
    check('enfant : « tu »', 'tu seras prévenu' in toast(pg), toast(pg))
    # (v36) un appareil abonné avant la v36 (sans « bravo ») : à l'ouverture, le serveur reçoit la nouvelle sorte, même jeton
    pg.evaluate("""k => { var d = JSON.parse(localStorage.getItem(k)); d.tables.push.forEach(function (x) { if (x.role === 'p') x.cats = ['resultat', 'nouvelle', 'niveau']; }); localStorage.setItem(k, JSON.stringify(d));
      Object.keys(localStorage).filter(function (c) { return c.indexOf('mc-notif-push:k:') === 0; }).forEach(function (c) { var o = JSON.parse(localStorage.getItem(c)); delete o.c; localStorage.setItem(c, JSON.stringify(o)); }); }""", DEMO)
    jet = actifs(pg, 'p')[0]['jeton']
    pg.goto(BASE + '#/semaine'); pg.reload(); pg.wait_for_timeout(2500)
    r = actifs(pg, 'p')
    check('v36 : abonné avant les bravos → la sorte « bravo » arrive au serveur toute seule', len(r) == 1 and 'bravo' in r[0]['cats'] and r[0]['jeton'] == jet, r)
    check('le parent garde les siennes (deux profils, un appareil)', len(actifs(pg, 'f')) == 1)
    ctx.close()
    # ----- 10. permission refusée au moment de la question -----
    ctx, pg = contexte(b, perm=False, init="Notification.requestPermission = function (cb) { if (cb) cb('denied'); return Promise.resolve('denied'); };")
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    config_firebase(pg); educ(pg, codes)
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    sw(pg).click(); pg.wait_for_timeout(1200)
    check('« Ne pas autoriser » : le message, éteint, rien de gardé', 'bloquées' in toast(pg) and not rows(pg), (toast(pg), rows(pg)))
    ctx.close()
    ctx, pg = contexte(b, perm=False, init="Notification.requestPermission = function (cb) { if (cb) cb('default'); return Promise.resolve('default'); };")
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    config_firebase(pg); educ(pg, codes)
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    sw(pg).click(); pg.wait_for_timeout(1200)
    check('question fermée sans répondre : « toucher Autoriser »', 'Autoriser' in toast(pg) and coche(pg) == 'false' and not rows(pg), (toast(pg), coche(pg)))
    ctx.close()
    # ----- 11. iPhone, appli pas sur l'écran d'accueil -----
    ctx, pg = contexte(b, ua=IPHONE)
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    educ(pg, codes)
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('iPhone dans Safari : pas d\'interrupteur, mais quoi faire', sw(pg) is None and 'écran d\'accueil' in t and '16.4' in t, t[:300])
    pg.click('[data-act="howInstall"]'); pg.wait_for_timeout(700)
    check('« Comment faire » : la fenêtre « Sur l\'écran d\'accueil »', pg.query_selector('.modal') is not None and 'Partager' in pg.inner_text('.modal'))
    pg.click('.modal [data-close]') if pg.query_selector('.modal [data-close]') else None; pg.wait_for_timeout(400)
    check('iPhone : pas de défilement de côté', sans_debord(pg))
    ctx.close()
    # ----- 12. iPhone, appli sur l'écran d'accueil : l'interrupteur -----
    ctx, pg = contexte(b, ua=IPHONE, init="Object.defineProperty(navigator, 'standalone', { get: function () { return true; } });")
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    educ(pg, codes)
    pg.goto(BASE + '#/educ/notifs/reglages'); pg.wait_for_timeout(1000)
    check('iPhone, appli installée : l\'interrupteur', sw(pg) is not None)
    ctx.close()
    # ----- 13. un navigateur sans alertes (Android, navigateur d'une autre appli) -----
    ctx, pg = contexte(b, ua=ANDROID, init="try { delete window.PushManager; } catch (e) { }")
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    parent(pg, codes)
    pg.goto(BASE + '#/parent/notifs/reglages'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('navigateur sans alertes (Android) : « Ouvrez l\'appli dans Chrome »', sw(pg) is None and 'Chrome' in t, t[:300])
    check('… les sortes de la cloche restent réglables (5 pour un parent depuis la v36)', pg.evaluate("document.querySelectorAll('[data-act=ntToggle]').length") == 5)
    ctx.close()
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad or errs else 0)
