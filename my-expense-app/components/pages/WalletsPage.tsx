'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getApiErrorMessage } from '@/lib/api/auth';
import { useNotification } from '@/lib/notification';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'VND', 'CNY', 'AUD', 'CAD', 'SGD', 'HKD'];

// ✅ FORMAT HIỂN THỊ (1.000.000)
const formatAmount = (value: string) => {
  if (!value) return '';
  const raw = value.replace(/[^\d]/g, '');
  if (!raw) return '';
  return Number(raw).toLocaleString('vi-VN');
};

// ✅ LẤY GIÁ TRỊ THÔ (1000000)
const normalizeAmountInput = (value: string) => {
  return value.replace(/[^\d]/g, '');
};

export default function WalletsPage() {
  const { wallets, addWallet, updateWallet, deleteWallet, currentWallet, setCurrentWallet, currentUser } = useApp();
  const { showNotification } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    balance: '',
    description: '',
  });

  const handleAddWallet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.currency || !formData.balance) {
      showNotification('Please fill in all required fields.', 'warning');
      return;
    }

    if (!currentUser) {
      showNotification('You need to log in to manage wallets.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateWallet(editingId, {
          name: formData.name,
          currency: formData.currency,
          description: formData.description,
        });
        showNotification('Wallet updated successfully.', 'success');
      } else {
        await addWallet({
          name: formData.name,
          currency: formData.currency,
          balance: parseFloat(formData.balance), // ✅ vẫn là số
          description: formData.description,
          isDefault: wallets.length === 0,
          userId: currentUser.id,
        });
        showNotification('Wallet created successfully.', 'success');
      }

      setFormData({ name: '', currency: 'USD', balance: '', description: '' });
      setShowForm(false);
      setEditingId(null);
    } catch (error: unknown) {
      showNotification(getApiErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (wallet: any) => {
    setEditingId(wallet.id);
    setFormData({
      name: wallet.name,
      currency: wallet.currency,
      balance: String(wallet.balance ?? ''),
      description: wallet.description || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', currency: 'USD', balance: '', description: '' });
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (wallets.length <= 1) {
      showNotification('You cannot delete the last wallet.', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to delete this wallet?')) {
      return;
    }

    setDeletingWalletId(walletId);

    try {
      await deleteWallet(walletId);
      showNotification('Wallet deleted successfully.', 'success');
    } catch (error: unknown) {
      showNotification(getApiErrorMessage(error), 'error');
    } finally {
      setDeletingWalletId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Wallets</h2>
          <p className="text-muted-foreground mt-1">Manage your financial accounts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Wallet'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Wallet' : 'Add New Wallet'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update wallet information' : 'Create a new financial account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Wallet Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Initial Balance</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatAmount(formData.balance)}
                    onChange={(e) => {
                      const raw = normalizeAmountInput(e.target.value);
                      setFormData({ ...formData, balance: raw });
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : editingId ? 'Update Wallet' : 'Create Wallet'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {wallets.map((wallet) => (
          <Card key={wallet.id} onClick={() => setCurrentWallet(wallet)}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold">{wallet.name}</h3>
              <p className="text-sm text-muted-foreground">{wallet.currency}</p>

              <p className="text-3xl font-bold mt-4">
                {wallet.currency} {Number(wallet.balance).toLocaleString('vi-VN')}
              </p>

              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(wallet); }}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => { e.stopPropagation(); handleDeleteWallet(wallet.id); }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}