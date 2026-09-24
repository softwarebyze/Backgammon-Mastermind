import Foundation

// MARK: - Backgammon engine for the iMessage extension
//
// Faithful, dependency-free port of the app's TypeScript rules
// (`src/lib/game/moves.ts` + `constants.ts`). Turn positions cross the wire
// through the shared v1 codec (`src/lib/imessage/codec.ts` ↔
// `MessagePayload.swift`), so both sides must agree on these semantics:
//
// - White moves toward lower indices (-1), Black toward higher (+1).
// - Bar entry: White → 25 - die, Black → die.
// - Bear-off: exact die, or a larger die from the furthest occupied home point.
// - Doubles grant four moves. USBGF max-dice / higher-die filtering applies.

enum ImPlayer: String, Codable, CaseIterable {
  case white
  case black

  var opponent: ImPlayer { self == .white ? .black : .white }

  /// Board direction: white descends, black ascends.
  var direction: Int { self == .white ? -1 : 1 }

  var shortCode: String { self == .white ? "w" : "b" }

  init?(shortCode: String) {
    switch shortCode {
    case "w": self = .white
    case "b": self = .black
    default: return nil
    }
  }
}

struct ImPoint: Equatable {
  var owner: ImPlayer?
  var count: Int

  static var empty: ImPoint { ImPoint(owner: nil, count: 0) }
}

/// from: 0 = bar, 1-24 = point. to: 1-24 = point, 25 = bear off.
struct ImMove: Equatable {
  var from: Int
  var to: Int
  var dieIndex: Int
}

let imBarPoint = 0
let imBearOff = 25
let imTotalCheckers = 15

/// Value type holding one side-to-move position. Index 0 of `points` is unused.
struct ImBoard: Equatable {
  /// 25 entries; indices 1-24 are the board.
  var points: [ImPoint]
  var bar: [ImPlayer: Int]
  var off: [ImPlayer: Int]
  var current: ImPlayer
  var remaining: [Int]
  var winner: ImPlayer?

  static func initial() -> ImBoard {
    var points = Array(repeating: ImPoint.empty, count: 25)
    points[24] = ImPoint(owner: .white, count: 2)
    points[13] = ImPoint(owner: .white, count: 5)
    points[8] = ImPoint(owner: .white, count: 3)
    points[6] = ImPoint(owner: .white, count: 5)
    points[1] = ImPoint(owner: .black, count: 2)
    points[12] = ImPoint(owner: .black, count: 5)
    points[17] = ImPoint(owner: .black, count: 3)
    points[19] = ImPoint(owner: .black, count: 5)
    return ImBoard(
      points: points,
      bar: [.white: 0, .black: 0],
      off: [.white: 0, .black: 0],
      current: .white,
      remaining: [],
      winner: nil
    )
  }

  /// Every side must account for exactly 15 checkers. Guards tampered payloads.
  var isBalanced: Bool {
    for player in ImPlayer.allCases {
      var total = (bar[player] ?? 0) + (off[player] ?? 0)
      for index in 1 ... 24 where points[index].owner == player {
        total += points[index].count
      }
      guard total == imTotalCheckers else { return false }
    }
    return true
  }
}

enum ImTurnResult: Equatable {
  /// Dice remain and at least one legal move exists.
  case movesAvailable
  /// Dice remain but nothing is playable (opponent must acknowledge / auto-pass).
  case noMoves
  /// All dice consumed — caller should send the turn.
  case turnComplete
  /// A side bore off its 15th checker.
  case gameOver(winner: ImPlayer)
}

// MARK: - Rules

func imIsInHomeBoard(_ player: ImPlayer, point: Int) -> Bool {
  player == .white ? (1 ... 6).contains(point) : (19 ... 24).contains(point)
}

func imAllCheckersInHome(_ board: ImBoard, player: ImPlayer) -> Bool {
  guard (board.bar[player] ?? 0) == 0 else { return false }
  for index in 1 ... 24 {
    let point = board.points[index]
    if !imIsInHomeBoard(player, point: index), point.owner == player, point.count > 0 {
      return false
    }
  }
  return true
}

func imCanLandOn(_ board: ImBoard, player: ImPlayer, point: Int) -> Bool {
  guard (1 ... 24).contains(point) else { return false }
  let slot = board.points[point]
  if slot.count == 0 || slot.owner == nil { return true }
  if slot.owner == player { return true }
  return slot.count == 1 // blot — hittable
}

/// Overshoot bear-off requires the checker to sit on the furthest occupied
/// home point (highest index for White, lowest for Black).
func imCanUseLargerDieToBearOff(_ board: ImBoard, player: ImPlayer, from: Int) -> Bool {
  if player == .white {
    if from < 6 {
      for index in (from + 1) ... 6 {
        if board.points[index].owner == .white, board.points[index].count > 0 {
          return false
        }
      }
    }
    return true
  } else {
    if from > 19 {
      for index in 19 ..< from {
        if board.points[index].owner == .black, board.points[index].count > 0 {
          return false
        }
      }
    }
    return true
  }
}

private func imUniqueDice(_ remaining: [Int]) -> [(value: Int, index: Int)] {
  var seen = Set<Int>()
  var out: [(Int, Int)] = []
  for (index, value) in remaining.enumerated() where !seen.contains(value) {
    seen.insert(value)
    out.append((value, index))
  }
  return out
}

/// Single-die destinations, before USBGF max-dice / higher-die filtering.
func imRawSingleStepMoves(_ board: ImBoard) -> [ImMove] {
  let player = board.current
  guard !board.remaining.isEmpty else { return [] }
  let dice = imUniqueDice(board.remaining)
  var moves: [ImMove] = []

  // Bar: must re-enter before any other move.
  if (board.bar[player] ?? 0) > 0 {
    for (die, index) in dice {
      let target = player == .white ? 25 - die : die
      if imCanLandOn(board, player: player, point: target) {
        moves.append(ImMove(from: imBarPoint, to: target, dieIndex: index))
      }
    }
    return moves
  }

  let inHome = imAllCheckersInHome(board, player: player)
  for from in 1 ... 24 {
    let slot = board.points[from]
    guard slot.owner == player, slot.count > 0 else { continue }
    for (die, index) in dice {
      let target = from + player.direction * die
      if (1 ... 24).contains(target) {
        if imCanLandOn(board, player: player, point: target) {
          moves.append(ImMove(from: from, to: target, dieIndex: index))
        }
      } else if inHome, imIsInHomeBoard(player, point: from) {
        let exact = player == .white ? from - die == 0 : from + die == 25
        let overshoot = player == .white ? from - die < 0 : from + die > 25
        if exact || (overshoot && imCanUseLargerDieToBearOff(board, player: player, from: from)) {
          moves.append(ImMove(from: from, to: imBearOff, dieIndex: index))
        }
      }
    }
  }
  return moves
}

/// Physically move a checker and consume the die. No legality checks, no turn
/// passing — mirrors `applyMovePhysical` in moves.ts so search stays truthful.
func imApplyPhysical(_ board: ImBoard, move: ImMove) -> ImBoard {
  var next = board
  let player = board.current
  let foe = player.opponent

  if move.from == imBarPoint {
    next.bar[player] = (next.bar[player] ?? 0) - 1
  } else {
    next.points[move.from].count -= 1
    if next.points[move.from].count == 0 { next.points[move.from].owner = nil }
  }

  if move.to == imBearOff {
    next.off[player] = (next.off[player] ?? 0) + 1
  } else if next.points[move.to].owner == foe, next.points[move.to].count == 1 {
    next.bar[foe] = (next.bar[foe] ?? 0) + 1
    next.points[move.to] = ImPoint(owner: player, count: 1)
  } else {
    next.points[move.to].owner = player
    next.points[move.to].count += 1
  }

  next.remaining.remove(at: move.dieIndex)
  if (next.off[player] ?? 0) == imTotalCheckers {
    next.winner = player
  }
  return next
}

private func imPositionKey(_ board: ImBoard) -> String {
  var key = "\(board.current):\(board.remaining.map(String.init).joined(separator: ",")):"
  key += "b\(board.bar[.white] ?? 0),\(board.bar[.black] ?? 0);"
  key += "o\(board.off[.white] ?? 0),\(board.off[.black] ?? 0);"
  for index in 1 ... 24 {
    let slot = board.points[index]
    if slot.count > 0, let owner = slot.owner {
      key += "\(index)\(owner.shortCode)\(slot.count),"
    }
  }
  return key
}

/// Deepest number of remaining dice still playable — drives the USBGF filter.
private func imMaxDiceUsable(_ board: ImBoard, memo: inout [String: Int]) -> Int {
  if board.winner != nil || board.remaining.isEmpty { return 0 }
  let key = imPositionKey(board)
  if let cached = memo[key] { return cached }
  let raw = imRawSingleStepMoves(board)
  guard !raw.isEmpty else {
    memo[key] = 0
    return 0
  }
  var best = 0
  for move in raw {
    let used = 1 + imMaxDiceUsable(imApplyPhysical(board, move: move), memo: &memo)
    best = max(best, used)
    if best == board.remaining.count { break }
  }
  memo[key] = best
  return best
}

/// USBGF: keep first moves using the most dice; if only one mixed die is
/// usable, keep the higher. Never drops every candidate.
func imLegalMoves(_ board: ImBoard) -> [ImMove] {
  let raw = imRawSingleStepMoves(board)
  guard raw.count > 1, board.remaining.count > 1 else { return raw }
  var memo: [String: Int] = [:]
  var scored: [(move: ImMove, usage: Int, die: Int)] = []
  var maxUsage = 0
  for move in raw {
    let die = board.remaining[move.dieIndex]
    let usage = 1 + imMaxDiceUsable(imApplyPhysical(board, move: move), memo: &memo)
    scored.append((move, usage, die))
    maxUsage = max(maxUsage, usage)
  }
  var legal = scored.filter { $0.usage == maxUsage }
  if maxUsage == 1,
     let higher = board.remaining.max(),
     let lower = board.remaining.min(),
     higher != lower,
     legal.contains(where: { $0.die == higher }) {
    legal = legal.filter { $0.die == higher }
  }
  return legal.map { $0.move }
}

func imHasAnyLegalMove(_ board: ImBoard) -> Bool {
  !imRawSingleStepMoves(board).isEmpty
}

/// Apply a legal move and report the resulting turn state.
func imApplyMove(_ board: ImBoard, move: ImMove) -> (board: ImBoard, result: ImTurnResult) {
  let next = imApplyPhysical(board, move: move)
  if let winner = next.winner { return (next, .gameOver(winner: winner)) }
  if next.remaining.isEmpty { return (next, .turnComplete) }
  if !imHasAnyLegalMove(next) { return (next, .noMoves) }
  return (next, .movesAvailable)
}

// MARK: - Dice

func imRollDice() -> (Int, Int) {
  (Int.random(in: 1 ... 6), Int.random(in: 1 ... 6))
}

/// Expand a roll into remaining dice (doubles grant four).
func imRemainingDice(for roll: (Int, Int)) -> [Int] {
  roll.0 == roll.1 ? [roll.0, roll.0, roll.0, roll.0] : [roll.0, roll.1]
}
