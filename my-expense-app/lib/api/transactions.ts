import api from './client';

export interface BackendTransaction {
  transaction_id: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  transaction_date: string;
  description: string;
  note: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  account_id: string;
  account_name: string;
  is_recurring: boolean;
  receipt_image_url: string;
  location: string;
}

export interface TransactionListResponse {
  success: boolean;
  message: string;
  data: {
    transactions: BackendTransaction[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      items_per_page: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export interface CreateTransactionPayload {
  account_id: string;
  category_id: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  transaction_date: string;
  description?: string;
  note?: string;
  location?: string;
  receipt_image_url?: string;
  is_recurring?: boolean;
  recurring_id?: string;
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

export interface MutationTransactionResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export const listTransactionsApi = async (params: {
  account_ids?: string;
  transaction_type?: 'income' | 'expense' | 'transfer';
  keyword?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: string;
  max_amount?: string;
  category_ids?: string;
  sort_by?: string;
  p?: number;
  ipp?: number;
}): Promise<TransactionListResponse> => {
  const response = await api.get<TransactionListResponse>('/transactions/list/', { params });
  return response.data;
};

export const createTransactionApi = async (
  payload: CreateTransactionPayload
): Promise<MutationTransactionResponse> => {
  const response = await api.post<MutationTransactionResponse>('/transactions/create/', payload);
  return response.data;
};

export const updateTransactionApi = async (
  transactionId: string,
  payload: UpdateTransactionPayload
): Promise<MutationTransactionResponse> => {
  const response = await api.patch<MutationTransactionResponse>(`/transactions/update/${transactionId}/`, payload);
  return response.data;
};

export const deleteTransactionApi = async (
  transactionId: string
): Promise<MutationTransactionResponse> => {
  const response = await api.delete<MutationTransactionResponse>(`/transactions/delete/${transactionId}/`);
  return response.data;
};
