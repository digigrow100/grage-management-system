"use client";

import { useMemo, useState, useTransition } from "react";
import { ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  TEAM_PERMISSIONS,
  cancelTeamInvite,
  createTeamRole,
  deleteTeamRole,
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole,
  updateTeamRole,
  type TeamManagementData,
  type TeamRole,
} from "@/lib/supabase/team-actions";

function roleLabel(role: TeamRole | undefined, fallback = "Unknown") {
  return role?.name ?? fallback;
}

export function TeamRolesSettings({ data }: { data: TeamManagementData }) {
  const [tab, setTab] = useState<"team" | "roles">("team");

  if (!data.canManage) {
    return (
      <Card>
        <CardHeader title="Team & Roles" subtitle="Owner or admin access is required" />
        <CardBody>
          <p className="text-sm text-slate-600">
            Your current role can use the garage, but it cannot manage users or permissions.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("team")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "team" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          Team Members
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "roles" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          Roles & Permissions
        </button>
      </div>

      {tab === "team" ? <TeamPanel data={data} /> : <RolesPanel roles={data.roles} />}
    </div>
  );
}

function TeamPanel({ data }: { data: TeamManagementData }) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(data.roles.find((role) => role.slug === "technician")?.id ?? data.roles[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rolesById = useMemo(() => new Map(data.roles.map((role) => [role.id, role])), [data.roles]);

  function invite() {
    setMessage(null);
    startTransition(async () => {
      const result = await inviteTeamMember(email, roleId);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setEmail("");
      setMessage("User added if the account already exists. Otherwise the invite stays pending until they sign up with this email.");
    });
  }

  return (
    <Card>
      <CardHeader title="Team Members" subtitle="Add users and assign any available role" />
      <CardBody>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus size={18} className="text-slate-600" />
              <p className="font-medium text-slate-900">Add user</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="staff@garage.com"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <select
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              >
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !email || !roleId}
                onClick={invite}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {pending ? "Adding..." : "Add User"}
              </button>
            </div>
            {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users size={18} className="text-slate-600" />
              <p className="font-medium text-slate-900">Current team</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {data.members.map((member) => (
                <MemberRow key={member.id} member={member} roles={data.roles} />
              ))}
              {data.members.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No team members found.</p>
              ) : null}
            </div>
          </div>

          {data.invites.length > 0 ? (
            <div>
              <p className="mb-3 font-medium text-slate-900">Pending sign-ups</p>
              <div className="space-y-2">
                {data.invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        {roleLabel(rolesById.get(invite.roleId))} · waiting for account signup
                      </p>
                    </div>
                    <InviteCancelButton inviteId={invite.id} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function MemberRow({
  member,
  roles,
}: {
  member: TeamManagementData["members"][number];
  roles: TeamRole[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedRoleId = member.roleId ?? roles.find((role) => role.slug === member.role)?.id ?? "";

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-3 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{member.email}</p>
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
      <select
        defaultValue={selectedRoleId}
        disabled={pending}
        onChange={(event) => {
          const nextRoleId = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await updateMemberRole(member.id, nextRoleId);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Remove ${member.email} from this garage?`)) return;
          setError(null);
          startTransition(async () => {
            const result = await removeTeamMember(member.id);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}

function InviteCancelButton({ inviteId }: { inviteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await cancelTeamInvite(inviteId); })}
      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      aria-label="Cancel invite"
    >
      <X size={17} />
    </button>
  );
}

function RolesPanel({ roles }: { roles: TeamRole[] }) {
  return (
    <div className="space-y-4">
      <CreateRoleCard />
      <Card>
        <CardHeader title="Roles & Permissions" subtitle="Built-in roles are protected. Custom roles can be edited or removed." />
        <CardBody>
          <div className="space-y-3">
            {roles.map((role) => <RoleEditor key={role.id} role={role} />)}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function CreateRoleCard() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function togglePermission(key: string) {
    setPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return (
    <Card>
      <CardHeader title="Create Custom Role" subtitle="Build a role for your own workflow" />
      <CardBody>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Accountant"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <PermissionGrid selected={permissions} onToggle={togglePermission} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{message}</p>
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  const result = await createTeamRole({ name, description, permissions });
                  if (result.error) {
                    setMessage(result.error);
                    return;
                  }
                  setName("");
                  setDescription("");
                  setPermissions([]);
                  setMessage("Role created.");
                });
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create Role"}
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function RoleEditor({ role }: { role: TeamRole }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role.permissions);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fullAccess = permissions.includes("*");

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{role.name}</p>
            <p className="truncate text-sm text-slate-500">
              {fullAccess ? "Full access" : `${permissions.length} permissions`}
            </p>
          </div>
        </div>
        {role.isSystem ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Built-in</span>
        ) : (
          <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">Custom</span>
        )}
      </summary>

      <div className="border-t border-slate-100 p-4">
        {role.isSystem ? (
          <div>
            <p className="text-sm text-slate-600">{role.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {fullAccess ? (
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">All permissions</span>
              ) : (
                TEAM_PERMISSIONS.filter((permission) => permissions.includes(permission.key)).map((permission) => (
                  <span key={permission.key} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {permission.label}
                  </span>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <PermissionGrid
              selected={permissions}
              onToggle={(key) =>
                setPermissions((current) =>
                  current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                )
              }
            />
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete role "${role.name}"?`)) return;
                  setMessage(null);
                  startTransition(async () => {
                    const result = await deleteTeamRole(role.id);
                    if (result.error) setMessage(result.error);
                  });
                }}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    const result = await updateTeamRole(role.id, { name, description, permissions });
                    setMessage(result.error ?? "Role saved.");
                  });
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function PermissionGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TEAM_PERMISSIONS.map((permission) => (
        <label key={permission.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(permission.key)}
            onChange={() => onToggle(permission.key)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {permission.label}
        </label>
      ))}
    </div>
  );
}
