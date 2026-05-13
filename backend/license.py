import os
import socket
import requests
from database import get_conn

_LS_ACTIVATE = "https://api.lemonsqueezy.com/v1/licenses/activate"


def get_license_status() -> dict:
    env_key = os.getenv("LICENSE_KEY", "").strip()
    if env_key:
        return {"activated": True, "key": env_key}
    with get_conn() as conn:
        row = conn.execute("SELECT value FROM app_settings WHERE key='license_key'").fetchone()
    stored = row["value"] if row else ""
    return {"activated": bool(stored), "key": stored}


def activate(key: str) -> dict:
    key = key.upper().strip()
    if not key:
        return {"activated": False, "error": "Please enter your license key."}

    hostname = socket.gethostname() or "dbdocumenter"
    try:
        resp = requests.post(
            _LS_ACTIVATE,
            data={"license_key": key, "instance_name": hostname},
            headers={"Accept": "application/json"},
            timeout=15,
        )
        data = resp.json()
    except Exception as e:
        return {"activated": False, "error": f"Could not reach license server: {e}"}

    if not data.get("activated"):
        return {"activated": False, "error": data.get("error") or "Invalid key or activation limit reached."}

    instance_id = (data.get("instance") or {}).get("id", "")
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO app_settings(key,value) VALUES('license_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key,),
        )
        if instance_id:
            conn.execute(
                "INSERT INTO app_settings(key,value) VALUES('license_instance_id',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (instance_id,),
            )
    return {"activated": True, "key": key}
