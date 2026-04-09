import api from './client';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment';

export interface BackendAccount {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  balance: string | number;
  currency: string;
  bank_name?: string | null;
  account_number?: string | null;
  description?: string | null;
  is_include_in_total: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  transaction_count?: number;
  total_income?: string | number;
  total_expense?: string | number;
}

export interface AccountListResponse {
  success: boolean;
  message: string;
  data: {
    net_worth: string;
    items?: BackendAccount[];
    accounts: BackendAccount[];
  };
}

export interface CreateAccountPayload {
  account_name: string;
  account_type: AccountType;
  currency: string;
  initial_balance?: number;
  is_include_in_total?: boolean;
  bank_name?: string;
  account_number?: string;
  description?: string;
}

export interface UpdateAccountPayload {
  account_name?: string;
  account_type?: AccountType;
  currency?: string;
  is_include_in_total?: boolean;
  bank_name?: string;
  account_number?: string;
  description?: string;
}

export interface AccountMutationResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export const listAccountsApi = async (): Promise<AccountListResponse> => {
  const response = await api.get<AccountListResponse>('/accounts/list/');
  return response.data;
};

export const createAccountApi = async (
  payload: CreateAccountPayload
): Promise<AccountMutationResponse> => {
  const response = await api.post<AccountMutationResponse>('/accounts/create/', payload);
  return response.data;
};

export const updateAccountApi = async (
  accountId: string,
  payload: UpdateAccountPayload
): Promise<AccountMutationResponse> => {
  const response = await api.patch<AccountMutationResponse>(`/accounts/update/${accountId}/`, payload);
  return response.data;
};

export const deleteAccountApi = async (accountId: string): Promise<AccountMutationResponse> => {
  const response = await api.delete<AccountMutationResponse>(`/accounts/delete/${accountId}/`);
  return response.data;
};
