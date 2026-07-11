import type { SharedValue } from 'react-native-reanimated';

export type DragOverlayRefs = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  originLeft: SharedValue<number>;
  originTop: SharedValue<number>;
};
