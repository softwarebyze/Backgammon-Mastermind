import { createWebAudioKeeper } from '@/lib/game-sfx/web-audio-keeper';

function fakeContext(state = 'suspended') {
  return { state, resume: jest.fn(async () => undefined), close: jest.fn(async () => undefined) };
}

it('resumes an interrupted context on the next gesture, not only a suspended one', () => {
  const ctx = fakeContext('interrupted');
  const keeper = createWebAudioKeeper(() => ctx);
  expect(keeper.wake()).toBe(ctx);
  expect(ctx.resume).toHaveBeenCalledTimes(1);
});

it('swaps in a fresh context after the page was hidden', () => {
  const contexts = [fakeContext('running'), fakeContext('suspended')];
  const keeper = createWebAudioKeeper(() => contexts.shift() ?? null);
  const first = keeper.get();
  keeper.markHidden();
  const second = keeper.wake();
  expect(first!.close).toHaveBeenCalled();
  expect(second).not.toBe(first);
  expect(second!.resume).toHaveBeenCalled();
  // Later gestures keep the new context.
  expect(keeper.wake()).toBe(second);
});

it('leaves a running context alone', () => {
  const ctx = fakeContext('running');
  const keeper = createWebAudioKeeper(() => ctx);
  keeper.wake();
  expect(ctx.resume).not.toHaveBeenCalled();
  expect(ctx.close).not.toHaveBeenCalled();
});
