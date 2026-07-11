import type { useSharedValue } from 'react-native-reanimated';

export type DragOverlayRefs = {
  x: ReturnType<typeof useSharedValue<number>>;
  y: ReturnType<typeof useSharedValue<number>>;
  originLeft: ReturnType<typeof useSharedValue<number>>;
  originTop: ReturnType<typeof useSharedValue<number>>;
};
