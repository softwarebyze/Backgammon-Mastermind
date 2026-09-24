import Foundation

// Parity harness: asserts the Swift engine + codec agree with the TypeScript
// implementation. Vectors come from scripts/imessage-parity-vectors.ts.
// Compile: swiftc main.swift GameEngine.swift MessagePayload.swift -o parity

var failures = 0
func check(_ label: String, _ condition: Bool, _ detail: String = "") {
  if condition {
    print("PASS \(label)")
  } else {
    failures += 1
    print("FAIL \(label) \(detail)")
  }
}

func moveKeys(_ moves: [ImMove]) -> [String] {
  moves.map { "\($0.from)>\($0.to)" }.sorted()
}

// 1. Codec: decode the TS-generated opening URL.
let openingURL = "https://backgammonmastermind.game/i?v=1&gid=Ab3dEf7hIj9K&turn=7&cur=b&pts=b2.0.0.0.0w5.0w3.0.0.0b5w5.0.0.0b3.0b5.0.0.0.0w2&bar=0%2C0&off=0%2C0&win=&d=5%2C2&last=moved+13%E2%86%928+%C2%B7+6%E2%86%924"
do {
  let payload = try ImTurnPayload(url: URL(string: openingURL)!)
  check("codec.opening.gid", payload.gameId == "Ab3dEf7hIj9K")
  check("codec.opening.turn", payload.turn == 7)
  check("codec.opening.cur", payload.current == .black)
  check("codec.opening.dice", payload.dice?.0 == 5 && payload.dice?.1 == 2)
  check("codec.opening.summary", payload.summary == "moved 13→8 · 6→4", payload.summary)
  check("codec.opening.pts24", payload.points[24] == ImPoint(owner: .white, count: 2))
  check("codec.opening.pts1", payload.points[1] == ImPoint(owner: .black, count: 2))
  check("codec.opening.pts7empty", payload.points[7] == .empty)
  check("codec.opening.caption", payload.caption == "White moved 13→8 · 6→4 — your move, Black", payload.caption)
  // Re-encode must reproduce the TS query (modulo key order / encoding style).
  let re = payload.queryItems
  func q(_ n: String) -> String { re.first(where: { $0.name == n })?.value ?? "∅" }
  check("codec.opening.reencode.pts", q("pts") == "b2.0.0.0.0w5.0w3.0.0.0b5w5.0.0.0b3.0b5.0.0.0.0w2", q("pts"))
  check("codec.opening.reencode.bar", q("bar") == "0,0")
} catch {
  check("codec.opening.decode", false, "\(error)")
}

// 2. Codec: post-move URL.
let movedURL = "https://backgammonmastermind.game/i?v=1&gid=ParityVec01&turn=1&cur=w&pts=b2.0.0.0w1w5.0w2.0.0.0b5w5.0.0.0b3.0b5.0.0.0.0w2&bar=0%2C0&off=0%2C0&win=&d=3%2C1&last=played+3%E2%80%931"
do {
  let payload = try ImTurnPayload(url: URL(string: movedURL)!)
  check("codec.moved.cur", payload.current == .white)
  // TS applied 8>5 (die 3): point 8 drops to 2, point 5 gains white's blot.
  check("codec.moved.pts8", payload.points[8] == ImPoint(owner: .white, count: 2), "\(payload.points[8])")
  check("codec.moved.pts5", payload.points[5] == ImPoint(owner: .white, count: 1), "\(payload.points[5])")
  check("codec.moved.pts7empty", payload.points[7] == .empty, "\(payload.points[7])")
  var board = payload.toBoard()
  check("codec.moved.balance", board.isBalanced)
  board.current = .white
  board.remaining = [1]
  check("codec.moved.hasMoves", imHasAnyLegalMove(board))
} catch {
  check("codec.moved.decode", false, "\(error)")
}

// 3. Codec: tampered counts must be rejected (mirrors the TS imbalance test).
do {
  let bad = "v=1&gid=Ab3dEf7hIj9K&turn=7&cur=b&pts=b2.0.0.0.0w5.0w3.0.0.0b5w5.0.0.0b3.0b5.0.0.0.0w2&bar=0,0&off=15,0&win=&d=&last=hi"
  var c = URLComponents()
  c.query = bad
  _ = try ImTurnPayload(queryItems: c.queryItems ?? [])
  check("codec.rejects.imbalance", false, "decoded without error")
} catch {
  check("codec.rejects.imbalance", true)
}

// 4. Engine: opening roll 3-1 for White.
do {
  var board = ImBoard.initial()
  board.current = .white
  board.remaining = [3, 1]
  let got = moveKeys(imLegalMoves(board)).joined(separator: ",")
  check("engine.opening.31", got == "13>10,24>21,24>23,6>3,6>5,8>5,8>7", got)
}

// 5. Engine: bar re-entry with 4-2.
do {
  var board = ImBoard.initial()
  board.points[8] = .empty
  board.points[6] = ImPoint(owner: .white, count: 4)
  board.bar = [.white: 1, .black: 0]
  board.current = .white
  board.remaining = [4, 2]
  let got = moveKeys(imLegalMoves(board)).joined(separator: ",")
  check("engine.bar.42", got == "0>21,0>23", got)
}

// 6. Engine: bear-off overshoot with 6-3.
do {
  var points = Array(repeating: ImPoint.empty, count: 25)
  points[6] = ImPoint(owner: .white, count: 3)
  points[4] = ImPoint(owner: .white, count: 5)
  points[2] = ImPoint(owner: .white, count: 7)
  points[1] = ImPoint(owner: .black, count: 2)
  points[12] = ImPoint(owner: .black, count: 5)
  points[17] = ImPoint(owner: .black, count: 3)
  points[19] = ImPoint(owner: .black, count: 5)
  var board = ImBoard(points: points, bar: [.white: 0, .black: 0], off: [.white: 0, .black: 0], current: .white, remaining: [6, 3], winner: nil)
  let got = moveKeys(imLegalMoves(board)).joined(separator: ",")
  check("engine.bearoff.63", got == "6>25,6>3", got)
}

// 7. Engine: doubles grant four dice; full game still balances after a move.
do {
  var board = ImBoard.initial()
  board.current = .white
  let roll = (2, 2)
  board.remaining = imRemainingDice(for: roll)
  check("engine.doubles.count", board.remaining.count == 4)
  if let move = imLegalMoves(board).first {
    let (next, _) = imApplyMove(board, move: move)
    check("engine.apply.balance", next.isBalanced)
    check("engine.apply.consumes", next.remaining.count == 3)
  } else {
    check("engine.apply.firstMove", false, "no legal moves from opening with 2-2")
  }
}

if failures > 0 {
  print("\(failures) FAILURE(S)")
  exit(1)
}
print("ALL PARITY CHECKS PASSED")
