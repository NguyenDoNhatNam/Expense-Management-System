'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import TransactionManager from './TransactionManager';
import BudgetManager from './BudgetManager';
import CategoryManager from './CategoryManager';
import ReportsExport from './ReportsExport';
import AuthForm from './AuthForm';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'categories' | 'reports' | 'settings';

export default function MainApp() {
  const { user } = useApp();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} isOpen={sidebarOpen} />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-secondary rounded-md transition-colors lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">ExpenseFlow</h1>
          <div className="w-8" />
        </div>
        <div className="p-6">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'transactions' && <TransactionManager />}
          {currentPage === 'budgets' && <BudgetManager />}
          {currentPage === 'categories' && <CategoryManager />}
          {currentPage === 'reports' && <ReportsExport />}
          {currentPage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

function SettingsPage() {
  const { user, setUser, currency, setCurrency, wallets, addWallet } = useApp();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');

  const handleAddWallet = () => {
    if (newWalletName.trim()) {
      addWallet({
        name: newWalletName,
        balance: 0,
        currency,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      });
      setNewWalletName('');
      setShowAddWallet(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('expenseapp_user');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card p-6 rounded-lg border border-border bg-card">
        <h2 className="text-xl font-bold mb-4">Account Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="p-3 bg-secondary rounded-md text-foreground">{user?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <div className="p-3 bg-secondary rounded-md text-foreground">{user?.name}</div>
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium mb-2">
              Default Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="VND">VND - Vietnamese Dong</option>
              <option value="CNY">CNY - Chinese Yuan</option>
            </select>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-destructive text-destructive-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="card p-6 rounded-lg border border-border bg-card">
        <h2 className="text-xl font-bold mb-4">Wallets / Accounts</h2>
        <div className="space-y-3 mb-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: wallet.color }}
                />
                <div>
                  <div className="font-medium">{wallet.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {wallet.currency} {wallet.balance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!showAddWallet ? (
          <button
            onClick={() => setShowAddWallet(true)}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Add Wallet
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              placeholder="Wallet name"
              className="w-full p-2 border border-border rounded-md bg-input text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddWallet}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Create
              </button>
              <button
                onClick={() => setShowAddWallet(false)}
                className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
