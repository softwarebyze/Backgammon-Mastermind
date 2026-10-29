import { Composition, Folder, Still } from 'remotion';
import {
  APP_STORE_PREVIEW_DURATION,
  AppStorePreview,
} from './compositions/app-store-preview';

import {
  FEATURE_SPOTLIGHT_DURATION,
  FeatureSpotlight,
} from './compositions/feature-spotlight';
import {
  INSTAGRAM_LAUNCH_DURATION,
  InstagramCover,
  InstagramLaunch,
} from './compositions/instagram-launch';
import {
  LAUNCH_HERO_DURATION,
  LaunchHero,
} from './compositions/launch-hero';
import {
  TUTOR_SPOTLIGHT_DURATION,
  TutorSpotlight,
} from './compositions/tutor-spotlight';
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
        <Composition
          id="TutorSpotlight"
          component={TutorSpotlight}
          durationInFrames={TUTOR_SPOTLIGHT_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Instagram">
        <Composition
          id="InstagramLaunch"
          component={InstagramLaunch}
          durationInFrames={INSTAGRAM_LAUNCH_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Still id="InstagramCover" component={InstagramCover} width={1080} height={1350} />
      </Folder>
    </>
  );
};
