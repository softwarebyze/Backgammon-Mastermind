/* global output */
// Race positions with real engine answers: no double/take and double/pass.
function moneyLink(whitePoint) {
  const points = Array.from({ length: 25 }, () => ({ player: null, count: 0 }));
  points[whitePoint] = { player: 'white', count: 15 };
  points[19] = { player: 'black', count: 15 };
  return `backgammonmastermind.preview://position?data=${encodeURIComponent(JSON.stringify({
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
      matchLength: 0,
      scores: { white: 0, black: 0 },
      crawford: false,
      jacoby: true,
      beavers: false,
      maxCube: 10,
      gameState: 1,
      resignation: 0,
      doubleAction: '',
    },
  }))}`;
}
output.moneyNoDoubleLink = moneyLink(6);
output.moneyDoubleLink = moneyLink(3);
