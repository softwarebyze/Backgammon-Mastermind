# expo-bgsage/android/src/main/cpp/CMakeLists.txt
cmake_minimum_required(VERSION 3.22.1)
project(bgsage_jni)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Vendored bgsage engine sources (.github/scripts/fetch-bgsage-engine.sh).
set(BGSAGE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../vendor/bgsage")

set(BGSAGE_SRCS
  "${BGSAGE_DIR}/cpp/src/board.cpp"
  "${BGSAGE_DIR}/cpp/src/moves.cpp"
  "${BGSAGE_DIR}/cpp/src/strategy.cpp"
  "${BGSAGE_DIR}/cpp/src/pubeval.cpp"
  "${BGSAGE_DIR}/cpp/src/game.cpp"
  "${BGSAGE_DIR}/cpp/src/benchmark.cpp"
  "${BGSAGE_DIR}/cpp/src/encoding.cpp"
  "${BGSAGE_DIR}/cpp/src/neural_net.cpp"
  "${BGSAGE_DIR}/cpp/src/training.cpp"
  "${BGSAGE_DIR}/cpp/src/multipy.cpp"
  "${BGSAGE_DIR}/cpp/src/rollout.cpp"
  "${BGSAGE_DIR}/cpp/src/cube.cpp"
  "${BGSAGE_DIR}/cpp/src/cube_eval.cpp"
  "${BGSAGE_DIR}/cpp/src/match_equity.cpp"
  "${BGSAGE_DIR}/cpp/src/bearoff.cpp"
  "${BGSAGE_DIR}/cpp/src/cuda_nn_stub.cpp"
  "${BGSAGE_DIR}/cpp/src/mobile.cpp"
)

add_library(bgsage_jni SHARED
  bgsage_jni.cpp
  ${BGSAGE_SRCS}
)

target_include_directories(bgsage_jni PRIVATE
  "${BGSAGE_DIR}/cpp/include"
)

# Optimization flags mirror upstream cpp/CMakeLists_cpu.txt per-arch logic:
# AVX2/FMA on x86_64 (emulator + Intel devices), fast-math on arm64 (NEON path).
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  if(ANDROID)
    set(_bgsage_arch "${ANDROID_ABI}")
  else()
    set(_bgsage_arch "${CMAKE_SYSTEM_PROCESSOR}")
  endif()
  if(_bgsage_arch MATCHES "^(arm64|aarch64|arm64-v8a|armeabi-v7a)$")
    set(_bgsage_opt -O3 -funsafe-math-optimizations -fno-math-errno -funroll-loops)
  else()
    set(_bgsage_opt -O3 -ffast-math -funroll-loops -mavx2 -mfma)
  endif()
  target_compile_options(bgsage_jni PRIVATE ${_bgsage_opt})
endif()

find_library(log-lib log)
target_link_libraries(bgsage_jni ${log-lib})
