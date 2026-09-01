"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api-client";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // `checking` — we haven't read localStorage yet (only safe after hydration).
  // `authorized` — token was present when we checked.
  // We keep two separate flags so we can show a neutral blank screen while
  // checking (avoids the flash where the protected page briefly renders before
  // the redirect fires) without causing a server/client hydration mismatch
  // (getToken() touches window.localStorage which doesn't exist on the server).
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (getToken()) {
      setStatus("authorized");
    } else {
      setStatus("unauthorized");
      router.replace("/login");
    }
  }, [router]);

  // While checking: render nothing — no flash of protected content and no
  // flash of the login page. The blank screen lasts < 1 frame on any device
  // that has a stored token because localStorage is synchronous.
  if (status !== "authorized") return null;

  return <>{children}</>;
}
