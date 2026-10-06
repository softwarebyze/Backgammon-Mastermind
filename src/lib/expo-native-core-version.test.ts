import fs from 'node:fs';
import path from 'node:path';

it('links the same Expo native core version into the engine and app', () => {
  const engine = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'expo-bgsage/package.json'), 'utf8'));
  const expoCore = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'node_modules/expo-modules-core/package.json'), 'utf8'));
  const engineCorePath = path.join(process.cwd(), 'node_modules/expo-bgsage/node_modules/expo-modules-core/package.json');
  const engineCore = fs.existsSync(engineCorePath)
    ? JSON.parse(fs.readFileSync(engineCorePath, 'utf8'))
    : expoCore;
  expect(engine.dependencies['expo-modules-core']).toBe(expoCore.version);
  expect(engineCore.version).toBe(expoCore.version);
});
