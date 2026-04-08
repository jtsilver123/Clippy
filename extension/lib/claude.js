// Streaming Claude API client for the Clippy Chrome extension.
//
// Calls Anthropic's /v1/messages endpoint with SSE streaming and yields each
// text delta as it arrives. The extension runs in the browser so the client
// sends the required `anthropic-dangerous-direct-browser-access` header.
//
// The user's API key is loaded from chrome.storage — it never leaves the
// machine and is never sent anywhere other than api.anthropic.com.

import {
  ANTHROPIC_API_VERSION,
  ANTHROPIC_MESSAGES_URL,
  CLAUDE_MAX_RESPONSE_TOKENS,
} from "../config.js";

/**
 * Stream a Claude response given a system prompt, a prior conversation
 * history, a new user message text, and an optional screenshot data URL.
 *
 * Calls onTextDelta(deltaString) for every streamed text chunk and returns
 * the full joined response text once streaming is done.
 *
 * Throws on network / API errors so callers can show a useful message.
 */
export async function streamClaudeResponse({
  anthropicApiKey,
  modelId,
  systemPrompt,
  conversationHistoryMessages,
  newUserText,
  screenshotDataUrl,
  onTextDelta,
  abortSignal,
}) {
  if (!anthropicApiKey) {
    throw new Error("Missing Anthropic API key. Open Clippy and paste your key.");
  }

  const userMessageContentBlocks = [];

  if (screenshotDataUrl) {
    const base64Payload = extractBase64FromDataUrl(screenshotDataUrl);
    const mediaType = extractMediaTypeFromDataUrl(screenshotDataUrl);
    userMessageContentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Payload,
      },
    });
  }

  userMessageContentBlocks.push({
    type: "text",
    text: newUserText,
  });

  const requestBody = {
    model: modelId,
    max_tokens: CLAUDE_MAX_RESPONSE_TOKENS,
    system: systemPrompt,
    stream: true,
    messages: [
      ...conversationHistoryMessages,
      {
        role: "user",
        content: userMessageContentBlocks,
      },
    ],
  };

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBodyText = await response.text().catch(() => "");
    throw new Error(`Claude API error ${response.status}: ${errorBodyText.slice(0, 400)}`);
  }

  if (!response.body) {
    throw new Error("Claude API returned no response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pendingChunkBuffer = "";
  let fullResponseText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pendingChunkBuffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines.
    let eventBoundaryIndex;
    while ((eventBoundaryIndex = pendingChunkBuffer.indexOf("\n\n")) !== -1) {
      const rawEventBlock = pendingChunkBuffer.slice(0, eventBoundaryIndex);
      pendingChunkBuffer = pendingChunkBuffer.slice(eventBoundaryIndex + 2);

      const textDelta = extractTextDeltaFromSseEventBlock(rawEventBlock);
      if (textDelta) {
        fullResponseText += textDelta;
        if (onTextDelta) onTextDelta(textDelta);
      }
    }
  }

  return fullResponseText;
}

// Pull the "text" field out of a content_block_delta SSE event block. Each
// event block looks like:
//   event: content_block_delta
//   data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hi"}}
function extractTextDeltaFromSseEventBlock(rawEventBlock) {
  const lines = rawEventBlock.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const jsonPayload = line.slice(5).trim();
    if (!jsonPayload || jsonPayload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(jsonPayload);
      if (
        parsed.type === "content_block_delta" &&
        parsed.delta &&
        parsed.delta.type === "text_delta" &&
        typeof parsed.delta.text === "string"
      ) {
        return parsed.delta.text;
      }
    } catch {
      // ignore malformed event lines
    }
  }
  return "";
}

function extractBase64FromDataUrl(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return dataUrl;
  return dataUrl.slice(commaIndex + 1);
}

function extractMediaTypeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);/);
  if (match && match[1]) return match[1];
  return "image/png";
}
