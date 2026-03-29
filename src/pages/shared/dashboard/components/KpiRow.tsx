import {
	AlertCircle,
	CalendarDays,
	TrendingUp,
	Banknote,
	Layers,
	BadgeDollarSign,
	Receipt,
} from "../../../../components/icons";
import { KpiCard } from "./KpiCard";
import { formatCurrency } from "../../../../lib/utils";
import type {
	ClerkDashboardStats,
	ManagerOverviewStats,
	ManagerBranchStats,
} from "../../../../types";

interface ClerkKpiRowProps {
	role: "clerk";
	stats: ClerkDashboardStats;
}

interface ManagerKpiRowProps {
	role: "manager";
	stats: ManagerOverviewStats | ManagerBranchStats;
	isBranchView: boolean;
}

type KpiRowProps = ClerkKpiRowProps | ManagerKpiRowProps;

export function KpiRow(props: KpiRowProps) {
	if (props.role === "clerk") {
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
		<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
			<KpiCard
				icon={<AlertCircle size={16} />}
				accent="red"
				title="Needs Attention"
				value={needsAttention}
				subtitle={`${stats.pending} pending, ${stats.quoted} quoted`}
			/>
			<KpiCard
				icon={<CalendarDays size={16} />}
				accent="blue"
				title="Today's Orders"
				value={stats.todayOrders}
				subtitle={`${stats.thisWeekOrders} this week`}
			/>
			{wq && wq.totalQuotes > 0 ? (
				<KpiCard
					icon={<Receipt size={16} />}
					accent="purple"
					title="WhatsApp Quotes"
					value={wq.totalQuotes}
					subtitle={`${wq.paidQuotes} paid, ${wq.pendingQuotes} pending`}
				/>
			) : (
				<KpiCard
					icon={<TrendingUp size={16} />}
					accent="green"
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
	const avgOrderValue =
		stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
	const wq = stats.whatsappQuotes;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<KpiCard
					icon={<Banknote size={16} />}
					accent="green"
					title="Today's Revenue"
					value={formatCurrency(stats.todayRevenue, { compact: true })}
					subtitle={`${stats.todayOrders} order${stats.todayOrders !== 1 ? "s" : ""} today`}
				/>
				<KpiCard
					icon={<TrendingUp size={16} />}
					accent="blue"
					title="Monthly Revenue"
					value={formatCurrency(stats.thisMonthRevenue, { compact: true })}
					subtitle={`${stats.thisMonthOrders} order${stats.thisMonthOrders !== 1 ? "s" : ""} this month`}
				/>
				<KpiCard
					icon={<Layers size={16} />}
					accent={needsAttention > 0 ? "amber" : "gray"}
					title="Active Jobs"
					value={activeJobs}
					subtitle={
						needsAttention > 0
							? `${needsAttention} need${needsAttention === 1 ? "s" : ""} attention`
							: "All on track"
					}
				/>
				<KpiCard
					icon={<BadgeDollarSign size={16} />}
					accent="purple"
					title="Avg Order Value"
					value={formatCurrency(avgOrderValue)}
					subtitle={`across ${stats.totalOrders} order${stats.totalOrders !== 1 ? "s" : ""}`}
				/>
			</div>

			{/* WhatsApp Quotes row — only shows when there's quote activity */}
			{wq && wq.totalQuotes > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<KpiCard
						icon={<Receipt size={16} />}
						accent="purple"
						title="WhatsApp Quotes"
						value={wq.totalQuotes}
						subtitle={`${wq.todayQuotes} today, ${wq.thisMonthQuotes} this month`}
					/>
					<KpiCard
						icon={<Banknote size={16} />}
						accent="green"
						title="Quote Revenue"
						value={formatCurrency(wq.quoteRevenue, { compact: true })}
						subtitle={`${formatCurrency(wq.thisMonthQuoteRevenue, { compact: true })} this month`}
					/>
					<KpiCard
						icon={<TrendingUp size={16} />}
						accent="blue"
						title="Conversion Rate"
						value={`${wq.conversionRate}%`}
						subtitle={`${wq.paidQuotes} of ${wq.totalQuotes} paid`}
					/>
					<KpiCard
						icon={<AlertCircle size={16} />}
						accent={wq.pendingQuotes > 0 ? "amber" : "gray"}
						title="Quotes Pending"
						value={wq.pendingQuotes}
						subtitle={`${wq.declinedQuotes} declined, ${wq.expiredQuotes} expired`}
					/>
				</div>
			)}
		</div>
	);
}
