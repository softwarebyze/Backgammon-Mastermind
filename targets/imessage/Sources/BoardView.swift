import SwiftUI

// MARK: - Theme
//
// Ported 1:1 from src/features/game/components/board/board-theme.ts so the
// Messages extension reads as the same product as the app. Keep the two in sync.

private enum ImTheme {
  struct PointPalette {
    let fill: Color
    let stroke: Color
  }

  struct Checker {
    let highlight: Color
    let mid: Color
    let shadow: Color
    let rim: Color
  }

  static let frameOuter = Color(hex: "#120603")
  static let frameRim = Color(hex: "#2A0E03")
  static let frameBevel = Color(hex: "#6B3A22")
  static let woodBase = Color(hex: "#3D1A0A")

  static let barSurface = Color(hex: "#2A1006")
  static let barGroove = Color(hex: "#1A0804")
  static let barHinge = Color(hex: "#9A8870")
  static let barHingeShadow = Color(hex: "#4A3828")

  static let bearOffSurface = Color(hex: "#1E0C04")
  static let bearOffBorder = Color(hex: "#5A3A1A")

  static let pointDark = PointPalette(fill: Color(hex: "#7A1818"), stroke: Color(hex: "#5C1010"))
  static let pointLight = PointPalette(fill: Color(hex: "#B89438"), stroke: Color(hex: "#8A7028"))
  static let pointSelected = PointPalette(fill: Color(hex: "#C8A800"), stroke: Color(hex: "#9A8200"))
  static let pointLegal = PointPalette(fill: Color(hex: "#3D7A42"), stroke: Color(hex: "#2A5E2E"))

  static let checkerWhite = Checker(
    highlight: Color(hex: "#FFFAF0"),
    mid: Color(hex: "#F2EAD3"),
    shadow: Color(hex: "#BBA070"),
    rim: Color(hex: "#8A7048")
  )
  static let checkerBlack = Checker(
    highlight: Color(hex: "#4A4A68"),
    mid: Color(hex: "#1E1E30"),
    shadow: Color(hex: "#0A0A14"),
    rim: Color(hex: "#5050A0")
  )

  /// Mirrors `getPointPalette(pointIndex, state)` — even columns are dark.
  static func palette(column: Int, isSelected: Bool, isLegal: Bool) -> PointPalette {
    if isSelected { return pointSelected }
    if isLegal { return pointLegal }
    return column % 2 == 0 ? pointDark : pointLight
  }

  static func checker(for owner: ImPlayer) -> Checker {
    owner == .white ? checkerWhite : checkerBlack
  }
}

extension Color {
  init(hex: String) {
    var s = hex
    if s.hasPrefix("#") { s.removeFirst() }
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    let r, g, b, a: Double
    if s.count == 8 {
      r = Double((v >> 24) & 0xFF) / 255
      g = Double((v >> 16) & 0xFF) / 255
      b = Double((v >> 8) & 0xFF) / 255
      a = Double(v & 0xFF) / 255
    } else {
      r = Double((v >> 16) & 0xFF) / 255
      g = Double((v >> 8) & 0xFF) / 255
      b = Double(v & 0xFF) / 255
      a = 1
    }
    self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
  }
}

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
      pointRow(points: Array(13 ... 24), isTop: true)
      pointRow(points: Array(stride(from: 12, through: 1, by: -1)), isTop: false)
      barRow(for: session.board.current)
      bearOffControl
      statusLine
      actionRow
    }
    .padding(12)
    .background(ImTheme.woodBase)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(
      RoundedRectangle(cornerRadius: 14)
        .stroke(ImTheme.frameBevel, lineWidth: 2)
    )
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
    .foregroundStyle(.white)
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
    .foregroundStyle(.white)
  }

  // MARK: Bar

  private func barRow(for player: ImPlayer) -> some View {
    let count = session.board.bar[player] ?? 0
    return Button {
      session.tapPoint(imBarPoint)
    } label: {
      HStack(spacing: 6) {
        Text(player == .white ? "White" : "Black")
          .font(.system(size: 9))
          .frame(width: 32, alignment: .leading)
        ZStack {
          RoundedRectangle(cornerRadius: 4)
            .fill(ImTheme.barSurface)
          RoundedRectangle(cornerRadius: 3)
            .stroke(ImTheme.barHingeShadow, lineWidth: 1)
          Circle()
            .fill(count > 0 ? ImTheme.checker(for: player).mid : ImTheme.barGroove)
            .frame(width: 24, height: 24)
          if session.selectedPoint == imBarPoint {
            RoundedRectangle(cornerRadius: 3)
              .stroke(ImTheme.pointSelected.fill, lineWidth: 2)
          }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 28)
      }
    }
    .buttonStyle(.plain)
    .foregroundStyle(.white)
    .opacity(count > 0 ? 1 : 0.45)
  }

  // MARK: Points

  private func pointRow(points: [Int], isTop: Bool) -> some View {
    HStack(spacing: 2) {
      ForEach(Array(points.enumerated()), id: \.element) { column, point in
        ImPointCell(
          point: point,
          column: column,
          isTop: isTop,
          slot: session.board.points[point],
          isSelected: session.selectedPoint == point,
          isDestination: session.destinations.contains(point),
          canSelect: session.board.points[point].owner == session.board.current
        ) { session.tapPoint(point) }
      }
      Rectangle()
        .fill(ImTheme.barGroove)
        .frame(width: 6, height: 52)
    }
  }

  // MARK: Bear off

  /// Bearing off is the one legal destination that is not a numbered point, so
  /// it needs its own control — `pointRow` only renders 1...24 and without this
  /// the last checker of a game can never be lifted.
  @ViewBuilder
  private var bearOffControl: some View {
    if session.destinations.contains(imBearOff) {
      Button {
        session.tapPoint(imBearOff)
      } label: {
        Label("Bear off", systemImage: "arrow.up.right.circle.fill")
          .font(.subheadline)
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(ImTheme.pointLegal.fill)
    }
  }

  // MARK: Status + actions

  private var statusLine: some View {
    Text(session.status)
      .font(.footnote)
      .foregroundStyle(.white.opacity(0.85))
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
  var column: Int
  var isTop: Bool
  var slot: ImPoint
  var isSelected: Bool
  var isDestination: Bool
  var canSelect: Bool
  var onTap: () -> Void

  private let triangleHeight: CGFloat = 46
  private let checkerSize: CGFloat = 15

var body: some View {
    Button(action: onTap) {
      VStack(spacing: 2) {
        if isTop {
          numberLabel
          triangleWithCheckers
        } else {
          triangleWithCheckers
          numberLabel
        }
      }
      .frame(width: 22)
    }
    .buttonStyle(.plain)
    .disabled(!canSelect && !isDestination && slot.owner != nil)
  }

  private var numberLabel: some View {
    Text("\(point)")
      .font(.system(size: 8))
      .foregroundStyle(ImTheme.frameBevel)
  }

  private var triangleWithCheckers: some View {
    ZStack(alignment: isTop ? .top : .bottom) {
      ImTriangle()
        .fill(palette.fill)
        .overlay(
          ImTriangle()
            .stroke(palette.stroke, lineWidth: 0.75)
        )
        .frame(height: triangleHeight)

      // Checker stack, drawn outward from the point. Offsets are explicit per
      // row so the discs stack toward the bar without rotating them (a
      // rotation would also flip each disc's radial highlight).
      ZStack {
        ForEach(0 ..< max(slot.count, 0), id: \.self) { index in
          ImCheckerDisc(
            palette: ImTheme.checker(for: slot.owner ?? .white),
            size: checkerSize
          )
          .offset(y: isTop ? CGFloat(index) * (checkerSize - 3) : -CGFloat(index) * (checkerSize - 3))
        }
      }
      .padding(.horizontal, 1)

      if slot.count > 1 {
        Text("\(slot.count)")
          .font(.system(size: 9, weight: .bold))
          .foregroundStyle(slot.owner == .white ? Color(hex: "#3A2A10") : Color(hex: "#E0E0FF"))
          .frame(width: checkerSize * 0.62, height: checkerSize * 0.62)
          .background(
            Circle().fill(
              slot.owner == .white
                ? Color(hex: "#F5F0E8").opacity(0.72)
                : Color(hex: "#282837").opacity(0.7)
            )
          )
      } else if isDestination {
        Circle()
          .fill(ImTheme.pointLegal.fill)
          .frame(width: 7, height: 7)
      }
    }
    .frame(width: 22, height: triangleHeight)
  }

  private var palette: ImTheme.PointPalette {
    ImTheme.palette(column: column, isSelected: isSelected, isLegal: isDestination)
  }
}

// MARK: - Shapes

/// Flat point triangle, matching PointTriangle's geometry (no heavy gradient —
/// it previously clashed with the cream checkers).
private struct ImTriangle: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    path.move(to: CGPoint(x: rect.minX, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
    path.closeSubpath()
    return path
  }
}

/// Disc with the app's radial highlight, so checkers read as domed rather flat.
private struct ImCheckerDisc: View {
  var palette: ImTheme.Checker
  var size: CGFloat

  var body: some View {
    Circle()
      .fill(
        RadialGradient(
          colors: [palette.highlight, palette.mid, palette.shadow],
          center: UnitPoint(x: 0.35, y: 0.3),
          startRadius: 0,
          endRadius: size * 0.62
        )
      )
      .overlay(Circle().stroke(palette.rim, lineWidth: 0.75))
      .frame(width: size, height: size)
      .shadow(color: .black.opacity(0.45), radius: 1.5, y: 1)
  }
}