import pytest
from sqlalchemy import select

from app.models.audit_log import AuditLogEntry
from app.models.enums import AuditAction, PartyType
from app.models.party import Party
from app.schemas.party import PartyCreate, PartyUpdate
from app.services.party_service import create_party, update_party


def test_failed_commit_rolls_back_both_party_change_and_audit_entry(db_session, monkeypatch):
    """SRD §16 acceptance criteria: editing a record produces exactly one audit_log row, in the
    same DB transaction as the update. If the commit fails, both the record change and the audit
    row must roll back together -- neither is allowed to persist alone."""
    party, _ = create_party(
        db_session, PartyCreate(name="Rollback Test Party", type=PartyType.customer), created_by=None
    )
    original_name = party.name

    original_commit = db_session.commit

    def failing_commit():
        db_session.rollback()
        raise RuntimeError("simulated DB failure")

    monkeypatch.setattr(db_session, "commit", failing_commit)

    with pytest.raises(RuntimeError):
        update_party(db_session, party, PartyUpdate(name="Renamed Party"), updated_by=None)

    monkeypatch.setattr(db_session, "commit", original_commit)
    db_session.expire_all()

    refreshed = db_session.get(Party, party.id)
    assert refreshed.name == original_name

    update_audit_entries = db_session.scalars(
        select(AuditLogEntry).where(
            AuditLogEntry.record_id == party.id, AuditLogEntry.action == AuditAction.updated
        )
    ).all()
    assert update_audit_entries == []


def test_successful_update_writes_exactly_one_audit_entry(db_session):
    party, _ = create_party(
        db_session, PartyCreate(name="Audited Party", type=PartyType.vendor), created_by=None
    )

    update_party(db_session, party, PartyUpdate(name="Audited Party Renamed"), updated_by=None)

    entries = db_session.scalars(
        select(AuditLogEntry).where(
            AuditLogEntry.record_id == party.id, AuditLogEntry.action == AuditAction.updated
        )
    ).all()
    assert len(entries) == 1
