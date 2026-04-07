import api from './client';

export interface UserStatsResponse {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  default_currency?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  is_active: boolean;
  role: string;
  wallets_count: number;
  budgets_count: number;
  transactions_count: number;
}

export interface AdminUsersListResponse {
  success: boolean;
  data: UserStatsResponse[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  message: string;
}

export interface AdminStatsResponse {
  success: boolean;
  data: {
    users: {
      total: number;
      active: number;
      inactive: number;
      new_this_month: number;
    };
    transactions: {
      total: number;
      this_month: number;
    };
    wallets: {
      total: number;
    };
    budgets: {
      total: number;
    };
    recent_users: {
      user_id: string;
      full_name: string;
      email: string;
      created_at: string;
    }[];
  };
  message: string;
}

/**
 * Lấy danh sách tất cả người dùng và thống kê dành cho Admin
 */
export const getAdminUsersApi = async (page = 1, pageSize = 50, search = ''): Promise<AdminUsersListResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (search) params.append('search', search);
  
  const response = await api.get<AdminUsersListResponse>(`/users/?${params.toString()}`);
  return response.data;
};

/**
 * Xóa một người dùng khỏi hệ thống
 */
export const deleteAdminUserApi = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/users/${userId}/`);
  return response.data;
};

/**
 * Lấy thống kê tổng quan cho dashboard
 */
export const getAdminStatsApi = async (): Promise<AdminStatsResponse> => {
  const response = await api.get<AdminStatsResponse>('/users/stats/');
  return response.data;
};

/**
 * Bật/tắt trạng thái active của user
 */
export const toggleUserStatusApi = async (userId: string): Promise<{ success: boolean; data: { user_id: string; is_active: boolean }; message: string }> => {
  const response = await api.post<{ success: boolean; data: { user_id: string; is_active: boolean }; message: string }>(`/users/${userId}/toggle-status/`);
  return response.data;
};