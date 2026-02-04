'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Types from './types';

interface AppContextType {
  // Auth
  currentUser: Types.User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;

  // Wallets
  wallets: Types.Wallet[];
  currentWallet: Types.Wallet | null;
  setCurrentWallet: (wallet: Types.Wallet) => void;
  addWallet: (wallet: Omit<Types.Wallet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWallet: (id: string, data: Partial<Types.Wallet>) => void;
  deleteWallet: (id: string) => void;

  // Categories
  categories: Types.Category[];
  addCategory: (category: Omit<Types.Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, data: Partial<Types.Category>) => void;
  deleteCategory: (id: string) => void;

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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('expenseapp_user');
    const savedWallets = localStorage.getItem('expenseapp_wallets');
    const savedCategories = localStorage.getItem('expenseapp_categories');
    const savedTransactions = localStorage.getItem('expenseapp_transactions');
    const savedBudgets = localStorage.getItem('expenseapp_budgets');
    const savedGoals = localStorage.getItem('expenseapp_goals');
    const savedDebts = localStorage.getItem('expenseapp_debts');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
    }
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
  }, []);

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
  const login = async (email: string, password: string) => {
    const user: Types.User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      fullName: email.split('@')[0],
      createdAt: new Date(),
    };
    setCurrentUser(user);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const user: Types.User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      fullName,
      createdAt: new Date(),
    };
    setCurrentUser(user);

    // Create default wallet
    const defaultWallet: Types.Wallet = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      name: 'Main Wallet',
      currency: 'USD',
      balance: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWallets([defaultWallet]);
    setCurrentWallet(defaultWallet);

    // Create default categories
    const defaultCategories: Types.Category[] = [
      { id: '1', userId: user.id, name: 'Salary', icon: '💰', color: '#10b981', type: 'income', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', userId: user.id, name: 'Food', icon: '🍔', color: '#f59e0b', type: 'expense', createdAt: new Date(), updatedAt: new Date() },
      { id: '3', userId: user.id, name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense', createdAt: new Date(), updatedAt: new Date() },
      { id: '4', userId: user.id, name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense', createdAt: new Date(), updatedAt: new Date() },
      { id: '5', userId: user.id, name: 'Entertainment', icon: '🎬', color: '#8b5cf6', type: 'expense', createdAt: new Date(), updatedAt: new Date() },
      { id: '6', userId: user.id, name: 'Utilities', icon: '💡', color: '#06b6d4', type: 'expense', createdAt: new Date(), updatedAt: new Date() },
      { id: '7', userId: user.id, name: 'Other Income', icon: '💵', color: '#14b8a6', type: 'income', createdAt: new Date(), updatedAt: new Date() },
    ];
    setCategories(defaultCategories);
  };

  const logout = () => {
    setCurrentUser(null);
    setWallets([]);
    setCurrentWallet(null);
    setCategories([]);
    setTransactions([]);
    setBudgets([]);
    setSavingsGoals([]);
    setDebts([]);
    localStorage.removeItem('expenseapp_user');
    localStorage.removeItem('expenseapp_wallets');
    localStorage.removeItem('expenseapp_categories');
    localStorage.removeItem('expenseapp_transactions');
    localStorage.removeItem('expenseapp_budgets');
    localStorage.removeItem('expenseapp_goals');
    localStorage.removeItem('expenseapp_debts');
  };

  // Wallet functions
  const addWallet = (wallet: Omit<Types.Wallet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWallet: Types.Wallet = {
      ...wallet,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWallets([...wallets, newWallet]);
    if (wallet.isDefault) setCurrentWallet(newWallet);
  };

  const updateWallet = (id: string, data: Partial<Types.Wallet>) => {
    setWallets(wallets.map(w => w.id === id ? { ...w, ...data, updatedAt: new Date() } : w));
    if (currentWallet?.id === id) setCurrentWallet({ ...currentWallet, ...data });
  };

  const deleteWallet = (id: string) => {
    setWallets(wallets.filter(w => w.id !== id));
    if (currentWallet?.id === id) setCurrentWallet(wallets[0] || null);
  };

  // Category functions
  const addCategory = (category: Omit<Types.Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCategory: Types.Category = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, data: Partial<Types.Category>) => {
    setCategories(categories.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date() } : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
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
      updateWallet(transaction.walletId, { balance: newBalance });
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
      updateWallet(walletId, { balance: newBalance });
    }
    setTransactions(transactions.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date() } : t));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      const newBalance = tx.type === 'income'
        ? currentWallet!.balance - tx.amount
        : currentWallet!.balance + tx.amount;
      updateWallet(tx.walletId, { balance: newBalance });
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
  const addBudget = (budget: Omit<Types.Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBudget: Types.Budget = {
      ...budget,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setBudgets([...budgets, newBudget]);
  };

  const updateBudget = (id: string, data: Partial<Types.Budget>) => {
    setBudgets(budgets.map(b => b.id === id ? { ...b, ...data, updatedAt: new Date() } : b));
  };

  const deleteBudget = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  // Savings Goal functions
  const addSavingsGoal = (goal: Omit<Types.SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: Types.SavingsGoal = {
      ...goal,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSavingsGoals([...savingsGoals, newGoal]);
  };

  const updateSavingsGoal = (id: string, data: Partial<Types.SavingsGoal>) => {
    setSavingsGoals(savingsGoals.map(g => g.id === id ? { ...g, ...data, updatedAt: new Date() } : g));
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals(savingsGoals.filter(g => g.id !== id));
  };

  // Debt functions
  const addDebt = (debt: Omit<Types.Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDebt: Types.Debt = {
      ...debt,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDebts([...debts, newDebt]);
  };

  const updateDebt = (id: string, data: Partial<Types.Debt>) => {
    setDebts(debts.map(d => d.id === id ? { ...d, ...data, updatedAt: new Date() } : d));
  };

  const deleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
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
        isAuthenticated: !!currentUser,
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
