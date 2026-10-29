/** Pip centres as fractions of the face (inside the border). */
const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
};

export type Pip = { left: number; top: number; size: number };

/**
 * Pips in whole pixels. Percent positions with half-pixel offsets rounded
 * differently pip to pip, so small dice looked uneven (the 5 and 6 most).
 * Each pip is placed from the near edge and mirrored, so a face is always
 * symmetric, and the outer pips sit a quarter in so a 6's columns breathe.
 */
export function diePips(value: number, size: number, border: number): Pip[] {
  const inner = size - border * 2;
  const target = size * 0.16;
  let pip = Math.max(3, Math.round(target));
  // Same parity as the face, so the centre pip sits exactly in the middle;
  // round down rather than up so pips never grow past the target.
  if ((inner - pip) % 2 !== 0)
    pip += pip > 3 ? -1 : 1;
  // Offset of a quarter-position pip's top-left from the inner edge.
  const near = Math.round(inner * 0.25 - pip / 2);
  const far = inner - pip - near;
  const mid = (inner - pip) / 2;
  const at = (f: number) => (f < 0.5 ? near : f > 0.5 ? far : mid);
  return (PIP_LAYOUTS[value] ?? PIP_LAYOUTS[1]!).map(([x, y]) => ({ left: at(x), top: at(y), size: pip }));
}
