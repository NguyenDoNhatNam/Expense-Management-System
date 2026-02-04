'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import Sidebar from '@/components/Sidebar';
import OverviewPage from '@/components/pages/OverviewPage';
import TransactionsPage from '@/components/pages/TransactionsPage';
import BudgetsPage from '@/components/pages/BudgetsPage';
import WalletsPage from '@/components/pages/WalletsPage';
import SavingsPage from '@/components/pages/SavingsPage';
import DebtsPage from '@/components/pages/DebtsPage';
import ReportsPage from '@/components/pages/ReportsPage';
import SettingsPage from '@/components/pages/SettingsPage';

type Page = 'overview' | 'transactions' | 'budgets' | 'wallets' | 'savings' | 'debts' | 'reports' | 'settings';

export default function Dashboard() {
  const { logout } = useApp();
  const [currentPage, setCurrentPage] = useState<Page>('overview');

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'wallets':
        return <WalletsPage />;
      case 'savings':
        return <SavingsPage />;
      case 'debts':
        return <DebtsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ExpenseFlow</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
