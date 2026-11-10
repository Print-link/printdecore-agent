import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { useToast } from "../../../contexts/ToastContext";
import { cn } from "../../../lib/utils";
import { Card, PageHeader, Section } from "../../../components/ui";
import { CheckCircle, Spinner, Store } from "../../../components/icons";
import { branchApi, type BranchMarketplaceStatus } from "../../../services/api/branches";
import PaymentSettingsSection from "./PaymentSettingsSection";

interface MarketplaceSettingsProps {
	branchId: string;
	branchName: string;
	/** Payout setup is a manager-only action on the backend. */
	canManagePayouts: boolean;
}

const headline = (s: BranchMarketplaceStatus) => {
	if (s.fulfilmentMode === "managed") {
		return {
			title: "Printdecore manages your orders",
			body: "Printdecore prices each job, confirms it with you and sends it over. Want customers to find and order from you directly? Ask the Printdecore team to switch you to self-managed.",
		};
	}
	if (s.live) return { title: "You're live", body: "Customers nearby can find your shop and order from you." };
	if (s.marketplaceListed && !s.acceptingOrders) {
		return { title: "Paused", body: "You're hidden from customers until you start taking orders again." };
	}
	if (s.ready) {
		return { title: "Ready — waiting for Printdecore", body: "Everything's set. Printdecore will list your shop shortly." };
	}
	return { title: "Almost there", body: "Finish these steps so customers can order from you." };
};

/**
 * Selling directly to customers: where the shop stands, the steps left, the
 * pause switch, and (for self-managed shops) where customer payments land.
 */
export default function MarketplaceSettings({ branchId, branchName, canManagePayouts }: MarketplaceSettingsProps) {
	const t = useThemeClasses();
	const { success, error: showError } = useToast();
	const queryClient = useQueryClient();
	const queryKey = ["branchMarketplace", branchId];

	const { data: status, isLoading } = useQuery({
		queryKey,
		queryFn: () => branchApi.getMarketplaceStatus(branchId),
	});

	const pauseMutation = useMutation({
		mutationFn: (acceptingOrders: boolean) => branchApi.setAcceptingOrders(branchId, acceptingOrders),
		onSuccess: (next) => {
			queryClient.setQueryData(queryKey, next);
			success(
				next.acceptingOrders ? "Customers can order from you again" : "New orders paused — you're hidden from customers",
				next.acceptingOrders ? "Taking orders" : "Paused",
				3500,
			);
		},
		onError: (err: unknown) => showError(err instanceof Error ? err.message : "Couldn't update", "Update failed", 4000),
	});

	if (isLoading || !status) {
		return (
			<Section>
				<div className="flex justify-center py-16">
					<Spinner size="lg" />
				</div>
			</Section>
		);
	}

	const selfManaged = status.fulfilmentMode === "self_managed";
	const steps = status.checklist.filter((c) => c.key !== "self_managed");
	const done = steps.filter((c) => c.done).length;
	const { title, body } = headline(status);

	return (
		<Section>
			<PageHeader title="Marketplace" description="Sell directly to customers on the Printdecore app" />

			<div className="max-w-2xl mt-6 space-y-4">
				<Card>
					<div className="flex items-start gap-3">
						<div
							className={cn(
								"w-10 h-10 rounded-full flex items-center justify-center shrink-0",
								status.live ? "bg-green-500/15 text-green-500" : "bg-amber-400/15 text-amber-500",
							)}
						>
							<Store size={20} />
						</div>
						<div className="flex-1 min-w-0">
							<p className={cn("font-semibold", t.text)}>{title}</p>
							<p className={cn("text-sm mt-0.5", t.textSecondary)}>{body}</p>
						</div>
					</div>

					{/* The pause switch only means something once you're listed */}
					{selfManaged && status.marketplaceListed && (
						<div className={cn("flex items-center justify-between gap-4 mt-4 pt-4 border-t", t.isDark ? "border-gray-700" : "border-gray-200")}>
							<div>
								<p className={cn("text-sm font-medium", t.text)}>Taking new orders</p>
								<p className={cn("text-xs", t.textSecondary)}>Turn off when you're busy or closed — orders you already have aren't affected.</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={status.acceptingOrders}
								aria-label="Taking new orders"
								disabled={pauseMutation.isPending}
								onClick={() => pauseMutation.mutate(!status.acceptingOrders)}
								className={cn(
									"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
									status.acceptingOrders ? "bg-green-500" : t.isDark ? "bg-gray-600" : "bg-gray-300",
								)}
							>
								<span
									className={cn(
										"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
										status.acceptingOrders ? "translate-x-6" : "translate-x-1",
									)}
								/>
							</button>
						</div>
					)}
				</Card>

				{selfManaged && !status.ready && (
					<Card>
						<div className="flex items-baseline justify-between mb-3">
							<p className={cn("text-sm font-semibold", t.text)}>Steps to go live</p>
							<p className={cn("text-xs", t.textSecondary)}>
								{done} of {steps.length} done
							</p>
						</div>
						<ul className="space-y-3">
							{steps.map((step) => (
								<li key={step.key} className="flex items-start gap-2.5">
									{step.done ? (
										<CheckCircle size={18} className="text-green-500 shrink-0 mt-px" />
									) : (
										<span className={cn("w-[18px] h-[18px] rounded-full border-2 shrink-0 mt-px", t.isDark ? "border-gray-600" : "border-gray-300")} />
									)}
									<div>
										<p className={cn("text-sm", step.done ? t.textSecondary : cn("font-medium", t.text))}>{step.label}</p>
										{!step.done && <p className={cn("text-xs", t.textSecondary)}>{step.hint}</p>}
									</div>
								</li>
							))}
						</ul>
					</Card>
				)}

				{selfManaged && canManagePayouts && (
					<div>
						<p className={cn("text-sm font-semibold mb-1", t.text)}>Payouts</p>
						<p className={cn("text-xs mb-3", t.textSecondary)}>
							Customer payments are split by Paystack: your share goes straight to this account, usually the next business day.
						</p>
						<PaymentSettingsSection branchId={branchId} branchName={branchName} />
					</div>
				)}
			</div>
		</Section>
	);
}
