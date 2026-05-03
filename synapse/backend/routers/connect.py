from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from services.google_drive import index_google_drive
from services.slack_service import index_slack
from typing import Dict, Any

router = APIRouter(prefix="/connect", tags=["connect"])

_status: Dict[str, Any] = {
    "google_drive": {"status": "not_connected"},
    "slack":        {"status": "not_connected"},
}


class GoogleConnectRequest(BaseModel):
    access_token: str
    refresh_token: str
    org_id: str = "default"


class SlackConnectRequest(BaseModel):
    bot_token: str
    org_id: str = "default"


async def _index_google(access_token, refresh_token, org_id):
    _status["google_drive"] = {"status": "indexing"}
    try:
        result = await index_google_drive(access_token, refresh_token, org_id)
        _status["google_drive"] = {"status": "ready", **result}
    except Exception as e:
        _status["google_drive"] = {"status": "error", "error": str(e)}


async def _index_slack(bot_token, org_id):
    _status["slack"] = {"status": "indexing"}
    try:
        result = await index_slack(bot_token, org_id)
        _status["slack"] = {"status": "ready", **result}
    except Exception as e:
        _status["slack"] = {"status": "error", "error": str(e)}


@router.post("/google")
async def connect_google(body: GoogleConnectRequest, background_tasks: BackgroundTasks):
    _status["google_drive"] = {"status": "queued"}
    background_tasks.add_task(_index_google, body.access_token, body.refresh_token, body.org_id)
    return {"message": "Google Drive indexing started"}


@router.post("/slack")
async def connect_slack(body: SlackConnectRequest, background_tasks: BackgroundTasks):
    _status["slack"] = {"status": "queued"}
    background_tasks.add_task(_index_slack, body.bot_token, body.org_id)
    return {"message": "Slack indexing started"}


@router.get("/status")
async def get_status():
    return _status
