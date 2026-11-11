# (v67) Demandes de Nicolas du 11/11/2026, côté éducs :
# - jeu à 10 : les postes s'équilibrent entre les équipes, option « Équilibrer d'abord : les postes | le plaquage » ;
# - les matchs d'un entraînement se préparent comme un plateau (format, équipes par niveau, joueurs par équipe, toutes les options,
#   2 versions côte à côte) ; les anciens matchs (« Équipe 1 contre Équipe 2 ») restent lisibles ;
# - la répartition des postes plus serrée ;
# - « Effacer » le brouillon à côté de « Publier », avec une confirmation.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v67.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
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
    def auto():
        if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(500)
    def effacer():
        pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(900)
    # le poste ★ de chaque enfant d'une équipe, compté comme dans l'appli
    COMPTE = """(t => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group); return K.comptePostes(t.joueurs.map(j => j.id), F); })"""

    # ----- 1. plateau : l'option « Équilibrer » au jeu à 10 seulement -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    if pg.query_selector('.ctop [data-act="cDiscard"]'): effacer()
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400); auto()
    lab = ev("[...document.querySelectorAll('#cauto .olab')].map(e => e.innerText.trim())")
    check('plateau, jeu à 10 : la ligne « Équilibrer » dans les options', 'Équilibrer' in ' '.join(lab), lab)
    on = ev("(() => { const b = document.querySelector('#cauto [data-k=\"priorite\"].on'); return b ? b.getAttribute('data-v') : null; })()")
    check('« Équilibrer » : les postes d\'abord par défaut', on == 'postes', on)
    pg.click('[data-act="cFmt"][data-v="5"]'); pg.wait_for_timeout(400)
    check('plateau, jeu à 5 : pas de ligne « Équilibrer »', pg.query_selector('#cauto [data-k="priorite"]') is None)
    pg.click('[data-act="cFmt"][data-v="10"]'); pg.wait_for_timeout(400)
    pg.click('#cauto [data-k="priorite"][data-v="plaquage"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1500)
    r = ev("(() => { const d = document.querySelector('.cbopt .cbsum'); return d ? d.innerText : ''; })()")
    check('compo générée : le résumé des options dit « le plaquage d\'abord »', 'plaquage d\'abord' in r, r)
    effacer()

    # ----- 2. les matchs d'un entraînement : la page du plateau -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1300)
    if pg.query_selector('.ctop [data-act="cDiscard"]'): effacer()
    t = pg.inner_text('main')
    check('matchs : les étapes de l\'entraînement en haut', pg.query_selector('.csteps .cstp.on') is not None)
    check('matchs : le format, « Avec qui ? », les équipes par niveau, les joueurs par équipe',
          pg.query_selector('[data-act="cFmt"][data-v="10"].on') is not None and pg.query_selector('[data-act="cBase"]') is not None
          and len(pg.query_selector_all('[data-act="cNb"]')) == 6 and 'Joueurs par équipe'.upper() in t.upper(), t[:600])
    nb = ev("[...document.querySelectorAll('.cstep .cnbv')].slice(0, 3).map(e => e.textContent)")
    check('matchs : par défaut 2 équipes B (tout le monde mélangé)', nb == ['0', '2', '0'], nb)
    check('matchs : pas de nombre d\'équipes « conseillé » (c\'est celui d\'un plateau)', 'conseillé' not in t, t[:800])
    check('matchs : « Créer manuellement », « Créer automatiquement », « Reprendre les équipes du … »',
          pg.query_selector('.ccreer [data-act="cZero10"]') is not None and pg.query_selector('.ccreer [data-act="cAuto"]') is not None and pg.query_selector('.ccreer [data-act="cReprise"]') is not None)
    auto()
    k = ev("[...document.querySelectorAll('#cauto [data-act=\"cOpt\"]')].map(e => e.getAttribute('data-k')).filter((x, i, a) => a.indexOf(x) === i)")
    check('matchs, « Créer automatiquement » : les options du plateau (organisation, effectifs, passerelles, équilibrer, copains)', k == ['orga', 'effectifs', 'passerelles', 'priorite', 'copains'], k)
    check('matchs : « Générer » et « 2 versions côte à côte »', pg.query_selector('#cauto [data-act="cPropose"]') is not None and pg.query_selector('#cauto [data-act="cPropose2"]') is not None)
    # la répartition des postes, plus serrée
    pg.click('details[data-rp] > summary'); pg.wait_for_timeout(400)
    r = ev("""(() => { const l = [...document.querySelectorAll('details[data-rp] .pbarw > summary')].map(e => e.getBoundingClientRect());
      return { n: l.length, pas: l.length > 1 ? Math.round(l[1].top - l[0].top) : 0, h: l.length ? Math.round(l[0].height) : 0 }; })()""")
    check('répartition des postes : des lignes serrées (34 px de haut, sans écart)', r['n'] == 7 and r['pas'] <= 36 and r['h'] >= 32, r)
    check('matchs, réglages : pas de défilement de côté', noscroll())

    # générer : B1 et B2, postes ★ équilibrés, le panneau des options en haut
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    d = ev("(() => { const v = MC.app.S && 0; return null; })()")
    eqs = ev("[...document.querySelectorAll('.ccol:not(.banc)')].map(e => e.getAttribute('aria-label') || '')")
    check('matchs générés : deux équipes B1 et B2', any('B1' in x for x in eqs) and any('B2' in x for x in eqs), eqs)
    st = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), dr = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')))), d = dr.vs[0];
      const c = d.equipes.map(t => K.comptePostes(t.joueurs.map(j => j.id), F)); let pire = 0;
      K.ORDRE.concat(['']).forEach(p => { pire = Math.max(pire, Math.abs((c[0][p] || 0) - (c[1][p] || 0))); });
      return { reg: d.reglages, pire: pire, ids: d.equipes.map(t => t.id) }; })()""")
    check('le brouillon : des matchs « comme un plateau » (partie matchs, vue plateau, options)', st['reg'].get('partie') == 'matchs' and st['reg'].get('vue') == 'plateau' and 'opts' in st['reg'] and 'mode' not in st['reg'], st['reg'])
    check('les postes ★ équilibrés : au plus 1 d\'écart par poste entre B1 et B2', st['pire'] <= 1, st)
    check('le tableau : le panneau des options en haut (comme un plateau)', pg.query_selector('details.cbopt') is not None)
    check('le tableau : pas de bouton « Réglages » d\'entraînement', pg.query_selector('.ctl [data-act="cRegl"]') is None)
    rs = ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')))).vs[0].raisons")
    check('matchs : pas de « Pas d\'équipe A : joue en B » dans « Pourquoi ces choix »', not any(v.startswith("Pas d'équipe") for v in rs.values()), rs)

    # « Effacer » à côté de « Publier »
    r = ev("""(() => { const e = document.querySelector('.ctop [data-act="cDiscard"]'), p = document.querySelector('.ctop [data-act="cPublish"]');
      if (!e || !p) return null; const a = e.getBoundingClientRect(), b = p.getBoundingClientRect();
      return { meme: Math.abs(a.top - b.top) < 6, colle: b.left - a.right < 20 && b.left > a.left, h: Math.round(a.height), w: Math.round(a.width), lab: e.getAttribute('aria-label') }; })()""")
    check('« Effacer » juste à côté de « Publier », 44 px au moins, nommé pour le lecteur d\'écran', r and r['meme'] and r['colle'] and r['h'] >= 44 and r['w'] >= 44 and r['lab'] == 'Effacer le brouillon', r)
    check('plus de lien « Effacer le brouillon » en bas', pg.query_selector('main > button.lnk[data-act="cDiscard"]') is None)
    pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400)
    check('« Effacer » demande une confirmation', pg.query_selector('.modal') is not None and 'EFFACER LE BROUILLON' in pg.inner_text('.modal').upper(), pg.inner_text('.modal')[:200] if pg.query_selector('.modal') else '')
    pg.click('.modal button[data-i="1"]'); pg.wait_for_timeout(500)
    check('« Non » : le brouillon reste', pg.query_selector('.ctop [data-act="cPublish"]') is not None)
    effacer()
    check('« Effacer » confirmé : retour aux réglages, « Créer automatiquement » rouvert', pg.query_selector('.ccreer') is not None and pg.query_selector('#cauto') is not None)

    # 2 versions côte à côte
    pg.click('#cauto [data-act="cPropose2"]'); pg.wait_for_timeout(2200)
    n = ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')))).vs.length")
    check('matchs : 2 versions côte à côte', n == 2 and pg.query_selector('.ccmp') is not None, n)
    check('2 versions : « Effacer » aussi à côté de « Publier… »', pg.query_selector('.ctop [data-act="cDiscard"]') is not None and pg.query_selector('.ctop [data-act="cPublishWhich"]') is not None)
    effacer()

    # publier, puis la page de l'événement
    auto(); pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1600)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(400); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1400)
    cp = ev("(() => { const c = MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-e1' && c.partie === 'matchs' && c.statut === 'publiee'); return c ? { reg: c.reglages, ids: c.equipes.map(t => t.id) } : null; })()")
    check('publiés : le serveur garde les réglages du plateau', cp and cp['reg'].get('vue') == 'plateau' and cp['reg'].get('opts', {}).get('priorite') == 'postes' and cp['ids'] == ['B1', 'B2'], cp)
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1200)
    t2 = ev("(() => { const a = document.querySelector('a.cpart[href*=\"p=matchs\"] .t2'); return a ? a.innerText : ''; })()")
    check('page de l\'entraînement : « 2 équipes (B1 …, B2 …) »', '2 équipes (B1' in t2, t2)
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1300)
    check('matchs publiés : « Modifier » et « Partager »', pg.query_selector('[data-act="cEditer"]') is not None and pg.query_selector('[data-act="cPartager"]') is not None)
    pg.click('[data-act="cEditer"]'); pg.wait_for_timeout(600)
    check('« Modifier » : le panneau des options du plateau', pg.query_selector('details.cbopt') is not None)
    check('matchs publiés : pas de défilement de côté', noscroll())
    # (relecture) l'entraînement suivant : « Reprendre les équipes du … » reprend B1 et B2, avec les effectifs d'aujourd'hui
    eid = ev("""(() => { const c = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-e1'), d = String(c.debut).slice(0, 10), x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 7);
      const F = MC.compos.fiches(MC.app.S.cache.group), ids = Object.keys(F).filter(id => F[id].actif).slice(0, 15);
      return MC.api.call('setEvenement', { token: MC.app.S.adult.token, titre: 'Entraînement - Suite', debut: x.toISOString().slice(0, 10), presents: ids }).then(r => r.evenement.id); })()""")
    ev("MC.loadCompos && MC.loadCompos(true)"); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/educ/compo/' + eid + '?p=matchs'); pg.wait_for_timeout(1400)
    check('entraînement suivant : « Reprendre les équipes du … »', pg.query_selector('.ccreer [data-act="cReprise"]') is not None)
    pg.click('.ccreer [data-act="cReprise"]'); pg.wait_for_timeout(1000)
    rp = ev("(id => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf(id + ':matchs') > 0); const d = JSON.parse(localStorage.getItem(k)).vs[0]; return { reg: d.reglages, ids: d.equipes.map(t => t.id) }; })('%s')" % eid)
    check('repris : B1 et B2, comme un plateau, sans les effectifs de la dernière fois', rp['ids'] == ['B1', 'B2'] and rp['reg'].get('vue') == 'plateau' and 'tailles' not in rp['reg'], rp)
    check('repris : « Générer une nouvelle compo » possible (pas d\'enfant en trop ni en moins)', pg.query_selector('details.cbopt [data-act="cRegen"]:not([disabled])') is not None)

    # ----- 3. les anciens matchs (« Équipe 1 contre Équipe 2 ») restent lisibles -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e0?p=matchs'); pg.wait_for_timeout(1300)
    t = pg.inner_text('main')
    check('anciens matchs : « Équipe 1 » et « Équipe 2 », sans panneau d\'options', 'Équipe 1'.upper() in t.upper() and 'Équipe 2'.upper() in t.upper() and pg.query_selector('details.cbopt') is None, t[:500])
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
