import Combine
import Foundation

// MARK: - Turn session
//
// Owns one side-to-move position inside the Messages extension. There is no
// fixed color per device (unlike GamePigeon-style accounts): whoever opens a
// received message plays `payload.current`, exactly like "Backgammon Match".
//
// Turn numbering: `turn` is the turn the local player is about to play. A
// fresh game starts at turn 1 (creator plays White). Each sent payload stamps
// the turn just completed; loading a payload sets `turn = payload.turn + 1`.

final class ImGameSession: ObservableObject {
  @Published private(set) var board: ImBoard
  @Published private(set) var dice: (Int, Int)?
  @Published private(set) var selectedPoint: Int?
  @Published private(set) var destinations: Set<Int> = []
  @Published private(set) var status: String
  @Published private(set) var sentLatestTurn: Bool = false
  /// The turn has been handed to `conversation.insert` but the user has not yet
  /// tapped send in Messages. Distinct from `sentLatestTurn`: the message is
  /// staged in the composer, not delivered.
  @Published private(set) var pendingSend: Bool = false
  /// Whether any checker actually moved this turn. Distinguishes a genuine
  /// no-move pass from a turn that played a checker and then got blocked.
  private(set) var movedThisTurn: Bool = false

  private(set) var gameId: String
  /// The turn the local player is about to play (1-based).
  private(set) var turn: Int

  init() {
    self.board = ImBoard.initial()
    self.gameId = Self.newGameId()
    self.turn = 1
    self.dice = nil
    self.status = "New game — you are White. Roll to open."
  }

  // MARK: Loading

  /// Whether an inbound bubble may be adopted as the position to play next.
  ///
  /// Two rules, both load-bearing:
  ///
  /// 1. **Never adopt your own message.** `outgoingPayload()` stamps
  ///    `current` as the *opponent* to move, so adopting your own bubble hands
  ///    you your friend's side and lets one person play both sides.
  /// 2. **Never rewind.** Within one game, a payload older than the turn already
  ///    loaded is a stale echo; re-adopting it would discard a roll in progress.
  ///
  /// Sides still alternate by payload rather than by device (no accounts), so
  /// the *only* thing pinning a device to one side is that it never plays its
  /// own turns.
  func shouldAdopt(_ payload: ImTurnPayload, isFromMe: Bool) -> Bool {
    // A staged `MSMessage` still sits in the composer. Adopting a position
    // under it would mean `didStartSending` later marks a turn sent for the
    // *new* game while the bubble carries the old one, locking the new game
    // waiting for a reply that will never come.
    if pendingSend { return false }
    guard !isFromMe else { return false }
    if payload.gameId == gameId, payload.turn < turn { return false }
    return true
  }

  /// Load an incoming message: the local player takes `payload.current`.
  func load(payload: ImTurnPayload) {
    var board = payload.toBoard()
    board.current = payload.current
    self.board = board
    self.gameId = payload.gameId
// The emitted wire turn equals the local turn, so the local turn is clamped to
    // the encodable maximum rather than advancing past it.
    self.turn = payload.winner == nil ? min(payload.turn + 1, imMaxTurn) : payload.turn
    self.dice = nil
    self.selectedPoint = nil
    self.destinations = []
    self.moveHistory = []
    self.isFreshGame = false
    self.sentLatestTurn = false
    // An inbound position supersedes any draft still sitting in the composer;
    // leaving `pendingSend` set would leave Send disabled as "Staged" for a
    // game this session no longer holds.
    self.pendingSend = false
    self.movedThisTurn = false
    if payload.winner != nil {
      self.status = payload.caption
    } else {
      let side = payload.current == .white ? "White" : "Black"
      let recap = payload.summary.isEmpty ? "" : " Opponent \(payload.summary)."
      self.status = "Turn \(self.turn): you are \(side).\(recap) Roll the dice."
    }
  }

  /// Starting over while a turn is staged would leave a bubble in the composer
  /// pointing at a game this session no longer holds, so it is refused.
  /// True only while this session is not yet attached to a game that exists in
  /// the conversation — a fresh session, or one the player just reset. Once a
  /// position has been adopted or a die rolled, starting over abandons a game
  /// the other player can still see, so the UI has to confirm first.
  private(set) var isFreshGame: Bool = true

  func loadNewGame() {
    guard !pendingSend else {
      status = "Send or delete the staged turn before starting a new game."
      return
    }
    let fresh = ImGameSession()
    self.board = fresh.board
    self.gameId = fresh.gameId
    self.turn = fresh.turn
    self.dice = nil
    self.selectedPoint = nil
    self.destinations = []
    self.sentLatestTurn = false
    self.pendingSend = false
    self.movedThisTurn = false
    self.moveHistory = []
    self.isFreshGame = true
    self.status = fresh.status
  }

  // MARK: Derived state

  var isGameOver: Bool { board.winner != nil }

  /// `pendingSend` is load-bearing here, not just a Send-button flag. Once a
  /// turn is staged the bubble already announces the *opponent* is to move, so
  /// letting the local player roll or move again would put two contradictory
  /// claims on screen at once (staged "your move, Black" over a live White turn).
  /// One roll per turn. `dice == nil` is what makes this work: it is set by
  /// `rollDice` and cleared only when a new turn is loaded (`load(payload:)`,
  /// `loadNewGame()`). Without it, spending the last die emptied
  /// `board.remaining` and re-armed Roll *for the same turn*, so a player could
  /// roll and move again and again before ever sending.
  ///
  /// `pendingSend` is load-bearing here too. Once a turn is staged the bubble
  /// already announces the *opponent* is to move, so letting the local player
  /// roll or move again would put two contradictory claims on screen at once
  /// (staged "your move, Black" over a live White turn).
  var needsRoll: Bool {
    board.winner == nil
      && board.remaining.isEmpty
      && dice == nil
      && !sentLatestTurn
      && !pendingSend
  }

  /// True once the turn is finished and can be messaged to the opponent.
  var isTurnSendable: Bool {
    guard !sentLatestTurn, !pendingSend, dice != nil else { return false }
    if board.winner != nil { return true }
    return board.remaining.isEmpty || !imHasAnyLegalMove(board)
  }

  /// Why Send is unavailable, or `nil` when it is ready. Without this the
  /// button is just a dead grey pill and reads as broken rather than pending.
  var sendBlocker: String? {
    // `status` already narrates the staged and sent states — repeating them here
    // printed the same sentence twice under the board.
    if sentLatestTurn || pendingSend { return nil }
    if isGameOver { return nil }
    if dice == nil { return "Roll the dice to start the turn." }
    if !board.remaining.isEmpty {
      let left = board.remaining.count
      return "Play \(left) more \(left == 1 ? "die" : "dice") to finish the turn."
    }
    return nil
  }

  var legalMoves: [ImMove] { imLegalMoves(board) }

  /// Pre-move state for the current turn so a checker can be taken back before
  /// the turn is sent. Mirrors the app's undo, which steps back one move and
  /// never un-rolls — undoing the roll would be a dice cheat.
  private struct ImMoveSnapshot {
    var board: ImBoard
    var status: String
    var movedThisTurn: Bool
  }

  private var moveHistory: [ImMoveSnapshot] = []

  var canUndo: Bool {
    !moveHistory.isEmpty && !sentLatestTurn && !pendingSend
  }

  func undo() {
    guard canUndo, let snapshot = moveHistory.popLast() else { return }
    board = snapshot.board
    // Clear the selection rather than restoring it. The snapshot was taken
    // mid-selection, so restoring it would leave the previously tapped checker
    // "selected" — and the player's next tap would deselect it instead of
    // picking a checker up. After an undo the dice are back and nothing is held.
    selectedPoint = nil
    destinations = []
    status = snapshot.status
    movedThisTurn = snapshot.movedThisTurn
  }

  /// Compound moves available this turn: one checker played with two or more
  /// dice in a single tap.
  var sequences: [ImSequence] { imSequences(board) }

  /// Whether the player may pick this point up — drives the move-hint ring.
  func isMovable(_ point: Int) -> Bool {
    sequences.contains { $0.from == point }
  }

  // MARK: Actions

  func rollDice() {
    guard needsRoll else { return }
    isFreshGame = false
    let roll = imRollDice()
    dice = roll
    movedThisTurn = false
    board.remaining = imRemainingDice(for: roll)
    selectedPoint = nil
    destinations = []
    if !imHasAnyLegalMove(board) {
      status = "Rolled \(roll.0)–\(roll.1): no legal moves — send to pass."
    } else {
      status = "Rolled \(roll.0)–\(roll.1): tap a highlighted checker."
    }
  }

  func tapPoint(_ point: Int) {
    // Locked while a turn is staged or sent — see `needsRoll`.
    guard !sentLatestTurn, !pendingSend, board.winner == nil, !board.remaining.isEmpty else { return }
    // Tapped a highlighted destination → move. A destination may be reachable by
    // a compound sequence (one checker, both dice) or by a single die.
    if destinations.contains(point), let from = selectedPoint {
      if let sequence = sequences.first(where: { $0.from == from && $0.to == point }) {
        applySequence(sequence)
      } else if let move = legalMoves.first(where: { $0.from == from && $0.to == point }) {
        applyMove(from: from, to: point, move: move)
      }
      return
    }
    // (Re)select one of our checkers — or the bar.
    guard isOwnSelectable(point) else {
      selectedPoint = nil
      destinations = []
      return
    }
    if selectedPoint == point {
      selectedPoint = nil
      destinations = []
      return
    }
    selectedPoint = point
    // Destinations come from compound sequences too, so one tap can play both
    // dice when the rules allow it.
    destinations = Set(sequences.filter { $0.from == point }.map(\.to))
    if destinations.isEmpty { status = "That checker has no legal move with these dice." }
  }

  private func isOwnSelectable(_ point: Int) -> Bool {
    if point == imBarPoint { return (board.bar[board.current] ?? 0) > 0 }
    guard (1 ... 24).contains(point) else { return false }
    return board.points[point].owner == board.current
  }

  private func applyMove(from: Int, to: Int, move: ImMove? = nil) {
    guard let move = move ?? legalMoves.first(where: { $0.from == from && $0.to == to })
    else { return }
    finish(board: imApplyMove(board, move: move).board)
  }

  /// Play a compound move: each step is a real single-die move applied in
  /// order, so dice are consumed exactly as the rules require.
  private func applySequence(_ sequence: ImSequence) {
    var next = board
    // Track where the checker actually is: `sequence.to` is the final square,
    // not the intermediate one, so a chain of three must not look for the
    // second step at the end point.
    var current = sequence.from
    for die in sequence.dies {
      // Resolve the die against the *current* remainder — it has shrunk since
      // the sequence was computed.
      guard let index = next.remaining.firstIndex(of: die),
            let step = imRawSingleStepMoves(next).first(where: {
              $0.dieIndex == index && $0.from == current
            })
      else { return }
      current = step.to
      next = imApplyPhysical(next, move: step)
    }
    finish(board: next)
  }

  /// Shared post-move bookkeeping: advance state and narrate the result.
  private func finish(board next: ImBoard) {
    moveHistory.append(ImMoveSnapshot(
      board: board, status: status, movedThisTurn: movedThisTurn))
    board = next
    isFreshGame = false
    movedThisTurn = true
    selectedPoint = nil
    destinations = []
    if let winner = next.winner {
      status = "\(winner == .white ? "White" : "Black") wins! Send the final result."
    } else if next.remaining.isEmpty {
      status = "Turn complete — send it to your opponent."
    } else if !imHasAnyLegalMove(next) {
      status = "No more moves — send to pass the turn."
    } else {
      let left = next.remaining.count
      status = "Nice — \(left) \(left == 1 ? "die" : "dice") left."
    }
  }

  /// Build the outgoing payload: dice are consumed and the turn passes to the
  /// opponent. Stamps the turn just completed (`self.turn`).
  func outgoingPayload() -> ImTurnPayload {
    var next = board
    if board.winner == nil {
      next.remaining = []
      next.current = board.current.opponent
    }
    return ImTurnPayload.fromBoard(
      next,
      gameId: gameId,
      turn: turn,
      dice: dice,
      summary: defaultSummary()
    )
  }

  private func defaultSummary() -> String {
    if board.winner != nil { return "bore off the last checker" }
    guard let dice else { return "moved" }
    // A non-empty remainder means the turn ended with dice unusable — but that
    // is only a *pass* if nothing was played at all. Without this, a turn that
    // moved a checker and then got blocked was reported as "no move".
    if movedThisTurn { return "played \(dice.0)–\(dice.1)" }
    if board.remaining.isEmpty { return "played \(dice.0)–\(dice.1)" }
    return "rolled \(dice.0)–\(dice.1) with no move"
  }

  func markSent() {
    moveHistory = []
    pendingSend = false
    sentLatestTurn = true
    status = "Sent! Wait for your opponent's reply."
  }

  /// The turn was handed to `conversation.insert`; it is sitting in the
  /// composer until the user taps send.
  func markStaged() {
    pendingSend = true
    status = "Turn staged — tap the blue send arrow in Messages to deliver it."
  }

  /// `conversation.insert` rejected the message. Undo the staged state so the
  /// button comes back and the turn is not silently lost.
  func failToStage(_ reason: String) {
    pendingSend = false
    sentLatestTurn = false
    status = reason
  }

  // MARK: Game id

  static func newGameId(length: Int = 12) -> String {
    let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
    return String((0 ..< length).compactMap { _ in alphabet.randomElement() })
  }
}
