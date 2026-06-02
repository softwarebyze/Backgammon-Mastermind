import { Composition, Folder } from 'remotion';
import {
  APP_STORE_PREVIEW_DURATION,
  AppStorePreview,
} from './compositions/AppStorePreview';

import {
  FEATURE_SPOTLIGHT_DURATION,
  FeatureSpotlight,
} from './compositions/FeatureSpotlight';
import {
  LAUNCH_HERO_DURATION,
  LaunchHero,
} from './compositions/LaunchHero';
import './index.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Marketing">
        <Composition
          id="LaunchHero"
          component={LaunchHero}
          durationInFrames={LAUNCH_HERO_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="AppStorePreview"
          component={AppStorePreview}
          durationInFrames={APP_STORE_PREVIEW_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="FeatureSpotlight"
          component={FeatureSpotlight}
          durationInFrames={FEATURE_SPOTLIGHT_DURATION}
          fps={30}
          width={1080}
          height={1080}
        />
      </Folder>
    </>
  );
};
