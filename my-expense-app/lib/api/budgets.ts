import api from './client';

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface BackendBudget {
  budget_id: string;
  category_id: string;
  budget_name: string;
  amount: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  alert_threshold: number;
  spent: number;
}

export interface BudgetListResponse {
  success: boolean;
  message: string;
  data: BackendBudget[];
}

export interface CreateBudgetPayload {
  category_id: string;
  budget_name: string;
  amount: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  alert_threshold: number;
}

export interface CreateOrUpdateBudgetResponse {
  success: boolean;
  message: string;
  data: {
    budget_id: string;
    budget_name: string;
  };
}

export interface DeleteBudgetResponse {
  success: boolean;
  message: string;
}

// ================= API =================

export const listBudgetsApi = async (): Promise<BudgetListResponse> => {
  const response = await api.get<BudgetListResponse>('/budgets/list/');
  return response.data;
};

export const createBudgetApi = async (
  payload: CreateBudgetPayload
): Promise<CreateOrUpdateBudgetResponse> => {
  const response = await api.post<CreateOrUpdateBudgetResponse>(
    '/budgets/create/',
    payload
  );
  return response.data;
};

export const updateBudgetApi = async (
  budgetId: string,
  payload: Partial<CreateBudgetPayload>
): Promise<CreateOrUpdateBudgetResponse> => {
  const response = await api.patch<CreateOrUpdateBudgetResponse>(
    `/budgets/update/${budgetId}/`,
    payload
  );
  return response.data;
};

export const deleteBudgetApi = async (
  budgetId: string
): Promise<DeleteBudgetResponse> => {
  const response = await api.delete<DeleteBudgetResponse>(
    `/budgets/delete/${budgetId}/`
  );
  return response.data;
};