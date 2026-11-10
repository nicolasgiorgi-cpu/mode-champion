# (v65) Demande de Nicolas du 10/11/2026 : préparer la compo. Juste sous le nombre d'équipes et de joueurs par équipe,
# « Créer manuellement » puis « Créer automatiquement », au même style (aucun mis en avant) ; « Créer automatiquement » déplie
# les seules options et « Générer » (avec les 2 versions côte à côte). Les ateliers se font aussi à la main ; les matchs des
# entraînements ont la même page que les plateaux (deux équipes équilibrées).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v65.py 390 844 · 1180 820 · 820 1180
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
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
    # l'ordre des sections de la page, par leur titre
    titres = lambda: ev("[...document.querySelectorAll('main section.sec > h2.h2')].map(h => h.textContent.trim().toUpperCase())")
    # les deux boutons de création : mêmes classes, même largeur, l'un sous l'autre, « manuellement » d'abord
    def boutons():
        return ev("""(() => { const s = document.querySelector('.ccreer'); if (!s) return null;
          const b = [...s.querySelectorAll(':scope > button')].slice(0, 2), r = b.map(x => x.getBoundingClientRect());
          return { txt: b.map(x => x.textContent.trim()), cls: b.map(x => [...x.classList].filter(c => c !== 'on').sort().join(' ')),
            fonds: b.map(x => getComputedStyle(x).backgroundColor), larg: r.map(x => Math.round(x.width)), ordre: r[0].top < r[1].top,
            primaire: !!s.querySelector(':scope > .btn') }; })()""")

    # ----- 1. un plateau -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    t = titres()
    i_eq, i_cr = t.index('ÉQUIPES PAR NIVEAU'), t.index('CRÉER LA COMPO')
    suit = ev("(() => { const c = document.querySelector('.ccreer'), a = c.previousElementSibling, b = a && a.previousElementSibling; return !!(a && a.querySelector('.ctaild, .ctailn') && b && b.querySelector('.cstep')); })()")
    check('plateau : « Créer la compo » juste sous les équipes et les joueurs par équipe', i_cr == i_eq + 1 and suit, (t, suit))
    bt = boutons()
    check('plateau : « Créer manuellement » d\'abord, puis « Créer automatiquement »', bt and 'MANUELLEMENT' in bt['txt'][0].upper() and 'AUTOMATIQUEMENT' in bt['txt'][1].upper() and bt['ordre'], bt)
    check('plateau : les deux boutons au même style, aucun mis en avant', bt and bt['cls'][0] == bt['cls'][1] and bt['fonds'][0] == bt['fonds'][1] and bt['larg'][0] == bt['larg'][1] and not bt['primaire'], bt)
    check('plateau : au jeu à 10, « Créer manuellement » = poste par poste', pg.query_selector('.ccreer [data-act="cZero10"]') is not None)
    check('plateau : rien d\'automatique avant d\'ouvrir (ni options, ni « Générer »)', pg.query_selector('[data-act="cOpt"]') is None and pg.query_selector('[data-act="cPropose"]') is None and pg.query_selector('[data-act="cPropose2"]') is None)
    check('plateau : « Créer automatiquement » fermé (aria-expanded)', ev("document.querySelector('[data-act=cAuto]').getAttribute('aria-expanded')") == 'false')
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(900)
    check('plateau, ouvert : les options, « Générer la compo » et « Générer 2 versions côte à côte »', pg.query_selector('#cauto [data-act="cOpt"]') is not None and pg.query_selector('#cauto [data-act="cPropose"]') is not None and pg.query_selector('#cauto [data-act="cPropose2"]') is not None)
    check('plateau, ouvert : aria-expanded vrai', ev("document.querySelector('[data-act=cAuto]').getAttribute('aria-expanded')") == 'true')
    pg.wait_for_timeout(600)
    r = ev("""(() => { const g = document.querySelector('#cauto [data-act=cPropose2]').getBoundingClientRect(), n = document.getElementById('nav').getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(), a = document.querySelector('[data-act=cAuto]').getBoundingClientRect();
      const bas = n.top > innerHeight / 2 ? n.top : innerHeight; return { gBas: Math.round(g.bottom), bas: Math.round(bas), aHaut: Math.round(a.top), tBas: Math.round(t.bottom), focus: document.activeElement && document.activeElement.getAttribute('data-act') }; })()""")
    check('plateau, ouvert : « Générer 2 versions » visible au-dessus de la barre du bas, le bouton sous la barre du haut', r['gBas'] <= r['bas'] and r['aHaut'] >= r['tBas'] - 1, r)
    check('plateau, ouvert : le focus reste sur « Créer automatiquement »', r['focus'] == 'cAuto', r)
    bt = boutons()
    check('plateau, ouvert : les deux boutons gardent la même taille et le même fond (aucun mis en avant)', bt['larg'][0] == bt['larg'][1] and bt['fonds'][0] == bt['fonds'][1], bt)
    pg.click('#cauto [data-act="cOpt"][data-k="copains"][data-v="sans"]'); pg.wait_for_timeout(400)
    check('plateau : changer une option garde le volet ouvert', pg.query_selector('#cauto [data-act="cOpt"][data-k="copains"][data-v="sans"].on') is not None)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    check('plateau : un 2e toucher replie le volet', pg.query_selector('#cauto') is None)
    # (relecture) « A forte » : la note sur les compteurs reste sous les équipes, volet fermé
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    pg.click('#cauto [data-act="cOpt"][data-k="orga"][data-v="aforte"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    check('plateau, A forte : la note des compteurs visible volet fermé', pg.query_selector('#cauto') is None and pg.query_selector('.cafn') is not None and pg.is_visible('.cafn'))
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    pg.click('#cauto [data-act="cOpt"][data-k="orga"][data-v="niveau"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    check('plateau : la répartition des postes reste en bas de la page', ev("(() => { const g = document.querySelector('main .cgraph, main [class*=graph]'), c = document.querySelector('.ccreer'); return !g || g.getBoundingClientRect().top > c.getBoundingClientRect().top; })()"))
    check('plateau : pas de défilement de côté', noscroll())
    # jeu à 5 : « Créer manuellement » = des équipes vides, tout le monde en « Pas placés »
    pg.click('[data-act="cFmt"][data-v="5"]'); pg.wait_for_timeout(400)
    check('plateau, jeu à 5 : « Créer manuellement » = partir de zéro', pg.query_selector('.ccreer [data-act="cZero"]') is not None and pg.query_selector('.ccreer [data-act="cZero10"]') is None)
    pg.click('.ccreer [data-act="cZero"]'); pg.wait_for_timeout(1200)
    n = ev("(() => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-p3') > 0))).vs[0]; return { places: d.equipes.reduce((s, t) => s + t.joueurs.length, 0), banc: d.banc.length, eq: d.equipes.length }; })()")
    check('plateau, à la main : des équipes vides, tout le monde à placer', n['places'] == 0 and n['banc'] > 0 and n['eq'] >= 2, n)
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    check('plateau : effacer un brouillon fait à la main laisse « Créer automatiquement » fermé', pg.query_selector('#cauto') is None)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1300)
    pg.reload(); pg.wait_for_timeout(1500)   # le brouillon repris de l'appareil se souvient d'avoir été généré
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    check('plateau : effacer un brouillon généré rouvre « Créer automatiquement », avec ses options', pg.query_selector('#cauto [data-act="cOpt"]') is not None)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)

    # ----- 2. les ateliers d'un entraînement : à la main -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=ateliers'); pg.wait_for_timeout(1300)
    t = titres()
    check('ateliers : avants et arrières, combien, puis « Créer les groupes »', t[:3] == ['AVANTS ET ARRIÈRES', 'COMBIEN ?', 'CRÉER LES GROUPES'], t)
    bt = boutons()
    check('ateliers : « Créer manuellement » puis « Créer automatiquement », même style', bt and 'MANUELLEMENT' in bt['txt'][0].upper() and 'AUTOMATIQUEMENT' in bt['txt'][1].upper() and bt['cls'][0] == bt['cls'][1] and not bt['primaire'], bt)
    check('ateliers : le choix par niveau / équilibrés / A forte seulement dans « Créer automatiquement »', pg.query_selector('[data-act="cEMode"]') is None)
    check('ateliers : « Reprendre les groupes du … » sous les deux boutons', pg.query_selector('.ccreer [data-act="cReprise"]') is not None)
    ng = ev("document.querySelector('[data-act=cEN][data-k=n]') ? Number(document.querySelector('.cstep .cnbv, [data-act=cEN] ~ output, .cnbv').textContent) : null")
    pg.click('.ccreer [data-act="cZero"]'); pg.wait_for_timeout(1200)
    d = ev("(() => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-e1') > 0 && k.indexOf('ateliers') > 0))).vs[0]; return { noms: d.equipes.map(t => t.nom), places: d.equipes.reduce((s, t) => s + t.joueurs.length, 0), banc: d.banc.length }; })()")
    check('ateliers, à la main : des groupes vides, tout le monde à placer', d['places'] == 0 and d['banc'] > 0 and len(d['noms']) >= 2, (d, ng))
    # placer un enfant à la main : le toucher, puis le groupe
    j = ev("document.querySelector('.ccol.banc .cpj[data-id]').getAttribute('data-id')")
    pg.click('.ccol.banc .cpj[data-id="%s"]' % j); pg.wait_for_timeout(400)
    g1 = ev("document.querySelector('.cselp [data-act=cMove]:not([data-t=banc])').getAttribute('data-t')")
    pg.click('.cselp [data-act="cMove"][data-t="%s"]' % g1); pg.wait_for_timeout(600)
    d2 = ev("(id => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-e1') > 0 && k.indexOf('ateliers') > 0))).vs[0]; return d.equipes.filter(t => t.joueurs.some(x => x.id === id)).map(t => t.id); })('%s')" % j)
    check('ateliers, à la main : un enfant touché puis le groupe y est placé', d2 == [g1], (d2, g1))
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    # (relecture) effacer un brouillon fait à la main : « Créer automatiquement » reste fermé, et le choix des groupes n'a pas changé
    check('ateliers : effacer un brouillon fait à la main laisse « Créer automatiquement » fermé', pg.query_selector('#cauto') is None and pg.query_selector('[data-act="cAuto"][aria-expanded="false"]') is not None)
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    check('ateliers : … et le choix du jour (par niveau, le mercredi) est gardé', pg.query_selector('#cauto [data-act="cEMode"][data-v="niveau"].on') is not None, pg.inner_text('#cauto')[:200])
    pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(400)
    # ateliers séparés à la main : des groupes d'avants et d'arrières
    pg.click('[data-act="cESep"][data-v="1"]'); pg.wait_for_timeout(300)
    pg.click('.ccreer [data-act="cZero"]'); pg.wait_for_timeout(1200)
    d = ev("(() => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-e1') > 0 && k.indexOf('ateliers') > 0))).vs[0]; return d.equipes.map(t => t.bloc); })()")
    check('ateliers séparés, à la main : des groupes d\'avants et d\'arrières', 'av' in d and 'ar' in d, d)
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)
    pg.click('[data-act="cESep"][data-v="0"]'); pg.wait_for_timeout(300)
    # automatiquement : les trois façons et les deux « Générer »
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(700)
    check('ateliers, automatiquement : par niveau, équilibrés, A forte, « Générer les groupes » et 2 versions', len(pg.query_selector_all('#cauto [data-act="cEMode"]')) == 3 and pg.query_selector('#cauto [data-act="cPropose"]') is not None and pg.query_selector('#cauto [data-act="cPropose2"]') is not None)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1300)
    check('ateliers, automatiquement : des groupes proposés', ev("document.querySelectorAll('.ccol:not(.banc)').length") >= 2)
    # (relecture) l'engrenage › « Refaire » : on peut encore passer d'un choix de groupes à l'autre
    pg.click('[data-act="cRegl"][data-v="0"]'); pg.wait_for_timeout(600)
    check('ateliers, « Refaire » : par niveau, équilibrés et A forte dans la fenêtre', len(pg.query_selector_all('.modal [data-rm]')) == 3, pg.inner_text('.modal')[:300] if pg.query_selector('.modal') else '')
    pg.click('.modal [data-rm="equilibre"]'); pg.wait_for_timeout(300)
    check('ateliers, « Refaire » : le choix change dans la fenêtre', pg.query_selector('.modal [data-rm="equilibre"].on') is not None)
    pg.click('.modal .mbtns button:has-text("Refaire")'); pg.wait_for_timeout(1200)
    m = ev("(() => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-e1') > 0 && k.indexOf('ateliers') > 0))).vs[0]; return d.reglages.mode; })()")
    check('ateliers, « Refaire » : les groupes refaits en équilibrés', m == 'equilibre', m)
    check('ateliers : pas de défilement de côté', noscroll())
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(800)

    # ----- 3. les matchs : la même page que les plateaux -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1300)
    t = titres()
    check('matchs : « Avec qui ? », les équipes, puis « Créer les équipes » (comme un plateau)', t[:3] == ['AVEC QUI ?', 'LES ÉQUIPES', 'CRÉER LES ÉQUIPES'], t)
    bt = boutons()
    check('matchs : « Créer manuellement » (poste par poste) puis « Créer automatiquement », même style', bt and pg.query_selector('.ccreer [data-act="cZero10"]') is not None and bt['cls'][0] == bt['cls'][1] and not bt['primaire'], bt)
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(700)
    check('matchs, automatiquement : « Deux équipes équilibrées » et « Générer les 2 équipes », pas de 2 versions', 'Deux équipes équilibrées' in pg.inner_text('#cauto') and pg.query_selector('#cauto [data-act="cPropose"]') is not None and pg.query_selector('[data-act="cPropose2"]') is None)
    pg.click('.ccreer [data-act="cZero10"]'); pg.wait_for_timeout(900)
    check('matchs, à la main : la fenêtre « Poste par poste » s\'ouvre', pg.query_selector('.modal') is not None and 'PILIER' in pg.inner_text('.modal').upper(), pg.inner_text('.modal')[:200] if pg.query_selector('.modal') else '')
    check('matchs : pas de défilement de côté', noscroll())
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
