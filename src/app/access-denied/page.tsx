import Link from "next/link";
import { getPermissions } from "@/lib/supabase/permissions";
import { navItems } from "@/lib/nav-items";
export default async function AccessDenied() {
  const permissions = await getPermissions();
  const next = navItems.find(
    (item) =>
      !item.permissions ||
      permissions.includes("*") ||
      item.permissions.some((p) => permissions.includes(p)),
  );
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Access not allowed</h1>
        <p className="my-4 text-slate-600">
          Your garage role does not allow this page. Ask the garage owner to
          update your permissions.
        </p>
        <Link
          href={next?.href ?? "/help"}
          className="text-accent-600 underline"
        >
          Go to an available page
        </Link>
      </div>
    </main>
  );
}
