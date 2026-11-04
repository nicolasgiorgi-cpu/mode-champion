# (v43) L'onglet Enfants (éducs) = directement la fiche terrain du groupe, sans onglets en haut ; « À relancer » dans
# Progrès › Prépa physique (replié) ; une ligne serrée par enfant : prénom, postes en pastilles (★ préférés d'abord ;
# à côté du prénom sur iPad, dessous sur téléphone), niveau, passerelle, bouclier de plaquage ; filtres niveau + poste
# (préférés d'abord, puis « Peuvent aussi jouer ») ; tout s'enregistre au toucher (plus de bouton Enregistrer) ;
# plusieurs postes préférés sur la fiche ; l'onglet « Famille » de la fiche devient « Réglages », avec Spond en bas.
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_enfants.py [largeur hauteur]   (390 844 · 1180 820 · 820 1180)
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/')
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
TAB = W >= 700
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
def nomodal(pg):
    for _ in range(3):
        if pg.query_selector('.modal'): pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
EDUC = "MC.api.call('educsListe',{}).then(l=>MC.api.call('adultLogin',{role:'e',educId:l.educs.find(e=>e.nom==='Coach Nico').id,code:MC.demo.CODES.educ})).then(r=>{MC.app.setAdult({token:r.token,role:r.role,nom:r.nom,admin:r.admin});location.hash=%r})"
HSCROLL = """(() => { const out = []; document.querySelectorAll('#app *').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.push(String(el.className)); }); if (document.scrollingElement.scrollWidth > innerWidth + 1) out.push('PAGE'); return out; })()"""
LIGNE = """(nm) => { const li = [...document.querySelectorAll('#tlist .tfrow')].find(l => l.querySelector('.tnm').textContent.trim() === nm); if (!li) return null;
  const r = li.getBoundingClientRect(), n = li.querySelector('.tnm').getBoundingClientRect(), ps = [...li.querySelectorAll('.tpp')], p0 = ps[0] ? ps[0].getBoundingClientRect() : null, ctl = li.querySelector('.tctl').getBoundingClientRect();
  return { h: Math.round(r.height), pills: ps.map(p => (p.classList.contains('pref') ? '*' : '') + p.textContent.trim()), memeLigne: p0 ? Math.abs((p0.top + p0.height / 2) - (n.top + n.height / 2)) < 6 : null,
    dessous: p0 ? p0.top >= n.bottom - 1 : null, deborde: ps.some(p => p.getBoundingClientRect().right > r.right - 4), ctlDansLigne: ctl.right <= r.right + 1,
    plaq: (li.querySelector('.pshield b') || {}).textContent, niv: (li.querySelector('.tlv.on') || {}).textContent || '' }; }"""
def noms(pg): return pg.evaluate("[...document.querySelectorAll('#tlist > li')].map(l => l.classList.contains('tsep') ? '|' : (l.querySelector('.tnm') || {}).textContent)")

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True)
    ctx.add_init_script('window.__MC_QUIET=1')
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(700)
    pg.evaluate(EDUC % '#/educ/entrainements'); pg.wait_for_timeout(1600); nomodal(pg)
    pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(1000); nomodal(pg)
    check('Enfants : directement la fiche terrain', pg.evaluate('location.hash') == '#/educ/joueurs' and pg.query_selector('#tlist .tfrow') is not None, pg.evaluate('location.hash'))
    txt = pg.inner_text('main')
    check('Enfants : plus d\'onglets Tous / À relancer / Niveaux et postes', not pg.query_selector('main .subtabs') and 'Niveaux et postes' not in txt and 'À RELANCER' not in txt.upper(), txt[:200])
    check('légende courte, une idée par ligne, sans les seuils', pg.locator('.tleg > span').count() == 3 and 'pour jouer en B' not in txt, pg.locator('.tleg > span').count())
    check('pas de bouton Enregistrer', not pg.query_selector('[data-act="tSave"], [data-act="tkSave"]'))
    # une ligne : pastilles (★ d'abord), bouclier
    t = pg.evaluate(LIGNE, 'Tom')
    check('Tom : ses postes préférés ★ d\'abord, puis les autres', t and t['pills'][:2] == ['*Centre', '*Ailier'] and t['pills'][2] == '3e L.', t)
    check('Tom : le bouclier de plaquage avec son niveau (3)', t and t['plaq'] == '3', t)
    check('Tom : niveau B allumé', t and t['niv'] == 'B', t)
    if TAB: check('iPad : les pastilles à côté du prénom, ligne basse', t and t['memeLigne'] and t['h'] <= 48, t)
    else: check('téléphone : les pastilles sous le prénom, ligne compacte', t and t['dessous'] and t['h'] <= 72, t)
    check('tout rentre dans la ligne (pastilles, niveau, passerelle, bouclier)', t and not t['deborde'] and t['ctlDansLigne'], t)
    check('pas de défilement de côté', pg.evaluate(HSCROLL) == [], pg.evaluate(HSCROLL))
    # le graphique : replié, lignes simples (pas de prénoms au toucher), pas de texte dessous
    check('répartition des postes repliée', pg.evaluate("!document.querySelector('details.rpost[data-rp=\"terrain\"]').open"))
    pg.click('details.rpost[data-rp="terrain"] summary'); pg.wait_for_timeout(300)
    check('répartition : plus de prénoms au toucher ni de texte dessous', pg.locator('.rpost[data-rp="terrain"] details.pbarw').count() == 0 and pg.locator('.rpost[data-rp="terrain"] .rpost-c > p').count() == 0 and pg.locator('.rpost[data-rp="terrain"] .pbar').count() == 7)
    pg.click('details.rpost[data-rp="terrain"] summary'); pg.wait_for_timeout(300)
    # filtres : niveau puis poste
    check('filtres : une rangée de niveaux et une rangée de postes', pg.locator('.tfils .tfil').count() == 2 and pg.locator('.tfp button').count() == 8)
    pg.click('.tfp button[data-v="centre"]'); pg.wait_for_timeout(400)
    l = noms(pg)
    sep = l.index('|') if '|' in l else -1
    check('filtre Centre : préférés d\'abord, puis « Peuvent aussi jouer »', sep > 0 and 'Tom' in l[:sep] and 'Arthur' in l[sep:] and pg.locator('#tlist .tsep').count() == 1, l)
    check('filtre Centre : chacun a bien ce poste', all(pg.evaluate(LIGNE, n)['pills'] and any(x.strip('*') == 'Centre' for x in pg.evaluate(LIGNE, n)['pills']) for n in l if n != '|'), l)
    pg.click('.tfil:not(.tfp) button[data-v="A"]'); pg.wait_for_timeout(400)
    l2 = noms(pg)
    check('filtre A + Centre : seulement des A', 'Tom' not in l2 and 'Sacha' in l2, l2)
    pg.click('.tfil:not(.tfp) button[data-v="all"]'); pg.click('.tfp button[data-v="centre"]'); pg.wait_for_timeout(300)
    check('retoucher le poste : tous les postes', pg.locator('#tlist .tsep').count() == 0 and len(noms(pg)) >= 20)
    # enregistré au toucher
    pg.evaluate("window.__calls=[]; const c0 = MC.api.call; MC.api.call = function (a, p) { window.__calls.push([a, JSON.stringify(p && p.lignes || '')]); return c0.apply(this, arguments) }; 1")
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="C"]'); pg.wait_for_timeout(1300)
    calls = pg.evaluate('window.__calls')
    check('toucher un niveau : enregistré tout de suite (sans bouton)', any(c[0] == 'setTerrain' and '"niveau":"C"' in c[1] for c in calls), calls)
    t = pg.evaluate(LIGNE, 'Tom')
    check('… la ligne change, la passerelle vers A (plus voisine) tombe', t['niv'] == 'C' and not pg.query_selector('#tlist .tfrow:has(.tnm:text-is("Tom")) .tpas.on'), t)
    pg.reload(); pg.wait_for_timeout(1500); nomodal(pg)
    check('… et c\'est gardé (rechargé)', pg.evaluate(LIGNE, 'Tom')['niv'] == 'C')
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="B"]'); pg.wait_for_timeout(1200)
    # la fiche : postes préférés multiples, plaquage, tout au toucher
    pg.click('#tlist a.tnm:text-is("Tom")'); pg.wait_for_timeout(1200); nomodal(pg)
    if pg.query_selector('.ftabs a[href$="t=terrain"]:not(.on)'): pg.click('.ftabs a[href$="t=terrain"]'); pg.wait_for_timeout(800)
    check('fiche : ni Modifier ni Enregistrer', not pg.query_selector('[data-act="tkEdit"], [data-act="tkSave"]'))
    check('fiche : 2 postes préférés ★ allumés (Centre, Ailier)', pg.locator('[data-act="tkPref"].on').count() == 2)
    pg.evaluate("window.__calls=[]; const c1 = MC.api.call; MC.api.call = function (a, p) { window.__calls.push([a, JSON.stringify(p && p.lignes || '')]); return c1.apply(this, arguments) }; 1")
    pg.click('[data-act="tkPref"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="tkPl"][data-v="4"]'); pg.wait_for_timeout(1300)
    calls = pg.evaluate('window.__calls')
    check('fiche : un 3e préféré et le plaquage partent ensemble, sans bouton', any(c[0] == 'setTerrain' and 'troisieme-ligne' in c[1] and '"plaquage":4' in c[1] for c in calls), calls)
    check('fiche : 3 préférés ★, bouclier à 4', pg.locator('[data-act="tkPref"].on').count() == 3 and pg.inner_text('.tplq .pshield b') == '4')
    pg.click('[data-act="tkPref"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(1200)
    check('fiche : retoucher un préféré le retire', pg.locator('[data-act="tkPref"].on').count() == 2 and not pg.query_selector('[data-act="tkPoste"][data-v="troisieme-ligne"].on'))
    pg.click('[data-act="tkPoste"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(1200)
    check('fiche : « Peut aussi jouer » 3e ligne', pg.query_selector('[data-act="tkPoste"][data-v="troisieme-ligne"].on') is not None)
    # l'onglet Réglages (ex-Famille) et Spond tout en bas
    check('fiche : l\'onglet « Réglages » (plus « Famille »)', pg.locator('.ftabs a:text-is("Réglages")').count() == 1 and pg.locator('.ftabs a:text-is("Famille")').count() == 0)
    pg.click('.ftabs a:text-is("Réglages")'); pg.wait_for_timeout(900)
    secs = pg.evaluate("[...document.querySelectorAll('main > section.sec h2')].map(h => h.textContent)")
    check('Réglages : Spond tout en bas', secs and secs[-1] == 'Spond', secs)
    pg.click('.ftabs a:text-is("Terrain")'); pg.wait_for_timeout(600)
    check('Terrain : plus de lien Spond ici', 'Son nom dans Spond' not in pg.inner_text('main'))
    # retour à la liste : les pastilles suivent
    pg.goto(BASE + '#/educ/joueurs'); pg.wait_for_timeout(1200); nomodal(pg)
    check('liste : Tom avec 3e L. en « peut aussi jouer »', pg.evaluate(LIGNE, 'Tom')['pills'] == ['*Centre', '*Ailier', '3e L.'], pg.evaluate(LIGNE, 'Tom'))
    # Progrès › Prépa physique : À relancer, replié ; l'ancienne adresse y mène
    pg.goto(BASE + '#/educ/progres'); pg.wait_for_timeout(1200); nomodal(pg)
    check('Progrès : « À relancer » replié', pg.query_selector('details#relancer') is not None and not pg.evaluate("document.getElementById('relancer').open"))
    pg.click('[data-act="relancerOuvrir"]'); pg.wait_for_timeout(700)
    check('Progrès : la tuile ouvre « À relancer »', pg.evaluate("document.getElementById('relancer').open") and pg.locator('#relancer .rel-l li').count() >= 1)
    pg.click('#relancer .rel-l a >> nth=0'); pg.wait_for_timeout(1000)
    check('À relancer : toucher un prénom ouvre sa fiche', pg.evaluate('location.hash').startswith('#/educ/joueur/'), pg.evaluate('location.hash'))
    pg.goto(BASE + '#/educ/joueurs?filtre=late'); pg.wait_for_timeout(1300)
    check('ancienne adresse « à relancer » : Progrès, déplié', pg.evaluate('location.hash').startswith('#/educ/progres') and pg.evaluate("!!document.getElementById('relancer') && document.getElementById('relancer').open"), pg.evaluate('location.hash'))
    pg.goto(BASE + '#/educ/terrain'); pg.wait_for_timeout(1000)
    check('ancienne adresse fiche terrain : l\'onglet Enfants', pg.evaluate('location.hash') == '#/educ/joueurs')
    check('aucune erreur JS', not errs, errs)
    b.close()
ok = sum(1 for _, c in res if c); print('%d/%d' % (ok, len(res)))
sys.exit(0 if ok == len(res) else 1)
