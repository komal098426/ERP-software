import csv
import io
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.db.session import get_db
from app.models.enums import YarnMovementType
from app.models.party import Party
from app.models.rbac import User
from app.schemas.yarn_ledger import YarnLedgerEntryCreate
from app.services.yarn_ledger_service import create_entry

router = APIRouter(prefix="/import", tags=["import"])


class ImportRowError(BaseModel):
    row: int
    reason: str
    raw: dict


class ImportSummary(BaseModel):
    rows_read: int
    created: int
    skipped: list[ImportRowError]


def _parse_decimal(value: str) -> Decimal | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        raise ValueError(f"'{value}' is not a valid number")


@router.post("/yarn-ledger", response_model=ImportSummary)
async def import_yarn_ledger_csv(
    partyId: UUID = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("yarn_ledger", "write")),
) -> ImportSummary:
    """Accepts the same CSV shape produced by GET /api/v1/reports/yarn-ledger.csv, so a sheet
    can be exported, edited, and re-imported. Every row that parses is created through the same
    service the manual "Add Entry" form uses, so loss_kg/amount are computed identically --
    nothing in the uploaded file's own loss/amount columns is trusted."""
    party = db.get(Party, partyId)
    if party is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Party not found")

    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))

    rows_read = 0
    created = 0
    skipped: list[ImportRowError] = []

    for i, row in enumerate(reader, start=2):  # header is row 1
        rows_read += 1
        try:
            movement_type = YarnMovementType(row["movement_type"].strip().lower())
            kg = _parse_decimal(row["kg"])
            if kg is None or kg <= 0:
                raise ValueError("kg must be a positive number")

            create_entry(
                db,
                YarnLedgerEntryCreate(
                    party_id=partyId,
                    movement_type=movement_type,
                    date=row["date"].strip(),
                    yarn_count=row.get("yarn_count", "").strip() or row.get("fabric_description", "").strip(),
                    kg=kg,
                    igp_number=row.get("igp_number", "").strip() or None,
                    ogp_number=row.get("ogp_number", "").strip() or None,
                    bags=_parse_decimal(row.get("bags", "")),
                    fabric_description=row.get("fabric_description", "").strip() or None,
                    knitting_rate=_parse_decimal(row.get("knitting_rate", "")),
                    remarks=row.get("remarks", "").strip() or None,
                ),
                created_by=current_user.id,
            )
            created += 1
        except (KeyError, ValueError) as exc:
            skipped.append(ImportRowError(row=i, reason=str(exc), raw=row))

    return ImportSummary(rows_read=rows_read, created=created, skipped=skipped)
