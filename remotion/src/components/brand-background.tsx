import { AbsoluteFill } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  pulse?: boolean;
};

export const BrandBackground: React.FC<Props> = (_props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }} />
  );
};
