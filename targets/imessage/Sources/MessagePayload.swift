import Foundation

// MARK: - iMessage turn payload (v1)
//
// Swift mirror of `src/lib/imessage/codec.ts`. The grammar is identical; the
// round-trip vectors in `codec.test.ts` double as the cross-language spec.
// Any change here must land in both files plus a codec-version bump.

let imCodecVersion = 1
let imPayloadBaseURL = "https://backgammonmastermind.game/i"
let imMaxSummaryLength = 140

enum ImPayloadError: Error, Equatable {
  case noQuery
  case missingParam(String)
  case invalidParam(String, String)
}

/// A decoded turn: full board position for the player to act next.
struct ImTurnPayload: Equatable {
  var gameId: String
  var turn: Int
  var current: ImPlayer
  var points: [ImPoint] // 25 entries, index 0 unused
  var bar: [ImPlayer: Int]
  var off: [ImPlayer: Int]
  var winner: ImPlayer?
  var dice: (Int, Int)?
  var summary: String

  static func == (lhs: ImTurnPayload, rhs: ImTurnPayload) -> Bool {
    lhs.gameId == rhs.gameId
      && lhs.turn == rhs.turn
      && lhs.current == rhs.current
      && lhs.points == rhs.points
      && lhs.bar == rhs.bar
      && lhs.off == rhs.off
      && lhs.winner == rhs.winner
      && lhs.dice?.0 == rhs.dice?.0
      && lhs.dice?.1 == rhs.dice?.1
      && lhs.summary == rhs.summary
  }

  // MARK: Decoding

  init(
    gameId: String,
    turn: Int,
    current: ImPlayer,
    points: [ImPoint],
    bar: [ImPlayer: Int],
    off: [ImPlayer: Int],
    winner: ImPlayer?,
    dice: (Int, Int)?,
    summary: String
  ) {
    self.gameId = gameId
    self.turn = turn
    self.current = current
    self.points = points
    self.bar = bar
    self.off = off
    self.winner = winner
    self.dice = dice
    self.summary = summary
  }

  init(url: URL) throws {
    try self.init(queryItems: Self.queryItems(from: url))
  }

  /// Parse the raw query so "+" (TS URLSearchParams' space encoding) becomes
  /// a space while "%2B" still decodes to a literal plus.
  static func queryItems(from url: URL) throws -> [URLQueryItem] {
    let absolute = url.absoluteString
    guard let mark = absolute.firstIndex(of: "?") else {
      throw ImPayloadError.noQuery
    }
    let rawQuery = String(absolute[absolute.index(after: mark)...])
      .split(separator: "#", maxSplits: 1).first.map(String.init) ?? ""
    var components = URLComponents()
    components.percentEncodedQuery = rawQuery.replacingOccurrences(of: "+", with: "%20")
    guard let items = components.queryItems else {
      throw ImPayloadError.noQuery
    }
    return items
  }

  init(queryItems items: [URLQueryItem]) throws {
    func value(_ name: String) throws -> String {
      guard let item = items.first(where: { $0.name == name }),
            let raw = item.value else {
        throw ImPayloadError.missingParam(name)
      }
      return raw
    }

    let version = try value("v")
    guard version == String(imCodecVersion) else {
      throw ImPayloadError.invalidParam("v", "unsupported codec version \"\(version)\"")
    }

    let gameId = try value("gid")
    guard Self.isValidGameId(gameId) else {
      throw ImPayloadError.invalidParam("gid", "must be 6-24 chars of [A-Za-z0-9_-]")
    }

    let turnRaw = try value("turn")
    guard let turn = Int(turnRaw), (1 ... 10_000).contains(turn) else {
      throw ImPayloadError.invalidParam("turn", "must be an integer in 1..10000")
    }

    guard let current = ImPlayer(shortCode: try value("cur")) else {
      throw ImPayloadError.invalidParam("cur", "must be \"w\" or \"b\"")
    }

    guard let points = Self.decodePoints(try value("pts")) else {
      throw ImPayloadError.invalidParam("pts", "must be 24 × (owner + base36 count)")
    }

    guard let barPair = Self.parseCountPair(try value("bar")) else {
      throw ImPayloadError.invalidParam("bar", "must be \"white,black\" counts 0..15")
    }
    guard let offPair = Self.parseCountPair(try value("off")) else {
      throw ImPayloadError.invalidParam("off", "must be \"white,black\" counts 0..15")
    }
    let bar: [ImPlayer: Int] = [.white: barPair.0, .black: barPair.1]
    let off: [ImPlayer: Int] = [.white: offPair.0, .black: offPair.1]

    var probe = ImBoard(
      points: points, bar: bar, off: off,
      current: current, remaining: [], winner: nil
    )
    probe.winner = nil
    guard probe.isBalanced else {
      throw ImPayloadError.invalidParam("pts", "each side must account for exactly 15 checkers")
    }

    let winRaw = items.first(where: { $0.name == "win" })?.value ?? ""
    let winner: ImPlayer?
    switch winRaw {
    case "": winner = nil
    case "w": winner = .white
    case "b": winner = .black
    default: throw ImPayloadError.invalidParam("win", "must be \"\" | \"w\" | \"b\"")
    }

    let diceRaw = items.first(where: { $0.name == "d" })?.value ?? ""
    let dice: (Int, Int)?
    if diceRaw.isEmpty {
      dice = nil
    } else {
      let parts = diceRaw.split(separator: ",").compactMap { Int($0) }
      guard parts.count == 2, parts.allSatisfy({ (1 ... 6).contains($0) }) else {
        throw ImPayloadError.invalidParam("d", "must be \"\" or two dice 1-6")
      }
      dice = (parts[0], parts[1])
    }

    let summary = items.first(where: { $0.name == "last" })?.value ?? ""
    guard summary.count <= imMaxSummaryLength else {
      throw ImPayloadError.invalidParam("last", "must be ≤ \(imMaxSummaryLength) chars")
    }

    self.init(
      gameId: gameId, turn: turn, current: current, points: points,
      bar: bar, off: off, winner: winner, dice: dice, summary: summary
    )
  }

  // MARK: Encoding

  var queryItems: [URLQueryItem] {
    [
      URLQueryItem(name: "v", value: String(imCodecVersion)),
      URLQueryItem(name: "gid", value: gameId),
      URLQueryItem(name: "turn", value: String(turn)),
      URLQueryItem(name: "cur", value: current.shortCode),
      URLQueryItem(name: "pts", value: Self.encodePoints(points)),
      URLQueryItem(name: "bar", value: "\(bar[.white] ?? 0),\(bar[.black] ?? 0)"),
      URLQueryItem(name: "off", value: "\(off[.white] ?? 0),\(off[.black] ?? 0)"),
      URLQueryItem(name: "win", value: winner?.shortCode ?? ""),
      URLQueryItem(
        name: "d",
        value: dice.map { "\($0.0),\($0.1)" } ?? ""
      ),
      URLQueryItem(name: "last", value: summary),
    ]
  }

  var url: URL? {
    var components = URLComponents(string: imPayloadBaseURL)
    components?.queryItems = queryItems
    return components?.url
  }

  // MARK: Points codec

  static func encodePoints(_ points: [ImPoint]) -> String {
    var out = ""
    for index in 1 ... 24 {
      let slot = points[index]
      if slot.owner == nil || slot.count == 0 {
        out += ".0"
      } else {
        out += "\(slot.owner!.shortCode)\(String(slot.count, radix: 36))"
      }
    }
    return out
  }

  static func decodePoints(_ encoded: String) -> [ImPoint]? {
    guard encoded.count == 48 else { return nil }
    let chars = Array(encoded)
    var points = Array(repeating: ImPoint.empty, count: 25)
    for index in 1 ... 24 {
      let ownerChar = chars[(index - 1) * 2]
      let countChar = chars[(index - 1) * 2 + 1]
      guard let count = Int(String(countChar), radix: 36), (0 ... 15).contains(count) else {
        return nil
      }
      switch ownerChar {
      case ".":
        continue
      case "w":
        guard count > 0 else { return nil }
        points[index] = ImPoint(owner: .white, count: count)
      case "b":
        guard count > 0 else { return nil }
        points[index] = ImPoint(owner: .black, count: count)
      default:
        return nil
      }
    }
    return points
  }

  // MARK: Helpers

  static func isValidGameId(_ raw: String) -> Bool {
    guard (6 ... 24).contains(raw.count) else { return false }
    return raw.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
  }

  static func parseCountPair(_ raw: String) -> (Int, Int)? {
    let parts = raw.split(separator: ",").compactMap { Int($0) }
    guard parts.count == 2, parts.allSatisfy({ (0 ... 15).contains($0) }) else { return nil }
    return (parts[0], parts[1])
  }

  /// Snapshot a post-turn board into a sendable payload.
  static func fromBoard(
    _ board: ImBoard,
    gameId: String,
    turn: Int,
    dice: (Int, Int)?,
    summary: String
  ) -> ImTurnPayload {
    ImTurnPayload(
      gameId: gameId,
      turn: turn,
      current: board.current,
      points: board.points,
      bar: board.bar,
      off: board.off,
      winner: board.winner,
      dice: dice,
      summary: String(summary.prefix(imMaxSummaryLength))
    )
  }

  /// Inflate a payload into a playable position for `current` (dice to roll).
  func toBoard() -> ImBoard {
    ImBoard(
      points: points, bar: bar, off: off,
      current: current, remaining: [], winner: winner
    )
  }

  /// Bubble caption, mirroring `formatImessageCaption` in codec.ts.
  var caption: String {
    if let winner {
      return "\(winner == .white ? "White" : "Black") wins in \(turn) turn\(turn == 1 ? "" : "s") 🏆"
    }
    let mover = current == .white ? "Black" : "White"
    let next = current == .white ? "White" : "Black"
    let action = summary.trimmingCharacters(in: .whitespacesAndNewlines)
    return "\(mover) \(action.isEmpty ? "made a move" : action) — your move, \(next)"
  }
}
