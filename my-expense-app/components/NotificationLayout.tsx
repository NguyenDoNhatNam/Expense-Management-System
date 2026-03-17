// components/NotificationLayout.tsx
"use client";

import React from "react";
import { AppProvider } from "@/lib/AppContext";
import { NotificationProvider, NotificationContainer, useNotification } from "@/lib/notification";

export default function NotificationLayout({ children }: { children: React.ReactNode }) {
  const { notifications } = useNotification();

  return (
    <AppProvider>
      <NotificationProvider>
        <NotificationContainer notifications={notifications} />
        {children}
      </NotificationProvider>
    </AppProvider>
  );
}