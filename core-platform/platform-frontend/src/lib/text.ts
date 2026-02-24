const EMOJI_PATTERN = /(\p{Extended_Pictographic}|\uFE0F|\u200D)/gu;

export function stripEmojis(value: string): string {
  return value.replace(EMOJI_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}

export function safeDisplayText(value: string | null | undefined, fallback = ''): string {
  if (!value) {
    return fallback;
  }

  const sanitized = stripEmojis(value);
  return sanitized || fallback;
}
