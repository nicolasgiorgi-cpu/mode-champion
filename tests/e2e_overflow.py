# Aucun écran ne doit dépasser la largeur du téléphone
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
def pin(pg, code):
    for c in code: pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(40)
def chk(pg, route):
    pg.goto(BASE+route); pg.wait_for_timeout(900)
    w=pg.evaluate("document.documentElement.scrollWidth")
    bad=pg.evaluate("Array.from(document.querySelectorAll('main *')).filter(function(e){var r=e.getBoundingClientRect();return r.width>0&&r.right>window.visualViewport.width+1}).slice(0,4).map(function(e){return e.tagName+'.'+(typeof e.className==='string'?e.className:'')+' '+Math.round(e.getBoundingClientRect().right)})")
    print(('OK ' if w<=360+1 else 'TROP LARGE ')+route, w, bad if w>361 else '')
def pick(pg, nom):
    pg.click('[data-act="adultPick"][data-nom="%s"]' % nom); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':360,'height':760}, is_mobile=True, has_touch=True); pg.add_init_script("window.__MC_QUIET=1")
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(500); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    chk(pg,'#/connexion')
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    for r in ['#/semaine','#/profil','#/progression','#/niveaux','#/trophees','#/classement','#/reglages','#/bilan','#/exo/pompes?jour=cros','#/jour/dupont','#/go/cros','#/bilan/go','#/echauffement','#/calme','#/guide','#/nouveautes','#/bienvenue','#/noter']: chk(pg,r)
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500); pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(200); pick(pg, 'Tom'); pin(pg,'1357'); pg.wait_for_timeout(1200)
    for r in ['#/parent','#/parent/progres','#/parent/classement','#/parent/plus','#/parent/nouveautes','#/parent/bienvenue']: chk(pg,r)
    pg.evaluate("localStorage.removeItem('mc-adult'); localStorage.removeItem('mc-adult-open')"); pg.goto(BASE+'#/connexion'); pg.reload(); pg.wait_for_timeout(600)
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500); pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(200); pick(pg, 'Coach Nico'); pin(pg,'2468'); pg.wait_for_timeout(1500)
    for r in ['#/educ','#/educ/joueurs','#/educ/classement','#/educ/outils','#/educ/progres','#/educ/familles','#/educ/ajouter','#/educ/nouveautes','#/educ/bienvenue']: chk(pg,r)
    pg.goto(BASE+'#/educ/joueurs'); pg.wait_for_timeout(800); pg.click('a.li[href^="#/educ/joueur"] >> nth=0'); pg.wait_for_timeout(1200)
    w=pg.evaluate("document.documentElement.scrollWidth"); print(('OK ' if w<=361 else 'TROP LARGE ')+'fiche joueur', w)
    b.close()
