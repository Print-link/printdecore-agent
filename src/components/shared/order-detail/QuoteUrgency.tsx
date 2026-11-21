import { useThemeClasses } from '../../../lib/theme';
import { quoteUrgency, URGENCY_STYLE, useNow, waitedFor, type QuoteUrgency } from '../../../lib/quoteUrgency';
import { AlertTriangle, Clock, Receipt } from '../../icons';

/** A live dot: pulses while the customer is waiting (still for reduced motion) */
export function PulseDot({ urgency }: { urgency: QuoteUrgency }) {
	const dot = URGENCY_STYLE[urgency].dot;
	return (
		<span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
			<span className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${dot}`} />
			<span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
		</span>
	);
}

/** "Quote needed · 12 min" — on an order in the list */
export function QuoteNeededPill({ requestedAt }: { requestedAt: string | Date }) {
	const t = useThemeClasses();
	const now = useNow();
	const urgency = quoteUrgency(requestedAt, now);
	const style = URGENCY_STYLE[urgency];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
				t.isDark ? style.pill.dark : style.pill.light
			}`}
		>
			<PulseDot urgency={urgency} />
			{style.label}
		</span>
	);
}

/** The coloured edge on a list row, by urgency */
export function UrgencyEdge({ requestedAt }: { requestedAt: string | Date }) {
	const now = useNow();
	return <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${URGENCY_STYLE[quoteUrgency(requestedAt, now)].bar}`} />;
}

/** How long the customer has waited, for the list row */
export function WaitingFor({ requestedAt }: { requestedAt: string | Date }) {
	const t = useThemeClasses();
	const now = useNow();
	const urgency = quoteUrgency(requestedAt, now);
	const tone =
		urgency === 'late' ? (t.isDark ? 'text-red-300' : 'text-red-600') : urgency === 'due' ? (t.isDark ? 'text-orange-300' : 'text-orange-700') : t.textSecondary;
	return (
		<span className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${tone}`}>
			<Clock size={12} />
			Waiting {waitedFor(requestedAt, now)}
		</span>
	);
}

interface QuoteQueueBarProps {
	/** When each waiting order was requested */
	requestedAt: (string | Date)[];
	/** The list is showing only these orders */
	filtered: boolean;
	onToggle: () => void;
}

/** Above the order list: how many customers are waiting for a price */
export function QuoteQueueBar({ requestedAt, filtered, onToggle }: QuoteQueueBarProps) {
	const t = useThemeClasses();
	const now = useNow();
	if (requestedAt.length === 0) return null;
	const oldest = requestedAt.reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b));
	const urgency = quoteUrgency(oldest, now);
	const late = requestedAt.filter((r) => quoteUrgency(r, now) === 'late').length;
	const n = requestedAt.length;
	const tint =
		urgency === 'late'
			? t.isDark ? 'border-red-500/40 bg-red-500/10' : 'border-red-200 bg-red-50'
			: urgency === 'due'
				? t.isDark ? 'border-orange-500/40 bg-orange-500/10' : 'border-orange-200 bg-orange-50'
				: t.isDark ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-200 bg-amber-50';

	return (
		<div role="status" className={`relative mb-2 flex items-center gap-3 overflow-hidden rounded-lg border py-2.5 pl-4 pr-2.5 ${tint}`}>
			<span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${URGENCY_STYLE[urgency].bar}`} />
			<PulseDot urgency={urgency} />
			<div className="min-w-0 flex-1">
				<p className={`text-sm font-semibold ${t.text}`}>
					{n} customer{n === 1 ? ' is' : 's are'} waiting for your price
				</p>
				<p className={`text-xs ${t.textSecondary}`}>
					{n > 1 ? 'Longest wait' : 'Waiting'} {waitedFor(oldest, now)}
					{n > 1 && late > 0 ? ` · ${late} overdue` : urgency === 'late' ? ' · overdue' : ''}
				</p>
			</div>
			<button
				type="button"
				onClick={onToggle}
				className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
					filtered
						? t.isDark ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-black/5'
						: t.isDark ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-gray-900 text-white hover:bg-gray-700'
				}`}
			>
				{filtered ? 'Show all' : 'Review'}
			</button>
		</div>
	);
}

/** Top of an order that needs your price: what's wrong and the one thing to do */
export function QuoteActionBanner({
	requestedAt,
	onAct,
	declined = false,
}: {
	requestedAt: string | Date;
	onAct: () => void;
	/** The customer turned your last price down and is waiting for a new one */
	declined?: boolean;
}) {
	const t = useThemeClasses();
	const now = useNow();
	const urgency = quoteUrgency(requestedAt, now);
	const late = urgency === 'late';
	const tint = late
		? t.isDark ? 'border-red-500/40 bg-red-500/10' : 'border-red-200 bg-red-50'
		: urgency === 'due'
			? t.isDark ? 'border-orange-500/40 bg-orange-500/10' : 'border-orange-200 bg-orange-50'
			: t.isDark ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-200 bg-amber-50';
	const iconTone = late ? 'text-red-500' : urgency === 'due' ? 'text-orange-500' : 'text-amber-500';

	return (
		<div role="alert" className={`relative flex flex-col gap-3 overflow-hidden rounded-lg border p-3 pl-4 sm:flex-row sm:items-center ${tint}`}>
			<span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${URGENCY_STYLE[urgency].bar}`} />
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<span className={`mt-0.5 shrink-0 ${iconTone}`}>
					<AlertTriangle size={20} />
				</span>
				<div className="min-w-0">
					<p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${iconTone}`}>
						Action required
						<PulseDot urgency={urgency} />
					</p>
					<p className={`mt-0.5 text-sm font-semibold ${t.text}`}>
						{declined
							? 'The customer declined your price — send them a new one'
							: late
								? 'This customer has waited too long for a price'
								: 'The customer is waiting for your price'}
					</p>
					<p className={`mt-0.5 text-xs ${t.textSecondary}`}>
						Requested {waitedFor(requestedAt, now)}
						{waitedFor(requestedAt, now) === 'just now' ? '' : ' ago'} · quick quotes win more orders
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onAct}
				className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
					t.isDark ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-gray-900 text-white hover:bg-gray-700'
				}`}
			>
				<Receipt size={16} />
				{declined ? 'Send a new price' : 'Set your price'}
			</button>
		</div>
	);
}
