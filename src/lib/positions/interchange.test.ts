import { calculatePipCount } from '@/lib/game';
import { createInitialPoints } from '@/lib/game/constants';
import { exportGnuid, parseGnuid } from './gnuid';
import { exportPosition, importPosition, positionLink } from './interchange';
import { newPosition, positionGame } from './position';
import { exportXgid, parseXgid } from './xgid';

// Published examples from the GNU manual and eXtreme Gammon 2 Help.
const xg = 'XGID=-a-B--E-B-a-dDB--b-bcb----:1:1:-1:63:0:0:0:3:8';
const gnu = '4HPwATDgc/ABMA:QYkqASAAIAAA';

describe('position interchange', () => {
  it('decodes the GNU manual starting board and independently documented match fields', () => {
    const p = parseGnuid(gnu);
    expect(p.points).toEqual(createInitialPoints());
    expect(p.context).toMatchObject({ cubeExponent: 1, cubeOwner: 'black', scores: { black: 2, white: 4 }, matchLength: 9 });
    expect(p.currentPlayer).toBe('white');
    expect(p.dice).toEqual([5, 2]);
    expect(exportGnuid(p)).toBe(gnu);
  });

  it('decodes the XG help example with correct sides, bar, cube, turn and roll', () => {
    const p = parseXgid(xg);
    expect(p.points[1]).toEqual({ player: 'black', count: 1 });
    expect(p.points[6]).toEqual({ player: 'white', count: 5 });
    expect(p.context).toMatchObject({ cubeExponent: 1, cubeOwner: 'white', matchLength: 3, maxCube: 8 });
    expect(p.currentPlayer).toBe('black');
    expect(p.dice).toEqual([6, 3]);
    expect(calculatePipCount(positionGame(p), 'white')).toBe(132);
    expect(calculatePipCount(positionGame(p), 'black')).toBe(142);
    expect(exportXgid(p)).toBe(xg);
  });

  it.each([
    xg,
    'XGID=-b--A-D-D---eD---c-e----B-:0:0:-1:52:0:0:3:0:10',
    'XGID=----B-Ca----ABAa----A-C-AA:1:1:1:00:0:0:3:0:10',
    'XGID=aBBBB-B----BcA---cbdB---b-:0:0:1:51:1:2:0:5:10',
  ])('round-trips published asymmetric XG boards through JSON, share links, and GNU board orientation: %s', (id) => {
    const p = parseXgid(id);
    expect(parseXgid(exportXgid(p))).toEqual(p);
    expect(importPosition(exportPosition(p, 'JSON'))).toEqual(p);
    expect(importPosition(positionLink(p, 'https://preview.example'))).toEqual(p);
    const compatible = { ...p, context: { ...p.context, maxCube: 10, beavers: false } };
    expect(parseGnuid(exportGnuid(compatible))).toEqual(compatible);
  });

  it('handles bars and borne-off checkers for either player on roll', () => {
    for (const currentPlayer of ['white', 'black'] as const) {
      const p = importPosition('{"placements":[{"point":1,"player":"white","count":4},{"point":24,"player":"black","count":2}],"bar":{"white":2,"black":1}}');
      p.currentPlayer = currentPlayer;
      p.context.turnOwner = currentPlayer;
      expect(p.borneOff).toEqual({ white: 9, black: 12 });
      expect(parseXgid(exportXgid(p))).toEqual(p);
      expect(parseGnuid(exportGnuid(p))).toEqual(p);
    }
  });

  it.each(['', '{"placements":[],}', '{}', '4HPwATDgc/ABMB', '////////////////', 'XGID=OOOOOOOOOOOOOOOOOOOOOOOOOO:0:0:1:00:0:0:0:0:10', 'https://example.com/position?data=%7B%7D', '4HPwATDgc/ABMA:QYkqASAAIAAA:extra'])('rejects malformed or unsafe input: %s', (input) => {
    expect(() => importPosition(input)).toThrow();
  });

  it('allows a standalone GNU position ID and rolls later', () => {
    expect(parseGnuid('4HPwATDgc/ABMA')).toEqual(newPosition());
  });

  it('preserves unsupported context through links and refuses lossy format conversions', () => {
    const p = parseXgid(xg);
    expect(() => exportGnuid(p)).toThrow('conversion');
    const g = parseGnuid(gnu);
    g.context.resignation = 2;
    expect(() => exportXgid(g)).toThrow('conversion');
    expect(importPosition(positionLink(g))).toEqual(g);
    expect(parseGnuid(exportGnuid(g))).toEqual(g);
  });

  it('decodes the inverted GNU Jacoby flag and rejects unknown future match bits', () => {
    const p = parseGnuid('4HPwATDgc/ABMA:cAkAAAAAAAAA');
    expect(p.context.jacoby).toBe(true);
    expect(parseGnuid(exportGnuid(p))).toEqual(p);
    expect(() => parseGnuid('4HPwATDgc/ABMA:cAkAAAAAAAAg')).toThrow();
  });

  it('preserves rolled dice with a pending double in GNU and JSON but refuses lossy XG export', () => {
    const p = newPosition();
    p.dice = [6, 2];
    p.context.doubleAction = 'D';
    p.context.turnOwner = 'black';
    expect(parseGnuid(exportGnuid(p))).toEqual(p);
    expect(importPosition(exportPosition(p, 'JSON'))).toEqual(p);
    expect(() => exportXgid(p)).toThrow('conversion');
  });
});

it('imports labeled GNU clipboard text and rejects a malformed labeled Match ID', () => {
  expect(importPosition('GNU Backgammon Position ID: 4HPwATDgc/ABMA\nMatch ID: QYkqASAAIAAA')).toEqual(parseGnuid(gnu));
  expect(() => importPosition('Position ID: 4HPwATDgc/ABMA\nMatch ID: invalid')).toThrow();
});
