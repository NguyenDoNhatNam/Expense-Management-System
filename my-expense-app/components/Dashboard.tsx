'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/context';
import ExpenseChart from './ExpenseChart';
import StatCard from './StatCard';

export default function Dashboard() {
  const { transactions, selectedWallet, categories, budgets } = useApp();

  const stats = useMemo(() => {
    const walletTransactions = transactions.filter((t) => !t.walletId || t.walletId === selectedWallet?.id);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTransactions = walletTransactions.filter((t) => t.date.startsWith(currentMonth));

    const totalIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    const expensesByCategory = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce(
        (acc, t) => {
          const existing = acc.find((item) => item.category === t.category);
          if (existing) {
            existing.amount += t.amount;
          } else {
            acc.push({ category: t.category, amount: t.amount });
          }
          return acc;
        },
        [] as Array<{ category: string; amount: number }>
      );

    return {
      totalIncome,
      totalExpense,
      balance,
      expensesByCategory,
      monthTransactions,
    };
  }, [transactions, selectedWallet]);

  const budgetStatus = useMemo(() => {
    return budgets.map((budget) => {
      const categoryExpense = stats.expensesByCategory.find((e) => {
        const category = categories.find((c) => c.id === budget.categoryId);
        return category && e.category === category.name;
      });

      const spent = categoryExpense?.amount || 0;
      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget,
        spent,
        percentage,
        isOverBudget: spent > budget.amount,
        isWarning: percentage >= budget.alertThreshold,
      };
    });
  }, [budgets, stats.expensesByCategory, categories]);

  const warningBudgets = budgetStatus.filter((b) => b.isWarning || b.isOverBudget);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          amount={stats.totalIncome}
          currency={selectedWallet?.currency || 'USD'}
          color="var(--success)"
          icon="📈"
        />
        <StatCard
          title="Total Expense"
          amount={stats.totalExpense}
          currency={selectedWallet?.currency || 'USD'}
          color="var(--destructive)"
          icon="📉"
        />
        <StatCard
          title="Balance"
          amount={stats.balance}
          currency={selectedWallet?.currency || 'USD'}
          color="var(--primary)"
          icon="💰"
        />
        <StatCard
          title="Wallet Balance"
          amount={selectedWallet?.balance || 0}
          currency={selectedWallet?.currency || 'USD'}
          color="var(--accent)"
          icon="👝"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Expenses by Category (This Month)</h2>
          <ExpenseChart data={stats.expensesByCategory} categories={categories} />
        </div>

        {/* Budget Alerts */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Budget Status</h2>
          {budgetStatus.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No budgets set yet</p>
              <p className="text-sm mt-2">Create budgets to track spending limits</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetStatus.map((budget) => {
                const category = categories.find((c) => c.id === budget.categoryId);
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{category?.icon}</span>
                        <span className="font-medium text-sm">{category?.name}</span>
                      </div>
                      <span className="text-sm font-bold">{budget.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          budget.isOverBudget
                            ? 'bg-destructive'
                            : budget.isWarning
                              ? 'bg-warning'
                              : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {budget.spent.toFixed(2)} / {budget.amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {warningBudgets.length > 0 && (
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <h3 className="font-bold text-warning mb-2">Budget Alerts</h3>
          <ul className="space-y-1 text-sm">
            {warningBudgets.map((budget) => {
              const category = categories.find((c) => c.id === budget.categoryId);
              return (
                <li key={budget.id}>
                  {budget.isOverBudget ? '🔴' : '🟡'} {category?.name}: {budget.spent.toFixed(2)} /{' '}
                  {budget.amount.toFixed(2)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Recent Transactions</h2>
        {stats.monthTransactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No transactions this month</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.monthTransactions.slice(0, 10).map((transaction) => {
              const category = categories.find((c) => c.name === transaction.category);
              return (
                <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">{category?.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{transaction.category}</div>
                      <div className="text-xs text-muted-foreground">{transaction.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {transaction.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">{transaction.currency}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
