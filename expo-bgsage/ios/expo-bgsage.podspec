Pod::Spec.new do |s|
  s.name           = 'expo-bgsage'
  s.version        = '0.1.0'
  s.summary        = 'Expo native module wrapping the bgsage backgammon engine'
  s.authors        = 'softwarebyze'
  s.license        = 'MPL-2.0'
  s.platforms      = { ios: '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  # Module sources (Swift + ObjC++ bridge) plus the vendored bgsage engine.
  # .github/scripts/fetch-bgsage-engine.sh populates ../vendor/bgsage in CI.
  s.source_files = '**/*.{h,m,mm,swift}', '../vendor/bgsage/cpp/src/*.cpp'
  s.public_header_files = '**/BgsageBridge.h', '../vendor/bgsage/cpp/include/bgbot/*.h'
  s.preserve_paths = '../vendor/bgsage/**/*'

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/../vendor/bgsage/cpp/include"',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    # Mirror upstream per-arch optimization (arm64 device + simulator).
    'OTHER_CPLUSPLUSFLAGS' => '-O3 -funsafe-math-optimizations -fno-math-errno -funroll-loops',
  }
  s.dependency 'ExpoModulesCore'
end
