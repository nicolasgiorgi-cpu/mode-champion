# (v39) Les icônes et le manifeste arrivent frais avec le vrai service worker (Chromium) : une nouvelle icône mise en ligne
# est servie tout de suite (avant, la copie gardée passait d'abord : il fallait ajouter l'appli deux fois à l'écran d'accueil).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_icones.py   (sert la démo sur :8897 avec tests/slow_server.py)
import os, subprocess, time, re
from playwright.sync_api import sync_playwright
ICI = os.path.dirname(os.path.abspath(__file__))
SITE = '/home/claude/site-demo'; URL = 'http://localhost:8897/'
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
html = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
NV = re.search(r'js/app\.js\?v=(\d+)', html).group(1)
icone = os.path.join(SITE, 'icons/icon-192.png'); manif = os.path.join(SITE, 'manifest.webmanifest')
orig_icone = open(icone, 'rb').read(); orig_manif = open(manif, encoding='utf-8').read()
pr = subprocess.Popen(['python3', os.path.join(ICI, 'slow_server.py')]); time.sleep(0.8)
taille = "async (u) => { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? (await r.arrayBuffer()).byteLength : -r.status; }"
texte = "async (u) => { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? await r.text() : ''; }"
garde = "async (u) => { const c = await caches.open('mc-shell-1'); const r = await c.match(new URL(u, location.href).href); return r ? (await r.arrayBuffer()).byteLength : -1; }"
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        # en http (localhost), l'appli n'installe son service worker qu'avec mc-sw = 1 (voir registerSW dans js/app.js)
        pg.goto(URL); pg.evaluate("localStorage.clear(); localStorage.setItem('mc-sw', '1')"); pg.reload()
        pg.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=10000)
        pg.wait_for_timeout(1500)
        check('le service worker contrôle la page', pg.evaluate("!!navigator.serviceWorker.controller"))
        # l'icône de l'écran d'accueil iPhone et celle de l'onglet suivent la version du site, et sont gardées pour le hors-ligne
        check('index.html : icône iPhone en ?v=' + NV, pg.get_attribute('link[rel="apple-touch-icon"]', 'href') == 'icons/apple-touch-icon.png?v=' + NV)
        check('index.html : icône de l\'onglet en ?v=' + NV, pg.get_attribute('link[rel="icon"]', 'href') == 'icons/favicon.svg?v=' + NV)
        t_touch = os.path.getsize(os.path.join(SITE, 'icons/apple-touch-icon.png'))
        check('l\'icône iPhone de cette version est gardée sur l\'appareil', pg.evaluate(garde, 'icons/apple-touch-icon.png?v=' + NV) == t_touch)
        # une icône du manifeste : servie, puis gardée
        a = pg.evaluate(taille, 'icons/icon-192.png')
        check('icône du manifeste servie', a == len(orig_icone), a)
        pg.wait_for_timeout(300)
        check('icône du manifeste gardée', pg.evaluate(garde, 'icons/icon-192.png') == len(orig_icone))
        # une nouvelle icône est mise en ligne : la page la reçoit tout de suite (plus la copie gardée)
        open(icone, 'wb').write(orig_icone + b'\0' * 37)
        a = pg.evaluate(taille, 'icons/icon-192.png')
        check('nouvelle icône : servie tout de suite', a == len(orig_icone) + 37, a)
        pg.wait_for_timeout(300)
        check('nouvelle icône : la copie gardée est remplacée', pg.evaluate(garde, 'icons/icon-192.png') == len(orig_icone) + 37)
        # pareil pour le manifeste
        pg.evaluate(texte, 'manifest.webmanifest')
        open(manif, 'w', encoding='utf-8').write(orig_manif.replace('"short_name": "Champion"', '"short_name": "Champion2"'))
        check('nouveau manifeste : servi tout de suite', '"Champion2"' in pg.evaluate(texte, 'manifest.webmanifest'))
        pg.wait_for_timeout(300)   # la copie gardée s'écrit en arrière-plan
        # sans réseau : les copies gardées
        ctx.set_offline(True)
        a = pg.evaluate(taille, 'icons/icon-192.png')
        check('sans réseau : l\'icône gardée', a == len(orig_icone) + 37, a)
        check('sans réseau : le manifeste gardé', '"Champion2"' in pg.evaluate(texte, 'manifest.webmanifest'))
        check('sans réseau : l\'icône iPhone gardée', pg.evaluate(taille, 'icons/apple-touch-icon.png?v=' + NV) == t_touch)
        ctx.set_offline(False)
        check('pas d\'erreur JS', not errs, errs)
        b.close()
finally:
    open(icone, 'wb').write(orig_icone); open(manif, 'w', encoding='utf-8').write(orig_manif)
    pr.terminate()
nb = sum(1 for _, c in res if c)
print('%d/%d' % (nb, len(res)))
raise SystemExit(0 if nb == len(res) else 1)
