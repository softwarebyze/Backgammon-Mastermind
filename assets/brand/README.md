# App branding

Edit these two files — **no copy step**. `app.config.ts` points Expo directly at them.

| File | Purpose |
| ---- | ------- |
| `icon-source.png` | Launcher icon + splash image (**1024×1024** PNG) |
| `brand.config.json` | Splash background + adaptive icon background colors |

After changing **icon or colors**, rebuild the dev client (native). EAS Update QR on PRs does not update icon/splash.

```bash
# Local (saves EAS build minutes):
pnpm build:development:android:local
pnpm build:development:ios:local

# Cloud (CI / sharing with teammates):
pnpm build:development:android
pnpm build:development:ios
```
