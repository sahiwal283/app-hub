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
        Boomin & Haute Internal App Launcher
      </span>
      <span className="badge badge-secondary shrink-0 text-[11px] leading-none">
        {versionLabel}
      </span>
    </div>
  );
}

export default function AppBrand({ compact = false }: { compact?: boolean }) {
  const [versionLabel, setVersionLabel] = useState('v--');
  const versionSource = '/api/meta/version';

  useEffect(() => {
    let isMounted = true;

    // Read version exclusively from the live version endpoint.
    getVersionMeta()
      .then((meta) => {
        if (isMounted) {
          setVersionLabel(getVersionLabel(meta.version));
          console.debug('Resolved app version metadata', {
            source: versionSource,
            version: meta.version,
            build: meta.build ?? null,
            commit: meta.commit ?? null,
          });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setVersionLabel('v--');
          console.debug('Failed to resolve app version metadata', {
            source: versionSource,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <AppBrandContent versionLabel={versionLabel} compact={compact} />;
}
