'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/context';

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';

export default function ReportsExport() {
  const { transactions, categories, selectedWallet, currency } = useApp();
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const periodTransactions = transactions.filter(
      (t) =>
        new Date(t.date) >= startDate &&
        (!t.walletId || t.walletId === selectedWallet?.id)
    );

    const totalIncome = periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce(
        (acc, t) => {
          const existing = acc.find((item) => item.category === t.category);
          if (existing) {
            existing.amount += t.amount;
            existing.count += 1;
          } else {
            acc.push({ category: t.category, amount: t.amount, count: 1 });
          }
          return acc;
        },
        [] as Array<{ category: string; amount: number; count: number }>
      )
      .sort((a, b) => b.amount - a.amount);

    const incomeByCategory = periodTransactions
      .filter((t) => t.type === 'income')
      .reduce(
        (acc, t) => {
          const existing = acc.find((item) => item.category === t.category);
          if (existing) {
            existing.amount += t.amount;
            existing.count += 1;
          } else {
            acc.push({ category: t.category, amount: t.amount, count: 1 });
          }
          return acc;
        },
        [] as Array<{ category: string; amount: number; count: number }>
      )
      .sort((a, b) => b.amount - a.amount);

    const dailyTotals: Record<string, { income: number; expense: number }> = {};
    periodTransactions.forEach((t) => {
      if (!dailyTotals[t.date]) {
        dailyTotals[t.date] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        dailyTotals[t.date].income += t.amount;
      } else {
        dailyTotals[t.date].expense += t.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expensesByCategory,
      incomeByCategory,
      dailyTotals,
      transactionCount: periodTransactions.length,
    };
  }, [transactions, period, selectedWallet]);

  const handleExportCSV = () => {
    const walletTransactions = transactions.filter(
      (t) => !t.walletId || t.walletId === selectedWallet?.id
    );

    const csvContent = [
      ['Date', 'Category', 'Type', 'Amount', 'Description'],
      ...walletTransactions.map((t) => [
        t.date,
        t.category,
        t.type,
        t.amount.toFixed(2),
        t.description,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const walletTransactions = transactions.filter(
      (t) => !t.walletId || t.walletId === selectedWallet?.id
    );

    const jsonData = {
      exportDate: new Date().toISOString(),
      wallet: selectedWallet,
      summary: {
        totalTransactions: walletTransactions.length,
        totalIncome: reportData.totalIncome,
        totalExpense: reportData.totalExpense,
        balance: reportData.balance,
      },
      transactions: walletTransactions,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Export</h1>
      </div>

      {/* Period Selection */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Report Period</h2>
        <div className="flex flex-wrap gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Last {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Total Income</p>
          <p className="text-2xl font-bold text-success">{reportData.totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground mb-1">Total Expense</p>
          <p className="text-2xl font-bold text-destructive">{reportData.totalExpense.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${reportData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {reportData.balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-accent">
          <p className="text-sm text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-bold">{reportData.transactionCount}</p>
        </div>
      </div>

      {/* Expense Breakdown */}
      {reportData.expensesByCategory.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Top Expense Categories</h2>
          <div className="space-y-3">
            {reportData.expensesByCategory.slice(0, 10).map((item, index) => {
              const category = categories.find((c) => c.name === item.category);
              const percentage = (item.amount / reportData.totalExpense) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{category?.icon}</span>
                      <span className="font-medium">{item.category}</span>
                      <span className="text-xs text-muted-foreground">({item.count} transactions)</span>
                    </div>
                    <span className="font-bold">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currency} {item.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Breakdown */}
      {reportData.incomeByCategory.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Income Sources</h2>
          <div className="space-y-3">
            {reportData.incomeByCategory.map((item, index) => {
              const category = categories.find((c) => c.name === item.category);
              const percentage = (item.amount / reportData.totalIncome) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{category?.icon}</span>
                      <span className="font-medium">{item.category}</span>
                      <span className="text-xs text-muted-foreground">({item.count} transactions)</span>
                    </div>
                    <span className="font-bold">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-success"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currency} {item.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Export Data</h2>
        <p className="text-muted-foreground mb-4">
          Download your transaction data for analysis or backup purposes
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            📊 Export as CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 py-2 px-4 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            📄 Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
}
