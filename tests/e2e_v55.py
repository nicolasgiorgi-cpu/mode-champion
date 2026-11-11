# (v55) L'interface enfant : « Séance du jour » (une ligne avec la vraie police, vérifiée à part), bravos en haut, rail de l'iPad, emblèmes de « Choisis ton poste ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v55.py 390 844 · 1180 820 · 820 1180
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
RAIL = W >= 1000 and W > H
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, x=0, y=0): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y}]})
    pg.goto(BASE + '#/connexion'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if pg.query_selector('.modal button'): pg.click('.modal button >> nth=0'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(800)
    # le titre
    t = pg.inner_text('main h1.acc-t')
    check('le titre : « Séance du jour »', t.upper().replace('\n', ' ') == 'SÉANCE DU JOUR', t)
    check('plus de « Mission du jour » nulle part sur l\'accueil', 'MISSION DU JOUR' not in pg.inner_text('main').upper().replace('\n', ' '))
    check('le titre : pas de retour à la ligne forcé, et il ne peut pas déborder si la police manque', pg.evaluate("(() => { const h = document.querySelector('main h1.acc-t'); return !h.querySelector('br') && getComputedStyle(h).whiteSpace === 'normal' })()"))
    # la vraie police n'est pas chargée ici (pas de réseau) : avec une police de secours plus large, le titre se replie, la page ne s'élargit pas
    check('accueil : pas de défilement de côté', pg.evaluate('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'), pg.evaluate('[document.scrollingElement.scrollWidth, document.documentElement.clientWidth]'))
    # les bravos, en haut de l'accueil
    pos = pg.evaluate("(() => { const b = document.querySelector('.bvcard'), s = document.querySelector('.mission'), h = document.querySelector('main h1.acc-t'); return b && s ? { avantSeance: b.getBoundingClientRect().bottom <= s.getBoundingClientRect().top, apresTitre: b.getBoundingClientRect().top >= h.getBoundingClientRect().bottom, large: b.getBoundingClientRect().width } : null })()")
    check('les bravos : tout de suite sous le titre, avant la séance', pos and pos['avantSeance'] and pos['apresTitre'], pos)
    check('les bravos : un seul bloc sur la page', pg.locator('.bvcard').count() == 1)
    # le rail de l'iPad
    check('plus d\'icône M12 dans la barre de navigation', pg.query_selector('#nav .brand') is None and 'M12' not in pg.inner_text('#nav'))
    if RAIL:
        r = pg.evaluate("""(() => { const n = document.getElementById('nav').getBoundingClientRect(), a = document.querySelector('#nav a.on'), ar = a.getBoundingClientRect(), bf = getComputedStyle(a, '::before'), cs = getComputedStyle(a);
            return { aGauche: ar.left - n.left, aLarge: ar.width, railLarge: n.width, neonGauche: parseFloat(bf.left), neonLarge: parseFloat(bf.width), fond: cs.backgroundImage } })()""")
        check('rail : la carte de l\'onglet part du bord gauche', abs(r['aGauche']) < 1 and r['aLarge'] >= r['railLarge'] - 2, r)
        check('rail : le néon collé à la carte', r['neonGauche'] == 0, r)
        check('rail : la lumière part vers la droite', '90deg' in r['fond'] or 'to right' in r['fond'], r['fond'])
    else:
        fond = pg.evaluate("getComputedStyle(document.querySelector('#nav a.on')).backgroundImage")
        check('barre du bas : la lumière part toujours vers le bas', 'to right' not in fond and '90deg' not in fond, fond)
    # les cartes de postes : plus de filter sur la carte ni sur l'emblème, plus de fusion par-dessus
    pg.goto(BASE + '#/mission/postes'); pg.wait_for_timeout(800)
    st = pg.evaluate("""(() => { const c = s => getComputedStyle(document.querySelector(s)); return { tilt: c('.cp-tilt').filter, em: c('.cp-emblem').filter, holo: c('.cp-holo').mixBlendMode, shine: c('.cp-shine').mixBlendMode, sheen: c('.cp-emblem .em-sheen').mixBlendMode } })()""")
    check('cartes : pas de filter sur la carte ni sur l\'emblème', st['tilt'] == 'none' and st['em'] == 'none', st)
    check('cartes : pas de fusion par-dessus l\'emblème', st['holo'] == 'normal' and st['shine'] == 'normal' and st['sheen'] == 'normal', st)
    check('la carte « Aide-moi à choisir » : pas de filter sur son emblème non plus', pg.evaluate("getComputedStyle(document.querySelector('.cp-qem')).filter") == 'none')
    regles = pg.evaluate("""(() => { const l = []; for (const f of document.styleSheets) { let rr; try { rr = f.cssRules } catch (e) { continue } for (const r of rr) if (r.selectorText) l.push([r.selectorText, r.style.mixBlendMode, r.style.opacity]); } return l })()""")
    fus = [r[0] for r in regles if r[1] and ('cp-' in r[0] or 'em-' in r[0] or 'sk-' in r[0])]
    check('aucune fusion dans les styles des cartes, de la fiche ni des Skills', not fus, fus)
    g5 = [r[2] for r in regles if r[0] == '.sk-card.sk-g5.is-shiny .cp-holo']
    check('carte Légende : le voile suit la même règle que les autres cartes', g5 and '.28 +' in g5[0], g5)
    box0 = pg.evaluate("(() => { const r = document.querySelector('.cp-card:not(.cp-q) .cp-emblem').getBoundingClientRect(); return [r.width, r.height] })()")
    pg.evaluate("document.querySelector('.cp-card:not(.cp-q)').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    c = pg.evaluate("(() => { const r = document.querySelector('.cp-card:not(.cp-q)').getBoundingClientRect(); return [r.left + r.width * .7, r.top + r.height * .6] })()")
    touch('touchStart', c[0], c[1]); pg.wait_for_timeout(200)
    em = pg.evaluate("(() => { const k = document.querySelector('.cp-card:not(.cp-q)'), e = k.querySelector('.cp-emblem'), r = e.getBoundingClientRect(), a = k.querySelector('.cp-art').getBoundingClientRect(); return { shiny: k.classList.contains('is-shiny'), w: r.width, h: r.height, milieu: Math.abs((r.left + r.width / 2) - (a.left + a.width / 2)), anim: e.getAnimations().length } })()")
    check('doigt sur une carte : l\'emblème garde sa taille et sa place', em['shiny'] and em['w'] > 60 and em['h'] > 60 and em['milieu'] < 25 and em['anim'] > 0, em)
    touch('touchEnd'); pg.wait_for_timeout(600)
    # la fiche : l'oscillation ne s'arrête jamais, le penchant revient tout de suite
    pg.goto(BASE + '#/mission/poste/' + pg.evaluate('MC.missions.POSTES[3].id')); pg.wait_for_timeout(800)
    a0 = pg.evaluate("(() => { const a = document.querySelector('.cp-dem-fl').getAnimations()[0]; return a ? a.playState : '' })()")
    check('fiche : l\'emblème oscille', a0 == 'running', a0)
    d = pg.evaluate("(() => { const r = document.getElementById('cp-dem').getBoundingClientRect(); return [r.left + r.width * .8, r.top + r.height * .3] })()")
    t0 = pg.evaluate("document.querySelector('.cp-dem-fl').getAnimations()[0].currentTime")
    touch('touchStart', d[0], d[1]); pg.wait_for_timeout(250)
    sous = pg.evaluate("(() => { const e = document.getElementById('cp-dem'), a = document.querySelector('.cp-dem-fl').getAnimations()[0]; return { shiny: e.classList.contains('is-shiny'), etat: a.playState, t: a.currentTime, ry: e.style.getPropertyValue('--ery') } })()")
    check('doigt sur l\'emblème : il penche, et l\'oscillation continue', sous['shiny'] and sous['etat'] == 'running' and sous['t'] > t0 and sous['ry'] not in ('', '0deg'), sous)
    touch('touchEnd'); pg.wait_for_timeout(60)
    apres = pg.evaluate("(() => { const e = document.getElementById('cp-dem'), a = document.querySelector('.cp-dem-fl').getAnimations()[0]; return { shiny: e.classList.contains('is-shiny'), etat: a.playState, t: a.currentTime, ry: e.style.getPropertyValue('--ery'), trans: getComputedStyle(e).transitionDuration } })()")
    check('doigt levé : le penchant revient tout de suite, sans attente', not apres['shiny'] and apres['ry'] == '0deg' and apres['trans'] == '0.5s', apres)
    check('doigt levé : l\'oscillation n\'a pas repris de zéro', apres['etat'] == 'running' and apres['t'] > sous['t'], apres)
    idle = pg.evaluate("(() => { const a = document.querySelector('.cp-dem .em-holo').getAnimations(); return a.length })()")
    check('doigt levé : le reflet de fond n\'a pas été coupé', idle > 0, idle)
    check('fiche : pas de défilement de côté', pg.evaluate('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1'))
    check('aucune erreur', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('%d/%d' % (len(res) - len(bad), len(res)), W, H)
sys.exit(1 if bad else 0)
