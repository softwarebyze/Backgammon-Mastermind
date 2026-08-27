import { ScrollViewStyleReset } from 'expo-router/html';

// Web-only root HTML for static export (expo export). Dev mode uses the default
// Expo shell; global.css + useFonts handle fonts and layout during development.
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
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background-color: ${APP_BG};
}

@media (min-width: 768px) {
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
