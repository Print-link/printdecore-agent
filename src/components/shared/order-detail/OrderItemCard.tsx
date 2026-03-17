import { FileText, Tag } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { Card, Badge } from '../../ui';
import { FileThumbnail } from './FileThumbnail';
import type { ClerkOrderDetail } from '../../../types';

interface OrderItemCardProps {
	item: ClerkOrderDetail['items'][0];
	itemIndex: number;
	selectedFileIndex: { itemIndex: number; fileIndex: number } | null;
	onFileSelect: (itemIndex: number | null, fileIndex: number | null) => void;
	onFileDownload: (fileUrl: string, fileName: string) => void;
}

export function OrderItemCard({
	item,
	itemIndex,
	selectedFileIndex,
	onFileSelect,
	onFileDownload,
}: OrderItemCardProps) {
	const t = useThemeClasses();

	// Parse options if it's a string
	let parsedOptions = item.options;
	if (typeof item.options === 'string') {
		try {
			parsedOptions = JSON.parse(item.options);
		} catch (e) {
			console.error('Error parsing options:', e);
			parsedOptions = {
			frontBack: false,
			color: false,
			printCut: false,
			files: [],
		};
		}
	}

	// Ensure options has files array
	const files = parsedOptions?.files || [];
	const hasFiles = Array.isArray(files) && files.length > 0;

	// Get price modifiers from selectedConfigDetails (flexible pricing)
	const selectedConfigDetails = item.selectedConfigDetails;
	const hasFlexibleOptions =
		(selectedConfigDetails?.options && selectedConfigDetails.options.length > 0) ||
		(selectedConfigDetails?.customSpecs && selectedConfigDetails.customSpecs.length > 0);

	// Legacy options check
	const hasLegacyOptions = parsedOptions?.color || parsedOptions?.frontBack || parsedOptions?.printCut;

	return (
		<Card padding="sm" className="sm:p-4">
			<div className="flex items-start justify-between mb-2 flex-wrap gap-2">
				<div className="flex-1 min-w-0">
					<h4 className={cn('text-sm sm:text-base font-semibold mb-1', t.text)}>
						{item.serviceName}
					</h4>
					<p className={cn('text-xs sm:text-sm', t.textSecondary)}>
						{item.category.name} • {item.subCategory.name}
					</p>
				</div>
				<span className={cn('text-sm sm:text-base font-bold whitespace-nowrap', t.text)}>
					{'\u20B5'}{item.calculatedPrice.toFixed(2)}
				</span>
			</div>

			<div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-xs sm:text-sm', t.textSecondary)}>
				<div className="flex items-center gap-1.5 font-medium">
					<Tag size={12} className="opacity-70" />
					<span>Size: {item.width} × {item.height} {item.measurementUnit}</span>
				</div>
                {item.formulaType && (
                    <div className="flex items-center gap-1.5 font-medium">
                        <Tag size={12} className="opacity-70" />
                        <span>Pricing: {item.formulaType}</span>
                    </div>
                )}
				<div>Quantity: {item.quantity}</div>
				{!hasFlexibleOptions && (
					<>
						<div>Color: {parsedOptions?.color ? 'Yes' : 'No'}</div>
						<div>Front/Back: {parsedOptions?.frontBack ? 'Yes' : 'No'}</div>
					</>
				)}
			</div>

			{/* Price Modifiers - Flexible Pricing Options & Custom Specs */}
			{hasFlexibleOptions && (
				<div className="mt-3 pt-3 border-t-2 border-yellow-500/30">
					<div className="flex items-center gap-2 mb-2">
						<Tag size={16} className={t.isDark ? 'text-yellow-400' : 'text-yellow-600'} />
						<h5 className={cn('text-xs font-bold uppercase tracking-wide', t.text)}>
							Price Modifiers
						</h5>
					</div>
					<div className="space-y-2">
						{/* Selected Options */}
						{selectedConfigDetails?.options && selectedConfigDetails.options.length > 0 && (
							<div>
								<div className={cn('text-xs font-semibold mb-1.5', t.isDark ? 'text-gray-300' : 'text-gray-700')}>
									Options:
								</div>
								<div className="flex flex-wrap gap-2">
									{selectedConfigDetails.options.map((opt) => (
										<span
											key={opt.id}
											className={cn(
												'px-3 py-1.5 text-xs font-bold rounded-lg border-2',
												t.isDark
													? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
													: 'text-yellow-600 bg-yellow-50 border-yellow-500/30'
											)}
										>
											{opt.name}
											{opt.priceModifier && opt.priceModifier > 0 && (
												<span className={cn('ml-1.5', t.isDark ? 'text-yellow-300' : 'text-yellow-700')}>
													(+{'\u20B5'}{opt.priceModifier.toFixed(2)})
												</span>
											)}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Selected Custom Specs */}
						{selectedConfigDetails?.customSpecs && selectedConfigDetails.customSpecs.length > 0 && (
							<div>
								<div className={cn('text-xs font-semibold mb-1.5', t.isDark ? 'text-gray-300' : 'text-gray-700')}>
									Add-ons:
								</div>
								<div className="flex flex-wrap gap-2">
									{selectedConfigDetails.customSpecs.map((spec) => (
										<span
											key={spec.id}
											className={cn(
												'px-3 py-1.5 text-xs font-bold rounded-lg border-2',
												t.isDark
													? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
													: 'text-yellow-600 bg-yellow-50 border-yellow-500/30'
											)}
										>
											{spec.name}
											{spec.priceModifier && spec.priceModifier > 0 && (
												<span className={cn('ml-1.5', t.isDark ? 'text-yellow-300' : 'text-yellow-700')}>
													(+{'\u20B5'}{spec.priceModifier.toFixed(2)})
												</span>
											)}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Legacy Options (for backward compatibility, only show if no flexible options) */}
			{hasLegacyOptions && !hasFlexibleOptions && (
				<div className={cn('flex flex-wrap gap-2 mt-2 pt-2 border-t', t.isDark ? 'border-gray-600' : 'border-gray-300')}>
					{parsedOptions?.frontBack && (
						<Badge color="gray">Front & Back</Badge>
					)}
					{parsedOptions?.color && (
						<Badge color="gray">Color</Badge>
					)}
					{parsedOptions?.printCut && (
						<Badge color="gray">Print & Cut</Badge>
					)}
				</div>
			)}

			{/* Files */}
			{hasFiles && (
				<div className={cn('mt-2 pt-2 border-t', t.isDark ? 'border-gray-600' : 'border-gray-300')}>
					<div className="flex items-center justify-between mb-2">
						<p className={cn('text-xs sm:text-sm font-semibold flex items-center gap-1.5', t.text)}>
							<FileText size={14} />
							Files ({files.length})
						</p>
					</div>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 sm:gap-3">
						{files.map((file: unknown, fileIndex: number) => {
							const isSelected =
								selectedFileIndex?.itemIndex === itemIndex &&
								selectedFileIndex?.fileIndex === fileIndex;

							return (
								<FileThumbnail
									key={fileIndex}
									file={file}
									fileIndex={fileIndex}
									isSelected={isSelected}
									onClick={() => {
										if (isSelected) {
											onFileSelect(null, null);
										} else {
											onFileSelect(itemIndex, fileIndex);
										}
									}}
									onDownload={onFileDownload}
								/>
							);
						})}
					</div>
				</div>
			)}
		</Card>
	);
}
