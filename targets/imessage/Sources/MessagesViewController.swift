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
       let payload = try? ImTurnPayload(url: url),
       session.shouldAdopt(payload, isFromMe: isFromMe(message, in: conversation)) {
      session.load(payload: payload)
    }
    // Otherwise keep the current session (a fresh game on first launch, or the
    // "waiting for your opponent" state when re-opening your own last turn).
    presentCurrentStyle()
  }

  override func willTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.willTransition(to: presentationStyle)
    present(style: presentationStyle)
  }

  override func didSelect(_ message: MSMessage, conversation: MSConversation) {
    super.didSelect(message, conversation: conversation)
    guard let url = message.url,
          let payload = try? ImTurnPayload(url: url),
          session.shouldAdopt(payload, isFromMe: isFromMe(message, in: conversation)) else { return }
    session.load(payload: payload)
    requestPresentationStyle(.expanded)
  }

  /// `MSMessage` has no `isFromMe`; authorship comes from the participant ids —
  /// the local participant is this device.
  private func isFromMe(_ message: MSMessage, in conversation: MSConversation) -> Bool {
    message.senderParticipantIdentifier == conversation.localParticipantIdentifier
  }

  /// `insert` only stages the message in the composer; the user can still delete
  /// the draft. The turn is only handed over once Messages reports the send
  /// starting, and even then the state is reversible — see `ImGameSession.
  /// markSending()` — because this callback is not a delivery confirmation.
  override func didStartSending(_ message: MSMessage, conversation: MSConversation) {
    super.didStartSending(message, conversation: conversation)
    session.markSending()
    dismiss()
  }

  /// The user deleted the staged draft instead of sending it. Without this the
  /// session stays `pendingSend` forever and Send is permanently disabled —
  /// the turn is unrecoverable without a new extension process.
  override func didCancelSending(_ message: MSMessage, conversation: MSConversation) {
    super.didCancelSending(message, conversation: conversation)
    session.failToStage("Turn removed before sending — tap Send turn to stage it again.")
  }

  // MARK: Presentation

  private func presentCurrentStyle() {
    present(style: presentationStyle)
  }

  private func present(style: MSMessagesAppPresentationStyle) {
    // The compact drawer renders the same playable board, just with tighter
    // chrome — the old summary card meant a turn could only be played after
    // expanding, which read as "it doesn't work in small mode".
    let view = AnyView(ImBoardView(
      session: session,
      onSend: { [weak self] in self?.sendTurn() },
      onResend: { [weak self] in self?.resendTurn() },
      onNewGame: { [weak self] in self?.startNewGame() },
      isCompact: style == .compact
    ))
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

  // MARK: Actions

  private func startNewGame() {
    session.loadNewGame()
  }

  private func sendTurn() {
    guard session.isTurnSendable else { return }
    guard let conversation = activeConversation else {
      // No active conversation: `insert` cannot be called at all. Without this
      // the button looks like it did nothing.
      session.failToStage("Could not find the conversation — reopen the bubble and try again.")
      return
    }
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

    session.markStaged()
    conversation.insert(message) { [weak self] error in
      guard let self, let error else { return }
      // `insert` fails when the conversation is no longer active (the user
      // backgrounded the extension mid-send). Surface it instead of dropping it.
      //
      // The completion runs on a background queue, and `failToStage` publishes
      // `@Published` state that SwiftUI reads, so it has to hop to main first —
      // publishing off-thread hands `ImBoardView` an update on the wrong queue.
      DispatchQueue.main.async {
        self.session.failToStage("Could not stage the turn: \(error.localizedDescription)")
      }
    }
  }

  /// Re-stage a turn that iMessage claimed to send but may never have delivered.
  /// Messages gives us no delivery callback, so this is the only way back: the
  /// session kept the board and dice, and the rebuilt payload is identical.
  private func resendTurn() {
    guard session.canResend else { return }
    session.retrySend()
    sendTurn()
  }
}
