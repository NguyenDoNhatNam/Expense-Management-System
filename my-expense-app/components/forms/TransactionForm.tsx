'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import * as Types from '@/lib/types';

interface TransactionFormProps {
  editingId?: string | null;
  onClose: () => void;
}

export default function TransactionForm({ editingId, onClose }: TransactionFormProps) {
  const { addTransaction, updateTransaction, transactions, categories, currentWallet } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    categoryId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringPattern: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
  });

  useEffect(() => {
    if (editingId) {
      const tx = transactions.find((t) => t.id === editingId);
      if (tx) {
        const newFormData = {
          type: tx.type as 'income' | 'expense',
          amount: tx.amount.toString(),
          categoryId: tx.categoryId,
          description: tx.description,
          date: new Date(tx.date).toISOString().split('T')[0],
          isRecurring: tx.isRecurring,
          recurringPattern: (tx.recurringPattern || 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly',
        };
        setFormData(newFormData);
      }
    }
  }, [editingId, transactions]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.amount || !formData.categoryId || !formData.description) {
      alert('Please fill all required fields');
      return;
    }

    if (editingId) {
      updateTransaction(editingId, {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
      });
    } else {
      addTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        description: formData.description,
        date: new Date(formData.date),
        isRecurring: formData.isRecurring,
        recurringPattern: formData.recurringPattern,
        walletId: currentWallet!.id,
        userId: '', // Demo user
        tags: [],
      } as Omit<Types.Transaction, 'id' | 'createdAt' | 'updatedAt'>);
    }

    onClose();
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const relevantCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Type</label>
          <select
            value={formData.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFormData({ ...formData, type: e.target.value as 'income' | 'expense', categoryId: '' });
            }}
            className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
            required
          >
            <option value="">Select Category</option>
            {relevantCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Amount</label>
        <div className="flex gap-2 mt-2">
          <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
            {currentWallet?.currency || 'USD'}
          </span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="What is this transaction for?"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Date</label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="pt-4 border-t">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm font-medium">This is a recurring transaction</span>
        </label>

        {formData.isRecurring && (
          <select
            value={formData.recurringPattern}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, recurringPattern: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
            className="w-full mt-3 px-3 py-2 border rounded-lg bg-background"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {editingId ? 'Update' : 'Add'} Transaction
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
