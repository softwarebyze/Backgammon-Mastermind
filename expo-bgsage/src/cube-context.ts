/** Context is always relative to the player on roll, including a pending double. */
export type SageCubeContext = {
  cubeValue: number;
  cubeOwner: 0 | 1 | 2;
  awayPlayer: number;
  awayOpponent: number;
  crawford: boolean;
  crawfordRule?: boolean;
  jacoby: boolean;
  beavers: boolean;
  maxCube: number;
};

export function encodeCubeContext(c: SageCubeContext): number[] {
  const powerOfTwo = (n: number) => Number.isInteger(n) && n >= 1 && n <= 32768 && Math.log2(n) % 1 === 0;
  if (!powerOfTwo(c.cubeValue) || !powerOfTwo(c.maxCube) || c.cubeValue > c.maxCube
    || ![0, 1, 2].includes(c.cubeOwner)
    || ![c.awayPlayer, c.awayOpponent].every(n => Number.isInteger(n) && n >= 0 && n <= 25)
    || (c.awayPlayer === 0) !== (c.awayOpponent === 0)
    || ![c.crawford, c.jacoby, c.beavers].every(v => typeof v === 'boolean')) {
    throw new Error('unsupported cube context');
  }
  return [c.cubeValue, c.cubeOwner, c.awayPlayer, c.awayOpponent, Number(c.crawford), Number(c.jacoby), Number(c.beavers), c.maxCube, Number(c.crawfordRule !== false)];
}
