'use client';

import { useEffect, useState } from 'react';
import { getVersionMeta } from '@/lib/api';
import { safeDisplayText } from '@/lib/text';

function getVersionLabel(version?: string): string {
  const trimmed = safeDisplayText(version)?.trim();
  if (!trimmed) {
    return 'v--';
  }
  return `v${trimmed}`;
}

export function AppBrandContent({
  versionLabel,
  compact = false,
}: {
  versionLabel: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`truncate font-semibold tracking-tight ${
          compact ? 'text-lg sm:text-xl' : 'text-xl'
        }`}
      >
        Booute App Launcher
      </span>
      <span className="badge badge-secondary shrink-0 text-[11px] leading-none">
        {versionLabel}
      </span>
    </div>
  );
}

export default function AppBrand({ compact = false }: { compact?: boolean }) {
  const [versionLabel, setVersionLabel] = useState('v--');

  useEffect(() => {
    let isMounted = true;

    getVersionMeta()
      .then((meta) => {
        if (isMounted) {
          setVersionLabel(getVersionLabel(meta.version));
        }
      })
      .catch(() => {
        if (isMounted) {
          setVersionLabel('v--');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <AppBrandContent versionLabel={versionLabel} compact={compact} />;
}
