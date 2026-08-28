import { stackEscapeHeaderOptionsFor } from './stack-escape-header';

jest.mock('expo-router/react-navigation', () => ({
  Header: () => null,
  getHeaderTitle: () => 'Settings',
}));

jest.mock('@/components/navigation/stack-escape-button', () => ({
  StackEscapeButton: () => null,
}));

describe('stackEscapeHeaderOptionsFor', () => {
  it('uses a JS header on web so the chevron is not gated on canGoBack', () => {
    const options = stackEscapeHeaderOptionsFor('web');
    expect(options.headerBackVisible).toBe(false);
    expect(typeof options.header).toBe('function');
    expect(options.headerLeft).toBeUndefined();
  });

  it('uses a regular headerLeft on native, not the system back control', () => {
    const options = stackEscapeHeaderOptionsFor('ios');
    expect(options.headerBackVisible).toBe(false);
    expect(typeof options.headerLeft).toBe('function');
    expect(options.header).toBeUndefined();
  });
});
