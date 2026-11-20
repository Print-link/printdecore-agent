import { Navigate } from "react-router-dom";

/** Old Services links land on Pricing, where products and prices now live */
export default function ToPricing() {
  return <Navigate to="/app/pricing" replace />;
}
