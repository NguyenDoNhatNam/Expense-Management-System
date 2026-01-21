'use client';

import { AppProvider } from '@/lib/context';
import MainApp from '@/components/MainApp';

export default function Home() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
