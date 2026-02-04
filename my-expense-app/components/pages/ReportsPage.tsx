'use client';

import React from "react"

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ReportsPage() {
  const { transactions, categories, currentWallet, getTotalIncome, getTotalExpense } = useApp();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  const filteredTransactions = transactions.filter(
    (t) => t.walletId === currentWallet?.id &&
      new Date(t.date) >= startDate &&
      new Date(t.date) <= endDate
  );

  const incomeTransactions = filteredTransactions.filter((t) => t.type === 'income');
  const expenseTransactions = filteredTransactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Category breakdown
  const expenseByCategory = expenseTransactions.reduce((acc: any, tx) => {
    const cat = categories.find((c) => c.id === tx.categoryId);
    if (!cat) return acc;
    acc[cat.name] = (acc[cat.name] || 0) + tx.amount;
    return acc;
  }, {});

  const categoryChartData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value: parseFloat((value as number).toFixed(2)),
  }));

  // Daily breakdown
  const dailyBreakdown: any = {};
  filteredTransactions.forEach((tx) => {
    const date = new Date(tx.date).toLocaleDateString();
    if (!dailyBreakdown[date]) {
      dailyBreakdown[date] = { date, income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      dailyBreakdown[date].income += tx.amount;
    } else {
      dailyBreakdown[date].expense += tx.amount;
    }
  });

  const dailyChartData = Object.values(dailyBreakdown)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item: any) => ({
      ...item,
      income: parseFloat(item.income.toFixed(2)),
      expense: parseFloat(item.expense.toFixed(2)),
    }));

  const exportToCSV = () => {
    let csv = 'Date,Category,Type,Amount,Description\n';
    filteredTransactions.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      csv += `"${new Date(tx.date).toLocaleDateString()}","${cat?.name || 'Unknown'}","${tx.type}","${tx.amount}","${tx.description}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${period}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const data = {
      period,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      summary: { totalIncome, totalExpense, netBalance },
      transactions: filteredTransactions,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${period}.json`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Financial Reports</h2>
        <p className="text-muted-foreground mt-1">Analyze your spending patterns</p>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={period}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="quarter">Last 90 Days</option>
          <option value="year">Last Year</option>
        </select>

        <div className="flex-1" />

        <Button onClick={exportToCSV} variant="outline">
          Export as CSV
        </Button>
        <Button onClick={exportToJSON} variant="outline">
          Export as JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Income</p>
            <p className="text-3xl font-bold text-success">
              {currentWallet?.currency || 'USD'} {totalIncome.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Expense</p>
            <p className="text-3xl font-bold text-destructive">
              {currentWallet?.currency || 'USD'} {totalExpense.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Net Balance</p>
            <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {currentWallet?.currency || 'USD'} {netBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Transactions</p>
            <p className="text-3xl font-bold">{filteredTransactions.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Income vs Expense</CardTitle>
            <CardDescription>Trend over {period}</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Expense" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
            <CardDescription>Distribution breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Summary</CardTitle>
          <CardDescription>Category breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryChartData.length > 0 ? (
              categoryChartData.map((item) => {
                const percentage = (item.value / totalExpense) * 100;
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm">
                        {currentWallet?.currency || 'USD'} {item.value.toFixed(2)} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No expense data in this period</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
