import type { SVGProps } from 'react';

export function AppModuleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 15.5c.2-2.2 1.9-3.5 3.5-3.5s3.3 1.3 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 15.5c.2-1.7 1.5-2.6 2.7-2.6 1.2 0 2.4.9 2.6 2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M10 3l5 2v4.5c0 3.2-2.1 5.7-5 7-2.9-1.3-5-3.8-5-7V5l5-2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.7 9.8l1.7 1.7 2.9-2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4 16V9.5M10 16V6M16 16v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 16.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const APP_ICON_OPTIONS = [
  { key: 'grid', label: 'Grid' },
  { key: 'users', label: 'Users' },
  { key: 'shield', label: 'Security' },
  { key: 'chart', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
] as const;

export type AppIconKey = (typeof APP_ICON_OPTIONS)[number]['key'];

const APP_ICON_COMPONENTS: Record<AppIconKey, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  grid: AppModuleIcon,
  users: UsersIcon,
  shield: ShieldIcon,
  chart: ChartIcon,
  settings: SettingsIcon,
};

export function isAppIconKey(value: string | null | undefined): value is AppIconKey {
  if (!value) {
    return false;
  }
  return APP_ICON_OPTIONS.some((option) => option.key === value);
}

export function resolveAppIconKey(value: string | null | undefined): AppIconKey {
  return isAppIconKey(value) ? value : 'grid';
}

export function AppIcon({ iconKey, className }: { iconKey?: string | null; className?: string }) {
  const resolvedIconKey = resolveAppIconKey(iconKey);
  const IconComponent = APP_ICON_COMPONENTS[resolvedIconKey];
  return <IconComponent className={className} />;
}
