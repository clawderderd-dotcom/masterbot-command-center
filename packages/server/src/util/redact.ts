const TOKEN_PATTERNS: RegExp[] = [
  // Authorization: Bearer <token>
  /(Authorization\s*:\s*Bearer\s+)([^\s]+)/gi,
  // token: "..." / token='...'
  /(["']?token["']?\s*[:=]\s*["'])(.*?)(["'])/gi,
  // apiKey: "..."
  /(["']?apiKey["']?\s*[:=]\s*["'])(.*?)(["'])/gi,
  // long opaque strings (avoid redacting common words by requiring mixed chars)
  /\b([A-Za-z0-9_-]{24,})\b/g,
];

export function redactSecrets(input: string) {
  let out = input;
  for (const re of TOKEN_PATTERNS) {
    out = out.replace(re, (_m, g1, g2, g3) => {
      // For the long-string pattern (single capture), g1 is the token
      if (g2 === undefined) return "[REDACTED]";
      return `${g1}[REDACTED]${g3 ?? ""}`;
    });
  }
  return out;
}
