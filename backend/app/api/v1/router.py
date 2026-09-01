from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    attendance,
    auth,
    employees,
    import_data,
    parties,
    reports,
    transactions,
    users,
    yarn_ledger,
    gate_passes,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(parties.router)
api_router.include_router(transactions.router)
api_router.include_router(yarn_ledger.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(users.router)
api_router.include_router(reports.router)
api_router.include_router(import_data.router)
api_router.include_router(analytics.router)
api_router.include_router(gate_passes.router)

