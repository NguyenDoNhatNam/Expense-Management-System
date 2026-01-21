'use client';

import { useState, useMemo } from 'react';
import { useApp, Budget, Category, Transaction } from '@/lib/context';

export default function BudgetManager() {
  const { budgets, addBudget, setBudgets, categories, transactions, selectedWallet } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    alertThreshold: '80',
  });

  const expenseCategories = categories.filter((c: Category) => c.type === 'expense');

  const budgetStatus = useMemo(() => {
    return budgets.map((budget: Budget) => {
      const category = categories.find((c: Category) => c.id === budget.categoryId);
      
      const spent = transactions
        .filter(
          (t: Transaction) =>
            t.type === 'expense' &&
            t.category === category?.name &&
            (!t.walletId || t.walletId === selectedWallet?.id)
        )
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget,
        category,
        spent,
        percentage,
        isOverBudget: spent > budget.amount,
        isWarning: percentage >= budget.alertThreshold,
      };
    });
  }, [budgets, categories, transactions, selectedWallet]);

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.amount) {
      alert('Please fill in all fields');
      return;
    }

    addBudget({
      categoryId: formData.categoryId,
      amount: parseFloat(formData.amount),
      period: formData.period,
      alertThreshold: parseInt(formData.alertThreshold),
    });

    setFormData({
      categoryId: '',
      amount: '',
      period: 'monthly',
      alertThreshold: '80',
    });
    setShowForm(false);
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm('Delete this budget?')) {
      setBudgets(budgets.filter((b: Budget) => b.id !== id));
    }
  };

  const totalBudget = budgets.reduce((sum: number, b: Budget) => sum + b.amount, 0);
  const totalSpent = budgetStatus.reduce((sum: number, b: any) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budget Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            + Set Budget
          </button>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
          <p className="text-2xl font-bold">{totalBudget.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-destructive">{totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-success' : 'text-destructive'}`}>
            {(totalBudget - totalSpent).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Set Category Budget</h2>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                  required
                >
                  <option value="">Select a category</option>
                  {expenseCategories
                    .filter((c: Category) => !budgets.some((b: Budget) => b.categoryId === c.id))
                    .map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-2">
                  Budget Amount *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
                  required
                />
              </div>

              <div>
                <label htmlFor="period" className="block text-sm font-medium mb-2">
                  Period
                </label>
                <select
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'yearly' })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label htmlFor="threshold" className="block text-sm font-medium mb-2">
                  Alert Threshold (%)
                </label>
                <input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-2 px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Set Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget List */}
      {budgetStatus.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 shadow-sm text-center">
          <p className="text-muted-foreground text-lg">No budgets set yet</p>
          <p className="text-muted-foreground text-sm mt-2">Create budgets to track spending limits</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetStatus.map((status: any) => (
            <div key={status.id} className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{status.category?.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{status.category?.name}</h3>
                    <p className="text-sm text-muted-foreground">{status.period.charAt(0).toUpperCase() + status.period.slice(1)} Budget</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBudget(status.id)}
                  className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                  title="Delete"
                >
                  🗑
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Spending</span>
                  <span className="text-sm font-bold">{status.percentage.toFixed(1)}%</span>
                </div>

                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      status.isOverBudget ? 'bg-destructive' : status.isWarning ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span
                    className={`font-bold ${
                      status.isOverBudget ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {status.spent.toFixed(2)} / {status.amount.toFixed(2)}
                  </span>
                  {status.isOverBudget && (
                    <span className="text-destructive font-bold">
                      Over by {(status.spent - status.amount).toFixed(2)}
                    </span>
                  )}
                  {status.isWarning && !status.isOverBudget && (
                    <span className="text-warning font-bold">
                      {(status.amount - status.spent).toFixed(2)} remaining
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Alert threshold: {status.alertThreshold}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
