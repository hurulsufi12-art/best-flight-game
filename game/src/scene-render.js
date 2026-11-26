// Scene renderer: sky, sea, islands, runways, rings and the aircraft,
// drawn fresh from the flight state every frame. No images, no assets.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  var W = 1280, H = 720;

  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSky(ctx, state) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b3a67');
    g.addColorStop(0.35, '#7b5ea7');
    g.addColorStop(0.62, '#ff9a56');
    g.addColorStop(1, '#ffb37a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Low sun on the horizon, ahead-left of the heading.
    var sunX = W * 0.5 - MS.angleDiff(state.heading, 270) * 1.2;
    var sunY = H * 0.5 - state.pitch * 7 - 40;
    var sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
    sg.addColorStop(0, 'rgba(255,236,180,0.95)');
    sg.addColorStop(0.25, 'rgba(255,180,90,0.75)');
    sg.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, Math.PI * 2); ctx.fill();
  }

  function drawSea(ctx, state) {
    var horizonY = H / 2 - state.pitch * 7;
    var g = ctx.createLinearGradient(0, horizonY, 0, H);
    g.addColorStop(0, '#3d8aa5');
    g.addColorStop(0.5, '#22607e');
    g.addColorStop(1, '#143d55');
    ctx.fillStyle = g;
    ctx.fillRect(-W, horizonY, W * 3, H - horizonY + W);
    // Sun glitter: a few bright dashes on the water ahead.
    ctx.fillStyle = 'rgba(255,220,150,0.35)';
    for (var i = 0; i < 14; i++) {
      var gx = W / 2 + ((i * 137) % 700) - 350;
      var gy = horizonY + 40 + ((i * 89) % 240);
      ctx.fillRect(gx, gy, 26 + (i % 3) * 14, 2);
    }
  }

  function drawIsland(ctx, state, island) {
    var p = MS.project(state, island.x, island.y, 0);
    if (!p) return;
    var rx = island.r * p.scale, ry = rx * 0.36;
    if (rx < 2) return;
    ctx.fillStyle = '#e8d29a';
    ellipse(ctx, p.x, p.y, rx * 1.06, ry * 1.06);
    ctx.fillStyle = '#4a8a4f';
    ellipse(ctx, p.x, p.y, rx, ry);
    ctx.fillStyle = '#3a7040';
    ellipse(ctx, p.x - rx * 0.3, p.y - ry * 0.25, rx * 0.45, ry * 0.5);
    ellipse(ctx, p.x + rx * 0.35, p.y - ry * 0.15, rx * 0.35, ry * 0.45);
    ctx.fillStyle = '#5da464';
    ellipse(ctx, p.x + rx * 0.1, p.y - ry * 0.4, rx * 0.3, ry * 0.35);
    // Palm dots along the shore.
    ctx.fillStyle = '#2c5a30';
    for (var i = 0; i < 8; i++) {
      var a = i * 0.8 + island.x * 0.001;
      ellipse(ctx, p.x + Math.cos(a) * rx * 0.85, p.y + Math.sin(a) * ry * 0.85, 2.5, 2.5);
    }
    if (rx > 60) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(island.name, p.x, p.y - ry - 8);
    }
  }

  function drawRunway(ctx, state, runway) {
    var h = MS.deg2rad(runway.heading);
    var ax = Math.sin(h), ay = Math.cos(h);
    var px = Math.cos(h), py = -Math.sin(h);
    var hl = runway.length / 2, hw = runway.width / 2;
    var corners = [];
    var ok = true;
    var signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (var i = 0; i < 4; i++) {
      var cx = runway.x + ax * hl * signs[i][0] + px * hw * signs[i][1];
      var cy = runway.y + ay * hl * signs[i][0] + py * hw * signs[i][1];
      var p = MS.project(state, cx, cy, 0);
      if (!p) { ok = false; break; }
      corners.push(p);
    }
    if (!ok) return;
    ctx.fillStyle = '#333842';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (var j = 1; j < 4; j++) ctx.lineTo(corners[j].x, corners[j].y);
    ctx.closePath(); ctx.fill();
    // Centreline dashes.
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var steps = 9;
    for (var s = 0; s < steps; s++) {
      var t0 = -hl + (2 * hl * s) / steps, t1 = t0 + hl / steps;
      var a = MS.project(state, runway.x + ax * t0, runway.y + ay * t0, 0);
      var b = MS.project(state, runway.x + ax * t1, runway.y + ay * t1, 0);
      if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    }
    ctx.stroke();
    // Threshold bars at both ends.
    ctx.fillStyle = '#f5f5f5';
    for (var e = -1; e <= 1; e += 2) {
      var tp = MS.project(state, runway.x + ax * hl * e * 0.94, runway.y + ay * hl * e * 0.94, 0);
      if (tp) ellipse(ctx, tp.x, tp.y, Math.max(3, 26 * tp.scale), Math.max(1.5, 5 * tp.scale));
    }
  }

  function drawRing(ctx, state, ring) {
    var p = MS.project(state, ring.x, ring.y, ring.z);
    if (!p) return;
    var r = ring.radius * p.scale;
    if (r < 3) return;
    ctx.lineWidth = Math.max(3, r * 0.14);
    ctx.strokeStyle = ring.passed ? '#37d67a' : '#ff8c1a';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
    if (r > 26 && ring.passed) {
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold ' + Math.round(Math.max(14, r * 0.5)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OK', p.x, p.y - r - 10);
    }
  }

  function drawCloud(ctx, state, cloud) {
    var p = MS.project(state, cloud.x, cloud.y, cloud.z);
    if (!p) return;
    var r = cloud.r * p.scale;
    if (r < 2) return;
    ctx.fillStyle = 'rgba(255,244,230,0.85)';
    ellipse(ctx, p.x, p.y, r, r * 0.32);
    ellipse(ctx, p.x - r * 0.5, p.y + r * 0.08, r * 0.6, r * 0.26);
    ellipse(ctx, p.x + r * 0.55, p.y + r * 0.06, r * 0.65, r * 0.28);
  }

  function drawBirds(ctx, state) {
    ctx.strokeStyle = 'rgba(40,30,40,0.8)';
    ctx.lineWidth = 2;
    for (var i = 0; i < state.world.birds.length; i++) {
      var b = state.world.birds[i];
      var bx = b.x + Math.sin(state.time * 0.2 + b.phase) * 300;
      var p = MS.project(state, bx, b.y, b.z);
      if (!p || p.scale < 0.05) continue;
      var s = 6 * p.scale + 2;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y); ctx.quadraticCurveTo(p.x, p.y - s * 0.7, p.x + s, p.y);
      ctx.stroke();
    }
  }

  // The aircraft, seen from behind and above: fuselage, two wings, tail
  // fin, stabiliser, canopy, spinning prop and nav lights — seven parts.
  function drawPlane(ctx, state) {
    var cx = W / 2, cy = 480;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(MS.deg2rad(state.roll));
    // Main wings.
    ctx.fillStyle = '#e86a10';
    ctx.beginPath();
    ctx.moveTo(-118, 18); ctx.lineTo(-14, -6); ctx.lineTo(-14, 14); ctx.lineTo(-118, 34); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(118, 18); ctx.lineTo(14, -6); ctx.lineTo(14, 14); ctx.lineTo(118, 34); ctx.closePath(); ctx.fill();
    // Tail stabiliser and fin.
    ctx.fillStyle = '#d95f0c';
    ctx.beginPath();
    ctx.moveTo(-52, 58); ctx.lineTo(-10, 46); ctx.lineTo(-10, 58); ctx.lineTo(-52, 66); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(52, 58); ctx.lineTo(10, 46); ctx.lineTo(10, 58); ctx.lineTo(52, 66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c24f08';
    ctx.beginPath();
    ctx.moveTo(0, 44); ctx.lineTo(-8, 78); ctx.lineTo(8, 78); ctx.closePath(); ctx.fill();
    // Fuselage with shading stripe.
    var fg = ctx.createLinearGradient(-16, 0, 16, 0);
    fg.addColorStop(0, '#ff8c2a'); fg.addColorStop(0.5, '#ffb35c'); fg.addColorStop(1, '#e86a10');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.quadraticCurveTo(18, -60, 16, 10);
    ctx.quadraticCurveTo(15, 62, 8, 82);
    ctx.lineTo(-8, 82); ctx.lineTo(-15, 62);
    ctx.quadraticCurveTo(-16, 10, -18, -60);
    ctx.quadraticCurveTo(-16, -90, 0, -96);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3e0';
    ctx.fillRect(-13, -30, 26, 7);
    // Canopy.
    ctx.fillStyle = '#7ec8e3';
    ctx.beginPath(); ctx.ellipse(0, -58, 10, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-3, -64, 4, 9, -0.3, 0, Math.PI * 2); ctx.fill();
    // Prop blur disc at the nose.
    ctx.fillStyle = 'rgba(220,230,240,0.35)';
    ctx.beginPath(); ctx.ellipse(0, -92, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(0, -92, 4, 0, Math.PI * 2); ctx.fill();
    // Nav lights.
    ctx.fillStyle = '#ff2e2e'; ctx.beginPath(); ctx.arc(-118, 26, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2eff5e'; ctx.beginPath(); ctx.arc(118, 26, 4, 0, Math.PI * 2); ctx.fill();
    // Registration.
    ctx.fillStyle = '#5a2d00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PK-MSN', 0, 40);
    ctx.restore();
  }

  function drawCockpitFrame(ctx) {
    // Glareshield, pillars and nose: the cockpit the pilot sees.
    ctx.fillStyle = '#1d2126';
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, 560);
    ctx.quadraticCurveTo(W / 2, 520, W, 560);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23282e';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(150, 0); ctx.lineTo(90, 560); ctx.lineTo(0, 560); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(W - 150, 0); ctx.lineTo(W - 90, 560); ctx.lineTo(W, 560); ctx.closePath(); ctx.fill();
    // Nose cone and wingtips peeking past the shield.
    var ng = ctx.createLinearGradient(0, 520, 0, 640);
    ng.addColorStop(0, '#ff8c2a'); ng.addColorStop(1, '#c24f08');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, 560); ctx.quadraticCurveTo(W / 2, 520, W / 2 + 60, 560);
    ctx.lineTo(W / 2 + 26, 640); ctx.lineTo(W / 2 - 26, 640); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e86a10';
    ctx.beginPath(); ctx.moveTo(0, 600); ctx.lineTo(210, 566); ctx.lineTo(210, 600); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 600); ctx.lineTo(W - 210, 566); ctx.lineTo(W - 210, 600); ctx.closePath(); ctx.fill();
  }

  function drawOverlay(ctx, state) {
    if (state.screen === 'title') {
      ctx.fillStyle = 'rgba(20,16,40,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe9b0';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('MERPATI SENJA', W / 2, 150);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('— Island Hopper —', W / 2, 195);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#ffe9b0';
      ctx.fillText('Fly the sunset route: rings, a parcel run to Pulau Dua, then home before the fuel runs out.', W / 2, 250);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('W / Up: throttle up    S / Down: throttle down    Left / Right: turn    I / K: climb / descend', W / 2, 300);
      ctx.fillText('Mouse: fine pitch and roll    Space: air brake    Click or C: chase / cockpit camera    P: pause', W / 2, 330);
      ctx.fillText('Land gently on a runway: descent under 500 ft/min, wings level.', W / 2, 360);
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('Press Enter to fly', W / 2, 430);
      return;
    }
    if (state.screen === 'paused') {
      ctx.fillStyle = 'rgba(20,16,40,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, 340);
      ctx.font = '22px sans-serif';
      ctx.fillText('Press P to keep flying', W / 2, 390);
      return;
    }
    if (state.screen === 'complete') {
      ctx.fillStyle = 'rgba(16,40,24,0.62)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SORTIE COMPLETE', W / 2, 300);
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px sans-serif';
      ctx.fillText('Score ' + state.score + '   ·   Fuel ' + Math.round(state.fuel) + '% left', W / 2, 350);
      ctx.font = '22px sans-serif';
      ctx.fillText('Press R to fly again', W / 2, 400);
      return;
    }
    if (state.screen === 'over') {
      ctx.fillStyle = 'rgba(50,10,10,0.62)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff6b5e';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED', W / 2, 300);
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px sans-serif';
      ctx.fillText(state.message || 'The aircraft is down.', W / 2, 350);
      ctx.font = '22px sans-serif';
      ctx.fillText('Score ' + state.score + '   ·   Press R to try again', W / 2, 400);
    }
  }

  function drawScene(ctx, state) {
    drawSky(ctx, state);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(MS.deg2rad(state.roll));
    ctx.translate(-W / 2, -H / 2);
    drawSea(ctx, state);
    var far = state.world.clouds.slice().sort(function (a, b) { return b.z - a.z; });
    for (var c = 0; c < far.length; c++) drawCloud(ctx, state, far[c]);
    var islands = state.world.islands.slice().sort(function (a, b) {
      var pa = MS.project(state, a.x, a.y, 0), pb = MS.project(state, b.x, b.y, 0);
      return (pb ? pb.dist : 0) - (pa ? pa.dist : 0);
    });
    for (var i = 0; i < islands.length; i++) drawIsland(ctx, state, islands[i]);
    for (var r = 0; r < state.world.runways.length; r++) drawRunway(ctx, state, state.world.runways[r]);
    for (var g = 0; g < state.world.rings.length; g++) drawRing(ctx, state, state.world.rings[g]);
    drawBirds(ctx, state);
    ctx.restore();
    if (state.camera === 'cockpit') drawCockpitFrame(ctx);
    else drawPlane(ctx, state);
    drawOverlay(ctx, state);
  }

  MS.drawScene = drawScene;
  MS.drawPlane = drawPlane;
})(typeof window !== 'undefined' ? window : globalThis);
