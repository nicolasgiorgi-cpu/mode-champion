# La barre du haut sur tous les écrans : présente, avec le bouton Retour (sauf les onglets du bas et leurs sous-onglets),
# et toujours visible après avoir fait défiler la page jusqu'en bas.
# Lancer : sh tests/mkdemo.sh puis python3 tests/e2e_barre.py [largeur hauteur]
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8899/'
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
OK, BAD = [], []
def check(name, cond, info=''):
    (OK if cond else BAD).append(name)
    if not cond: print('BAD', name, info)

# onglets du bas : pas de Retour (on y revient par la barre du bas)
RACINES = {'#/educ', '#/educ/entrainements', '#/educ/plateaux', '#/educ/progres', '#/educ/skills', '#/educ/missions', '#/educ/joueurs', '#/educ/terrain', '#/educ/compos', '#/educ/outils',
           '#/parent', '#/parent/bilans', '#/parent/progres', '#/parent/classement', '#/parent/missions', '#/parent/skills', '#/parent/plus',
           '#/semaine', '#/bilans', '#/niveaux', '#/classement', '#/missions', '#/skills', '#/profil'}

def audit(pg, hashes):
    for h in hashes:
        pg.goto(BASE + h); pg.wait_for_timeout(900)
        if pg.query_selector('.modal'):
            pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        hdr = pg.query_selector('header.topbar')
        if not hdr:
            check('barre du haut : ' + h, False, pg.url); continue
        back = hdr.query_selector('[data-back]')
        if h not in RACINES:
            check('bouton Retour : ' + h, back is not None, pg.inner_text('header.topbar')[:60])
        pg.evaluate('window.scrollTo(0, document.scrollingElement.scrollHeight)'); pg.wait_for_timeout(250)
        top = pg.evaluate("(() => { const r = document.querySelector('header.topbar').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; })()")
        # visible en haut de l'écran, et pas recouverte par autre chose
        hit = pg.evaluate("(() => { const r = document.querySelector('header.topbar').getBoundingClientRect(); const el = document.elementFromPoint(r.left + 30, r.top + r.height / 2); return !!(el && el.closest('header.topbar')); })()")
        check('barre visible après défilement : ' + h, top[0] >= -1 and top[1] > 30 and hit, top)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(800)
    # ----- éduc -----
    pg.evaluate("MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash='#/educ'})"); pg.wait_for_timeout(1500)
    tid = pg.evaluate("MC.loadGroup().then(g=>g.joueurs.find(p=>p.joueur.prenom==='Tom').joueur.id)")
    avis = pg.evaluate("MC.loadCompos().then(c=>c.avis[0] && c.avis[0].id)")
    audit(pg, ['#/educ', '#/educ/entrainements', '#/educ/plateaux', '#/educ/progres', '#/educ/skills', '#/educ/missions', '#/educ/joueurs', '#/educ/compos', '#/educ/classement', '#/educ/reglages', '#/educ/joueur/' + tid, '#/educ/ajouter', '#/educ/familles',
               '#/educ/educs', '#/educ/progres/bilans', '#/educ/mission', '#/educ/terrain', '#/educ/evt-nouveau', '#/educ/evt/sp-demo-p3', '#/educ/evt/sp-demo-e1', '#/educ/evt/sp-demo-e1/presents',
               '#/educ/skills/passeport', '#/educ/missions/nouvelle?type=video', '#/educ/missions/nouvelle?type=perso', '#/educ/encourager/' + tid,
               '#/educ/compo/sp-demo-p3', '#/educ/compo/sp-demo-p1', '#/educ/compo/sp-demo-p4', '#/educ/compo/sp-demo-e1?p=ateliers', '#/educ/compo/sp-demo-e0?p=matchs',
               '#/educ/avis/' + avis, '#/educ/nouveautes', '#/educ/spond', '#/guide?pour=educ&de=educ%2Fcompos'])
    # le tableau d'une compo, une fois proposée (long), et la fenêtre « Composer »
    pg.goto(BASE + '#/educ/compo/sp-demo-p3'); pg.wait_for_timeout(700)
    pg.click('[data-act="cPropose"]'); pg.wait_for_timeout(900)
    pg.evaluate('window.scrollTo(0, document.scrollingElement.scrollHeight)'); pg.wait_for_timeout(250)
    check('tableau proposé : barre visible en bas de page', pg.evaluate("(() => { const r = document.querySelector('header.topbar').getBoundingClientRect(); return r.top >= -1 && r.bottom > 30; })()"))
    pg.locator('.ccol >> nth=0 >> .cpj >> nth=0').evaluate('e=>e.click()'); pg.wait_for_timeout(300)
    check('joueur choisi : barre toujours là', pg.evaluate("(() => { const r = document.querySelector('header.topbar').getBoundingClientRect(); const el = document.elementFromPoint(r.left + 30, r.top + r.height / 2); return !!(el && el.closest('header.topbar')); })()"))
    # ----- parent -----
    pg.goto(BASE + '#/educ/reglages'); pg.wait_for_timeout(500)
    pg.evaluate("MC.app.setAdult(null)")
    pg.evaluate("MC.api.call('roster',{}).then(l=>MC.api.call('adultLogin',{role:'f',joueurId:l.joueurs.find(j=>j.prenom==='Tom').id,code:MC.demo.CODES.parent})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash='#/parent'})"); pg.wait_for_timeout(1500)
    audit(pg, ['#/parent', '#/parent/bilans', '#/parent/classement', '#/parent/missions', '#/parent/missions/perso', '#/parent/missions/mots', '#/parent/skills', '#/parent/skills/plaquage', '#/parent/plus', '#/parent/nouveautes'])
    pg.evaluate("MC.app.setAdult(null)")
    # ----- enfant -----
    pg.evaluate("MC.api.call('roster',{}).then(r=>{const k=(r.joueurs||r).find(x=>x.prenom==='Tom'); return MC.api.call('login',{joueurId:k.id,pin:MC.demo.CODES.enfant});}).then(res=>{MC.app.setKid({token:res.token,joueur:res.joueur}); if(res.me) MC.app.setMe(res.me); location.hash='#/semaine';})"); pg.wait_for_timeout(1500)
    T = pg.evaluate("(() => { const J = MC.CONTENT.JOURS, k = Object.keys(J); return { maison: k.filter(x => J[x].maison), autre: k.filter(x => !J[x].maison), exo: Object.keys(MC.CONTENT.EXOS)[0], defi: (MC.CONTENT.DEFI_TESTS || [])[0] }; })()")
    defi = T['defi'] if isinstance(T['defi'], str) else (T['defi'] or {}).get('id', 'x')
    audit(pg, ['#/semaine', '#/bilans', '#/profil', '#/classement', '#/progression', '#/niveaux', '#/trophees', '#/bilan', '#/reglages', '#/aide', '#/missions', '#/missions/perso', '#/missions/mots', '#/skills', '#/skills/passe', '#/mission', '#/mission/postes', '#/mission/copains', '#/nouveautes', '#/echauffement',
               '#/calme', '#/jour/' + T['maison'][0], '#/jour/' + T['autre'][0], '#/exo/' + T['exo'], '#/noter?type=club', '#/mission/poste/pilier', '#/mission/quiz', '#/defi/' + defi, '#/guide', '#/bienvenue'])
    # la séance guidée elle-même (plein écran) : un moyen d'en sortir en haut
    pg.goto(BASE + '#/go/' + T['maison'][0]); pg.wait_for_timeout(1200)
    if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    print('séance :', pg.evaluate("(() => { const h = document.querySelector('header.topbar'); const x = document.querySelector('[data-act=\"goQuit\"], [data-act=\"sQuit\"], .sq, [aria-label*=\"Quitter\"], [aria-label*=\"Retour\"]'); return [!!h, x ? (x.getAttribute('aria-label') || x.textContent).slice(0, 40) : null]; })()"))
    print('ERREURS JS:', errs[:3])
    print('%d/%d OK' % (len(OK), len(OK) + len(BAD)), 'ÉCHECS:', BAD)
    b.close()
