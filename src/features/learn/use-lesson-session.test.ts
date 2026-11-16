import { act, renderHook } from '@testing-library/react-native';
import { LESSONS } from '@/lib/learn/curriculum';
import { useLessonSession } from './use-lesson-session';

jest.mock('posthog-react-native', () => ({
  usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }),
}));
jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));

describe('lesson navigation', () => {
  it('keeps praise until the learner continues, then resets it on the previous step', () => {
    const { result } = renderHook(() => useLessonSession(LESSONS[0]!));
    expect(result.current.canGoBack).toBe(false);
    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(0);

    act(() => result.current.advance());
    act(() => result.current.onPointPress(5));
    expect(result.current.stepComplete).toBe(true);
    expect(result.current.feedback?.tone).toBe('praise');
    expect(result.current.stepIndex).toBe(1);

    act(() => result.current.advance());
    expect(result.current.feedback).toBeNull();
    expect(result.current.stepComplete).toBe(false);
    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.stepComplete).toBe(false);
    expect(result.current.feedback).toBeNull();
    expect(result.current.state.selectedPoint).toBeNull();
  });

  it('clears hints when returning to an explanation', () => {
    const { result } = renderHook(() => useLessonSession(LESSONS[0]!));
    act(() => result.current.advance());
    act(() => result.current.showHint());
    expect(result.current.feedback?.tone).toBe('hint');

    act(() => result.current.back());
    expect(result.current.step.kind).toBe('explain');
    expect(result.current.stepComplete).toBe(true);
    expect(result.current.feedback).toBeNull();
    expect(result.current.canGoBack).toBe(false);
  });
});
