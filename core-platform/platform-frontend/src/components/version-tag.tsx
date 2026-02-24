'use client';

import { useEffect, useMemo, useState } from 'react';
import { getVersionMeta, VersionMeta } from '@/lib/api';

interface VersionTagContentProps {
  meta: VersionMeta;
  className?: string;
}

export function VersionTagContent({ meta, className }: VersionTagContentProps) {
  const label = useMemo(
    () => `Version ${meta.version} (${meta.build})`,
    [meta.version, meta.build]
  );

  return (
    <div
      className={`max-w-[75vw] sm:max-w-xs truncate rounded-md border border-earthy-ebony/15 bg-earthy-ebony/5 px-2 py-1 text-xs text-earthy-charcoal/80 ${className || ''}`.trim()}
      title={label}
      aria-label={label}
    >
      {label}
    </div>
  );
}

export default function VersionTag({ className }: { className?: string }) {
  const [meta, setMeta] = useState<VersionMeta | null>(null);

  useEffect(() => {
    let mounted = true;

    getVersionMeta()
      .then((data) => {
        if (mounted) {
          setMeta(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setMeta({ version: 'unknown', build: 'unknown' });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!meta) {
    return null;
  }

  return <VersionTagContent meta={meta} className={className} />;
}
