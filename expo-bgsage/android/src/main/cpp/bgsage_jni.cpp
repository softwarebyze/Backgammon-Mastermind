// bgsage_jni.cpp — JNI facade over the bgsage mobile C API.
#include <jni.h>

#include <string>
#include <vector>

#include "bgbot/mobile.h"

namespace {

BgsageMobileEngine* ToEngine(jlong h) {
  return reinterpret_cast<BgsageMobileEngine*>(h);
}

std::string ToStdString(JNIEnv* env, jstring s) {
  const char* c = env->GetStringUTFChars(s, nullptr);
  std::string out(c ? c : "");
  if (c) env->ReleaseStringUTFChars(s, c);
  return out;
}

void FillBoard(BgsageMobileRequest& r, JNIEnv* env, jintArray board) {
  jsize n = env->GetArrayLength(board);
  jint* elems = env->GetIntArrayElements(board, nullptr);
  for (int i = 0; i < 26 && i < n; i++) r.board[i] = elems[i];
  env->ReleaseIntArrayElements(board, elems, JNI_ABORT);
}

jstring RunAnalyze(JNIEnv* env, jlong handle, int op, const BgsageMobileRequest& req) {
  char* j = bgsage_mobile_analyze(ToEngine(handle), op, &req);
  jstring out = env->NewStringUTF(j ? j : "{\"error\":\"engine returned null\"}");
  bgsage_mobile_free(j);
  return out;
}

}  // namespace

extern "C" {

// long nativeCreate(String[] modelPaths, String bearoffPath)
JNIEXPORT jlong JNICALL
Java_com_bgsage_BgsageNative_create(JNIEnv* env, jclass, jobjectArray modelPaths,
                                    jstring bearoffPath) {
  jsize n = env->GetArrayLength(modelPaths);
  if (n != 24) return 0;
  std::vector<std::string> owned;
  std::vector<const char*> ptrs;
  for (int i = 0; i < 24; i++) {
    auto s = (jstring)env->GetObjectArrayElement(modelPaths, i);
    owned.push_back(ToStdString(env, s));
    env->DeleteLocalRef(s);
  }
  // NOTE: the engine is documented to copy what it needs at create time; the
  // path strings only need to live through this call.
  for (auto& s : owned) ptrs.push_back(s.c_str());
  // Index 0 = 100 hidden units; indices 1..23 = 400.
  static const int kHidden[24] = {100, 400, 400, 400, 400, 400, 400, 400, 400,
                                  400, 400, 400, 400, 400, 400, 400, 400, 400,
                                  400, 400, 400, 400, 400, 400};
  std::string bearoff = ToStdString(env, bearoffPath);
  BgsageMobileEngine* e = bgsage_mobile_create("backgame_pair_phased", ptrs.data(),
                                               kHidden, 24, bearoff.c_str());
  return reinterpret_cast<jlong>(e);
}

// String nativeAnalyzeCheckers(long handle, int[] board, int die1, int die2, int ply)
JNIEXPORT jstring JNICALL
Java_com_bgsage_BgsageNative_analyzeCheckers(JNIEnv* env, jclass, jlong handle,
                                             jintArray board, jint die1,
                                             jint die2, jint ply) {
  BgsageMobileRequest r{};
  FillBoard(r, env, board);
  r.die1 = die1;
  r.die2 = die2;
  r.ply = ply;
  r.cube_value = 1;
  r.cube_owner = 0;  // centered
  r.jacoby = 1;
  r.budget_ms = 1000;
  return RunAnalyze(env, handle, /*op=*/0, r);
}

// String nativeAnalyzeCube(long handle, int[] board, int cubeValue, int cubeOwner, int ply)
JNIEXPORT jstring JNICALL
Java_com_bgsage_BgsageNative_analyzeCube(JNIEnv* env, jclass, jlong handle,
                                         jintArray board, jint cubeValue,
                                         jint cubeOwner, jint ply) {
  BgsageMobileRequest r{};
  FillBoard(r, env, board);
  r.ply = ply;
  r.cube_value = cubeValue;
  r.cube_owner = cubeOwner;
  r.jacoby = 1;
  r.budget_ms = 1000;
  return RunAnalyze(env, handle, /*op=*/1, r);
}

// void nativeDestroy(long handle)
JNIEXPORT void JNICALL
Java_com_bgsage_BgsageNative_destroy(JNIEnv*, jclass, jlong handle) {
  bgsage_mobile_destroy(ToEngine(handle));
}

}  // extern "C"
