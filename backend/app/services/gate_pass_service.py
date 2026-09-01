from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.gate_pass import GatePass
from app.models.party import Party
from app.models.enums import AuditAction, GatePassType
from app.schemas.gate_pass import GatePassCreate, GatePassUpdate
from app.services.audit import write_audit


def _next_gate_pass_code(db: Session, gp_type: GatePassType) -> str:
    prefix = "IGP" if gp_type == GatePassType.igp else "OGP"
    count = db.scalar(select(func.count()).select_from(GatePass).where(GatePass.type == gp_type)) or 0
    return f"{prefix}-{count + 1:05d}"


def create_gate_pass(db: Session, payload: GatePassCreate, *, created_by: UUID | None) -> GatePass:
    # Validate party exists
    party = db.get(Party, payload.party_id)
    if party is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")

    code = _next_gate_pass_code(db, payload.type)
    gate_pass = GatePass(
        gate_pass_number=code,
        type=payload.type,
        date=payload.date,
        party_id=payload.party_id,
        returnable=payload.returnable,
        material=payload.material,
        yarn_count=payload.yarn_count,
        yarn_type=payload.yarn_type,
        bags_rolls=payload.bags_rolls,
        weight=payload.weight,
        quantity=payload.quantity,
        yarn_return=payload.yarn_return,
        expected_return=payload.expected_return,
        store_destination=payload.store_destination,
        status=payload.status,
        remarks=payload.remarks,
        created_by=created_by,
    )
    db.add(gate_pass)
    db.flush()

    write_audit(
        db,
        user_id=created_by,
        action=AuditAction.created,
        module="gate_passes",
        record_type="gate_pass",
        record_id=gate_pass.id,
        new_value={"gate_pass_number": gate_pass.gate_pass_number, "type": gate_pass.type.value},
    )
    db.commit()
    db.refresh(gate_pass)
    return gate_pass


def update_gate_pass(
    db: Session, gate_pass: GatePass, payload: GatePassUpdate, *, updated_by: UUID | None
) -> GatePass:
    changes = payload.model_dump(exclude_unset=True)
    if "party_id" in changes:
        party = db.get(Party, changes["party_id"])
        if party is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")

    old_value = {field: getattr(gate_pass, field) for field in changes}
    for field, value in changes.items():
        setattr(gate_pass, field, value)

    write_audit(
        db,
        user_id=updated_by,
        action=AuditAction.updated,
        module="gate_passes",
        record_type="gate_pass",
        record_id=gate_pass.id,
        old_value={k: str(v) for k, v in old_value.items()},
        new_value={k: str(v) for k, v in changes.items()},
    )
    db.commit()
    db.refresh(gate_pass)
    return gate_pass


def delete_gate_pass(db: Session, gate_pass: GatePass, *, deleted_by: UUID | None) -> None:
    gp_id = gate_pass.id
    gp_number = gate_pass.gate_pass_number
    gp_type = gate_pass.type.value

    db.delete(gate_pass)
    write_audit(
        db,
        user_id=deleted_by,
        action=AuditAction.deactivated, # using deactivated for soft-deletion style or delete tracking
        module="gate_passes",
        record_type="gate_pass",
        record_id=gp_id,
        old_value={"gate_pass_number": gp_number, "type": gp_type},
    )
    db.commit()
