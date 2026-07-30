"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api-client";

export interface AuthUser {
  id: number;
  email: string;
}

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Resolves the current session via GET /api/auth/me. Returns `null` (not an
 * error) for an anonymous visitor — 401/403 both mean "not logged in".
 */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<AuthUser>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

interface Credentials {
  email: string;
  password: string;
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Credentials) =>
      apiFetch<AuthUser>("/auth/signup", { method: "POST", body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Credentials) =>
      apiFetch<AuthUser>("/auth/login", { method: "POST", body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
}
