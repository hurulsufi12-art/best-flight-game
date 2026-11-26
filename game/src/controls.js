// Keyboard and mouse input: reads the physical controls into one input frame.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});
  // Live key state, shared with the loop. Keys are tracked by code, not by
  // character, so any keyboard layout works.
  var keys = {};
  var mouse = { x: 0, y: 0, moved: false, down: false };
  var cameraToggle = false;
  var pauseToggle = false;
  var startPressed = false;
  var restartPressed = false;

  function bind(doc, win) {
    doc.addEventListener('keydown', function (e) {
      keys[e.code] = true;
      if (e.code === 'Enter') startPressed = true;
      if (e.code === 'KeyR') restartPressed = true;
      if (e.code === 'KeyP') pauseToggle = true;
      if (e.code === 'KeyC') cameraToggle = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
    });
    doc.addEventListener('keyup', function (e) { keys[e.code] = false; });
    doc.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true;
    });
    doc.addEventListener('mousedown', function () { mouse.down = true; cameraToggle = true; });
    doc.addEventListener('mouseup', function () { mouse.down = false; });
    win.addEventListener('blur', function () { for (var k in keys) keys[k] = false; });
  }

  // Build one input frame from the live controls. Throttle is a held value:
  // W / ArrowUp raises it, S / ArrowDown lowers it, so the pilot sets a
  // throttle and it stays. Mouse drift adds fine pitch and roll trim.
  function readInput(prevThrottle, viewW, viewH) {
    var throttle = prevThrottle;
    if (keys.KeyW || keys.ArrowUp) throttle = MS.clamp(throttle + 40 * (1 / 60), 0, 100);
    if (keys.KeyS || keys.ArrowDown) throttle = MS.clamp(throttle - 40 * (1 / 60), 0, 100);
    var turn = 0;
    if (keys.ArrowLeft || keys.KeyA) turn -= 1;
    if (keys.ArrowRight || keys.KeyD) turn += 1;
    var pitch = 0;
    if (keys.KeyI) pitch += 1;
    if (keys.KeyK) pitch -= 1;
    if (mouse.moved) {
      var mx = (mouse.x / viewW - 0.5) * 2;
      var my = (mouse.y / viewH - 0.5) * 2;
      turn = MS.clamp(turn + mx * 0.6, -1, 1);
      pitch = MS.clamp(pitch - my * 0.5, -1, 1);
    }
    var brake = !!(keys.Space);
    var out = {
      throttle: throttle, turn: turn, pitch: pitch, brake: brake,
      cameraToggle: cameraToggle, pauseToggle: pauseToggle,
      startPressed: startPressed, restartPressed: restartPressed,
    };
    cameraToggle = false; pauseToggle = false; startPressed = false; restartPressed = false;
    return out;
  }

  function resetKeys() { for (var k in keys) keys[k] = false; mouse.moved = false; }
  MS.controls = { bind: bind, readInput: readInput, resetKeys: resetKeys };
})(typeof window !== 'undefined' ? window : globalThis);
