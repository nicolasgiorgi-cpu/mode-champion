# (v75, lot E4) Le bilan qui se remplit : en haut de Progrès › Records, « Mon bilan 2 » (cycle 2, depuis le 16/11) avec ses 12 cases,
# « À faire ce cycle » sur les cartes, « Finir mon bilan » (le bilan guidé sur les seules épreuves qui manquent), la 12e épreuve
# faite en record du jour : « Bilan complet ! » et ses XP ; l'Accueil et « Ma progression » suivent. Horloge : lundi 23/11.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v75.py 390 844 · 1180 820 · 820 1180
import sys, os, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_system_time('2026-11-23T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    def saisir(sel, v):
        ev("([s, v]) => { const i = document.querySelector(s); i.removeAttribute('readonly'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }", [sel, v])
    def login():
        pg.goto(BASE + '#/connexion'); pg.wait_for_timeout(600)
        pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
        for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
        pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    login()
    etat = lambda: ev("""() => { const B = MC.logic.bilanCycle(MC.app.S.me.records, 2); return { faits: B.faits, manque: MC.CONTENT.TESTS.filter(t => !B.cases[t.id]).map(t => t.id) }; }""")

    # ----- Progrès › Records : « Mon bilan 2 » -----
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(1100)
    E = etat()
    h = pg.query_selector('.bilcy')
    check('Records : « Mon bilan 2 » en haut', h is not None and 'bilan 2' in h.inner_text().lower(), h.inner_text() if h else None)
    check('… le compte des épreuves faites ce cycle', h is not None and ('%d / 12' % E['faits']) in h.inner_text(), (E, h.inner_text() if h else None))
    check('… 12 cases, autant de cases pleines', len(pg.query_selector_all('.bilseg i')) == 12 and len(pg.query_selector_all('.bilseg i.on')) == E['faits'])
    reste = 12 - E['faits']
    lien = pg.query_selector('.bilcy a[href="#/bilan/go?reste=1"]')
    check('« Finir mon bilan · N épreuves »', lien is not None and ('%d épreuve' % reste) in lien.inner_text().lower(), lien.inner_text() if lien else None)
    tags = ev("[...document.querySelectorAll('.epc')].filter(c => c.querySelector('.epc-tag.afaire')).map(c => c.dataset.test)")
    autres = ev("[...document.querySelectorAll('.epc')].filter(c => c.querySelector('.epc-tag.dj, .epc-tag.ok')).map(c => c.dataset.test)")
    check('« À faire ce cycle » sur les épreuves qui manquent', sorted(tags + [x for x in autres if x in E['manque']]) == sorted(E['manque']), (tags, autres, E['manque']))
    check('Records : pas de défilement de côté', noscroll())

    # ----- « Finir mon bilan » : le bilan guidé sur les seules épreuves qui manquent -----
    lien.click(); pg.wait_for_timeout(1200)
    nb = len(E['manque'])
    check('Finir mon bilan : d\'abord l\'échauffement', 'ÉCHAUFFEMENT' in pg.inner_text('main').upper())
    pg.click('[data-act="brWarmDone"]'); pg.wait_for_timeout(600)
    G = ev("JSON.parse(localStorage.getItem('mc-bilrun') || 'null')")
    attendus = ev("ids => ids.map(id => MC.CONTENT.TESTS.find(t => t.id === id).n)", E['manque'])
    check('… puis les seules épreuves qui manquent', G is not None and G.get('reste') == attendus, (G and G.get('reste'), attendus))
    premier = ev("MC.CONTENT.TESTS.find(t => t.id === %s).nom" % json.dumps(E['manque'][0]))
    lab = pg.inner_text('.run .top .hud')
    check('… le 1er test : la 1re épreuve qui manque, « TEST 1/N »', lab == 'TEST 1/%d' % nb and premier.upper() in pg.inner_text('main').upper(), (lab, premier))
    if nb > 1:
        pg.click('[data-act="brSkip"]'); pg.wait_for_timeout(500)
        second = ev("MC.CONTENT.TESTS.find(t => t.id === %s).nom" % json.dumps(E['manque'][1]))
        check('… « Passer ce test » : la suivante qui manque', pg.inner_text('.run .top .hud') == 'TEST 2/%d' % nb and second.upper() in pg.inner_text('main').upper(), second)
    pg.click('[data-act="brQuit"]'); pg.wait_for_timeout(400); pg.click('.modal button:has-text("Pause")'); pg.wait_for_timeout(800)
    ev("localStorage.removeItem('mc-bilrun')")

    # ----- la 12e épreuve en record du jour : « Bilan complet ! » -----
    # on remplit le cycle pour toutes les épreuves sauf une (Pompes, le record du jour du 23/11, si elle manque ; sinon on la retire du cycle)
    ev("""() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k)), me = MC.app.S.me.joueur.id;
        D.tables.records = D.tables.records.filter(r => !(r.joueurId === me && r.test === 'pompes' && ((r.bilan === 'defi' && r.date >= '2026-11-16') || r.bilan === '2')));
        const B = MC.logic.bilanCycle(D.tables.records.filter(r => r.joueurId === me), 2);
        MC.CONTENT.TESTS.forEach((t, i) => { if (t.id === 'pompes' || B.cases[t.id]) return;
          D.tables.records.push({ id: 'e2e' + i, joueurId: me, bilan: '2', test: t.id, valeur: t.moinsMieux ? 16 : 20, extra: null, statut: 'ok', parQui: '', date: '2026-11-18', cree: '2026-11-18T10:00:00.000Z', exploit: '' }); });
        localStorage.setItem(k, JSON.stringify(D)); }""")
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-me') === 0).forEach(k => localStorage.removeItem(k))")
    pg.goto(BASE + '#/bilans'); pg.reload(); pg.wait_for_timeout(1500); modals()
    E = etat()
    check('Préparation : 11 / 12, il manque Pompes', E['faits'] == 11 and E['manque'] == ['pompes'], E)
    xp0 = ev('MC.app.S.stats.xp')
    pg.goto(BASE + '#/tente/pompes'); pg.wait_for_timeout(1000)
    pg.click('[data-act="tnChaud"]'); pg.wait_for_timeout(500)
    rec = ev("MC.app.S.stats.bestsOk.pompes.valeur")
    saisir('#br_v', str(rec)); pg.wait_for_timeout(100)
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(3000)
    t = pg.inner_text('main')
    check('La 12e épreuve : « Bilan complet ! » sur la fête', pg.query_selector('[data-complet]') is not None and 'complet' in t.lower(), t[:400])
    check('… et ses XP (+200 et +10)', ('+%d' % (200 + 10)) in t, t[:400])
    check('Fête : pas de défilement de côté', noscroll())
    pg.click('[data-act="tnFin"]:has-text("Voir mon épreuve")'); pg.wait_for_timeout(900)
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(1100)
    h = pg.inner_text('.bilcy')
    check('Records : « 12 / 12 », bilan complet, plus de « Finir »', '12 / 12' in h and 'complet' in h.lower() and pg.query_selector('.bilcy a[href="#/bilan/go?reste=1"]') is None, h)
    check('Records : plus de « À faire ce cycle »', pg.query_selector('.epc-tag.afaire') is None)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(1100); modals()
    check('Accueil : « Ton bilan est fait »', 'Ton bilan est fait' in pg.inner_text('main'))
    pg.goto(BASE + '#/progression'); pg.wait_for_timeout(1100)
    check('Ma progression : le bilan 2 (le meilleur du cycle)', 'Bilan 2' in pg.inner_text('main'))
    check('XP : +200 pour le bilan complet', ev('MC.app.S.stats.xp') - xp0 >= 200, (xp0, ev('MC.app.S.stats.xp')))

    # ----- (relecture) un 2e envoi dans le cycle : seulement le nouveau ; les anciens gardent leur date, un niveau changé reste -----
    ctx2 = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx2.new_page(); ev = pg.evaluate
    pg.clock.set_system_time('2026-11-23T10:00:00'); pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    login()
    ev("""() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k)), me = MC.app.S.me.joueur.id;
        MC.CONTENT.TESTS.slice(0, 10).forEach((t, i) => D.tables.records.push({ id: 'b2-' + i, joueurId: me, bilan: '2', test: t.id, valeur: t.moinsMieux ? 16 : 20, extra: t.parPied ? { g: 20, d: 20 } : null, statut: 'ok', parQui: '', date: '2026-11-17', cree: '2026-11-17T10:00:00.000Z', exploit: '' }));
        localStorage.setItem(k, JSON.stringify(D)); }""")
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-me') === 0 || k === 'mc-bil').forEach(k => localStorage.removeItem(k))")
    pg.reload(); pg.wait_for_timeout(1500); modals()
    ev("MC.app.kidCall('updateMe', { niveaux: Object.assign({}, MC.app.S.me.joueur.niveaux, { pompes: 3 }) }).then(r => MC.app.setMe(r))"); pg.wait_for_timeout(600)
    ev("MC.app.loadMe(true)"); pg.wait_for_timeout(600)
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000)
    ev("""() => { const b = MC.bilan.ensure(MC.app.S.me); b.v.corde1 = '90'; b.v.burpees = '15'; MC.bilan.save(); }""")
    ev("() => { MC.bilan.submit(null); }"); pg.wait_for_timeout(1500)   # sans attendre la promesse (elle attend la fenêtre)
    if pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(600)
    R2 = ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables.records.filter(r => r.joueurId === MC.app.S.me.joueur.id && r.bilan === '2').map(r => [r.test, r.date])")
    vieux = sorted(set(d for t, d in R2 if t not in ('corde1', 'burpees')))
    neufs = sorted(set(d for t, d in R2 if t in ('corde1', 'burpees')))
    check('2e envoi : les 10 anciens gardent leur date, les 2 nouveaux sont datés du jour', vieux == ['2026-11-17'] and neufs == ['2026-11-23'] and len(R2) == 12, R2)
    check('2e envoi : un niveau changé entre-temps n\'est pas écrasé', ev("MC.app.S.me.joueur.niveaux.pompes") == 3, ev("MC.app.S.me.joueur.niveaux"))

    # ----- (relecture) la bascule du 15 au 16/11 : seulement les épreuves notées mais pas envoyées passent au bilan 2 -----
    ctx3 = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx3.new_page(); ev = pg.evaluate
    pg.clock.set_fixed_time('2026-11-15T10:00:00'); pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    login()
    ev("""() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0), D = JSON.parse(localStorage.getItem(k)), me = MC.app.S.me.joueur.id;
        D.tables.records = D.tables.records.filter(r => !(r.joueurId === me && r.bilan === '1'));
        ['pompes', 'squats', 'chaise', 'corde', 'saut', 'burpees'].forEach((t, i) => D.tables.records.push({ id: 'b1-' + i, joueurId: me, bilan: '1', test: t, valeur: t === 'chaise' ? 70 : 20, extra: null, statut: 'ok', parQui: '', date: '2026-11-14', cree: '2026-11-14T10:00:00.000Z', exploit: '' }));
        localStorage.setItem(k, JSON.stringify(D)); }""")
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-me') === 0 || k === 'mc-bil').forEach(k => localStorage.removeItem(k))")
    pg.reload(); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000)
    n1 = ev("""() => { const b = MC.bilan.ensure(MC.app.S.me); b.v.corde1 = '95'; b.v.planche_m = '1'; b.v.planche_s = '40'; MC.bilan.save(); return MC.bilan.values(MC.app.S.me).map(v => v.test).sort(); }""")
    check('Bilan 1 (15/11) : 6 envoyés + 2 notés', len(n1) == 8, n1)
    pg.clock.set_fixed_time('2026-11-16T10:00:00'); pg.goto(BASE + '#/semaine'); pg.reload(); pg.wait_for_timeout(1500); modals()
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000)
    n2 = ev("() => [MC.logic.currentBilan().n, MC.bilan.values(MC.app.S.me).map(v => v.test).sort()]")
    check('16/11 : le bilan 2 ne reprend que les 2 épreuves pas envoyées (pas de copie du Bilan 1)', n2 == [2, ['corde1', 'planche']], n2)
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
