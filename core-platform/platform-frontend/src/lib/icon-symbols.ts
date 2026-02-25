import { stripEmojis } from '@/lib/text';

export const APP_ICON_SYMBOL_OPTIONS = [
  { symbol: '◆', label: 'Diamond' },
  { symbol: '■', label: 'Square' },
  { symbol: '▲', label: 'Triangle Up' },
  { symbol: '▶', label: 'Arrow Right' },
  { symbol: '●', label: 'Circle' },
  { symbol: '◉', label: 'Target' },
  { symbol: '◇', label: 'Outline Diamond' },
  { symbol: '▣', label: 'Framed Square' },
  { symbol: '◈', label: 'Filled Diamond' },
  { symbol: '⌂', label: 'Home Base' },
  { symbol: '⧉', label: 'Tiles' },
  { symbol: '↗', label: 'Launch Arrow' },
  { symbol: '∑', label: 'Summation' },
  { symbol: '⌁', label: 'Flow' },
  { symbol: '⋯', label: 'Ellipsis' },
] as const;

const APPROVED_SYMBOLS: Set<string> = new Set(
  APP_ICON_SYMBOL_OPTIONS.map((option) => option.symbol)
);

export const DEFAULT_APP_ICON_SYMBOL = '◆';

export function isApprovedIconSymbol(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return APPROVED_SYMBOLS.has(value);
}

export function normalizeIconSymbol(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = stripEmojis(value).trim();
  if (!cleaned) {
    return null;
  }

  const firstSymbol = Array.from(cleaned)[0];
  if (!firstSymbol) {
    return null;
  }

  return isApprovedIconSymbol(firstSymbol) ? firstSymbol : null;
}

export function resolveIconSymbol(value: string | null | undefined): string {
  return normalizeIconSymbol(value) || DEFAULT_APP_ICON_SYMBOL;
}

export function getIconSymbolLabel(symbol: string): string {
  const option = APP_ICON_SYMBOL_OPTIONS.find((item) => item.symbol === symbol);
  return option?.label || 'Default';
}
