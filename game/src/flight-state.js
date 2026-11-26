// Flight state: one object holds everything the game simulates.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});

  function newFlight(seed) {
    var world = MS.buildWorld(seed);
    var home = world.runways[0];
    return {
      seed: seed,
      world: world,
      screen: 'title', // title | play | paused | complete | over
      camera: 'chase', // chase | cockpit
      x: home.x, y: home.y, alt: 0,
      heading: home.heading,
      speed: 0, vspeed: 0,
      pitch: 0, roll: 0,
      throttle: 0,
      fuel: 100, damage: 0,
      score: 0, discipline: 0,
      mission: 1,
      ringsPassed: 0,
      time: 0,
      grounded: true,
      engineOut: false,
      crashed: false,
      landed: false,
      message: '',
      messageTime: 0,
    };
  }

  function worldRunway(world, index) {
    return world.runways[index] || world.runways[0];
  }

  function applyDamage(state, amount) {
    if (state.screen !== 'play') return;
    state.damage = MS.clamp(state.damage + amount, 0, 100);
    if (state.damage >= 100) {
      state.damage = 100;
      state.crashed = true;
      state.screen = 'over';
      state.message = 'Airframe destroyed';
    }
  }

  // Current objective: a ring to fly through, or a runway to land on.
  function missionTarget(state) {
    if (state.mission === 1) {
      var ring = state.world.rings[state.ringsPassed];
      if (ring) return { kind: 'ring', x: ring.x, y: ring.y, z: ring.z, label: 'Ring ' + (state.ringsPassed + 1) + ' of 3' };
      return { kind: 'ring', x: 0, y: 0, z: 1200, label: 'Rings done' };
    }
    if (state.mission === 2) {
      var rw = state.world.runways[1];
      return { kind: 'runway', x: rw.x, y: rw.y, z: 0, heading: rw.heading, label: 'Land on Pulau Dua runway' };
    }
    var home = state.world.runways[0];
    return { kind: 'runway', x: home.x, y: home.y, z: 0, heading: home.heading, label: 'Return home and land' };
  }

  MS.newFlight = newFlight;
  MS.worldRunway = worldRunway;
  MS.applyDamage = applyDamage;
  MS.missionTarget = missionTarget;
})(typeof window !== 'undefined' ? window : globalThis);
