# (v73, fin du lot E5) Les podiums de toute l'équipe côté enfant : Progrès du mois (par défaut) · Régularité · Records ;
# toujours le podium puis « toi et tes voisins », jamais le bas du tableau, plus de « Voir les N joueurs » pour l'enfant ;
# venir d'ailleurs ramène au Progrès du mois ; la dernière nouvelle de l'équipe sur l'Accueil (un lien vers Ça bouge, jamais un score).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v73.py 390 844 · 1180 820 · 820 1180
import sys, os, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_system_time('2026-11-12T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    def login(nom):
        pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(600)
        pg.click('.kidbtn:has-text("%s")' % nom); pg.wait_for_timeout(350)
        for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
        pg.wait_for_timeout(1300); modals()
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    login('TOM')
    tom = ev('MC.app.S.me.joueur.id')

    # ----- l'Accueil : la dernière nouvelle de l'équipe (rafraîchie en fond) -----
    pg.wait_for_timeout(1200)
    a = pg.query_selector('.acc-eq-slot a.acc-eq')
    check('Accueil : la dernière nouvelle de l\'équipe', a is not None, pg.inner_html('.acc-eq-slot') if pg.query_selector('.acc-eq-slot') else 'pas de place')
    if a:
        t = a.inner_text()
        check('… d\'un copain (pas de soi), avec « L\'équipe »', ('a fait' in t or 'bat son record' in t) and 'L\'équipe' in t and not t.startswith('Toi'), t)
        vals = ev("(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables.records.filter(r => r.joueurId !== MC.app.S.me.joueur.id).map(r => String(r.valeur)))")
        check('… jamais un score', not any((' ' + v + ' ') in (' ' + t + ' ') for v in vals if len(v) >= 2), t)
        a.click(); pg.wait_for_timeout(1300)
        check('… elle mène à « Ça bouge »', pg.url.endswith('#/equipe') and pg.query_selector('.eqfil') is not None, pg.url)
    check('Accueil : pas de défilement de côté', noscroll())

    # ----- Podiums : Progrès du mois d'abord -----
    pg.goto(BASE + '#/classement'); pg.wait_for_timeout(1300); modals()
    seg = [x.inner_text().strip().upper() for x in pg.query_selector_all('.seg3 button')]
    check('3 classements : Progrès · Régularité · Records', seg == ['PROGRÈS', 'RÉGULARITÉ', 'RECORDS'], seg)
    check('Progrès du mois d\'abord', pg.query_selector('.seg3 button.on:has-text("Progrès")') is not None and pg.query_selector('[data-podium="prog"]') is not None)
    def lignes(sel):
        return ev("""s => [...document.querySelectorAll(s + ' li')].map(li => li.classList.contains('rkgap') ? '⋯' :
            li.querySelector('.rank').textContent + ' ' + li.querySelector('.t1').textContent + ' ' + li.querySelector('.rkv').textContent)""", sel)
    def attendu(fn):
        return ev("""fn => { const L = MC.logic, me = MC.app.S.me.joueur.id, rows = L[fn](MC.app.S.league);
            const mi = rows.findIndex(r => r.p.id === me), keep = L.podiumVoisins(rows, mi);
            const garde = Object.keys(keep).map(Number).sort((a, b) => a - b);
            return { n: rows.length, mi, garde, noms: garde.map(k => rows[k].p.prenom.toUpperCase()), ids: rows.map(r => r.p.id) }; }""", fn)
    # les prénoms affichés, dans l'ordre (sans la pastille « Toi »)
    noms = lambda sel: ev("s => [...document.querySelectorAll(s + ' li.rkl .t1')].map(t => t.firstChild.textContent.trim())", sel)
    A = attendu('progresMois')
    L1 = lignes('[data-podium="prog"]')
    check('Progrès : des enfants classés dans la démo', A['n'] >= 6, A)
    vus = [x for x in L1 if x != '⋯']
    check('Progrès : le podium, puis toi et tes voisins (rien d\'autre)', len(vus) == len(A['garde']), (L1, A))
    check('Progrès : le podium en haut', [x.split(' ')[0] for x in vus[:3]] == ['1', '2', '3'] or len(vus) < 3, vus)
    if A['mi'] >= 0:
        check('Progrès : « Toi » sur sa ligne, à droite du prénom', any('TOI' in x.upper() and x.split(' ')[1].upper().startswith('TOM') for x in vus), vus)
    check('Progrès : à l\'écran, exactement le podium (ex aequo compris) puis toi et tes voisins', noms('[data-podium="prog"]') == A['noms'], (noms('[data-podium="prog"]'), A['noms']))
    check('Progrès : jamais le bas du tableau', A['n'] - 1 in A['garde'] if A['mi'] >= A['n'] - 2 else (A['n'] - 1) not in A['garde'], A)
    check('Progrès : le % de progrès à côté du nombre (il départage)', all('%' in x for x in vus), vus)
    check('Progrès : « N record(s) » à droite', all(('record' in x) for x in vus), vus)
    check('pas de « Voir les N joueurs » pour l\'enfant', pg.query_selector('.rkmore') is None)
    check('Progrès : pas de défilement de côté', noscroll())

    # ----- Régularité -----
    pg.click('.seg3 button:has-text("Régularité")'); pg.wait_for_timeout(500)
    R = attendu('regularite')
    L2 = lignes('[data-podium="reg"]')
    v2 = [x for x in L2 if x != '⋯']
    check('Régularité : la carte et ses étoiles', pg.query_selector('[data-podium="reg"]') is not None and all('★' in x for x in v2) and len(v2) == len(R['garde']), (L2, R))
    mes = ev("""() => { const L = MC.logic, me = MC.app.S.me; const r = L.regularite(MC.app.S.league).find(x => x.p.id === me.joueur.id); return r ? r.etoiles : 0; }""")
    if R['mi'] >= 0:
        ligne = [x for x in v2 if 'TOI' in x.upper()]
        check('Régularité : ses étoiles à lui', len(ligne) == 1 and ligne[0].endswith(str(mes) + ' ★'), (ligne, mes))
    check('Régularité : pas de défilement de côté', noscroll())

    # ----- Records : les filtres, les épreuves de sa ligue, compactes -----
    pg.click('.seg3 button:has-text("Records")'); pg.wait_for_timeout(500)
    check('Records : les filtres repliés', pg.query_selector('details.rkf') is not None and not ev("document.querySelector('details.rkf').open"))
    cartes = pg.query_selector_all('.rkcards .rkcard')
    check('Records : une carte par épreuve', len(cartes) >= 5, len(cartes))
    # chaque carte : exactement le podium (ex aequo compris) puis toi et tes voisins, même dans une petite ligue (5 joueurs ou moins)
    ecarts = ev("""() => { const L = MC.logic, me = MC.app.S.me.joueur.id, cartes = [...document.querySelectorAll('.rkcards .rkcard')], out = [];
        const ids = MC.CONTENT.TESTS.map(t => t.id).filter(id => L.league(MC.app.S.league, me, id, 'best').rows.length);
        if (ids.length !== cartes.length) return ['cartes ' + ids.length + ' / ' + cartes.length];
        ids.forEach((id, i) => { const rows = L.league(MC.app.S.league, me, id, 'best').rows, mi = rows.findIndex(r => r.p.id === me), keep = L.podiumVoisins(rows, mi);
          const att = rows.filter((r, k) => keep[k]).map(r => r.p.prenom.toUpperCase()), vu = [...cartes[i].querySelectorAll('li.rkl .t1')].map(t => t.firstChild.textContent.trim());
          if (JSON.stringify(att) !== JSON.stringify(vu)) out.push(id + ' ' + vu.join(',') + ' / ' + att.join(',')); });
        return out; }""")
    check('Records : chaque carte = le podium, puis toi et tes voisins (jamais le bas, même en petite ligue)', ecarts == [], ecarts)
    check('Records : pas de « Voir les N joueurs »', pg.query_selector('.rkmore') is None)
    check('Records : pas de défilement de côté', noscroll())

    # ----- venir d'ailleurs : le Progrès du mois (règle v44 : arriver sur le premier) -----
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(900); pg.goto(BASE + '#/classement'); pg.wait_for_timeout(1200)
    check('venir d\'ailleurs : de nouveau le Progrès du mois', pg.query_selector('.seg3 button.on:has-text("Progrès")') is not None)

    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
