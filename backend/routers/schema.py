from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from scanner import scan_postgres, scan_sqlserver

router = APIRouter(prefix="/schema", tags=["schema"])


class ConnectRequest(BaseModel):
    db_type:  str   # "postgresql" | "sqlserver"
    host:     str
    port:     int
    database: str
    username: str
    password: str


@router.post("/scan")
def scan(req: ConnectRequest):
    try:
        if req.db_type == "postgresql":
            return scan_postgres(req.host, req.port, req.database, req.username, req.password)
        elif req.db_type == "sqlserver":
            return scan_sqlserver(req.host, req.port, req.database, req.username, req.password)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown db_type: {req.db_type}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
