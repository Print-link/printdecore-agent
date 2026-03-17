export type CategoryType =
  | 'wassce_result'
  | 'bece_result'
  | 'novdec_result'
  | 'large_format'
  | 'regular_format';

export type RegularFormatProperties = 'front_only' | 'front_and_back';

export interface Category {
  id: string;
  name: string;
  unitPrice: number;
  description?: string;
  adminId: string;
  categoryType?: CategoryType;
  regularFormatProperties?: RegularFormatProperties;
  createdAt?: number;
  updatedAt?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ServiceSubCategory {
  id: string;
  categoryId: string;
  name: string;
  pricingType: 'AREA_BASED' | 'UNIT_ONLY' | 'AREA_FEET' | 'AREA_INCH' | 'MIXED' | 'CUSTOM_QUOTE';
  description?: string;
  imageUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ServiceTemplate {
	id: string;
	subCategoryId: string;
	name: string;
	measurementUnit: "FEET" | "INCH" | "UNIT";
	allowsCustomSize: boolean;
	supportsFrontBack: boolean;
	supportsColor: boolean;
	supportsPrintCut: boolean;
	pricingFormulaId: string;
	branchId?: string;
	description?: string;
	pricingConfig?: PricingConfig;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

export interface CreateServiceTemplateData {
	subCategoryId: string;
	name: string;
	measurementUnit: "FEET" | "INCH" | "UNIT";
	allowsCustomSize?: boolean;
	supportsFrontBack?: boolean;
	supportsColor?: boolean;
	supportsPrintCut?: boolean;
	pricingFormulaId: string;
	branchId?: string;
	pricingConfig?: PricingConfig;
}

export interface UpdateServiceTemplateData {
	name?: string;
	measurementUnit?: "FEET" | "INCH" | "UNIT";
	allowsCustomSize?: boolean;
	supportsFrontBack?: boolean;
	supportsColor?: boolean;
	supportsPrintCut?: boolean;
	pricingFormulaId?: string;
	branchId?: string;
	pricingConfig?: PricingConfig;
}

export type BaseConfigurationType = 'PRESET' | 'CUSTOM';

export interface BaseConfiguration {
  id: string;
  name: string;
  type: BaseConfigurationType;
  unitPrice: number;
  customValue?: string | null;
}

export interface PricingOption {
  id: string;
  name: string;
  enabled: boolean;
  default: boolean;
  priceModifier: number;
}

export interface CustomSpecification {
  id: string;
  name: string;
  priceModifier: number;
}

export interface PricingConfig {
  baseConfigurations: BaseConfiguration[];
  options: PricingOption[];
  customSpecifications: CustomSpecification[];
}

export interface AgentService {
  id: string;
  branchId: string;
  serviceTemplateId: string;
  pricePerUnit: number;
  constant: number | null;
  colorPriceModifier: number | null;
  isActive: boolean;
  supportsPrintCut: boolean;
  supportsColor: boolean;
  supportsFrontBack: boolean;
  supportsFrontOnly: boolean;
  pricingConfig?: PricingConfig | null; // New flexible pricing configuration
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Populated fields (from joins)
  serviceTemplate?: ServiceTemplate;
  subCategory?: ServiceSubCategory;
  category?: ServiceCategory;
}

export interface CreateAgentServiceData {
  branchId: string;
  serviceTemplateId: string;
  pricePerUnit: number;
  constant?: number | null;
  colorPriceModifier?: number | null;
  isActive?: boolean;
  supportsPrintCut?: boolean;
  supportsColor?: boolean;
  supportsFrontBack?: boolean;
  supportsFrontOnly?: boolean;
}

export interface UpdateAgentServiceData {
  pricePerUnit?: number;
  constant?: number | null;
  colorPriceModifier?: number | null;
  isActive?: boolean;
  supportsPrintCut?: boolean;
  supportsColor?: boolean;
  supportsFrontBack?: boolean;
  supportsFrontOnly?: boolean;
}
