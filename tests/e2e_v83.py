# (v83) Le bilan qui se remplit en plusieurs fois : la date choisie dans le formulaire ne vaut que pour les tests envoyés ;
# ceux déjà envoyés gardent leur jour. Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v83.py 390 844
import sys, os, datetime
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
ilJ = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    def modals():
        while pg.query_selector('.modal button'): pg.click('.modal button >> nth=-1'); pg.wait_for_timeout(300)
    pg.goto(BASE + '#/connexion'); ev('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(350)
    for c in '2580': pg.click('[data-k="%s"] >> visible=true' % c); pg.wait_for_timeout(40)
    pg.wait_for_timeout(1500); modals()
    dates = lambda: ev("(function(){var n=String(MC.logic.currentBilan().n),o={};MC.app.S.me.records.filter(r=>String(r.bilan)===n).forEach(r=>o[r.test]=r.date);return o;})()")
    def envoyer(vals, d):
        ev("(function(v){var b=MC.bilan.ensure(MC.app.S.me); Object.keys(v).forEach(k=>b.v[k]=v[k]); b.nonEnvoye=true; MC.bilan.save();})(%s)" % vals)
        pg.goto(BASE + '#/profil'); pg.wait_for_timeout(300); pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(900)
        pg.fill('#bil_date', d); pg.dispatch_event('#bil_date', 'change'); pg.wait_for_timeout(200)
        pg.click('#bil_send'); pg.wait_for_timeout(1300); modals(); pg.wait_for_timeout(500)
    pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(900)
    lab = pg.inner_text('label[for="bil_date"]')
    check('Le libellé : « Date des tests que tu envoies »', 'TESTS QUE TU ENVOIES' in lab.upper(), lab)
    avant = dates()
    envoyer("{pompes:'9', planche_m:'1', planche_s:'5'}", ilJ(5))
    d = dates()
    check('1er envoi : pompes et planche au jour choisi', d.get('pompes') == ilJ(5) and d.get('planche') == ilJ(5), d)
    envoyer("{squats:'31'}", ilJ(2))
    d = dates()
    check('2e envoi : les squats à leur jour', d.get('squats') == ilJ(2), d)
    check('… les pompes et la planche gardent le leur', d.get('pompes') == ilJ(5) and d.get('planche') == ilJ(5), d)
    check('… et rien d\'autre du bilan n\'a bougé', all(d.get(k) == v for k, v in avant.items() if k not in ('pompes', 'planche', 'squats')), (avant, d))
    # (relecture) sans toucher la date : le jour même (le champ ne reprend plus la date d'un résultat déjà envoyé)
    ev("(function(){var b=MC.bilan.ensure(MC.app.S.me); b.v.chaise_m='0'; b.v.chaise_s='50'; b.nonEnvoye=true; MC.bilan.save();})()")
    pg.goto(BASE + '#/profil'); pg.wait_for_timeout(300); pg.goto(BASE + '#/bilan'); pg.wait_for_timeout(900)
    val = ev("document.getElementById('bil_date').value")
    check('3e envoi : le champ de la date est sur aujourd\'hui', val == ilJ(0), (val, ev("MC.logic.currentBilan().n")))
    pg.click('#bil_send'); pg.wait_for_timeout(1300); modals(); pg.wait_for_timeout(500)
    d = dates()
    check('… la chaise est du jour, les autres gardent le leur', d.get('chaise') == ilJ(0) and d.get('squats') == ilJ(2) and d.get('pompes') == ilJ(5), d)
    b.close()
ok = sum(1 for _, c in res if c)
print('%d/%d' % (ok, len(res)), 'erreurs JS :', errs[:3])
sys.exit(0 if ok == len(res) and not errs else 1)
