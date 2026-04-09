import api from './client';

// ============================================================================
// Types / Interfaces
// ============================================================================

export interface ActivityLog {
  activity_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  level: 'INFO' | 'ACTION' | 'WARNING' | 'ERROR';
  details: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  device: string;
  browser: string;
  os: string;
  current_page: string;
  status: string;
  error_message: string | null;
  timestamp: string;
}

export interface ActivityStats {
  active_users: number;
  total_online: number;
  actions_today: number;
  warnings: number;
  errors: number;
  top_users: { name: string; actions: number }[];
}

export interface UserActivityDetail {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  is_online: boolean;
  last_active: string | null;
  current_page: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  recent_logs: ActivityLog[];
}

export interface ActivityLogListParams {
  user_id?: number;
  action?: string;
  level?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ActivityLogListResponse {
  success: boolean;
  message?: string;
  data: {
    logs: ActivityLog[];
    pagination: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    };
  };
}

export interface ActivityStatsResponse {
  success: boolean;
  message?: string;
  data: ActivityStats;
}

export interface UserActivityDetailResponse {
  success: boolean;
  message: string;
  data: UserActivityDetail;
}

export interface ExportActivityLogsParams {
  user_id?: number;
  action?: string;
  level?: string;
  start_date?: string;
  end_date?: string;
  format?: 'csv' | 'json';
}

export interface RealtimeLogsParams {
  since?: string;
}

export interface RealtimeLogsResponse {
  success: boolean;
  message?: string;
  data: {
    new_logs: ActivityLog[];
    stats: ActivityStats;
    server_time: string;
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch activity logs with pagination and filters
 */
export const listActivityLogsApi = async (
  params?: ActivityLogListParams
): Promise<ActivityLogListResponse> => {
  const response = await api.get<ActivityLogListResponse>('/activity-logs/list/', {
    params: {
      ordering: '-created_at',
      ...params,
    },
  });
  return response.data;
};

/**
 * Get activity statistics for dashboard
 */
export const getActivityStatsApi = async (): Promise<ActivityStatsResponse> => {
  const response = await api.get<ActivityStatsResponse>('/activity-logs/stats/');
  return response.data;
};

/**
 * Get detailed activity information for a specific user
 */
export const getUserActivityDetailApi = async (
  userId: string
): Promise<UserActivityDetailResponse> => {
  const response = await api.get<UserActivityDetailResponse>(`/activity-logs/user/${userId}/`);
  return response.data;
};

/**
 * Export activity logs as CSV or JSON
 * Returns a Blob for file download
 */
export const exportActivityLogsApi = async (
  params?: ExportActivityLogsParams
): Promise<Blob> => {
  const response = await api.get('/activity-logs/export/', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download exported activity logs file
 */
export const downloadActivityLogsExport = async (
  params?: ExportActivityLogsParams
): Promise<void> => {
  const blob = await exportActivityLogsApi(params);
  const format = params?.format || 'csv';
  const filename = `activity_logs_${new Date().toISOString().split('T')[0]}.${format}`;
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Fetch new logs since a specific log ID (for real-time updates)
 */
export const getRealtimeLogsApi = async (
  params?: RealtimeLogsParams
): Promise<RealtimeLogsResponse> => {
  const response = await api.get<RealtimeLogsResponse>('/activity-logs/realtime/', { params });
  return response.data;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon for activity action
 */
export const getActionIcon = (action: string): string => {
  const iconMap: Record<string, string> = {
    LOGIN_SUCCESS: '🔓',
    LOGIN_FAILED: '🔒',
    LOGOUT: '👋',
    REGISTER: '📝',
    PASSWORD_CHANGE: '🔑',
    PROFILE_UPDATE: '👤',
    CREATE_TRANSACTION: '💰',
    UPDATE_TRANSACTION: '✏️',
    DELETE_TRANSACTION: '🗑️',
    CREATE_BUDGET: '📊',
    UPDATE_BUDGET: '📈',
    DELETE_BUDGET: '❌',
    CREATE_ACCOUNT: '🏦',
    UPDATE_ACCOUNT: '🔄',
    DELETE_ACCOUNT: '💳',
    TRANSFER: '↔️',
    EXPORT_DATA: '📤',
    IMPORT_DATA: '📥',
    BACKUP_CREATE: '💾',
    BACKUP_RESTORE: '🔄',
  };
  return iconMap[action] || '📋';
};

/**
 * Get color class for activity level
 */
export const getLevelColor = (level: string): string => {
  switch (level) {
    case 'ERROR':
      return 'text-red-500';
    case 'WARNING':
      return 'text-yellow-500';
    case 'ACTION':
      return 'text-[#00ff9f]';
    case 'INFO':
    default:
      return 'text-[#888]';
  }
};

/**
 * Format action string for display
 */
export const formatActionDisplay = (action: string): string => {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};
