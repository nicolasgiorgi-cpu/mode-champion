const assert = require('assert');
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv(); g.installer();
const ac = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
let x = g.call({ action: 'adultLogin', code: ac }); const et = x.token;
x = g.call({ action: 'addPlayer', token: et, prenom: 'Max', familleNom: 'F' }); const id = x.joueur.id, tmp = x.code;
x = g.call({ action: 'login', joueurId: id, pin: tmp }); x = g.call({ action: 'setPin', token: x.token, pin: '4826' }); const t = x.token;
const today = Date.now();
for (let i = 0; i < 400; i++) {
  const d = new Date(today - (i % 80) * 86400000).toISOString().slice(0, 10);
  x = g.call({ action: 'logSession', token: t, type: 'cros', date: d, mode: 'guidee', details: { exos: [{ id: 'pompes', niveau: 2, series: [8, 8, 7], ressenti: 'bien', fait: true, dose: '3 × 8' }], duree: 900 } });
  assert.ok(x.ok, JSON.stringify(x));
}
const parts = Number(g._cache['t:seances']);
console.log('chunks seances', parts, 'chars', Object.keys(g._cache).filter(k => k.startsWith('t:seances:')).reduce((n, k) => n + g._cache[k].length, 0));
x = g.call({ action: 'me', token: t }); assert.strictEqual(x.seances.length, 400);
Object.keys(g._cache).forEach(k => delete g._cache[k]);
x = g.call({ action: 'me', token: t }); assert.strictEqual(x.seances.length, 400);
console.log('BIG CACHE OK');
