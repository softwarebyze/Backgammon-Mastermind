import { homeScreenOptions } from './native-stack-options';

describe('homeScreenOptions', () => {
  it('never renders a back control on the home screen', () => {
    // headerBackVisible covers native; headerLeft must be pinned (not
    // undefined) because expo-router's web header ignores headerBackVisible
    // and synthesizes a back chevron whenever headerLeft is undefined and the
    // route inherits back context.
    expect(homeScreenOptions.headerBackVisible).toBe(false);
    expect(homeScreenOptions.headerLeft).not.toBeUndefined();
  });

  it('renders no left header content', () => {
    const headerLeft = homeScreenOptions.headerLeft as unknown as () => unknown;
    expect(typeof headerLeft).toBe('function');
    expect(headerLeft()).toBeNull();
  });
});
