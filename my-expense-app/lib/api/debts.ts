import api from './client';

export type DebtType = 'lend' | 'borrow';

export interface BackendDebt {
  debt_id: string;
  debt_type: DebtType;
  person_name: string;
  amount: string;           // DecimalField → string trong JSON
  remaining_amount: string;
  interest_rate: string;
  start_date: string;       // YYYY-MM-DD
  due_date: string;         // YYYY-MM-DD
  description: string;
  status: 'active' | 'overdue' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DebtListResponse {
  success: boolean;
  message?: string;
  data: BackendDebt[];        // Backend returns array directly, no {items, pagination}
}

export interface CreateDebtPayload {
  debt_type: DebtType;
  person_name: string;
  amount: number;
  interest_rate?: number;
  start_date: string;         // YYYY-MM-DD
  due_date: string;           // YYYY-MM-DD
  description?: string;
}

export interface CreateDebtResponse {
  success: boolean;
  message?: string;
  data: {
    debt_id: string;
  };
}

export interface PayDebtPayload {
  payment_amount: number;
  payment_date: string;       // YYYY-MM-DD
  note?: string;
}

export interface PayDebtResponse {
  success: boolean;
  message: string;
}

export const listDebtsApi = async (): Promise<DebtListResponse> => {
  const response = await api.get<DebtListResponse>('/debts/list/');
  return response.data;
};

export const createDebtApi = async (
  payload: CreateDebtPayload
): Promise<CreateDebtResponse> => {
  const response = await api.post<CreateDebtResponse>('/debts/create/', payload);
  return response.data;
};

export const payDebtApi = async (
  debtId: string,
  payload: PayDebtPayload
): Promise<PayDebtResponse> => {
  const response = await api.post<PayDebtResponse>(`/debts/pay/${debtId}/`, payload);
  return response.data;
};
export interface DeleteDebtResponse {
  success: boolean;
  message: string;
}

export const deleteDebtApi = async (debtId: string): Promise<DeleteDebtResponse> => {
  const response = await api.delete<DeleteDebtResponse>(`/debts/delete/${debtId}/`);
  return response.data;
};