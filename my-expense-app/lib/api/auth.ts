import axios from 'axios';
import api from './client';

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupPayload {
  email: string;
  password: string;
  full_name: string;
  phone: string;
}

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface AuthUser {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  default_currency: string;
  created_at: string;
  is_active: boolean;
  role: UserRole;
}

export interface AuthSuccessResponse<TData = Record<string, unknown>> {
  status: string;
  data: TData;
  message: string;
}

export interface LoginData {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export interface AdminLoginData {
  user: AuthUser;
  access_token: string;
  expires_in: number;
}

export interface SignupData {
  user: AuthUser;
  account: Record<string, unknown>;
  categories: Array<Record<string, unknown>>;
  setting: Record<string, unknown>;
  access_token: string;
  refresh_token: string;
}

export const loginApi = async (payload: LoginPayload): Promise<AuthSuccessResponse<LoginData>> => {
  const response = await api.post<AuthSuccessResponse<LoginData>>('/auth/login/', payload);
  return response.data;
};

export const signupApi = async (payload: SignupPayload): Promise<AuthSuccessResponse<SignupData>> => {
  const response = await api.post<AuthSuccessResponse<SignupData>>('/auth/register/', payload);
  return response.data;
};

export const adminLoginApi = async (
  payload: Pick<LoginPayload, 'email' | 'password'>
): Promise<AuthSuccessResponse<AdminLoginData>> => {
  const response = await api.post<AuthSuccessResponse<AdminLoginData>>('/auth/admin-login/', payload);
  return response.data;
};

export const verifyActivationApi = async (
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/verify-activation/', {
    email,
    code,
  });
  return response.data;
};

export const resendOtpApi = async (
  email: string,
  otp_type: 'activation' | 'reset_password',
  method: 'email' | 'sms' = 'email'
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/resend-otp/', {
    email,
    otp_type,
    method,
  });
  return response.data;
};

export const logoutApi = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>('/auth/logout/');
    return response.data;
  } catch {
    // Even if API fails, we should still logout locally
    return { success: true, message: 'Logged out locally' };
  }
};

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    access_token: string;
    refresh_token?: string;
  };
  message?: string;
}

/**
 * Refresh the access token using the refresh token
 * The refresh token is sent via httpOnly cookie by the browser
 */
export const refreshTokenApi = async (): Promise<RefreshTokenResponse> => {
  try {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh/', {}, {
      withCredentials: true, // Include cookies
    });
    return response.data;
  } catch (error) {
    console.error('[auth] Token refresh failed:', error);
    return { success: false, message: 'Token refresh failed' };
  }
};

/**
 * Validate the current access token with the server
 */
export const validateTokenApi = async (): Promise<{ valid: boolean; user?: AuthUser }> => {
  try {
    const response = await api.get<AuthSuccessResponse<{ user: AuthUser }>>('/auth/me/');
    if (response.data.status === 'success') {
      return { valid: true, user: response.data.data.user };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
};

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: Record<string, string[] | string> }
      | undefined;

    if (data?.message) return data.message;

    const firstFieldError = data?.error ? Object.values(data.error)[0] : undefined;
    if (Array.isArray(firstFieldError) && firstFieldError.length > 0) return firstFieldError[0];
    if (typeof firstFieldError === 'string') return firstFieldError;

    return error.message || 'Request failed';
  }

  if (error instanceof Error) return error.message;
  return 'Unexpected error';
};
