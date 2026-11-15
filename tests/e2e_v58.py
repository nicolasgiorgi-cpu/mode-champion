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

def ouvrirAuto(pg):
    # (v65) sur la page de préparation, les options et « Générer » sont dans « Créer automatiquement » : l'ouvrir s'il est fermé
    b = pg.query_selector('[data-act="cAuto"][aria-expanded="false"]')
    if b: b.click(); pg.wait_for_timeout(300)
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
    ouvrirAuto(pg); pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)

    # ----- 2. en haut de chaque équipe : la couverture des postes en compact -----
    cov = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':sp-demo-p3')))).vs[0];
      const gone = new Set([...document.querySelectorAll('.cpj.gone')].map(x => x.getAttribute('data-id')));
      return d.equipes.map(t => { const col = document.querySelector('.ccol[aria-label="Équipe ' + t.id + '"]'), lignes = [...col.querySelectorAll('.chd .cpg .cpgl')];
        const R = K.repartition(t.joueurs.map(j => j.id).filter(id => !gone.has(id)), F);
        return { n: lignes.length, txt: col.querySelector('.chd').textContent, ok: R.postes.every((p, i) => { const l = lignes[i], a = p.princ.length, b = p.autres.length;
          return l.getAttribute('data-p') === p.id && l.querySelector('.n').textContent === a + (b ? '+' + b : '') && l.querySelectorAll('.tr i').length === 2; }) }; }); })()""")
    check('en-tête : les postes comme « Répartition des postes » (une ligne par poste, sa barre, principal + peut jouer à droite), sans les absents (v85 : 8 postes avec l\'arrière)', len(cov) == 2 and all(x['n'] == 8 and x['ok'] for x in cov), cov)
    check('en-tête : plus de « Av x/5 · Ar x/5 · Remp. »', all('/5' not in x['txt'] and 'Remp.' not in x['txt'] for x in cov), [x['txt'] for x in cov])
    check('en-tête : lignes serrées (moins de 20 px par poste)', ev("[...document.querySelectorAll('.chd .cpgl')].every(l => l.getBoundingClientRect().height < 20)"))
    check('en-tête : les lignes tiennent dans l\'équipe', ev("[...document.querySelectorAll('.cpgl')].every(c => c.scrollWidth <= c.clientWidth + 1)"))
    check('pas de défilement de côté', noscroll())
    # (v60, demande de Nicolas) « pas encore répondu sur Spond » : un « ? » doré dans la légende et collé à droite du prénom (plus de chrono)
    ch = ev("""(() => { const l = document.querySelector('.clegend'), c = [...document.querySelectorAll('.cpj .catt')];
      return { leg: !!l && /pas encore répondu sur Spond/.test(l.textContent) && !!l.querySelector('.clg-att .cqatt') && l.querySelector('.clg-att .cqatt').textContent === '?', n: c.length,
        place: c.map(x => { const r = x.getBoundingClientRect(), n = x.closest('.cpj').querySelector('.cpn').getBoundingClientRect();
          return { texte: x.querySelector('[aria-hidden]').textContent, collé: r.left - n.right >= 0 && r.left - n.right <= 8, ligne: Math.abs((r.top + r.bottom) / 2 - (n.top + n.bottom) / 2) < 6, chrono: !!x.querySelector('svg') }; }) }; })()""")
    check('(v60) « ? » doré expliqué dans la légende', ch['leg'], ch)
    check('(v60) « ? » collé à droite du prénom, sur sa ligne (plus de chrono)', ch['n'] > 0 and all(x['texte'] == '?' and x['collé'] and x['ligne'] and not x['chrono'] for x in ch['place']), ch)

    # ----- 3. affichage côte à côte (au choix, gardé sur l'appareil) -----
    # (v66, accord de Nicolas du 10/11) sans choix sur l'appareil : côte à côte à partir de 900 px de large, sinon l'une sous l'autre
    if W >= 900:
        check('« Affichage » : côte à côte par défaut à partir de 900 px', pg.query_selector('[data-act="cCote"][data-v="1"].on') is not None and pg.query_selector('.ccote') is not None)
        pg.click('[data-act="cCote"][data-v="0"]'); pg.wait_for_timeout(500)
    check('« Affichage » : l\'une sous l\'autre' + (' une fois choisie' if W >= 900 else ' par défaut'), pg.query_selector('[data-act="cCote"][data-v="0"].on') is not None and pg.query_selector('.ccote') is None)
    pg.click('[data-act="cCote"][data-v="1"]'); pg.wait_for_timeout(500)
    pos = ev("""[...document.querySelectorAll('.ccote .ccol')].map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })""")
    check('côte à côte : A1 et B1 sur la même ligne, l\'une à côté de l\'autre', len(pos) == 2 and pos[0][1] == pos[1][1] and pos[0][0] < pos[1][0], pos)
    check('côte à côte : plus de titres de niveau, « Les équipes »', pg.query_selector('.ccote .clvh') is not None and 'Les équipes' in ev("document.querySelector('.ccote .clvh').textContent") and pg.query_selector('.clevel:not(.ccote):not(.banc) .clvh') is None)
    check('côte à côte : les lignes des postes tiennent (noms courts en colonne étroite), rien ne déborde', noscroll() and ev("[...document.querySelectorAll('.cpgl')].every(c => c.scrollWidth <= c.clientWidth + 1 && [...c.children].every(x => x.scrollWidth <= x.clientWidth + 1))"))
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
    check('toute fenêtre : une hauteur maximale (aussi sans dvh), les boutons collés au bas de la carte', ev("getComputedStyle(document.querySelector('.modal .card')).maxHeight !== 'none' && Math.abs(document.querySelector('.modal .mbtns').getBoundingClientRect().bottom - document.querySelector('.modal .card').getBoundingClientRect().bottom) < 2"))
    ev("document.documentElement.style.removeProperty('--safe-t')")

    # ----- 5. une compo publiée : (v86, demande de Nicolas du 15/11) modifiable tout de suite, sans « Modifier la compo » ;
    # dès le 1er changement « Annuler » ou « Enregistrer » ; avant (v58) : en lecture jusqu'à « Modifier la compo » -----
    pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    check('publiée : modifiable tout de suite (« Poste par poste », options, annuler un geste), plus de « Modifier la compo »', pg.query_selector('[data-act="cEditer"]') is None and pg.query_selector('[data-act="cParPoste"]') is not None and pg.query_selector('.cbopt') is not None and pg.query_selector('[data-act="cUndo"]') is not None and pg.query_selector('.cboard2.ed') is not None)
    check('publiée, sans changement : « Partager », ni « Enregistrer » ni « Annuler »', pg.query_selector('[data-act="cPartager"]') is not None and pg.query_selector('[data-act="cSave"]') is None and pg.query_selector('.ctop [data-act="cDiscard"]') is None)
    check('publiée : le bandeau nomme l\'auteur', 'Compo de ' in ev("document.querySelector('.cstate').textContent"))
    # changer le poste d'un joueur avec « Poste par poste », puis enregistrer : version 2
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    pg.click('.modal [data-pp="ailier"]'); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('.modal details.cpgrp')].forEach(x => x.open = true)"); pg.wait_for_timeout(300)
    pid = ev("(() => { const b = [...document.querySelectorAll('.modal .ppb[aria-pressed=\"false\"]')].find(x => x.offsetParent); return b ? [b.getAttribute('data-ppid'), b.getAttribute('data-ppt')] : null; })()")
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="%s"]' % (pid[0], pid[1])); pg.wait_for_timeout(400)
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    check('modifiée : « Annuler » et « Enregistrer » côte à côte en haut, « pas encore enregistrés »', pg.query_selector('.ctop [data-act="cSave"]') is not None and pg.query_selector('.ctop [data-act="cDiscard"]') is not None and 'pas encore enregistrés' in ev("document.querySelector('.cstate').textContent"))
    r = ev("(() => { const a = document.querySelector('.ctop [data-act=cDiscard]').getBoundingClientRect(), b = document.querySelector('.ctop [data-act=cSave]').getBoundingClientRect(); return Math.abs(a.top - b.top) < 4 && a.right <= b.left + 1; })()")
    check('« Annuler » à gauche de « Enregistrer », sur la même ligne', r)
    check('modifiée : plus de lien « Annuler mes changements » en bas (le bouton est en haut)', 'Annuler mes changements' not in pg.inner_text('main'))
    pg.click('[data-act="cSave"]'); pg.wait_for_timeout(600)
    if pg.query_selector('.modal'): pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    c = ev("MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p3' && !c.partie && c.statut === 'publiee')")
    pj = [x['poste'] for t in c['equipes'] for x in t['joueurs'] if x['id'] == pid[0] and t['id'] == pid[1]]
    check('enregistrée : version 2, le joueur à l\'aile dans son équipe', c['version'] == 2 and pj == ['ailier'], (c['version'], pj))
    check('enregistrée : toujours modifiable, plus de « Enregistrer »', pg.query_selector('.cboard2.ed') is not None and pg.query_selector('[data-act="cSave"]') is None)
    # un changement pas enregistré reste sur l'appareil : on quitte, on revient, il est là
    j = ev("document.querySelector('.ccol:not(.banc) .cpj:not(.gone)').getAttribute('data-id')")
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    pg.click('.modal [data-pp="centre"]'); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('.modal details.cpgrp')].forEach(x => x.open = true)"); pg.wait_for_timeout(300)
    pid2 = ev("(() => { const b = [...document.querySelectorAll('.modal .ppb[aria-pressed=\"false\"]')].find(x => x.offsetParent); return b ? [b.getAttribute('data-ppid'), b.getAttribute('data-ppt')] : null; })()")
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="%s"]' % (pid2[0], pid2[1])); pg.wait_for_timeout(400)
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1100)
    check('quittée avec un changement : au retour, il est là, avec « Annuler » et « Enregistrer »', pg.query_selector('[data-act="cSave"]') is not None and pg.query_selector('.ctop [data-act="cDiscard"]') is not None)
    pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400); pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(900)
    c2 = ev("MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p3' && !c.partie && c.statut === 'publiee')")
    check('« Annuler » : de nouveau la version 2, toujours modifiable', pg.query_selector('[data-act="cSave"]') is None and pg.query_selector('.cboard2.ed') is not None and c2['version'] == 2)
    # annuler le dernier geste jusqu'au bout : plus de changement, plus de boutons
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    pg.click('.modal [data-pp="centre"]'); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('.modal details.cpgrp')].forEach(x => x.open = true)"); pg.wait_for_timeout(300)
    pid3 = ev("(() => { const b = [...document.querySelectorAll('.modal .ppb[aria-pressed=\"false\"]')].find(x => x.offsetParent); return b ? [b.getAttribute('data-ppid'), b.getAttribute('data-ppt')] : null; })()")
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="%s"]' % (pid3[0], pid3[1])); pg.wait_for_timeout(400)
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    check('annuler le seul geste : plus de « Enregistrer » ni « Annuler »', pg.query_selector('[data-act="cSave"]') is None and pg.query_selector('.ctop [data-act="cDiscard"]') is None)
    # (relecture v58) « Retirer » de « À regarder » : d'un geste, puis « Enregistrer (v3) » ou « Annuler »
    fi = ev("""(() => { const b = [...document.querySelectorAll('[data-act="cFix"]')].find(x => /Absent/.test(x.closest('li').textContent)); return b ? [b.getAttribute('data-v'), b.getAttribute('data-i')] : null; })()""")
    check('« Retirer » les absents d\'un geste, toujours là', fi is not None)
    if fi:
        nabs = ev("document.querySelectorAll('.ccol:not(.banc) .cpj.gone').length")
        pg.click('[data-act="cFix"][data-v="%s"][data-i="%s"]' % (fi[0], fi[1])); pg.wait_for_timeout(600)
        check('… « Retirer » : les absents sortent, « Enregistrer »', nabs > 0 and ev("document.querySelectorAll('.ccol:not(.banc) .cpj.gone').length") == 0 and pg.query_selector('[data-act="cSave"]') is not None)
        pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400); pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(900)
        check('« Annuler » : de nouveau la version 2', pg.query_selector('[data-act="cSave"]') is None and ev("document.querySelectorAll('.ccol:not(.banc) .cpj.gone').length") == nabs)

    # ----- 6. la page du plateau : (v86) plus de « Modifier la compo », la carte ouvre la compo, modifiable ; un changement pas
    # enregistré s'y voit -----
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(1200)
    check('page du plateau : plus de « Modifier la compo », rien en attente', pg.query_selector('[data-act="eEditer"]') is None and pg.query_selector('.cnonenr') is None)
    pg.click('a.ccompo[href="#/educ/compo/sp-demo-p3"]'); pg.wait_for_timeout(1300)
    check('… la carte ouvre la compo, modifiable', '#/educ/compo/sp-demo-p3' in pg.url and pg.query_selector('[data-act="cParPoste"]') is not None and pg.query_selector('.cboard2.ed') is not None)
    j1 = ev("document.querySelector('.ccol:not(.banc) .cpj:not(.gone)').getAttribute('data-id')")
    pg.click('.ccol .cpj[data-id="%s"]' % j1); pg.wait_for_timeout(400)
    pg.click('.cdock [data-act="cMove"][data-t="banc"]'); pg.wait_for_timeout(500)
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(1200)
    check('un changement pas enregistré : « Changements pas encore enregistrés » sur la page du plateau', pg.query_selector('.ccompo .cnonenr') is not None)
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1100)
    pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400); pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(1200)
    check('« Annuler » : plus rien en attente sur la page du plateau', pg.query_selector('.cnonenr') is None)
    # un autre plateau (demo-r1, une compo publiée par Coach Nico) : la carte de la compo, pas de bouton « Modifier »
    pg.goto(BASE + '#/educ/evt/demo-r1'); pg.wait_for_timeout(1200)
    check('page d\'un autre plateau : la carte de la compo, pas de bouton « Modifier »', pg.query_selector('a.ccompo') is not None and pg.query_selector('[data-act="eEditer"]') is None)
    # la compo d'un autre éduc (les matchs de Julien, hors jour J) : toujours « Proposer des changements » (demande de Nicolas du 15/11)
    pg.goto(BASE + '#/educ/compo/sp-demo-e0?p=matchs'); pg.wait_for_timeout(1300)
    check('compo d\'un autre éduc : en lecture, « Proposer des changements » (contre-proposition)', pg.query_selector('[data-act="cCounter"]') is not None and pg.query_selector('.cboard2.ed') is None)
    pg.click('[data-act="cCounter"]'); pg.wait_for_timeout(600)
    j3 = ev("document.querySelector('.ccol:not(.banc) .cpj').getAttribute('data-id')")
    pg.click('.ccol .cpj[data-id="%s"]' % j3); pg.wait_for_timeout(400)
    check('contre-proposition : pas de « Titulaire / Remplaçant » (elle porte sur les équipes et les postes)', pg.query_selector('.cdock') is not None and pg.query_selector('.cdock .cmtit') is None)
    pg.click('.cdock [data-act="cPick"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(400); pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(800)

    # ----- 7. les matchs d'un entraînement, une fois publiés -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1200)
    ouvrirAuto(pg)   # (v65)
    if pg.query_selector('[data-act="cPropose"]'):
        ouvrirAuto(pg); pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(500)
    if pg.query_selector('.modal'): pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(1800)
    check('matchs publiés : modifiables tout de suite (v86), la couverture des postes', pg.query_selector('.cboard2.ed') is not None and pg.query_selector('[data-act="cEditer"]') is None and len(pg.query_selector_all('.ccol .chd .cpg')) == 2)
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1200)
    check('page de l\'entraînement : plus de « Modifier les matchs » (v86), la carte des matchs « Publiés »', pg.query_selector('[data-act="eEditer"]') is None and 'Modifier les matchs' not in ev("document.querySelector('main').textContent") and 'Publiés' in ev("document.querySelector('a.cpart[href*=matchs]').textContent"))
    pg.click('a.cpart[href*="p=matchs"]'); pg.wait_for_timeout(1300)
    check('… la carte ouvre les matchs, modifiables', 'p=matchs' in pg.url and pg.query_selector('[data-act="cParPoste"]') is not None and pg.query_selector('.cboard2.ed') is not None)
    # un changement pas enregistré : la carte des matchs le dit
    j2 = ev("document.querySelector('.ccol:not(.banc) .cpj:not(.gone)').getAttribute('data-id')")
    pg.click('.ccol .cpj[data-id="%s"]' % j2); pg.wait_for_timeout(400)
    pg.click('.cdock [data-act="cMove"][data-t="banc"]'); pg.wait_for_timeout(500)
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1200)
    check('page de l\'entraînement : « Pas enregistrés » sur la carte des matchs', 'Pas enregistrés' in ev("document.querySelector('a.cpart[href*=matchs]').textContent"))
    check('pas de défilement de côté', noscroll())

    print('ERREURS JS :', errs or 'aucune')
    ok = sum(1 for _, c in res if c)
    print('%d/%d' % (ok, len(res)), W, H)
    b.close()
    sys.exit(0 if ok == len(res) and not errs else 1)
