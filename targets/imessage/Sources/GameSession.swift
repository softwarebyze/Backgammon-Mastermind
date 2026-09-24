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

  /// Load an incoming message: the local player takes `payload.current`.
  func load(payload: ImTurnPayload) {
    var board = payload.toBoard()
    board.current = payload.current
    self.board = board
    self.gameId = payload.gameId
    self.turn = payload.winner == nil ? payload.turn + 1 : payload.turn
    self.dice = nil
    self.selectedPoint = nil
    self.destinations = []
    self.sentLatestTurn = false
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
