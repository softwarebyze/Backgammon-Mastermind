import * as React from 'react';
import { View } from 'react-native';

/**
 * Minimal gesture-handler mock for Jest: the board only uses
 * GestureDetector as a passthrough wrapper around its children.
 * (The previous mock required a module path that does not exist in the
 * installed gesture-handler package.)
 */
export function GestureDetector({ children }: { children?: React.ReactNode }) {
  return React.createElement(View, null, children);
}

/** Chainable gesture stub: any method call returns the gesture itself. */
function chainable(): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then')
          return undefined;
        return () => proxy;
      },
    },
  );
  return proxy;
}

export const Gesture = {
  Pan: () => chainable(),
  Tap: () => chainable(),
  LongPress: () => chainable(),
  Pinch: () => chainable(),
  Rotation: () => chainable(),
  Fling: () => chainable(),
  ForceTouch: () => chainable(),
  Native: () => chainable(),
  Manual: () => chainable(),
  Race: (..._gs: any[]) => chainable(),
  Simultaneous: (..._gs: any[]) => chainable(),
  Exclusive: (..._gs: any[]) => chainable(),
};

export const Directions = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8 };

export default { GestureDetector, Gesture, Directions };
