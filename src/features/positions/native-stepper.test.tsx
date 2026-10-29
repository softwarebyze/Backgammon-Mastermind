jest.unmock('@/features/positions/native-stepper');

const mockOptional = jest.fn();
jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => mockOptional(name) }));
jest.mock('@expo/ui/swift-ui', () => ({ Host: () => null, Stepper: () => null }));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({ labelsHidden: () => ({}) }));

function load() {
  let mod: typeof import('./native-stepper.ios') | undefined;
  jest.isolateModules(() => {
    mod = require('./native-stepper.ios');
  });
  return mod!.NativeStepper;
}

it('falls back to the drawn stepper on builds without the ExpoUI native module', () => {
  mockOptional.mockReturnValue(null);
  expect(load()).toBeNull();
});

it('uses the system stepper when ExpoUI is linked', () => {
  mockOptional.mockReturnValue({});
  expect(load()).toEqual(expect.any(Function));
  expect(mockOptional).toHaveBeenCalledWith('ExpoUI');
});
