// Clippy background service worker.
//
// Responsibilities:
//   - Listen for the keyboard shortcut and forward press/release events to
//     the active tab's content script so it can run push-to-talk.
//   - Capture the visible tab as a PNG when the content script asks.
//   - Call the Claude API with the transcript + screenshot and stream the
//     response text back to the content script.
//   - Verify the user's Gumroad license key and gate all of the above
//     behind a valid license + Anthropic API key.
//
// The service worker has no DOM and can't touch the microphone directly —
// that work lives in the content script where browser APIs like
// SpeechRecognition and speechSynthesis are available.

import { GUMROAD_PRODUCT_PERMALINK } from "./config.js";
import { streamClaudeResponse } from "./lib/claude.js";
import { verifyGumroadLicenseKey } from "./lib/gumroad.js";
import { CLIPPY_VOICE_SYSTEM_PROMPT } from "./lib/prompt.js";
import { loadClippySettings, saveLicenseVerificationStatus } from "./lib/storage.js";

// Open the popup on first install so users immediately see the setup flow.
chrome.runtime.onInstalled.addListener((installDetails) => {
  if (installDetails.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?firstRun=1") });
  }
});

// Keyboard shortcut: forward press + release to the active tab. Chrome only
// fires commands on keydown, so "release" is simulated on the content-script
// side by measuring how long the user held the key.
chrome.commands.onCommand.addListener(async (commandName) => {
  if (commandName !== "toggle-push-to-talk") return;

  const activeTab = await getActiveTabOrNull();
  if (!activeTab || !isContentScriptableUrl(activeTab.url)) {
    return;
  }

  await chrome.tabs.sendMessage(activeTab.id, {
    kind: "clippy.pushToTalkShortcutFired",
  }).catch(() => {
    // No content script on this tab (e.g., chrome:// page). Silently ignore.
  });
});

// Message router. Content script and popup both talk to the service worker
// via chrome.runtime.sendMessage; each message has a `kind` discriminator.
chrome.runtime.onMessage.addListener((incomingMessage, sender, sendResponse) => {
  handleIncomingMessage(incomingMessage, sender)
    .then((responseValue) => sendResponse({ ok: true, value: responseValue }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  // Returning true keeps the sendResponse channel open for async handlers.
  return true;
});

async function handleIncomingMessage(incomingMessage, sender) {
  switch (incomingMessage.kind) {
    case "clippy.captureVisibleTabScreenshot":
      return await captureVisibleTabScreenshot(sender);

    case "clippy.runClaudeTurn":
      return await runClaudeTurn(incomingMessage, sender);

    case "clippy.verifyLicenseKey":
      return await runLicenseVerification(incomingMessage);

    case "clippy.openPopupConfigTab":
      await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      return { opened: true };

    default:
      throw new Error(`Unknown Clippy message kind: ${incomingMessage.kind}`);
  }
}

async function captureVisibleTabScreenshot(sender) {
  const senderTab = sender && sender.tab;
  if (!senderTab) {
    throw new Error("Cannot capture screenshot: unknown sender tab.");
  }

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(senderTab.windowId, {
    format: "png",
  });

  // Measure the screenshot dimensions so Claude knows the coordinate space
  // for the [POINT:x,y] tag. We can't use Image in a service worker; instead
  // we ask the content script to read the data URL dimensions off an <img>.
  // Simpler: decode the PNG header ourselves — PNG width/height live at
  // bytes 16..23 after the 8-byte signature.
  const dimensions = readPngWidthAndHeightFromDataUrl(screenshotDataUrl);

  return {
    screenshotDataUrl,
    widthInPixels: dimensions.widthInPixels,
    heightInPixels: dimensions.heightInPixels,
  };
}

function readPngWidthAndHeightFromDataUrl(pngDataUrl) {
  const commaIndex = pngDataUrl.indexOf(",");
  const base64Payload = commaIndex === -1 ? pngDataUrl : pngDataUrl.slice(commaIndex + 1);
  const binaryString = atob(base64Payload.slice(0, 64));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const readUint32BigEndian = (startOffset) =>
    (bytes[startOffset] << 24) |
    (bytes[startOffset + 1] << 16) |
    (bytes[startOffset + 2] << 8) |
    bytes[startOffset + 3];
  return {
    widthInPixels: readUint32BigEndian(16),
    heightInPixels: readUint32BigEndian(20),
  };
}

// Tracks in-flight Claude requests per tab so we can cancel a stream if the
// user fires push-to-talk again before the previous response finishes.
const inFlightAbortControllersByTabId = new Map();

async function runClaudeTurn(incomingMessage, sender) {
  const senderTab = sender && sender.tab;
  if (!senderTab) throw new Error("runClaudeTurn called without a sender tab.");

  const clippySettings = await loadClippySettings();

  // Gate: must have a verified license AND an Anthropic API key.
  if (!clippySettings.licenseIsVerified) {
    throw new Error("Clippy is locked. Open the extension and activate your license.");
  }
  if (!clippySettings.anthropicApiKey) {
    throw new Error("No Anthropic API key set. Open Clippy and paste your key.");
  }

  // Cancel any prior in-flight request for this tab.
  const previousAbortController = inFlightAbortControllersByTabId.get(senderTab.id);
  if (previousAbortController) previousAbortController.abort();

  const abortController = new AbortController();
  inFlightAbortControllersByTabId.set(senderTab.id, abortController);

  // Decorate the user's transcript with the screenshot dimensions so Claude
  // knows the coordinate space for POINT tags.
  const screenshotLabelText =
    `[screenshot of current tab, ${incomingMessage.screenshotWidthInPixels}x` +
    `${incomingMessage.screenshotHeightInPixels} pixels]`;
  const userMessageTextWithLabel = `${screenshotLabelText}\n\n${incomingMessage.userTranscriptText}`;

  try {
    const fullResponseText = await streamClaudeResponse({
      anthropicApiKey: clippySettings.anthropicApiKey,
      modelId: clippySettings.selectedModelId,
      systemPrompt: CLIPPY_VOICE_SYSTEM_PROMPT,
      conversationHistoryMessages: incomingMessage.conversationHistoryMessages || [],
      newUserText: userMessageTextWithLabel,
      screenshotDataUrl: incomingMessage.screenshotDataUrl,
      abortSignal: abortController.signal,
      onTextDelta: (textDelta) => {
        chrome.tabs.sendMessage(senderTab.id, {
          kind: "clippy.claudeTextDelta",
          textDelta,
        }).catch(() => {
          // tab might have closed mid-stream; swallow
        });
      },
    });

    return { fullResponseText };
  } finally {
    if (inFlightAbortControllersByTabId.get(senderTab.id) === abortController) {
      inFlightAbortControllersByTabId.delete(senderTab.id);
    }
  }
}

async function runLicenseVerification(incomingMessage) {
  const verificationResult = await verifyGumroadLicenseKey({
    productPermalink: GUMROAD_PRODUCT_PERMALINK,
    licenseKey: incomingMessage.licenseKey,
  });

  await saveLicenseVerificationStatus(verificationResult.ok === true);
  return verificationResult;
}

async function getActiveTabOrNull() {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return activeTab || null;
}

function isContentScriptableUrl(url) {
  if (!url) return false;
  if (url.startsWith("chrome://")) return false;
  if (url.startsWith("chrome-extension://")) return false;
  if (url.startsWith("edge://")) return false;
  if (url.startsWith("about:")) return false;
  if (url.startsWith("https://chromewebstore.google.com/")) return false;
  return true;
}
