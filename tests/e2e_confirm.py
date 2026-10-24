from playwright.sync_api import sync_playwright
import datetime
BASE='http://localhost:8899/index.html'
errs=[]
def pad(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #adultzone [data-k="%s"]'%(c,c)); pg.wait_for_timeout(60)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    # ----- l'enfant envoie un bilan daté d'il y a 3 jours -----
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pad(pg,'2580'); pg.wait_for_timeout(900)
    assert pg.evaluate("!!localStorage.getItem('mc-me')"), 'profil gardé sur l appareil'
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(800)
    pg.evaluate("(function(){var b=MC.bilan.ensure(MC.app.S.me); b.v.pompes='21'; b.v.squats='44'; b.v.burpees='19'; MC.bilan.save();})()")
    pg.goto(BASE+'#/profil'); pg.wait_for_timeout(300); pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(800)
    d3 = (datetime.date.today() - datetime.timedelta(days=3)).isoformat()
    pg.fill('#bil_date', d3); pg.dispatch_event('#bil_date', 'change'); pg.wait_for_timeout(200)
    pg.screenshot(path='/home/claude/shots/cf-bilan-date.png')
    pg.click('#bil_send'); pg.wait_for_timeout(1200); pg.click('.modal .btn'); pg.wait_for_timeout(700)
    dates = pg.evaluate("[...new Set(MC.app.S.me.records.filter(r=>r.bilan==String(MC.logic.currentBilan().n)).map(r=>r.date))]")
    print('dates bilan', dates); assert dates == [d3], dates
    # rechargement : la semaine s'affiche tout de suite (profil gardé), sans attendre le serveur
    pg.goto(BASE+'#/semaine'); pg.reload(); pg.wait_for_timeout(60)
    quick = pg.evaluate("!!document.querySelector('.hudbar')"); print('semaine immédiate', quick)
    pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(600); pg.click('[data-act="logoutKid"]'); pg.wait_for_timeout(500)
    # ----- le parent : choix modifiables, rien n'est envoyé avant « Valider mes choix » -----
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(600); pad(pg,'123456'); pg.wait_for_timeout(1200)
    n = pg.locator('.decis').count(); print('résultats à confirmer', n); assert n >= 3
    first = pg.locator('.decis').first
    first.locator('[data-v="refuse"]').click(); pg.wait_for_timeout(150)
    assert 'on' in first.locator('[data-v="refuse"]').get_attribute('class')
    assert pg.is_visible('[data-decbar] >> nth=0'); print('barre :', pg.text_content('[data-decbar] .decn >> nth=0'))
    pend_before = pg.evaluate("MC.app.S.cache.family.enfants[0].records.filter(r=>r.statut==='attente').length")
    first.locator('[data-v="ok"]').click(); pg.wait_for_timeout(150)
    assert 'on' not in first.locator('[data-v="refuse"]').get_attribute('class') and 'on' in first.locator('[data-v="ok"]').get_attribute('class')
    first.locator('[data-v="ok"]').click(); pg.wait_for_timeout(150)  # re-toucher = annuler le choix
    assert not pg.is_visible('[data-decbar] >> nth=0')
    # rien n'a été envoyé
    assert pg.evaluate("JSON.parse(localStorage.getItem('mc-demo-v8')).tables.records.filter(r=>r.statut==='attente').length") >= pend_before
    pg.click('[data-act="decAll"]'); pg.wait_for_timeout(150)
    pg.locator('.decis').nth(1).locator('[data-v="refuse"]').click(); pg.wait_for_timeout(150)
    txt = pg.text_content('[data-decbar] .decn >> nth=0'); print('barre :', txt); assert 'à refuser' in txt and 'à confirmer' in txt
    pg.screenshot(path='/home/claude/shots/cf-parent-choix.png')
    pg.click('[data-act="decSend"]'); pg.wait_for_timeout(1200)
    pg.screenshot(path='/home/claude/shots/cf-parent-apres.png', full_page=True)
    st = pg.evaluate("JSON.parse(localStorage.getItem('mc-demo-v8')).tables.records.filter(r=>r.statut==='refuse').map(r=>r.id)")
    print('refusés', st); assert len(st) == 1
    # rétablir le résultat refusé
    pg.click('details.note summary'); pg.wait_for_timeout(200)
    pg.click('details.note [data-act="decide"][data-v="ok"]'); pg.wait_for_timeout(150)
    pg.click('[data-act="decSend"]'); pg.wait_for_timeout(1200)
    st = pg.evaluate("JSON.parse(localStorage.getItem('mc-demo-v8')).tables.records.filter(r=>r.statut==='refuse').length")
    print('refusés après rétablissement', st); assert st == 0
    pg.evaluate("MC.app.setAdult(null)")
    # ----- l'éduc : vestiaire puis fiche joueur instantanée -----
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300); pad(pg,'654321'); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/shots/cf-educ.png', full_page=True)
    pg.goto(BASE+'#/educ/joueurs'); pg.wait_for_timeout(600)
    pg.click('#edlist a >> nth=0'); pg.wait_for_timeout(100)
    print('fiche affichée vite', pg.evaluate("!!document.querySelector('main h1')"))
    pg.wait_for_timeout(800)
    b.close()
print('ERRS', errs)
