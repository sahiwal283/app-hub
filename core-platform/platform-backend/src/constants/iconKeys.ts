export const ALLOWED_ICON_KEYS = [
  'grid',
  'briefcase',
  'users',
  'settings',
  'chart',
  'database',
  'file',
  'calendar',
  'message',
  'shield',
  'globe',
  'link',
  'shop',
  'credit-card',
  'box',
] as const;

export type IconKey = (typeof ALLOWED_ICON_KEYS)[number];

const LEGACY_ICON_MAP: Record<string, IconKey> = {
  TS: 'shop',
  TB: 'grid',
  EX: 'credit-card',
};

export function normalizeIconKey(raw: unknown): IconKey | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  if ((ALLOWED_ICON_KEYS as readonly string[]).includes(value)) {
    return value as IconKey;
  }

  if (value in LEGACY_ICON_MAP) {
    return LEGACY_ICON_MAP[value];
  }

  return null;
}

export function isAllowedIconKey(raw: unknown): raw is IconKey {
  return normalizeIconKey(raw) !== null;
}
