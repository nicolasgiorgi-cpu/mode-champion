# (v35) Les postes côté éducs : Enfants › Niveaux et postes (filtres sur une ligne, « Sans niveau » qui disparaît quand
# tout le monde a son niveau, la répartition des postes repliée qui suit le filtre), la répartition des présents avant
# un plateau et avant les matchs, et les matchs d'entraînement avec des postes (changer le poste d'un enfant pour ce match).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_postes.py [largeur hauteur]   (aussi 360 780)
import sys, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
errs = []; res = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def pin(pg, code, sel='#adultzone'):
    for c in code: pg.click(sel + ' [data-k="%s"]' % c); pg.wait_for_timeout(50)
def ev(pg, js): return pg.evaluate(js)
def sans_debord(pg): return pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
def une_ligne(pg, sel): return pg.evaluate("(s => { const l = [...document.querySelectorAll(s)].map(b => Math.round(b.getBoundingClientRect().top)); return l.length > 1 && new Set(l).size === 1; })('%s')" % sel)
def barres(pg, cle):
    return pg.evaluate("""k => [...document.querySelectorAll('details[data-rp="' + k + '"] .pbar')].map(b => [b.children[0].textContent, b.querySelector('.n').textContent])""", cle)
def attendu(pg, filtre):
    # ce que la fiche terrain dit (postes réglés, pas les vœux) pour les enfants du filtre
    return pg.evaluate("""f => { const K = MC.compos, F = K.fiches(MC.app.S.cache.group);
      const ids = Object.keys(F).filter(id => F[id].actif && !/^test$/i.test(F[id].prenom) && (f === 'all' || (F[id].niveau || '') === (f === 'none' ? '' : f)));
      const R = K.repartition(ids, F); return [ids.length, R.postes.map(p => p.princ.length + (p.autres.length ? '+' + p.autres.length : '')), R.sans.length]; }""", filtre)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#/adultes'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(900)
    codes = pg.evaluate('MC.demo.CODES')
    pg.click('[data-act="adultWho"][data-w="e"]'); pg.wait_for_timeout(400)
    pg.click('[data-act="adultPick"][data-nom="Coach Nico"]'); pg.wait_for_timeout(300); pin(pg, codes['educ']); pg.wait_for_timeout(1500)
    # ----- 1. Niveaux et postes : les filtres sur une ligne -----
    pg.goto(BASE + '#/educ/terrain'); pg.wait_for_timeout(1200)
    n0, att0, sans0 = attendu(pg, 'all')
    nsn = ev(pg, "(() => { const F = MC.compos.fiches(MC.app.S.cache.group); return Object.keys(F).filter(id => F[id].actif && !/^test$/i.test(F[id].prenom) && !F[id].niveau).length; })()")
    check('filtres : Tous, Sans niveau, A, B, C', len(pg.query_selector_all('.tfil .opt')) == 5 and nsn > 0, (len(pg.query_selector_all('.tfil .opt')), nsn))
    check('filtres : sur une seule ligne', une_ligne(pg, '.tfil:not(.rpf) .opt'))
    check('… chaque bouton sur une hauteur raisonnable (pas de 3 lignes)', ev(pg, "Math.max(...[...document.querySelectorAll('.tfil .opt')].map(b => b.getBoundingClientRect().height))") <= 56)
    check('pas de défilement de côté', sans_debord(pg))
    # ----- 2. la répartition des postes : repliée, puis ouverte ; elle suit le filtre -----
    d = pg.query_selector('details[data-rp="terrain"]')
    check('« Répartition des postes » là, repliée', d is not None and not ev(pg, "document.querySelector('details[data-rp=\"terrain\"]').open"))
    check('… le résumé : Tous · ' + str(n0) + ' enfants', d is not None and ('Tous · %d enfants' % n0) in d.inner_text(), d.inner_text() if d else '')
    pg.click('details[data-rp="terrain"] > summary'); pg.wait_for_timeout(300)
    bb = barres(pg, 'terrain')
    check('ouverte : les 7 postes, dans l\'ordre du jeu à 10', [x[0] for x in bb] == ['Pilier', 'Talonneur', '3e ligne', 'Demi de mêlée', 'Ouvreur', 'Centre', 'Ailier'], bb)
    check('… les nombres = la fiche terrain (principal + peut aussi jouer)', [x[1] for x in bb] == att0, ([x[1] for x in bb], att0))
    t = pg.inner_text('details[data-rp="terrain"]')
    check('… « pas encore de poste réglé » quand il y en a', (sans0 == 0) == ('Pas encore de poste réglé' not in t), (sans0, t[-200:]))
    pg.click('details[data-rp="terrain"] .pbarw >> nth=0'); pg.wait_for_timeout(250)
    check('toucher un poste : les prénoms', 'Poste principal' in pg.inner_text('details[data-rp="terrain"] .pbarw >> nth=0') or 'Personne' in pg.inner_text('details[data-rp="terrain"] .pbarw >> nth=0'))
    check('ouverte : pas de défilement de côté', sans_debord(pg))
    pg.click('[data-act="tFiltre"][data-v="A"]'); pg.wait_for_timeout(400)
    nA, attA, _ = attendu(pg, 'A')
    check('filtre A : toujours ouverte, résumé « Niveau A »', ev(pg, "document.querySelector('details[data-rp=\"terrain\"]').open") and ('Niveau A · %d' % nA) in pg.inner_text('details[data-rp="terrain"] > summary'), pg.inner_text('details[data-rp="terrain"] > summary'))
    check('filtre A : les postes des A seulement', [x[1] for x in barres(pg, 'terrain')] == attA, ([x[1] for x in barres(pg, 'terrain')], attA))
    pg.click('[data-act="tFiltre"][data-v="C"]'); pg.wait_for_timeout(400)
    check('filtre C : les postes des C', [x[1] for x in barres(pg, 'terrain')] == attendu(pg, 'C')[1])
    # ----- 3. tout le monde a son niveau : « Sans niveau » disparaît -----
    pg.click('[data-act="tFiltre"][data-v="none"]'); pg.wait_for_timeout(400)
    ids = ev(pg, "[...document.querySelectorAll('#tlist .tfrow')].map(r => r.querySelector('[data-act=tNiv]').getAttribute('data-id'))")
    for i in ids: pg.click('[data-act="tNiv"][data-id="%s"][data-v="C"]' % i); pg.wait_for_timeout(150)
    check('niveaux donnés, pas encore enregistrés : « Sans niveau » reste (on voit qui on vient de régler)', pg.query_selector('[data-act="tFiltre"][data-v="none"]') is not None)
    pg.click('[data-act="tSave"]'); pg.wait_for_timeout(1200)
    check('enregistré : plus de « Sans niveau », retour à « Tous »', pg.query_selector('[data-act="tFiltre"][data-v="none"]') is None and ev(pg, "document.querySelector('[data-act=tFiltre][data-v=all]').classList.contains('on')"))
    check('4 filtres, toujours sur une ligne', len(pg.query_selector_all('.tfil .opt')) == 4 and une_ligne(pg, '.tfil:not(.rpf) .opt'))
    # ----- 4. avant un plateau : les postes des présents -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    check('plateau : « Répartition des postes » des présents, repliée', pg.query_selector('details[data-rp="plateau"]') is not None and 'présents' in pg.inner_text('details[data-rp="plateau"] > summary'))
    pg.click('details[data-rp="plateau"] > summary'); pg.wait_for_timeout(300)
    pg.click('[data-act="rpNiv"][data-k="plateau"][data-v="B"]'); pg.wait_for_timeout(400)
    check('plateau : filtre B, toujours ouverte', ev(pg, "document.querySelector('details[data-rp=\"plateau\"]').open") and 'Niveau B' in pg.inner_text('details[data-rp="plateau"] > summary'))
    check('plateau : filtres Tous / A / B / C sur une ligne', une_ligne(pg, '.tfil.rpf .opt'))
    check('plateau : pas de défilement de côté', sans_debord(pg))
    # ----- 5. les matchs d'entraînement : avec des postes -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=matchs'); pg.wait_for_timeout(1300)
    t = pg.inner_text('main')
    check('matchs : « jeu à 10 », chacun son poste du match', 'Jeu à 10' in t and 'poste du match' in t, t[:400])
    check('matchs : la répartition des présents', pg.query_selector('details[data-rp="matchs"]') is not None)
    pg.click('[data-act="cEN"][data-k="nbMatchs"][data-d="-1"]') if ev(pg, "!document.querySelector('[data-act=cEN][data-k=nbMatchs][data-d=\"-1\"]').disabled") else None
    pg.wait_for_timeout(200)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1500)
    d0 = ev(pg, "(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')); return JSON.parse(localStorage.getItem(k)).vs[0]; })()")
    check('matchs proposés au jeu à 10', d0['reglages']['format'] == 10, d0['reglages'])
    pl = [[j['poste'] for j in t['joueurs']] for t in d0['equipes']]
    check('chaque équipe : ses 10 places prises (les autres remplaçants)', all(len([x for x in l if x]) == min(10, len(l)) for l in pl), pl)
    check('le tableau : « Av …/5 · Ar …/5 » et les postes sur les joueurs', '/5' in pg.inner_text('.cboard2') and len(pg.query_selector_all('.ccol .cpj .cpo')) >= 10)
    check('matchs : pas de défilement de côté', sans_debord(pg))
    # changer le poste d'un enfant, juste pour ce match (même un poste qui n'est pas sur sa fiche)
    j = ev(pg, """(() => { const F = MC.compos.fiches(MC.app.S.cache.group), k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')), d = JSON.parse(localStorage.getItem(k)).vs[0];
      for (const t of d.equipes) for (const x of t.joueurs) if (x.poste && MC.compos.postesDe(F[x.id]).indexOf('ailier') < 0 && x.poste !== 'ailier') return x.id; return null; })()""")
    pg.click('.ccol .cpj[data-id="%s"]' % j); pg.wait_for_timeout(400)
    check('toucher un joueur : les 7 postes et « Remp. »', len(pg.query_selector_all('[data-act="cPoste"]')) == 8)
    pg.click('[data-act="cPoste"][data-p="ailier"]'); pg.wait_for_timeout(500)
    d1 = ev(pg, "(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.endsWith(':matchs')); return JSON.parse(localStorage.getItem(k)).vs[0]; })()")
    pj = [x['poste'] for t in d1['equipes'] for x in t['joueurs'] if x['id'] == j]
    check('… ailier pour ce match, même si ce n\'est pas sur sa fiche', pj == ['ailier'], pj)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(400)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1300)
    cm = ev(pg, "MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-e1' && c.partie === 'matchs')")
    check('matchs publiés avec leurs postes', cm is not None and cm['reglages']['format'] == 10 and [x['poste'] for t in cm['equipes'] for x in t['joueurs'] if x['id'] == j] == ['ailier'], cm and cm['reglages'])
    # ----- 6. (relecture) le plateau suivant garde le format des plateaux (pas celui des matchs d'entraînement) -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1300)
    check('plateau après des matchs au jeu à 10 : toujours « Jeu à 5 » (le dernier plateau)', ev(pg, "document.querySelector('[data-act=cFmt][data-v=\"5\"]').classList.contains('on')"))
    # ----- 7. (relecture) matchs « partir de zéro » : « + Ajouter un joueur » le met à une place, pas remplaçant -----
    # un entraînement à venir, sans matchs encore : créé pour l'essai
    eid = ev(pg, """MC.api.call('setEvenement', { token: MC.app.S.adult.token, titre: 'Entraînement - Essai', debut: MC.logic.addDays(MC.logic.today(), 9), presents: MC.app.S.cache.group.joueurs.filter(p => p.joueur.actif).slice(0, 14).map(p => p.joueur.id) }).then(r => r.evenement.id)""")
    pg.evaluate("MC.loadCompos && MC.loadCompos(true)"); pg.wait_for_timeout(800)
    pg.goto(BASE + '#/educ/compo/' + eid + '?p=matchs'); pg.wait_for_timeout(1300)
    pg.click('[data-act="cZero"]'); pg.wait_for_timeout(900)
    sl = ev(pg, "[...document.querySelectorAll('.ccol')[0].querySelectorAll('.cslot')].map(x => x.textContent).join('|')")
    check('équipe vide de match : « + Ajouter un joueur » (pas « + Remplaçant »)', '+ Ajouter un joueur' in sl and 'Remplaçant' not in sl, sl)
    pg.locator('.ccol >> nth=0 >> .cslot:has-text("Ajouter un joueur")').evaluate('e => e.click()'); pg.wait_for_timeout(500)
    pg.click('.modal .cprow >> nth=0'); pg.wait_for_timeout(400)
    if pg.query_selector('.modal button:has-text("Terminé")'): pg.click('.modal button:has-text("Terminé")'); pg.wait_for_timeout(500)
    po = ev(pg, "[...document.querySelectorAll('.ccol')[0].querySelectorAll('.cpj .cpo')].map(x => x.textContent).join(',')")
    check('… le joueur ajouté a un poste du match', po != '' and 'Remp' not in po, po)
    # déplacer un enfant de « Pas placés » vers l'équipe : une place, pas remplaçant (tout le monde joue)
    pid = ev(pg, "(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('%s:matchs') > 0); return JSON.parse(localStorage.getItem(k)).vs[0].banc[0]; })()" % eid)
    pg.locator('.cpj[data-id="%s"]' % pid).first.evaluate('e => e.click()'); pg.wait_for_timeout(300)
    pg.click('[data-act="cMove"][data-t="E1"]'); pg.wait_for_timeout(500)
    d2 = ev(pg, "(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('%s:matchs') > 0); return JSON.parse(localStorage.getItem(k)).vs[0]; })()" % eid)
    pp = [x['poste'] for t in d2['equipes'] for x in t['joueurs'] if x['id'] == pid]
    check('déplacé dans une petite équipe de match : un poste, pas remplaçant', pp and pp[0] != '', pp)
    check('matchs à la main : pas de défilement de côté', sans_debord(pg))
    b.close()
bad = [n for n, c in res if not c]
print('ERREURS JS :', errs[:4] if errs else 'aucune')
print('%d/%d' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad or errs else 0)
