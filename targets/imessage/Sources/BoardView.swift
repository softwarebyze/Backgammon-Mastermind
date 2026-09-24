import SwiftUI

// MARK: - Compact presentation (message drawer peek)

struct ImCompactView: View {
  var summary: String
  var onPlay: () -> Void

  var body: some View {
    VStack(spacing: 10) {
      Text("Backgammon Mastermind")
        .font(.headline)
      Text(summary)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("Play your turn", action: onPlay)
        .buttonStyle(.borderedProminent)
    }
    .padding()
  }
}

// MARK: - Expanded board

struct ImBoardView: View {
  @ObservedObject var session: ImGameSession
  var onSend: () -> Void
  var onNewGame: () -> Void

  var body: some View {
    VStack(spacing: 8) {
      header
      diceRow
      barRow(for: opponentOf(session.board.current))
      pointRow(points: Array(13 ... 24))
      pointRow(points: Array(stride(from: 12, through: 1, by: -1)))
      barRow(for: session.board.current)
      statusLine
      actionRow
    }
    .padding(12)
  }

  private func opponentOf(_ player: ImPlayer) -> ImPlayer { player.opponent }

  // MARK: Header

  private var header: some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text("Turn \(session.turn)")
          .font(.headline)
        Text("You play \(session.board.current == .white ? "White" : "Black")")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      Spacer()
      VStack(alignment: .trailing, spacing: 2) {
        Text("Off W:\(session.board.off[.white] ?? 0) B:\(session.board.off[.black] ?? 0)")
          .font(.caption)
        Text("Bar W:\(session.board.bar[.white] ?? 0) B:\(session.board.bar[.black] ?? 0)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  // MARK: Dice

  private var diceRow: some View {
    HStack(spacing: 10) {
      if let dice = session.dice {
        Text("⚀⚁⚂⚃⚄⚅".map { String($0) }[dice.0 - 1] + " \(dice.0)")
        Text("⚀⚁⚂⚃⚄⚅".map { String($0) }[dice.1 - 1] + " \(dice.1)")
        Text("left: \(session.board.remaining.map(String.init).joined(separator: ","))")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else {
        Text("Dice not rolled")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      Spacer()
      Button("Roll") { session.rollDice() }
        .buttonStyle(.borderedProminent)
        .disabled(!session.needsRoll)
    }
    .font(.title2)
  }

  // MARK: Bar

  private func barRow(for player: ImPlayer) -> some View {
    let count = session.board.bar[player] ?? 0
    return Button {
      session.tapPoint(imBarPoint)
    } label: {
      HStack {
        Text(player == .white ? "White bar" : "Black bar")
          .font(.caption)
        Text("\(count)")
          .font(.headline)
          .frame(width: 30, height: 30)
          .background(count > 0 ? player.color : Color.gray.opacity(0.25))
          .clipShape(Circle())
        if session.selectedPoint == imBarPoint {
          Text("selected").font(.caption).foregroundStyle(.blue)
        }
      }
    }
    .buttonStyle(.plain)
    .opacity(count > 0 ? 1 : 0.45)
  }

  // MARK: Points

  private func pointRow(points: [Int]) -> some View {
    HStack(spacing: 3) {
      ForEach(Array(points.prefix(6)), id: \.self) { point in
        ImPointCell(
          point: point,
          slot: session.board.points[point],
          isSelected: session.selectedPoint == point,
          isDestination: session.destinations.contains(point),
          canSelect: session.board.points[point].owner == session.board.current
        ) { session.tapPoint(point) }
      }
      Divider().frame(height: 44)
      ForEach(Array(points.suffix(6)), id: \.self) { point in
        ImPointCell(
          point: point,
          slot: session.board.points[point],
          isSelected: session.selectedPoint == point,
          isDestination: session.destinations.contains(point),
          canSelect: session.board.points[point].owner == session.board.current
        ) { session.tapPoint(point) }
      }
    }
  }

  // MARK: Status + actions

  private var statusLine: some View {
    Text(session.status)
      .font(.footnote)
      .foregroundStyle(.secondary)
      .multilineTextAlignment(.center)
      .frame(minHeight: 32)
  }

  private var actionRow: some View {
    HStack {
      Button("New game") { onNewGame() }
        .buttonStyle(.bordered)
      Spacer()
      Button(session.isGameOver ? "Send result" : "Send turn") { onSend() }
        .buttonStyle(.borderedProminent)
        .disabled(!session.isTurnSendable)
    }
  }
}

// MARK: - Point cell

private struct ImPointCell: View {
  var point: Int
  var slot: ImPoint
  var isSelected: Bool
  var isDestination: Bool
  var canSelect: Bool
  var onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(spacing: 1) {
        ZStack {
          RoundedRectangle(cornerRadius: 5)
            .fill(background)
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 44)
            .overlay(
              RoundedRectangle(cornerRadius: 5)
                .stroke(border, lineWidth: isSelected || isDestination ? 3 : 1)
            )
          if slot.count > 0 {
            Text("\(slot.count)")
              .font(.headline)
              .foregroundStyle(slot.owner == .white ? .black : .white)
          } else if isDestination {
            Circle().fill(Color.green).frame(width: 10, height: 10)
          }
        }
        Text("\(point)")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .buttonStyle(.plain)
    .disabled(!canSelect && !isDestination && slot.owner != nil)
  }

  private var background: Color {
    if let owner = slot.owner { return owner.color }
    return Color.gray.opacity(0.18)
  }

  private var border: Color {
    if isSelected { return .blue }
    if isDestination { return .green }
    return .gray.opacity(0.5)
  }
}

private extension ImPlayer {
  var color: Color {
    self == .white ? .white : .black
  }
}
