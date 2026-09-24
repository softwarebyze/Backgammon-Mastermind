import type { ImessageTurnPayload } from './codec';
import { createInitialPoints } from '../game/constants';
import { createPositionState } from '../game/create-position';

import {
  buildImessageUrl,
  createImessageGameId,
  decodeImessageTurn,
  decodePoints,
  encodePoints,
  formatImessageCaption,
  gameStateToImessagePayload,
  imessagePayloadToGameState,
  parseImessageUrl,
} from './codec';

function standardPayload(): ImessageTurnPayload {
  return {
    gid: 'Ab3dEf7hIj9K',
    turn: 7,
    cur: 'black' as const,
    points: createInitialPoints(),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    win: null,
    dice: [5, 2] as [number, number],
    last: 'moved 13→8 · 6→4',
  };
}

describe('encodePoints / decodePoints', () => {
  it('round-trips the standard opening position', () => {
    const encoded = encodePoints(createInitialPoints());
    expect(encoded).toHaveLength(48);
    expect(decodePoints(encoded)).toEqual(createInitialPoints());
  });

  it('round-trips bar, blot, and stacked points', () => {
    const state = createPositionState({
      useStandardSetup: true,
      bar: { white: 2 },
    });
    state.points[5] = { player: 'black', count: 1 };
    state.points[6] = { player: 'white', count: 15 };
    const encoded = encodePoints(state.points);
    expect(decodePoints(encoded)).toEqual(state.points);
  });

  it('rejects malformed point strings', () => {
    expect(decodePoints('too-short')).toBeNull();
    // Uppercase hex is not part of the grammar (Swift String(format:) parity).
    expect(decodePoints(`${'wF'.repeat(24)}`)).toBeNull();
    expect(decodePoints('x0'.repeat(24))).toBeNull();
  });
});

describe('encode / decode turn', () => {
  it('round-trips a full turn payload through a URL', () => {
    const url = buildImessageUrl(standardPayload());
    const decoded = parseImessageUrl(url);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload).toEqual(standardPayload());
    }
  });

  it('accepts a finished game with a winner', () => {
    const points: ImessageTurnPayload['points'] = createInitialPoints().map(() => ({ player: null, count: 0 }));
    const payload = {
      ...standardPayload(),
      points,
      off: { white: 15, black: 9 },
      bar: { white: 0, black: 0 },
      win: 'white' as const,
      last: 'bore off the last checker',
    };
    // Fix black's 6 remaining checkers onto the board so counts balance.
    payload.points[1] = { player: 'black', count: 6 };
    const decoded = decodeImessageTurn(
      new URL(buildImessageUrl(payload)).search.slice(1),
    );
    expect(decoded.ok).toBe(true);
  });

  it('rejects a payload where checker counts do not total 15 per side', () => {
    const payload = standardPayload();
    payload.off = { white: 15, black: 0 };
    const url = buildImessageUrl(payload);
    // Hand-edit white off count without moving the checkers: imbalanced.
    const tampered = url.replace('off=0%2C0', 'off=15%2C0');
    const decoded = parseImessageUrl(tampered);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error.param).toBe('pts');
    }
  });

  it('rejects unknown versions, bad game ids, and oversized summaries', () => {
    const base = standardPayload();
    const badVersion = buildImessageUrl(base).replace('v=1', 'v=2');
    expect(parseImessageUrl(badVersion).ok).toBe(false);

    expect(
      decodeImessageTurn(
        `v=1&gid=!!!&turn=1&cur=w&pts=${encodePoints(base.points)}&bar=0,0&off=0,0&win=&d=&last=hi`,
      ).ok,
    ).toBe(false);

    const long = buildImessageUrl({ ...base, last: 'x'.repeat(141) });
    const decodedLong = parseImessageUrl(long);
    expect(decodedLong.ok).toBe(false);
  });

  it('rejects out-of-range dice and turns', () => {
    const base = standardPayload();
    const params = (overrides: string) =>
      `v=1&gid=${base.gid}&turn=1&cur=w&pts=${encodePoints(base.points)}&bar=0,0&off=0,0&win=&${overrides}&last=hi`;
    expect(decodeImessageTurn(params('d=0,7')).ok).toBe(false);
    expect(decodeImessageTurn(params('d=')).ok).toBe(true);
    expect(decodeImessageTurn('v=1').ok).toBe(false);
    const badTurn = `v=1&gid=${base.gid}&turn=0&cur=w&pts=${encodePoints(base.points)}&bar=0,0&off=0,0&win=&d=&last=hi`;
    expect(decodeImessageTurn(badTurn).ok).toBe(false);
  });
});

describe('game-state bridges', () => {
  it('converts a payload into a rolling vs-human state for the next player', () => {
    const decoded = parseImessageUrl(buildImessageUrl(standardPayload()));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }
    const state = imessagePayloadToGameState(decoded.payload);
    expect(state.mode).toBe('vs-human');
    expect(state.currentPlayer).toBe('black');
    expect(state.phase).toBe('rolling');
    expect(state.remainingDice).toEqual([]);
    expect(state.points).toEqual(createInitialPoints());
  });

  it('snapshots a post-turn state back into a payload', () => {
    const state = createPositionState({ useStandardSetup: true, mode: 'vs-human' });
    const payload = gameStateToImessagePayload(state, {
      gid: 'game-123456',
      turn: 3,
      last: 'rolled',
    });
    expect(payload.cur).toBe('white');
    expect(payload.gid).toBe('game-123456');
    const roundTripped = parseImessageUrl(buildImessageUrl(payload));
    expect(roundTripped.ok).toBe(true);
  });

  it('truncates over-long summaries instead of failing', () => {
    const state = createPositionState({ useStandardSetup: true });
    const payload = gameStateToImessagePayload(state, {
      gid: 'game-123456',
      turn: 1,
      last: 'y'.repeat(500),
    });
    expect(payload.last).toHaveLength(140);
  });
});

describe('createImessageGameId', () => {
  it('emits 12 URL-safe chars', () => {
    const id = createImessageGameId();
    expect(id).toMatch(/^[a-z\d]{12}$/i);
  });
});

describe('formatImessageCaption', () => {
  it('invites the next player to move', () => {
    expect(formatImessageCaption(standardPayload())).toBe(
      'White moved 13→8 · 6→4 — your move, Black',
    );
  });

  it('celebrates a win', () => {
    const points = createInitialPoints().map(() => ({ player: null, count: 0 }));
    const caption = formatImessageCaption({
      ...standardPayload(),
      points,
      win: 'white',
      last: 'bore off the last checker',
    });
    expect(caption).toContain('White wins');
  });

  it('round-trips summaries containing plus signs and spaces', () => {
    // URLSearchParams encodes spaces as "+" and literal "+" as "%2B" — the
    // Swift side must distinguish the two (see MessagePayload.queryItems).
    const payload = { ...standardPayload(), last: 'a+b c·d→e' };
    const decoded = parseImessageUrl(buildImessageUrl(payload));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.last).toBe('a+b c·d→e');
    }
  });
});
