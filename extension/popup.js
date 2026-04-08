// Clippy popup controller.
//
// Owns the setup UI: AI provider selection (Anthropic vs Gemini), API key
// entry, license activation, model selection, and reset. All persistent
// state lives in chrome.storage via lib/storage.js. License verification
// is delegated to the background service worker so the verification logic
// lives in exactly one place.

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

const providerCardAnthropicElement = document.getElementById("clippy-provider-card-anthropic");
const providerCardGeminiElement = document.getElementById("clippy-provider-card-gemini");
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
const statusTextElement = document.getElementById("clippy-status-text");
const statusDotElement = document.getElementById("clippy-status-dot");
const licenseHelpTextElement = document.getElementById("clippy-license-help-text");
const resetButton = document.getElementById("clippy-reset-button");
const shortcutLabelElement = document.getElementById("clippy-shortcut-label");
const shortcutsLinkElement = document.getElementById("clippy-shortcuts-link");

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
  shortcutLabelElement.textContent = isMacPlatform ? "⌘ + Shift + E" : "Ctrl + Shift + E";
}

async function renderSettingsFromStorage() {
  const clippySettings = await loadClippySettings();

  applyProviderToggleVisibility(clippySettings.selectedLlmProviderId);
  applyProviderCardActiveState(clippySettings.selectedLlmProviderId);
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

  renderOverallStatus(clippySettings);
}

function applyProviderToggleVisibility(selectedLlmProviderId) {
  const isUsingGemini = selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI;
  anthropicSectionElement.hidden = isUsingGemini;
  geminiSectionElement.hidden = !isUsingGemini;
}

function applyProviderCardActiveState(selectedLlmProviderId) {
  const isUsingGemini = selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI;
  providerCardAnthropicElement.classList.toggle("clippy-provider-card-active", !isUsingGemini);
  providerCardGeminiElement.classList.toggle("clippy-provider-card-active", isUsingGemini);
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

function renderOverallStatus(clippySettings) {
  const isUsingGemini = clippySettings.selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI;
  const hasProviderKey = isUsingGemini
    ? !!clippySettings.geminiApiKey
    : !!clippySettings.anthropicApiKey;
  const hasVerifiedLicense = clippySettings.licenseIsVerified;

  if (hasProviderKey && hasVerifiedLicense) {
    setStatus("Ready. Press the shortcut and talk.", "ok");
    return;
  }
  if (!hasVerifiedLicense && !hasProviderKey) {
    setStatus("Add an API key and activate your license to start.", "warn");
    return;
  }
  if (!hasProviderKey) {
    const providerName = isUsingGemini ? "Gemini" : "Anthropic";
    setStatus(`Add your ${providerName} API key to finish setup.`, "warn");
    return;
  }
  setStatus("Activate your $1 license to finish setup.", "warn");
}

function setStatus(messageText, statusVariant) {
  statusTextElement.textContent = messageText;
  statusDotElement.classList.remove(
    "clippy-status-dot-ok",
    "clippy-status-dot-warn",
    "clippy-status-dot-error"
  );
  statusDotElement.classList.add(`clippy-status-dot-${statusVariant}`);
}

// ----- Event wiring ---------------------------------------------------

async function selectProvider(newlySelectedProviderId) {
  await saveSelectedLlmProviderId(newlySelectedProviderId);
  applyProviderToggleVisibility(newlySelectedProviderId);
  applyProviderCardActiveState(newlySelectedProviderId);
  populateModelPickerForProvider(newlySelectedProviderId);
  const refreshedSettings = await loadClippySettings();
  modelPickerElement.value = refreshedSettings.activeModelId;
  renderOverallStatus(refreshedSettings);
}

providerCardAnthropicElement.addEventListener("click", () => {
  selectProvider(LLM_PROVIDER_IDS.ANTHROPIC);
});

providerCardGeminiElement.addEventListener("click", () => {
  selectProvider(LLM_PROVIDER_IDS.GEMINI);
});

saveAnthropicKeyButton.addEventListener("click", async () => {
  const trimmedAnthropicKey = anthropicKeyInputElement.value.trim();
  if (!trimmedAnthropicKey) {
    setStatus("Paste your Anthropic key first.", "error");
    return;
  }
  if (!trimmedAnthropicKey.startsWith("sk-")) {
    setStatus('Anthropic keys should start with "sk-".', "error");
    return;
  }
  await saveAnthropicApiKey(trimmedAnthropicKey);
  flashInputBriefly(anthropicKeyInputElement);
  const refreshedSettings = await loadClippySettings();
  renderOverallStatus(refreshedSettings);
});

saveGeminiKeyButton.addEventListener("click", async () => {
  const trimmedGeminiKey = geminiKeyInputElement.value.trim();
  if (!trimmedGeminiKey) {
    setStatus("Paste your Gemini key first.", "error");
    return;
  }
  if (!trimmedGeminiKey.startsWith("AIza")) {
    setStatus('Gemini keys usually start with "AIza".', "error");
    return;
  }
  await saveGeminiApiKey(trimmedGeminiKey);
  flashInputBriefly(geminiKeyInputElement);
  const refreshedSettings = await loadClippySettings();
  renderOverallStatus(refreshedSettings);
});

activateLicenseButton.addEventListener("click", async () => {
  const trimmedLicenseKey = licenseKeyInputElement.value.trim();
  if (!trimmedLicenseKey) {
    setStatus("Paste your license key first.", "error");
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
    setStatus(errorReason, "error");
    return;
  }

  const verificationResult = verifyResponse.value;
  if (verificationResult && verificationResult.ok === true) {
    setStatus("License activated. Clippy is ready.", "ok");
    const refreshedSettings = await loadClippySettings();
    renderOverallStatus(refreshedSettings);
  } else {
    const reason = (verificationResult && verificationResult.reason) || "License not valid.";
    setStatus(reason, "error");
  }
});

modelPickerElement.addEventListener("change", async () => {
  // The model picker shows whichever provider is currently active.
  // Persist to the right per-provider model field.
  const settingsBeforeChange = await loadClippySettings();
  if (settingsBeforeChange.selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI) {
    await saveSelectedGeminiModelId(modelPickerElement.value);
  } else {
    await saveSelectedAnthropicModelId(modelPickerElement.value);
  }
});

// chrome://* URLs can't be opened from a regular anchor; we have to ask the
// background to open it as a tab.
shortcutsLinkElement.addEventListener("click", (clickEvent) => {
  clickEvent.preventDefault();
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
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
  setStatus("Clippy reset.", "warn");
});

function flashInputBriefly(inputElement) {
  inputElement.classList.add("clippy-flash");
  setTimeout(() => inputElement.classList.remove("clippy-flash"), 420);
}
