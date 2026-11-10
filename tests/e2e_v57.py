# (v57) Jeu à 10 « poste par poste » (demande de Nicolas du 07/11/2026) : le poste préféré à gauche dans Enfants ; un plateau à 10
# = une équipe A et une équipe B ; « Avec qui ? » (les présents ou tout le groupe, les absents et sans réponse marqués dans la compo,
# « Actualiser » Spond) ; la fenêtre poste par poste (un bouton par équipe, autant d'enfants qu'on veut, OK = poste suivant ;
# niveau A → C puis plaquage, les absents en bas) ; chacun a un poste, remplaçants compris ; les matchs = deux équipes équilibrées.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v57.py 390 844 · 1180 820 · 820 1180
import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
NIV = {'A': 0, 'B': 1, 'C': 2}

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
    def draft(evt, partie=''):
        return ev("""([e, p]) => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf(':' + e + (p ? ':' + p : '')) > 0 && (p || !/:(ateliers|matchs)$/.test(k)) && localStorage.getItem(k) !== 'null'); return k ? JSON.parse(localStorage.getItem(k)).vs[0] : null; }""", [evt, partie])

    # ----- 1. Enfants : le poste préféré ★ toujours le plus à gauche, puis les autres dans l'ordre pilier → ailier -----
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1200)
    rows = ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group), K = MC.compos, ORD = K.ORDRE;
      return [...document.querySelectorAll('#tlist a.tfrow')].map(a => { const id = a.getAttribute('href').split('/').pop(), f = F[id];
        const pills = [...a.querySelectorAll('.tps .tpp:not(.none):not(.voeu)')].map(x => ({ pref: x.classList.contains('pref'), txt: x.querySelector('[aria-hidden]') ? x.querySelector('[aria-hidden]').textContent : '' }));
        return { id, pills, pref: f.postesOk.length ? K.prefDe(f) : [], n: K.postesDe(f).length }; }); })()""")
    bons = True; ex = None
    for r in rows:
        pl = r['pills']
        if not pl: continue
        prefs = [x['pref'] for x in pl]
        if prefs != sorted(prefs, reverse=True): bons = False; ex = r; break
    check('Enfants : les pastilles pleines (préférés ★) d\'abord, à gauche', bons, ex)
    cas = [r for r in rows if r['pills'] and r['pref'] and not r['pills'][0]['pref'] is False and r['pills'][0]['txt'] in ('Tal', '3eL', '9', '10', 'Ctr', 'Ail') and len(r['pills']) > 1 and not r['pills'][1]['pref']]
    check('Enfants : un préféré qui n\'est pas le 1er dans l\'ordre des postes passe quand même à gauche (démo)', len(cas) > 0, [r['pills'] for r in rows][:6])
    ordre = ev("""(() => { const R = { Pil: 0, Tal: 1, '3eL': 2, '9': 3, '10': 4, Ctr: 5, Ail: 6 };
      return [...document.querySelectorAll('#tlist .tps')].every(t => { const p = [...t.querySelectorAll('.tpp:not(.none):not(.voeu)')], a = p.filter(x => x.classList.contains('pref')), o = p.filter(x => !x.classList.contains('pref'));
        const r = l => l.map(x => R[x.querySelector('[aria-hidden]').textContent]); const s = l => JSON.stringify(l) === JSON.stringify(l.slice().sort((x, y) => x - y)); return s(r(a)) && s(r(o)); }); })()""")
    check('Enfants : préférés entre eux, puis les autres, dans l\'ordre pilier → ailier', ordre)

    # ----- 2. un plateau de décembre : jeu à 10, une équipe A et une équipe B ; « Avec qui ? » -----
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-cdraft:') === 0).forEach(k => localStorage.removeItem(k))")
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    check('plateau de décembre : jeu à 10, A 1 · B 1 · C 0', ev("document.querySelector('[data-act=cFmt][data-v=\"10\"]').classList.contains('on')") and ev("[...document.querySelectorAll('.cstep .cnbv')].map(o => o.textContent).join(',')") == '1,1,0')
    check('« Avec qui ? » : les présents (par défaut) ou tout le groupe', len(pg.query_selector_all('[data-act="cBase"]')) == 2 and ev("document.querySelector('[data-act=cBase][data-v=presents]').classList.contains('on')"))
    check('« Poste par poste, à la main » à la place de « Partir de zéro »', pg.query_selector('[data-act="cZero10"]') is not None and pg.query_selector('[data-act="cZero"]') is None)
    npres = ev("MC.compos.presents(MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3')).filter(id => MC.compos.fiches(MC.app.S.cache.group)[id].actif).length")
    ntous = ev("MC.app.S.cache.group.joueurs.filter(p => p.joueur.actif && !/^test$/i.test(p.joueur.prenom)).length")
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(400)
    check('tout le groupe : les joueurs par équipe comptent tout le groupe', ('pour %d enfants' % ntous) in ev("document.querySelector('main').textContent"), ev("(document.querySelector('.ctailp') || {}).textContent"))
    check('réglages : pas de défilement de côté', noscroll())
    ouvrirAuto(pg); pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1200)
    d = draft('sp-demo-p3')
    check('proposée avec tout le groupe : base « tous », équipes A1 et B1', d and d['reglages'].get('base') == 'tous' and [t['id'] for t in d['equipes']] == ['A1', 'B1'], d and d['reglages'])
    placed = sum(len(t['joueurs']) for t in d['equipes']) + len(d['banc'])
    check('tout le groupe est dans la compo (%d)' % ntous, placed == ntous, placed)
    sansposte = ev("""(d) => { const F = MC.compos.fiches(MC.app.S.cache.group); return d.equipes.every(t => t.joueurs.every(j => !!j.poste === (MC.compos.postesDe(F[j.id]).length > 0))); }""", d)
    check('chacun a un poste, remplaçants compris (sauf ceux qui n\'en ont aucun)', sansposte)
    check('en haut : « N enfants · M présents »', ('%d ENFANTS · %d PRÉSENTS' % (ntous, npres)) in pg.inner_text('.head').upper(), pg.inner_text('.head'))
    check('la ligne Spond : présents, absents, sans réponse (« Actualiser » caché en démo, comme la liste)', pg.query_selector('.cspond') is not None and 'marqués dans la compo' in pg.inner_text('.cspond') and pg.query_selector('.cspond [data-act="cSync"]') is None)
    nabs = ev("document.querySelectorAll('.ccol:not(.banc) .cpj.gone .cabsf').length")
    check('les absents sont dans les équipes, marqués « absent », avec leur poste', nabs > 0 and ev("[...document.querySelectorAll('.ccol:not(.banc) .cpj.gone')].every(x => x.querySelector('.cpo') && x.querySelector('.cabsf'))"), nabs)
    check('« À regarder » : les absents dans une équipe, à retirer d\'un geste', 'dans une équipe :' in pg.inner_text('main'))
    # (v58) en haut de l'équipe : les postes comme « Répartition des postes » (principal + peut jouer), sans les absents
    cv = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-p3') > 0))).vs[0], gone = new Set([...document.querySelectorAll('.cpj.gone')].map(b => b.getAttribute('data-id')));
      return d.equipes.map(t => { const col = document.querySelector('.ccol[aria-label="Équipe ' + t.id + '"]'), l = [...col.querySelectorAll('.chd .cpgl')], R = K.repartition(t.joueurs.map(j => j.id).filter(id => !gone.has(id)), F);
        return l.length === 7 && R.postes.every((p, i) => l[i].querySelector('.n').textContent === p.princ.length + (p.autres.length ? '+' + p.autres.length : '')) && !/\\/5/.test(col.querySelector('.chd').textContent); }); })()""")
    check('(v58) en-tête d\'équipe : les postes (principal + peut jouer), plus de « Av x/5 », sans les absents', cv == [True, True], cv)
    check('compo : pas de défilement de côté', noscroll())
    # (relecture v57, I5) un enfant qui n'est pas dans l'événement Spond n'est pas « absent » : une marque neutre, comptée à part
    hs = ev("""(() => { const K = MC.compos, e = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3'), P = K.presents(e), A = (e.absents || []).concat(e.retraits || []), S = e.sansReponse || [];
      const hors = MC.app.S.cache.group.joueurs.filter(p => p.joueur.actif).map(p => p.joueur.id).filter(id => P.indexOf(id) < 0 && A.indexOf(id) < 0 && S.indexOf(id) < 0);
      return { n: hors.length, ok: hors.every(id => [...document.querySelectorAll('.cpj[data-id="' + id + '"]')].every(b => b.querySelector('.chors') && !b.classList.contains('gone'))),
        absOk: A.filter(id => P.indexOf(id) < 0).every(id => [...document.querySelectorAll('.ccol:not(.banc) .cpj[data-id="' + id + '"]')].every(b => b.classList.contains('gone'))) }; })()""")
    check('pas dans l\'événement Spond : « hors Spond », pas barré ; les vrais absents barrés', hs['n'] > 0 and hs['ok'] and hs['absOk'], hs)
    check('la ligne Spond compte à part ceux qui ne sont pas dans l\'événement', "pas sur l'événement" in pg.inner_text('.cspond'), pg.inner_text('.cspond'))
    # (I6) un absent ne tient pas de place : le nombre de joueurs de l'équipe ne le compte pas, « N absent » dans l'en-tête
    eqs = ev("""[...document.querySelectorAll('.ccol')].filter(c => c.querySelector('.chd .cn')).map(c => ({ n: +c.querySelector('.chd .cn').textContent, vis: c.querySelectorAll('.cpj:not(.gone)').length, gone: c.querySelectorAll('.cpj.gone').length, hd: c.querySelector('.cavtq').textContent }))""")
    check('équipes : les absents ne comptent pas (« N absent » en haut)', any(x['gone'] for x in eqs) and all(x['n'] == x['vis'] and (('absent' in x['hd']) == (x['gone'] > 0)) for x in eqs), eqs)
    # (I1) « Garder mes placements » garde « tout le groupe » ; (I4) avec 4 équipes, « Poste par poste » reste lisible au téléphone
    pg.click('.cbopt > summary'); pg.wait_for_timeout(300)
    pg.click('.cbopt [data-act="cNb"][data-n="A"][data-d="1"]'); pg.wait_for_timeout(250)
    pg.click('.cbopt [data-act="cNb"][data-n="B"][data-d="1"]'); pg.wait_for_timeout(250)
    pg.click('.cbopt [data-act="cKeep"]'); pg.wait_for_timeout(600)
    d = draft('sp-demo-p3')
    check('« Garder mes placements » : « tout le groupe » gardé, 4 équipes', d['reglages'].get('base') == 'tous' and [t['id'] for t in d['equipes']] == ['A1', 'A2', 'B1', 'B2'] and pg.query_selector('.cspond') is not None, d['reglages'])
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    m4 = ev("""(() => { const rows = [...document.querySelectorAll('.modal .pprow')].filter(r => !r.closest('details:not([open])')), c = document.querySelector('.modal .card');
      return { many: rows.length > 0 && rows.every(r => r.classList.contains('many')), nom: Math.min(...rows.map(r => r.querySelector('.ppi').getBoundingClientRect().width)),
        nav: [...document.querySelectorAll('.modal .ppn small')].map(x => x.textContent), bord: c.scrollWidth <= c.clientWidth + 1,
        dans: [...document.querySelectorAll('.modal .ppn')].every(b => b.scrollWidth <= b.clientWidth + 1) }; })()""")
    check('4 équipes : les boutons passent sous le nom, le nom reste lisible', m4['many'] and m4['nom'] >= 120, m4)
    check('4 équipes : la barre des postes dit seulement ce qui manque (−N ou ✓), sans déborder', all(x == '✓' or (x.startswith('−') and x[1:].isdigit()) for x in m4['nav']) and m4['dans'] and m4['bord'], m4)
    check('4 équipes : les boutons font 44 px', ev("[...document.querySelectorAll('.modal .ppb')].every(b => b.getBoundingClientRect().width >= 43.5 && b.getBoundingClientRect().height >= 43.5)"))
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    pg.click('[data-act="cUndo"]'); pg.wait_for_timeout(500)
    pg.click('.cbopt [data-act="cNb"][data-n="A"][data-d="-1"]'); pg.wait_for_timeout(200)
    pg.click('.cbopt [data-act="cNb"][data-n="B"][data-d="-1"]'); pg.wait_for_timeout(200)
    pg.click('.cbopt > summary'); pg.wait_for_timeout(200)
    check('annuler : de nouveau A1 et B1', [t['id'] for t in draft('sp-demo-p3')['equipes']] == ['A1', 'B1'])
    ev("MC.api.DEMO = false; MC.app.rerender()"); pg.wait_for_timeout(400)
    check('hors démo : « Actualiser » sur la ligne Spond', pg.query_selector('.cspond [data-act="cSync"]') is not None)
    ev("MC.api.DEMO = true; MC.app.rerender()"); pg.wait_for_timeout(400)
    check('« À regarder » : ceux qui ne sont pas dans l\'événement Spond, à part', "pas dans l'événement Spond" in pg.inner_text('main'))
    gone = ev("[...document.querySelectorAll('.ccol:not(.banc) .cpj.gone')].map(b => b.getAttribute('data-id'))")

    # ----- 3. la fenêtre poste par poste (plateau : boutons A et B) -----
    pg.click('[data-act="cParPoste"]'); pg.wait_for_timeout(700)
    check('poste par poste : s\'ouvre sur les piliers, 7 postes en haut', pg.inner_text('.modal h2').split('\n')[0].upper().endswith('PILIERS') and len(pg.query_selector_all('.modal .ppn')) == 7)
    lab = ev("[...document.querySelector('.modal .pprow').querySelectorAll('.ppb')].map(b => b.textContent)")
    check('un bouton par équipe : A et B', lab == ['A', 'B'], lab)
    dd = draft('sp-demo-p3')
    for pp in ('pilier', 'talonneur', 'troisieme-ligne', 'demi-de-melee', 'ouvreur', 'centre', 'ailier'):
        attendu = '·'.join(str(len([j for j in t['joueurs'] if j['poste'] == pp and j['id'] not in gone])) for t in dd['equipes'])
        vu = ev("document.querySelector('.modal .ppn[data-pp=\"%s\"] small').textContent" % pp)
        if vu != attendu: break
    check('la barre des postes ne compte pas les absents (comme le tableau)', len(gone) > 0 and vu == attendu, (pp, vu, attendu, gone))
    check('les boutons font au moins 44 px', ev("[...document.querySelectorAll('.modal .ppb')].every(b => b.getBoundingClientRect().width >= 43.5 && b.getBoundingClientRect().height >= 43.5)"))
    po = ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group), K = MC.compos; return [...document.querySelectorAll('.modal .pprow')].map(r => { const f = F[r.querySelector('.ppb').getAttribute('data-ppid')], pf = f.postesOk.length ? K.prefDe(f) : [], ps = K.postesDe(f).slice().sort((a, b) => (pf.indexOf(a) >= 0 ? 0 : 1) - (pf.indexOf(b) >= 0 ? 0 : 1) || K.ORDRE.indexOf(a) - K.ORDRE.indexOf(b));
      const txt = r.querySelector('.cprm').textContent; let i = -1; return ps.every(p => { const j = txt.indexOf(K.nomPoste(p), i + 1); const ok = j > i; i = j; return ok; }); }).every(Boolean); })()""")
    check('les postes de chaque ligne dans l\'ordre de la liste Enfants (préférés, puis pilier → ailier)', po)
    vv = ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group); const g = document.querySelector('.modal .cpgrp');
      return [...g.querySelectorAll('.pprow')].map(r => { const id = r.querySelector('.ppb').getAttribute('data-ppid'); return [F[id].niveau || 'Z', F[id].plaquage === null ? -1 : F[id].plaquage, r.classList.contains('abs')]; }); })()""")
    def bien_trie(l):
        for a, c in zip(l, l[1:]):
            ka = (a[2], NIV.get(a[0], 9), -a[1] if a[1] >= 0 else 1); kc = (c[2], NIV.get(c[0], 9), -c[1] if c[1] >= 0 else 1)
            if ka > kc: return False
        return True
    check('le 1er groupe : niveau A → C, puis le plaquage du plus fort au plus faible, les absents en bas', len(vv) >= 2 and bien_trie(vv), vv)
    hors = ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group); return [...document.querySelectorAll('.modal .ppb')].filter(b => b.getAttribute('data-ppt') === 'A1').every(b => { const f = F[b.getAttribute('data-ppid')]; const ok = !f.niveau || f.niveau === 'A' || MC.compos.pasDe(f).indexOf('A') >= 0; return ok === !b.classList.contains('hors'); }); })()""")
    check('au plateau : le bouton A en pointillés pour qui n\'a ni le niveau A ni de passerelle vers A', hors)
    att = ev("document.querySelectorAll('.modal .pptag.att, .modal .pptag.abs').length")
    check('les lignes disent « absent » ou « pas répondu »', att > 0, att)
    pg.click('.modal .ppn[data-pp="talonneur"]'); pg.wait_for_timeout(300)
    pg.click('.modal details[data-ppg="autres"] > summary'); pg.wait_for_timeout(300)   # « Les autres » : on peut aussi y prendre
    check('« Les autres » reste ouvert après un toucher', ev("document.querySelector('.modal details[data-ppg=autres]').open"))
    ids = ev("[...document.querySelectorAll('.modal .pprow')].filter(r => !r.closest('details:not([open])') && r.querySelector('.ppb[data-ppt=B1]').getAttribute('aria-pressed') === 'false').map(r => r.querySelector('.ppb').getAttribute('data-ppid')).slice(0, 3)")
    nt0 = len([j for t in draft('sp-demo-p3')['equipes'] if t['id'] == 'B1' for j in t['joueurs'] if j['poste'] == 'talonneur'])
    for i in ids: pg.click('.modal .ppb[data-ppid="%s"][data-ppt="B1"]' % i); pg.wait_for_timeout(250)
    check('« Les autres » toujours ouvert', ev("document.querySelector('.modal details[data-ppg=autres]').open"))
    d = draft('sp-demo-p3')
    nt = [j for t in d['equipes'] if t['id'] == 'B1' for j in t['joueurs'] if j['poste'] == 'talonneur']
    check('autant qu\'on veut : 3 talonneurs de plus en B', len(ids) == 3 and len(nt) == nt0 + 3 and all(any(j['id'] == i for j in nt) for i in ids), (ids, nt0, nt))
    check('le compteur du poste suit', ev("document.querySelector('.modal .ppn[data-pp=talonneur] small').textContent").split('·')[1] == str(len(nt)))
    check('la fenêtre : pas de défilement de côté', ev("(() => { const c = document.querySelector('.modal .card'); return c.scrollWidth <= c.clientWidth + 1; })()") and noscroll())
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="B1"]' % ids[0]); pg.wait_for_timeout(250)
    d = draft('sp-demo-p3')
    check('toucher encore : il sort (« Pas placés »)', ids[0] in d['banc'], d['banc'])
    pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(300)
    check('OK : le poste suivant (3es lignes)', pg.inner_text('.modal h2').split('\n')[0].upper().endswith('3ES LIGNES'))
    pg.click('.modal [data-close]'); pg.wait_for_timeout(400)
    # un joueur touché : les 7 postes, plus de « Remp. »
    pg.locator('.ccol >> nth=0 >> .cpj >> nth=0').evaluate('e => e.click()'); pg.wait_for_timeout(300)
    check('joueur touché : les 7 postes, plus de « Remp. »', len(pg.query_selector_all('[data-act="cPoste"]')) == 7 and 'Remp.' not in pg.inner_text('.cdock'))
    pg.locator('.ccol >> nth=0 >> .cpj >> nth=0').evaluate('e => e.click()'); pg.wait_for_timeout(300)
    # publier puis relire : « tout le groupe » est gardé
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(400)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1200)
    cp = ev("MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p3' && !c.partie)")
    check('publiée : « tout le groupe » gardé, plusieurs talonneurs gardés', cp and cp['reglages'].get('base') == 'tous' and len([j for t in cp['equipes'] for j in t['joueurs'] if j['poste'] == 'talonneur']) >= 3, cp and cp['reglages'])
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1000)
    check('rouverte : les absents toujours marqués', ev("document.querySelectorAll('.ccol .cpj.gone').length") > 0 and pg.query_selector('.cspond') is not None)

    # ----- (relecture v57, I2) un plateau de décembre sans présents encore : « Tout le groupe » refait le nombre d'équipes -----
    eid = ev("""MC.app.adultCall('setEvenement', { titre: 'Plateau 9 - Essai', debut: '2026-12-12T09:00:00.000Z', lieu: 'Essai', sorte: 'plateau', presents: [] }).then(r => MC.loadCompos(true).then(() => r.evenement.id))""")
    pg.goto(BASE + '#/educ/compo/' + eid); pg.wait_for_timeout(1200)
    ouvrirAuto(pg)   # (v65) « Générer » est dans « Créer automatiquement »
    check('0 présent : une ligne dit de choisir « Tout le groupe », équipes à 0', pg.query_selector('.cbaseh') is not None and ev("[...document.querySelectorAll('.cstep .cnbv')].map(o => o.textContent).join(',')") == '0,0,0' and ev("document.querySelector('[data-act=cPropose]').disabled"))
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(400)
    check('« Tout le groupe » : une équipe A, une équipe B, « Proposer » possible', ev("[...document.querySelectorAll('.cstep .cnbv')].map(o => o.textContent).join(',')") == '1,1,0' and not ev("document.querySelector('[data-act=cPropose]').disabled") and pg.query_selector('.cbaseh') is None)
    check('« Tout le groupe » : les compteurs disent « enfants », pas « présents »', 'enfant' in pg.inner_text('.cstep') and 'présent' not in pg.inner_text('.cstep'))
    # l'enfant « Test » n'entre pas dans « tout le groupe » (I7)
    ev("(() => { const p = MC.app.S.cache.group.joueurs.find(p => p.joueur.actif); window.__T = [p, p.joueur.prenom]; p.joueur.prenom = 'Test'; MC.app.rerender(); })()"); pg.wait_for_timeout(400)
    check('l\'enfant « Test » n\'est pas dans « tout le groupe »', ('pour %d enfants' % (ntous - 1)) in ev("document.querySelector('main').textContent"), ev("(document.querySelector('.ctailp') || {}).textContent"))
    ev("(() => { window.__T[0].joueur.prenom = window.__T[1]; MC.app.rerender(); })()"); pg.wait_for_timeout(400)

    # ----- (2e relecture) un événement fait à la main : pas coché = absent ; compo des présents : un décoché ne tient plus de place -----
    eid2 = ev("""MC.loadGroup().then(g => { const ids = g.joueurs.filter(p => p.joueur.actif).slice(0, 12).map(p => p.joueur.id); return MC.app.adultCall('setEvenement', { titre: 'Plateau 10 - Essai', debut: '2026-12-19T09:00:00.000Z', lieu: 'Essai', sorte: 'plateau', presents: ids }); }).then(r => MC.loadCompos(true).then(() => r.evenement.id))""")
    pg.goto(BASE + '#/educ/compo/' + eid2); pg.wait_for_timeout(1200)
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(400)
    ouvrirAuto(pg); pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1200)
    m = ev("""(() => { const eqs = [...document.querySelectorAll('.ccol')].filter(c => c.querySelector('.chd .cn'));
      return { n: eqs.reduce((a, c) => a + +c.querySelector('.chd .cn').textContent, 0), gone: document.querySelectorAll('.cpj.gone').length, neutres: document.querySelectorAll('.cpj .chors').length,
        alerte: document.querySelector('main').textContent.indexOf("pas dans l'événement") >= 0 }; })()""")
    check('à la main, tout le groupe : les non-cochés sont absents (barrés), les équipes ne comptent que les 12 cochés', m['n'] == 12 and m['gone'] == ntous - 12 and m['neutres'] == 0 and not m['alerte'], m)
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(700)
    pg.click('[data-act="cBase"][data-v="presents"]'); pg.wait_for_timeout(300)
    ouvrirAuto(pg); pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1200)
    d2 = draft(eid2); vic = d2['equipes'][0]['joueurs'][0]['id']; n0 = len(d2['equipes'][0]['joueurs'])
    ev("""([e, id]) => MC.app.adultCall('setEvenement', { id: e, marques: { [id]: false } }).then(() => MC.loadCompos(true))""", [eid2, vic])
    pg.goto(BASE + '#/educ/compo/' + eid2 + '?x=1'); pg.wait_for_timeout(1200)
    c0 = ev("""(id) => { const col = document.querySelector('.ccol'), b = col.querySelector('.cpj[data-id="' + id + '"]'); return { gone: !!b && b.classList.contains('gone'), n: +col.querySelector('.chd .cn').textContent, hd: col.querySelector('.cavtq').textContent }; }""", vic)
    check('compo des présents : un enfant décoché est barré et ne compte plus dans son équipe', c0['gone'] and c0['n'] == n0 - 1 and '1 absent' in c0['hd'], (c0, n0))

    # ----- 4. les matchs d'un entraînement : deux équipes, boutons 1 et 2 -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1200)
    if pg.query_selector('[data-act="cDiscard"]'):
        pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(700)
    ouvrirAuto(pg)   # (v65) « Deux équipes équilibrées » est dit dans « Créer automatiquement »
    check('matchs : deux équipes équilibrées, « Avec qui ? », poste par poste', 'DEUX ÉQUIPES ÉQUILIBRÉES' in pg.inner_text('main').upper() and len(pg.query_selector_all('[data-act="cBase"]')) == 2 and pg.query_selector('[data-act="cZero10"]') is not None and pg.query_selector('[data-act="cEN"]') is None)
    pg.click('[data-act="cZero10"]'); pg.wait_for_timeout(800)
    lab = ev("[...document.querySelector('.modal .pprow').querySelectorAll('.ppb')].map(b => b.textContent)")
    check('matchs : boutons « 1 » et « 2 »', lab == ['1', '2'], lab)
    check('matchs : aucun bouton en pointillés (pas de niveau)', len(pg.query_selector_all('.modal .ppb.hors')) == 0)
    r0 = ev("document.querySelector('.modal .pprow .ppb').getAttribute('data-ppid')")
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="E1"]' % r0); pg.wait_for_timeout(250)
    pg.click('.modal .ppb[data-ppid="%s"][data-ppt="E2"]' % r0); pg.wait_for_timeout(250)
    d = draft('sp-demo-e1', 'matchs')
    w = [(t['id'], j['poste']) for t in d['equipes'] for j in t['joueurs'] if j['id'] == r0]
    check('passer de l\'équipe 1 à la 2 d\'un toucher', w == [('E2', 'pilier')], w)
    for i in range(7): pg.click('.modal .mbtns button[data-i="0"]'); pg.wait_for_timeout(250)
    check('OK jusqu\'au bout : la fenêtre se ferme', pg.query_selector('.modal') is None)
    # (3e relecture) chaque version a sa règle : V1 les présents, V2 « tout le groupe » ; sur V2, ceux qui ne sont pas dans
    # l'événement Spond restent « hors Spond » (pas barrés) et comptent dans l'effectif
    pg.click('[data-act="cAddV"]'); pg.wait_for_timeout(400); pg.click('.modal [data-av="copie"]'); pg.wait_for_timeout(700)
    pg.click('[data-act="cRegl"][data-v="1"]'); pg.wait_for_timeout(500)
    pg.click('.modal [data-rb="tous"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1000)
    v2 = ev("""(() => { const col = document.querySelector('.clevel:not(.banc) .cvcols').children[1], eqs = [...col.querySelectorAll('.ccol')];
      return { gone: col.querySelectorAll('.cpj.gone').length, hors: col.querySelectorAll('.cpj .chors').length, n: eqs.reduce((a, c) => a + +c.querySelector('.chd .cn').textContent, 0), puces: col.querySelectorAll('.cpj').length }; })()""")
    check('2 versions : V2 « tout le groupe » garde sa propre règle (hors Spond, pas barrés, comptés)', v2['hors'] > 0 and v2['gone'] == 0 and v2['n'] == v2['puces'], v2)
    check('2 versions : pas de défilement de côté', noscroll())
    check('matchs : pas de défilement de côté', noscroll())
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d %d %d' % (len(res) - len(bad), len(res), W, H))
sys.exit(1 if bad or errs else 0)
