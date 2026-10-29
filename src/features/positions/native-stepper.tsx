import type { ComponentType } from 'react';
import type { NativeStepperProps } from './native-stepper-types';

/** Only iOS has a system stepper; elsewhere the drawn one is used. */
export const NativeStepper: ComponentType<NativeStepperProps> | null = null;
