import ExpoModulesCore

// Bgsage — Expo native module wrapping the bgsage C engine.
// All engine calls are serialized on a private queue: the mobile engine is
// single-threaded and one engine handle must never be entered concurrently.
public class BgsageModule: Module {
  private var bridge: BgsageBridge?
  private let queue = DispatchQueue(label: "com.bgsage.engine")

  public func definition() -> ModuleDefinition {
    Name("Bgsage")

    AsyncFunction("analyzeCheckers") {
      (board: [Int], die1: Int, die2: Int, ply: Int, promise: Promise) in
      self.queue.async {
        do {
          let json = try self.engine().analyzeCheckers(
            board.map { NSNumber(value: $0) },
            die1: Int32(die1), die2: Int32(die2), ply: Int32(ply))
          promise.resolve(json)
        } catch {
          promise.reject("SAGE_ERROR", error.localizedDescription)
        }
      }
    }

    AsyncFunction("analyzeCube") {
      (board: [Int], cubeValue: Int, cubeOwner: Int, ply: Int, promise: Promise) in
      self.queue.async {
        do {
          let json = try self.engine().analyzeCube(
            board.map { NSNumber(value: $0) },
            cubeValue: Int32(cubeValue), cubeOwner: Int32(cubeOwner), ply: Int32(ply))
          promise.resolve(json)
        } catch {
          promise.reject("SAGE_ERROR", error.localizedDescription)
        }
      }
    }
  }

  // Lazily creates the engine on first use (~50ms + asset mmap).
  private func engine() throws -> BgsageBridge {
    if let b = bridge { return b }
    // 24 model paths in strategy order (index 0 = 100 hidden units, rest 400).
    // Duplicated names are the strategy's canonical aliases — same file twice.
    let names = [
      "sl_s9_purerace", "sl_s9_race_race", "sl_s9_race_att", "sl_s9_race_prim",
      "sl_s9_race_anch", "sl_s9_att_race", "sl_s9_att_att", "sl_s9_att_prim",
      "sl_s9_att_anch", "sl_s9_prim_race", "sl_s9_prim_att", "sl_s9_prim_anch",
      "sl_s9_prim_anch", "sl_s9_anch_race", "sl_s9_anch_att", "sl_s9_prim_anch",
      "sl_s9_prim_anch", "sl_s11_bg_deep", "sl_s11_bg_middle", "sl_s11_bg_double",
      "sl_s11_bg_p3", "sl_s11_bg_containment", "sl_s11_bg_snake",
      "sl_s11_bg_massive",
    ]
    var paths: [String] = []
    for n in names {
      guard let p = Bundle.main.path(forResource: n, ofType: "weights.best") else {
        throw NSError(
          domain: "Bgsage", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "missing \(n).weights.best in app bundle"])
      }
      paths.append(p)
    }
    guard let bearoff = Bundle.main.path(forResource: "bearoff_1sided", ofType: "db") else {
      throw NSError(
        domain: "Bgsage", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "missing bearoff_1sided.db in app bundle"])
    }
    let b = BgsageBridge(modelPaths: paths, bearoffPath: bearoff)
    bridge = b
    return b
  }
}
