from playwright.sync_api import sync_playwright
import sys
BASE='http://localhost:8899/index.html'
errs=[]
W,H,TOUCH,NAME = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]=='1', sys.argv[4]) if len(sys.argv)>4 else (390,844,True,'phone')
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"]'%(c,c)); pg.wait_for_timeout(60)
def keys(pg, ks):
    for k in ks:
        pg.click('#numpad [data-np="%s"]' % k); pg.wait_for_timeout(50)
def shot(pg, n): pg.wait_for_timeout(250); pg.screenshot(path='/home/claude/shots/bg-%s-%s.png' % (NAME, n))
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=1, has_touch=TOUCH, is_mobile=TOUCH and W<700)
    pg=ctx.new_page(); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900); shot(pg,'00-page')
    pg.click('a[href="#/bilan/go"]'); pg.wait_for_timeout(900); shot(pg,'01-echauffement')
    pg.click('[data-act="brWarmDone"]'); pg.wait_for_timeout(600); shot(pg,'02-flamant-pret')
    # flamant : 4 essais (2 faits, 2 passés)
    pg.click('[data-act="brGo"]'); pg.wait_for_timeout(5300); shot(pg,'03-flamant-chrono')
    pg.click('[data-act="brStop"]'); pg.wait_for_timeout(400); shot(pg,'04-flamant-resultat')
    if TOUCH:
        pg.tap('#br_c'); pg.wait_for_timeout(300); keys(pg, ['2','2'])
    else:
        pg.fill('#br_c','22'); pg.dispatch_event('#br_c','input')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300)
    assert 'essai' in pg.text_content('.run .hd').lower()
    pg.click('[data-act="brSkipEssai"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="brGo"]'); pg.wait_for_timeout(4200); pg.click('[data-act="brStop"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="brSkipEssai"]'); pg.wait_for_timeout(400); shot(pg,'05-repos')
    assert pg.is_visible('[data-act="brRestSkip"]')
    pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(500); shot(pg,'06-saut')
    # saut : 3 champs
    if TOUCH:
        pg.tap('#br_a'); pg.wait_for_timeout(300); keys(pg, ['1','4','5','next','1','5','2','next','1','4','8']); pg.click('h1')
    else:
        for i,v in (('br_a','145'),('br_b','152'),('br_c3','148')): pg.fill('#'+i, v); pg.dispatch_event('#'+i,'input')
    pg.wait_for_timeout(200); shot(pg,'07-saut-rempli')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(400)
    # navette
    pg.click('[data-act="brGo"]'); pg.wait_for_timeout(5000); shot(pg,'08-navette-chrono')
    pg.click('[data-act="brStop"]'); pg.wait_for_timeout(300); shot(pg,'09-navette-res')
    nav = pg.input_value('#br_c'); print('navette', nav)
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(400)
    # suspension : chrono puis correction en min/s
    pg.click('[data-act="brGo"]'); pg.wait_for_timeout(4300); pg.click('[data-act="brStop"]'); pg.wait_for_timeout(300); shot(pg,'10-susp-res')
    if TOUCH:
        pg.tap('#br_m'); pg.wait_for_timeout(300); keys(pg, ['0','4','8'])
    else:
        pg.fill('#br_m','0'); pg.dispatch_event('#br_m','input'); pg.fill('#br_s','48'); pg.dispatch_event('#br_s','input')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(400)
    # tractions : 3 → élastique moyen 7
    for i in range(3): pg.click('[data-act="brPlus"]')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); shot(pg,'11-tract-elas')
    pg.click('[data-act="brEl"][data-v="20"]'); pg.wait_for_timeout(300)
    for i in range(7): pg.click('[data-act="brPlus"]')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(400)
    # pompes : on passe le test
    pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(300)
    # planche : passée aussi
    pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(300)
    # squats : minute, +1 x 5 puis arrêt
    pg.click('[data-act="brGo"]'); pg.wait_for_timeout(3800)
    for i in range(5): pg.click('[data-act="brPlus"]')
    shot(pg,'12-squats-minute')
    pg.click('[data-act="brStopMin"]'); pg.wait_for_timeout(300); shot(pg,'13-squats-res')
    assert pg.input_value('#br_v')=='5', pg.input_value('#br_v')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(400)
    # chaise, corde (2 essais), corde1, burpees : passés sauf corde
    pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(300)
    for i in range(12): pg.click('[data-act="brPlus"]')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300)
    for i in range(20): pg.click('[data-act="brPlus"]')
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(300); pg.click('[data-act="brRestSkip"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(500); shot(pg,'14-recap')
    recap = pg.text_content('.run .list'); print(recap)
    # pause + reprise : l'état est gardé
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(800)
    assert 'Reprendre' in pg.text_content('a[href="#/bilan/go"]')
    vals = pg.evaluate("(function(){var o={};document.querySelectorAll('[data-bil]').forEach(function(i){o[i.id]=i.value});return o})()"); print('form', vals)
    pg.click('a[href="#/bilan/go"]'); pg.wait_for_timeout(700)
    pg.click('[data-act="brSend"]'); pg.wait_for_timeout(1600); shot(pg,'15-envoye')
    pg.click('.modal .btn'); pg.wait_for_timeout(800)
    recs = pg.evaluate("MC.app.S.me.records.filter(r=>r.bilan==String(MC.logic.currentBilan().n)).map(r=>r.test+':'+r.valeur+(r.extra?JSON.stringify(r.extra):'')).join(' ')")
    print('records', recs)
    assert 'saut:152' in recs and 'susp:48' in recs and 'squats:5' in recs and 'corde:20' in recs and '"elastique":"20"' in recs and 'flamant:' in recs
    print('progress after send', pg.evaluate("MC.bilanGuide.progress()"))
    b.close()
print('ERRS', errs)
