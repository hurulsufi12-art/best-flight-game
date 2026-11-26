// Mission flow: what each mission asks, and how the sortie is scored.
(function (root) {
  'use strict';
  var MS = root.MS || (root.MS = {});

  var MISSIONS = [
    { id: 1, title: 'Mission 1 — Ring Run', goal: 'Fly through rings 1 to 3 over the islands' },
    { id: 2, title: 'Mission 2 — Parcel Drop', goal: 'Deliver the parcel: land on the Pulau Dua runway' },
    { id: 3, title: 'Mission 3 — Fly Home', goal: 'Return to Pulau Senja and land before the fuel runs out' },
  ];

  function missionInfo(state) {
    return MISSIONS[state.mission - 1] || MISSIONS[2];
  }

  // Short status line for the HUD: mission, progress, score.
  function missionLine(state) {
    var info = missionInfo(state);
    var progress = state.mission === 1
      ? 'Rings ' + state.ringsPassed + '/3'
      : state.mission === 2 ? 'Parcel aboard' : 'Heading home';
    return info.title + '  ·  ' + progress + '  ·  Score ' + state.score;
  }

  MS.MISSIONS = MISSIONS;
  MS.missionInfo = missionInfo;
  MS.missionLine = missionLine;
})(typeof window !== 'undefined' ? window : globalThis);
