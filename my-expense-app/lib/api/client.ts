import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getStoredAccessToken, isTokenExpired } from './token';

const API_LOG_PREFIX = '[api-client]';
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:8000/api';

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const isLocalhostHost = (host: string): boolean => {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

const resolveApiBaseUrl = (): string => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (isLocalhostHost(hostname)) {
      console.warn(
        `${API_LOG_PREFIX} NEXT_PUBLIC_API_BASE_URL is not set. Falling back to ${DEFAULT_LOCAL_API_BASE_URL}.`
      );
      return DEFAULT_LOCAL_API_BASE_URL;
    }

    const inferredBaseUrl = `${protocol}//${hostname}:8000/api`;
    console.warn(
      `${API_LOG_PREFIX} NEXT_PUBLIC_API_BASE_URL is not set. Inferred API base URL: ${inferredBaseUrl}.`
    );
    return inferredBaseUrl;
  }

  return DEFAULT_LOCAL_API_BASE_URL;
};

const shouldDebugApi = process.env.NEXT_PUBLIC_API_DEBUG === 'true';

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
  withCredentials: true, // Include cookies in requests
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const isBrowser = typeof window !== 'undefined';
    const token = isBrowser
      ? localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (shouldDebugApi) {
      console.warn(`${API_LOG_PREFIX} No access token found for request`, {
        method: config.method,
        url: config.url,
      });
    }

    if (shouldDebugApi) {
      console.info(`${API_LOG_PREFIX} Request`, {
        method: config.method,
        baseURL: config.baseURL,
        url: config.url,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh or logout on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.config.headers.Authorization = `Bearer ${token}`;
      prom.resolve(api(prom.config));
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  if (typeof window !== 'undefined') {
    clearTokens();
    localStorage.removeItem('expenseapp_user');
    sessionStorage.removeItem('expenseapp_user');
    localStorage.removeItem('expenseapp_wallets');
    localStorage.removeItem('expenseapp_categories');
    localStorage.removeItem('expenseapp_transactions');
    localStorage.removeItem('expenseapp_budgets');
    localStorage.removeItem('expenseapp_goals');
    localStorage.removeItem('expenseapp_debts');
    
    // Redirect to home/login page
    window.location.href = '/';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (shouldDebugApi) {
      console.error(`${API_LOG_PREFIX} Response error`, {
        status: error.response?.status,
        method: originalRequest?.method,
        baseURL: originalRequest?.baseURL,
        url: originalRequest?.url,
        message: error.message,
      });
    }

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip refresh for auth endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/refresh') ||
                            originalRequest.url?.includes('/auth/register');
      
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Check if token is definitely expired
      const token = getStoredAccessToken();
      if (!token || isTokenExpired(token, 0)) {
        // Token is expired, try to refresh
        if (isRefreshing) {
          // Wait for refresh to complete
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Try to refresh the token
          const response = await api.post('/auth/refresh/', {}, {
            withCredentials: true,
          });

          if (response.data.success && response.data.data?.access_token) {
            const newAccessToken = response.data.data.access_token;
            
            // Store the new token
            const storage = localStorage.getItem('access_token') ? localStorage : sessionStorage;
            storage.setItem('access_token', newAccessToken);
            
            if (response.data.data.refresh_token) {
              storage.setItem('refresh_token', response.data.data.refresh_token);
            }

            // Update the authorization header
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            // Process the queued requests
            processQueue(null, newAccessToken);
            
            // Retry the original request
            return api(originalRequest);
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          console.error(`${API_LOG_PREFIX} Token refresh failed:`, refreshError);
          processQueue(refreshError as Error, null);
          handleLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Token seems valid but server rejected it - force logout
        handleLogout();
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;