# Données de l'appareil abîmées : l'appli doit démarrer quand même (cas iPhone du 12/10 : S.kid sans joueur)
import json
from playwright.sync_api import sync_playwright
DEMO='http://localhost:8899/index.html'
res=[]
def check(n,c,i=''): res.append(c); print(('OK  ' if c else 'BAD ')+n, '' if c else i)
CASES={
  'kid sans joueur': {'mc-kid': {'token':'p~abc'}},
  'kid chaîne': {'mc-kid': 'bizarre'},
  'kid joueur null': {'mc-kid': {'token':'p~abc','joueur':None}},
  'adulte sans rôle': {'mc-adult': {'token':'x'}},
  'roster pas une liste': {'mc-roster': {'a':1}},
  'récents pas une liste': {'mc-recents': 'k1', 'mc-kid': {'token':'p~abc'}},
  'me abîmé': {'mc-me': {'kid':'k1'}},
}
with sync_playwright() as p:
    b=p.chromium.launch()
    for name, ls in CASES.items():
        ctx=b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg=ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(DEMO); pg.wait_for_timeout(300)
        pg.evaluate("ls=>{ localStorage.clear(); for (const k in ls) localStorage.setItem(k, JSON.stringify(ls[k])); }", ls)
        for h in ['#/semaine', '#/parent', '#/connexion']:
            pg.goto(DEMO+h); pg.reload(); pg.wait_for_timeout(700)
            ok = pg.query_selector('.kidbtn') is not None or pg.query_selector('#adultzone') is not None
            check('%s · %s → écran utilisable' % (name, h), ok and not errs, (pg.inner_text('#app')[:150], errs))
        ctx.close()
    # une vue qui plante : message + Réessayer + Réparer, pas d'écran vide
    ctx=b.new_context(); pg=ctx.new_page()
    pg.goto(DEMO); pg.wait_for_timeout(500)
    pg.evaluate("()=>{ MC.app.route('/plante', function(){ return undefined.x; }); location.hash='#/plante'; }"); pg.wait_for_timeout(400)
    t=pg.inner_text('#app')
    check('vue qui plante → message, Réessayer, Réparer', 'UN SOUCI' in t.upper() and pg.query_selector('a[href="?reset=1"]') is not None, t[:200])
    # réparer : session abîmée jetée, session adulte saine gardée
    pg.evaluate("()=>{ localStorage.setItem('mc-kid', JSON.stringify({token:'p~x'})); localStorage.setItem('mc-adult', JSON.stringify({token:'t', role:'e', nom:'X'})); localStorage.setItem('mc-recents', JSON.stringify(['k1'])); localStorage.setItem('mc-me', '{}'); }")
    pg.goto(DEMO+'?reset=1'); pg.wait_for_timeout(2000)
    st=pg.evaluate("()=>({kid: localStorage.getItem('mc-kid'), adult: localStorage.getItem('mc-adult'), rec: localStorage.getItem('mc-recents'), me: localStorage.getItem('mc-me'), url: location.href})")
    check('reset=1 : session abîmée jetée, adulte et récents gardés', st['kid'] is None and st['adult'] and st['rec'] and st['me'] is None and '?r=' in st['url'], st)
    # boutons de l'écran d'ouverture
    ctx2=b.new_context(); pg2=ctx2.new_page()
    pg2.route('**/js/app.js*', lambda r: r.abort()); pg2.goto(DEMO); pg2.wait_for_timeout(400)
    check('écran d\'ouverture : 3 boutons', len(pg2.query_selector_all('#bootbtns button'))==3 and pg2.is_visible('#bootbtns'))
    pg2.unroute('**/js/app.js*')
    pg2.evaluate("localStorage.setItem('mc-kid', JSON.stringify({token:'p~x',joueur:{id:'k1'}}))")
    pg2.click('#bootbtns button:has-text("Repartir de zéro")'); pg2.wait_for_timeout(2500)
    check('Repartir de zéro → appli ouverte, tout effacé', pg2.evaluate("localStorage.getItem('mc-kid')") is None and pg2.query_selector('.kidbtn') is not None, pg2.url)
    b.close()
print(sum(res),'OK /',len(res))
