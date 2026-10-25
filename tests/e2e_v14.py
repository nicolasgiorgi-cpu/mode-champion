# v14 : navigation (barre du haut + onglets), accueil des nouveaux, nouveautés, niveaux en un geste
import sys, os
from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
OUT=os.environ.get('OUT','/tmp/claude-0/-home-claude-mode-champion/a9e1937c-c3f2-5869-830c-450b35966146/scratchpad/v14/')
W,H=(int(sys.argv[1]),int(sys.argv[2])) if len(sys.argv)>2 else (390,844)
tag='%dx%d'%(W,H)
res=[]; errs=[]
def check(n,c,i=''): res.append((n,c)); print(('OK  ' if c else 'BAD ')+n, '' if c else i)
def shot(pg,name): pg.screenshot(path=OUT+tag+'-'+name+'.png')
def pin(pg, code, sel='.modal'):
    for c in code: pg.click('%s [data-k="%s"]'%(sel,c)); pg.wait_for_timeout(40)
def pick(pg, nom):
    pg.click('[data-act="adultPick"][data-nom="%s"]' % nom); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':W,'height':H}, is_mobile=W<700, has_touch=True); pg=ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    # --- joueur existant (Tom) : nouveautés à l'ouverture
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(1200)
    check('Tom : semaine', '#/semaine' in pg.url, pg.url)
    # 1re ouverture sur cet appareil : un message simple sur l'appli, pas la liste des mises à jour
    check('Tom : message de bienvenue simple (pas « Quoi de neuf ? »)', pg.query_selector('.modal.sheet-bvn') is not None and pg.query_selector('.modal.sheet-news') is None and len(pg.query_selector_all('.modal .obres li')) == 4)
    shot(pg,'k01-bienvenue')
    if pg.query_selector('.modal.sheet-bvn'): pg.click('.modal.sheet-bvn button[data-i="0"]'); pg.wait_for_timeout(300)
    check('barre du haut + onglets', pg.query_selector('.topbar') is not None and pg.is_visible('#nav') and len(pg.query_selector_all('#nav a'))==4)
    nb=pg.evaluate("(()=>{const n=document.getElementById('nav').getBoundingClientRect();return [n.bottom, innerHeight, n.left, n.right, innerWidth]})()")
    if W<1000: check('onglets collés en bas, pleine largeur', abs(nb[0]-nb[1])<1 and nb[2]==0 and abs(nb[3]-nb[4])<1, nb)
    shot(pg,'k02-semaine')
    pg.goto(BASE+'#/jour/cros'); pg.wait_for_timeout(600); shot(pg,'k03-jour')
    check('jour : Retour vers Ma semaine', pg.get_attribute('.topbar [data-back]','href')=='#/semaine')
    pg.goto(BASE+'#/exo/tractions?jour=cros'); pg.wait_for_timeout(600); shot(pg,'k04-exo')
    check('exo : Retour vers la séance', pg.get_attribute('.topbar [data-back]','href')=='#/jour/cros')
    pg.goto(BASE+'#/echauffement?jour=cros'); pg.wait_for_timeout(600)
    check('échauffement : Retour vers la séance', pg.get_attribute('.topbar [data-back]','href')=='#/jour/cros')
    pg.goto(BASE+'#/profil'); pg.wait_for_timeout(600); shot(pg,'k05-profil')
    pg.goto(BASE+'#/niveaux'); pg.wait_for_timeout(600); shot(pg,'k06-niveaux')
    cle=pg.get_attribute('[data-act="lvStep"][data-d="-1"]:not([disabled])','data-cle')
    n0=pg.evaluate("MC.app.S.me.joueur.niveaux['%s']||1"%cle)
    pg.click('[data-act="lvStep"][data-cle="%s"][data-d="-1"]'%cle); pg.wait_for_timeout(600)
    n1=pg.evaluate("MC.app.S.me.joueur.niveaux['%s']"%cle)
    check('Mes niveaux : bouton − marche', n1==n0-1, (cle,n0,n1))
    xp0=pg.evaluate("MC.app.S.stats.xp")
    pg.click('[data-act="lvStep"][data-cle="%s"][data-d="1"]'%cle); pg.wait_for_timeout(600)
    check('Mes niveaux : bouton + marche', pg.evaluate("MC.app.S.me.joueur.niveaux['%s']"%cle)==n0)
    check('redescendre puis remonter : pas d\'XP', pg.evaluate("MC.app.S.stats.xp")==xp0, (xp0, pg.evaluate("MC.app.S.stats.xp")))
    pg.click('[data-act="lvStep"][data-cle="susp"][data-d="-1"]'); pg.wait_for_timeout(600)   # suspension en N2 pour la suite
    pg.goto(BASE+'#/classement'); pg.wait_for_timeout(700); shot(pg,'k07-classement')
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(600); shot(pg,'k08-bilan')
    check('bilan : explication', pg.query_selector('.bilexp') is not None)
    pg.goto(BASE+'#/reglages'); pg.wait_for_timeout(500); pg.click('a[href="#/nouveautes"]'); pg.wait_for_timeout(500); shot(pg,'k09-nouveautes')
    check('nouveautés : historique', len(pg.query_selector_all('.newsit'))>=4)
    # --- séance guidée, exos « facile » → changer de niveau à la fin
    pg.goto(BASE+'#/go/cros'); pg.wait_for_timeout(800)
    n=0
    while n<160:
        n+=1
        if '#/bravo' in pg.url: break
        acts=pg.eval_on_selector_all('[data-act]','els=>els.filter(e=>e.offsetParent).map(e=>e.getAttribute("data-act"))')
        done=False
        for a in ['runSetDone','runFeel','runSkipRest','runTour','runNextStep','rtNext','runGo']:
            if a in acts:
                if a=='runFeel': pg.click('[data-act="runFeel"][data-v="facile"]')
                elif a=='runGo':
                    pg.click('[data-act="runGo"]'); pg.wait_for_timeout(3500)
                    if pg.query_selector('[data-act="runLetGo"]'): pg.click('[data-act="runLetGo"]')
                else: pg.click('[data-act="%s"] >> visible=true'%a)
                done=True; break
        if not done: print('pas d\'action', acts); break
        pg.wait_for_timeout(200)
    pg.wait_for_timeout(1200)
    check('bravo atteint', '#/bravo' in pg.url, pg.url)
    shot(pg,'k10-bravo')
    q=pg.query_selector('[data-act="lvQuick"]')
    check('bravo : proposer le niveau d\'après', q is not None)
    if q:
        cle=q.get_attribute('data-cle'); a=int(q.get_attribute('data-a'))
        q.click(); pg.wait_for_timeout(800)
        check('bravo : niveau changé', pg.evaluate("MC.app.S.me.joueur.niveaux['%s']"%cle)==a)
        shot(pg,'k11-bravo-apres')
    pg.evaluate("MC.app.setKid(null)")
    # --- nouveau joueur (Rose) : 1re connexion → visite → premiers pas
    pg.goto(BASE+'#/connexion'); pg.wait_for_timeout(600)
    pg.click('.kidbtn:has-text("ROSE")'); pg.wait_for_timeout(300); pin(pg,'4827'); pg.wait_for_timeout(1000)
    pg.click('[data-act="firstNext"]'); pg.wait_for_timeout(300)
    pin(pg,'2468','#firstzone'); pg.wait_for_timeout(400); pin(pg,'2468','#firstzone'); pg.wait_for_timeout(1000)
    pg.click('a.btn[href="#/semaine"]'); pg.wait_for_timeout(1000)
    check('Rose : visite', '#/bienvenue' in pg.url, pg.url)
    for i in range(5):
        shot(pg,'n0%d-visite'%(i+1))
        if i<4: pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="obDoneKid"]'); pg.wait_for_timeout(900)
    check('Rose : semaine + premiers pas', '#/semaine' in pg.url and pg.query_selector('.obchk') is not None)
    check('Rose : pas de « Quoi de neuf » (nouvelle)', pg.query_selector('.modal.sheet-news') is None)
    shot(pg,'n06-premiers-pas')
    pg.evaluate("MC.app.setKid(null)")
    # --- parent
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500); pick(pg, 'Tom'); pin(pg,'1357','#adultzone'); pg.wait_for_timeout(1200)
    check('parent : visite', '#/parent/bienvenue' in pg.url, pg.url)
    for i in range(3):
        shot(pg,'p0%d-visite'%(i+1))
        if i<2: pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="obShared"][data-v="1"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="obDone"]'); pg.wait_for_timeout(900)
    check('parent : suivi + onglets', pg.url.endswith('#/parent') and len(pg.query_selector_all('#nav a'))==4, pg.url)
    shot(pg,'p04-suivi')
    if pg.query_selector('[data-act="parentPick"]'):
        before=pg.inner_text('.tb-switch'); pg.click('[data-act="parentPick"]'); pg.wait_for_timeout(500)
        check('parent : changer d\'enfant', pg.inner_text('.tb-switch')!=before)
        pg.click('[data-act="parentPick"]'); pg.wait_for_timeout(400)
    for h,nm in [('#/parent/bilans','p05-bilans'),('#/parent/missions','p05b-missions'),('#/parent/skills','p05c-skills'),('#/parent/classement','p06-classement'),('#/parent/plus','p07-plus'),('#/parent/nouveautes','p08-nouveautes')]:
        pg.goto(BASE+h); pg.wait_for_timeout(700); shot(pg,nm)
        check('parent '+h, pg.query_selector('.topbar') is not None and pg.query_selector('.empty, .screen') is not None)
    pg.evaluate("MC.app.setAdult(null)")
    # --- éduc
    pg.goto(BASE+'#/adultes'); pg.wait_for_timeout(500); pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300); pick(pg, 'Coach Nico'); pin(pg,'2468','#adultzone'); pg.wait_for_timeout(1200)
    check('éduc : visite', '#/educ/bienvenue' in pg.url, pg.url)
    for i in range(3):
        shot(pg,'e0%d-visite'%(i+1))
        if i<2: pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="obPick"] >> nth=0'); pg.wait_for_timeout(200)
    pg.click('[data-act="obEducDone"]'); pg.wait_for_timeout(1000)
    check('éduc : entraînements + 4 onglets', (pg.url.endswith('#/educ/entrainements') or pg.url.endswith('#/educ')) and len(pg.query_selector_all('#nav a'))==4, pg.url)
    check('éduc : l\'engrenage en haut', pg.query_selector('.topbar a[href="#/educ/reglages"]') is not None)
    shot(pg,'e04-entrainements')
    for h,nm in [('#/educ/joueurs','e05-joueurs'),('#/educ/classement','e06-classement'),('#/educ/reglages','e07-reglages'),('#/educ/progres','e08-progres'),('#/educ/progres/bilans','e08b-bilans'),('#/educ/familles','e09-familles')]:
        pg.goto(BASE+h); pg.wait_for_timeout(700); shot(pg,nm)
        check('éduc '+h, pg.query_selector('.topbar') is not None)
    pg.goto(BASE+'#/educ/joueurs'); pg.wait_for_timeout(500); pg.click('#edlist a >> nth=0'); pg.wait_for_timeout(900); shot(pg,'e10-fiche')
    check('fiche : Retour vers Les joueurs + onglet Joueurs', pg.get_attribute('.topbar [data-back]','href')=='#/educ/joueurs' and pg.query_selector('#nav a.on[href="#/educ/joueurs"]') is not None)
    pg.goto(BASE+'#/guide?pour=educ&de=educ%2Foutils'); pg.wait_for_timeout(500)
    check('guide : Retour vers l\'écran d\'avant', pg.get_attribute('.topbar [data-back]','href')=='#/educ/outils')
    check('pas d\'erreur JS', not errs, errs)
    b.close()
print(sum(1 for r in res if r[1]),'OK /',len(res))
