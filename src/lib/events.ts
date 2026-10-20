import type { EventData } from './schemas.ts';
import { site } from '../data/site.ts';

export function eventPhase(event: EventData, now = new Date()): 'upcoming' | 'past' {
  if (event.kind === 'archive') return 'past';
  return Date.parse(event.startsAt) + event.durationMinutes * 60_000 > now.getTime() ? 'upcoming' : 'past';
}

export function groupEvents<T extends { data: EventData }>(entries: T[], now = new Date()) {
  return {
    upcoming: entries.filter(entry => eventPhase(entry.data, now) === 'upcoming').sort((a, b) => {
      const left = a.data.kind === 'scheduled' ? Date.parse(a.data.startsAt) : 0;
      const right = b.data.kind === 'scheduled' ? Date.parse(b.data.startsAt) : 0;
      return left - right;
    }),
    past: entries.filter(entry => eventPhase(entry.data, now) === 'past').sort((a, b) => {
      if (a.data.kind === 'archive' && b.data.kind === 'archive') return a.data.order - b.data.order;
      if (a.data.kind === 'archive') return 1;
      if (b.data.kind === 'archive') return -1;
      return Date.parse(b.data.startsAt) - Date.parse(a.data.startsAt);
    }),
  };
}

export function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: site.timezone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}
