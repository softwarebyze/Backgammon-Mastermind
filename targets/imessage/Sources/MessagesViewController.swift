import Messages
import SwiftUI

// MARK: - Messages extension entry point
//
// Turn flow (mirrors "Backgammon Match"):
//  1. A composes a turn in the expanded view and taps Send → an MSMessage is
//     inserted into the conversation. The full position rides in `message.url`
//     (v1 codec); the MSSession keeps the bubbles in one thread.
//  2. B taps the bubble → `willBecomeActive` / `didSelect` decodes the URL and
//     B plays `payload.current` (sides alternate automatically).
//  3. Repeat until someone bears off all 15 — the result message ends the game.
//
// New-game note: the opening-roll ceremony from the main app is skipped in v1;
// the creator plays White and moves first after rolling.

final class MessagesViewController: MSMessagesAppViewController {
  private let session = ImGameSession()
  private var hosting: UIHostingController<AnyView>?

  // MARK: Lifecycle

  override func willBecomeActive(with conversation: MSConversation) {
    super.willBecomeActive(with: conversation)
    if let message = conversation.selectedMessage,
       let url = message.url,
       let payload = try? ImTurnPayload(url: url) {
      // Ignore the echo of the turn we just sent (keeps "waiting" state).
      let isOwnJustSent = payload.gameId == session.gameId
        && payload.turn == session.turn
        && session.sentLatestTurn
      if !isOwnJustSent {
        session.load(payload: payload)
      }
    }
    // Otherwise keep the current session (a fresh game on first launch).
    presentCurrentStyle()
  }

  override func willTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.willTransition(to: presentationStyle)
    present(style: presentationStyle)
  }

  override func didSelect(_ message: MSMessage, conversation: MSConversation) {
    super.didSelect(message, conversation: conversation)
    guard let url = message.url,
          let payload = try? ImTurnPayload(url: url) else { return }
    session.load(payload: payload)
    requestPresentationStyle(.expanded)
  }

  // MARK: Presentation

  private func presentCurrentStyle() {
    present(style: presentationStyle)
  }

  private func present(style: MSMessagesAppPresentationStyle) {
    let view: AnyView
    if style == .compact {
      view = AnyView(ImCompactView(summary: compactSummary) { [weak self] in
        self?.requestPresentationStyle(.expanded)
      })
    } else {
      view = AnyView(ImBoardView(
        session: session,
        onSend: { [weak self] in self?.sendTurn() },
        onNewGame: { [weak self] in self?.startNewGame() }
      ))
    }
    if let hosting {
      hosting.rootView = view
    } else {
      let controller = UIHostingController(rootView: view)
      hosting = controller
      addChild(controller)
      viewIfLoaded?.addSubview(controller.view)
      controller.view.translatesAutoresizingMaskIntoConstraints = false
      NSLayoutConstraint.activate([
        controller.view.topAnchor.constraint(equalTo: viewIfLoaded!.topAnchor),
        controller.view.bottomAnchor.constraint(equalTo: viewIfLoaded!.bottomAnchor),
        controller.view.leadingAnchor.constraint(equalTo: viewIfLoaded!.leadingAnchor),
        controller.view.trailingAnchor.constraint(equalTo: viewIfLoaded!.trailingAnchor),
      ])
      controller.didMove(toParent: self)
    }
  }

  private var compactSummary: String {
    if session.isGameOver { return session.status }
    return "Turn \(session.turn): \(session.status)"
  }

  // MARK: Actions

  private func startNewGame() {
    session.loadNewGame()
  }

  private func sendTurn() {
    guard let conversation = activeConversation, session.isTurnSendable else { return }
    let payload = session.outgoingPayload()

    // Keep bubbles in one thread: reuse the selected message's session.
    let messageSession = conversation.selectedMessage?.session ?? MSSession()

    let message = MSMessage(session: messageSession)
    message.url = payload.url

    let layout = MSMessageTemplateLayout()
    layout.caption = payload.caption
    layout.subcaption = "Turn \(payload.turn) · Backgammon Mastermind"
    layout.trailingSubcaption = session.turn > 1 ? "Game \(payload.gameId.prefix(4))" : "New game"
    message.layout = layout

    conversation.insert(message) { [weak self] error in
      if error == nil {
        self?.session.markSent()
        self?.dismiss()
      }
    }
  }
}
