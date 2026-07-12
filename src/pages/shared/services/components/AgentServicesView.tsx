import { ArrowLeft, Edit, Trash2, Settings } from "../../../../components/icons";
import { Card, Badge, IconButton } from "../../../../components/ui";
import { useThemeClasses } from "../../../../lib/theme";
import { cn } from "../../../../lib/utils";
import type { AgentService } from "../../../../types";

interface AgentServicesViewProps {
	agentServices: AgentService[];
	onEdit: (service: AgentService) => void;
	onDelete: (serviceId: string) => void;
	onConfigurePricing: (service: AgentService) => void;
	onBack: () => void;
	isLoading: boolean;
}

export function AgentServicesView({
	agentServices,
	onEdit,
	onDelete,
	onConfigurePricing,
	onBack,
	isLoading,
}: AgentServicesViewProps) {
	const t = useThemeClasses();

	return (
		<Card padding="lg" className="rounded-lg">
			<div className="flex items-center gap-3 mb-5">
				<button
					onClick={onBack}
					className={cn(
						'p-2 rounded-md border flex items-center justify-center transition-colors',
						t.isDark
							? 'border-gray-600 bg-transparent hover:bg-gray-700 text-gray-300'
							: 'border-gray-300 bg-transparent hover:bg-gray-100 text-gray-700'
					)}
				>
					<ArrowLeft size={18} />
				</button>
				<div>
					<div className="flex items-center gap-2 mb-1">
						<h2 className={cn('text-lg font-semibold m-0', t.text)}>
							Your Rate to Printdecore
						</h2>
						<Badge color="green" className="text-[11px] uppercase">
							Editable
						</Badge>
					</div>
					<p className={cn('text-xs m-0', t.textSecondary)}>
						Set what you charge Printdecore to produce each service. This is
						your rate, not the customer's price — Printdecore sets what
						customers pay.
					</p>
				</div>
			</div>
			{isLoading ? (
				<p className={t.textSecondary}>
					Loading services...
				</p>
			) : agentServices.length === 0 ? (
				<div className="py-6 text-center">
					<p className={cn('text-sm mb-2', t.textSecondary)}>
						No services configured for this branch.
					</p>
					<p className={cn('text-xs m-0', t.textSecondary)}>
						Browse categories → subcategories → templates to create your first
						service configuration.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{agentServices.map((service) => (
						<div
							key={service.id}
							className={cn(
								'p-4 rounded-lg border flex justify-between items-center gap-4',
								t.isDark
									? 'bg-gray-800 border-gray-600'
									: 'bg-white border-gray-200'
							)}
						>
							<div className="flex-1">
								<h3 className={cn('text-base font-semibold m-0 mb-2', t.text)}>
									{service.serviceTemplate?.name || "Unknown Template"}
								</h3>
								<div className="flex flex-wrap gap-3 items-center mb-2">
									<span className={cn('text-sm', t.textSecondary)}>
										Your Rate/Unit:{" "}
										<strong className={t.text}>
											{(() => {
												if (
													service.pricingConfig?.baseConfigurations &&
													service.pricingConfig.baseConfigurations.length > 0
												) {
													const minPrice = Math.min(
														...service.pricingConfig.baseConfigurations.map(
															(c) => c.unitPrice
														)
													);
													return `₵${minPrice.toFixed(2)}`;
												}
												return `₵${
													service?.pricePerUnit?.toFixed(2) || "0.00"
												}`;
											})()}
										</strong>
									</span>
									{service.constant !== null &&
										service.constant !== undefined && (
											<span className={cn('text-sm', t.textSecondary)}>
												Constant:{" "}
												<strong className={t.text}>
													{service.constant}
												</strong>
											</span>
										)}
									<Badge
										color={service.isActive ? "green" : "red"}
										className="text-xs"
									>
										{service.isActive ? "Active" : "Inactive"}
									</Badge>
								</div>
								<div className="flex flex-wrap gap-1.5 mb-1">
									{service.pricingConfig && (
										<Badge color="blue" className="text-[11px]">
											Flexible Pricing
										</Badge>
									)}
									{service.supportsColor && (
										<Badge color="amber" className="text-[11px]">
											Color
										</Badge>
									)}
									{service.supportsFrontBack && (
										<Badge color="amber" className="text-[11px]">
											Front/Back
										</Badge>
									)}
									{service.supportsPrintCut && (
										<Badge color="amber" className="text-[11px]">
											Print & Cut
										</Badge>
									)}
									{service.supportsFrontOnly && (
										<Badge color="amber" className="text-[11px]">
											Front Only
										</Badge>
									)}
								</div>
								{service.subCategory && (
									<p className={cn('text-xs m-0 mt-1', t.textSecondary)}>
										{service.category?.name} → {service.subCategory.name}
									</p>
								)}
							</div>
							<div className="flex gap-2">
								<IconButton
									icon={Settings}
									label="Configure Flexible Pricing"
									onClick={() => onConfigurePricing(service)}
									className={cn(
										'rounded-md border',
										t.isDark
											? 'border-gray-600 hover:bg-gray-700 text-gray-300'
											: 'border-gray-300 hover:bg-gray-100 text-gray-700'
									)}
								/>
								<IconButton
									icon={Edit}
									label="Edit"
									onClick={() => onEdit(service)}
									className={cn(
										'rounded-md border',
										t.isDark
											? 'border-gray-600 hover:bg-gray-700 text-gray-300'
											: 'border-gray-300 hover:bg-gray-100 text-gray-700'
									)}
								/>
								<IconButton
									icon={Trash2}
									label="Delete"
									onClick={() => onDelete(service.id)}
									className={cn(
										'rounded-md border',
										t.isDark
											? 'border-gray-600 hover:bg-red-900/30 text-red-400'
											: 'border-gray-300 hover:bg-red-50 text-red-600'
									)}
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</Card>
	);
}
