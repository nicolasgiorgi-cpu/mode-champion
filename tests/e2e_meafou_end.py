# Repro : séance Meafou jusqu'au bout (démo locale)
import sys
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
W,H,T = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]=='1') if len(sys.argv)>3 else (1180,820,True)
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':W,'height':H}, has_touch=T, is_mobile=T); pg=ctx.new_page(); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
    pg.on('console', lambda m: errs.append(('console', m.text)) if m.type in ('error','warning') else None)
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(800)
    pg.evaluate("""()=>{ localStorage.clear(); }"""); pg.reload(); pg.wait_for_timeout(800)
    # connexion en démo : premier joueur de la liste, code 1234 ?
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300)
    for c in '2580': pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"]'%(c,c)); pg.wait_for_timeout(40)
    pg.wait_for_timeout(800); print('url', pg.url)
    pg.goto(BASE+'#/go/meafou'); pg.wait_for_timeout(900)
    n=0
    while n<200:
        n+=1
        if '#/bravo' in pg.url: break
        acts=pg.eval_on_selector_all('[data-act]','els=>els.filter(e=>e.offsetParent).map(e=>e.getAttribute("data-act"))')
        for a in ['runSetDone','runFeel','runSkipRest','runTour','runNextStep','runGo']:
            if a in acts:
                pg.click('[data-act="%s"] >> visible=true'%a if a!='runFeel' else '[data-act="runFeel"][data-v="bien"]'); break
        else:
            print('no act', acts); break
        pg.wait_for_timeout(250)
        if a=='runGo': pg.wait_for_timeout(200); pg.click('[data-act="runLetGo"]') if pg.query_selector('[data-act="runLetGo"]') else None
    pg.wait_for_timeout(1500)
    print('final url', pg.url, 'steps', n)
    print('toast', pg.inner_text('#toast'))
    print('errors', errs)
    b.close()
