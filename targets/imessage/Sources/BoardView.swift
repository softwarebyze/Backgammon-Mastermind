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

  static let legalDotFill = Color(hex: "#4CAF50").opacity(0.35)
  static let legalDotStroke = Color(hex: "#4CAF50").opacity(0.7)
  static let barSelected = Color(hex: "#FFD700")
  static let bearOffLabel = Color(hex: "#B89470")
  static let bearOffOverflow = Color(hex: "#D4A843")
  static let numberLabel = Color(hex: "#FFDCB1").opacity(0.9)

  /// Mirrors `getPointPalette(pointIndex, state)` — even columns are dark.
  /// Note this is keyed on the *point index*, not the column position, exactly
  /// like the app, so the light/dark split matches after the board is mirrored.
  static func palette(point: Int, isSelected: Bool, isLegal: Bool) -> PointPalette {
    if isSelected { return pointSelected }
    if isLegal { return pointLegal }
    return point % 2 == 0 ? pointDark : pointLight
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

// MARK: - Metrics
//
// The board is measured, not hard-coded: the Messages sheet gives the expanded
// view a tall canvas and the compact drawer a short one, and a fixed point
// height looked squeezed in one and lost in the other. Proportions mirror the
// app (src/features/game/hooks/use-board-dimensions.ts).

private struct ImMetrics {
  var boardWidth: CGFloat
  var boardHeight: CGFloat
  var colWidth: CGFloat
  var checkerSize: CGFloat
  var pointHeight: CGFloat
  var barWidth: CGFloat
  var bearOffWidth: CGFloat
  var middleHeight: CGFloat

  /// Fit 12 columns + bar + bear-off across `available`, then give the points as
  /// much length as the leftover height allows (capped like the app's 5.2...7
  /// checker-diameter range so five checkers always fit without overlapping).
  init(available: CGSize, compact: Bool) {
    // Must match the view's own padding so the board never runs under the
    // sheet's rounded corners.
    let clearance = ImBoardView.cornerClearance + (compact ? 0 : 4)
    let frame: CGFloat = compact ? 3 : 4

    // GeometryReader reports a zero (and briefly nonsensical) size on its first
    // pass. Every dimension below is clamped to a positive minimum: a negative
    // width reaches `.frame(width:)` and SwiftUI traps at runtime with
    // "Invalid frame dimension (negative or non-finite)", which took down the
    // whole extension.
    let safeWidth = available.width.isFinite ? max(available.width, 200) : 320
    let safeHeight = available.height.isFinite ? max(available.height, 240) : 480

    let maxWidth = max(180, min(safeWidth - clearance * 2, 560))
    let scale = min(1, maxWidth / 320)
    let barWidth = max(14, min(28 * scale, maxWidth * 0.12))
    let bearOffWidth = max(20, min(38 * scale, maxWidth * 0.16))

    let surfaceWidth = max(120, maxWidth - frame * 2)
    let colWidth = max(10, (surfaceWidth - barWidth - bearOffWidth) / 12)
    let checkerSize = max(9, min(colWidth - 4, 30))

    // Chrome above and below the board (header, dice, status, actions). Leave
    // it room so the frame is never clipped in the short compact drawer.
    // Padding is inside this budget too, so the content cannot overflow the
    // explicit compact height and get clipped off the top.
    let verticalChrome: CGFloat = compact ? 152 : 168
    let middleHeight: CGFloat = compact ? 8 : 12
    let availableBoardHeight = max(80, safeHeight - verticalChrome - frame * 2)
    let maxPoint = checkerSize * (compact ? 4.4 : 7)
    let minPoint = checkerSize * 3.2
    let pointHeight = max(minPoint, min(maxPoint, (availableBoardHeight - middleHeight) / 2))

    // Derive the board width from its parts so the row of halves + bar +
    // bear-off exactly fills it and can never disagree with the columns.
    self.boardWidth = colWidth * 12 + barWidth + bearOffWidth
    self.boardHeight = pointHeight * 2 + middleHeight
    self.colWidth = colWidth
    self.checkerSize = checkerSize
    self.pointHeight = pointHeight
    self.barWidth = barWidth
    self.bearOffWidth = bearOffWidth
    self.middleHeight = middleHeight
  }

  static let fallback = ImMetrics(available: CGSize(width: 320, height: 520), compact: false)
}

// MARK: - Board

struct ImBoardView: View {
  @ObservedObject var session: ImGameSession
  var onSend: () -> Void
  var onNewGame: () -> Void
  /// Compact keeps the chrome tight so the board still fits the short drawer.
  var isCompact: Bool = false

  /// The compact drawer sizes the sheet from the root view's *fitting* size. A
  /// `GeometryReader` root has no ideal height, so Messages collapses the sheet
  /// to nothing and dismisses it. Giving compact an explicit height gives the
  /// reader something to measure and yields a playable drawer.
  static let compactSheetHeight: CGFloat = 360

  /// The sheet's own corner radius. Content has to clear it or the corners clip
  /// the text sitting in them ("Roll to open" sits top-left, Roll top-right).
  static let cornerClearance: CGFloat = 14

  var body: some View {
    Group {
      if isCompact {
        measured.frame(height: Self.compactSheetHeight)
      } else {
        measured
      }
    }
    // Anything the content does not cover is flat Messages grey, which read as a
    // dead band under the board. Paint the whole sheet instead.
    .background(ImTheme.frameOuter.ignoresSafeArea())
  }

  private var measured: some View {
    GeometryReader { geo in
      content(ImMetrics(available: geo.size, compact: isCompact))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
  }

  @ViewBuilder
  private func content(_ m: ImMetrics) -> some View {
    VStack(spacing: isCompact ? 4 : 8) {
      if !isCompact { header }
      diceRow(m)
      board(m)
      if isCompact { compactBoardActions }
      statusLine
      sendHint
      actionRow
    }
    // Pad clear of the sheet's corner radius, otherwise the corner arcs clip the
    // text nearest them.
    .padding(isCompact ? Self.cornerClearance : Self.cornerClearance + 4)
    .frame(maxWidth: .infinity, alignment: .top)
  }

  private func opponentOf(_ player: ImPlayer) -> ImPlayer { player.opponent }

  // MARK: Header

  private var header: some View {
    HStack {
      VStack(alignment: .leading, spacing: 1) {
        Text("Turn \(session.turn)")
          .font(.headline)
        Text("You play \(session.board.current == .white ? "White" : "Black")")
          .font(.caption)
          .foregroundStyle(ImTheme.bearOffLabel)
      }
      Spacer()
      VStack(alignment: .trailing, spacing: 1) {
        dicePips
        Text(statusCounts)
          .font(.caption2)
          .foregroundStyle(ImTheme.bearOffLabel)
      }
    }
    .foregroundStyle(.white)
  }

  private var dicePips: some View {
    HStack(spacing: 6) {
      if let dice = session.dice {
        ImDicePips(value: dice.0)
        ImDicePips(value: dice.1)
      } else {
        Text("—")
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundStyle(ImTheme.bearOffLabel)
      }
    }
  }

  private var statusCounts: String {
    "Off \(session.board.off[.white] ?? 0)/\(session.board.off[.black] ?? 0)"
      + " · Bar \(session.board.bar[.white] ?? 0)/\(session.board.bar[.black] ?? 0)"
  }

  // MARK: Dice / roll

  private func diceRow(_ m: ImMetrics) -> some View {
    HStack(spacing: 10) {
      if let dice = session.dice {
        HStack(spacing: 6) {
          ImDicePips(value: dice.0)
          ImDicePips(value: dice.1)
          if !session.board.remaining.isEmpty {
            Text("left: \(session.board.remaining.map(String.init).joined(separator: ","))")
              .font(.caption2)
              .foregroundStyle(ImTheme.bearOffLabel)
          }
        }
      } else {
        Text("Roll to open")
          .font(.caption)
          .foregroundStyle(ImTheme.bearOffLabel)
      }
      Spacer()
      Button(session.needsRoll ? "Roll" : "Re-roll") { session.rollDice() }
        .font(.footnote.weight(.semibold))
        .buttonStyle(.borderedProminent)
        .controlSize(.small)
        .disabled(!session.needsRoll)
    }
  }

  // MARK: Board surface

  private func board(_ m: ImMetrics) -> some View {
    VStack(spacing: 3) {
      numberRail(m, side: .top)
      ZStack {
        ImTheme.woodBase
        HStack(spacing: 0) {
          sideSection(m, top: Array(13 ... 18), bottom: Array(stride(from: 12, through: 7, by: -1)))
          bar(m)
          sideSection(m, top: Array(19 ... 24), bottom: Array(stride(from: 6, through: 1, by: -1)))
          bearOff(m)
        }
      }
      .frame(width: m.boardWidth, height: m.boardHeight)
      .clipShape(RoundedRectangle(cornerRadius: 5))
      .overlay(
        RoundedRectangle(cornerRadius: 5)
          .stroke(ImTheme.frameRim, lineWidth: 1)
      )
      .overlay(
        RoundedRectangle(cornerRadius: 5)
          .strokeBorder(ImTheme.frameBevel.opacity(0.5), lineWidth: 1)
          .padding(1)
      )
      numberRail(m, side: .bottom)
    }
    .frame(maxWidth: .infinity)
  }

  /// The board is split into two six-point halves by the bar, exactly like the
  /// app: each half has its own thin middle groove, and the bar + bear-off tray
  /// sit between the halves. Six columns per side (not thirteen across) is what
  /// stops the points reading as a compressed stripe.
  private func sideSection(_ m: ImMetrics, top: [Int], bottom: [Int]) -> some View {
    VStack(spacing: 0) {
      HStack(spacing: 0) {
        ForEach(top, id: \.self) { point in cell(point, isTop: true, m) }
      }
      .frame(height: m.pointHeight)
      Rectangle()
        .fill(ImTheme.barGroove)
        .frame(height: m.middleHeight)
      HStack(spacing: 0) {
        ForEach(bottom, id: \.self) { point in cell(point, isTop: false, m) }
      }
      .frame(height: m.pointHeight)
    }
    .frame(width: m.colWidth * 6)
  }

  private func cell(_ point: Int, isTop: Bool, _ m: ImMetrics) -> some View {
    ImPointCell(
      point: point,
      isTop: isTop,
      slot: session.board.points[point],
      isSelected: session.selectedPoint == point,
      isLegal: session.destinations.contains(point),
      canSelect: session.board.points[point].owner == session.board.current,
      metrics: m
    ) { session.tapPoint(point) }
    .frame(width: m.colWidth, height: m.pointHeight)
  }

  // MARK: Bar

  private func bar(_ m: ImMetrics) -> some View {
    let whiteCount = session.board.bar[.white] ?? 0
    let blackCount = session.board.bar[.black] ?? 0
    let isSelected = session.selectedPoint == imBarPoint
    let halfHeight = (m.boardHeight - m.middleHeight) / 2

    return Button {
      session.tapPoint(imBarPoint)
    } label: {
      VStack(spacing: 0) {
        barStack(blackCount, .black, halfHeight, m, align: .top)
        Rectangle()
          .fill(ImTheme.barGroove)
          .overlay(
            Rectangle()
              .fill(
                LinearGradient(
                  colors: [
                    ImTheme.barHingeShadow,
                    ImTheme.barHinge,
                    ImTheme.barHinge,
                    ImTheme.barHingeShadow
                  ],
                  startPoint: .top,
                  endPoint: .bottom
                )
              )
              .padding(.horizontal, max(2, m.barWidth * 0.15))
              .padding(.vertical, 1)
          )
          .frame(height: m.middleHeight)
        barStack(whiteCount, .white, halfHeight, m, align: .bottom)
      }
      .frame(width: m.barWidth, height: m.boardHeight)
      .background(ImTheme.barSurface)
      .overlay(
        Group {
          if isSelected {
            Rectangle().stroke(ImTheme.barSelected, lineWidth: 2)
          } else {
            Rectangle().stroke(Color.black.opacity(0.45), lineWidth: 1)
          }
        }
      )
    }
    .buttonStyle(.plain)
    .opacity(whiteCount + blackCount > 0 ? 1 : 0.85)
  }

  private func barStack(
    _ count: Int,
    _ player: ImPlayer,
    _ halfHeight: CGFloat,
    _ m: ImMetrics,
    align: Alignment
  ) -> some View {
    let size = m.checkerSize * 0.88
    let visible = min(count, 4)
    return VStack(spacing: 2) {
      if align == .top {
        ForEach(0 ..< visible, id: \.self) { index in
          ImCheckerDisc(palette: ImTheme.checker(for: player), size: size)
            .opacity(index == visible - 1 ? 1 : 0.92)
        }
        Spacer(minLength: 0)
      } else {
        Spacer(minLength: 0)
        ForEach((0 ..< visible).reversed(), id: \.self) { index in
          ImCheckerDisc(palette: ImTheme.checker(for: player), size: size)
            .opacity(index == visible - 1 ? 1 : 0.92)
        }
      }
    }
    .padding(.vertical, 4)
    .frame(width: m.barWidth, height: halfHeight)
  }

  // MARK: Bear off

  private func bearOff(_ m: ImMetrics) -> some View {
    let whiteOff = session.board.off[.white] ?? 0
    let blackOff = session.board.off[.black] ?? 0
    let isLegal = session.destinations.contains(imBearOff)
    let halfHeight = (m.boardHeight - m.middleHeight) / 2
    let tokenSize = m.checkerSize * 0.86
    let maxVisible = max(1, Int((halfHeight - 16) / (tokenSize * 0.62)))

    return Button {
      session.tapPoint(imBearOff)
    } label: {
      VStack(spacing: 0) {
        bearOffStack(
          blackOff, .black, halfHeight, m, tokenSize,
          maxVisible: maxVisible, showTarget: isLegal && session.board.current == .black
        )
        Rectangle()
          .fill(ImTheme.barGroove)
          .frame(height: m.middleHeight)
          .overlay(Rectangle().stroke(Color.black.opacity(0.35), lineWidth: 1))
        bearOffStack(
          whiteOff, .white, halfHeight, m, tokenSize,
          maxVisible: maxVisible, showTarget: isLegal && session.board.current == .white
        )
      }
      .frame(width: m.bearOffWidth, height: m.boardHeight)
      .background(ImTheme.bearOffSurface)
      .overlay(alignment: .leading) {
        Rectangle().fill(ImTheme.bearOffBorder).frame(width: 1)
      }
      .overlay(alignment: .trailing) {
        if isLegal {
          Rectangle().stroke(Color(hex: "#4CAF50"), lineWidth: 2)
        }
      }
    }
    .buttonStyle(.plain)
  }

  private func bearOffStack(
    _ count: Int,
    _ player: ImPlayer,
    _ halfHeight: CGFloat,
    _ m: ImMetrics,
    _ tokenSize: CGFloat,
    maxVisible: Int,
    showTarget: Bool
  ) -> some View {
    let visible = min(count, maxVisible)
    let overflow = count - visible
    return VStack(spacing: 0) {
      HStack {
        Text(player == .black ? "▲ off" : "▽ off")
          .font(.system(size: 7))
          .foregroundStyle(ImTheme.bearOffLabel)
        Spacer(minLength: 0)
      }
      .padding(.horizontal, 2)
      .padding(.top, 1)

      ZStack {
        if count == 0 {
          Circle()
            .strokeBorder(
              showTarget ? Color(hex: "#4CAF50") : ImTheme.bearOffBorder,
              style: StrokeStyle(lineWidth: 1, dash: [3, 2])
            )
            .background(
              Circle().fill(showTarget ? Color(hex: "#4CAF50").opacity(0.25) : Color.black.opacity(0.15))
            )
            .frame(width: tokenSize, height: tokenSize)
        }
        VStack(spacing: 1) {
          ForEach(0 ..< visible, id: \.self) { _ in
            ImCheckerDisc(palette: ImTheme.checker(for: player), size: tokenSize)
          }
          Spacer(minLength: 0)
        }
        .padding(.horizontal, 1)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .overlay(alignment: showTarget ? .top : .bottom) {
        if overflow > 0 {
          Text("+\(overflow)")
            .font(.system(size: 8, weight: .bold))
            .foregroundStyle(ImTheme.bearOffOverflow)
            .padding(.horizontal, 2)
        }
      }
    }
    .frame(width: m.bearOffWidth, height: halfHeight)
  }

  // MARK: Point numbers
  //
  // A rail outside the triangles, split 6 | bar | 6 | bear-off so every label
  // sits under its own point. Rendering the numbers inside the cells made the
  // two rows overprint each other in the band between them.

  private enum RailSide { case top, bottom }

  private func numberRail(_ m: ImMetrics, side: RailSide) -> some View {
    // Descending columns must be built with `stride`: `Array(12 ... 7)` builds a
    // ClosedRange whose bounds are inverted, and iterating it traps at runtime
    // ("Range requires lowerBound <= upperBound"), killing the extension.
    let left = side == .top ? Array(13 ... 18) : Array(stride(from: 12, through: 7, by: -1))
    let right = side == .top ? Array(19 ... 24) : Array(stride(from: 6, through: 1, by: -1))
    return HStack(spacing: 0) {
      numberHalf(left, m)
      Color.clear.frame(width: m.barWidth)
      numberHalf(right, m)
      Color.clear.frame(width: m.bearOffWidth)
    }
    .frame(width: m.boardWidth, height: 11)
  }

  private func numberHalf(_ points: [Int], _ m: ImMetrics) -> some View {
    HStack(spacing: 0) {
      ForEach(points, id: \.self) { point in
        Text("\(point)")
          .font(.system(size: 8, weight: .semibold))
          .foregroundStyle(ImTheme.numberLabel)
          .frame(width: m.colWidth)
      }
    }
  }

  // MARK: Compact-mode controls

  /// The compact drawer is too short for a separate bear-off button, and bearing
  /// off is only ever legal as a destination — so it rides along inside the
  /// board's own tray. This row only exists to keep the roll/send controls
  /// reachable without expanding, so a turn can be played in the drawer.
  private var compactBoardActions: some View {
    HStack(spacing: 8) {
      if session.destinations.contains(imBearOff) {
        Button {
          session.tapPoint(imBearOff)
        } label: {
          Label("Bear off", systemImage: "arrow.up.right.circle.fill")
            .font(.system(size: 11, weight: .semibold))
        }
        .buttonStyle(.borderedProminent)
        .tint(ImTheme.pointLegal.fill)
        .controlSize(.mini)
      }
      Spacer(minLength: 0)
    }
  }

  // MARK: Status + actions

  private var statusLine: some View {
    Text(session.status)
      .font(isCompact ? .caption2 : .footnote)
      .foregroundStyle(.white.opacity(0.85))
      .multilineTextAlignment(.center)
      .lineLimit(isCompact ? 2 : 3)
      .frame(minHeight: isCompact ? 14 : 28)
  }

  /// Why Send is greyed out. Without this the button reads as broken rather than
  /// as "you still have dice to play".
  @ViewBuilder
  private var sendHint: some View {
    if let blocker = session.sendBlocker {
      Text(blocker)
        .font(.system(size: 10))
        .foregroundStyle(ImTheme.bearOffLabel)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .frame(maxWidth: .infinity)
    }
  }

  private var actionRow: some View {
    HStack(spacing: 10) {
      Button("New") { onNewGame() }
        .font(.footnote)
        .buttonStyle(.bordered)
        .controlSize(.small)
      Spacer(minLength: 0)
      Button(sendTitle) { onSend() }
        .font(.footnote.weight(.semibold))
        .buttonStyle(.borderedProminent)
        .controlSize(.small)
        .disabled(!session.isTurnSendable)
    }
  }

  private var sendTitle: String {
    if session.isGameOver { return "Send result" }
    return session.pendingSend ? "Staged" : "Send turn"
  }
}

// MARK: - Dice pips

private struct ImDicePips: View {
  var value: Int

  var body: some View {
    let size: CGFloat = 20
    let pip: CGFloat = 3.4
    // Pip positions for 1...6 on a 3x3 grid, in unit coordinates.
    let positions: [(CGFloat, CGFloat)] = switch value {
    case 1: [(0.5, 0.5)]
    case 2: [(0.26, 0.26), (0.74, 0.74)]
    case 3: [(0.24, 0.24), (0.5, 0.5), (0.76, 0.76)]
    case 4: [(0.26, 0.26), (0.74, 0.26), (0.26, 0.74), (0.74, 0.74)]
    case 5: [(0.26, 0.26), (0.74, 0.26), (0.5, 0.5), (0.26, 0.74), (0.74, 0.74)]
    default: [(0.26, 0.24), (0.74, 0.24), (0.26, 0.5), (0.74, 0.5), (0.26, 0.76), (0.74, 0.76)]
    }

    return ZStack {
      RoundedRectangle(cornerRadius: 4)
        .fill(Color(hex: "#F2EAD3"))
      RoundedRectangle(cornerRadius: 4)
        .stroke(ImTheme.frameBevel, lineWidth: 0.8)
      ForEach(Array(positions.enumerated()), id: \.offset) { _, pos in
        Circle()
          .fill(ImTheme.frameOuter.opacity(0.85))
          .frame(width: pip, height: pip)
          .position(x: size * pos.0, y: size * pos.1)
      }
    }
    .frame(width: size, height: size)
  }
}

// MARK: - Point cell

private struct ImPointCell: View {
  var point: Int
  var isTop: Bool
  var slot: ImPoint
  var isSelected: Bool
  var isLegal: Bool
  var canSelect: Bool
  var metrics: ImMetrics
  var onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      ZStack(alignment: isTop ? .top : .bottom) {
        ImTriangle(isTop: isTop)
          .fill(palette.fill)
          .overlay(ImTriangle(isTop: isTop).stroke(palette.stroke, lineWidth: 0.75))
          .frame(width: metrics.colWidth, height: metrics.pointHeight)

        checkers

        if slot.count == 0 && isLegal {
          Circle()
            .fill(ImTheme.legalDotFill)
            .overlay(Circle().stroke(ImTheme.legalDotStroke, lineWidth: 1.5))
            .frame(width: metrics.checkerSize * 0.7, height: metrics.checkerSize * 0.7)
        }
      }
      .frame(width: metrics.colWidth, height: metrics.pointHeight)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .disabled(!canSelect && !isLegal && slot.owner != nil)
  }

  private var palette: ImTheme.PointPalette {
    ImTheme.palette(point: point, isSelected: isSelected, isLegal: isLegal)
  }

  /// At most five checkers are drawn, like the app, with the overflow folded
  /// into a count badge on the topmost disc.
  private var checkers: some View {
    let visible = min(slot.count, 5)
    let step = min(metrics.checkerSize - 2, (metrics.pointHeight - metrics.checkerSize) / 4)
    return ZStack {
      ForEach(0 ..< visible, id: \.self) { index in
        ImCheckerDisc(
          palette: ImTheme.checker(for: slot.owner ?? .white),
          size: metrics.checkerSize,
          count: index == visible - 1 && slot.count > 5 ? slot.count : nil,
          isSelected: isSelected && index == visible - 1
        )
        .offset(y: isTop
          ? CGFloat(index) * step
          : -CGFloat(index) * step)
      }
    }
  }
}

// MARK: - Primitives

/// Point triangle pointing inward from its row edge, matching PointTriangle.tsx.
private struct ImTriangle: Shape {
  var isTop: Bool

  func path(in rect: CGRect) -> Path {
    var p = Path()
    if isTop {
      p.move(to: CGPoint(x: rect.minX, y: rect.minY))
      p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
      p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
    } else {
      p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
      p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
      p.addLine(to: CGPoint(x: rect.midX, y: rect.minY))
    }
    p.closeSubpath()
    return p
  }
}

/// Checker disc with a radial highlight and an optional count badge, matching
/// CheckerToken.tsx.
private struct ImCheckerDisc: View {
  var palette: ImTheme.Checker
  var size: CGFloat
  var count: Int?
  var isSelected: Bool = false

  var body: some View {
    let radius = size / 2 - 2
    ZStack {
      Circle()
        .fill(
          RadialGradient(
            colors: [palette.highlight, palette.mid, palette.shadow],
            center: UnitPoint(x: 0.36, y: 0.3),
            startRadius: 0,
            endRadius: radius * 1.5
          )
        )
        .overlay(Circle().stroke(palette.rim, lineWidth: 0.9))
        .overlay(
          Circle()
            .strokeBorder(palette.rim.opacity(0.45), lineWidth: 1)
            .padding(size * 0.135)
        )
        .overlay(
          Circle()
            .fill(Color.white.opacity(0.22))
            .frame(width: size * 0.27, height: size * 0.27)
            .offset(x: -radius * 0.22, y: -radius * 0.26)
        )

      if isSelected {
        Circle().strokeBorder(ImTheme.barSelected, lineWidth: 2).padding(1)
      }

      if let count {
        Text("\(count)")
          .font(.system(size: size * 0.26, weight: .bold))
          .foregroundStyle(Color(hex: "#3A2A10"))
          .frame(minWidth: size * 0.42, minHeight: size * 0.42)
          .background(
            Circle().fill(Color(hex: "#F5F0E8").opacity(0.72))
          )
          .overlay(
            Circle().stroke(Color(hex: "#3A2A10").opacity(0.4), lineWidth: 0.8)
          )
          .foregroundStyle(Color(hex: "#3A2A10"))
      }
    }
    .frame(width: size, height: size)
  }
}