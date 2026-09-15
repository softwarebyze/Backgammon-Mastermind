import { Alert } from 'react-native';

import { requestReplaceActiveGame, shouldConfirmNewGame } from '@/features/game/request-new-game';
import { confirmAction, registerConfirmHandler } from '@/lib/confirm';
import { createInitialState } from '@/lib/game/constants';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
}));

jest.mock('@/lib/game/persistence', () => {
  const actual = jest.requireActual('@/lib/game/persistence');
  return {
    ...actual,
    hasSavedGame: jest.fn(() => false),
  };
});

const { hasSavedGame } = jest.requireMock('@/lib/game/persistence') as {
  hasSavedGame: jest.Mock;
};

beforeEach(() => {
  hasSavedGame.mockReturnValue(false);
});

describe('shouldConfirmNewGame', () => {
  it('does not confirm when the slot is empty', () => {
    expect(shouldConfirmNewGame('home', null)).toBe(false);
    expect(shouldConfirmNewGame('learn', null)).toBe(false);
  });

  it('confirms home, learn, and in-progress reset when a game is live', () => {
    const live = createInitialState('vs-computer');
    expect(shouldConfirmNewGame('home', live)).toBe(true);
    expect(shouldConfirmNewGame('learn', live)).toBe(true);
    expect(shouldConfirmNewGame('reset', live)).toBe(true);
  });

  it('does not confirm Play Again after game-over', () => {
    const finished = {
      ...createInitialState('vs-computer'),
      phase: 'game-over' as const,
      winner: 'white' as const,
    };
    expect(shouldConfirmNewGame('reset', finished)).toBe(false);
  });

  it('confirms learn/home when disk has an in-progress save and live state is empty', () => {
    hasSavedGame.mockReturnValue(true);
    expect(shouldConfirmNewGame('learn', null)).toBe(true);
    expect(shouldConfirmNewGame('home', null)).toBe(true);
  });
});

describe('requestReplaceActiveGame', () => {
  afterEach(() => {
    registerConfirmHandler(null);
  });

  it('starts immediately when nothing needs replacing', () => {
    const onReplace = jest.fn();
    requestReplaceActiveGame({
      source: 'learn',
      liveState: null,
      onReplace,
    });
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('routes learn replacements through the shared confirm dialog', () => {
    const handler = jest.fn();
    registerConfirmHandler(handler);
    const onReplace = jest.fn();
    requestReplaceActiveGame({
      source: 'learn',
      liveState: createInitialState('vs-computer'),
      onReplace,
    });
    expect(onReplace).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].onConfirm).toBe(onReplace);
  });

  it('uses the shared confirmAction helper for in-progress reset', () => {
    const handler = jest.fn();
    registerConfirmHandler(handler);
    confirmAction({
      title: 'probe',
      message: 'probe',
      confirmLabel: 'ok',
      onConfirm: () => {},
    });
    expect(handler).toHaveBeenCalled();

    const onReplace = jest.fn();
    requestReplaceActiveGame({
      source: 'reset',
      liveState: createInitialState('vs-human'),
      onReplace,
    });
    expect(onReplace).not.toHaveBeenCalled();
  });
});

describe('requestReplaceActiveGame home native alert', () => {
  it('offers continue and replace when a live game exists', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onReplace = jest.fn();
    const onContinue = jest.fn();
    requestReplaceActiveGame({
      source: 'home',
      liveState: createInitialState('vs-computer'),
      onReplace,
      onContinue,
    });
    expect(onReplace).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });
});
