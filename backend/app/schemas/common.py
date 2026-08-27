from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageMeta(BaseModel):
    nextCursor: str | None = None
    total: int


class Page(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta


class FieldError(BaseModel):
    field: str
    message: str
