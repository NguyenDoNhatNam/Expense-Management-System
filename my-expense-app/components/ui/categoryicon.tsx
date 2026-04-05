"use client";

import {
  Baby,
  BriefcaseBusiness,
  CarFront,
  CircleHelp,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  ShoppingCart,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type CategoryIconKey =
  | "ShoppingCart"
  | "Utensils"
  | "Wallet"
  | "BriefcaseBusiness"
  | "Home"
  | "CarFront"
  | "HeartPulse"
  | "GraduationCap"
  | "Plane"
  | "Gamepad2"
  | "Gift"
  | "Baby"
  | "Other";

const ICON_MAP: Record<CategoryIconKey, LucideIcon> = {
  ShoppingCart,
  Utensils,
  Wallet,
  BriefcaseBusiness,
  Home,
  CarFront,
  HeartPulse,
  GraduationCap,
  Plane,
  Gamepad2,
  Gift,
  Baby,
  Other: CircleHelp,
};

export function CategoryIcon({
  iconName,
  className = "h-5 w-5",
  color,
}: {
  iconName: string;
  className?: string;
  color?: string;
}) {
  const Icon = ICON_MAP[iconName as CategoryIconKey] || CircleHelp;

  return <Icon className={className} style={color ? { color } : undefined} />;
}
