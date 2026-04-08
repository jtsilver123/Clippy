// Parses a [POINT:x,y:label] or [POINT:none] tag from the end of Claude's
// response. Ported from parsePointingCoordinates in the Mac app's
// CompanionManager.swift so behavior stays in sync with Clicky.
//
// Returns { spokenText, coordinate, label } where:
//   - spokenText  : the response with the tag stripped (this gets spoken aloud)
//   - coordinate  : { x, y } in screenshot pixel space, or null if [POINT:none]
//                   or no tag found
//   - label       : short description of the element, or "none" / ""

const pointTagRegex = /\[POINT:(?:none|(\d+)\s*,\s*(\d+)(?::([^\]:\s][^\]:]*?))?(?::screen(\d+))?)\]\s*$/;

export function parsePointingCoordinatesFromResponse(responseText) {
  const match = responseText.match(pointTagRegex);

  if (!match) {
    return {
      spokenText: responseText.trim(),
      coordinate: null,
      label: "",
    };
  }

  const spokenText = responseText.slice(0, match.index).trim();

  // [POINT:none]
  if (match[1] === undefined || match[2] === undefined) {
    return {
      spokenText,
      coordinate: null,
      label: "none",
    };
  }

  const xPixel = parseInt(match[1], 10);
  const yPixel = parseInt(match[2], 10);
  const elementLabel = (match[3] || "").trim();

  if (Number.isNaN(xPixel) || Number.isNaN(yPixel)) {
    return {
      spokenText,
      coordinate: null,
      label: "",
    };
  }

  return {
    spokenText,
    coordinate: { x: xPixel, y: yPixel },
    label: elementLabel,
  };
}
