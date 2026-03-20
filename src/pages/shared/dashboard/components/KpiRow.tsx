import {
	AlertCircle,
	CalendarDays,
	TrendingUp,
	Banknote,
	Layers,
	BadgeDollarSign,
	Receipt,
} from '../../../../components/icons';
import { KpiCard } from './KpiCard';
import type {
	ClerkDashboardStats,
	ManagerOverviewStats,
	ManagerBranchStats,
} from '../../../../types';

interface ClerkKpiRowProps {
	role: 'clerk';
	stats: ClerkDashboardStats;
}

interface ManagerKpiRowProps {
	role: 'manager';
	stats: ManagerOverviewStats | ManagerBranchStats;
	isBranchView: boolean;
}

type KpiRowProps = ClerkKpiRowProps | ManagerKpiRowProps;

export function KpiRow(props: KpiRowProps) {
	if (props.role === 'clerk') {
		return <ClerkKpis stats={props.stats} />;
	}
	return <ManagerKpis stats={props.stats} isBranchView={props.isBranchView} />;
}

function ClerkKpis({ stats }: { stats: ClerkDashboardStats }) {
	const needsAttention = stats.pending + stats.quoted;
	const completionRate =
		stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
	const wq = stats.whatsappQuotes;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<KpiCard
				icon={<AlertCircle size={14} />}
				title="Needs Attention"
				value={needsAttention}
				subtitle={`${stats.pending} pending, ${stats.quoted} quoted`}
			/>
			<KpiCard
				icon={<CalendarDays size={14} />}
				title="Today's Orders"
				value={stats.todayOrders}
				subtitle={`${stats.thisWeekOrders} this week`}
			/>
			{wq && wq.totalQuotes > 0 ? (
				<KpiCard
					icon={<Receipt size={14} />}
					title="WhatsApp Quotes"
					value={wq.totalQuotes}
					subtitle={`${wq.paidQuotes} paid, ${wq.pendingQuotes} pending`}
				/>
			) : (
				<KpiCard
					icon={<TrendingUp size={14} />}
					title="Completion Rate"
					value={`${completionRate}%`}
					subtitle={`${stats.completed} of ${stats.total} total`}
				/>
			)}
		</div>
	);
}

function ManagerKpis({
	stats,
	isBranchView,
}: {
	stats: ManagerOverviewStats | ManagerBranchStats;
	isBranchView: boolean;
}) {
	const activeJobs =
		stats.pendingOrders +
		stats.quotedOrders +
		stats.paidOrders +
		stats.inProgressOrders;
	const needsAttention = stats.pendingOrders + stats.quotedOrders;
	const wq = stats.whatsappQuotes;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<KpiCard
					icon={<Banknote size={14} />}
					title="Today's Revenue"
					value={`₵${stats.todayRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
					subtitle={`${stats.todayOrders} orders today`}
				/>
				<KpiCard
					icon={<TrendingUp size={14} />}
					title="Monthly Revenue"
					value={`₵${stats.thisMonthRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
					subtitle={`${stats.thisMonthOrders} orders this month`}
				/>
				<KpiCard
					icon={<Layers size={14} />}
					title="Active Jobs"
					value={activeJobs}
					subtitle={`${needsAttention} need attention`}
				/>
				<KpiCard
					icon={<BadgeDollarSign size={14} />}
					title="Avg Order Value"
					value={`₵${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}`}
					subtitle={`across ${stats.totalOrders} orders`}
				/>
			</div>

			{/* WhatsApp Quotes row — only shows when there's quote activity */}
			{wq && wq.totalQuotes > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<KpiCard
						icon={<Receipt size={14} />}
						title="WhatsApp Quotes"
						value={wq.totalQuotes}
						subtitle={`${wq.todayQuotes} today, ${wq.thisMonthQuotes} this month`}
					/>
					<KpiCard
						icon={<Banknote size={14} />}
						title="Quote Revenue"
						value={`₵${wq.quoteRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
						subtitle={`₵${wq.thisMonthQuoteRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`}
					/>
					<KpiCard
						icon={<TrendingUp size={14} />}
						title="Quote Conversion"
						value={`${wq.conversionRate}%`}
						subtitle={`${wq.paidQuotes} of ${wq.totalQuotes} quotes paid`}
					/>
					<KpiCard
						icon={<AlertCircle size={14} />}
						title="Quotes Pending"
						value={wq.pendingQuotes}
						subtitle={`${wq.declinedQuotes} declined, ${wq.expiredQuotes} expired`}
					/>
				</div>
			)}
		</div>
	);
}
