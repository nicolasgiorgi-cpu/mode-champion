# (v63) Demandes de Nicolas du 09/11/2026 : épurer les textes côté éduc (« Légende et gestes » repliés en haut de la compo, sauf la
# toute première fois ; plus de paragraphes d'explication sur la page d'un événement, « Préparer la compo » et les présents) ;
# « Partager » sur une compo publiée : le texte des équipes pour WhatsApp (éducs seulement).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v63.py 390 844 · 1180 820 · 820 1180
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/index.html'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    # pas de partage du téléphone dans le navigateur de test : la copie, qu'on relit
    pg.add_init_script("try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (e) {} window.__copie = null; try { navigator.clipboard.writeText = function (t) { window.__copie = t; return Promise.resolve(); }; } catch (e) {}")
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
    txt = lambda: pg.inner_text('main')

    # ----- 1. la page d'un plateau : plus de paragraphes d'explication -----
    pg.goto(BASE + '#/educ/evt/sp-demo-p3'); pg.wait_for_timeout(1000)
    t = txt()
    check('plateau : le conseil d\'équipes sur une ligne', 'Conseillé' in t and 'Une proposition en un geste' not in t, t[:400])
    check('plateau : plus de « Un éduc publie… », ni « Depuis Spond », ni « toucher pour corriger »', 'Un éduc publie' not in t and 'Depuis Spond' not in t and 'toucher pour corriger' not in t.lower())
    check('plateau : la carte des présents garde les absents et les sans réponse', 'sans réponse' in pg.inner_text('.cpres-card'), pg.inner_text('.cpres-card'))
    check('plateau : plus de « un toucher = +1 »', 'un toucher = +1' not in t)
    pg.goto(BASE + '#/educ/evt/sp-demo-e1'); pg.wait_for_timeout(1000)
    t = txt()
    check('entraînement : ateliers et matchs « À préparer », sans paragraphe', t.count('À préparer') == 2 and 'D\'abord les groupes' not in t, t[:500])
    pg.goto(BASE + '#/educ/evt/sp-demo-p3/presents'); pg.wait_for_timeout(800)
    check('présents : une consigne courte', 'Touchez un prénom pour corriger.' in txt() and 'la correction reste' not in txt())

    # ----- 2. préparer la compo : les réglages sans leurs paragraphes -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(1200)
    t = txt()
    check('préparer : plus de paragraphe sous le format ni sous les boutons', 'chaque joueur a son poste du plateau' not in t and 'Tout se déplace ensuite' not in t and '« Poste par poste » :' not in t)
    check('préparer : les trois boutons sont là', all(pg.query_selector('[data-act="%s"]' % a) is not None for a in ('cPropose', 'cPropose2', 'cZero10')))
    # (10/11) « Suivre les niveaux » : la taille moyenne des équipes reste dite, en une ligne
    pg.click('[data-act="cOpt"][data-k="effectifs"][data-v="niveaux"]'); pg.wait_for_timeout(400)
    check('préparer, « Suivre les niveaux » : « environ N joueurs par équipe » en une ligne', pg.query_selector('.ctailn') is not None and 'environ' in pg.inner_text('.ctailn') and 'joueurs par équipe' in pg.inner_text('.ctailn'), txt()[:600])
    pg.click('[data-act="cOpt"][data-k="effectifs"][data-v="equilibre"]'); pg.wait_for_timeout(400)
    check('… plus de cette ligne avec les effectifs équilibrés (le réglage par équipe est là)', pg.query_selector('.ctailn') is None and pg.query_selector('.ctaild') is not None)
    # (10/11) « Tout le groupe » : ceux qui n'ont pas répondu sur Spond seront marqués « (?) » dans le texte partagé
    pg.click('[data-act="cBase"][data-v="tous"]'); pg.wait_for_timeout(500)

    # ----- 3. la compo : « Légende et gestes » ouverts la toute première fois, repliés ensuite -----
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1500)
    check('1re fois sur l\'appareil : « Légende et gestes » ouverts', ev("document.querySelector('.caide').open") is True and pg.is_visible('.caide .clegend'))
    check('… et retenu sur l\'appareil', ev("localStorage.getItem('mc-caide')") is not None)
    ev("document.querySelectorAll('.cpj[data-id]')[1].click()"); pg.wait_for_timeout(400)
    check('… ils restent ouverts quand la compo se redessine', ev("document.querySelector('.caide').open") is True)
    ev("document.querySelectorAll('.cpj[data-id]')[1].click()"); pg.wait_for_timeout(300)
    ev("document.querySelector('.caide summary').click()"); pg.wait_for_timeout(300)
    ev("document.querySelectorAll('.cpj[data-id]')[1].click()"); pg.wait_for_timeout(400)
    check('refermés à la main : ils restent fermés quand la compo se redessine', ev("document.querySelector('.caide').open") is False)
    ev("document.querySelectorAll('.cpj[data-id]')[1].click()"); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_timeout(1600)
    a = ev("(() => { const d = document.querySelector('.caide'), s = d.querySelector('summary').getBoundingClientRect(); return { open: d.open, h: Math.round(s.height), leg: !!d.querySelector('.clegend'), txt: d.querySelector('summary').textContent.trim(), vis: d.querySelector('.clegend').checkVisibility() }; })()")
    check('ensuite : repliés sous une ligne « Légende et gestes » (44 px au moins sous le doigt), la légende toujours dans la page', a['open'] is False and a['h'] >= 44 and a['leg'] and a['txt'] == 'Légende et gestes' and a['vis'] is False, a)
    y = ev("document.querySelector('.ccol').getBoundingClientRect().top + scrollY")
    if W < 700: check('téléphone : la 1re équipe commence dans le premier écran (%d px)' % y, y < H - 150, y)
    check('le brouillon tient sur une ligne', ev("document.querySelector('.cstate.draft').getBoundingClientRect().height") <= 44 and 'Publiez-le quand il vous va' not in txt())
    check('pas de bouton « Partager » sur un brouillon', pg.query_selector('[data-act="cPartager"]') is None)
    check('pas de défilement de côté', noscroll())

    # ----- 4. une compo publiée : « Partager » donne le texte des équipes -----
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(700)
    pg.click('.modal button:has-text("Publier")'); pg.wait_for_timeout(2200)
    check('compo publiée : « Partager » à côté de « Modifier la compo »', pg.is_visible('[data-act="cPartager"]') and pg.is_visible('[data-act="cEditer"]'))
    r = ev("(() => { const a = document.querySelector('[data-act=cPartager]').getBoundingClientRect(), b = document.querySelector('[data-act=cEditer]').getBoundingClientRect(); return { memeLigne: Math.abs(a.top - b.top) < 4, h: Math.round(a.height) }; })()")
    check('… sur la même ligne, 44 px au moins', r['memeLigne'] and r['h'] >= 44, r)
    check('compo publiée : plus de « Pour ajuster les équipes… »', 'Pour ajuster les équipes' not in txt())
    pg.click('[data-act="cPartager"]'); pg.wait_for_timeout(600)
    cp = ev('window.__copie') or ''
    attendu = ev("""(() => { const c = MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p3' && c.statut === 'publiee'), F = MC.compos.fiches(MC.app.S.cache.group);
      return { n: c.equipes.map(t => t.id), prenoms: c.equipes.flatMap(t => t.joueurs.map(j => F[j.id].prenom)) }; })()""")
    check('le texte : le titre du plateau, le jeu à 10, chaque équipe', cp.startswith('*Plateau 3 - Muret*') and 'Compo · jeu à 10' in cp and all('*Équipe %s*' % n in cp for n in attendu['n']), cp[:300])
    check('le texte : tous les enfants placés, par poste', all(x in cp for x in attendu['prenoms']) and 'Piliers : ' in cp and '\n9 : ' in cp and '\n10 : ' in cp, cp)
    check('le texte : ni plaquage, ni copains, ni passerelles', not any(x in cp for x in ('plaquage', 'copain', '⇅', 'passerelle')))
    natt = ev("[...new Set([...document.querySelectorAll('.ccol .cpj.att, .ccol .cpj:has(.chors)')].map(x => x.getAttribute('data-id')))].length")
    check('tout le groupe : « (?) » dans le texte pour chaque enfant sans réponse placé (%d), et la ligne qui l\'explique' % natt, natt >= 1 and cp.count(' (?)') == natt and '(?) : présence pas encore confirmée' in cp, cp)
    check('un message dit que c\'est copié', 'copiée' in (ev("(document.querySelector('.toast') || {}).innerText") or ''))
    check('pas de défilement de côté (compo publiée)', noscroll())

    # ----- 5. les ateliers publiés : « Partager » donne les groupes -----
    pg.goto(BASE + '#/educ/compo/sp-demo-e1?p=ateliers'); pg.wait_for_timeout(1200)
    check('ateliers : les choix gardent une ligne d\'explication courte', 'Un groupe peut réunir deux niveaux voisins' not in txt() and 'Tout se déplace ensuite' not in txt())
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(1500)
    pg.click('[data-act="cPublish"]'); pg.wait_for_timeout(700)
    pg.click('.modal button:has-text("Publier")'); pg.wait_for_timeout(2200)
    ev('window.__copie = null'); pg.click('[data-act="cPartager"]'); pg.wait_for_timeout(600)
    cp = ev('window.__copie') or ''
    check('ateliers : le texte des groupes, sans postes', 'Groupes des ateliers' in cp and '*Groupe ' in cp and 'Piliers' not in cp, cp[:300])

    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d' % (len(res) - len(bad), len(res)), '· erreurs JS :', errs)
sys.exit(1 if bad or errs else 0)
