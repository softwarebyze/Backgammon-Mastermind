/* global output */
// Race positions with real engine answers: no double/take and double/pass.
function moneyLink(whitePoint, { blackPoint = 19, beavers = false, matchLength = 0, dice = [0, 0], currentPlayer = 'white', count = 15, cubeExponent = 0, cubeOwner = null, doubleAction = '', turnOwner = currentPlayer } = {}) {
  const points = Array.from({ length: 25 }, () => ({ player: null, count: 0 }));
  points[whitePoint] = { player: 'white', count };
  points[blackPoint] = { player: 'black', count };
  return `backgammonmastermind.preview://position?data=${encodeURIComponent(JSON.stringify({
    version: 1,
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: 15 - count, black: 15 - count },
    currentPlayer,
    dice,
    context: {
      cubeExponent,
      cubeOwner,
      turnOwner,
      matchLength,
      scores: { white: 0, black: 0 },
      crawford: false,
      jacoby: true,
      beavers,
      maxCube: 10,
      gameState: 1,
      resignation: 0,
      doubleAction,
    },
  }))}`;
}
output.moneyNoDoubleLink = moneyLink(6);
output.moneyDoubleLink = moneyLink(3);

output.moneyTutorLink = moneyLink(5);
output.moneyBeaverLink = moneyLink(6, { blackPoint: 22, beavers: true });

output.matchCheckerLink = moneyLink(6, { matchLength: 5, dice: [3, 1] });

output.moneyBlackDoubleLink = moneyLink(1, { blackPoint: 23, count: 2, currentPlayer: 'black', cubeExponent: 1, cubeOwner: 'black' });

output.moneyPendingDoubleLink = moneyLink(1, { blackPoint: 23, count: 2, currentPlayer: 'white', turnOwner: 'black', cubeExponent: 1, cubeOwner: 'black', doubleAction: 'D' });
output.moneyPendingBeaverLink = moneyLink(1, { blackPoint: 23, count: 2, currentPlayer: 'black', turnOwner: 'black', cubeExponent: 2, cubeOwner: 'white', doubleAction: 'B', beavers: true });
