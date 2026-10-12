# D. message « C'est long » + mise à jour de version avec le service worker
import json, os, subprocess, time
from playwright.sync_api import sync_playwright
SW='http://localhost:8897/'; FLAG='/tmp/mc-slow.json'; SITE='/home/claude/site-demo'
def server(slow=None):
    if slow: json.dump(slow, open(FLAG,'w'))
    elif os.path.exists(FLAG): os.remove(FLAG)
    pr=subprocess.Popen(['python3','/home/claude/tests/slow_server.py']); time.sleep(0.8); return pr
res=[]
def check(n,c,i=''): res.append(c); print(('OK  ' if c else 'BAD ')+n, '' if c else i)
srv=server({'/js/app.js':11})
idx=open(SITE+'/index.html').read()
import re
V=int(re.search(r'\?v=(\d+)', idx).group(1)); N=V+1
try:
    with sync_playwright() as p:
        b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(SW, wait_until='commit'); pg.wait_for_timeout(9800)
        t=pg.inner_text('#app')
        check('D1 « C\'est long » + boutons', "C'est long" in t and pg.is_visible('#bootbtns'), t)
        pg.wait_for_selector('.kidbtn', timeout=8000)
        check('D1 puis l\'appli s\'ouvre normalement', True)
        srv.terminate(); srv.wait(); srv=server()
        pg.evaluate("localStorage.setItem('mc-sw','1')"); pg.reload()
        pg.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=10000); pg.wait_for_timeout(1500)
        # nouvelle version publiée
        open(SITE+'/index.html','w').write(idx.replace('?v=%d'%V,'?v=%d'%N))
        open(SITE+'/js/config.js','a').write('\nwindow.__ver=%d;\n'%N)
        pg.reload(); pg.wait_for_selector('.kidbtn', timeout=8000); pg.wait_for_timeout(1500)
        check('D2 nouvelle version chargée', pg.evaluate('window.__ver')==N)
        keys=pg.evaluate("caches.open('mc-shell-1').then(c=>c.keys()).then(ks=>ks.map(k=>k.url))")
        v13=sum(('?v=%d'%N) in k for k in keys); v12=sum(('?v=%d'%V) in k for k in keys)
        check('D2 copie à jour (v13 complète, v12 gardée en secours)', v13>=19 and v12>=19, (v13,v12))
        srv.terminate(); srv.wait()
        pg.reload(); pg.wait_for_selector('.kidbtn', timeout=8000)
        check('D3 hors ligne après mise à jour : version 13', pg.evaluate('window.__ver')==N)
        check('D pas d\'erreur JS', not errs, errs)
        b.close()
finally:
    srv.terminate()
    open(SITE+'/index.html','w').write(idx)
    c=open(SITE+'/js/config.js').read().replace('\nwindow.__ver=%d;\n'%N,''); open(SITE+'/js/config.js','w').write(c)
    if os.path.exists(FLAG): os.remove(FLAG)
print(sum(res),'OK /',len(res))
