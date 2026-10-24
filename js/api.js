/* =========================================================
   Mode champion · M12 — liaison avec le serveur
   - API_URL rempli : Google Apps Script (Google Sheet)
   - API_URL vide  : MODE DÉMO (serveur simulé dans le navigateur)
   ========================================================= */
window.MC = window.MC || {};

MC.api = (function () {
  var DEMO = !MC.CONFIG.API_URL;
  var KEY = 'mc-demo-v9';   // v8 : Skills, +1 et missions des éducs (v7 : équipes de match « Équipe 1 contre Équipe 2 »)

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
      mem = { tables: { joueurs: [], familles: [], educs: [], seances: [], records: [], journal: [], missions: [], terrain: [], evenements: [], compos: [], avis: [], etoiles: [], encouragements: [], defmissions: [] }, props: {} };
      try { ['mc-demo-v1', 'mc-demo-v2', 'mc-demo-v3', 'mc-demo-v4', 'mc-demo-v5', 'mc-demo-v6', 'mc-demo-v7', 'mc-demo-v8'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
      MC.demo.seed(localDb(), env());
      save();
    }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } }
  function localDb() {
    return {
      rows: function (t) { return (load().tables[t] = load().tables[t] || []); },
      insert: function (t, o) { (load().tables[t] = load().tables[t] || []).push(JSON.parse(JSON.stringify(o))); },
      update: function (t, id, patch) {
        var rows = load().tables[t] || [];
        for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { for (var k in patch) rows[i][k] = patch[k]; return; }
        throw new Error('introuvable');
      },
      remove: function (t, id) { load().tables[t] = (load().tables[t] || []).filter(function (r) { return r.id !== id; }); },
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

  // ----- indicateur d'activité : barre en haut de l'écran + bouton touché « occupé » -----
  var inflight = 0, lastBtn = null, lastBtnAt = 0, busyBtns = [];
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button, .btn, .btn2');
    if (b) { lastBtn = b; lastBtnAt = Date.now(); }
  }, true);
  function netStart(silent) {
    if (silent) return;
    inflight++;
    document.documentElement.classList.add('net-busy');
    if (lastBtn && Date.now() - lastBtnAt < 600 && document.body.contains(lastBtn)) {
      lastBtn.classList.add('busy'); lastBtn.setAttribute('aria-busy', 'true'); busyBtns.push(lastBtn);
    }
    lastBtn = null;
  }
  function netEnd(silent) {
    if (silent) return;
    inflight = Math.max(0, inflight - 1);
    if (inflight) return;
    document.documentElement.classList.remove('net-busy');
    busyBtns.forEach(function (b) { b.classList.remove('busy'); b.removeAttribute('aria-busy'); });
    busyBtns = [];
  }

  // ----- appel -----
  // opts.silent : mise à jour en arrière-plan, sans indicateur
  function call(action, params, opts) {
    var silent = !!(opts && opts.silent);
    netStart(silent);
    return raw(action, params).then(function (r) { netEnd(silent); return r; }, function (e) { netEnd(silent); throw e; });
  }
  // Délais d'attente : sans réponse, on n'attend pas indéfiniment (un iPhone qui sort de veille,
  // un Wi-Fi qui ne laisse rien passer…). Les lectures et les connexions sont relancées une fois
  // toutes seules ; les enregistrements, non (pour ne pas noter deux fois la même séance).
  var RETRY = { ping: 1, roster: 1, login: 1, adultLogin: 1, me: 1, league: 1, family: 1, kid: 1, group: 1, mesEnfants: 1, listEducs: 1, compos: 1, educsListe: 1 };
  var T = MC.CONFIG.TIMEOUTS || { read: 15000, retry: 20000, write: 40000 };
  function raw(action, params) {
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
    var body = JSON.stringify(req);
    if (!RETRY[action]) return send(body, T.write);
    return send(body, T.read).catch(function (e) {
      if (e.code !== 'reseau' && e.code !== 'lent') throw e;
      return new Promise(function (r) { setTimeout(r, 600); }).then(function () { return send(body, T.retry); });
    });
  }
  function send(body, limit) {
    return new Promise(function (resolve, reject) {
      var ctrl = window.AbortController ? new AbortController() : null, over = false;
      var tm = setTimeout(function () {
        over = true;
        try { if (ctrl) ctrl.abort(); } catch (e) { }
        reject(new ApiError({ error: 'lent', message: 'Le serveur ne répond pas. Vérifie la connexion internet (Wi-Fi ou 4G), puis réessaie.' }));
      }, limit);
      var o = { method: 'POST', body: body, redirect: 'follow' };
      if (ctrl) o.signal = ctrl.signal;
      fetch(MC.CONFIG.API_URL, o)
        .catch(function () { throw new ApiError({ error: 'reseau', message: 'Pas de connexion internet. Réessaie dans un instant.' }); })
        .then(function (r) { return r.json().catch(function () { throw new ApiError({ error: 'reseau', message: 'Le serveur ne répond pas correctement.' }); }); })
        .then(function (res) { if (!res.ok) throw new ApiError(res); return res; })
        .then(function (res) { clearTimeout(tm); if (!over) resolve(res); }, function (e) { clearTimeout(tm); if (!over) reject(e); });
    });
  }

  return { call: call, DEMO: DEMO, resetDemo: resetDemo, ApiError: ApiError };
})();
