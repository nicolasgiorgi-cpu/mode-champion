# (v85) Demande de Nicolas du 15/11/2026, côté éducs :
# - modifier les compos en glissant les cartes des joueurs : sur un poste (il prend ce poste), sur une carte (il se range avant ou
#   après : l'équipe passe en « ordre à la main », « remettre le tri » la rend au tri), sur une autre équipe, sur « Pas placés » ;
#   à la souris on tire tout de suite, au doigt un appui long d'abord (un doigt qui part tout de suite fait défiler la page) ;
#   toucher un joueur puis sa destination marche toujours ; pas de glisser sur une compo publiée en lecture ;
# - un groupe par poste dans chaque équipe (jeu à 10), trié par défaut : niveau (A en haut), puis plaquage ;
# - un nouveau poste d'arrière (le 15) : 1 ailier + 1 arrière derrière ; aussi côté enfants (8 cartes dans « Choisis ton poste »).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v85.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v85-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    cdp = ctx.new_cdp_session(pg)
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    shot = lambda n: pg.screenshot(path=OUT + tag + '-' + n + '.png')
    pg.goto(BASE); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(600)
    pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300)
    for c in ev('MC.demo.CODES.educ'): pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if '#/educ/bienvenue' in pg.url:
        for i in range(2): pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="obPick"] >> nth=0'); pg.wait_for_timeout(200)
        pg.click('[data-act="obEducDone"]'); pg.wait_for_timeout(1000)
    IDS = ev("(() => { const g = MC.app.S.cache.group, F = MC.compos.fiches(g), o = {}; Object.keys(F).forEach(id => o[F[id].prenom] = id); return o; })()")
    NOM = {v: k for k, v in IDS.items()}

    # ----- 1. la liste Enfants et la fiche : le poste d'arrière -----
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1200)
    fp = ev("[...document.querySelectorAll('[data-act=\"tPoste\"]')].map(b => b.getAttribute('data-v'))")
    check('Enfants : 9 filtres de poste (Tous + 8), l\'arrière en dernier', len(fp) == 9 and fp[-1] == 'arriere', fp)
    r = ev("""(() => { const b = [...document.querySelectorAll('.tfp [data-act="tPoste"]')].map(e => e.getBoundingClientRect());
      return { lignes: new Set(b.map(x => Math.round(x.top))).size, droite: Math.max(...b.map(x => x.right)) }; })()""")
    check('Enfants : les filtres de poste tiennent sur une ligne, sans dépasser', r['lignes'] == 1 and r['droite'] <= W + 1, r)
    check('Enfants : pas de défilement de côté', noscroll())
    a = ev("(() => { const l = [...document.querySelectorAll('#tlist .tfrow')].find(e => e.querySelector('.tnm').textContent.trim() === 'Arthur'); return l ? [...l.querySelectorAll('.tpp')].map(x => (x.querySelector('[aria-hidden]') || x).textContent.trim() + (x.classList.contains('pref') ? '*' : '')) : null; })()")
    check('Enfants : Arthur a la pastille « 15 » en premier (son poste préféré)', a and a[0] == '15*', a)
    pg.click('[data-act="tPoste"][data-v="arriere"]'); pg.wait_for_timeout(500)
    l = ev("[...document.querySelectorAll('#tlist > li')].map(e => e.classList.contains('tsep') ? '|' : e.querySelector('.tnm').textContent.trim())")
    check('Enfants, filtre 15 : Arthur (préféré), puis Lina (ses vœux)', l == ['Arthur', '|', 'Lina'], l)
    shot('enfants-15')
    pg.click('[data-act="tPoste"][data-v="arriere"]'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/educ/joueur/' + IDS['Arthur']); pg.wait_for_timeout(1200)
    if pg.query_selector('[data-act="tkPref"][data-v="arriere"]') is None:
        tab = pg.query_selector('[role="tab"]:has-text("Terrain"), .subtabs a:has-text("Terrain")')
        if tab: tab.click(); pg.wait_for_timeout(600)
    pref = pg.query_selector('[data-act="tkPref"][data-v="arriere"]')
    check('fiche d\'Arthur : « Arrière » dans ses postes préférés, allumé', pref is not None and pref.get_attribute('aria-pressed') == 'true')
    t = pg.inner_text('#sur-le-terrain') if pg.query_selector('#sur-le-terrain') else ''
    check('fiche : « Lignes arrières » pour le type (plus « Arrière » seul)', 'Lignes arrières' in t, t[-300:])

    # ----- 2. la compo d'un plateau au jeu à 10 : un groupe par poste, trié -----
    def effacer():
        if pg.query_selector('.ctop [data-act="cDiscard"]'):
            pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    effacer()
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    COLS = "[...document.querySelectorAll('.cboard2 .ccol[data-v=\"0\"]:not(.banc)')]"
    g = ev(COLS + ".map(c => [...c.querySelectorAll('.cgrp')].map(x => x.getAttribute('data-p')))")
    ORD = ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'arriere']
    check('compo : 8 groupes par équipe, dans l\'ordre des postes (l\'arrière en dernier)', len(g) >= 2 and all(x == ORD for x in g), g)
    lab = ev("[...document.querySelectorAll('.cboard2 .ccol[data-v=\"0\"]:not(.banc)')][0].querySelectorAll('.cgl')[7].textContent")
    check('compo : le groupe de l\'arrière s\'appelle « Arrière » (v88 : nom en entier)', lab.strip() == 'Arrière', lab)
    vis = ev("[...document.querySelectorAll('.cgrp .cpj > .cpo:not(.cabs)')].filter(e => getComputedStyle(e).display !== 'none').length")
    check('compo : plus d\'étiquette de poste sur les cartes d\'un groupe', vis == 0, vis)
    def ou(nom, v=0):
        return ev("""(([id, v]) => { const c = document.querySelector('.cboard2 .cpj[data-id="' + id + '"][data-v="' + v + '"]'); if (!c) return null;
          const col = c.closest('.ccol'), gr = c.closest('.cgrp'); return { t: col && col.getAttribute('data-t'), p: gr ? gr.getAttribute('data-p') : '' }; })""", [IDS[nom], v])
    def grp(t, p, v=0):
        return ev("""(([t, p, v]) => [...document.querySelectorAll('.cboard2 .ccol[data-v="' + v + '"][data-t="' + t + '"] .cgrp[data-p="' + p + '"] .cpj[data-id]')].map(e => e.getAttribute('data-id')))""", [t, p, v])
    A = ou('Arthur'); tA = A['t']
    check('compo : Arthur (arrière sur sa fiche) dans le groupe 15 de son équipe', A['p'] == 'arriere', A)
    tB = ev(COLS + ".map(c => c.getAttribute('data-t')).filter(t => t !== '%s')[0]" % tA)
    # le tri par défaut : niveau, puis plaquage (le plus fort en haut)
    # la clé du tri : le rang du niveau (A, B ⇅A, B, C ⇅, C, sans niveau), puis le plaquage (pas encore évalué en dernier)
    KEY = ev("(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), o = {}; Object.keys(F).forEach(id => { const q = F[id].plaquage, s = q === null || q === undefined || q === ''; o[id] = [K.rangVivier(F[id]), s ? 99 : -Number(q)]; }); return o; })()")
    cle = lambda i: tuple(KEY[i])
    bon = True; info = []
    for t in [tA, tB]:
        for po in ORD:
            ids = grp(t, po)
            if [cle(i) for i in ids] != sorted(cle(i) for i in ids): bon = False; info.append((t, po, [NOM[i] for i in ids]))
    check('compo : dans un poste, les A en haut, puis le meilleur plaqueur', bon, info)
    check('compo : pas de « remettre le tri » au départ', pg.query_selector('[data-act="cTri"]') is None)
    check('compo : pas de défilement de côté', noscroll())
    shot('compo')

    # ----- 3. à la souris -----
    def centre(sel):
        # au milieu de l'écran : près des bords, la page avance toute seule pendant le geste
        e = pg.query_selector(sel); e.evaluate("e => e.scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(150); bb = e.bounding_box(); return bb
    def tirer(src_sel, dst_sel, fx=0.5, fy=0.5, voir=None):
        s = centre(src_sel); pg.mouse.move(s['x'] + s['width'] * 0.3, s['y'] + s['height'] * 0.4); pg.mouse.down()
        pg.mouse.move(s['x'] + s['width'] * 0.3 + 8, s['y'] + s['height'] * 0.4 + 8, steps=2)
        x, y = s['x'] + s['width'] * 0.3 + 8, s['y'] + s['height'] * 0.4 + 8
        d = pg.query_selector(dst_sel).bounding_box()
        if d['y'] < 130 or d['y'] + d['height'] > H - 140:
            # loin : on tient le pointeur près du bord, la page avance toute seule jusqu'à la destination
            bord = 70 if d['y'] < 130 else H - 60
            pg.mouse.move(x, bord, steps=6); x, y = x, bord
            for k in range(80):
                pg.wait_for_timeout(60); d = pg.query_selector(dst_sel).bounding_box()
                if 150 < d['y'] + d['height'] * fy < H - 160: break
            pg.mouse.move(x, H / 2); pg.wait_for_timeout(250)   # loin des bords : la page s'arrête
            vu_loin.append(ev('scrollY')); d = pg.query_selector(dst_sel).bounding_box()
        pg.mouse.move(d['x'] + d['width'] * fx, d['y'] + d['height'] * fy, steps=10); pg.wait_for_timeout(150)
        if voir: voir()
        pg.mouse.up(); pg.wait_for_timeout(500)
    vu_loin = []
    carte = lambda nom, v=0: '.cboard2 .cpj[data-id="%s"][data-v="%d"]' % (IDS[nom], v)
    gsel = lambda t, po, v=0: '.cboard2 .ccol[data-v="%d"][data-t="%s"] .cgrp[data-p="%s"]' % (v, t, po)
    # 3a. sur un poste (sans viser de carte) : il prend le poste
    I = ou('Inès'); tI = I['t']
    vu = {}
    def voir_a():
        vu['ghost'] = ev("(() => { const g = document.querySelector('.cdg-ghost'); return g ? { w: Math.round(g.getBoundingClientRect().width), nom: g.querySelector('.cpn').textContent } : null; })()")
        vu['sur'] = ev("[...document.querySelectorAll('.cdg-sur')].map(e => e.getAttribute('data-p') || e.getAttribute('data-t'))")
        vu['src'] = ev("!!document.querySelector('.cpj.cdg-src')")
        shot('glisse-souris')
    tirer(carte('Inès'), gsel(tI, 'centre') + ' > .cgl', 0.5, 0.5, voir_a)
    check('souris : une copie de la carte suit le pointeur, la carte d\'origine pâlit', vu.get('ghost') and vu['ghost']['nom'].startswith('Inès') and vu['src'], vu)
    check('souris : le poste visé est en surbrillance', vu.get('sur') == ['centre'], vu)
    check('souris, lâché sur un poste : Inès passe centre', ou('Inès') == {'t': tI, 'p': 'centre'}, ou('Inès'))
    check('après le geste : plus de copie, plus de surbrillance', ev("!document.querySelector('.cdg-ghost, .cdg-bar, .cdg-sur, .cdg-src')"))
    check('lâché sur un poste : l\'équipe reste triée', pg.query_selector('[data-act="cTri"]') is None)
    check('le clic qui suit le geste ne choisit pas le joueur', pg.query_selector('.cpj.sel') is None)
    # 3b. sur une carte : il se range juste avant, l'équipe passe en « ordre à la main » (un poste où le tri départage les deux :
    # à niveau et plaquage égaux, l'ordre posé est déjà celui du tri)
    choix = [(t, po) for t in [tA, tB] for po in ORD if len(grp(t, po)) >= 2 and cle(grp(t, po)[0]) != cle(grp(t, po)[-1])]
    check('il y a un poste où le tri départage deux joueurs', len(choix) > 0)
    tt, pp = choix[0]
    cg = grp(tt, pp); cn = [NOM[i] for i in cg]
    bas, haut = cn[-1], cn[0]
    vu = {}
    def voir_b():
        vu['bar'] = ev("(() => { const b = document.querySelector('.cdg-bar'); return b && getComputedStyle(b).display !== 'none'; })()")
        shot('glisse-carte')
    tirer(carte(bas), carte(haut), 0.15, 0.15, voir_b)
    check('souris, sur le haut d\'une carte : la barre d\'insertion', vu.get('bar') is True, vu)
    cg2 = [NOM[i] for i in grp(tt, pp)]
    check('souris, lâché sur le haut de la 1re carte : %s passe en tête du poste' % bas, cg2[0] == bas and sorted(cg2) == sorted(cn), cg2)
    tri = pg.query_selector('[data-act="cTri"][data-t="%s"]' % tt)
    check('« Ordre à la main · remettre le tri » sous l\'équipe', tri is not None and tri.text_content().strip() == 'Ordre à la main · remettre le tri', tri and tri.text_content())
    check('une seule équipe à la main', len(pg.query_selector_all('[data-act="cTri"]')) == 1)
    shot('ordre-main')
    # dans une équipe rangée à la main, un joueur lâché sur un poste va à la fin du poste
    autre = [i for po in ORD if po != pp for i in grp(tt, po)][0]; pa = ou(NOM[autre])['p']
    tirer(carte(NOM[autre]), gsel(tt, pp) + ' > .cgl')
    cg3 = [NOM[i] for i in grp(tt, pp)]
    check('équipe à la main, lâché sur un poste : à la fin du poste', cg3[-1] == NOM[autre] and cg3[:-1] == cg2, cg3)
    tirer(carte(NOM[autre]), gsel(tt, pa) + ' > .cgl')
    pg.click('[data-act="cTri"][data-t="%s"]' % tt); pg.wait_for_timeout(500)
    check('« remettre le tri » : de nouveau triée, la ligne disparaît', [NOM[i] for i in grp(tt, pp)] == cn and pg.query_selector('[data-act="cTri"]') is None, [NOM[i] for i in grp(tt, pp)])
    # à niveau et plaquage égaux : l'ordre posé est gardé (c'est aussi celui du tri), sans « remettre le tri »
    eg = [(t, po) for t in [tA, tB] for po in ORD if len(grp(t, po)) >= 2 and cle(grp(t, po)[0]) == cle(grp(t, po)[1])]
    if eg:
        t2, p2 = eg[0]; e2 = [NOM[i] for i in grp(t2, p2)]
        tirer(carte(e2[1]), carte(e2[0]), 0.15, 0.15)
        e3 = [NOM[i] for i in grp(t2, p2)]
        check('ex aequo : l\'ordre posé est gardé, sans « remettre le tri »', e3[:2] == [e2[1], e2[0]] and pg.query_selector('[data-act="cTri"]') is None, e3)
    else: check('il y a deux ex aequo dans un poste (démo)', False)
    if pg.query_selector('[data-act="cTri"]'): pg.click('[data-act="cTri"]'); pg.wait_for_timeout(400)
    # 3c. sur une autre équipe (son en-tête) : il y va, à son poste de fiche
    tO = tB if tI == tA else tA
    tirer(carte('Inès'), '.cboard2 .ccol[data-v="0"][data-t="%s"] .chd' % tO)
    o = ou('Inès')
    check('souris, lâché sur une autre équipe : Inès y va, à son poste de fiche (ailier)', o == {'t': tO, 'p': 'ailier'}, o)
    tirer(carte('Inès'), gsel(tI, 'ailier') + ' > .cgl')
    check('et revient dans son équipe en glissant sur son poste', ou('Inès') == {'t': tI, 'p': 'ailier'}, ou('Inès'))
    # 3d. lâché à sa place : rien ne change, pas de « remettre le tri »
    avant = grp(tI, 'ailier')
    tirer(carte('Inès'), carte('Inès'))
    check('lâché sur sa propre carte : rien ne change', grp(tI, 'ailier') == avant and pg.query_selector('[data-act="cTri"]') is None)
    # 3e. Échap annule le geste
    s = centre(carte('Inès')); pg.mouse.move(s['x'] + 20, s['y'] + 10); pg.mouse.down(); pg.mouse.move(s['x'] + 40, s['y'] + 60, steps=4)
    pg.keyboard.press('Escape'); pg.mouse.up(); pg.wait_for_timeout(400)
    check('Échap pendant le geste : rien ne bouge', ou('Inès') == {'t': tI, 'p': 'ailier'} and ev("!document.querySelector('.cdg-ghost')"))

    # ----- 4. au doigt (événements tactiles réels, par CDP) -----
    def touche(typ, x=None, y=None):
        pts = [] if x is None else [{'x': x, 'y': y, 'id': 1, 'radiusX': 4, 'radiusY': 4, 'force': 1}]
        cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': pts})
    vu_doigt = {}
    # le navigateur ne fait défiler la page que si le doigt n'est pas retenu (preventDefault) : on le note à chaque touchmove
    ev("window.addEventListener('touchmove', e => { window.__tmPrev = (window.__tmPrev || 0) + (e.defaultPrevented ? 1 : 0); window.__tmN = (window.__tmN || 0) + 1; }, { passive: true })")
    tm = lambda: ev("[window.__tmPrev || 0, window.__tmN || 0]")
    def doigt(src_sel, dst_sel, appui=420, fy=0.5, voir=None):
        s = centre(src_sel); x0, y0 = s['x'] + s['width'] * 0.3, s['y'] + s['height'] * 0.4
        vu_doigt['sy'] = ev('scrollY')
        touche('touchStart', x0, y0); pg.wait_for_timeout(appui)
        d = pg.query_selector(dst_sel).bounding_box(); x1, y1 = d['x'] + d['width'] * 0.5, d['y'] + d['height'] * fy
        for i in range(1, 13): touche('touchMove', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); pg.wait_for_timeout(16)
        pg.wait_for_timeout(120)
        vu_doigt['sy2'] = ev('scrollY')
        if voir: voir()
        touche('touchEnd'); pg.wait_for_timeout(500)
    # 4a. appui long puis glisser : Nina (9) devient 10
    N = ou('Nina'); tN = N['t']
    vu = {}
    def voir_d():
        vu['ghost'] = ev("!!document.querySelector('.cdg-ghost')"); vu['sur'] = ev("[...document.querySelectorAll('.cdg-sur')].map(e => e.getAttribute('data-p'))")
    t0 = tm(); doigt(carte('Nina'), gsel(tN, 'ouvreur') + ' > .cgl', voir=voir_d); t1 = tm()
    check('doigt, appui long : les mouvements du doigt sont retenus (la page ne défile pas)', t1[1] - t0[1] >= 10 and t1[0] - t0[0] >= t1[1] - t0[1] - 1, (t0, t1))
    check('doigt, appui long : la copie suit le doigt, le poste visé en surbrillance', vu.get('ghost') and vu.get('sur') == ['ouvreur'], vu)
    check('doigt, appui long puis glisser sur le 10 : Nina passe ouvreur', ou('Nina') == {'t': tN, 'p': 'ouvreur'}, ou('Nina'))
    check('doigt : la page n\'a pas défilé sous le doigt pendant le geste', vu_doigt['sy2'] == vu_doigt['sy'], vu_doigt)
    check('doigt : le toucher qui suit ne choisit pas le joueur', pg.query_selector('.cpj.sel') is None)
    doigt(carte('Nina'), gsel(tN, 'demi-de-melee') + ' > .cgl')
    check('doigt : et revient au 9', ou('Nina') == {'t': tN, 'p': 'demi-de-melee'}, ou('Nina'))
    # 4b. un doigt qui part tout de suite : il fait défiler, ne déplace personne
    o0 = ou('Nina'); t0 = tm(); doigt(carte('Nina'), gsel(tN, 'ouvreur') + ' > .cgl', appui=30); t1 = tm()
    check('doigt qui part tout de suite : ses mouvements ne sont pas retenus (la page peut défiler)', t1[1] - t0[1] >= 10 and t1[0] == t0[0], (t0, t1))
    check('doigt qui part tout de suite : personne ne bouge, pas de copie', ou('Nina') == o0 and ev("!document.querySelector('.cdg-ghost, .cdg-src')"), ou('Nina'))
    # 4c. le toucher simple choisit toujours le joueur
    pg.tap(carte('Nina')); pg.wait_for_timeout(500)
    check('toucher simple : le joueur est choisi (comme avant)', pg.query_selector(carte('Nina') + '.sel') is not None or pg.query_selector('.cpanel, .csheet, .modal') is not None)
    if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    if pg.query_selector(carte('Nina') + '.sel'): ev("s => document.querySelector(s).click()", carte('Nina')); pg.wait_for_timeout(400)   # le panneau du joueur peut couvrir la carte
    check('toucher encore : le joueur n\'est plus choisi', pg.query_selector('.cpj.sel') is None)
    # (relecture) un toucher un peu long (0,4 s) sans bouger : ce n'est pas un glisser, il choisit le joueur
    s = centre(carte('Nina')); x0, y0 = s['x'] + s['width'] * 0.3, s['y'] + s['height'] * 0.4
    touche('touchStart', x0, y0); pg.wait_for_timeout(420); touche('touchEnd'); pg.wait_for_timeout(500)
    check('toucher de 0,4 s sans bouger : le joueur est choisi, rien ne bouge', pg.query_selector(carte('Nina') + '.sel') is not None and ou('Nina') == o0, ou('Nina'))
    if pg.query_selector(carte('Nina') + '.sel'): ev("s => document.querySelector(s).click()", carte('Nina')); pg.wait_for_timeout(400)
    check('pas d\'erreur JavaScript pendant les gestes', not errs, errs)

    # ----- 5. « Créer manuellement » : depuis « Pas placés » vers un poste, et retour -----
    effacer()
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="cZero10"]'); pg.wait_for_timeout(900)
    if pg.query_selector('.modal'):
        x = pg.query_selector('.modal [data-act="close"], .modal .mclose, .modal button[aria-label="Fermer"]')
        if x: x.click()
        else: pg.keyboard.press('Escape')
        pg.wait_for_timeout(600)
    banc = '.cboard2 .ccol.banc[data-v="0"][data-t="banc"]'
    check('à la main : tout le monde dans « Pas placés »', pg.query_selector(banc + ' .cpj[data-id="%s"]' % IDS['Léo']) is not None)
    t1 = ev(COLS + "[0].getAttribute('data-t')")
    tirer(carte('Léo'), gsel(t1, 'talonneur'))
    check('glisser de « Pas placés » sur le talonneur : Léo y est', ou('Léo') == {'t': t1, 'p': 'talonneur'}, ou('Léo'))
    tirer(carte('Léo'), banc + ' .chd')
    check('glisser sur « Pas placés » : Léo en sort', (ou('Léo') or {}).get('t') == 'banc', ou('Léo'))
    shot('a-la-main')
    effacer()

    # ----- 6. « Poste par poste » : 8 postes -----
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="cZero10"]'); pg.wait_for_timeout(900)
    n = ev("document.querySelectorAll('.modal .ppnav > *').length")
    r = ev("(() => { const m = document.querySelector('.modal .ppnav'); if (!m) return null; const b = [...m.children].map(e => e.getBoundingClientRect()), mr = m.getBoundingClientRect(); return { lignes: new Set(b.map(x => Math.round(x.top))).size, dep: Math.max(...b.map(x => x.right)) - mr.right, sw: m.scrollWidth - m.clientWidth }; })()")
    check('« Poste par poste » : 8 postes en haut', n == 8, n)
    check('« Poste par poste » : les 8 postes tiennent sur une ligne, dans la fenêtre', r and r['lignes'] == 1 and r['dep'] <= 1 and r['sw'] <= 1, r)
    r = ev("[...document.querySelectorAll('.modal .ppnav > *')].map(e => e.scrollWidth - e.clientWidth)")
    check('« Poste par poste » : le texte de chaque poste tient dans sa tuile', max(r) <= 0, r)
    sub = ev("(() => { const s = document.querySelector('.modal .cpk-sub'); return s ? s.textContent : ''; })()")
    check('« Poste par poste » : « 1 sur 8 »', '1 sur 8' in sub, sub)
    shot('poste-par-poste')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    effacer()

    # ----- 7. compo publiée : (v86) modifiable tout de suite ; la compo d'un autre éduc, en lecture : pas de glisser -----
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(900)
    if pg.query_selector('.modal button[data-i="0"]'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    check('(v86) publiée : le tableau modifiable tout de suite, sans « Modifier la compo »', pg.query_selector('[data-act="cEditer"]') is None and pg.query_selector('.cboard2.ed') is not None)
    I = ou('Inès'); tI = I['t']
    tirer(carte('Inès'), gsel(tI, 'centre') + ' > .cgl')
    check('(v86) publiée : le glisser marche, puis « Annuler » et « Enregistrer »', ou('Inès') == {'t': tI, 'p': 'centre'} and pg.query_selector('.ctop [data-act="cSave"]') is not None and pg.query_selector('.ctop [data-act="cDiscard"]') is not None, ou('Inès'))
    pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400); pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(900)
    check('(v86) « Annuler » : la compo publiée revient', ou('Inès') == I and pg.query_selector('[data-act="cSave"]') is None, ou('Inès'))
    # la compo d'un autre éduc (pas le jour J) : en lecture, le glisser ne déplace personne
    pg.goto(BASE + '#/educ/compo/sp-demo-e0?p=matchs'); pg.wait_for_timeout(1300)
    check('compo d\'un autre éduc : en lecture (« Proposer des changements »), le tableau sans « ed »', pg.query_selector('[data-act="cCounter"]') is not None and pg.query_selector('.cboard2.ed') is None)
    cs = ev("[...document.querySelectorAll('.cboard2 .ccol[data-t]:not(.banc)')].map(c => c.getAttribute('data-t'))")
    src = ev("(() => { const c = document.querySelector('.cboard2 .ccol[data-t]:not(.banc) .cpj[data-id]'); return [c.getAttribute('data-id'), c.closest('.ccol').getAttribute('data-t')]; })()")
    dst = [t for t in cs if t != src[1]][0]
    tirer('.cboard2 .cpj[data-id="%s"]' % src[0], '.cboard2 .ccol[data-t="%s"] .chd' % dst)
    apres = ev("s => document.querySelector('.cboard2 .cpj[data-id=\"' + s + '\"]').closest('.ccol').getAttribute('data-t')", src[0])
    check('compo d\'un autre éduc : glisser ne déplace personne, pas de copie', apres == src[1] and ev("!document.querySelector('.cdg-ghost')"), apres)
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)

    # ----- 8. côté éduc : la mission des postes compte l'arrière -----
    pg.goto(BASE + '#/educ/mission/poste'); pg.wait_for_timeout(1300)
    t = pg.inner_text('main')
    check('éduc, mission des postes : l\'arrière dans le graphique des vœux', 'Arrière' in t or 'arrière' in t, t[:600])
    check('éduc, mission : « 8 cartes »', '8 cartes' in t, t[:400])

    # ----- 9. côté enfant : 8 cartes, la fiche de l'arrière -----
    pg.close(); ctx.close()
    ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto(BASE); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    pg.goto(BASE + '#/mission/postes'); pg.wait_for_timeout(1300)
    ids = ev("[...document.querySelectorAll('a[href^=\"#/mission/poste/\"]')].map(a => a.getAttribute('href').split('/').pop())")
    check('enfant, « Choisis ton poste » : 8 cartes, l\'arrière en dernier', len(ids) == 8 and ids[-1] == 'arriere', ids)
    check('enfant, cartes : pas de défilement de côté', noscroll())
    shot('enfant-cartes')
    pg.goto(BASE + '#/mission/poste/arriere'); pg.wait_for_timeout(1300)
    t = pg.inner_text('main')
    check('enfant, fiche de l\'arrière : son nom et ses joueurs', 'Arrière' in t or 'ARRIÈRE' in t.upper(), t[:300])
    check('enfant, fiche de l\'arrière : pas de défilement de côté', noscroll())
    shot('enfant-arriere')

    check('aucune erreur JavaScript', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d OK (%s)' % (len(res) - len(bad), len(res), tag))
sys.exit(1 if bad else 0)
