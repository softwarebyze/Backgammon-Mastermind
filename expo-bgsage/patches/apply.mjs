// Apply reviewed, idempotent portability/rule fixes after fetching the pinned source.
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'expo-bgsage/vendor/bgsage/cpp/src/cube.cpp';
let source = readFileSync(file, 'utf8');
const fixes = [
  ['h >> 57', 'h >> (sizeof(h) * 8 - 7)'],
  ...['cube', 'aci[i]', 'aci_L2_uninv[nd_idx]'].map(cube => [
    `${cube}.beaver &&`,
    `${cube}.beaver && (${cube}.max_cube_value == 0 || ${cube}.cube_value * 4 <= ${cube}.max_cube_value) &&`,
  ]),
];
for (const [before, after] of fixes) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Upstream cube patch no longer applies: ${before}`);
  source = source.replaceAll(before, after);
}
writeFileSync(file, source);
writeFileSync('expo-bgsage/ios/vendor/bgsage/cpp/src/cube.cpp', source);
