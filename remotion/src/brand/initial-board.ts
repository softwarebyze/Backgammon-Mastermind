/** Standard starting position — mirrors src/lib/game/constants.ts */
export type BoardPointData = {
  player: 'white' | 'black' | null;
  count: number;
};

export const INITIAL_POINTS: BoardPointData[] = (() => {
  const points: BoardPointData[] = Array.from({ length: 25 }, () => ({
    player: null,
    count: 0,
  }));

  points[24] = { player: 'white', count: 2 };
  points[13] = { player: 'white', count: 5 };
  points[8] = { player: 'white', count: 3 };
  points[6] = { player: 'white', count: 5 };

  points[1] = { player: 'black', count: 2 };
  points[12] = { player: 'black', count: 5 };
  points[17] = { player: 'black', count: 3 };
  points[19] = { player: 'black', count: 5 };

  return points;
})();
