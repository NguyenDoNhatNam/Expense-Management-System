import api from './client';

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface BackendBudget {
  budget_id: string;
  budget_name: string;
  amount: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  alert_threshold: number;
  is_active: boolean;
  category_id: string;
  category_name: string;
  spent_amount: string;
  spent?: number;
  percentage: number;
}

export interface BudgetPagination {
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface BudgetListResponse {
  success: boolean;
  message: string;
  data: {
    items: BackendBudget[];
    pagination: BudgetPagination;
  };
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

export const listBudgetsApi = async (params?: {
  p?: number;
  ipp?: number;
  search?: string;
  period?: string;
  is_active?: string;
}): Promise<BudgetListResponse> => {
  const response = await api.get<BudgetListResponse>('/budgets/list/', { params });
  return response.data;
};

export const listAllBudgetsApi = async (params?: {
  search?: string;
  period?: string;
  is_active?: string;
}): Promise<BackendBudget[]> => {
  const pageSize = 100;
  const firstPage = await listBudgetsApi({
    p: 1,
    ipp: pageSize,
    search: params?.search,
    period: params?.period,
    is_active: params?.is_active,
  });

  const firstItems = firstPage.data?.items || [];
  const totalPages = firstPage.data?.pagination?.total_pages || 1;

  if (totalPages <= 1) {
    return firstItems;
  }

  const requests: Promise<BudgetListResponse>[] = [];
  for (let page = 2; page <= totalPages; page += 1) {
    requests.push(
      listBudgetsApi({
        p: page,
        ipp: pageSize,
        search: params?.search,
        period: params?.period,
        is_active: params?.is_active,
      })
    );
  }

  const restPages = await Promise.all(requests);
  return [
    ...firstItems,
    ...restPages.flatMap((res) => res.data?.items || []),
  ];
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