'use client';

import React, { useState } from 'react';
import UsersTable from './UsersTable';
import { useApp } from '@/lib/AppContext';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  walletsCount: number;
  budgetsCount: number;
  transactionsCount: number;
}

const MOCK_USERS_DATA: AdminUser[] = [
  {
    id: 'u1', name: 'John Doe', email: 'john@example.com', avatar: 'JD',
    joinDate: 'Oct 12, 2023', walletsCount: 2, budgetsCount: 3, transactionsCount: 145
  },
  {
    id: 'u2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'JS',
    joinDate: 'Nov 05, 2023', walletsCount: 1, budgetsCount: 1, transactionsCount: 32
  },
  {
    id: 'u3', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'AJ',
    joinDate: 'Jan 15, 2024', walletsCount: 3, budgetsCount: 5, transactionsCount: 310
  },
  {
    id: 'u4', name: 'Bob Brown', email: 'bob@example.com', avatar: 'BB',
    joinDate: 'Feb 20, 2024', walletsCount: 1, budgetsCount: 0, transactionsCount: 5
  },
  {
    id: 'u5', name: 'Charlie Davis', email: 'charlie@example.com', avatar: 'CD',
    joinDate: 'Mar 01, 2024', walletsCount: 2, budgetsCount: 2, transactionsCount: 88
  }
];

export default function AdminDashboard() {
  const { logout } = useApp();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]); // Initially empty
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleLoadMockData = () => {
    setUsers(MOCK_USERS_DATA);
    setIsDataLoaded(true);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const totalTransactions = users.reduce((sum, u) => sum + u.transactionsCount, 0);
  const totalWallets = users.reduce((sum, u) => sum + u.walletsCount, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold tracking-tight">E</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">ExpenseFlow</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Manage users and view application statistics</p>
          </div>
          {!isDataLoaded && (
            <button
              onClick={handleLoadMockData}
              className="text-sm font-medium bg-[#3b82f6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm shadow-blue-200 transition-all self-start sm:self-auto"
            >
              Load Demo Data
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Users" value={users.length.toString()} subtitle="Registered accounts" />
          <StatCard title="Total Transactions" value={totalTransactions.toString()} subtitle="Across all users" />
          <StatCard title="Total Wallets" value={totalWallets.toString()} subtitle="Active accounts" />
        </div>

        {/* Users Table Container */}
        <UsersTable users={users} onDeleteUser={handleDeleteUser} />
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[140px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-gray-900 tracking-tight group-hover:text-[#3b82f6] transition-colors">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
