"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api-client";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Starts false on both server and the client's first (pre-hydration) render -- getToken() only
  // has a real value in the browser, so branching render output on it directly would make the
  // server-rendered HTML and the client's first render disagree and trigger a hydration mismatch.
  // The check runs in an effect instead, which only fires after hydration completes.
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (getToken()) setIsAuthorized(true);
    else router.replace("/login");
  }, [router]);

  if (!isAuthorized) return null;
  return <>{children}</>;
}
