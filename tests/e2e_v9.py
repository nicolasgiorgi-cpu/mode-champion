# v9 : niveaux verrouillés, suivi parent/éduc/joueur, mon enfant, progrès du groupe
import sys
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
OUT='/tmp/claude-0/-home-claude-mode-champion/a9e1937c-c3f2-5869-830c-450b35966146/scratchpad/shots/'
W,H,T,tag = (int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]=='1', sys.argv[4]) if len(sys.argv)>4 else (390,844,True,'ph')
errs=[]
def pin(pg, code):
    for c in code: pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(40)
def shot(pg, name, full=False): pg.screenshot(path=OUT+tag+'-v9-'+name+'.png', full_page=full)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':W,'height':H}, has_touch=T, is_mobile=T); pg=ctx.new_page(); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
    pg.on('console', lambda m: errs.append(('console', m.text)) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    # joueur : progression
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    pg.goto(BASE+'#/progression'); pg.wait_for_timeout(800); shot(pg,'01-kid-prog', True)
    print('kid prog rows', pg.eval_on_selector_all('.prow','e=>e.length'), 'séances', pg.eval_on_selector_all('.li.sess','e=>e.length'))
    if pg.query_selector('.li.sess summary'): pg.click('.li.sess summary >> nth=0'); pg.wait_for_timeout(300); print('détail séance', pg.inner_text('.li.sess .sbody >> nth=0')[:120].replace('\n',' | '))
    # parent
    pg.evaluate("localStorage.clear()"); pg.goto(BASE+'#/adultes'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(200); pin(pg,'123456'); pg.wait_for_timeout(1200)
    print('parent url', pg.url)
    shot(pg,'02-parent', True)
    pg.goto(BASE+'#/parent/progres'); pg.wait_for_timeout(800)
    print('bouton modifier niveaux', pg.query_selector('[data-act="lvEdit"]') is not None, 'chiffres visibles avant', pg.eval_on_selector_all('[data-act="lvPick"]','e=>e.length'))
    pg.click('[data-act="lvEdit"]'); pg.wait_for_timeout(300)
    print('chiffres après', pg.eval_on_selector_all('[data-act="lvPick"]','e=>e.length'))
    pg.click('[data-act="lvPick"][data-cle="pompes"][data-v="4"]'); pg.wait_for_timeout(200)
    print('changement affiché', pg.inner_text('.li.changed')[:60].replace('\n',' '))
    pg.click('[data-act="lvSave"]'); pg.wait_for_timeout(800)
    print('après enregistrement', pg.query_selector('[data-act="lvPick"]') is None, pg.inner_text('#toast'))
    # éduc
    pg.evaluate("localStorage.clear()"); pg.goto(BASE+'#/adultes'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(200); pin(pg,'654321'); pg.wait_for_timeout(1500)
    print('educ url', pg.url)
    pg.goto(BASE+'#/educ/reglages'); pg.wait_for_timeout(700)
    pg.click('[data-act="myKids"]'); pg.wait_for_timeout(300); shot(pg,'03-mykids')
    pg.click('.modal [data-kidpick] >> nth=0'); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    print('mon enfant', pg.inner_text('section.sec >> nth=0')[:100].replace('\n',' | '))
    shot(pg,'04-vestiaire', True)
    pg.goto(BASE+'#/educ/progres/bilans'); pg.wait_for_timeout(800); shot(pg,'05-progres', True)
    print('progrès lignes', pg.eval_on_selector_all('main .list .li','e=>e.length'))
    pg.click('[data-act="progTest"][data-v="navette"]'); pg.wait_for_timeout(300); print('navette', pg.inner_text('main h2')[:40])
    pg.goto(BASE+'#/educ/joueurs'); pg.wait_for_timeout(600); pg.click('#edlist a >> nth=0'); pg.wait_for_timeout(1200); pg.goto(pg.url.split('?')[0]+'?t=prepa'); pg.wait_for_timeout(900); shot(pg,'06-kid', True)
    print('éduc fiche : modifier niveaux', pg.query_selector('[data-act="lvEdit"]') is not None, 'chiffres', pg.eval_on_selector_all('[data-act="lvPick"]','e=>e.length'))
    print('errors', errs)
    b.close()
