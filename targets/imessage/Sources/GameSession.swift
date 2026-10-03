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
    self.sentLatestTurn = false
    self.movedThisTurn = false
    if payload.winner != nil {
      self.status = payload.caption
    } else {
      let side = payload.current == .white ? "White" : "Black"
      let recap = payload.summary.isEmpty ? "" : " Opponent \(payload.summary)."
      self.status = "Turn \(self.turn): you are \(side).\(recap) Roll the dice."
    }
  }

  func loadNewGame() {
    let fresh = ImGameSession()
    self.board = fresh.board
    self.gameId = fresh.gameId
    self.turn = fresh.turn
    self.dice = nil
    self.selectedPoint = nil
    self.destinations = []
    self.sentLatestTurn = false
    self.movedThisTurn = false
    self.status = fresh.status
  }

  // MARK: Derived state

  var isGameOver: Bool { board.winner != nil }

  var needsRoll: Bool {
    board.winner == nil && board.remaining.isEmpty && !sentLatestTurn
  }

  /// True once the turn is finished and can be messaged to the opponent.
  var isTurnSendable: Bool {
    guard !sentLatestTurn, dice != nil else { return false }
    if board.winner != nil { return true }
    return board.remaining.isEmpty || !imHasAnyLegalMove(board)
  }

  var legalMoves: [ImMove] { imLegalMoves(board) }

  // MARK: Actions

  func rollDice() {
    guard needsRoll else { return }
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
    guard !sentLatestTurn, board.winner == nil, !board.remaining.isEmpty else { return }
    // Tapped a highlighted destination → move.
    if destinations.contains(point), let from = selectedPoint {
      applyMove(from: from, to: point)
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
    destinations = Set(legalMoves.filter { $0.from == point }.map { $0.to })
    if destinations.isEmpty { status = "That checker has no legal move with these dice." }
  }

  private func isOwnSelectable(_ point: Int) -> Bool {
    if point == imBarPoint { return (board.bar[board.current] ?? 0) > 0 }
    guard (1 ... 24).contains(point) else { return false }
    return board.points[point].owner == board.current
  }

  private func applyMove(from: Int, to: Int) {
    guard let move = legalMoves.first(where: { $0.from == from && $0.to == to }) else { return }
    let (next, result) = imApplyMove(board, move: move)
    board = next
    movedThisTurn = true
    selectedPoint = nil
    destinations = []
    switch result {
    case .movesAvailable:
      status = "Nice — \(board.remaining.count) \(board.remaining.count == 1 ? "die" : "dice") left."
    case .noMoves:
      status = "No more moves — send to pass the turn."
    case .turnComplete:
      status = "Turn complete — send it to your opponent."
    case .gameOver(let winner):
      status = "\(winner == .white ? "White" : "Black") wins! Send the final result."
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
    sentLatestTurn = true
    status = "Sent! Wait for your opponent's reply."
  }

  // MARK: Game id

  static func newGameId(length: Int = 12) -> String {
    let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
    return String((0 ..< length).compactMap { _ in alphabet.randomElement() })
  }
}
