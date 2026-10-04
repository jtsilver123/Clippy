import CookedCore
import SwiftUI

struct VisualizerView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: Preferences
    @State private var engine = VisualizerEngine()
    @State private var hintsVisible = true

    var body: some View {
        ZStack {
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    engine.render(&context, size: size, time: timeline.date.timeIntervalSinceReferenceDate)
                }
            }
            .ignoresSafeArea()

            VStack {
                HStack {
                    Spacer()
                    Text("←/→ switch look · F full screen · esc close")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.5))
                        .opacity(hintsVisible ? 1 : 0)
                }
                Spacer()
                HStack(alignment: .bottom) {
                    NowCookingCard(sessions: model.sessions)
                    Spacer()
                    Text(prefs.visualizerPreset.title.uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(2)
                        .foregroundStyle(.white.opacity(0.35))
                }
            }
            .padding(28)

            if let spotlight = model.spotlight, spotlight.kind == .finished {
                FinaleOverlay(session: spotlight.session)
                    .transition(.opacity.combined(with: .scale(scale: 1.08)))
            }
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
        .animation(.easeInOut(duration: 0.5), value: model.spotlight)
        .onReceive(model.pulses) { engine.handle($0) }
        .onAppear {
            engine.preset = prefs.visualizerPreset
            syncPalette()
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                withAnimation(.easeOut(duration: 1)) { hintsVisible = false }
            }
        }
        .onChange(of: prefs.visualizerPreset) { preset in engine.preset = preset }
        .onChange(of: model.sessions) { _ in syncPalette() }
    }

    private func syncPalette() {
        let active = model.active
        engine.isCooking = !active.isEmpty
        engine.palette = Array(Set(active.map(\.agent))).sorted { $0.rawValue < $1.rawValue }.map(\.hue)
    }
}

/// Bottom-left "now playing" card, in the spirit of iTunes' track info.
private struct NowCookingCard: View {
    let sessions: [AgentSession]

    var body: some View {
        let active = sessions.filter { $0.phase.isActive }
        TimelineView(.periodic(from: .now, by: 1)) { context in
            VStack(alignment: .leading, spacing: 6) {
                if let lead = active.first {
                    Text(isWaiting(lead) ? "WAITING ON YOU" : "NOW COOKING")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(2)
                        .foregroundStyle(isWaiting(lead) ? Color.yellow : lead.agent.tint)
                    Text(lead.projectName)
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(details(lead, now: context.date))
                        .font(.system(size: 12, weight: .medium).monospacedDigit())
                        .foregroundStyle(.white.opacity(0.6))
                    if active.count > 1 {
                        Text("+ \(active.count - 1) more on the stove")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.45))
                    }
                } else {
                    Text("NOTHING ON THE STOVE")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(2)
                        .foregroundStyle(.white.opacity(0.5))
                    Text("Send a prompt to Claude Code or Codex")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .padding(18)
            .background(RoundedRectangle(cornerRadius: 16).fill(.black.opacity(0.35)))
        }
    }

    private func isWaiting(_ session: AgentSession) -> Bool {
        if case .needsInput = session.phase { return true }
        return false
    }

    private func details(_ session: AgentSession, now: Date) -> String {
        var parts = [session.agent.displayName]
        if let start = session.turnStartedAt { parts.append(Format.clock(now.timeIntervalSince(start))) }
        if session.beats > 0 { parts.append("\(session.beats) step\(session.beats == 1 ? "" : "s")") }
        if let tool = session.lastTool { parts.append(tool) }
        return parts.joined(separator: " · ")
    }
}

private struct FinaleOverlay: View {
    let session: AgentSession
    @State private var popped = false

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64, weight: .bold))
                .foregroundStyle(.white, session.agent.tint)
                .scaleEffect(popped ? 1 : 0.3)
            Text("Cooked.")
                .font(.system(size: 54, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
            Text(subtitle)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white.opacity(0.7))
            if let summary = Format.snippet(session.summary, limit: 160) {
                Text(summary)
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 560)
            }
        }
        .padding(40)
        .background(RoundedRectangle(cornerRadius: 28).fill(.black.opacity(0.35)))
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.5)) { popped = true }
        }
    }

    private var subtitle: String {
        var text = "\(session.agent.displayName) finished \(session.projectName)"
        if let duration = session.cookDuration { text += " in \(Format.duration(duration))" }
        return text
    }
}
