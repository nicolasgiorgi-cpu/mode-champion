# Nouveautés v8 : échauffement guidé, retour, détails, erreur d'envoi, bilan, décisions
import sys
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
OUT='/tmp/claude-0/-home-claude-mode-champion/a9e1937c-c3f2-5869-830c-450b35966146/scratchpad/shots/'
W,H,T,tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]=='1', sys.argv[4]) if len(sys.argv)>4 else (390,844,True,'ph')
errs=[]
def pin(pg, code):
    for c in code: pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(40)
def shot(pg, name): pg.screenshot(path=OUT+tag+'-'+name+'.png')
def acts(pg): return pg.eval_on_selector_all('[data-act]','els=>els.filter(e=>e.offsetParent).map(e=>e.getAttribute("data-act"))')
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':W,'height':H}, has_touch=T, is_mobile=T); pg=ctx.new_page(); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
    pg.on('console', lambda m: errs.append(('console', m.text)) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    # --- séance Cros : échauffement guidé
    pg.goto(BASE+'#/go/cros'); pg.wait_for_timeout(900); shot(pg,'01-warm-ready')
    assert 'rtGo' in acts(pg), acts(pg)
    pg.click('[data-act="rtGo"]'); pg.wait_for_timeout(3600); shot(pg,'02-warm-run')
    t1=pg.inner_text('[data-rtl]'); pg.wait_for_timeout(1200); t2=pg.inner_text('[data-rtl]'); print('chrono', t1, '->', t2)
    pg.click('[data-act="rtNext"]'); pg.wait_for_timeout(400); print('étape', pg.inner_text('.run h1'))
    pg.click('[data-act="rtPrev"]'); pg.wait_for_timeout(400); print('retour étape', pg.inner_text('.run h1'))
    pg.click('[data-act="rtPause"]'); pg.wait_for_timeout(300); print('pause', 'REPRENDRE' in pg.inner_text('.rtctl').upper())
    pg.click('.infobtn'); pg.wait_for_timeout(400); shot(pg,'03-warm-info'); print('fiche', pg.inner_text('.modal h2'), '|', pg.inner_text('.modal .fiche')[:80].replace('\n',' '))
    pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(500); shot(pg,'04-exo1')
    print('retour visible', pg.query_selector('[data-act="runBack"]') is not None)
    pg.click('[data-act="runBack"]'); pg.wait_for_timeout(500); print('après retour', pg.inner_text('.run h1'))
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(500)
    # suspension (temps) : GO puis j'ai lâché
    pg.click('[data-act="runGo"]'); pg.wait_for_timeout(3800); pg.click('[data-act="runLetGo"]'); pg.wait_for_timeout(400)
    print('phase après lâché', acts(pg)[:6])
    pg.click('[data-act="runBack"]'); pg.wait_for_timeout(400); print('après retour série', pg.inner_text('.run .hud'), acts(pg)[:5])
    # tractions (répétitions) : détails
    pg.evaluate("()=>{}")
    # aller jusqu'au retour au calme rapidement
    n=0
    while n<80:
        n+=1
        a=acts(pg)
        if 'rtGo' in a and 'TERMINER LA SÉANCE' in pg.inner_text('.run').upper(): break
        for x in ['runSetDone','runFeel','runSkipRest','runTour','runGo','runNextStep']:
            if x in a:
                if x=='runFeel': pg.click('[data-act="runFeel"][data-v="bien"]')
                elif x=='runGo':
                    pg.click('[data-act="runGo"]'); pg.wait_for_timeout(3600)
                    if pg.query_selector('[data-act="runLetGo"]'): pg.click('[data-act="runLetGo"]')
                else: pg.click('[data-act="%s"] >> visible=true'%x)
                break
        pg.wait_for_timeout(200)
    shot(pg,'05-calme-ready'); print('calme', pg.inner_text('.run h1'))
    pg.click('[data-act="rtGo"]'); pg.wait_for_timeout(3500); shot(pg,'06-calme-run')
    # envoi qui échoue
    pg.evaluate("()=>{ window.__save = MC.saveSessions; MC.saveSessions = function(){ return Promise.reject({}); }; }")
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(800); shot(pg,'07-send-error'); print('erreur', pg.inner_text('.run h1'), '|', pg.inner_text('.run .lead')[:90])
    pg.evaluate("()=>{ MC.saveSessions = window.__save; }")
    pg.click('[data-act="runResend"]'); pg.wait_for_timeout(1500); print('après renvoi', pg.url)
    # --- bilan guidé
    pg.goto(BASE+'#/bilan/go'); pg.wait_for_timeout(900); shot(pg,'08-bilan-warm')
    pg.click('[data-act="brWarmDone"]'); pg.wait_for_timeout(500); shot(pg,'09-bilan-test1')
    print('bilan test', pg.inner_text('.run h1'), 'retour', pg.query_selector('[data-act="brBack"]') is not None)
    pg.click('.infobtn'); pg.wait_for_timeout(300); print('fiche test', pg.inner_text('.modal h2')); pg.click('.modal button[data-i="0"]')
    pg.click('[data-act="brBack"]'); pg.wait_for_timeout(500); print('bilan après retour', pg.inner_text('.run h1'))
    # tractions élastique
    pg.evaluate("()=>{}")
    print('errors', errs)
    b.close()
