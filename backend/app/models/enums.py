import enum


class PartyType(str, enum.Enum):
    customer = "customer"
    vendor = "vendor"
    both = "both"


class PartyStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class PartySource(str, enum.Enum):
    file_a = "file_a"
    file_b = "file_b"
    merged = "merged"
    manual = "manual"


class TransactionEntryType(str, enum.Enum):
    receivable = "receivable"
    payable = "payable"
    payment_in = "payment_in"
    payment_out = "payment_out"
    adjustment = "adjustment"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    partial = "partial"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class ReconciliationStatus(str, enum.Enum):
    matched = "matched"
    partially_matched = "partially_matched"
    unmatched = "unmatched"
    pending = "pending"
    reviewed = "reviewed"


class EmployeeStatus(str, enum.Enum):
    candidate = "candidate"
    active = "active"
    inactive = "inactive"
    resigned = "resigned"
    terminated = "terminated"


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    intern = "intern"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    leave = "leave"
    holiday = "holiday"
    weekend = "weekend"


class DocumentOwnerType(str, enum.Enum):
    party = "party"
    employee = "employee"
    transaction = "transaction"


class YarnMovementType(str, enum.Enum):
    received = "received"
    returned = "returned"
    dispatched = "dispatched"


class AuditAction(str, enum.Enum):
    created = "created"
    updated = "updated"
    deactivated = "deactivated"
    reactivated = "reactivated"
    reconciled = "reconciled"
    exported = "exported"
