import { router } from 'expo-router';

import { goBackOrHome } from './go-back-or-home';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockedRouter = router as jest.Mocked<typeof router>;

describe('goBackOrHome', () => {
  beforeEach(() => {
    mockedRouter.canGoBack.mockReset();
    mockedRouter.back.mockReset();
    mockedRouter.replace.mockReset();
  });

  it('pops when the stack has history', () => {
    mockedRouter.canGoBack.mockReturnValue(true);
    goBackOrHome();
    expect(mockedRouter.back).toHaveBeenCalledTimes(1);
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  it('replaces to home when there is no history (refresh / empty stack)', () => {
    mockedRouter.canGoBack.mockReturnValue(false);
    goBackOrHome();
    expect(mockedRouter.back).not.toHaveBeenCalled();
    expect(mockedRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/');
  });
});
