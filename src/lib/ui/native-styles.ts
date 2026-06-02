/** Shared native polish (HIG / Material-adjacent) */
export function continuousRadius(radius: number) {
  return {
    borderRadius: radius,
    borderCurve: 'continuous' as const,
  };
}
