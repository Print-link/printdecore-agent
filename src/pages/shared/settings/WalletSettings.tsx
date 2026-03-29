import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn, formatCurrency } from "../../../lib/utils";
import { Card, PageHeader, Button, Input, Badge, Section } from "../../../components/ui";
import { Banknote, TrendingUp, Plus, Check, AlertCircle, Receipt, PieChart } from "../../../components/icons";
import { apiClient } from "../../../services/api/client";
import { useToast } from "../../../contexts/ToastContext";

// ─── Commission Types ──────────────────────────────────────────────────

interface CommissionSummary {
	totalRevenue: number;
	totalCommission: number;
	totalPaystackFees: number;
	totalPayout: number;
	orderCount: number;
	avgRate: number;
}

interface BranchEarnings {
	branchId: string;
	branchName: string;
	totalRevenue: number;
	totalCommission: number;
	totalPaystackFees: number;
	totalPayout: number;
	orderCount: number;
}

// ─── Types ──────────────────────────────────────────────────────────────

interface Wallet {
	id: string;
	managerId: string;
	balance: number;
	currency: string;
	creditLimit: number;
	trustLevel: "new" | "mid" | "trusted";
	minCashBalance: number;
}

interface WalletTx {
	id: string;
	type: string;
	amount: number;
	balanceAfter: number;
	description?: string;
	createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const TRUST_LABELS: Record<string, { label: string; color: "gray" | "amber" | "green" }> = {
	new: { label: "New", color: "gray" },
	mid: { label: "Standard", color: "amber" },
	trusted: { label: "Trusted", color: "green" },
};

const TX_LABELS: Record<string, { label: string; color: string }> = {
	deposit: { label: "Top-up", color: "text-emerald-500" },
	commission_deduction: { label: "Commission", color: "text-red-500" },
	refund: { label: "Refund", color: "text-blue-500" },
	adjustment: { label: "Adjustment", color: "text-amber-500" },
	bonus: { label: "Bonus", color: "text-purple-500" },
};

// ─── Component ──────────────────────────────────────────────────────────

export default function WalletSettings() {
	const t = useThemeClasses();
	const queryClient = useQueryClient();
	const { success: toastSuccess, error: toastError } = useToast();
	const [topupAmount, setTopupAmount] = useState("");

	// Current month range for commission summary
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

	const { data: commissionAll } = useQuery<CommissionSummary>({
		queryKey: ["commission", "summary", "all"],
		queryFn: async () => {
			const res = await apiClient.get("/payments/commission/summary");
			return res.data.data;
		},
	});

	const { data: commissionMonth } = useQuery<CommissionSummary>({
		queryKey: ["commission", "summary", "month", now.getMonth()],
		queryFn: async () => {
			const res = await apiClient.get(`/payments/commission/summary?start=${monthStart}&end=${monthEnd}`);
			return res.data.data;
		},
	});

	const { data: branchEarnings } = useQuery<BranchEarnings[]>({
		queryKey: ["commission", "by-branch"],
		queryFn: async () => {
			const res = await apiClient.get("/payments/commission/by-branch");
			return res.data.data;
		},
	});

	const { data: wallet, isLoading } = useQuery<Wallet>({
		queryKey: ["wallet"],
		queryFn: async () => {
			const res = await apiClient.get("/wallet");
			return res.data.data;
		},
	});

	const { data: txData } = useQuery<{ transactions: WalletTx[]; total: number }>({
		queryKey: ["wallet", "transactions"],
		queryFn: async () => {
			const res = await apiClient.get("/wallet/transactions?limit=20");
			return { transactions: res.data.data, total: res.data.total };
		},
	});

	const topupMutation = useMutation({
		mutationFn: async (amount: number) => {
			const res = await apiClient.post("/wallet/topup/initialize", { amount });
			return res.data.data;
		},
		onSuccess: (data) => {
			// Open Paystack in a new window
			const win = window.open(data.authorizationUrl, "_blank", "width=600,height=700");
			if (!win) {
				toastError("Popup blocked. Please allow popups and try again.");
				return;
			}

			// Poll for completion
			const interval = setInterval(async () => {
				if (win.closed) {
					clearInterval(interval);
					// Verify and credit the deposit
					try {
						await apiClient.post("/wallet/deposit", { paymentReference: data.reference });
						toastSuccess("Wallet topped up successfully");
						queryClient.invalidateQueries({ queryKey: ["wallet"] });
						setTopupAmount("");
					} catch (err: any) {
						const msg = err?.response?.data?.message;
						if (msg?.includes("already been credited")) {
							toastSuccess("Wallet topped up successfully");
							queryClient.invalidateQueries({ queryKey: ["wallet"] });
						} else {
							toastError(msg || "Payment verification failed");
						}
					}
				}
			}, 1000);
		},
		onError: (err: any) => {
			toastError(err?.response?.data?.message || "Failed to initialize payment");
		},
	});

	const handleTopup = useCallback(() => {
		const amount = Number(topupAmount);
		if (!amount || amount <= 0) return;
		topupMutation.mutate(amount);
	}, [topupAmount, topupMutation]);

	const transactions = txData?.transactions || [];
	const trust = wallet ? TRUST_LABELS[wallet.trustLevel] || TRUST_LABELS.new : TRUST_LABELS.new;
	const isEligible = wallet ? wallet.trustLevel !== "new" : false;

	return (
		<Section>
			<PageHeader
				title="Wallet"
				description="Pre-fund your wallet to enable cash/walk-in payments"
			/>

			<div className="space-y-6 max-w-2xl mt-6">
				{/* Earnings Summary */}
				<Card>
					<div className="flex items-center gap-2 mb-4">
						<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.isDark ? "bg-emerald-900/20" : "bg-emerald-50")}>
							<Receipt size={18} className="text-emerald-500" />
						</div>
						<p className={cn("text-sm font-semibold", t.text)}>Earnings</p>
					</div>

					{commissionAll && commissionAll.orderCount > 0 ? (
						<>
							{/* This Month */}
							{commissionMonth && commissionMonth.orderCount > 0 && (
								<div className={cn("p-4 rounded-xl mb-4", t.isDark ? "bg-gray-800/50" : "bg-gray-50")}>
									<p className={cn("text-[10px] font-medium uppercase tracking-wider mb-3", t.textTertiary)}>
										{now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
									</p>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<p className={cn("text-xs", t.textTertiary)}>Order revenue</p>
											<p className={cn("text-sm font-bold tabular-nums", t.text)}>
												{formatCurrency(commissionMonth.totalRevenue)}
											</p>
										</div>
										<div className="flex items-center justify-between">
											<p className={cn("text-xs", t.textTertiary)}>Platform commission ({commissionMonth.avgRate}%)</p>
											<p className="text-sm font-bold tabular-nums text-red-500">
												-{formatCurrency(commissionMonth.totalCommission)}
											</p>
										</div>
										{commissionMonth.totalPaystackFees > 0 && (
											<div className="flex items-center justify-between">
												<p className={cn("text-xs", t.textTertiary)}>Paystack processing fees</p>
												<p className="text-sm font-bold tabular-nums text-red-500">
													-{formatCurrency(commissionMonth.totalPaystackFees)}
												</p>
											</div>
										)}
										<div className={cn("flex items-center justify-between pt-2 border-t", t.isDark ? "border-gray-700" : "border-gray-200")}>
											<p className={cn("text-xs font-semibold", t.text)}>Settled to your account</p>
											<p className="text-base font-bold tabular-nums text-emerald-500">
												{formatCurrency(commissionMonth.totalPayout)}
											</p>
										</div>
									</div>
								</div>
							)}

							{/* All Time */}
							<div className="space-y-2">
								<p className={cn("text-[10px] font-medium uppercase tracking-wider mb-2", t.textTertiary)}>All time</p>
								<div className="flex items-center justify-between">
									<p className={cn("text-xs", t.textTertiary)}>Order revenue</p>
									<p className={cn("text-sm font-bold tabular-nums", t.text)}>
										{formatCurrency(commissionAll.totalRevenue)}
									</p>
								</div>
								<div className="flex items-center justify-between">
									<p className={cn("text-xs", t.textTertiary)}>Platform commission</p>
									<p className="text-sm font-bold tabular-nums text-red-500">
										-{formatCurrency(commissionAll.totalCommission)}
									</p>
								</div>
								{commissionAll.totalPaystackFees > 0 && (
									<div className="flex items-center justify-between">
										<p className={cn("text-xs", t.textTertiary)}>Paystack processing fees</p>
										<p className="text-sm font-bold tabular-nums text-red-500">
											-{formatCurrency(commissionAll.totalPaystackFees)}
										</p>
									</div>
								)}
								<div className={cn("flex items-center justify-between pt-2 border-t", t.isDark ? "border-gray-700" : "border-gray-200")}>
									<p className={cn("text-xs font-semibold", t.text)}>Total settled</p>
									<p className="text-sm font-bold tabular-nums text-emerald-500">
										{formatCurrency(commissionAll.totalPayout)}
									</p>
								</div>
							</div>

							{/* Rate info */}
							<div className={cn("flex items-center gap-2 mt-4 pt-3 border-t", t.isDark ? "border-gray-700" : "border-gray-100")}>
								<PieChart size={14} className={t.textTertiary} />
								<p className={cn("text-[10px]", t.textTertiary)}>
									Commission rate: <span className={cn("font-semibold", t.text)}>{commissionAll.avgRate}%</span>
									{" "}&middot;{" "}{commissionAll.orderCount} order{commissionAll.orderCount !== 1 ? "s" : ""}
								</p>
							</div>
						</>
					) : (
						<div className="text-center py-4">
							<p className={cn("text-sm", t.textSecondary)}>No earnings yet</p>
							<p className={cn("text-xs mt-1", t.textTertiary)}>
								Earnings from paid orders will appear here
							</p>
						</div>
					)}
				</Card>

				{/* Per-Branch Earnings */}
				{branchEarnings && branchEarnings.length > 0 && (
					<Card>
						<div className="flex items-center gap-2 mb-4">
							<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.isDark ? "bg-blue-900/20" : "bg-blue-50")}>
								<Banknote size={18} className="text-blue-500" />
							</div>
							<p className={cn("text-sm font-semibold", t.text)}>Earnings by Branch</p>
						</div>
						<div className="space-y-3">
							{branchEarnings.map((branch) => (
								<div
									key={branch.branchId}
									className={cn("p-3 rounded-xl", t.isDark ? "bg-gray-800/50" : "bg-gray-50")}
								>
									<div className="flex items-center justify-between mb-2">
										<p className={cn("text-xs font-semibold", t.text)}>{branch.branchName}</p>
										<span className={cn("text-[10px] px-2 py-0.5 rounded-full", t.isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500")}>
											{branch.orderCount} order{branch.orderCount !== 1 ? "s" : ""}
										</span>
									</div>
									<div className="grid grid-cols-3 gap-2">
										<div>
											<p className={cn("text-[10px]", t.textTertiary)}>Revenue</p>
											<p className={cn("text-xs font-bold tabular-nums", t.text)}>
												{formatCurrency(branch.totalRevenue)}
											</p>
										</div>
										<div>
											<p className={cn("text-[10px]", t.textTertiary)}>Fees</p>
											<p className="text-xs font-bold tabular-nums text-red-500">
												-{formatCurrency(branch.totalCommission + branch.totalPaystackFees)}
											</p>
										</div>
										<div>
											<p className={cn("text-[10px]", t.textTertiary)}>Settled</p>
											<p className="text-xs font-bold tabular-nums text-emerald-500">
												{formatCurrency(branch.totalPayout)}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</Card>
				)}

				{/* Balance Card */}
				<Card>
					{isLoading ? (
						<div className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
					) : wallet ? (
						<div className="flex items-center justify-between">
							<div>
								<p className={cn("text-xs font-medium mb-1", t.textSecondary)}>Available Balance</p>
								<p className={cn("text-3xl font-bold tracking-tight", wallet.balance < 0 ? "text-red-500" : t.text)}>
									{formatCurrency(wallet.balance)}
								</p>
								<div className="flex items-center gap-2 mt-2">
									<Badge color={trust.color}>{trust.label}</Badge>
									{wallet.creditLimit > 0 && (
										<span className={cn("text-[10px]", t.textTertiary)}>
											Credit: {formatCurrency(wallet.creditLimit)}
										</span>
									)}
								</div>
							</div>
							<div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", t.isDark ? "bg-emerald-900/20" : "bg-emerald-50")}>
								<Banknote size={28} className="text-emerald-500" />
							</div>
						</div>
					) : null}
				</Card>

				{/* Cash Status */}
				{wallet && wallet.trustLevel === "new" && (
					<div className={cn("flex items-start gap-3 p-4 rounded-xl border", t.isDark ? "bg-amber-900/10 border-amber-800/30" : "bg-amber-50 border-amber-200")}>
						<AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
						<div>
							<p className={cn("text-sm font-medium", t.isDark ? "text-amber-300" : "text-amber-700")}>
								Cash payments not yet available
							</p>
							<p className={cn("text-xs mt-0.5", t.isDark ? "text-amber-400/70" : "text-amber-600")}>
								Complete more online orders to unlock cash/walk-in payment quotes.
							</p>
						</div>
					</div>
				)}

				{/* Top Up — only available when eligible for cash payments */}
				<Card className={cn(!isEligible && "opacity-50 pointer-events-none select-none")}>
					<p className={cn("text-sm font-medium mb-3", t.textSecondary)}>Top Up Wallet</p>
					<div className="flex gap-2">
						<Input
							type="number"
							min="1"
							step="0.01"
							placeholder="Amount (GHS)"
							value={topupAmount}
							onChange={(e) => setTopupAmount(e.target.value)}
							disabled={!isEligible}
							className="flex-1"
						/>
						<Button
							icon={Plus}
							onClick={handleTopup}
							loading={topupMutation.isPending}
							disabled={!isEligible || !topupAmount || Number(topupAmount) <= 0}
						>
							Top Up
						</Button>
					</div>
					{/* Quick amounts */}
					<div className="flex gap-2 mt-3">
						{[20, 50, 100, 200].map((amt) => (
							<button
								key={amt}
								disabled={!isEligible}
								onClick={() => isEligible && setTopupAmount(String(amt))}
								className={cn(
									"flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
									!isEligible && "cursor-not-allowed",
									topupAmount === String(amt)
										? "bg-amber-400 text-gray-900 border-amber-400"
										: t.isDark
											? "border-gray-600 text-gray-400 hover:border-gray-500"
											: "border-gray-200 text-gray-600 hover:border-gray-300",
								)}
							>
								GHS {amt}
							</button>
						))}
					</div>
				</Card>

				{/* Transaction History */}
				<Card>
					<p className={cn("text-sm font-medium mb-3", t.textSecondary)}>Recent Transactions</p>
					{transactions.length === 0 ? (
						<p className={cn("text-xs text-center py-6", t.textTertiary)}>No transactions yet</p>
					) : (
						<div className="space-y-2">
							{transactions.map((tx) => {
								const cfg = TX_LABELS[tx.type] || TX_LABELS.adjustment;
								const isCredit = tx.amount > 0;
								return (
									<div
										key={tx.id}
										className={cn("flex items-center justify-between py-2 border-b last:border-0", t.isDark ? "border-gray-700" : "border-gray-100")}
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isCredit ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20")}>
												{isCredit ? <TrendingUp size={14} className="text-emerald-500" /> : <Check size={14} className="text-red-500" />}
											</div>
											<div className="min-w-0">
												<p className={cn("text-xs font-medium truncate", t.text)}>
													{tx.description || cfg.label}
												</p>
												<p className={cn("text-[10px]", t.textTertiary)}>
													{new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
												</p>
											</div>
										</div>
										<div className="text-right shrink-0 ml-3">
											<p className={cn("text-xs font-bold tabular-nums", isCredit ? "text-emerald-500" : "text-red-500")}>
												{isCredit ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}
											</p>
											<p className={cn("text-[10px] tabular-nums", t.textTertiary)}>
												Bal: {formatCurrency(tx.balanceAfter)}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</Card>
			</div>
		</Section>
	);
}
