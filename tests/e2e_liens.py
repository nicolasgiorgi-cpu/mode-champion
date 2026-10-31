# (v37) Toucher une alerte du téléphone ou une ligne de la cloche mène à l'endroit précis, le détail ouvert :
# la séance sur la fiche (éduc) ou dans le suivi (parent), la ligne de l'enfant dépliée dans une mission (même avec le
# filtre « Pas encore »), ses niveaux, la carte des bravos (enfant) ; arriver par une alerte rend « lue » SA ligne de la
# cloche (pas les autres), y compris quand l'appli s'ouvre (?al=1, retiré de l'adresse).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_liens.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def nb(pg):
    el = pg.query_selector('.topbar [data-cloche] .tb-nb')
    return el.inner_text() if el else ''
def visible(pg, sel):
    return pg.evaluate("(function(s){var e=document.querySelector(s); if(!e) return null; var r=e.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight * 0.8;})('%s')" % sel)
def ouvert(pg, sel):
    return pg.evaluate("(function(s){var e=document.querySelector(s); var d=e && e.querySelector('details'); return d ? d.open : null;})('%s')" % sel)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=True, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1800)
    g = pg.evaluate("(function(){var g=MC.app.S.cache.group;return g.joueurs.map(function(p){return {id:p.joueur.id,nom:p.joueur.prenom,s:(p.seances||[]).slice().sort(function(a,b){return a.cree<b.cree?1:-1;}).map(function(s){return {id:s.id,mode:s.mode,date:s.date};}),poste:(p.missions||[]).some(function(m){return m.mission==='jeu10'&&m.reponses&&m.reponses.postes&&m.reponses.postes.length;})};});})()")
    tom = [x for x in g if x['nom'] == 'Tom'][0]
    # ----- la fiche : une séance ancienne (dans « Voir les plus anciennes »), son détail ouvert -----
    vieille = [s for s in tom['s'] if s['mode'] == 'guidee'][-1]
    sel = 'li[data-cible="s-%s"]' % vieille['id']
    pg.goto(BASE + '#/educ/joueur/%s?t=prepa&c=s-%s' % (tom['id'], vieille['id'])); pg.wait_for_timeout(2800)
    check('fiche : la séance visée est à l\'écran', visible(pg, sel) is True, visible(pg, sel))
    check('fiche : son détail est ouvert (exercices, séries)', ouvert(pg, sel) is True, ouvert(pg, sel))
    check('fiche : « Voir les plus anciennes » ouvert pour elle', pg.evaluate("(function(){var e=document.querySelector('%s'),d=e&&e.closest('details.more');return d?d.open:'pas dedans';})()" % sel) in (True, 'pas dedans'))
    pg.goto(BASE + '#/educ/joueur/%s?t=prepa&c=niveaux' % tom['id']); pg.wait_for_timeout(1800)
    check('fiche : « ses niveaux » à l\'écran', visible(pg, '[data-cible="niveaux"]') is True)
    pg.goto(BASE + '#/educ/joueur/%s?t=prepa&c=bilans' % tom['id']); pg.wait_for_timeout(1500)
    check('fiche : « bilans » à l\'écran', visible(pg, '[data-cible="bilans"]') is True)
    check('fiche : les résultats à confirmer montrés d\'abord (avant la progression)', pg.evaluate("(function(){var e=document.querySelector('[data-cible=bilans]');return e?e.tagName+'|'+/confirmer/i.test(e.innerText):null;})()") == 'DIV|true', pg.evaluate("(function(){var e=document.querySelector('[data-cible=bilans]');return e?e.tagName:null;})()"))
    # ----- la mission « Choisis ton poste » : la ligne de l'enfant dépliée, même avec « Pas encore » -----
    kid = [x for x in g if x['poste'] and x['nom'] != 'Tom']
    if kid:
        k = kid[-1]
        pg.goto(BASE + '#/educ/mission/poste'); pg.wait_for_timeout(1300)
        pg.click('[data-act="msnFiltre"][data-v="todo"]'); pg.wait_for_timeout(500)
        check('mission : filtre « Pas encore » : la ligne de l\'enfant n\'y est pas', pg.query_selector('li[data-cible="j-%s"]' % k['id']) is None)
        pg.goto(BASE + '#/educ/mission/poste?c=j-%s' % k['id']); pg.wait_for_timeout(1800)
        s2 = 'li[data-cible="j-%s"]' % k['id']
        check('mission : arrivé par le lien, la ligne de ' + k['nom'] + ' est là (filtre remis à Tous)', pg.query_selector(s2) is not None)
        check('mission : sa ligne est dépliée (son détail)', ouvert(pg, s2) is True)
        check('mission : à l\'écran', visible(pg, s2) is True)
        pg.click('[data-act="msnFiltre"][data-v="todo"]'); pg.wait_for_timeout(500)
        check('mission : après une arrivée par lien, le filtre « Pas encore » marche', pg.get_attribute('[data-act="msnFiltre"][data-v="todo"]', 'aria-pressed') == 'true' and 'c=' not in pg.url, pg.url)
        pg.click('[data-act="msnFiltre"][data-v="all"]'); pg.wait_for_timeout(300)
    # un bilan ou un défi d'un enfant dont l'éduc n'est pas le parent : « N attendent sa famille » d'abord
    autre = pg.evaluate("(function(){var g=MC.app.S.cache.group;var p=g.joueurs.filter(function(x){return x.enAttente>0&&(g.moi.enfants||[]).indexOf(x.joueur.id)<0;})[0];return p?p.joueur.id:null;})()")
    if autre:
        pg.goto(BASE + '#/educ/joueur/%s?t=prepa&c=bilans' % autre); pg.wait_for_timeout(2000)
        check('bilan d\'un autre enfant : la note « … attendent sa famille » montrée d\'abord', pg.evaluate("(function(){var e=document.querySelector('[data-cible=bilans]');return e?e.tagName+'|'+/attend/.test(e.innerText):null;})()") == 'DIV|true')
    # ----- la cloche : une ligne mène à l'endroit précis ; arriver par l'alerte rend SA ligne lue -----
    pg.goto(BASE + '#/educ/entrainements'); pg.wait_for_timeout(900)
    pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    r1 = pg.evaluate("MC.app.kidCall('logSession', { type: 'club', date: MC.logic.today(), mode: 'rapide' })"); pg.wait_for_timeout(400)
    r2 = pg.evaluate("MC.app.kidCall('logSession', { type: 'recup', date: MC.logic.today(), mode: 'rapide' })"); pg.wait_for_timeout(400)
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(900); pin(pg, codes['educ']); pg.wait_for_timeout(1800)
    pg.evaluate("MC.loadGroup(true)"); pg.wait_for_timeout(1000); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1200)
    check('2 séances de Tom : la cloche dit 2', nb(pg) == '2', nb(pg))
    lien1 = '#/educ/joueur/%s?t=prepa&c=s-%s' % (tom['id'], r1['seance']['id'])
    pg.evaluate("MC.alertes.aller('%s')" % lien1); pg.wait_for_timeout(1800)
    check('toucher l\'alerte (appli ouverte) : la fiche, sur la séance', lien1 in pg.url and visible(pg, 'li[data-cible="s-%s"]' % r1['seance']['id']) is True, pg.url)
    check('… sa ligne de la cloche est lue : 1 nouveauté de moins', nb(pg) == '1', nb(pg))
    # appli fermée : sw.js l'ouvre sur le lien avec « ?al=1 »
    lien2 = '#/educ/joueur/%s?t=prepa&c=s-%s' % (tom['id'], r2['seance']['id'])
    pg.goto(BASE.replace('index.html', '') + '?al=1' + lien2); pg.wait_for_timeout(2800)
    check('appli ouverte par l\'alerte : « ?al=1 » retiré de l\'adresse', 'al=1' not in pg.url and lien2 in pg.url, pg.url)
    check('… la séance visée à l\'écran', visible(pg, 'li[data-cible="s-%s"]' % r2['seance']['id']) is True)
    check('… et sa ligne de la cloche lue : plus de nouveauté', nb(pg) == '', nb(pg))
    # une ligne de la cloche
    pg.goto(BASE + '#/educ/notifs'); pg.wait_for_timeout(1500)
    pg.click('.ntl a.nt[href*="c=s-%s"]' % r1['seance']['id']); pg.wait_for_timeout(1800)
    check('cloche : toucher la ligne mène à la séance', ('c=s-' + r1['seance']['id']) in pg.url and visible(pg, 'li[data-cible="s-%s"]' % r1['seance']['id']) is True, pg.url)
    # le même lien une 2e fois (une autre alerte vers le même endroit) : on remontre
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(900)
    pg.evaluate("MC.alertes.aller('%s'); 0" % lien1); pg.wait_for_timeout(1800)
    pg.evaluate("window.scrollTo(0, 0); 0"); pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(900)
    pg.evaluate("MC.alertes.aller('%s'); 0" % lien1); pg.wait_for_timeout(1800)
    check('le même lien une 2e fois : la séance est remontrée', visible(pg, 'li[data-cible="s-%s"]' % r1['seance']['id']) is True and pg.evaluate('scrollY') > 0, pg.evaluate('scrollY'))
    # Retour vers un écran atteint par un lien : le défilement de la personne est gardé (pas de nouveau saut)
    pg.mouse.wheel(0, -5000); pg.wait_for_timeout(600)
    y0 = pg.evaluate('scrollY')
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1200)
    pg.go_back(); pg.wait_for_timeout(1800)
    check('Retour : pas de nouveau saut vers la cible (défilement gardé)', abs(pg.evaluate('scrollY') - y0) < 60, (y0, pg.evaluate('scrollY')))
    # appli déjà ouverte, données en mémoire d'avant l'alerte : l'alerte les relit
    pg.goto(BASE + '#/educ/mission/poste'); pg.wait_for_timeout(1300)
    pg.evaluate("MC.app.kidCall('mission', { mission: 'jeu10', postes: ['talonneur'] }); 0"); pg.wait_for_timeout(700)
    pg.evaluate("MC.alertes.aller('#/educ/mission/poste?c=j-%s'); 0" % tom['id']); pg.wait_for_timeout(2500)
    tl = pg.evaluate("(function(){var e=document.querySelector('li[data-cible=\"j-%s\"]');return e?e.innerText:'';})()" % tom['id'])
    check('appli ouverte : la ligne de Tom montre sa réponse toute fraîche (Talonneur)', 'alonneur' in tl, tl[:200])
    check('… dépliée', ouvert(pg, 'li[data-cible="j-%s"]' % tom['id']) is True)
    # un serveur lent (réponse après 8 s) : la séance est montrée quand elle arrive
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(900)
    r3 = pg.evaluate("MC.app.kidCall('logSession', { type: 'dupont', date: MC.logic.today(), mode: 'rapide' })"); pg.wait_for_timeout(500)
    pg.evaluate("window.__call = MC.api.call; MC.api.call = function (a, p, o) { var r = window.__call(a, p, o); return a === 'group' || a === 'kid' ? new Promise(function (ok, ko) { setTimeout(function () { r.then(ok, ko); }, 8000); }) : r; }; 0")
    lien3 = '#/educ/joueur/%s?t=prepa&c=s-%s' % (tom['id'], r3['seance']['id'])
    pg.evaluate("MC.alertes.aller('%s'); 0" % lien3); pg.wait_for_timeout(11000)
    check('serveur lent (8 s) : la séance est montrée quand elle arrive', visible(pg, 'li[data-cible="s-%s"]' % r3['seance']['id']) is True)
    pg.evaluate("MC.api.call = window.__call; 0")
    # ----- le parent de Tom -----
    pg.evaluate("MC.app.setAdult(null)"); pg.goto(BASE + '#/adultes'); pg.wait_for_timeout(700)
    pg.click('[data-act="adultWho"][data-w="f"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="adultPick"][data-nom="Tom"]'); pg.wait_for_timeout(300); pin(pg, codes['parent']); pg.wait_for_timeout(1800)
    vp = [s for s in tom['s'] if s['mode'] == 'guidee'][2] if len([s for s in tom['s'] if s['mode'] == 'guidee']) > 2 else tom['s'][-1]
    pg.goto(BASE + '#/parent?k=%s&c=s-%s' % (tom['id'], vp['id'])); pg.wait_for_timeout(2500)
    sp = 'li[data-cible="s-%s"]' % vp['id']
    check('parent : la séance visée à l\'écran', visible(pg, sp) is True, pg.url)
    check('parent : son détail ouvert', ouvert(pg, sp) in (True, None), ouvert(pg, sp))
    pg.goto(BASE + '#/parent/bilans?k=%s&c=niveaux' % tom['id']); pg.wait_for_timeout(1800)
    check('parent : « ses niveaux » à l\'écran', visible(pg, '[data-cible="niveaux"]') is True)
    # ----- l'enfant : la carte des bravos -----
    pg.goto(BASE + '#/parent'); pg.wait_for_timeout(900); pg.click('.tb-pass'); pg.wait_for_timeout(1800)
    pg.goto(BASE + '#/semaine?c=bravos'); pg.wait_for_timeout(1800)
    check('enfant : la carte des bravos à l\'écran', visible(pg, '[data-cible="bravos"]') is True)
    check('pas de défilement de côté', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    b.close()
bad = [n for n, c in res if not c]
print('e2e_liens %dx%d : %d/%d' % (W, H, len(res) - len(bad), len(res)), len(bad), 'BAD', 'ERREURS JS :', errs or 'aucune')
