"""
Pydantic schemas for API request/response validation.
"""
from pydantic import BaseModel
from datetime import datetime


class HealthResponse(BaseModel):
    status: str
    app: str


class ErrorResponse(BaseModel):
    detail: str
    timestamp: datetime = datetime.now()
