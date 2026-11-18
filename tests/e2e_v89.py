# (v89) Demande de Nicolas du 15/11/2026 : la mise à jour des présences Spond dans les compos. « On commence à faire des compos
# avant que l'invitation Spond ne soit lancée, donc on doit pouvoir faire des compos avec tous les enfants. Puis […] les réponses
# de présence arrivent sur Spond, donc on doit pouvoir mettre à jour les compos des ateliers et matchs en fonction des absents.
# Il faut donc voir ceux qui sont bien là qui ont confirmé, les absents à remplacer et les en attente » : ✓ vert, ✗ rouge, ? doré.
# Démo : « Plateau 2 bis - Lézat » (compo publiée avant les réponses : Léo et Sacha ne viennent plus, Lou a confirmé) ;
# « Entraînement - Saint-Sulpice » de la semaine d'après (invitations Spond pas encore parties).
# Site de démo (sh tests/mkdemo.sh), puis : python3 tests/e2e_v89.py 390 844 · 1180 820 · 820 1180
import sys, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8899/index.html')
OUT = os.environ.get('OUT', '/tmp/v89-shots/')
os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
tag = '%dx%d' % (W, H)
res = []; errs = []
def check(n, c, i=''): res.append((n, c)); print(('OK  ' if c else 'BAD ') + n, '' if c else i)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 700, has_touch=True); pg = ctx.new_page()
    pg.add_init_script('window.__MC_QUIET=1'); pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate
    noscroll = lambda: ev('document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1')
    shot = lambda n: pg.screenshot(path=OUT + tag + '-' + n + '.png')
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
    # (v91) iPad en paysage : « côte à côte » est devenu le tableau des postes (vérifié par e2e_v91) ; ce scénario vérifie
    # l'affichage des équipes l'une sous l'autre, toujours là sur l'iPad (« Équipes l'une sous l'autre » dans « Légende et gestes »)
    if W >= 1000 and W > H: pg.evaluate("localStorage.setItem('mc-ccote', '0')")
    IDS = ev("(() => { const g = MC.app.S.cache.group, F = MC.compos.fiches(g), o = {}; Object.keys(F).forEach(id => o[F[id].prenom] = id); return o; })()")

    # ----- 1. la cloche des éducs : un absent placé dans une compo à venir -----
    pg.goto(BASE + '#/educ/plateaux'); pg.wait_for_timeout(1200)
    nt = ev("MC.notifs.events('e', { group: MC.app.S.cache.group, compos: MC.app.S.cache.compos }).filter(x => /^ca:/.test(x.id)).map(x => [x.txt, x.href])")
    check('cloche : « Léo, Sacha ne viennent plus : à remplacer dans la compo du plateau « Plateau 2 bis - Lézat » »', len(nt) == 1 and 'Léo' in nt[0][0] and 'Sacha' in nt[0][0] and 'à remplacer' in nt[0][0] and 'Plateau 2 bis' in nt[0][0] and nt[0][1] == '#/educ/compo/sp-demo-p6', nt)

    # ----- 2. la compo publiée : ✓, ✗ sur les cartes, le point des réponses en une ligne -----
    pg.goto(BASE + '#/educ/compo/sp-demo-p6'); pg.wait_for_timeout(1500)
    carte = lambda nom: "document.querySelector('.ccol:not(.banc) .cpj[data-id=\"%s\"]')" % IDS[nom]
    m = ev("""(ids => { const o = {}; Object.keys(ids).forEach(n => { const c = document.querySelector('.ccol:not(.banc) .cpj[data-id="' + ids[n] + '"]'); if (c) o[n] = { ok: !!c.querySelector('.cok'), no: !!c.querySelector('.cno'), q: !!c.querySelector('.catt') }; }); return o; })""", IDS)
    check('✗ rouge sur Léo et Sacha (absents placés), pas de ✓', all(m.get(n, {}).get('no') and not m[n]['ok'] for n in ['Léo', 'Sacha']), {n: m.get(n) for n in ['Léo', 'Sacha']})
    oks = [n for n in m if m[n]['ok']]
    check('✓ vert sur les confirmés placés (Gabin, Nina…), jamais avec ✗ ou ?', len(oks) >= 10 and all(not m[n]['no'] and not m[n]['q'] for n in oks) and 'Gabin' in oks, oks)
    r = ev("(() => { const c = document.querySelector('.ccol:not(.banc) .cok'); const p = c.closest('.cpl1').getBoundingClientRect(), x = c.getBoundingClientRect(); return { dedans: x.top >= p.top - 1 && x.bottom <= p.bottom + 1, l: Math.round(x.width) }; })()")
    check('le ✓ est sur la ligne du prénom (16 px)', r['dedans'] and r['l'] == 16, r)
    t = pg.inner_text('.cpres')
    check('en haut, une ligne : « 18 confirmés · 2 absents à remplacer »', '18 confirmés' in t and '2 absents à remplacer' in t, t)
    check('… sur une ou deux lignes (la 1re équipe reste haut dans la page)', ev("document.querySelector('.cpres').getBoundingClientRect().height") <= 46)
    shot('compo')
    pg.click('.cpres a.cpres-n'); pg.wait_for_timeout(1400)
    al = pg.inner_text('#calertes')
    check('« 2 absents à remplacer » mène à « À regarder », ouvert', ev("document.querySelector('#calertes details').open") is True and ev("Math.abs(document.getElementById('calertes').getBoundingClientRect().top) < 200 || scrollY + innerHeight >= document.scrollingElement.scrollHeight - 2"), ev("document.getElementById('calertes').getBoundingClientRect().top"))
    check('À regarder : « Depuis la compo du … : Léo ne vient plus · Sacha ne vient plus · Lou a confirmé (pas placé) »', 'Depuis la compo du' in al and 'Léo ne vient plus' in al and 'Lou a confirmé (pas placé)' in al, al[:300])
    check('À regarder : un bouton « Remplacer » par absent, avec son équipe et son poste', len(pg.query_selector_all('#calertes [data-act="cRemp"]')) == 2 and 'Remplacer Léo' in al and 'A1, 3e ligne' in al, al[:400])
    shot('a-regarder')
    # (relecture v89) « Retirer » sur l'alerte des absents, sans rien modifier avant : retire bien Léo et Sacha (puis on annule)
    pg.click('#calertes li:has-text("Ne viennent plus") [data-act="cFix"]'); pg.wait_for_timeout(800)
    w0 = ev("(ids => [ids['Léo'], ids['Sacha']].map(id => !!document.querySelector('.ccol:not(.banc) .cpj[data-id=\"' + id + '\"]')))", IDS)
    check('« Retirer » (alerte des absents) retire Léo et Sacha des équipes', w0 == [False, False], w0)
    pg.click('.ctop [data-act="cDiscard"]'); pg.wait_for_timeout(400)
    if pg.query_selector('.modal'): pg.click('.modal button[data-i="0"]'); pg.wait_for_timeout(1000)
    check('… « Annuler » : de retour comme publiée', ev("(ids => !!document.querySelector('.ccol:not(.banc) .cpj[data-id=\"' + ids['Léo'] + '\"]'))", IDS) and pg.query_selector('.ctop [data-act="cSave"]') is None)
    pg.click('.cpres a.cpres-n'); pg.wait_for_timeout(1200)
    pg.click('#calertes [data-act="cRemp"][data-id="%s"]' % IDS['Léo']); pg.wait_for_timeout(600)
    cands = ev("[...document.querySelectorAll('.modal .crem')].map(b => [b.querySelector('b').textContent, !!b.querySelector('.crep'), !!b.querySelector('.cqatt')])")
    check('Remplacer Léo : les enfants libres, Lou (✓ confirmé) d\'abord, puis Jade et Mila (?)', [c[0] for c in cands] == ['Lou', 'Jade', 'Mila'] and cands[0][1] and cands[1][2] and cands[2][2], cands)
    check('… le titre dit qui, l\'équipe et le poste', 'Remplacer Léo' in (pg.text_content('.modal h2') or '') and 'A1 · 3e ligne' in pg.text_content('.modal'), pg.text_content('.modal')[:120])
    shot('remplacer')
    pg.click('.modal .crem >> nth=0'); pg.wait_for_timeout(900)
    w = ev("""(ids => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-p6') > 0))).vs[0];
      const ou = id => { for (const t of d.equipes) for (const j of t.joueurs) if (j.id === id) return t.id + ':' + j.poste; return d.banc.indexOf(id) >= 0 ? 'banc' : null; };
      return { lou: ou(ids['Lou']), leo: ou(ids['Léo']) }; })""", IDS)
    check('Lou prend la place de Léo (A1, 3e ligne), Léo sort de la compo (comme « Retirer », pas dans « Pas placés »)', w['lou'] == 'A1:troisieme-ligne' and w['leo'] is None, w)
    check('« Enregistrer » apparaît (rien ne part sans lui)', pg.query_selector('.ctop [data-act="cSave"]') is not None)
    check('en haut : plus qu\'un absent à remplacer', '1 absent à remplacer' in pg.inner_text('.cpres'), pg.inner_text('.cpres'))
    pg.click('.ctop [data-act="cSave"]'); pg.wait_for_timeout(1500)
    if pg.query_selector('.modal'):
        bt = pg.query_selector('.modal .btn:not(.grey)') or pg.query_selector('.modal button[data-i="0"]'); bt.click(); pg.wait_for_timeout(1500)
    c = ev("MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-p6')")
    check('enregistrée : version 2, les réponses du moment gardées avec la compo (Léo et Sacha absents)', c['version'] == 2 and IDS['Léo'] in c['reponses']['abs'] and IDS['Sacha'] in c['reponses']['abs'], [c['version'], c.get('reponses')])
    al = pg.inner_text('#calertes')
    check('« Depuis la compo » disparaît une fois enregistrée ; Sacha reste à remplacer', 'Depuis la compo' not in al and 'Remplacer Sacha' in al and 'Remplacer Léo' not in al, al[:300])
    nt = ev("MC.notifs.events('e', { group: MC.app.S.cache.group, compos: MC.app.S.cache.compos }).filter(x => /^ca:/.test(x.id)).map(x => x.txt)")
    check('cloche : plus que Sacha', len(nt) == 1 and 'Sacha' in nt[0] and 'Léo' not in nt[0], nt)
    check('compo : pas de défilement de côté', noscroll())

    # ----- 3. invitations Spond pas encore parties : tout le groupe, chacun en « ? » -----
    pg.goto(BASE + '#/educ/evt/sp-demo-e2'); pg.wait_for_timeout(1200)
    check('page de l\'entraînement : « Invitations Spond pas encore parties »', 'Invitations Spond pas encore parties' in pg.inner_text('main'))
    # (v90) un événement Spond ne se corrige plus à la main : le serveur refuse
    rf = ev("(id => MC.app.adultCall('setEvenement', { id: 'sp-demo-e2', retraits: [id] }).then(() => 'ok', e => e.code || e.message))", IDS['Léo'])
    check('(v90) retirer un enfant à la main d\'un événement Spond : refusé', rf != 'ok', rf)
    pg.goto(BASE + '#/educ/compo/sp-demo-e2?p=ateliers'); pg.wait_for_timeout(1300)
    ntous = ev("MC.app.S.cache.group.joueurs.filter(p => p.joueur.actif && !/^test$/i.test(p.joueur.prenom)).length")
    check('ateliers : « invitations Spond pas encore parties · %d enfants » en haut' % ntous, ('invitations spond pas encore parties · %d enfants' % ntous) in pg.inner_text('.head').lower(), pg.inner_text('.head'))
    if pg.query_selector('[data-act="cAuto"][aria-expanded="false"]'): pg.click('[data-act="cAuto"]'); pg.wait_for_timeout(600)
    pg.click('#cauto [data-act="cPropose"]'); pg.wait_for_timeout(1500)
    d = ev("(() => { const d = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.indexOf('mc-cdraft:') === 0 && k.indexOf('sp-demo-e2') > 0))).vs[0]; return d.equipes.reduce((n, t) => n + t.joueurs.length, 0) + d.banc.length; })()")
    check('les groupes se font avec tout le groupe (%d enfants)' % ntous, d == ntous, d)
    t = pg.inner_text('.cpres')
    check('la ligne : « Invitations Spond pas encore parties (envoi prévu le …) »', 'Invitations Spond pas encore parties' in t and 'envoi prévu le' in t, t)
    q = ev("(() => { const c = [...document.querySelectorAll('.ccol:not(.banc) .cpj')]; return { n: c.length, q: c.filter(x => x.querySelector('.catt')).length, ok: c.filter(x => x.querySelector('.cok, .cno')).length, gone: c.filter(x => x.classList.contains('gone')).length }; })()")
    check('chaque enfant en « ? », aucun ✓ ni ✗, personne barré', q['n'] > 10 and q['q'] == q['n'] and q['ok'] == 0 and q['gone'] == 0, q)
    shot('invitations')
    pg.click('.ctop [data-act="cPublish"], .ctop [data-act="cPub"]') if pg.query_selector('.ctop [data-act="cPublish"], .ctop [data-act="cPub"]') else None
    pg.wait_for_timeout(1500)
    if pg.query_selector('.modal'):
        bt = pg.query_selector('.modal .btn:not(.grey)') or pg.query_selector('.modal button[data-i="0"]'); bt.click(); pg.wait_for_timeout(1500)
    pub = ev("!!MC.app.S.cache.compos.compos.find(c => c.evenementId === 'sp-demo-e2' && c.statut === 'publiee')")
    pg.reload(); pg.wait_for_timeout(1600)
    check('(relecture) publiés puis rouverts : pas de « Depuis la compo » (personne n\'avait encore répondu)', pub and 'Depuis la compo' not in pg.inner_text('main'), pub)
    check('pas de défilement de côté', noscroll())

    check('aucune erreur de page', not errs, errs[:3])
    b.close()
bad = [n for n, c in res if not c]
print('\n%d/%d OK' % (len(res) - len(bad), len(res)))
sys.exit(1 if bad else 0)
