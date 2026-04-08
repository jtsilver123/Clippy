// Clippy popup controller.
//
// Handles the setup UI: AI provider selection, API key entry, license
// activation, model selection, and reset. All persistent state lives in
// chrome.storage via lib/storage.js; license verification is delegated to
// the background service worker so the verification logic lives in
// exactly one place.

import {
  CLAUDE_MODELS,
  GEMINI_MODELS,
  GUMROAD_BUY_URL,
  GUMROAD_PRODUCT_ID,
  LLM_PROVIDER_IDS,
} from "./config.js";
import {
  loadClippySettings,
  resetAllClippySettings,
  saveAnthropicApiKey,
  saveGeminiApiKey,
  saveLicenseKey,
  saveSelectedAnthropicModelId,
  saveSelectedGeminiModelId,
  saveSelectedLlmProviderId,
} from "./lib/storage.js";

const providerPickerElement = document.getElementById("clippy-provider-picker");
const anthropicSectionElement = document.getElementById("clippy-anthropic-section");
const anthropicKeyInputElement = document.getElementById("clippy-anthropic-key-input");
const saveAnthropicKeyButton = document.getElementById("clippy-save-anthropic-key-button");
const geminiSectionElement = document.getElementById("clippy-gemini-section");
const geminiKeyInputElement = document.getElementById("clippy-gemini-key-input");
const saveGeminiKeyButton = document.getElementById("clippy-save-gemini-key-button");
const licenseKeyInputElement = document.getElementById("clippy-license-key-input");
const activateLicenseButton = document.getElementById("clippy-activate-license-button");
const buyLicenseLinkElement = document.getElementById("clippy-buy-license-link");
const modelPickerElement = document.getElementById("clippy-model-picker");
const statusSubtitleElement = document.getElementById("clippy-status-subtitle");
const licenseHelpTextElement = document.getElementById("clippy-license-help-text");
const resetButton = document.getElementById("clippy-reset-button");
const shortcutLabelElement = document.getElementById("clippy-shortcut-label");

// ----- Initial render -------------------------------------------------

updateBuyLicenseLink();
updatePlatformAwareShortcutLabel();
renderSettingsFromStorage();

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

  providerPickerElement.value = clippySettings.selectedLlmProviderId;
  applyProviderToggleVisibility(clippySettings.selectedLlmProviderId);
  populateModelPickerForProvider(clippySettings.selectedLlmProviderId);

  if (clippySettings.anthropicApiKey) {
    anthropicKeyInputElement.value = clippySettings.anthropicApiKey;
  }
  if (clippySettings.geminiApiKey) {
    geminiKeyInputElement.value = clippySettings.geminiApiKey;
  }
  if (clippySettings.licenseKey) {
    licenseKeyInputElement.value = clippySettings.licenseKey;
  }

  modelPickerElement.value = clippySettings.activeModelId;

  renderOverallStatusSubtitle(clippySettings);
}

function applyProviderToggleVisibility(selectedLlmProviderId) {
  const isUsingGemini = selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI;
  anthropicSectionElement.hidden = isUsingGemini;
  geminiSectionElement.hidden = !isUsingGemini;
}

function populateModelPickerForProvider(selectedLlmProviderId) {
  modelPickerElement.innerHTML = "";
  const modelMap =
    selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI ? GEMINI_MODELS : CLAUDE_MODELS;
  for (const [modelId, modelMetadata] of Object.entries(modelMap)) {
    const optionElement = document.createElement("option");
    optionElement.value = modelId;
    optionElement.textContent = modelMetadata.label;
    optionElement.title = modelMetadata.description;
    modelPickerElement.appendChild(optionElement);
  }
}

function renderOverallStatusSubtitle(clippySettings) {
  const isUsingGemini = clippySettings.selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI;
  const hasProviderKey = isUsingGemini
    ? !!clippySettings.geminiApiKey
    : !!clippySettings.anthropicApiKey;
  const hasVerifiedLicense = clippySettings.licenseIsVerified;

  if (hasProviderKey && hasVerifiedLicense) {
    statusSubtitleElement.textContent = "Ready. Press the shortcut and talk.";
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-ok";
    return;
  }
  if (!hasVerifiedLicense && !hasProviderKey) {
    statusSubtitleElement.textContent = "Add an API key and activate your license.";
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
    return;
  }
  if (!hasProviderKey) {
    const providerName = isUsingGemini ? "Google Gemini" : "Anthropic";
    statusSubtitleElement.textContent = `Add your ${providerName} API key to finish setup.`;
    statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
    return;
  }
  statusSubtitleElement.textContent = "Activate your $1 license to finish setup.";
  statusSubtitleElement.className = "clippy-subtitle clippy-subtitle-warn";
}

// ----- Event wiring ---------------------------------------------------

providerPickerElement.addEventListener("change", async () => {
  const newlySelectedProviderId = providerPickerElement.value;
  await saveSelectedLlmProviderId(newlySelectedProviderId);
  applyProviderToggleVisibility(newlySelectedProviderId);
  populateModelPickerForProvider(newlySelectedProviderId);
  // After repopulating the picker, restore the user's previously chosen
  // model for the new provider.
  const refreshedSettings = await loadClippySettings();
  modelPickerElement.value = refreshedSettings.activeModelId;
  renderOverallStatusSubtitle(refreshedSettings);
});

saveAnthropicKeyButton.addEventListener("click", async () => {
  const trimmedAnthropicKey = anthropicKeyInputElement.value.trim();
  if (!trimmedAnthropicKey) {
    flashStatusSubtitleWithMessage("Paste your Anthropic key first.", "error");
    return;
  }
  if (!trimmedAnthropicKey.startsWith("sk-")) {
    flashStatusSubtitleWithMessage('Anthropic keys should start with "sk-".', "error");
    return;
  }
  await saveAnthropicApiKey(trimmedAnthropicKey);
  flashInputBriefly(anthropicKeyInputElement);
  const refreshedSettings = await loadClippySettings();
  renderOverallStatusSubtitle(refreshedSettings);
});

saveGeminiKeyButton.addEventListener("click", async () => {
  const trimmedGeminiKey = geminiKeyInputElement.value.trim();
  if (!trimmedGeminiKey) {
    flashStatusSubtitleWithMessage("Paste your Gemini key first.", "error");
    return;
  }
  if (!trimmedGeminiKey.startsWith("AIza")) {
    flashStatusSubtitleWithMessage('Gemini keys usually start with "AIza".', "error");
    return;
  }
  await saveGeminiApiKey(trimmedGeminiKey);
  flashInputBriefly(geminiKeyInputElement);
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
  const currentlySelectedProviderId = providerPickerElement.value;
  if (currentlySelectedProviderId === LLM_PROVIDER_IDS.GEMINI) {
    await saveSelectedGeminiModelId(modelPickerElement.value);
  } else {
    await saveSelectedAnthropicModelId(modelPickerElement.value);
  }
});

resetButton.addEventListener("click", async () => {
  const userConfirmedReset = window.confirm(
    "This clears your API keys, license key, and settings from this browser. Continue?"
  );
  if (!userConfirmedReset) return;
  await resetAllClippySettings();
  anthropicKeyInputElement.value = "";
  geminiKeyInputElement.value = "";
  licenseKeyInputElement.value = "";
  await renderSettingsFromStorage();
  flashStatusSubtitleWithMessage("Clippy reset.", "warn");
});

function flashStatusSubtitleWithMessage(messageText, statusVariant) {
  statusSubtitleElement.textContent = messageText;
  statusSubtitleElement.className = `clippy-subtitle clippy-subtitle-${statusVariant}`;
}

function flashInputBriefly(inputElement) {
  inputElement.classList.add("clippy-flash");
  setTimeout(() => inputElement.classList.remove("clippy-flash"), 400);
}
