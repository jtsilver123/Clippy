// Clippy configuration.
//
// NON-CODER SETUP:
// Change GUMROAD_PRODUCT_PERMALINK to the permalink of the $1 product you
// created on Gumroad. The permalink is the short string in the product URL
// (for example, the "clippy" in https://gumroad.com/l/clippy).
//
// See PUBLISHING.md for step-by-step instructions on creating the Gumroad
// product and filling in this field.

export const GUMROAD_PRODUCT_PERMALINK = "snixl";

// Where to send users to buy a license. Change nothing here unless you know
// what you're doing — the code builds the buy URL from the permalink above.
export const GUMROAD_BUY_URL = `https://silverstream421.gumroad.com/l/${GUMROAD_PRODUCT_PERMALINK}`;

// Anthropic models the user can choose between. Keep these in sync with the
// picker in popup.html. Defaults to the fastest, cheapest capable model.
export const CLAUDE_MODELS = {
  "claude-sonnet-4-6": {
    label: "Sonnet 4.6 (default)",
    description: "Fast, cheap, great at vision. Best for everyday use."
  },
  "claude-opus-4-6": {
    label: "Opus 4.6",
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

// How many previous turns of conversation to keep in memory. The content
// script clears this when the user navigates to a new page.
export const MAX_CONVERSATION_TURNS = 12;
