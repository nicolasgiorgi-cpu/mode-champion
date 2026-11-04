# (04/11, v42) Page « en double » sur iPad (iPadOS 26, appli installée) pendant le tirer pour actualiser et les rebonds :
# la page (#app) ne passait sur sa propre couche graphique que le temps d'un geste ; à chaque aller-retour, l'ancienne image
# de la page restait dans le fond de l'écran et se voyait à travers la page (transparente), même l'écran d'avant.
# Correctif : #app opaque, au moins de la hauteur de l'écran, sur sa couche EN PERMANENCE (jamais retirée), plus de calque
# de fond fixe (.bgfx). Et le même comportement partout : sur iPad comme sur téléphone, la page descend avec le doigt
# (la v41 avait un comportement à part sur tablette : retiré).
# Chromium ne reproduit pas le défaut de Safari : ce test vérifie que les conditions qui le causaient n'existent plus.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_tirer.py [largeur hauteur]   (390 844 · 1180 820 · 820 1180)
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1180, 820)
FOND = 'rgb(7, 10, 18)'   # --bg
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def nomodal(pg):
    for _ in range(3):
        if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
EDUC = "MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
KID = "MC.api.call('roster',{}).then(r=>{const k=(r.joueurs||r).find(x=>x.prenom==='Tom'); return MC.api.call('login',{joueurId:k.id,pin:MC.demo.CODES.enfant});}).then(res=>{MC.app.setKid({token:res.token,joueur:res.joueur}); if(res.me) MC.app.setMe(res.me); location.hash=%r;})"
PARENT = "MC.api.call('roster',{}).then(l=>MC.api.call('adultLogin',{role:'f',joueurId:l.joueurs.find(j=>j.prenom==='Tom').id,code:MC.demo.CODES.parent})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
# la page : déplacement, couche, fond, hauteur ; le repère
ETAT = """(() => { const a = document.getElementById('app'), cs = getComputedStyle(a), p = document.querySelector('.ptr');
  return { tr: a.style.transform || '', top: Math.round(a.getBoundingClientRect().top), wc: cs.willChange, fond: cs.backgroundColor,
    haut: a.getBoundingClientRect().height >= innerHeight - 1, prep: !!document.querySelector('.eb-prep'), bgfx: !!document.querySelector('.bgfx'),
    cls: p ? p.className : '', txt: p ? p.textContent : '', ecrans: a.querySelectorAll('.screen').length }; })()"""
def couche(e): return e['wc'] == 'transform' and e['fond'] == FOND and not e['prep'] and not e['bgfx']

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET=1')
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    def touch(t, x, y): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y}]})
    # glisser de y0 sur dist px (positif : vers le bas), doigt tenu ; renvoie les états pendant le geste et juste avant de lâcher
    def glisse(y0, dist, n=28):
        x = W // 2 + (60 if W >= 700 else 0); touch('touchStart', x, y0); vus = []
        for k in range(1, n + 1):
            touch('touchMove', x, y0 + dist * k / n); pg.wait_for_timeout(16)
            if k % 7 == 0: vus.append(pg.evaluate(ETAT))
        return pg.evaluate(ETAT), vus
    def lacher(): touch('touchEnd', 0, 0)
    pg.goto(BASE); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(700)
    cas = [('enfant', KID, '#/semaine', 'me', '#/profil'), ('parent', PARENT, '#/parent', 'family', '#/parent/plus'), ('éduc', EDUC, '#/educ/joueurs', 'group', '#/educ/reglages')]
    for qui, login, hh, action, autre in cas:
        pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(600)
        pg.evaluate(login % hh); pg.wait_for_timeout(1600); nomodal(pg); pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(300)
        avant = pg.evaluate(ETAT)
        check(qui + ' : la page est opaque, sur sa couche, au moins de la hauteur de l\'écran, sans calque de fond fixe', couche(avant) and avant['haut'], avant)
        pg.evaluate("window.__calls=[]; if (!window.__c0) { window.__c0 = MC.api.call; MC.api.call = function (a) { window.__calls.push(a); return window.__c0.apply(this, arguments) }; } 1")
        # tirer pour actualiser : la page descend avec le doigt, à toutes les tailles (comme sur téléphone)
        st, vus = glisse(230, 260)
        check(qui + ' : en tirant, la page descend avec le doigt (même comportement sur iPad et téléphone)', 'translate3d' in st['tr'] and st['top'] > avant['top'] + 60 and 'fixe' not in st['cls'], st)
        check(qui + ' : pendant le tirer, la page reste opaque et sur sa couche', all(couche(v) for v in vus + [st]), [(v['wc'], v['fond'], v['prep']) for v in vus + [st]])
        check(qui + ' : « Lâche / Relâchez pour actualiser »', 'ctualiser' in st['txt'] and 'go' in st['cls'].split(), st['txt'])
        lacher(); pg.wait_for_timeout(1900)
        apres = pg.evaluate(ETAT)
        check(qui + ' : actualisé (' + action + ' redemandé au serveur)', action in pg.evaluate('window.__calls'), pg.evaluate('window.__calls'))
        check(qui + ' : la page revient en place et reste sur sa couche (jamais retirée)', apres['tr'] == '' and apres['top'] == avant['top'] and couche(apres) and apres['ecrans'] == 1, apres)
        # tirer pas assez : le repère remonte en glissant ; re-tirer aussitôt : la page ne saute pas à zéro en plein geste
        pg.evaluate("window.__tr = []; window.__mo = new MutationObserver(() => window.__tr.push(document.getElementById('app').style.transform || '')); window.__mo.observe(document.getElementById('app'), { attributes: true, attributeFilter: ['style'] }); 1")
        # (départ tout en haut, dans la barre : pendant que la page revient, le doigt ne tombe pas sur un champ de saisie)
        glisse(40, 150); lacher(); pg.wait_for_timeout(20)
        e = pg.evaluate(ETAT)
        check(qui + ' : tirer pas assez puis lâcher : le repère remonte en glissant', 'ptr-back' in e['cls'].split(), e['cls'])
        pg.evaluate('window.__tr = []'); st, vus = glisse(40, 200); lacher(); pg.wait_for_timeout(900)
        tr = pg.evaluate('window.__mo.disconnect(); window.__tr')
        debut = next((i for i, t in enumerate(tr) if t), None)
        fin = max((i for i, t in enumerate(tr) if t), default=-1)
        check(qui + ' : re-tirer aussitôt : la page ne saute pas à zéro en plein geste', debut is not None and all(tr[i] for i in range(debut, fin + 1)), tr)
        # rebond en bas de page
        pg.evaluate('scrollTo(0, document.documentElement.scrollHeight)'); pg.wait_for_timeout(300)
        st, vus = glisse(int(H * 0.7), -int(H * 0.4), 14)
        check(qui + ' : rebond en bas : la page monte, opaque et sur sa couche', st['tr'].startswith('translate3d(0px, -') and all(couche(v) for v in vus + [st]), st)
        lacher(); pg.wait_for_timeout(2000)
        e = pg.evaluate(ETAT)
        check(qui + ' : après le rebond, la page reste sur sa couche (plus de retrait au bout de 1,5 s)', e['tr'] == '' and couche(e), e)
        # changer d'écran : toujours opaque et sur sa couche
        pg.evaluate('location.hash = %r' % autre); pg.wait_for_timeout(1000); nomodal(pg)
        e = pg.evaluate(ETAT)
        check(qui + ' : autre écran (' + autre + ') : opaque et sur sa couche', couche(e) and e['haut'] and e['ecrans'] == 1, e)
    check('aucune erreur JS', not errs, errs)
    b.close()
ok = sum(1 for _, c in res if c); print('%d/%d' % (ok, len(res)))
sys.exit(0 if ok == len(res) else 1)
