import { computerCubeAction } from './computer-cube';
import { BAR_POINT } from './constants';
import { createPositionState } from './create-position';
import {
  loadPositionPreset,
  parsePositionJson,
  POSITION_JSON_ERRORS,
  POSITION_LOADER_PRESETS,
} from './load-position';
import { dropDouble, nextMatchGame, offerDouble } from './match';
import { applyDiceRoll, applyMove, getLegalMoves, passTurn } from './moves';

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
  it('exposes the #155 bar 1–2 audit boards and the E2E undo/redo board', () => {
    expect(POSITION_LOADER_PRESETS.map(item => item.id)).toEqual([
      'e2e-computer-match-offer',
      'e2e-computer-match-take',
      'e2e-computer-match-drop',
      'e2e-match-undo-floor',
      'e2e-match-cube',
      'e2e-match-final',
      'issue-155-bar-1-2-both-dice',
      'issue-155-bar-1-2-higher-die',
      'e2e-center-bar',
      'e2e-undo-redo-3-1',
    ]);
  });

  it('provides overflowing bar stacks with playable entry targets for UI QA', () => {
    const state = loadPositionPreset(preset('e2e-center-bar'));
    expect(state.bar).toEqual({ white: 7, black: 6 });
    expect(barDestinations(state)).toEqual(expect.arrayContaining([23, 24]));
  });

  it('#155 both-dice: only bar→23 is legal because it leaves 6→5', () => {
    const state = loadPositionPreset(preset('issue-155-bar-1-2-both-dice'));
    expect(state.phase).toBe('moving');
    expect(state.mode).toBe('vs-human');
    expect(barDestinations(state)).toEqual([23]);
  });

  it('the E2E undo/redo board deals a fixed 3–1 with the 8→5 move the Maestro flow plays', () => {
    const state = loadPositionPreset(preset('e2e-undo-redo-3-1'));
    expect(state).toMatchObject({ phase: 'moving', mode: 'vs-human', currentPlayer: 'white', dice: [3, 1] });
    expect(getLegalMoves(state).some(m => m.from === 8 && m.to === 5)).toBe(true);
  });

  it('#155 higher-die: only bar→23 when neither leftover die plays', () => {
    const state = loadPositionPreset(preset('issue-155-bar-1-2-higher-die'));
    expect(barDestinations(state)).toEqual([23]);
  });
});

it('the match undo-floor fixture blocks every Black roll after White plays 8→7 and 8→6', () => {
  let state = loadPositionPreset(preset('e2e-match-undo-floor'));
  for (const to of [7, 6]) {
    const move = getLegalMoves(state).find(m => m.from === 8 && m.to === to);
    expect(move).toBeDefined();
    state = applyMove(state, move!);
  }
  if (state.currentPlayer === 'white')
    state = passTurn(state);
  expect(state.currentPlayer).toBe('black');
  for (let a = 1; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      expect(applyDiceRoll(state, [a, b]).phase).toBe('no-move');
    }
  }
});

describe('computer match QA presets', () => {
  it('offers from the computer side and reaches Crawford after a drop', () => {
    const state = loadPositionPreset(preset('e2e-computer-match-offer'));
    expect(computerCubeAction(state)).toBe('offer');
    const dropped = dropDouble(offerDouble(state, 0));
    expect(dropped.match?.score.black).toBe(2);
    const next = nextMatchGame(dropped);
    expect(next.mode).toBe('vs-computer');
    expect(next.match?.crawford).toBe(true);
  });
  it.each([['take', 'accept'], ['drop', 'drop']] as const)('provides a deterministic computer %s response', (id, action) => {
    const state = loadPositionPreset(preset(`e2e-computer-match-${id}`));
    expect(computerCubeAction(offerDouble(state, 0))).toBe(action);
  });
});
