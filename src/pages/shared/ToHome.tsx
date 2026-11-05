import { Navigate } from "react-router-dom";

/** Old Overview and Dashboard links land on Home */
export default function ToHome() {
  return <Navigate to="/app/home" replace />;
}
