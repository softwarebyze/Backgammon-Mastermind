# App branding

**Single source of truth** for launcher icon and splash (Ignite-style, not scattered Obytes assets).

| File | Purpose |
| ---- | ------- |
| `icon-source.png` | Master icon — **1024×1024** PNG (square, board/logo centered) |
| `brand.config.json` | Splash + adaptive icon background colors |

## Apply to Expo assets

```bash
pnpm brand:apply
```

This copies `icon-source.png` → `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, and generates `favicon.png`. Colors in `brand.config.json` are read by `app.config.ts`.

## After changing branding

1. Run `pnpm brand:apply` (if you changed `icon-source.png` only)
2. **Rebuild the dev client** — icons are native (`pnpm build:development:ios` / `:android`, or wait for `dev-client.yml` CI)

EAS Update QR on PRs does **not** update launcher icon or splash.
