import { handleEscapeKey } from './use-escape-to-go-back';

function context(overrides: Partial<Parameters<typeof handleEscapeKey>[1]> = {}) {
  return {
    isFocused: () => true,
    dialogOpen: () => false,
    goBack: jest.fn(),
    ...overrides,
  };
}

describe('escape on a stack screen', () => {
  it('goes back', () => {
    const c = context();
    expect(handleEscapeKey({ key: 'Escape', defaultPrevented: false }, c)).toBe(true);
    expect(c.goBack).toHaveBeenCalledTimes(1);
  });

  it('leaves an open dialog to close itself first', () => {
    const c = context({ dialogOpen: () => true });
    expect(handleEscapeKey({ key: 'Escape', defaultPrevented: false }, c)).toBe(false);
    expect(c.goBack).not.toHaveBeenCalled();
  });

  it('ignores other keys, handled events and screens underneath', () => {
    const c = context();
    handleEscapeKey({ key: 'Enter', defaultPrevented: false }, c);
    handleEscapeKey({ key: 'Escape', defaultPrevented: true }, c);
    handleEscapeKey({ key: 'Escape', defaultPrevented: false }, { ...c, isFocused: () => false });
    expect(c.goBack).not.toHaveBeenCalled();
  });
});
