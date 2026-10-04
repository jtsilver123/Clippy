# Cooked

A Mac menu bar app that turns your notch into a Dynamic Island for coding agents.
Fire off a prompt in **Claude Code** or **Codex**, go do something else, and the
island tells you when it's done cooking.

## Two modes

**Island.** Just the notifier. While an agent works, the notch grows into a
little Live Activity: a flickering flame on the left, a timer on the right. When
the turn finishes it drops down into a card ("Claude Code is done cooking ·
pancake-stack · cooked for 3m 12s") with the last thing the agent said, and plays
a sound. If the agent is stuck on a permission prompt, the island turns amber and
says so. Click the card to jump back to the terminal it came from. Hover the notch
any time to see everything on the stove.

**Visualizer.** Everything above, plus an iTunes-style visualizer that opens
(full screen by default) as soon as something starts cooking. There's no music,
so the agent plays the part: every tool call is a beat, a new prompt is a drop,
and a finished turn sets off fireworks. Then it closes and hands focus back to
your terminal. There are three looks (← / → to switch, F for full screen, esc to close):

- **Magnetosphere**: hundreds of glowing particles swarming drifting attractors
- **Ribbons**: mirrored Lissajous light trails
- **Warp**: a starfield that speeds up the harder the agent works

Colors follow the agent: warm orange for Claude Code, blue for Codex.

Macs without a notch get a matching pill hanging from the menu bar.

## How it knows

Cooked runs a tiny HTTP server on `127.0.0.1:47823` (loopback only).

- **Claude Code**: Settings → Connect adds [hooks](https://docs.claude.com/en/docs/claude-code/hooks)
  to `~/.claude/settings.json` for `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
  `Notification`, `Stop`, `SessionStart` and `SessionEnd`. Each one is a
  `curl … || true` that does nothing when Cooked isn't running. Start new Claude
  Code sessions after connecting.
- **Codex**: works with no setup. Cooked tails Codex's session logs in
  `~/.codex/sessions/` to see turns start, make progress and finish. You can also
  connect Codex's `notify` hook in `~/.codex/config.toml` as a backup signal. If
  you already have a `notify` program, Cooked leaves it alone and shows the line
  to add to your script.

Cooked saves the original as `settings.json.cooked-backup` / `config.toml.cooked-backup`
before its first edit, tags everything it adds with `cooked-hook`, and **Remove**
takes all of it back out.

## Build and run

Requires macOS 13+ and Xcode 15+ (or the matching Swift toolchain).

```sh
swift run Cooked            # run from source
./scripts/bundle.sh         # build/Cooked.app (ad-hoc signed) + build/Cooked.zip
swift test                  # core tests (also run on Linux)
```

To try it without an agent, open the menu bar flame → **Try it**, or run:

```sh
./scripts/fake-turn.sh          # fake Claude Code turn
./scripts/fake-turn.sh codex 5  # fake Codex finish
```

## Layout

```
Sources/CookedCore/   Pure Foundation, unit-tested on Linux too
  AgentEvent.swift          hook / notify / rollout payload parsing
  SessionStore.swift        the cooking state machine (idle → cooking ⇄ needs input → done)
  HTTP.swift                minimal HTTP parsing and routing
  HookInstaller.swift       safe, idempotent edits to the Claude and Codex configs
  CodexRolloutTailer.swift  zero-config Codex detection
  ClaudeTranscript.swift    pulls the final message out of a transcript
Sources/Cooked/       The macOS app (SwiftUI + AppKit)
  AppModel.swift            wires events to the island, sounds and visualizer
  EventServer.swift         Network.framework listener
  Island/                   notch geometry, morphing notch shape, panel and views
  Visualizer/               Canvas-based visualizer engine, view and window
  UI/                       menu bar popover and settings
```
