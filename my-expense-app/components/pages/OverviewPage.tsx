'use client';

import { useApp } from '@/lib/AppContext';
import StatCard from '../StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function OverviewPage() {
  const { currentWallet, transactions, categories, budgets, getTotalIncome, getTotalExpense, getExpenseByCategory, wallets } = useApp();

  const totalIncome = getTotalIncome();
  const totalExpense = getTotalExpense();
  const balance = totalIncome - totalExpense;

  const expenseByCategory = getExpenseByCategory();
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));

  const COLORS = [
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#06b6d4',
    '#14b8a6',
  ];

  const recentTransactions = transactions.slice(-5).reverse();

  const budgetStatus = budgets.map((budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    const percentage = (budget.spent / budget.limit) * 100;
    return {
      id: budget.id,
      category: category?.name || 'Unknown',
      spent: budget.spent,
      limit: budget.limit,
      percentage: Math.min(percentage, 100),
      isOver: budget.spent > budget.limit,
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={`${currentWallet?.currency || 'USD'} ${totalIncome.toFixed(2)}`}
          icon="💚"
          color="bg-success/10"
        />
        <StatCard
          title="Total Expense"
          value={`${currentWallet?.currency || 'USD'} ${totalExpense.toFixed(2)}`}
          icon="❤️"
          color="bg-destructive/10"
        />
        <StatCard
          title="Balance"
          value={`${currentWallet?.currency || 'USD'} ${balance.toFixed(2)}`}
          icon="💰"
          color="bg-primary/10"
        />
        <StatCard
          title="Current Wallet"
          value={currentWallet?.name || 'N/A'}
          icon="👛"
          color="bg-accent/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense by Category Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${currentWallet?.currency || 'USD'} ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Alert */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Status</CardTitle>
            <CardDescription>Category limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetStatus.length > 0 ? (
              budgetStatus.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{budget.category}</span>
                    <span className={`text-xs ${budget.isOver ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {budget.spent.toFixed(2)} / {budget.limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${budget.isOver ? 'bg-destructive' : 'bg-success'}`}
                      style={{ width: `${budget.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No budgets set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => {
                const category = categories.find((c) => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category?.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{category?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'income' ? '+' : '-'} {currentWallet?.currency || 'USD'} {tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
