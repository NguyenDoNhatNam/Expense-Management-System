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

export interface AuthUser {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  default_currency: string;
  created_at: string;
  is_active: boolean;
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

export interface SignupData {
  user: AuthUser;
  account: Record<string, unknown>;
  categories: Array<Record<string, unknown>>;
  setting: Record<string, unknown>;
}

export const loginApi = async (payload: LoginPayload): Promise<AuthSuccessResponse<LoginData>> => {
  const response = await api.post<AuthSuccessResponse<LoginData>>('/auth/login/', payload);
  return response.data;
};

export const signupApi = async (payload: SignupPayload): Promise<AuthSuccessResponse<SignupData>> => {
  const response = await api.post<AuthSuccessResponse<SignupData>>('/auth/register/', payload);
  return response.data;
};

export const verifyActivationApi = async (email: string, code: string) => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/verify-activation/', { email, code });
  return response.data;
};

export const resendOtpApi = async (email: string, otp_type: 'activation' | 'reset_password', method: 'email' | 'sms' = 'email') => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/resend-otp/', { email, otp_type, method });
  return response.data;
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
