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

// 8. Turn ownership: a device must never adopt its own message. Regression test
//    for the bug where tapping your own sent bubble let one person play both
//    sides — `outgoingPayload()` stamps `current` as the opponent to move, so
//    adopting your own payload hands you the other player's turn.
do {
  let creator = ImGameSession()
  creator.rollDice()
  let sent = creator.outgoingPayload()

  // The payload really does name the opponent as the side to move...
  check("ownership.outgoing.namesOpponent", sent.current == .black, "\(sent.current)")
  // ...so adopting it must be refused.
  check("ownership.rejectOwnMessage", creator.shouldAdopt(sent, isFromMe: true) == false)

  // The opponent's reply (same turn number, different device) is accepted.
  let opponent = ImGameSession()
  check("ownership.acceptOpponentReply", opponent.shouldAdopt(sent, isFromMe: false))
  opponent.load(payload: sent)
  check("ownership.replyPlaysBlack", opponent.board.current == .black)
  check("ownership.replyAdvancesTurn", opponent.turn == creator.turn + 1, "\(opponent.turn)")

  // After adopting, re-opening the same bubble must not rewind the session.
  check("ownership.noRewindSameBubble", opponent.shouldAdopt(sent, isFromMe: false) == false)

  // A creator's own payload is also refused by the opponent's device once the
  // opponent has already moved past that turn (stale echo, not a rewind).
  var rewound = opponent.board
  rewound.remaining = []
  rewound.current = .white
  let stale = ImTurnPayload.fromBoard(
    rewound, gameId: sent.gameId, turn: sent.turn, dice: sent.dice, summary: sent.summary)
  check("ownership.rejectStaleTurn", opponent.shouldAdopt(stale, isFromMe: false) == false)

  // A brand new game from someone else is always fair game.
  check("ownership.acceptNewGame", opponent.shouldAdopt(ImGameSession().outgoingPayload(), isFromMe: false))
}

// 9. Bear off must be reachable. `imBearOff` (25) is the one legal destination
//    that is not a numbered point, so `pointRow` (1...24) cannot render it.
//    Regression test for "the player can never complete the game".
do {
  var points = Array(repeating: ImPoint.empty, count: 25)
  points[6] = ImPoint(owner: .white, count: 1)
  points[12] = ImPoint(owner: .black, count: 2)
  points[8] = ImPoint(owner: .black, count: 5)
  points[17] = ImPoint(owner: .black, count: 3)
  points[19] = ImPoint(owner: .black, count: 5)
  var board = ImBoard(
    points: points, bar: [.white: 0, .black: 0],
    off: [.white: 14, .black: 0], current: .white, remaining: [6], winner: nil)
  check("bearoff.lastCheckerBalanced", board.isBalanced)

  let bearOffs = imLegalMoves(board).filter { $0.to == imBearOff }
  check("bearoff.moveGenerated", !bearOffs.isEmpty, "no legal bear-off from point 6 on a 6")

  if let move = bearOffs.first {
    let (next, result) = imApplyMove(board, move: move)
    check("bearoff.countedOff", next.off[.white] == 15, "\(next.off[.white] ?? -1)")
    check("bearoff.winnerSet", next.winner == .white, "\(String(describing: next.winner))")
    if case .gameOver(let winner) = result {
      check("bearoff.resultGameOver", winner == .white)
    } else {
      check("bearoff.resultGameOver", false, "expected .gameOver, got \(result)")
    }
    check("bearoff.stillBalanced", next.isBalanced)
  }

  // View wiring: bearing off has no numbered cell, so the board must expose an
  // explicit control that calls the bear-off sentinel. Without this the final
  // checker of any game is unreachable.
  let boardViewPath = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()   // parity/
    .deletingLastPathComponent()   // imessage/
    .appendingPathComponent("Sources/BoardView.swift")
  if let source = try? String(contentsOf: boardViewPath, encoding: .utf8) {
    check("bearoff.controlWired", source.contains("tapPoint(imBearOff)"))
  } else {
    check("bearoff.controlWired", false, "could not read BoardView.swift at \(boardViewPath.path)")
  }
}

// 10. Swift decoder must accept/reject exactly what codec.ts accepts/rejects.
//     Regression for a silent divergence: the Swift side was laxer on `pts` and
//     `gid`, so a URL one side produced could be rejected by the other.
do {
  let base = "https://backgammonmastermind.game/i?v=1&gid=Ab3dEf7hIj9K&turn=3&cur=w"
  // 48 chars: point 1 = 15 black, point 24 = whatever `slot` is, rest empty.
  func pts(_ slot: String) -> String { "bf" + String(repeating: ".0", count: 22) + slot }
  func decode(_ query: String) -> ImTurnPayload? { try? ImTurnPayload(url: URL(string: query)!) }

  let ok = decode("\(base)&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x")
  check("grammar.acceptsValid", ok != nil)

  // Uppercase count digit: POINTS_PATTERN is [0-9a-f] only. `wA` is white 10, so
  // `off` must be 5 to keep the position balanced — otherwise this would be
  // rejected by the balance check and pass for the wrong reason.
  check("grammar.rejectsUppercaseCount", decode("\(base)&pts=\(pts("wA"))&bar=0,0&off=5,0&win=&d=&last=x") == nil)
  // Sanity: the same position with a lowercase digit and matching off must pass.
  check("grammar.acceptsLowercaseHigh", decode("\(base)&pts=\(pts("wa"))&bar=0,0&off=5,0&win=&d=&last=x") != nil)
  // `w0` is an empty point in codec.ts, not an error.
  check("grammar.acceptsZeroCount", decode("\(base)&pts=\(pts("w0"))&bar=0,0&off=15,0&win=&d=&last=x") != nil)
  // Non-hex count digit.
  check("grammar.rejectsNonHexCount", decode("\(base)&pts=\(pts("wG"))&bar=0,0&off=13,0&win=&d=&last=x") == nil)
  // Game id: JS \w is ASCII-only; Swift's isLetter accepted "é".
  let unicodeGid = "https://backgammonmastermind.game/i?v=1&gid=abcdefgé&turn=3&cur=w&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x"
  check("grammar.rejectsUnicodeGameId", decode(unicodeGid) == nil)
  check("grammar.rejectsShortGameId", decode("https://backgammonmastermind.game/i?v=1&gid=abc&turn=3&cur=w&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x") == nil)

  // Turn bound: the local turn is payload.turn + 1, so the cap needs headroom.
  let bigTurn = decode("\(base.replacingOccurrences(of: "turn=3", with: "turn=1000000"))&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x")
  check("grammar.acceptsMaxTurn", bigTurn != nil)
  let overTurn = decode("\(base.replacingOccurrences(of: "turn=3", with: "turn=1000001"))&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x")
  check("grammar.rejectsOverMaxTurn", overTurn == nil)
  // The old 10_000 cap turned a legal turn 10_000 into an unencodable 10_001.
  let tenK = ImGameSession()
  tenK.load(payload: ImTurnPayload.fromBoard(ImBoard.initial(), gameId: "Ab3dEf7hIj9K", turn: 10_000, dice: nil, summary: "x"))
  check("turn.headroomAfterCap", tenK.turn == 10_001, "\(tenK.turn)")
  check("turn.reencodableAfterCap", tenK.outgoingPayload().url != nil)
}

// 11. A literal "+" in the summary must survive the Swift URL round-trip.
//     URLComponents leaves "+" unescaped and the decoder reads "+" as a space
//     (URLSearchParams semantics), so "a+b" used to decode as "a b".
do {
  let board = ImBoard.initial()
  for text in ["a+b", "a b", "played 13→8 · 6→4", "x+y z"] {
    let payload = ImTurnPayload.fromBoard(board, gameId: "Ab3dEf7hIj9K", turn: 1, dice: (6, 4), summary: text)
    guard let url = payload.url else {
      check("plus.urlBuilt.\(text)", false)
      continue
    }
    let back = try? ImTurnPayload(url: url)
    check("plus.roundTrip.\(text)", back?.summary == text, "got \(back?.summary ?? "nil")")
  }
}

// 12. A turn that moved a checker and then got blocked must not be reported as
//     a no-move pass.
do {
  // Dice are rolled locally and randomly, so this is a property check over many
  // trials: whenever a checker actually moved, the outgoing summary must not be
  // reported as a no-move pass.
  var trials = 0
  var movedTrials = 0
  var violations: [String] = []
  for _ in 0..<400 {
    let session = ImGameSession()
    session.rollDice()
    trials += 1
    // Play every legal move greedily; only the first is needed for the
    // invariant, but draining exercises the blocked-remainder case.
    for _ in 0..<4 {
      guard let move = session.legalMoves.first else { break }
      session.tapPoint(move.from)
      session.tapPoint(move.to)
      if session.movedThisTurn { break }
    }
    guard session.movedThisTurn else { continue }
    movedTrials += 1
    let summary = session.outgoingPayload().summary
    if !summary.contains("played") { violations.append(summary) }
  }
  check("summary.trialsRan", trials == 400, "\(trials)")
  check("summary.movedCasesCovered", movedTrials > 100, "\(movedTrials) moved turns seen")
  check("summary.neverReportedAsPass", violations.isEmpty, violations.prefix(3).joined(separator: " | "))
}

if failures > 0 {
  print("\(failures) FAILURE(S)")
  exit(1)
}
print("ALL PARITY CHECKS PASSED")
