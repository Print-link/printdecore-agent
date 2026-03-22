import { apiClient } from "./client";

export interface Bank {
  id: number;
  name: string;
  code: string;
  type: "bank" | "mobile_money";
  currency: string;
  active: boolean;
}

export interface VerifyAccountResult {
  accountNumber: string;
  accountName: string;
  bankId: number;
}

export interface SettlementDetails {
  configured: boolean;
  subaccountCode?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  settlementType?: "bank" | "mobile_money";
  percentageCharge?: number;
  verified?: boolean;
  verifiedAt?: string;
}

export interface CreateSubaccountResult {
  subaccountCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  settlementType: string;
  verified: boolean;
}

async function listBanks(
  country = "ghana",
  type?: "bank" | "mobile_money"
): Promise<Bank[]> {
  const params: Record<string, string> = { country };
  if (type) params.type = type;
  const res = await apiClient.get("/settlements/banks", { params });
  return res.data.data;
}

async function verifyAccount(
  accountNumber: string,
  bankCode: string
): Promise<VerifyAccountResult> {
  const res = await apiClient.post("/settlements/verify-account", {
    accountNumber,
    bankCode,
  });
  return res.data.data;
}

async function getSettlementDetails(
  branchId: string
): Promise<SettlementDetails> {
  const res = await apiClient.get(`/settlements/branches/${branchId}`);
  return res.data.data;
}

async function createSubaccount(
  branchId: string,
  data: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
    percentageCharge?: number;
    settlementType?: "bank" | "mobile_money";
  }
): Promise<CreateSubaccountResult> {
  const res = await apiClient.post(
    `/settlements/branches/${branchId}/subaccount`,
    data
  );
  return res.data.data;
}

async function removeSubaccount(branchId: string): Promise<void> {
  await apiClient.delete(`/settlements/branches/${branchId}/subaccount`);
}

export const settlementsApi = {
  listBanks,
  verifyAccount,
  getSettlementDetails,
  createSubaccount,
  removeSubaccount,
};
