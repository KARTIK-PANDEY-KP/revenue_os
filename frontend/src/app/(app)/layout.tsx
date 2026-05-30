"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/Providers";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, authEnabled } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authEnabled && !loading && !user) router.replace("/login");
  }, [authEnabled, loading, user, router]);

  if (authEnabled && loading) {
    return (
      <div className="relative z-10 min-h-screen grid place-items-center">
        <Spinner label="Loading workspace…" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
