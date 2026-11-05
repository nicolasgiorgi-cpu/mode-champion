# (v56) Le bouclier rouge quel que soit le niveau de l'enfant, la compo faite en haut de la page d'un plateau ou d'un entraînement,
# les joueurs par équipe juste sous le nombre d'équipes, Passerelles « Par niveau » ou « Roulant », Copains « Sans ».
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v56.py 390 844 · 1180 820 · 820 1180
import sys, json
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
    for c in '2468': pg.click('#adultzone [data-k="%s"]' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1300)
    if '#/educ/bienvenue' in pg.url:
        for i in range(2): pg.click('[data-act="obNext"]'); pg.wait_for_timeout(300)
        pg.click('[data-act="obPick"] >> nth=0'); pg.wait_for_timeout(200)
        pg.click('[data-act="obEducDone"]'); pg.wait_for_timeout(1000)
    pg.wait_for_timeout(500)

    # ----- la page d'un plateau : la compo faite passe en premier, plus grande, en surbrillance -----
    plateaux = ev("""(() => { const cd = MC.app.S.cache.compos; return cd ? cd.evenements.filter(e => e.sorte === 'plateau').map(e => ({ id: e.id, c: cd.compos.some(c => c.evenementId === e.id && !c.partie && c.statut === 'publiee') })) : null })()""")
    if plateaux is None:
        pg.goto(BASE + '#/educ/plateaux'); pg.wait_for_timeout(900)
        plateaux = ev("""(() => { const cd = MC.app.S.cache.compos; return cd.evenements.filter(e => e.sorte === 'plateau').map(e => ({ id: e.id, c: cd.compos.some(c => c.evenementId === e.id && !c.partie && c.statut === 'publiee') })) })()""")
    avec = [x['id'] for x in plateaux if x['c']]; sans = [x['id'] for x in plateaux if not x['c']]
    check('la démo a un plateau avec compo et un sans', avec and sans, plateaux)
    pg.goto(BASE + '#/educ/evt/' + avec[0]); pg.wait_for_timeout(800)
    pos = ev("""(() => { const c = document.querySelector('.ccompo'), p = document.querySelector('.cpres-card'); const s = c && getComputedStyle(c), t = c && getComputedStyle(c.querySelector('.t1')), t0 = getComputedStyle(p.querySelector('.t1'));
      return c ? { avant: c.getBoundingClientRect().bottom <= p.getBoundingClientRect().top, h: c.getBoundingClientRect().height, hp: p.getBoundingClientRect().height, bord: s.borderTopWidth, fond: s.backgroundColor, ombre: s.boxShadow, tt: parseFloat(t.fontSize), tt0: parseFloat(t0.fontSize), titre: !!c.closest('section').querySelector('h2') } : null })()""")
    check('plateau avec compo : la compo au-dessus des présents', pos and pos['avant'], pos)
    check('plateau avec compo : plus grosse', pos and pos['tt'] > pos['tt0'] and pos['h'] >= 76, pos)
    check('plateau avec compo : en surbrillance (bord et fond), sans ombre de couleur', pos and pos['bord'] == '2px' and pos['fond'] != 'rgba(0, 0, 0, 0)' and pos['ombre'] == 'none', pos)
    check('plateau avec compo : pas de défilement de côté', noscroll())
    pg.goto(BASE + '#/educ/evt/' + sans[0]); pg.wait_for_timeout(800)
    check('plateau sans compo : les présents d\'abord, comme avant', pg.query_selector('.ccompo') is None and ev("""(() => { const p = document.querySelector('.cpres-card'), s = [...document.querySelectorAll('main section.sec h2')].find(h => /compo/i.test(h.textContent)); return p.getBoundingClientRect().bottom <= s.getBoundingClientRect().top })()"""))

    # ----- un entraînement -----
    trains = ev("""(() => { const cd = MC.app.S.cache.compos; return cd.evenements.filter(e => e.sorte === 'entrainement').map(e => ({ id: e.id, n: cd.compos.filter(c => c.evenementId === e.id && c.partie).length })) })()""")
    tc = [x['id'] for x in trains if x['n']]; ts = [x['id'] for x in trains if not x['n']]
    if tc:
        pg.goto(BASE + '#/educ/evt/' + tc[0]); pg.wait_for_timeout(800)
        check('entraînement avec des groupes : ils passent au-dessus des présents, en surbrillance', ev("""(() => { const c = document.querySelector('.cpart.ccompo'), p = document.querySelector('.cpres-card'); return !!c && c.getBoundingClientRect().bottom <= p.getBoundingClientRect().top })()"""))
    else:
        pg.goto(BASE + '#/educ/evt/' + ts[0]); pg.wait_for_timeout(600)
        pg.click('a[href*="ateliers"]'); pg.wait_for_timeout(700)
        print('(pas de groupes publiés dans la démo : on vérifie sans)')
    if ts:
        pg.goto(BASE + '#/educ/evt/' + ts[0]); pg.wait_for_timeout(700)
        check('entraînement sans groupes : les présents d\'abord', pg.query_selector('.ccompo') is None and ev("""(() => { const p = document.querySelector('.cpres-card'), c = document.querySelector('.cpart'); return p.getBoundingClientRect().bottom <= c.getBoundingClientRect().top })()"""))

    # ----- préparer la compo : les joueurs juste sous les équipes, plus de compteur -----
    ev("Object.keys(localStorage).filter(k => k.indexOf('mc-cdraft:') === 0).forEach(k => localStorage.removeItem(k))")
    pg.goto(BASE + '#/educ/compo/' + sans[0]); pg.wait_for_timeout(900)
    ordre = ev("""(() => { const eq = [...document.querySelectorAll('main section.sec')].findIndex(s => s.querySelector('[data-act="cNb"]')), l = [...document.querySelectorAll('main section.sec')]; return { eq, suivant: !!l[eq + 1] && !!l[eq + 1].querySelector('.ctaild') } })()""")
    check('préparer : « Joueurs par équipe » juste sous le nombre d\'équipes', ordre['suivant'], ordre)
    check('préparer : plus de « Montent en A »', 'Montent en A' not in pg.inner_text('main') and pg.query_selector('.cmont') is None)
    vals = ev("""[...document.querySelectorAll('[data-act="cOpt"][data-k="passerelles"]')].map(b => b.textContent)""")
    check('Passerelles : Par niveau ou Roulant', vals == ['Par niveau', 'Roulant'], vals)
    check('plus de ligne « Qui change de niveau »', pg.query_selector('[data-k="change"]') is None and 'Qui change' not in pg.inner_text('main'))
    check('Roulant par défaut', pg.query_selector('[data-act="cOpt"][data-k="passerelles"][data-v="roulant"].on') is not None)
    cop = ev("""[...document.querySelectorAll('[data-act="cOpt"][data-k="copains"]')].map(b => b.textContent)""")
    check('Copains : trois choix, dont Sans', cop == ['Un pour chacun', "Copains d'abord", 'Sans'], cop)
    check('les choix des copains ne débordent pas', ev("""[...document.querySelectorAll('.oseg .opt')].every(e => e.scrollWidth <= e.clientWidth + 1)""") and noscroll())
    # Suivre les niveaux : personne ne change de niveau, plus de lignes passerelles et « qui change »
    pg.click('[data-act="cOpt"][data-k="effectifs"][data-v="niveaux"]'); pg.wait_for_timeout(250)
    check('suivre les niveaux : la ligne Passerelles disparaît', pg.query_selector('[data-k="passerelles"]') is None and pg.query_selector('.ctaild') is None)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(900)
    tous = ev("""(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0), d = JSON.parse(localStorage.getItem(k)).vs[0], F = MC.compos.fiches(MC.app.S.cache.group); return d.equipes.every(t => t.joueurs.every(j => !F[j.id].niveau || F[j.id].niveau === t.niveau)) })()""")
    check('suivre les niveaux : chacun dans son niveau', tous)
    pg.click('[data-act="cDiscard"]'); pg.wait_for_timeout(300); pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(700)
    pg.click('[data-act="cOpt"][data-k="effectifs"][data-v="equilibre"]'); pg.wait_for_timeout(250)

    # ----- une compo en A forte : le bouclier rouge pour tous sous le repère de l'équipe -----
    pg.click('[data-act="cOpt"][data-k="orga"][data-v="aforte"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="cOpt"][data-k="copains"][data-v="sans"]'); pg.wait_for_timeout(200)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(900)
    # un Débutant à 0, posé dans la 1re équipe B de la démo
    donnees = ev("""(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0), l = JSON.parse(localStorage.getItem(k)), d = l.vs[0], F = MC.compos.fiches(MC.app.S.cache.group);
      const eqB = d.equipes.filter(t => t.niveau === 'B'); return { opts: d.reglages.opts, lignes: eqB.flatMap(t => t.joueurs.map(j => ({ id: j.id, niv: F[j.id].niveau, pl: F[j.id].plaquage, prenom: F[j.id].prenom }))) } })()""")
    check('A forte + copains « Sans » : les options gardées', donnees['opts']['orga'] == 'aforte' and donnees['opts']['copains'] == 'sans', donnees['opts'])
    sous = ev("""(() => { const F = MC.compos.fiches(MC.app.S.cache.group), out = []; document.querySelectorAll('.ccol').forEach(col => { const id = col.querySelector('.ctid').textContent; col.querySelectorAll('.cpj').forEach(b => { const f = F[b.getAttribute('data-id')]; out.push({ eq: id, niv: f.niveau, pl: f.plaquage, rouge: !!b.querySelector('.pshield.sous') }); }); }); return out })()""")
    faux = [x for x in sous if x['eq'].startswith('B') and x['pl'] is not None and x['pl'] < 2 and not x['rouge']]
    check('équipe B : tous ceux sous 2 sont en rouge, Débutants compris', not faux, faux)
    deb = [x for x in sous if x['eq'].startswith('B') and x['niv'] == 'C' and x['pl'] is not None and x['pl'] < 2]
    check('la démo a bien un Débutant sous le repère dans une équipe B', len(deb) > 0, sous[:6])
    trop = [x for x in sous if x['eq'].startswith('B') and x['pl'] is not None and x['pl'] >= 2 and x['rouge']]
    check('équipe B : ceux au repère restent normaux', not trop, trop)
    pasA = [x for x in sous if x['eq'].startswith('A') and x['pl'] is not None and x['pl'] < 3 and not x['rouge']]
    check('équipe A : le repère reste 3', not pasA, pasA)
    check('copains « Sans » : pas de cœur sur la compo', pg.query_selector('.cpj .cop-ok, .cpj .cop-no') is None and 'Avec au moins un copain' not in ev("document.querySelector('.coupe, main').innerHTML"))
    check('le résumé dit « sans les copains »', 'sans les copains' in pg.inner_text('.cbopt summary'), pg.inner_text('.cbopt summary'))

    # ----- le haut d'une compo faite : les joueurs juste sous les équipes -----
    pg.click('.cbopt summary'); pg.wait_for_timeout(250)
    suit = ev("""(() => { const eq = document.querySelector('.cbopt .oeq'); return { apres: eq.nextElementSibling && eq.nextElementSibling.classList.contains('otail') } })()""")
    check('en haut de la compo : les joueurs juste sous les équipes', suit['apres'], suit)
    check('en haut de la compo : rien ne déborde', ev("""[...document.querySelectorAll('.cbopt .oli, .cbopt .oseg, .cbopt .opt')].every(e => e.scrollWidth <= e.clientWidth + 1)""") and noscroll())
    pg.click('.cbopt [data-act="cOpt"][data-k="passerelles"][data-v="niveau"]'); pg.wait_for_timeout(300)
    check('changer les passerelles : « pas encore appliquées »', pg.query_selector('.cbopt .cbdiff') is not None)
    pg.click('.cbopt [data-act="cRegen"]'); pg.wait_for_timeout(700)
    o2 = ev("""(() => { const k = Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0); return JSON.parse(localStorage.getItem(k)).vs[0].reglages.opts })()""")
    check('générer : avec « Par niveau »', o2['passerelles'] == 'niveau' and o2['montees'] == 0, o2)
    check('le résumé dit « passerelles par niveau »', 'passerelles par niveau' in ev("document.querySelector('.cbopt .cbsum').textContent"), ev("document.querySelector('.cbopt .cbsum').textContent"))
    pg.click('.cbopt summary .ott') if not ev("document.querySelector('.cbopt').open") else None
    pg.wait_for_timeout(150)
    pg.evaluate("document.querySelector('.cbopt .aide-q[data-aide=\"o-passerelles\"]').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(120)
    pg.click('.cbopt .aide-q[data-aide="o-passerelles"]'); pg.wait_for_timeout(150)
    t = pg.inner_text('.aide-bulle') if pg.query_selector('.aide-bulle') else ''
    check('le « ? » des passerelles explique les deux choix', 'Par niveau' in t and 'Roulant' in t, t)
    check('aucune erreur', not errs, errs)
    b.close()
bad = [n for n, c in res if not c]
print('%d/%d' % (len(res) - len(bad), len(res)), W, H)
sys.exit(1 if bad else 0)
