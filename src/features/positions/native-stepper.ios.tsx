import type { ComponentType } from 'react';
import type { NativeStepperProps } from './native-stepper-types';
import { requireOptionalNativeModule } from 'expo';
import { View } from 'react-native';

/**
 * The real UIKit/SwiftUI stepper on iOS. ExpoUI ships inside every build that
 * includes expo-router, but older binaries may predate it: without the native
 * module we return null and the drawn stepper takes over.
 */
function loadNativeStepper(): ComponentType<NativeStepperProps> | null {
  if (!requireOptionalNativeModule('ExpoUI'))
    return null;

  const { Host, Stepper } = require('@expo/ui/swift-ui') as typeof import('@expo/ui/swift-ui');

  const { labelsHidden } = require('@expo/ui/swift-ui/modifiers') as typeof import('@expo/ui/swift-ui/modifiers');
  return function SystemStepper({ label, value, min, max, onChange, testID }: NativeStepperProps) {
    return (
      <View testID={testID} accessible={false}>
        <Host matchContents colorScheme="dark">
          <Stepper
            label={label}
            value={value}
            min={min}
            max={max}
            step={1}
            onValueChange={next => onChange(Math.round(next))}
            modifiers={[labelsHidden()]}
          />
        </Host>
      </View>
    );
  };
}

export const NativeStepper = loadNativeStepper();
