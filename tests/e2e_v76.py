# (v76, lot E6) Le défi d'équipe et les compteurs côté enfant : la jauge commune en haut de Ça bouge (le total, sa part, jusqu'à
# quand), « Mes compteurs » dans Progrès › Records, le badge « Tous ensemble » dans les trophées (gagné par tous quand la jauge
# est pleine, et gardée ; un défi fini sans jauge pleine fait disparaître le badge). Horloge : lundi 23/11 (le défi a commencé le 16/11).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v76.py 390 844 · 1180 820 · 820 1180
import sys, os
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
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1500); modals()

    # ----- Ça bouge : la jauge -----
    pg.click('#nav a[href="#/equipe"]'); pg.wait_for_timeout(1300); modals()
    j = pg.query_selector('.eqdefi')
    check('Ça bouge : le défi d\'équipe en haut', j is not None and pg.query_selector('.eqdefi + *, .eqdefi ~ .eqfil') is not None, j.inner_text() if j else None)
    D = ev("MC.api.call('equipe', { token: MC.app.S.kid.token }).then(r => r.defi)")
    chiffres = lambda x: x.replace('\u202f', '').replace('\u00a0', '').replace(' ', '')
    check('… le total de la démo sur la cible', D is not None and D['total'] > 0 and ('%d/%d' % (D['total'], D['cible'])) in chiffres(j.inner_text()), (D, j.inner_text() if j else None))
    check('… sa part (jamais celle des autres)', 'Ta part' in j.inner_text() and sorted(D.keys()) == ['cible', 'debut', 'fin', 'id', 'moi', 'nom', 'plein', 'quoi', 'total'], D)
    w = ev("parseFloat(document.querySelector('.eqj i').style.width)")
    check('… la jauge remplie à proportion', abs(w - min(100, round(D['total'] / D['cible'] * 100))) <= 1, w)
    check('Ça bouge : pas de défilement de côté', noscroll())

    # ----- Progrès › Records : mes compteurs -----
    pg.goto(BASE + '#/bilans'); pg.wait_for_timeout(1100)
    t = pg.inner_text('main')
    att = ev("MC.logic.compteurs(MC.app.S.me.seances, MC.CONFIG.CYCLES[0].debut)")
    check('Records : « Mes compteurs », depuis septembre', 'Mes compteurs'.upper() in t.upper() and len(att) > 0 and len(pg.query_selector_all('.cpts > span')) == len(att), (att, t[-400:]))
    sq = [c for c in att if c['exo'] == 'squat']
    check('… les squats de ses séances guidées', not sq or ('%dsquats' % sq[0]['n']) in chiffres(pg.inner_text('.cpts')), (sq, pg.inner_text('.cpts')))
    check('Records : pas de défilement de côté', noscroll())

    # ----- le badge : pas encore, puis la jauge pleine (cible abaissée dans la démo) -----
    pg.goto(BASE + '#/trophees'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('Trophées : « Badges d\'équipe », « Tous ensemble » pas encore gagné', 'BADGES D\'ÉQUIPE' in t.upper() and pg.query_selector('.bdg:has-text("Tous ensemble"):not(.on)') is not None)
    # (relecture) un défi fini sans jauge pleine : son badge disparaît des trophées et du compte
    ev("Core._defisEquipe[0].fin = '2026-11-20'"); ev("MC.app.loadMe(true)"); pg.wait_for_timeout(800)
    pg.goto(BASE + '#/trophees'); pg.wait_for_timeout(1000)
    t = pg.inner_text('main')
    check('Défi fini sans jauge pleine : plus de « Tous ensemble » ni de « Badges d\'équipe »', 'Tous ensemble' not in t and 'BADGES D\'ÉQUIPE' not in t.upper(), t[-300:])
    pg.goto(BASE + '#/profil'); pg.wait_for_timeout(900)
    check('… et « N / total badges » sans lui', (' / %d badges' % (ev('MC.CONTENT.BADGES.length') - 1)) in pg.inner_text('main'), pg.inner_text('main')[:600])
    ev("Core._defisEquipe[0].fin = '2026-12-20'"); ev("MC.app.loadMe(true)"); pg.wait_for_timeout(800)
    xp0 = ev('MC.app.S.stats.xp')
    ev("Core._defisEquipe[0].cible = 50")
    ev("MC.app.loadMe(true)"); pg.wait_for_timeout(800)
    pg.goto(BASE + '#/equipe'); pg.wait_for_timeout(1200)
    check('Jauge pleine : « bravo à toute l\'équipe », le badge pour tous', 'Jauge pleine' in pg.inner_text('.eqdefi') and 'Tous ensemble' in pg.inner_text('.eqdefi'), pg.inner_text('.eqdefi'))
    pg.goto(BASE + '#/trophees'); pg.wait_for_timeout(1000)
    check('Trophées : « Tous ensemble » gagné', pg.query_selector('.bdg.on:has-text("Tous ensemble")') is not None)
    check('… et ses XP', ev('MC.app.S.stats.xp') - xp0 == ev('MC.CONTENT.XP.badge'), (xp0, ev('MC.app.S.stats.xp')))
    # (relecture) la jauge pleine est gardée : remonter la cible ne retire pas le badge
    ev("Core._defisEquipe[0].cible = 1000000"); ev("MC.app.loadMe(true)"); pg.wait_for_timeout(800)
    pg.goto(BASE + '#/trophees'); pg.wait_for_timeout(1000)
    check('Jauge pleine gardée : le badge reste', pg.query_selector('.bdg.on:has-text("Tous ensemble")') is not None)
    # (restes du lot E1) « M12 » retiré des titres et de la carte du joueur
    pg.goto(BASE + '#/profil'); pg.wait_for_timeout(1000)
    check('Moi : plus de « M12 » sur la carte', 'M12' not in pg.inner_text('main'))
    pg.goto(BASE + '#/guide'); pg.wait_for_timeout(900)
    check('Aide : plus de « M12 » dans le titre', 'M12' not in pg.inner_text('main .head'))
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
