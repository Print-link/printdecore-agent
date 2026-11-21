import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api';
import { useThemeClasses } from '../../../lib/theme';
import { Bell, Clock, Package, Spinner, Store, Truck } from '../../icons';
import type { ClerkOrder } from '../../../types';
import { PromptModal } from './PromptModal';

/** How soon it'll be ready; the customer sees this time */
const READY_BY = [
	{ label: '30 min', minutes: 30 },
	{ label: '1 hr', minutes: 60 },
	{ label: '2 hrs', minutes: 120 },
	{ label: '4 hrs', minutes: 240 },
	{ label: 'Tomorrow', minutes: 1440 },
];

interface ReviewOrderModalProps {
	/** A paid order nobody has picked up yet; null closes the modal */
	order: ClerkOrder | null;
	onClose: () => void;
	/** Accepted and in production: open it */
	onReviewed: (order: ClerkOrder) => void;
}

/**
 * A new paid order was clicked: offer to accept it. Accepting puts it straight
 * into production with a ready-by time (the customer is told), then opens it.
 */
export function ReviewOrderModal({ order, onClose, onReviewed }: ReviewOrderModalProps) {
	const t = useThemeClasses();
	const queryClient = useQueryClient();
	const [minutes, setMinutes] = useState(60);
	const [done, setDone] = useState(false);
	// Keep the last order on screen while the modal animates out
	const [shown, setShown] = useState<ClerkOrder | null>(order);

	useEffect(() => {
		if (order) {
			setShown(order);
			setDone(false);
			setMinutes(60);
		}
	}, [order]);

	const receive = useMutation({
		mutationFn: (o: ClerkOrder) => {
			const readyBy = new Date(Date.now() + minutes * 60 * 1000).toISOString();
			return apiService
				.updateBranchOrder(o.id, { status: 'IN_PROGRESS', estimatedCompletionTime: readyBy })
				.then(() => ({ ...o, status: 'IN_PROGRESS' as const, estimatedCompletionTime: readyBy, updatedAt: new Date().toISOString() }));
		},
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: ['branchOrders'] });
			queryClient.invalidateQueries({ queryKey: ['orderDetail', updated.id] });
			setDone(true);
			// A beat to see the tick, then straight into the order
			setTimeout(() => onReviewed(updated), 650);
		},
	});

	const o = order ?? shown;
	const busy = receive.isPending || done;
	const marketplace = o?.channel === 'marketplace';
	const pickup = o?.fulfilmentType === 'pickup';

	return (
		<PromptModal open={!!order} onDismiss={busy ? undefined : onClose} icon={<Bell size={26} />} labelledBy="review-order-title">
			{o && (
				<div className="text-center">
					<span
						className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
							marketplace
								? t.isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'
								: t.isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
						}`}
					>
						{marketplace ? <><Store size={12} /> Your customer</> : 'Via Printdecore'} · Paid
					</span>
					<h2 id="review-order-title" className={`mt-2 text-xl font-bold ${t.text}`}>
						Start order {o.orderNumber}?
					</h2>
					<p className={`mt-1 text-sm ${t.textSecondary}`}>
						{o.client.fullName || 'A customer'} paid <span className={`font-semibold ${t.text}`}>₵{o.totalPrice.toFixed(2)}</span>
					</p>

					<div className={`mt-4 grid grid-cols-2 gap-2 text-left text-xs pd-rise`} style={{ animationDelay: '120ms' }}>
						<div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${t.isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
							<Package size={16} className={t.textSecondary} />
							<span className={t.text}>
								{o.itemCount > 0 ? `${o.itemCount} item${o.itemCount !== 1 ? 's' : ''}` : 'Custom job'}
							</span>
						</div>
						<div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${t.isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
							{pickup ? <Store size={16} className={t.textSecondary} /> : <Truck size={16} className={t.textSecondary} />}
							<span className={`truncate ${t.text}`}>{pickup ? 'Customer collects' : 'Delivery'}</span>
						</div>
					</div>

					<div className="mt-5 text-left pd-rise" style={{ animationDelay: '200ms' }}>
						<p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${t.textSecondary}`}>
							<Clock size={14} /> Ready by
						</p>
						<div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ready by">
							{READY_BY.map((option) => {
								const active = minutes === option.minutes;
								return (
									<button
										key={option.minutes}
										type="button"
										role="radio"
										aria-checked={active}
										disabled={busy}
										onClick={() => setMinutes(option.minutes)}
										className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
											active
												? 'bg-amber-400 border-amber-400 text-black scale-105 shadow-sm'
												: t.isDark
													? 'border-gray-600 text-gray-300 hover:border-amber-400/60'
													: 'border-gray-200 text-gray-700 hover:border-amber-300'
										}`}
									>
										{option.label}
									</button>
								);
							})}
						</div>
						<p className={`mt-2 text-xs ${t.textSecondary}`}>
							Starting puts it <span className="font-semibold">In production</span> — the customer is told you're on it and when it'll be ready.
						</p>
					</div>

					{receive.isError && (
						<p className="mt-3 text-sm text-red-500">
							{receive.error instanceof Error ? receive.error.message : "Couldn't update this order"}
						</p>
					)}

					<div className="mt-6 flex gap-2">
						<button
							type="button"
							onClick={onClose}
							disabled={busy}
							className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
								t.isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
							}`}
						>
							Not now
						</button>
						<button
							type="button"
							onClick={() => receive.mutate(o)}
							disabled={busy}
							className={`flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
								done ? 'bg-emerald-500 text-white' : 'bg-amber-400 hover:bg-amber-500 text-black active:scale-[0.98]'
							}`}
						>
							{done ? (
								<>
									<svg className="pd-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M5 12.5l4.5 4.5L19 7.5" />
									</svg>
									Started
								</>
							) : receive.isPending ? (
								<>
									<Spinner size="sm" className="text-black" /> Opening…
								</>
							) : (
								'Start order'
							)}
						</button>
					</div>
				</div>
			)}
		</PromptModal>
	);
}
