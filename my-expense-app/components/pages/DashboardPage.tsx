"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/AppContext";
import StatCard from "../StatCard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import api from "@/lib/api/client";
import {
  BackendTransaction,
  listTransactionsApi,
} from "@/lib/api/transactions";
import { CategoryIcon } from "../ui/categoryicon";

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
    income: Array<{
      name: string;
      color: string;
      value: number;
      percentage: number;
    }>;
    expense: Array<{
      name: string;
      color: string;
      value: number;
      percentage: number;
    }>;
  };
  trends: Array<{ date: string; income: number; expense: number }>;
  metadata: {
    cached: boolean;
    generated_at: string;
  };
}

const FALLBACK_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#f97316",
];

const renderCustomizedPieLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}: any) => {
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

const formatAmount = (value?: number | string) => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("vi-VN");
};

const formatMoney = (currency: string, value: number | string) => {
  return `${formatAmount(value)} ${currency}`;
};

function getDateRangeForPeriod(
  period: "week" | "month" | "quarter" | "year",
) {
  const now = new Date();
  const start = new Date();

  if (period === "week") start.setDate(now.getDate() - 7);
  else if (period === "month") start.setMonth(now.getMonth() - 1);
  else if (period === "quarter") start.setMonth(now.getMonth() - 3);
  else if (period === "year") start.setFullYear(now.getFullYear() - 1);

  return {
    start: start.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
  };
}

export default function DashboardPage() {
  const { currentWallet, categories, budgets } = useApp();
  const [recentTransactions, setRecentTransactions] = useState<
    BackendTransaction[]
  >([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">(
    "month",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keyword, setKeyword] = useState("");

  const fetchDashboardData = useCallback(
    async (isRetry = false) => {
      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!token) {
        setLoading(false);
        return;
      }

      if (!isRetry) {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams();
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
        if (keyword) params.append("keyword", keyword);

        const dashboardPromise = api.get(
          `/reports/dashboard/?${params.toString()}`,
        );

        const txPromise = listTransactionsApi({
          account_id: currentWallet?.id || undefined,
          sort_by: "newest",
        });

        const [dashboardResponse, recentTxResponse] = await Promise.all([
          dashboardPromise,
          txPromise.catch(() => ({ success: false, data: [] as BackendTransaction[] })),
        ]);

        if (dashboardResponse.data.success) {
          setDashboardData(dashboardResponse.data.data);
          setError(null);
        } else {
          throw new Error(
            dashboardResponse.data.message || "API returned error",
          );
        }

        if (recentTxResponse.success) {
          setRecentTransactions(
            (recentTxResponse.data || []).slice(0, 5),
          );
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);

        if (err.code === "ECONNABORTED") {
          setError("Connection timed out. Please check your network.");
        } else if (err.response?.status === 401) {
          setError("Session expired. Please log in again.");
        } else if (err.response?.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError("Unable to load data. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, keyword, currentWallet?.id],
  );

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePeriodChange = (
    newPeriod: "week" | "month" | "quarter" | "year",
  ) => {
    setPeriod(newPeriod);
    const { start, end } = getDateRangeForPeriod(newPeriod);
    setStartDate(start);
    setEndDate(end);
  };

  const budgetStatus = budgets.map((budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    const limit = budget.limit || 0;
    const percentage = limit > 0 ? (budget.spent / limit) * 100 : 0;
    return {
      id: budget.id,
      category: category?.name || "Unknown",
      spent: budget.spent,
      limit,
      percentage: Math.min(percentage, 100),
      isOver: budget.spent > limit,
    };
  });

  const exportToCSV = () => {
    if (!dashboardData) return;
    let csv = "Date,Income,Expense\n";
    dashboardData.trends.forEach((item) => {
      csv += `"${item.date}","${item.income}","${item.expense}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${period}.csv`;
    a.click();
  };

  const hasToken = !!(
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );

  // ===== NOT LOGGED IN =====
  if (!hasToken) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Overview</h2>
          <p className="text-muted-foreground mt-1">
            Please log in to view your financial data
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Income" value="0 VND" icon="💚" color="bg-success/10" />
          <StatCard title="Expense" value="0 VND" icon="❤️" color="bg-destructive/10" />
          <StatCard title="Balance" value="0 VND" icon="💰" color="bg-primary/10" />
          <StatCard title="Current Wallet" value="N/A" icon="👛" color="bg-accent/10" />
        </div>
      </div>
    );
  }

  // ===== LOADING =====
  if (loading && !dashboardData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <div className="text-lg">Loading data...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Fetching your financial data
          </div>
        </div>
      </div>
    );
  }

  const overview = dashboardData?.overview ?? {
    income: 0,
    expense: 0,
    balance: 0,
    changes: { income_percentage: 0, expense_percentage: 0 },
  };
  const categoryData = dashboardData?.categories ?? {
    income: [],
    expense: [],
  };
  const trends = dashboardData?.trends ?? [];
  const currency = currentWallet?.currency || "VND";

  return (
    <div className="p-6 space-y-6 relative">
      {/* Loading overlay */}
      {loading && dashboardData && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <div className="text-sm">Updating...</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-700">{error}</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchDashboardData(true)}
              disabled={loading}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* HEADER + FILTERS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Overview</h2>
            <p className="text-muted-foreground mt-1">
              Your financial data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchDashboardData(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? "Loading..." : "🔄 Refresh"}
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              📥 Export CSV
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {(["week", "month", "quarter", "year"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => handlePeriodChange(p)}
                className="text-xs"
              >
                {p === "week"
                  ? "7 days"
                  : p === "month"
                    ? "30 days"
                    : p === "quarter"
                      ? "90 days"
                      : "1 year"}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 border rounded-lg bg-background text-sm"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 border rounded-lg bg-background text-sm"
            />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-1.5 border rounded-lg bg-background text-sm"
            placeholder="🔍 Search..."
          />
          {(startDate || endDate || keyword) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setKeyword("");
              }}
              className="text-xs text-muted-foreground"
            >
              ✕ Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Income"
          value={formatMoney(currency, overview.income)}
          icon="💚"
          color="bg-success/10"
          change={overview.changes.income_percentage}
        />
        <StatCard
          title="Expense"
          value={formatMoney(currency, overview.expense)}
          icon="❤️"
          color="bg-destructive/10"
          change={overview.changes.expense_percentage}
        />
        <StatCard
          title="Balance"
          value={formatMoney(currency, overview.balance)}
          icon="💰"
          color="bg-primary/10"
        />
        <StatCard
          title="Current Wallet"
          value={currentWallet?.name || "No wallet selected"}
          icon="👛"
          color="bg-accent/10"
        />
      </div>

      {/* PIE CHARTS + BUDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income by Category</CardTitle>
            <CardDescription>Category breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.income.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData.income}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.income.map((entry, index) => (
                        <Cell
                          key={`income-${index}`}
                          fill={
                            entry.color ||
                            FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) =>
                        formatMoney(currency, value)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {categoryData.income.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              item.color ||
                              FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatAmount(item.value)} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <span className="text-4xl mb-2">📊</span>
                <span className="text-sm">No income data yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense by Category</CardTitle>
            <CardDescription>Category breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.expense.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData.expense}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.expense.map((entry, index) => (
                        <Cell
                          key={`expense-${index}`}
                          fill={
                            entry.color ||
                            FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) =>
                        formatMoney(currency, value)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {categoryData.expense.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              item.color ||
                              FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatAmount(item.value)} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <span className="text-4xl mb-2">📊</span>
                <span className="text-sm">No expense data yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget</CardTitle>
            <CardDescription>By category limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetStatus.length > 0 ? (
              budgetStatus.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {budget.category}
                    </span>
                    <span
                      className={`text-xs ${budget.isOver ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {formatAmount(budget.spent)} /{" "}
                      {formatAmount(budget.limit)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${budget.isOver ? "bg-destructive" : "bg-success"}`}
                      style={{ width: `${budget.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <span className="text-4xl mb-2">📋</span>
                <span className="text-sm">No budget set</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TRENDS CHART */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income & Expense Over Time</CardTitle>
          <CardDescription>Daily trend</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: any) => formatMoney(currency, value)}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("vi-VN")
                  }
                />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="#10b981"
                  name="Income"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  name="Expense"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">📈</span>
              <span className="text-sm">No trend data yet</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RECENT TRANSACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>Latest activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      iconName={tx.category_icon || "Other"}
                      color={tx.category_color}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {tx.category_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || tx.note || ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.transaction_type === "income"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}{" "}
                      {formatMoney(currency, tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString(
                        "vi-VN",
                      )}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <span className="text-4xl mb-2">📝</span>
                <span className="text-sm">No transactions yet</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
