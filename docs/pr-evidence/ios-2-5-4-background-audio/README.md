# App Store 2.5.4 — remove background audio mode

Apple rejected **1.0.0 (4)** (iPad Air 11-inch M3, submission `ffd0b12f-7491-4298-80cd-f7cf8994f992`) because Info.plist declared `UIBackgroundModes` `audio` while the app does not play audible content in the background.

This game only uses short foreground SFX (dice / move). The fix is to stop declaring background audio, not to add fake background playback.

## Cause

`expo-audio` defaults `enableBackgroundPlayback` to `true`. That plugin writes `audio` into `UIBackgroundModes` even when JS calls `setAudioModeAsync({ shouldPlayInBackground: false })`.

## Fix

`app.config.ts` configures:

```ts
['expo-audio', { enableBackgroundPlayback: false }]
```

Runtime SFX in `src/lib/game-sfx/play-game-sfx.ts` already use `shouldPlayInBackground: false`.

## Evidence (`pnpm expo config --type introspect`)

| Build config | `ios.infoPlist.UIBackgroundModes` |
|--------------|-----------------------------------|
| Before (bare `'expo-audio'`) | `["audio"]` — [before-introspect.json](./before-introspect.json) |
| After (`enableBackgroundPlayback: false`) | omitted — [after-introspect.json](./after-introspect.json) |

No other `UIBackgroundModes` entries were present. The same flag also drops unused Android `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (not requested by Apple; correct companion for “no background audio”).
