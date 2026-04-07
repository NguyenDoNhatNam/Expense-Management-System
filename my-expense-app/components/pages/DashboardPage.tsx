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
          setError("Kết nối bị timeout. Vui lòng kiểm tra lại mạng.");
        } else if (err.response?.status === 401) {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (err.response?.status >= 500) {
          setError("Lỗi server. Vui lòng thử lại sau.");
        } else {
          setError("Không thể tải dữ liệu. Vui lòng thử lại.");
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
      category: category?.name || "Không xác định",
      spent: budget.spent,
      limit,
      percentage: Math.min(percentage, 100),
      isOver: budget.spent > limit,
    };
  });

  const exportToCSV = () => {
    if (!dashboardData) return;
    let csv = "Ngày,Thu nhập,Chi tiêu\n";
    dashboardData.trends.forEach((item) => {
      csv += `"${item.date}","${item.income}","${item.expense}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-${period}.csv`;
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
          <h2 className="text-3xl font-bold">Tổng quan</h2>
          <p className="text-muted-foreground mt-1">
            Vui lòng đăng nhập để xem dữ liệu tài chính
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Thu nhập" value="0 VND" icon="💚" color="bg-success/10" />
          <StatCard title="Chi tiêu" value="0 VND" icon="❤️" color="bg-destructive/10" />
          <StatCard title="Số dư" value="0 VND" icon="💰" color="bg-primary/10" />
          <StatCard title="Ví hiện tại" value="N/A" icon="👛" color="bg-accent/10" />
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
          <div className="text-lg">Đang tải dữ liệu...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Đang lấy dữ liệu tài chính của bạn
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
            <div className="text-sm">Đang cập nhật...</div>
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
              Thử lại
            </Button>
          </div>
        </div>
      )}

      {/* HEADER + FILTERS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Tổng quan</h2>
            <p className="text-muted-foreground mt-1">
              Dữ liệu tài chính của bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchDashboardData(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? "Đang tải..." : "🔄 Làm mới"}
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              📥 Xuất CSV
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
                  ? "7 ngày"
                  : p === "month"
                    ? "30 ngày"
                    : p === "quarter"
                      ? "90 ngày"
                      : "1 năm"}
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
            placeholder="🔍 Tìm kiếm..."
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
              ✕ Xoá bộ lọc
            </Button>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Thu nhập"
          value={formatMoney(currency, overview.income)}
          icon="💚"
          color="bg-success/10"
          change={overview.changes.income_percentage}
        />
        <StatCard
          title="Chi tiêu"
          value={formatMoney(currency, overview.expense)}
          icon="❤️"
          color="bg-destructive/10"
          change={overview.changes.expense_percentage}
        />
        <StatCard
          title="Số dư"
          value={formatMoney(currency, overview.balance)}
          icon="💰"
          color="bg-primary/10"
        />
        <StatCard
          title="Ví hiện tại"
          value={currentWallet?.name || "Chưa chọn ví"}
          icon="👛"
          color="bg-accent/10"
        />
      </div>

      {/* PIE CHARTS + BUDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thu nhập theo danh mục</CardTitle>
            <CardDescription>Phân bổ theo danh mục</CardDescription>
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
                <span className="text-sm">Chưa có dữ liệu thu nhập</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiêu theo danh mục</CardTitle>
            <CardDescription>Phân bổ theo danh mục</CardDescription>
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
                <span className="text-sm">Chưa có dữ liệu chi tiêu</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ngân sách</CardTitle>
            <CardDescription>Theo hạn mức danh mục</CardDescription>
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
                <span className="text-sm">Chưa đặt ngân sách</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TRENDS CHART */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thu nhập & Chi tiêu theo thời gian</CardTitle>
          <CardDescription>Biến động theo ngày</CardDescription>
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
                  name="Thu nhập"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  name="Chi tiêu"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">📈</span>
              <span className="text-sm">Chưa có dữ liệu biến động</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RECENT TRANSACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
          <CardDescription>Hoạt động mới nhất</CardDescription>
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
                        {tx.category_name || "Không xác định"}
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
                <span className="text-sm">Chưa có giao dịch nào</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
