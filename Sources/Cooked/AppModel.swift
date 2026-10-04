import AppKit
import Combine
import CookedCore
import SwiftUI

/// What the island shows when it's expanded on its own (not because of hover).
struct Spotlight: Equatable {
    enum Kind: Equatable {
        case finished
        case needsInput
    }

    var kind: Kind
    var session: AgentSession
}

enum IslandPresentation: Equatable {
    case hidden
    case compact
    case spotlight(Spotlight)
    case list
}

/// A moment the visualizer reacts to.
struct Pulse {
    enum Kind {
        case start
        case beat
        case needsInput
        case finish
    }

    let agent: Agent
    let kind: Kind
}

@MainActor
final class AppModel: ObservableObject {
    static let shared = AppModel()

    let preferences = Preferences()
    let pulses = PassthroughSubject<Pulse, Never>()

    @Published private(set) var sessions: [AgentSession] = []
    @Published private(set) var spotlight: Spotlight?
    @Published var isHoveringIsland = false
    @Published private(set) var serverError: String?

    private let store = SessionStore()
    private let server = EventServer()
    private let tailer = CodexRolloutTailer(root: CodexRolloutTailer.defaultRoot)
    private var loops: [Task<Void, Never>] = []
    private var spotlightTask: Task<Void, Never>?
    private var island: IslandPanelController?
    private var settingsWindow: SettingsWindowController?
    private(set) lazy var visualizer = VisualizerWindowController(model: self)

    var active: [AgentSession] { sessions.filter { $0.phase.isActive } }
    var hasActive: Bool { sessions.contains { $0.phase.isActive } }

    var presentation: IslandPresentation {
        if let spotlight { return .spotlight(spotlight) }
        if isHoveringIsland && !sessions.isEmpty { return .list }
        if hasActive { return .compact }
        return .hidden
    }

    // MARK: Lifecycle

    func start() {
        server.onRequest = { [weak self] request in
            guard let event = EventRouter.event(for: request) else { return }
            self?.handle(event)
        }
        server.onFailure = { [weak self] message in self?.serverError = message }
        do {
            try server.start(port: UInt16(HookInstaller.defaultPort))
        } catch {
            serverError = "Couldn't listen on port \(HookInstaller.defaultPort): \(error.localizedDescription)"
        }

        tailer.onEvent = { [weak self] event in self?.handle(event) }
        if preferences.watchCodexSessions { tailer.poll() }

        loops.append(every(seconds: 1) { [weak self] in
            guard let self, self.preferences.watchCodexSessions else { return }
            self.tailer.poll()
        })
        loops.append(every(seconds: 30) { [weak self] in
            guard let self else { return }
            for change in self.store.prune() { self.react(to: change) }
            self.sessions = self.store.sorted
        })

        island = IslandPanelController(model: self)
        island?.show()

        if !preferences.hasOnboarded {
            preferences.hasOnboarded = true
            if !Integrations.isClaudeInstalled { openSettings() }
        }
    }

    private func every(seconds: Double, _ body: @escaping @MainActor () -> Void) -> Task<Void, Never> {
        Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                body()
            }
        }
    }

    // MARK: Events

    func handle(_ event: AgentEvent) {
        let changes = store.apply(event)
        sessions = store.sorted
        for change in changes { react(to: change) }
    }

    private func react(to change: StoreChange) {
        switch change {
        case let .started(session):
            pulses.send(Pulse(agent: session.agent, kind: .start))
            if spotlight?.session.id == session.id { clearSpotlight() }
            if preferences.mode == .visualizer && preferences.visualizerAutoOpen {
                visualizer.show()
            }

        case let .beat(session):
            pulses.send(Pulse(agent: session.agent, kind: .beat))

        case let .resumed(session):
            pulses.send(Pulse(agent: session.agent, kind: .beat))
            if spotlight?.kind == .needsInput, spotlight?.session.id == session.id { clearSpotlight() }

        case let .needsInput(session):
            pulses.send(Pulse(agent: session.agent, kind: .needsInput))
            show(Spotlight(kind: .needsInput, session: session), autoHideAfter: nil)
            playSound(named: "Tink")

        case let .finished(session):
            pulses.send(Pulse(agent: session.agent, kind: .finish))
            // nil duration means we never saw it start — still worth announcing.
            let worthCelebrating = (session.cookDuration ?? .infinity) >= preferences.minimumCookSeconds
            if worthCelebrating {
                show(Spotlight(kind: .finished, session: session), autoHideAfter: preferences.celebrateSeconds)
                playSound(named: preferences.soundName)
            } else if spotlight?.session.id == session.id {
                clearSpotlight()
            }
            if session.summary == nil, let path = session.transcriptPath {
                loadSummary(for: session.id, transcriptPath: path)
            }
            visualizer.turnFinished(session)

        case let .removed(id):
            if spotlight?.session.id == id { clearSpotlight() }
        }
    }

    /// The Stop hook doesn't always include the final message, so read it from the transcript.
    private func loadSummary(for id: String, transcriptPath: String) {
        Task.detached(priority: .utility) {
            // Give Claude a beat to flush the transcript.
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard let text = ClaudeTranscript.lastAssistantText(atPath: transcriptPath) else { return }
            await MainActor.run {
                let model = AppModel.shared
                model.store.setSummary(text, for: id)
                model.sessions = model.store.sorted
                if let current = model.spotlight, current.session.id == id, let updated = model.store.sessions[id] {
                    model.spotlight = Spotlight(kind: current.kind, session: updated)
                }
            }
        }
    }

    // MARK: Spotlight

    private func show(_ newSpotlight: Spotlight, autoHideAfter seconds: Double?) {
        spotlightTask?.cancel()
        spotlight = newSpotlight
        guard let seconds else { return }
        spotlightTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            // Don't yank the card out from under the cursor.
            while let self, self.isHoveringIsland, !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            guard !Task.isCancelled else { return }
            self?.spotlight = nil
        }
    }

    func clearSpotlight() {
        spotlightTask?.cancel()
        spotlight = nil
    }

    func islandTapped() {
        if let spotlight {
            if preferences.returnToTerminalOnClick { focusHost(of: spotlight.session) }
            clearSpotlight()
        }
    }

    func focusHost(of session: AgentSession) {
        guard let bundleID = session.hostAppBundleID,
              let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first else { return }
        if #available(macOS 14, *) {
            app.activate()
        } else {
            app.activate(options: [.activateIgnoringOtherApps])
        }
    }

    func dismiss(_ session: AgentSession) {
        store.remove(id: session.id)
        sessions = store.sorted
        if spotlight?.session.id == session.id { clearSpotlight() }
    }

    func clearFinished() {
        for session in sessions where !session.phase.isActive { store.remove(id: session.id) }
        sessions = store.sorted
    }

    private func playSound(named name: String) {
        guard preferences.playSound else { return }
        NSSound(named: NSSound.Name(name))?.play()
    }

    // MARK: Windows

    func openSettings() {
        if settingsWindow == nil { settingsWindow = SettingsWindowController(model: self) }
        settingsWindow?.show()
    }

    func openVisualizer() {
        visualizer.show()
    }

    // MARK: Demo

    /// Fakes a whole turn so people can see what happens without waiting on a real agent.
    func simulate(_ agent: Agent, seconds: Double = 9) {
        let id = "demo-\(UUID().uuidString.prefix(6))"
        let cwd = agent == .claude ? "/Users/demo/pancake-stack" : "/Users/demo/omelette-api"
        let tools = agent == .claude ? ["Read", "Edit", "Bash", "Grep", "Write"] : ["shell", "apply_patch", "shell"]
        let host = Bundle.main.bundleIdentifier
        func send(_ kind: AgentEventKind) {
            handle(AgentEvent(agent: agent, sessionID: id, cwd: cwd, kind: kind, hostAppBundleID: host))
        }
        Task { @MainActor in
            send(.promptSubmitted)
            let ticks = Int(seconds / 0.35)
            for _ in 0..<ticks {
                try? await Task.sleep(nanoseconds: 350_000_000)
                if Double.random(in: 0...1) < 0.55 { send(.activity(tool: tools.randomElement())) }
            }
            send(.turnComplete(summary: agent == .claude
                ? "Stacked the pancakes: refactored the batter service and all 42 tests pass."
                : "Omelette API is plated. Added the /flip endpoint with tests."))
        }
    }
}
