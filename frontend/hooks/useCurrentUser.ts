"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMe, getToken } from "@/lib/api-client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!getToken(),
    retry: false,
  });
}
