from pydantic import BaseModel
from typing import Optional, Dict, List, Any


class HealthResponse(BaseModel):
    status: str
    version: str = ""
    last_updated: Optional[str] = None
    sources: Dict[str, int]
    freshness: Dict[str, str]
    uptime_seconds: int


class RefreshResponse(BaseModel):
    status: str


class AisFeedResponse(BaseModel):
    status: str
    ingested: int = 0


class RouteResponse(BaseModel):
    orig_loc: Optional[list] = None
    dest_loc: Optional[list] = None
    origin_name: Optional[str] = None
    dest_name: Optional[str] = None
