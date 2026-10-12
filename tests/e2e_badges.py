import re
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
cfg=open('/home/claude/mode-champion/js/config.js').read()
cfg=re.sub(r"API_URL: '[^']*'", "API_URL: ''", cfg)
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(60)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h,name) in [(390,844,'phone'),(1024,1366,'ipad')]:
        ctx=b.new_context(viewport={'width':w,'height':h}, device_scale_factor=1)
        ctx.route(re.compile(r'.*/js/config\.js.*'), lambda r: r.fulfill(status=200, content_type='application/javascript', body=cfg))
        pg=ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(BASE); pg.wait_for_timeout(700)
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(1000)
        pg.evaluate("""async () => {
          const tok = MC.app.S.kid.token; const day = d => { const x=new Date(); x.setDate(x.getDate()-d); return x.toISOString().slice(0,10); };
          for (let i=1;i<=26;i++) await MC.api.call('logSession',{token:tok,type:'cros',date:day(i),mode:'rapide'});
          for (let i=1;i<=11;i++) await MC.api.call('logSession',{token:tok,type:'capuozzo',date:day(i),mode:'rapide'});
          for (let i=1;i<=9;i++) await MC.api.call('logSession',{token:tok,type:'meafou',date:day(i),mode:'rapide'});
        }""")
        # une séance Meafou de plus en N4 via la saisie rapide → 10e séance (bronze) + Champion
        pg.goto(BASE+'#/semaine'); pg.wait_for_timeout(800)
        pg.evaluate("MC.app.loadMe(true)"); pg.wait_for_timeout(500)
        pg.evaluate("""() => { const before = MC.app.S.stats; return MC.saveSessions([{type:'meafou',date:new Date().toISOString().slice(0,10),mode:'rapide',ressenti:'bien',details:{niveau:4}}],[]); }""")
        pg.wait_for_timeout(1800)
        pg.screenshot(path='/home/claude/shots/b-%s-bravo.png'%name, full_page=True)
        pg.goto(BASE+'#/trophees'); pg.wait_for_timeout(1000)
        pg.screenshot(path='/home/claude/shots/b-%s-trophees.png'%name, full_page=True)
        ctx.close()
    b.close()
print('ERRS', errs)
