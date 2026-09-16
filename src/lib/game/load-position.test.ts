import { BAR_POINT } from './constants';
import { createPositionState } from './create-position';
import {
  loadPositionPreset,
  parsePositionJson,
  POSITION_JSON_ERRORS,
  POSITION_LOADER_PRESETS,
} from './load-position';
import { getLegalMoves } from './moves';

function preset(id: string) {
  const found = POSITION_LOADER_PRESETS.find(item => item.id === id);
  if (!found) {
    throw new Error(`missing preset ${id}`);
  }
  return found;
}

function barDestinations(state: ReturnType<typeof createPositionState>) {
  return getLegalMoves(state)
    .filter(move => move.from === BAR_POINT)
    .map(move => move.to);
}

describe('parsePositionJson', () => {
  it('rejects empty paste', () => {
    expect(parsePositionJson('   ')).toEqual({
      ok: false,
      error: POSITION_JSON_ERRORS.empty,
    });
  });

  it('rejects invalid JSON', () => {
    expect(parsePositionJson('{not json')).toEqual({
      ok: false,
      error: POSITION_JSON_ERRORS.invalidJson,
    });
  });

  it('rejects arrays and GameState snapshots', () => {
    expect(parsePositionJson('[]')).toEqual({
      ok: false,
      error: POSITION_JSON_ERRORS.notObject,
    });
    expect(parsePositionJson(JSON.stringify({ points: [] }))).toEqual({
      ok: false,
      error: POSITION_JSON_ERRORS.gameStateSnapshot,
    });
  });

  it('builds a playable state from createPositionState options', () => {
    const options = preset('issue-155-bar-1-2-both-dice').options;
    const result = parsePositionJson(JSON.stringify(options));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.options).toEqual(options);
    expect(result.state).toEqual(createPositionState(options));
    expect(result.state.phase).toBe('moving');
    expect(result.state.bar.white).toBe(1);
    expect(result.state.dice).toEqual([1, 2]);
  });

  it('accepts an empty object as a rolling blank board', () => {
    const result = parsePositionJson('{}');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.phase).toBe('rolling');
    expect(result.state.currentPlayer).toBe('white');
  });

  it('rejects out-of-range dice and unknown players', () => {
    expect(parsePositionJson(JSON.stringify({ dice: [1] })).ok).toBe(false);
    expect(parsePositionJson(JSON.stringify({ dice: [1, 7] })).ok).toBe(false);
    expect(
      parsePositionJson(JSON.stringify({
        placements: [{ point: 6, player: 'red', count: 1 }],
      })).ok,
    ).toBe(false);
    expect(
      parsePositionJson(JSON.stringify({
        placements: [{ point: 0, player: 'white', count: 1 }],
      })).ok,
    ).toBe(false);
  });
});

describe('position loader presets', () => {
  it('exposes the two #155 bar 1–2 audit boards', () => {
    expect(POSITION_LOADER_PRESETS.map(item => item.id)).toEqual([
      'issue-155-bar-1-2-both-dice',
      'issue-155-bar-1-2-higher-die',
    ]);
  });

  it('#155 both-dice: only bar→23 is legal because it leaves 6→5', () => {
    const state = loadPositionPreset(preset('issue-155-bar-1-2-both-dice'));
    expect(state.phase).toBe('moving');
    expect(state.mode).toBe('vs-human');
    expect(barDestinations(state)).toEqual([23]);
  });

  it('#155 higher-die: only bar→23 when neither leftover die plays', () => {
    const state = loadPositionPreset(preset('issue-155-bar-1-2-higher-die'));
    expect(barDestinations(state)).toEqual([23]);
  });
});
