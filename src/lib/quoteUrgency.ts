import { useEffect, useState } from 'react';
import type { ClerkOrder } from '../types';

/**
 * Orders waiting on your price, and how urgent each one is. The customer is
 * waiting from the moment they ask, so urgency grows with the wait:
 * new (under 30 min), due (under 2 h), then late.
 */
export type QuoteUrgency = 'new' | 'due' | 'late';

const DUE_AFTER_MS = 30 * 60 * 1000;
const LATE_AFTER_MS = 2 * 60 * 60 * 1000;

export const needsQuote = (order: Pick<ClerkOrder, 'status'>) => order.status === 'PENDING';

export function quoteUrgency(requestedAt: string | Date, now = Date.now()): QuoteUrgency {
	const waited = now - new Date(requestedAt).getTime();
	return waited >= LATE_AFTER_MS ? 'late' : waited >= DUE_AFTER_MS ? 'due' : 'new';
}

/** "just now", "12 min", "2 h 5 min", "3 days" */
export function waitedFor(requestedAt: string | Date, now = Date.now()): string {
	const mins = Math.max(0, Math.floor((now - new Date(requestedAt).getTime()) / 60000));
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins} min`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return mins % 60 ? `${hours} h ${mins % 60} min` : `${hours} h`;
	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? '' : 's'}`;
}

/** Colours per urgency, light and dark */
export const URGENCY_STYLE: Record<QuoteUrgency, { bar: string; dot: string; pill: { light: string; dark: string }; label: string }> = {
	new: {
		bar: 'bg-amber-400',
		dot: 'bg-amber-500',
		pill: { light: 'bg-amber-50 text-amber-800 ring-amber-200', dark: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
		label: 'Quote needed',
	},
	due: {
		bar: 'bg-orange-500',
		dot: 'bg-orange-500',
		pill: { light: 'bg-orange-50 text-orange-800 ring-orange-200', dark: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
		label: 'Quote due',
	},
	late: {
		bar: 'bg-red-500',
		dot: 'bg-red-500',
		pill: { light: 'bg-red-50 text-red-700 ring-red-200', dark: 'bg-red-500/15 text-red-300 ring-red-500/30' },
		label: 'Quote overdue',
	},
};

/** The time, refreshed every minute so waits stay current */
export function useNow(everyMs = 60_000): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), everyMs);
		return () => clearInterval(timer);
	}, [everyMs]);
	return now;
}
