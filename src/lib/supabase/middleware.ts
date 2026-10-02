import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Exact routes that need no auth at all.
const PUBLIC_PATHS = ["/login", "/signup"];

// Token-namespaced routes (e.g. /feedback/<token>) that are public, but only
// for paths *under* the prefix — the bare path itself is a real staff page
// requiring auth (e.g. /feedback is the staff NPS page, /booking-requests is
// the staff inbox). A plain startsWith() check would wrongly treat both the
// staff page and any other-page sharing the prefix (/booking-requests starts
// with "/book") as public and bounce a logged-in user straight back to "/".
const PUBLIC_PATH_PREFIXES = ["/feedback/", "/service-history/", "/book/"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    PUBLIC_PATHS.includes(request.nextUrl.pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
