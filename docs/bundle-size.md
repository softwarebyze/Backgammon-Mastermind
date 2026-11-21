# Bundle size

Every PR gets a **📦 Bundle size** comment (`.github/workflows/size-report.yml`) comparing it with its base branch:

- **Web**: the full `expo export -p web` output (JS, fonts, images, audio, the bgsage engine).
- **Native JS bundle + assets**: `expo export -p android` (Hermes bytecode plus bundled assets), i.e. what ships inside the app and in OTA updates. Compiled native modules are **not** measured.

It is report-only. A ⚠️ line appears when gzipped JS grows more than 25 KB or the total grows more than 250 KB (`WARN` in `scripts/bundle-size.ts`).

Run it locally:

```sh
pnpm exec expo export -p web --output-dir /tmp/head-web
pnpm exec tsx scripts/measure-bundle-size.ts /tmp/head-web web > /tmp/head-web.json
# …same for a base checkout, then:
pnpm exec tsx scripts/report-bundle-size.ts main /tmp/base-web.json:/tmp/head-web.json
```

## Keeping it small

- Import icon families directly (`@expo/vector-icons/Feather`), never the `@expo/vector-icons` barrel: the barrel bundles every icon font (~3.7 MB).
- knip has no barrel entry points (`knip.json`), so an unused component or dependency fails CI instead of quietly shipping.
