import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  settlementsApi,
  type Bank,
  type SettlementDetails,
} from "../../../services/api/settlements";
import { useThemeClasses } from "../../../lib/theme";
import { useToast } from "../../../contexts/ToastContext";
import { cn } from "../../../lib/utils";
import { Button, Input } from "../../../components/ui";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Search,
  Trash2,
  Spinner,
  Shield,
} from "../../../components/icons";

interface PaymentSettingsSectionProps {
  branchId: string;
  branchName: string;
}

export default function PaymentSettingsSection({
  branchId,
  branchName,
}: PaymentSettingsSectionProps) {
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [settlementType, setSettlementType] = useState<"bank" | "mobile_money">("bank");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [businessName, setBusinessName] = useState(branchName);
  const [bankSearch, setBankSearch] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  // Verification state
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Fetch current settlement details
  const { data: settlement, isLoading: loadingSettlement } =
    useQuery<SettlementDetails>({
      queryKey: ["settlement", branchId],
      queryFn: () => settlementsApi.getSettlementDetails(branchId),
      staleTime: 30000,
    });

  // Fetch bank list
  const { data: allBanks = [] } = useQuery<Bank[]>({
    queryKey: ["banks", settlementType],
    queryFn: () => settlementsApi.listBanks("ghana", settlementType),
    staleTime: 300000, // 5 min
  });

  // Pre-fill form if settlement exists
  useEffect(() => {
    if (settlement?.configured) {
      setSettlementType(settlement.settlementType || "bank");
      setBankCode(settlement.bankCode || "");
      setAccountNumber(settlement.accountNumber || "");
      setBusinessName(branchName);
      setVerifiedName(settlement.accountName || null);
    }
  }, [settlement, branchName]);

  // Filter banks by search
  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return allBanks;
    const q = bankSearch.toLowerCase();
    return allBanks.filter((b) => b.name.toLowerCase().includes(q));
  }, [allBanks, bankSearch]);

  const selectedBank = allBanks.find((b) => b.code === bankCode);

  // Verify account mutation
  const verifyMutation = useMutation({
    mutationFn: () => settlementsApi.verifyAccount(accountNumber, bankCode),
    onSuccess: (data) => {
      setVerifiedName(data.accountName);
      setVerifyError(null);
    },
    onError: (err: any) => {
      setVerifiedName(null);
      setVerifyError(
        err?.response?.data?.message || "Could not verify account"
      );
    },
  });

  // Create/update subaccount mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      settlementsApi.createSubaccount(branchId, {
        businessName,
        bankCode,
        accountNumber,
        settlementType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement", branchId] });
      success(
        settlement?.configured
          ? "Payment method updated"
          : "Payment method configured",
        "Settlement Saved"
      );
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to save payment method",
        "Error"
      );
    },
  });

  // Remove subaccount mutation
  const removeMutation = useMutation({
    mutationFn: () => settlementsApi.removeSubaccount(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement", branchId] });
      setAccountNumber("");
      setBankCode("");
      setVerifiedName(null);
      success("Payment method removed", "Removed");
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || "Failed to remove", "Error");
    },
  });

  const canVerify = accountNumber.length >= 6 && !!bankCode;
  const canSave = !!verifiedName && !!bankCode && !!accountNumber && !!businessName;

  if (loadingSettlement) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current status banner */}
      {settlement?.configured ? (
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-xl border",
            t.isDark
              ? "bg-green-900/20 border-green-800/40"
              : "bg-green-50 border-green-200"
          )}
        >
          <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
            <CheckCircle size={24} className="text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-sm", t.text)}>
              Payment method active
            </p>
            <div className="mt-1 space-y-0.5">
              <p className={cn("text-sm", t.textSecondary)}>
                <span className="font-medium">{settlement.bankName}</span>
                {" — "}
                {settlement.settlementType === "mobile_money"
                  ? "Mobile Money"
                  : "Bank Account"}
              </p>
              <p className={cn("text-sm font-mono", t.textSecondary)}>
                ****{settlement.accountNumber?.slice(-4)}
                {settlement.accountName && (
                  <span className="font-sans ml-2">({settlement.accountName})</span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={Trash2}
            onClick={() => removeMutation.mutate()}
            loading={removeMutation.isPending}
            className="flex-shrink-0"
          >
            Remove
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-start gap-4 p-4 rounded-xl border",
            t.isDark
              ? "bg-amber-900/20 border-amber-800/40"
              : "bg-amber-50 border-amber-200"
          )}
        >
          <div className="p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
            <AlertCircle size={24} className="text-amber-500" />
          </div>
          <div>
            <p className={cn("font-semibold text-sm", t.text)}>
              No payment method configured
            </p>
            <p className={cn("text-sm mt-0.5", t.textSecondary)}>
              Set up a bank account or mobile money to receive customer payments
              directly into your account.
            </p>
          </div>
        </div>
      )}

      {/* Settlement type toggle */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", t.textSecondary)}>
          Settlement Type
        </label>
        <div className="flex gap-2">
          {(["bank", "mobile_money"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSettlementType(type);
                setBankCode("");
                setAccountNumber("");
                setVerifiedName(null);
                setVerifyError(null);
                setBankSearch("");
              }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all",
                settlementType === type
                  ? "bg-amber-400 text-gray-900 border-amber-400"
                  : t.isDark
                    ? "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              )}
            >
              {type === "bank" ? "Bank Account" : "Mobile Money"}
            </button>
          ))}
        </div>
      </div>

      {/* Business name */}
      <Input
        label="Business / Account Name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Branch business name"
      />

      {/* Bank/provider selector */}
      <div className="relative">
        <label className={cn("block text-sm font-medium mb-2", t.textSecondary)}>
          {settlementType === "mobile_money" ? "Mobile Money Provider" : "Bank"}
        </label>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer",
            t.input
          )}
          onClick={() => setShowBankDropdown(!showBankDropdown)}
        >
          <Search size={14} className={t.textTertiary} />
          {showBankDropdown ? (
            <input
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder={`Search ${settlementType === "mobile_money" ? "providers" : "banks"}...`}
              autoFocus
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={cn("flex-1 text-sm", selectedBank ? t.text : t.textTertiary)}>
              {selectedBank?.name || `Select ${settlementType === "mobile_money" ? "provider" : "bank"}`}
            </span>
          )}
        </div>

        {showBankDropdown && (
          <div
            className={cn(
              "absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg",
              t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}
          >
            {filteredBanks.length === 0 ? (
              <p className={cn("text-xs text-center py-4", t.textTertiary)}>
                No results
              </p>
            ) : (
              filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  onClick={() => {
                    setBankCode(bank.code);
                    setShowBankDropdown(false);
                    setBankSearch("");
                    setVerifiedName(null);
                    setVerifyError(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    bank.code === bankCode
                      ? "bg-amber-400/20 font-medium"
                      : t.isDark
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-50"
                  )}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Account number */}
      <div>
        <Input
          label={
            settlementType === "mobile_money"
              ? "Mobile Money Number"
              : "Account Number"
          }
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, ""));
            setVerifiedName(null);
            setVerifyError(null);
          }}
          placeholder={
            settlementType === "mobile_money"
              ? "e.g., 0241234567"
              : "e.g., 1234567890"
          }
        />

        {/* Verify button */}
        {canVerify && !verifiedName && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => verifyMutation.mutate()}
            loading={verifyMutation.isPending}
            icon={Shield}
            className="mt-2"
          >
            Verify Account
          </Button>
        )}

        {/* Verification result */}
        {verifiedName && (
          <div
            className={cn(
              "flex items-center gap-2 mt-2 px-3 py-2 rounded-lg",
              t.isDark ? "bg-green-900/20" : "bg-green-50"
            )}
          >
            <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
            <span className={cn("text-sm font-medium", t.text)}>
              {verifiedName}
            </span>
          </div>
        )}

        {verifyError && (
          <div
            className={cn(
              "flex items-center gap-2 mt-2 px-3 py-2 rounded-lg",
              t.isDark ? "bg-red-900/20" : "bg-red-50"
            )}
          >
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-500">{verifyError}</span>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave}
          loading={saveMutation.isPending}
          icon={CreditCard}
          size="lg"
        >
          {settlement?.configured
            ? "Update Payment Method"
            : "Configure Payment Method"}
        </Button>
      </div>
    </div>
  );
}
