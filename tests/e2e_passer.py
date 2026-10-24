# Passer le téléphone à son enfant (parent et éduc) : ▶ en haut à droite, code de l enfant, Rendre le téléphone.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_passer.py
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
def pin(pg,code,sel='#adultzone'):
    for c in code: pg.click(sel+' [data-k="%s"]'%c); pg.wait_for_timeout(50)
def kpin(pg,code):
    for c in code: pg.click('.modal [data-k="%s"]'%c); pg.wait_for_timeout(50)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(BASE+'#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes=pg.evaluate('MC.demo.CODES'); print(codes)
    # PARENT
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg,'1357'); pg.wait_for_timeout(1500)
    print('parent url',pg.url)
    pg.screenshot(path='/tmp/p_home.png',clip={'x':0,'y':0,'width':390,'height':300})
    pg.click('.tb-pass'); pg.wait_for_timeout(1500)
    print('après passer', pg.url, bool(pg.query_selector('.modal .pin-zone')))
    pg.screenshot(path='/tmp/p_pin.png')
    kpin(pg,str(codes['enfant'])); pg.wait_for_timeout(1800)
    print('enfant', pg.url)
    pg.evaluate('window.scrollTo(0,document.body.scrollHeight)'); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/k_bas.png')
    pg.click('text=Rendre le téléphone'); pg.wait_for_timeout(1200)
    print('rendre', pg.url, pg.inner_text('main')[:120].replace('\n',' | '))
    pin(pg,'1357'); pg.wait_for_timeout(1500); print('parent revenu', pg.url)
    pg.click('.tb-pass'); pg.wait_for_timeout(1500); print('2e passage direct', pg.url)
    # EDUC
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(600)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg,'2468'); pg.wait_for_timeout(1500)
    print('educ', pg.url)
    pg.screenshot(path='/tmp/e_home.png',clip={'x':0,'y':0,'width':390,'height':200})
    pg.goto(BASE+'#/educ/reglages'); pg.wait_for_timeout(900); pg.screenshot(path='/tmp/e_regl.png',clip={'x':0,'y':0,'width':390,'height':560})
    pg.click('text=La fiche de Tom'); pg.wait_for_timeout(1200); pg.screenshot(path='/tmp/e_fiche.png',clip={'x':0,'y':0,'width':390,'height':260})
    pg.goto(BASE+'#/educ/reglages'); pg.wait_for_timeout(900); pg.evaluate('window.scrollTo(0,40)'); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/e_scroll.png',clip={'x':0,'y':0,'width':390,'height':160})
    # iPad
    pg.set_viewport_size({'width':1024,'height':768}); pg.goto(BASE+'#/educ/entrainements'); pg.wait_for_timeout(1000)
    pg.screenshot(path='/tmp/e_ipad.png',clip={'x':0,'y':0,'width':1024,'height':200})
    b.close()
print('ERR',errs)
