# (v60) Demande de Nicolas du 08/11/2026 : les postes des enfants sur la compo comme dans la liste Enfants (pastilles pleines =
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

    # ----- 2. la compo : les postes de la fiche, à droite, sur la ligne du plaquage -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1300)
    # un enfant qui a des postes passe « sans réponse » sur Spond : son « ? » et ses postes
    tid = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), e = MC.app.S.cache.compos.evenements.find(e => e.id === 'sp-demo-p3');
      const id = (e.presents || []).find(id => F[id] && F[id].postesOk.length >= 2 && document.querySelector('.ccol:not(.banc) .cpj[data-id="' + id + '"]'));
      e.presents = e.presents.filter(x => x !== id); e.sansReponse = (e.sansReponse || []).concat([id]); MC.app.rerender(); return id; })()""")
    pg.wait_for_timeout(700)
    C = ev("""(() => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group), COURT = { pilier: 'Pil', talonneur: 'Tal', 'troisieme-ligne': '3eL', 'demi-de-melee': '9', ouvreur: '10', centre: 'Ctr', ailier: 'Ail' };
      return [...document.querySelectorAll('.cpj')].map(b => { const id = b.getAttribute('data-id'), f = F[id], br = b.getBoundingClientRect(), pp = b.querySelector('.cpps'), ch = b.querySelector('.catt');
        const pf = f.postesOk.length ? K.prefDe(f) : [], attendu = K.postesDe(f).slice().sort((a, c) => (pf.indexOf(a) >= 0 ? 0 : 1) - (pf.indexOf(c) >= 0 ? 0 : 1) || K.ORDRE.indexOf(a) - K.ORDRE.indexOf(c));
        const pills = pp ? [...pp.querySelectorAll('.tpp')] : [], r = pp && pp.getBoundingClientRect();
        const autres = [...b.querySelectorAll('.cpn, .cpo, .catt, .cfls > *:not(.cpps)')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect());
        return { id, att: !!ch, n: attendu.length, vus: pills.map(x => (x.classList.contains('pref') ? '*' : '') + x.querySelector('[aria-hidden]').textContent),
          bons: pills.length === attendu.length && pills.every((x, i) => x.querySelector('[aria-hidden]').textContent === COURT[attendu[i]] && x.classList.contains('pref') === (pf.indexOf(attendu[i]) >= 0)),
          droite: !r || br.right - r.right <= 9,
          memeLigne: (() => { if (!r) return true; const fl = [...b.querySelectorAll('.cfls > *:not(.cpps)')].filter(x => x.offsetParent), row = b.querySelector('.cfls').getBoundingClientRect();
            const need = fl.reduce((a, x) => a + x.getBoundingClientRect().width + 6, 0) + r.width; if (!fl.length || need > row.width) return true;
            const f0 = fl[0].getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - (f0.top + f0.bottom) / 2) < 6; })(),
          libre: !r || autres.every(o => o.bottom <= r.top + 1 || o.right <= r.left || o.left >= r.right), dedans: !r || (r.bottom <= br.bottom + 1 && r.left >= br.left),
          larg: pills.map(x => Math.round(x.getBoundingClientRect().width)) }; }); })()""")
    avec = [x for x in C if x['n']]
    check('compo : chaque enfant qui a des postes les montre sur sa pastille, dans l\'ordre de la liste Enfants, pleins = préférés', len(avec) > 5 and all(x['bons'] for x in avec), [x for x in avec if not x['bons']][:3])
    check('compo : sans poste sur sa fiche, pas de pastilles', all(not x['vus'] for x in C if not x['n']))
    check('compo : les postes alignés à droite de l\'encadré', all(x['droite'] for x in avec), [x for x in avec if not x['droite']][:3])
    check('compo : sur la même ligne que le plaquage et les passerelles (quand elle tient)', all(x['memeLigne'] for x in avec), [x for x in avec if not x['memeLigne']][:3])
    t1 = [x for x in C if x['id'] == tid]
    check('compo : un enfant sans réponse a ses postes et son « ? »', t1 and t1[0]['att'] and t1[0]['vus'] and t1[0]['memeLigne'], t1)
    check('compo : rien ne chevauche (prénom, poste, marques), tout reste dans l\'encadré', all(x['libre'] and x['dedans'] for x in avec), [x for x in avec if not (x['libre'] and x['dedans'])][:3])
    lg = set(w for x in avec for w in x['larg'])
    check('compo : toutes les pastilles de la même largeur', len(lg) == 1, lg)
    check('compo : pas de défilement de côté', noscroll())
    pg.click('[data-act="cCote"][data-v="1"]'); pg.wait_for_timeout(500)
    cc = ev("""[...document.querySelectorAll('.ccote .cpj')].every(b => { const pp = b.querySelector('.cpps'); if (!pp) return true; const r = pp.getBoundingClientRect(), br = b.getBoundingClientRect(); return r.left >= br.left && r.right <= br.right + 1 && br.right - r.right <= 9; })""")
    check('côte à côte : les postes tiennent dans l\'encadré, à droite', cc and noscroll())
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
