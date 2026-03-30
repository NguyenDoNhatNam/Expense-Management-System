'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import StatCard from '../StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import api from '@/lib/api/client';

interface DashboardData {
  overview: {
    income: number;
    expense: number;
    balance: number;
    changes: {
      income_percentage: number;
      expense_percentage: number;
    };
  };
  categories: {
    income: Array<{ name: string; color: string; value: number; percentage: number }>;
    expense: Array<{ name: string; color: string; value: number; percentage: number }>;
  };
  trends: Array<{ date: string; income: number; expense: number }>;
  metadata: {
    cached: boolean;
    generated_at: string;
  };
}

export default function DashboardPage() {
  const { currentWallet, categories, budgets, transactions } = useApp();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    overview: {
      income: 0,
      expense: 0,
      balance: 0,
      changes: {
        income_percentage: 0,
        expense_percentage: 0
      }
    },
    categories: {
      income: [],
      expense: []
    },
    trends: [],
    metadata: {
      cached: false,
      generated_at: new Date().toISOString()
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [keyword, setKeyword] = useState('');

  const fetchDashboardData = async (isRetry = false) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    
    if (!token) {
      setHasToken(false);
      return; // Don't fetch if no token
    }
    
    setHasToken(true);
    if (!currentWallet) return; // Wait for wallet to be loaded
    
    if (!isRetry) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (keyword) params.append('keyword', keyword);

      console.log('Fetching dashboard data...', { startDate, endDate, keyword });
      const response = await api.get(`/reports/dashboard/?${params.toString()}`);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || 'API returned error');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      
      // Keep existing data on error, just show error message
      if (error.code === 'ECONNABORTED') {
        setError('Request timeout. Please check your connection.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.');
        setHasToken(false);
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const newHasToken = !!token;
    
    if (newHasToken !== hasToken) {
      setHasToken(newHasToken);
      if (newHasToken && currentWallet) {
        fetchDashboardData();
      }
    }
  }, [currentWallet]);

  useEffect(() => {
    if (hasToken && currentWallet) {
      fetchDashboardData();
    }
  }, [startDate, endDate, keyword]);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();

    if (period === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (period === 'quarter') {
      start.setMonth(now.getMonth() - 3);
    } else if (period === 'year') {
      start.setFullYear(now.getFullYear() - 1);
    }

    return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  };

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'quarter' | 'year') => {
    setPeriod(newPeriod);
    const { start, end } = getDateRange();
    setStartDate(start);
    setEndDate(end);
  };

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

  const exportToCSV = () => {
    if (!dashboardData) return;
    let csv = 'Date,Income,Expense\n';
    dashboardData.trends.forEach((item) => {
      csv += `"${item.date}","${item.income}","${item.expense}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${period}.csv`;
    a.click();
  };

  if (!hasToken) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Please login to view your financial data</p>
          </div>
        </div>
        
        {/* Show empty dashboard layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Income" value="$0.00" icon="💚" color="bg-success/10" />
          <StatCard title="Total Expense" value="$0.00" icon="❤️" color="bg-destructive/10" />
          <StatCard title="Balance" value="$0.00" icon="💰" color="bg-primary/10" />
          <StatCard title="Current Wallet" value="N/A" icon="👛" color="bg-accent/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Income Breakdown</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Status</CardTitle>
              <CardDescription>Category limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">No budgets set</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense Trends</CardTitle>
            <CardDescription>Daily breakdown over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg">Loading dashboard...</div>
          <div className="text-sm text-muted-foreground mt-2">Fetching your financial data</div>
        </div>
      </div>
    );
  }

  const { overview, categories: categoryData, trends } = dashboardData;

  return (
    <div className="p-6 space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <div className="text-sm">Refreshing data...</div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-700">{error}</div>
            <Button size="sm" variant="outline" onClick={() => fetchDashboardData(true)} disabled={loading}>
              Retry
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of your financial data</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => fetchDashboardData(true)} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
            placeholder="End Date"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
            placeholder="Search keyword"
          />
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
          <Button onClick={exportToCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={`${currentWallet?.currency || 'USD'} ${overview.income.toFixed(2)}`}
          icon="💚"
          color="bg-success/10"
          change={overview.changes.income_percentage}
        />
        <StatCard
          title="Total Expense"
          value={`${currentWallet?.currency || 'USD'} ${overview.expense.toFixed(2)}`}
          icon="❤️"
          color="bg-destructive/10"
          change={overview.changes.expense_percentage}
        />
        <StatCard
          title="Balance"
          value={`${currentWallet?.currency || 'USD'} ${overview.balance.toFixed(2)}`}
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
        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.income.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.income}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.income.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${currentWallet?.currency || 'USD'} ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No income data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.expense.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.expense}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.expense.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${currentWallet?.currency || 'USD'} ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No expense data
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

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense Trends</CardTitle>
          <CardDescription>Daily breakdown over time</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${currentWallet?.currency || 'USD'} ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

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