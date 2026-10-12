import json
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
def shot(pg,name,full=False):
    pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/shots/%s.png'%name, full_page=full)
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h,tag) in [(820,1180,'P'),(1180,820,'L'),(390,844,'M')]:
        ctx=b.new_context(viewport={'width':w,'height':h}, has_touch=True)
        pg=ctx.new_page()
        pg.on('pageerror', lambda e: errs.append((w,'pageerror',str(e))))
        pg.on('console', lambda m: errs.append((w,m.type,m.text)) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
        pg.goto(BASE); pg.wait_for_timeout(700)
        shot(pg,tag+'-01-connexion')
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(1200)
        shot(pg,tag+'-02-semaine')
        pg.goto(BASE+'#/jour/meafou'); pg.wait_for_timeout(800); shot(pg,tag+'-03-jour')
        pg.goto(BASE+'#/exo/squat?jour=meafou'); pg.wait_for_timeout(800); shot(pg,tag+'-04-exo')
        pg.goto(BASE+'#/go/meafou'); pg.wait_for_timeout(900); shot(pg,tag+'-05-run-warm')
        pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(400); shot(pg,tag+'-06-run-reps')
        pg.click('[data-act="runSetDone"]'); pg.wait_for_timeout(500); shot(pg,tag+'-07-run-rest')
        pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(300); pg.click('.modal button:has-text("Quitter sans")'); pg.wait_for_timeout(600)
        pg.goto(BASE+'#/go/cros'); pg.wait_for_timeout(900); pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="runGo"]'); pg.wait_for_timeout(5000); shot(pg,tag+'-08-run-time')
        pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(300); pg.click('.modal button:has-text("Quitter sans")'); pg.wait_for_timeout(600)
        pg.goto(BASE+'#/go/dupont'); pg.wait_for_timeout(900); pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="runGo"]'); pg.wait_for_timeout(300); pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(200); pg.click('.modal button:has-text("Continuer")'); pg.wait_for_timeout(200)
        pg.wait_for_timeout(3500); pg.click('[data-act="runInterStop"]'); pg.wait_for_timeout(300); pg.click('[data-act="runFeel"][data-v="bien"]'); pg.wait_for_timeout(400); shot(pg,tag+'-09-run-circuit')
        pg.click('[data-act="runTour"]'); pg.wait_for_timeout(400); pg.click('[data-act="runSkipRest"]'); pg.wait_for_timeout(200)
        pg.click('[data-act="runTour"]'); pg.wait_for_timeout(400); pg.click('[data-act="runSkipRest"]'); pg.wait_for_timeout(200)
        while pg.query_selector('[data-act="runTour"]'):
            pg.click('[data-act="runTour"]'); pg.wait_for_timeout(300)
            if pg.query_selector('[data-act="runSkipRest"]'): pg.click('[data-act="runSkipRest"]'); pg.wait_for_timeout(200)
        pg.click('[data-act="runFeel"][data-v="facile"]'); pg.wait_for_timeout(400); shot(pg,tag+'-10-run-calme')
        pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(1800); shot(pg,tag+'-11-bravo', True)
        pg.goto(BASE+'#/profil'); pg.wait_for_timeout(900); shot(pg,tag+'-12-profil', True)
        pg.goto(BASE+'#/classement'); pg.wait_for_timeout(900); shot(pg,tag+'-13-classement')
        pg.goto(BASE+'#/trophees'); pg.wait_for_timeout(900); shot(pg,tag+'-14-trophees')
        pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900); shot(pg,tag+'-15-bilan')
        ctx.close()
    print(json.dumps(errs, ensure_ascii=False))
    b.close()
