'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

interface TransactionFormProps {
  editingId: string | null;
  onComplete: () => void;
}

export default function TransactionForm({ editingId, onComplete }: TransactionFormProps) {
  const { transactions, addTransaction, updateTransaction, categories, currency } = useApp();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (editingId) {
      const transaction = transactions.find((t) => t.id === editingId);
      if (transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setCategory(transaction.category);
        setDate(transaction.date);
        setDescription(transaction.description);
        setIsRecurring(transaction.isRecurring || false);
        setRecurringPattern(transaction.recurringPattern || 'monthly');
      }
    }
  }, [editingId, transactions]);

  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find((c) => c.name === category)) {
      setCategory(filteredCategories[0].name);
    }
  }, [type, filteredCategories, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) {
      alert('Please fill in all required fields');
      return;
    }

    const transactionData = {
      amount: parseFloat(amount),
      category,
      date,
      description,
      type,
      currency,
      isRecurring,
      recurringPattern,
    };

    if (editingId) {
      updateTransaction(editingId, transactionData);
    } else {
      addTransaction(transactionData);
    }

    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type Selection */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-2">
            Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                type === 'income'
                  ? 'bg-success text-white'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount *
          </label>
          <div className="flex items-center border border-border rounded-lg bg-input overflow-hidden">
            <span className="px-3 text-muted-foreground font-medium">{currency}</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 p-2 bg-input text-foreground placeholder-muted-foreground outline-none"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Category *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-input text-foreground"
            required
          >
            <option value="">Select a category</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-2">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-input text-foreground"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes..."
            className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
          />
        </div>

        {/* Recurring */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-medium">Recurring Transaction</span>
          </label>
          {isRecurring && (
            <div className="mt-2">
              <label htmlFor="recurring-pattern" className="block text-sm font-medium mb-2">
                Repeat
              </label>
              <select
                id="recurring-pattern"
                value={recurringPattern}
                onChange={(e) => setRecurringPattern(e.target.value as any)}
                className="w-full p-2 border border-border rounded-md bg-input text-foreground"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onComplete}
          className="py-2 px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="py-2 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {editingId ? 'Update' : 'Add'} Transaction
        </button>
      </div>
    </form>
  );
}
