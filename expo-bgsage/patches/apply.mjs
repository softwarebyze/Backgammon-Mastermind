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
// AVX's analytic hidden-layer sigmoid must saturate at the same +/-8 bounds
// as the scalar/NEON lookup table. Otherwise x86 and ARM/WASM differ by ~0.001.
const neuralFile = 'expo-bgsage/vendor/bgsage/cpp/src/neural_net.cpp';
let neural = readFileSync(neuralFile, 'utf8');
const analytic = 'return _mm256_div_ps(one, _mm256_add_ps(one, exp_neg_x));';
const saturated = `__m256 result = _mm256_div_ps(one, _mm256_add_ps(one, exp_neg_x));
    result = _mm256_blendv_ps(result, one, _mm256_cmp_ps(x, _mm256_set1_ps(8.0f), _CMP_GE_OQ));
    return _mm256_blendv_ps(result, zero, _mm256_cmp_ps(x, _mm256_set1_ps(-8.0f), _CMP_LE_OQ));`;
if (!neural.includes(saturated)) {
  if (!neural.includes(analytic)) throw new Error('Upstream AVX sigmoid patch no longer applies');
  neural = neural.replace(analytic, saturated);
}
writeFileSync(neuralFile, neural);
writeFileSync('expo-bgsage/ios/vendor/bgsage/cpp/src/neural_net.cpp', neural);
