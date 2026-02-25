const ET_TIMEZONE = 'America/New_York';

function getEtHour(date: Date): number {
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });

  const parts = hourFormatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === 'hour')?.value;
  const parsedHour = Number(hourPart);
  return Number.isNaN(parsedHour) ? 0 : parsedHour;
}

export function getEtGreeting(date = new Date()): string {
  const hour = getEtHour(date);

  if (hour >= 5 && hour < 12) {
    return 'Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Evening';
  }
  return 'Night';
}

export function getEtDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
