# (v58) Demandes de Nicolas du 08/11/2026 : la fenêtre « Poste par poste » ne passe plus sous l'encoche de l'iPhone (croix et titre
# visibles) ; sur les lignes, plus de « pas répondu », les passerelles ⇅ à côté du niveau, l'ordre niveau → niveau + passerelle →
# plaquage ; une compo publiée se rouvre d'un bouton (« Modifier la compo », aussi depuis la page de l'événement) ; les équipes
# côte à côte au choix ; en haut de chaque équipe, la couverture des postes en compact au lieu de « Av x/5 · Ar x/5 ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v58.py 390 844 · 1180 820 · 820 1180
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
    def draft(evt):
        return ev("""(e) => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':' + e) && localStorage.getItem(k) !== 'null'); return k ? JSON.parse(localStorage.getItem(k)).vs[0] : null; }""", evt)

    # ----- 1. une compo de décembre, tout le groupe -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)

    # ----- 2. en haut de chaque équipe : la couverture des postes en compact -----
    cov = ev("""(() => { const K = MC.compos, d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':sp-demo-p3')))).vs[0];
      const gone = new Set([...document.querySelectorAll('.cpj.gone')].map(x => x.getAttribute('data-id')));
      return d.equipes.map(t => { const col = document.querySelector('.ccol[aria-label="Équipe ' + t.id + '"]'), cases = [...col.querySelectorAll('.chd .ccov .ccv')];
        return { n: cases.length, txt: col.querySelector('.chd').textContent, ok: K.ORDRE.every((p, i) => { const n = t.joueurs.filter(j => j.poste === p && !gone.has(j.id)).length, c = cases[i];
          return c.querySelector('b').textContent.indexOf({ pilier: 'Pil', talonneur: 'Tal', 'troisieme-ligne': '3eL', 'demi-de-melee': '9', ouvreur: '10', centre: 'Ctr', ailier: 'Ail' }[p]) === 0
            && c.querySelectorAll('.ccs i.on').length === n && c.querySelectorAll('.ccs i').length === Math.max(n, K.BESOIN[p]) && c.querySelectorAll('.ccs i.plus').length === Math.max(0, n - K.BESOIN[p])
            && c.classList.contains('court') === (n < K.BESOIN[p]); }) }; }); })()""")
    check('en-tête : 7 cases de postes par équipe, un trait par place (plein = tenue, sans les absents), un trait de plus par joueur en plus', len(cov) == 2 and all(x['n'] == 7 and x['ok'] for x in cov), cov)
    check('en-tête : plus de « Av x/5 · Ar x/5 · Remp. »', all('/5' not in x['txt'] and 'Remp.' not in x['txt'] for x in cov), [x['txt'] for x in cov])
    check('en-tête : les cases tiennent dans l\'équipe', ev("[...document.querySelectorAll('.ccov')].every(c => c.scrollWidth <= c.clientWidth + 1 && [...c.children].every(x => x.scrollWidth <= x.clientWidth + 1))"))
    check('pas de défilement de côté', noscroll())

    # ----- 3. affichage côte à côte (au choix, gardé sur l'appareil) -----
    check('« Affichage » : l\'une sous l\'autre par défaut', pg.query_selector('[data-act="cCote"][data-v="0"].on') is not None and pg.query_selector('.ccote') is None)
    pg.click('[data-act="cCote"][data-v="1"]'); pg.wait_for_timeout(500)
    pos = ev("""[...document.querySelectorAll('.ccote .ccol')].map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })""")
    check('côte à côte : A1 et B1 sur la même ligne, l\'une à côté de l\'autre', len(pos) == 2 and pos[0][1] == pos[1][1] and pos[0][0] < pos[1][0], pos)
    check('côte à côte : plus de titres de niveau, « Les équipes »', pg.query_selector('.ccote .clvh') is not None and 'Les équipes' in ev("document.querySelector('.ccote .clvh').textContent") and pg.query_selector('.clevel:not(.ccote):not(.banc) .clvh') is None)
    check('côte à côte : les cases des postes tiennent, rien ne déborde', noscroll() and ev("[...document.querySelectorAll('.ccov')].every(c => c.scrollWidth <= c.clientWidth + 1 && [...c.children].every(x => x.scrollWidth <= x.clientWidth + 1))"))
    pg.reload(); pg.wait_for_timeout(1500)
    check('côte à côte : gardé après rechargement', pg.query_selector('.ccote') is not None and pg.query_selector('[data-act="cCote"][data-v="1"].on') is not None)
    pg.click('[data-act="cCote"][data-v="0"]'); pg.wait_for_timeout(500)
    check('retour à l\'une sous l\'autre', pg.query_selector('.ccote') is None and len(pg.query_selector_all('.clevel:not(.banc) .clvh')) >= 2)

    # ----- 4. « Poste par poste » : la fenêtre entre l'encoche et le bas de l'écran (iPhone simulé) -----
    ev("document.documentElement.style.setProperty('--safe-t', '59px'); document.documentElement.style.setProperty('--safe-b', '34px')")
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(800)
    m = ev("""(() => { const h = document.querySelector('.modal .mhead').getBoundingClientRect(), c = document.querySelector('.modal .card').getBoundingClientRect(), x = document.querySelector('.modal [data-close]').getBoundingClientRect();
      const top = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
      return { head: Math.round(h.top), card: Math.round(c.top), bas: Math.round(c.bottom), vh: innerHeight, croix: !!top && !!top.closest('[data-close]') }; })()""")
    check('la fenêtre commence sous l\'encoche (59 px) : titre et croix visibles', m['card'] >= 59 + 16 - 1 and m['head'] >= 59, m)
    check('la croix se touche (rien par-dessus)', m['croix'], m)
    check('la fenêtre s\'arrête au-dessus de la barre du bas (34 px)', m['bas'] <= m['vh'] - 34, m)
    rows = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), e = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3');
      return [...document.querySelectorAll('.modal .cpgrp')].filter(g => !g.closest('details:not([open])') && g.tagName !== 'DETAILS').map(g => [...g.querySelectorAll('.pprow')].map(r => { const id = r.querySelector('.ppb').getAttribute('data-ppid'), f = F[id];
        return { id, rang: K.rangVivier(f), abs: r.classList.contains('abs'), plaq: f.plaquage === null || f.plaquage === undefined || f.plaquage === '' ? -1 : +f.plaquage, pas: K.pasDe(f).join(''), pills: [...r.querySelectorAll('.tpas')].map(x => x.textContent.replace(/[^ABC]/g, '')).join(''), att: (e.sansReponse || []).indexOf(id) >= 0, txt: r.textContent }; })); })()""")
    tri = True
    for g in rows:
        for a, c in zip(g, g[1:]):
            if (a['abs'], a['rang'], -a['plaq']) > (c['abs'], c['rang'], -c['plaq']): tri = False
    check('le tri : niveau, puis niveau + passerelle (B ⇅A après les A), puis plaquage ; les absents en bas', tri and sum(len(g) for g in rows) >= 3, rows)
    check('les passerelles ⇅ à côté du niveau, sur chaque ligne', all(r['pills'] == r['pas'] for g in rows for r in g) and any(r['pas'] for g in rows for r in g))
    check('plus de « pas répondu » sur les lignes', all('pas répondu' not in r['txt'] for g in rows for r in g) and 'pas répondu' not in pg.inner_text('.modal'))
    # le même tri pour tous les postes, et les autres repliés
    for k in range(6):
        pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(350)
    check('… jusqu\'au dernier poste, la fenêtre reste entre l\'encoche et le bas', ev("(() => { const c = document.querySelector('.modal .card').getBoundingClientRect(); return c.top >= 59 && c.bottom <= innerHeight - 34; })()"))
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    ev("document.documentElement.style.removeProperty('--safe-t'); document.documentElement.style.removeProperty('--safe-b')")
    # une fenêtre ordinaire aussi (publier)
    ev("document.documentElement.style.setProperty('--safe-t', '59px')")
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(600)
    check('toute fenêtre : sous l\'encoche', ev("document.querySelector('.modal .card').getBoundingClientRect().top >= 59"))
    ev("document.documentElement.style.removeProperty('--safe-t')")

    # ----- 5. une compo publiée : en lecture, « Modifier la compo » d'un geste -----
    pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    check('publiée : en lecture (pas de « Poste par poste », pas d\'options), « Modifier la compo »', pg.query_selector('[data-act="cEditer"]') is not None and pg.query_selector('[data-act="cParPoste"]') is None and pg.query_selector('.cbopt') is None and pg.query_selector('[data-act="cUndo"]') is None)
    check('publiée : le texte le dit', 'Modifier la compo' in ev("document.querySelector('.cstate').textContent"))
    j = ev("document.querySelector('.ccol:not(.banc) .cpj:not(.gone)').getAttribute('data-id')")
    pg.click('.ccol .cpj[data-id="%s"]' % j); pg.wait_for_timeout(400)
    check('publiée : toucher un joueur montre sa fiche, sans le déplacer', pg.query_selector('.cdock') is not None and pg.query_selector('[data-act="cMove"]') is None)
    pg.click('[data-act="cEditer"]'); pg.wait_for_timeout(600)
    check('« Modifier la compo » : « Poste par poste », les options et « Terminer »', pg.query_selector('[data-act="cParPoste"]') is not None and pg.query_selector('.cbopt') is not None and pg.query_selector('[data-act="cFinEdit"]') is not None)
    pg.click('[data-act="cFinEdit"]'); pg.wait_for_timeout(500)
    check('« Terminer » sans changement : de nouveau en lecture', pg.query_selector('[data-act="cEditer"]') is not None and pg.query_selector('[data-act="cParPoste"]') is None)
    pg.click('[data-act="cEditer"]'); pg.wait_for_timeout(500)
    # changer le poste d'un joueur avec « Poste par poste », puis enregistrer : version 2
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    pg.click('.modal [data-pp="ailier"]'); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('.modal details.cpgrp')].forEach(x => x.open = true)"); pg.wait_for_timeout(300)
    pid = ev("(() => { const b = [...document.querySelectorAll('.modal .ppb[aria-pressed=\"false\"]')].find(x => x.offsetParent); return b ? [b.getAttribute('data-ppid'), b.getAttribute('data-ppt')] : null; })()")
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="%s"]' % (pid[0], pid[1])); pg.wait_for_timeout(400)
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    check('modifiée : « Enregistrer (v2) »', pg.query_selector('[data-act="cSave"]') is not None and '(v2)' in ev("document.querySelector('[data-act=cSave]').textContent"))
    pg.click('[data-act="cSave"]'); pg.wait_for_timeout(600)
    if pg.query_selector('.modal'): pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    c = ev("MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p3' && !c.partie && c.statut === 'publiee')")
    pj = [x['poste'] for t in c['equipes'] for x in t['joueurs'] if x['id'] == pid[0] and t['id'] == pid[1]]
    check('enregistrée : version 2, le joueur à l\'aile dans son équipe', c['version'] == 2 and pj == ['ailier'], (c['version'], pj))
    check('enregistrée : de nouveau en lecture', pg.query_selector('[data-act="cEditer"]') is not None)

    # ----- 6. depuis la page du plateau : « Modifier la compo » ouvre la compo en modification -----
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(1200)
    check('page du plateau : « Modifier la compo »', pg.query_selector('[data-act="eEditer"]') is not None)
    pg.click('[data-act="eEditer"]'); pg.wait_for_timeout(1300)
    check('… la compo s\'ouvre en modification', '#/educ/compo/sp-demo-p3' in pg.url and pg.query_selector('[data-act="cParPoste"]') is not None and pg.query_selector('[data-act="cFinEdit"]') is not None)
    pg.click('[data-act="cFinEdit"]'); pg.wait_for_timeout(400)
    # un autre éduc (pas le jour J) : pas de bouton, une contre-proposition
    pg.goto(BASE + '#/educ/evt/demo-r1'); pg.wait_for_timeout(1200)
    au = ev("(() => { const c = MC.app.S.cache.compos.compos.find(c => c.evenementId === 'demo-r1' && !c.partie); return c && c.auteur; })()")
    moi = ev("MC.app.S.cache.group.moi.id")
    check('page d\'un plateau : « Modifier la compo » seulement pour qui peut la modifier', (pg.query_selector('[data-act="eEditer"]') is not None) == (au == moi), (au, moi))

    # ----- 7. les matchs d'un entraînement : « Modifier les matchs » une fois publiés -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1200)
    if pg.query_selector('[data-act="cPropose"]'):
        pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(500)
    if pg.query_selector('.modal'): pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    check('matchs publiés : en lecture, « Modifier la compo », la couverture des postes', pg.query_selector('[data-act="cEditer"]') is not None and len(pg.query_selector_all('.ccol .chd .ccov')) == 2)
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1200)
    check('page de l\'entraînement : « Modifier les matchs »', pg.query_selector('[data-act="eEditer"][data-p="matchs"]') is not None and 'Modifier les matchs' in ev("document.querySelector('main').textContent"))
    pg.click('[data-act="eEditer"][data-p="matchs"]'); pg.wait_for_timeout(1300)
    check('… les matchs s\'ouvrent en modification', 'p=matchs' in pg.url and pg.query_selector('[data-act="cParPoste"]') is not None)
    check('pas de défilement de côté', noscroll())

    print('ERREURS JS :', errs or 'aucune')
    ok = sum(1 for _, c in res if c)
    print('%d/%d' % (ok, len(res)), W, H)
    b.close()
    sys.exit(0 if ok == len(res) and not errs else 1)
