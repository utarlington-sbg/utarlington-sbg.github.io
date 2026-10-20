import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blogSchema, eventSchema } from '../src/lib/schemas.ts';
import { eventPhase, formatEventDate, groupEvents } from '../src/lib/events.ts';

const scheduled = {
  kind: 'scheduled',
  title: 'Workshop fixture',
  startsAt: '2030-07-01T18:00:00-05:00',
  durationMinutes: 60,
  location: 'Workshop room',
  rsvp: 'https://example.com/rsvp',
};

test('a scheduled event requires a date, duration, location, and valid RSVP', () => {
  assert.equal(eventSchema.safeParse(scheduled).success, true);
  const { startsAt, ...withoutDate } = scheduled;
  const { location, ...withoutLocation } = scheduled;
  assert.equal(eventSchema.safeParse(withoutDate).success, false);
  assert.equal(eventSchema.safeParse(withoutLocation).success, false);
  assert.equal(eventSchema.safeParse({ ...scheduled, durationMinutes: -1 }).success, false);
  assert.equal(eventSchema.safeParse({ ...scheduled, rsvp: 'javascript:alert(1)' }).success, false);
});

test('historical events can be listed without inventing their dates', () => {
  const archive = eventSchema.parse({ kind: 'archive', title: 'Past workshop', order: 1, rsvp: 'https://example.com/archive' });
  assert.equal(eventPhase(archive, new Date('2030-01-01')), 'past');
});

test('events remain upcoming through their duration, then move to the archive', () => {
  const event = eventSchema.parse(scheduled);
  assert.equal(eventPhase(event, new Date('2030-07-01T22:30:00Z')), 'upcoming');
  assert.equal(eventPhase(event, new Date('2030-07-01T23:30:00Z')), 'upcoming');
  assert.equal(eventPhase(event, new Date('2030-07-02T00:00:00Z')), 'past');
});

test('empty event content has an honest empty state, and upcoming events sort by date', () => {
  assert.deepEqual(groupEvents([], new Date('2030-01-01')), { upcoming: [], past: [] });
  const later = { id: 'later', data: eventSchema.parse({ ...scheduled, startsAt: '2030-08-01T18:00:00-05:00' }) };
  const earlier = { id: 'earlier', data: eventSchema.parse(scheduled) };
  assert.deepEqual(groupEvents([later, earlier], new Date('2030-01-01')).upcoming.map(event => event.id), ['earlier', 'later']);
});

test('Arlington dates display the correct winter and summer time zones', () => {
  assert.match(formatEventDate('2030-01-01T18:00:00-06:00'), /CST/);
  assert.match(formatEventDate('2030-07-01T18:00:00-05:00'), /CDT/);
});

test('published posts require attribution and a real publication date', () => {
  const base = { title: 'A build log', summary: 'What we built.', category: 'Build log' };
  assert.equal(blogSchema.safeParse({ ...base, status: 'sample' }).success, true);
  assert.equal(blogSchema.safeParse({ ...base, status: 'draft' }).success, true);
  assert.equal(blogSchema.safeParse({ ...base, status: 'published' }).success, false);
  assert.equal(blogSchema.safeParse({ ...base, status: 'published', author: 'A student', publishedAt: '2030-01-01' }).success, true);
});
