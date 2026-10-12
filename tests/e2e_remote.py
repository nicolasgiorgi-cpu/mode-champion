import json
from playwright.sync_api import sync_playwright
admin=open('/tmp/admin_code.txt').read().strip()
BASE='http://localhost:8897/index.html'
errs=[]
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}); pg=ctx.new_page()
    pg.on('pageerror', lambda e: errs.append((pg.url, str(e), getattr(e,'stack','')[:300])))
    pg.on('console', lambda m: errs.append((pg.url, m.text, m.location)) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(200); pin(pg, admin); pg.wait_for_timeout(1500)
    print('educ url', pg.url)
    pg.goto(BASE+'#/educ/ajouter'); pg.wait_for_timeout(800); pg.fill('#ap','Tom'); pg.fill('#an','Famille Test'); pg.click('[data-act="addPlayer"]'); pg.wait_for_timeout(1200)
    code=''.join(pg.eval_on_selector_all('.codebig span','els=>els.map(e=>e.textContent)'))
    lines=pg.inner_text('.modal')
    print('kid code', code, '| fam code in text:', [w for w in lines.split() if w.isdigit() and len(w)==6])
    pg.click('.modal button:has-text("Fermer")'); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.clear()"); pg.goto(BASE+'#/connexion'); pg.reload(); pg.wait_for_timeout(1000)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, code); pg.wait_for_timeout(1500)
    print('after login', pg.url)
    pg.click('[data-act="firstNext"]'); pg.wait_for_timeout(300); pin(pg,'7391'); pg.wait_for_timeout(400); pin(pg,'7391'); pg.wait_for_timeout(1500)
    pg.goto(BASE+'#/noter?type=cros'); pg.wait_for_timeout(1000); pg.click('[data-act="nSave"]'); pg.wait_for_timeout(2000)
    print('bravo url', pg.url, pg.inner_text('.reward >> nth=0'))
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(1000)
    pg.fill('#b_planche','75'); pg.fill('#b_pompes','8'); pg.wait_for_timeout(200); pg.click('#bil_send'); pg.wait_for_timeout(2000)
    print('modal', pg.inner_text('.modal')[:200].replace('\n',' | '))
    pg.click('.modal button'); pg.wait_for_timeout(1000)
    pg.goto(BASE+'#/classement'); pg.wait_for_timeout(1500); print('classement ok', 'L\'ARÈNE' in pg.inner_text('h1').upper())
    print('errors', errs)
    b.close()
