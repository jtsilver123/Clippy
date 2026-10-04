import CookedCore
import SwiftUI

/// The menu bar popover.
struct MenuView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: Preferences
    @State private var claudeConnected = Integrations.isClaudeInstalled

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            Picker("Mode", selection: $prefs.mode) {
                ForEach(CookMode.allCases) { mode in Text(mode.title).tag(mode) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            if let error = model.serverError {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            } else if !claudeConnected {
                Button {
                    model.openSettings()
                } label: {
                    Label("Connect Claude Code to get notified", systemImage: "link")
                        .font(.caption)
                }
                .buttonStyle(.link)
            }

            Divider()

            if model.sessions.isEmpty {
                Text("Nothing on the stove. Send a prompt to Claude Code or Codex and it shows up here.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    VStack(spacing: 6) {
                        ForEach(model.sessions.prefix(6)) { session in
                            SessionRow(session: session, now: context.date, dark: false)
                                .contentShape(Rectangle())
                                .onTapGesture { model.focusHost(of: session) }
                                .contextMenu {
                                    Button("Dismiss") { model.dismiss(session) }
                                }
                        }
                    }
                }
                if model.sessions.contains(where: { !$0.phase.isActive }) {
                    Button("Clear finished") { model.clearFinished() }
                        .buttonStyle(.link)
                        .font(.caption)
                }
            }

            Divider()

            HStack {
                Button {
                    model.openVisualizer()
                } label: {
                    Label("Visualizer", systemImage: "sparkles")
                }
                Menu {
                    Button("Claude Code") { model.simulate(.claude) }
                    Button("Codex") { model.simulate(.codex) }
                } label: {
                    Label("Try it", systemImage: "play.circle")
                }
                .menuStyle(.borderlessButton)
                .fixedSize()
                Spacer()
                Button {
                    model.openSettings()
                } label: {
                    Image(systemName: "gearshape")
                }
                .help("Settings")
                Button {
                    NSApp.terminate(nil)
                } label: {
                    Image(systemName: "power")
                }
                .help("Quit Cooked")
            }
            .buttonStyle(.borderless)
        }
        .padding(14)
        .frame(width: 320)
        .onAppear { claudeConnected = Integrations.isClaudeInstalled }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: model.hasActive ? "flame.fill" : "flame")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(model.hasActive ? Color.orange : Color.secondary)
            VStack(alignment: .leading, spacing: 1) {
                Text("Cooked").font(.headline)
                Text(statusLine).font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var statusLine: String {
        let count = model.active.count
        switch count {
        case 0: return "Nothing cooking"
        case 1: return "1 thing cooking"
        default: return "\(count) things cooking"
        }
    }
}
