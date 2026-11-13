import { act, renderHook } from '@testing-library/react-native';
import { addNote, clearGameNotes, getGameNotes } from '@/features/game/game-notes-store';
import { createInitialState } from '@/lib/game/constants';
import { notePositionFromState } from '@/lib/game/game-notes';
import { useGameLifecycle } from './use-game-lifecycle';

function setup() {
  const state = createInitialState('vs-human');
  return renderHook(() => useGameLifecycle({
    state,
    clearAITimeout: jest.fn(),
    resetAnimation: jest.fn(),
    resetMoveLog: jest.fn(),
    reloadMoveLog: jest.fn(),
    resetTimeline: jest.fn(),
    clearTimeline: jest.fn(),
    setState: jest.fn(),
  }));
}

function writeNote() {
  addNote({ ply: 0, turn: 0, text: 'from the last game', position: notePositionFromState(createInitialState('vs-human')) });
}

beforeEach(() => clearGameNotes());

it('drops the last game\'s notes when a new game starts', () => {
  writeNote();
  const { result } = setup();
  act(() => result.current.startGame('vs-computer'));
  expect(getGameNotes()).toEqual([]);
});

it('drops the notes when the game is reset', () => {
  writeNote();
  const { result } = setup();
  act(() => result.current.resetGame());
  expect(getGameNotes()).toEqual([]);
});

it('keeps the notes when the saved game is resumed', () => {
  writeNote();
  const { result } = setup();
  act(() => {
    result.current.resumeGame();
  });
  expect(getGameNotes()).toHaveLength(1);
});
