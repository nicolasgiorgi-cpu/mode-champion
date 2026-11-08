# (v60, v61) Demandes de Nicolas du 08/11/2026 : les postes des enfants sur la compo comme dans la liste Enfants (pastilles pleines =
# préféré, sinon le contour), à droite sur la ligne du plaquage et des passerelles (« ? » doré à côté du prénom au lieu du chrono) ; dans la liste Enfants, les pastilles dans une colonne à elles entre le
# prénom et le niveau, alignées à gauche (plus d'effet de vague) ; toutes les pastilles de la même largeur.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v60.py 390 844 · 1180 820 · 820 1180
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

    # ----- 1. la liste Enfants : trois colonnes alignées, les pastilles à gauche, même largeur -----
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(300); pg.reload(); pg.wait_for_timeout(1600)
    L = ev("""(() => [...document.querySelectorAll('#tlist .tfrow')].map(r => { const n = r.querySelector('.tnm').getBoundingClientRect(), ps = r.querySelector('.tps').getBoundingClientRect(),
        p0 = r.querySelector('.tps .tpp'), lv = r.querySelector('.tlv').getBoundingClientRect(), rr = r.getBoundingClientRect();
        return { col: Math.round(ps.left), p0: p0 ? Math.round(p0.getBoundingClientRect().left) : null, nomFin: Math.round(n.right), lv: Math.round(lv.left), droite: rr.right - Math.max(...[...r.querySelectorAll('*')].map(x => x.getBoundingClientRect().right)),
          larg: [...r.querySelectorAll('.tps .tpp:not(.none):not(.voeu)')].map(x => Math.round(x.getBoundingClientRect().width)) }; }))()""")
    check('liste : une ligne par enfant (%d)' % len(L), len(L) >= 10, len(L))
    check('liste : la colonne des postes commence au même endroit sur chaque ligne (plus d\'effet de vague)', len(set(x['col'] for x in L)) == 1, sorted(set(x['col'] for x in L)))
    check('liste : la 1re pastille collée à gauche de sa colonne', all(x['p0'] is None or abs(x['p0'] - x['col']) <= 1 for x in L), L[:4])
    check('liste : le prénom ne passe pas dans la colonne des postes', all(x['nomFin'] <= x['col'] for x in L), [x for x in L if x['nomFin'] > x['col']][:3])
    check('liste : le niveau au même endroit sur chaque ligne', len(set(x['lv'] for x in L)) == 1, sorted(set(x['lv'] for x in L)))
    larg = set(w for x in L for w in x['larg'])
    check('liste : toutes les pastilles de postes de la même largeur', len(larg) == 1, larg)
    check('liste : rien ne déborde de la ligne', all(x['droite'] >= -1 for x in L) and noscroll())
    # l'ordre et le plein / contour comme avant (préférés d'abord)
    t = ev("""(() => { const r = [...document.querySelectorAll('#tlist .tfrow')].find(r => r.querySelector('.tnm').textContent.trim() === 'Tom');
      return r ? [...r.querySelectorAll('.tps .tpp')].map(p => (p.classList.contains('pref') ? '*' : '') + p.querySelector('[aria-hidden]').textContent) : null; })()""")
    check('liste : Tom, ses préférés pleins d\'abord (Ctr, Ail), puis 3eL', t == ['*Ctr', '*Ail', '3eL'], t)
    # (relecture) les séparateurs restent sur toute la largeur, sur une ligne, centrés (pas dans la colonne des postes)
    pg.click('[data-act="tPoste"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(400)
    sp = ev("""[...document.querySelectorAll('#tlist .tsep')].map(x => { const r = x.getBoundingClientRect(), t = x.querySelector('span').getBoundingClientRect(), l = document.getElementById('tlist').getBoundingClientRect();
      return { h: Math.round(r.height), centre: Math.abs((t.left + t.right) / 2 - (l.left + l.right) / 2) <= 3, large: r.width >= l.width - 6 }; })""")
    check('liste : les séparateurs sur une ligne, centrés, sur toute la largeur', len(sp) > 0 and all(x['h'] < 16 and x['centre'] and x['large'] for x in sp), sp)
    pg.click('[data-act="tPoste"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(300)
    pg.fill('#tq', 'zzz'); pg.wait_for_timeout(500)
    em = ev("""(() => { const e = document.querySelector('#tlist .empty'); if (!e) return null; const r = e.getBoundingClientRect(), l = document.getElementById('tlist').getBoundingClientRect();
      const g = document.createRange(); g.selectNodeContents(e); const t = g.getBoundingClientRect();
      return { large: r.width >= l.width - 2, centre: Math.abs((t.left + t.right) / 2 - (l.left + l.right) / 2) <= 3 }; })()""")
    check('liste : « Personne. » sur toute la largeur, centré', em and em['large'] and em['centre'], em)
    pg.fill('#tq', ''); pg.wait_for_timeout(400)
    # (relecture) un enfant à deux passerelles : le niveau des autres ne bouge pas, et le sien non plus
    ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group), id = Object.keys(F).find(id => F[id].niveau === 'B');
      return MC.app.adultCall('setTerrain', { lignes: [{ joueurId: id, passerelles: 'AC' }] }).then(() => MC.loadGroup(true)).then(() => { MC.app.rerender(); return id; }); })()""")
    pg.wait_for_timeout(700)
    L2 = ev("""[...document.querySelectorAll('#tlist .tfrow')].map(r => ({ lv: Math.round(r.querySelector('.tlv').getBoundingClientRect().left), np: r.querySelectorAll('.tpas').length,
      sh: Math.round(r.querySelector('.tctl').lastElementChild.getBoundingClientRect().right), droite: r.getBoundingClientRect().right - Math.max(...[...r.querySelectorAll('*')].map(x => x.getBoundingClientRect().right)) }))""")
    check('liste : avec un enfant à deux passerelles, le niveau au même endroit sur chaque ligne', any(x['np'] == 2 for x in L2) and len(set(x['lv'] for x in L2)) == 1, sorted(set(x['lv'] for x in L2)))
    check('liste : et le bouclier aussi, rien ne déborde', len(set(x['sh'] for x in L2)) == 1 and all(x['droite'] >= -1 for x in L2) and noscroll(), sorted(set(x['sh'] for x in L2)))
    # trois postes tiennent sur la ligne du prénom
    t3 = ev("""[...document.querySelectorAll('#tlist .tfrow')].filter(r => r.querySelectorAll('.tps .tpp').length === 3).map(r => { const ps = [...r.querySelectorAll('.tps .tpp')].map(p => Math.round(p.getBoundingClientRect().top)); return new Set(ps).size; })""")
    check('liste : trois postes sur une seule ligne', len(t3) > 0 and all(n == 1 for n in t3), t3)
    # (v61, demande de Nicolas) avec trois postes, le dernier finit près du niveau : un petit espace, pas collé
    ec = ev("""[...document.querySelectorAll('#tlist .tfrow')].filter(r => r.querySelectorAll('.tps .tpp').length === 3).map(r => { const ps = [...r.querySelectorAll('.tps .tpp')];
      return Math.round(r.querySelector('.tlv').getBoundingClientRect().left - ps[ps.length - 1].getBoundingClientRect().right); })""")
    check('liste : avec trois postes, un petit espace avant le niveau (entre 8 et 22 px)', len(ec) > 0 and all(8 <= x <= 22 for x in ec), ec)
    if W >= 700:
        # (v61) sur iPad, prénom, postes, niveau et bouclier se suivent ; la place en trop à droite, la ligne garde toute la largeur
        ip = ev("""[...document.querySelectorAll('#tlist .tfrow')].map(r => { const rr = r.getBoundingClientRect(), l = document.getElementById('tlist').getBoundingClientRect();
          return { postes: Math.round(r.querySelector('.tps').getBoundingClientRect().left - rr.left), libre: Math.round(rr.right - r.querySelector('.tctl').getBoundingClientRect().right), large: rr.width >= l.width - 2 }; })""")
        check('liste (iPad) : les postes juste après le prénom, la place en trop à droite, la ligne sur toute la largeur', all(x['postes'] <= 270 and x['libre'] >= 100 and x['large'] for x in ip), ip[:3])
    # un enfant à 4 postes : une 2e ligne, dans la colonne des postes
    ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group), id = Object.keys(F).find(id => F[id].postesOk.length === 1);
      return MC.app.adultCall('setTerrain', { lignes: [{ joueurId: id, postesOk: ['pilier', 'talonneur', 'troisieme-ligne', 'centre'], postesPref: ['pilier'] }] }).then(() => MC.loadGroup(true)).then(() => MC.app.rerender()); })()""")
    pg.wait_for_timeout(700)
    q4 = ev("""[...document.querySelectorAll('#tlist .tfrow')].filter(r => r.querySelectorAll('.tps .tpp').length === 4).map(r => { const t = r.querySelector('.tps').getBoundingClientRect(), lv = r.querySelector('.tlv').getBoundingClientRect();
      return { lignes: new Set([...r.querySelectorAll('.tps .tpp')].map(p => Math.round(p.getBoundingClientRect().top))).size, dedans: Math.max(...[...r.querySelectorAll('.tps .tpp')].map(p => p.getBoundingClientRect().right)) <= lv.left - 6 }; })""")
    check('liste : quatre postes passent sur une 2e ligne, sans toucher le niveau', len(q4) > 0 and all(x['lignes'] == 2 and x['dedans'] for x in q4) and noscroll(), q4)

    # ----- 2. la compo : les postes de la fiche, à droite, sur la ligne du plaquage -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)
    # un enfant qui a des postes passe « sans réponse » sur Spond : son « ? » et ses postes
    tid = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), e = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3');
      const id = (e.presents || []).find(id => F[id] && F[id].postesOk.length >= 2 && document.querySelector('.ccol:not(.banc) .cpj[data-id="' + id + '"]'));
      e.presents = e.presents.filter(x => x !== id); e.sansReponse = (e.sansReponse || []).concat([id]); MC.app.rerender(); return id; })()""")
    pg.wait_for_timeout(700)
    # les postes jamais sur une ligne à eux : la 1re rangée de pastilles à hauteur de la dernière marque (bouclier, passerelle, cœur), à sa droite
    ev("""(() => { window.memeLigne = b => { const pp = b.querySelector('.cpps'); if (!pp) return true; const r = pp.getBoundingClientRect(), p0 = pp.querySelector('.tpp').getBoundingClientRect();
      const fl = [...b.querySelectorAll('.cflg > *')].filter(x => x.offsetParent); if (!fl.length) return true;
      const l = fl[fl.length - 1].getBoundingClientRect(); return p0.top < l.bottom - 2 && p0.bottom > l.top + 2 && r.left >= l.right - 1 && Math.abs(r.top - p0.top) < 3; }; return 1; })()""")
    C = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), COURT = { pilier: 'Pil', talonneur: 'Tal', 'troisieme-ligne': '3eL', 'demi-de-melee': '9', ouvreur: '10', centre: 'Ctr', ailier: 'Ail' };
      return [...document.querySelectorAll('.cpj')].map(b => { const id = b.getAttribute('data-id'), f = F[id], br = b.getBoundingClientRect(), pp = b.querySelector('.cpps'), ch = b.querySelector('.catt');
        const pf = f.postesOk.length ? K.prefDe(f) : [], attendu = K.postesDe(f).slice().sort((a, c) => (pf.indexOf(a) >= 0 ? 0 : 1) - (pf.indexOf(c) >= 0 ? 0 : 1) || K.ORDRE.indexOf(a) - K.ORDRE.indexOf(c));
        const pills = pp ? [...pp.querySelectorAll('.tpp:not(.voeu)')] : [], r = pp && pp.getBoundingClientRect();
        const autres = [...b.querySelectorAll('.cpn, .cpo, .catt, .cflg > *')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect());
        const q = ch && ch.getBoundingClientRect(), po = b.querySelector(':scope > .cpo'), por = po && po.getBoundingClientRect();
        return { id, att: !!ch, n: attendu.length, voeu: !!(pp && pp.querySelector('.tpp.voeu')), voeux: !f.postesOk.length, qLibre: !q || !por || q.right <= por.left + 1 || q.top >= por.bottom, vus: pills.map(x => (x.classList.contains('pref') ? '*' : '') + x.querySelector('[aria-hidden]').textContent),
          bons: pills.length === attendu.length && pills.every((x, i) => x.querySelector('[aria-hidden]').textContent === COURT[attendu[i]] && x.classList.contains('pref') === (pf.indexOf(attendu[i]) >= 0)),
          droite: !r || br.right - r.right <= 9,
          // (v61) les postes alignés à gauche dans leur boîte ; la boîte a la place de trois postes, sinon elle part juste après les marques
          gauche: !r || Math.abs(pills[0].getBoundingClientRect().left - r.left) <= 1, debut: r ? Math.round(pills.length ? pills[0].getBoundingClientRect().left : r.left) : null, plein: !!r && r.width >= 95,
          colle: !r || (() => { const fl = [...b.querySelectorAll('.cflg > *')].filter(x => x.offsetParent); return !fl.length || r.left - fl[fl.length - 1].getBoundingClientRect().right <= 8; })(),
          col: (() => { const c = b.closest('.ccol'); return (c ? [...document.querySelectorAll('.ccol')].indexOf(c) : -1) + ':' + Math.round(br.left) + ':' + Math.round(br.width); })(),
          memeLigne: memeLigne(b),
          libre: !r || autres.every(o => o.bottom <= r.top + 1 || o.right <= r.left || o.left >= r.right), dedans: !r || (r.bottom <= br.bottom + 1 && r.left >= br.left),
          larg: pills.map(x => Math.round(x.getBoundingClientRect().width)) }; }); })()""")
    avec = [x for x in C if x['n']]
    check('compo : chaque enfant qui a des postes les montre sur sa pastille, dans l\'ordre de la liste Enfants, pleins = préférés', len(avec) > 5 and all(x['bons'] for x in avec), [x for x in avec if not x['bons']][:3])
    check('compo : sans poste sur sa fiche, pas de pastilles', all(not x['vus'] for x in C if not x['n']))
    check('compo : des vœux pas encore réglés gardent la marque « vœux », comme dans la liste', all(x['voeu'] == x['voeux'] for x in avec), [x for x in avec if x['voeu'] != x['voeux']][:3])
    lgd = ev("""(() => { const g = document.querySelector('.clegend'); return g ? g.textContent : ''; })()""")
    sn = ev("""[...document.querySelectorAll('.cpj')].some(b => b.querySelector('.cfl.cq'))""")
    check('compo : le « ? » orange expliqué dans la légende quand un enfant n\'a pas de niveau', ('niveau à renseigner' in lgd) == bool(sn) and 'pas encore répondu' in lgd, (sn, lgd[-120:]))
    check('compo : la boîte des postes à droite de l\'encadré', all(x['droite'] for x in avec), [x for x in avec if not x['droite']][:3])
    check('compo : les postes alignés à gauche dans leur boîte', all(x['gauche'] for x in avec), [x for x in avec if not x['gauche']][:3])
    debuts = {}
    for x in avec:
        if x['plein']: debuts.setdefault(x['col'], set()).add(x['debut'])
    check('compo : dans une équipe, les postes partent du même endroit (place de trois postes)', len(debuts) > 0 and all(len(v) == 1 for v in debuts.values()), debuts)
    check('compo : quand les marques prennent plus de place, les postes partent juste après elles', all(x['plein'] or x['colle'] for x in avec), [x for x in avec if not (x['plein'] or x['colle'])][:3])
    check('compo : sur la même ligne que le plaquage et les passerelles, jamais sur une ligne à eux', all(x['memeLigne'] for x in avec), [x for x in avec if not x['memeLigne']][:3])
    t1 = [x for x in C if x['id'] == tid]
    check('compo : un enfant sans réponse a ses postes et son « ? »', t1 and t1[0]['att'] and t1[0]['vus'] and t1[0]['memeLigne'], t1)
    check('compo : rien ne chevauche (prénom, poste, marques), tout reste dans l\'encadré', all(x['libre'] and x['dedans'] for x in avec), [x for x in avec if not (x['libre'] and x['dedans'])][:3])
    lg = set(w for x in avec for w in x['larg'])
    check('compo : toutes les pastilles de la même largeur', len(lg) == 1, lg)
    check('compo : pas de défilement de côté', noscroll())
    pg.click('[data-act="cCote"][data-v="1"]'); pg.wait_for_timeout(500)
    cc = ev("""[...document.querySelectorAll('.ccote .cpj')].every(b => { const pp = b.querySelector('.cpps'); if (!pp) return true; const r = pp.getBoundingClientRect(), br = b.getBoundingClientRect(); return r.left >= br.left && r.right <= br.right + 1 && br.right - r.right <= 9 && r.bottom <= br.bottom + 1; })""")
    check('côte à côte : les postes tiennent dans l\'encadré, à droite', cc and noscroll())
    # (relecture) le « ? » doré ne passe pas sous « Sans poste » ou « absent » (en haut à droite)
    pg.evaluate("""(() => { const e = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3'), F = MC.compos.fiches(MC.app.S.cache.group);
      const ids = [...document.querySelectorAll('.ccote .cpj')].map(b => b.getAttribute('data-id')).filter(id => F[id] && !MC.compos.postesDe(F[id]).length);
      ids.forEach(id => { e.presents = (e.presents || []).filter(x => x !== id); e.sansReponse = (e.sansReponse || []).filter(x => x !== id).concat([id]); }); MC.app.rerender(); })()""")
    pg.wait_for_timeout(500)
    qq = ev("""[...document.querySelectorAll('.ccote .cpj')].filter(b => b.querySelector('.catt') && b.querySelector(':scope > .cpo')).map(b => { const q = b.querySelector('.catt').getBoundingClientRect(), o = b.querySelector(':scope > .cpo').getBoundingClientRect();
      return { nom: b.querySelector('.cpn').textContent, ok: q.right <= o.left + 1 || q.top >= o.bottom || q.bottom <= o.top }; })""")
    # et la place gardée pour le prénom s'arrête avant l'étiquette en haut à droite, quel que soit le prénom
    pl = ev("""[...document.querySelectorAll('.cpj')].filter(b => b.querySelector(':scope > .cpo')).map(b => { const l = b.querySelector('.cpl1'), o = b.querySelector(':scope > .cpo').getBoundingClientRect();
      return { nom: b.querySelector('.cpn').textContent, cpo: b.querySelector(':scope > .cpo').textContent, ok: b.getBoundingClientRect().right - parseFloat(getComputedStyle(b).paddingRight) - parseFloat(getComputedStyle(b).borderRightWidth) - parseFloat(getComputedStyle(l).paddingRight) <= o.left + 1 }; })""")
    qq = qq + [x for x in pl if not x['ok']]
    check('côte à côte : le « ? » doré ne chevauche pas « Sans poste » ni le poste', len(qq) > 0 and all(x['ok'] for x in qq), [x for x in qq if not x['ok']][:3])
    # (relecture v61) sans postes, les marques restent sur une ligne quand elles tiennent
    m1 = ev("""[...document.querySelectorAll('.ccote .cpj')].filter(b => !b.querySelector('.cpps')).map(b => { const g = b.querySelector('.cflg'), k = [...g.children].filter(x => x.offsetParent);
      const tient = k.reduce((a, x) => a + x.getBoundingClientRect().width, 0) + 6 * (k.length - 1) <= b.querySelector('.cfls').getBoundingClientRect().width;
      return { nom: b.querySelector('.cpn').textContent, ok: !tient || new Set(k.map(x => Math.round(x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2))).size <= 1 }; })""")
    check('côte à côte : sans postes, les marques sur une seule ligne quand elles tiennent', len(m1) > 0 and all(x['ok'] for x in m1), [x for x in m1 if not x['ok']][:3])
    cl = ev("""[...document.querySelectorAll('.ccote .cpj')].filter(b => !memeLigne(b)).map(b => b.querySelector('.cpn').textContent)""")
    check('côte à côte : les postes sur la ligne du plaquage, même avec beaucoup de postes', not cl, cl)
    # un enfant avec les 7 postes, dans l'encadré le plus étroit : ses postes passent à la ligne à droite, pas sous le bouclier
    n7id = ev("""(() => { const b = [...document.querySelectorAll('.ccote .ccol:not(.banc) .cpj')].find(b => b.querySelector('.cpps')); if (!b) return null; const id = b.getAttribute('data-id');
      return MC.app.adultCall('setTerrain', { lignes: [{ joueurId: id, postesOk: MC.compos.ORDRE.slice(), postesPref: ['centre'] }] }).then(() => MC.loadGroup(true)).then(() => { MC.app.rerender(); return id; }); })()""")
    pg.wait_for_timeout(600)
    n7 = ev("""(id => { const c = document.querySelector('.ccote .cpj[data-id="' + id + '"]'); return c ? { n: c.querySelectorAll('.cpps .tpp').length, ok: memeLigne(c), w: Math.round(c.getBoundingClientRect().width) } : null; })""", n7id)
    check('côte à côte : 7 postes restent sur la ligne du plaquage (à droite, sur 2 rangées si besoin)', n7 and n7['n'] == 7 and n7['ok'], n7)
    pg.click('[data-act="cCote"][data-v="0"]'); pg.wait_for_timeout(300)
    # les ateliers : pas de postes sur les pastilles
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=ateliers'); pg.wait_for_timeout(1200)
    if pg.query_selector('[data-act="cPropose"]'):
        pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1200)
    check('ateliers : pas de pastilles de postes', len(pg.query_selector_all('.cpj')) > 0 and pg.query_selector('.cpj .cpps') is None)

    print('ERREURS JS :', errs or 'aucune')
    ok = sum(1 for _, c in res if c)
    print('%d/%d' % (ok, len(res)), W, H)
    b.close()
    sys.exit(0 if ok == len(res) and not errs else 1)
