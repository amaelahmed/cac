// Every provider hands back the model's answer as plain text, and every provider
// sometimes wraps that text in a ```json fence or trails a sentence after the
// closing brace. This was copy-pasted into each adapter; a third provider would
// have made a third copy, so it lives here now.

export function firstBalancedJsonObject(text) {
  const source = String(text || "");
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

export function parseJsonMaybe(text) {
  const cleaned = String(text || "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const balanced = firstBalancedJsonObject(cleaned);
    if (!balanced) return null;
    try {
      return JSON.parse(balanced);
    } catch {
      return null;
    }
  }
}
