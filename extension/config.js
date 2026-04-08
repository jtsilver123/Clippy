// Clippy configuration.
//
// NON-CODER SETUP:
// You only need to change GUMROAD_PRODUCT_ID and GUMROAD_BUY_URL below.
//
//   - GUMROAD_PRODUCT_ID is the unique id Gumroad assigns to your product.
//     Find it on Gumroad → your product → Settings → "Show advanced
//     settings" → "Product ID". It looks like a base64 string ending in
//     "==", for example "kfdfheAnlmG1qTakDI7QBg==".
//
//   - GUMROAD_BUY_URL is the public product page where buyers complete the
//     $1 purchase. It's the URL of your product on Gumroad.
//
// See PUBLISHING.md for step-by-step instructions on creating the Gumroad
// product and filling in these fields.

export const GUMROAD_PRODUCT_ID = "kfdfheAnlmG1qTakDI7QBg==";

export const GUMROAD_BUY_URL = "https://silverstream421.gumroad.com/l/snixl";

// Anthropic models the user can choose between. Keep these in sync with the
// picker in popup.html. Defaults to the fastest, cheapest capable model.
export const CLAUDE_MODELS = {
  "claude-sonnet-4-6": {
    label: "Claude Sonnet 4.6",
    description: "Fast, cheap, great at vision. Best for everyday use."
  },
  "claude-opus-4-6": {
    label: "Claude Opus 4.6",
    description: "Most capable. Slower and more expensive."
  }
};

export const DEFAULT_CLAUDE_MODEL_ID = "claude-sonnet-4-6";

// Anthropic API endpoint and version. These are stable and should not need
// to be changed.
export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_API_VERSION = "2023-06-01";

// Max tokens for a Claude response. Kept modest because responses are spoken.
export const CLAUDE_MAX_RESPONSE_TOKENS = 600;

// Google Gemini models. Gemini 2.5 Flash has a generous free tier (1500
// requests/day) with vision support, so users who don't want to enter card
// details on Anthropic can still use Clippy for free.
export const GEMINI_MODELS = {
  "gemini-2.5-flash": {
    label: "Gemini 2.5 Flash (free tier)",
    description: "Free tier: 1,500 requests/day. Fast and good at vision."
  },
  "gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    description: "Most capable Gemini model. Lower free tier limits."
  }
};

export const DEFAULT_GEMINI_MODEL_ID = "gemini-2.5-flash";

// LLM provider identifiers used in storage and the popup dropdown. The
// default is Anthropic because Clippy ships with the Claude system prompt
// and most users will pay for higher quality.
export const LLM_PROVIDER_IDS = {
  ANTHROPIC: "anthropic",
  GEMINI: "gemini",
};

export const DEFAULT_LLM_PROVIDER_ID = LLM_PROVIDER_IDS.ANTHROPIC;

// How many previous turns of conversation to keep in memory. The content
// script clears this when the user navigates to a new page.
export const MAX_CONVERSATION_TURNS = 12;
