// Streaming Google Gemini API client for the Clippy Chrome extension.
//
// Calls Gemini's :streamGenerateContent endpoint with SSE and yields each
// text delta as it arrives. The user's API key is loaded from
// chrome.storage; it never leaves the machine and is only sent as a query
// parameter to generativelanguage.googleapis.com.
//
// Why Gemini is supported in addition to Claude: Google offers a generous
// free tier (1,500 requests/day on Gemini 2.5 Flash with vision), so users
// who don't want to enter card details on Anthropic can still use Clippy
// for free.

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MAX_RESPONSE_TOKENS = 600;

/**
 * Stream a Gemini response. Same shape as streamClaudeResponse() so the
 * background service worker can call either provider through one
 * interface.
 *
 * Calls onTextDelta(deltaString) for every streamed text chunk and returns
 * the full joined response text once streaming is done.
 */
export async function streamGeminiResponse({
  geminiApiKey,
  modelId,
  systemPrompt,
  conversationHistoryMessages,
  newUserText,
  screenshotDataUrl,
  onTextDelta,
  abortSignal,
}) {
  if (!geminiApiKey) {
    throw new Error("Missing Google Gemini API key. Open Clippy and paste your key.");
  }

  const newUserMessageParts = [];
  if (screenshotDataUrl) {
    newUserMessageParts.push({
      inline_data: {
        mime_type: extractMediaTypeFromDataUrl(screenshotDataUrl),
        data: extractBase64FromDataUrl(screenshotDataUrl),
      },
    });
  }
  newUserMessageParts.push({ text: newUserText });

  // Convert Claude-shaped conversation history to Gemini's contents format.
  // Each Claude message has a role and content blocks; Gemini uses "user"
  // and "model" as roles, and parts as the content array. We only ever
  // pass plain text in history (image is sent only on the current turn).
  const geminiContents = [];
  for (const claudeShapedMessage of conversationHistoryMessages || []) {
    const geminiRole = claudeShapedMessage.role === "assistant" ? "model" : "user";
    const partsText = extractPlainTextFromClaudeMessage(claudeShapedMessage);
    if (!partsText) continue;
    geminiContents.push({
      role: geminiRole,
      parts: [{ text: partsText }],
    });
  }
  geminiContents.push({
    role: "user",
    parts: newUserMessageParts,
  });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: GEMINI_MAX_RESPONSE_TOKENS,
    },
  };

  const streamingUrl =
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(modelId)}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(geminiApiKey)}`;

  const response = await fetch(streamingUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBodyText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errorBodyText.slice(0, 400)}`);
  }
  if (!response.body) {
    throw new Error("Gemini API returned no response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pendingChunkBuffer = "";
  let fullResponseText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pendingChunkBuffer += decoder.decode(value, { stream: true });

    // Gemini SSE separates events with "\n\n" exactly like Anthropic.
    let eventBoundaryIndex;
    while ((eventBoundaryIndex = pendingChunkBuffer.indexOf("\n\n")) !== -1) {
      const rawEventBlock = pendingChunkBuffer.slice(0, eventBoundaryIndex);
      pendingChunkBuffer = pendingChunkBuffer.slice(eventBoundaryIndex + 2);

      const textDelta = extractTextFromGeminiSseEventBlock(rawEventBlock);
      if (textDelta) {
        fullResponseText += textDelta;
        if (onTextDelta) onTextDelta(textDelta);
      }
    }
  }

  return fullResponseText;
}

// Pull text out of a Gemini SSE event block. Each event looks like:
//   data: {"candidates":[{"content":{"parts":[{"text":"hello"}],"role":"model"}}]}
function extractTextFromGeminiSseEventBlock(rawEventBlock) {
  const lines = rawEventBlock.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const jsonPayload = line.slice(5).trim();
    if (!jsonPayload || jsonPayload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(jsonPayload);
      const candidates = parsed.candidates || [];
      let collectedTextForThisEvent = "";
      for (const candidate of candidates) {
        const parts = (candidate.content && candidate.content.parts) || [];
        for (const part of parts) {
          if (typeof part.text === "string") {
            collectedTextForThisEvent += part.text;
          }
        }
      }
      if (collectedTextForThisEvent) return collectedTextForThisEvent;
    } catch {
      // ignore malformed events
    }
  }
  return "";
}

// Claude messages have a `content` array of typed blocks. For history we
// only ever store text blocks, so this just concatenates the text fields.
function extractPlainTextFromClaudeMessage(claudeMessage) {
  if (!claudeMessage || !Array.isArray(claudeMessage.content)) return "";
  return claudeMessage.content
    .map((contentBlock) => (contentBlock && typeof contentBlock.text === "string" ? contentBlock.text : ""))
    .join("");
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
