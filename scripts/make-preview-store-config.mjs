// Derives store.preview.config.json from the canonical store.config.json,
// overriding only the ASC app name for the TestFlight (preview) app.
// ASC app names must be unique, so the preview app can't share production's
// name — and Apple/EAS reject "Beta" and synonyms, so we use "Preview".
import { readFileSync, writeFileSync } from 'node:fs';

const PREVIEW_TITLE = 'Backgammon Mastermind Preview';

const config = JSON.parse(readFileSync('store.config.json', 'utf8'));

for (const locale of Object.values(config.apple.info)) {
  locale.title = PREVIEW_TITLE;
}

writeFileSync(
  'store.preview.config.json',
  `${JSON.stringify(config, null, 2)}\n`,
);
console.log(`Wrote store.preview.config.json (title: ${PREVIEW_TITLE})`);
