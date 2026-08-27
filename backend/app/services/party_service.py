from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import AuditAction, PartySource, PartyStatus
from app.models.party import Party
from app.schemas.party import DuplicateCandidate, PartyCreate, PartyUpdate
from app.services.audit import write_audit
from app.services.duplicate_detection import PARTY_SIMILARITY_THRESHOLD, find_similar, normalize_name


def _next_party_code(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Party)) or 0
    return f"PTY-{count + 1:04d}"


def find_duplicate_candidates(db: Session, name: str) -> list[DuplicateCandidate]:
    existing = db.scalars(select(Party).where(Party.status == PartyStatus.active)).all()
    candidates = [(str(p.id), p.name) for p in existing]
    matches = find_similar(name, candidates, PARTY_SIMILARITY_THRESHOLD)
    by_id = {str(p.id): p for p in existing}
    return [
        DuplicateCandidate(id=by_id[cid].id, party_code=by_id[cid].party_code, name=by_id[cid].name, similarity=score)
        for cid, score in matches
    ]


def create_party(db: Session, payload: PartyCreate, *, created_by: UUID | None) -> tuple[Party, list[DuplicateCandidate]]:
    duplicates = find_duplicate_candidates(db, payload.name)

    party = Party(
        party_code=_next_party_code(db),
        name=payload.name,
        normalized_name=normalize_name(payload.name),
        type=payload.type,
        contact_person=payload.contact_person,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        opening_balance=payload.opening_balance,
        source=PartySource.manual,
        created_by=created_by,
    )
    db.add(party)
    db.flush()  # assigns party.id without ending the transaction

    write_audit(
        db,
        user_id=created_by,
        action=AuditAction.created,
        module="parties",
        record_type="party",
        record_id=party.id,
        new_value={"name": party.name, "type": party.type.value},
    )
    db.commit()
    db.refresh(party)
    return party, duplicates


def update_party(db: Session, party: Party, payload: PartyUpdate, *, updated_by: UUID | None) -> Party:
    old_value = {"name": party.name, "type": party.type.value, "phone": party.phone, "email": party.email}
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(party, field, value)
    if "name" in changes:
        party.normalized_name = normalize_name(party.name)

    write_audit(
        db,
        user_id=updated_by,
        action=AuditAction.updated,
        module="parties",
        record_type="party",
        record_id=party.id,
        old_value=old_value,
        new_value=changes,
    )
    db.commit()
    db.refresh(party)
    return party


def deactivate_party(db: Session, party: Party, *, deactivated_by: UUID | None) -> Party:
    from datetime import datetime, timezone

    party.status = PartyStatus.inactive
    party.deactivated_at = datetime.now(timezone.utc)
    party.deactivated_by = deactivated_by

    write_audit(
        db,
        user_id=deactivated_by,
        action=AuditAction.deactivated,
        module="parties",
        record_type="party",
        record_id=party.id,
        old_value={"status": "active"},
        new_value={"status": "inactive"},
    )
    db.commit()
    db.refresh(party)
    return party
