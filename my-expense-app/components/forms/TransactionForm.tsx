'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getApiErrorMessage } from '@/lib/api/auth';
import { useNotification } from '@/lib/notification';
import {
  BackendTransaction,
  CreateTransactionPayload,
  createTransactionApi,
  updateTransactionApi,
} from '@/lib/api/transactions';

interface TransactionFormProps {
  editingId?: string | null;
  editingTransaction?: BackendTransaction | null;
  onClose: () => void;
}

interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  categoryId: string;
  description: string;
  date: string;
  isRecurring: boolean;
  recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  attachmentUrl: string;
}

const defaultFormData: TransactionFormData = {
  type: 'expense' as 'income' | 'expense',
  amount: '',
  categoryId: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  isRecurring: false,
  recurringPattern: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
  attachmentUrl: '',
};

export default function TransactionForm({ editingId, editingTransaction, onClose }: TransactionFormProps) {
  const { categories, currentWallet } = useApp();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormData = useMemo<TransactionFormData>(() => {
    if (!editingTransaction) return defaultFormData;

    return {
      type: editingTransaction.transaction_type === 'income' ? 'income' : 'expense',
      amount: String(editingTransaction.amount),
      categoryId: editingTransaction.category_id,
      description: editingTransaction.description || '',
      date: new Date(editingTransaction.transaction_date).toISOString().split('T')[0],
      isRecurring: editingTransaction.is_recurring,
      recurringPattern: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
      attachmentUrl: editingTransaction.receipt_image_url || '',
    };
  }, [editingTransaction]);

  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);

  const sanitizedReceiptUrl = useMemo(() => {
    if (!formData.attachmentUrl) return '';
    if (formData.attachmentUrl.startsWith('blob:')) return '';
    return formData.attachmentUrl;
  }, [formData.attachmentUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.amount || !formData.categoryId || !formData.description) {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    if (!currentWallet) {
      showNotification('No wallet selected. Please select a wallet before adding transactions.', 'error');
      return;
    }

    const payload: CreateTransactionPayload = {
      account_id: currentWallet.id,
      category_id: formData.categoryId,
      transaction_type: formData.type,
      transaction_date: `${formData.date}T00:00:00`,
      description: formData.description,
      note: '',
      location: '',
      receipt_image_url: sanitizedReceiptUrl,
      is_recurring: formData.isRecurring,
      recurring_id: '',
      amount: parseFloat(formData.amount),
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateTransactionApi(editingId, payload);
      } else {
        await createTransactionApi({
          account_id: payload.account_id,
          category_id: payload.category_id,
          amount: payload.amount,
          transaction_type: payload.transaction_type,
          transaction_date: payload.transaction_date,
          description: payload.description,
          note: payload.note,
          location: payload.location,
          receipt_image_url: payload.receipt_image_url,
          is_recurring: payload.is_recurring,
          recurring_id: payload.recurring_id,
        });
      }

      showNotification(editingId ? 'Transaction updated successfully.' : 'Transaction created successfully.', 'success');
      onClose();
    } catch (error) {
      showNotification(getApiErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
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

      <div>
        <label className="text-sm font-medium">Receipt Image</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setFormData({ ...formData, attachmentUrl: url });
            } else {
              setFormData({ ...formData, attachmentUrl: '' });
            }
          }}
          className="mt-2"
        />
        {formData.attachmentUrl && (
          <img src={formData.attachmentUrl} alt="Receipt" className="mt-2 h-24 w-24 object-cover rounded-md border" />
        )}
        {formData.attachmentUrl.startsWith('blob:') && (
          <p className="mt-2 text-xs text-muted-foreground">
            Local preview image is not uploaded yet, so receipt URL will be skipped for this transaction.
          </p>
        )}
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
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add'} Transaction
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
