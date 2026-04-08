// Thin wrapper around chrome.storage.local for Clippy settings.
//
// Kept in one place so the rest of the code doesn't need to know the storage
// key names and so we have one place to clear everything when the user hits
// "Reset Clippy" in the popup.

import {
  DEFAULT_CLAUDE_MODEL_ID,
  DEFAULT_GEMINI_MODEL_ID,
  DEFAULT_LLM_PROVIDER_ID,
  LLM_PROVIDER_IDS,
} from "../config.js";

const STORAGE_KEYS = {
  selectedLlmProviderId: "clippy.selectedLlmProviderId",
  anthropicApiKey: "clippy.anthropicApiKey",
  geminiApiKey: "clippy.geminiApiKey",
  selectedAnthropicModelId: "clippy.selectedAnthropicModelId",
  selectedGeminiModelId: "clippy.selectedGeminiModelId",
  licenseKey: "clippy.licenseKey",
  licenseIsVerified: "clippy.licenseIsVerified",
  voiceEnabled: "clippy.voiceEnabled",
};

export async function loadClippySettings() {
  const storedValues = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const selectedLlmProviderId =
    storedValues[STORAGE_KEYS.selectedLlmProviderId] || DEFAULT_LLM_PROVIDER_ID;
  const selectedAnthropicModelId =
    storedValues[STORAGE_KEYS.selectedAnthropicModelId] || DEFAULT_CLAUDE_MODEL_ID;
  const selectedGeminiModelId =
    storedValues[STORAGE_KEYS.selectedGeminiModelId] || DEFAULT_GEMINI_MODEL_ID;
  return {
    selectedLlmProviderId,
    anthropicApiKey: storedValues[STORAGE_KEYS.anthropicApiKey] || "",
    geminiApiKey: storedValues[STORAGE_KEYS.geminiApiKey] || "",
    selectedAnthropicModelId,
    selectedGeminiModelId,
    // Convenience: the model id that should be used for the current provider.
    activeModelId:
      selectedLlmProviderId === LLM_PROVIDER_IDS.GEMINI
        ? selectedGeminiModelId
        : selectedAnthropicModelId,
    licenseKey: storedValues[STORAGE_KEYS.licenseKey] || "",
    licenseIsVerified: storedValues[STORAGE_KEYS.licenseIsVerified] === true,
    voiceEnabled: storedValues[STORAGE_KEYS.voiceEnabled] !== false,
  };
}

export async function saveSelectedLlmProviderId(selectedLlmProviderId) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.selectedLlmProviderId]: selectedLlmProviderId,
  });
}

export async function saveAnthropicApiKey(anthropicApiKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.anthropicApiKey]: anthropicApiKey });
}

export async function saveGeminiApiKey(geminiApiKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.geminiApiKey]: geminiApiKey });
}

export async function saveSelectedAnthropicModelId(selectedAnthropicModelId) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.selectedAnthropicModelId]: selectedAnthropicModelId,
  });
}

export async function saveSelectedGeminiModelId(selectedGeminiModelId) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.selectedGeminiModelId]: selectedGeminiModelId,
  });
}

export async function saveLicenseKey(licenseKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.licenseKey]: licenseKey });
}

export async function saveLicenseVerificationStatus(licenseIsVerified) {
  await chrome.storage.local.set({ [STORAGE_KEYS.licenseIsVerified]: licenseIsVerified });
}

export async function saveVoiceEnabled(voiceEnabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.voiceEnabled]: voiceEnabled });
}

export async function resetAllClippySettings() {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}
