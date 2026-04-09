// Quản lý Token trong RAM (Memory) để tránh XSS
let inMemoryToken: string | null = null;

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const setAuthToken = (token: string): void => {
  inMemoryToken = token;
};

export const clearAuthToken = (): void => {
  inMemoryToken = null;
};