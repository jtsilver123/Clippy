import AppKit
import ClippyCore
import SwiftUI

@MainActor
final class SettingsWindowController {
    private let model: AppModel
    private var window: NSWindow?

    init(model: AppModel) {
        self.model = model
    }

    func show() {
        if window == nil {
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 520, height: 640),
                styleMask: [.titled, .closable, .miniaturizable],
                backing: .buffered,
                defer: false
            )
            window.title = "Clippy Settings"
            window.isReleasedWhenClosed = false
            window.contentView = NSHostingView(rootView: SettingsView()
                .environmentObject(model)
                .environmentObject(model.preferences))
            window.center()
            self.window = window
        }
        NSApp.activate(ignoringOtherApps: true)
        window?.makeKeyAndOrderFront(nil)
    }
}

struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: Preferences

    @State private var claudeConnected = false
    @State private var codexStatus: Integrations.CodexStatus = .notConnected
    @State private var errorMessage: String?
    @State private var coworkFound = false

    private var placementNote: String {
        let neighbor = model.neighbors.running.first
        switch prefs.islandPlacement {
        case .automatic:
            if let neighbor { return "\(neighbor) is using the notch, so Clippy floats just below it. When \(neighbor) quits, Clippy moves back in." }
            return "Clippy lives in the notch. If another notch app (NotchNook, boring.notch, Alcove…) starts, Clippy moves just below it."
        case .notch:
            return neighbor.map { "Heads up: \($0) also draws in the notch, so the two may overlap." } ?? "Always in the notch."
        case .belowNotch:
            return "Always floats just below the notch, leaving the notch to other apps."
        }
    }

    var body: some View {
        Form {
            Section {
                Picker("Mode", selection: $prefs.mode) {
                    Text("Island — just tell me when it's done").tag(CookMode.island)
                    Text("Visualizer — give me something to watch").tag(CookMode.visualizer)
                }
                .pickerStyle(.radioGroup)
            } header: {
                Text("Mode")
            }

            Section {
                connectionRow(
                    title: "Claude Code",
                    agent: .claude,
                    connected: claudeConnected,
                    detail: "Adds hooks to ~/.claude/settings.json. Restart running Claude Code sessions to pick them up.",
                    install: { try Integrations.installClaude() },
                    uninstall: { try Integrations.uninstallClaude() }
                )

                Toggle("Watch Codex sessions (no setup needed)", isOn: $prefs.watchCodexSessions)

                HStack(alignment: .top, spacing: 10) {
                    AgentBadge(agent: .cowork, size: 26)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text("Cowork").font(.body.weight(.medium))
                            Text(coworkFound ? "Found Claude Desktop" : "No Cowork sessions yet")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(coworkFound ? Color.green : Color.secondary)
                        }
                        Text("Reads Cowork's session logs in Claude Desktop. Nothing to install.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Toggle("Watch Cowork", isOn: $prefs.watchCoworkSessions).labelsHidden()
                }

                connectionRow(
                    title: "Codex notify hook",
                    agent: .codex,
                    connected: codexStatus == .connected,
                    detail: "Optional backup signal: sets `notify` in ~/.codex/config.toml.",
                    install: { try Integrations.installCodex() },
                    uninstall: { try Integrations.uninstallCodex() }
                )

                if case let .conflict(existing) = codexStatus {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Your Codex config already has a notify program, and Codex only allows one. Clippy left it alone; session watching still works. To use both, call this from your script:")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(existing)
                            .font(.caption.monospaced())
                            .textSelection(.enabled)
                        Text("curl -s -m 1 --noproxy '*' -X POST --data-binary \"$1\" http://127.0.0.1:\(HookInstaller.defaultPort)/hook/codex")
                            .font(.caption.monospaced())
                            .textSelection(.enabled)
                    }
                }

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundStyle(.red)
                }
            } header: {
                Text("Connections")
            }

            Section {
                Picker("Placement", selection: $prefs.islandPlacement) {
                    ForEach(IslandPlacement.allCases) { Text($0.title).tag($0) }
                }
                Text(placementNote)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Toggle("Play a sound when done", isOn: $prefs.playSound)
                Picker("Sound", selection: $prefs.soundName) {
                    ForEach(Preferences.sounds, id: \.self) { Text($0).tag($0) }
                }
                .disabled(!prefs.playSound)
                .onChange(of: prefs.soundName) { name in NSSound(named: NSSound.Name(name))?.play() }

                LabeledContent("Celebrate turns longer than") {
                    Stepper("\(Int(prefs.minimumCookSeconds))s", value: $prefs.minimumCookSeconds, in: 0...300, step: 5)
                }
                LabeledContent("Keep the done card up for") {
                    Stepper("\(Int(prefs.celebrateSeconds))s", value: $prefs.celebrateSeconds, in: 2...60, step: 1)
                }
                Toggle("Clicking the island jumps back to the terminal", isOn: $prefs.returnToTerminalOnClick)
            } header: {
                Text("Island")
            }

            Section {
                Toggle("Open when something starts cooking", isOn: $prefs.visualizerAutoOpen)
                Toggle("Open in full screen", isOn: $prefs.visualizerFullScreen)
                Toggle("Close after the finale and return to the terminal", isOn: $prefs.visualizerAutoClose)
                Picker("Look", selection: $prefs.visualizerPreset) {
                    ForEach(VisualizerPreset.allCases) { Text($0.title).tag($0) }
                }
                HStack {
                    Button("Open visualizer") { model.openVisualizer() }
                    Menu("Simulate a turn") {
                        Button("Claude Code") { model.simulate(.claude) }
                        Button("Codex") { model.simulate(.codex) }
                        Button("Cowork") { model.simulate(.cowork) }
                    }
                    .fixedSize()
                }
            } header: {
                Text("Visualizer")
            } footer: {
                Text("Only used in Visualizer mode. The visualizer dances to agent activity: every tool call is a beat.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(width: 520)
        .frame(minHeight: 600)
        .onAppear(perform: refresh)
    }

    @ViewBuilder
    private func connectionRow(
        title: String,
        agent: Agent,
        connected: Bool,
        detail: String,
        install: @escaping () throws -> Void,
        uninstall: @escaping () throws -> Void
    ) -> some View {
        HStack(alignment: .top, spacing: 10) {
            AgentBadge(agent: agent, size: 26)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title).font(.body.weight(.medium))
                    Text(connected ? "Connected" : "Not connected")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(connected ? Color.green : Color.secondary)
                }
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button(connected ? "Remove" : "Connect") {
                run(connected ? uninstall : install)
            }
        }
    }

    private func run(_ action: () throws -> Void) {
        do {
            try action()
            errorMessage = nil
        } catch {
            errorMessage = "Couldn't update the config: \(error.localizedDescription)"
        }
        refresh()
    }

    private func refresh() {
        claudeConnected = Integrations.isClaudeInstalled
        coworkFound = FileManager.default.fileExists(atPath: CoworkSessionSource.defaultRoot.path)
        codexStatus = Integrations.codexStatus
    }
}
