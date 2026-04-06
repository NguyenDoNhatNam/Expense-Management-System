import api from './client';

export type SavingGoalPriority = 'low' | 'medium' | 'high';
export type SavingGoalStatus = 'active' | 'completed' | 'cancelled';

export interface BackendSavingGoal {
  goal_id: string;
  goal_name: string;
  target_amount: string;
  current_amount: string;
  target_date: string;
  description: string;
  priority: SavingGoalPriority;
  status: SavingGoalStatus;
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
}

export interface SavingGoalListResponse {
  success: boolean;
  message?: string;
  data: BackendSavingGoal[];
}

export interface CreateSavingGoalPayload {
  goal_name: string;
  target_amount: number | string;
  target_date: string; // YYYY-MM-DD
  description?: string;
  priority?: SavingGoalPriority;
}

export interface CreateSavingGoalResponse {
  success: boolean;
  data: {
    goal_id: string;
  };
}

export interface UpdateSavingGoalPayload {
  goal_name?: string;
  target_amount?: number | string;
  current_amount?: number | string;
  target_date?: string; // YYYY-MM-DD
  description?: string;
  priority?: SavingGoalPriority;
  status?: SavingGoalStatus;
}

export interface UpdateSavingGoalResponse {
  success: boolean;
  message: string;
}

export interface DeleteSavingGoalResponse {
  success: boolean;
  message: string;
}

export const listSavingGoalsApi = async (): Promise<SavingGoalListResponse> => {
  const response = await api.get<SavingGoalListResponse>('/savings/list/');
  return response.data;
};

export const createSavingGoalApi = async (
  payload: CreateSavingGoalPayload
): Promise<CreateSavingGoalResponse> => {
  const response = await api.post<CreateSavingGoalResponse>('/savings/create/', payload);
  return response.data;
};

export const updateSavingGoalApi = async (
  goalId: string,
  payload: UpdateSavingGoalPayload
): Promise<UpdateSavingGoalResponse> => {
  const response = await api.patch<UpdateSavingGoalResponse>(`/savings/update/${goalId}/`, payload);
  return response.data;
};

export const deleteSavingGoalApi = async (
  goalId: string
): Promise<DeleteSavingGoalResponse> => {
  const response = await api.delete<DeleteSavingGoalResponse>(`/savings/delete/${goalId}/`);
  return response.data;
};