"use client";
import { createContext, useContext, type ReactNode } from "react";
const PermissionContext = createContext<string[]>([]);
export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}
export function usePermission() {
  const permissions = useContext(PermissionContext);
  return (...keys: string[]) =>
    permissions.includes("*") || keys.some((key) => permissions.includes(key));
}
