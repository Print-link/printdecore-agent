import { useState } from 'react';
import { Check, CheckCircle, Clock, Eye, MapPin, Package, Printer, Store, Truck, XCircle } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import { customerSees, nextAction, shopStep, stepLabels } from '../../../lib/shopSteps';
import type { ClerkOrder, OrderStatus } from '../../../types';
import { Card, Button, StatusBadge, Select } from '../../ui';

interface OrderInfoCardProps {
	order: ClerkOrder;
	isUpdating: boolean;
	onMarkAsComplete: () => void;
	onMarkAsReceived?: (estimatedTime: Date) => void;
	onAdvanceStatus?: (nextStatus: OrderStatus) => void;
	/** Marketplace orders only — opens the decline-and-refund dialog. */
	onDecline?: () => void;
}

/**
 * The three steps a shop takes on a paid order, with the current one marked,
 * and what the customer sees right now — so staff know what they've been told.
 */
function ShopStepper({ order }: { order: ClerkOrder }) {
	const t = useThemeClasses();
	const step = shopStep(order.status);
	if (step === null) return null;
	const labels = stepLabels(order);
	const sees = customerSees(order);
	const icons = [Printer, order.fulfilmentType === 'delivery' ? Truck : Package, CheckCircle];

	return (
		<div className={`mb-3 rounded-lg border p-3 ${t.isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
			<ol className="flex items-start" aria-label="Order steps">
				{labels.map((label, i) => {
					const done = i < step;
					const current = i === step && step < 3;
					const Icon = icons[i];
					return (
						<li key={label} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
							{i > 0 && (
								<span
									aria-hidden="true"
									className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
										i <= step ? 'bg-emerald-500' : t.isDark ? 'bg-gray-700' : 'bg-gray-200'
									}`}
								/>
							)}
							<span
								className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ${
									t.isDark ? 'ring-gray-800' : 'ring-gray-50'
								} ${
									done
										? 'bg-emerald-500 text-white'
										: current
											? 'bg-amber-400 text-black'
											: t.isDark
												? 'bg-gray-700 text-gray-400'
												: 'bg-white text-gray-400 ring-gray-50 border border-gray-200'
								}`}
							>
								{done ? <Check size={15} /> : <Icon size={15} />}
							</span>
							<span
								className={`mt-1.5 px-1 text-[11px] leading-tight ${
									done || current ? `font-semibold ${t.text}` : t.textSecondary
								}`}
							>
								{i + 1}. {label}
							</span>
						</li>
					);
				})}
			</ol>
			{sees && (
				<p className={`mt-3 flex items-center justify-center gap-1.5 text-xs ${t.textSecondary}`}>
					<Eye size={13} /> Customer sees: <span className={`font-medium ${t.text}`}>{sees}</span>
				</p>
			)}
		</div>
	);
}

// Time options for estimated completion
const TIME_OPTIONS = [
	{ label: '15 minutes', minutes: 15 },
	{ label: '30 minutes', minutes: 30 },
	{ label: '45 minutes', minutes: 45 },
	{ label: '1 hour', minutes: 60 },
	{ label: '1.5 hours', minutes: 90 },
	{ label: '2 hours', minutes: 120 },
	{ label: '3 hours', minutes: 180 },
	{ label: '4 hours', minutes: 240 },
	{ label: 'Tomorrow', minutes: 1440 },
];

export function OrderInfoCard({ order, isUpdating, onMarkAsComplete, onMarkAsReceived, onAdvanceStatus, onDecline }: OrderInfoCardProps) {
	const t = useThemeClasses();
	const [showTimeDropdown, setShowTimeDropdown] = useState(false);
	const [selectedTime, setSelectedTime] = useState<number | null>(null);

	const marketplace = order.channel === 'marketplace';
	// Only paid orders can be started — unpaid managed orders are still with Printdecore
	const action = nextAction(order);
	const canMarkAsReceived = action?.kind === 'accept';
	const canDecline = marketplace && !!onDecline && order.status === 'PAID';
	const complete = action?.kind === 'complete' ? action : null;
	const stage = action?.kind === 'advance' ? action : null;

	const handleMarkAsReceivedClick = () => {
		setShowTimeDropdown(true);
	};

	const handleTimeSelect = (minutes: number) => {
		setSelectedTime(minutes);
	};

	const handleConfirmReceived = () => {
		if (selectedTime && onMarkAsReceived) {
			const estimatedTime = new Date();
			estimatedTime.setMinutes(estimatedTime.getMinutes() + selectedTime);
			onMarkAsReceived(estimatedTime);
			setShowTimeDropdown(false);
			setSelectedTime(null);
		}
	};

	const handleCancelTimeSelection = () => {
		setShowTimeDropdown(false);
		setSelectedTime(null);
	};

	// Format estimated completion time if present
	const formattedEstimatedTime = order.estimatedCompletionTime
		? new Date(order.estimatedCompletionTime).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
		  })
		: null;

	return (
		<Card padding="sm" className="p-3 sm:p-4">
			<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
				<div>
					<p className={`text-sm font-medium mb-1 ${t.textSecondary}`}>
						Order Number
					</p>
					<p className={`text-lg font-bold ${t.text}`}>
						{order.orderNumber}
					</p>
				</div>
				<div className="flex items-center gap-1.5">
					<span
						className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
							marketplace
								? t.isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'
								: t.isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
						}`}
					>
						{marketplace ? <><Store size={12} /> Your customer</> : 'Via Printdecore'}
					</span>
					<StatusBadge status={order.status} className="px-3 py-1 text-xs font-semibold" />
				</div>
			</div>

			{/* A marketplace order waiting on you — the one decision to make */}
			{marketplace && order.status === 'PAID' && !showTimeDropdown && (
				<div
					className={`mb-3 p-3 rounded-lg border ${
						t.isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'
					}`}
				>
					<p className={`text-sm font-semibold ${t.text}`}>New order — paid and waiting for you</p>
					<p className={`text-xs mt-0.5 ${t.textSecondary}`}>
						Accept with a ready-by time and it goes straight into production, or decline and the customer is refunded.
					</p>
				</div>
			)}

			<ShopStepper order={order} />

			{order.fulfilmentType && (
				<div className={`mb-3 flex items-start gap-2 text-sm ${t.text}`}>
					{order.fulfilmentType === 'pickup' ? <Store size={16} /> : <MapPin size={16} />}
					<span>
						{order.fulfilmentType === 'pickup'
							? 'Customer will pick up'
							: `Deliver to ${order.deliveryAddress || 'customer'}`}
						{order.recipientPhone ? ` · ${order.recipientPhone}` : ''}
					</span>
				</div>
			)}

			{order.status === 'CANCELLED' && order.declineReason && (
				<div
					role="status"
					className={`relative mb-3 overflow-hidden rounded-lg border p-3 pl-4 text-sm ${
						t.isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'
					}`}
				>
					<span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-red-500" />
					<p className={`flex items-center gap-1.5 font-semibold ${t.isDark ? 'text-red-300' : 'text-red-700'}`}>
						<XCircle size={16} /> You declined this order
					</p>
					<p className={`mt-1 ${t.text}`}>“{order.declineReason}”</p>
					<p className={`mt-1 text-xs ${t.textSecondary}`}>
						{order.refundStatus === 'failed'
							? "The customer was told. The automatic refund didn't go through — Printdecore will refund them."
							: order.refundStatus
								? 'The customer was told and is being refunded in full.'
								: "The customer was told. They hadn't paid, so there's nothing to refund."}
					</p>
				</div>
			)}

			{/* The ready-by time the customer was given, while the order is being made */}
			{shopStep(order.status) === 1 && formattedEstimatedTime && (
				<div
					className={`mb-3 p-2 rounded-md flex items-center gap-2 ${
						t.isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'
					}`}
				>
					<Clock size={16} />
					<span className="text-sm">
						Ready by: <strong>{formattedEstimatedTime}</strong>
					</span>
				</div>
			)}

			{/* Show comment if present */}
			{order.comment && (
				<div
					className={`mb-3 p-3 rounded-md border ${
						t.isDark
							? 'bg-gray-800/50 border-gray-700 text-gray-300'
							: 'bg-gray-50 border-gray-200 text-gray-700'
					}`}
				>
					<p className={`text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
						Customer Comment:
					</p>
					<p className="text-sm whitespace-pre-wrap">{order.comment}</p>
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<p className={`text-sm font-medium mb-1 ${t.textSecondary}`}>
						Total Price
					</p>
					<p className={`text-xl font-bold ${t.text}`}>
						₵{order.totalPrice.toFixed(2)}
					</p>
				</div>

				{/* Time Selection Dropdown */}
				{showTimeDropdown && (
					<Card padding="sm" className="flex flex-col gap-2 p-3">
						<p className={`text-sm font-medium ${t.isDark ? 'text-gray-300' : 'text-gray-700'}`}>
							Ready in about:
						</p>
						<Select
							value={selectedTime?.toString() || ''}
							onChange={(e) => handleTimeSelect(Number(e.target.value))}
							placeholder="Select time..."
							options={TIME_OPTIONS.map((option) => ({
								value: option.minutes.toString(),
								label: option.label,
							}))}
						/>
						<div className="flex gap-2 mt-1">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleCancelTimeSelection}
								disabled={isUpdating}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleConfirmReceived}
								disabled={!selectedTime || isUpdating}
								loading={isUpdating}
								icon={isUpdating ? undefined : Package}
								className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
							>
								{isUpdating ? 'Updating...' : 'Start order'}
							</Button>
						</div>
					</Card>
				)}

				{/* Accept: starts production (needs a ready-by time) — plus decline for marketplace orders */}
				{canMarkAsReceived && !showTimeDropdown && (
					<div className="flex gap-2">
						{canDecline && (
							<Button variant="secondary" onClick={onDecline} disabled={isUpdating} icon={XCircle}>
								Decline
							</Button>
						)}
						<Button
							onClick={handleMarkAsReceivedClick}
							disabled={isUpdating}
							icon={Package}
							className="bg-blue-500 hover:bg-blue-600 text-white"
						>
							{isUpdating ? 'Updating...' : 'Accept & start'}
						</Button>
					</div>
				)}

				{/* Advance to next production/delivery stage */}
				{stage && !showTimeDropdown && onAdvanceStatus && (
					<Button
						onClick={() => onAdvanceStatus(stage.next)}
						disabled={isUpdating}
						icon={stage.next === 'OUT_FOR_DELIVERY' ? Truck : Package}
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						{isUpdating ? 'Updating...' : stage.label}
					</Button>
				)}

				{/* Last step: in the customer's hands */}
				{complete && !showTimeDropdown && (
					<Button
						onClick={onMarkAsComplete}
						disabled={isUpdating}
						icon={CheckCircle}
						className="bg-green-500 hover:bg-green-600 text-white"
					>
						{isUpdating ? 'Updating...' : complete.label}
					</Button>
				)}
			</div>
		</Card>
	);
}
