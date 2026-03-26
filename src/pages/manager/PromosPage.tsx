import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discountApi, type Discount } from "../../services/api/discounts";
import {
	Card,
	PageHeader,
	Button,
	Badge,
	EmptyState,
	Input,
	Select,
	Modal,
} from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { Plus, Receipt, TrendingUp } from "../../components/icons";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../stores/authStore";
import { apiService } from "../../services/api";

const TYPE_COLORS: Record<string, "blue" | "green"> = {
	percentage: "blue",
	fixed: "green",
};

export default function PromosPage() {
	const theme = useThemeClasses();
	const { success: toastSuccess, error: toastError } = useToast();
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	const { data: branches = [] } = useQuery({
		queryKey: ["branches", user?.id],
		queryFn: () => apiService.getAllBranches(user!.id),
		enabled: !!user?.id,
	});

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

	const { data: discounts = [], isLoading } = useQuery({
		queryKey: ["discounts"],
		queryFn: discountApi.getDiscounts,
	});

	const createMutation = useMutation({
		mutationFn: discountApi.createDiscount,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
			toastSuccess("Promo created successfully");
			setIsCreateOpen(false);
		},
		onError: (e: any) =>
			toastError(e.response?.data?.message || "Failed to create promo"),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<Discount> }) =>
			discountApi.updateDiscount(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
			toastSuccess("Promo updated");
			setEditingDiscount(null);
		},
		onError: (e: any) =>
			toastError(e.response?.data?.message || "Failed to update"),
	});

	const deleteMutation = useMutation({
		mutationFn: discountApi.deleteDiscount,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["discounts"] });
			toastSuccess("Promo deleted");
		},
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			discountApi.updateDiscount(id, { isActive }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["discounts"] }),
	});

	const handleCreate = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const fd = new FormData(e.currentTarget);
			createMutation.mutate({
				code: fd.get("code") as string,
				name: fd.get("name") as string,
				description: (fd.get("description") as string) || undefined,
				discountType: fd.get("discountType") as "percentage" | "fixed",
				discountValue: Number(fd.get("discountValue")),
				targetType: (fd.get("targetType") as any) || "all",
				branchId: (fd.get("branchId") as string) || undefined,
				maxUses: fd.get("maxUses") ? Number(fd.get("maxUses")) : undefined,
				maxUsesPerCustomer: Number(fd.get("maxUsesPerCustomer")) || 1,
				minOrderAmount: fd.get("minOrderAmount")
					? Number(fd.get("minOrderAmount"))
					: undefined,
				maxDiscountAmount: fd.get("maxDiscountAmount")
					? Number(fd.get("maxDiscountAmount"))
					: undefined,
				expiresAt: (fd.get("expiresAt") as string) || undefined,
			});
		},
		[createMutation]
	);

	const handleEdit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!editingDiscount) return;
			const fd = new FormData(e.currentTarget);
			updateMutation.mutate({
				id: editingDiscount.id,
				data: {
					name: fd.get("name") as string,
					description: (fd.get("description") as string) || undefined,
					discountValue: Number(fd.get("discountValue")),
					maxUses: fd.get("maxUses")
						? Number(fd.get("maxUses"))
						: undefined,
					maxUsesPerCustomer:
						Number(fd.get("maxUsesPerCustomer")) || 1,
					minOrderAmount: fd.get("minOrderAmount")
						? Number(fd.get("minOrderAmount"))
						: undefined,
					maxDiscountAmount: fd.get("maxDiscountAmount")
						? Number(fd.get("maxDiscountAmount"))
						: undefined,
					expiresAt: (fd.get("expiresAt") as string) || undefined,
				},
			});
		},
		[editingDiscount, updateMutation]
	);

	// Split into own promos vs platform promos
	const myPromos = discounts.filter((d) => d.scope === "manager");
	const platformPromos = discounts.filter((d) => d.scope === "platform");

	// Stats
	const activeCount = discounts.filter((d) => d.isActive).length;
	const totalRedemptions = discounts.reduce(
		(sum, d) => sum + d.currentUses,
		0
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Promos & Discounts"
				description="Create promo codes to attract and reward customers"
				actions={
					<Button onClick={() => setIsCreateOpen(true)} size="sm">
						<Plus className="w-4 h-4 mr-1.5" />
						Create Promo
					</Button>
				}
			/>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4">
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
							<Receipt className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<p
								className={cn(
									"text-2xl font-bold",
									theme.text
								)}
							>
								{discounts.length}
							</p>
							<p className={cn("text-xs", theme.textSecondary)}>
								Total Promos
							</p>
						</div>
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
							<TrendingUp className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<p
								className={cn(
									"text-2xl font-bold",
									theme.text
								)}
							>
								{activeCount}
							</p>
							<p className={cn("text-xs", theme.textSecondary)}>
								Active
							</p>
						</div>
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
							<Receipt className="w-5 h-5 text-purple-600" />
						</div>
						<div>
							<p
								className={cn(
									"text-2xl font-bold",
									theme.text
								)}
							>
								{totalRedemptions}
							</p>
							<p className={cn("text-xs", theme.textSecondary)}>
								Total Redemptions
							</p>
						</div>
					</div>
				</Card>
			</div>

			{/* My Promos */}
			<Card>
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h3
						className={cn(
							"text-sm font-semibold",
							theme.text
						)}
					>
						Your Promos
					</h3>
				</div>
				{isLoading ? (
					<div className="p-8 text-center">
						<p className={theme.textSecondary}>Loading...</p>
					</div>
				) : myPromos.length === 0 ? (
					<EmptyState
						icon={Receipt}
						title="No promos yet"
						description="Create your first promo code to attract customers"
					/>
				) : (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{myPromos.map((d) => (
							<DiscountRow
								key={d.id}
								discount={d}
								onEdit={() => setEditingDiscount(d)}
								onToggle={() =>
									toggleMutation.mutate({
										id: d.id,
										isActive: !d.isActive,
									})
								}
								onDelete={() => {
									if (
										window.confirm("Delete this promo?")
									)
										deleteMutation.mutate(d.id);
								}}
								canEdit
							/>
						))}
					</div>
				)}
			</Card>

			{/* Platform Promos (read-only) */}
			{platformPromos.length > 0 && (
				<Card>
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h3
							className={cn(
								"text-sm font-semibold",
								theme.text
							)}
						>
							Platform Promos
						</h3>
						<p className={cn("text-xs mt-0.5", theme.textSecondary)}>
							Created by PrintDecore admin — available to your
							customers
						</p>
					</div>
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{platformPromos.map((d) => (
							<DiscountRow
								key={d.id}
								discount={d}
								canEdit={false}
							/>
						))}
					</div>
				</Card>
			)}

			{/* Create Modal */}
			<Modal
				open={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				title="Create Promo Code"
			>
				<form onSubmit={handleCreate} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<Input
							name="code"
							label="Code"
							placeholder="SUMMER25"
							required
							style={{ textTransform: "uppercase" }}
						/>
						<Input
							name="name"
							label="Name"
							placeholder="Summer Sale"
							required
						/>
					</div>
					<Input
						name="description"
						label="Description"
						placeholder="Optional"
					/>
					<Select name="branchId" label="Branch">
						<option value="">All Branches</option>
						{branches.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name}
							</option>
						))}
					</Select>
					<div className="grid grid-cols-2 gap-3">
						<Select name="discountType" label="Type" required>
							<option value="percentage">Percentage (%)</option>
							<option value="fixed">Fixed Amount</option>
						</Select>
						<Input
							name="discountValue"
							label="Value"
							type="number"
							step="0.01"
							min="0.01"
							required
							placeholder="10"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<Select name="targetType" label="Target">
							<option value="all">Everyone</option>
							<option value="customer">
								Specific Customers
							</option>
							<option value="branch">This Branch Only</option>
						</Select>
						<Input
							name="expiresAt"
							label="Expires"
							type="datetime-local"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<Input
							name="maxUses"
							label="Max Uses"
							type="number"
							min="1"
							placeholder="Unlimited"
						/>
						<Input
							name="maxUsesPerCustomer"
							label="Per Customer"
							type="number"
							min="1"
							defaultValue="1"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<Input
							name="minOrderAmount"
							label="Min Order"
							type="number"
							step="0.01"
							placeholder="No min"
						/>
						<Input
							name="maxDiscountAmount"
							label="Max Discount"
							type="number"
							step="0.01"
							placeholder="No cap"
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button
							variant="secondary"
							type="button"
							onClick={() => setIsCreateOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" loading={createMutation.isPending}>
							Create Promo
						</Button>
					</div>
				</form>
			</Modal>

			{/* Edit Modal */}
			<Modal
				open={!!editingDiscount}
				onClose={() => setEditingDiscount(null)}
				title={`Edit ${editingDiscount?.code || ""}`}
			>
				{editingDiscount && (
					<form onSubmit={handleEdit} className="space-y-4">
						<Input
							name="name"
							label="Name"
							defaultValue={editingDiscount.name}
							required
						/>
						<Input
							name="description"
							label="Description"
							defaultValue={editingDiscount.description}
						/>
						<div className="grid grid-cols-2 gap-3">
							<Input
								name="discountValue"
								label="Value"
								type="number"
								step="0.01"
								defaultValue={editingDiscount.discountValue}
							/>
							<Input
								name="expiresAt"
								label="Expires"
								type="datetime-local"
								defaultValue={editingDiscount.expiresAt?.slice(
									0,
									16
								)}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<Input
								name="maxUses"
								label="Max Uses"
								type="number"
								defaultValue={editingDiscount.maxUses}
								placeholder="Unlimited"
							/>
							<Input
								name="maxUsesPerCustomer"
								label="Per Customer"
								type="number"
								defaultValue={
									editingDiscount.maxUsesPerCustomer
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<Input
								name="minOrderAmount"
								label="Min Order"
								type="number"
								step="0.01"
								defaultValue={editingDiscount.minOrderAmount}
							/>
							<Input
								name="maxDiscountAmount"
								label="Max Discount"
								type="number"
								step="0.01"
								defaultValue={editingDiscount.maxDiscountAmount}
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button
								variant="secondary"
								type="button"
								onClick={() => setEditingDiscount(null)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={updateMutation.isPending}
							>
								Save Changes
							</Button>
						</div>
					</form>
				)}
			</Modal>
		</div>
	);
}

// ─── Discount Row ─────────────────────────────────────────────
function DiscountRow({
	discount,
	onEdit,
	onToggle,
	onDelete,
	canEdit,
}: {
	discount: Discount;
	onEdit?: () => void;
	onToggle?: () => void;
	onDelete?: () => void;
	canEdit: boolean;
}) {
	const theme = useThemeClasses();
	const isExpired =
		discount.expiresAt && new Date(discount.expiresAt) < new Date();

	return (
		<div className="flex items-center justify-between px-4 py-3">
			<div className="flex items-center gap-4 min-w-0">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"font-mono text-sm font-bold",
								theme.text
							)}
						>
							{discount.code}
						</span>
						<Badge
							color={TYPE_COLORS[discount.discountType] || "gray"}
						>
							{discount.discountType === "percentage"
								? `${discount.discountValue}%`
								: `${discount.currency} ${discount.discountValue}`}
						</Badge>
						{isExpired && <Badge color="red">Expired</Badge>}
						{!discount.isActive && !isExpired && (
							<Badge color="gray">Inactive</Badge>
						)}
						{discount.isActive && !isExpired && (
							<Badge color="green">Active</Badge>
						)}
					</div>
					<p className={cn("text-xs mt-0.5", theme.textSecondary)}>
						{discount.name}
						{discount.currentUses > 0 &&
							` · ${discount.currentUses} used`}
						{discount.maxUses != null &&
							` / ${discount.maxUses} max`}
					</p>
				</div>
			</div>
			{canEdit && (
				<div className="flex items-center gap-2">
					{onToggle && (
						<Button
							variant="secondary"
							size="sm"
							onClick={onToggle}
						>
							{discount.isActive ? "Deactivate" : "Activate"}
						</Button>
					)}
					{onEdit && (
						<Button variant="secondary" size="sm" onClick={onEdit}>
							Edit
						</Button>
					)}
					{onDelete && (
						<Button
							variant="secondary"
							size="sm"
							onClick={onDelete}
							className="text-red-600 hover:text-red-700"
						>
							Delete
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
