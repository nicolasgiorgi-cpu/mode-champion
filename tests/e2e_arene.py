from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
import os
OUT=os.environ.get('OUT','/tmp/arene-shots/'); os.makedirs(OUT, exist_ok=True)
errs=[]
def pin(pg, code):
    for c in code: pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(40)
def pick(pg, nom):
    pg.click('[data-act="adultPick"][data-nom="%s"]' % nom); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(200); pick(pg, 'Tom'); pin(pg,'1357'); pg.wait_for_timeout(1200)
    pg.goto(BASE+'#/parent/classement'); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'ar-parent.png', full_page=True)
    print('parent', pg.inner_text('main section.row')[:90].replace('\n',' '), '| lignes', pg.eval_on_selector_all('ol.list li','e=>e.length'))
    pg.click('[data-act="arTest"][data-v="pompes"]'); pg.wait_for_timeout(300); print('pompes lignes', pg.eval_on_selector_all('ol.list li','e=>e.length'))
    pg.evaluate("localStorage.clear()"); pg.goto(BASE+'#/adultes'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(200); pick(pg, 'Coach Nico'); pin(pg,'2468'); pg.wait_for_timeout(1500)
    pg.goto(BASE+'#/educ/classement'); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'ar-educ.png', full_page=True)
    print('éduc lignes', pg.eval_on_selector_all('ol.list li','e=>e.length'))
    pg.click('[data-act="arLv"][data-v="3"]'); pg.wait_for_timeout(300); print('N3 lignes', pg.eval_on_selector_all('ol.list li','e=>e.length'))
    pg.click('[data-act="arMode"][data-v="prog"]'); pg.wait_for_timeout(300); print('prog lignes', pg.eval_on_selector_all('ol.list li','e=>e.length'), pg.inner_text('main p.small >> nth=-1')[:100])
    print('errs', errs); b.close()
