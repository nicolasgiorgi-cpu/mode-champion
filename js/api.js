/* =========================================================
   Mode champion · M12 — liaison avec le serveur
   - API_URL rempli : Google Apps Script (Google Sheet)
   - API_URL vide  : MODE DÉMO (serveur simulé dans le navigateur)
   ========================================================= */
window.MC = window.MC || {};

MC.api = (function () {
  var DEMO = !MC.CONFIG.API_URL;
  var KEY = 'mc-demo-v1';

  function ApiError(res) {
    this.code = res.error || 'serveur';
    this.message = res.message || 'Erreur.';
    this.data = res;
  }

  // ----- base de données locale du mode démo -----
  var mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { mem = null; }
    if (!mem || !mem.tables) {
      mem = { tables: { joueurs: [], familles: [], educs: [], seances: [], records: [], journal: [] }, props: {} };
      MC.demo.seed(localDb(), env());
      save();
    }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } }
  function localDb() {
    return {
      rows: function (t) { return (load().tables[t] = load().tables[t] || []); },
      insert: function (t, o) { load().tables[t].push(JSON.parse(JSON.stringify(o))); },
      update: function (t, id, patch) {
        var rows = load().tables[t];
        for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { for (var k in patch) rows[i][k] = patch[k]; return; }
        throw new Error('introuvable');
      },
      remove: function (t, id) { load().tables[t] = load().tables[t].filter(function (r) { return r.id !== id; }); },
      getProp: function (k) { return load().props[k] || null; },
      setProp: function (k, v) { load().props[k] = String(v); }
    };
  }
  function env() {
    return {
      now: function () { return Date.now(); },
      rand: function (n) {
        try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
      }
    };
  }
  function resetDemo() { mem = null; try { localStorage.removeItem(KEY); } catch (e) { } load(); }

  // ----- appel -----
  function call(action, params) {
    var req = {};
    for (var k in (params || {})) req[k] = params[k];
    req.action = action;
    if (DEMO) {
      return new Promise(function (resolve) { setTimeout(resolve, 120); }).then(function () {
        var db = localDb();
        var res = Core.handle(JSON.parse(JSON.stringify(req)), db, env());
        save();
        if (!res.ok) throw new ApiError(res);
        return JSON.parse(JSON.stringify(res));
      });
    }
    return fetch(MC.CONFIG.API_URL, { method: 'POST', body: JSON.stringify(req), redirect: 'follow' })
      .catch(function () { throw new ApiError({ error: 'reseau', message: 'Pas de connexion internet. Réessaie dans un instant.' }); })
      .then(function (r) { return r.json().catch(function () { throw new ApiError({ error: 'reseau', message: 'Le serveur ne répond pas correctement.' }); }); })
      .then(function (res) { if (!res.ok) throw new ApiError(res); return res; });
  }

  return { call: call, DEMO: DEMO, resetDemo: resetDemo, ApiError: ApiError };
})();
