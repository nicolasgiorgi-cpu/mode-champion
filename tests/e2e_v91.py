# (v91) Le tableau des postes : compo au jeu à 10, équipes côte à côte, iPad en paysage (maquette validée par Nicolas le 18/11/2026).
# Une ligne par poste, une colonne par équipe ; noms courts des postes dans une colonne commune ; la répartition de l'équipe devant
# chaque case ; cartes sur une ligne ; « Remp. » sous les titulaires ; case rouge pour une place vide ; à droite : Spond, « Pas placés »,
# « En attente », la carte de l'enfant touché, « À regarder », « Poste par poste » ; 2 versions : 4 colonnes, colonne repliée.
# Le téléphone et l'iPad en portrait ne changent pas.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v91.py 1180 820 · 390 844 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v91-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1180, 820)
tag = '%dx%d' % (W, H)
TAB = W >= 1000 and W > H
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
ORD = ['pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier', 'arriere']
COURT = ['Pil', 'Tal', '3eL', '9', '10', 'Ctr', 'Ail', '15']
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

    def proposer(evt='sp-demo-p3'):
        pg.goto(BASE + '#/educ/compo/' + evt); pg.wait_for_timeout(1300)
        if pg.query_selector('[data-act="cDiscard"].ceff'):
            pg.click('[data-act="cDiscard"].ceff'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
        pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
        if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
        pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    proposer()

    if not TAB:
        # ----- téléphone, iPad en portrait : rien ne change -----
        check('pas de tableau des postes (téléphone ou iPad en portrait)', pg.query_selector('.ctab') is None and pg.query_selector('.ctb') is None)
        check('les équipes et leurs groupes par poste comme avant (v85)', len(ev("[...document.querySelectorAll('.cboard2 .ccol:not(.banc) .cgrp[data-p]')]")) >= 16)
        check('les cartes sur 2 lignes comme avant (pas de carte sur une ligne)', pg.query_selector('.cpj.ct1') is None)
        check('« Légende et gestes » et « Poste par poste » à leur place d\'avant', pg.query_selector('details.caide') is not None and pg.query_selector('button[data-act="cParPoste"]') is not None)
        pg.click('button[data-act="cParPoste"]'); pg.wait_for_timeout(500)
        check('« Poste par poste » s\'ouvre toujours en fenêtre', pg.query_selector('.modal.ppk') is not None)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        nom1 = ev("document.querySelector('.cboard2 .ccol:not(.banc) .cpj .cpn').textContent")
        pg.click('.cboard2 .ccol:not(.banc) .cpj'); pg.wait_for_timeout(400)
        check('toucher un enfant : son panneau en bas, comme avant', pg.query_selector('.cdock .cselp') is not None)
        check('pas de défilement de côté', noscroll())
        shot('avant')
        if pg.query_selector('.cdock .cselp [aria-label="Fermer"]'): pg.click('.cdock .cselp [aria-label="Fermer"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="cAddV"]'); pg.wait_for_timeout(400); pg.click('[data-av="copie"]'); pg.wait_for_timeout(1200)
        check('(relecture) 2 versions : pas de puce « N à regarder » en haut, comme avant la v91', pg.query_selector('.ctop [data-act="cVoirAlertes"]') is None)
        print('%d/%d' % (sum(1 for r in res if r[1]), len(res)), 'erreurs :', errs)
        check('aucune erreur JavaScript', not errs, errs)
        sys.exit(0 if all(r[1] for r in res) else 1)

    # ----- 1. le tableau : une ligne par poste, une colonne par équipe -----
    check('le tableau des postes s\'affiche (jeu à 10, côte à côte, iPad en paysage)', pg.query_selector('.cboard2.ctab.ed .ctgrid') is not None)
    lab = ev("[...document.querySelectorAll('.ctlab .ctlb[data-p]')].map(b => [b.getAttribute('data-p'), b.textContent.trim()])")
    check('à gauche, une colonne commune : les 8 postes en nom court, dans l\'ordre', [x[0] for x in lab] == ORD and [x[1] for x in lab] == COURT, lab)
    T = ev("[...document.querySelectorAll('.ctab .ctcol')].map(c => c.getAttribute('data-t'))")
    check('une colonne par équipe (2 équipes)', len(T) == 2, T)
    ALIGN = """(() => { const out = []; %s.forEach(p => {
        const l = document.querySelector('.ctlab .ctlb[data-p="' + p + '"]'), cs = [...document.querySelectorAll('.ctab .ctc[data-p="' + p + '"]')];
        const tops = [l].concat(cs).map(e => Math.round(e.getBoundingClientRect().top));
        if (Math.max(...tops) - Math.min(...tops) > 1) out.push(p + ' ' + tops.join('/')); }); return out; })()""" % str(ORD)
    a = ev(ALIGN)
    check('chaque poste sur la même ligne dans toutes les équipes, en face de son nom', not a, a)
    check('pas d\'ajustement au JavaScript (alignerPostes) dans le tableau', ev("[...document.querySelectorAll('.ctab .cgrp, .ctab .csech')].filter(e => e.style.marginTop).length") == 0)
    r = ev("(() => { const b = document.querySelector('.ctb').getBoundingClientRect(), k = [...document.querySelectorAll('.ctb > *')].map(e => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)); return { h: Math.round(b.height), lignes: new Set(k.map(x => Math.round(x / 6))).size }; })()")
    check('la barre d\'outils tient sur une ligne', r['h'] <= 64 and r['lignes'] <= 2, r)
    bar = ev("(() => { const b = document.querySelector('.ctb'); return { etat: b.querySelector('.ctbs').textContent, publier: !!b.querySelector('[data-act=\"cPublish\"]'), annuler: !!b.querySelector('[data-act=\"cUndo\"]'), fiches: !!b.querySelector('[data-act=\"cPostes\"]'), ppp: !!b.querySelector('[data-act=\"cTabPPP\"]'), regarder: !!b.querySelector('[data-act=\"cVoirAlertes\"]'), aide: !!b.querySelector('[data-act=\"cTabAide\"]'), opt: b.querySelector('.ctbo').textContent }; })()")
    check('barre : état, options résumées, annuler, postes des fiches, poste par poste, à regarder, publier, légende', bar['etat'] == 'Brouillon' and bar['publier'] and bar['annuler'] and bar['fiches'] and bar['ppp'] and bar['regarder'] and bar['aide'] and 'Jeu à 10' in bar['opt'], bar)
    check('plus de titre « La compo » ni de « Légende et gestes » dépliés sur la page', pg.query_selector('h1.big') is None and pg.query_selector('details.caide') is None)
    t1 = ev("Math.round(document.querySelector('.ctab .ctc[data-p=\"pilier\"]').getBoundingClientRect().top)")
    check('les piliers de la 1re équipe dans le premier écran, en haut', t1 < 260, t1)
    h = ev("[...document.querySelectorAll('.ctab .cpj.ct1')].map(e => Math.round(e.getBoundingClientRect().height))")
    check('les cartes du tableau sur une ligne (40 px)', h and all(x == 40 for x in h), h[:6])
    check('pas de défilement de côté', noscroll())
    rep = ev("[...document.querySelectorAll('.ctab .ctc[data-p] > .ctrep')].map(e => e.querySelector('.n').textContent)")
    check('devant chaque case, la répartition de l\'équipe pour ce poste (« 2+1 »)', len(rep) == 16 and all('+' in x for x in rep), rep)
    # le poste de la ligne n'est pas répété sur la carte ; ★ quand c'est son poste principal ; pointillés : pas son poste
    K = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), out = { rep: 0, star: 0, starBad: 0, off: 0, offBad: 0 };
      document.querySelectorAll('.ctab .ctc[data-p] .cpj.ct1').forEach(c => { const p = c.closest('.ctc').getAttribute('data-p'), f = F[c.getAttribute('data-id')];
        const pills = [...c.querySelectorAll('.tpp')].map(x => x.getAttribute('title') || ''); if (pills.some(t => t.startsWith(K.nomPoste ? '' : '') && t.split(',')[0] === ({pilier:'Pilier',talonneur:'Talonneur','troisieme-ligne':'3e ligne','demi-de-melee':'Demi de mêlée',ouvreur:'Ouvreur',centre:'Centre',ailier:'Ailier',arriere:'Arrière'})[p])) out.rep++;
        const st = !!c.querySelector('.ctst'); if (st) out.star++; if (st !== (K.lienPoste(f, p) === 'pref')) out.starBad++;
        const off = c.classList.contains('ctoff'); if (off) out.off++; if (off !== (K.postesDe(f).length > 0 && K.postesDe(f).indexOf(p) < 0)) out.offBad++; });
      return out; })()""")
    check('carte : le poste de la ligne n\'est pas répété dans ses pastilles', K['rep'] == 0, K)
    check('carte : ★ seulement sur son poste principal', K['star'] > 0 and K['starBad'] == 0, K)
    check('carte en pointillés seulement si ce n\'est pas son poste', K['offBad'] == 0, K)
    rp = ev("[...document.querySelectorAll('.ctab .ctc .crsep')].map(e => e.textContent.trim())")
    check('remplaçants sous les titulaires de la même case, après « Remp. »', len(rp) >= 1 and all(x == 'Remp.' for x in rp), rp)
    sl = ev("[...document.querySelectorAll('.ctab .ctc .cslot')].map(e => [e.closest('.ctc').getAttribute('data-p'), e.textContent.trim(), getComputedStyle(e).borderTopColor])")
    check('place de titulaire vide : case rouge « + 3e ligne »', len(sl) >= 1 and all(x[1] == '+ ' + {'troisieme-ligne': '3e ligne'}.get(x[0], x[1][2:]) for x in sl) and 'rgb(255' in sl[0][2], sl)
    sp = ev("(() => { const s = document.querySelector('.ctside'); return s ? { spond: !!s.querySelector('.cspond'), pas: !!s.querySelector('.ccol.banc[data-t=\"banc\"]'), att: !!s.querySelector('.ctatt'), sticky: getComputedStyle(s).position } : null; })()")
    check('colonne de droite : la ligne Spond en tête, « Pas placés », « En attente », collée en haut', sp and sp['spond'] and sp['pas'] and sp['att'] and sp['sticky'] == 'sticky', sp)
    ok = ev("document.querySelectorAll('.ctab .ctc .cpj .crep.cok').length")
    check('réponses Spond sur les cartes du tableau (✓ confirmé)', ok >= 10, ok)
    check('pas de bouton « Absent » (événement Spond, v90)', pg.query_selector('[data-act="cAbsent"]') is None)
    shot('tableau')

    def ou(nom, v=0):
        return ev("""(([id, v]) => { const c = document.querySelector('.ctab .ctgrid .cpj[data-id="' + id + '"][data-v="' + v + '"]'); if (!c) return document.querySelector('.ctab .ctside .ccol.banc .cpj[data-id="' + id + '"]') ? { t: 'banc', p: '' } : null;
          const col = c.closest('.ccol'), gr = c.closest('.ctc'); return { t: col && col.getAttribute('data-t'), p: gr ? (gr.getAttribute('data-p') || '') : '' }; })""", [IDS[nom], v])
    carte = lambda nom, v=0: '.ctab .cpj[data-id="%s"][data-v="%d"]' % (IDS[nom], v)
    case = lambda t, po, v=0: '.ctab .ctc[data-v="%d"][data-t="%s"][data-p="%s"]' % (v, t, po)
    autre = lambda t: [x for x in T if x != t][0]

    # ----- 2. toucher un enfant : sa carte à droite, ses postes allumés à gauche -----
    I = ou('Inès'); tI = I['t']
    pg.click(carte('Inès')); pg.wait_for_timeout(500)
    sel = ev("(() => { const s = document.querySelector('.ctside .cselp'); return s ? { nom: s.querySelector('.t1').textContent, eqs: [...s.querySelectorAll('[data-act=\"cMove\"]')].map(b => b.textContent), postes: s.querySelectorAll('[data-act=\"cPoste\"]').length } : null; })()")
    check('toucher Inès : sa carte s\'ouvre dans la colonne de droite (pas en bas)', sel and 'Inès' in sel['nom'] and pg.query_selector('.cdock') is None, sel)
    check('sa carte : les équipes (A1, B1…) puis « Pas placé », et les 8 postes', sel and len(sel['eqs']) == 3 and sel['eqs'][-1] == 'Pas placé' and sel['postes'] == 8, sel)
    mk = ev("Object.fromEntries([...document.querySelectorAll('.ctlb[data-p]')].map(b => [b.getAttribute('data-p'), ['pm','pc','pn'].filter(k => b.classList.contains(k))[0] || '']))")
    exp = ev("(() => { const K = MC.compos, f = K.fiches(MC.app.S.cache.group)['%s'], o = {}; K.ORDRE.forEach(p => { const l = K.lienPoste(f, p); o[p] = l === 'pref' ? 'pm' : l === 'sec' ? 'pc' : 'pn'; }); return o; })()" % IDS['Inès'])
    check('les noms de ses postes s\'allument à gauche (plein = principal, contour = peut jouer, les autres pâlissent)', mk == exp, (mk, exp))
    shot('carte')
    # changer d'équipe : il va à son poste de la fiche, la carte reste ouverte
    pg.click('.ctside .cselp [data-act="cMove"][data-t="%s"]' % autre(tI)); pg.wait_for_timeout(600)
    I2 = ou('Inès')
    check('dans sa carte, l\'autre équipe : Inès y va, et sa carte reste ouverte', I2 and I2['t'] == autre(tI) and pg.query_selector('.ctside .cselp') is not None, I2)
    autreEnfant = ev("[...document.querySelectorAll('.ctab .ctcol[data-t=\"%s\"] .cpj')].map(e => e.getAttribute('data-id'))[0]" % tI)
    A0 = ou(NOM[autreEnfant])
    pg.click(carte(NOM[autreEnfant])); pg.wait_for_timeout(500)
    check('(relecture) carte restée ouverte, toucher un autre enfant : il est choisi, pas d\'échange', ou(NOM[autreEnfant]) == A0 and ou('Inès') == I2 and NOM[autreEnfant] in ev("document.querySelector('.ctside .cselp .t1').textContent"), (ou(NOM[autreEnfant]), ou('Inès')))
    pg.click(carte(NOM[autreEnfant])); pg.wait_for_timeout(400)   # le toucher encore : sa carte se ferme
    pg.click(carte('Inès')); pg.wait_for_timeout(400)
    pg.click('.ctside .cselp [data-act="cPoste"][data-p="centre"]'); pg.wait_for_timeout(600)
    check('dans sa carte, le poste « Ctr » : Inès passe centre', ou('Inès') == {'t': autre(tI), 'p': 'centre'}, ou('Inès'))
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500); pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    check('« Annuler » (deux fois) : Inès revient à sa place', ou('Inès') == I, ou('Inès'))
    # toucher un enfant puis une case du tableau
    pg.click(carte('Inès')); pg.wait_for_timeout(400)
    bb = pg.query_selector(case(autre(tI), 'arriere')).bounding_box()
    pg.mouse.click(bb['x'] + bb['width'] - 6, bb['y'] + bb['height'] - 4); pg.wait_for_timeout(600)
    check('toucher Inès puis la case « 15 » de l\'autre équipe : elle y va, arrière', ou('Inès') == {'t': autre(tI), 'p': 'arriere'}, ou('Inès'))
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    # « Titulaire » / « Remplaçant » dans sa carte
    remp = ev("(() => { const s = document.querySelector('.ctab .ctc .crsep'); if (!s) return null; let n = s.nextElementSibling; return n ? n.querySelector('.cpj').getAttribute('data-id') : null; })()")
    if remp:
        R0 = ou(NOM[remp]); pg.click(carte(NOM[remp])); pg.wait_for_timeout(400)
        pg.click('.ctside [data-act="cTitu"][data-r="t"]'); pg.wait_for_timeout(600)
        tete = ev("document.querySelector('%s .cpj').getAttribute('data-id')" % case(R0['t'], R0['p']))
        check('« Titulaire » dans sa carte : il passe en tête de sa case', tete == remp, (NOM.get(tete), NOM[remp]))
        pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    if pg.query_selector('.ctside .cselp'): pg.click('.ctside .cselp .cselh [data-act="cPick"]'); pg.wait_for_timeout(400)

    # ----- 3. glisser à la souris : sur une case, sur une carte, vers « Pas placés » et retour -----
    def centre(sel):
        e = pg.query_selector(sel); e.evaluate("e => e.scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(150); return e.bounding_box()
    def tirer(src, dst, fx=0.5, fy=0.5, voir=None):
        s = centre(src); x, y = s['x'] + s['width'] * 0.3, s['y'] + s['height'] * 0.5
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 8, y + 8, steps=2)
        d = pg.query_selector(dst).bounding_box()
        pg.mouse.move(d['x'] + d['width'] * fx, d['y'] + d['height'] * fy, steps=10); pg.wait_for_timeout(150)
        if voir: voir()
        pg.mouse.up(); pg.wait_for_timeout(500)
    N = ou('Nina'); vu = {}
    def voir():
        vu['g'] = ev("!!document.querySelector('.cdg-ghost')"); vu['sur'] = ev("[...document.querySelectorAll('.cdg-sur')].map(e => e.getAttribute('data-p') || e.getAttribute('data-t'))")
        vu['lab'] = ev("[...document.querySelectorAll('.ctlb.pm, .ctlb.pc')].length")
        vu['h'] = ev("[...document.querySelectorAll('.ctab .ctc')].map(e => Math.round(e.getBoundingClientRect().height)).join()")
    h0 = ev("[...document.querySelectorAll('.ctab .ctc')].map(e => Math.round(e.getBoundingClientRect().height)).join()")
    tirer(carte('Nina'), case(autre(N['t']), 'ouvreur') + ' > .ctrep', voir=voir)
    check('souris : pendant le geste, la case visée en surbrillance et ses postes allumés à gauche', vu.get('g') and vu.get('sur') == ['ouvreur'] and vu.get('lab', 0) >= 1, vu)
    check('souris : pendant le geste, la hauteur des lignes ne bouge pas', vu.get('h') == h0)
    check('souris, glisser Nina sur la case « 10 » de l\'autre équipe : elle y va, ouvreur', ou('Nina') == {'t': autre(N['t']), 'p': 'ouvreur'}, ou('Nina'))
    check('après le geste, plus rien d\'allumé à gauche', ev("document.querySelectorAll('.ctlb.pm, .ctlb.pc, .ctlb.pn').length") == 0)
    tirer(carte('Nina'), '.ctside .ccol.banc[data-t="banc"] .chd')
    check('souris, glisser Nina vers « Pas placés » : elle sort', ou('Nina') == {'t': 'banc', 'p': ''}, ou('Nina'))
    tirer(carte('Nina'), case(N['t'], 'demi-de-melee') + ' > .ctrep')
    check('souris, de « Pas placés » vers sa case « 9 » : elle revient', ou('Nina') == N, ou('Nina'))
    # sur une carte : l'ordre (avant ou après elle)
    L = ev("[...document.querySelectorAll('%s .cpj')].map(e => e.getAttribute('data-id'))" % case(N['t'], 'pilier'))
    if len(L) >= 2:
        tirer(carte(NOM[L[1]]), '%s .cpj[data-id="%s"]' % (case(N['t'], 'pilier'), L[0]), fy=0.2)
        L2 = ev("[...document.querySelectorAll('%s .cpj')].map(e => e.getAttribute('data-id'))" % case(N['t'], 'pilier'))
        check('souris, sur la carte du 1er pilier (haut) : le 2e passe devant, « Ordre à la main · remettre le tri »', L2[:2] == [L[1], L[0]] and pg.query_selector('.ctab [data-act="cTri"]') is not None, [NOM[i] for i in L2])
        pg.click('.ctab [data-act="cTri"]'); pg.wait_for_timeout(500)
        check('« remettre le tri » : l\'ordre de départ revient', ev("[...document.querySelectorAll('%s .cpj')].map(e => e.getAttribute('data-id'))" % case(N['t'], 'pilier')) == L)
    # sur l'en-tête d'une équipe : il y va, à son poste de la fiche
    A = ou('Arthur')
    tirer(carte('Arthur'), '.ctab .ccol[data-v="0"][data-t="%s"] .cthd' % autre(A['t']))
    check('souris, sur le nom de l\'autre équipe : Arthur y va, à son poste (15)', ou('Arthur') == {'t': autre(A['t']), 'p': 'arriere'}, ou('Arthur'))
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)

    # ----- 4. au doigt : appui long puis glisser (événements tactiles, CDP) -----
    def touche(typ, x=None, y=None):
        pts = [] if x is None else [{'x': x, 'y': y, 'id': 1, 'radiusX': 4, 'radiusY': 4, 'force': 1}]
        cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': pts})
    def doigt(src, dst, appui=420):
        s = centre(src); x0, y0 = s['x'] + s['width'] * 0.3, s['y'] + s['height'] * 0.5
        touche('touchStart', x0, y0); pg.wait_for_timeout(appui)
        d = pg.query_selector(dst).bounding_box(); x1, y1 = d['x'] + d['width'] * 0.5, d['y'] + d['height'] * 0.5
        for i in range(1, 13): touche('touchMove', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); pg.wait_for_timeout(16)
        pg.wait_for_timeout(120); touche('touchEnd'); pg.wait_for_timeout(500)
    doigt(carte('Nina'), case(N['t'], 'ouvreur') + ' > .ctrep')
    check('doigt, appui long puis glisser sur la case « 10 » : Nina passe ouvreur', ou('Nina') == {'t': N['t'], 'p': 'ouvreur'}, ou('Nina'))
    o0 = ou('Nina'); doigt(carte('Nina'), case(N['t'], 'demi-de-melee') + ' > .ctrep', appui=30)
    check('doigt qui part tout de suite : personne ne bouge', ou('Nina') == o0, ou('Nina'))
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)

    # ----- 5. « Poste par poste » dans la colonne de droite -----
    sl = pg.query_selector('.ctab .ctc .cslot')
    if sl:
        po = sl.evaluate("e => e.closest('.ctc').getAttribute('data-p')"); sl.click(); pg.wait_for_timeout(500)
        pp = ev("(() => { const s = document.querySelector('.ctside .ctpp'); return s ? { titre: s.querySelector('.ctpps-n b').textContent, btn: s.querySelectorAll('[data-act=\"cTabPP\"]').length } : null; })()")
        check('toucher la case rouge : « Poste par poste » s\'ouvre dans la colonne, sur ce poste', pp and pp['btn'] > 0 and pg.query_selector('.modal') is None and pg.query_selector('.ctlb.on[data-p="%s"]' % po) is not None, pp)
        check('la ligne du poste actif est marquée dans le tableau', len(ev("[...document.querySelectorAll('.ctab .ctc.ctact')]")) >= 1)
        b1 = pg.query_selector('.ctside .ctpp [data-act="cTabPP"]'); kid = b1.get_attribute('data-id'); tt = b1.get_attribute('data-t'); b1.click(); pg.wait_for_timeout(600)
        check('un bouton d\'équipe : l\'enfant y va, à ce poste', ou(NOM[kid]) == {'t': tt, 'p': po}, ou(NOM[kid]))
        pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    pg.click('.ctab .ctlb[data-p="talonneur"]'); pg.wait_for_timeout(500)
    check('toucher le nom « Tal » : poste par poste sur le talonneur', pg.query_selector('.ctlb.on[data-p="talonneur"]') is not None and 'Talonneur' in (ev("(document.querySelector('.ctside .ctpps-n b') || {}).textContent || ''")))
    pg.click('.ctside [data-act="cTabPas"][data-d="1"]'); pg.wait_for_timeout(400)
    check('« › » : le poste suivant (3es lignes)', '3es lignes' in ev("document.querySelector('.ctside .ctpps-n b').textContent"))
    pg.click('.ctb [data-act="cTabPPP"]'); pg.wait_for_timeout(400)
    check('le bouton « Poste par poste » de la barre le referme : « Pas placés » revient', pg.query_selector('.ctside .ctpp') is None and pg.query_selector('.ctside .ccol.banc') is not None)
    # complet partout : on passe au suivant (un pilier sort d'abord, pour qu'il reste un poste à prendre)
    pil = ev("document.querySelector('.ctab .ctc[data-p=\"pilier\"] .cpj').getAttribute('data-id')")
    pg.click(carte(NOM[pil])); pg.wait_for_timeout(400); pg.click('.ctside .cselp [data-act="cMove"][data-t="banc"]'); pg.wait_for_timeout(600)
    check('dans sa carte, « Pas placé » : il sort, sa carte se ferme', ou(NOM[pil]) == {'t': 'banc', 'p': ''} and pg.query_selector('.ctside .cselp') is None, ou(NOM[pil]))
    pg.click('.ctab .ctlb[data-p="troisieme-ligne"]'); pg.wait_for_timeout(400)
    for k in range(4):
        if ev("(document.querySelector('.ctside .ctpps-n b') || {}).textContent") != '3es lignes': break
        bs = pg.query_selector_all('.ctside .ctpp [data-act="cTabPP"]')
        if not bs: break
        # l'équipe à laquelle il manque des 3es lignes
        manque = ev("[...document.querySelectorAll('.ctab .ctc[data-p=\"troisieme-ligne\"]')].filter(c => c.querySelector('.cslot')).map(c => c.getAttribute('data-t'))[0] || ''")
        if not manque: break
        pg.click('.ctside .ctpp [data-act="cTabPP"][data-t="%s"]' % manque); pg.wait_for_timeout(500)
    check('les 3es lignes complètes dans toutes les équipes : on passe au poste qui reste à prendre (les piliers)', ev("(document.querySelector('.ctside .ctpps-n b') || {}).textContent") == 'Piliers', ev("(document.querySelector('.ctside .ctpps-n b') || {}).textContent"))
    pg.click('.ctb [data-act="cTabPPP"]'); pg.wait_for_timeout(400)

    # ----- 6. « À regarder » dans la colonne ; la légende -----
    pg.click('.ctb [data-act="cVoirAlertes"]'); pg.wait_for_timeout(500)
    check('« N à regarder » : la liste dans la colonne de droite', pg.query_selector('.ctside #calertes .calerts') is not None and pg.query_selector('.ctb [data-act="cVoirAlertes"][aria-pressed="true"]') is not None)
    pg.click('.ctb [data-act="cVoirAlertes"]'); pg.wait_for_timeout(400)
    check('encore : la liste se referme', pg.query_selector('.ctside #calertes') is None)
    pg.click('.ctb [data-act="cTabAide"]'); pg.wait_for_timeout(400)
    t = ev("(document.querySelector('.modal') || {}).textContent || ''")
    check('« Légende et gestes » dans une fenêtre (Répartition, pas son poste, Remp., case rouge, gestes)', 'répartition' in t and 'pas son poste' in t and 'Remp.' in t and 'Case rouge' in t and 'Appui long' in t, t[:200])
    pg.click('.modal button[data-i="1"]'); pg.wait_for_timeout(800)
    check('« Équipes l\'une sous l\'autre » : l\'affichage d\'avant revient', pg.query_selector('.ctab') is None and pg.query_selector('.cvue') is not None)
    pg.click('[data-act="cCote"][data-v="1"]'); pg.wait_for_timeout(800)
    check('« Côte à côte » : le tableau revient', pg.query_selector('.ctab') is not None)

    # ----- 7. options, publier, compo publiée -----
    pg.click('.ctb [data-act="cOptT"]'); pg.wait_for_timeout(400)
    check('les options résumées s\'ouvrent sous la barre', pg.query_selector('details.cbopt[open]') is not None)
    pg.click('.ctb [data-act="cOptT"]'); pg.wait_for_timeout(300)
    check('… et se referment', pg.query_selector('details.cbopt') is None)
    pg.click('.ctb [data-act="cPublish"]'); pg.wait_for_timeout(500)
    if pg.query_selector('.modal'):
        if pg.query_selector('.modal textarea'): pg.fill('.modal textarea', 'Test du tableau')
        pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1500)
    st = ev("(document.querySelector('.ctb .ctbs') || {}).textContent || ''")
    check('« Publier » : la compo publiée, toujours dans le tableau, « Partager » dans la barre', 'Publiée' in st and pg.query_selector('.ctb [data-act="cPartager"]') is not None, st)
    N = ou('Nina'); tirer(carte('Nina'), case(autre(N['t']), 'ouvreur') + ' > .ctrep')
    st = ev("document.querySelector('.ctb .ctbs').textContent")
    check('compo publiée modifiable tout de suite (v86) : « Pas enregistré », « Annuler » et « Enregistrer » dans la barre', st == 'Pas enregistré' and pg.query_selector('.ctb [data-act="cSave"]') is not None and pg.query_selector('.ctb [data-act="cDiscard"]') is not None, st)
    pg.click('.ctb [data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    check('« Annuler » : retour à la compo publiée', ou('Nina') == N, ou('Nina'))
    shot('publiee')

    # ----- 8. 2 versions : 4 colonnes, la colonne de droite repliée -----
    pg.click('[data-act="cRetirer"]'); pg.wait_for_timeout(400); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1200)
    proposer()
    pg.click('[data-act="cAddV"]'); pg.wait_for_timeout(400); pg.click('[data-av="copie"]'); pg.wait_for_timeout(1200)
    n4 = ev("[...document.querySelectorAll('.ctab .ctcol')].map(c => c.getAttribute('data-v') + c.getAttribute('data-t'))")
    check('2 versions : 4 colonnes (V1 puis V2)', len(n4) == 4 and [x[0] for x in n4] == ['0', '0', '1', '1'], n4)
    check('2 versions : la colonne de droite repliée', pg.query_selector('.ctside.ferme .ctso') is not None)
    check('2 versions : chaque poste en face dans les 4 colonnes', not ev(ALIGN), ev(ALIGN))
    check('2 versions : pas de défilement de côté', noscroll())
    pg.click('.ctso'); pg.wait_for_timeout(500)
    check('le bouton « Pas placés » ouvre la colonne : un « Pas placés » par version', len(ev("[...document.querySelectorAll('.ctside .ccol.banc')]")) == 2)
    shot('2versions')
    r = ev("(() => { const s = document.querySelector('.ctside').getBoundingClientRect(), c = [...document.querySelectorAll('.ctab .ctcol')].pop().getBoundingClientRect(); return [Math.round(c.right), Math.round(s.left)]; })()")
    check('(relecture) colonne ouverte avec 2 versions : elle ne recouvre pas la dernière équipe', r[0] <= r[1], r)
    pg.click('.ctb [data-act="cVoirAlertes"]'); pg.wait_for_timeout(500)
    nv = ev("[...document.querySelectorAll('.ctside #calertes .calerts > li')].filter(e => e.offsetParent).length")
    check('(relecture) 2 versions : « À regarder » montre les lignes des deux versions', nv >= 2, nv)
    pg.click('.ctb [data-act="cVoirAlertes"]'); pg.wait_for_timeout(400)
    pg.click('.ctside [data-act="cTabCol"]'); pg.wait_for_timeout(400)
    tirer(carte('Nina', 1), '.ctside.ferme .ccol.banc[data-v="1"] .chd')
    check('(relecture) colonne repliée : lâcher Nina (V2) sur « V2 » la sort de la V2 seulement', ou('Nina', 1) is None and ou('Nina', 0) is not None, (ou('Nina', 0), ou('Nina', 1)))
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    N2 = ou('Nina', 1); tirer(carte('Nina', 1), case(autre(N2['t']), 'ouvreur', 1) + ' > .ctrep')
    check('2 versions : glisser dans la V2 ne touche pas la V1', ou('Nina', 1) == {'t': autre(N2['t']), 'p': 'ouvreur'} and ou('Nina', 0) == N2, (ou('Nina', 0), ou('Nina', 1)))
    tirer(carte('Nina', 1), case(N2['t'], 'ouvreur', 0) + ' > .ctrep')
    check('2 versions : pas de glisser d\'une version à l\'autre', ou('Nina', 0) == N2)

    # ----- 9. 3 équipes ; 2 versions de 3 équipes (6 colonnes) : l'affichage d'avant -----
    proposer()
    pg.click('.ctb [data-act="cOptT"]'); pg.wait_for_timeout(400)
    pg.click('.cbopt [data-act="cNb"][data-n="B"][data-d="1"]'); pg.wait_for_timeout(300); pg.click('[data-act="cRegen"]'); pg.wait_for_timeout(1200)
    n3 = len(ev("[...document.querySelectorAll('.ctab .ctcol')]"))
    pn = ev("[...document.querySelectorAll('.ctab .ctgrid .cpj.ct1 .cpn')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)")
    check('3 équipes : 3 colonnes, les prénoms en entier', n3 == 3 and not pn, (n3, pn))
    check('3 équipes : chaque poste en face', not ev(ALIGN), ev(ALIGN))
    check('3 équipes : les places vides restent dans leur case', ev("[...document.querySelectorAll('.ctab .ctc .cslot')].every(e => e.getBoundingClientRect().right <= e.closest('.ctc').getBoundingClientRect().right + 1)"))
    shot('3equipes')
    pg.click('[data-act="cAddV"]'); pg.wait_for_timeout(400); pg.click('[data-av="copie"]'); pg.wait_for_timeout(1200)
    check('(relecture) 2 versions de 3 équipes (6 colonnes) : pas de tableau, l\'affichage d\'avant', pg.query_selector('.ctab') is None and pg.query_selector('.cboard2 .ccol') is not None)
    # l'iPad de 1024 px en paysage : la barre d'outils tient
    proposer()
    pg.set_viewport_size({'width': 1024, 'height': 768}); pg.wait_for_timeout(900)
    r = ev("(() => { const b = document.querySelector('.ctb'); return b ? { large: b.scrollWidth <= b.clientWidth + 1, aide: Math.round(b.querySelector('[data-act=\"cTabAide\"]').getBoundingClientRect().right) } : null; })()")
    check('(relecture) iPad 1024 × 768 : toute la barre d\'outils à l\'écran (« Légende et gestes » compris)', r and r['large'] and r['aide'] <= 1024, r)
    # tourner l'iPad avec une fenêtre ouverte : l'affichage suit une fois la fenêtre fermée
    pg.set_viewport_size({'width': W, 'height': H}); pg.wait_for_timeout(800)
    pg.click('.ctb [data-act="cTabAide"]'); pg.wait_for_timeout(300)
    pg.set_viewport_size({'width': 820, 'height': 1180}); pg.wait_for_timeout(500)
    pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1200)
    check('(relecture) tourner l\'iPad, fenêtre ouverte, puis la fermer : plus de tableau en portrait', pg.query_selector('.ctab') is None)
    pg.set_viewport_size({'width': W, 'height': H}); pg.wait_for_timeout(1000)
    check('… et de retour en paysage, le tableau', pg.query_selector('.ctab') is not None)

    print('%d/%d' % (sum(1 for r in res if r[1]), len(res)), 'erreurs :', errs)
    check('aucune erreur JavaScript', not errs, errs)
    sys.exit(0 if all(r[1] for r in res) else 1)
