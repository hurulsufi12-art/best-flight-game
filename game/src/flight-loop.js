// Main loop and wiring: canvas setup, input, shot mode, animation loop.
// Loads last, after every other module. Runs in the browser only.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  var W = 1280, H = 720;

  function parseQuery(search) {
    var out = { shot: null, seed: 1 };
    if (!search) return out;
    var parts = search.replace(/^\?/, '').split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (kv[0] === 'shot') out.shot = kv[1] || null;
      if (kv[0] === 'seed') out.seed = parseInt(kv[1], 10) || 1;
    }
    return out;
  }

  function resize(canvas) {
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawFrame(ctx, state) {
    ctx.clearRect(0, 0, W, H);
    MS.drawScene(ctx, state);
    MS.drawInstruments(ctx, state);
  }

  function init() {
    var canvas = root.document.getElementById('game');
    var ctx = resize(canvas);
    var query = parseQuery(root.location.search);
    var state = MS.newFlight(query.seed);
    root.__game = { state: state, version: 'merpati-senja-1' };
    MS.controls.bind(root.document, root);

    if (query.shot) {
      // Frozen frame: stage the scene, draw once, never start the loop.
      MS.stageShot(query.shot, state);
      drawFrame(ctx, state);
      root.__shotReady = true;
      return;
    }

    var last = null;
    function frame(t) {
      if (last === null) last = t;
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      var input = MS.controls.readInput(state.throttle, root.innerWidth, root.innerHeight);
      if (input.startPressed && (state.screen === 'title' || state.screen === 'over' || state.screen === 'complete')) {
        var seed = state.seed;
        var fresh = MS.newFlight(seed);
        var keys = Object.keys(fresh);
        for (var i = 0; i < keys.length; i++) state[keys[i]] = fresh[keys[i]];
        state.screen = 'play';
      }
      if (input.restartPressed && (state.screen === 'over' || state.screen === 'complete')) {
        var seed2 = state.seed;
        var fresh2 = MS.newFlight(seed2);
        var keys2 = Object.keys(fresh2);
        for (var j = 0; j < keys2.length; j++) state[keys2[j]] = fresh2[keys2[j]];
        state.screen = 'play';
      }
      if (input.pauseToggle && (state.screen === 'play' || state.screen === 'paused')) {
        state.screen = state.screen === 'play' ? 'paused' : 'play';
      }
      if (input.cameraToggle) state.camera = state.camera === 'chase' ? 'cockpit' : 'chase';
      if (state.screen === 'play') MS.stepFlight(state, input, dt);
      drawFrame(ctx, state);
      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);
  }

  MS.parseQuery = parseQuery;
  if (typeof root.document !== 'undefined' && root.document.readyState !== 'loading') init();
  else if (typeof root.document !== 'undefined') root.document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
