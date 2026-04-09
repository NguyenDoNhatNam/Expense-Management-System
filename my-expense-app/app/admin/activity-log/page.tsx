import React from 'react';
import ActivityLogPage from '@/components/admin/ActivityLogPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Log - Admin Terminal',
  description: 'Real-time user activity monitoring terminal',
};

export default function AdminActivityLogRoute() {
  return <ActivityLogPage />;
}
