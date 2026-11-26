// Instruments and HUD: the numbers and dials the pilot flies by.
// HUD readouts are 30px so they stay readable when the cover is shrunk.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  var W = 1280, H = 720;

  function chip(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(12,18,28,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,176,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function bigReadout(ctx, x, y, label, value, unit) {
    chip(ctx, x, y, 210, 64);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb35c';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(label, x + 12, y + 19);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(value, x + 12, y + 50);
    var valueW = ctx.measureText(value).width;
    ctx.fillStyle = '#c8d4e0';
    ctx.font = '16px sans-serif';
    ctx.fillText(unit, x + 12 + valueW + 8, y + 50);
  }

  function compassStrip(ctx, state) {
    var cx = W / 2, cy = 22;
    chip(ctx, cx - 210, 8, 420, 44);
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - 210, 8, 420, 44); ctx.clip();
    ctx.textAlign = 'center';
    for (var d = -60; d <= 60; d += 5) {
      var hdg = MS.wrapDeg(state.heading + d);
      var x = cx + d * 3.2;
      var major = hdg % 45 === 0;
      ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, major ? 34 : 28); ctx.stroke();
      if (major) {
        var names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
        ctx.fillStyle = '#ffe9b0';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(names[hdg] || String(hdg), x, 48);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#ff8c1a';
    ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx - 7, 18); ctx.lineTo(cx + 7, 18); ctx.closePath(); ctx.fill();
  }

  function dial(ctx, x, y, r, label, value, max, unit, color) {
    ctx.fillStyle = 'rgba(12,18,28,0.78)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,176,0.6)';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c8d4e0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i <= 10; i++) {
      var a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      var x1 = x + Math.cos(a) * (r - 8), y1 = y + Math.sin(a) * (r - 8);
      var x2 = x + Math.cos(a) * (r - 16), y2 = y + Math.sin(a) * (r - 16);
      ctx.strokeStyle = '#c8d4e0';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    var frac = MS.clamp(value / max, 0, 1);
    var na = Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * (r - 20), y + Math.sin(na) * (r - 20)); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(String(Math.round(value)), x, y + r * 0.45);
    ctx.fillStyle = '#ffb35c';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label + ' ' + unit, x, y + r + 16);
  }

  function horizon(ctx, x, y, r, state) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(MS.deg2rad(state.roll));
    var dy = MS.clamp(state.pitch, -12, 12) * 3;
    ctx.fillStyle = '#7ec8e3';
    ctx.fillRect(-r, -r + dy, r * 2, r - dy);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-r, dy, r * 2, r - dy + 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r, dy); ctx.lineTo(r, dy); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,233,176,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // Fixed aircraft symbol.
    ctx.strokeStyle = '#ffe9b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 26, y); ctx.lineTo(x - 8, y);
    ctx.moveTo(x + 8, y); ctx.lineTo(x + 26, y);
    ctx.moveTo(x, y); ctx.lineTo(x, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#ffb35c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HORIZON', x, y + r + 16);
  }

  function bar(ctx, x, y, w, h, frac, color, label) {
    chip(ctx, x - 6, y - 18, w + 12, h + 36);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, w * MS.clamp(frac, 0, 1)), h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label + ' ' + Math.round(frac * 100) + '%', x, y - 6);
  }

  function drawInstruments(ctx, state) {
    var cockpit = state.camera === 'cockpit';
    var panelY = cockpit ? 536 : 556;
    // Bottom instrument panel.
    ctx.fillStyle = 'rgba(10,14,22,0.82)';
    ctx.fillRect(0, panelY, W, H - panelY);
    ctx.strokeStyle = 'rgba(255,233,176,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(W, panelY); ctx.stroke();
    var cy = panelY + 78;
    dial(ctx, 120, cy, 62, 'ALT', state.alt, 5000, 'FT', '#37d67a');
    horizon(ctx, 330, cy, 62, state);
    dial(ctx, W - 120, cy, 62, 'SPD', state.speed, 240, 'KT', '#ff8c1a');
    // Fuel and damage bars sit between the horizon and the speedometer.
    bar(ctx, 470, cy - 30, 260, 18, state.fuel / 100, state.fuel < 25 ? '#ff5e4d' : '#37d67a', 'FUEL');
    bar(ctx, 470, cy + 18, 260, 18, state.damage / 100, state.damage > 60 ? '#ff5e4d' : '#ffb35c', 'DMG');
    // Throttle bar on the left edge, below the HUD chips.
    var th = state.throttle / 100;
    ctx.fillStyle = 'rgba(12,18,28,0.72)';
    ctx.fillRect(16, 300, 26, 220);
    ctx.fillStyle = th >= 0.55 && th <= 0.85 ? '#37d67a' : '#ff8c1a';
    ctx.fillRect(20, 300 + 212 * (1 - th), 18, 212 * th);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('THR ' + Math.round(state.throttle) + '%', 16, 292);
    ctx.fillStyle = '#37d67a';
    ctx.fillRect(20, 300 + 212 * 0.15, 18, 212 * 0.3);
    // Big HUD readouts, top-left.
    bigReadout(ctx, 16, 64, 'ALTITUDE', String(Math.round(state.alt)), 'FT');
    bigReadout(ctx, 16, 136, 'SPEED', String(Math.round(state.speed)), 'KT');
    bigReadout(ctx, 16, 208, 'HEADING', String(Math.round(state.heading)).padStart(3, '0'), 'DEG');
    compassStrip(ctx, state);
    // Mission and score, top-right.
    chip(ctx, W - 330, 64, 314, 88);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb35c';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(MS.missionInfo(state).title.toUpperCase(), W - 318, 84);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(MS.missionLine(state).split('  ·  ')[1] || '', W - 318, 110);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SCORE ' + state.score + '   ' + Math.floor(state.time / 60) + ':' + String(Math.floor(state.time % 60)).padStart(2, '0'), W - 318, 140);
    // Transient message, centre — skipped on end screens, whose overlay
    // already states the outcome.
    if (state.messageTime > 0 && state.message && state.screen === 'play') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(12,18,28,0.75)';
      var mw = ctx.measureText(state.message).width + 40;
      ctx.beginPath(); ctx.roundRect(W / 2 - mw / 2, 273, mw, 40, 10); ctx.fill();
      ctx.fillStyle = '#ffe9b0';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(state.message, W / 2, 300);
    }
  }

  MS.drawInstruments = drawInstruments;
})(typeof window !== 'undefined' ? window : globalThis);
