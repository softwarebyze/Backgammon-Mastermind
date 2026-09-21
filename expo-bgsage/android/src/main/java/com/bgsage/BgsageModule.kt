package com.bgsage

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.Executors

// Bgsage — Expo native module wrapping the bgsage C engine via JNI.
// All engine calls are serialized on a single-thread executor: the mobile
// engine is single-threaded and one engine handle must never be entered
// concurrently.
class BgsageModule : Module() {
  private val queue = Executors.newSingleThreadExecutor()
  @Volatile private var handle: Long = 0L

  override fun definition() = ModuleDefinition {
    Name("Bgsage")

    AsyncFunction("analyzeCheckers") { board: List<Int>, die1: Int, die2: Int, ply: Int, promise: Promise ->
      queue.execute {
        try {
          val json = BgsageNative.analyzeCheckers(nativeHandle(), board.toIntArray(), die1, die2, ply)
          promise.resolve(json)
        } catch (e: Exception) {
          promise.reject("SAGE_ERROR", e.message, e)
        }
      }
    }

    AsyncFunction("analyzeCube") { board: List<Int>, cubeValue: Int, cubeOwner: Int, ply: Int, promise: Promise ->
      queue.execute {
        try {
          val json = BgsageNative.analyzeCube(nativeHandle(), board.toIntArray(), cubeValue, cubeOwner, ply)
          promise.resolve(json)
        } catch (e: Exception) {
          promise.reject("SAGE_ERROR", e.message, e)
        }
      }
    }
  }

  // Lazily creates the engine on first use. Weight files ship in
  // assets/bgsage/ (see the config plugin); the C API needs real file paths,
  // so they are copied to internal storage once.
  @Synchronized
  private fun nativeHandle(): Long {
    if (handle != 0L) return handle
    val ctx: Context = appContext.reactContext
      ?: throw IllegalStateException("no react context")
    val dir = File(ctx.filesDir, "bgsage").apply { mkdirs() }
    // 24 model paths in strategy order (index 0 = 100 hidden units, rest 400).
    val names = listOf(
      "sl_s9_purerace", "sl_s9_race_race", "sl_s9_race_att", "sl_s9_race_prim",
      "sl_s9_race_anch", "sl_s9_att_race", "sl_s9_att_att", "sl_s9_att_prim",
      "sl_s9_att_anch", "sl_s9_prim_race", "sl_s9_prim_att", "sl_s9_prim_anch",
      "sl_s9_prim_anch", "sl_s9_anch_race", "sl_s9_anch_att", "sl_s9_prim_anch",
      "sl_s9_prim_anch", "sl_s11_bg_deep", "sl_s11_bg_middle", "sl_s11_bg_double",
      "sl_s11_bg_p3", "sl_s11_bg_containment", "sl_s11_bg_snake",
      "sl_s11_bg_massive",
    )
    val assetMan = ctx.assets
    val paths = names.map { n ->
      val fileName = "$n.weights.best"
      val out = File(dir, fileName)
      if (!out.exists()) {
        assetMan.open("bgsage/$fileName").use { inp ->
          out.outputStream().use { inp.copyTo(it) }
        }
      }
      out.absolutePath
    }.toTypedArray()
    val bearoffOut = File(dir, "bearoff_1sided.db")
    if (!bearoffOut.exists()) {
      assetMan.open("bgsage/bearoff_1sided.db").use { inp ->
        bearoffOut.outputStream().use { inp.copyTo(it) }
      }
    }
    handle = BgsageNative.create(paths, bearoffOut.absolutePath)
    if (handle == 0L) throw IllegalStateException("bgsage engine failed to initialize")
    return handle
  }
}

// Thin JNI facade. libbgsage_jni.so is built by android/src/main/cpp/CMakeLists.txt.
internal object BgsageNative {
  init { System.loadLibrary("bgsage_jni") }

  @JvmStatic external fun create(modelPaths: Array<String>, bearoffPath: String): Long
  @JvmStatic external fun analyzeCheckers(handle: Long, board: IntArray, die1: Int, die2: Int, ply: Int): String
  @JvmStatic external fun analyzeCube(handle: Long, board: IntArray, cubeValue: Int, cubeOwner: Int, ply: Int): String
  @JvmStatic external fun destroy(handle: Long)
}
