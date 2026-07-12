import { useState } from 'react';
import { CheckCircle, Clock, Package, Printer, Search, Truck } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import type { ClerkOrder, OrderStatus } from '../../../types';
import { Card, Button, StatusBadge, Select } from '../../ui';

interface OrderInfoCardProps {
	order: ClerkOrder;
	isUpdating: boolean;
	onMarkAsComplete: () => void;
	onMarkAsReceived?: (estimatedTime: Date) => void;
	onAdvanceStatus?: (nextStatus: OrderStatus) => void;
}

/**
 * The production/delivery stage each status advances to next, and what to call
 * the button that does it. RECEIVED and COMPLETED are handled separately above
 * (they need extra input / a confirm step), so they aren't in this map.
 */
const NEXT_STAGE: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: typeof Printer }>> = {
	RECEIVED: { next: 'PRINTING', label: 'Start Printing', icon: Printer },
	PRINTING: { next: 'QUALITY_CHECK', label: 'Send to Quality Check', icon: Search },
	IN_PROGRESS: { next: 'QUALITY_CHECK', label: 'Send to Quality Check', icon: Search },
	QUALITY_CHECK: { next: 'READY_FOR_PICKUP', label: 'Mark Ready for Pickup', icon: Package },
	READY_FOR_PICKUP: { next: 'OUT_FOR_DELIVERY', label: 'Mark Out for Delivery', icon: Truck },
	OUT_FOR_DELIVERY: { next: 'DELIVERED', label: 'Mark Delivered', icon: CheckCircle },
};

const COMPLETABLE_STATUSES: OrderStatus[] = [
	'QUOTED', 'RECEIVED', 'IN_PROGRESS', 'PRINTING', 'QUALITY_CHECK',
	'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

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

export function OrderInfoCard({ order, isUpdating, onMarkAsComplete, onMarkAsReceived, onAdvanceStatus }: OrderInfoCardProps) {
	const t = useThemeClasses();
	const [showTimeDropdown, setShowTimeDropdown] = useState(false);
	const [selectedTime, setSelectedTime] = useState<number | null>(null);

	const canMarkAsReceived = order.status === 'PAID' || order.status === 'PENDING';
	const canMarkAsCompleted = COMPLETABLE_STATUSES.includes(order.status);
	const nextStage = NEXT_STAGE[order.status];

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
				<StatusBadge status={order.status} className="px-3 py-1 text-xs font-semibold" />
			</div>

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
							Estimated Completion Time:
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

				{/* Mark as Received Button (for PAID/PENDING orders) */}
				{canMarkAsReceived && !showTimeDropdown && (
					<Button
						onClick={handleMarkAsReceivedClick}
						disabled={isUpdating}
						icon={Package}
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						{isUpdating ? 'Updating...' : 'Mark as Received'}
					</Button>
				)}

				{/* Advance to next production/delivery stage */}
				{nextStage && !showTimeDropdown && onAdvanceStatus && (
					<Button
						onClick={() => onAdvanceStatus(nextStage.next)}
						disabled={isUpdating}
						icon={nextStage.icon}
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						{isUpdating ? 'Updating...' : nextStage.label}
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
