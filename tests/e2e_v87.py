# (v87) Retours de Nicolas du 15/11/2026 sur la compo (iPhone 11) :
# - le panneau d'un enfant : en tête seulement le prénom, le niveau et le plaquage ; puis les équipes ; puis les postes sur 2 lignes
#   (les avants en haut, les arrières dessous), les postes qui ne sont pas sur sa fiche atténués ;
# - qui démarre et qui est remplaçant à chaque poste (2 piliers, 1 talonneur, 2 3es lignes, 1 9, 1 10, 1 centre, 1 ailier, 1 15) :
#   dans un poste, les premiers démarrent, une ligne « Remplaçant(s) » avant les autres ; « Titulaire » / « Remplaçant » dans le panneau.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v87.py 414 896 · 375 667 · 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v87-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (414, 896)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    shot = lambda n: pg.screenshot(path=OUT + tag + '-' + n + '.png')
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
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
    IDS = ev("(() => { const F = MC.compos.fiches(MC.app.S.cache.group), o = {}; Object.keys(F).forEach(id => o[F[id].prenom] = id); return o; })()")
    NOM = {v: k for k, v in IDS.items()}
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    if pg.query_selector('.ctop [data-act="cDiscard"]'):
        pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    BES = {'pilier': 2, 'talonneur': 1, 'troisieme-ligne': 2, 'demi-de-melee': 1, 'ouvreur': 1, 'centre': 1, 'ailier': 1, 'arriere': 1}
    def grp(t, p):
        return ev("""(([t, p]) => [...document.querySelectorAll('.cboard2 .ccol[data-v="0"][data-t="' + t + '"] .cgrp[data-p="' + p + '"] .cpl > li')].filter(li => li.classList.contains('crsep') || li.querySelector('.cpj')).map(li => li.classList.contains('crsep') ? '|' : li.querySelector('.cpj').getAttribute('data-id')))""", [t, p])
    teams = ev("[...document.querySelectorAll('.cboard2 .ccol[data-v=\"0\"]:not(.banc)')].map(c => c.getAttribute('data-t'))")

    # ----- 1. sur la compo : « Remplaçant(s) » après les titulaires de chaque poste -----
    bon = True; vus = 0; info = []
    for t in teams:
        for p, n in BES.items():
            l = grp(t, p)
            ids = [x for x in l if x != '|']
            if len(ids) > n:
                vus += 1
                if l.index('|') != n or l.count('|') != 1: bon = False; info.append((t, p, l))
            elif '|' in l: bon = False; info.append((t, p, l))
    check('compo : dans chaque poste, la ligne « Remplaçant » juste après les titulaires (et seulement s\'il y en a)', bon and vus > 0, (vus, info))
    r = ev("(() => { const s = document.querySelector('.crsep'); return s ? { t: s.textContent.trim(), pleine: s.getBoundingClientRect().width >= s.parentElement.getBoundingClientRect().width - 2 } : null; })()")
    check('la ligne « Remplaçant » : toute la largeur du poste', r and r['t'].lower().startswith('remplaçant') and r['pleine'], r)
    check('compo : pas de défilement de côté', noscroll())
    shot('compo')

    # ----- 2. le panneau d'un enfant : en tête, prénom, niveau et plaquage ; les postes sur 2 lignes -----
    t0 = teams[0]
    pil = [x for x in grp(t0, 'pilier') if x != '|']
    pg.click('.cboard2 .cpj[data-id="%s"][data-v="0"]' % pil[0]); pg.wait_for_timeout(600)
    d = ev("""(() => { const s = document.querySelector('.cdock .cselp'); if (!s) return null; const h = s.querySelector('.cselh');
      return { tete: h ? h.innerText.replace(/\\s+/g, ' ').trim() : '', niv: !!h.querySelector('.cniv, .niv, [class*=niv]'), bouclier: !!h.querySelector('svg'),
        texte: s.innerText }; })()""")
    check('panneau : une seule ligne d\'en-tête, le prénom', d and NOM[pil[0]] in d['tete'], d)
    check('panneau : ni historique ni copains ni postes en toutes lettres', d and 'plateau' not in d['texte'].lower() and 'entraînement' not in d['texte'].lower() and 'copain' not in d['texte'].lower(), d and d['texte'])
    r = ev("""(() => { const rows = [...document.querySelectorAll('.cdock .cmpos .cmpr')], dock = document.querySelector('.cdock .cselp').getBoundingClientRect();
      return rows.map(rw => { const b = [...rw.querySelectorAll('.cmv')]; return { p: b.map(x => x.getAttribute('data-p')), lignes: new Set(b.map(x => Math.round(x.getBoundingClientRect().top))).size,
        dedans: b.every(x => x.getBoundingClientRect().right <= dock.right + 1 && x.getBoundingClientRect().left >= dock.left - 1), deb: b.some(x => x.scrollWidth > x.clientWidth + 1) }; }); })()""")
    check('panneau : 2 lignes de postes, les avants puis les arrières', len(r) == 2 and r[0]['p'] == ['pilier', 'talonneur', 'troisieme-ligne'] and r[1]['p'] == ['demi-de-melee', 'ouvreur', 'centre', 'ailier', 'arriere'], r)
    check('panneau : chaque ligne tient sur une ligne, dans le panneau, sans texte coupé', all(x['lignes'] == 1 and x['dedans'] and not x['deb'] for x in r), r)
    hors = ev("(() => { const F = MC.compos.fiches(MC.app.S.cache.group), f = F['%s'], ps = MC.compos.postesDe(f); return [...document.querySelectorAll('.cdock .cmpos .cmv')].map(b => [b.getAttribute('data-p'), b.classList.contains('hors'), ps.indexOf(b.getAttribute('data-p')) < 0, +getComputedStyle(b).opacity]); })()" % pil[0])
    check('panneau : les postes pas sur sa fiche sont atténués, les siens non', all(x[1] == x[2] for x in hors) and any(x[1] for x in hors) and all((x[3] < 0.8) == (x[1] and not ev("document.querySelector('.cdock .cmv[data-p=\"%s\"]').classList.contains('here')" % x[0])) for x in hors), hors)
    tit = ev("[...document.querySelectorAll('.cdock .cmtit .cmv')].map(b => [b.textContent.trim(), b.getAttribute('aria-pressed')])")
    check('panneau : « Titulaire » (choisi) et « Remplaçant »', tit == [['Titulaire', 'true'], ['Remplaçant', 'false']], tit)
    check('panneau : pas de défilement de côté', noscroll())
    shot('panneau')

    # ----- 3. « Remplaçant » puis « Titulaire » -----
    # au pilier de l'équipe, 2 piliers pour 2 places : personne pour le remplacer, « Remplaçant » grisé
    if len(pil) <= 2:
        check('poste sans remplaçant possible : « Remplaçant » grisé', pg.is_disabled('.cdock [data-act="cTitu"][data-r="r"]'))
    # un poste qui a un remplaçant : son titulaire passe remplaçant, puis redevient titulaire
    ch = [(t, p) for t in teams for p, n in BES.items() if len([x for x in grp(t, p) if x != '|']) > n]
    t1, p1 = ch[0]
    l0 = [x for x in grp(t1, p1) if x != '|']; j = l0[0]
    pg.click('.cdock [data-act="cPick"]'); pg.wait_for_timeout(400)   # on ferme le panneau du pilier (sinon toucher une autre carte les échange)
    check('fermer le panneau : plus de joueur choisi', pg.query_selector('.cdock') is None and pg.query_selector('.cpj.sel') is None)
    pg.click('.cboard2 .cpj[data-id="%s"][data-v="0"]' % j); pg.wait_for_timeout(600)
    pg.click('.cdock [data-act="cTitu"][data-r="r"]'); pg.wait_for_timeout(600)
    l = grp(t1, p1)
    check('« Remplaçant » : il passe après la ligne « Remplaçant » de son poste', l[-1] == j and l.index('|') < l.index(j) and l.index('|') == BES[p1], [NOM.get(x, x) for x in l])
    check('« Remplaçant » : l\'équipe passe en « Ordre à la main »', pg.query_selector('[data-act="cTri"][data-t="%s"]' % t1) is not None)
    if not pg.query_selector('.cdock'): pg.click('.cboard2 .cpj[data-id="%s"][data-v="0"]' % j); pg.wait_for_timeout(500)
    tit = ev("[...document.querySelectorAll('.cdock .cmtit .cmv')].map(b => b.getAttribute('aria-pressed'))")
    check('le panneau dit maintenant « Remplaçant »', tit == ['false', 'true'], tit)
    pg.click('.cdock [data-act="cTitu"][data-r="t"]'); pg.wait_for_timeout(600)
    l = grp(t1, p1)
    check('« Titulaire » : il repasse en tête de son poste', l[0] == j, [NOM.get(x, x) for x in l])
    pil = [j]
    # le partage en texte : « remplaçant(s) »
    ev("window.__copie = ''; navigator.clipboard && (navigator.clipboard.writeText = t => { window.__copie = t; return Promise.resolve(); })")
    tx = ev("(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':sp-demo-p3')))).vs[0]; return K.texteCompo(d, F); })()")
    check('le texte de la compo dit qui est remplaçant', 'remplaçant' in tx, tx[:400])
    # pas de « Titulaire / Remplaçant » pour un joueur pas placé
    pg.click('.cdock [data-act="cMove"][data-t="banc"]'); pg.wait_for_timeout(600)
    if not pg.query_selector('.cdock'): pg.click('.cboard2 .cpj[data-id="%s"]' % pil[0]); pg.wait_for_timeout(500)
    check('pas placé : ni postes ni « Titulaire »', pg.query_selector('.cdock .cmtit') is None and pg.query_selector('.cdock .cmpos') is None)

    check('aucune erreur JavaScript', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d OK (%s)' % (len(res) - len(bad), len(res), tag))
sys.exit(1 if bad else 0)
