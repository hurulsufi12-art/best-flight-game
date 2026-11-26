// Merpati Senja — Island Hopper: shared constants and small math helpers.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  MS.CFG = {
    maxSpeed: 220,        // knots at full throttle
    glideSpeed: 55,       // knots, engine-out glide
    liftoffSpeed: 75,     // knots, wheels leave the runway
    maxPitch: 12,         // degrees, pitch input maps to +/- this
    maxRoll: 25,          // degrees, turn input maps to +/- this
    turnRate: 18,         // degrees per second at full turn and 120 kt
    fuelBurn: 0.35,       // percent of fuel per second at full throttle
    ringRadius: 160,      // feet, ring pass distance
    ringScore: 100,
    landingScore: 500,
    landVspeedMax: 500,   // feet per minute, gentle touchdown limit
    landRollMax: 10,      // degrees, level-wings touchdown limit
    crashVspeed: 500,     // feet per minute, harder than this on the ground is a crash
    knotToFps: 1.6878,    // 1 knot in feet per second
    knotToFpm: 101.27,    // 1 knot in feet per minute
    viewWidth: 1280,
    viewHeight: 720,
    focal: 900,           // projection focal length in pixels
  };
  MS.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  MS.lerp = function (a, b, t) { return a + (b - a) * t; };
  MS.deg2rad = function (d) { return d * Math.PI / 180; };
  MS.rad2deg = function (r) { return r * 180 / Math.PI; };
  MS.wrapDeg = function (d) { d = d % 360; return d < 0 ? d + 360 : d; };
  // Smallest signed difference from a to b, in (-180, 180].
  MS.angleDiff = function (a, b) {
    var d = (b - a) % 360;
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  };
  // Deterministic seeded random (mulberry32). Same seed, same world.
  MS.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
