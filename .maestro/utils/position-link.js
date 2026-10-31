/* global output */
// A standard board with a fixed 5-2 roll, independent of developer-only routes.
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
output.sharedPositionLink = `backgammonmastermind.preview://position?data=${encodeURIComponent(JSON.stringify({
  version: 1,
  points,
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: 'white',
  dice: [5, 2],
  context: {
    cubeExponent: 1,
    cubeOwner: 'black',
    turnOwner: 'white',
    matchLength: 9,
    scores: { white: 4, black: 2 },
    crawford: false,
    jacoby: true,
    beavers: false,
    maxCube: 10,
    gameState: 1,
    resignation: 0,
    doubleAction: '',
  },
}))}`;
