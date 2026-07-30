"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMe } from "./useAuth";

const PUBLIC_ROUTES = ["/login", "/signup"];

/**
 * Client-side route protection (design.md §4). There is no Next.js
 * middleware — the sessionid cookie is opaque, so only the server (DRF
 * IsAuthenticated) can authoritatively decide. This gate resolves `me` and
 * redirects to /login on 401/403.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (isPublicRoute || isLoading) {
      return;
    }
    if (user === null) {
      router.replace("/login");
    }
  }, [isPublicRoute, isLoading, user, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading || user === null) {
    return null;
  }

  return <>{children}</>;
}
