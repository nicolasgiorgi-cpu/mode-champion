# (v79) Une valeur du bilan garde sa version (mini matériel ou complète) : changer « Mode mini matériel » en cours de bilan
# ne fait jamais passer un résultat mini pour la vraie épreuve (des sauts par-dessus la ligne comptés comme de la corde, des
# tirages comme des tractions). Bilan guidé, récapitulatif, formulaire et envoi. Horloge : jeudi 12/11 (Bilan 1).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v79.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.clock.set_fixed_time('2026-11-12T10:00:00')
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    def mode(m): ev("m => MC.app.kidCall('updateMe', { materiel: m }).then(r => MC.app.setMe(r))", m); pg.wait_for_timeout(800)
    def taper(sel, v): ev("([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }", [sel, v]); pg.wait_for_timeout(300)
    def valeur(tid): return ev("tid => MC.bilan.values(MC.app.S.me).find(v => v.test === tid) || null", tid)
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1500); modals()

    # ----- bilan guidé en mini matériel : la corde d'affilée devient « Sauts par-dessus la ligne » -----
    mode('mini')
    pg.goto(BASE + '#/bilan/go'); pg.wait_for_timeout(1200)
    pg.click('[data-act="brWarmDone"]'); pg.wait_for_timeout(600)
    ev("MC.act.brGoto({ getAttribute: () => '10' })"); pg.wait_for_timeout(600)
    check('Mini matériel : le test 10 est « Sauts par-dessus la ligne d\'affilée »', 'PAR-DESSUS LA LIGNE' in pg.inner_text('main').upper(), pg.inner_text('main')[:200])
    for _ in range(25): ev("MC.act.brPlus()")
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="brSkipEssai"]'); pg.wait_for_timeout(800)
    v = valeur('corde')
    check('… noté : 25, version mini', v is not None and v['valeur'] == 25 and (v.get('extra') or {}).get('sm') is True, v)

    # ----- on repasse en matériel complet : le résultat reste celui de la version mini -----
    mode('complet')
    v = valeur('corde')
    check('Matériel complet ensuite : le résultat reste « version mini » (pas compté comme de la corde)', v is not None and (v.get('extra') or {}).get('sm') is True, v)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(600); pg.goto(BASE + '#/bilan/go'); pg.wait_for_timeout(1200); modals()
    t = pg.inner_text('main')
    check('Récapitulatif : le test 10 garde le nom de la version faite', 'Sauts par-dessus la ligne d\'affilée' in t and '25' in t, t[:600])
    # « Refaire » en matériel complet : la vraie épreuve, et la valeur devient la version complète
    pg.click('[data-act="brGoto"][data-i="10"]'); pg.wait_for_timeout(600)
    check('… « Refaire » en matériel complet : la vraie épreuve (corde)', 'CORDE' in pg.inner_text('main').upper() and 'PAR-DESSUS' not in pg.inner_text('main').upper())
    for _ in range(40): ev("MC.act.brPlus()")
    pg.click('[data-act="brOk"]'); pg.wait_for_timeout(500)
    pg.click('[data-act="brSkipEssai"]'); pg.wait_for_timeout(800)
    v = valeur('corde')
    check('… refait : 40 sauts de corde, version complète', v is not None and v['valeur'] == 40 and not (v.get('extra') or {}).get('sm'), v)

    # ----- le formulaire : une valeur tapée prend la version du moment, et la garde -----
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000); modals()
    taper('#b_tract', '4')
    mode('mini')
    v = valeur('tract')
    check('Formulaire : 4 tractions tapées en matériel complet restent des tractions après le passage en mini', v is not None and v['valeur'] == 4 and not (v.get('extra') or {}).get('sm'), v)
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(500); pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000)
    lab = pg.inner_text('#row_tract')
    check('… et la ligne garde le nom « Tractions sans élastique »', 'Tractions sans élastique' in lab and 'Tirages' not in lab, lab)
    taper('#b_corde1', '30')
    v = valeur('corde1')
    check('… une valeur tapée en mini : version mini', v is not None and (v.get('extra') or {}).get('sm') is True, v)

    # (relecture) corriger dans le formulaire une valeur de l'autre version : elle prend la version du moment, et le nom suit tout de suite
    mode('complet')
    pg.goto(BASE + '#/semaine'); pg.wait_for_timeout(500); pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(1000)
    avant = pg.inner_text('#nm_corde1')
    taper('#b_corde1', '35')
    apres = pg.inner_text('#nm_corde1'); v = valeur('corde1')
    check('Formulaire : corriger « Sauts par-dessus la ligne en 1 min » en matériel complet → « Corde : sauts en 1 minute », tout de suite', 'par-dessus' in avant and 'Corde : sauts en 1 minute' in apres and v['valeur'] == 35 and not (v.get('extra') or {}).get('sm'), (avant, apres, v))
    taper('#b_corde1', '30'); mode('mini'); taper('#b_corde1', '30')

    # ----- l'envoi : chaque résultat part avec sa version -----
    ev("() => { MC.bilan.submit(null); }"); pg.wait_for_timeout(2500); modals()
    recs = ev("MC.app.S.me.records.filter(r => r.bilan === '1' && ['corde', 'tract', 'corde1'].includes(r.test)).map(r => [r.test, r.valeur, !!(r.extra && r.extra.sm)]).sort()")
    check('Envoi : corde 40 (complète), corde1 30 (mini), tractions 4 (complètes)', recs == [['corde', 40, False], ['corde1', 30, True], ['tract', 4, False]], recs)
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
