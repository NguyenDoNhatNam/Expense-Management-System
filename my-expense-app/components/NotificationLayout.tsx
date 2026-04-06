"use client";

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
    <NotificationProvider>
      <NotificationDisplay />
      {children}
    </NotificationProvider>
  );
}
