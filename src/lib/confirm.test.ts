import { confirmAction, registerConfirmHandler } from './confirm';

describe('confirmAction', () => {
  afterEach(() => {
    registerConfirmHandler(null);
  });

  it('uses the registered in-app handler (web-safe)', () => {
    const onConfirm = jest.fn();
    const handler = jest.fn();
    registerConfirmHandler(handler);
    confirmAction({
      title: 'New Game',
      message: 'Start a new game?',
      confirmLabel: 'New Game',
      destructive: true,
      onConfirm,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].title).toBe('New Game');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
