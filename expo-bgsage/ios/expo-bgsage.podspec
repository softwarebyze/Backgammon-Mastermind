Pod::Spec.new do |s|
  s.name           = 'expo-bgsage'
  s.version        = '0.1.0'
  s.summary        = 'Expo native module wrapping the bgsage backgammon engine'
  s.homepage       = 'https://github.com/softwarebyze/Backgammon-Mastermind'
  s.authors        = 'softwarebyze'
  s.license        = 'MPL-2.0'
  s.platforms      = { ios: '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  # Module sources (Swift + ObjC++ bridge) plus the vendored bgsage engine.
  # .github/scripts/fetch-bgsage-engine.sh copies the engine C++ tree into
  # ios/vendor/bgsage in CI. CocoaPods resolves source_files relative to the
  # pod root (this directory), so the vendored sources must live UNDER ios/ —
  # a '../vendor/...' glob can never match anything (the pod's file list only
  # contains paths beneath the pod root).
  s.source_files = '**/*.{h,m,mm,swift}', 'vendor/bgsage/cpp/src/*.cpp'
  # Only the ObjC++ facade is public. The vendored bgsage C++ headers must NOT
  # be public: CocoaPods puts public headers in expo-bgsage-umbrella.h, which
  # Swift compiles as Objective-C (not Objective-C++), so '#include <array>'
  # inside bgbot/types.h fails with "'array' file not found" and the whole
  # module fails to build. The .mm bridge includes them directly via
  # HEADER_SEARCH_PATHS instead.
  s.public_header_files = '**/BgsageBridge.h'
  s.private_header_files = 'vendor/bgsage/cpp/include/bgbot/*.h'
  s.preserve_paths = 'vendor/bgsage/**/*'

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/vendor/bgsage/cpp/include"',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    # Mirror upstream per-arch optimization (arm64 device + simulator).
    'OTHER_CPLUSPLUSFLAGS' => '-O3 -funsafe-math-optimizations -fno-math-errno -funroll-loops',
    # vendor/bgsage/cpp/src/neural_net.cpp uses AVX/FMA intrinsics directly
    # (`__m256`, `_mm256_*`). arm64 has these in the base ISA, but the x86_64
    # slice needs them enabled explicitly or it fails to compile with
    # "always_inline function '_mm256_set1_ps' requires target feature 'avx'" —
    # which broke every Release simulator build (arm64 + x86_64). Scoped to
    # x86_64 so arm64 keeps its existing (empty) flag set.
    'OTHER_CPLUSPLUSFLAGS[arch=x86_64]' => '$(inherited) -mavx2 -mfma',
  }
  s.dependency 'ExpoModulesCore'
end
