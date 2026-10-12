# Appareil partagé : verrou de l'espace parent, « C'est bien toi ? », changer de joueur
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
OUT='/tmp/claude-0/-home-claude-mode-champion/a9e1937c-c3f2-5869-830c-450b35966146/scratchpad/shots/'
errs=[]
def pin(pg, code):
    for c in code: pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(40)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    print('1 tom', pg.url, 'pas toi visible', pg.query_selector('[data-act="switchKid"]') is not None)
    pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(700); pg.click('a[href="#/adultes"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(200); pin(pg,'123456'); pg.wait_for_timeout(1200)
    print('2 parent', pg.url)
    pg.goto(BASE+'#/parent/plus'); pg.wait_for_timeout(700)
    pg.click('a.switch:has-text("Côté joueur")'); pg.wait_for_timeout(800); print('3 côté joueur', pg.url)
    pg.goto(BASE+'#/parent'); pg.wait_for_timeout(800); print('4 parent verrouillé', pg.url, '|', pg.inner_text('h1').replace('\n',' '))
    pg.screenshot(path=OUT+'pt-lock.png')
    pin(pg,'123456'); pg.wait_for_timeout(1200); print('5 déverrouillé', pg.url)
    pg.goto(BASE+'#/parent/classement'); pg.wait_for_timeout(1000); print('6 classement sans code', pg.url)
    pg.evaluate("localStorage.setItem('mc-adult-open', JSON.stringify(Date.now()-1000))")
    pg.goto(BASE+'#/parent'); pg.wait_for_timeout(700); print('7 après 10 min', pg.url)
    pin(pg,'123456'); pg.wait_for_timeout(1200)
    pg.goto(BASE+'#/parent/plus'); pg.wait_for_timeout(700)
    pg.click('[data-act="toggleShared"]'); pg.wait_for_timeout(300)
    pg.goto(BASE+'#/semaine'); pg.wait_for_timeout(600); pg.goto(BASE+'#/parent/plus'); pg.wait_for_timeout(900); print('8 partage coupé', pg.url)
    pg.click('[data-act="toggleShared"]'); pg.wait_for_timeout(300)
    # 2e enfant sur l'appareil
    pg.goto(BASE+'#/semaine'); pg.wait_for_timeout(700); pg.click('[data-act="switchKid"]'); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("LOU") >> nth=0'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    print('9 lou', pg.url, pg.inner_text('.topbar .tb-who')[:20].replace('\n',' '), '| pas toi', pg.inner_text('[data-act="switchKid"]'))
    pg.evaluate("localStorage.setItem('mc-kid-seen', JSON.stringify(Date.now()-31*60000))")
    pg.goto(BASE+'#/profil'); pg.wait_for_timeout(900); print('10 qui', pg.url, '|', pg.inner_text('h1'))
    pg.screenshot(path=OUT+'pt-qui.png')
    pg.click('[data-act="quiOui"]'); pg.wait_for_timeout(800); print('11 après oui', pg.url)
    pg.evaluate("localStorage.setItem('mc-kid-seen', JSON.stringify(Date.now()-31*60000))")
    pg.goto(BASE+'#/semaine'); pg.wait_for_timeout(800); pg.click('[data-act="quiAutre"]'); pg.wait_for_timeout(700)
    print('12 autre -> pin', pg.url, pg.query_selector('.modal .pin-zone') is not None)
    print('errs', errs); b.close()
