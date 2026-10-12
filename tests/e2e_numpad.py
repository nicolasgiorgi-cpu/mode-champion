from playwright.sync_api import sync_playwright
BASE='http://localhost:8899/index.html'
errs=[]
def pin(pg, code):
    for c in code:
        pg.click('.modal [data-k="%s"], #firstzone [data-k="%s"], #adultzone [data-k="%s"]'%(c,c,c)); pg.wait_for_timeout(60)
def tapkeys(pg, keys):
    for k in keys:
        pg.click('#numpad [data-np="%s"]' % k); pg.wait_for_timeout(60)
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---------- téléphone tactile ----------
    ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); pg.add_init_script("window.__MC_QUIET=1")
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(700)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900)
    assert pg.get_attribute('#b_planche_m','readonly') is not None, 'readonly sur tactile'
    assert pg.get_attribute('#b_planche_m','inputmode')=='numeric'
    pg.tap('#b_planche_m'); pg.wait_for_timeout(400)
    assert pg.is_visible('#numpad'), 'pavé visible'
    assert pg.text_content('#np_lab').strip().lower().startswith('planche'), pg.text_content('#np_lab')
    assert not pg.is_visible('#numpad .np-dec'), 'pas de virgule pour un entier'
    tapkeys(pg, ['1'])   # minute → passe tout seul aux secondes
    assert pg.evaluate("document.querySelector('.np-on').id")=='b_planche_s'
    tapkeys(pg, ['1','5'])
    pg.wait_for_timeout(300)
    pg.screenshot(path='/home/claude/shots/np-phone-bilan.png')
    tapkeys(pg, ['next']); pg.wait_for_timeout(200)
    nxt = pg.evaluate("document.querySelector('.np-on').id"); print('après planche :', nxt)
    # navette : décimale
    pg.tap('#b_navette'); pg.wait_for_timeout(300)
    assert pg.is_visible('#numpad .np-dec')
    tapkeys(pg, ['1','5',',','4','7'])  # le 7 est refusé (1 décimale)
    assert pg.input_value('#b_navette')=='15,4', pg.input_value('#b_navette')
    # suspension 0 min 48 s
    pg.tap('#b_susp_m'); pg.wait_for_timeout(300); tapkeys(pg, ['0','4','8'])
    assert pg.input_value('#b_susp_s')=='48'
    # pompes
    pg.tap('#b_pompes'); pg.wait_for_timeout(300); tapkeys(pg, ['1','2'])
    pg.wait_for_timeout(400)   # le toucher qui ouvre le pavé ne le referme pas pendant 0,5 s
    pg.click('h1'); pg.wait_for_timeout(300)
    assert not pg.is_visible('#numpad'), 'toucher ailleurs ferme'
    vals = pg.evaluate("(function(){var o={};document.querySelectorAll('[data-bil]').forEach(function(i){o[i.id]=i.value});return o})()")
    print(vals)
    pg.click('#bil_send'); pg.wait_for_timeout(1500)
    pg.click('.modal .btn'); pg.wait_for_timeout(800)
    recs = pg.evaluate("MC.app.S.me.records.filter(r=>r.bilan==String(MC.logic.currentBilan().n)).map(r=>r.test+':'+r.valeur).join(' ')")
    print('records', recs)
    assert 'planche:75' in recs and 'navette:15.4' in recs and 'susp:48' in recs and 'pompes:12' in recs
    pg.goto(BASE+'#/profil'); pg.wait_for_timeout(900); pg.screenshot(path='/home/claude/shots/np-phone-profil.png', full_page=True)
    # défi Roc : 1 min 2 s
    pg.goto(BASE+'#/defi/roc'); pg.wait_for_timeout(900)
    pg.tap('#dm'); pg.wait_for_timeout(300); tapkeys(pg, ['1','2']); pg.wait_for_timeout(200)
    pg.screenshot(path='/home/claude/shots/np-phone-defi.png')
    tapkeys(pg, ['next'])
    pg.click('[data-act="sendDefi"]'); pg.wait_for_timeout(1500)
    d = pg.evaluate("MC.app.S.me.records.filter(r=>r.bilan==='defi'&&r.test==='planche').map(r=>r.valeur).join(',')")
    print('défi planche', d); assert '62' in d.split(',')
    # noter un match
    pg.goto(BASE+'#/noter?type=club'); pg.wait_for_timeout(900)
    pg.click('[data-act="nMatch"][data-v="1"]'); pg.wait_for_timeout(400)
    pg.tap('#nsa'); pg.wait_for_timeout(300); tapkeys(pg, ['2','4','next','1','7'])
    pg.screenshot(path='/home/claude/shots/np-phone-score.png')
    sc = pg.evaluate("(function(){return document.getElementById('nsa').value+'-'+document.getElementById('nsb').value})()"); print('score', sc)
    assert sc=='24-17'
    ctx.close()
    # ---------- iPad tactile ----------
    ctx=b.new_context(viewport={'width':820,'height':1180}, device_scale_factor=1, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script("window.__MC_QUIET=1")
    pg.goto(BASE); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900)
    pg.tap('#b_chaise_m'); pg.wait_for_timeout(400); tapkeys(pg, ['1','0','5'])
    pg.screenshot(path='/home/claude/shots/np-ipad-bilan.png')
    ctx.close()
    # ---------- ordinateur (pas tactile) : on tape au clavier ----------
    ctx=b.new_context(viewport={'width':1280,'height':900})
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script("window.__MC_QUIET=1")
    pg.goto(BASE); pg.wait_for_timeout(600); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    pg.click('.kidbtn:has-text("TOM")'); pg.wait_for_timeout(300); pin(pg,'2580'); pg.wait_for_timeout(900)
    pg.goto(BASE+'#/bilan'); pg.wait_for_timeout(900)
    assert pg.get_attribute('#b_planche_m','readonly') is None
    pg.fill('#b_planche_m',''); pg.click('#b_planche_m'); pg.keyboard.type('2'); pg.fill('#b_planche_s',''); pg.click('#b_planche_s'); pg.keyboard.type('5a')
    assert pg.input_value('#b_planche_s')=='5'
    assert not pg.is_visible('#numpad')
    ctx.close()
    b.close()
print('ERRS', errs)
