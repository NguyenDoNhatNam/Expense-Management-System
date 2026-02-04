'use client';

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  avatar?: string;
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  currency: string;
  balance: number;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  type: 'income' | 'expense';
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: Date;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  attachmentUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limit: number;
  spent: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  alertThreshold: number;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  walletId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: Date;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  interestRate: number;
  creditorName: string;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedExpense {
  id: string;
  userId: string;
  groupName: string;
  members: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedTransaction {
  id: string;
  sharedExpenseId: string;
  payerId: string;
  amount: number;
  description: string;
  date: Date;
  splits: { memberId: string; amount: number }[];
  createdAt: Date;
}

export interface CurrencyExchange {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: Date;
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  transactionId: string;
  nextDueDate: Date;
  lastProcessedDate?: Date;
  isActive: boolean;
}
