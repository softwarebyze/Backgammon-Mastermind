<h1 align="center">
  <img alt="logo" src="./assets/icon.png" width="124px" style="border-radius:10px"/><br/>
Backgammon Mastermind
</h1>

> Built on the [Obytes starter](https://starter.obytes.com)

## Requirements

- [React Native dev environment ](https://reactnative.dev/docs/environment-setup)
- [Node.js LTS release](https://nodejs.org/en/)
- [Git](https://git-scm.com/)
- [Watchman](https://facebook.github.io/watchman/docs/install#buildinstall), required only for macOS or Linux users
- [Pnpm](https://pnpm.io/installation)
- [Cursor](https://www.cursor.com/) or [VS Code Editor](https://code.visualstudio.com/download) ⚠️ Make sure to install all recommended extension from `.vscode/extensions.json`

## 👋 Quick start

Clone the repo, copy env vars, and install deps:

```sh
git clone https://github.com/softwarebyze/Backgammon-Mastermind.git

cd Backgammon-Mastermind

cp .env.example .env

pnpm install

# Replace Obytes placeholder branding (icon + splash)
pnpm brand:apply
```

To run the app on iOS:

```sh
pnpm ios
```

To run the app on Android:

```sh
pnpm android
```

Branding: edit `assets/brand/icon-source.png` and `assets/brand/brand.config.json`, then `pnpm brand:apply`. See [assets/brand/README.md](./assets/brand/README.md).

## CI secrets (GitHub Actions)

Before EAS preview/build or Maestro Cloud E2E workflows will run, add these **repository secrets**:

| Secret | Where to get it |
|--------|-----------------|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) |
| `MAESTRO_CLOUD_API_KEY` | [Maestro Cloud CI integration](https://cloud.mobile.dev/ci-integration/github-actions#add-your-api-key-secret) |

**GitHub:** repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Full walkthrough: [Obytes Template Playbook → GitHub Actions secrets](./docs/obytes-template-playbook.md#github-actions-secrets-required-for-ci)

## Previewing pull requests

Standard **dev client + EAS Update** flow (see [playbook](./docs/obytes-template-playbook.md#dev-client--pr-preview-workflow-recommended-fork-pattern)):

### iPhone / iPad

1. **One-time:** register your device — `eas device:create` or [Expo → Devices](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/devices)
2. **One-time:** install the [iOS development build from EAS](https://expo.dev/projects/7ec6600a-8b02-4714-acc1-08385effa4c9/builds?profile=development) (open install link in Safari)
3. **Every PR:** scan the **EAS Update QR** in the Expo bot comment on the PR

### Android

1. **One-time:** install the [Android development build from EAS](https://expo.dev/projects/7ec6600a-8b02-4714-acc1-08385effa4c9/builds?profile=development) (APK)
2. **Every PR:** scan the **EAS Update QR**

CI rebuilds **both** dev clients when native deps or branding change (`.github/workflows/dev-client.yml`). JS-only PRs only need the QR.

## ✍️ Documentation

- [Obytes Template Playbook](./docs/obytes-template-playbook.md) — generic setup, CI, EAS, agent tooling
- [Rules and Conventions](https://starter.obytes.com/getting-started/rules-and-conventions/)
- [Project structure](https://starter.obytes.com/getting-started/project-structure)
- [Environment vars and config](https://starter.obytes.com/getting-started/environment-vars-config)
- [UI and Theming](https://starter.obytes.com/ui-and-theme/ui-theming)
- [Components](https://starter.obytes.com/ui-and-theme/components)
- [Forms](https://starter.obytes.com/ui-and-theme/Forms)
- [Data fetching](https://starter.obytes.com/guides/data-fetching)
- [Contribute to starter](https://starter.obytes.com/how-to-contribute/)
