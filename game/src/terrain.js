// Procedural island world: seeded, so seed 1 always builds the same islands,
// runways, rings and clouds. All distances in feet, headings in degrees
// (0 = north, 90 = east).
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});

  function buildWorld(seed) {
    var rnd = MS.mulberry32(seed);
    function jitter(v, amt) { return v + (rnd() - 0.5) * 2 * amt; }
    var islands = [
      { x: 0, y: 0, r: 2600, name: 'Pulau Senja', hills: 3 },
      { x: jitter(9000, 600), y: jitter(6500, 600), r: 2300, name: 'Pulau Dua', hills: 2 },
      { x: jitter(-5200, 800), y: jitter(5800, 800), r: 1800, name: 'Pulau Barat', hills: 2 },
      { x: jitter(4200, 800), y: jitter(-6200, 800), r: 2000, name: 'Pulau Selatan', hills: 3 },
      { x: jitter(-6800, 900), y: jitter(-4500, 900), r: 1400, name: 'Pulau Kecil', hills: 1 },
    ];
    var runways = [
      { x: 0, y: 0, heading: 90, length: 1800, width: 130, island: 0 },
      { x: islands[1].x, y: islands[1].y, heading: 45, length: 1500, width: 120, island: 1 },
    ];
    // Rings arc from home toward Pulau Dua, so mission 1 teaches the route.
    var rings = [];
    var stops = [
      [3000, 1500, 1200], [6000, 3500, 1400], [8000, 5500, 1200],
    ];
    for (var i = 0; i < stops.length; i++) {
      rings.push({
        x: jitter(stops[i][0], 150), y: jitter(stops[i][1], 150),
        z: stops[i][2], radius: MS.CFG.ringRadius, passed: false,
      });
    }
    var clouds = [];
    for (var c = 0; c < 14; c++) {
      clouds.push({
        x: (rnd() - 0.5) * 22000, y: (rnd() - 0.5) * 22000,
        z: 2800 + rnd() * 1400, r: 500 + rnd() * 700,
      });
    }
    var birds = [];
    for (var b = 0; b < 6; b++) {
      birds.push({ x: (rnd() - 0.5) * 12000, y: (rnd() - 0.5) * 12000, z: 900 + rnd() * 500, phase: rnd() * 6.28 });
    }
    return { seed: seed, islands: islands, runways: runways, rings: rings, clouds: clouds, birds: birds };
  }

  // Project a world point into screen space from the chase camera.
  // Returns null when the point is behind the camera.
  function project(state, px, py, pz) {
    var W = MS.CFG.viewWidth, H = MS.CFG.viewHeight, F = MS.CFG.focal;
    var h = MS.deg2rad(state.heading);
    var fx = Math.sin(h), fy = Math.cos(h);
    var rx = Math.cos(h), ry = -Math.sin(h);
    // Camera sits behind and above the aircraft. Shots may override the
    // distance and lift (a high view for the parked scenes).
    var camDist = state.camDist || (state.camera === 'cockpit' ? -60 : 420);
    var camLift = state.camLift || (state.camera === 'cockpit' ? 40 : 130);
    var camX = state.x - fx * camDist;
    var camY = state.y - fy * camDist;
    var camZ = state.alt + camLift;
    var dx = px - camX, dy = py - camY, dz = pz - camZ;
    var d = dx * fx + dy * fy;
    if (d < 120) return null;
    var lat = dx * rx + dy * ry;
    var denom = d + 800;
    var horizonY = H / 2 - state.pitch * 7;
    var sx = W / 2 + lat * F / denom;
    var sy = horizonY + (camZ - pz) * F / denom;
    // Roll is applied by the renderer as a canvas rotation, so the
    // projection itself stays in unrotated screen space.
    return { x: sx, y: sy, scale: F / denom, dist: d };
  }

  MS.buildWorld = buildWorld;
  MS.project = project;
})(typeof window !== 'undefined' ? window : globalThis);
