// Screenshot scenes: each one plays the real rules forward from a fresh
// world for a fixed number of steps, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. Shot mode draws ONE frozen frame and never starts
// the animation loop, so captures are byte-identical run to run.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  var STEP = 1 / 60;
  var START_SECONDS = 4;
  var PLAY_SECONDS = 42;

  // Steer toward the current mission target at cruise throttle, holding
  // about 1200 ft. Returns the input frame for one step.
  function autopilot(state) {
    var target = MS.missionTarget(state);
    var want = MS.rad2deg(Math.atan2(target.x - state.x, target.y - state.y));
    var diff = MS.angleDiff(state.heading, want);
    var turn = MS.clamp(diff / 25, -1, 1);
    var pitch = 0;
    if (state.alt < 1100) pitch = 1;
    else if (state.alt > 1350) pitch = -0.4;
    return { throttle: 75, turn: turn, pitch: pitch, brake: false };
  }

  function stageShot(name, state) {
    var fresh = MS.newFlight(state.seed);
    var keys = Object.keys(fresh);
    for (var i = 0; i < keys.length; i++) state[keys[i]] = fresh[keys[i]];
    if (name === 'cockpit') {
      state.screen = 'play';
      state.camera = 'cockpit';
      for (var p = 0; p < PLAY_SECONDS / STEP; p++) MS.stepFlight(state, autopilot(state), STEP);
      return { screen: 'play' };
    }
    if (name === 'play') {
      state.screen = 'play';
      for (var q = 0; q < PLAY_SECONDS / STEP; q++) MS.stepFlight(state, autopilot(state), STEP);
      return { screen: 'play' };
    }
    if (name === 'end') {
      // A finished sortie, parked on the home runway after mission 3.
      state.screen = 'complete';
      state.mission = 3;
      state.ringsPassed = 3;
      state.world.rings.forEach(function (r) { r.passed = true; });
      state.score = 1850;
      state.fuel = 42;
      state.throttle = 0;
      state.speed = 0;
      state.alt = 0;
      state.grounded = true;
      state.message = 'Landed safely — sortie complete';
      state.messageTime = 99;
      state.time = 214;
      parkOnRunway(state);
      return { screen: 'complete' };
    }
    // start (and any unknown name): on the runway, title screen over the scene.
    state.screen = 'title';
    parkOnRunway(state);
    return { screen: 'title' };
  }

  // Park the aircraft at the runway threshold with a high, pulled-back
  // camera, so the parked scenes show sky, sea and the island at once.
  function parkOnRunway(state) {
    var rw = state.world.runways[0];
    var h = MS.deg2rad(rw.heading);
    state.x = rw.x - Math.sin(h) * 800;
    state.y = rw.y - Math.cos(h) * 800;
    state.heading = rw.heading;
    state.camDist = 900;
    state.camLift = 480;
  }

  MS.stageShot = stageShot;
  MS.autopilot = autopilot;
})(typeof window !== 'undefined' ? window : globalThis);
