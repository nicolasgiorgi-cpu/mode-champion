// (v67) Bug corrigé : « 10 demandes par jour au plus » ne comptait plus rien entre minuit et 1 h (heure de Paris), car la date
// de la demande était lue en UTC. On relance test_skills_v2 (qui vérifie cette limite) à 0 h 30, heure de Paris.
// Lancer : sh outils/fabriquer-serveur.sh && node tests/test_minuit.js
const { spawnSync } = require('child_process'), path = require('path'), assert = require('assert');
const r = spawnSync(process.execPath, ['-r', path.join(__dirname, 'horloge_minuit.js'), path.join(__dirname, 'test_skills_v2.js')],
  { env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }), encoding: 'utf8' });
assert.strictEqual(r.status, 0, 'test_skills_v2 à 0 h 30 (Paris) : ' + (r.stderr || '').split('\n').filter(l => /Assertion|limite|Error/.test(l)).slice(0, 3).join(' | '));
// l'horloge est bien décalée
const h = spawnSync(process.execPath, ['-r', path.join(__dirname, 'horloge_minuit.js'), '-e', 'const d = new Date(); console.log(d.getHours(), d.toISOString().slice(0, 10))'],
  { env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }), encoding: 'utf8' });
assert.strictEqual(h.stdout.trim(), '0 2026-11-11', h.stdout);
console.log('test_minuit : OK');
