import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Receipt,
  Boxes,
  BarChart3,
  Bell,
  UserSearch,
  Calculator,
  IdCard,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
}

// Job Cards nav tab is temporarily hidden — re-add the entry below to restore it:
// { href: "/jobs", label: "Job Cards", icon: Wrench },
export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/diary", label: "Bookings", icon: CalendarDays },
  { href: "/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reminders", label: "Reminders", icon: Bell, section: "Customers" },
  { href: "/customer-intelligence", label: "Customer Intelligence", icon: UserSearch, section: "Customers" },
  { href: "/reports", label: "Business Analytics", icon: BarChart3, section: "Business" },
  { href: "/accounting", label: "Accounting", icon: Calculator, section: "Business" },
  { href: "/employees", label: "Employees", icon: IdCard, section: "Business" },
  { href: "/settings", label: "Settings", icon: Settings, section: "System" },
  { href: "/help", label: "Help", icon: HelpCircle, section: "System" },
];

export interface NavGroup {
  section?: string;
  items: NavItem[];
}

export function groupedNavItems(): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of navItems) {
    const last = groups.at(-1);
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}
