'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getApiErrorMessage } from '@/lib/api/auth';
import { useNotification } from '@/lib/notification';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'VND', 'CNY', 'AUD', 'CAD', 'SGD', 'HKD'];

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
      showNotification('Vui lòng điền đầy đủ các trường bắt buộc.', 'warning');
      return;
    }

    if (!currentUser) {
      showNotification('Bạn cần đăng nhập để thao tác ví.', 'error');
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
        showNotification('Cập nhật ví thành công.', 'success');
      } else {
        await addWallet({
          name: formData.name,
          currency: formData.currency,
          balance: parseFloat(formData.balance),
          description: formData.description,
          isDefault: wallets.length === 0,
          userId: currentUser.id,
        });
        showNotification('Tạo ví thành công.', 'success');
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
      balance: wallet.balance.toString(),
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
      showNotification('Không thể xóa ví cuối cùng.', 'warning');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa ví này không?')) {
      return;
    }

    setDeletingWalletId(walletId);

    try {
      await deleteWallet(walletId);
      showNotification('Xóa ví thành công.', 'success');
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
            <CardTitle>Add New Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Wallet Name</label>
                <Input
                  placeholder="e.g., Checking Account"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Initial Balance</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.balance}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, balance: e.target.value })}
                      required
                    />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="Add notes about this wallet..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xử lý...' : editingId ? 'Cập nhật ví' : 'Tạo ví'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.length > 0 ? (
          wallets.map((wallet) => (
            <Card
              key={wallet.id}
              className={`cursor-pointer transition ${currentWallet?.id === wallet.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setCurrentWallet(wallet)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">{wallet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {wallet.currency}
                      {wallet.isDefault && ' • Default'}
                    </p>
                  </div>
                  <span className="text-3xl">👛</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Balance</p>
                    <p className="text-3xl font-bold">
                      {wallet.currency} {wallet.balance.toFixed(2)}
                    </p>
                  </div>

                  {wallet.description && (
                    <p className="text-sm text-muted-foreground">{wallet.description}</p>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(wallet);
                      }}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDeleteWallet(wallet.id);
                      }}
                      disabled={deletingWalletId === wallet.id}
                      className="flex-1"
                    >
                      {deletingWalletId === wallet.id ? 'Đang xóa...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No wallets yet. Create one to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
