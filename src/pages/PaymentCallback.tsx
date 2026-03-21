import { useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Spinner, AlertCircle, CheckCircle } from "../components/icons";
import { apiClient } from "../services/api/client";

/**
 * Payment callback page — Paystack redirects here after payment.
 * Verifies the payment and posts the result back to the opener window.
 */
export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasProcessedRef = useRef(false);

  const reference = useMemo(
    () => searchParams.get("reference") || searchParams.get("trxref"),
    [searchParams]
  );

  useEffect(() => {
    if (hasProcessedRef.current || !reference) return;
    hasProcessedRef.current = true;

    const verify = async () => {
      try {
        // Verify with the backend's existing payment verify endpoint
        const response = await apiClient.get(`/payments/verify/${reference}`);
        const success =
          response.data.status && response.data.data?.status === "success";

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: success ? "PAYSTACK_SUCCESS" : "PAYSTACK_FAILED",
              reference,
              amount: response.data.data?.amount || 0,
              status: response.data.data?.status,
            },
            window.location.origin
          );
          setTimeout(() => {
            if (!window.closed) window.close();
          }, 1500);
        } else {
          // Opened in same tab — redirect back to billing
          setTimeout(() => navigate("/app/billing", { replace: true }), 2000);
        }
      } catch {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "PAYSTACK_ERROR", reference },
            window.location.origin
          );
          setTimeout(() => {
            if (!window.closed) window.close();
          }, 2000);
        } else {
          setTimeout(() => navigate("/app/billing", { replace: true }), 2000);
        }
      }
    };

    verify();
  }, [reference, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-8 text-center">
        {reference ? (
          <>
            <Spinner size="lg" className="text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Verifying Payment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please wait while we confirm your payment...
            </p>
            <p className="text-xs text-gray-400 mt-3 font-mono">{reference}</p>
          </>
        ) : (
          <>
            <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Payment Reference
            </h3>
            <p className="text-sm text-gray-500">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}
