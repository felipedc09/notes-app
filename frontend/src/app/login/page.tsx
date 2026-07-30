"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { PasswordField } from "@/components/atoms/PasswordField";
import { TextField } from "@/components/atoms/TextField";
import { AuthCard } from "@/components/organisms/AuthCard";
import { useLogin } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // FR-05: generic error — never discloses which field was wrong.
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await login.mutateAsync({ email, password });
      // Q2: both sign-up and login land on the dashboard, unfiltered.
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const detail =
          error.body && typeof error.body === "object" && "detail" in error.body
            ? String((error.body as { detail: unknown }).detail)
            : "Invalid email or password.";
        setFormError(detail);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <AuthCard
        heading="Yay, You're Back!"
        illustration={
          <Image
            src="/illustrations/login.png"
            alt="A cactus in a pot"
            width={95}
            height={114}
          />
        }
        footer={
          <Link
            href="/signup"
            className="font-bold text-[var(--color-accent)] underline"
          >
            Oops! I’ve never been here before
          </Link>
        }
      >
        <form className="flex w-full flex-col" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-[13px]">
            <TextField
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {formError && (
            <p role="alert" className="mt-[13px] text-sm text-red-600">
              {formError}
            </p>
          )}
          <Button type="submit" className="mt-[43px]" disabled={login.isPending}>
            Login
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
