import AdminLoginPage from "@/components/admin/AdminLoginPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | ExpenseMate",
  description: "Secure administrative access for ExpenseMate management.",
};

export default function Page() {
  return <AdminLoginPage />;
}
