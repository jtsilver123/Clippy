// Thin wrapper around chrome.storage.local for Clippy settings.
//
// Kept in one place so the rest of the code doesn't need to know the storage
// key names and so we have one place to clear everything when the user hits
// "Reset Clippy" in the popup.

import { DEFAULT_CLAUDE_MODEL_ID } from "../config.js";

const STORAGE_KEYS = {
  anthropicApiKey: "clippy.anthropicApiKey",
  licenseKey: "clippy.licenseKey",
  licenseIsVerified: "clippy.licenseIsVerified",
  selectedModelId: "clippy.selectedModelId",
  voiceEnabled: "clippy.voiceEnabled",
};

export async function loadClippySettings() {
  const storedValues = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  return {
    anthropicApiKey: storedValues[STORAGE_KEYS.anthropicApiKey] || "",
    licenseKey: storedValues[STORAGE_KEYS.licenseKey] || "",
    licenseIsVerified: storedValues[STORAGE_KEYS.licenseIsVerified] === true,
    selectedModelId: storedValues[STORAGE_KEYS.selectedModelId] || DEFAULT_CLAUDE_MODEL_ID,
    voiceEnabled: storedValues[STORAGE_KEYS.voiceEnabled] !== false,
  };
}

export async function saveAnthropicApiKey(anthropicApiKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.anthropicApiKey]: anthropicApiKey });
}

export async function saveLicenseKey(licenseKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.licenseKey]: licenseKey });
}

export async function saveLicenseVerificationStatus(licenseIsVerified) {
  await chrome.storage.local.set({ [STORAGE_KEYS.licenseIsVerified]: licenseIsVerified });
}

export async function saveSelectedModelId(selectedModelId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedModelId]: selectedModelId });
}

export async function saveVoiceEnabled(voiceEnabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.voiceEnabled]: voiceEnabled });
}

export async function resetAllClippySettings() {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}
