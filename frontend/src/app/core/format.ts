export function formatKg(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) {
    return '0';
  }
  return Number.isInteger(n) ? String(n) : String(n);
}

export function plateBand(weightKg: number): 'green' | 'yellow' | 'blue' | 'red' {
  if (weightKg < 10) {
    return 'green';
  }
  if (weightKg < 15) {
    return 'yellow';
  }
  if (weightKg < 20) {
    return 'blue';
  }
  return 'red';
}

export function formatDay(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function trendCopy(direction: string): string {
  switch (direction) {
    case 'up':
      return 'Getting stronger';
    case 'down':
      return 'Down from your earlier peak';
    case 'stable':
      return 'Holding steady';
    default:
      return 'Log more sessions to see a trend';
  }
}

export function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}
