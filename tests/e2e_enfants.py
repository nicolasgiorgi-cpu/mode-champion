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
  return { h: Math.round(r.height), pills: ps.map(p => (p.classList.contains('pref') ? '*' : '') + p.textContent.replace('préféré ', '').trim()), memeLigne: p0 ? Math.abs((p0.top + p0.height / 2) - (n.top + n.height / 2)) < 6 : null,
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
    check('pastille préférée : « préféré » lu par le lecteur d\'écran', pg.locator('#tlist .tpp.pref .sr-only').count() >= 2)
    check('Tom : le bouclier de plaquage avec son niveau (2, sur 3)', t and t['plaq'] == '2', t)
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
    tronq = pg.evaluate("[...document.querySelectorAll('.tfils .opt span')].filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => e.textContent)")
    check('filtres : aucun nom de poste coupé (« Centre », pas « CENT… »)', tronq == [], tronq)
    vx = pg.evaluate("[...document.querySelectorAll('#tlist .tfrow')].filter(l => l.querySelector('.tpp.voeu')).map(l => l.querySelectorAll('.tpp.pref').length)")
    check('vœux (postes pas encore réglés) : en contour, sans ★', len(vx) >= 1 and all(n == 0 for n in vx), vx)
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
    # (relecture) retoucher le niveau allumé ne l'efface pas (ni la passerelle)
    pg.evaluate("window.__calls=[]; window.__c0 = MC.api.call; MC.api.call = function (a, p) { window.__calls.push([a, JSON.stringify(p && p.lignes || '')]); return window.__c0.apply(this, arguments) }; 1")
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="B"]'); pg.wait_for_timeout(900)
    check('retoucher le niveau allumé : rien ne change, rien ne part', pg.evaluate(LIGNE, 'Tom')['niv'] == 'B' and not any(c[0] == 'setTerrain' for c in pg.evaluate('window.__calls')), pg.evaluate('window.__calls'))
    # (relecture) une réponse du serveur ne ferme pas le clavier de « Chercher un prénom »
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="A"]'); pg.wait_for_timeout(100)
    pg.click('#tq'); pg.keyboard.type('To', delay=450); pg.wait_for_timeout(900)
    check('après un toucher, la recherche garde le clavier (pas redessinée)', pg.evaluate("document.activeElement && document.activeElement.id === 'tq' && document.activeElement.value === 'To'") and any(c[0] == 'setTerrain' and '"niveau":"A"' in c[1] for c in pg.evaluate('window.__calls')), pg.evaluate("[document.activeElement && document.activeElement.id, document.getElementById('tq').value]"))
    pg.fill('#tq', ''); pg.wait_for_timeout(400)
    # (relecture) pas de réseau : la ligne revient à ce qui était enregistré, avec un message
    pg.evaluate("MC.api.call = function (a, p) { if (a === 'setTerrain') return Promise.reject(Object.assign(new Error('Pas de réseau'), { code: 'reseau' })); return window.__c0.apply(this, arguments) }; 1")
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="C"]'); pg.wait_for_timeout(150)
    tout = pg.evaluate(LIGNE, 'Tom')['niv']
    pg.wait_for_timeout(1200)
    check('pas de réseau : C tout de suite, puis retour à A et « pas enregistré »', tout == 'C' and pg.evaluate(LIGNE, 'Tom')['niv'] == 'A' and 'pas enregistré' in pg.inner_text('#toast'), [tout, pg.evaluate(LIGNE, 'Tom')['niv'], pg.inner_text('#toast')])
    pg.evaluate("MC.api.call = window.__c0; 1")
    pg.click('#tlist .tfrow:has(.tnm:text-is("Tom")) .tlv[data-v="B"]'); pg.wait_for_timeout(1200)
    # la fiche : postes préférés multiples, plaquage, tout au toucher
    pg.click('#tlist a.tnm:text-is("Tom")'); pg.wait_for_timeout(1200); nomodal(pg)
    if pg.query_selector('.ftabs a[href$="t=terrain"]:not(.on)'): pg.click('.ftabs a[href$="t=terrain"]'); pg.wait_for_timeout(800)
    check('fiche : ni Modifier ni Enregistrer', not pg.query_selector('[data-act="tkEdit"], [data-act="tkSave"]'))
    check('fiche : 2 postes préférés ★ allumés (Centre, Ailier)', pg.locator('[data-act="tkPref"].on').count() == 2)
    pg.evaluate("window.__calls=[]; const c1 = MC.api.call; MC.api.call = function (a, p) { window.__calls.push([a, JSON.stringify(p && p.lignes || '')]); return c1.apply(this, arguments) }; 1")
    pg.click('[data-act="tkPref"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="tkPl"][data-v="1"]'); pg.wait_for_timeout(1300)
    calls = pg.evaluate('window.__calls')
    check('fiche : un 3e préféré et le plaquage partent ensemble, sans bouton', any(c[0] == 'setTerrain' and 'troisieme-ligne' in c[1] and '"plaquage":1' in c[1] for c in calls), calls)
    check('fiche : 3 préférés ★, bouclier à 1', pg.locator('[data-act="tkPref"].on').count() == 3 and pg.inner_text('.tplq .pshield b') == '1')
    check('(v44) plaquage de 0 à 3 : 4 boutons', pg.locator('[data-act="tkPl"]').count() == 4 and pg.query_selector('[data-act="tkPl"][data-v="4"]') is None)
    check('règle d\'interface : aucun texte doublé sur les boucliers et les pastilles', pg.evaluate("[...document.querySelectorAll('.pshield, .pshield b, .tpp')].every(e => getComputedStyle(e).textShadow === 'none')"))
    pg.click('[data-act="tkPref"][data-v="troisieme-ligne"]'); pg.wait_for_timeout(1200)
    check('fiche : retoucher un préféré ★ le passe en « Peut aussi jouer »', pg.locator('[data-act="tkPref"].on').count() == 2 and pg.query_selector('[data-act="tkPoste"][data-v="troisieme-ligne"].on') is not None)
    # l'onglet Réglages (ex-Famille) et Spond tout en bas
    check('fiche : l\'onglet « Réglages » (plus « Famille »)', pg.locator('.ftabs a:text-is("Réglages")').count() == 1 and pg.locator('.ftabs a:text-is("Famille")').count() == 0)
    pg.click('.ftabs a:text-is("Réglages")'); pg.wait_for_timeout(900)
    secs = pg.evaluate("[...document.querySelectorAll('main > section.sec h2')].map(h => h.textContent)")
    check('Réglages : Spond tout en bas', secs and secs[-1] == 'Spond', secs)
    pg.click('.ftabs a:text-is("Terrain")'); pg.wait_for_timeout(600)
    check('Terrain : plus de lien Spond ici', 'Son nom dans Spond' not in pg.inner_text('main'))
    # (relecture) le lien Spond : on demande avant de délier, ou de prendre un membre relié à un autre enfant
    # (les liens d'abord : le mode démo réécrit sa base à chaque action, puis les membres Spond, puis on recharge)
    tid = pg.evaluate("location.hash.split('/')[3].split('?')[0]")
    aid = pg.evaluate("MC.app.adultCall('group', {}).then(g => g.joueurs.find(p => p.joueur.prenom === 'Arthur').joueur.id)")
    pg.evaluate("(ids) => MC.app.adultCall('setTerrain', { lignes: [{ joueurId: ids[0], spondId: 'sp-k1' }, { joueurId: ids[1], spondId: 'sp-k2' }] })", [tid, aid])
    pg.evaluate("""(() => { const K = Object.keys(localStorage).find(k=>k.indexOf('mc-demo-')===0), db = JSON.parse(localStorage.getItem(K));
      db.props.spondMembres = JSON.stringify([{ id: 'sp-k1', nom: 'Tom Zèbre', prenom: 'Tom', nomFamille: 'Zèbre', categorie: 'M12' }, { id: 'sp-k2', nom: 'Arthur Lune', prenom: 'Arthur', nomFamille: 'Lune', categorie: 'M12' }, { id: 'sp-k3', nom: 'Sam Neuf', prenom: 'Sam', nomFamille: 'Neuf', categorie: 'M12' }]);
      localStorage.setItem(K, JSON.stringify(db)); localStorage.removeItem('mc-compos'); localStorage.removeItem('mc-group'); })()""")
    pg.goto(BASE + '#/educ/joueur/' + tid + '?t=famille'); pg.reload(); pg.wait_for_timeout(1800); nomodal(pg)
    def spond_de(i): return pg.evaluate("(id) => MC.api.call('group', { token: MC.app.S.adult.token }).then(g => (g.joueurs.find(p => p.joueur.id === id).terrain || {}).spondId || '')", i)
    check('Réglages : la liste des membres Spond', pg.query_selector('#tk-sp option[value="sp-k2"]') is not None and pg.eval_on_selector('#tk-sp', 'e => e.value') == 'sp-k1')
    pg.select_option('#tk-sp', ''); pg.wait_for_timeout(500)
    check('délier : on demande d\'abord', pg.query_selector('.modal') is not None and 'DÉLIER' in pg.inner_text('.modal').upper(), pg.query_selector('.modal') and pg.inner_text('.modal'))
    pg.click('.modal button:has-text("Annuler")'); pg.wait_for_timeout(900)
    check('délier, Annuler : le choix revient, rien n\'est enregistré', pg.eval_on_selector('#tk-sp', 'e => e.value') == 'sp-k1' and spond_de(tid) == 'sp-k1')
    pg.select_option('#tk-sp', 'sp-k2'); pg.wait_for_timeout(500)
    check('membre relié à Arthur : on demande avant de déplacer le lien', pg.query_selector('.modal') is not None and 'Arthur' in pg.inner_text('.modal'))
    pg.click('.modal button:has-text("Déplacer le lien")'); pg.wait_for_timeout(1800)
    check('déplacer le lien : Tom relié à sp-k2, Arthur plus relié', spond_de(tid) == 'sp-k2' and spond_de(aid) == '', [spond_de(tid), spond_de(aid)])
    pg.select_option('#tk-sp', 'sp-k3'); pg.wait_for_timeout(1500)
    check('membre libre : enregistré sans question', not pg.query_selector('.modal') and spond_de(tid) == 'sp-k3')
    pg.click('.ftabs a:text-is("Terrain")'); pg.wait_for_timeout(600)
    # (v44) venir d'ailleurs = le premier onglet : après l'onglet Skills de Tom, un autre enfant touché dans la liste s'ouvre sur Terrain
    pg.click('.ftabs a:text-is("Skills")'); pg.wait_for_timeout(900)
    # retour à la liste : les pastilles suivent
    pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(1200); nomodal(pg)
    check('liste : Tom avec 3e L. en « peut aussi jouer »', pg.evaluate(LIGNE, 'Tom')['pills'] == ['*Centre', '*Ailier', '3e L.'], pg.evaluate(LIGNE, 'Tom'))
    pg.click('#tlist a.tnm:text-is("Arthur")'); pg.wait_for_timeout(1200); nomodal(pg)
    check('(v44) un enfant touché dans la liste : sa fiche s\'ouvre sur Terrain (pas sur le dernier onglet vu)', pg.query_selector('.ftabs a.on') is not None and pg.inner_text('.ftabs a.on').strip().upper() == 'TERRAIN' and pg.query_selector('#sur-le-terrain') is not None, pg.evaluate('location.hash'))
    pg.click('#nav a:has-text("Enfants")'); pg.wait_for_timeout(1000)
    # (v44) les vœux d'un enfant sur leur propre ligne : tous visibles sur sa fiche (le vœu 1 n'est plus coupé par un nom de poste long)
    vid = pg.evaluate("(() => { const F = MC.compos.fiches(MC.app.S.cache.group); return Object.keys(F).filter(id => F[id].actif && F[id].voeux.length >= 3).sort((a, b) => F[b].postesOk.length - F[a].postesOk.length)[0] || ''; })()")
    pg.goto(BASE + '#/educ/joueur/' + vid + '?t=terrain'); pg.wait_for_timeout(1300); nomodal(pg)
    vx = pg.evaluate("(() => { const id = location.hash.split('/')[3].split('?')[0], f = MC.compos.fiches(MC.app.S.cache.group)[id]; const l = [...document.querySelectorAll('[data-act=tkPref] small.csp')]; return [f.voeux.length, l.length, l.every(s => s.getBoundingClientRect().width > 0 && s.getBoundingClientRect().right <= s.closest('button').getBoundingClientRect().right + 1), l.map(s => s.textContent)]; })()")
    check('fiche : chaque vœu est affiché en entier (vœu 1 compris)', vid and vx[0] >= 3 and vx[0] == vx[1] and vx[2] and any('1' in t for t in vx[3]), (vid, vx))
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
