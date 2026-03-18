"use client";

import { AppProvider } from "@/lib/AppContext";
import {
  NotificationProvider,
  NotificationContainer,
  useNotification,
} from "@/lib/notification";

function NotificationDisplay() {
  const { notifications } = useNotification();
  return <NotificationContainer notifications={notifications} />;
}

export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <NotificationProvider>
        <NotificationDisplay />
        {children}
      </NotificationProvider>
    </AppProvider>
  );
}