import Foundation

// Parity harness: asserts the Swift engine + codec agree with the TypeScript
// implementation. Vectors come from scripts/imessage-parity-vectors.ts.
// Compile: swiftc main.swift GameEngine.swift MessagePayload.swift -o parity

// Sessions persist so turn ownership survives the extension process being
// reaped. Every harness session gets its own in-memory store: sharing one would
// leak state between tests, and using the real defaults would make the suite
// non-hermetic and write to the developer's `UserDefaults`.
ImGameSession.defaultStore = ImMemorySessionStore()

/// A session with a clean store, optionally seeded to simulate a relaunch.
func makeSession(_ saved: ImGameSession.Saved? = nil) -> ImGameSession {
  ImGameSession(store: ImMemorySessionStore(saved))
}

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
  let creator = makeSession()
  creator.rollDice()
  let sent = creator.outgoingPayload()

  // The payload really does name the opponent as the side to move...
  check("ownership.outgoing.namesOpponent", sent.current == .black, "\(sent.current)")
  // ...so adopting it must be refused.
  check("ownership.rejectOwnMessage", creator.shouldAdopt(sent, isFromMe: true) == false)

  // The opponent's reply (same turn number, different device) is accepted.
  let opponent = makeSession()
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
  check("ownership.acceptNewGame", opponent.shouldAdopt(makeSession().outgoingPayload(), isFromMe: false))
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

  // Turn boundary is asserted below via grammar.acceptsMaxWireTurn /
  // grammar.rejectsMaxLocalTurn, since imMaxTurn bounds the *local* turn.

  // The old 10_000 cap turned a legal turn 10_000 into an unencodable 10_001.
  let tenK = makeSession()
  tenK.load(payload: ImTurnPayload.fromBoard(ImBoard.initial(), gameId: "Ab3dEf7hIj9K", turn: 10_000, dice: nil, summary: "x"))
  check("turn.headroomAfterCap", tenK.turn == 10_001, "\(tenK.turn)")
  // Must actually decode, not merely build a URL: `url` is assembled from
  // queryItems without validation, so a non-nil URL says nothing about whether
  // the peer would accept it.
  let tenKURL = tenK.outgoingPayload().url
  check("turn.reencodableAfterCap", tenKURL != nil && (try? ImTurnPayload(url: tenKURL!)) != nil)

  // The accepted wire range is exactly the emittable range: the emitted wire turn
  // equals the local turn, so anything we can emit must also decode.
  let maxWire = decode("\(base.replacingOccurrences(of: "turn=3", with: "turn=\(imMaxTurn)"))&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x")
  check("grammar.acceptsMaxWireTurn", maxWire != nil)
  let overWire = decode("\(base.replacingOccurrences(of: "turn=3", with: "turn=\(imMaxTurn + 1)"))&pts=\(pts("w2"))&bar=0,0&off=13,0&win=&d=&last=x")
  check("grammar.rejectsOverMaxWireTurn", overWire == nil)
  // Loading the maximum wire turn must not advance past what we can encode.
  let atCap = makeSession()
  atCap.load(payload: ImTurnPayload.fromBoard(ImBoard.initial(), gameId: "Ab3dEf7hIj9K", turn: imMaxTurn, dice: nil, summary: "x"))
  check("turn.localClampedToMax", atCap.turn == imMaxTurn, "\(atCap.turn)")
  let atCapURL = atCap.outgoingPayload().url
  check("turn.maxLocalPayloadEncodes", atCapURL != nil && (try? ImTurnPayload(url: atCapURL!)) != nil)
}

// 12b. Count/dice pair parsing must match codec.ts's regexes exactly. Tested
//     directly: going through decode() would let the 15-checker balance check
//     reject these for an unrelated reason and the vectors would pass vacuously.
do {
  typealias Pair = (Int, Int)?
  let pair = ImTurnPayload.parseCountPair
  // COUNT_PAIR_PATTERN = /^(\d{1,2}),(\d{1,2})$/
  check("pairs.acceptsPlain", pair("0,0") != nil)
  check("pairs.acceptsOneDigit", pair("5,12") != nil)
  check("pairs.rejectsEmptyField", pair("1,,2") == nil)
  check("pairs.rejectsTrailingComma", pair("1,2,") == nil)
  check("pairs.rejectsLeadingComma", pair(",1,2") == nil)
  check("pairs.rejectsExtraField", pair("1,2,3") == nil)
  check("pairs.rejectsSigned", pair("+5,2") == nil)
  check("pairs.rejectsNegative", pair("-1,2") == nil)
  check("pairs.rejectsSpaces", pair("5, 2") == nil)
  check("pairs.rejectsOver15", pair("16,0") == nil)
  check("pairs.rejectsThreeDigits", pair("100,2") == nil)
  check("pairs.rejectsEmpty", pair("") == nil)

  let dice = ImTurnPayload.parseDicePair
  // DICE_PATTERN = /^[1-6],[1-6]$/
  check("dice.acceptsPlain", dice("6,1") != nil)
  check("dice.rejectsTrailingComma", dice("1,2,") == nil)
  check("dice.rejectsSigned", dice("+1,2") == nil)
  check("dice.rejectsEmptyField", dice("1,") == nil)
  check("dice.rejectsZero", dice("0,1") == nil)
  check("dice.rejectsOutOfRange", dice("1,7") == nil)
  check("dice.rejectsExtraField", dice("1,2,3") == nil)

  // JS `.length` counts UTF-16 code units; Swift's `count` counts grapheme
  // clusters. "🏆" is one Character but two UTF-16 units, so 140 of them is 280
  // units and must be rejected. Exercised through decode() because the limit is
  // applied there.
  let base = "https://backgammonmastermind.game/i?v=1&gid=Ab3dEf7hIj9K&turn=3&cur=w&pts=bf"
    + String(repeating: ".0", count: 22) + "w2&bar=0,0&off=13,0&win=&d=&last="
  func decode(_ q: String) -> ImTurnPayload? { try? ImTurnPayload(url: URL(string: q)!) }
  func enc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .alphanumerics)! }
  check("summary.utf16AllowsAtLimit", decode(base + enc(String(repeating: "a", count: 140))) != nil)
  check("summary.utf16LengthEnforced", decode(base + enc(String(repeating: "🏆", count: 71))) == nil)
  check("summary.utf16CountsCodeUnitsNotGraphemes", decode(base + enc(String(repeating: "🏆", count: 70))) != nil)
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
    let session = makeSession()
    session.rollDice()
    trials += 1
    // Play every legal move greedily; only the first is needed for the
    // invariant, but draining exercises the blocked-remainder case.
    for _ in 0..<4 {
      guard let move = session.sequences.first else { break }
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

// 13. A staged turn must lock the local player out. Regression test for the bug
//     where "Send turn" staged a bubble announcing the opponent was to move, but
//     Roll and the points stayed live — so the same device could roll again and
//     play a second turn while the staged bubble still said "your move, Black".
//     Found by playing against your own number, where no legitimate reply exists.
do {
  let s = makeSession()
  check("staged.startsRollable", s.needsRoll)
  s.rollDice()
  // Play the turn out so Send becomes legal.
  for _ in 0..<4 {
    guard let move = s.sequences.first else { break }
    s.tapPoint(move.from)
    s.tapPoint(move.to)
    if s.isTurnSendable { break }
  }
  check("staged.reachesSendable", s.isTurnSendable)
  let diceBefore = s.dice.map { "\($0.0)-\($0.1)" } ?? "none"
  let pointsBefore = s.board.points

  s.markStaged()
  check("staged.notSendable", s.isTurnSendable == false)
  // The two claims that must not coexist: a staged bubble for the opponent...
  check("staged.noSecondRoll", s.needsRoll == false)
  s.rollDice()
  let diceAfter = s.dice.map { "\($0.0)-\($0.1)" } ?? "none"
  check("staged.rollIsNoop", diceAfter == diceBefore, "\(diceAfter) vs \(diceBefore)")

  // ...and a live local turn.
  s.tapPoint(13)
  check("staged.tapIsNoop", s.selectedPoint == nil)
  s.tapPoint(8)
  check("staged.tapIsNoop2", s.selectedPoint == nil && s.destinations.isEmpty)
  check("staged.boardFrozen", s.board.points == pointsBefore)

  // Starting over is refused, otherwise the composer would keep a bubble for a
  // game this session no longer holds.
  s.loadNewGame()
  let diceAfterNew = s.dice.map { "\($0.0)-\($0.1)" } ?? "none"
  check("staged.newGameRefused", s.pendingSend && diceAfterNew == diceBefore)

  // A failed stage hands control back.
  s.failToStage("nope")
  check("staged.recovered", s.pendingSend == false)

  // One roll per turn. Spending the last die empties `board.remaining`, which
  // used to re-arm Roll for the same turn — the "roll and roll and play many
  // moves" report. `dice != nil` is what holds the turn closed.
  let r = makeSession()
  r.rollDice()
  for _ in 0..<4 {
    guard let move = r.sequences.first else { break }
    r.tapPoint(move.from)
    r.tapPoint(move.to)
    if r.board.remaining.isEmpty { break }
  }
  check("oneroll.diceSpent", r.board.remaining.isEmpty)
  check("oneroll.notRollableAgain", r.needsRoll == false, "needsRoll=\(r.needsRoll)")
  let ptsBefore = r.board.points
  r.rollDice()
  check("oneroll.rollIsNoop", r.board.points == ptsBefore)
  check("oneroll.stillSendable", r.isTurnSendable)

  // Deleting the staged draft must hand the turn back (didCancelSending).
  r.markStaged()
  check("cancel.lockedWhileStaged", r.isTurnSendable == false)
  r.failToStage("removed")
  check("cancel.unlocked", r.isTurnSendable, "pending=\(r.pendingSend)")

  // Loading a new position clears a stale staged flag, so Send does not stay
  // disabled as "Staged" for a different game.
  r.markStaged()
  let opponentReply = ImTurnPayload.fromBoard(
    ImBoard.initial(), gameId: r.gameId, turn: 1, dice: (3, 1), summary: "played")
  r.load(payload: opponentReply)
  check("cancel.pendingClearedOnLoad", r.pendingSend == false)
  check("cancel.rollableOnNewTurn", r.needsRoll)

  s.markSending()
  check("sent.notSendable", s.isTurnSendable == false)
  check("sent.noRoll", s.needsRoll == false)
  s.tapPoint(13)
  check("sent.tapIsNoop", s.selectedPoint == nil)
}

// 14. Decoder parity gaps found in review: a declared winner must have borne
//     off all 15 (mirrors codec.ts), and the point owner char must be validated
//     before a zero count short-circuits it.
do {
  let decode: (String) -> ImTurnPayload? = { try? ImTurnPayload(url: URL(string: $0)!) }

  /// Build a 24-pair `pts` string from point -> (owner, count).
  func ptsString(_ spec: [Int: (Character, Int)]) -> String {
    var out = ""
    for point in 1...24 {
      let (owner, count) = spec[point] ?? (".", 0)
      out += "\(owner)\(count)"
    }
    return out
  }

  let opening: [Int: (Character, Int)] = [
    24: ("w", 2), 13: ("w", 5), 8: ("w", 3), 6: ("w", 5),
    1: ("b", 2), 12: ("b", 5), 17: ("b", 3), 19: ("b", 5),
  ]
  let openingPts = ptsString(opening)
  let root = "https://backgammonmastermind.game/i?v=1&gid=Ab3dEf7hIj9K&turn=3&cur=w"
  func url(_ pts: String, _ off: String, _ win: String) -> String {
    "\(root)&pts=\(pts)&bar=0,0&off=\(off)&win=\(win)&d=&last=x"
  }

  // Sanity: the opening is a legal live position and decodes.
  check("winner.openingDecodes", decode(url(openingPts, "0,0", "")) != nil)

  // A live position (nobody has borne off) may not claim a winner.
  check("winner.rejectsFalseClaim", decode(url(openingPts, "0,0", "w")) == nil)
  check("winner.rejectsFalseClaimBlack", decode(url(openingPts, "0,0", "b")) == nil)
  // Non-empty win value is still a grammar error.
  check("winner.rejectsGarbage", decode(url(openingPts, "0,0", "x")) == nil)

  // A genuine result: white bore off all 15, black still has 15 on the board.
  let won: [Int: (Character, Int)] = [
    1: ("b", 2), 12: ("b", 5), 17: ("b", 3), 19: ("b", 5),
  ]
  check("winner.acceptsBoreOff", decode(url(ptsString(won), "15,0", "w")) != nil)
  // ...and the same position claiming the *loser* won is rejected.
  check("winner.rejectsLoserClaim", decode(url(ptsString(won), "15,0", "b")) == nil)

  // The point owner char must be validated before a zero count skips it:
  // POINTS_PATTERN allows only [wb.], so `x0` / `?0` are rejected.
  func swapOwner(_ point: Int, _ to: Character) -> String {
    var spec = opening
    spec[point] = (to, 0)
    return ptsString(spec)
  }
  check("owner.rejectsBadOwnerZeroCount", decode(url(swapOwner(4, "x"), "0,0", "")) == nil)
  check("owner.rejectsBadOwnerDotless", decode(url(swapOwner(4, "?"), "0,0", "")) == nil)
  // `w0` / `b0` remain accepted as empty points, as codec.ts does.
  check("owner.acceptsZeroCount", decode(url(swapOwner(4, "w"), "0,0", "")) != nil)
}

// 15. Compound moves: one checker played with both dice in a single tap, and
//     undo stepping back a move without ever un-rolling.
do {
  // White 6/5 24/2 13/5 8/3 — roll 5-3 and check the chain off point 8.
  let board = ImBoard.initial()
  var moved = board
  moved.current = .white
  moved.remaining = [5, 3]
  let seqs = imSequences(moved)
  // 8 -> 3 with die 5, or 8 -> 5 with die 3: neither blocks the other, so the
  // full 8-point compound move to point 0 is out of range, but 6 -> 1 (5) and
  // 6 -> 3 (3) can chain, as can 13 -> 8 (5) but 8 is occupied by white.
  let chained = seqs.filter { $0.usesDice == 2 }
  check("compound.someChainExists", !chained.isEmpty, "\(seqs.count) sequences")
  for seq in chained {
    check("compound.sameChecker", seq.dies.count == 2)
    check("compound.usesRealDice", seq.dies.allSatisfy { moved.remaining.contains($0) })
    check("compound.fromOwned", seq.from == 6 || seq.from == 13 || seq.from == 24 || seq.from == 8)
  }
  // Single-die moves must stay available alongside compound ones. Offering only
  // the longest chain hid them, and a source whose sole option was one die then
  // showed no destination at all and claimed it had no legal move.
  let singleDie = seqs.filter { $0.usesDice == 1 }
  check("compound.offersSingleDieToo", !singleDie.isEmpty, "\(singleDie.count) single-die")
  check("compound.offersChains", !chained.isEmpty)
  // Every single-die step the engine offers must be reachable in the sequence
  // list, so no legal move can be missing from the UI.
  let rawTargets = Set(imRawSingleStepMoves(moved).map { "\($0.from)>\($0.to)" })
  let seqTargets = Set(seqs.map { "\($0.from)>\($0.to)" })
  check("compound.noMissingMoves", rawTargets.isSubset(of: seqTargets),
        "missing \(rawTargets.subtracting(seqTargets).sorted())")
  // A source that also has a compound option must still expose every one of its
  // single-die options — that regression is what made the UI claim "no legal
  // move" on a point that plainly had some.
  for source in Set(chained.map(\.from)) {
    let rawFrom = Set(imRawSingleStepMoves(moved).filter { $0.from == source }.map(\.to))
    let offeredFrom = Set(seqs.filter { $0.from == source }.map(\.to))
    check("compound.keepsSingleDieOptions.\(source)", rawFrom.isSubset(of: offeredFrom),
          "raw \(rawFrom.sorted()) offered \(offeredFrom.sorted())")
  }

  // Sources reported as movable match the sequence origins.
  check("compound.movableSources", imMovableSources(moved) == Set(seqs.map(\.from)))

  // Engine-level: replaying a chain consumes exactly its dice and moves the
  // checker the whole distance.
  if let chain = chained.first {
    var after = moved
    var current = chain.from
    for die in chain.dies {
      guard let index = after.remaining.firstIndex(of: die),
            let step = imRawSingleStepMoves(after).first(where: {
              $0.dieIndex == index && $0.from == current
            })
      else { break }
      current = step.to
      after = imApplyPhysical(after, move: step)
    }
    check("compound.replayConsumesBothDice", after.remaining.isEmpty, "\(after.remaining)")
    check("compound.replayLandsOnTarget", after.points[chain.to].owner == .white, "\(chain.to)")
  }

  // Session-level: tap a chain through the real path, then undo it. `load`
  // does not restore `remaining`, so roll for real and retry until a compound
  // turn comes up (the opening position almost always has one).
  var exercised = false
  for _ in 0 ..< 60 where !exercised {
    let session = makeSession()
    session.rollDice()
    // `imSequences` only returns maximal chains, so every sequence here uses
    // the same number of dice. Keep rolling until a compound turn comes up.
    // Prefer a two-die roll: with doubles there are four dice, so a two-die
    // chain correctly leaves two behind and cannot show "both dice in one tap".
    guard let dice = session.dice, dice.0 != dice.1,
          let chain = session.sequences.first(where: { $0.usesDice == 2 })
    else { continue }
    let before = session.board
    session.tapPoint(chain.from)
    check("compound.selected", session.selectedPoint == chain.from)
    check("compound.destinationsIncludeTarget", session.destinations.contains(chain.to))
    session.tapPoint(chain.to)
    check("compound.oneTapBothDice", session.board.remaining.isEmpty, "\(session.board.remaining)")
    check("compound.spentExactlyItsDice",
          before.remaining.count - session.board.remaining.count == chain.dies.count,
          "\(before.remaining.count) -> \(session.board.remaining.count), dies \(chain.dies)")
    check("compound.landedOnTarget", session.board.points[chain.to].owner == .white, "\(chain.to)")
    check("compound.canUndo", session.canUndo)
    check("compound.undoKeepsDice", session.dice != nil, "undo must not un-roll")
    session.undo()
    check("compound.undoRestoresBoard", session.board == before)
    check("compound.undoRestoresRemaining", session.board.remaining == before.remaining)
    check("compound.noUndoAfterUndo", session.canUndo == false)
    check("compound.undoClearsSelection", session.selectedPoint == nil && session.destinations.isEmpty)
    // A committed turn cannot be taken back.
    session.tapPoint(chain.from)
    session.tapPoint(chain.to)
    session.markSending()
    check("compound.noUndoAfterSend", session.canUndo == false)
    session.undo()
    check("compound.undoNoopAfterSend", session.board.remaining.isEmpty, "remaining=\(session.board.remaining)")
    exercised = true
  }
  check("compound.sessionExercised", exercised)
  check("compound.sawTwoDieChain", exercised)
}

// 16. Guards added from review: a staged draft blocks adopting a new position,
//     a reset clears the new turn state, and the turn ceiling round-trips.
do {
  let s = makeSession()
  s.rollDice()
  for _ in 0..<4 {
    guard let move = s.sequences.first else { break }
    s.tapPoint(move.from)
    s.tapPoint(move.to)
    if s.isTurnSendable { break }
  }
  s.markStaged()
  // Adopting under a staged bubble would let didStartSending mark the *new*
  // game sent while the composer holds the old payload.
  let other = ImTurnPayload.fromBoard(
    ImBoard.initial(), gameId: "ParityVec01", turn: 9, dice: (2, 1), summary: "x")
  check("guard.noAdoptWhileStaged", s.shouldAdopt(other, isFromMe: false) == false)
  // A new game is refused while staged, so a stale draft cannot outlive it.
  s.loadNewGame()
  check("guard.newGameRefusedWhileStaged", s.pendingSend)

  // Once unstaged, a reset clears every piece of turn state.
  s.failToStage("cancelled")
  s.loadNewGame()
  check("guard.resetClearsPending", s.pendingSend == false)
  check("guard.resetClearsHistory", s.canUndo == false)
  check("guard.resetIsFresh", s.isFreshGame)
  check("guard.resetRollable", s.needsRoll)

  // The turn ceiling must round-trip: clamping to the maximum still has to
  // produce a payload the peer can decode, or the game silently stops.
  let atCap = makeSession()
  atCap.load(payload: ImTurnPayload.fromBoard(
    ImBoard.initial(), gameId: "Ab3dEf7hIj9K", turn: imMaxTurn, dice: nil, summary: "x"))
  check("ceiling.clamped", atCap.turn == imMaxTurn, "\(atCap.turn)")
  let capURL = atCap.outgoingPayload().url
  check("ceiling.reencodable", capURL != nil && (try? ImTurnPayload(url: capURL!)) != nil)
  check("ceiling.decodedTurn", (try? ImTurnPayload(url: capURL!))?.turn == imMaxTurn)
}

// 17. Mandatory dice use. A move may strand the other die only when the rules
//     force it, and `imSequences` must never offer one that does not.
//
//     Regression for the reported "says no legal moves when there are legal
//     moves" sibling: `imSequences` built its steps from the raw single-step
//     list, so it offered first moves that USBGF forbids. The player could play
//     one, strand the other die, and send a turn the opponent could not have
//     produced — the UI even narrated it as a pass.
do {
  // White: one checker on the bar, one on point 4, 13 borne off. Black blocks
  // 22 and 2. Roll 1-2.
  //
  //   * enter 24 with the 1  -> the 2 is stranded (24>22 and 4>2 both blocked).
  //     `imLegalMoves` forbids this first move.
  //   * enter 23 with the 2  -> then 4>3 with the 1. Both dice played.
  func blockedBarBoard() -> ImBoard {
    var points = Array(repeating: ImPoint.empty, count: 25)
    points[4] = ImPoint(owner: .white, count: 1)
    points[1] = ImPoint(owner: .black, count: 2)
    points[2] = ImPoint(owner: .black, count: 2)
    points[22] = ImPoint(owner: .black, count: 2)
    return ImBoard(
      points: points, bar: [.white: 1, .black: 0],
      off: [.white: 13, .black: 0], current: .white, remaining: [1, 2], winner: nil)
  }

  let blocked = blockedBarBoard()
  check("mustUse.legalIsOnlyEnterWithTwo", moveKeys(imLegalMoves(blocked)).joined() == "0>23",
        moveKeys(imLegalMoves(blocked)).joined(separator: ","))
  // The offered destination set must not contain the move the rules forbid.
  let offeredBar = imSequences(blocked).filter { $0.from == imBarPoint }.map(\.to)
  check("mustUse.forbidsStrandingEntry", !offeredBar.contains(24), "\(offeredBar.sorted())")
  check("mustUse.offersLegalEntry", offeredBar.contains(23), "\(offeredBar.sorted())")

  // Every offered sequence must *begin* with a move the rules allow. This is
  // the invariant that was violated: steps came from the raw list, so a chain
  // could start on a filtered-out move.
  func firstStepIsLegal(_ board: ImBoard) -> Bool {
    let legalKeys = Set(moveKeys(imLegalMoves(board)))
    return imSequences(board).allSatisfy { sequence in
      guard let die = sequence.dies.first,
            let index = board.remaining.firstIndex(of: die),
            let step = imRawSingleStepMoves(board).first(where: {
              $0.dieIndex == index && $0.from == sequence.from
            })
      else { return false }
      return legalKeys.contains("\(step.from)>\(step.to)")
    }
  }
  check("mustUse.firstStepLegal.blocked", firstStepIsLegal(blocked))

  // The depth-1 destinations are exactly `imLegalMoves` — no missing (a legal
  // move the UI hides) and none extra (an illegal one the UI offers).
  let depthOne = Set(imSequences(blocked).filter { $0.usesDice == 1 }.map { "\($0.from)>\($0.to)" })
  check("mustUse.depthOneMatchesLegal", depthOne == Set(moveKeys(imLegalMoves(blocked))),
        "offered \(depthOne.sorted())")

  // Randomized over positions from real played-out games: the two exact
  // invariants that were violated, asserted on every position rather than only
  // the hand-built one. Neither is heuristic, so neither can flake.
  var positions = 0
  var badFirstStep = 0
  var badDepthOne = 0
  var sidesSeen: Set<ImPlayer> = []
  for _ in 0 ..< 40 {
    let session = makeSession()
    session.rollDice()
    // Drive whole games turn by turn, sampling the position at every step so
    // mid-turn boards (doubles, part-spent dice) are covered too. `load` keeps
    // the payload's side, so flipping `current` here alternates the players.
    for _ in 0 ..< 400 {
      if session.isGameOver { break }
      if session.board.remaining.isEmpty || session.dice == nil {
        var next = session.board
        next.current = next.current.opponent
        session.load(payload: ImTurnPayload.fromBoard(
          next, gameId: "MustUse000", turn: 7, dice: nil, summary: "x"))
        session.rollDice()
        continue
      }
      let board = session.board
      sidesSeen.insert(board.current)
      positions += 1
      let legalKeys = Set(moveKeys(imLegalMoves(board)))
      let seqs = imSequences(board)
      for seq in seqs {
        guard let die = seq.dies.first,
              let index = board.remaining.firstIndex(of: die),
              let step = imRawSingleStepMoves(board).first(where: {
                $0.dieIndex == index && $0.from == seq.from
              })
        else { badFirstStep += 1; continue }
        if !legalKeys.contains("\(step.from)>\(step.to)") { badFirstStep += 1 }
      }
      let depthOne = Set(seqs.filter { $0.usesDice == 1 }.map { "\($0.from)>\($0.to)" })
      let allTargets = Set(seqs.map { "\($0.from)>\($0.to)" })
      // Not `depthOne == legalKeys`: a destination reachable both ways is served
      // by the longer chain, so it is absent from the single-die set on purpose.
      // What must hold is that no legal move is *missing* from the offer.
      if !legalKeys.isSubset(of: allTargets) { badDepthOne += 1 }

      // Play on: prefer a chain, else any single-die move.
      guard let next = seqs.first(where: { $0.usesDice > 1 }) ?? seqs.first else { break }
      session.tapPoint(next.from)
      guard session.destinations.contains(next.to) else { break }
      session.tapPoint(next.to)
    }
  }
  check("mustUse.positionsSampled", positions > 500, "\(positions)")
  check("mustUse.bothSidesSampled", sidesSeen == Set(ImPlayer.allCases), "\(sidesSeen)")
  check("mustUse.firstStepLegalRandomized", badFirstStep == 0, "\(badFirstStep) bad chains")
  check("mustUse.noMissingLegalMovesRandomized", badDepthOne == 0, "\(badDepthOne) bad sets")

  // Playing only what the UI offers must never strand a die the player could
  // still have played from the position they reached.
  var illegalStrands = 0
  for _ in 0 ..< 60 {
    let session = makeSession()
    session.rollDice()
    let before = session.board.remaining
    for _ in 0 ..< 6 {
      guard !session.board.remaining.isEmpty else { break }
      guard let seq = session.sequences.first else { break }
      session.tapPoint(seq.from)
      guard session.destinations.contains(seq.to) else { break }
      session.tapPoint(seq.to)
    }
    guard session.isTurnSendable, !session.board.remaining.isEmpty else { continue }
    // A die left behind is only legal if the higher-die rule forced it: the
    // position must be exhausted *and* the player must have played the higher
    // die. Anything else means the offered moves were not the rules' choice.
    let played = before.max() ?? 0
    let stranded = session.board.remaining
    if !imHasAnyLegalMove(session.board) {
      if stranded.count == 1, let left = stranded.first, left != played {
        continue  // higher-die rule: correct to strand the lower die
      }
      illegalStrands += 1
    } else {
      // Still playable after the turn claimed to be sendable — the send
      // boundary disagreed with the engine.
      illegalStrands += 1
    }
  }
  check("mustUse.noIllegalStranding", illegalStrands == 0, "\(illegalStrands) bad turns")

  // Session-level end-to-end on the reported position: the bar must not offer
  // 24, and entering with the 2 must leave the 1 playable from point 4 so Send
  // stays disabled.
  let probe = blockedBarBoard()
  let played = { () -> ImGameSession? in
    for _ in 0 ..< 4000 {
      let s = makeSession()
      s.load(payload: ImTurnPayload.fromBoard(probe, gameId: "MustUse000", turn: 3,
                                              dice: (1, 2), summary: "x"))
      s.rollDice()
      if let d = s.dice, d.0 == 1 || d.1 == 1, d.0 == 2 || d.1 == 2 { return s }
    }
    return nil
  }()
  if let session = played, session.board.remaining.contains(1), session.board.remaining.contains(2) {
    session.tapPoint(imBarPoint)
    check("mustUse.sessionBarDestinations", !session.destinations.contains(24),
          "\(session.destinations.sorted())")
    check("mustUse.sessionOffersTwo", session.destinations.contains(23),
          "\(session.destinations.sorted())")
    session.tapPoint(23)
    check("mustUse.secondDieStillPlayable", !session.isTurnSendable,
          "remaining \(session.board.remaining)")
    // Point 4 with the 1 finishes the turn and only then is Send allowed.
    session.tapPoint(4)
    check("mustUse.offersFourAfterEntry", session.destinations.contains(3),
          "\(session.destinations.sorted())")
    session.tapPoint(3)
    check("mustUse.turnSendableAfterBothDice", session.isTurnSendable,
          "remaining \(session.board.remaining)")
    check("mustUse.allDicePlayed", session.board.remaining.isEmpty,
          "\(session.board.remaining)")
  } else {
    check("mustUse.sessionExercised.position", false, "never rolled 1-2")
  }
}

// 18. Send lifecycle. `didStartSending` is the only send callback Messages gives
//     us besides `didCancelSending`, and neither confirms delivery — so the
//     state it produces has to stay reversible, or a send that fails after the
//     extension dismissed leaves the turn unsendable forever.
do {
  let s = makeSession()
  s.rollDice()
  // Play the turn out through the tap path.
  for _ in 0 ..< 8 {
    guard !s.board.remaining.isEmpty, let seq = s.sequences.first else { break }
    s.tapPoint(seq.from)
    guard s.destinations.contains(seq.to) else { break }
    s.tapPoint(seq.to)
  }
  guard s.isTurnSendable else {
    check("send.turnSendable", false, "could not complete a turn")
    exit(1)
  }

  let boardBefore = s.board
  let diceBefore = s.dice
  let payloadBefore = s.outgoingPayload().url

  s.markSending()
  // A send that never lands must not cost the player the turn.
  check("send.keepsBoard", s.board == boardBefore)
  check("send.keepsDice", s.dice.map { "\($0.0)-\($0.1)" } == diceBefore.map { "\($0.0)-\($0.1)" })
  check("send.resendable", s.canResend)
  // Still not a normal send — the turn is committed, not mid-play.
  check("send.stillNotTurnSendable", s.isTurnSendable == false)
  check("send.noRollAfterSending", s.needsRoll == false)
  // Undo must stay refused: the bubble already went out.
  check("send.noUndoAfterSending", s.canUndo == false)

  // Retry reproduces the identical payload, so a resend cannot silently change
  // the move list the opponent will play.
  s.retrySend()
  check("send.retryClearsSent", s.sentLatestTurn == false)
  check("send.retryNotResendable", s.canResend == false)
  check("send.retrySendable", s.isTurnSendable)
  // The pre-send snapshots must survive: the old `markSent()` cleared
  // `moveHistory`, so even a manual retry could not reproduce the position.
  check("send.retryRestoresUndo", s.canUndo)
  let payloadAfter = s.outgoingPayload().url
  check("send.retrySamePayload", payloadAfter == payloadBefore,
        "\(payloadBefore?.absoluteString ?? "∅") vs \(payloadAfter?.absoluteString ?? "∅")")

  // A cancelled draft is still a distinct path and must not look sent.
  s.markStaged()
  check("send.stagedNotSent", s.sentLatestTurn == false && s.pendingSend)
  s.failToStage("cancelled")
  check("send.failToStageUnlocks", s.sentLatestTurn == false && s.pendingSend == false)

  // `failToStage` is published from `conversation.insert`'s completion, which
  // runs off the main thread — the controller must hop before touching state.
  // Guard the call site so the hop cannot be dropped again.
  let controller = try String(contentsOfFile: "targets/imessage/Sources/MessagesViewController.swift", encoding: .utf8)
  check("send.failToStageOnMainThread",
        controller.contains("DispatchQueue.main.async") && controller.contains("failToStage"),
        "conversation.insert completion publishes session state")
  check("send.noMarkSentLeftover", !controller.contains("markSent("))

  // Wiring guard: the retry affordance has to actually reach the button, or the
  // session can recover while the UI still shows a dead "Sent!".
  let board = try String(contentsOfFile: "targets/imessage/Sources/BoardView.swift", encoding: .utf8)
  check("send.resendWired",
        board.contains("onResend") && board.contains("canResend")
          && board.contains("\"Send again\""),
        "ImBoardView must offer the retry")
}

// 19. Staged-then-sent ordering: a retry must not leave the draft flag set, and
//     resending must not unlock a turn that a *new* position has replaced.
do {
  let s = makeSession()
  s.rollDice()
  for _ in 0 ..< 8 {
    guard !s.board.remaining.isEmpty, let seq = s.sequences.first else { break }
    s.tapPoint(seq.from)
    guard s.destinations.contains(seq.to) else { break }
    s.tapPoint(seq.to)
  }
  s.markStaged()
  s.markSending()
  check("order.sendingClearsStaged", s.pendingSend == false)
  check("order.sendingSetsSent", s.sentLatestTurn)
  check("order.resendAfterStagedSend", s.canResend)
  // Loading an opponent reply supersedes everything about our own turn.
  let reply = ImTurnPayload.fromBoard(
    ImBoard.initial(), gameId: s.gameId, turn: s.turn, dice: (4, 2), summary: "played")
  s.load(payload: reply)
  check("order.loadClearsSent", s.sentLatestTurn == false)
  check("order.loadClearsResend", s.canResend == false)
}

// 20. The compact sheet must shrink to the height Messages offers, never clip.
//     Regression for the "New Message" compose sheet, which is much shorter than
//     the conversation drawer: the Roll button was cut off entirely and
//     "Send turn" was sliced in half, because the sheet sized itself from the
//     root view's fitting size, the root forced `.frame(height: 360)`, and the
//     content was taller than that frame — so it was centred and overflowed off
//     both ends.
//
//     Two things have to hold, and neither is obvious from reading the layout:
//       - the height is a constraint at a yieldable priority, not a SwiftUI
//         frame (a frame reports its height whatever it is offered, so it always
//         wins and always clips);
//       - the board sits in a flexible slot, so the chrome's real height is
//         never guessed at. An earlier version reserved a hard-coded
//         `verticalChrome`, which was too small and reintroduced the overflow.
do {
  let board = try String(contentsOfFile: "targets/imessage/Sources/BoardView.swift", encoding: .utf8)
  let controller = try String(contentsOfFile: "targets/imessage/Sources/MessagesViewController.swift", encoding: .utf8)

  check("layout.noSwiftUIHeightFrame",
        !board.contains(".frame(height: Self.compactSheetHeight)")
          && !board.contains(".frame(height: compactSheetHeight)"),
        "a SwiftUI height frame beats whatever Messages offers and clips the sheet")

  check("layout.heightIsConstraint",
        controller.contains("heightAnchor.constraint"),
        "compact height must come from a constraint that can break")
  check("layout.heightConstraintYields",
        controller.contains("priority = .defaultHigh"),
        "constraint must sit below required so a shorter sheet wins")
  check("layout.compactHeightApplied",
        controller.contains("applyCompactHeightConstraint(for: style)"))

  // The board has to be the flexible child; otherwise the leftover-height
  // reservation is a guess and can be too small again.
  let boardSlotIsFlexible = board.contains("boardSpace:")
    && board.range(of: "GeometryReader { geo in\n        board(ImMetrics(") != nil
  check("layout.boardTakesLeftover", boardSlotIsFlexible,
        "board must be sized from the space it was actually given")
  check("layout.noGuessedChrome", !board.contains("let verticalChrome"),
        "a reserved chrome estimate is what caused the clipping")

  // Every dimension the metrics derive must stay clamped: a negative frame
  // dimension traps in SwiftUI and kills the extension on launch.
  check("layout.dimensionsClamped",
        board.contains("width.isFinite") && board.contains("boardSpace.isFinite"))
}

// 21. Turn ownership must survive the extension process being reaped.
//
//     Reported as: "after I make a move and send, it prompts me to roll again".
//     iOS reaps the extension shortly after `didStartSending` calls `dismiss()`,
//     which happens on every send, so the next launch built a session from
//     nothing and announced "New game — you are White. Roll to open" — on a turn
//     that belonged to the opponent. It also threw the game away.
//
//     It cannot be recovered from the conversation instead: MSConversation
//     exposes no message history in this SDK, so remembering is the only option.
do {
  func playATurn(_ session: ImGameSession) {
    session.rollDice()
    for _ in 0 ..< 8 {
      guard !session.board.remaining.isEmpty, let seq = session.sequences.first else { break }
      session.tapPoint(seq.from)
      guard session.destinations.contains(seq.to) else { break }
      session.tapPoint(seq.to)
    }
  }

  // Fresh install: nothing remembered, so the opening prompt is correct.
  do {
    let s = makeSession()
    check("persist.freshHasNoSavedState", s.sentLatestTurn == false)
    check("persist.freshIsRollable", s.needsRoll)
  }

  // Mid-turn: relaunching must not lose the game.
  do {
    let store = ImMemorySessionStore()
    let first = ImGameSession(store: store)
    playATurn(first)
    let gameId = first.gameId
    let turn = first.turn
    let board = first.board
    let payload = first.outgoingPayload().url?.absoluteString

    let relaunched = ImGameSession(store: store)
    check("persist.midTurnKeepsGame", relaunched.gameId == gameId, relaunched.gameId)
    check("persist.midTurnKeepsTurn", relaunched.turn == turn, "\(relaunched.turn)")
    check("persist.midTurnKeepsBoard", relaunched.board == board)
    check("persist.midTurnKeepsDice", relaunched.dice != nil)
    check("persist.midTurnStillRollable", relaunched.sentLatestTurn == false)
  }

  // The reported bug: after sending, a relaunch must still know it is not our
  // turn. `needsRoll` already consults `sentLatestTurn`; the whole point is that
  // the flag is still set after the process is reaped.
  do {
    let store = ImMemorySessionStore()
    let sender = ImGameSession(store: store)
    playATurn(sender)
    sender.markSending()
    check("persist.sentWaitsForOpponent", sender.needsRoll == false)
    let gameId = sender.gameId
    let board = sender.board

    let relaunched = ImGameSession(store: store)
    check("persist.sentSurvivesRelaunch", relaunched.sentLatestTurn,
          "a fresh session would prompt to roll on the opponent's turn")
    check("persist.sentBlocksRoll", relaunched.needsRoll == false,
          "Roll must stay disabled — it is the opponent's move")
    check("persist.sentKeepsGame", relaunched.gameId == gameId)
    check("persist.sentKeepsBoard", relaunched.board == board)
    check("persist.sentSaysOpponentsTurn",
          relaunched.status.contains("opponent"), relaunched.status)
    check("persist.sentNoPendingSend", relaunched.pendingSend == false)
    let diceBefore = relaunched.dice.map { "\($0.0)-\($0.1)" }
    relaunched.rollDice()
    check("persist.sentCannotRoll",
          relaunched.dice.map { "\($0.0)-\($0.1)" } == diceBefore,
          "\(String(describing: relaunched.dice))")
    check("persist.sentCannotTapPoint", {
      relaunched.tapPoint(13)
      return relaunched.selectedPoint == nil
    }())
  }

  // A resend after relaunch must rebuild the identical payload — this is the
  // retry path that only becomes reachable now the state outlives the process.
  do {
    let store = ImMemorySessionStore()
    let sender = ImGameSession(store: store)
    playATurn(sender)
    let before = sender.outgoingPayload().url?.absoluteString
    sender.markSending()
    let relaunched = ImGameSession(store: store)
    check("persist.resendAvailable", relaunched.canResend)
    relaunched.retrySend()
    check("persist.resendReopens", relaunched.sentLatestTurn == false)
    let after = relaunched.outgoingPayload().url?.absoluteString
    check("persist.resendSamePayload", after == before, "\(before ?? "∅") vs \(after ?? "∅")")
  }

  // A draft staged in the composer must NOT come back: the bubble is gone, so
  // restoring `pendingSend` would disable Send forever with no cancel callback.
  do {
    let store = ImMemorySessionStore()
    let s = ImGameSession(store: store)
    playATurn(s)
    s.markStaged()
    check("persist.stagedIsPending", s.pendingSend)
    let relaunched = ImGameSession(store: store)
    check("persist.stagedNotRestored", relaunched.pendingSend == false,
          "a dead draft would wedge Send as Staged with no didCancelSending")
    check("persist.stagedTurnRecoverable", relaunched.isTurnSendable,
          "the finished position survives, so the turn can be sent again")
    check("persist.noPendingSendInSavedState", {
      // The field must not exist to be restored, not merely be ignored.
      let encoded = try? JSONEncoder().encode(
        ImGameSession.Saved(payload: "x", sentLatestTurn: false, movedThisTurn: false, status: "")
      )
      guard let json = encoded.flatMap({ try? JSONSerialization.jsonObject(with: $0) as? [String: Any] })
      else { return false }
      return encoded.flatMap { String(data: $0, encoding: .utf8) }?.contains("pendingSend") == false
    }())
  }

  // Starting over must clear everything, including the remembered wait.
  do {
    let store = ImMemorySessionStore()
    let s = ImGameSession(store: store)
    playATurn(s)
    s.markSending()
    s.loadNewGame()
    let relaunched = ImGameSession(store: store)
    check("persist.newGameClearsWait", relaunched.sentLatestTurn == false)
    check("persist.newGameIsFresh", relaunched.isFreshGame && relaunched.needsRoll)
  }

  // Adopting the opponent's reply must clear the wait — otherwise the receiving
  // side inherits "it is your opponent's turn" and can never play.
  do {
    let store = ImMemorySessionStore()
    let sender = ImGameSession(store: store)
    playATurn(sender)
    sender.markSending()
    let relaunched = ImGameSession(store: store)
    check("persist.waitBeforeReply", relaunched.sentLatestTurn)
    let reply = ImTurnPayload.fromBoard(
      ImBoard.initial(), gameId: relaunched.gameId, turn: relaunched.turn,
      dice: (3, 2), summary: "played")
    relaunched.load(payload: reply)
    check("persist.replyClearsWait", relaunched.sentLatestTurn == false)
    check("persist.replyNeedsRoll", relaunched.needsRoll)
    let afterReply = ImGameSession(store: store)
    check("persist.replySurvivesRelaunch", afterReply.needsRoll && afterReply.sentLatestTurn == false)
  }

  // Corrupt state must not brick the extension — fall back to a new game.
  do {
    for bad in ["", "not a url", "https://x/i?v=1&gid=%%%&turn=x"] {
      let store = ImMemorySessionStore(
        ImGameSession.Saved(payload: bad, sentLatestTurn: true, movedThisTurn: false, status: "s")
      )
      let s = ImGameSession(store: store)
      check("persist.corruptFallsBack.\(bad.prefix(6))", s.needsRoll && s.sentLatestTurn == false)
    }
  }

  // The harness must never touch the real defaults.
  let harness = try String(contentsOfFile: "targets/imessage/parity/main.swift", encoding: .utf8)
  check("persist.harnessIsolatesStore",
        harness.contains("ImGameSession.defaultStore = ImMemorySessionStore()"),
        "the suite would write to the developer's UserDefaults")
  let controller = try String(contentsOfFile: "targets/imessage/Sources/MessagesViewController.swift", encoding: .utf8)
  check("persist.oneSessionPerController",
        controller.contains("private let session = ImGameSession()"),
        "the controller relies on the restoring initialiser")

  // There is no per-conversation scoping, deliberately. `MSConversation` has no
  // stable thread identifier in this SDK, and its participant UUIDs are not
  // stable either — `localParticipantIdentifier` is regenerated on every Messages
  // launch on a simulator with no Apple ID signed in, which was measured and made
  // a per-participant key silently lose the saved state. Depending on an
  // identifier we do not control would break the same way on an Apple ID change
  // or a device restore.
  //
  // Remembering one game is safe because adoption corrects it: tapping the
  // opponent's bubble loads their payload, which clears `sentLatestTurn`.
  do {
    let controller = try String(contentsOfFile: "targets/imessage/Sources/MessagesViewController.swift", encoding: .utf8)
    check("scope.noConversationKeying", !controller.contains("scope(for:"),
          "the conversation key is not stable enough to key remembered state on")
    check("scope.storeIsSingleSlot", !controller.contains("session.bind(to:"))
  }

  // A remembered "waiting" state must be corrected by real information.
  do {
    let store = ImMemorySessionStore()
    let s = ImGameSession(store: store)
    playATurn(s)
    s.markSending()
    let relaunched = ImGameSession(store: store)
    check("scope.staleWaitBeforeReply", relaunched.sentLatestTurn)
    let reply = ImTurnPayload.fromBoard(
      ImBoard.initial(), gameId: relaunched.gameId, turn: relaunched.turn,
      dice: (5, 4), summary: "played")
    relaunched.load(payload: reply)
    check("scope.replyCorrectsWait", relaunched.sentLatestTurn == false)
    check("scope.replyIsPlayable", relaunched.needsRoll)
    check("scope.replySurvivesRelaunch",
      ImGameSession(store: store).sentLatestTurn == false)
  }

  // The controller must build its session before reading turn state.
  do {
    let controller = try String(contentsOfFile: "targets/imessage/Sources/MessagesViewController.swift", encoding: .utf8)
    check("scope.sessionBuiltOnce", controller.contains("private let session = ImGameSession()"))
  }

}

if failures > 0 {
  print("\(failures) FAILURE(S)")
  exit(1)
}
print("ALL PARITY CHECKS PASSED")
