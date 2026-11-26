// Flight physics: throttle, lift, turns, fuel, damage, rings, landings.
// One fixed step; no clocks, no randomness, so replays are exact.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  var CFG = MS.CFG;

  function clampInput(input) {
    input = input || {};
    return {
      throttle: typeof input.throttle === 'number' ? MS.clamp(input.throttle, 0, 100) : 0,
      turn: typeof input.turn === 'number' ? MS.clamp(input.turn, -1, 1) : 0,
      pitch: typeof input.pitch === 'number' ? MS.clamp(input.pitch, -1, 1) : 0,
      brake: !!input.brake,
    };
  }

  // Is the aircraft over a runway, close enough to its centreline to land?
  function overRunway(state, runway) {
    var h = MS.deg2rad(runway.heading);
    var ax = Math.sin(h), ay = Math.cos(h);
    var dx = state.x - runway.x, dy = state.y - runway.y;
    var along = dx * ax + dy * ay;
    var across = dx * ay - dy * ax;
    return Math.abs(along) < runway.length / 2 && Math.abs(across) < runway.width / 2 + 40;
  }

  function landCheck(state) {
    for (var i = 0; i < state.world.runways.length; i++) {
      if (overRunway(state, state.world.runways[i])) return i;
    }
    return -1;
  }

  // A ring counts when the aircraft passes within its radius in 3D.
  function ringHit(state) {
    for (var i = 0; i < state.world.rings.length; i++) {
      var ring = state.world.rings[i];
      if (ring.passed) continue;
      var dx = state.x - ring.x, dy = state.y - ring.y, dz = state.alt - ring.z;
      if (dx * dx + dy * dy + dz * dz < ring.radius * ring.radius) return i;
    }
    return -1;
  }

  function stepFlight(state, input, dt) {
    if (!state || state.screen !== 'play') return;
    if (!(dt > 0)) return;
    var inp = clampInput(input);
    state.time += dt;
    // Above the ground the aircraft is airborne, whatever the flag said.
    if (state.alt > 0) state.grounded = false;

    // Fuel: burn is proportional to throttle; empty tank kills the engine.
    if (!state.engineOut) {
      state.fuel = Math.max(0, state.fuel - inp.throttle / 100 * CFG.fuelBurn * dt);
      if (state.fuel <= 0) {
        state.engineOut = true;
        state.message = 'Fuel empty — gliding';
        state.messageTime = 3;
      }
    }
    state.throttle = state.engineOut ? 0 : inp.throttle;
    if (inp.brake) state.throttle = Math.max(0, state.throttle - 30 * dt);

    // Speed chases the throttle target; the brake and the glide cap it.
    var target = state.engineOut ? CFG.glideSpeed : state.throttle / 100 * CFG.maxSpeed;
    if (inp.brake) target = Math.min(target, 60);
    var rate = state.speed < target ? 40 : Math.max(30, Math.abs(target - state.speed) * 0.6);
    state.speed += MS.clamp(target - state.speed, -rate * dt, rate * dt);
    if (state.speed < 0) state.speed = 0;

    // Attitude: roll banks toward the turn, pitch toward the input.
    var targetRoll = inp.turn * CFG.maxRoll;
    state.roll += MS.clamp(targetRoll - state.roll, -60 * dt, 60 * dt);
    var targetPitch = inp.pitch * CFG.maxPitch;
    state.pitch += MS.clamp(targetPitch - state.pitch, -30 * dt, 30 * dt);

    // Turn rate grows with bank and speed; heading wraps 0-360.
    var turnRate = inp.turn * CFG.turnRate * MS.clamp(state.speed / 120, 0.3, 1.6);
    state.heading = MS.wrapDeg(state.heading + turnRate * dt);

    // Vertical speed eases toward what the pitch and speed imply, so a
    // descent rate set by the last step survives into the touchdown check.
    var targetVspeed = state.grounded ? 0
      : Math.sin(MS.deg2rad(state.pitch)) * state.speed * CFG.knotToFpm;
    if (state.engineOut && !state.grounded) targetVspeed -= 250;
    state.vspeed += MS.clamp(targetVspeed - state.vspeed, -1200 * dt, 1200 * dt);
    if (state.grounded) state.vspeed = 0;
    state.alt += state.vspeed / 60 * dt;
    if (state.alt < 0) state.alt = 0;

    // Position advances along the heading.
    var h = MS.deg2rad(state.heading);
    var fps = state.speed * CFG.knotToFps;
    state.x += Math.sin(h) * fps * dt;
    state.y += Math.cos(h) * fps * dt;

    // Liftoff: fast enough on the runway with the nose up.
    if (state.grounded && state.speed >= CFG.liftoffSpeed && inp.pitch > 0.2) {
      state.grounded = false;
      state.message = 'Airborne';
      state.messageTime = 2;
    }

    // Discipline: a steady throttle in the green band and gentle turns earn
    // it; full throttle with hard reversals spends it.
    if (!state.grounded && state.speed > 40) {
      if (state.throttle >= 55 && state.throttle <= 85 && Math.abs(inp.turn) <= 0.5) {
        state.discipline += dt * 2;
      } else if (state.throttle >= 98 || Math.abs(inp.turn) >= 0.95) {
        state.discipline = Math.max(0, state.discipline - dt * 1.5);
      }
    }

    // Rings: flying through one scores and may finish mission 1.
    var hit = ringHit(state);
    if (hit >= 0) {
      state.world.rings[hit].passed = true;
      state.ringsPassed += 1;
      state.score += CFG.ringScore;
      state.message = 'Ring ' + state.ringsPassed + ' of 3 — +' + CFG.ringScore;
      state.messageTime = 2;
      if (state.mission === 1 && state.ringsPassed >= 3) {
        state.mission = 2;
        state.message = 'Mission 1 done — deliver the parcel to Pulau Dua';
        state.messageTime = 4;
      }
    }

    // Touchdown: descending close to the ground is judged, not just alt 0.
    if (!state.grounded && state.alt <= 5 && state.vspeed < -50) {
      var rwIndex = landCheck(state);
      var gentle = Math.abs(state.vspeed) <= CFG.landVspeedMax && Math.abs(state.roll) <= CFG.landRollMax;
      if (rwIndex >= 0 && gentle) {
        touchdown(state, rwIndex);
      } else {
        state.alt = 0;
        state.crashed = true;
        state.screen = 'over';
        state.message = rwIndex < 0 ? 'Crashed into the terrain' : 'Hard landing — airframe broke';
      }
      return;
    }
    if (state.messageTime > 0) state.messageTime -= dt;
  }

  function touchdown(state, rwIndex) {
    var runway = state.world.runways[rwIndex];
    state.alt = 0;
    state.speed = Math.min(state.speed, 70);
    state.grounded = true;
    state.landed = true;
    state.vspeed = 0;
    state.roll = 0;
    state.pitch = 0;
    state.score += CFG.landingScore + Math.round(state.discipline);
    if (state.mission === 2 && rwIndex === 1) {
      // Parcel delivered: refuel, turn around, fly home.
      state.mission = 3;
      state.fuel = 100;
      state.engineOut = false;
      state.heading = MS.wrapDeg(runway.heading + 180);
      state.x = runway.x;
      state.y = runway.y;
      state.message = 'Parcel delivered — refuelled, fly home';
      state.messageTime = 4;
    } else {
      state.screen = 'complete';
      state.message = 'Landed safely — sortie complete';
    }
  }

  MS.stepFlight = stepFlight;
  MS.landCheck = landCheck;
  MS.ringHit = ringHit;
  MS.overRunway = overRunway;
})(typeof window !== 'undefined' ? window : globalThis);
