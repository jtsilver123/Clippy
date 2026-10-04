import Foundation

/// Watches Codex's rollout files (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) and turns new
/// lines into events. This works with zero Codex configuration and is what tells us a Codex turn
/// *started* — the `notify` hook only fires at the end.
public final class CodexRolloutTailer {
    public let root: URL
    public var onEvent: (AgentEvent) -> Void = { _ in }

    private struct FileState {
        var offset: UInt64
        var sessionID: String
        var cwd: String?
        var partial = Data()
    }

    private var files: [String: FileState] = [:]
    private var primed = false
    private let fileManager = FileManager.default

    public init(root: URL) {
        self.root = root
    }

    public static var defaultRoot: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex/sessions", isDirectory: true)
    }

    /// Call periodically (about once a second). The first call only records where existing files
    /// end so history isn't replayed.
    public func poll(now: Date = Date()) {
        for url in candidateFiles(now: now) {
            let path = url.path
            guard let size = (try? fileManager.attributesOfItem(atPath: path))?[.size] as? UInt64 else { continue }

            if var state = files[path] {
                guard size > state.offset else {
                    if size < state.offset { state.offset = 0; state.partial = Data(); files[path] = state }
                    continue
                }
                read(path: path, state: &state, upTo: size, emit: true, now: now)
                files[path] = state
            } else {
                var state = FileState(offset: 0, sessionID: Self.sessionID(fromFileName: url.lastPathComponent))
                // A file that already existed at launch: read it silently for metadata only.
                read(path: path, state: &state, upTo: size, emit: primed, now: now)
                files[path] = state
            }
        }
        primed = true
    }

    private func read(path: String, state: inout FileState, upTo size: UInt64, emit: Bool, now: Date) {
        guard let handle = FileHandle(forReadingAtPath: path) else { return }
        defer { try? handle.close() }
        // Don't slurp megabytes of history just to find the session_meta line.
        let start = emit ? state.offset : 0
        let limit = emit ? size - start : min(size, 64 * 1024)
        handle.seek(toFileOffset: start)
        let chunk = handle.readData(ofLength: Int(limit))
        state.offset = emit ? start + UInt64(chunk.count) : size

        var buffer = emit ? state.partial + chunk : chunk
        while let newline = buffer.firstIndex(of: 0x0A) {
            let line = buffer[buffer.startIndex..<newline]
            buffer = Data(buffer[buffer.index(after: newline)...])
            process(line: Data(line), state: &state, emit: emit, now: now)
        }
        state.partial = emit ? buffer : Data()
    }

    private func process(line: Data, state: inout FileState, emit: Bool, now: Date) {
        guard let parsed = EventParser.parseCodexRolloutLine(line) else { return }
        switch parsed {
        case let .meta(id, cwd):
            if let id, !id.isEmpty { state.sessionID = id }
            if let cwd { state.cwd = cwd }
        case let .event(kind):
            guard emit else { return }
            onEvent(AgentEvent(agent: .codex, sessionID: state.sessionID, cwd: state.cwd, kind: kind, date: now))
        }
    }

    /// Today's and yesterday's day folders (in both local time and UTC, since that's an
    /// implementation detail of Codex), plus the legacy flat layout.
    private func candidateFiles(now: Date) -> [URL] {
        var dirs: [URL] = [root]
        var seen = Set<String>()
        for timeZone in [TimeZone.current, TimeZone(identifier: "UTC")!] {
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = timeZone
            for dayOffset in [0, -1] {
                guard let day = calendar.date(byAdding: .day, value: dayOffset, to: now) else { continue }
                let c = calendar.dateComponents([.year, .month, .day], from: day)
                let rel = String(format: "%04d/%02d/%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
                if seen.insert(rel).inserted { dirs.append(root.appendingPathComponent(rel, isDirectory: true)) }
            }
        }

        var result: [URL] = []
        for dir in dirs {
            guard let names = try? fileManager.contentsOfDirectory(atPath: dir.path) else { continue }
            for name in names where name.hasPrefix("rollout-") && name.hasSuffix(".jsonl") {
                result.append(dir.appendingPathComponent(name))
            }
        }
        return result
    }

    /// `rollout-2025-05-07T17-24-21-5973b6c0-94b8-487b-a530-2aeb6098ae0e.jsonl` → the trailing UUID.
    public static func sessionID(fromFileName name: String) -> String {
        let base = name.hasSuffix(".jsonl") ? String(name.dropLast(6)) : name
        guard base.count >= 36 else { return base }
        let tail = String(base.suffix(36))
        return UUID(uuidString: tail) != nil ? tail.lowercased() : base
    }
}
