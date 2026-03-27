import React from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - ExpenseFlow',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
