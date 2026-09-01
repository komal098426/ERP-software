export type PartyType = "customer" | "vendor" | "both";
export type PartyStatus = "active" | "inactive";

export interface Party {
  id: string;
  party_code: string;
  name: string;
  type: PartyType;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: PartyStatus;
  opening_balance: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface DuplicateCandidate {
  id: string;
  party_code: string;
  name: string;
  similarity: number;
}

export interface PartyCreateResponse {
  party: Party;
  duplicate_warning: DuplicateCandidate[];
}

export interface Page<T> {
  data: T[];
  meta: { nextCursor: string | null; total: number };
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  must_change_password: boolean;
}

export interface RegisterResponse {
  message: string;
}

export interface MonthlyPoint {
  month: string;           // "YYYY-MM"
  dispatched_kg: string;
  received_kg: string;
  billed_amount: string;
}

export interface AnalyticsSummary {
  party_count: number;
  transaction_count: number;
  yarn_entry_count: number;
  total_received_kg: string;
  total_returned_kg: string;
  total_dispatched_kg: string;
  total_loss_kg: string;
  balance_kg: string;
  total_billed_amount: string;
  monthly_trend: MonthlyPoint[];
}

export type TransactionEntryType = "receivable" | "payable" | "payment_in" | "payment_out" | "adjustment";
export type PaymentStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";

export type YarnMovementType = "received" | "returned" | "dispatched";

export interface YarnLedgerEntry {
  id: string;
  party_id: string;
  movement_type: YarnMovementType;
  date: string;
  igp_number: string | null;
  ogp_number: string | null;
  yarn_count: string;
  bags: string | null;
  kg: string;
  fabric_description: string | null;
  knitting_rate: string | null;
  loss_percent: string;
  loss_kg: string;
  amount: string;
  payment_status: PaymentStatus;
  remarks: string | null;
  created_at: string;
}

export interface CountBreakdown {
  yarn_count: string;
  received_kg: string;
  returned_kg: string;
  dispatched_kg: string;
  net_kg: string;
}

export interface DateWiseRow {
  date: string;
  received_kg: string;
  returned_kg: string;
  dispatched_kg: string;
  loss_kg: string;
  amount: string;
  running_balance_kg: string;
}

export interface LedgerSummary {
  total_received_kg: string;
  total_returned_kg: string;
  total_dispatched_kg: string;
  total_loss_kg: string;
  balance_kg: string;
  total_amount: string;
  count_breakdown: CountBreakdown[];
  date_wise: DateWiseRow[];
}

export interface Transaction {
  id: string;
  transaction_code: string;
  party_id: string;
  entry_type: TransactionEntryType;
  date: string;
  reference_number: string | null;
  amount: string;
  description: string | null;
  category: string | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export type EmployeeStatus = "candidate" | "active" | "inactive" | "resigned" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  guardian_name: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  employment_type: EmploymentType | null;
  status: EmployeeStatus;
  created_at: string;
}

export interface NameDuplicateCandidate {
  id: string;
  employee_code: string;
  full_name: string;
  status: EmployeeStatus;
}

export interface EmployeeCreateResponse {
  employee: Employee;
  duplicate_warning: NameDuplicateCandidate[];
}

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave" | "holiday" | "weekend";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  working_hours: string | null;
  remarks: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  must_change_password: boolean;
  roles: string[];
}

export interface Role {
  id: string;
  name: string;
}

export interface ImportRowError {
  row: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ImportSummary {
  rows_read: number;
  created: number;
  skipped: ImportRowError[];
}

export type GatePassType = "igp" | "ogp";
export type GatePassStatus = "pending" | "received" | "completed";

export interface GatePass {
  id: string;
  gate_pass_number: string;
  type: GatePassType;
  date: string;
  party_id: string;
  party_name: string | null;
  returnable: boolean;
  material: string;
  yarn_count: string | null;
  yarn_type: string | null;
  bags_rolls: string | null;
  weight: string;
  quantity: string;
  yarn_return: string | null;
  expected_return: string | null;
  store_destination: string | null;
  status: GatePassStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

