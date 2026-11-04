import type { Position } from './position';
import { inferBorneOff, newPosition, PositionFormatError, validatePosition } from './position';

/** Independently implemented from eXtreme Gammon 2 Help, XGID technical section. */
export function parseXgid(raw: string): Position {
  const fields = raw.replace(/^XGID=/i, '').split(':');
  if (fields.length !== 10 || !/^[a-o-]{26}$/i.test(fields[0]!)
    || !fields.slice(1).every((field, i) => i === 3 ? /^(?:00|[1-6]{2}|[DBR])$/.test(field) : /^-?\d{1,5}$/.test(field))) {
    throw new PositionFormatError('format');
  }
  const [board, cube, owner, turn, dice, whiteScore, blackScore, rules, length, maxCube] = fields as [string, string, string, string, string, string, string, string, string, string];
  if (!['-1', '0', '1'].includes(owner) || !['-1', '1'].includes(turn)
    || !['0', '1', '2', '3'].includes(rules) || (Number(length) > 0 && Number(rules) > 1)) {
    throw new PositionFormatError('context');
  }
  const p = newPosition(true);
  p.currentPlayer = turn === '1' ? 'white' : 'black';
  p.context = {
    cubeExponent: Number(cube),
    cubeOwner: owner === '0' ? null : owner === '1' ? 'white' : 'black',
    turnOwner: dice === 'D' || dice === 'R' ? (p.currentPlayer === 'white' ? 'black' : 'white') : p.currentPlayer,
    scores: { white: Number(whiteScore), black: Number(blackScore) },
    matchLength: Number(length),
    maxCube: Number(maxCube),
    crawford: Number(length) > 0 && rules === '1',
    jacoby: Number(length) === 0 && (Number(rules) & 1) !== 0,
    beavers: Number(length) === 0 && (Number(rules) & 2) !== 0,
    gameState: 1,
    resignation: 0,
    doubleAction: /^[DBR]$/.test(dice) ? dice as 'D' | 'B' | 'R' : '',
  };
  p.dice = /^\d{2}$/.test(dice) ? [Number(dice[0]), Number(dice[1])] : [0, 0];
  if (!/^[-a-o]$/.test(board[0]!) || !/^[-A-O]$/.test(board[25]!))
    throw new PositionFormatError('overlap');
  p.bar = { black: board[0] === '-' ? 0 : board.charCodeAt(0) - 96, white: board[25] === '-' ? 0 : board.charCodeAt(25) - 64 };
  for (let i = 1; i <= 24; i++) {
    const char = board[i]!;
    p.points[i] = char === '-' ? { player: null, count: 0 } : { player: char === char.toUpperCase() ? 'white' : 'black', count: char.toLowerCase().charCodeAt(0) - 96 };
  }
  return inferBorneOff(p);
}

export function exportXgid(position: Position): string {
  const p = validatePosition(position);
  const c = p.context;
  const expectedTurn = c.doubleAction === 'D' || c.doubleAction === 'R' ? (p.currentPlayer === 'white' ? 'black' : 'white') : p.currentPlayer;
  if (c.resignation || c.gameState !== 1 || c.turnOwner !== expectedTurn || (c.doubleAction && p.dice[0]))
    throw new PositionFormatError('conversion');
  const token = (n: number, white: boolean) => n ? String.fromCharCode((white ? 64 : 96) + n) : '-';
  const board = token(p.bar.black, false) + p.points.slice(1).map(point => token(point.count, point.player === 'white')).join('') + token(p.bar.white, true);
  const rules = c.matchLength ? Number(c.crawford) : Number(c.jacoby) + Number(c.beavers) * 2;
  return `XGID=${[board, c.cubeExponent, c.cubeOwner === null ? 0 : c.cubeOwner === 'white' ? 1 : -1, p.currentPlayer === 'white' ? 1 : -1, c.doubleAction || p.dice.join(''), c.scores.white, c.scores.black, rules, c.matchLength, c.maxCube].join(':')}`;
}
