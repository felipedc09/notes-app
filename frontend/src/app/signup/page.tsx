"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { PasswordField } from "@/components/atoms/PasswordField";
import { TextField } from "@/components/atoms/TextField";
import { AuthCard } from "@/components/organisms/AuthCard";
import { useSignup } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    try {
      await signup.mutateAsync({ email, password });
      // Q2: both sign-up and login land on the dashboard, unfiltered.
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError && error.body && typeof error.body === "object") {
        setFieldErrors(error.body as Record<string, string[]>);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <AuthCard
        heading="Yay, New Friend!"
        footer={
          <Link
            href="/login"
            className="font-bold text-[var(--color-accent)] underline"
          >
            We&apos;re already friends!
          </Link>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email && (
            <p role="alert" className="text-sm text-red-600">
              {fieldErrors.email.join(" ")}
            </p>
          )}
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors.password && (
            <p role="alert" className="text-sm text-red-600">
              {fieldErrors.password.join(" ")}
            </p>
          )}
          <Button type="submit" disabled={signup.isPending}>
            Sign Up
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
