# Visuels v2 (25/10/2026) : les cartes Skills (trophées, mission principale, 47 étoiles), l'onglet doré,
# le booster (une étoile, plusieurs, « Passer », mouvement réduit), une mission principale donnée à plusieurs enfants,
# et les retouches (valider une étoile : un panneau de confirmation ; la fiche ; l'arène ; la séance ; les records).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_visuels.py 390 844   (aussi 1180 820 et 820 1180)
import sys, os, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
OUT = os.environ.get('OUT', '/tmp/visuels-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def shot(pg, name, full=False): pg.screenshot(path=OUT + tag + '-' + name + '.png', full_page=full)
def noscroll(pg): return pg.evaluate('document.scrollingElement.scrollWidth <= innerWidth + 1')
def go(pg, h, t=750): pg.goto(BASE + h); pg.wait_for_timeout(t)
def pin(pg, code, sel):
    for c in code: pg.click('%s [data-k="%s"]' % (sel, c)); pg.wait_for_timeout(40)
def pick(pg, nom):
    pg.click('[data-act="adultPick"][data-nom="%s"]' % nom); pg.wait_for_timeout(300)

def contexte(p, rm=False):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True, reduced_motion='reduce' if rm else 'no-preference')
    ctx.add_init_script('window.__MC_QUIET = 1')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text and 'ytimg' not in m.text and 'youtube' not in m.text and 'Failed to load resource' not in m.text else None)
    return b, pg

def kid_login(pg):
    go(pg, '', 500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg, '2580', '.modal'); pg.wait_for_timeout(1200)

# la date de la dernière visite du carnet : n étoiles arrivent « depuis »
def reculer(pg, n):
    return pg.evaluate("""(n) => { var me = MC.app.S.me, jid = me.joueur.id;
      var ts = ['2000-01-01T00:00:00.000Z'];
      (me.etoiles || []).forEach(e => { if (e.cree) ts.push(e.cree); if (e.brille && e.maj) ts.push(e.maj); });
      var best = null;
      ts.forEach(t => { var lu = t, c = MC.nouvellesEtoiles(me, lu).length; if (c >= n && (!best || c < best.c || (c === best.c && lu > best.lu))) best = { lu: lu, c: c }; });
      localStorage.setItem('mc-sklu:' + jid, JSON.stringify(best.lu));
      return best.c; }""", n)

with sync_playwright() as p:
    # ===================== l'enfant : les cartes, l'onglet doré, le booster =====================
    b, pg = contexte(p)
    kid_login(pg)
    go(pg, '#/skills', 1100)
    check('Skills : 8 cartes', pg.locator('.sk-tilt[data-carte]').count() == 8, pg.locator('.sk-tilt[data-carte]').count())
    check('Skills : 47 étoiles en tout', pg.locator('.sk-tilt .sk-pips .et').count() == 47, pg.locator('.sk-tilt .sk-pips .et').count())
    check('Skills : la carte de la mission a son cadre (sk-mis) et « ★ MISSION »', pg.locator('.sk-tilt .sk-mis').count() == 1 and pg.locator('.sk-mis .sk-mtag').count() == 1, (pg.locator('.sk-mis').count(), pg.locator('.sk-mtag').count()))
    n_act = pg.locator('.mc-trophee[data-active="true"]').count()
    check('Skills : trophées qui flottent ≤ 4', 0 < n_act <= 4, n_act)
    check('Skills : une icône par carte', pg.locator('.sk-tilt .mc-trophee svg').count() == 8)
    check('Skills : la mission principale en haut (.mp-bloc)', pg.locator('.mp-bloc').count() >= 1)
    check('Skills : pas de booster sans nouvelle étoile', pg.query_selector('.bk') is None)
    check('Skills : pas de défilement horizontal', noscroll(pg))
    shot(pg, 'skills')
    # la mission principale dans Missions : des encouragements (points violets), pas de « +1 » ni de total
    go(pg, '#/missions', 900)
    t = pg.inner_text('main')
    check('Missions : « Ma mission principale »', 'mission principale' in t.lower(), t[:200])
    check('Missions : des encouragements, pas de « +1 »', pg.locator('.mp-bloc .encd').count() >= 1 and '+1' not in pg.inner_text('.mp-bloc'), pg.inner_text('.mp-bloc')[:200])
    check('Missions : la date de fin', bool(re.search(r"Jusqu'aux vacances|jusqu'au", pg.inner_text('.mp-bloc'), re.I)), pg.inner_text('.mp-bloc')[:200])

    # plusieurs étoiles arrivent : l'onglet Skills devient doré (pas d'animation ailleurs)
    nb = reculer(pg, 3)
    go(pg, '#/semaine', 900)
    check('3 étoiles « nouvelles »', nb == 3, nb)
    check('onglet Skills doré', pg.query_selector('#nav a.gold[href^="#/skills"]') is not None)
    check('pas de booster ailleurs que dans Skills', pg.query_selector('.bk') is None)
    shot(pg, 'onglet-dore')
    pg.click('#nav a[href^="#/skills"]'); pg.wait_for_timeout(900)
    check('booster : il arrive', pg.query_selector('.bk') is not None and pg.get_attribute('.bk', 'data-ph') == 'arrive', pg.get_attribute('.bk', 'data-ph') if pg.query_selector('.bk') else '')
    check('booster : le carnet est derrière, à l\'écran', pg.locator('.sk-tilt').count() == 8)
    check('booster : le reste de l\'appli est inactif pendant le booster', pg.get_attribute('#app', 'inert') is not None)
    shot(pg, 'bk-arrive')
    pg.click('.bk .bk-pack', force=True); pg.wait_for_timeout(1250)
    check('booster : il explose (boom)', pg.get_attribute('.bk', 'data-ph') in ('boom', 'reveal'), pg.get_attribute('.bk', 'data-ph'))
    pg.wait_for_timeout(1700)
    check('booster : les étoiles, groupées par carte', pg.get_attribute('.bk', 'data-ph') == 'reveal' and pg.locator('.bk .bk-multi').count() == 1)
    check('booster : + XP', bool(re.search(r'\+\d+\s*XP', pg.inner_text('.bk .bk-end'))), pg.inner_text('.bk .bk-end')[:120])
    check('booster : pas de défilement horizontal', noscroll(pg))
    shot(pg, 'bk-multi')
    pg.click('.bk .bk-btn'); pg.wait_for_timeout(1300)
    check('booster : rangé (fermé)', pg.query_selector('.bk') is None)
    check('booster fermé : l\'appli redevient active', pg.get_attribute('#app', 'inert') is None)
    check('booster : les étoiles arrivent dans les cartes (pop)', pg.locator('.sk-pips .et.pop').count() >= 1, pg.locator('.sk-pips .et.pop').count())
    check('onglet Skills redevenu normal', pg.query_selector('#nav a.gold') is None)
    go(pg, '#/skills', 900)
    check('le booster ne revient pas', pg.query_selector('.bk') is None)

    # une seule étoile : la grande étoile au centre (en démo, une étoile de Tom « arrive » maintenant)
    nb = pg.evaluate("""() => { var k = Object.keys(localStorage).find(x => x.indexOf('mc-demo-') === 0), db = JSON.parse(localStorage.getItem(k)), jid = MC.app.S.me.joueur.id;
      var mine = db.tables.etoiles.filter(e => e.joueurId === jid && !e.retiree && !e.brille), now = new Date();
      mine[mine.length - 1].cree = now.toISOString(); localStorage.setItem(k, JSON.stringify(db));
      localStorage.setItem('mc-sklu:' + jid, JSON.stringify(new Date(now.getTime() - 60000).toISOString()));
      localStorage.removeItem('mc-me'); return mine.length ? 1 : 0; }""")
    go(pg, '#/semaine', 300); pg.reload(); pg.wait_for_timeout(1200)
    pg.click('#nav a[href^="#/skills"]'); pg.wait_for_timeout(900)
    nb = pg.evaluate("MC.boosterAnalyse ? document.querySelectorAll('.bk [data-k]').length : -1")
    check('1 étoile « nouvelle »', nb == 1, nb)
    pg.click('.bk .bk-pack', force=True); pg.wait_for_timeout(3000)
    check('booster seul : la grande étoile et son nom', pg.locator('.bk .bk-star').count() == 1 and pg.locator('.bk .bk-multi').count() == 0 and len(pg.inner_text('.bk .bk-txt').strip()) > 3)
    shot(pg, 'bk-seule')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('booster : Échap le ferme', pg.query_selector('.bk') is None)

    # le bouton Retour referme le booster
    reculer(pg, 2)
    go(pg, '#/semaine', 700); pg.click('#nav a[href^="#/skills"]'); pg.wait_for_timeout(900)
    pg.go_back(); pg.wait_for_timeout(600)
    check('booster : le bouton Retour le ferme', pg.query_selector('.bk') is None)
    # « Passer » : fermé tout de suite
    reculer(pg, 2)
    go(pg, '#/semaine', 700); pg.click('#nav a[href^="#/skills"]'); pg.wait_for_timeout(900)
    pg.click('.bk .bk-skip', force=True); pg.wait_for_timeout(300)
    check('booster : « Passer » le ferme', pg.query_selector('.bk') is None)
    check('après « Passer » : onglet normal', pg.query_selector('#nav a.gold') is None)

    # les retouches côté enfant
    # « À regarder » ne se replie pas tout seul quand la mise à jour du serveur arrive
    pg.evaluate("Object.keys(localStorage).filter(k => k.indexOf('mc-areg:') === 0).forEach(k => localStorage.removeItem(k))")
    go(pg, '#/semaine', 900)
    if pg.query_selector('.areg'):
        o1 = pg.get_attribute('.areg', 'open') is not None
        pg.evaluate("MC.app.loadMe(true).then(() => MC.app.rerender())"); pg.wait_for_timeout(1500)
        check('« À regarder » reste ouvert après la mise à jour', o1 and pg.get_attribute('.areg', 'open') is not None)
        go(pg, '#/profil', 500); go(pg, '#/semaine', 900)
        check('« À regarder » replié une fois consulté (écran quitté)', pg.get_attribute('.areg', 'open') is None)
    go(pg, '#/jour/meafou', 900)
    order = pg.evaluate("""() => { var m = document.querySelector('main'), o = n => { var e = m.querySelector(n); return e ? e.getBoundingClientRect().top + scrollY : -1; };
      return [o('.grid3'), o('.jprep .box'), o('[data-k="son"]'), o('[data-act="startRun"]'), o('ol'), o('.note.gold'), o('.jdeja')]; }""")
    check('séance : chiffres › matériel › son › départ › parcours › pourquoi › déjà faite', all(x >= 0 for x in order) and order == sorted(order), order)
    check('séance : « Noter une séance déjà faite » à part', 'déjà faite' in pg.inner_text('.jdeja').lower())
    check('séance : pas de défilement horizontal', noscroll(pg))
    go(pg, '#/bilans', 900)
    t = pg.inner_text('main')
    check('records : le résultat proposé à part, en attente d\'un adulte', 'Résultat proposé' in t and 'en attente d\'un adulte' in t, t[:300])
    check('records : le bouton du bilan dit où on en est', bool(re.search(r'Saisir mon|Compléter mon|envoyé|fait', pg.inner_text('a[href="#/bilan"]'), re.I)), pg.inner_text('a[href="#/bilan"]'))
    go(pg, '#/classement', 1000)
    check('arène : réglages groupés au-dessus de la liste', pg.locator('.rkset [data-act="rkTest"]').count() > 5 and pg.locator('.rkset [data-act="rkMode"]').count() == 2)
    check('arène : « Toi »', pg.locator('.li.me .rk-toi').count() == 1)
    pg.click('[data-act="rkMode"][data-v="prog"]'); pg.wait_for_timeout(300)
    go(pg, '#/semaine', 500); go(pg, '#/classement', 900)
    check('arène : le choix est gardé', 'on' in (pg.get_attribute('[data-act="rkMode"][data-v="prog"]', 'class') or ''))
    pg.click('[data-act="rkMode"][data-v="best"]'); pg.wait_for_timeout(200)
    go(pg, '#/profil', 900)
    t = pg.inner_text('main')
    check('Moi : « Mon niveau XP », « Mon cycle de prépa », « étoiles rugby », « non faite »', all(x.lower() in t.lower() for x in ['Mon niveau XP', 'Mon cycle de prépa', 'étoiles rugby', 'non faite']), t[:300])
    check('Moi : pas de défilement horizontal', noscroll(pg))
    b.close()

    # ===================== mouvement réduit : pas d'animation, tout de suite les étoiles =====================
    b, pg = contexte(p, rm=True)
    kid_login(pg)
    go(pg, '#/skills', 900)
    check('mouvement réduit : aucun trophée qui flotte', pg.locator('.mc-trophee[data-active="true"]').count() == 0)
    reculer(pg, 2)
    go(pg, '#/semaine', 700); pg.click('#nav a[href^="#/skills"]'); pg.wait_for_timeout(700)
    check('mouvement réduit : le booster montre tout de suite les étoiles', pg.query_selector('.bk') is not None and pg.get_attribute('.bk', 'data-ph') == 'reveal')
    pg.click('.bk .bk-btn'); pg.wait_for_timeout(400)
    check('mouvement réduit : rangé tout de suite', pg.query_selector('.bk') is None)
    b.close()

    # ===================== l'éduc : une mission principale à plusieurs enfants, valider avec confirmation =====================
    b, pg = contexte(p)
    go(pg, '', 500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    go(pg, '#/adultes', 600)
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(300); pick(pg, 'Coach Nico'); pin(pg, '2468', '#adultzone'); pg.wait_for_timeout(1500)
    go(pg, '#/educ/missions/nouvelle?type=perso', 1000)
    kids = pg.evaluate("""() => { var g = MC.app.S.cache.group, act = {}; (g.defmissions || []).forEach(m => { if (m.sorte === 'etoile' && m.statut === 'active' && (!m.fin || m.fin >= MC.logic.today())) act[m.joueurId] = 1; });
      return g.joueurs.filter(p => p.joueur.actif && !act[p.joueur.id] && !(p.etoiles || []).some(e => e.domaine === 'pied')).map(p => p.joueur.id).slice(0, 3); }""")
    check('éduc : 3 enfants sans mission', len(kids) == 3, kids)
    for k in kids:
        pg.click('[data-act="nmKid"][data-v="%s"]' % k); pg.wait_for_timeout(150)
    dom = 'pied'
    pg.click('[data-act="nmDom"][data-v="%s"]' % dom); pg.wait_for_timeout(250)
    stars = pg.locator('[data-act="nmStar"]')
    stars.nth(0).click(); pg.wait_for_timeout(150); stars.nth(1).click(); pg.wait_for_timeout(150)
    check('éduc : le récap compte les enfants', bool(re.search(r'3 enfants', pg.inner_text('[data-act="nmPerso"]'), re.I)), pg.inner_text('[data-act="nmPerso"]'))
    check('éduc : une date de fin proposée', pg.locator('[data-act="nmFin"].on, [data-act="nmFin"][aria-pressed="true"]').count() >= 1)
    check('éduc : pas de défilement horizontal', noscroll(pg))
    shot(pg, 'educ-nouvelle', True)
    pg.click('[data-act="nmPerso"]'); pg.wait_for_timeout(1500)
    n = pg.evaluate("(ids) => (MC.app.S.cache.group.defmissions || []).filter(m => m.sorte === 'etoile' && m.statut === 'active' && ids.indexOf(m.joueurId) >= 0 && (m.etoiles || []).length === 2).length", kids)
    check('éduc : 3 missions de 2 étoiles créées', n == 3, n)
    # valider une étoile : un panneau dit pour qui, quelle carte, quelle étoile
    go(pg, '#/educ/joueur/%s?t=missions' % kids[0], 1100)
    pg.click('.fmis [data-act="valEtoile"] >> nth=0'); pg.wait_for_timeout(300)
    m = pg.inner_text('.modal') if pg.query_selector('.modal') else ''
    check('valider : panneau de confirmation « Valider pour … »', 'valider pour' in m.lower(), m[:200])
    shot(pg, 'educ-valider')
    avant = pg.evaluate("(id) => (MC.app.S.cache.group.joueurs.filter(p => p.joueur.id === id)[0].etoiles || []).length", kids[0])
    pg.click('.modal .btn.gold'); pg.wait_for_timeout(1200)
    apres = pg.evaluate("(id) => (MC.app.S.cache.group.joueurs.filter(p => p.joueur.id === id)[0].etoiles || []).length", kids[0])
    check('valider : l\'étoile est validée après confirmation', apres == avant + 1, (avant, apres))
    # la fiche : les onglets entièrement visibles, les copains repliés « éducs uniquement »
    go(pg, '#/educ/joueur/%s?t=famille' % kids[0], 1000)
    vis = pg.evaluate("() => { var n = document.querySelector('.ftabs'), a = n.querySelector('a.on'), r = n.getBoundingClientRect(), q = a.getBoundingClientRect(); return q.left >= r.left - 1 && q.right <= r.right + 1; }")
    check('fiche : l\'onglet ouvert entièrement visible', vis)
    go(pg, '#/educ/joueur/%s?t=terrain' % kids[0], 1000)
    if pg.query_selector('.edonly'):
        check('fiche : copains repliés, « Éducs uniquement »', pg.get_attribute('.edonly', 'open') is None and 'uniquement' in pg.inner_text('.edonly summary').lower())
    # la carte d'un entraînement : Ateliers et Matchs, deux actions
    go(pg, '#/educ/entrainements', 1000)
    acts = pg.locator('.cev-acts .cev-a')
    check('entraînement : « Ateliers » et « Matchs » sur la carte', acts.count() >= 2 and 'ATELIERS' in acts.nth(0).inner_text().upper() and 'MATCHS' in acts.nth(1).inner_text().upper())
    if acts.count():
        acts.nth(0).click(); pg.wait_for_timeout(900)
        check('entraînement : « Ateliers » mène aux ateliers', 'p=ateliers' in pg.url, pg.url)
    b.close()

print('ERREURS JS :', errs[:8] if errs else 'aucune')
ok = sum(1 for r in res if r[1]); print('%d/%d OK (%s)' % (ok, len(res), tag))
sys.exit(0 if ok == len(res) and not errs else 1)
