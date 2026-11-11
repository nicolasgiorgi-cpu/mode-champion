# (v74, lot E3) Le record du jour côté enfant : la carte sur l'Accueil (« Je tente », « Pas aujourd'hui »), Progrès › Records en
# 12 cartes, la fiche d'une épreuve (record, courbe, « Je tente »), l'écran de tentative (celui du bilan guidé) puis la fête,
# le record du jour dans la séance juste après l'échauffement (puis « Continuer ma séance »), une tentative par épreuve et par
# jour, deux épreuves par jour. Lundi 23/11 : le record du jour est « Pompes ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v74.py 390 844 · 1180 820 · 820 1180
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
    db = lambda: ev("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-demo-') === 0))).tables")
    defis = lambda: [(r['test'], r['valeur'], r['statut']) for r in db()['records'] if r['bilan'] == 'defi' and r['date'] == '2026-11-23']
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    def saisir(sel, v):
        ev("([s, v]) => { const i = document.querySelector(s); i.removeAttribute('readonly'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }", [sel, v])
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1500); modals()
    xp0 = ev('MC.app.S.stats.xp')

    # ----- l'Accueil : la carte du record du jour -----
    c = pg.query_selector('section.rdj')
    check('Accueil : le record du jour (Pompes), « Je tente »', c is not None and 'Pompes' in c.inner_text() and c.query_selector('a[href="#/tente/pompes"]') is not None, c.inner_text() if c else None)
    check('Accueil : son record sur la carte', c is not None and 'Ton record' in c.inner_text())
    pg.click('section.rdj [data-act="rdjPas"]'); pg.wait_for_timeout(600)
    check('« Pas aujourd\'hui » : la carte disparaît', pg.query_selector('section.rdj') is None)
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-rdj:') === 0).forEach(k => localStorage.removeItem(k))")
    check('Accueil : pas de défilement de côté', noscroll())
    # « Je tente » depuis l'Accueil, puis on s'en va sans rien faire (la tentative reste, elle reprendra dans la séance)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(900); modals()
    pg.click('section.rdj a[href="#/tente/pompes"]'); pg.wait_for_timeout(900)
    check('Je tente (Accueil) : d\'abord échauffement ou « déjà chaud »', pg.query_selector('[data-act="tnChaud"]') is not None)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(700)

    # ----- Progrès › Records : 12 cartes -----
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(1100)
    cartes = pg.query_selector_all('.epcs a.epc')
    check('Records : 12 épreuves en cartes', len(cartes) == 12, len(cartes))
    check('Records : la carte Pompes marquée « Record du jour »', pg.query_selector('.epc[data-test="pompes"] .epc-tag.dj') is not None)
    check('Records : une carte mène à la fiche de l\'épreuve', pg.get_attribute('.epc[data-test="saut"]', 'href') == '#/epreuve/saut')
    check('Records : pas de défilement de côté', noscroll())

    # ----- la fiche : arrêter une tentative ne note rien -----
    pg.goto(BASE + '#/epreuve/navette'); pg.wait_for_timeout(1000)
    check('Fiche : son record et « Je tente »', pg.query_selector('.ep-rec .ep-v') is not None and pg.query_selector('a[href="#/tente/navette"]') is not None)
    check('Fiche : la navette se fait à deux', 'À deux' in pg.inner_text('main'))
    check('Fiche : pas de défilement de côté', noscroll())
    pg.click('a[href="#/tente/navette"]'); pg.wait_for_timeout(900)
    check('Je tente : d\'abord l\'échauffement (4 min) ou « déjà chaud »', pg.query_selector('[data-act="tnWarm"]') is not None and pg.query_selector('[data-act="tnChaud"]') is not None)
    pg.click('[data-act="brQuit"]'); pg.wait_for_timeout(400)
    pg.click('.modal button:has-text("Arrêter")'); pg.wait_for_timeout(900)
    check('Arrêter : retour à la fiche, rien de noté', pg.url.endswith('#/epreuve/navette') and defis() == [], (pg.url, defis()))

    # ----- la séance : le record du jour juste après l'échauffement -----
    pg.goto(BASE + '#/go/cros'); pg.wait_for_timeout(1200); modals()
    pg.click('[data-act="runNextStep"]'); pg.wait_for_timeout(700)
    t = pg.inner_text('main')
    check('Séance : après l\'échauffement, le record du jour', 'RECORD DU JOUR' in t.upper() and 'POMPES' in t.upper(), t[:200])
    lien = pg.get_attribute('.rdj-step [data-act="runTente"]', 'data-h')
    check('Séance : « Je tente » sans réchauffement, avec le retour à la séance', lien == '#/tente/pompes?chaud=1&retour=go/cros', lien)
    pg.click('.rdj-step [data-act="runTente"]'); pg.wait_for_timeout(1000)
    check('Je tente (depuis la séance, tentative commencée sur l\'Accueil) : directement l\'épreuve, le compteur', pg.query_selector('#br_v') is not None and pg.query_selector('[data-act="tnChaud"]') is None)
    check('Je tente : son record rappelé', 'TON RECORD' in pg.inner_text('main').upper())
    saisir('#br_v', '9'); pg.wait_for_timeout(100)
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(2500)
    t = pg.inner_text('main')
    check('Pas battu : « Bien essayé », le record reste, +10 XP', 'BIEN' in t.upper() and 'reste' in t and '+10' in t, t[:300])
    check('Pas battu : noté (une tentative qui compte)', defis() == [('pompes', 9, 'ok')], defis())
    check('Fête : pas de défilement de côté', noscroll())
    pg.click('[data-act="tnFin"]:has-text("Continuer ma séance")'); pg.wait_for_timeout(1200)
    t = pg.inner_text('main')
    check('Retour à la séance : « Record du jour tenté », puis la suite', pg.url.endswith('#/go/cros') and 'tenté' in t, (pg.url, t[:200]))
    pg.click('[data-act="runNextStep"]:has-text("Continuer la séance")'); pg.wait_for_timeout(800)
    lab = pg.inner_text('.run .top .hud')
    check('Séance : le 1er exercice est bien « EXO 1/… »', lab.startswith('EXO 1/'), lab)
    pg.click('[data-act="runQuit"]'); pg.wait_for_timeout(400)
    q = pg.query_selector('.modal button:has-text("Quitter")') or pg.query_selector('.modal button >> nth=-1')
    q.click(); pg.wait_for_timeout(900)

    # ----- une 2e épreuve, record battu : la fête, sa place dans sa ligue -----
    # une épreuve où un petit progrès ne fait pas entrer sur le podium (sinon c'est un exploit, à confirmer)
    choix = ev("""async () => { const lg = await MC.app.kidCall('league'), L = MC.logic, me = MC.app.S.me.joueur.id, st = MC.app.S.stats;
        for (const id of ['saut', 'corde']) { const b = st.bestsOk[id]; if (!b) continue; const nv = b.valeur + (id === 'saut' ? 2 : 1);
          const rows = L.league(lg, me, id, 'best').rows, mine = rows.find(r => r.p.id === me), avant = mine ? mine.rank : 99;
          const apres = 1 + rows.filter(r => r.p.id !== me && r.best > nv).length;
          if (!(apres <= 3 && avant > 3)) return [id, b.valeur, nv]; }
        return null; }""")
    check('Démo : une épreuve pour un record battu sans exploit', choix is not None, choix)
    tid, rec, nv = choix
    unite = ' cm' if tid == 'saut' else ''
    pg.goto(BASE + '#/tente/' + tid); pg.wait_for_timeout(1000)
    pg.click('[data-act="tnChaud"]'); pg.wait_for_timeout(500)
    # la réponse du serveur se perd (l'essai est pourtant enregistré) : « Réessayer » retrouve l'essai et fait la fête
    ev("""() => { const c0 = MC.api.call; let n = 0; MC.api.call = function (a) { const pr = c0.apply(this, arguments);
        if (a === 'submitRecords' && !n++) return pr.then(() => { throw Object.assign(new Error('Pas de réseau.'), { code: 'reseau' }); }); return pr; }; }""")
    if tid == 'saut':
        saisir('#br_a', str(nv)); saisir('#br_b', str(rec - 10)); pg.wait_for_timeout(100)
        pg.click('[data-act="brOk"]')
    else:
        saisir('#br_v', str(nv)); pg.wait_for_timeout(100); pg.click('[data-act="brOk"]'); pg.wait_for_timeout(500)
        pg.click('[data-act="brSkipEssai"]')   # le 2e essai de la corde est facultatif
    pg.wait_for_timeout(1500)
    check('Réponse perdue : « Pas encore envoyé », réessayer', pg.query_selector('[data-act="tnRenvoi"]') is not None, pg.inner_text('main')[:200])
    pg.click('[data-act="tnRenvoi"]')
    pg.wait_for_timeout(3000)
    t = pg.inner_text('main')
    check('Record battu : « Nouveau record ! », le gain, +50 XP', 'NOUVEAU' in t.upper() and ('+' + str(nv - rec) + unite) in t and '+50' in t, t[:300])
    check('Record battu : sa place dans sa ligue', 'de ta ligue' in t, t[:400])
    check('Record battu : le meilleur résultat est noté', (tid, nv, 'ok') in defis(), defis())
    pg.click('[data-act="tnFin"]:has-text("Voir mon épreuve")'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('Fiche après : le nouveau record, la courbe, « déjà tenté aujourd\'hui »', pg.url.endswith('#/epreuve/' + tid) and str(nv) in pg.inner_text('.ep-rec') and pg.query_selector('svg.courbe polyline') is not None and 'déjà tenté' in t, t[:300])
    check('Fiche après : pas de défilement de côté', noscroll())

    # ----- les limites : une tentative par épreuve, deux épreuves par jour -----
    pg.goto(BASE + '#/tente/' + tid); pg.wait_for_timeout(1200)
    check('Retenter la même épreuve : renvoyé à la fiche', pg.url.endswith('#/epreuve/' + tid), pg.url)
    pg.goto(BASE + '#/epreuve/navette'); pg.wait_for_timeout(1000)
    check('Une 3e épreuve : « Deux épreuves par jour »', pg.query_selector('a[href="#/tente/navette"]') is None and 'Deux épreuves par jour' in pg.inner_text('main'))
    pg.goto(BASE + '#/tente/navette'); pg.wait_for_timeout(1200)
    check('… même par l\'adresse : renvoyé à la fiche, rien de noté', pg.url.endswith('#/epreuve/navette') and len(defis()) == 2, (pg.url, defis()))
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(1000)
    check('Records : « Tenté aujourd\'hui » sur les deux épreuves', pg.query_selector('.epc[data-test="pompes"] .epc-tag.ok') is not None and pg.query_selector('.epc[data-test="' + tid + '"] .epc-tag.ok') is not None)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(1200); modals()
    c = pg.query_selector('a.rdj.fait')
    check('Accueil : « Record du jour tenté »', c is not None and pg.query_selector('section.rdj') is None)
    check('… sur une ligne (icône, texte, flèche)', c is not None and ev("a => getComputedStyle(a).flexDirection", c) == 'row', ev("a => getComputedStyle(a).flexDirection", c) if c else None)
    # un défi de badge compte aussi : deux épreuves déjà, plus de bouton d'envoi
    bid = ev("MC.CONTENT.BADGES.find(b => b.defi && b.test !== 'pompes' && b.test !== %s).id" % json.dumps(tid))
    pg.goto(BASE + '#/defi/' + bid); pg.wait_for_timeout(1000)
    check('Défi d\'un badge : « Deux épreuves par jour », pas d\'envoi', pg.query_selector('[data-act="sendDefi"]') is None and 'Deux épreuves par jour' in pg.inner_text('main'), bid)
    xp1 = ev('MC.app.S.stats.xp')
    check('XP : +50 (record battu) et +10 (tentative), au moins', xp1 - xp0 >= 60, (xp0, xp1))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
