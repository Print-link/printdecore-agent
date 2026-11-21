import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api';
import { useThemeClasses } from '../../../lib/theme';
import { useOrderPromptStore } from '../../../stores/orderPromptStore';
import { useToast } from '../../../contexts/ToastContext';
import { AlertTriangle, Clock, Printer, Spinner } from '../../icons';
import type { ClerkOrder } from '../../../types';
import { PromptModal } from './PromptModal';
import { askAgainIn, forget, nextAskAt, SNOOZE_MS } from './startReminder';

interface StartWorkReminderProps {
	/** The branch's orders (the layout already polls them) */
	orders: ClerkOrder[];
}

const TICK_MS = 30 * 1000;
/** "4:25 PM" today, "Nov 20, 4:25 PM" on any other day */
const time = (d: Date) =>
	d.toDateString() === new Date().toDateString()
		? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
		: d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Anywhere in the app: an order was received but not started — ask whether
 * work has begun. "Yes" moves it to In progress (the customer sees it);
 * "Not yet" asks again in 15 minutes.
 */
export function StartWorkReminder({ orders }: StartWorkReminderProps) {
	const t = useThemeClasses();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { success } = useToast();
	const reviewOpen = useOrderPromptStore((s) => s.reviewOpen);
	const [now, setNow] = useState(() => Date.now());
	const [done, setDone] = useState(false);

	// Re-check on a timer so a snooze runs out without a page change
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, []);

	const waiting = useMemo(() => orders.filter((o) => o.status === 'RECEIVED'), [orders]);

	// Orders that left Received are done with — drop their timers
	useEffect(() => {
		const ids = new Set(waiting.map((o) => o.id));
		try {
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const k = localStorage.key(i);
				if (k?.startsWith('pd:start-reminder:') && !ids.has(k.slice(18))) forget(k.slice(18));
			}
		} catch {
			// storage blocked
		}
	}, [waiting]);

	const due = useMemo(
		() =>
			waiting
				.map((o) => ({ order: o, at: nextAskAt(o.id, new Date(o.updatedAt).getTime()) }))
				.filter((d) => d.at <= now)
				.sort((a, b) => a.at - b.at)
				.map((d) => d.order),
		// `now` drives the re-check and re-reads storage after an answer
		[waiting, now]
	);

	const current = due[0] ?? null;

	const start = useMutation({
		mutationFn: (o: ClerkOrder) => apiService.updateBranchOrder(o.id, { status: 'IN_PROGRESS' }),
		onSuccess: (_d, o) => {
			// Show the tick on this order, then move on. Its timer is pushed out
			// so it can't flash back before the refreshed list drops it.
			setDone(true);
			queryClient.invalidateQueries({ queryKey: ['branchOrders'] });
			queryClient.invalidateQueries({ queryKey: ['orderDetail', o.id] });
			success(`Order ${o.orderNumber} is in progress — the customer can see it`, 'Started', 3500);
			setTimeout(() => {
				askAgainIn(o.id, SNOOZE_MS);
				setDone(false);
				setNow(Date.now());
			}, 650);
		},
	});

	const snooze = (o: ClerkOrder) => {
		askAgainIn(o.id, SNOOZE_MS);
		setNow(Date.now());
	};

	// Keep the last order on screen while the modal animates out
	const [shown, setShown] = useState<ClerkOrder | null>(current);
	useEffect(() => {
		if (current) setShown(current);
	}, [current]);

	const open = !!current && (!reviewOpen || start.isPending || done);
	const readyBy = shown?.estimatedCompletionTime ? new Date(shown.estimatedCompletionTime) : undefined;
	const late = readyBy ? readyBy.getTime() < now : false;

	return (
		<PromptModal
			open={open}
			tone="violet"
			icon={<Printer size={26} />}
			labelledBy="start-work-title"
		>
			{shown && (
				<div className="text-center">
					{due.length > 1 && (
						<span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
							{due.length} orders waiting to start
						</span>
					)}
					<h2 id="start-work-title" className={`mt-2 text-xl font-bold ${t.text}`}>
						Have you started on {shown.orderNumber}?
					</h2>
					<p className={`mt-1 text-sm ${t.textSecondary}`}>
						{shown.client.fullName || 'The customer'} · {shown.itemCount > 0 ? `${shown.itemCount} item${shown.itemCount !== 1 ? 's' : ''}` : 'Custom job'}
					</p>

					{readyBy && (
						<div
							className={`mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium pd-rise ${
								late
									? t.isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
									: t.isDark ? 'bg-gray-700/50 text-gray-200' : 'bg-gray-50 text-gray-700'
							}`}
						>
							{late ? <AlertTriangle size={16} /> : <Clock size={16} />}
							{late ? `Was due at ${time(readyBy)}` : `Due by ${time(readyBy)}`}
						</div>
					)}

					{start.isError && (
						<p className="mt-3 text-sm text-red-500">
							{start.error instanceof Error ? start.error.message : "Couldn't update this order"}
						</p>
					)}

					<div className="mt-6 flex gap-2">
						<button
							type="button"
							onClick={() => snooze(shown)}
							disabled={start.isPending || done}
							className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
								t.isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
							}`}
						>
							Not yet
						</button>
						<button
							type="button"
							onClick={() => start.mutate(shown)}
							disabled={start.isPending || done}
							className={`flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
								done ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white active:scale-[0.98]'
							}`}
						>
							{done ? (
								<>
									<svg className="pd-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M5 12.5l4.5 4.5L19 7.5" />
									</svg>
									Started
								</>
							) : start.isPending ? (
								<>
									<Spinner size="sm" className="text-white" /> Updating…
								</>
							) : (
								"Yes, I've started"
							)}
						</button>
					</div>
					<p className={`mt-3 text-xs ${t.textSecondary}`}>
						Not yet? We'll ask again in 15 minutes.{' '}
						<button
							type="button"
							onClick={() => {
								snooze(shown);
								navigate(`/app/orders?order=${shown.id}`);
							}}
							className="font-semibold text-amber-600 hover:underline"
						>
							Open the order
						</button>
					</p>
				</div>
			)}
		</PromptModal>
	);
}
