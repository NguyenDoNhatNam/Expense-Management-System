'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as Types from './types';
import { getApiErrorMessage, loginApi, logoutApi, signupApi, refreshTokenApi } from './api/auth';
import { 
  isTokenExpired, 
  getStoredAccessToken, 
  clearTokens, 
  storeTokens 
} from './api/token';
import {
  BackendCategory,
  createCategoryApi,
  deleteCategoryApi,
  listCategoriesApi,
  updateCategoryApi,
} from './api/categories';
import {
  BackendAccount,
  CreateAccountPayload,
  UpdateAccountPayload,
  createAccountApi,
  deleteAccountApi,
  listAccountsApi,
  updateAccountApi,
} from './api/accounts';
import {
  listSavingGoalsApi,
  createSavingGoalApi,
  updateSavingGoalApi,
  deleteSavingGoalApi,
  BackendSavingGoal,
} from './api/savinggoals';
import {
  BackendDebt,
  DebtListResponse,
  CreateDebtResponse,
  listDebtsApi,
  createDebtApi,
} from './api/debts';
import {
  listBudgetsApi,
  createBudgetApi,
  updateBudgetApi,
  deleteBudgetApi,
  BackendBudget,
  CreateBudgetPayload,
} from './api/budgets';   // ← đường dẫn đúng của bạn
interface AppContextType {
  // Auth
  currentUser: Types.User | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  logout: () => Promise<void> | void;

  // Wallets
  wallets: Types.Wallet[];
  currentWallet: Types.Wallet | null;
  setCurrentWallet: (wallet: Types.Wallet) => void;
  addWallet: (wallet: Omit<Types.Wallet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWallet: (id: string, data: Partial<Types.Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;

  // Categories
  categories: Types.Category[];
  addCategory: (category: Omit<Types.Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Types.Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Transactions
  transactions: Types.Transaction[];
  addTransaction: (transaction: Omit<Types.Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, data: Partial<Types.Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByFilters: (filters: any) => Types.Transaction[];

  // Budgets
  budgets: Types.Budget[];
  addBudget: (budget: Omit<Types.Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBudget: (id: string, data: Partial<Types.Budget>) => void;
  deleteBudget: (id: string) => void;

  // Savings Goals
  savingsGoals: Types.SavingsGoal[];
  addSavingsGoal: (goal: Omit<Types.SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSavingsGoal: (id: string, data: Partial<Types.SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  // Debts
  debts: Types.Debt[];
  addDebt: (debt: Omit<Types.Debt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDebt: (id: string, data: Partial<Types.Debt>) => void;
  deleteDebt: (id: string) => void;

  // Statistics
  getTotalIncome: (period?: 'week' | 'month' | 'year') => number;
  getTotalExpense: (period?: 'week' | 'month' | 'year') => number;
  getExpenseByCategory: () => { [key: string]: number };
  getIncomeByCategory: () => { [key: string]: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Types.User | null>(null);
  const [wallets, setWallets] = useState<Types.Wallet[]>([]);
  const [currentWallet, setCurrentWallet] = useState<Types.Wallet | null>(null);
  const [categories, setCategories] = useState<Types.Category[]>([]);
  const [transactions, setTransactions] = useState<Types.Transaction[]>([]);
  const [budgets, setBudgets] = useState<Types.Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<Types.SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Types.Debt[]>([]);

  // Ref to track sync state and prevent duplicate syncs
  const syncStateRef = useRef<{ 
    isSyncing: boolean; 
    lastSyncedUserId: string | null;
    abortController: AbortController | null;
  }>({ 
    isSyncing: false, 
    lastSyncedUserId: null,
    abortController: null 
  });

  const mapBackendCategoryToCategory = useCallback(
    (backendCategory: BackendCategory, userId: string): Types.Category => {
      const now = new Date();
      return {
        id: backendCategory.category_id,
        userId,
        name: backendCategory.category_name,
        icon: backendCategory.icon || '📝',
        color: backendCategory.color || '#0ea5e9',
        type: backendCategory.category_type,
        createdAt: now,
        updatedAt: now,
      };
    },
    []
  );

  const syncCategoriesFromBackend = useCallback(
    async (userId: string) => {
      const response = await listCategoriesApi({ ipp: 100 });
      // Defensive: ensure data.items exists and is an array
      const categoriesData = response.data?.items || [];
      const mappedCategories = categoriesData.map((item) => mapBackendCategoryToCategory(item, userId));
      setCategories(mappedCategories);
    },
    [mapBackendCategoryToCategory]
  );

  const mapBackendAccountToWallet = useCallback(
    (backendAccount: BackendAccount, userId: string, isDefault: boolean): Types.Wallet => {
      const createdAt = backendAccount.created_at ? new Date(backendAccount.created_at) : new Date();
      const updatedAt = backendAccount.updated_at ? new Date(backendAccount.updated_at) : createdAt;

      return {
        id: backendAccount.account_id,
        userId,
        name: backendAccount.account_name,
        currency: backendAccount.currency,
        balance: Number(backendAccount.balance || 0),
        description: backendAccount.description || undefined,
        isDefault,
        createdAt,
        updatedAt,
      };
    },
    []
  );

  const syncWalletsFromBackend = useCallback(
    async (userId: string) => {
      const response = await listAccountsApi();
      // Defensive: ensure data.accounts exists and is an array
      const accountsData = response.data?.accounts || [];
      const mappedWallets = accountsData.map((account, index) =>
        mapBackendAccountToWallet(account, userId, index === 0)
      );

      setWallets(mappedWallets);
      setCurrentWallet((previousWallet) => {
        if (mappedWallets.length === 0) {
          return null;
        }

        if (previousWallet) {
          const sameWallet = mappedWallets.find((wallet) => wallet.id === previousWallet.id);
          if (sameWallet) {
            return sameWallet;
          }
        }

        return mappedWallets[0];
      });
    },
    [mapBackendAccountToWallet]
  );

  const syncSavingGoals = async (userId: string) => {
  const res = await listSavingGoalsApi();
  
  // Defensive: ensure data is an array
  const goalsData = Array.isArray(res.data) ? res.data : [];
  const mapped = goalsData.map((item: any) => ({
    id: item.goal_id,
    userId,
    walletId: currentWallet?.id || '',
    name: item.goal_name,
    targetAmount: Number(item.target_amount),
    currentAmount: Number(item.current_amount),
    deadline: new Date(item.target_date),
    priority: item.priority,
    description: item.description || '',
    currency: 'VND',
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }));

  setSavingsGoals(mapped);
};
const mapBackendDebtToDebt = useCallback(
  (backendDebt: BackendDebt, userId: string): Types.Debt => ({
    id: backendDebt.debt_id,
    userId,
    debt_type: backendDebt.debt_type,
    person_name: backendDebt.person_name,
    amount: Number(backendDebt.amount),
    remaining_amount: Number(backendDebt.remaining_amount),
    interest_rate: Number(backendDebt.interest_rate),
    start_date: new Date(backendDebt.start_date),
    due_date: new Date(backendDebt.due_date),
    description: backendDebt.description || '',
    status: backendDebt.status,
    createdAt: new Date(backendDebt.created_at),
    updatedAt: new Date(backendDebt.updated_at),
    currency: 'VND',
  }),
  []
);

const syncDebtsFromBackend = useCallback(async (userId: string) => {
  const response: DebtListResponse = await listDebtsApi();
  // Defensive: ensure data is an array
  const debtsData = Array.isArray(response.data) ? response.data : [];
  const mapped = debtsData.map((item: BackendDebt) =>
    mapBackendDebtToDebt(item, userId)
  );
  setDebts(mapped);
}, [mapBackendDebtToDebt]);

const mapBackendBudgetToBudget = useCallback(
  (backendBudget: BackendBudget, userId: string): Types.Budget => {
    const now = new Date();
    return {
      id: backendBudget.budget_id,
      userId,
      categoryId: backendBudget.category_id,
      limit: Number(backendBudget.amount),           // ← page dùng limit
      spent: Number(
        (backendBudget as any).spent_amount ?? 
        backendBudget.spent ?? 
        0
      ),
      period: backendBudget.period,
      alertThreshold: backendBudget.alert_threshold, // ← camelCase cho page
      startDate: new Date(backendBudget.start_date),
      endDate: new Date(backendBudget.end_date),
      createdAt: now,
      updatedAt: now,
      // các field khác nếu Types.Budget yêu cầu
    };
  },
  []
);

const syncBudgetsFromBackend = useCallback(async (userId: string) => {
  const response = await listBudgetsApi();
  const budgetsData = response.data.items || [];
  const mappedBudgets = budgetsData.map((item: BackendBudget) =>
    mapBackendBudgetToBudget(item, userId)
  );
  setBudgets(mappedBudgets);
}, [mapBackendBudgetToBudget]);

  // State to track if initial auth check is done
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Load data from localStorage on mount with token validation
  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('expenseapp_user') || sessionStorage.getItem('expenseapp_user');
      const accessToken = getStoredAccessToken();

      // If no saved user or no token, clear everything and return
      if (!savedUser || !accessToken) {
        clearTokens();
        localStorage.removeItem('expenseapp_user');
        sessionStorage.removeItem('expenseapp_user');
        setIsAuthChecking(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(accessToken, 0)) {
        console.log('[auth] Access token expired, attempting refresh...');
        
        try {
          // Try to refresh the token
          const refreshResult = await refreshTokenApi();
          
          if (refreshResult.success && refreshResult.data?.access_token) {
            console.log('[auth] Token refreshed successfully');
            const storage = localStorage.getItem('access_token') ? localStorage : sessionStorage;
            storage.setItem('access_token', refreshResult.data.access_token);
            if (refreshResult.data.refresh_token) {
              storage.setItem('refresh_token', refreshResult.data.refresh_token);
            }
            
            // Continue with loading user
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
          } else {
            console.log('[auth] Token refresh failed, logging out');
            // Refresh failed, clear everything
            clearTokens();
            localStorage.removeItem('expenseapp_user');
            sessionStorage.removeItem('expenseapp_user');
            localStorage.removeItem('expenseapp_wallets');
            localStorage.removeItem('expenseapp_categories');
            localStorage.removeItem('expenseapp_transactions');
            localStorage.removeItem('expenseapp_budgets');
            localStorage.removeItem('expenseapp_goals');
            localStorage.removeItem('expenseapp_debts');
            setIsAuthChecking(false);
            return;
          }
        } catch (error) {
          console.error('[auth] Token refresh error:', error);
          // On error, clear everything
          clearTokens();
          localStorage.removeItem('expenseapp_user');
          sessionStorage.removeItem('expenseapp_user');
          setIsAuthChecking(false);
          return;
        }
      } else {
        // Token is still valid, load user
        console.log('[auth] Token is valid, loading user');
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      }

      // Load cached data
      const savedWallets = localStorage.getItem('expenseapp_wallets');
      const savedCategories = localStorage.getItem('expenseapp_categories');
      const savedTransactions = localStorage.getItem('expenseapp_transactions');
      const savedBudgets = localStorage.getItem('expenseapp_budgets');
      const savedGoals = localStorage.getItem('expenseapp_goals');
      const savedDebts = localStorage.getItem('expenseapp_debts');

      if (savedWallets) {
        const w = JSON.parse(savedWallets);
        setWallets(w);
        if (w.length > 0) setCurrentWallet(w.find((x: any) => x.isDefault) || w[0]);
      }
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
      if (savedGoals) setSavingsGoals(JSON.parse(savedGoals));
      if (savedDebts) setDebts(JSON.parse(savedDebts));

      setIsAuthChecking(false);
    };

    initializeAuth();
  }, []);

  // Sync user data from backend - with deduplication to prevent multiple simultaneous syncs
  useEffect(() => {
    if (!currentUser) {
      // Reset sync state when user logs out
      syncStateRef.current.lastSyncedUserId = null;
      return;
    }

    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) {
      console.warn('[sync] Skip initial sync because access_token is missing.');
      return;
    }

    // Prevent duplicate syncs: skip if already syncing or already synced for this user
    if (syncStateRef.current.isSyncing) {
      console.log('[sync] Skipping - sync already in progress');
      return;
    }
    
    if (syncStateRef.current.lastSyncedUserId === currentUser.id) {
      console.log('[sync] Skipping - already synced for this user');
      return;
    }

    // Mark sync as in progress
    syncStateRef.current.isSyncing = true;
    console.log('[sync] Starting initial data sync for user:', currentUser.id);

    Promise.all([
      syncCategoriesFromBackend(currentUser.id),
      syncWalletsFromBackend(currentUser.id),
      syncDebtsFromBackend(currentUser.id),
      syncSavingGoals(currentUser.id),
      syncBudgetsFromBackend(currentUser.id),
    ])
      .then(() => {
        console.log('[sync] Initial data sync completed successfully');
        syncStateRef.current.lastSyncedUserId = currentUser.id;
      })
      .catch((error) => {
        console.error('[sync] Failed to sync initial user data:', getApiErrorMessage(error));
      })
      .finally(() => {
        syncStateRef.current.isSyncing = false;
      });
  }, [currentUser, syncCategoriesFromBackend, syncWalletsFromBackend, syncDebtsFromBackend, syncSavingGoals, syncBudgetsFromBackend]);

  // Persist data to localStorage
  useEffect(() => {
    if (currentUser) localStorage.setItem('expenseapp_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('expenseapp_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('expenseapp_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('expenseapp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('expenseapp_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('expenseapp_goals', JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  useEffect(() => {
    localStorage.setItem('expenseapp_debts', JSON.stringify(debts));
  }, [debts]);

  // Auth functions
  const login = async (
  email: string,
  password: string,
  rememberMe = false
): Promise<any> => {          
  const res = await loginApi({ email, password, remember_me: rememberMe });
  const { user: apiUser, access_token, refresh_token } = res.data;

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('access_token', access_token);
  storage.setItem('refresh_token', refresh_token);

  const user: Types.User = {
    id: apiUser.user_id,
    email: apiUser.email,
    fullName: apiUser.full_name,
    role: apiUser.role,
    createdAt: new Date(apiUser.created_at),
  };

  if (rememberMe) {
    localStorage.setItem('expenseapp_user', JSON.stringify(user));
  } else {
    sessionStorage.setItem('expenseapp_user', JSON.stringify(user));
  }

  // Mark sync as in progress to prevent duplicate sync from useEffect
  syncStateRef.current.isSyncing = true;
  setCurrentUser(user);
  
  try {
    await Promise.all([syncCategoriesFromBackend(user.id), syncWalletsFromBackend(user.id), syncSavingGoals(user.id), syncBudgetsFromBackend(user.id), syncDebtsFromBackend(user.id)]);
    syncStateRef.current.lastSyncedUserId = user.id;
  } finally {
    syncStateRef.current.isSyncing = false;
  }

  return res;
};

  const register = async (email: string, password: string, fullName: string, phone: string) => {
    const res = await signupApi({ email, password, full_name: fullName, phone });
    console.log('Signup response:', res);
    const { user: apiUser, access_token, refresh_token, account, categories: apiCategories } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const user: Types.User = {
      id: apiUser.user_id,
      email: apiUser.email,
      fullName: apiUser.full_name,
      role: apiUser.role,
      createdAt: new Date(apiUser.created_at),
    };

    // Keep values to avoid unused variables from backend response while syncing from API.
    void account;
    void apiCategories;

    // Mark sync as in progress to prevent duplicate sync from useEffect
    syncStateRef.current.isSyncing = true;
    setCurrentUser(user);

    try {
      await Promise.all([syncWalletsFromBackend(user.id), syncCategoriesFromBackend(user.id), syncSavingGoals(user.id), syncDebtsFromBackend(user.id), syncBudgetsFromBackend(user.id),]);
      syncStateRef.current.lastSyncedUserId = user.id;
    } finally {
      syncStateRef.current.isSyncing = false;
    }
  };

  const logout = async () => {
    // Call backend logout API to log the activity
    try {
      await logoutApi();
    } catch {
      // Continue with local logout even if API fails
    }
    
    // Reset sync state
    syncStateRef.current.isSyncing = false;
    syncStateRef.current.lastSyncedUserId = null;
    
    setCurrentUser(null);
    setWallets([]);
    setCurrentWallet(null);
    setCategories([]);
    setTransactions([]);
    setBudgets([]);
    setSavingsGoals([]);
    setDebts([]);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expenseapp_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('expenseapp_user');
    localStorage.removeItem('expenseapp_wallets');
    localStorage.removeItem('expenseapp_categories');
    localStorage.removeItem('expenseapp_transactions');
    localStorage.removeItem('expenseapp_budgets');
    localStorage.removeItem('expenseapp_goals');
    localStorage.removeItem('expenseapp_debts');
  };

  // Wallet functions
  const addWallet = async (wallet: Omit<Types.Wallet, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để tạo ví.');
    }

    const payload: CreateAccountPayload = {
      account_name: wallet.name,
      account_type: 'cash',
      currency: wallet.currency,
      initial_balance: wallet.balance,
      is_include_in_total: true,
      description: wallet.description,
    };

    await createAccountApi(payload);
    await syncWalletsFromBackend(currentUser.id);
  };

  const updateWallet = async (id: string, data: Partial<Types.Wallet>) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để cập nhật ví.');
    }

    const payload: UpdateAccountPayload = {};

    if (data.name !== undefined) payload.account_name = data.name;
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.description !== undefined) payload.description = data.description;

    if (Object.keys(payload).length === 0) {
      return;
    }

    await updateAccountApi(id, payload);
    await syncWalletsFromBackend(currentUser.id);
  };

  const deleteWallet = async (id: string) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để xóa ví.');
    }

    await deleteAccountApi(id);
    await syncWalletsFromBackend(currentUser.id);
  };

  // Category functions
  const addCategory = async (category: Omit<Types.Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để tạo danh mục.');
    }

    await createCategoryApi({
      category_name: category.name,
      category_type: category.type,
      icon: category.icon,
      color: category.color,
    });

    await syncCategoriesFromBackend(currentUser.id);
  };

  const updateCategory = async (id: string, data: Partial<Types.Category>) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để cập nhật danh mục.');
    }

    await updateCategoryApi(id, {
      category_name: data.name,
      icon: data.icon,
      color: data.color,
    });

    await syncCategoriesFromBackend(currentUser.id);
  };

  const deleteCategory = async (id: string) => {
    if (!currentUser) {
      throw new Error('Bạn cần đăng nhập để xóa danh mục.');
    }

    await deleteCategoryApi(id);
    await syncCategoriesFromBackend(currentUser.id);
  };

  // Transaction functions
  const addTransaction = (transaction: Omit<Types.Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Types.Transaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTransactions([...transactions, newTransaction]);

    // Update wallet balance
    const walletIdx = wallets.findIndex(w => w.id === transaction.walletId);
    if (walletIdx >= 0) {
      const newBalance = transaction.type === 'income'
        ? wallets[walletIdx].balance + transaction.amount
        : wallets[walletIdx].balance - transaction.amount;
      setWallets((prevWallets) =>
        prevWallets.map((wallet) =>
          wallet.id === transaction.walletId ? { ...wallet, balance: newBalance, updatedAt: new Date() } : wallet
        )
      );
      setCurrentWallet((previousWallet) =>
        previousWallet?.id === transaction.walletId
          ? { ...previousWallet, balance: newBalance, updatedAt: new Date() }
          : previousWallet
      );
    }

    // Update budget spent
    const budgetIdx = budgets.findIndex(b => b.categoryId === transaction.categoryId);
    if (budgetIdx >= 0 && transaction.type === 'expense') {
      updateBudget(budgets[budgetIdx].id, { spent: budgets[budgetIdx].spent + transaction.amount });
    }
  };

  const updateTransaction = (id: string, data: Partial<Types.Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (oldTx && data.amount && oldTx.amount !== data.amount) {
      const diff = data.amount - oldTx.amount;
      const walletId = data.walletId || oldTx.walletId;
      const newBalance = oldTx.type === 'income'
        ? currentWallet!.balance + diff
        : currentWallet!.balance - diff;
      setWallets((prevWallets) =>
        prevWallets.map((wallet) =>
          wallet.id === walletId ? { ...wallet, balance: newBalance, updatedAt: new Date() } : wallet
        )
      );
      setCurrentWallet((previousWallet) =>
        previousWallet?.id === walletId
          ? { ...previousWallet, balance: newBalance, updatedAt: new Date() }
          : previousWallet
      );
    }
    setTransactions(transactions.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date() } : t));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      const newBalance = tx.type === 'income'
        ? currentWallet!.balance - tx.amount
        : currentWallet!.balance + tx.amount;
      setWallets((prevWallets) =>
        prevWallets.map((wallet) =>
          wallet.id === tx.walletId ? { ...wallet, balance: newBalance, updatedAt: new Date() } : wallet
        )
      );
      setCurrentWallet((previousWallet) =>
        previousWallet?.id === tx.walletId
          ? { ...previousWallet, balance: newBalance, updatedAt: new Date() }
          : previousWallet
      );
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const getTransactionsByFilters = (filters: any) => {
    return transactions.filter(t => {
      if (filters.walletId && t.walletId !== filters.walletId) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(t.date) > new Date(filters.endDate)) return false;
      if (filters.minAmount && t.amount < filters.minAmount) return false;
      if (filters.maxAmount && t.amount > filters.maxAmount) return false;
      return true;
    });
  };

  // Budget functions
const addBudget = async (payload: CreateBudgetPayload) => {
  if (!currentUser) throw new Error('Bạn cần đăng nhập để tạo ngân sách.');
  await createBudgetApi(payload);
  await syncBudgetsFromBackend(currentUser.id);
};

const updateBudget = async (id: string, data: Partial<CreateBudgetPayload>) => {
  if (!currentUser) throw new Error('Bạn cần đăng nhập để cập nhật ngân sách.');
  await updateBudgetApi(id, data);
  await syncBudgetsFromBackend(currentUser.id);
};

const deleteBudget = async (id: string) => {
  if (!currentUser) {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    return;
  }
  await deleteBudgetApi(id);
  await syncBudgetsFromBackend(currentUser.id);
};

  // Savings Goal functions
  const addSavingsGoal = async (goal: any) => {
  if (!currentUser) throw new Error('Not authenticated');

  await createSavingGoalApi({
    goal_name: goal.name,
    target_amount: goal.targetAmount,
    target_date: goal.deadline.toISOString().split('T')[0],
    description: goal.description,
    priority: goal.priority,
  });

  await syncSavingGoals(currentUser.id);
};

  const updateSavingsGoal = async (id: string, data: any) => {
  if (!currentUser) throw new Error('Not authenticated');

  await updateSavingGoalApi(id, {
    goal_name: data.name,
    target_amount: data.targetAmount,
    current_amount: data.currentAmount,
    target_date: data.deadline
      ? new Date(data.deadline).toISOString().split('T')[0]
      : undefined,
    description: data.description,
    priority: data.priority,
  });

  await syncSavingGoals(currentUser.id);
};

  const deleteSavingsGoal = async (id: string) => {
  if (!currentUser) throw new Error('Not authenticated');

  await deleteSavingGoalApi(id);
  await syncSavingGoals(currentUser.id);
};

  // Debt functions
  const addDebt = async (debt: Omit<Types.Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!currentUser) throw new Error('Bạn cần đăng nhập để tạo nợ.');

  const payload: CreateDebtPayload = {
    debt_type: debt.debt_type,
    person_name: debt.person_name,
    amount: debt.amount,
    interest_rate: debt.interest_rate || 0,
    start_date: debt.start_date.toISOString().split('T')[0],
    due_date: debt.due_date.toISOString().split('T')[0],
    description: debt.description || '',
  };

  await createDebtApi(payload);
  await syncDebtsFromBackend(currentUser.id);
};

  const updateDebt = (id: string, data: Partial<Types.Debt>) => {
    setDebts(debts.map(d => d.id === id ? { ...d, ...data, updatedAt: new Date() } : d));
  };

  const deleteDebt = async (id: string) => {
  if (!currentUser) {
    // fallback xóa local nếu chưa login
    setDebts(debts.filter((d) => d.id !== id));
    return;
  }

  try {
    await deleteDebtApi(id);
    await syncDebtsFromBackend(currentUser.id);   // ← đồng bộ lại từ server
  } catch (error: any) {
    console.error('Delete debt error:', error);
    alert(error.response?.data?.message || 'Không thể xóa khoản nợ');
  }
};

  // Statistics functions
  const getTotalIncome = (period?: 'week' | 'month' | 'year') => {
    let filtered = transactions.filter(t => t.type === 'income' && t.walletId === currentWallet?.id);

    if (period) {
      const now = new Date();
      const startDate = new Date();

      if (period === 'week') startDate.setDate(now.getDate() - 7);
      else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
      else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    return filtered.reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpense = (period?: 'week' | 'month' | 'year') => {
    let filtered = transactions.filter(t => t.type === 'expense' && t.walletId === currentWallet?.id);

    if (period) {
      const now = new Date();
      const startDate = new Date();

      if (period === 'week') startDate.setDate(now.getDate() - 7);
      else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
      else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    return filtered.reduce((sum, t) => sum + t.amount, 0);
  };

  const getExpenseByCategory = () => {
    const result: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === 'expense' && t.walletId === currentWallet?.id)
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        if (cat) {
          result[cat.name] = (result[cat.name] || 0) + t.amount;
        }
      });
    return result;
  };

  const getIncomeByCategory = () => {
    const result: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === 'income' && t.walletId === currentWallet?.id)
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        if (cat) {
          result[cat.name] = (result[cat.name] || 0) + t.amount;
        }
      });
    return result;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser && !isAuthChecking,
        isAuthChecking,
        isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'super_admin',
        login,
        register,
        logout,
        wallets,
        currentWallet,
        setCurrentWallet,
        addWallet,
        updateWallet,
        deleteWallet,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsByFilters,
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        savingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        getTotalIncome,
        getTotalExpense,
        getExpenseByCategory,
        getIncomeByCategory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};