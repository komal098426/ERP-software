from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLogEntry
from app.models.enums import AuditAction


def write_audit(
    db: Session,
    *,
    user_id: UUID | None,
    action: AuditAction,
    module: str,
    record_type: str,
    record_id: UUID,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    """Adds an audit_log row to the current session without committing.

    Callers must commit the same `db` session after this call so the audit entry lands in the
    same DB transaction as the write it documents (SRD §5 — "never fire-and-forget"): if the write
    fails and rolls back, the audit row rolls back with it.
    """
    db.add(
        AuditLogEntry(
            user_id=user_id,
            action=action,
            module=module,
            record_type=record_type,
            record_id=record_id,
            old_value=old_value,
            new_value=new_value,
        )
    )
