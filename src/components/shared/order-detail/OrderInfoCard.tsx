import { useState } from 'react';
import { CheckCircle, Clock, MapPin, Package, Printer, Search, Store, Truck, XCircle } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
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

type Stage = { next: OrderStatus; label: string; icon: typeof Printer };

/**
 * The one next step for an order, matching what the server allows. Accepting
 * (PAID → RECEIVED, needs a ready-by time) and completing (needs a confirm)
 * are handled separately, so they aren't here. After quality check the step
 * depends on whether the customer is collecting or getting it delivered.
 */
const nextStage = (order: ClerkOrder): Stage | undefined => {
	const pickup = order.fulfilmentType === 'pickup';
	switch (order.status) {
		case 'RECEIVED':
			return { next: 'PRINTING', label: 'Start printing', icon: Printer };
		case 'PRINTING':
		case 'IN_PROGRESS':
			return { next: 'QUALITY_CHECK', label: 'Send to quality check', icon: Search };
		case 'QUALITY_CHECK':
			return pickup
				? { next: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: Package }
				: { next: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck };
		case 'READY_FOR_PICKUP':
			return pickup ? undefined : { next: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck };
		case 'OUT_FOR_DELIVERY':
			return { next: 'DELIVERED', label: 'Mark delivered', icon: CheckCircle };
		default:
			return undefined;
	}
};

/** Done-and-handed-over states the server lets you close an order from. */
const COMPLETABLE_STATUSES: OrderStatus[] = ['READY_FOR_PICKUP', 'DELIVERED'];

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
	const canMarkAsReceived = order.status === 'PAID';
	const canDecline = marketplace && !!onDecline && (order.status === 'PAID' || order.status === 'RECEIVED');
	const canMarkAsCompleted = COMPLETABLE_STATUSES.includes(order.status);
	const stage = nextStage(order);

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
						Accept it with a ready-by time, or decline and the customer is refunded.
					</p>
				</div>
			)}

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
				<div className={`mb-3 p-2 rounded-md text-sm ${t.isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
					You declined this order: “{order.declineReason}”. The customer was refunded.
				</div>
			)}

			{/* Show estimated completion time if order is received */}
			{order.status === 'RECEIVED' && formattedEstimatedTime && (
				<div
					className={`mb-3 p-2 rounded-md flex items-center gap-2 ${
						t.isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'
					}`}
				>
					<Clock size={16} />
					<span className="text-sm">
						Estimated completion: <strong>{formattedEstimatedTime}</strong>
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
								{isUpdating ? 'Updating...' : 'Confirm'}
							</Button>
						</div>
					</Card>
				)}

				{/* Accept / confirm received (needs a ready-by time) — plus decline for marketplace orders */}
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
							{isUpdating ? 'Updating...' : marketplace ? 'Accept order' : 'Confirm received'}
						</Button>
					</div>
				)}

				{/* Advance to next production/delivery stage */}
				{stage && !showTimeDropdown && onAdvanceStatus && (
					<Button
						onClick={() => onAdvanceStatus(stage.next)}
						disabled={isUpdating}
						icon={stage.icon}
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						{isUpdating ? 'Updating...' : stage.label}
					</Button>
				)}

				{/* Mark as Completed Button (available from any late-stage order) */}
				{canMarkAsCompleted && !showTimeDropdown && (
					<Button
						onClick={onMarkAsComplete}
						disabled={isUpdating}
						icon={CheckCircle}
						className="bg-green-500 hover:bg-green-600 text-white"
					>
						{isUpdating ? 'Updating...' : 'Mark as Completed'}
					</Button>
				)}
			</div>
		</Card>
	);
}
