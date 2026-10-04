import ClippyCore
import SwiftUI

struct IslandView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var state: IslandState

    var body: some View {
        let presentation = model.presentation
        let geometry = state.geometry
        let size = IslandLayout.size(for: presentation, geometry: geometry, rows: model.sessions.count)
        let expanded = presentation.isExpanded

        VStack(spacing: 0) {
            ZStack(alignment: .top) {
                NotchShape(
                    topRadius: IslandLayout.topRadius(for: presentation),
                    bottomRadius: IslandLayout.bottomRadius(for: presentation)
                )
                .fill(Color.black)

                content(for: presentation, geometry: geometry)
                    .padding(.horizontal, IslandLayout.topRadius(for: presentation))
                    .frame(width: size.width, height: size.height, alignment: .top)
                    .clipped()
            }
            .frame(width: size.width, height: size.height)
            .opacity(!geometry.hasNotch && presentation == .hidden ? 0 : 1)
            .shadow(color: .black.opacity(expanded ? 0.45 : 0), radius: 14, y: 6)
            .contentShape(Rectangle())
            .onTapGesture { model.islandTapped() }

            Spacer(minLength: 0)
        }
        .frame(width: IslandLayout.canvasSize.width, height: IslandLayout.canvasSize.height, alignment: .top)
        .animation(.spring(response: 0.42, dampingFraction: 0.8), value: presentation)
        .animation(.spring(response: 0.42, dampingFraction: 0.8), value: model.sessions.count)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private func content(for presentation: IslandPresentation, geometry: NotchGeometry) -> some View {
        switch presentation {
        case .hidden:
            Color.clear
        case .compact:
            CompactIsland(sessions: model.active, geometry: geometry)
                .transition(.opacity)
        case let .spotlight(spotlight):
            SpotlightCard(spotlight: spotlight)
                .padding(.top, geometry.notchSize.height)
                .transition(.opacity.combined(with: .scale(scale: 0.92, anchor: .top)))
                .id(spotlight.session.id + "\(spotlight.kind)")
        case .list:
            SessionList(sessions: model.sessions)
                .padding(.top, geometry.notchSize.height + 4)
                .transition(.opacity.combined(with: .scale(scale: 0.92, anchor: .top)))
        }
    }
}

extension IslandPresentation {
    var isExpanded: Bool {
        switch self {
        case .spotlight, .list: return true
        case .hidden, .compact: return false
        }
    }
}

// MARK: Compact: flanks the notch like a Live Activity

private struct CompactIsland: View {
    let sessions: [AgentSession]
    let geometry: NotchGeometry

    var body: some View {
        let lead = sessions.first
        let waiting = sessions.contains { if case .needsInput = $0.phase { return true } else { return false } }

        HStack(spacing: 0) {
            HStack(spacing: 5) {
                if waiting {
                    Image(systemName: "hand.raised.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.yellow)
                        .symbolEffectPulse()
                } else {
                    CookingFlame(tint: lead?.agent.tint ?? .orange, size: 13)
                }
                ForEach(Array(Set(sessions.map(\.agent))).sorted { $0.rawValue < $1.rawValue }, id: \.self) { agent in
                    Image(systemName: agent.symbol)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(agent.tint)
                }
            }
            .frame(width: IslandLayout.compactSideWidth, alignment: .center)

            Group {
                if geometry.hasNotch {
                    Color.clear
                } else {
                    Text(waiting ? "Needs your OK" : "Cooking")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
            .frame(width: geometry.notchSize.width)

            HStack(spacing: 4) {
                if let start = lead?.turnStartedAt {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(Format.clock(context.date.timeIntervalSince(start)))
                            .font(.system(size: 11, weight: .semibold, design: .rounded).monospacedDigit())
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
                if sessions.count > 1 {
                    Text("\(sessions.count)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 4)
                        .background(Capsule().fill(.white.opacity(0.85)))
                }
            }
            .frame(width: IslandLayout.compactSideWidth, alignment: .center)
        }
        .frame(height: geometry.notchSize.height)
    }
}

// MARK: Spotlight: the "it's done" moment

private struct SpotlightCard: View {
    let spotlight: Spotlight
    @State private var popped = false

    var body: some View {
        let session = spotlight.session
        HStack(alignment: .center, spacing: 14) {
            ZStack {
                Circle()
                    .fill(accent.opacity(0.18))
                    .frame(width: 48, height: 48)
                    .scaleEffect(popped ? 1 : 0.4)
                Image(systemName: spotlight.kind == .finished ? "checkmark" : "hand.raised.fill")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(accent)
                    .scaleEffect(popped ? 1 : 0.2)
                    .rotationEffect(.degrees(popped ? 0 : -40))
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Image(systemName: session.agent.symbol)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(session.agent.tint)
                    Text(title(for: session))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Text(subtitle(for: session))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.55))
                if let detail = detail(for: session) {
                    Text(detail)
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 12)
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.55).delay(0.08)) { popped = true }
        }
    }

    private var accent: Color {
        spotlight.kind == .finished ? .green : .yellow
    }

    private func title(for session: AgentSession) -> String {
        switch spotlight.kind {
        case .finished: return "\(session.agent.displayName) is done cooking"
        case .needsInput: return "\(session.agent.displayName) needs you"
        }
    }

    private func subtitle(for session: AgentSession) -> String {
        if spotlight.kind == .finished, let duration = session.cookDuration {
            return "\(session.projectName) · cooked for \(Format.duration(duration))"
        }
        return session.projectName
    }

    private func detail(for session: AgentSession) -> String? {
        switch session.phase {
        case let .needsInput(message): return message ?? "Waiting on a permission prompt."
        case let .done(summary): return Format.snippet(summary)
        default: return nil
        }
    }
}

// MARK: List: everything on the stove (on hover)

private struct SessionList: View {
    @EnvironmentObject private var model: AppModel
    let sessions: [AgentSession]

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            VStack(spacing: 0) {
                ForEach(sessions.prefix(IslandLayout.maxRows)) { session in
                    SessionRow(session: session, now: context.date)
                        .frame(height: IslandLayout.rowHeight)
                        .contentShape(Rectangle())
                        .onTapGesture { model.focusHost(of: session) }
                }
            }
            .padding(.horizontal, 18)
        }
    }
}

struct SessionRow: View {
    let session: AgentSession
    let now: Date
    var dark = true

    var body: some View {
        HStack(spacing: 10) {
            AgentBadge(agent: session.agent, size: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(session.projectName)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(dark ? Color.white : Color.primary)
                    .lineLimit(1)
                Text(session.statusText(now: now))
                    .font(.system(size: 10.5, weight: .medium).monospacedDigit())
                    .foregroundStyle(dark ? Color.white.opacity(0.55) : Color.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            switch session.phase {
            case .cooking:
                CookingFlame(tint: session.agent.tint, size: 12)
            case .needsInput:
                Image(systemName: "hand.raised.fill").foregroundStyle(.yellow).font(.system(size: 12))
            case .done:
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).font(.system(size: 13))
            case .idle:
                EmptyView()
            }
        }
    }
}

private extension View {
    /// SF Symbol pulse on macOS 14+, a plain opacity pulse before that.
    @ViewBuilder
    func symbolEffectPulse() -> some View {
        if #available(macOS 14, *) {
            self.symbolEffect(.pulse, options: .repeating)
        } else {
            self.modifier(OpacityPulse())
        }
    }
}

private struct OpacityPulse: ViewModifier {
    @State private var dim = false

    func body(content: Content) -> some View {
        content
            .opacity(dim ? 0.4 : 1)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) { dim = true }
            }
    }
}
