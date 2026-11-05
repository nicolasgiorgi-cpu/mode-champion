# (v44) Progrès côté éducs : Missions (ouvert de base) · Skills · Prépa physique ; Skills = « Passeport de compétences » | « Catalogue »
# (deux vues, le passeport de base) ; « Évaluer » sur sa propre page (bouton) ; le catalogue : cartes repliées, une étoile touchée →
# à qui, puis « En mission » (la page Mission principale déjà remplie) ou « Acquise » ; la fiche d'un enfant › Skills : cartes repliées.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_progres.py [largeur hauteur]   (390 844 · 1180 820 · 820 1180)
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def nomodal(pg):
    for _ in range(3):
        if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
EDUC = "MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
HSCROLL = "document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1"
def hash_(pg): return pg.evaluate('location.hash')
def etoiles_de(pg, prenom, d, e):
    return pg.evaluate("(a) => MC.api.call('group', { token: MC.app.S.adult.token }).then(g => { const p = g.joueurs.find(x => x.joueur.prenom === a[0]); return (p.etoiles || []).some(x => x.domaine === a[1] && x.etoile === a[2]); })", [prenom, d, e])

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET=1')
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(700)
    pg.evaluate(EDUC % '#/educ/entrainements'); pg.wait_for_timeout(1600); nomodal(pg)
    # un entraînement aujourd'hui, avec 12 présents (la démo n'en a pas le jour même) : pour le filtre « Présents » de la fenêtre « donner »
    pg.evaluate("MC.loadGroup().then(g => { const ids = g.joueurs.filter(p => p.joueur.actif).slice(0, 12).map(p => p.joueur.id); return MC.app.adultCall('setEvenement', { titre: 'Entraînement - Essai', debut: MC.logic.today() + 'T16:30:00.000Z', lieu: 'Essai', sorte: 'entrainement', presents: ids }); }).then(() => MC.loadCompos(true)).then(() => 1)")
    # ----- Progrès : Missions d'abord, ouvert de base -----
    pg.click('#nav a:has-text("Progrès")'); pg.wait_for_timeout(1200); nomodal(pg)
    tabs = pg.evaluate("[...document.querySelectorAll('.stabs a')].map(a => a.childNodes[0].textContent.trim())")
    check('Progrès : Missions, Skills, Prépa physique (dans cet ordre)', tabs == ['Missions', 'Skills', 'Prépa physique'], tabs)
    check('Progrès s\'ouvre sur Missions', hash_(pg) == '#/educ/missions' and pg.query_selector('.stabs a.on') and pg.inner_text('.stabs a.on').strip().upper().startswith('MISSIONS'), hash_(pg))
    check('pastilles : demandes sur Skills, résultats à confirmer sur Prépa', pg.locator('.stabs a:nth-child(2) .nbi').count() == 1 and pg.locator('.stabs a:nth-child(3) .nbi').count() == 1)
    # ----- Skills : le passeport d'abord, le catalogue à côté -----
    pg.click('.stabs a:has-text("Skills")'); pg.wait_for_timeout(1200); nomodal(pg)
    txt = pg.inner_text('main')
    check('Skills : « Passeport de compétences » d\'abord', hash_(pg) == '#/educ/skills' and 'PASSEPORT DE COMPÉTENCES' in txt.upper() and pg.query_selector('#passeport table.sktable') is not None and pg.query_selector('#catalogue') is None)
    check('Skills : plus l\'écran d\'évaluation, un bouton « Évaluer »', pg.query_selector('.skeval') is None and pg.query_selector('a[href="#/educ/skills/evaluer"]') is not None)
    check('Skills : les demandes des enfants, à côté d\'Évaluer', pg.query_selector('a[href="#/educ/skills/evaluer?c=demandes"]') is not None)
    check('Skills : deux vues, Passeport | Catalogue', pg.locator('[data-act="skVue"]').count() == 2 and pg.query_selector('[data-act="skVue"][data-v="passeport"].on') is not None)
    check('pas de défilement de côté (passeport)', pg.evaluate(HSCROLL))
    pg.click('[data-act="skVue"][data-v="catalogue"]'); pg.wait_for_timeout(500)
    check('Catalogue : les 8 cartes, toutes repliées', pg.locator('#catalogue details.skcat').count() == 8 and pg.evaluate("[...document.querySelectorAll('#catalogue details.skcat')].every(d => !d.open)") and pg.query_selector('#passeport') is None)
    pg.click('details[data-skd="plaquage"] summary'); pg.wait_for_timeout(300)
    check('une carte ouverte : ses étoiles, avec « combien l\'ont »', pg.locator('details[data-skd="plaquage"] [data-act="skDonner"]').count() >= 5 and '/' in pg.inner_text('details[data-skd="plaquage"] .skce-n >> nth=0'))
    check('pas de défilement de côté (catalogue)', pg.evaluate(HSCROLL))
    # ----- donner une étoile : Acquise -----
    pg.click('details[data-skd="plaquage"] [data-act="skDonner"] >> nth=0'); pg.wait_for_timeout(600)
    m = pg.inner_text('.modal') if pg.query_selector('.modal') else ''
    check('une étoile touchée : sa description (phrase, ce qu\'on regarde) et « Pour qui ? »', 'CE QU\'ON REGARDE' in m.upper() and 'POUR QUI' in m.upper(), m[:200])
    btns = pg.evaluate("[...document.querySelectorAll('.modal .mbtns button')].map(b => [b.textContent.trim(), b.disabled])")
    check('deux choix, grisés tant que personne n\'est coché : En mission, Acquise', len(btns) == 2 and 'En mission' in btns[0][0] and 'Acquise' in btns[1][0] and btns[0][1] and btns[1][1], btns)
    deja = pg.locator('.modal .cop[disabled]').count()
    check('ceux qui l\'ont déjà ne se cochent pas (« l\'a déjà »), grisés', deja >= 1 and 'l\'a déjà' in pg.inner_text('.modal .cop[disabled] >> nth=0') and float(pg.eval_on_selector('.modal .cop[disabled]', 'e => getComputedStyle(e).opacity')) < 0.7, deja)
    # (relecture v44) le filtre : « Présents » de base s'il y a un entraînement du jour ; un enfant coché puis caché n'est plus compté
    pres = pg.query_selector('.modal [data-don="filtre"][data-v="presents"]') is not None
    check('un entraînement aujourd\'hui : le filtre « Présents »', pres)
    if pres:
        check('« Présents » de base (entraînement du jour)', pg.query_selector('.modal [data-don="filtre"][data-v="presents"].on') is not None)
        pg.click('.modal [data-don="filtre"][data-v="tous"]'); pg.wait_for_timeout(200)
        pg.locator('.modal [data-don="kid"]:not(.on)').last.click(); pg.wait_for_timeout(150)
        pg.click('.modal [data-don="filtre"][data-v="presents"]'); pg.wait_for_timeout(200)
    nvis = pg.locator('.modal [data-don="kid"].on').count()
    check('« Pour qui ? » ne compte que les enfants cochés visibles', ('POUR QUI ? · %d' % nvis) in pg.inner_text('.modal').upper() and (('ACQUISE · %d' % nvis) in pg.inner_text('.modal .mbtns').upper() if nvis else True), (nvis, pg.inner_text('.modal .mbtns')))
    for i in range(nvis): pg.locator('.modal [data-don="kid"].on').first.click(); pg.wait_for_timeout(120)
    noms = []
    for i in range(2):
        el = pg.locator('.modal [data-don="kid"]:not(.on)').first
        noms.append(el.inner_text().split('\n')[0].strip()); el.click(); pg.wait_for_timeout(150)
    check('2 cochés : « Acquise · 2 »', 'ACQUISE · 2' in pg.inner_text('.modal .mbtns button >> nth=1').upper(), pg.inner_text('.modal .mbtns'))
    st = pg.evaluate("(() => { const b = document.querySelector('details[data-skd=\"plaquage\"] [data-act=\"skDonner\"]'); return [b.getAttribute('data-d'), b.getAttribute('data-e')]; })()")
    pg.click('.modal .mbtns button >> nth=1'); pg.wait_for_timeout(1500)
    check('Acquise : validée pour les 2 (au serveur)', not pg.query_selector('.modal') and all(etoiles_de(pg, n, st[0], st[1]) for n in noms), (noms, st))
    if pres:
        occ = pg.evaluate("(a) => MC.api.call('group', { token: MC.app.S.adult.token }).then(g => { const p = g.joueurs.find(x => x.joueur.prenom === a[0]); const e = (p.etoiles || []).find(x => x.domaine === a[1] && x.etoile === a[2]); return e ? [e.evenementId || '', e.occasion || ''] : null; })", [noms[0], st[0], st[1]])
        check('Acquise parmi les présents : l\'occasion est l\'entraînement du jour', occ and occ[0] and occ[1], occ)
    check('… le catalogue est toujours ouvert sur la carte', pg.query_selector('details[data-skd="plaquage"][open]') is not None)
    # ----- donner une étoile : En mission → la page déjà remplie, puis retour aux Skills -----
    pg.click('details[data-skd="plaquage"] [data-act="skDonner"] >> nth=2'); pg.wait_for_timeout(600)
    st2 = pg.evaluate("(() => { const b = document.querySelectorAll('details[data-skd=\"plaquage\"] [data-act=\"skDonner\"]')[2]; return [b.getAttribute('data-d'), b.getAttribute('data-e')]; })()")
    el = pg.locator('.modal [data-don="kid"]:not(.on)').first; nm = el.inner_text().split('\n')[0].strip(); el.click(); pg.wait_for_timeout(150)
    pg.click('.modal .mbtns button >> nth=0'); pg.wait_for_timeout(1300)
    check('En mission : la page « Mission principale »', hash_(pg).startswith('#/educ/missions/nouvelle'), hash_(pg))
    check('… déjà remplie : l\'enfant, la carte, l\'étoile', pg.query_selector('[data-act="nmKid"].on') is not None and nm in pg.inner_text('[data-act="nmKid"].on') and pg.query_selector('[data-act="nmDom"][data-v="%s"].on' % st2[0]) is not None and pg.query_selector('[data-act="nmStar"][data-v="%s"].on' % st2[1]) is not None)
    check('… retour : Skills', pg.query_selector('header.topbar [data-back]') is not None and 'SKILLS' in pg.inner_text('header.topbar').upper())
    pg.click('[data-act="nmPerso"]'); pg.wait_for_timeout(1500)
    check('mission donnée : retour aux Skills', hash_(pg) == '#/educ/skills', hash_(pg))
    mis = pg.evaluate("(a) => MC.api.call('group', { token: MC.app.S.adult.token }).then(g => { const p = g.joueurs.find(x => x.joueur.prenom === a[0]); return (g.defmissions || []).some(m => m.joueurId === p.joueur.id && m.domaine === a[1] && (m.etoiles || []).indexOf(a[2]) >= 0); })", [nm, st2[0], st2[1]])
    check('… et sa mission principale est au serveur', mis, (nm, st2))
    # ----- Évaluer : sa page ; les anciennes adresses y mènent -----
    pg.click('a[href="#/educ/skills/evaluer"]'); pg.wait_for_timeout(1200); nomodal(pg)
    check('Évaluer : sa page, avec Retour vers Skills', hash_(pg).startswith('#/educ/skills/evaluer') and pg.query_selector('.skeval') is not None and pg.query_selector('header.topbar [data-back]') is not None)
    check('Évaluer : plus de lien vers l\'ancien « Passeport du groupe »', pg.query_selector('a[href="#/educ/skills/passeport"]') is None)
    pg.goto(BASE + '#/educ/skills?c=demandes'); pg.wait_for_timeout(1300); nomodal(pg)
    check('ancienne adresse des demandes (alertes, cloche) : Évaluer, aux demandes', hash_(pg).startswith('#/educ/skills/evaluer') and 'c=demandes' in hash_(pg), hash_(pg))
    pg.goto(BASE + '#/educ/skills?evt=sp-demo-e1'); pg.wait_for_timeout(1300); nomodal(pg)
    check('ancienne adresse d\'une séance (?evt=) : Évaluer, sur la séance', hash_(pg) == '#/educ/skills/evaluer?evt=sp-demo-e1', hash_(pg))
    pg.goto(BASE + '#/educ/skills/journee'); pg.wait_for_timeout(1200); nomodal(pg)
    check('ancienne journée d\'évaluation : Évaluer', hash_(pg) == '#/educ/skills/evaluer', hash_(pg))
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1300); nomodal(pg)
    check('page d\'une séance : « Évaluer des Skills » mène droit à Évaluer', pg.query_selector('a[href="#/educ/skills/evaluer?evt=sp-demo-e1"]') is not None)
    pg.goto(BASE + '#/educ/skills/passeport'); pg.wait_for_timeout(1200); nomodal(pg)
    check('ancienne adresse du passeport : Skills', hash_(pg) == '#/educ/skills' and pg.query_selector('#passeport') is not None, hash_(pg))
    # ----- la fiche d'un enfant › Skills : cartes repliées -----
    pg.click('#passeport tbody th a >> nth=0'); pg.wait_for_timeout(1300); nomodal(pg)
    check('passeport : un prénom ouvre sa fiche, onglet Skills', '/educ/joueur/' in hash_(pg) and 't=skills' in hash_(pg), hash_(pg))
    check('fiche › Skills : les 8 cartes repliées', pg.locator('details.fsk').count() == 8 and pg.evaluate("[...document.querySelectorAll('details.fsk')].every(d => !d.open)"))
    pg.click('details.fsk >> nth=0 >> summary'); pg.wait_for_timeout(300)
    check('fiche › Skills : une carte s\'ouvre, avec Valider', pg.evaluate("document.querySelector('details.fsk').open && document.querySelector('details.fsk').querySelectorAll('[data-act=valEtoile], [data-act=retEtoile]').length >= 1"))
    check('pas de défilement de côté (fiche)', pg.evaluate(HSCROLL))
    # (v44) les cartes ouvertes restent en passant d'un onglet de la fiche à l'autre ; venir d'ailleurs les replie
    fid = hash_(pg).split('/')[3].split('?')[0]
    pg.click('.ftabs a:text-is("Missions")'); pg.wait_for_timeout(800); pg.click('.ftabs a:text-is("Skills")'); pg.wait_for_timeout(800)
    check('fiche : passer par un autre onglet de la fiche garde la carte ouverte', pg.evaluate("!!document.querySelector('details.fsk') && document.querySelector('details.fsk').open"))
    pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(1100); pg.click('#tlist a.tfrow[href="#/educ/joueur/%s"]' % fid); pg.wait_for_timeout(1100)
    pg.click('.ftabs a:text-is("Skills")'); pg.wait_for_timeout(800)
    check('fiche : venir d\'ailleurs replie les cartes', pg.evaluate("[...document.querySelectorAll('details.fsk')].every(d => !d.open)"))
    # (v44) venir d'ailleurs = le premier onglet : Progrès s'ouvre toujours sur Missions (même avec un ancien sous-onglet gardé sur l'appareil)
    pg.evaluate("localStorage.setItem('mc-stab:e:progres', JSON.stringify('#/educ/progres'))")
    pg.goto(BASE + '#/educ/joueurs'); pg.reload(); pg.wait_for_timeout(1500); nomodal(pg)
    pg.click('#nav a:has-text("Progrès")'); pg.wait_for_timeout(1200); nomodal(pg)
    check('mise à jour v44 : Progrès s\'ouvre sur Missions (ancien sous-onglet oublié)', hash_(pg) == '#/educ/missions' and pg.evaluate("localStorage.getItem('mc-stab:e:progres')") is None, hash_(pg))
    pg.click('.stabs a:has-text("Prépa")'); pg.wait_for_timeout(1000); pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(900)
    pg.click('#nav a:has-text("Progrès")'); pg.wait_for_timeout(1200); nomodal(pg)
    check('venir d\'ailleurs : Progrès toujours sur Missions (pas sur le dernier sous-onglet vu)', hash_(pg) == '#/educ/missions', hash_(pg))
    # Skills : la vue Catalogue reste en revenant d'Évaluer (Retour), le Passeport revient quand on vient d'ailleurs
    pg.click('.stabs a:has-text("Skills")'); pg.wait_for_timeout(1000); pg.click('[data-act="skVue"][data-v="catalogue"]'); pg.wait_for_timeout(400)
    pg.click('details[data-skd="ruck"] summary'); pg.wait_for_timeout(300)
    pg.click('a[href="#/educ/skills/evaluer"]'); pg.wait_for_timeout(1100); nomodal(pg)
    pg.click('header.topbar [data-back], header.topbar [data-act="navBack"]'); pg.wait_for_timeout(1200)
    check('Retour d\'Évaluer : toujours le Catalogue, la carte ouverte', pg.query_selector('#catalogue') is not None and pg.query_selector('details[data-skd="ruck"][open]') is not None, hash_(pg))
    pg.click('.stabs a:has-text("Missions")'); pg.wait_for_timeout(900); pg.click('.stabs a:has-text("Skills")'); pg.wait_for_timeout(1000)
    check('venir d\'ailleurs : Skills s\'ouvre sur le Passeport', pg.query_selector('#passeport') is not None and pg.query_selector('[data-act="skVue"][data-v="passeport"].on') is not None)
    check('aucune erreur JS', not errs, errs)
    b.close()
ok = sum(1 for _, c in res if c); print('%d/%d' % (ok, len(res)))
sys.exit(0 if ok == len(res) else 1)
