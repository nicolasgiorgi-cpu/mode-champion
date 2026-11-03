# (03/11, v41) Tirer pour actualiser sur tablette : la page ne bouge plus (sur iPad, appli installée, en paysage,
# toute la page apparaissait en double, superposée et décalée, pendant qu'on tirait). Seul le repère descend,
# par-dessus le haut de l'écran, centré sur la page (pas sous les onglets de gauche en paysage), et l'actualisation
# marche toujours. Sur téléphone, rien ne change : la page descend avec le doigt.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_tirer.py [largeur hauteur] [dossier pour les captures]
# Tailles : 390 844 · 1180 820 · 820 1180 ; iPad en écran partagé (moins de 700 px) : IPAD=1 python3 tests/e2e_tirer.py 507 820
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1180, 820)
SHOTS = sys.argv[3] if len(sys.argv) > 3 else ''
IPAD = os.environ.get('IPAD') == '1'   # un iPad (qui se présente comme un Mac tactile), même étroit
TAB = W >= 700 or IPAD
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def nomodal(pg):
    for _ in range(3):
        if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
EDUC = "MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
KID = "MC.api.call('roster',{}).then(r=>{const k=(r.joueurs||r).find(x=>x.prenom==='Tom'); return MC.api.call('login',{joueurId:k.id,pin:MC.demo.CODES.enfant});}).then(res=>{MC.app.setKid({token:res.token,joueur:res.joueur}); if(res.me) MC.app.setMe(res.me); location.hash=%r;})"
PARENT = "MC.api.call('roster',{}).then(l=>MC.api.call('adultLogin',{role:'f',joueurId:l.joueurs.find(j=>j.prenom==='Tom').id,code:MC.demo.CODES.parent})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
# l'état pendant qu'on tire : la page (#app) et le repère
ETAT = """(() => { const a = document.getElementById('app'), p = document.querySelector('.ptr'), s = a.querySelector('.screen'), tb = a.querySelector('.topbar');
  const pr = p ? p.getBoundingClientRect() : null, sr = s.getBoundingClientRect(), nav = document.getElementById('nav'), nr = nav && !nav.hidden ? nav.getBoundingClientRect() : null;
  const cx = pr ? pr.left + pr.width / 2 : 0, cy = pr ? pr.top + pr.height / 2 : 0;
  // le repère ne prend pas les touchers (pointer-events: none) : on le rend touchable le temps de voir ce qui est au-dessus
  if (p) p.style.pointerEvents = 'auto'; const hit = pr ? document.elementFromPoint(cx, cy) : null; if (p) p.style.pointerEvents = '';
  return { tr: a.style.transform || '', wc: getComputedStyle(a).willChange, top: Math.round(a.getBoundingClientRect().top), tbTop: Math.round(tb.getBoundingClientRect().top),
    cls: p ? p.className : '', txt: p ? p.textContent : '', op: p ? parseFloat(getComputedStyle(p).opacity) : 0, ptop: pr ? Math.round(pr.top) : -1, pbot: pr ? Math.round(pr.bottom) : -1,
    pleft: pr ? Math.round(pr.left) : -1, cx: Math.round(cx), scx: Math.round(sr.left + sr.width / 2), navRight: nr && nr.height > nr.width ? Math.round(nr.right) : 0,
    dessus: !!(hit && p && p.contains(hit)) }; })()"""

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET=1')
    if IPAD: ctx.add_init_script("Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' }); Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });")
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    def touch(t, x, y): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y}]})
    # tirer franchement (~260 px de doigt en 0,45 s) ; renvoie l'état juste avant de lâcher, et les états pendant le geste
    def pull(dist, n=28):
        x = W // 2 + (60 if TAB else 0); touch('touchStart', x, 230); vus = []
        for k in range(1, n + 1):
            touch('touchMove', x, 230 + dist * k / n); pg.wait_for_timeout(16)
            if k % 7 == 0: vus.append(pg.evaluate(ETAT))
        st = pg.evaluate(ETAT); return st, vus
    def lacher(): touch('touchEnd', 0, 0)
    pg.goto(BASE); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(700)
    cas = [('enfant', KID, '#/semaine', 'me'), ('parent', PARENT, '#/parent', 'family'), ('éduc', EDUC, '#/educ/entrainements', 'group')]
    for qui, login, hh, action in cas:
        pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(600)
        pg.evaluate(login % hh); pg.wait_for_timeout(1600); nomodal(pg); pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(300)
        avant = pg.evaluate(ETAT)
        pg.evaluate("window.__calls=[]; if (!window.__c0) { window.__c0 = MC.api.call; MC.api.call = function (a) { window.__calls.push(a); return window.__c0.apply(this, arguments) }; } 1")
        st, vus = pull(260)
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'tirer_%s_%dx%d.png' % (qui.replace('é', 'e'), W, H)))
        if TAB:
            check(qui + ' : la page ne bouge pas pendant qu\'on tire', all(v['tr'] == '' and v['top'] == avant['top'] and v['tbTop'] == avant['tbTop'] for v in vus + [st]), [(v['tr'], v['top'], v['tbTop']) for v in vus + [st]])
            check(qui + ' : la page n\'est pas mise sur sa propre couche', all(v['wc'] == 'auto' for v in vus + [st]), [v['wc'] for v in vus + [st]])
            check(qui + ' : le repère est visible, par-dessus la barre du haut', 'fixe' in st['cls'] and st['op'] >= 0.99 and st['ptop'] >= 0 and st['dessus'], st)
            check(qui + ' : le repère descend avec le doigt', vus[0]['ptop'] < vus[-1]['ptop'] <= st['ptop'] + 1, [v['ptop'] for v in vus] + [st['ptop']])
            check(qui + ' : le repère est centré sur la page', abs(st['cx'] - st['scx']) <= 2, (st['cx'], st['scx']))
            if st['navRight']: check(qui + ' : le repère ne passe pas sous les onglets de gauche', st['pleft'] > st['navRight'], (st['pleft'], st['navRight']))
        else:
            check(qui + ' (téléphone) : la page descend avec le doigt, comme avant', 'translate3d' in st['tr'] and st['top'] > avant['top'] and 'fixe' not in st['cls'], st)
        check(qui + ' : « Lâche / Relâchez pour actualiser »', 'ctualiser' in st['txt'] and 'go' in st['cls'].split(), st['txt'])
        lacher(); pg.wait_for_timeout(250)
        if TAB: check(qui + ' : pendant le chargement, la page reste en place', pg.evaluate(ETAT)['tr'] == '' and pg.evaluate(ETAT)['top'] == avant['top'])
        if TAB and qui == 'enfant' and W >= 1000:
            # l'iPad tourne pendant le chargement : le repère « À jour » reste centré sur la page
            pg.set_viewport_size({'width': H, 'height': W}); pg.wait_for_timeout(450)
            e = pg.evaluate(ETAT)
            check('l\'iPad tourne pendant le chargement : le repère reste centré sur la page', e['op'] > 0.5 and abs(e['cx'] - e['scx']) <= 2, e)
            pg.set_viewport_size({'width': W, 'height': H}); pg.wait_for_timeout(300)
        pg.wait_for_timeout(1500)
        apres = pg.evaluate(ETAT)
        check(qui + ' : actualisé (' + action + ' redemandé au serveur)', action in pg.evaluate('window.__calls'), pg.evaluate('window.__calls'))
        check(qui + ' : tout est revenu en place', apres['tr'] == '' and apres['top'] == avant['top'] and apres['op'] < 0.01, apres)
        check(qui + ' : un seul écran affiché', pg.evaluate("document.querySelectorAll('#app .screen').length") == 1 and pg.evaluate("document.querySelectorAll('#app .topbar').length") == 1)
        # tirer pas assez : rien n'est redemandé, le repère s'en va
        pg.evaluate('window.__calls=[]')
        st, vus = pull(150); lacher(); pg.wait_for_timeout(600)
        apres = pg.evaluate(ETAT)
        check(qui + ' : tirer pas assez ne redemande rien', 'Relâchez' not in st['txt'] and 'Lâche' not in st['txt'] and pg.evaluate('window.__calls') == [], (st['txt'], pg.evaluate('window.__calls')))
        check(qui + ' : … et le repère s\'en va', apres['op'] < 0.01 and apres['tr'] == '', apres)
    check('aucune erreur JS', not errs, errs)
    b.close()
ok = sum(1 for _, c in res if c); print('%d/%d' % (ok, len(res)))
sys.exit(0 if ok == len(res) else 1)
