// Clippy content script.
//
// Draws the blue cursor + response bubble on top of the current page,
// handles push-to-talk voice capture via Web Speech API, speaks Claude's
// responses via speechSynthesis, and animates the cursor to the coordinates
// Claude returns in [POINT:x,y:label] tags.
//
// Everything is rendered inside a Shadow DOM so the page's CSS can't touch
// Clippy and Clippy's CSS can't leak into the page.

(() => {
  // Parse the [POINT:...] tag at the end of Claude's response. Inlined here
  // because content scripts don't use ES modules — importing from lib/ would
  // need manifest `web_accessible_resources` + dynamic import, which is
  // fragile. The regex matches the one in lib/pointing.js exactly.
  const pointTagRegex = /\[POINT:(?:none|(\d+)\s*,\s*(\d+)(?::([^\]:\s][^\]:]*?))?(?::screen(\d+))?)\]\s*$/;

  function parsePointingCoordinatesFromResponse(responseText) {
    const match = responseText.match(pointTagRegex);
    if (!match) {
      return { spokenText: responseText.trim(), coordinate: null, label: "" };
    }
    const spokenText = responseText.slice(0, match.index).trim();
    if (match[1] === undefined || match[2] === undefined) {
      return { spokenText, coordinate: null, label: "none" };
    }
    const xPixel = parseInt(match[1], 10);
    const yPixel = parseInt(match[2], 10);
    if (Number.isNaN(xPixel) || Number.isNaN(yPixel)) {
      return { spokenText, coordinate: null, label: "" };
    }
    return {
      spokenText,
      coordinate: { x: xPixel, y: yPixel },
      label: (match[3] || "").trim(),
    };
  }

  // ----- Overlay (cursor + bubble + waveform) ---------------------------

  const overlayRootElement = document.createElement("div");
  overlayRootElement.id = "clippy-overlay-root";
  overlayRootElement.style.position = "fixed";
  overlayRootElement.style.top = "0";
  overlayRootElement.style.left = "0";
  overlayRootElement.style.width = "0";
  overlayRootElement.style.height = "0";
  overlayRootElement.style.zIndex = "2147483647";
  overlayRootElement.style.pointerEvents = "none";

  const shadowRoot = overlayRootElement.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; }
      .clippy-stage {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      }
      .clippy-cursor-wrapper {
        position: absolute;
        left: 40px;
        top: 40px;
        width: 56px;
        height: 56px;
        transform: translate(-50%, -50%);
        transition: left 900ms cubic-bezier(.2,.8,.2,1),
                    top  900ms cubic-bezier(.2,.8,.2,1),
                    opacity 280ms ease;
        opacity: 0;
        will-change: left, top, opacity;
      }
      .clippy-cursor-wrapper.clippy-visible { opacity: 1; }
      .clippy-cursor-glow {
        position: absolute;
        inset: -12px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(66,133,244,.55) 0%, rgba(66,133,244,0) 60%);
        filter: blur(2px);
        animation: clippy-pulse 1.8s ease-in-out infinite;
      }
      @keyframes clippy-pulse {
        0%,100% { transform: scale(1);   opacity: .75; }
        50%     { transform: scale(1.18); opacity: 1;   }
      }
      .clippy-cursor-triangle {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .clippy-bubble {
        position: absolute;
        left: 80px;
        top: 40px;
        max-width: 360px;
        min-width: 80px;
        padding: 14px 18px;
        border-radius: 18px;
        background: rgba(18,18,22,.92);
        color: #f6f7fb;
        font-size: 15px;
        line-height: 1.45;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,.08);
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 220ms ease, transform 220ms ease,
                    left 900ms cubic-bezier(.2,.8,.2,1),
                    top  900ms cubic-bezier(.2,.8,.2,1);
        pointer-events: none;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .clippy-bubble.clippy-visible {
        opacity: 1;
        transform: translateY(0);
      }
      .clippy-bubble-status {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #9aa0a6;
        font-weight: 500;
        font-size: 13px;
      }
      .clippy-waveform {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 16px;
      }
      .clippy-waveform-bar {
        width: 3px;
        height: 6px;
        background: #4285f4;
        border-radius: 2px;
        animation: clippy-wave 1.1s ease-in-out infinite;
      }
      .clippy-waveform-bar:nth-child(2) { animation-delay: .10s; }
      .clippy-waveform-bar:nth-child(3) { animation-delay: .20s; }
      .clippy-waveform-bar:nth-child(4) { animation-delay: .30s; }
      .clippy-waveform-bar:nth-child(5) { animation-delay: .40s; }
      @keyframes clippy-wave {
        0%,100% { height: 6px; }
        50%     { height: 16px; }
      }
      .clippy-spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.18);
        border-top-color: #4285f4;
        animation: clippy-spin .8s linear infinite;
      }
      @keyframes clippy-spin { to { transform: rotate(360deg); } }
      .clippy-element-highlight {
        position: absolute;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid #4285f4;
        transform: translate(-50%, -50%) scale(.4);
        opacity: 0;
        transition: opacity 300ms ease, transform 500ms cubic-bezier(.2,.8,.2,1);
        pointer-events: none;
      }
      .clippy-element-highlight.clippy-visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    </style>
    <div class="clippy-stage" part="stage">
      <div class="clippy-cursor-wrapper" id="clippy-cursor-wrapper">
        <div class="clippy-cursor-glow"></div>
        <div class="clippy-cursor-triangle">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="clippy-triangle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"  stop-color="#4285f4"/>
                <stop offset="100%" stop-color="#1f6fd6"/>
              </linearGradient>
            </defs>
            <path d="M 6 4 L 32 20 L 16 22 L 12 34 Z"
                  fill="url(#clippy-triangle-gradient)"
                  stroke="#ffffff"
                  stroke-width="1.5"
                  stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="clippy-bubble" id="clippy-bubble">
        <div id="clippy-bubble-content"></div>
      </div>
      <div class="clippy-element-highlight" id="clippy-element-highlight"></div>
    </div>
  `;

  document.documentElement.appendChild(overlayRootElement);

  const cursorWrapperElement = shadowRoot.getElementById("clippy-cursor-wrapper");
  const bubbleElement = shadowRoot.getElementById("clippy-bubble");
  const bubbleContentElement = shadowRoot.getElementById("clippy-bubble-content");
  const elementHighlightElement = shadowRoot.getElementById("clippy-element-highlight");

  let isOverlayVisible = false;
  let autoHideTimeoutHandle = null;

  function showOverlay() {
    if (autoHideTimeoutHandle) {
      clearTimeout(autoHideTimeoutHandle);
      autoHideTimeoutHandle = null;
    }
    if (isOverlayVisible) return;
    isOverlayVisible = true;
    positionCursorNearViewportCorner();
    cursorWrapperElement.classList.add("clippy-visible");
    bubbleElement.classList.add("clippy-visible");
  }

  function scheduleOverlayAutoHide(millisecondsOfInactivity) {
    if (autoHideTimeoutHandle) clearTimeout(autoHideTimeoutHandle);
    autoHideTimeoutHandle = setTimeout(() => {
      hideOverlay();
    }, millisecondsOfInactivity);
  }

  function hideOverlay() {
    isOverlayVisible = false;
    cursorWrapperElement.classList.remove("clippy-visible");
    bubbleElement.classList.remove("clippy-visible");
    elementHighlightElement.classList.remove("clippy-visible");
  }

  function positionCursorNearViewportCorner() {
    // Park the cursor in the upper-left area of the viewport so the bubble
    // has room to grow to the right. The bubble sticks to the cursor via an
    // absolute offset.
    setCursorAndBubblePosition(120, 120);
  }

  function setCursorAndBubblePosition(viewportXInPixels, viewportYInPixels) {
    cursorWrapperElement.style.left = `${viewportXInPixels}px`;
    cursorWrapperElement.style.top = `${viewportYInPixels}px`;
    // Bubble is offset to the right of the cursor unless near the right
    // edge, in which case we flip it to the left.
    const viewportWidth = window.innerWidth;
    const bubbleGoesLeft = viewportXInPixels > viewportWidth - 420;
    bubbleElement.style.left = bubbleGoesLeft
      ? `${viewportXInPixels - 380}px`
      : `${viewportXInPixels + 40}px`;
    bubbleElement.style.top = `${Math.max(16, viewportYInPixels - 20)}px`;
  }

  function setBubbleToListeningState() {
    bubbleContentElement.innerHTML = `
      <div class="clippy-bubble-status">
        <div class="clippy-waveform">
          <div class="clippy-waveform-bar"></div>
          <div class="clippy-waveform-bar"></div>
          <div class="clippy-waveform-bar"></div>
          <div class="clippy-waveform-bar"></div>
          <div class="clippy-waveform-bar"></div>
        </div>
        <span>listening…</span>
      </div>
    `;
  }

  function setBubbleToProcessingState() {
    bubbleContentElement.innerHTML = `
      <div class="clippy-bubble-status">
        <div class="clippy-spinner"></div>
        <span>thinking…</span>
      </div>
    `;
  }

  function setBubbleToRespondingStateWithText(currentResponseText) {
    bubbleContentElement.textContent = currentResponseText;
  }

  function setBubbleToErrorStateWithMessage(errorMessage) {
    bubbleContentElement.innerHTML = "";
    const errorNode = document.createElement("div");
    errorNode.textContent = errorMessage;
    errorNode.style.color = "#ff8a8a";
    errorNode.style.fontWeight = "500";
    bubbleContentElement.appendChild(errorNode);
  }

  // Animate the cursor to a point in the page viewport and show a brief
  // highlight ring. `screenshotXInPixels` and `screenshotYInPixels` are in
  // the screenshot's coordinate space; captureVisibleTab captures the
  // visible viewport at devicePixelRatio so we divide to map back to CSS
  // viewport pixels.
  function flyCursorToScreenshotCoordinate({
    screenshotXInPixels,
    screenshotYInPixels,
    screenshotWidthInPixels,
    screenshotHeightInPixels,
  }) {
    const horizontalScaleFactor = window.innerWidth / screenshotWidthInPixels;
    const verticalScaleFactor = window.innerHeight / screenshotHeightInPixels;
    const viewportXInPixels = Math.round(screenshotXInPixels * horizontalScaleFactor);
    const viewportYInPixels = Math.round(screenshotYInPixels * verticalScaleFactor);

    setCursorAndBubblePosition(viewportXInPixels, viewportYInPixels);

    // Pulse the highlight ring at the target.
    elementHighlightElement.style.left = `${viewportXInPixels}px`;
    elementHighlightElement.style.top = `${viewportYInPixels}px`;
    elementHighlightElement.classList.remove("clippy-visible");
    // Force reflow so the restart animation plays.
    // eslint-disable-next-line no-unused-expressions
    elementHighlightElement.offsetWidth;
    elementHighlightElement.classList.add("clippy-visible");
    setTimeout(() => {
      elementHighlightElement.classList.remove("clippy-visible");
    }, 1800);
  }

  // ----- Speech recognition (push-to-talk) ------------------------------

  const BrowserSpeechRecognitionConstructor =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let activeSpeechRecognitionSession = null;
  let isCurrentlyListeningForSpeech = false;

  function startListeningForPushToTalk() {
    if (isCurrentlyListeningForSpeech) {
      stopListeningForPushToTalk();
      return;
    }
    if (!BrowserSpeechRecognitionConstructor) {
      showOverlay();
      setBubbleToErrorStateWithMessage(
        "Your browser doesn't support the built-in Web Speech API. Try Chrome on desktop."
      );
      scheduleOverlayAutoHide(4000);
      return;
    }

    showOverlay();
    setBubbleToListeningState();

    const speechRecognitionSession = new BrowserSpeechRecognitionConstructor();
    speechRecognitionSession.lang = navigator.language || "en-US";
    speechRecognitionSession.interimResults = true;
    speechRecognitionSession.continuous = false;
    speechRecognitionSession.maxAlternatives = 1;

    let finalizedTranscriptText = "";

    speechRecognitionSession.onresult = (recognitionEvent) => {
      let interimTranscriptText = "";
      for (let resultIndex = recognitionEvent.resultIndex; resultIndex < recognitionEvent.results.length; resultIndex++) {
        const speechResult = recognitionEvent.results[resultIndex];
        if (speechResult.isFinal) {
          finalizedTranscriptText += speechResult[0].transcript;
        } else {
          interimTranscriptText += speechResult[0].transcript;
        }
      }
      if (interimTranscriptText) {
        bubbleContentElement.innerHTML = "";
        const interimNode = document.createElement("div");
        interimNode.style.color = "#cdd0d7";
        interimNode.textContent = interimTranscriptText;
        bubbleContentElement.appendChild(interimNode);
      }
    };

    speechRecognitionSession.onerror = (speechError) => {
      isCurrentlyListeningForSpeech = false;
      activeSpeechRecognitionSession = null;
      const reasonText =
        speechError && speechError.error
          ? `Speech recognition error: ${speechError.error}`
          : "Speech recognition error.";
      setBubbleToErrorStateWithMessage(reasonText);
      scheduleOverlayAutoHide(3500);
    };

    speechRecognitionSession.onend = () => {
      isCurrentlyListeningForSpeech = false;
      activeSpeechRecognitionSession = null;
      const trimmedFinalTranscriptText = finalizedTranscriptText.trim();
      if (trimmedFinalTranscriptText.length === 0) {
        scheduleOverlayAutoHide(1500);
        return;
      }
      runFullClaudeTurnForTranscript(trimmedFinalTranscriptText).catch((error) => {
        setBubbleToErrorStateWithMessage(error.message || String(error));
        scheduleOverlayAutoHide(5000);
      });
    };

    try {
      speechRecognitionSession.start();
      isCurrentlyListeningForSpeech = true;
      activeSpeechRecognitionSession = speechRecognitionSession;
    } catch (startError) {
      setBubbleToErrorStateWithMessage(
        "Couldn't start the microphone. Click the extension icon to check permissions."
      );
      scheduleOverlayAutoHide(4000);
    }
  }

  function stopListeningForPushToTalk() {
    if (activeSpeechRecognitionSession) {
      try {
        activeSpeechRecognitionSession.stop();
      } catch {
        // ignore
      }
    }
  }

  // ----- The Claude turn -------------------------------------------------

  // Per-page conversation memory. Wiped on navigation (the content script
  // restarts automatically because it runs at document_idle).
  const conversationHistoryMessages = [];

  async function runFullClaudeTurnForTranscript(userTranscriptText) {
    setBubbleToProcessingState();

    // Stop any ongoing TTS before starting a new turn.
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const captureResponse = await sendMessageToBackground({
      kind: "clippy.captureVisibleTabScreenshot",
    });
    if (!captureResponse.ok) {
      throw new Error(captureResponse.error || "Screenshot failed.");
    }
    const {
      screenshotDataUrl,
      widthInPixels: screenshotWidthInPixels,
      heightInPixels: screenshotHeightInPixels,
    } = captureResponse.value;

    // Listen for streamed text deltas from the service worker.
    let streamedResponseText = "";
    const deltaMessageListener = (incomingMessage) => {
      if (incomingMessage && incomingMessage.kind === "clippy.claudeTextDelta") {
        streamedResponseText += incomingMessage.textDelta;
        // Strip any in-progress POINT tag from the visible text as it streams.
        const { spokenText: visibleStreamingText } =
          parsePointingCoordinatesFromResponse(streamedResponseText);
        setBubbleToRespondingStateWithText(visibleStreamingText || streamedResponseText);
      }
    };
    chrome.runtime.onMessage.addListener(deltaMessageListener);

    let turnResponse;
    try {
      turnResponse = await sendMessageToBackground({
        kind: "clippy.runClaudeTurn",
        userTranscriptText,
        screenshotDataUrl,
        screenshotWidthInPixels,
        screenshotHeightInPixels,
        conversationHistoryMessages,
      });
    } finally {
      chrome.runtime.onMessage.removeListener(deltaMessageListener);
    }

    if (!turnResponse.ok) {
      throw new Error(turnResponse.error || "Claude request failed.");
    }

    const fullResponseText = (turnResponse.value && turnResponse.value.fullResponseText) || streamedResponseText;
    const { spokenText, coordinate: pointingCoordinate, label: pointingLabel } =
      parsePointingCoordinatesFromResponse(fullResponseText);

    setBubbleToRespondingStateWithText(spokenText);

    // Persist the turn so follow-ups stay in context.
    conversationHistoryMessages.push({
      role: "user",
      content: [{ type: "text", text: userTranscriptText }],
    });
    conversationHistoryMessages.push({
      role: "assistant",
      content: [{ type: "text", text: fullResponseText }],
    });
    // Cap history to avoid sending huge payloads to Claude.
    while (conversationHistoryMessages.length > 24) {
      conversationHistoryMessages.shift();
    }

    speakTextWithBrowserTextToSpeech(spokenText);

    if (pointingCoordinate) {
      flyCursorToScreenshotCoordinate({
        screenshotXInPixels: pointingCoordinate.x,
        screenshotYInPixels: pointingCoordinate.y,
        screenshotWidthInPixels,
        screenshotHeightInPixels,
      });
      // Keep overlay around longer when we're pointing so the user can see it.
      scheduleOverlayAutoHide(9000);
    } else {
      scheduleOverlayAutoHide(7000);
    }

    // Ignore "pointing to nothing" labels for analytics / logs.
    void pointingLabel;
  }

  function speakTextWithBrowserTextToSpeech(textToSpeak) {
    if (!textToSpeak || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Prefer an English voice if one is installed, otherwise fall back to
    // the browser default.
    const availableVoices = window.speechSynthesis.getVoices();
    const preferredVoice = availableVoices.find((voice) => /en[-_]US/i.test(voice.lang))
      || availableVoices.find((voice) => /^en/i.test(voice.lang))
      || null;
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  }

  // ----- Messaging helper -----------------------------------------------

  function sendMessageToBackground(messagePayload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(messagePayload, (backgroundResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(backgroundResponse || { ok: false, error: "No response from Clippy." });
      });
    });
  }

  // ----- Listen for the shortcut from the service worker ----------------

  chrome.runtime.onMessage.addListener((incomingMessage) => {
    if (incomingMessage && incomingMessage.kind === "clippy.pushToTalkShortcutFired") {
      startListeningForPushToTalk();
    }
  });
})();
