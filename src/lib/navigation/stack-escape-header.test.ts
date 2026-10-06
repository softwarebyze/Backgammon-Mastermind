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

  it('omits a header chevron on native mobile', () => {
    for (const os of ['ios', 'android'] as const) {
      const options = stackEscapeHeaderOptionsFor(os);
      expect(options.headerBackVisible).toBe(false);
      expect(options.header).toBeUndefined();
      const headerLeft = options.headerLeft as unknown as () => unknown;
      expect(typeof headerLeft).toBe('function');
      expect(headerLeft()).toBeNull();
    }
  });
});
