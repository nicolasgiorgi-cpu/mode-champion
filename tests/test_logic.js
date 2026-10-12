const fs=require('fs'), vm=require('vm'), assert=require('assert');
const ctx={window:{}, console, Date, Math, JSON}; ctx.window=ctx; vm.createContext(ctx);
for (const f of ['config','content','core','logic']) vm.runInContext(fs.readFileSync('/home/claude/mode-champion/js/'+f+'.js','utf8'), ctx, {filename:f});
const L=ctx.MC.logic, C=ctx.MC.CONTENT;
L._setToday('2026-10-11'); // dimanche
assert.strictEqual(L.dow('2026-10-11'),6); assert.strictEqual(L.monday('2026-10-11'),'2026-10-05');
let id=0; const S=(date,type,extra)=>Object.assign({id:'s'+(id++),date,type,mode:'rapide',ressenti:'',details:null,cree:date+'T10:00:00Z'},extra||{});
// semaine parfaite 5-11 oct
let seances=[S('2026-10-05','cros'),S('2026-10-06','capuozzo'),S('2026-10-07','dupont'),S('2026-10-07','club'),S('2026-10-08','meafou'),S('2026-10-10','club'),S('2026-10-11','recup')];
let st=L.compute({joueur:{niveaux:{}},seances,records:[],journal:[]});
assert.strictEqual(st.week.stars,6); assert.ok(st.week.bonus);
// XP: 4*150 + club mer 50 + club sam 50 + recup 30 + bonus 200 + badges (premiere, parfaite) 2*100
assert.strictEqual(st.xp, 600+50+50+30+200+200, 'xp '+st.xp);
assert.strictEqual(st.stars,7); assert.strictEqual(st.streak,6);
// séance « hier » notée un autre jour compte dans la colonne de son type
seances.push(S('2026-10-04','cros'));
st=L.compute({joueur:{niveaux:{}},seances,records:[],journal:[]});
assert.strictEqual(st.streak,6,'streak broken by missing sat 3? '+st.streak);
// série : dimanche pas encore fait ne casse pas la série
L._setToday('2026-10-12'); // lundi, pas encore fait
st=L.compute({joueur:{niveaux:{}},seances,records:[],journal:[]});
assert.strictEqual(st.streak,6,'monday not done yet keeps streak '+st.streak);
L._setToday('2026-10-13'); // mardi : lundi raté
st=L.compute({joueur:{niveaux:{}},seances,records:[],journal:[]});
assert.strictEqual(st.streak,0); assert.ok(st.bestStreak>=6);
L._setToday('2026-10-11');
// niveaux depuis le bilan
const lv=L.levelsFromBilan([{test:'planche',valeur:80},{test:'navette',valeur:15},{test:'navette',valeur:13.5},{test:'tract',valeur:2,extra:{elastique:'fort',nbElastique:5}},{test:'saut',valeur:150},{test:'flamant',valeur:12}],{planche:4});
assert.deepStrictEqual(JSON.parse(JSON.stringify(lv)),{planche:4,navette:3,tract:2,flamant:2});
assert.strictEqual(L.levelFromTest('navette',17.5),1); assert.strictEqual(L.levelFromTest('navette',17),2); assert.strictEqual(L.levelFromTest('navette',13.9),3);
assert.strictEqual(L.levelFromTest('tract',9,{sm:true}),2); assert.strictEqual(L.levelFromTest('tract',6),3);
// propositions
const g=(date,id2,n,r)=>S(date,'cros',{mode:'guidee',cree:date+'T18:00:00Z',details:{exos:[{id:id2,niveau:n,ressenti:r}]}});
let d={joueur:{niveaux:{pompes:2}},seances:[g('2026-10-05','pompes',2,'facile'),g('2026-10-06','rowing',2,'facile')],records:[],journal:[]};
let pr=L.proposals(d); assert.strictEqual(pr.length,1); assert.strictEqual(pr[0].cle,'pompes'); assert.strictEqual(pr[0].a,3);
d.journal=[{type:'niveau_refus',data:{cle:'pompes',niveau:2},cree:'2026-10-07T00:00:00Z'}];
assert.strictEqual(L.proposals(d).length,0);
d={joueur:{niveaux:{squats:3}},seances:[S('2026-10-01','meafou',{mode:'rapide',ressenti:'dur',details:{niveau:3},cree:'2026-10-01T10:00:00Z'}),S('2026-10-08','meafou',{mode:'rapide',ressenti:'dur',details:{niveau:3},cree:'2026-10-08T10:00:00Z'})],records:[],journal:[]};
pr=L.proposals(d); assert.ok(pr.some(p=>p.cle==='squats'&&p.a===2&&p.sens==='down'));
// badges et records
const R=(test,v,bilan,date,extra,statut)=>({id:'r'+(id++),test,valeur:v,bilan,date,extra:extra||null,statut:statut||'ok',cree:date+'T10:00:00Z'});
d={joueur:{niveaux:{}},seances:[],journal:[],records:[R('navette',15.2,'0','2026-09-13'),R('navette',14.8,'defi','2026-10-01'),R('planche',44,'0','2026-09-13'),R('planche',50,'defi','2026-10-02','', 'attente'),R('flamant',22,'0','2026-09-13',{g:30,d:22}),R('tract',3,'0','2026-09-13',{sm:true}),R('tract',16,'defi','2026-10-03',{sm:true})]};
st=L.compute(d);
assert.ok(st.badges.dupont.earned); assert.ok(!st.badges.roc.earned); assert.ok(st.badges.flamant.earned); assert.ok(st.badges.cros.earned);
// records battus : navette (14.8<15.2) +50, tract sm 16>3 +50 ; badges dupont, flamant, cros = 300
assert.strictEqual(st.xp, 100+300, 'xp '+st.xp);

// badges de séances (paliers) et Champion
{
  const many=[]; const base=new Date('2026-01-05T12:00:00Z');
  for (let i=0;i<26;i++){ const dd=new Date(base.getTime()+i*7*86400000).toISOString().slice(0,10); many.push(S(dd,'cros')); }
  many.push(S(many[0].date,'cros')); // même jour : ne compte qu'une fois
  for (let i=0;i<9;i++){ const dd=new Date(base.getTime()+(i*7+1)*86400000).toISOString().slice(0,10); many.push(S(dd,'capuozzo')); }
  L._setToday('2026-07-15');
  let s2=L.compute({joueur:{niveaux:{}},seances:many,records:[],journal:[]});
  assert.strictEqual(s2.badges.bras.count,26); assert.strictEqual(s2.badges.bras.tier,2); assert.ok(s2.badges.bras.earned);
  assert.strictEqual(s2.badges.bras.prog,'26 / 40'); assert.strictEqual(s2.badges.bras.date,many[24].date);
  assert.strictEqual(s2.badges.turbo.tier,0); assert.ok(!s2.badges.turbo.earned); assert.strictEqual(s2.badges.turbo.prog,'9 / 10');
  assert.ok(!s2.badges.champion.earned);
  // XP : le palier argent compte 2 fois X.badge
  const xpTier=s2.xp;
  many.push(S('2026-07-14','capuozzo')); // 10e séance Capuozzo → bronze
  s2=L.compute({joueur:{niveaux:{}},seances:many,records:[],journal:[]});
  assert.strictEqual(s2.badges.turbo.tier,1);
  // N4 en guidée (version complète) → Champion ; en version mini avec matériel mini → non
  const gN4=(mini)=>S('2026-07-13','meafou',{mode:'guidee',details:{options:{mini:mini},exos:[{id:'squats',niveau:4,fait:true,mini:'x'}]}});
  s2=L.compute({joueur:{niveaux:{}},seances:many.concat([gN4(true)]),records:[],journal:[]});
  assert.ok(!s2.badges.champion.earned,'mini ne compte pas');
  s2=L.compute({joueur:{niveaux:{}},seances:many.concat([gN4(false)]),records:[],journal:[]});
  assert.ok(s2.badges.champion.earned); assert.strictEqual(s2.badges.champion.date,'2026-07-13');
  s2=L.compute({joueur:{niveaux:{}},seances:many.concat([S('2026-07-12','dupont',{details:{niveau:4}})]),records:[],journal:[]});
  assert.ok(s2.badges.champion.earned,'saisie rapide N4');
  assert.strictEqual(C.BADGES.length,17);
  L._setToday('2026-10-11');
}
// classement
const Lg={joueurs:[{id:'a',prenom:'A',niveaux:{planche:3}},{id:'b',prenom:'B',niveaux:{planche:3}},{id:'c',prenom:'C',niveaux:{planche:2}},{id:'me',prenom:'Moi',niveaux:{planche:3}}],
 records:[R('planche',90,'0','2026-09-13'),R('planche',80,'0','2026-09-13'),R('planche',60,'0','2026-09-13'),R('planche',85,'0','2026-09-13'),R('planche',100,'defi','2026-10-01')]};
Lg.records[0].joueurId='a';Lg.records[1].joueurId='b';Lg.records[2].joueurId='c';Lg.records[3].joueurId='me';Lg.records[4].joueurId='b';
let lg=L.league(Lg,'me','planche','best');
assert.strictEqual(JSON.stringify(lg.rows.map(r=>r.p.id)),JSON.stringify(['b','a','me','c'])); assert.strictEqual(lg.lo,1);
lg=L.league(Lg,'me','planche','prog'); assert.strictEqual(JSON.stringify(lg.rows.map(r=>r.p.id)),JSON.stringify(['b'])); assert.strictEqual(lg.rows[0].prog,20);
// cycle / board
const cy=L.cycleAt('2026-10-11'); assert.strictEqual(cy.n,1); assert.strictEqual(cy.semaine,4); assert.strictEqual(cy.nbSemaines,9);
const bd=L.board(L.weeks(seances),cy); assert.strictEqual(bd.rows.length,9);
console.log('LOGIC TESTS OK');

// v14 : XP de niveau seulement au-delà du plus haut niveau atteint ; premiers pas +100 une fois
{
  const base = { joueur: { niveaux: {} }, seances: [], records: [] };
  const J = (type, data, i) => ({ id: 'j' + i, type, data, date: '2026-10-1' + i, cree: '2026-10-1' + i + 'T10:00:00Z' });
  let x0 = L.compute(Object.assign({}, base, { journal: [] })).xp;
  let x1 = L.compute(Object.assign({}, base, { journal: [J('niveau', { cle: 'pompes', de: 2, a: 3 }, 1)] })).xp;
  assert.strictEqual(x1 - x0, C.XP.niveau, 'montée = XP');
  let x2 = L.compute(Object.assign({}, base, { journal: [J('niveau', { cle: 'pompes', de: 3, a: 2 }, 1), J('niveau', { cle: 'pompes', de: 2, a: 3 }, 2)] })).xp;
  assert.strictEqual(x2, x0, 'redescendre puis remonter : pas d\'XP');
  let x3 = L.compute(Object.assign({}, base, { journal: [J('bilan_niveaux', { bilan: 0, niveaux: { pompes: 3 } }, 1), J('niveau', { cle: 'pompes', de: 3, a: 2 }, 2), J('niveau', { cle: 'pompes', de: 2, a: 3 }, 3), J('niveau', { cle: 'pompes', de: 3, a: 4 }, 4)] })).xp;
  assert.strictEqual(x3 - x0, C.XP.niveau, 'seul le N4 rapporte');
  let x4 = L.compute(Object.assign({}, base, { journal: [J('premiers_pas', {}, 1), J('premiers_pas', {}, 2)] })).xp;
  assert.strictEqual(x4 - x0, C.XP.premiersPas, 'premiers pas une fois');
  console.log('V14 LOGIC OK');
}
