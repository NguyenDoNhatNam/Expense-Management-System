import axios from 'axios';

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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldDebugApi) {
      console.error(`${API_LOG_PREFIX} Response error`, {
        status: error.response?.status,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        message: error.message,
      });
    }

    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expenseapp_user');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('expenseapp_user');
        // You might want to redirect to login page here
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;