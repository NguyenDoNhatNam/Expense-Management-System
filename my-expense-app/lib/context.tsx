'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  currency: string;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  walletId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense';
  budget?: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'yearly';
  alertThreshold: number;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  wallets: Wallet[];
  addWallet: (wallet: Omit<Wallet, 'id'>) => void;
  updateWallet: (id: string, wallet: Partial<Wallet>) => void;
  selectedWallet: Wallet | null;
  setSelectedWallet: (wallet: Wallet | null) => void;
  currency: string;
  setCurrency: (currency: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultCategories: Category[] = [
  { id: '1', name: 'Food & Dining', color: '#FF6B6B', icon: '🍔', type: 'expense' },
  { id: '2', name: 'Transportation', color: '#4ECDC4', icon: '🚗', type: 'expense' },
  { id: '3', name: 'Shopping', color: '#FFE66D', icon: '🛍️', type: 'expense' },
  { id: '4', name: 'Entertainment', color: '#95E1D3', icon: '🎬', type: 'expense' },
  { id: '5', name: 'Utilities', color: '#A8E6CF', icon: '💡', type: 'expense' },
  { id: '6', name: 'Salary', color: '#90EE90', icon: '💰', type: 'income' },
  { id: '7', name: 'Freelance', color: '#87CEEB', icon: '💼', type: 'income' },
  { id: '8', name: 'Investments', color: '#DDA0DD', icon: '📈', type: 'income' },
  { id: '9', name: 'Health', color: '#FF69B4', icon: '🏥', type: 'expense' },
  { id: '10', name: 'Education', color: '#FFB347', icon: '📚', type: 'expense' },
];

const defaultWallet: Wallet = {
  id: '1',
  name: 'My Wallet',
  balance: 5000,
  currency: 'USD',
  color: '#56CCF2',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([defaultWallet]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(defaultWallet);
  const [currency, setCurrency] = useState<string>('USD');

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('expenseapp_user');
    const savedTransactions = localStorage.getItem('expenseapp_transactions');
    const savedBudgets = localStorage.getItem('expenseapp_budgets');
    const savedWallets = localStorage.getItem('expenseapp_wallets');
    const savedCurrency = localStorage.getItem('expenseapp_currency');

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);
      setWallets(parsedWallets);
      setSelectedWallet(parsedWallets[0]);
    }
    if (savedCurrency) setCurrency(JSON.parse(savedCurrency));
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('expenseapp_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('expenseapp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('expenseapp_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('expenseapp_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('expenseapp_currency', JSON.stringify(currency));
  }, [currency]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions([newTransaction, ...transactions]);

    if (selectedWallet) {
      const updatedWallets = wallets.map(w => {
        if (w.id === selectedWallet.id) {
          const newBalance = transaction.type === 'income' 
            ? w.balance + transaction.amount 
            : w.balance - transaction.amount;
          return { ...w, balance: newBalance };
        }
        return w;
      });
      setWallets(updatedWallets);
      setSelectedWallet(updatedWallets.find(w => w.id === selectedWallet.id) || null);
    }
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(transactions.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction && selectedWallet) {
      const updatedWallets = wallets.map(w => {
        if (w.id === selectedWallet.id) {
          const newBalance = transaction.type === 'income' 
            ? w.balance - transaction.amount 
            : w.balance + transaction.amount;
          return { ...w, balance: newBalance };
        }
        return w;
      });
      setWallets(updatedWallets);
      setSelectedWallet(updatedWallets.find(w => w.id === selectedWallet.id) || null);
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(categories.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: Date.now().toString(),
    };
    setBudgets([...budgets, newBudget]);
  };

  const addWallet = (wallet: Omit<Wallet, 'id'>) => {
    const newWallet: Wallet = {
      ...wallet,
      id: Date.now().toString(),
    };
    setWallets([...wallets, newWallet]);
    setSelectedWallet(newWallet);
  };

  const updateWallet = (id: string, updates: Partial<Wallet>) => {
    const updatedWallets = wallets.map(w => (w.id === id ? { ...w, ...updates } : w));
    setWallets(updatedWallets);
    if (selectedWallet?.id === id) {
      setSelectedWallet(updatedWallets.find(w => w.id === id) || null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        categories,
        addCategory,
        updateCategory,
        budgets,
        setBudgets,
        addBudget,
        wallets,
        addWallet,
        updateWallet,
        selectedWallet,
        setSelectedWallet,
        currency,
        setCurrency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
