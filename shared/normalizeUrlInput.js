const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#].*)?$/i;

function cleanHref(url) {
  if (url.pathname === "/" && !url.search && !url.hash) {
    return `${url.protocol}//${url.host}`;
  }
  return url.toString();
}

export function normalizeUrlInput(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return { ok: false, url: "", error: "Enter a website URL." };
  }

  if (/\s/.test(trimmed)) {
    return { ok: false, url: "", error: "Use a website address without spaces." };
  }

  const hasHttpProtocol = /^https?:\/\//i.test(trimmed);
  const hasOtherProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !hasHttpProtocol;
  if (hasOtherProtocol) {
    return { ok: false, url: "", error: "Only HTTP or HTTPS website URLs are allowed." };
  }

  const candidate = hasHttpProtocol
    ? trimmed
    : /^www\./i.test(trimmed) || DOMAIN_PATTERN.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, url: "", error: "Enter a valid website like google.com or https://google.com." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, url: "", error: "Only HTTP or HTTPS website URLs are allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.includes(".") && hostname !== "localhost") {
    return { ok: false, url: "", error: "Enter a real domain like google.com." };
  }

  return { ok: true, url: cleanHref(parsed), error: "" };
}
