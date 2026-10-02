"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./server";
import { getCurrentGarageId } from "./garage";
import {
  TEAM_PERMISSIONS,
  type TeamActionResult,
  type TeamManagementData,
  type TeamRole,
  type TeamMember,
  type TeamInvite,
} from "@/lib/team-roles";

async function getContext() {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  const db = supabase as any;
  const { data: membership } = await db
    .from("garage_members")
    .select("role")
    .eq("garage_id", garageId)
    .eq("user_id", user.id)
    .single();

  const canManage = membership?.role === "owner" || membership?.role === "admin";
  return { supabase, db, garageId, user, canManage };
}

export async function getTeamManagementData(): Promise<TeamManagementData> {
  const { db, garageId, canManage } = await getContext();

  const { data: roleRows } = await db
    .from("garage_roles")
    .select("id,name,slug,description,permissions,is_system")
    .eq("garage_id", garageId)
    .order("is_system", { ascending: false })
    .order("name");

  const roles: TeamRole[] = (roleRows ?? []).map((role: any) => ({
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    permissions: role.permissions ?? [],
    isSystem: role.is_system,
  }));

  if (!canManage) {
    return { canManage, roles, members: [], invites: [] };
  }

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    db
      .from("garage_members")
      .select("id,user_id,email,role_id,role")
      .eq("garage_id", garageId)
      .order("created_at"),
    db
      .from("garage_invites")
      .select("id,email,role_id,accepted_at,created_at")
      .eq("garage_id", garageId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return {
    canManage,
    roles,
    members: (memberRows ?? []).map((member: any) => ({
      id: member.id,
      userId: member.user_id,
      email: member.email ?? "Unknown user",
      roleId: member.role_id,
      role: member.role,
    })),
    invites: (inviteRows ?? []).map((invite: any) => ({
      id: invite.id,
      email: invite.email,
      roleId: invite.role_id,
      acceptedAt: invite.accepted_at,
      createdAt: invite.created_at,
    })),
  };
}

function slugifyRole(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function validatePermissions(permissions: string[]) {
  const allowed = new Set(TEAM_PERMISSIONS.map((permission) => permission.key));
  return [...new Set(permissions.filter((permission) => allowed.has(permission as any)))];
}

export async function createTeamRole(input: {
  name: string;
  description: string;
  permissions: string[];
}): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can create roles." };

  const name = input.name.trim();
  const slug = slugifyRole(name);
  if (!name || !slug) return { error: "Role name is required." };

  const { error } = await db.from("garage_roles").insert({
    garage_id: garageId,
    name,
    slug,
    description: input.description.trim() || null,
    permissions: validatePermissions(input.permissions),
    is_system: false,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function updateTeamRole(
  roleId: string,
  input: { name: string; description: string; permissions: string[] }
): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can edit roles." };

  const { data: role } = await db
    .from("garage_roles")
    .select("is_system")
    .eq("id", roleId)
    .eq("garage_id", garageId)
    .single();

  if (!role) return { error: "Role not found." };
  if (role.is_system) return { error: "Built-in roles cannot be edited." };

  const name = input.name.trim();
  const slug = slugifyRole(name);
  if (!name || !slug) return { error: "Role name is required." };

  const { error } = await db
    .from("garage_roles")
    .update({
      name,
      slug,
      description: input.description.trim() || null,
      permissions: validatePermissions(input.permissions),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roleId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteTeamRole(roleId: string): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can delete roles." };

  const { data: role } = await db
    .from("garage_roles")
    .select("is_system")
    .eq("id", roleId)
    .eq("garage_id", garageId)
    .single();

  if (!role) return { error: "Role not found." };
  if (role.is_system) return { error: "Built-in roles cannot be deleted." };

  const { error } = await db
    .from("garage_roles")
    .delete()
    .eq("id", roleId)
    .eq("garage_id", garageId);

  if (error) {
    if (String(error.message).toLowerCase().includes("foreign key")) {
      return { error: "Move members off this role before deleting it." };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function inviteTeamMember(
  email: string,
  roleId: string
): Promise<TeamActionResult> {
  const { db, garageId, user, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can add team members." };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { data: role } = await db
    .from("garage_roles")
    .select("id")
    .eq("id", roleId)
    .eq("garage_id", garageId)
    .single();

  if (!role) return { error: "Select a valid role." };

  const { error } = await db.from("garage_invites").upsert(
    {
      garage_id: garageId,
      email: normalizedEmail,
      role_id: roleId,
      invited_by: user.id,
      accepted_at: null,
    },
    { onConflict: "garage_id,email" }
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function updateMemberRole(
  memberId: string,
  roleId: string
): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can change roles." };

  const { data: role } = await db
    .from("garage_roles")
    .select("id")
    .eq("id", roleId)
    .eq("garage_id", garageId)
    .single();

  if (!role) return { error: "Select a valid role." };

  const { error } = await db
    .from("garage_members")
    .update({ role_id: roleId })
    .eq("id", memberId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function removeTeamMember(memberId: string): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can remove members." };

  const { error } = await db
    .from("garage_members")
    .delete()
    .eq("id", memberId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function cancelTeamInvite(inviteId: string): Promise<TeamActionResult> {
  const { db, garageId, canManage } = await getContext();
  if (!canManage) return { error: "Only an owner or admin can cancel invites." };

  const { error } = await db
    .from("garage_invites")
    .delete()
    .eq("id", inviteId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
