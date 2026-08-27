"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveUser, createUser, listRoles, listUsers } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/require-auth";

function UsersContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("");
  const [approveRoles, setApproveRoles] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEmail("");
      setFullName("");
      setPassword("");
      setShowForm(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => approveUser(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ email, full_name: fullName, password, role_name: roleName || roles?.[0]?.name || "" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Users &amp; Roles</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Add User"}</Button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Full Name
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1" />
            </label>
            <label className="text-sm text-slate-600">
              Email
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
            </label>
            <label className="text-sm text-slate-600">
              Temporary Password
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              Role
              <select
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
              >
                {(roles ?? []).map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {mutation.isError ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}
          <p className="text-xs text-slate-400">The new user must change this password on first login.</p>
          <Button type="submit" disabled={mutation.isPending} className="self-start">
            {mutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </form>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((user) => {
                  const isPending = !user.is_active && user.roles.length === 0;
                  return (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-navy-900">{user.full_name}</td>
                      <td className="py-2 pr-4 text-slate-500">{user.email}</td>
                      <td className="py-2 pr-4">{user.roles.join(", ") || "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={user.is_active ? "success" : isPending ? "warning" : "muted"}>
                          {user.is_active ? "active" : isPending ? "pending" : "inactive"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={approveRoles[user.id] ?? roles?.[0]?.name ?? ""}
                              onChange={(e) => setApproveRoles((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                            >
                              {(roles ?? []).map((role) => (
                                <option key={role.id} value={role.name}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              disabled={approveMutation.isPending}
                              onClick={() =>
                                approveMutation.mutate({
                                  id: user.id,
                                  role: approveRoles[user.id] ?? roles?.[0]?.name ?? "",
                                })
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth>
      <UsersContent />
    </RequireAuth>
  );
}
