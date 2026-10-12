from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
def pin(pg, code, sel='.modal'):
    for c in code:
        pg.click('.modal [data-k="%s"], #adultzone [data-k="%s"]'%(c,c)); pg.wait_for_timeout(60)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h,name,touch) in [(390,844,'phone',True),(820,1180,'ipad',True)]:
        ctx=b.new_context(viewport={'width':w,'height':h}, has_touch=touch, is_mobile=touch and w<700)
        pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script("window.__MC_QUIET=1")
        pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
        assert pg.is_visible('a[href="#/guide"]'), 'lien Aide sur la connexion'
        pg.click('a[href="#/guide"]'); pg.wait_for_timeout(700)
        pg.screenshot(path='/home/claude/shots/gu-%s-joueur.png'%name, full_page=True)
        # ouvrir toutes les cartes pour la capture complète
        pg.evaluate("document.querySelectorAll('details.gd').forEach(d=>d.open=true)"); pg.wait_for_timeout(300)
        pg.screenshot(path='/home/claude/shots/gu-%s-joueur-tout.png'%name, full_page=True)
        pg.click('[data-act="guideTab"][data-v="parent"]'); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelectorAll('details.gd').forEach(d=>d.open=true)"); pg.wait_for_timeout(200)
        pg.screenshot(path='/home/claude/shots/gu-%s-parent.png'%name, full_page=True)
        pg.click('[data-act="guideTab"][data-v="educ"]'); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelectorAll('details.gd').forEach(d=>d.open=true)"); pg.wait_for_timeout(200)
        pg.screenshot(path='/home/claude/shots/gu-%s-educ.png'%name, full_page=True)
        pg.click('.topbar [data-back]'); pg.wait_for_timeout(500); print(name, 'retour ->', pg.evaluate('location.hash'))
        # joueur : l'aide « ? » de la barre du haut ouvre le guide, et Retour ramène à l'écran d'avant
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(1000)
        pg.screenshot(path='/home/claude/shots/gu-%s-semaine.png'%name)
        pg.click('.topbar a[aria-label^="Aide"]'); pg.wait_for_timeout(500); pg.click('.topbar [data-back]'); pg.wait_for_timeout(700)
        assert '#/semaine' in pg.url, pg.url
        pg.goto(BASE+'#/profil'); pg.wait_for_timeout(800); assert pg.is_visible('.topbar a[aria-label^="Aide"]')
        pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(600); assert 'Comment ça marche' in pg.text_content('main')
        # parent
        pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(600); assert 'Comment ça marche' in pg.text_content('main')
        pin(pg,'123456'); pg.wait_for_timeout(1200)
        assert pg.is_visible('.topbar a[aria-label^="Aide"]'), 'aide parent'
        pg.click('.topbar a[aria-label^="Aide"]'); pg.wait_for_timeout(500)
        print(name, 'onglet parent ouvert :', pg.get_attribute('[data-act="guideTab"][data-v="parent"]','aria-selected'))
        ctx.close()
    b.close()
print('ERRS', errs)
