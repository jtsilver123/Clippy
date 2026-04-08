// Clippy popup controller.
//
// Handles the setup UI: Anthropic API key entry, Gumroad license activation,
// model selection, and reset. All persistent state lives in chrome.storage
// via lib/storage.js; license verification is delegated to the background
// service worker so the verification logic lives in exactly one place.

import { CLAUDE_MODELS, GUMROAD_BUY_URL, GUMROAD_PRODUCT_ID } from "./config.js";
import {
  loadClippySettings,
  resetAllClippySettings,
  saveAnthropicApiKey,
  saveLicenseKey,
  saveSelectedModelId,
} from "./lib/storage.js";

const anthropicKeyInputElement = document.getElementById("clippy-anthropic-key-input");
const saveAnthropicKeyButton = document.getElementById("clippy-save-anthropic-key-button");
const licenseKeyInputElement = document.getElementById("clippy-license-key-input");
const activateLicenseButton = document.getElementById("clippy-activate-license-button");
const buyLicenseLinkElement = document.getElementById("clippy-buy-license-link");
const modelPickerElement = document.getElementById("clippy-model-picker");
const statusSubtitleElement = document.getElementById("clippy-status-subtitle");
const licenseHelpTextElement = document.getElementById("clippy-license-help-text");
const resetButton = document.getElementById("clippy-reset-button");
const shortcutLabelElement = document.getElementById("clippy-shortcut-label");

// ----- Initial render -------------------------------------------------

populateModelPicker();
updateBuyLicenseLink();
updatePlatformAwareShortcutLabel();
renderSettingsFromStorage();

function populateModelPicker() {
  for (const [modelId, modelMetadata] of Object.entries(CLAUDE_MODELS)) {
    const optionElement = document.createElement("option");
    optionElement.value = modelId;
    optionElement.textContent = modelMetadata.label;
    optionElement.title = modelMetadata.description;
    modelPickerElement.appendChild(optionElement);
  }
}

function updateBuyLicenseLink() {
  if (GUMROAD_PRODUCT_ID === "REPLACE_WITH_YOUR_GUMROAD_PRODUCT_ID") {
    buyLicenseLinkElement.href = "https://gumroad.com";
    buyLicenseLinkElement.textContent = "Configure Gumroad";
    licenseHelpTextElement.textContent =
      "Clippy hasn't been set up with a Gumroad product yet. See PUBLISHING.md.";
    return;
  }
  buyLicenseLinkElement.href = GUMROAD_BUY_URL;
}

function updatePlatformAwareShortcutLabel() {
  const isMacPlatform = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
  shortcutLabelElement.textContent = isMacPlatform ? "⌘ + Shift + Space" : "Ctrl + Shift + Space";
}

async function renderSettingsFromStorage() {
  const clippySettings = await loadClippySettings();

  if (clippySettings.anthropicApiKey) {
    anthropicKeyInputElement.value = clippySettings.anthropicApiKey;
    anthropicKeyInputElement.placeholder = "sk-ant-…";
  }

  if (clippySettings.licenseKey) {
    licenseKeyInputElement.value = clippySettings.licenseKey;
  }

  modelPickerElement.value = clippySettings.selectedModelId;

  renderOverallStatusSubtitle(clippySettings);
}

function renderOverallStatusSubtitle(clippySettings) {
  const hasAnthropicKey = !!clippySettings.anthropicApiKey;
  const hasVerifiedLicense = clippySettings.licenseIsVerified;

  if (hasAnthropicKey && hasVerifiedLicense) {
    statusSubtitleElement.textContent = "Ready. Press the shortcut and talk.";
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-ok";
    return;
  }
  if (!hasVerifiedLicense && !hasAnthropicKey) {
    statusSubtitleElement.textContent = "Add an API key and activate your license.";
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
    return;
  }
  if (!hasAnthropicKey) {
    statusSubtitleElement.textContent = "Add your Anthropic API key to finish setup.";
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
    return;
  }
  statusSubtitleElement.textContent = "Activate your $1 license to finish setup.";
  statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
}

// ----- Event wiring ---------------------------------------------------

saveAnthropicKeyButton.addEventListener("click", async () => {
  const trimmedAnthropicKey = anthropicKeyInputElement.value.trim();
  if (!trimmedAnthropicKey) {
    flashStatusSubtitleWithMessage("Paste your Anthropic key first.", "error");
    return;
  }
  if (!trimmedAnthropicKey.startsWith("sk-")) {
    flashStatusSubtitleWithMessage('Keys should start with "sk-".', "error");
    return;
  }
  await saveAnthropicApiKey(trimmedAnthropicKey);
  anthropicKeyInputElement.classList.add("clippy-flash");
  setTimeout(() => anthropicKeyInputElement.classList.remove("clippy-flash"), 400);
  const refreshedSettings = await loadClippySettings();
  renderOverallStatusSubtitle(refreshedSettings);
});

activateLicenseButton.addEventListener("click", async () => {
  const trimmedLicenseKey = licenseKeyInputElement.value.trim();
  if (!trimmedLicenseKey) {
    flashStatusSubtitleWithMessage("Paste your license key first.", "error");
    return;
  }

  activateLicenseButton.disabled = true;
  activateLicenseButton.textContent = "Checking…";

  await saveLicenseKey(trimmedLicenseKey);

  const verifyResponse = await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { kind: "clippy.verifyLicenseKey", licenseKey: trimmedLicenseKey },
      (response) => resolve(response)
    );
  });

  activateLicenseButton.disabled = false;
  activateLicenseButton.textContent = "Activate";

  if (!verifyResponse || !verifyResponse.ok) {
    const errorReason =
      (verifyResponse && verifyResponse.error) ||
      (verifyResponse && verifyResponse.value && verifyResponse.value.reason) ||
      "Couldn't verify license.";
    flashStatusSubtitleWithMessage(errorReason, "error");
    return;
  }

  const verificationResult = verifyResponse.value;
  if (verificationResult && verificationResult.ok === true) {
    flashStatusSubtitleWithMessage("License activated. Clippy is ready.", "ok");
    const refreshedSettings = await loadClippySettings();
    renderOverallStatusSubtitle(refreshedSettings);
  } else {
    const reason = (verificationResult && verificationResult.reason) || "License not valid.";
    flashStatusSubtitleWithMessage(reason, "error");
  }
});

modelPickerElement.addEventListener("change", async () => {
  await saveSelectedModelId(modelPickerElement.value);
});

resetButton.addEventListener("click", async () => {
  const userConfirmedReset = window.confirm(
    "This clears your API key, license key, and settings from this browser. Continue?"
  );
  if (!userConfirmedReset) return;
  await resetAllClippySettings();
  anthropicKeyInputElement.value = "";
  licenseKeyInputElement.value = "";
  await renderSettingsFromStorage();
  flashStatusSubtitleWithMessage("Clippy reset.", "warn");
});

function flashStatusSubtitleWithMessage(messageText, statusVariant) {
  statusSubtitleElement.textContent = messageText;
  statusSubtitleElement.className = `clippy-subtitle clippy-subtitle-${statusVariant}`;
}
