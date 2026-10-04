import {
  Wrench,
  LayoutDashboard,
  Users,
  CalendarDays,
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
  permissions?: string[];
}

export const navItems: NavItem[] = [
  {href:"/jobs",label:"Job Cards",icon:Wrench,permissions:["jobs.manage","jobs.view","jobs.update"]},
  { href: "/", permissions: ["dashboard.view"], label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", permissions: ["customers.manage", "customers.view"], label: "Customers", icon: Users },
  { href: "/diary", permissions: ["bookings.manage", "bookings.view"], label: "Bookings", icon: CalendarDays },
  { href: "/invoices", permissions: ["invoices.manage", "invoices.view"], label: "Invoices", icon: Receipt },
  { href: "/inventory", permissions: ["inventory.manage", "inventory.view"], label: "Inventory", icon: Boxes },
  { href: "/reminders", permissions: ["reminders.manage"], label: "Reminders", icon: Bell, section: "Customers" },
  { href: "/customer-intelligence", permissions: ["reports.view"], label: "Customer Intelligence", icon: UserSearch, section: "Customers" },
  { href: "/reports", permissions: ["reports.view"], label: "Business Analytics", icon: BarChart3, section: "Business" },
  { href: "/accounting", permissions: ["accounting.manage"], label: "Accounting", icon: Calculator, section: "Business" },
  { href: "/employees", permissions: ["employees.manage"], label: "Employees", icon: IdCard, section: "Business" },
  { href: "/settings", permissions: ["settings.manage", "team.manage"], label: "Settings", icon: Settings, section: "System" },
  { href: "/help", label: "Help", icon: HelpCircle, section: "System" },
];

export interface NavGroup {
  section?: string;
  items: NavItem[];
}

export function groupedNavItems(can?: (...keys: string[]) => boolean): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of navItems) {
    if (item.permissions && can && !can(...item.permissions)) continue;
    const last = groups.at(-1);
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}
