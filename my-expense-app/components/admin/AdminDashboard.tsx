'use client';

import React, { useState, useEffect } from 'react';
import UsersTable from './UsersTable';
import { useRouter } from 'next/navigation';
import { Terminal, LogOut, RefreshCw, Users, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { getAdminUsersApi, deleteAdminUserApi, getAdminStatsApi, toggleUserStatusApi } from '@/lib/api/users';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  walletsCount: number;
  budgetsCount: number;
  transactionsCount: number;
  isActive: boolean;
  role: string;
}

interface CurrentAdminUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalTransactions: number;
  transactionsThisMonth: number;
  totalWallets: number;
  totalBudgets: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdminUser | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load admin user from localStorage on mount
  useEffect(() => {
    const adminUserStr = localStorage.getItem('admin_user');
    const accessToken = localStorage.getItem('access_token');

    if (!adminUserStr || !accessToken) {
      router.replace('/admin/login');
      return;
    }

    if (adminUserStr) {
      try {
        setCurrentAdmin(JSON.parse(adminUserStr));
      } catch {
        // Invalid data, redirect to login
        localStorage.removeItem('admin_user');
        localStorage.removeItem('access_token');
        document.cookie = 'admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.replace('/admin/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (currentAdmin) {
      loadData();
    }
  }, [currentAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load users and stats in parallel
      const [usersResponse, statsResponse] = await Promise.all([
        getAdminUsersApi(),
        getAdminStatsApi()
      ]);
      
      // Map users data
      const mappedUsers = usersResponse.data.map((u) => ({
        id: u.user_id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.full_name ? u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
        joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A',
        walletsCount: u.wallets_count || 0,
        budgetsCount: u.budgets_count || 0,
        transactionsCount: u.transactions_count || 0,
        isActive: u.is_active,
        role: u.role || 'user',
      }));
      setUsers(mappedUsers);
      
      // Map stats data
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalUsers: statsResponse.data.users.total,
          activeUsers: statsResponse.data.users.active,
          newUsersThisMonth: statsResponse.data.users.new_this_month,
          totalTransactions: statsResponse.data.transactions.total,
          transactionsThisMonth: statsResponse.data.transactions.this_month,
          totalWallets: statsResponse.data.wallets.total,
          totalBudgets: statsResponse.data.budgets.total,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear admin-specific data
    localStorage.removeItem('admin_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear admin cookie
    document.cookie = 'admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Redirect to admin login
    router.push('/admin/login');
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteAdminUserApi(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      // Reload stats
      const statsResponse = await getAdminStatsApi();
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalUsers: statsResponse.data.users.total,
          activeUsers: statsResponse.data.users.active,
          newUsersThisMonth: statsResponse.data.users.new_this_month,
          totalTransactions: statsResponse.data.transactions.total,
          transactionsThisMonth: statsResponse.data.transactions.this_month,
          totalWallets: statsResponse.data.wallets.total,
          totalBudgets: statsResponse.data.budgets.total,
        });
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Có lỗi xảy ra khi xóa người dùng trên Server. Vui lòng thử lại.');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const response = await toggleUserStatusApi(id);
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u.id === id ? { ...u, isActive: response.data.is_active } : u
        ));
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      alert('Có lỗi xảy ra khi thay đổi trạng thái người dùng.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ExpenseMate Logo" className="h-10 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">ExpenseMate</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Admin Info */}
          {currentAdmin && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                {currentAdmin.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD'}
              </div>
              <div className="hidden sm:block">
                <p className="font-medium text-gray-900">{currentAdmin.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentAdmin.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <div className="w-px h-8 bg-gray-200" />
          <button
            onClick={() => router.push('/admin/activity-log')}
            className="flex items-center gap-2 text-sm font-semibold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Terminal className="w-4 h-4" />
            Activity Log
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Manage users and view application statistics</p>
          </div>
          
          <div className="flex items-center gap-2">
            {error && <span className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">{error}</span>}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`flex items-center gap-2 text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Tổng người dùng" 
            value={stats?.totalUsers?.toString() || users.length.toString()} 
            subtitle={`${stats?.activeUsers || 0} đang hoạt động`}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard 
            title="Người dùng mới" 
            value={stats?.newUsersThisMonth?.toString() || '0'} 
            subtitle="Trong tháng này"
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
          />
          <StatCard 
            title="Tổng giao dịch" 
            value={stats?.totalTransactions?.toString() || '0'} 
            subtitle={`${stats?.transactionsThisMonth || 0} trong tháng`}
            icon={<Receipt className="w-5 h-5" />}
            color="purple"
          />
          <StatCard 
            title="Tổng ví" 
            value={stats?.totalWallets?.toString() || '0'} 
            subtitle={`${stats?.totalBudgets || 0} ngân sách`}
            icon={<CreditCard className="w-5 h-5" />}
            color="orange"
          />
        </div>

        {/* Users Table Container */}
        <UsersTable 
          users={users} 
          onDeleteUser={handleDeleteUser}
          onToggleStatus={handleToggleUserStatus}
        />
      </main>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-[#3b82f6] transition-colors">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
