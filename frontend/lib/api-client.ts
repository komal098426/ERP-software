import type {
  AnalyticsSummary,
  AppUser,
  AttendanceRecord,
  AttendanceStatus,
  CurrentUser,
  Employee,
  EmployeeCreateResponse,
  EmployeeStatus,
  ImportSummary,
  LedgerSummary,
  Page,
  Party,
  PartyCreateResponse,
  RegisterResponse,
  Role,
  Transaction,
  YarnLedgerEntry,
  YarnMovementType,
  GatePass,
  GatePassType,
  GatePassStatus,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined" ? "" : "https://erp-software-production-f7d1.up.railway.app");
const TOKEN_STORAGE_KEY = "erp_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;
  // FastAPI's `detail` can be a plain string or a structured object (e.g. the employee
  // duplicate-conflict payload); callers that need the structured form read it from here rather
  // than parsing `message`, which is always a display-safe string.
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const message =
      typeof detail === "string"
        ? detail
        : (detail?.message ?? `Request failed with status ${response.status}`);
    throw new ApiError(response.status, message, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  return apiFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function fetchMe(): Promise<CurrentUser> {
  return apiFetch("/api/v1/auth/me");
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export interface ListPartiesParams {
  q?: string;
  status?: "active" | "inactive";
  cursor?: string;
  limit?: number;
}

export async function listParties(params: ListPartiesParams = {}): Promise<Page<Party>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch(`/api/v1/parties${query ? `?${query}` : ""}`);
}

export async function getParty(id: string): Promise<Party> {
  return apiFetch(`/api/v1/parties/${id}`);
}

export interface PartyPayload {
  name: string;
  type: "customer" | "vendor" | "both";
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  opening_balance?: string;
}

export async function createParty(payload: PartyPayload): Promise<PartyCreateResponse> {
  return apiFetch("/api/v1/parties", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateParty(id: string, payload: Partial<PartyPayload>): Promise<Party> {
  return apiFetch(`/api/v1/parties/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deactivateParty(id: string): Promise<Party> {
  return apiFetch(`/api/v1/parties/${id}/deactivate`, { method: "POST" });
}

export async function listTransactions(partyId: string): Promise<Page<Transaction>> {
  return apiFetch(`/api/v1/transactions?partyId=${partyId}`);
}

export interface TransactionPayload {
  party_id: string;
  entry_type: Transaction["entry_type"];
  date: string;
  amount: string;
  reference_number?: string;
  description?: string;
  category?: string;
  payment_status?: Transaction["payment_status"];
  notes?: string;
}

export async function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  return apiFetch("/api/v1/transactions", { method: "POST", body: JSON.stringify(payload) });
}

export async function listYarnLedger(partyId: string): Promise<Page<YarnLedgerEntry>> {
  return apiFetch(`/api/v1/yarn-ledger?partyId=${partyId}&limit=100`);
}

export async function fetchYarnLedgerSummary(partyId: string): Promise<LedgerSummary> {
  return apiFetch(`/api/v1/yarn-ledger/summary?partyId=${partyId}`);
}

export interface YarnLedgerPayload {
  party_id: string;
  movement_type: YarnMovementType;
  date: string;
  yarn_count: string;
  kg: string;
  igp_number?: string;
  ogp_number?: string;
  bags?: string;
  fabric_description?: string;
  knitting_rate?: string;
  loss_percent?: string;
  remarks?: string;
}

export async function createYarnLedgerEntry(payload: YarnLedgerPayload): Promise<YarnLedgerEntry> {
  return apiFetch("/api/v1/yarn-ledger", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchAnalyticsSummary(partyId?: string): Promise<AnalyticsSummary> {
  const query = partyId ? `?partyId=${partyId}` : "";
  return apiFetch(`/api/v1/analytics/summary${query}`);
}

// ---- Employees ----

export interface ListEmployeesParams {
  q?: string;
  status?: EmployeeStatus;
}

export async function listEmployees(params: ListEmployeesParams = {}): Promise<Page<Employee>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return apiFetch(`/api/v1/employees${query ? `?${query}` : ""}`);
}

export async function getEmployee(id: string): Promise<Employee> {
  return apiFetch(`/api/v1/employees/${id}`);
}

export interface EmployeePayload {
  full_name: string;
  guardian_name?: string;
  national_id?: string;
  phone?: string;
  email?: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  employment_type?: Employee["employment_type"];
}

export async function createEmployee(payload: EmployeePayload): Promise<EmployeeCreateResponse> {
  return apiFetch("/api/v1/employees", { method: "POST", body: JSON.stringify(payload) });
}

export async function changeEmployeeStatus(id: string, newStatus: EmployeeStatus): Promise<Employee> {
  return apiFetch(`/api/v1/employees/${id}/status/${newStatus}`, { method: "POST" });
}

// ---- Attendance ----

export async function listAttendance(employeeId: string): Promise<AttendanceRecord[]> {
  return apiFetch(`/api/v1/attendance?employeeId=${employeeId}`);
}

export interface AttendancePayload {
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  remarks?: string;
}

export async function markAttendance(payload: AttendancePayload): Promise<AttendanceRecord> {
  return apiFetch("/api/v1/attendance", { method: "POST", body: JSON.stringify(payload) });
}

// ---- Users & Roles ----

export async function listUsers(): Promise<AppUser[]> {
  return apiFetch("/api/v1/users");
}

export async function listRoles(): Promise<Role[]> {
  return apiFetch("/api/v1/users/roles");
}

export interface UserPayload {
  email: string;
  full_name: string;
  password: string;
  role_name: string;
}

export async function createUser(payload: UserPayload): Promise<AppUser> {
  return apiFetch("/api/v1/users", { method: "POST", body: JSON.stringify(payload) });
}

export async function approveUser(userId: string, roleName: string): Promise<AppUser> {
  return apiFetch(`/api/v1/users/${userId}/approve`, {
    method: "POST",
    body: JSON.stringify({ role_name: roleName }),
  });
}

// ---- Reports ----

export async function downloadReport(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) throw new ApiError(response.status, "Report download failed");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---- Import ----

export async function importYarnLedgerCsv(partyId: string, file: File): Promise<ImportSummary> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/import/yarn-ledger?partyId=${partyId}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? "Import failed");
  }
  return response.json();
}

// ---- Gate Passes ----

export interface ListGatePassesParams {
  type?: GatePassType;
  partyId?: string;
  status?: GatePassStatus;
  q?: string;
  cursor?: string;
  limit?: number;
}

export async function listGatePasses(params: ListGatePassesParams = {}): Promise<Page<GatePass>> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.partyId) search.set("partyId", params.partyId);
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", params.limit.toString());
  const query = search.toString();
  return apiFetch(`/api/v1/gate-passes${query ? `?${query}` : ""}`);
}

export async function getGatePass(id: string): Promise<GatePass> {
  return apiFetch(`/api/v1/gate-passes/${id}`);
}

export async function createGatePass(payload: any): Promise<GatePass> {
  return apiFetch("/api/v1/gate-passes", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateGatePass(id: string, payload: any): Promise<GatePass> {
  return apiFetch(`/api/v1/gate-passes/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteGatePass(id: string): Promise<void> {
  await apiFetch(`/api/v1/gate-passes/${id}`, { method: "DELETE" });
}

