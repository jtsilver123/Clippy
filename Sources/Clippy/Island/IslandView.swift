import ClippyCore
import Combine
import SwiftUI

struct IslandView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var state: IslandState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let presentation = model.presentation
        let geometry = state.geometry
        let size = IslandLayout.size(for: presentation, geometry: geometry, rows: model.sessions.count)
        let lifted = presentation == .compact && model.pointerInside

        VStack(spacing: 0) {
            Color.clear.frame(height: IslandLayout.topInset(geometry))

            ZStack(alignment: .top) {
                IslandBackground(presentation: presentation, docked: geometry.docked, size: size, attention: needsAttention)

                content(for: presentation, geometry: geometry)
                    .padding(.horizontal, geometry.docked ? IslandLayout.topRadius(for: presentation) : 0)
                    .frame(width: size.width, height: size.height, alignment: .top)
                    .clipShape(Rectangle())
            }
            .frame(width: size.width, height: size.height)
            .opacity(size.height == 0 ? 0 : 1)
            .scaleEffect(lifted && !reduceMotion ? 1.035 : 1, anchor: .top)
            .contentShape(Rectangle())
            .onTapGesture { model.islandTapped() }

            Spacer(minLength: 0)
        }
        .frame(width: IslandLayout.canvasSize.width, height: IslandLayout.canvasSize.height, alignment: .top)
        .animation(animation(for: presentation), value: presentation)
        .animation(animation(for: presentation), value: geometry)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: model.sessions.count)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: lifted)
        .preferredColorScheme(.dark)
    }

    /// Bouncy on the way out, snappy on the way back in, like the iPhone.
    private func animation(for presentation: IslandPresentation) -> Animation {
        if reduceMotion { return .easeInOut(duration: 0.2) }
        return presentation.isExpanded
            ? .spring(response: 0.46, dampingFraction: 0.72)
            : .spring(response: 0.34, dampingFraction: 0.9)
    }

    private var needsAttention: Bool {
        model.active.contains { if case .needsInput = $0.phase { return true } else { return false } }
    }

    @ViewBuilder
    private func content(for presentation: IslandPresentation, geometry: NotchGeometry) -> some View {
        switch presentation {
        case .hidden:
            Color.clear
        case .compact:
            CompactIsland(sessions: model.active, geometry: geometry)
                .transition(.blurFade)
        case let .spotlight(spotlight):
            SpotlightCard(spotlight: spotlight)
                .padding(.top, IslandLayout.headroom(geometry))
                .transition(.blurFade)
                .id(spotlight.session.id + "\(spotlight.kind)")
        case .list:
            SessionList(sessions: model.sessions)
                .padding(.top, IslandLayout.headroom(geometry) + 6)
                .transition(.blurFade)
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

// MARK: Background

/// The black silhouette: notch-shaped when docked, a floating capsule/card when sharing the
/// notch with another app. Breathes amber while an agent waits on you.
private struct IslandBackground: View {
    let presentation: IslandPresentation
    let docked: Bool
    let size: CGSize
    let attention: Bool
    @State private var breathe = false

    var body: some View {
        ZStack {
            if docked {
                let shape = NotchShape(
                    topRadius: IslandLayout.topRadius(for: presentation),
                    bottomRadius: IslandLayout.bottomRadius(for: presentation)
                )
                shape.fill(Color.black)
                shape.stroke(Color.yellow.opacity(attention ? (breathe ? 0.75 : 0.2) : 0), lineWidth: 1.5)
            } else {
                let shape = RoundedRectangle(cornerRadius: presentation == .compact ? size.height / 2 : 24, style: .continuous)
                shape.fill(Color.black)
                shape.stroke(Color.white.opacity(0.09), lineWidth: 1)
                shape.stroke(Color.yellow.opacity(attention ? (breathe ? 0.75 : 0.2) : 0), lineWidth: 1.5)
            }
        }
        .shadow(color: .black.opacity(presentation.isExpanded || !docked ? 0.45 : 0), radius: 16, y: 7)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { breathe = true }
        }
    }
}

// MARK: Compact: flanks the notch like a Live Activity

private struct CompactIsland: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let sessions: [AgentSession]
    let geometry: NotchGeometry
    @State private var beat = 0
    @State private var glow = false

    var body: some View {
        let lead = sessions.first
        let waiting = sessions.contains { if case .needsInput = $0.phase { return true } else { return false } }
        let agents = Array(Set(sessions.map(\.agent))).sorted { $0.rawValue < $1.rawValue }

        ZStack(alignment: .bottom) {
            HStack(spacing: 0) {
                // Leading: what's cooking.
                HStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .fill((lead?.agent.tint ?? .orange).opacity(glow ? 0.45 : 0))
                            .frame(width: 22, height: 22)
                            .blur(radius: 5)
                        if waiting {
                            AttentionHand(size: 12)
                        } else {
                            CookingFlame(tint: lead?.agent.tint ?? .orange, size: 13)
                                .scaleEffect(glow && !reduceMotion ? 1.18 : 1, anchor: .bottom)
                        }
                    }
                    HStack(spacing: -3) {
                        ForEach(agents, id: \.self) { agent in
                            AgentBadge(agent: agent, size: 15)
                                .background(Circle().fill(.black).padding(-1))
                        }
                    }
                }
                .frame(width: IslandLayout.compactSideWidth, alignment: .center)

                // Center: hidden behind the notch when docked; a label when floating.
                Group {
                    if geometry.docked && geometry.hasNotch {
                        Color.clear
                    } else {
                        Text(waiting ? "Needs you" : (lead?.projectName ?? "Cooking"))
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.88))
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }
                }
                .frame(maxWidth: .infinity)

                // Trailing: how long it's been on the stove.
                HStack(spacing: 5) {
                    if let start = lead?.turnStartedAt {
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            let text = Format.clock(context.date.timeIntervalSince(start))
                            Text(text)
                                .font(.system(size: 11.5, weight: .semibold, design: .rounded).monospacedDigit())
                                .foregroundStyle(.white.opacity(0.92))
                                .numericTransition()
                                .animation(.spring(response: 0.25, dampingFraction: 0.9), value: text)
                        }
                    }
                    if sessions.count > 1 {
                        Text("\(sessions.count)")
                            .font(.system(size: 9, weight: .heavy, design: .rounded))
                            .foregroundStyle(.black)
                            .frame(minWidth: 14, minHeight: 14)
                            .background(Circle().fill(.white.opacity(0.9)))
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .frame(width: IslandLayout.compactSideWidth, alignment: .center)
            }
            .frame(height: geometry.docked ? geometry.notchSize.height : IslandLayout.floatingCompactHeight)

            if !waiting && !reduceMotion {
                CookingShimmer(tint: lead?.agent.tint ?? .orange)
                    .padding(.horizontal, geometry.docked ? 12 : 18)
                    .padding(.bottom, 1)
            }
        }
        // Every tool call is a heartbeat.
        .onReceive(model.pulses.filter { $0.kind == .beat || $0.kind == .start }) { _ in
            withAnimation(.easeOut(duration: 0.12)) { glow = true }
            withAnimation(.easeIn(duration: 0.5).delay(0.12)) { glow = false }
        }
    }
}

// MARK: Spotlight: the "it's done" moment

private struct SpotlightCard: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: Preferences
    let spotlight: Spotlight

    var body: some View {
        let session = spotlight.session
        let hovering = model.pointerInside

        ZStack(alignment: .topTrailing) {
            HStack(alignment: .center, spacing: 14) {
                Group {
                    if spotlight.kind == .finished {
                        SuccessMark(tint: .green, size: 48)
                    } else {
                        ZStack {
                            Circle().fill(Color.yellow.opacity(0.18))
                            AttentionHand(size: 20)
                        }
                        .frame(width: 48, height: 48)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Image(systemName: session.agent.symbol)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(session.agent.tint)
                        Text(title(for: session))
                            .font(.system(size: 13.5, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                    }
                    .staggered(0)

                    Text(subtitle(for: session))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.55))
                        .lineLimit(1)
                        .staggered(1)

                    if let detail = detail(for: session) {
                        Text(detail)
                            .font(.system(size: 11))
                            .foregroundStyle(.white.opacity(0.82))
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                            .staggered(2)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 22)
            .padding(.top, 12)
            .padding(.bottom, 14)

            // Hover affordances: where a click goes, and a way out.
            HStack(spacing: 6) {
                if let bundleID = session.hostAppBundleID, prefs.returnToTerminalOnClick {
                    HostAppChip(bundleID: bundleID)
                }
                Button {
                    model.clearSpotlight()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 20, height: 20)
                        .background(Circle().fill(.white.opacity(0.12)))
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 8)
            .padding(.trailing, 14)
            .opacity(hovering ? 1 : 0)
            .offset(y: hovering ? 0 : -4)
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: hovering)
        }
        .overlay(alignment: .bottom) {
            if spotlight.kind == .finished {
                CountdownBar(seconds: prefs.celebrateSeconds, tint: session.agent.tint)
                    .padding(.horizontal, 30)
                    .padding(.bottom, 6)
                    .opacity(hovering ? 0 : 1)
                    .animation(.easeOut(duration: 0.2), value: hovering)
            }
        }
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
                ForEach(Array(sessions.prefix(IslandLayout.maxRows).enumerated()), id: \.element.id) { index, session in
                    HoverRow {
                        SessionRow(session: session, now: context.date)
                    } action: {
                        model.focusHost(of: session)
                    }
                    .frame(height: IslandLayout.rowHeight)
                    .staggered(index)
                }
            }
            .padding(.horizontal, 10)
        }
    }
}

/// A row that lights up and shows a chevron under the pointer.
struct HoverRow<Content: View>: View {
    var dark = true
    @ViewBuilder let content: () -> Content
    let action: () -> Void
    @State private var hovering = false

    var body: some View {
        HStack(spacing: 6) {
            content()
            Image(systemName: "arrow.up.right")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(dark ? Color.white.opacity(0.5) : Color.secondary)
                .opacity(hovering ? 1 : 0)
                .offset(x: hovering ? 0 : -4)
        }
        .padding(.horizontal, 8)
        .frame(maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(dark ? Color.white.opacity(hovering ? 0.08 : 0) : Color.primary.opacity(hovering ? 0.06 : 0))
        )
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        .onTapGesture(perform: action)
        .animation(.easeOut(duration: 0.15), value: hovering)
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
                    .numericTransition()
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
