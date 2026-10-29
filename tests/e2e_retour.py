# (29/10) Le bouton Retour = un vrai « précédent » (et l'endroit où l'on était), tirer pour actualiser,
# la mission « Choisis ton poste » côté éduc (lignes compactes, coche verte, détail avec le mot de l'enfant),
# le classement (toutes les épreuves, choix qui reviennent à la ligne) et aucune bande qui défile de côté.
# Lancer : sh tests/mkdemo.sh puis python3 tests/e2e_retour.py [largeur hauteur]
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def h(pg): return pg.evaluate('location.hash')
def hist(pg): return pg.evaluate('JSON.parse(sessionStorage.getItem("mc-hist") || "{}").list || []')
def back(pg, t=1100): pg.click('header.topbar [data-act="navBack"]'); pg.wait_for_timeout(t)
def nomodal(pg):
    for _ in range(3):
        if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
def push(pg, hh, t=900): pg.evaluate('location.hash = %r' % hh); pg.wait_for_timeout(t); nomodal(pg)
HSCROLL = """(() => { const out = []; document.querySelectorAll('#app *').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.push(String(el.className)); }); if (document.scrollingElement.scrollWidth > innerWidth + 1) out.push('PAGE'); return out; })()"""
EDUC = "MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
KID = "MC.api.call('roster',{}).then(r=>{const k=(r.joueurs||r).find(x=>x.prenom==='Tom'); return MC.api.call('login',{joueurId:k.id,pin:MC.demo.CODES.enfant});}).then(res=>{MC.app.setKid({token:res.token,joueur:res.joueur}); if(res.me) MC.app.setMe(res.me); location.hash=%r;})"
PARENT = "MC.api.call('roster',{}).then(l=>MC.api.call('adultLogin',{role:'f',joueurId:l.joueurs.find(j=>j.prenom==='Tom').id,code:MC.demo.CODES.parent})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET=1')
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    def touch(t, x, y): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y}]})
    def pull(dist):
        touch('touchStart', W // 2, 230)
        for k in range(1, 13): touch('touchMove', W // 2, 230 + dist * k / 12); pg.wait_for_timeout(16)
        st = pg.evaluate("(() => { const e = document.querySelector('.ptr'); return e ? e.className + '|' + e.textContent : '' })()")
        touch('touchEnd', 0, 0); return st
    pg.goto(BASE); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(700)

    # ======================== ÉDUC ========================
    pg.evaluate(EDUC % '#/educ'); pg.wait_for_timeout(1500); nomodal(pg)
    check('éduc : Retour sur l\'onglet du bas (grisé : rien avant, déjà à l\'accueil)', pg.evaluate("(() => { const b = document.querySelector('header.topbar .tb-back'); return !!b && b.classList.contains('off'); })()"))
    pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(900)
    check('Retour actif sur un onglet quand on vient d\'ailleurs', pg.evaluate("!document.querySelector('header.topbar .tb-back').classList.contains('off')"))
    pg.evaluate('window.scrollTo(0, 700)'); pg.wait_for_timeout(250); y0 = pg.evaluate('scrollY')
    pg.evaluate("(() => { const a = [...document.querySelectorAll('#app a[href^=\"#/educ/joueur/\"]')].find(a => { const r = a.getBoundingClientRect(); return r.top > 130 && r.bottom < innerHeight - 130; }); a.click(); })()"); pg.wait_for_timeout(1000)
    check('fiche ouverte en haut de page', h(pg).startswith('#/educ/joueur/') and pg.evaluate('scrollY') == 0, h(pg))
    n = len(hist(pg))
    pg.click('.ftabs a:has-text("Prépa")'); pg.wait_for_timeout(600); pg.click('.ftabs a:has-text("Famille")'); pg.wait_for_timeout(600)
    check('onglets de la fiche : pas d\'écran de plus dans l\'historique', len(hist(pg)) == n, (n, len(hist(pg))))
    check('onglets de la fiche : sur plusieurs lignes (pas de bande qui défile)', pg.evaluate("getComputedStyle(document.querySelector('.ftabs')).display") == 'grid')
    back(pg)
    check('Retour : la liste des enfants', h(pg).startswith('#/educ/joueurs'), h(pg))
    check('Retour : au même endroit de la liste', abs(pg.evaluate('scrollY') - y0) < 4, (pg.evaluate('scrollY'), y0))
    back(pg)
    check('Retour encore : l\'écran d\'avant (Entraînements)', h(pg) in ('#/educ', '#/educ/entrainements'), h(pg))
    # la mission « Choisis ton poste » : lignes compactes, détail dépliable, retour au même endroit avec le détail ouvert
    push(pg, '#/educ/mission/poste')
    check('mission : plus de bouclier ni d\'étiquette Faite / À faire', not pg.query_selector('.mrows .hexa, .mrows .pill') and not pg.query_selector('.mrows svg.hexa'))
    rows = pg.query_selector_all('.mrow')
    check('mission : une ligne par enfant', len(rows) >= 20, len(rows))
    check('mission : coche verte pour les enfants qui l\'ont faite', pg.locator('.mrow .mok').count() >= 10)
    one = pg.evaluate("(() => [...document.querySelectorAll('.mrow summary')].every(s => s.getBoundingClientRect().height < 64))()")
    check('mission : les 3 réponses sur une seule ligne', one)
    enzo = pg.locator('.mrow summary:has-text("Enzo")')
    check('mission : 3 choix d\'Enzo sur sa ligne', pg.locator('.mrow:has(summary:has-text("Enzo")) .mrow-c .mpc:not(.vide)').count() == 3)
    enzo.click(); pg.wait_for_timeout(300)
    det = pg.inner_text('.mrow[open] .mrow-d')
    check('mission : toucher l\'enfant montre son mot et ses choix', 'Pilier comme mon grand frère' in det and '1 · Pilier' in det.replace('1 · PILIER', '1 · Pilier'), det[:200])
    pg.locator('.mrow summary:has-text("Léo")').click(); pg.wait_for_timeout(300)
    det2 = pg.inner_text('.mrow:has(summary:has-text("Léo")) .mrow-d')
    check('mission : le mot et le test d\'un enfant venu du formulaire', 'plaquer' in det2 and 'Postes proposés' in det2, det2[:300])
    pg.locator('.mrow:has(summary:has-text("Léo"))').evaluate("e => e.scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    y1 = pg.evaluate('scrollY')
    pg.click('.mrow:has(summary:has-text("Léo")) a:has-text("Sa fiche")'); pg.wait_for_timeout(1000)
    check('mission : « Sa fiche » ouvre la fiche', h(pg).startswith('#/educ/joueur/'), h(pg))
    back(pg)
    check('Retour : la mission, au même endroit', h(pg) == '#/educ/mission/poste' and abs(pg.evaluate('scrollY') - y1) < 4, (h(pg), pg.evaluate('scrollY'), y1))
    check('Retour : les détails ouverts le restent', pg.locator('.mrow[open]').count() == 2, pg.locator('.mrow[open]').count())
    pg.go_back(); pg.wait_for_timeout(1000)
    check('le Retour du navigateur marche aussi', h(pg) in ('#/educ', '#/educ/entrainements', '#/educ/joueurs'), h(pg))
    # un écran ouvert directement (aucun historique) : Retour = l'écran parent, sans boucle
    pg.evaluate('sessionStorage.clear()'); pg.goto('about:blank'); pg.goto(BASE + '#/educ/classement'); pg.wait_for_timeout(1300); nomodal(pg)
    check('classement éduc : épreuves qui reviennent à la ligne', pg.evaluate(HSCROLL) == [], pg.evaluate(HSCROLL))
    back(pg)
    check('sans historique : Retour mène à l\'écran parent prévu', h(pg) == '#/educ/progres', h(pg))
    back(pg)
    check('puis à l\'accueil de l\'espace', h(pg) in ('#/educ/entrainements', '#/educ'), h(pg))
    # tirer pour actualiser (éduc)
    push(pg, '#/educ/mission/poste'); pg.evaluate('window.scrollTo(0,0)')
    pg.evaluate("window.__calls=[]; const c0 = MC.api.call; MC.api.call = function (a) { window.__calls.push(a); return c0.apply(this, arguments) }; 1")
    st = pull(230); pg.wait_for_timeout(1400)
    check('éduc : tirer fort en haut = « Relâchez pour actualiser »', 'Relâchez' in st, st)
    check('éduc : le groupe est redemandé au serveur', 'group' in pg.evaluate('window.__calls'), pg.evaluate('window.__calls'))
    check('écran remis en place après', pg.evaluate("document.getElementById('app').style.transform") in ('', 'none'))
    # écrans sans bande qui défile de côté
    for hh in ['#/educ/skills/passeport', '#/educ/classement', '#/educ/mission/poste']:
        push(pg, hh); check('pas de défilement de côté : ' + hh, pg.evaluate(HSCROLL) == [], pg.evaluate(HSCROLL))

    # ======================== PARENT ========================
    pg.evaluate("MC.app.setAdult(null)"); pg.evaluate(PARENT % '#/parent'); pg.wait_for_timeout(1500); nomodal(pg)
    push(pg, '#/parent/classement')
    check('parent : classement, toutes les épreuves d\'abord', pg.locator('.rkcard').count() + (1 if pg.query_selector('.rkvides') else 0) >= 2 and pg.locator('.rkchips .rkc-all.on').count() == 1)
    check('parent : pas de défilement de côté', pg.evaluate(HSCROLL) == [], pg.evaluate(HSCROLL))
    back(pg)
    check('parent : Retour revient à l\'écran d\'avant', h(pg) == '#/parent', h(pg))

    # ======================== ENFANT ========================
    pg.evaluate("MC.app.setAdult(null)"); pg.evaluate(KID % '#/semaine'); pg.wait_for_timeout(1500); nomodal(pg)
    check('enfant : Retour présent sur Ma semaine', pg.query_selector('header.topbar .tb-back') is not None)
    J = pg.evaluate("Object.keys(MC.CONTENT.JOURS).filter(x => MC.CONTENT.JOURS[x].maison)[0]")
    push(pg, '#/jour/' + J); push(pg, '#/go/' + J, 1300); push(pg, '#/bravo'); push(pg, '#/semaine')
    back(pg)
    check('après une séance : Retour saute « Bravo » et la séance guidée', h(pg) == '#/jour/' + J, h(pg))
    push(pg, '#/classement', 1300)
    check('classement : toutes les épreuves au départ', pg.locator('.rkchips .rkc-all.on').count() == 1 and pg.locator('.rkcard').count() >= 3, pg.locator('.rkcard').count())
    check('classement : les épreuves reviennent à la ligne', pg.evaluate(HSCROLL) == [] and pg.evaluate("getComputedStyle(document.querySelector('.rkchips')).flexWrap") == 'wrap', pg.evaluate(HSCROLL))
    pg.click('.rkchips [data-v="pompes"]'); pg.wait_for_timeout(300)
    check('classement : une épreuve choisie = elle seule', pg.locator('.rkcard').count() == 1 and 'Pompes' in pg.inner_text('.rkcard .h2').title(), pg.locator('.rkcard').count())
    pg.click('.rkchips [data-v="saut"]'); pg.wait_for_timeout(300)
    check('classement : une 2e épreuve s\'ajoute', pg.locator('.rkcard').count() == 2)
    pg.click('.rkchips [data-v="pompes"]'); pg.wait_for_timeout(300)
    check('classement : retoucher une épreuve la retire', pg.locator('.rkcard').count() == 1)
    pg.click('.rkchips .rkc-all'); pg.wait_for_timeout(300)
    check('classement : « Toutes » revient à toutes les épreuves', pg.locator('.rkcard').count() >= 3)
    full = pg.query_selector('.rkcard .rkmore')
    if full:
        c0 = pg.locator('.rkcard >> nth=0 >> li.rkl').count(); full.click(); pg.wait_for_timeout(300)
        check('classement : « Voir les N joueurs » déplie la liste', pg.locator('.rkcard >> nth=0 >> li.rkl').count() > c0)
    # tirer pour actualiser (enfant)
    pg.evaluate('window.scrollTo(0,0)')
    pg.evaluate("window.__calls=[]; const c1 = MC.api.call; MC.api.call = function (a) { window.__calls.push(a); return c1.apply(this, arguments) }; 1")
    st = pull(60); pg.wait_for_timeout(500)
    check('enfant : petite traction = rien', 'go' not in st.split('|')[0] and 'me' not in pg.evaluate('window.__calls'), st)
    st = pull(230); pg.wait_for_timeout(1400)
    check('enfant : grande traction = « Lâche pour actualiser » puis actualisation', 'Lâche' in st and 'me' in pg.evaluate('window.__calls'), (st, pg.evaluate('window.__calls')))
    # la mission côté enfant : le mot pour les éducs
    push(pg, '#/mission/postes', 1200)
    check('mission enfant : champ « Un mot pour les éducs »', pg.query_selector('#msn-mot') is not None)
    if pg.query_selector('#msn-mot'):
        pg.fill('#msn-mot', 'Je veux être ailier !'); pg.wait_for_timeout(100)
        if not pg.query_selector('.cp-slot.on'):
            pg.goto(BASE + '#/mission/poste/ailier'); pg.wait_for_timeout(900); pg.click('[data-act="msnRank"][data-k="0"]'); pg.wait_for_timeout(300); pg.goto(BASE + '#/mission/postes'); pg.wait_for_timeout(900)
        check('mission enfant : le mot est gardé en brouillon', pg.input_value('#msn-mot') == 'Je veux être ailier !')
        pg.click('[data-act="msnSavePostes"]'); pg.wait_for_timeout(1300)
        check('mission enfant : le mot part avec le top', pg.evaluate("MC.missions.etat(MC.app.S.me, 'poste').message") == 'Je veux être ailier !', pg.evaluate("MC.missions.etat(MC.app.S.me, 'poste').message"))
    # changement de joueur sur l'appareil : Retour ne ramène jamais sur les écrans de l'autre enfant
    push(pg, '#/profil')
    pg.evaluate(KID.replace("'Tom'", "'Inès'") % '#/semaine'); pg.wait_for_timeout(1500); nomodal(pg)
    check('autre joueur : Retour grisé (pas les écrans de Tom)', pg.evaluate("document.querySelector('header.topbar .tb-back').classList.contains('off')"))
    push(pg, '#/bilans')
    back(pg)
    check('autre joueur : Retour dans ses propres écrans', h(pg) == '#/semaine', h(pg))
    print('ERREURS JS :', errs[:5])
    ok = sum(1 for r in res if r[1]); print('%d/%d OK' % (ok, len(res)), 'ÉCHECS :', [r[0] for r in res if not r[1]])
    b.close()
