import sys, json, time
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
def shot(pg,name,full=True):
    pg.wait_for_timeout(350)
    pg.screenshot(path='/home/claude/shots/%s.png'%name, full_page=full)
def mk(b, w, h, mobile=True):
    ctx=b.new_context(viewport={'width':w,'height':h}, device_scale_factor=1, has_touch=mobile, is_mobile=mobile and w<700)
    pg=ctx.new_page()
    pg.on('console', lambda m: errs.append((w, 'console', m.type, m.text)) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append((w, 'pageerror', str(e))))
    return ctx, pg
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c))
        pg.wait_for_timeout(60)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx,pg=mk(b,390,844)
    pg.goto(BASE); pg.wait_for_timeout(800)
    shot(pg,'01-connexion')
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300)
    shot(pg,'02-pin',False)
    pin(pg,'2580'); pg.wait_for_timeout(1200)
    shot(pg,'03-semaine')
    pg.goto(BASE+'#/jour/meafou'); pg.wait_for_timeout(900); shot(pg,'04-jour-meafou')
    pg.goto(BASE+'#/exo/pompes?jour=cros'); pg.wait_for_timeout(900); shot(pg,'05-exo-pompes')
    pg.click('[data-act="demoMode"][data-mode="video"]'); pg.wait_for_timeout(300); shot(pg,'05b-exo-video',False)
    pg.goto(BASE+'#/noter?type=cros'); pg.wait_for_timeout(900); shot(pg,'06-noter')
    pg.click('[data-act="nQuand"][data-v="hier"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="nRess"][data-v="facile"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="nSave"]'); pg.wait_for_timeout(1500); shot(pg,'07-bravo')
    pg.goto(BASE+'#/profil'); pg.wait_for_timeout(900); shot(pg,'08-profil')
    pg.goto(BASE+'#/niveaux'); pg.wait_for_timeout(900); shot(pg,'09-niveaux')
    pg.goto(BASE+'#/trophees'); pg.wait_for_timeout(900); shot(pg,'10-trophees')
    pg.goto(BASE+'#/defi/roc'); pg.wait_for_timeout(900); shot(pg,'11-defi')
    pg.goto(BASE+'#/classement'); pg.wait_for_timeout(900); shot(pg,'12-classement')
    pg.click('[data-act="rkMode"][data-v="prog"]'); pg.wait_for_timeout(300); shot(pg,'12b-classement-prog')
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900); shot(pg,'13-bilan')
    pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(900); shot(pg,'14-reglages')
    # séance guidée
    pg.goto(BASE+'#/go/cros'); pg.wait_for_timeout(1000); shot(pg,'20-run-warmup',False)
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(500); shot(pg,'21-run-susp-ready',False)
    pg.click('[data-act="runGo"]'); pg.wait_for_timeout(4200); shot(pg,'22-run-susp-work',False)
    pg.click('[data-act="runLetGo"]'); pg.wait_for_timeout(500); shot(pg,'23-run-rest',False)
    pg.click('[data-act="runSkipRest"]'); pg.wait_for_timeout(300)
    # finir suspension vite
    for i in range(2):
        pg.click('[data-act="runGo"]'); pg.wait_for_timeout(3600); pg.click('[data-act="runLetGo"]'); pg.wait_for_timeout(300)
        if pg.query_selector('[data-act="runSkipRest"]'): pg.click('[data-act="runSkipRest"]'); pg.wait_for_timeout(200)
    shot(pg,'24-run-feel',False)
    pg.click('[data-act="runFeel"][data-v="facile"]'); pg.wait_for_timeout(400); shot(pg,'25-run-reps',False)
    pg.click('[data-act="runMinus"]'); pg.click('[data-act="runSetDone"]'); pg.wait_for_timeout(300)
    # quitter et enregistrer
    pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(300); shot(pg,'26-run-quit',False)
    pg.click('.modal button:has-text("Enregistrer")'); pg.wait_for_timeout(1800); shot(pg,'27-bravo-guidee')
    # Dupont intervalles et circuit
    pg.goto(BASE+'#/go/dupont'); pg.wait_for_timeout(900); pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="runGo"]'); pg.wait_for_timeout(4500); shot(pg,'28-run-inter',False)
    pg.click('[data-act="runInterStop"]'); pg.wait_for_timeout(300); pg.click('[data-act="runFeel"][data-v="dur"]'); pg.wait_for_timeout(400); shot(pg,'29-run-circuit',False)
    pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(300); pg.click('.modal button:has-text("Quitter sans")'); pg.wait_for_timeout(800)
    # changer de joueur -> Rose 1re connexion
    pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(800); pg.click('[data-act="logoutKid"]'); pg.wait_for_timeout(900)
    pg.click('.kidbtn:has-text("ROSE")'); pg.wait_for_timeout(300); pin(pg,'4827'); pg.wait_for_timeout(1200)
    shot(pg,'30-premiere-couleur')
    pg.click('[data-act="pickColor"][data-c="#3DFFB0"]'); pg.wait_for_timeout(200); pg.click('[data-act="firstNext"]'); pg.wait_for_timeout(400)
    pin(pg,'1234'); pg.wait_for_timeout(500); shot(pg,'31-premiere-faible',False)
    pin(pg,'7391'); pg.wait_for_timeout(500); pin(pg,'7391'); pg.wait_for_timeout(1500); shot(pg,'32-premiere-ok',False)
    pg.goto(BASE+'#/semaine'); pg.wait_for_timeout(1000); shot(pg,'33-rose-semaine')
    # adultes
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(800); shot(pg,'40-adultes',False)
    pin(pg,'123456'); pg.wait_for_timeout(1500); shot(pg,'41-parent')
    pg.click('[data-act="parentKid"]:has-text("Lou")') if pg.query_selector('[data-act="parentKid"]:has-text("Lou")') else None
    pg.wait_for_timeout(500)
    pg.evaluate("localStorage.removeItem('mc-adult')"); pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300)
    pin(pg,'654321'); pg.wait_for_timeout(1500); shot(pg,'42-educ')
    pg.goto(BASE+'#/educ/joueurs'); pg.wait_for_timeout(900)
    pg.click('#edlist a >> nth=0'); pg.wait_for_timeout(1200); shot(pg,'43-educ-joueur')
    pg.goto(BASE+'#/educ/ajouter'); pg.wait_for_timeout(900); pg.fill('#ap','Paul'); pg.fill('#an','Famille Durand'); pg.click('[data-act="addPlayer"]'); pg.wait_for_timeout(1200); shot(pg,'44-educ-ajout',False)
    pg.click('.modal button:has-text("Fermer")'); pg.wait_for_timeout(800)
    pg.goto(BASE+'#/educ/familles'); pg.wait_for_timeout(900); shot(pg,'45-familles')
    pg.goto(BASE+'#/educ/educs'); pg.wait_for_timeout(900); shot(pg,'46-educs')
    ctx.close()
    print(json.dumps(errs, ensure_ascii=False, indent=1))
    b.close()
