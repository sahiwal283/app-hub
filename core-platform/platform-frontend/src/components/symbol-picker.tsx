'use client';

import { useMemo, useState } from 'react';
import {
  APP_ICON_SYMBOL_OPTIONS,
  getIconSymbolLabel,
  isApprovedIconSymbol,
  normalizeIconSymbol,
  resolveIconSymbol,
} from '@/lib/icon-symbols';
import { stripEmojis } from '@/lib/text';

interface SymbolPickerProps {
  value: string;
  onChange: (nextSymbol: string) => void;
  id?: string;
}

export default function SymbolPicker({ value, onChange, id }: SymbolPickerProps) {
  const [search, setSearch] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const resolvedSymbol = resolveIconSymbol(value);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return APP_ICON_SYMBOL_OPTIONS;
    }
    return APP_ICON_SYMBOL_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(query) || option.symbol.includes(query)
    );
  }, [search]);

  const handleManualSymbolChange = (input: string) => {
    const cleaned = stripEmojis(input);
    const normalized = normalizeIconSymbol(cleaned);
    if (!cleaned.trim()) {
      setValidationMessage('');
      return;
    }

    if (!normalized || !isApprovedIconSymbol(normalized)) {
      setValidationMessage('Unsupported symbol. Please choose from the approved picker list.');
      return;
    }

    setValidationMessage('');
    onChange(normalized);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-lg leading-none" aria-hidden="true">
            {resolvedSymbol}
          </span>
          <span className="text-sm text-slate-700">{getIconSymbolLabel(resolvedSymbol)}</span>
          <span className="sr-only">
            Selected symbol {resolvedSymbol}, {getIconSymbolLabel(resolvedSymbol)}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor={`${id || 'icon-symbol'}-search`} className="form-label">
          Search symbols
        </label>
        <input
          id={`${id || 'icon-symbol'}-search`}
          type="text"
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label"
        />
      </div>

      <div className="max-h-44 overflow-auto rounded-md border border-slate-300 bg-white p-2" role="listbox" aria-label="Approved icon symbols">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filteredOptions.map((option) => {
            const selected = option.symbol === resolvedSymbol;
            return (
              <button
                key={option.symbol}
                type="button"
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                  selected
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                }`}
                onClick={() => {
                  setValidationMessage('');
                  onChange(option.symbol);
                }}
                aria-selected={selected}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {option.symbol}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor={`${id || 'icon-symbol'}-manual`} className="form-label">
          Paste symbol (optional)
        </label>
        <input
          id={`${id || 'icon-symbol'}-manual`}
          type="text"
          className="form-input"
          placeholder="Paste one approved symbol"
          onChange={(e) => handleManualSymbolChange(e.target.value)}
        />
        {validationMessage && <p className="mt-1 text-sm text-rose-700">{validationMessage}</p>}
      </div>
    </div>
  );
}
