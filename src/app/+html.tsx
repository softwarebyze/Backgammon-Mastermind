import { ScrollViewStyleReset } from 'expo-router/html';

import {
  APPLE_TOUCH_ICON_PATH,
  FAVICON_ICO_PATH,
  FAVICON_PNG_PATH,
  webAssetUrl,
} from '@/lib/web-share-meta';

const APP_TITLE = 'Backgammon Mastermind';
const APP_DESCRIPTION = 'Master the board — one move at a time.';
const shareImageUrl = webAssetUrl(APPLE_TOUCH_ICON_PATH);

// Static-rendering HTML (`web.output: 'static'` / `'server'`). The Vercel
// preview is SPA (`single`); Expo uses `public/index.html` as that template.
// Keep share-sheet tags in both places.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover"
        />
        <title>{APP_TITLE}</title>
        <meta name="description" content={APP_DESCRIPTION} />
        <link rel="icon" type="image/png" href={FAVICON_PNG_PATH} />
        <link rel="icon" type="image/x-icon" href={FAVICON_ICO_PATH} />
        <link rel="apple-touch-icon" sizes="180x180" href={APPLE_TOUCH_ICON_PATH} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={APP_TITLE} />
        <meta property="og:description" content={APP_DESCRIPTION} />
        <meta property="og:image" content={shareImageUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={APP_TITLE} />
        <meta name="twitter:image" content={shareImageUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml */}
        <script dangerouslySetInnerHTML={{ __html: hidePreviewToolbarScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const APP_BG = '#1E0C02';

const responsiveBackground = `
html,
body {
  height: 100%;
  margin: 0;
  background-color: ${APP_BG};
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
  overscroll-behavior: none;
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
  width: 100%;
  max-width: none;
  margin: 0 auto;
  background-color: ${APP_BG};
  overflow: hidden;
}

@media (orientation: portrait) and (max-width: 540px) {
  #root {
    max-width: 480px;
  }
}

@media (min-width: 768px) and (orientation: portrait) {
  #root {
    max-width: 768px;
    box-shadow: 0 0 80px rgba(0, 0, 0, 0.45);
  }
}

/* Vercel preview comments pill + leftover Expo debug FABs steal taps. */
vercel-live-feedback,
#vercel-live-feedback,
[data-vercel-toolbar],
[data-vercel-toolbar-container],
iframe[src*="vercel.live"],
#expo-dev-client-menu,
[data-expo-dev-menu] {
  display: none !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
`;

const hidePreviewToolbarScript = `
(function () {
  var sel = 'vercel-live-feedback, #vercel-live-feedback, [data-vercel-toolbar], [data-vercel-toolbar-container], iframe[src*="vercel.live"]';
  var zap = function () {
    document.querySelectorAll(sel).forEach(function (el) { el.remove(); });
  };
  zap();
  try {
    new MutationObserver(zap).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
`;
