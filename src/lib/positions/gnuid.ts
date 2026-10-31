import type { Position } from './position';
import type { Player } from '@/lib/game/types';
import { decodeBytes, encodeBytes, readBits, writeBits } from './base64';
import { inferBorneOff, newPosition, PositionFormatError, validatePosition } from './position';

const side = (value: number): Player => value ? 'white' : 'black';

/** GNU manual technical descriptions; little-endian bit fields, base64 bytes. */
export function parseGnuid(raw: string): Position {
  const [positionId, matchId, extra] = raw.split(':');
  if (extra !== undefined)
    throw new PositionFormatError('format');
  const p = newPosition(true);
  if (matchId) {
    const bytes = decodeBytes(matchId, 9);
    if (readBits(bytes, 67, 5) || readBits(bytes, 4, 2) === 2)
      throw new PositionFormatError('context');
    p.currentPlayer = side(readBits(bytes, 6, 1));
    p.dice = [readBits(bytes, 15, 3), readBits(bytes, 18, 3)];
    p.context = {
      ...p.context,
      cubeExponent: readBits(bytes, 0, 4),
      maxCube: Math.max(10, readBits(bytes, 0, 4)),
      cubeOwner: readBits(bytes, 4, 2) === 3 ? null : side(readBits(bytes, 4, 2)),
      turnOwner: side(readBits(bytes, 11, 1)),
      crawford: !!readBits(bytes, 7, 1),
      gameState: readBits(bytes, 8, 3),
      doubleAction: readBits(bytes, 12, 1) ? 'D' : '',
      resignation: readBits(bytes, 13, 2),
      matchLength: readBits(bytes, 21, 15),
      scores: { black: readBits(bytes, 36, 15), white: readBits(bytes, 51, 15) },
      jacoby: !readBits(bytes, 66, 1),
      beavers: false,
    };
  }
  const bytes = decodeBytes(positionId!, 10);
  let bit = 0;
  for (const player of [p.currentPlayer, p.currentPlayer === 'white' ? 'black' : 'white'] as Player[]) {
    for (let point = 1; point <= 25; point++) {
      let count = 0;
      while (bit < 80 && readBits(bytes, bit, 1)) {
        count++;
        bit++;
      }
      if (bit >= 80 || count > 15)
        throw new PositionFormatError('checkers');
      bit++;
      if (point === 25) {
        p.bar[player] = count;
      }
      else if (count) {
        const index = player === 'white' ? point : 25 - point;
        if (p.points[index]!.count)
          throw new PositionFormatError('overlap');
        p.points[index] = { player, count };
      }
    }
  }
  if (readBits(bytes, bit, 80 - bit))
    throw new PositionFormatError('format');
  return inferBorneOff(p);
}

export function exportGnuid(position: Position): string {
  const p = validatePosition(position);
  const c = p.context;
  if (c.doubleAction === 'B' || c.doubleAction === 'R' || c.maxCube !== 10 || c.beavers)
    throw new PositionFormatError('conversion');
  const board = Array.from({ length: 10 }, () => 0);
  let bit = 0;
  for (const player of [p.currentPlayer, p.currentPlayer === 'white' ? 'black' : 'white'] as Player[]) {
    for (let i = 1; i <= 25; i++) {
      const point = p.points[player === 'white' ? i : 25 - i];
      const count = i === 25 ? p.bar[player] : point?.player === player ? point.count : 0;
      for (let j = 0; j < count; j++)
        writeBits(board, bit++, 1, 1);
      bit++;
    }
  }
  const match = Array.from({ length: 9 }, () => 0);
  const fields: [number, number, number][] = [
    [0, 4, c.cubeExponent],
    [4, 2, c.cubeOwner === null ? 3 : Number(c.cubeOwner === 'white')],
    [6, 1, Number(p.currentPlayer === 'white')],
    [7, 1, Number(c.crawford)],
    [8, 3, c.gameState],
    [11, 1, Number(c.turnOwner === 'white')],
    [12, 1, Number(c.doubleAction === 'D')],
    [13, 2, c.resignation],
    [15, 3, p.dice[0]],
    [18, 3, p.dice[1]],
    [21, 15, c.matchLength],
    [36, 15, c.scores.black],
    [51, 15, c.scores.white],
    [66, 1, Number(!c.jacoby)],
  ];
  for (const [start, length, value] of fields)
    writeBits(match, start, length, value);
  return `${encodeBytes(board)}:${encodeBytes(match)}`;
}
