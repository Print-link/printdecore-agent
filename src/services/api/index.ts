export { apiClient } from "./client";
export { authApi } from "./auth";
export { branchApi } from "./branches";
export { orderApi } from "./orders";
export { dashboardApi } from "./dashboard";
export { serviceApi } from "./services";
export { permissionApi } from "./permissions";
export { whatsappApi } from "./whatsapp";
export { userApi } from "./users";
export { legacyApi } from "./legacy";
export { reportApi } from "./reports";
export { whatsappQuoteApi } from "./whatsappQuotes";
export { whatsappFeaturesApi } from "./whatsappFeatures";

// Backward-compatible combined export
// Existing code imports: import { apiService } from '../services/api'
import { authApi } from "./auth";
import { branchApi } from "./branches";
import { orderApi } from "./orders";
import { dashboardApi } from "./dashboard";
import { serviceApi } from "./services";
import { permissionApi } from "./permissions";
import { whatsappApi } from "./whatsapp";
import { userApi } from "./users";
import { legacyApi } from "./legacy";
import { reportApi } from "./reports";
import { whatsappQuoteApi } from "./whatsappQuotes";
import { whatsappFeaturesApi } from "./whatsappFeatures";

export const apiService = {
	...authApi,
	...branchApi,
	...orderApi,
	...dashboardApi,
	...serviceApi,
	...permissionApi,
	...whatsappApi,
	...userApi,
	...legacyApi,
	...reportApi,
	...whatsappQuoteApi,
	...whatsappFeaturesApi,
};
