export const TEAM_PERMISSIONS = [
  { key: "dashboard.view", label: "Dashboard" },
  { key: "customers.manage", label: "Customers" },
  { key: "bookings.manage", label: "Bookings" },
  { key: "jobs.manage", label: "Jobs" },
  { key: "invoices.manage", label: "Invoices" },
  { key: "inventory.manage", label: "Inventory" },
  { key: "reminders.manage", label: "Reminders" },
  { key: "reports.view", label: "Reports" },
  { key: "accounting.manage", label: "Accounting" },
  { key: "employees.manage", label: "Employees" },
  { key: "settings.manage", label: "Garage Settings" },
  { key: "team.manage", label: "Team & Roles" },
] as const;

export interface TeamRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  roleId: string | null;
  role: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  roleId: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface TeamManagementData {
  canManage: boolean;
  roles: TeamRole[];
  members: TeamMember[];
  invites: TeamInvite[];
}

export interface TeamActionResult {
  error?: string;
  success?: boolean;
}
