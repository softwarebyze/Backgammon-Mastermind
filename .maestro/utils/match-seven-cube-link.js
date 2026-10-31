/* global output */
// A 7-point match at 2–1 from the standard start: White to roll, cube in the middle.
const points = [{ player: null, count: 0 }];
for (let i = 1; i <= 24; i++) {
  points.push({ player: null, count: 0 });
}
points[24] = { player: 'white', count: 2 };
points[13] = { player: 'white', count: 5 };
points[8] = { player: 'white', count: 3 };
points[6] = { player: 'white', count: 5 };
points[1] = { player: 'black', count: 2 };
points[12] = { player: 'black', count: 5 };
points[17] = { player: 'black', count: 3 };
points[19] = { player: 'black', count: 5 };
output.matchSevenLink = `backgammonmastermind.preview://position?data=${encodeURIComponent(JSON.stringify({
  version: 1,
  points,
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: 'white',
  dice: [0, 0],
  context: {
    cubeExponent: 0,
    cubeOwner: null,
    turnOwner: 'white',
    matchLength: 7,
    scores: { white: 2, black: 1 },
    crawford: false,
    jacoby: false,
    beavers: false,
    maxCube: 10,
    gameState: 1,
    resignation: 0,
    doubleAction: '',
  },
}))}`;
