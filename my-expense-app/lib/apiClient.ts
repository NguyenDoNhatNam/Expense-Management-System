import axios from 'axios';
import { getAuthToken, setAuthToken, clearAuthToken } from './authTokenStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Quan trọng: Cho phép gửi HttpOnly cookies
});

// Request interceptor: Gắn Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: Tự động refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh/');
        const newAccessToken = data?.data?.accessToken || data?.data?.access_token || data?.access_token;
        
        if (!newAccessToken) {
          throw new Error('Không lấy được access token từ hệ thống');
        }
        
        setAuthToken(newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        try {
          const { data } = await apiClient.post('/auth/auto-login/');
          const newAccessToken = data?.data?.accessToken || data?.data?.access_token || data?.access_token;
          
          if (!newAccessToken) {
            throw new Error('Không lấy được access token từ hệ thống');
          }
          
          setAuthToken(newAccessToken);
          processQueue(null, newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (autoLoginError) {
          processQueue(autoLoginError, null);
          clearAuthToken();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(autoLoginError);
        }
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;