# Résistance au réseau : écran d'ouverture, délais d'attente du serveur, service worker hors ligne / lent, réparation
import json, os, subprocess, time, sys
from playwright.sync_api import sync_playwright
DEMO='http://localhost:8899/index.html'
SW='http://localhost:8897/'
FLAG='/tmp/mc-slow.json'
ok=[]; bad=[]
def check(name, cond, info=''):
    (ok if cond else bad).append(name); print(('OK  ' if cond else 'BAD ')+name, info if not cond else '')
def server(slow=None):
    if slow: json.dump(slow, open(FLAG,'w'))
    elif os.path.exists(FLAG): os.remove(FLAG)
    pr=subprocess.Popen(['python3','/home/claude/tests/slow_server.py']); time.sleep(0.8); return pr

with sync_playwright() as p:
    b=p.chromium.launch()
    def newpage():
        ctx=b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg=ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.errs=errs; return ctx,pg

    # ---------- A. écran d'ouverture ----------
    ctx,pg=newpage()
    pg.route('**/js/v-kid.js*', lambda r: r.abort())
    pg.goto(DEMO); pg.wait_for_timeout(300)
    # v-kid manquant : l'appli démarre quand même (connexion) — le message n'est visible qu'avant le démarrage
    check('A1 appli démarre malgré un fichier manquant', pg.query_selector('.kidbtn') is not None or pg.query_selector('.loading') is not None)
    ctx.close()

    ctx,pg=newpage()
    pg.route('**/js/app.js*', lambda r: r.abort())
    pg.goto(DEMO); pg.wait_for_timeout(500)
    t=pg.inner_text('#app')
    check('A2 fichier manquant → message clair', "n'a pas pu être chargé" in t and 'app.js' in t, t)
    check('A2 boutons Réessayer / Réparer', pg.is_visible('#bootbtns'))
    ctx.close()

    ctx,pg=newpage()
    pg.route('**/js/app.js*', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.MC=window.MC||{};MC.app={start:function(){ throw new Error("boum") }};'))
    pg.goto(DEMO); pg.wait_for_timeout(500)
    t=pg.inner_text('#app')
    check('A3 erreur au démarrage → message', "pas pu démarrer" in t and 'boum' in t, t)
    ctx.close()

    # ---------- B. le serveur ne répond pas ----------
    mode={'roster':'hang','login':'hang'}; calls=[]
    ROSTER={'ok':True,'joueurs':[{'id':'k1','prenom':'Tom','couleur':'#38E8FF'},{'id':'k2','prenom':'Lina','couleur':'#FF4FA3'}]}
    def api(route):
        req=json.loads(route.request.post_data or '{}'); calls.append(req.get('action'))
        m=mode.get(req.get('action'),'ok')
        if m=='hang': return   # jamais de réponse
        if req.get('action')=='roster': route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body=json.dumps(ROSTER)); return
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body=json.dumps({'ok':False,'error':'code','message':'Code incorrect.','reste':4}))
    def cfg(route):
        r=route.fetch(); body=r.text().replace("API_URL: ''", "API_URL: 'http://localhost:8899/fake-api', TIMEOUTS: { read: 1500, retry: 1500, write: 2000 }")
        route.fulfill(response=r, body=body)
    ctx,pg=newpage()
    pg.route('**/js/config.js*', cfg); pg.route('**/fake-api', api)
    pg.goto(DEMO); pg.evaluate('localStorage.clear()'); calls.clear(); pg.reload()
    pg.wait_for_timeout(1000)
    check('B1 chargement en cours', pg.query_selector('.loading') is not None)
    pg.wait_for_timeout(3600)
    t=pg.inner_text('#app')
    check('B1 roster sans réponse → message + Réessayer', 'ne répond pas' in t and pg.query_selector('[data-act="reload"]') is not None, t[:200])
    check('B1 relancé une seule fois tout seul', calls.count('roster')==2, calls)
    mode['roster']='ok'
    pg.click('[data-act="reload"]'); pg.wait_for_timeout(600)
    check('B2 Réessayer → la liste des joueurs', pg.query_selector('.kidbtn') is not None)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300)
    for c in '1234': pg.click('.modal [data-k="%s"]'%c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(400)
    check('B3 Vérification…', 'Vérification' in pg.inner_text('.modal .msg'))
    pg.wait_for_timeout(4000)
    m=pg.inner_text('.modal .msg')
    check('B3 connexion sans réponse → message, pavé libéré', 'ne répond pas' in m and calls.count('login')==2, (m, calls))
    mode['login']='ok'
    for c in '1234': pg.click('.modal [data-k="%s"]'%c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(800)
    check('B4 on peut retaper son code', 'Code incorrect' in pg.inner_text('.modal .msg'), pg.inner_text('.modal .msg'))
    check('B pas d\'erreur JS', not pg.errs, pg.errs)
    ctx.close()

    # ---------- C. service worker ----------
    srv=server()
    try:
        ctx,pg=newpage()
        pg.goto(SW); pg.evaluate("localStorage.clear(); localStorage.setItem('mc-sw','1')"); pg.reload()
        pg.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=10000)
        pg.wait_for_timeout(1500)
        keys=pg.evaluate("caches.open('mc-shell-1').then(c=>c.keys()).then(ks=>ks.map(k=>k.url))")
        check('C1 copie de l\'appli gardée', SW in keys and sum('?v=' in k for k in keys)>=20, len(keys))
        # hors ligne : le serveur s'arrête
        srv.terminate(); srv.wait(); time.sleep(0.3)
        t0=time.time(); pg.reload(); pg.wait_for_selector('.kidbtn', timeout=8000); dt=time.time()-t0
        check('C2 hors ligne : l\'appli s\'ouvre', True, dt)
        # réseau très lent sur la page
        srv=server({'/':8})
        t0=time.time(); pg.reload(); pg.wait_for_selector('.kidbtn', timeout=9000); dt=time.time()-t0
        check('C3 réseau lent : ouverte en < 6 s depuis la copie', dt<6, dt)
        srv.terminate(); srv.wait(); srv=server()
        pg.wait_for_timeout(500)
        # réparer : ?reset=1 (on reste connecté) puis ?reset=2 (tout effacer)
        pg.evaluate("localStorage.setItem('mc-recents', JSON.stringify(['z']))")
        pg.goto(SW+'?reset=1'); pg.wait_for_timeout(2500)
        check('C4 reset=1 : adresse propre, appli ouverte', '?reset' not in pg.url and pg.evaluate("localStorage.getItem('mc-recents')") is not None and pg.query_selector('.kidbtn') is not None, pg.url)
        pg.goto(SW+'?reset=2'); pg.wait_for_timeout(2500)
        check('C5 reset=2 : données de l\'appareil effacées', pg.evaluate("localStorage.getItem('mc-recents')") is None and pg.query_selector('.kidbtn') is not None)
        check('C pas d\'erreur JS', not pg.errs, pg.errs)
        ctx.close()
    finally:
        srv.terminate()
        if os.path.exists(FLAG): os.remove(FLAG)
    b.close()
print('\n%d OK, %d BAD %s' % (len(ok), len(bad), bad))
